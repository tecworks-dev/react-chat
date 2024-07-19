const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const cors = require('cors');
const path = require('path');

const app = express();
const port = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, 'client/build')));

// Database setup
const dbPath = path.resolve(__dirname, 'telegram_clone.db');


const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
  if (err) {
    console.error('Error opening database', err);
  } else {
    console.log('Connected to the SQLite database.');
    initializeDatabase();
  }
});

function initializeDatabase() {
  db.serialize(() => {
    // Create users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      is_admin INTEGER
    )`);

    // Create contacts table
    db.run(`CREATE TABLE IF NOT EXISTS contacts (
      user_id INTEGER,
      contact_id INTEGER,
      FOREIGN KEY (user_id) REFERENCES users (id),
      FOREIGN KEY (contact_id) REFERENCES users (id),
      PRIMARY KEY (user_id, contact_id)
    )`);

    // Create messages table
    db.run(`CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT,
      from_user INTEGER,
      to_user INTEGER,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (from_user) REFERENCES users (id),
      FOREIGN KEY (to_user) REFERENCES users (id)
    )`);

    // Check if admin user exists, if not create one
    db.get("SELECT * FROM users WHERE username = 'admin'", async (err, row) => {
      if (err) {
        console.error('Error checking for admin user:', err);
      } else if (!row) {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        db.run('INSERT INTO users (username, password, is_admin) VALUES (?, ?, 1)', ['admin', hashedPassword], (err) => {
          if (err) {
            console.error('Error creating admin user:', err);
          } else {
            console.log('Admin user created successfully');
          }
        });
      }
    });
  });
}

// API Routes
// Note: All API routes are now prefixed with '/api'

// Register
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  db.run('INSERT INTO users (username, password, is_admin) VALUES (?, ?, 0)', [username, hashedPassword], function(err) {
    if (err) {
      res.status(400).json({ error: 'Username already exists' });
    } else {
		db.get('SELECT id FROM users WHERE username = ?', "admin", (err, user) => {
		if (err || !user) {
		  res.status(400).json({ error: 'User not found' });
		} else {
		  db.run('INSERT INTO contacts (user_id, contact_id) VALUES (?, ?)', [this.lastID, user.id], (err) => {
			if (err) {
			  console.log(err)
			} 
		  });
		}
	  });
      res.status(201).json({ id: this.lastID, username });
    }
  });
});

// Login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err || !user) {
      res.status(400).json({ error: 'Invalid credentials' });
    } else {
      const match = await bcrypt.compare(password, user.password);
      if (match) {
        res.json({ id: user.id, username: user.username, isAdmin: user.is_admin === 1 });
      } else {
        res.status(400).json({ error: 'Invalid credentials' });
      }
    }
  });
});
// Switch user perspective (admin only)
app.post('/api/switch-user', (req, res) => {
  const { adminId, targetUserId } = req.body;
  db.get('SELECT * FROM users WHERE id = ? AND is_admin = 1', [adminId], (err, admin) => {
    if (err || !admin) {
      res.status(403).json({ error: 'Unauthorized' });
    } else {
      db.get('SELECT id, username, is_admin FROM users WHERE id = ?', [targetUserId], (err, user) => {
        if (err || !user) {
          res.status(404).json({ error: 'User not found' });
        } else {
          res.json({ ...user, originalAdmin: adminId });
        }
      });
    }
  });
});
// Get contacts
app.get('/api/contacts/:userId', (req, res) => {
  const userId = req.params.userId;
	if (userId == 1) 
	db.all('SELECT users.id, users.username FROM users',  (err, rows) => {
    if (err) {
      res.status(500).json({ error: 'Error fetching contacts' });
    } else {
      res.json(rows);
    }
	});
	else {
  db.all('SELECT users.id, users.username FROM users INNER JOIN contacts ON users.id = contacts.contact_id WHERE contacts.user_id = ?', [userId], (err, rows) => {
    if (err) {
      res.status(500).json({ error: 'Error fetching contacts' });
    } else {
      res.json(rows);
    }
	});
	}
});

// Add contact
app.post('/api/contacts', (req, res) => {
  const { userId, contactUsername } = req.body;
  db.get('SELECT id FROM users WHERE username = ?', [contactUsername], (err, user) => {
    if (err || !user) {
      res.status(400).json({ error: 'User not found' });
    } else {
      db.run('INSERT INTO contacts (user_id, contact_id) VALUES (?, ?)', [userId, user.id], (err) => {
        if (err) {
          res.status(400).json({ error: 'Contact already exists' });
        } else {
          res.status(201).json({ message: 'Contact added successfully' });
        }
      });
    }
  });
});

// Get messages
app.get('/api/messages/:userId/:contactId', (req, res) => {
  const { userId, contactId } = req.params;
  db.all('SELECT * FROM messages WHERE (from_user = ? AND to_user = ?) OR (from_user = ? AND to_user = ?) ORDER BY timestamp', [userId, contactId, contactId, userId], (err, rows) => {
    if (err) {
      res.status(500).json({ error: 'Error fetching messages' });
    } else {
      res.json(rows);
    }
  });
});


// Broadcast message
app.post('/api/broadcast', (req, res) => {
  const { fromUser, content } = req.body;
  
  // First, get all users except the sender
  db.all('SELECT id FROM users WHERE id != ?', [fromUser], (err, users) => {
    if (err) {
      res.status(500).json({ error: 'Error fetching users for broadcast' });
    } else {
      // Prepare the statement for inserting messages
      const stmt = db.prepare('INSERT INTO messages (from_user, to_user, content) VALUES (?, ?, ?)');
      
      // Insert a message for each recipient
      users.forEach(user => {
        stmt.run(fromUser, user.id, content, (err) => {
          if (err) {
            console.error('Error sending broadcast message to user', user.id, err);
          }
        });
      });
      
      // Finalize the statement
      stmt.finalize((err) => {
        if (err) {
          res.status(500).json({ error: 'Error finalizing broadcast' });
        } else {
          res.status(201).json({ message: 'Broadcast sent successfully' });
        }
      });
    }
  });
});

// Send message
app.post('/api/messages', (req, res) => {
  const { fromUser, toUser, content } = req.body;
  db.run('INSERT INTO messages (from_user, to_user, content) VALUES (?, ?, ?)', [fromUser, toUser, content], function(err) {
    if (err) {
      res.status(500).json({ error: 'Error sending message' });
    } else {
      res.status(201).json({ id: this.lastID, fromUser, toUser, content, timestamp: new Date() });
    }
  });
});

// Change password
app.put('/api/change-password', async (req, res) => {
  const { userId, newPassword } = req.body;
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId], (err) => {
    if (err) {
      res.status(500).json({ error: 'Error changing password' });
    } else {
      res.json({ message: 'Password changed successfully' });
    }
  });
});

// Global search
app.get('/api/search/:userId/:term', (req, res) => {
  const { userId, term } = req.params;
  const searchTerm = `%${term}%`;
  db.all(`
    SELECT m.*, u1.username as from_username, u2.username as to_username
    FROM messages m
    JOIN users u1 ON m.from_user = u1.id
    JOIN users u2 ON m.to_user = u2.id
    WHERE (m.from_user = ? OR m.to_user = ?)
    AND (m.content LIKE ? OR u1.username LIKE ? OR u2.username LIKE ?)
  `, [userId, userId, searchTerm, searchTerm, searchTerm], (err, rows) => {
    if (err) {
      res.status(500).json({ error: 'Error performing search' });
    } else {
      res.json(rows);
    }
  });
});

// Handles any requests that don't match the ones above
app.get('*', (req, res) =>{
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

// Start server
app.listen(port,"0.0.0.0", () => {
  console.log(`Server running on port ${port}`);
});
