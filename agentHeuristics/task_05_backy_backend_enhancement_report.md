# Backend Architecture Analysis & Enhancement Report

**Author**: Backy (Backend Engineer)  
**Date**: 22 Jan 2026, 22:12 AEDT  
**Task**: #005 - Backend Architecture Analysis  
**Status**: COMPLETE

---

## 📊 Executive Summary

### Top 5 Critical Improvements

| Priority | Issue | Impact | Effort | Risk |
|----------|-------|--------|--------|------|
| 🔴 **P0** | **Hardcoded JWT Secret** | Security breach risk | 15 min | HIGH |
| 🔴 **P0** | **Missing Database Indexes** | Performance degradation at scale | 30 min | MEDIUM |
| 🟡 **P1** | **No Error Recovery in WebSocket** | User experience degradation | 2 hours | MEDIUM |
| 🟡 **P1** | **Deprecated Gemini Functions** | Technical debt accumulation | 1 hour | LOW |
| 🟢 **P2** | **ConnectionContext Migration** | Code maintainability | 3 hours | LOW |

### Quick Stats
- **Total Routes Audited**: 4 (`ai.js`, `engines.js`, `dreams.js`, `auth.js`)
- **Total Services Reviewed**: 5 (ComfyUI, Ollama, Gemini, DynamicWorkflow, Storage)
- **Security Issues Found**: 3 (1 critical, 2 medium)
- **Performance Bottlenecks**: 4
- **Technical Debt Items**: 5
- **Estimated Total Remediation Time**: 12-15 hours

---

## 🔒 1. Server Route Audit

### A. `/server/routes/auth.js` (46 lines)

#### ❌ **CRITICAL SECURITY ISSUES**

**Issue #1: Hardcoded JWT Secret**
```javascript
// Line 3
export const JWT_SECRET = 'your-secret-key-change-this-in-prod';
```
- **Severity**: 🔴 CRITICAL
- **Impact**: Anyone with access to the codebase can forge authentication tokens
- **Fix**: Move to environment variable
  ```javascript
  export const JWT_SECRET = process.env.JWT_SECRET || (() => {
      throw new Error('JWT_SECRET environment variable is required');
  })();
  ```

**Issue #2: Missing Rate Limiting**
- **Severity**: 🟡 MEDIUM
- **Impact**: Vulnerable to brute-force attacks on `/login` and `/register`
- **Fix**: Implement `express-rate-limit`
  ```javascript
  import rateLimit from 'express-rate-limit';
  
  const authLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // 5 attempts
      message: 'Too many login attempts, please try again later'
  });
  
  router.post('/login', authLimiter, (req, res) => { ... });
  ```

**Issue #3: Weak Password Validation**
- **Severity**: 🟡 MEDIUM
- **Impact**: Users can set weak passwords
- **Fix**: Add password strength validation
  ```javascript
  if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
  }
  ```

#### ✅ **What's Good**
- Uses `bcrypt` for password hashing (10 rounds)
- JWT token expiration set to 24h
- Proper authentication middleware (`authenticateToken`)

---

### B. `/server/routes/dreams.js` (125 lines)

#### ⚠️ **PERFORMANCE ISSUES**

**Issue #1: N+1 Query Pattern**
```javascript
// Lines 66-98: LEFT JOIN is good, but result aggregation is inefficient
db.all(sql, [req.user.id], (err, rows) => {
    const dreams = {};
    rows.forEach(row => { /* Manual aggregation */ });
});
```
- **Severity**: 🟡 MEDIUM
- **Impact**: Slow response times with large datasets (100+ dreams)
- **Fix**: Use SQL aggregation or implement pagination
  ```javascript
  // Add pagination
  router.get('/', authenticateToken, (req, res) => {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;
      
      const sql = `
          SELECT d.*, 
                 GROUP_CONCAT(i.filePath || '|' || i.type) as media
          FROM dreams d
          LEFT JOIN dream_images i ON d.id = i.dreamId
          WHERE d.userId = ?
          GROUP BY d.id
          ORDER BY d.createdAt DESC
          LIMIT ? OFFSET ?
      `;
      // ... parse media string into array
  });
  ```

