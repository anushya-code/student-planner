const express = require('express');
const STATUSES = ['Pending', 'In Progress', 'Completed'];

module.exports = (db) => {
  const r = express.Router();

  function clean(body) {
    const title = String(body.title || '').trim();
    const deadline = String(body.deadline || '');
    const status = body.status || 'Pending';
    const subject_id = Number(body.subject_id);
    if (!title || !subject_id) return { error: 'Subject and assignment name are required.' };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(deadline)) return { error: 'Please choose a deadline.' };
    if (!STATUSES.includes(status)) return { error: 'Invalid status.' };
    return { title, deadline, status, subject_id };
  }

  // list, with optional ?search=...&status=...
  r.get('/', (req, res) => {
    const search = '%' + String(req.query.search || '').trim() + '%';
    const status = req.query.status;
    let sql = `SELECT a.id, a.title, a.deadline, a.status, a.subject_id, s.name AS subject
               FROM assignments a JOIN subjects s ON s.id = a.subject_id
               WHERE (a.title LIKE ? OR s.name LIKE ?)`;
    const args = [search, search];
    if (STATUSES.includes(status)) { sql += ' AND a.status = ?'; args.push(status); }
    sql += ' ORDER BY a.deadline';
    res.json(db.prepare(sql).all(...args));
  });

  // dashboard numbers + nearest unfinished deadline
  r.get('/stats', (req, res) => {
    const count = (where) => db.prepare('SELECT COUNT(*) c FROM assignments ' + where).get().c;
    res.json({
      subjects: db.prepare('SELECT COUNT(*) c FROM subjects').get().c,
      total: count(''),
      completed: count("WHERE status = 'Completed'"),
      pending: count("WHERE status = 'Pending'"),
      inProgress: count("WHERE status = 'In Progress'"),
      upcoming: db.prepare(`SELECT a.title, a.deadline, s.name AS subject
        FROM assignments a JOIN subjects s ON s.id = a.subject_id
        WHERE a.status != 'Completed' ORDER BY a.deadline LIMIT 1`).get() || null
    });
  });

  r.post('/', (req, res) => {
    const d = clean(req.body);
    if (d.error) return res.status(400).json(d);
    const info = db.prepare('INSERT INTO assignments (subject_id, title, deadline, status) VALUES (?,?,?,?)')
      .run(d.subject_id, d.title, d.deadline, d.status);
    res.status(201).json({ id: info.lastInsertRowid });
  });

  r.put('/:id', (req, res) => {
    const d = clean(req.body);
    if (d.error) return res.status(400).json(d);
    db.prepare('UPDATE assignments SET subject_id=?, title=?, deadline=?, status=? WHERE id=?')
      .run(d.subject_id, d.title, d.deadline, d.status, req.params.id);
    res.json({ ok: true });
  });

  r.delete('/:id', (req, res) => {
    db.prepare('DELETE FROM assignments WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
  });

  return r;
};