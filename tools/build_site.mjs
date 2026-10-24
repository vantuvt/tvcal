#!/usr/bin/env node
/* Builds the static site around the setup tool.

   - Hand-written pages live in src/pages/*.html. Each starts with a JSON
     comment: <!--{"title": ..., "path": "learn/brightness/", "nav": "learn",
     "description": ...}-->. The body is wrapped in the shared header and footer
     and written to <path>index.html.
   - Brand guides (guides/<brand>/) are generated from the setup tool's own
     BRANDS and STEPS in setup/index.html, so the guides and the tool always use
     the same menu names. Change the wording there, then run this again.

   Output is plain HTML committed to the repo, so GitHub Pages needs no build.
   Usage: node tools/build_site.mjs                                           */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rel = (...p) => path.join(ROOT, ...p);
const SITE_NAME = 'tvcal';
const REPO = 'https://github.com/vantuvt/tvcal';

/* ---------- Read the tool's data ---------- */
function loadToolData() {
  const html = fs.readFileSync(rel('setup', 'index.html'), 'utf8');
  const start = html.indexOf('const PATTERN_BASE');
  const end = html.indexOf('\nconst store = {');
  if (start < 0 || end < 0) throw new Error('Could not find the BRANDS/STEPS block in setup/index.html');
  const code = html.slice(start, end) + '\n;({ BRANDS, STEPS, DIMMING_HELP });';
  const ctx = vm.createContext({ URL, location: { href: 'https://example.invalid/setup/' } });
  return vm.runInContext(code, ctx);
}
const { BRANDS, STEPS, DIMMING_HELP } = loadToolData();

// Same merge the tool does: a brand's overrides on top of the generic step.
function merged(brandKey, id) {
  const base = STEPS.find(s => s.id === id);
  const o = BRANDS[brandKey] && BRANDS[brandKey].steps[id];
  if (!o) return base;
  const m = Object.assign({}, base, o);
  if (base.flow && o.flow) {
    m.flow = Object.assign({}, base.flow);
    for (const k in o.flow) m.flow[k] = Object.assign({}, base.flow[k], o.flow[k]);
  }
  return m;
}
const BRAND_KEYS = ['samsung', 'lg', 'sony', 'tcl', 'hisense'].filter(k => BRANDS[k]);
for (const k of Object.keys(BRANDS)) if (!BRAND_KEYS.includes(k)) BRAND_KEYS.push(k);
const ALL_KEYS = [...BRAND_KEYS, 'other'];
const brandName = k => (k === 'other' ? 'Another brand' : BRANDS[k].name);
const blackName = k => merged(k, 'brightness').record || 'Brightness';

// Captions written for the tool's phone screen mention its exaggerated guide images; drop that part here.
const noGuide = s => String(s || '').replace(/\s*\([^)]*so you can see[^)]*\)/, '');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------- Icons ---------- */
const ICON = {
  arrow: '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  chevron: '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
  info: '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.01"/></svg>',
};
const FAVICON = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="#111113"/><rect x="5" y="7" width="5" height="18" fill="#3a3a3a"/><rect x="11" y="7" width="5" height="18" fill="#7a7a7a"/><rect x="17" y="7" width="5" height="18" fill="#bdbdbd"/><rect x="23" y="7" width="4" height="18" fill="#f2f2f2"/></svg>');

/* ---------- Layout ---------- */
const NAV = [
  ['setup', 'Setup', 'setup/'],
  ['guides', 'Brand guides', 'guides/'],
  ['troubleshoot', 'Troubleshoot', 'troubleshoot/'],
  ['learn', 'Learn', 'learn/'],
];

// The site header. Also written into setup/index.html (between the
// site-header markers) so the tool's home screen matches the rest of the site.
function headerHtml(root, nav) {
  const navHtml = NAV.map(([k, label, href]) =>
    `<a href="${root}${href}"${k === nav ? ' aria-current="page"' : ''}>${label}</a>`).join('\n      ');
  return `<header class="site-header">
  <div class="wrap">
    <a class="logo" href="${root}"><span class="logo-mark" aria-hidden="true"><span></span><span></span><span></span><span></span></span>${SITE_NAME}</a>
    <nav class="nav" aria-label="Main">
      ${navHtml}
    </nav>
  </div>
</header>`;
}