**Issue #2: Synchronous File I/O**
```javascript
// Line 31: fs.writeFileSync blocks the event loop
fs.writeFileSync(localPath, Buffer.from(arrayBuffer));
```
- **Severity**: 🟢 LOW
- **Impact**: Server unresponsive during large file writes
- **Fix**: Use async `fs.promises.writeFile()`

**Issue #3: Missing Error Handling for File Cleanup**
- **Severity**: 🟢 LOW
- **Impact**: Orphaned files if DB insert fails
- **Fix**: Implement transaction-like cleanup
  ```javascript
  let savedFilePath = null;
  try {
      savedFilePath = await writeFile(...);
      await dbInsert(...);
  } catch (error) {
      if (savedFilePath) await fs.promises.unlink(savedFilePath);
      throw error;
  }
  ```

#### ✅ **What's Good**
- Proper authentication on all routes
- Handles multiple media types (HTTP, ComfyUI proxy, Base64)
- Creates storage directory if missing

---

### C. `/server/routes/ai.js` (226 lines)

#### ⚠️ **RELIABILITY ISSUES**

**Issue #1: No Timeout on External API Calls**
```javascript
// Line 87: No timeout on Gemini API calls
const response = await ai.models.generateContent({ ... });
```
- **Severity**: 🟡 MEDIUM
- **Impact**: Requests can hang indefinitely
- **Fix**: Implement AbortController with timeout
  ```javascript
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000); // 30s
  
  try {
      const response = await fetch(url, { signal: controller.signal });
  } finally {
      clearTimeout(timeout);
  }
  ```

**Issue #2: Missing Input Validation**
- **Severity**: 🟡 MEDIUM
- **Impact**: Potential injection attacks or crashes
- **Fix**: Validate request body
  ```javascript
  router.post('/analyze', async (req, res) => {
      const { dreamText, attachments } = req.body;
      
      if (!dreamText || typeof dreamText !== 'string') {
          return res.status(400).json({ error: 'Invalid dreamText' });
      }
      
      if (dreamText.length > 10000) {
          return res.status(400).json({ error: 'Text too long (max 10000 chars)' });
      }
      // ...
  });
  ```

**Issue #3: No Retry Logic for Transient Failures**
- **Severity**: 🟢 LOW
- **Impact**: Single network blip fails entire request
- **Fix**: Implement exponential backoff retry

#### ✅ **What's Good**
- Dual-agent architecture (Psychologist → Visualizer) is elegant
- Structured JSON schema with Google GenAI
- Proper error logging
- Multer configuration for file uploads (25MB limit)

---

### D. `/server/routes/engines.js` (123 lines)

#### ⚠️ **MINOR ISSUES**

**Issue #1: Race Condition in Directory Creation**
```javascript
// Lines 10-17: Multiple concurrent requests could cause issues
async function ensurePresetsDir() {
    try {
        await fs.access(PRESETS_DIR);
    } catch {
        await fs.mkdir(PRESETS_DIR, { recursive: true });
    }
}
```
- **Severity**: 🟢 LOW
- **Impact**: Rare edge case with concurrent requests
- **Fix**: Use `{ recursive: true }` and ignore EEXIST errors

**Issue #2: No Validation on Preset Names**
- **Severity**: 🟢 LOW
- **Impact**: Path traversal vulnerability (`../../etc/passwd`)
- **Fix**: Sanitize filename
  ```javascript
  const sanitizeName = (name) => name.replace(/[^a-zA-Z0-9_-]/g, '');
  const filename = `${sanitizeName(name)}_engine_conf.json`;
  ```

#### ✅ **What's Good**
- Clean REST API design
- Proper error handling
- Uses AbortSignal for connection checks (3s timeout)

---

## 🔧 2. Service Layer Analysis

### A. `comfyService.ts` (734 lines) - THE BEAST

#### ⚠️ **MAJOR ISSUES**

