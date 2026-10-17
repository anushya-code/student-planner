(function () {
  var $ = function (id) { return document.getElementById(id); };
  var editingId = null;

  function api(url, method, body) {
    return fetch(url.replace(/^\//, ''),  {
      method: method || 'GET',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    }).then(function (r) {
      return r.json().then(function (d) { if (!r.ok) throw new Error(d.error || 'Something went wrong.'); return d; });
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