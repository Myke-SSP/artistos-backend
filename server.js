import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';

const PORT = process.env.PORT || 3000;
const app = express();
app.use(cors());
app.use(express.json());

// --- DB setup ---
const db = new Database('./data/artistos.db');
db.pragma('journal_mode = WAL');

// Create table for profiles
db.exec(`
CREATE TABLE IF NOT EXISTS profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);

// --- Routes ---
// Health check
app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

// Create profile
app.post('/profiles', (req, res) => {
  const { name } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name is required' });
  const stmt = db.prepare(`INSERT INTO profiles (name) VALUES (?)`);
  const info = stmt.run(name);
  const profile = db.prepare(`SELECT * FROM profiles WHERE id=?`).get(info.lastInsertRowid);
  res.status(201).json(profile);
});

// Get profile
app.get('/profiles/:id', (req, res) => {
  const profile = db.prepare(`SELECT * FROM profiles WHERE id=?`).get(req.params.id);
  if (!profile) return res.status(404).json({ error: 'not found' });
  res.json(profile);
});

// --- US003: Goal Input ---
db.exec(`
CREATE TABLE IF NOT EXISTS goals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL,
  goal_text TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(profile_id) REFERENCES profiles(id)
);
`);

app.post('/goals', (req, res) => {
  const { profile_id, goal_text } = req.body || {};
  if (!profile_id || !goal_text) {
    return res.status(400).json({ error: "profile_id and goal_text are required" });
  }
  const profile = db.prepare(`SELECT id FROM profiles WHERE id=?`).get(profile_id);
  if (!profile) return res.status(404).json({ error: "profile not found" });

  const stmt = db.prepare(`INSERT INTO goals (profile_id, goal_text) VALUES (?, ?)`);
  const info = stmt.run(profile_id, goal_text);
  const goal = db.prepare(`SELECT * FROM goals WHERE id=?`).get(info.lastInsertRowid);
  res.status(201).json(goal);
});
// --- US004: Roadmap Stub ---
db.exec(`
CREATE TABLE IF NOT EXISTS roadmaps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id INTEGER NOT NULL,
  goal_id INTEGER,
  json TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(profile_id) REFERENCES profiles(id),
  FOREIGN KEY(goal_id) REFERENCES goals(id)
);
`);

// Simple stub generator (later we swap GPT here)
function makeStubRoadmap(goal_text) {
  return {
    goal: goal_text,
    activities: [
      {
        title: "Define Your Project Identity",
        description: "Clarify sound and audience",
        tasks: [
          { title: "Write 3-sentence artist statement", steps: ["Draft", "Edit", "Save"] },
          { title: "Pick 3 reference artists", steps: ["List", "Why each", "Notes"] }
        ]
      },
      {
        title: "Establish Release Plan",
        description: "Sketch next 30 days",
        tasks: [
          { title: "Choose single to promote", steps: ["Shortlist", "Pick", "Metadata"] },
          { title: "Outline content calendar", steps: ["Frequency", "Formats", "Dates"] }
        ]
      }
    ]
  };
}

// Endpoint: generate + save stub roadmap
app.post('/roadmaps/generate', (req, res) => {
  const { profile_id, goal_text } = req.body || {};
  if (!profile_id || !goal_text) {
    return res.status(400).json({ error: "profile_id and goal_text are required" });
  }

  // check profile
  const profile = db.prepare(`SELECT id FROM profiles WHERE id=?`).get(profile_id);
  if (!profile) return res.status(404).json({ error: "profile not found" });

  // build stub roadmap
  const roadmapObj = makeStubRoadmap(goal_text);

  // save to DB
  const goal = db.prepare(`SELECT id FROM goals WHERE profile_id=? ORDER BY created_at DESC`).get(profile_id);
  const info = db.prepare(`INSERT INTO roadmaps (profile_id, goal_id, json) VALUES (?, ?, ?)`)
    .run(profile_id, goal?.id || null, JSON.stringify(roadmapObj));
  
  const saved = db.prepare(`SELECT * FROM roadmaps WHERE id=?`).get(info.lastInsertRowid);
  res.status(201).json({ id: saved.id, roadmap: roadmapObj });
});

// --- US006: Fetch latest roadmap for a profile ---
app.get('/roadmaps', (req, res) => {
  const { profile_id } = req.query;
  if (!profile_id) return res.status(400).json({ error: "profile_id required" });

  const row = db.prepare(`SELECT json FROM roadmaps WHERE profile_id=? ORDER BY created_at DESC LIMIT 1`).get(profile_id);
  if (!row) return res.status(404).json({ error: "no roadmap for profile" });

  res.json(JSON.parse(row.json));
});


// --- Start server ---
app.listen(PORT, () => {
  console.log(`ArtistOS backend running at http://localhost:${PORT}`);
});