**Issue #1: WebSocket Connection Not Resilient**
```javascript
// Lines 483-569: No reconnection logic
ws.onerror = (err) => {
    reject(new Error(`WebSocket Error: ${err.message}`));
};
```
- **Severity**: 🟡 MEDIUM
- **Impact**: Single WebSocket failure kills entire generation
- **Fix**: Implement reconnection with exponential backoff
  ```javascript
  let reconnectAttempts = 0;
  const maxReconnects = 3;
  
  ws.onerror = (err) => {
      if (reconnectAttempts < maxReconnects) {
          setTimeout(() => {
              reconnectAttempts++;
              // Recreate WebSocket connection
          }, Math.pow(2, reconnectAttempts) * 1000);
      } else {
          reject(err);
      }
  };
  ```

**Issue #2: Memory Leak in Long-Running Generations**
- **Severity**: 🟡 MEDIUM
- **Impact**: WebSocket connections not properly cleaned up
- **Fix**: Ensure `ws.close()` is called in all code paths
  ```javascript
  try {
      // ... generation logic
  } finally {
      if (ws.readyState === WebSocket.OPEN) {
          ws.close();
      }
  }
  ```

**Issue #3: No Progress Timeout**
- **Severity**: 🟢 LOW
- **Impact**: Stuck generations never timeout
- **Fix**: Implement progress watchdog
  ```javascript
  let lastProgressTime = Date.now();
  const progressTimeout = setInterval(() => {
      if (Date.now() - lastProgressTime > 120000) { // 2 min no progress
          ws.close();
          reject(new Error('Generation timeout: no progress'));
      }
  }, 10000);
  ```

#### ✅ **What's Good**
- Comprehensive workflow manipulation (`modifyWorkflow`)
- Supports multiple workflow types (T2I, I2I, IP-Adapter, SVD, AnimateDiff)
- Real-time progress callbacks
- Proper UUID generation polyfill

---

### B. `ollamaService.ts` (217 lines)

#### ⚠️ **MINOR ISSUES**

**Issue #1: Robust JSON Parsing Could Be Extracted**
- **Severity**: 🟢 LOW
- **Impact**: Code duplication if needed elsewhere
- **Fix**: Extract to utility function
  ```javascript
  // utils/jsonParser.ts
  export function parseRobustJSON(text: string): any {
      // Try direct parse
      // Try markdown cleanup
      // Try regex extraction
      // Return raw text as fallback
  }
  ```

**Issue #2: No Cancellation Support in `checkOllamaConnection`**
- **Severity**: 🟢 LOW
- **Impact**: Slow connection checks can't be cancelled
- **Fix**: Add AbortSignal parameter

#### ✅ **What's Good**
- Excellent JSON cleanup logic (handles markdown, regex extraction)
- Proper error handling (silent failures for connection checks)
- Generic pipeline layer executor (`runOllamaLayer`)
- AbortSignal support in `callOllamaAgent`

---

### C. `geminiService.ts` (54 lines)

#### ❌ **TECHNICAL DEBT**

**Issue #1: Deprecated Functions**
```javascript
// Lines 40-54
export const generateDreamImage = async (visualPrompt: string): Promise<string> => {
    throw new Error("Feature temporarily unavailable during backend migration.");
};

export const generateDreamVideo = async (visualPrompt: string): Promise<string> => {
    throw new Error("Feature temporarily unavailable during backend migration.");
};
```
- **Severity**: 🟡 MEDIUM
- **Impact**: Dead code, confusing for developers
- **Fix**: **REMOVE THESE FUNCTIONS** or implement them properly
- **Recommendation**: Remove entirely (Gemini image/video gen is handled by ComfyUI now)

#### ✅ **What's Good**
- Clean proxy pattern to backend API
- Proper error handling
- Availability check function

---

### D. `dynamicWorkflowEngine.ts` (110 lines)

#### ❌ **INCOMPLETE IMPLEMENTATION**

