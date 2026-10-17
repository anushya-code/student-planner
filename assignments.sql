-- Study Planner database (SQLite)
CREATE TABLE IF NOT EXISTS subjects (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS assignments (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  deadline   TEXT NOT NULL,            -- stored as YYYY-MM-DD
  status     TEXT NOT NULL DEFAULT 'Pending'
             CHECK (status IN ('Pending', 'In Progress', 'Completed'))
);

-- Sample data (only added once)
INSERT OR IGNORE INTO subjects (id, name) VALUES (1, 'Web Technology'), (2, 'JavaScript'), (3, 'PHP');
INSERT OR IGNORE INTO assignments (id, subject_id, title, deadline, status) VALUES
  (1, 1, 'HTML Forms',       '2026-09-30', 'Completed'),
  (2, 2, 'DOM Manipulation', '2026-10-03', 'In Progress'),
  (3, 3, 'Form Validation',  '2026-10-05', 'Pending');