const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const authRoutes = require('./routes/auth');
const dreamRoutes = require('./routes/dreams');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Storage Static Serve (Matches what's in routes/dreams.js)
const STORAGE_DIR = path.join(__dirname, '..', 'saved_dreams');
app.use('/storage', express.static(STORAGE_DIR));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/db/dreams', dreamRoutes);

const server = app.listen(PORT, () => {
    console.log(`AnimatedDreams Server running on port ${PORT}`);
});
