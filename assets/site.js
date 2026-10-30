/* tvcal site behaviour. Everything here is an enhancement: every page reads
   fine without it. Storage keys are shared with the setup tool (tvcal2.*), so
   written-down settings carry across. Appearance is in theme.js. */
(function () {
  'use strict';
  var root = document.documentElement;
  root.classList.add('js');

  var store = {
    get: function (k) { try { return JSON.parse(localStorage.getItem('tvcal2.' + k)); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem('tvcal2.' + k, JSON.stringify(v)); } catch (e) {} }
  };

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

  /* ---------- Shared bits for the Learn demos ---------- */
  function grey(v) { var o = Math.round(255 * Math.min(1, Math.max(0, v))); return 'rgb(' + o + ',' + o + ',' + o + ')'; }
  function fillRamp(ramp, n, fn) {
    if (!ramp.children.length) for (var i = 0; i < n; i++) ramp.appendChild(document.createElement('span'));
    Array.prototype.forEach.call(ramp.children, function (c, i) { c.style.background = grey(fn(i / (n - 1))); });
  }
  function checkedValue(fig, name) { var r = fig.querySelector('input[name="' + name + '"]:checked'); return r ? r.value : null; }
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Colour temperature ----------
     Approximates the colour of a white light at K kelvin (Tanner Helland's
     fit to blackbody colours), relative to 6500 K, and tints each patch. */
  function kelvinRGB(k) {
    var t = k / 100, r, g, b;
    r = t <= 66 ? 255 : 329.698727446 * Math.pow(t - 60, -0.1332047592);
    g = t <= 66 ? 99.4708025861 * Math.log(t) - 161.1195681661 : 288.1221695283 * Math.pow(t - 60, -0.0755148492);
    b = t >= 66 ? 255 : (t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307);
    return [r, g, b].map(function (x) { return Math.min(255, Math.max(0, x)); });
  }
  document.querySelectorAll('[data-demo-temp]').forEach(function (fig) {
    var input = fig.querySelector('#demo-temp'), out = fig.querySelector('[data-out=temp]'), cap = fig.querySelector('figcaption');
    var patches = fig.querySelectorAll('.temp-patch'), ref = kelvinRGB(6500);
    function hex(h) { return [1, 3, 5].map(function (i) { return parseInt(h.substr(i, 2), 16); }); }
    function draw() {
      var k = parseInt(input.value, 10), c = kelvinRGB(k);
      var m = [c[0] / ref[0], c[1] / ref[1], c[2] / ref[2]], top = Math.max(m[0], m[1], m[2]);
      m = m.map(function (x) { return x / top; });
      patches.forEach(function (p) {
        var base = hex(p.getAttribute('data-base'));
        p.style.background = 'rgb(' + base.map(function (v, i) { return Math.round(v * m[i]); }).join(',') + ')';
      });
      out.textContent = k + ' K';
      var t;
      if (k < 6250) t = 'Warmer than the standard: whites look yellow and faces look orange.';
      else if (k <= 6750) t = 'About 6500 K (D65): the white films and shows are mastered to. On most TVs, a Warm setting is closest.';
      else if (k <= 8000) t = 'Cooler than the standard: whites look slightly blue. Many TVs’ Standard settings sit around here.';
      else t = 'Much cooler: whites look clearly blue and faces look pale. Typical of a Cool or Vivid setting.';
      cap.textContent = t;
      fig.querySelector('.temp-scene').setAttribute('aria-label', 'White, grey, skin, foliage and sky patches at ' + k + ' K. ' + t);
    }
    input.addEventListener('input', draw);
    draw();
  });

  /* ---------- Gamma ----------
     Shown relative to a typical 2.2 screen: each level v becomes v^(g/2.2). */
  document.querySelectorAll('[data-demo-gamma]').forEach(function (fig) {
    var full = fig.querySelector('[data-ramp=full]'), dark = fig.querySelector('[data-ramp=dark]'), cap = fig.querySelector('figcaption');
    var TEXT = {
      '1.8': 'Gamma 1.8: shadows and mid-tones lifted. Lots of dark detail, but a flat, washed-out look.',
      '2.2': 'Gamma 2.2: a little lighter than the standard. Good in a bright room, where room light hides the darkest detail.',
      '2.4': 'Gamma 2.4 (BT.1886): the standard for a dim room. Rich mid-tones with shadow detail still there.',
      '2.6': 'Gamma 2.6: darker still. Shadows close up and dark scenes start to lose detail.'
    };
    function draw() {
      var g = parseFloat(checkedValue(fig, 'demo-gamma') || '2.4'), e = g / 2.2;
      fillRamp(full, 11, function (v) { return Math.pow(v, e); });
      fillRamp(dark, 11, function (v) { return Math.pow(v * 0.2, e); });
      cap.textContent = TEXT[String(g)] || '';
    }
    fig.addEventListener('change', draw);
    draw();
  });

  /* ---------- HDR tone mapping ----------
     A film graded to 4,000 nits on a TV with a lower peak: clipping vs a
     roll-off that starts at 60% of the TV's peak. Drawn as an SVG chart plus
     swatches for four highlight levels. */
  document.querySelectorAll('[data-demo-tm]').forEach(function (fig) {
    var input = fig.querySelector('#demo-peak'), out = fig.querySelector('[data-out=peak]'), cap = fig.querySelector('figcaption');
    var chart = fig.querySelector('.tm-chart'), clipRow = fig.querySelector('[data-row=clip]'), mapRow = fig.querySelector('[data-row=map]');
    var MAX = 4000, LEVELS = [600, 1000, 2000, 4000];
    function tm(x, peak) {
      var k = 0.6 * peak;
      if (x <= k) return x;
      var span = peak - k, over = (x - k) / (MAX - k);
      return k + span * (1 - Math.pow(1 - over, 3));   // eases into the peak at 4,000 nits
    }
    // Drawn at the chart's real width, so its labels stay readable on a phone.
    var W = 600, H = 260, L = 46, B = 34, T = 12, R = 22;
    function px(x) { return L + (x / MAX) * (W - L - R); }
    function py(y) { return H - B - (y / 2000) * (H - B - T); }
    function path(f) { var d = ''; for (var x = 0; x <= MAX; x += 40) d += (x ? 'L' : 'M') + px(x).toFixed(1) + ' ' + py(f(x)).toFixed(1); return d; }
    function draw() {
      W = Math.max(300, Math.round(chart.clientWidth || 600));
      H = Math.round(Math.max(220, Math.min(300, W * 0.5)));
      var peak = parseInt(input.value, 10);
      out.textContent = peak.toLocaleString('en') + ' nits';
      var grid = '';
      (W < 420 ? [0, 2000, 4000] : [0, 1000, 2000, 3000, 4000]).forEach(function (x) { grid += '<line class="tm-grid" x1="' + px(x) + '" x2="' + px(x) + '" y1="' + py(0) + '" y2="' + py(2000) + '"/><text class="tm-tick" x="' + px(x) + '" y="' + (H - B + 18) + '" text-anchor="' + (x === MAX ? 'end' : 'middle') + '">' + x.toLocaleString('en') + '</text>'; });
      [0, 1000, 2000].forEach(function (y) { grid += '<line class="tm-grid" x1="' + px(0) + '" x2="' + px(MAX) + '" y1="' + py(y) + '" y2="' + py(y) + '"/><text class="tm-tick" x="' + (L - 8) + '" y="' + (py(y) + 4) + '" text-anchor="end">' + y.toLocaleString('en') + '</text>'; });
      chart.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Chart of film brightness against what the TV shows, clipped and tone mapped">' + grid +
        '<line class="tm-peak" x1="' + px(0) + '" x2="' + px(MAX) + '" y1="' + py(peak) + '" y2="' + py(peak) + '"/>' +
        '<text class="tm-note" x="' + px(MAX) + '" y="' + (py(peak) - 6) + '" text-anchor="end">TV peak</text>' +
        '<path class="tm-clip" d="' + path(function (x) { return Math.min(x, peak); }) + '"/>' +
        '<path class="tm-map" d="' + path(function (x) { return tm(x, peak); }) + '"/>' +
        '<text class="tm-axis" x="' + ((L + W - R) / 2) + '" y="' + (H - 2) + '" text-anchor="middle">In the film (nits)</text>' +
        '</svg><div class="tm-legend small"><span><i class="k-clip"></i>Clipped</span><span><i class="k-map"></i>Tone mapped</span><span class="muted">Up the side: what the TV shows (nits)</span></div>';
      function row(el, f) {
        if (!el.children.length) LEVELS.forEach(function () { el.appendChild(document.createElement('span')); });
        Array.prototype.forEach.call(el.children, function (c, i) { c.style.background = grey(0.25 + 0.75 * Math.pow(f(LEVELS[i]) / peak, 1.6)); });
      }
      row(clipRow, function (x) { return Math.min(x, peak); });
      row(mapRow, function (x) { return tm(x, peak); });
      var clipped = LEVELS.filter(function (x) { return x >= peak; }).length;
      var WORDS = ['', 'one', 'two', 'three', 'all four'];
      cap.textContent = 'The film was graded up to 4,000 nits. On ' + (peak === 800 ? 'an ' : 'a ') + peak.toLocaleString('en') + '-nit TV, clipping turns ' +
        (clipped > 1 ? WORDS[clipped] + ' of these highlights into the same white' : 'the brightest highlight flat white') +
        '; tone mapping keeps them distinct by easing off before the peak.';
    }
    input.addEventListener('input', draw);
    var lastW = 0;
    window.addEventListener('resize', function () { if (chart.clientWidth !== lastW) { lastW = chart.clientWidth; draw(); } });
    draw();
  });

  /* ---------- Local dimming ----------
     A dark scene (moon and subtitle) on an LCD: black level is backlight ×
     leakage per zone; OLED lights each pixel itself. Leakage is exaggerated. */
  document.querySelectorAll('[data-demo-dim]').forEach(function (fig) {
    var canvas = fig.querySelector('canvas'), ctx = canvas.getContext('2d'), cap = fig.querySelector('figcaption');
    var W = canvas.width, H = canvas.height, LEAK = 0.14;
    var MODES = {
      off:  { cols: 1, rows: 1, text: 'No dimming: the whole backlight is on, so all the black is a dark grey.' },
      few:  { cols: 8, rows: 4, text: '32 zones: black is black away from the moon and subtitle, but their zones glow around them. That’s blooming.' },
      many: { cols: 32, rows: 16, text: '512 zones: the halos shrink to a tight glow. More zones, less blooming.' },
      oled: { cols: 0, rows: 0, text: 'OLED: each pixel makes its own light, so black is completely black with no glow.' }
    };
    // The scene: where the bright things are (in canvas pixels).
    var moon = { x: W * 0.72, y: H * 0.3, r: H * 0.075 };
    var sub = { x: W * 0.3, y: H * 0.8, w: W * 0.4, h: H * 0.06 };
    function lit(x0, y0, x1, y1) {
      var nx = Math.max(x0, Math.min(moon.x, x1)), ny = Math.max(y0, Math.min(moon.y, y1));
      var hitsMoon = (nx - moon.x) * (nx - moon.x) + (ny - moon.y) * (ny - moon.y) <= moon.r * moon.r;
      var hitsSub = x0 < sub.x + sub.w && x1 > sub.x && y0 < sub.y + sub.h && y1 > sub.y;
      return hitsMoon || hitsSub;
    }
    function draw() {
      var mode = checkedValue(fig, 'demo-dim') || 'few', m = MODES[mode];
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      if (mode !== 'oled') {
        var zw = W / m.cols, zh = H / m.rows;
        for (var r = 0; r < m.rows; r++) for (var c = 0; c < m.cols; c++) {
          var on = mode === 'off' || lit(c * zw, r * zh, (c + 1) * zw, (r + 1) * zh);
          if (!on) continue;
          ctx.fillStyle = grey(LEAK);
          ctx.fillRect(Math.floor(c * zw), Math.floor(r * zh), Math.ceil(zw), Math.ceil(zh));
        }
      }
      ctx.fillStyle = '#f4f1e6';
      ctx.beginPath(); ctx.arc(moon.x, moon.y, moon.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = '600 ' + Math.round(sub.h * 0.9) + 'px system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('We should go back inside.', sub.x + sub.w / 2, sub.y + sub.h / 2);
      cap.textContent = m.text + ' (Exaggerated so the effect is easy to see.)';
      canvas.setAttribute('aria-label', 'A dark scene with a bright moon and a subtitle. ' + m.text);
    }
    fig.addEventListener('change', draw);
    draw();
  });

  /* ---------- Motion ----------
     Two bars pan across: the top one only moves 24 times a second (film),
     the bottom one moves every screen refresh (motion smoothing). Starts
     paused when the visitor prefers reduced motion; pauses off screen. */
  document.querySelectorAll('[data-demo-motion]').forEach(function (fig) {
    var canvas = fig.querySelector('canvas'), ctx = canvas.getContext('2d');
    var speedIn = fig.querySelector('#demo-speed'), speedOut = fig.querySelector('[data-out=speed]'), btn = fig.querySelector('[data-play]');
    var W = 640, H = 200, NAMES = ['Very slow', 'Slow', 'Medium', 'Fast', 'Very fast'];
    // Match the canvas to its on-screen size, so text and bars stay crisp and readable.
    function fit() {
      var dpr = window.devicePixelRatio || 1, cw = canvas.clientWidth || 640;
      W = cw; H = 200;
      if (canvas.width !== Math.round(W * dpr)) { canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    canvas.style.height = '200px';
    var playing = !reduceMotion, visible = true, t0 = null, phase = 0, raf = 0;
    function colors() {
      var cs = getComputedStyle(document.documentElement);
      return { bg: cs.getPropertyValue('--panel2').trim() || '#222', text: cs.getPropertyValue('--dim').trim() || '#999', bar: cs.getPropertyValue('--accent').trim() || '#f2b544' };
    }
    function frame(x, y, h, c) {
      // A "camera subject": a bar with a few vertical lines, so steps are easy to see.
      ctx.fillStyle = c.bar; ctx.fillRect(x, y, 60, h);
      ctx.fillStyle = 'rgba(0,0,0,.45)';
      for (var i = 1; i < 4; i++) ctx.fillRect(x + i * 15 - 1, y + 6, 2, h - 12);
    }
    function draw(ts) {
      fit();
      var c = colors(), speed = parseInt(speedIn.value, 10);
      if (playing && visible) {
        if (t0 === null) t0 = ts;
        phase += ((ts - t0) / 1000) * (60 + speed * 70);  // pixels per second
        t0 = ts;
      } else t0 = null;
      var span = W + 60, pos = phase % span;
      var filmPos = (Math.floor((phase / (60 + speed * 70)) * 24) / 24 * (60 + speed * 70)) % span;
      ctx.fillStyle = c.bg; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = c.text; ctx.font = '500 14px system-ui, sans-serif'; ctx.textBaseline = 'top';
      ctx.fillText('24 frames a second (film)', 10, 8);
      ctx.fillText('Motion smoothing', 10, 108);
      frame(filmPos - 60, 30, 64, c);
      frame(pos - 60, 130, 64, c);
      if (playing && visible) raf = requestAnimationFrame(draw);
    }
    function setBtn() { btn.textContent = playing ? 'Pause' : 'Play'; btn.setAttribute('aria-pressed', String(playing)); }
    btn.addEventListener('click', function () { playing = !playing; setBtn(); cancelAnimationFrame(raf); raf = requestAnimationFrame(draw); });
    speedIn.addEventListener('input', function () { speedOut.textContent = NAMES[speedIn.value - 1]; if (!playing) draw(performance.now()); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        cancelAnimationFrame(raf); raf = requestAnimationFrame(draw);
      }).observe(canvas);
    }
    // Redraw when the theme changes, so the colours follow it.
    new MutationObserver(function () { if (!playing) draw(performance.now()); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    window.addEventListener('resize', function () { if (!playing) draw(performance.now()); });
    speedOut.textContent = NAMES[speedIn.value - 1];
    setBtn();
    raf = requestAnimationFrame(draw);
  });
})();