**Issue #1: Graph Traversal Logic Incomplete**
```javascript
// Lines 75-108: injectPrompt() doesn't fully traverse graph
static injectPrompt(workflow: Record<string, any>, nodeId: string, text: string, type: "Positive" | "Negative") {
    const node = workflow[nodeId];
    if (!node) return;
    
    if (node.class_type === 'CLIPTextEncode') {
        node.inputs.text = text;
    } else {
        // TODO: Walk UP the graph
        // This is complex...
    }
}
```
- **Severity**: 🟡 MEDIUM
- **Impact**: Custom workflows may not work correctly
- **Fix**: Implement proper graph traversal or document limitations
  ```javascript
  // Option 1: Breadth-first search
  static findCLIPTextEncode(workflow, startNodeId, visited = new Set()) {
      const queue = [startNodeId];
      
      while (queue.length > 0) {
          const nodeId = queue.shift();
          if (visited.has(nodeId)) continue;
          visited.add(nodeId);
          
          const node = workflow[nodeId];
          if (node.class_type === 'CLIPTextEncode') return nodeId;
          
          // Add connected nodes to queue
          Object.values(node.inputs || {}).forEach(input => {
              if (Array.isArray(input) && input[0]) queue.push(input[0]);
          });
      }
      return null;
  }
  ```

#### ✅ **What's Good**
- Good heuristic approach (detect KSampler, CheckpointLoader)
- Supports custom node injection
- Proper deep cloning of workflows

---

### E. `storageService.ts` (93 lines)

#### ⚠️ **MINOR ISSUES**

**Issue #1: Token Refresh Not Implemented**
- **Severity**: 🟢 LOW
- **Impact**: User forced to re-login after token expiry
- **Fix**: Implement token refresh logic
  ```javascript
  async function fetchWithAuth(url, options = {}) {
      const token = localStorage.getItem('authToken');
      const response = await fetch(url, {
          ...options,
          headers: { ...options.headers, 'Authorization': `Bearer ${token}` }
      });
      
      if (response.status === 401) {
          // Try to refresh token
          const refreshed = await refreshAuthToken();
          if (refreshed) return fetchWithAuth(url, options); // Retry
      }
      return response;
  }
  ```

#### ✅ **What's Good**
- Proper authentication handling
- Clears session on 401/403
- Clean error handling

---

## 🧠 3. State Management Review

### A. `EngineContext.tsx` (320 lines)

#### ⚠️ **PERFORMANCE ISSUES**

**Issue #1: Unnecessary Re-renders**
- **Severity**: 🟢 LOW
- **Impact**: All components re-render when engine status updates
- **Fix**: Split context into separate concerns
  ```typescript
  // EngineConfigContext (rarely changes)
  // EngineStatusContext (frequently changes)
  // Use React.memo() on consumers
  ```

**Issue #2: LocalStorage Writes on Every Update**
- **Severity**: 🟢 LOW
- **Impact**: Potential performance hit with frequent updates
- **Fix**: Debounce localStorage writes
  ```typescript
  const debouncedSave = useCallback(
      debounce((engines) => {
          localStorage.setItem('animated_dreams_engines', JSON.stringify(engines));
      }, 500),
      []
  );
  ```

#### ✅ **What's Good**
- Single source of truth for engine state
- Comprehensive CRUD operations
- Preset management
- Status tracking with Map

---

### B. `ConnectionContext.tsx` (90 lines) - LEGACY

#### ❌ **TECHNICAL DEBT**

**Issue #1: Redundant with EngineContext**
- **Severity**: 🟡 MEDIUM (P1)
- **Impact**: Confusing for developers, potential state conflicts
- **Fix**: **MIGRATE ALL USAGE TO EngineContext**
- **Effort**: 3 hours
- **Steps**:
  1. Audit all `useConnections()` calls in codebase
  2. Replace with `useEngineManager()` equivalents
  3. Remove `ConnectionContext.tsx`
  4. Update `agent.md` to reflect removal

#### ✅ **What's Good**
- Smart hydration from environment variables
- Prevents hydration mismatch with `isLoaded` flag

---

### C. `useDreamEngine.ts` (766 lines) - THE GOD HOOK

#### ⚠️ **COMPLEXITY ISSUES**

**Issue #1: God Object Anti-Pattern**
- **Severity**: 🟢 LOW
- **Impact**: Hard to test, hard to maintain
- **Fix**: Consider splitting into smaller hooks
  ```typescript
  // useAnalysisPipeline.ts
  // useImageGeneration.ts
  // useVideoGeneration.ts
  // useConnectionChecks.ts
  ```

