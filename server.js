const path = require('path');
const fs = require('fs');
const express = require('express');
const Database = require('better-sqlite3');

const PORT = process.env.PORT || 3000;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'study.db');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('foreign_keys = ON');
db.exec(fs.readFileSync(path.join(__dirname, 'assignments.sql'), 'utf8'));

const app = express();
app.use(express.json());
app.use('/api/subjects', require('./subjectRoutes')(db));
app.use('/api/assignments', require('./assignmentRoutes')(db));

// serve only the three frontend files (keeps server.js and the database private)
['index.html', 'style.css', 'script.js'].forEach((f) => {
  app.get(f === 'index.html' ? ['/', '/index.html'] : '/' + f, (req, res) =>
    res.sendFile(path.join(__dirname, f)));
});

app.listen(PORT, '0.0.0.0', () => console.log('Study Planner running on port ' + PORT));