function layout({ title, description, nav, body, root }) {
  const fullTitle = title ? `${title} · ${SITE_NAME}` : `${SITE_NAME} · TV picture setup, by eye`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#111113">
<script>
  // Apply the saved Appearance (shared with the setup tool) before the page draws.
  try { var t = JSON.parse(localStorage.getItem('tvcal2.theme')); if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t; } catch (e) {}
</script>
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description || '')}">
<link rel="icon" href="${FAVICON}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&amp;family=IBM+Plex+Sans:wght@400;500;600;700&amp;display=swap">
<link rel="stylesheet" href="${root}assets/site.css">
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
${headerHtml(root, nav)}
<main id="main">
${body.trim()}
</main>
<footer class="site-footer">
  <div class="wrap">
    <span>${SITE_NAME} · free and open source</span>
    <div class="links">
      <a href="${REPO}">GitHub</a>
      <a href="${REPO}/issues/new">Report a problem</a>
      <label>Appearance
        <select id="appearance">
          <option value="auto">Auto</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </label>
    </div>
  </div>
</footer>
<script src="${root}assets/site.js" defer></script>
</body>
</html>
`;
}

const rootFor = p => '../'.repeat(p.split('/').filter(Boolean).length) || './';

function writePage(pagePath, html) {
  const out = rel(pagePath, 'index.html');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
  return path.relative(ROOT, out);
}

/* ---------- Shared generated fragments ---------- */
function brandCards(root) {
  return `<div class="grid" style="--min: 170px">
${ALL_KEYS.map(k => `  <a class="card${k === 'other' ? ' dashed' : ''}" href="${root}guides/${k}/"><span class="card-title">${esc(brandName(k))}</span><span class="card-sub">${k === 'other' ? 'Common names that work on most TVs' : 'Key setting: ' + esc(blackName(k))}</span></a>`).join('\n')}
</div>`;
}

function blackNames() {
  return `<ul class="grid" style="--min: 200px; list-style: none; padding: 0; margin: 0 0 40px; gap: 10px">
${BRAND_KEYS.map(k => `  <li class="card" style="padding: 14px 16px"><span class="muted small">${esc(BRANDS[k].name)}</span><br>${esc(blackName(k))}</li>`).join('\n')}
</ul>`;
}

// Display names for the patterns the guides mention. The pattern files are
// only shown on the TV by the setup tool; the site doesn't offer them for download.
const PATTERN_TITLE = {
  '01-fit': 'fit-to-screen', '02-brightness': 'brightness', '03-contrast': 'contrast',
  '04-sharpness': 'sharpness', '06-temp': 'colour temperature', '05-final': 'grey check',
  'h1-black': 'HDR black level', 'h2-highlights': 'HDR highlights', 'h3-steps': 'HDR grey steps',
};

function fill(body, root) {
  return body
    .replaceAll('{{brandCards}}', brandCards(root))
    .replaceAll('{{blackNames}}', blackNames())
    .replaceAll('{{icon.arrow}}', ICON.arrow)
    .replaceAll('{{icon.chevron}}', ICON.chevron)
    .replaceAll('{{icon.info}}', ICON.info)
    .replaceAll('{{root}}', root);
}

/* ---------- Brand guides ---------- */

function doBlock(node) {
  if (!node || !node.do) return '';
  return `<div class="do"><strong>${node.do}</strong>${node.sub ? `<span>${node.sub}</span>` : ''}${node.text ? `<span>${node.text}</span>` : ''}</div>`;
}
function checklist(items) {
  return `<ul class="checklist">\n${items.map(([t, d]) => t === '#'
    ? `  <li class="group">${d}</li>`
    : `  <li><strong>${t}</strong><span>${d}</span></li>`).join('\n')}\n</ul>`;
}
function usesPattern(step, root) {
  if (!step.pattern) return '';
  return `<p class="uses-pattern">Uses the ${esc(PATTERN_TITLE[step.pattern] || step.pattern)} test pattern. <a href="${root}setup/">The guided setup</a> shows it on your TV for you.</p>`;
}

function brandGuide(key) {
  const p = `guides/${key}/`, root = rootFor(p);
  const isOther = key === 'other';
  const b = isOther ? null : BRANDS[key];
  const S = id => merged(isOther ? '__none' : key, id);
  const name = isOther ? 'Your TV' : b.name;
  const note = isOther ? 'These use the most common menu names. Your TV may use slightly different words; look for the closest match.' : b.note;
  const setupHref = `${root}setup/?brand=${key}`;
  const sections = [];
  let n = 0;
  const section = (id, title, inner, opt) => {
    const num = opt ? '' : String(++n).padStart(2, '0');
    sections.push(`<section class="step" id="${id}" aria-labelledby="${id}-h">
  <div class="step-head"><span class="card-num">${num}</span><h2 id="${id}-h">${title}${opt ? ' <span class="opt">optional</span>' : ''}</h2></div>
  <div class="step-body">