**Issue #2: No Cancellation for Analysis Pipeline**
- **Severity**: 🟡 MEDIUM
- **Impact**: User can't cancel long-running analysis
- **Fix**: Implement AbortController
  ```typescript
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const processDream = async (...) => {
      abortControllerRef.current = new AbortController();
      // Pass signal to Ollama/Gemini calls
  };
  
  const cancelAnalysis = () => {
      abortControllerRef.current?.abort();
  };
  ```

#### ✅ **What's Good**
- Comprehensive orchestration of entire Dream pipeline
- Accepts optional `EngineConfig` overrides
- Proper state management
- Fallback generation support

---

## 💾 4. Data Persistence & Storage

### A. Database Schema (`server/db/database.js`)

#### ❌ **CRITICAL PERFORMANCE ISSUES**

**Issue #1: Missing Indexes**
```sql
-- Current schema has NO indexes except PRIMARY KEYs
CREATE TABLE dreams (
    id TEXT PRIMARY KEY,
    userId TEXT,  -- ❌ No index!
    rawText TEXT,
    visualPrompt TEXT,
    analysis TEXT,
    createdAt INTEGER  -- ❌ No index!
);
```
- **Severity**: 🔴 CRITICAL (P0)
- **Impact**: Slow queries as data grows (O(n) scans)
- **Fix**: Add indexes immediately
  ```sql
  CREATE INDEX IF NOT EXISTS idx_dreams_userId ON dreams(userId);
  CREATE INDEX IF NOT EXISTS idx_dreams_createdAt ON dreams(createdAt DESC);
  CREATE INDEX IF NOT EXISTS idx_dream_images_dreamId ON dream_images(dreamId);
  ```

**Issue #2: No Migration System**
- **Severity**: 🟡 MEDIUM
- **Impact**: Schema changes are ad-hoc and error-prone
- **Fix**: Implement migration system
  ```javascript
  // migrations/001_add_indexes.js
  export const up = (db) => {
      db.run('CREATE INDEX idx_dreams_userId ON dreams(userId)');
  };
  
  export const down = (db) => {
      db.run('DROP INDEX idx_dreams_userId');
  };
  ```

**Issue #3: No Backup Strategy**
- **Severity**: 🟡 MEDIUM
- **Impact**: Data loss if `dreams.db` corrupts
- **Fix**: Implement daily backups
  ```javascript
  // server/scripts/backup.js
  import fs from 'fs';
  import path from 'path';
  
  const backupDir = path.join(__dirname, '../backups');
  const timestamp = new Date().toISOString().split('T')[0];
  fs.copyFileSync('dreams.db', `${backupDir}/dreams_${timestamp}.db`);
  ```

#### ✅ **What's Good**
- Proper foreign key constraints
- Uses `IF NOT EXISTS` for idempotent schema creation
- Handles migration for existing DBs (ALTER TABLE with error suppression)

---

### B. File Storage Organization

#### ⚠️ **MINOR ISSUES**

**Issue #1: No File Cleanup for Deleted Dreams**
- **Severity**: 🟢 LOW
- **Impact**: Orphaned files accumulate over time
- **Fix**: Implement cascade delete
  ```javascript
  router.delete('/:id', authenticateToken, async (req, res) => {
      const dreamId = req.params.id;
      
      // Get file paths before deletion
      const files = await db.all('SELECT filePath FROM dream_images WHERE dreamId = ?', [dreamId]);
      
      // Delete from DB
      await db.run('DELETE FROM dreams WHERE id = ?', [dreamId]);
      
      // Delete files
      for (const file of files) {
          await fs.promises.unlink(path.join(STORAGE_DIR, file.filePath));
      }
  });
  ```

**Issue #2: No File Size Limits**
- **Severity**: 🟢 LOW
- **Impact**: Disk space could fill up
- **Fix**: Implement quota per user
  ```javascript
  const MAX_STORAGE_PER_USER = 1024 * 1024 * 1024; // 1GB
  
  async function checkUserQuota(userId) {
      const total = await db.get(`
          SELECT SUM(LENGTH(filePath)) as total
          FROM dream_images
          JOIN dreams ON dream_images.dreamId = dreams.id
          WHERE dreams.userId = ?
      `, [userId]);
      
      return total.total < MAX_STORAGE_PER_USER;
  }
  ```

