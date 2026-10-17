const express = require('express');

module.exports = (db) => {
  const r = express.Router();

  r.get('/', (req, res) => {
    res.json(db.prepare(`
      SELECT s.id, s.name, COUNT(a.id) AS count
      FROM subjects s LEFT JOIN assignments a ON a.subject_id = s.id
      GROUP BY s.id ORDER BY s.name`).all());
  });

  r.post('/', (req, res) => {
    const name = String(req.body.name || '').trim();
    if (!name) return res.status(400).json({ error: 'Subject name is required.' });
    try {
      const info = db.prepare('INSERT INTO subjects (name) VALUES (?)').run(name);
      res.status(201).json({ id: info.lastInsertRowid, name });
    } catch (e) {
      res.status(409).json({ error: 'That subject already exists.' });
    }
  });

  r.delete('/:id', (req, res) => {
    db.prepare('DELETE FROM subjects WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
  });

  return r;
};