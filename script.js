(function () {
  'use strict';

  var SVGNS = 'http://www.w3.org/2000/svg';
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.getElementById('year').textContent = new Date().getFullYear();

  /* ------------------------------------------------------------------
   * Hero: chat / voice / video tabs
   * ------------------------------------------------------------------ */
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.mode-tabs [role="tab"]'));
  var panels = {};
  tabs.forEach(function (t) { panels[t.dataset.mode] = document.getElementById(t.getAttribute('aria-controls')); });

  var timers = [];
  var autoRotate = !reduceMotion;
  var captions = [
    "Hi! I'm your AI practitioner. Could you hold the camera a bit closer to the spots?",
    'Lovely, thank you. I can see small, flat pink spots on her tummy.',
    "Let's do the glass test together. Press a clear glass firmly against a few spots.",
    "They fade under the glass. That's a reassuring sign.",
    "I'll write down what we saw and what to watch for tonight."
  ];
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
      captions.forEach(function (text, i) {
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
        var i = tabs.findIndex(function (t) { return t.dataset.mode === mode; });
        select(tabs[(i + 1) % tabs.length], false);
      }, total + 3500);
    }
  }

  function select(tab, byUser) {
    if (byUser) autoRotate = false;
    clearTimers();
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      panels[t.dataset.mode].hidden = !on;
    });
    play(tab.dataset.mode);
  }

  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { select(t, true); });
    t.addEventListener('keydown', function (e) {
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

  var CASES = [
    {
      id: 'viral',
      label: 'Spotty rash',
      sub: 'Example · toddler, 2 years, with a cold',
      title: 'Illustration of many small pink spots on a child\'s tummy',
      skin: '<g filter="url(#soft)">' + viralSpots + '</g>',
      glass: { spots: viralSpots, x: 270, y: 165 },
      marks: [
        { type: 'ring', cx: 200, cy: 150, r: 118, text: 'Lots of small, flat, pink spots, about 2–4 mm across' },
        { type: 'ring', cx: 110, cy: 95, r: 34, text: 'Spread evenly over the tummy and chest, with no blisters' },
        { type: 'ring', cx: 330, cy: 70, r: 26, text: 'The skin between the spots looks normal' },
        { type: 'ruler', x1: 300, y1: 272, x2: 340, y2: 272, label: '≈ 4 mm', hideNum: true }
      ],
      assess: 'Together with a cold or a recent fever, this looks most like a viral rash (viral exanthem). It\'s very common in young children and usually fades by itself within a few days.',
      advice: ['Do the glass test: press a clear glass firmly against the spots', 'Offer plenty to drink and let them rest', 'Take a new photo tomorrow so we can compare'],
      flags: ['The spots don\'t fade under the glass: call 112', 'Your child is floppy, unusually drowsy or hard to wake', 'Breathing is fast or looks like hard work'],
      handoff: 'If the rash is still there after a few days, or you\'re worried, I\'ll book you in with a licensed doctor.'
    },
    {
      id: 'eczema',
      label: 'Dry, red patches',
      sub: 'Example · baby, 10 months, inside of the elbow',
      title: 'Illustration of dry, red, rough skin patches with scratch marks',
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
        { type: 'ring', cx: 205, cy: 150, r: 100, text: 'Dry, rough, red patches with soft, blurry edges' },
        { type: 'ring', cx: 250, cy: 190, r: 30, text: 'Fine white flaking on the surface' },
        { type: 'ring', cx: 180, cy: 132, r: 38, text: 'Scratch marks, so it\'s probably itchy' },
        { type: 'ruler', x1: 115, y1: 270, x2: 295, y2: 270, label: '≈ 5 cm', hideNum: true }
      ],
      assess: 'This looks most like atopic eczema, which is very common in babies and young children. It often shows up in skin folds, on the cheeks and behind the knees, and comes and goes.',
      advice: ['Moisturise with a fragrance-free cream several times a day, even on good days', 'Short, lukewarm baths and soft cotton clothes', 'Keep nails short to limit scratching'],
      flags: ['Yellow crusts, weeping or pus, which can mean infection', 'Clusters of painful blisters or sores spreading quickly', 'Your child has a fever and seems unwell'],
      handoff: 'If moisturiser isn\'t enough, a licensed doctor can take a look and prescribe a treatment cream.'
    },
    {
      id: 'bite',
      label: 'Swollen bite',
      sub: 'Example · child, 4 years, on the arm',
      title: 'Illustration of an insect bite with a swollen centre and surrounding redness',
      skin: '<circle cx="200" cy="150" r="78" fill="#e0705e" opacity=".42" filter="url(#softer)"/>' +
        '<circle cx="200" cy="150" r="46" fill="#dc6554" opacity=".35" filter="url(#softer)"/>' +
        '<circle cx="200" cy="150" r="15" fill="#f0a08c" filter="url(#soft)"/>' +
        '<circle cx="195" cy="145" r="6" fill="#fff" opacity=".35" filter="url(#soft)"/>' +
        '<circle cx="201" cy="151" r="1.8" fill="#8f2a1e"/>',
      marks: [
        { type: 'ring', cx: 200, cy: 150, r: 24, text: 'A raised bump with a tiny puncture point in the middle' },
        { type: 'ring', cx: 200, cy: 150, r: 84, text: 'Pink swelling around it, about 5 cm across' },
        { type: 'pen', cx: 200, cy: 150, r: 100, text: 'No red streaks spreading out. Draw a pen line like this to see if it grows' },
        { type: 'ruler', x1: 116, y1: 272, x2: 284, y2: 272, label: '≈ 5 cm', hideNum: true }
      ],
      assess: 'This looks most like a local reaction to an insect bite. Children often swell up quite a lot. It usually peaks after a day or two and settles within a week.',
      advice: ['Cool it with a cold, damp cloth', 'Draw around the edge with a pen so you can see if it spreads', 'Ask the pharmacy about an anti-itch cream or antihistamine suitable for your child\'s age'],
      flags: ['Swollen lips, tongue or face, or trouble breathing: call 112', 'Redness spreading past your pen line, red streaks, or fever', 'It becomes very painful or hot, or fills with pus'],
      handoff: 'If it\'s spreading or not getting better after a few days, a licensed doctor can check whether it\'s infected.'
    },
    {
      id: 'hfmd',
      label: 'Blisters on the hand',
      sub: 'Example · child, 3 years, palm of the hand',
      title: 'Illustration of small oval blisters with red rims on a child\'s palm',
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
        { type: 'ring', cx: 205, cy: 190, r: 110, text: 'Small oval blisters, 3–5 mm, each with a red rim' },
        { type: 'ring', cx: 150, cy: 150, r: 34, text: 'On the palm, a typical place for this kind of rash' },
        { type: 'ring', cx: 345, cy: 190, r: 24, text: 'The skin around the blisters looks normal' },
        { type: 'ruler', x1: 300, y1: 280, x2: 340, y2: 280, label: '≈ 5 mm', hideNum: true }
      ],
      assess: 'Blisters like these on the hands, especially together with sores in the mouth, are typical of hand, foot and mouth disease. It\'s a common, mild virus in daycare children and clears up by itself in 7–10 days.',
      advice: ['Offer cool, soft food and plenty to drink, as mouth sores can hurt', 'Pain relief suitable for your child\'s age can make drinking easier', 'Wash hands often, because it spreads easily'],
      flags: ['Your child won\'t drink, or has far fewer wet nappies', 'Unusually drowsy, floppy or irritable', 'A stiff neck, or a high fever that won\'t come down'],
      handoff: 'Most children don\'t need a doctor for this. If you\'re unsure, I can hand you over to one.'
    }
  ];

  var el = function (id) { return document.getElementById(id); };
  var svg = el('photo-svg');
  if (!svg) return initForm();

  var skinG = el('photo-skin'), overlayG = el('photo-overlay'), glassG = el('photo-glass');
  var scanline = el('scanline'), status = el('photo-status');
  var findingsEl = el('findings'), feedback = document.querySelector('.demo-feedback');
  var overlayToggle = el('overlay-toggle'), glassBtn = el('glass-btn');
  var casesEl = document.querySelector('.demo-cases');
  var demoTimers = [], current = null, glassOn = false, glassPos = { x: 0, y: 0 };

  function demoLater(fn, ms) { demoTimers.push(setTimeout(fn, ms)); }

  function markSVG(m, i) {
    var num = i + 1, g = '';
    var halo = function (inner) { return inner.replace(/class="ov-line"/g, 'stroke="rgba(46,35,32,.45)" stroke-width="5"') + inner; };
    if (m.type === 'ring' || m.type === 'pen') {
      var dash = m.type === 'pen' ? '2 7' : '7 6';
      var color = m.type === 'pen' ? '#2f6fd6' : '#fff';
      var ring = '<circle class="ov-line ov-ring" cx="' + m.cx + '" cy="' + m.cy + '" r="' + m.r + '" fill="none" stroke="' + color + '" stroke-width="2.5" stroke-dasharray="' + dash + '" stroke-linecap="round"/>';
      g += m.type === 'pen'
        ? ring.replace('ov-line ', '')
        : halo('<circle class="ov-line" cx="' + m.cx + '" cy="' + m.cy + '" r="' + m.r + '" fill="none" stroke-dasharray="7 6"/>') + ring.replace('ov-line ', '');
      var a = -Math.PI / 4 - i * 0.5;
      var px = m.cx + Math.cos(a) * m.r, py = m.cy + Math.sin(a) * m.r;
      px = Math.max(16, Math.min(384, px)); py = Math.max(16, Math.min(284, py));
      g += pin(px, py, num);
    } else if (m.type === 'ruler') {
      var line = '<path class="ov-line" d="M' + m.x1 + ' ' + m.y1 + 'H' + m.x2 + 'M' + m.x1 + ' ' + (m.y1 - 6) + 'v12M' + m.x2 + ' ' + (m.y2 - 6) + 'v12" fill="none"/>';
      g += halo(line) + line.replace('class="ov-line"', 'stroke="#fff" stroke-width="2.5"');
      var mid = (m.x1 + m.x2) / 2, w = m.label.length * 7 + 18;
      g += '<rect x="' + (mid - w / 2) + '" y="' + (m.y1 - 30) + '" width="' + w + '" height="20" rx="10" fill="rgba(46,35,32,.75)"/>' +
        '<text x="' + mid + '" y="' + (m.y1 - 16) + '" fill="#fff" font-size="11.5" font-weight="700" text-anchor="middle" font-family="Nunito, sans-serif">' + m.label + '</text>';
      if (!m.hideNum) g += pin(m.x1 - 20, m.y1, num);
    }
    return '<g class="ov-mark" data-i="' + i + '">' + g + '</g>';
  }

  function pin(x, y, n) {
    return '<g class="ov-pin" data-pin="' + (n - 1) + '"><circle cx="' + x + '" cy="' + y + '" r="12" fill="#c4502f" stroke="#fff" stroke-width="2.5"/>' +
      '<text x="' + x + '" y="' + (y + 4) + '" fill="#fff" font-size="12" font-weight="800" text-anchor="middle" font-family="Nunito, sans-serif">' + n + '</text></g>';
  }

  function listItems(ul, items) {
    ul.innerHTML = '';
    items.forEach(function (t) { var li = document.createElement('li'); li.textContent = t; ul.appendChild(li); });
  }

  function highlight(i, on) {
    var mark = overlayG.querySelector('.ov-mark[data-i="' + i + '"]');
    var li = findingsEl.querySelector('li[data-i="' + i + '"]');
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

  function showCase(c) {
    demoTimers.forEach(clearTimeout); demoTimers = [];
    current = c;
    setGlass(false);
    Array.prototype.forEach.call(casesEl.children, function (b) { b.setAttribute('aria-checked', b.dataset.id === c.id ? 'true' : 'false'); b.tabIndex = b.dataset.id === c.id ? 0 : -1; });

    el('photo-title').textContent = c.title;
    skinG.innerHTML = c.skin;
    overlayG.innerHTML = c.marks.map(markSVG).join('');
    glassBtn.hidden = !c.glass;
    status.textContent = 'Looking closely…';
    status.style.opacity = 1;
    el('fb-sub').textContent = c.sub;
    feedback.classList.add('loading');

    findingsEl.innerHTML = '';
    c.marks.forEach(function (m, i) {
      if (!m.text) return;
      var li = document.createElement('li');
      li.dataset.i = i; li.tabIndex = 0;
      li.innerHTML = '<span class="fnum">' + (i + 1) + '</span><span></span>';
      li.lastChild.textContent = m.text;
      li.addEventListener('mouseenter', function () { highlight(i, true); });
      li.addEventListener('mouseleave', function () { highlight(i, false); });
      li.addEventListener('focus', function () { highlight(i, true); });
      li.addEventListener('blur', function () { highlight(i, false); });
      findingsEl.appendChild(li);
    });
    el('fb-assess').textContent = c.assess;
    listItems(el('fb-advice'), c.advice);
    listItems(el('fb-flags'), c.flags);
    el('fb-handoff').textContent = '→ ' + c.handoff;

    runScan(function () {
      var marks = overlayG.querySelectorAll('.ov-mark');
      Array.prototype.forEach.call(marks, function (m, i) {
        demoLater(function () { m.classList.add('in'); }, reduceMotion ? 0 : i * 380);
      });
      demoLater(function () {
        feedback.classList.remove('loading');
        var n = c.marks.filter(function (m) { return m.text; }).length;
        status.textContent = n + ' things I noticed';
      }, reduceMotion ? 0 : marks.length * 380);
    });
  }

  // Glass test: a draggable glass that makes the spots underneath fade.
  function setGlass(on) {
    glassOn = on;
    glassBtn.textContent = on ? 'Remove the glass' : 'Try the glass test';
    if (!on) { glassG.setAttribute('opacity', '0'); glassG.innerHTML = ''; overlayG.classList.toggle('off', !overlayToggle.checked); return; }
    var gl = current.glass;
    glassPos = { x: gl.x, y: gl.y };
    glassG.innerHTML =
      '<g clip-path="url(#glass-clip)"><rect width="400" height="300" fill="url(#skin)"/>' +
      '<g class="blanch" filter="url(#soft)">' + gl.spots + '</g><rect width="400" height="300" fill="#fff" opacity=".12"/></g>' +
      '<g id="glass-move"><circle r="56" fill="none" stroke="rgba(46,35,32,.3)" stroke-width="9"/><circle r="56" fill="none" stroke="#fff" stroke-width="5" opacity=".95"/>' +
      '<path d="M-38 -28 A 46 46 0 0 1 -8 -46" stroke="#fff" stroke-width="5" stroke-linecap="round" fill="none" opacity=".8"/>' +
      '<g transform="translate(0 72)"><rect x="-58" y="-12" width="116" height="24" rx="12" fill="rgba(46,35,32,.75)"/>' +
      '<text y="4" fill="#fff" font-size="11.5" font-weight="700" text-anchor="middle" font-family="Nunito, sans-serif">Drag the glass</text></g></g>';
    moveGlass(glassPos.x, glassPos.y);
    overlayG.classList.add('off');
    glassG.setAttribute('opacity', '1');
    var blanch = glassG.querySelector('.blanch');
    demoLater(function () { blanch.style.opacity = '.12'; }, 350);
    demoLater(function () {
      status.textContent = 'Spots fade under the glass ✓';
      var li = findingsEl.querySelector('.glass-result');
      if (!li) {
        li = document.createElement('li');
        li.className = 'glass-result';
        li.innerHTML = '<span class="fnum" style="background:var(--sage)">✓</span><span>Glass test: the spots fade when pressed. That\'s a reassuring sign.</span>';
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
    var m = e.target.closest('.ov-mark');
    if (m) highlight(m.dataset.i, true);
  });
  overlayG.addEventListener('mouseout', function (e) {
    var m = e.target.closest('.ov-mark');
    if (m) highlight(m.dataset.i, false);
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
    b.innerHTML = '<svg class="thumb" viewBox="120 70 160 160" aria-hidden="true"><rect x="0" y="0" width="400" height="300" fill="url(#skin)"/>' + c.skin + '</svg><span></span>';
    b.lastChild.textContent = c.label;
    b.addEventListener('click', function () { showCase(c); });
    b.addEventListener('keydown', function (e) {
      var dir = (e.key === 'ArrowRight' || e.key === 'ArrowDown') ? 1 : (e.key === 'ArrowLeft' || e.key === 'ArrowUp') ? -1 : 0;
      if (!dir) return;
      e.preventDefault();
      var n = CASES[(i + dir + CASES.length) % CASES.length];
      showCase(n);
      casesEl.querySelector('[data-id="' + n.id + '"]').focus();
    });
    casesEl.appendChild(b);
  });

  // Start the demo when it scrolls into view, so the scan animation is seen.
  var started = false;
  function start() { if (!started) { started = true; showCase(CASES[0]); } }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries, obs) {
      if (entries.some(function (e) { return e.isIntersecting; })) { start(); obs.disconnect(); }
    }, { threshold: 0.3 }).observe(svg);
  } else {
    start();
  }

  initForm();

  /* ------------------------------------------------------------------
   * Waitlist form
   * ------------------------------------------------------------------ */
  function initForm() {
    var form = el('waitlist-form');
    var success = el('waitlist-success');
    var email = el('email');
    var consent = el('consent');
    var emailError = el('email-error');
    var consentError = el('consent-error');

    function setError(input, errEl, message) {
      errEl.textContent = message;
      input.setAttribute('aria-invalid', message ? 'true' : 'false');
    }

    function validate() {
      var ok = true;
      if (!email.value.trim() || !email.checkValidity()) {
        setError(email, emailError, 'Please enter a valid email address.');
        ok = false;
      } else {
        setError(email, emailError, '');
      }
      if (!consent.checked) {
        setError(consent, consentError, 'Please tick the box so we can get in touch.');
        ok = false;
      } else {
        setError(consent, consentError, '');
      }
      return ok;
    }

    function showSuccess() {
      form.hidden = true;
      success.hidden = false;
      success.focus();
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!validate()) return;

      var data = new FormData(form);
      var payload = {
        name: data.get('name') || '',
        email: data.get('email'),
        region: data.get('region') || '',
        household: data.get('household') || '',
        interests: data.getAll('interests'),
        consent: true,
        submittedAt: new Date().toISOString()
      };

      // Set data-endpoint on the form to a waitlist backend (e.g. Formspree,
      // a serverless function or a CRM webhook) that accepts JSON via POST.
      var endpoint = form.getAttribute('data-endpoint');
      if (!endpoint) {
        console.info('[waitlist] No endpoint configured, signup not sent:', payload);
        showSuccess();
        return;
      }

      var button = form.querySelector('button[type="submit"]');
      button.disabled = true;
      button.textContent = 'Sending…';

      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload)
      }).then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        showSuccess();
      }).catch(function () {
        button.disabled = false;
        button.textContent = 'Join the waitlist';
        setError(email, emailError, 'Something went wrong. Please try again in a moment.');
      });
    });
  }
})();