#### ✅ **What's Good**
- Organized structure (`/saved_dreams/`, `/engine_presets/`)
- Automatic directory creation
- Supports multiple media types

---

## 🔧 5. Technical Debt Remediation Plan

### Priority Matrix

| Item | Severity | Effort | Priority | Status |
|------|----------|--------|----------|--------|
| Hardcoded JWT Secret | 🔴 Critical | 15 min | P0 | Not Started |
| Missing DB Indexes | 🔴 Critical | 30 min | P0 | Not Started |
| Deprecated Gemini Functions | 🟡 Medium | 1 hour | P1 | Not Started |
| WebSocket Reconnection | 🟡 Medium | 2 hours | P1 | Not Started |
| ConnectionContext Migration | 🟡 Medium | 3 hours | P1 | Not Started |
| Dynamic Workflow Completion | 🟡 Medium | 4 hours | P2 | Not Started |
| Rate Limiting | 🟡 Medium | 1 hour | P2 | Not Started |
| File Cleanup on Delete | 🟢 Low | 1 hour | P3 | Not Started |

---

## ⚡ 6. Performance & Scalability

### Bottlenecks Identified

1. **Database Queries** (P0)
   - No indexes on foreign keys
   - N+1 query pattern in dreams route
   - **Fix**: Add indexes, implement pagination

2. **WebSocket Connections** (P1)
   - No connection pooling
   - No reconnection logic
   - **Fix**: Implement resilient WebSocket wrapper

3. **File I/O** (P2)
   - Synchronous writes block event loop
   - **Fix**: Use `fs.promises` everywhere

4. **External API Calls** (P2)
   - No timeout handling
   - No retry logic
   - **Fix**: Implement timeout + exponential backoff

---

## 📋 7. Implementation Roadmap

### Phase 1: Security & Critical Fixes (Week 1)
**Effort**: 2 hours

- [ ] Move JWT_SECRET to environment variable
- [ ] Add database indexes
- [ ] Implement rate limiting on auth routes
- [ ] Add input validation to `/api/ai/analyze`

### Phase 2: Performance Optimization (Week 2)
**Effort**: 4 hours

- [ ] Implement pagination on dreams route
- [ ] Replace synchronous file I/O with async
- [ ] Add timeout handling to external API calls
- [ ] Implement WebSocket reconnection logic

### Phase 3: Technical Debt Cleanup (Week 3)
**Effort**: 6 hours

- [ ] Remove deprecated Gemini functions
- [ ] Migrate ConnectionContext to EngineContext
- [ ] Complete Dynamic Workflow Engine graph traversal
- [ ] Extract robust JSON parser to utility

### Phase 4: Reliability & Monitoring (Week 4)
**Effort**: 3 hours

- [ ] Implement database migration system
- [ ] Add daily backup script
- [ ] Implement file cleanup on dream deletion
- [ ] Add user storage quota enforcement

---

## 🎯 Conclusion

The backend architecture is **fundamentally sound** but has **critical security and performance issues** that need immediate attention. The codebase shows good engineering practices (authentication, error handling, modular design) but lacks production-ready hardening.

### Key Strengths
✅ Modular service architecture  
✅ Proper authentication middleware  
✅ Comprehensive AI service integrations  
✅ Clean separation of concerns  

### Key Weaknesses
❌ Security vulnerabilities (hardcoded secrets, no rate limiting)  
❌ Performance issues (missing indexes, N+1 queries)  
❌ Technical debt (deprecated code, incomplete features)  
❌ Lack of resilience (no retry logic, no WebSocket reconnection)  

### Recommended Next Steps
1. **Immediate**: Fix P0 security issues (JWT secret, DB indexes)
2. **Short-term**: Implement P1 performance optimizations
3. **Medium-term**: Clean up technical debt (P2)
4. **Long-term**: Add monitoring, logging, and observability

**Total Estimated Effort**: 12-15 hours across 4 weeks

---

**Report Status**: ✅ COMPLETE  
**Next Action**: Present to Manager for prioritization and task assignment
