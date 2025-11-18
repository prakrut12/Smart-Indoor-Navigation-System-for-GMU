const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const db = require('./database.js');
const bcrypt = require('bcryptjs');

const app = express();
const port = process.env.PORT || 3000;
const host = '0.0.0.0';

// CORS
app.use(cors({
  origin: ["https://smart-indoor-navigation-system-for-gmu.onrender.com"],
  methods: ["GET", "POST", "DELETE"],
  allowedHeaders: ["Content-Type"]
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve UI files from public folder
app.use(express.static('public'));

// =============================================================
// FEEDBACK MODULE
// =============================================================

// Submit feedback
app.post('/api/feedback', (req, res) => {
  const { name, email, rating, feedback } = req.body;

  if (!name || !email || rating === undefined || !feedback) {
    return res.status(400).json({ message: 'All fields required.' });
  }

  const stmt = db.prepare("INSERT INTO feedback (name, rating, email, feedback) VALUES (?, ?, ?, ?)");
  stmt.run(name, parseInt(rating), email, feedback, function (err) {
    if (err) return res.status(500).json({ message: 'Error saving feedback.' });
    res.status(201).json({ message: 'Feedback submitted.', id: this.lastID });
  });
  stmt.finalize();
});

// Fetch active feedback
app.get('/api/feedback', (req, res) => {
  db.all(
    "SELECT * FROM feedback WHERE is_deleted = 0 ORDER BY submitted_at DESC",
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "success", data: rows });
    }
  );
});

// Move feedback → recycle bin
app.delete('/api/feedback', (req, res) => {
  db.run("UPDATE feedback SET is_deleted = 1 WHERE is_deleted = 0", function (err) {
    if (err) return res.status(500).json({ message: 'Error deleting feedback.' });
    res.json({ success: true, message: `${this.changes} moved to recycle bin.` });
  });
});

// Fetch deleted feedback
app.get('/api/feedback/recyclebin', (req, res) => {
  db.all(
    "SELECT * FROM feedback WHERE is_deleted = 1 ORDER BY submitted_at DESC",
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "success", data: rows });
    }
  );
});

// Restore feedback item
app.post('/api/feedback/recyclebin/restore/:id', (req, res) => {
  db.run("UPDATE feedback SET is_deleted = 0 WHERE id = ?", [req.params.id], function (err) {
    if (err) return res.status(500).json({ message: 'Restore failed.' });
    res.json({ success: true, message: 'Restored successfully.' });
  });
});

// Empty recycle bin permanently
app.delete('/api/feedback/recyclebin/empty', (req, res) => {
  db.run("DELETE FROM feedback WHERE is_deleted = 1", function (err) {
    if (err) return res.status(500).json({ message: 'Empty failed.' });
    res.json({ success: true, message: `Deleted ${this.changes} items.` });
  });
});

// Average rating
app.get('/api/feedback/average', (req, res) => {
  db.get("SELECT AVG(rating) AS average FROM feedback WHERE is_deleted = 0", [], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "success", average: result?.average || 0 });
  });
});

// =============================================================
// UPDATE LOGS MODULE
// =============================================================

// Create new update log
app.post('/api/logs', (req, res) => {
  const { description } = req.body;

  if (!description) return res.status(400).json({ message: 'Description required.' });

  const stmt = db.prepare("INSERT INTO update_logs (admin_user, description) VALUES (?, ?)");
  stmt.run("admin", description, function (err) {
    if (err) return res.status(500).json({ message: 'Error saving log.' });
    res.json({ message: 'Log saved.', id: this.lastID });
  });
  stmt.finalize();
});

// Fetch active logs
app.get('/api/logs', (req, res) => {
  db.all(
    "SELECT * FROM update_logs WHERE is_deleted = 0 ORDER BY timestamp DESC",
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "success", data: rows });
    }
  );
});

// Move logs → recycle bin
app.delete('/api/logs', (req, res) => {
  db.run("UPDATE update_logs SET is_deleted = 1 WHERE is_deleted = 0", function (err) {
    if (err) return res.status(500).json({ message: 'Error deleting logs.' });
    res.json({ success: true, message: `${this.changes} logs moved.` });
  });
});

// Fetch deleted logs
app.get('/api/logs/recyclebin', (req, res) => {
  db.all(
    "SELECT * FROM update_logs WHERE is_deleted = 1 ORDER BY timestamp DESC",
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "success", data: rows });
    }
  );
});

// Restore log
app.post('/api/logs/recyclebin/restore/:id', (req, res) => {
  db.run("UPDATE update_logs SET is_deleted = 0 WHERE id = ?", [req.params.id], function (err) {
    if (err) return res.status(500).json({ message: 'Restore failed.' });
    res.json({ success: true, message: 'Log restored.' });
  });
});

// Empty log recycle bin
app.delete('/api/logs/recyclebin/empty', (req, res) => {
  db.run("DELETE FROM update_logs WHERE is_deleted = 1", function (err) {
    if (err) return res.status(500).json({ message: 'Empty failed.' });
    res.json({ success: true, message: `Deleted ${this.changes} logs.` });
  });
});

// =============================================================
// LOGIN
// =============================================================
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
    if (err) return res.status(500).json({ message: "Server error." });

    if (!user) return res.status(401).json({ message: "Invalid credentials." });

    bcrypt.compare(password, user.password, (err, match) => {
      if (err) return res.status(500).json({ message: "Error comparing passwords." });
      if (match) res.json({ success: true, message: "Login successful" });
      else res.status(401).json({ message: "Invalid credentials." });
    });
  });
});

// =============================================================
app.listen(port, host, () => {
  console.log(`Server running on http://${host}:${port}`);
});
