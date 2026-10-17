  (function () {
  var $ = function (id) { return document.getElementById(id); };
  var editingId = null;

  /* ---------- local storage "backend" (replaces the Node server) ---------- */
  var DB_KEY = 'studyPlanner.v1';
  var STATUSES = ['Pending', 'In Progress', 'Completed'];
  function freshDb() {
    return { nextId: 10,
      subjects: [{ id: 1, name: 'Web Technology' }, { id: 2, name: 'JavaScript' }, { id: 3, name: 'PHP' }],
      assignments: [
        { id: 1, subject_id: 1, title: 'HTML Forms', deadline: '2026-09-30', status: 'Completed' },
        { id: 2, subject_id: 2, title: 'DOM Manipulation', deadline: '2026-10-03', status: 'In Progress' },
        { id: 3, subject_id: 3, title: 'Form Validation', deadline: '2026-10-05', status: 'Pending' }] };
  }
  var db = (function () {
    try { var d = JSON.parse(localStorage.getItem(DB_KEY)); if (d && d.subjects && d.assignments) return d; } catch (e) {}
    return freshDb();
  })();
  function saveDb() { try { localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch (e) {} }
  function subjectName(id) { var s = db.subjects.filter(function (x) { return x.id === id; })[0]; return s ? s.name : ''; }
  function cleanAss(b) {
    var title = String(b.title || '').trim(), deadline = String(b.deadline || ''), status = b.status || 'Pending', sid = Number(b.subject_id);
    if (!title || !sid) return { error: 'Subject and assignment name are required.' };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(deadline)) return { error: 'Please choose a deadline.' };
    if (STATUSES.indexOf(status) < 0) return { error: 'Invalid status.' };
    return { title: title, deadline: deadline, status: status, subject_id: sid };
  }
  function route(p, m, b, qs) {
    if (p[1] === 'subjects') {
      if (m === 'GET') return db.subjects.map(function (s) {
        return { id: s.id, name: s.name, count: db.assignments.filter(function (a) { return a.subject_id === s.id; }).length };
      }).sort(function (x, y) { return x.name.localeCompare(y.name); });
      if (m === 'POST') {
        var name = String(b.name || '').trim();
        if (!name) return { error: 'Subject name is required.' };
        if (db.subjects.some(function (s) { return s.name.toLowerCase() === name.toLowerCase(); })) return { error: 'That subject already exists.' };
        var ns = { id: db.nextId++, name: name }; db.subjects.push(ns); return ns;
      }
      if (m === 'DELETE') {
        var sid = Number(p[2]);
        db.subjects = db.subjects.filter(function (s) { return s.id !== sid; });
        db.assignments = db.assignments.filter(function (a) { return a.subject_id !== sid; });
        return { ok: true };
      }
    }
    if (p[1] === 'assignments') {
      if (p[2] === 'stats') {
        var c = function (st) { return db.assignments.filter(function (a) { return a.status === st; }).length; };
        var open = db.assignments.filter(function (a) { return a.status !== 'Completed'; })
          .sort(function (x, y) { return x.deadline.localeCompare(y.deadline); })[0];
        return { subjects: db.subjects.length, total: db.assignments.length, completed: c('Completed'), pending: c('Pending'), inProgress: c('In Progress'),
          upcoming: open ? { title: open.title, deadline: open.deadline, subject: subjectName(open.subject_id) } : null };
      }
      if (m === 'GET') {
        var q = (qs.get('search') || '').trim().toLowerCase(), st = qs.get('status');
        return db.assignments.map(function (a) { return { id: a.id, title: a.title, deadline: a.deadline, status: a.status, subject_id: a.subject_id, subject: subjectName(a.subject_id) }; })
          .filter(function (a) { return (!q || (a.title + ' ' + a.subject).toLowerCase().indexOf(q) > -1) && (!st || a.status === st); })
          .sort(function (x, y) { return x.deadline.localeCompare(y.deadline); });
      }
      if (m === 'POST' || m === 'PUT') {
        var d = cleanAss(b); if (d.error) return d;
        if (m === 'POST') { d.id = db.nextId++; db.assignments.push(d); return { id: d.id }; }
        var id = Number(p[2]);
        db.assignments.forEach(function (a) { if (a.id === id) { a.title = d.title; a.deadline = d.deadline; a.status = d.status; a.subject_id = d.subject_id; } });
        return { ok: true };
      }
      if (m === 'DELETE') { var did = Number(p[2]); db.assignments = db.assignments.filter(function (a) { return a.id !== did; }); return { ok: true }; }
    }
    return { error: 'Not found' };
  }
  function api(url, method, body) {
    return new Promise(function (resolve, reject) {
      var u = url.split('?'), p = u[0].replace(/^\//, '').split('/');
      var r = route(p, method || 'GET', body || {}, new URLSearchParams(u[1] || ''));
      if (r && r.error) reject(new Error(r.error)); else { saveDb(); resolve(r); }
    });
  }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; }
  function fmt(iso) { return iso.split('-').reverse().join('-'); }
  function todayIso() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

  /* ---------- navigation ---------- */
  function show(view) {
    document.querySelectorAll('.view').forEach(function (v) { v.hidden = v.id !== view; });
    document.querySelectorAll('.nav').forEach(function (n) { n.classList.toggle('on', n.dataset.view === view); });
    if (view === 'dashboard') loadStats();
    if (view === 'subjects') loadSubjects();
    if (view === 'assignments') { loadSubjects(); loadAssignments(); }
  }
  document.querySelectorAll('.nav').forEach(function (n) { n.onclick = function () { show(n.dataset.view); }; });

  /* ---------- dashboard ---------- */
  function loadStats() {
    api('/api/assignments/stats').then(function (s) {
      $('sSubjects').textContent = s.subjects; $('sTotal').textContent = s.total;
      $('sDone').textContent = s.completed; $('sPending').textContent = s.pending; $('sProg').textContent = s.inProgress;
      var b = $('upBody'); b.textContent = '';
      if (!s.upcoming) { b.appendChild(el('div', 'up-title', 'All caught up!')); b.appendChild(el('div', '', 'No unfinished assignments.')); return; }
      b.appendChild(el('div', 'up-title', s.upcoming.title));
      var line = el('div', '', s.upcoming.subject + '  •  Deadline: ' + fmt(s.upcoming.deadline));
      if (s.upcoming.deadline < todayIso()) line.appendChild(el('span', 'late', '  (Overdue)'));
      b.appendChild(line);
    });
  }

  /* ---------- subjects ---------- */
  function badge(name) {
    var n = name.toLowerCase(), b = el('div', 'badge');
    if (n.indexOf('javascript') > -1 || n === 'js') { b.classList.add('b-js'); b.textContent = 'JS'; }
    else if (n.indexOf('php') > -1) { b.classList.add('b-php'); b.textContent = 'php'; }
    else if (n.indexOf('web') > -1) { b.classList.add('b-web'); b.textContent = '💻'; }
    else { b.classList.add('b-x'); b.textContent = name.charAt(0).toUpperCase(); }
    return b;
  }
  function loadSubjects() {
    api('/api/subjects').then(function (list) {
      var g = $('subGrid'); g.textContent = '';
      if (!list.length) g.appendChild(el('p', 'msg', 'No subjects yet. Add your first subject above.'));
      list.forEach(function (s) {
        var c = el('div', 'sc'); c.appendChild(badge(s.name));
        c.appendChild(el('div', 'name', s.name));
        c.appendChild(el('small', '', s.count + ' assignment(s)'));
        c.appendChild(document.createElement('br'));
        var d = el('button', 'del', '🗑 Delete');
        d.onclick = function () {
          if (confirm('Delete "' + s.name + '" and its assignments?')) api('/api/subjects/' + s.id, 'DELETE').then(loadSubjects);
        };
        c.appendChild(d); g.appendChild(c);
      });
      var sel = $('aSub'), cur = sel.value; sel.textContent = '';
      var ph = el('option', '', 'Select Subject'); ph.value = ''; sel.appendChild(ph);
      list.forEach(function (s) { var o = el('option', '', s.name); o.value = s.id; sel.appendChild(o); });
      sel.value = cur;
    });
  }
  $('addSub').onclick = function () {
    api('/api/subjects', 'POST', { name: $('subName').value }).then(function () {
      $('subName').value = ''; $('subMsg').textContent = ''; loadSubjects();
    }).catch(function (e) { $('subMsg').textContent = e.message; });
  };

  /* ---------- assignments ---------- */
  function resetForm() {
    editingId = null; $('aSub').value = ''; $('aTitle').value = ''; $('aDate').value = ''; $('aStatus').value = 'Pending';
    $('formTitle').textContent = '📋 Add Assignment'; $('saveAss').textContent = '+ Add Assignment'; $('assMsg').textContent = '';
  }
  function loadAssignments() {
    var url = '/api/assignments?search=' + encodeURIComponent($('q').value) + '&status=' + encodeURIComponent($('f').value);
    api(url).then(function (list) {
      var t = $('rows'); t.textContent = '';
      $('empty').hidden = list.length > 0;
      list.forEach(function (a) {
        var tr = el('tr');
        tr.appendChild(el('td', '', a.subject)); tr.appendChild(el('td', '', a.title)); tr.appendChild(el('td', '', fmt(a.deadline)));
        var st = el('td'); st.appendChild(el('span', 'pill p-' + a.status.replace(' ', '-'), a.status)); tr.appendChild(st);
        var ac = el('td');
        var e = el('button', 'edit', 'Edit');
        e.onclick = function () {
          editingId = a.id; $('aSub').value = a.subject_id; $('aTitle').value = a.title; $('aDate').value = a.deadline; $('aStatus').value = a.status;
          $('formTitle').textContent = '✏️ Edit Assignment'; $('saveAss').textContent = 'Save Changes'; window.scrollTo(0, 0);
        };
        var d = el('button', 'del', 'Delete');
        d.onclick = function () { if (confirm('Delete "' + a.title + '"?')) api('/api/assignments/' + a.id, 'DELETE').then(loadAssignments); };
        ac.appendChild(e); ac.appendChild(d); tr.appendChild(ac); t.appendChild(tr);
      });
    });
  }
  $('saveAss').onclick = function () {
    var body = { subject_id: $('aSub').value, title: $('aTitle').value, deadline: $('aDate').value, status: $('aStatus').value };
    var req = editingId ? api('/api/assignments/' + editingId, 'PUT', body) : api('/api/assignments', 'POST', body);
    req.then(function () { resetForm(); loadAssignments(); loadSubjects(); })
       .catch(function (e) { $('assMsg').textContent = e.message; });
  };
  $('cancelAss').onclick = resetForm;
  $('q').oninput = loadAssignments;
  $('f').onchange = loadAssignments;

  show('dashboard');
})();