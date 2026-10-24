/* tvcal Appearance: one copy for the whole site, the setup tool included.

   Load it in <head> without defer, so a saved choice is applied before the
   page first draws (no flash of the other theme). The choice is stored as
   tvcal2.theme ('auto', 'light' or 'dark'); Auto follows the device.

   - Any [data-theme-pick] item gets aria-checked kept in step.
   - The header's Appearance button ([data-ap-btn] + its [data-ap-menu]
     popover) is wired here: open, arrow keys, Escape, outside click.
   - Other menus (the tool's step-screen menu) call tvcalTheme.set(choice).  */
(function () {
  'use strict';
  var KEY = 'tvcal2.theme';
  var root = document.documentElement;
  var lightQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: light)') : null;
  var LABEL = { auto: 'Auto', light: 'Light', dark: 'Dark' };

  function read() {
    try { var t = JSON.parse(localStorage.getItem(KEY)); return t === 'light' || t === 'dark' ? t : 'auto'; } catch (e) { return 'auto'; }
  }
  var choice = read();

  function apply() {
    if (choice === 'auto') delete root.dataset.theme; else root.dataset.theme = choice;
    var dark = choice === 'dark' || (choice === 'auto' && !(lightQuery && lightQuery.matches));
    var meta = document.querySelector('meta[name=theme-color]');
    if (meta) meta.content = dark ? '#111113' : '#f4f4f6';
  }
  apply();
  if (lightQuery && lightQuery.addEventListener) lightQuery.addEventListener('change', apply);

  // Mark the current choice on every Appearance item and button on the page.
  function sync() {
    document.querySelectorAll('[data-theme-pick]').forEach(function (b) {
      b.setAttribute('aria-checked', String(b.getAttribute('data-theme-pick') === choice));
    });
    document.querySelectorAll('[data-ap-btn]').forEach(function (b) {
      b.setAttribute('data-mode', choice);
      b.setAttribute('aria-label', 'Appearance: ' + LABEL[choice]);
    });
  }

  function set(t) {
    choice = t === 'light' || t === 'dark' ? t : 'auto';
    try { localStorage.setItem(KEY, JSON.stringify(choice)); } catch (e) {}
    apply();
    sync();
  }

  window.tvcalTheme = { get: function () { return choice; }, set: set, sync: sync };

  /* ---------- The header's Appearance popover ---------- */
  function wire(btn) {
    var menu = document.getElementById(btn.getAttribute('aria-controls'));
    if (!menu) return;
    var items = function () { return Array.prototype.slice.call(menu.querySelectorAll('[role^=menuitem]')); };
    function open() {
      sync();
      menu.hidden = false;
      btn.setAttribute('aria-expanded', 'true');
      var list = items();
      (list.find(function (i) { return i.getAttribute('aria-checked') === 'true'; }) || list[0]).focus();
    }
    function close(refocus) {
      if (menu.hidden) return;
      menu.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
      if (refocus) btn.focus();
    }
    btn.addEventListener('click', function () { if (menu.hidden) open(); else close(); });
    menu.addEventListener('click', function (e) {
      var item = e.target.closest('[data-theme-pick]');
      if (item) { set(item.getAttribute('data-theme-pick')); close(true); }
    });
    menu.addEventListener('keydown', function (e) {
      var list = items(), i = list.indexOf(document.activeElement);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        list[(i + (e.key === 'ArrowDown' ? 1 : list.length - 1)) % list.length].focus();
      } else if (e.key === 'Home' || e.key === 'End') {
        e.preventDefault(); list[e.key === 'Home' ? 0 : list.length - 1].focus();
      } else if (e.key === 'Escape') { e.preventDefault(); close(true); }
      else if (e.key === 'Tab') close();
    });
    document.addEventListener('click', function (e) {
      if (!menu.hidden && !menu.contains(e.target) && !btn.contains(e.target)) close();
    });
  }

  function init() {
    document.querySelectorAll('[data-ap-btn]').forEach(wire);
    sync();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
