(function () {
  'use strict';

  var t = window.i18n.t;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var el = function (id) { return document.getElementById(id); };
  el('year').textContent = new Date().getFullYear();

  /* ------------------------------------------------------------------
   * Hero: chat / voice / video tabs
   * ------------------------------------------------------------------ */
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.mode-tabs [role="tab"]'));
  var panels = {};
  tabs.forEach(function (tab) { panels[tab.dataset.mode] = el(tab.getAttribute('aria-controls')); });

  var timers = [];
  var autoRotate = !reduceMotion;
  var currentMode = 'chat';
  var callSeconds = 134;

  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }

  function play(mode) {
    var panel = panels[mode];
    var steps = panel.querySelectorAll('[data-step]');
    var gap = mode === 'chat' ? 1300 : 1700;
    var total;

    if (mode === 'video') {
      var cap = panel.querySelector('.captions');
      var captions = t('video.captions');
      cap.textContent = captions[0];
      captions.forEach(function (text, i) {
        if (!i) return;
        later(function () {
          cap.style.opacity = 0;
          later(function () { cap.textContent = text; cap.style.opacity = 1; }, 250);
        }, i * 2800);
      });
      total = captions.length * 2800;
    } else {
      Array.prototype.forEach.call(steps, function (s, i) {
        s.classList.remove('in');
        if (reduceMotion) s.classList.add('in');
        else later(function () { s.classList.add('in'); }, 300 + i * gap);
      });
      total = 300 + steps.length * gap;
    }

    if (mode === 'voice') {
      var timerEl = panel.querySelector('.call-timer');
      var tick = function () {
        callSeconds++;
        var m = Math.floor(callSeconds / 60), s = callSeconds % 60;
        timerEl.textContent = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
        later(tick, 1000);
      };
      later(tick, 1000);
    }

    if (autoRotate) {
      later(function () {
        var i = tabs.findIndex(function (tab) { return tab.dataset.mode === mode; });
        select(tabs[(i + 1) % tabs.length], false);
      }, total + 3500);
    }
  }

  function select(tab, byUser) {
    if (byUser) autoRotate = false;
    clearTimers();
    currentMode = tab.dataset.mode;
    tabs.forEach(function (other) {
      var on = other === tab;
      other.setAttribute('aria-selected', on ? 'true' : 'false');
      other.tabIndex = on ? 0 : -1;
      panels[other.dataset.mode].hidden = !on;
    });
    play(currentMode);
  }

  tabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () { select(tab, true); });
    tab.addEventListener('keydown', function (e) {
      var dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!dir) return;
      e.preventDefault();
      var next = tabs[(i + dir + tabs.length) % tabs.length];
      next.focus();
      select(next, true);
    });
  });
  if (tabs.length) select(tabs[0], false);

  /* ------------------------------------------------------------------
   * Photo feedback demo
   * Illustrated skin drawn in SVG, with AI markings layered on top.
   * Text for each case lives in i18n.js under case.<id>.*
   * ------------------------------------------------------------------ */
  function rng(seed) {
    return function () {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
  }

  function blobPath(cx, cy, r, wobble, seed) {
    var rand = rng(seed), pts = [], n = 14;
    for (var i = 0; i < n; i++) {
      var a = (i / n) * Math.PI * 2;
      var rr = r * (1 - wobble / 2 + rand() * wobble);
      pts.push([cx + Math.cos(a) * rr * 1.25, cy + Math.sin(a) * rr]);
    }
    var d = 'M' + pts[0].join(' ');
    for (var j = 0; j < n; j++) {
      var p1 = pts[(j + 1) % n], p2 = pts[(j + 2) % n];
      d += ' Q' + p1[0].toFixed(1) + ' ' + p1[1].toFixed(1) + ' ' + ((p1[0] + p2[0]) / 2).toFixed(1) + ' ' + ((p1[1] + p2[1]) / 2).toFixed(1);
    }
    return d + 'Z';
  }

  function spots(seed, count, cx, cy, rx, ry, rMin, rMax, fill) {
    var rand = rng(seed), out = '';
    for (var i = 0; i < count; i++) {
      var a = rand() * Math.PI * 2, d = Math.sqrt(rand());
      var x = cx + Math.cos(a) * rx * d, y = cy + Math.sin(a) * ry * d;
      var r = rMin + rand() * (rMax - rMin);
      out += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + r.toFixed(1) + '" fill="' + fill + '" opacity="' + (0.55 + rand() * 0.35).toFixed(2) + '"/>';
    }
    return out;
  }

  var viralSpots = spots(7, 80, 200, 150, 170, 120, 2, 4.6, '#d4574a');

  // `note` is the index into the case's translated marks list.
  var CASES = [
    {
      id: 'viral',
      skin: '<g filter="url(#soft)">' + viralSpots + '</g>',
      glass: { spots: viralSpots, x: 270, y: 165 },
      marks: [
        { type: 'ring', cx: 200, cy: 150, r: 118, note: 0 },
        { type: 'ring', cx: 110, cy: 95, r: 34, note: 1 },
        { type: 'ring', cx: 330, cy: 70, r: 26, note: 2 },
        { type: 'ruler', x1: 300, y1: 272, x2: 340, y2: 272, label: '≈ 4 mm' }
      ]
    },
    {
      id: 'eczema',
      skin: (function () {
        var rand = rng(21), scale = '', scratch = '';
        for (var i = 0; i < 70; i++) {
          var x = 110 + rand() * 190, y = 90 + rand() * 120, l = 3 + rand() * 6;
          scale += '<path d="M' + x.toFixed(1) + ' ' + y.toFixed(1) + 'l' + l.toFixed(1) + ' ' + (rand() * 3 - 1.5).toFixed(1) + '" stroke="#fbe7dc" stroke-width="1.4" stroke-linecap="round" opacity=".75"/>';
        }
        [[150, 110, 60], [175, 116, 52], [205, 122, 64], [236, 140, 48]].forEach(function (s) {
          scratch += '<path d="M' + s[0] + ' ' + s[1] + 'l' + (s[2] * 0.35).toFixed(0) + ' ' + s[2] + '" stroke="#b9392c" stroke-width="2" stroke-linecap="round" opacity=".7"/>';
        });
        return '<g filter="url(#softer)"><path d="' + blobPath(205, 150, 82, 0.5, 5) + '" fill="#d87462" opacity=".7"/><path d="' + blobPath(120, 210, 36, 0.6, 9) + '" fill="#d87462" opacity=".5"/></g>' +
          '<path d="' + blobPath(205, 150, 64, 0.5, 11) + '" fill="#cc6452" opacity=".35" filter="url(#soft)"/>' + scale + '<g filter="url(#soft)">' + scratch + '</g>';
      })(),
      marks: [
        { type: 'ring', cx: 205, cy: 150, r: 100, note: 0 },
        { type: 'ring', cx: 250, cy: 190, r: 30, note: 1 },
        { type: 'ring', cx: 180, cy: 132, r: 38, note: 2 },
        { type: 'ruler', x1: 115, y1: 270, x2: 295, y2: 270, label: '≈ 5 cm' }
      ]
    },
    {
      id: 'bite',
      skin: '<circle cx="200" cy="150" r="78" fill="#e0705e" opacity=".42" filter="url(#softer)"/>' +
        '<circle cx="200" cy="150" r="46" fill="#dc6554" opacity=".35" filter="url(#softer)"/>' +
        '<circle cx="200" cy="150" r="15" fill="#f0a08c" filter="url(#soft)"/>' +
        '<circle cx="195" cy="145" r="6" fill="#fff" opacity=".35" filter="url(#soft)"/>' +
        '<circle cx="201" cy="151" r="1.8" fill="#8f2a1e"/>',
      marks: [
        { type: 'ring', cx: 200, cy: 150, r: 24, note: 0 },
        { type: 'ring', cx: 200, cy: 150, r: 84, note: 1 },
        { type: 'pen', cx: 200, cy: 150, r: 100, note: 2 },
        { type: 'ruler', x1: 116, y1: 272, x2: 284, y2: 272, label: '≈ 5 cm' }
      ]
    },
    {
      id: 'hfmd',
      skin: (function () {
        var rand = rng(33), out = '<path d="M60 300 C 70 180, 120 110, 200 105 S 340 170, 350 300 Z" fill="#f2c3a3" opacity=".6" filter="url(#softer)"/>';
        out += '<path d="M120 180 q 60 -30 150 10 M140 230 q 60 -20 130 5" stroke="#c98d6c" stroke-width="2" fill="none" opacity=".5"/>';
        for (var i = 0; i < 16; i++) {
          var x = 110 + rand() * 190, y = 120 + rand() * 140, rx = 5 + rand() * 3, ry = rx * 0.65, rot = (rand() * 180).toFixed(0);
          out += '<g transform="translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') rotate(' + rot + ')">' +
            '<ellipse rx="' + (rx + 3.5).toFixed(1) + '" ry="' + (ry + 3).toFixed(1) + '" fill="#d4574a" opacity=".55" filter="url(#soft)"/>' +
            '<ellipse rx="' + rx.toFixed(1) + '" ry="' + ry.toFixed(1) + '" fill="#fbe9df"/>' +
            '<ellipse rx="' + (rx * 0.4).toFixed(1) + '" ry="' + (ry * 0.35).toFixed(1) + '" cx="-1.5" cy="-1" fill="#fff"/></g>';
        }
        return out;
      })(),
      marks: [
        { type: 'ring', cx: 205, cy: 190, r: 110, note: 0 },
        { type: 'ring', cx: 150, cy: 150, r: 34, note: 1 },
        { type: 'ring', cx: 345, cy: 190, r: 24, note: 2 },
        { type: 'ruler', x1: 300, y1: 280, x2: 340, y2: 280, label: '≈ 5 mm' }
      ]
    }
  ];

  var svg = el('photo-svg');
  var skinG = el('photo-skin'), overlayG = el('photo-overlay'), glassG = el('photo-glass');
  var scanline = el('scanline'), status = el('photo-status');
  var findingsEl = el('findings'), feedback = document.querySelector('.demo-feedback');
  var overlayToggle = el('overlay-toggle'), glassBtn = el('glass-btn');
  var casesEl = document.querySelector('.demo-cases');
  var demoTimers = [], current = null, glassOn = false, glassPos = { x: 0, y: 0 };

  function demoLater(fn, ms) { demoTimers.push(setTimeout(fn, ms)); }
  function ct(c, field) { return t('case.' + c.id + '.' + field); }

  function pin(x, y, n) {
    return '<g class="ov-pin"><circle cx="' + x + '" cy="' + y + '" r="12" fill="#c4502f" stroke="#fff" stroke-width="2.5"/>' +
      '<text x="' + x + '" y="' + (y + 4) + '" fill="#fff" font-size="12" font-weight="800" text-anchor="middle" font-family="Nunito, sans-serif">' + n + '</text></g>';
  }

  function markSVG(m, i) {
    var g = '';
    var shadow = 'stroke="rgba(46,35,32,.45)" stroke-width="5" fill="none"';
    if (m.type === 'ring' || m.type === 'pen') {
      var circle = 'cx="' + m.cx + '" cy="' + m.cy + '" r="' + m.r + '"';
      if (m.type === 'pen') {
        g += '<circle class="ov-ring" ' + circle + ' fill="none" stroke="#2f6fd6" stroke-width="2.5" stroke-dasharray="2 7" stroke-linecap="round"/>';
      } else {
        g += '<circle ' + circle + ' ' + shadow + ' stroke-dasharray="7 6"/>' +
          '<circle class="ov-ring" ' + circle + ' fill="none" stroke="#fff" stroke-width="2.5" stroke-dasharray="7 6" stroke-linecap="round"/>';
      }
      var a = -Math.PI / 4 - i * 0.5;
      var px = Math.max(16, Math.min(384, m.cx + Math.cos(a) * m.r));
      var py = Math.max(16, Math.min(284, m.cy + Math.sin(a) * m.r));
      g += pin(px, py, m.note + 1);
    } else if (m.type === 'ruler') {
      var d = 'M' + m.x1 + ' ' + m.y1 + 'H' + m.x2 + 'M' + m.x1 + ' ' + (m.y1 - 6) + 'v12M' + m.x2 + ' ' + (m.y2 - 6) + 'v12';
      g += '<path d="' + d + '" ' + shadow + '/><path d="' + d + '" stroke="#fff" stroke-width="2.5" fill="none"/>';
      var mid = (m.x1 + m.x2) / 2, w = m.label.length * 7 + 18;
      g += '<rect x="' + (mid - w / 2) + '" y="' + (m.y1 - 30) + '" width="' + w + '" height="20" rx="10" fill="rgba(46,35,32,.75)"/>' +
        '<text x="' + mid + '" y="' + (m.y1 - 16) + '" fill="#fff" font-size="11.5" font-weight="700" text-anchor="middle" font-family="Nunito, sans-serif">' + m.label + '</text>';
    }
    return '<g class="ov-mark"' + (m.note !== undefined ? ' data-note="' + m.note + '"' : '') + '>' + g + '</g>';
  }

  function listItems(ul, items) {
    ul.innerHTML = '';
    items.forEach(function (text) { var li = document.createElement('li'); li.textContent = text; ul.appendChild(li); });
  }

  function highlight(note, on) {
    var mark = overlayG.querySelector('.ov-mark[data-note="' + note + '"]');
    var li = findingsEl.querySelector('li[data-note="' + note + '"]');
    if (mark) mark.classList.toggle('hl', on);
    if (li) li.classList.toggle('hl', on);
  }

  function runScan(done) {
    if (reduceMotion) { done(); return; }
    var start = null;
    scanline.setAttribute('opacity', '1');
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / 1200, 1);
      scanline.setAttribute('y', (-8 + p * 308).toFixed(1));
      if (p < 1) requestAnimationFrame(step);
      else { scanline.setAttribute('opacity', '0'); done(); }
    }
    requestAnimationFrame(step);
  }

  function renderCaseButtons() {
    Array.prototype.forEach.call(casesEl.children, function (b) {
      var c = CASES.filter(function (x) { return x.id === b.dataset.id; })[0];
      b.lastChild.textContent = ct(c, 'label');
    });
  }

  function showCase(c, animate) {
    demoTimers.forEach(clearTimeout); demoTimers = [];
    current = c;
    setGlass(false);
    Array.prototype.forEach.call(casesEl.children, function (b) {
      var on = b.dataset.id === c.id;
      b.setAttribute('aria-checked', on ? 'true' : 'false');
      b.tabIndex = on ? 0 : -1;
    });

    var notes = ct(c, 'marks');
    el('photo-title').textContent = ct(c, 'title');
    skinG.innerHTML = c.skin;
    overlayG.innerHTML = c.marks.map(markSVG).join('');
    glassBtn.hidden = !c.glass;
    status.textContent = t('photo.scanning');
    el('fb-sub').textContent = ct(c, 'sub');
    feedback.classList.add('loading');

    findingsEl.innerHTML = '';
    notes.forEach(function (text, n) {
      var li = document.createElement('li');
      li.dataset.note = n; li.tabIndex = 0;
      li.innerHTML = '<span class="fnum">' + (n + 1) + '</span><span></span>';
      li.lastChild.textContent = text;
      li.addEventListener('mouseenter', function () { highlight(n, true); });
      li.addEventListener('mouseleave', function () { highlight(n, false); });
      li.addEventListener('focus', function () { highlight(n, true); });
      li.addEventListener('blur', function () { highlight(n, false); });
      findingsEl.appendChild(li);
    });
    el('fb-assess').textContent = ct(c, 'assess');
    listItems(el('fb-advice'), ct(c, 'advice'));
    listItems(el('fb-flags'), ct(c, 'flags'));
    el('fb-handoff').textContent = '→ ' + ct(c, 'handoff');

    function reveal() {
      var marks = overlayG.querySelectorAll('.ov-mark');
      var step = animate && !reduceMotion ? 380 : 0;
      Array.prototype.forEach.call(marks, function (m, i) {
        demoLater(function () { m.classList.add('in'); }, i * step);
      });
      demoLater(function () {
        feedback.classList.remove('loading');
        status.textContent = t('photo.noticed', { n: notes.length });
      }, marks.length * step);
    }
    if (animate) runScan(reveal); else reveal();
  }

  // Glass test: a draggable glass that makes the spots underneath fade.
  function setGlass(on) {
    glassOn = on;
    glassBtn.textContent = t(on ? 'glass.remove' : 'glass.try');
    if (!on) {
      glassG.setAttribute('opacity', '0');
      glassG.innerHTML = '';
      overlayG.classList.toggle('off', !overlayToggle.checked);
      return;
    }
    var gl = current.glass;
    glassG.innerHTML =
      '<g clip-path="url(#glass-clip)"><rect width="400" height="300" fill="url(#skin)"/>' +
      '<g class="blanch" filter="url(#soft)">' + gl.spots + '</g><rect width="400" height="300" fill="#fff" opacity=".12"/></g>' +
      '<g id="glass-move"><circle r="56" fill="none" stroke="rgba(46,35,32,.3)" stroke-width="9"/><circle r="56" fill="none" stroke="#fff" stroke-width="5" opacity=".95"/>' +
      '<path d="M-38 -28 A 46 46 0 0 1 -8 -46" stroke="#fff" stroke-width="5" stroke-linecap="round" fill="none" opacity=".8"/>' +
      '<g transform="translate(0 72)"><rect x="-62" y="-12" width="124" height="24" rx="12" fill="rgba(46,35,32,.75)"/>' +
      '<text y="4" fill="#fff" font-size="11.5" font-weight="700" text-anchor="middle" font-family="Nunito, sans-serif"></text></g></g>';
    glassG.querySelector('text').textContent = t('glass.drag');
    moveGlass(gl.x, gl.y);
    overlayG.classList.add('off');
    glassG.setAttribute('opacity', '1');
    var blanch = glassG.querySelector('.blanch');
    demoLater(function () { blanch.style.opacity = '.12'; }, 350);
    demoLater(function () {
      status.textContent = t('glass.status');
      if (!findingsEl.querySelector('.glass-result')) {
        var li = document.createElement('li');
        li.className = 'glass-result';
        li.innerHTML = '<span class="fnum ok">✓</span><span></span>';
        li.lastChild.textContent = t('glass.result');
        findingsEl.appendChild(li);
      }
    }, 1500);
  }

  function moveGlass(x, y) {
    x = Math.max(40, Math.min(360, x)); y = Math.max(40, Math.min(220, y));
    glassPos = { x: x, y: y };
    var c = el('glass-clip-c');
    c.setAttribute('cx', x); c.setAttribute('cy', y);
    var mv = el('glass-move');
    if (mv) mv.setAttribute('transform', 'translate(' + x + ' ' + y + ')');
  }

  function svgPoint(e) {
    var pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  }

  var drag = null;
  svg.addEventListener('pointerdown', function (e) {
    if (!glassOn) return;
    var p = svgPoint(e);
    if (Math.hypot(p.x - glassPos.x, p.y - glassPos.y) > 64) return;
    drag = { dx: p.x - glassPos.x, dy: p.y - glassPos.y };
    glassG.classList.add('dragging');
    svg.setPointerCapture(e.pointerId);
  });
  svg.addEventListener('pointermove', function (e) {
    if (!drag) return;
    var p = svgPoint(e);
    moveGlass(p.x - drag.dx, p.y - drag.dy);
  });
  ['pointerup', 'pointercancel'].forEach(function (ev) {
    svg.addEventListener(ev, function () { drag = null; glassG.classList.remove('dragging'); });
  });

  overlayG.addEventListener('mouseover', function (e) {
    var m = e.target.closest('.ov-mark[data-note]');
    if (m) highlight(m.dataset.note, true);
  });
  overlayG.addEventListener('mouseout', function (e) {
    var m = e.target.closest('.ov-mark[data-note]');
    if (m) highlight(m.dataset.note, false);
  });

  overlayToggle.addEventListener('change', function () {
    if (glassOn) setGlass(false);
    overlayG.classList.toggle('off', !overlayToggle.checked);
  });
  glassBtn.addEventListener('click', function () { setGlass(!glassOn); });

  // Case picker (radio group)
  CASES.forEach(function (c, i) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'case-btn'; b.dataset.id = c.id;
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', 'false');
    b.innerHTML = '<svg class="thumb" viewBox="120 70 160 160" aria-hidden="true"><rect x="0" y="0" width="400" height="300" fill="url(#skin)"/>' + c.skin + '</svg><span></span>';
    b.addEventListener('click', function () { showCase(c, true); });
    b.addEventListener('keydown', function (e) {
      var dir = (e.key === 'ArrowRight' || e.key === 'ArrowDown') ? 1 : (e.key === 'ArrowLeft' || e.key === 'ArrowUp') ? -1 : 0;
      if (!dir) return;
      e.preventDefault();
      var n = CASES[(i + dir + CASES.length) % CASES.length];
      showCase(n, true);
      casesEl.querySelector('[data-id="' + n.id + '"]').focus();
    });
    casesEl.appendChild(b);
  });
  renderCaseButtons();

  // Start the demo when it scrolls into view, so the scan animation is seen.
  var started = false;
  function start() { if (!started) { started = true; showCase(CASES[0], true); } }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries, obs) {
      if (entries.some(function (e) { return e.isIntersecting; })) { start(); obs.disconnect(); }
    }, { threshold: 0.3 }).observe(svg);
  } else {
    start();
  }

  /* ------------------------------------------------------------------
   * Waitlist form
   * ------------------------------------------------------------------ */
  var form = el('waitlist-form');
  var success = el('waitlist-success');
  var email = el('email');
  var consent = el('consent');
  var emailError = el('email-error');
  var consentError = el('consent-error');
  var submitBtn = form.querySelector('button[type="submit"]');
  var sending = false;

  function setError(input, errEl, key) {
    errEl.textContent = key ? t(key) : '';
    errEl.dataset.key = key || '';
    input.setAttribute('aria-invalid', key ? 'true' : 'false');
  }

  function validate() {
    var emailOk = email.value.trim() && email.checkValidity();
    setError(email, emailError, emailOk ? '' : 'err.email');
    setError(consent, consentError, consent.checked ? '' : 'err.consent');
    return emailOk && consent.checked;
  }

  function setSending(on) {
    sending = on;
    submitBtn.disabled = on;
    submitBtn.textContent = t(on ? 'form.sending' : 'wl.submit');
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (sending || !validate()) return;

    var data = new FormData(form);
    var payload = {
      name: (data.get('name') || '').trim(),
      email: data.get('email').trim(),
      region: data.get('region') || '',
      household: data.get('household') || '',
      interests: data.getAll('interests'),
      consent: true,
      lang: window.i18n.lang,
      company: data.get('company') || ''
    };

    setSending(true);
    fetch(form.getAttribute('data-endpoint'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (body) {
        if (res.ok && body.ok) {
          form.hidden = true;
          success.hidden = false;
          success.focus();
          return;
        }
        setSending(false);
        setError(email, emailError, body.error === 'invalid_email' ? 'err.email' : 'err.network');
      });
    }).catch(function () {
      setSending(false);
      setError(email, emailError, 'err.network');
    });
  });

  /* ------------------------------------------------------------------
   * Re-render generated text when the language changes
   * ------------------------------------------------------------------ */
  window.i18n.onChange(function () {
    select(tabs.filter(function (tab) { return tab.dataset.mode === currentMode; })[0], false);
    renderCaseButtons();
    if (current) showCase(current, false);
    setSending(sending);
    [[email, emailError], [consent, consentError]].forEach(function (pair) {
      if (pair[1].dataset.key) setError(pair[0], pair[1], pair[1].dataset.key);
    });
  });
})();
