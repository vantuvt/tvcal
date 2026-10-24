/* tvcal Appearance: one copy for the whole site, the setup tool included.

   Load it in <head> without defer, so a saved choice is applied before the
   page first draws (no flash of the other theme). The choice is stored as
   tvcal2.theme ('auto', 'light' or 'dark'); Auto follows the device.

   An Appearance button is [data-ap-btn] with aria-controls naming its menu
   of [data-theme-pick] items. Clicks and keys are handled by delegation, so
   buttons the setup tool re-draws keep working. A menu with data-ap-fixed is
   placed under its button with fixed positioning (the tool's top row);
   otherwise it sits in the button's .ap wrapper (the site header).        */
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
      var m = document.getElementById(b.getAttribute('aria-controls'));
      b.setAttribute('aria-expanded', String(!!(m && !m.hidden)));
    });
  }

  function set(t) {
    choice = t === 'light' || t === 'dark' ? t : 'auto';
    try { localStorage.setItem(KEY, JSON.stringify(choice)); } catch (e) {}
    apply();
    sync();
  }

  /* ---------- Menus ---------- */
  var openMenu = null;   // the menu element currently shown
  function buttonFor(menu) { return document.querySelector('[data-ap-btn][aria-controls="' + menu.id + '"]'); }
  function items(menu) { return Array.prototype.slice.call(menu.querySelectorAll('[role^=menuitem]')); }

  function open(btn) {
    var menu = document.getElementById(btn.getAttribute('aria-controls'));
    if (!menu) return;
    close();
    if (menu.hasAttribute('data-ap-fixed')) {
      var r = btn.getBoundingClientRect();
      menu.style.position = 'fixed';
      menu.style.top = (r.bottom + 8) + 'px';
      menu.style.right = Math.max(12, document.documentElement.clientWidth - r.right) + 'px';
      menu.style.left = 'auto';
    }
    menu.hidden = false;
    openMenu = menu;
    sync();
    var list = items(menu);
    (list.find(function (i) { return i.getAttribute('aria-checked') === 'true'; }) || list[0]).focus();
  }
  function close(refocus) {
    if (!openMenu) return;
    var menu = openMenu;
    menu.hidden = true;
    openMenu = null;
    sync();
    var btn = buttonFor(menu);
    if (refocus && btn) btn.focus();
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('[data-ap-btn]');
    if (btn) {
      var menu = document.getElementById(btn.getAttribute('aria-controls'));
      if (menu && menu === openMenu) close(); else open(btn);
      return;
    }
    if (!openMenu) return;
    var pick = e.target.closest('[data-theme-pick]');
    if (pick && openMenu.contains(pick)) { set(pick.getAttribute('data-theme-pick')); close(true); return; }
    if (!openMenu.contains(e.target)) close();
  });
  document.addEventListener('keydown', function (e) {
    if (!openMenu || !openMenu.contains(document.activeElement)) return;
    var list = items(openMenu), i = list.indexOf(document.activeElement);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      list[(i + (e.key === 'ArrowDown' ? 1 : list.length - 1)) % list.length].focus();
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault(); list[e.key === 'Home' ? 0 : list.length - 1].focus();
    } else if (e.key === 'Escape') { e.preventDefault(); close(true); }
    else if (e.key === 'Tab') close();
  });
  window.addEventListener('resize', function () { close(); });

  window.tvcalTheme = { get: function () { return choice; }, set: set, sync: sync, close: close };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', sync); else sync();
})();
