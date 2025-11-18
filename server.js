const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const db = require('./database.js');
const bcrypt = require('bcryptjs'); // Keep bcrypt for login functionality

const app = express();
const port = process.env.PORT || 3000;
const host = '0.0.0.0';

// Middleware
app.use(cors({
    origin: "https://gmu-nav.onrender.com",
    methods: ["GET", "POST", "DELETE"],
    allowedHeaders: ["Content-Type"]
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from the root directory (for admin.html, etc.)
app.use(express.static('public')); // <-- place your UI in /public folder

// API endpoint to handle feedback submission
app.post('/api/feedback', (req, res) => {
    const { name, email, rating, feedback } = req.body;
    
    if (!name || !email || rating === undefined || !feedback) {
        return res.status(400).json({ message: 'Name, email, rating, and feedback are all required.' });
    }

    const stmt = db.prepare("INSERT INTO feedback (name, rating, email, feedback) VALUES (?, ?, ?, ?)");
    stmt.run(name, parseInt(rating, 10), email, feedback, function(err) {
        if (err) {
            return res.status(500).json({ message: 'Error saving feedback.', error: err.message });
        }
        res.status(201).json({ message: 'Feedback submitted successfully!', id: this.lastID });
    });
    stmt.finalize();
});

// API endpoint to get all feedback (for admin)
app.get('/api/feedback', (req, res) => {
    db.all("SELECT id, name, email, rating, feedback, submitted_at FROM feedback WHERE is_deleted = 0 ORDER BY submitted_at DESC", [], (err, rows) => {    
        if (err) {
            res.status(500).json({ "error": err.message });
            return;
        }
        res.json({
            "message": "success",
            "data": rows
        });
    });
});

// API endpoint to "soft delete" all feedback (move to recycle bin)
app.delete('/api/feedback', (req, res) => {
    db.run("UPDATE feedback SET is_deleted = 1 WHERE is_deleted = 0", function(err) {
        if (err) {
            return res.status(500).json({ success: false, message: 'Failed to move feedback to recycle bin.', error: err.message });
        }
        if (this.changes === 0) {
            return res.status(200).json({ success: true, message: 'No active feedback to move to the recycle bin.' });
        }
        res.status(200).json({ success: true, message: `${this.changes} feedback items moved to the recycle bin.` });
    });
});

// --- Recycle Bin Endpoints ---

// Get all "deleted" feedback items
app.get('/api/recyclebin', (req, res) => {
    db.all("SELECT id, name, email, rating, feedback, submitted_at FROM feedback WHERE is_deleted = 1 ORDER BY submitted_at DESC", [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: "success", data: rows });
    });
});

// Restore a single feedback item
app.post('/api/recyclebin/restore/:id', (req, res) => {
    const { id } = req.params;
    db.run("UPDATE feedback SET is_deleted = 0 WHERE id = ?", [id], function(err) {
        if (err) {
            return res.status(500).json({ success: false, message: 'Failed to restore feedback.', error: err.message });
        }
        res.status(200).json({ success: true, message: 'Feedback restored successfully.' });
    });
});

// Permanently delete all items in the recycle bin
app.delete('/api/recyclebin/empty', (req, res) => {
    db.run("DELETE FROM feedback WHERE is_deleted = 1", function(err) {
        if (err) {
            return res.status(500).json({ success: false, message: 'Failed to empty recycle bin.', error: err.message });
        }
        res.status(200).json({ success: true, message: `Recycle bin emptied. ${this.changes} items permanently deleted.` });
    });
});

// API endpoint to get the average rating
app.get('/api/feedback/average', (req, res) => {
    db.get("SELECT AVG(rating) AS average FROM feedback WHERE is_deleted = 0", [], (err, result) => {
        if (err) {
            res.status(500).json({ "error": err.message });
            return;
        }
        if (!result) {
            res.status(404).json({ "message": "No feedback found." });
            return;
        }
        res.json({
            "message": "success",
            "average": result.average || 0 // Return 0 if no ratings exist
        });
    });
});
// API endpoint to log a new update
app.post('/api/logs', (req, res) => {
    const { description } = req.body;
    // In a real multi-user system, you'd get the user from a session token
    const admin_user = 'admin'; 

    if (!description) {
        return res.status(400).json({ message: 'Log description is required.' });
    }

    const stmt = db.prepare("INSERT INTO update_logs (admin_user, description) VALUES (?, ?)");
    stmt.run(admin_user, description, function(err) {
        if (err) {
            return res.status(500).json({ message: 'Error saving log.', error: err.message });
        }
        res.status(201).json({ message: 'Log saved successfully!', id: this.lastID });
    });
    stmt.finalize();
});

// API endpoint to get all logs
app.get('/api/logs', (req, res) => {
    db.all("SELECT * FROM update_logs WHERE is_deleted = 0 ORDER BY timestamp DESC", [], (err, rows) => {
        if (err) {
            res.status(500).json({ "error": err.message });
            return;
        }
        res.json({
            "message": "success",
            "data": rows
        });
    });
});

// API endpoint to "soft delete" all logs (move to recycle bin)
app.delete('/api/logs', (req, res) => {
    db.run("UPDATE update_logs SET is_deleted = 1 WHERE is_deleted = 0", function(err) {
        if (err) {
            return res.status(500).json({ success: false, message: 'Failed to move logs to recycle bin.', error: err.message });
        }
        if (this.changes === 0) {
            return res.status(200).json({ success: true, message: 'No active logs to move to the recycle bin.' });
        }
        res.status(200).json({ success: true, message: `${this.changes} logs moved to the recycle bin.` });
    });
});

// --- Log Recycle Bin Endpoints ---

app.get('/api/logs/recyclebin', (req, res) => {
    db.all("SELECT * FROM update_logs WHERE is_deleted = 1 ORDER BY timestamp DESC", [], (err, rows) => {
        if (err) { return res.status(500).json({ error: err.message }); }
        res.json({ message: "success", data: rows });
    });
});

app.post('/api/logs/recyclebin/restore/:id', (req, res) => {
    const { id } = req.params;
    db.run("UPDATE update_logs SET is_deleted = 0 WHERE id = ?", [id], function(err) {
        if (err) {
            return res.status(500).json({ success: false, message: 'Failed to restore log.', error: err.message });
        }
        res.status(200).json({ success: true, message: 'Log restored successfully.' });
    });
});

app.delete('/api/logs/recyclebin/empty', (req, res) => {
    db.run("DELETE FROM update_logs WHERE is_deleted = 1", function(err) {
        if (err) {
            return res.status(500).json({ success: false, message: 'Failed to empty log recycle bin.', error: err.message });
        }
        res.status(200).json({ success: true, message: `Log recycle bin emptied. ${this.changes} items permanently deleted.` });
    });
});

// API endpoint to "soft delete" all logs (move to recycle bin)
app.delete('/api/logs', (req, res) => {
    db.run("UPDATE update_logs SET is_deleted = 1 WHERE is_deleted = 0", function(err) {
        if (err) {
            return res.status(500).json({ success: false, message: 'Failed to move logs to recycle bin.', error: err.message });
        }
        if (this.changes === 0) {
            return res.status(200).json({ success: true, message: 'No active logs to move to the recycle bin.' });
        }
        res.status(200).json({ success: true, message: `${this.changes} logs moved to the recycle bin.` });
    });
});

// --- Log Recycle Bin Endpoints ---

app.get('/api/logs/recyclebin', (req, res) => {
    db.all("SELECT * FROM update_logs WHERE is_deleted = 1 ORDER BY timestamp DESC", [], (err, rows) => {
        if (err) { return res.status(500).json({ error: err.message }); }
        res.json({ message: "success", data: rows });
    });
});

app.post('/api/logs/recyclebin/restore/:id', (req, res) => {
    const { id } = req.params;
    db.run("UPDATE update_logs SET is_deleted = 0 WHERE id = ?", [id], function(err) {
        if (err) {
            return res.status(500).json({ success: false, message: 'Failed to restore log.', error: err.message });
        }
        res.status(200).json({ success: true, message: 'Log restored successfully.' });
    });
});

app.delete('/api/logs/recyclebin/empty', (req, res) => {
    db.run("DELETE FROM update_logs WHERE is_deleted = 1", function(err) {
        if (err) {
            return res.status(500).json({ success: false, message: 'Failed to empty log recycle bin.', error: err.message });
        }
        res.status(200).json({ success: true, message: `Log recycle bin emptied. ${this.changes} items permanently deleted.` });
    });
});

// Redirect login button to a future admin login page
app.post('/api/login', (req, res) => {    
    const { username, password } = req.body;

    db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Server error.' });
        }
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Error comparing passwords.' });
            }
            if (isMatch) {
                res.json({ success: true, message: 'Login successful' });
            } else {
                res.status(401).json({ success: false, message: 'Invalid credentials.' });
            }
        });
    });
});

app.listen(port, host, () => {
    console.log(`Server running on http://${host}:${port}`);
});
