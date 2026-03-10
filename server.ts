import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("todos.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
  );
  CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER,
    text TEXT,
    completed INTEGER DEFAULT 0,
    dueDate DATETIME,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(userId) REFERENCES users(id)
  );
`);

// Migration: Ensure columns exist for existing databases
const tableInfoUsers = db.prepare("PRAGMA table_info(users)").all() as any[];
if (!tableInfoUsers.find(col => col.name === 'password')) {
  db.exec("ALTER TABLE users ADD COLUMN password TEXT");
}

const tableInfoTodos = db.prepare("PRAGMA table_info(todos)").all() as any[];
if (!tableInfoTodos.find(col => col.name === 'dueDate')) {
  db.exec("ALTER TABLE todos ADD COLUMN dueDate DATETIME");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Auth API
  app.post("/api/register", (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Username and password required" });

    try {
      const info = db.prepare("INSERT INTO users (username, password) VALUES (?, ?)").run(username, password);
      const user = { id: info.lastInsertRowid, username };
      res.json({ user, token: `mock-token-${user.id}` });
    } catch (error: any) {
      console.error('Registration error:', error);
      if (error.code === 'SQLITE_CONSTRAINT') {
        res.status(400).json({ error: "Username already exists" });
      } else {
        res.status(500).json({ error: "Registration failed: " + error.message });
      }
    }
  });

  app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Username and password required" });

    const user = db.prepare("SELECT * FROM users WHERE username = ? AND password = ?").get(username, password) as any;
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    res.json({ user: { id: user.id, username: user.username }, token: `mock-token-${user.id}` });
  });

  // Todos API
  app.get("/api/todos", (req, res) => {
    const userId = req.headers["x-user-id"];
    const sortBy = req.query.sortBy || 'createdAt'; // 'createdAt' or 'dueDate'
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    
    let query = "SELECT * FROM todos WHERE userId = ?";
    if (sortBy === 'dueDate') {
      query += " ORDER BY dueDate ASC, createdAt DESC";
    } else {
      query += " ORDER BY createdAt DESC";
    }
    
    const todos = db.prepare(query).all(userId);
    res.json(todos.map((t: any) => ({ ...t, completed: !!t.completed })));
  });

  app.post("/api/todos", (req, res) => {
    const userId = req.headers["x-user-id"];
    const { text, dueDate } = req.body;
    if (!userId || !text) return res.status(400).json({ error: "Invalid request" });
    const info = db.prepare("INSERT INTO todos (userId, text, dueDate) VALUES (?, ?, ?)").run(userId, text, dueDate || null);
    res.json({ id: info.lastInsertRowid, userId, text, completed: false, dueDate: dueDate || null });
  });

  app.patch("/api/todos/:id", (req, res) => {
    const userId = req.headers["x-user-id"];
    const { id } = req.params;
    const { completed } = req.body;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    db.prepare("UPDATE todos SET completed = ? WHERE id = ? AND userId = ?").run(completed ? 1 : 0, id, userId);
    res.json({ success: true });
  });

  app.delete("/api/todos/:id", (req, res) => {
    const userId = req.headers["x-user-id"];
    const { id } = req.params;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    db.prepare("DELETE FROM todos WHERE id = ? AND userId = ?").run(id, userId);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
