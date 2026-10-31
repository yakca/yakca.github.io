(function () {
  'use strict';

  var root = document.documentElement;
  var langButtons = document.querySelectorAll('[data-set-lang]');
  var altImages = document.querySelectorAll('img[data-alt-ja]');
  altImages.forEach(function (img) { img.dataset.altEn = img.alt; });

  function setLang(lang) {
    root.lang = lang;
    root.dataset.lang = lang;
    langButtons.forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.setLang === lang));
    });
    altImages.forEach(function (img) {
      img.alt = lang === 'ja' ? img.dataset.altJa : img.dataset.altEn;
    });
  }
  langButtons.forEach(function (b) {
    b.addEventListener('click', function () {
      var lang = b.dataset.setLang;
      setLang(lang);
      try { localStorage.setItem('lang', lang); } catch (e) {}
      var url = new URL(location.href);
      if (url.searchParams.has('lang')) {
        url.searchParams.set('lang', lang);
        history.replaceState(null, '', url);
      }
    });
  });
  setLang(root.dataset.lang || 'en');

  // Pre-rendered glow sprites so each ember is a cheap drawImage.
  function sprite(r, g, b) {
    var size = 64;
    var c = document.createElement('canvas');
    c.width = c.height = size;
    var x = c.getContext('2d');
    var grad = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(' + r + ',' + g + ',' + b + ',1)');
    grad.addColorStop(0.35, 'rgba(' + r + ',' + g + ',' + b + ',0.45)');
    grad.addColorStop(1, 'rgba(' + r + ',' + g + ',' + b + ',0)');
    x.fillStyle = grad;
    x.fillRect(0, 0, size, size);
    return c;
  }
  var SPR_HOT = sprite(255, 160, 70);
  var SPR_COOL = sprite(210, 70, 25);

  function rand(a, b) { return a + Math.random() * (b - a); }

  var canvas = document.getElementById('embers');
  var ctx = canvas.getContext('2d');
  var embers = [];
  var vw = 0, vh = 0;

  function newEmber(anywhere) {
    return {
      x: rand(0, vw),
      y: anywhere ? rand(0, vh) : vh + 10,
      vy: rand(0.25, 0.8),
      size: rand(1, 2.6),
      phase: rand(0, Math.PI * 2),
      sway: rand(0.2, 0.7),
      life: rand(0.5, 1)
    };
  }

  function resize() {
    vw = canvas.clientWidth;
    vh = canvas.clientHeight;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = vw * dpr;
    canvas.height = vh * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var target = Math.round(Math.min(70, vw / 20));
    while (embers.length < target) embers.push(newEmber(true));
    embers.length = target;
  }

  function draw(t, dt) {
    ctx.clearRect(0, 0, vw, vh);
    ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < embers.length; i++) {
      var e = embers[i];
      e.y -= e.vy * dt;
      e.x += Math.sin(t / 900 + e.phase) * e.sway * 0.4 * dt;
      if (e.y < -10) { embers[i] = newEmber(false); continue; }
      var fade = Math.min(1, e.y / (vh * 0.6));
      var flicker = 0.6 + 0.4 * Math.sin(t / 140 + e.phase * 3);
      ctx.globalAlpha = Math.max(0, fade * e.life * flicker * 0.8);
      var s = e.size * 6;
      ctx.drawImage(e.size > 2 ? SPR_HOT : SPR_COOL, e.x - s / 2, e.y - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  resize();
  new ResizeObserver(resize).observe(canvas);
  // Moving to a screen with a different pixel ratio doesn't resize the canvas.
  (function watchDpr() {
    window.matchMedia('(resolution: ' + window.devicePixelRatio + 'dppx)')
      .addEventListener('change', function () { resize(); watchDpr(); }, { once: true });
  })();

  var rafId = 0, last = 0;
  function frame(t) {
    var dt = Math.min(t - (last || t), 50) / (1000 / 60);
    last = t;
    draw(t, dt);
    rafId = requestAnimationFrame(frame);
  }

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  function syncMotion() {
    if (reducedMotion.matches) {
      cancelAnimationFrame(rafId);
      rafId = 0;
      ctx.clearRect(0, 0, vw, vh);
    } else if (!rafId) {
      last = 0;
      rafId = requestAnimationFrame(frame);
    }
  }
  reducedMotion.addEventListener('change', syncMotion);
  syncMotion();
})();
