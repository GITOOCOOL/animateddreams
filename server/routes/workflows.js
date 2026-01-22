import express from 'express';
import db from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET all workflows for the authenticated user
router.get('/', authenticateToken, (req, res) => {
    const sql = `
        SELECT id, name, description, type, thumbnail, is_default, 
               workflow_json as workflow, created_at as createdAt, updated_at as updatedAt
        FROM workflows
        WHERE userId = ?
        ORDER BY created_at DESC
    `;

    db.all(sql, [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        
        // Parse workflow JSON for each row
        const processedRows = rows.map(row => {
            try {
                return {
                    ...row,
                    workflow: JSON.parse(row.workflow)
                };
            } catch (e) {
                return row;
            }
        });

        res.json(processedRows);
    });
});

// GET a specific workflow by ID (includes full workflow_json)
router.get('/:id', authenticateToken, (req, res) => {
    const sql = `
        SELECT * FROM workflows
        WHERE id = ? AND userId = ?
    `;

    db.get(sql, [req.params.id, req.user.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Workflow not found' });

        // Parse workflow_json back to object
        try {
            row.workflow_json = JSON.parse(row.workflow_json);
        } catch (e) {
            return res.status(500).json({ error: 'Invalid workflow JSON' });
        }

        res.json(row);
    });
});

// POST create a new workflow
router.post('/', authenticateToken, (req, res) => {
    console.log(`[Workflows] Incoming SAVE request for user: ${req.user.id}`);
    const { id, name, description, type, workflow_json, thumbnail, is_default } = req.body;
    console.log(`[Workflows] Saving: ${name} (ID: ${id})`);
    const userId = req.user.id;

    // Validation
    if (!id || !name || !type || !workflow_json) {
        return res.status(400).json({ error: 'Missing required fields: id, name, type, workflow_json' });
    }

    if (type !== 'image' && type !== 'video') {
        return res.status(400).json({ error: 'Type must be "image" or "video"' });
    }

    // Validate workflow_json is valid JSON
    let workflowJsonString;
    try {
        workflowJsonString = typeof workflow_json === 'string' 
            ? workflow_json 
            : JSON.stringify(workflow_json);
        JSON.parse(workflowJsonString); // Validate it's parseable
    } catch (e) {
        return res.status(400).json({ error: 'Invalid workflow_json format' });
    }

    const now = Date.now();
    const stmt = db.prepare(`
        INSERT INTO workflows (id, userId, name, description, type, workflow_json, thumbnail, is_default, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
        id,
        userId,
        name,
        description || null,
        type,
        workflowJsonString,
        thumbnail || null,
        is_default ? 1 : 0,
        now,
        now,
        function (err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(409).json({ error: 'Workflow with this ID already exists' });
                }
                return res.status(500).json({ error: err.message });
            }
            res.status(201).json({ message: 'Workflow created successfully', id });
        }
    );
    stmt.finalize();
});

// PUT update an existing workflow
router.put('/:id', authenticateToken, (req, res) => {
    const { name, description, type, workflow_json, thumbnail, is_default } = req.body;
    const workflowId = req.params.id;
    const userId = req.user.id;

    // First check if workflow exists and belongs to user
    db.get('SELECT id FROM workflows WHERE id = ? AND userId = ?', [workflowId, userId], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Workflow not found' });

        // Build update query dynamically based on provided fields
        const updates = [];
        const values = [];

        if (name !== undefined) {
            updates.push('name = ?');
            values.push(name);
        }
        if (description !== undefined) {
            updates.push('description = ?');
            values.push(description);
        }
        if (type !== undefined) {
            if (type !== 'image' && type !== 'video') {
                return res.status(400).json({ error: 'Type must be "image" or "video"' });
            }
            updates.push('type = ?');
            values.push(type);
        }
        if (workflow_json !== undefined) {
            try {
                const workflowJsonString = typeof workflow_json === 'string' 
                    ? workflow_json 
                    : JSON.stringify(workflow_json);
                JSON.parse(workflowJsonString); // Validate
                updates.push('workflow_json = ?');
                values.push(workflowJsonString);
            } catch (e) {
                return res.status(400).json({ error: 'Invalid workflow_json format' });
            }
        }
        if (thumbnail !== undefined) {
            updates.push('thumbnail = ?');
            values.push(thumbnail);
        }
        if (is_default !== undefined) {
            updates.push('is_default = ?');
            values.push(is_default ? 1 : 0);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        // Always update updated_at
        updates.push('updated_at = ?');
        values.push(Date.now());

        // Add WHERE clause values
        values.push(workflowId);
        values.push(userId);

        const sql = `UPDATE workflows SET ${updates.join(', ')} WHERE id = ? AND userId = ?`;

        db.run(sql, values, function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Workflow updated successfully', changes: this.changes });
        });
    });
});

// DELETE a workflow
router.delete('/:id', authenticateToken, (req, res) => {
    const sql = 'DELETE FROM workflows WHERE id = ? AND userId = ?';

    db.run(sql, [req.params.id, req.user.id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Workflow not found' });
        }
        res.json({ message: 'Workflow deleted successfully' });
    });
});

// POST set a workflow as default for a type
router.post('/:id/set-default', authenticateToken, (req, res) => {
    const workflowId = req.params.id;
    const userId = req.user.id;

    // First get the workflow type
    db.get('SELECT type FROM workflows WHERE id = ? AND userId = ?', [workflowId, userId], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: 'Workflow not found' });

        const workflowType = row.type;

        // Unset all defaults for this type
        db.run(
            'UPDATE workflows SET is_default = 0 WHERE userId = ? AND type = ?',
            [userId, workflowType],
            (err) => {
                if (err) return res.status(500).json({ error: err.message });

                // Set this workflow as default
                db.run(
                    'UPDATE workflows SET is_default = 1, updated_at = ? WHERE id = ? AND userId = ?',
                    [Date.now(), workflowId, userId],
                    function (err) {
                        if (err) return res.status(500).json({ error: err.message });
                        res.json({ message: 'Default workflow updated successfully' });
                    }
                );
            }
        );
    });
});

export default router;
