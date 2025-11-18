const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Define the database path. Use Render's disk path if available, otherwise use local file.
const dbPath = process.env.RENDER_DISK_MOUNT_PATH
  ? path.join(process.env.RENDER_DISK_MOUNT_PATH, "database.db")
  : path.join(__dirname, "database.db"); // local use

// Connect to SQLite database
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("Database connection error:", err.message);
    }
    console.log("Connected to SQLite database at:", dbPath);
});

db.serialize(() => {
    // Create feedback table
    db.run(`CREATE TABLE IF NOT EXISTS feedback(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        rating INT NOT NULL,
        email TEXT NOT NULL,
        feedback TEXT NOT NULL,
        submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // --- Database Migration ---
    // This block checks if the 'rating' column exists. If not, it adds it.
    // This prevents errors if the app is run with an older database file.
    db.all("PRAGMA table_info(feedback)", (err, columns) => {
        if (err) {
            console.error("Could not read feedback table schema:", err.message);
            return;
        }
        const hasRatingColumn = columns.some(col => col.name === 'rating');
        if (!hasRatingColumn) {
            console.log("Schema outdated. Adding 'rating' column to feedback table...");
            db.run("ALTER TABLE feedback ADD COLUMN rating INTEGER");
        }

        // Migration for is_deleted
        const hasIsDeletedColumn = columns.some(col => col.name === 'is_deleted');
        if (!hasIsDeletedColumn) {
            console.log("Schema outdated. Adding 'is_deleted' column to feedback table...");
            db.run("ALTER TABLE feedback ADD COLUMN is_deleted INTEGER DEFAULT 0 NOT NULL", (err) => {
                if (err) {
                    console.error("Failed to add is_deleted column:", err.message);
                }
            });
        }
    });

    // Create users table for admin
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
    )`);

    const bcrypt = require('bcryptjs'); // Moved bcrypt import here to avoid circular dependency issues if db.js is imported before server.js
    // Create update_logs table
    db.run(`CREATE TABLE IF NOT EXISTS update_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        admin_user TEXT NOT NULL,
        description TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_deleted INTEGER DEFAULT 0 NOT NULL
    )`);

    // Create a default admin user if one doesn't exist
    const adminUsername = 'admin';
    const adminPassword = 'Gmu@2025'; // Plain text for setup

    db.get(`SELECT * FROM users WHERE username = ?`, [adminUsername], (err, row) => {
        if (err) {
            console.error("Error checking for admin user:", err.message);
            return;
        }
        if (!row) {
            bcrypt.hash(adminPassword, 10, (err, hash) => {
                if (err) {
                    console.error("Error hashing password:", err.message);
                    return;
                }
                db.run(`INSERT INTO users (username, password) VALUES (?, ?)`, [adminUsername, hash], (err) => {
                    if (err) {
                        console.error("Error creating admin user:", err.message);
                    } else {
                        console.log(`Default admin user '${adminUsername}' created with password '${adminPassword}'. You can now log in at /admin.html.`);
                    }
                });
            });
        }
    });

    // --- Database Migration for update_logs ---
    db.all("PRAGMA table_info(update_logs)", (err, columns) => {
        if (err) {
            console.error("Could not read update_logs table schema:", err.message);
            return;
        }
        const hasIsDeletedColumn = columns.some(col => col.name === 'is_deleted');
        if (!hasIsDeletedColumn) {
            console.log("Schema outdated. Adding 'is_deleted' column to update_logs table...");
            db.run("ALTER TABLE update_logs ADD COLUMN is_deleted INTEGER DEFAULT 0 NOT NULL", (alterErr) => {
                if (alterErr) console.error("Failed to add is_deleted column to update_logs:", alterErr.message);
            });
        }
    });
});

module.exports = db;