${inner}
  </div>
</section>`);
  };

  const start = S('start');
  section('ready', 'Get ready', `<ul>${start.items.map(i => `<li>${i}</li>`).join('')}</ul>`);

  const mode = S('mode');
  section('quick', 'Quick settings', `<p>Do these first. They make the biggest difference.</p>\n${checklist(mode.checklist)}\n${mode.extra || ''}`);

  const fit = S('fit');
  section('fit', 'Fit to screen', `<p>${fit.lead} ${fit.caption}</p>\n<p>${fit.flow.q.ask}</p>\n${doBlock(Object.assign({}, fit.flow.fix, { do: 'If not: ' + fit.flow.fix.do.charAt(0).toLowerCase() + fit.flow.fix.do.slice(1) }))}\n${usesPattern(fit, root)}`);

  const br = S('brightness');
  section('black', esc(br.title), `<p>${br.lead}</p>\n${br.where || ''}\n<p>${noGuide(br.caption)}</p>\n<p><b>Not changing?</b> ${br.stuck.replace(/^Not changing\?\s*/, '')}</p>\n${(b && b.dimmingHelp) || DIMMING_HELP}\n${usesPattern(br, root)}`);

  const ct = S('contrast');
  section('contrast', esc(ct.title), `<p>${ct.lead}</p>\n${ct.where || ''}\n<p>${noGuide(ct.caption)}</p>\n${ct.stuck ? `<p>${ct.stuck}</p>` : ''}\n${usesPattern(ct, root)}`);

  const sh = S('sharpness');
  section('sharpness', esc(sh.title), `<p>${sh.lead.replace(/ Here’s the difference:$/, '')} Walk up close to the TV: lower Sharpness until the black lines have no bright outlines beside them.</p>\n${sh.where || ''}\n${b && b.steps.sharpness && b.steps.sharpness.flow && b.steps.sharpness.flow.down ? `<p>${b.steps.sharpness.flow.down.sub}</p>` : ''}\n${usesPattern(sh, root)}`);

  const tp = S('temp');
  section('colour', 'Colour temperature', `<p>${tp.lead}</p>\n${tp.where || ''}\n${doBlock(tp.flow.set)}\n<p>${tp.flow.q.ask}</p>\n${doBlock(Object.assign({}, tp.flow.cooler, { do: 'If they still look yellow: ' + tp.flow.cooler.do.charAt(0).toLowerCase() + tp.flow.cooler.do.slice(1) }))}\n${usesPattern(tp, root)}`);

  const hm = S('hdrmode'), hb = S('hdrbright'), hh = S('hdrhigh');
  section('hdr', 'HDR', `<p>${S('hdr').lead}</p>
<h3>Is HDR on?</h3>
${hm.where || ''}
${doBlock(hm.flow.mode)}
<p><b>Not switching to HDR?</b> ${hm.flow.fix.sub.replace(/ Then tap Done: the pattern restarts so the TV can switch over\.$/, '')}</p>
<h3>${esc(hb.title)}</h3>
<p>${hb.lead}</p>
${hb.where || ''}
<h3>Highlights</h3>
<p>${hh.lead}</p>
${hh.where || ''}
${doBlock(Object.assign({}, hh.flow.tm, { do: 'If some boxes look the same: ' + hh.flow.tm.do.charAt(0).toLowerCase() + hh.flow.tm.do.slice(1) }))}
<p class="uses-pattern">Uses the HDR test patterns. <a href="${root}setup/">The guided setup</a> shows them on your TV for you.</p>`, true);

  const dv = S('dv');
  const dvInner = dv.flow.q && dv.flow.q.text
    ? `<p>${dv.lead}</p>\n<p>${dv.flow.q.text}</p>`
    : `<p>${dv.lead}</p>\n${doBlock(dv.flow.play)}\n${doBlock(dv.flow.mode)}\n${doBlock(dv.flow.clean)}\n<p>${dv.flow.q2.ask}</p>\n${doBlock(Object.assign({}, dv.flow.dark, { do: 'If they look grey: ' + dv.flow.dark.do.charAt(0).toLowerCase() + dv.flow.dark.do.slice(1) }))}`;
  section('dolby-vision', 'Dolby Vision', dvInner, true);

  const ex = S('extras');
  section('devices-room', 'Your devices and room', `${checklist(ex.checklist)}\n<p><a href="${root}sources/">Streaming box and console settings</a></p>`, true);

  // "Your settings": the same fields as the tool's summary.
  const recordIds = ['mode', 'fit', 'brightness', 'contrast', 'sharpness', 'temp', 'hdrmode', 'hdrbright', 'hdrhigh', 'dv'];
  const fields = [['model', 'TV model', '55Q750G']]
    .concat(recordIds.map(id => { const s = S(id); return s.record ? [id, s.record, s.ph || ''] : null; }).filter(Boolean));
  const aside = `<aside class="split-aside sticky">
  <div class="card">
    <a class="btn btn-primary" style="width: 100%" href="${setupHref}">Start guided setup ${ICON.arrow}</a>
    <p class="small muted" style="margin: 12px 0 0">Your phone shows each pattern on the TV and asks one question at a time, using ${esc(isOther ? 'general' : name)} menu names.</p>
  </div>
  <form class="card" data-settings data-title="My TV picture settings (${esc(name)})" onsubmit="return false">
    <h2 style="margin: 0 0 6px; font-size: 20px">Your settings</h2>
    <p class="small muted" style="margin: 0">Write down what you end up with, so you can put it back if an update resets it.</p>
    <div class="fields">
