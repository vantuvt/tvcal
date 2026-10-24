/* tvcal site behaviour. Everything here is an enhancement: every page reads
   fine without it. Storage keys are shared with the setup tool (tvcal2.*), so
   the Appearance choice and written-down settings carry across. */
(function () {
  'use strict';
  var root = document.documentElement;
  root.classList.add('js');

  var store = {
    get: function (k) { try { return JSON.parse(localStorage.getItem('tvcal2.' + k)); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem('tvcal2.' + k, JSON.stringify(v)); } catch (e) {} }
  };

  /* ---------- Appearance (same setting as the setup tool's menu) ---------- */
  var themeSel = document.getElementById('appearance');
  if (themeSel) {
    themeSel.value = store.get('theme') || 'auto';
    themeSel.addEventListener('change', function () {
      var t = themeSel.value;
      store.set('theme', t);
      if (t === 'light' || t === 'dark') root.dataset.theme = t; else delete root.dataset.theme;
    });
  }

  /* ---------- Tabs: the source-device page ----------
     Without JS every device is listed in turn; with it, one shows at a time. */
  document.querySelectorAll('[data-tabs]').forEach(function (box) {
    var panels = Array.prototype.slice.call(box.querySelectorAll('[data-tab]'));
    var bar = document.querySelector(box.getAttribute('data-tabs'));
    if (!bar || !panels.length) return;
    bar.hidden = false;
    var buttons = panels.map(function (p, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.id = 'tab-' + p.id;
      b.setAttribute('aria-controls', p.id);
      b.textContent = p.getAttribute('data-tab');
      p.setAttribute('role', 'tabpanel');
      p.setAttribute('aria-labelledby', b.id);
      b.addEventListener('click', function () { show(i, true); });
      b.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          e.preventDefault();
          var n = (i + (e.key === 'ArrowRight' ? 1 : panels.length - 1)) % panels.length;
          show(n, true); buttons[n].focus();
        }
      });
      bar.appendChild(b);
      return b;
    });
    function show(n, push) {
      panels.forEach(function (p, i) {
        p.hidden = i !== n;
        buttons[i].setAttribute('aria-selected', String(i === n));
        buttons[i].tabIndex = i === n ? 0 : -1;
      });
      if (push && history.replaceState) history.replaceState(null, '', '#' + panels[n].id);
    }
    var start = Math.max(0, panels.findIndex(function (p) { return '#' + p.id === location.hash; }));
    show(start, false);
  });

  /* ---------- "Your settings" on the brand guides ----------
     Same store as the setup tool's summary, keyed by step id. */
  document.querySelectorAll('[data-settings]').forEach(function (form) {
    var values = store.get('values') || {};
    var note = form.querySelector('.saved-note');
    var inputs = form.querySelectorAll('input[data-record]');
    inputs.forEach(function (inp) {
      inp.value = values[inp.getAttribute('data-record')] || '';
      inp.addEventListener('input', function () {
        values = store.get('values') || {};
        values[inp.getAttribute('data-record')] = inp.value.trim();
        store.set('values', values);
        if (note) note.textContent = 'Saved on this device. The setup tool shows the same values.';
      });
    });
    var copy = form.querySelector('[data-copy]');
    if (copy) copy.addEventListener('click', function () {
      var lines = [form.getAttribute('data-title') || 'My TV picture settings'];
      inputs.forEach(function (inp) {
        var label = form.querySelector('label[for="' + inp.id + '"]');
        lines.push((label ? label.textContent : inp.id) + ': ' + (inp.value.trim() || '-'));
      });
      var text = lines.join('\n');
      var done = function () { if (note) note.textContent = 'Copied. Paste it into a note to keep it.'; };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { window.prompt('Copy your settings:', text); });
      else window.prompt('Copy your settings:', text);
    });
  });

  /* ---------- "Did this fix it?" ---------- */
  document.querySelectorAll('[data-feedback]').forEach(function (box) {
    var ask = box.querySelector('[data-ask]');
    box.querySelectorAll('[data-answer]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (ask) ask.hidden = true;
        var out = box.querySelector('[data-reply="' + b.getAttribute('data-answer') + '"]');
        if (out) { out.hidden = false; out.focus(); }
      });
    });
  });

  /* ---------- Brightness demo ----------
     Eleven grey steps. Black level shifts the dark end (raising it greys
     black, lowering it merges the darkest steps into black); backlight scales
     everything without changing which steps you can tell apart. */
  document.querySelectorAll('[data-demo]').forEach(function (fig) {
    var ramp = fig.querySelector('.demo-ramp');
    var black = fig.querySelector('#demo-black');
    var light = fig.querySelector('#demo-light');
    var blackOut = fig.querySelector('[data-out=black]');
    var lightOut = fig.querySelector('[data-out=light]');
    var cap = fig.querySelector('figcaption');
    var cells = [];
    for (var i = 0; i <= 10; i++) { var s = document.createElement('span'); ramp.appendChild(s); cells.push(s); }
    function draw() {
      var b = parseInt(black.value, 10), k = parseInt(light.value, 10) / 100, off = b * 0.012;
      cells.forEach(function (c, i) {
        var v = Math.min(1, Math.max(0, off + (i / 10) * (1 - Math.max(off, 0))));
        var o = Math.round(255 * v * k);
        c.style.background = 'rgb(' + o + ',' + o + ',' + o + ')';
      });
      blackOut.textContent = (b > 0 ? '+' : '') + b;
      lightOut.textContent = light.value;
      var t = 'Black is black and the first grey step is just visible. This is where you want it.';
      if (b >= 3) t = 'Too high: the black end has turned grey, so dark scenes look foggy.';
      else if (b <= -3) t = 'Too low: the darkest steps have merged into black, so shadow detail disappears.';
      if (k < 0.5) t += ' The backlight is low, so everything is dimmer, but every step is still there.';
      cap.textContent = t;
      ramp.setAttribute('aria-label', 'Grey scale from black to white in eleven steps. ' + t);
    }
    black.addEventListener('input', draw);
    light.addEventListener('input', draw);
    draw();
  });
})();