${fields.map(([id, label, ph]) => `      <div class="field"><label for="v-${id}">${esc(label)}</label><input id="v-${id}" type="text" data-record="${id}" autocomplete="off"${ph ? ` placeholder="e.g. ${esc(ph)}"` : ''}></div>`).join('\n')}
    </div>
    <button class="btn btn-ghost" type="button" data-copy style="width: 100%">Copy my settings</button>
    <p class="saved-note" aria-live="polite"></p>
  </form>
</aside>`;

  const body = `<div class="wrap">
<div class="page-head">
  <nav class="crumbs" aria-label="Breadcrumb"><a href="${root}guides/">Brand guides</a> <span aria-hidden="true">›</span> ${esc(isOther ? 'Another brand' : name)}</nav>
  <p class="eyebrow">Brand guide</p>
  <h1 class="page-title">${esc(isOther ? 'TV picture setup' : name + ' picture setup')}</h1>
  <p class="lead">${note}</p>
</div>
<div class="split">
<div class="split-main">
<div class="callout">${ICON.info}<p>Watching through a streaming box or console? <a href="${root}sources/">Set that up first</a>: a mismatch there makes blacks grey or crushed whatever you do on the TV.</p></div>
${sections.join('\n')}
</div>
${aside}
</div>
</div>`;
  return writePage(p, layout({
    title: isOther ? 'TV picture setup guide' : `${name} TV picture setup`,
    description: isOther
      ? 'How to set up any TV’s picture by eye: picture mode, black level, contrast, sharpness, colour temperature and HDR.'
      : `How to set up a ${name} TV’s picture by eye, using ${name}’s own menu names: picture mode, ${blackName(key)}, contrast, sharpness, colour temperature and HDR.`,
    nav: 'guides', body, root,
  }));
}

/* ---------- Run ---------- */
const written = [];
const pagesDir = rel('src', 'pages');
for (const f of fs.readdirSync(pagesDir).filter(f => f.endsWith('.html')).sort()) {
  const src = fs.readFileSync(path.join(pagesDir, f), 'utf8');
  const m = src.match(/^<!--(\{[\s\S]*?\})-->\s*/);
  if (!m) throw new Error(`${f}: missing the JSON header comment`);
  const meta = JSON.parse(m[1]);
  const root = rootFor(meta.path);
  written.push(writePage(meta.path, layout({ ...meta, body: fill(src.slice(m[0].length), root), root })));
}
for (const k of ALL_KEYS) written.push(brandGuide(k));

// Keep the setup tool's copy of the header in step with the site's.
{
  const toolPath = rel('setup', 'index.html');
  const tool = fs.readFileSync(toolPath, 'utf8');
  const re = /(<!-- site-header:start[^>]*-->)[\s\S]*?(<!-- site-header:end -->)/;
  if (!re.test(tool)) throw new Error('setup/index.html: missing the site-header markers');
  const next = tool.replace(re, (_, a, b) => a + '\n' + headerHtml('../', 'setup') + '\n' + b);
  if (next !== tool) { fs.writeFileSync(toolPath, next); written.push('setup/index.html (header)'); }
}
console.log(written.map(w => '  ' + w).join('\n'));
console.log(`Built ${written.length} pages.`);
