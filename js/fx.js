/* Shared helpers. Classic script (no modules) so the deck also runs from file://. */
(function () {
  const FX = {};

  FX.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  FX.lerp = (a, b, t) => a + (b - a) * t;
  FX.ease = t => 1 - Math.pow(1 - t, 3);
  FX.easeIO = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  FX.rand = (a, b) => a + Math.random() * (b - a);
  FX.sleep = ms => new Promise(r => setTimeout(r, ms));
  FX.$ = (el, sel) => el.querySelector(sel);
  FX.$$ = (el, sel) => Array.from(el.querySelectorAll(sel));

  /* Gaussian-ish RGB noise canvases (our own pixels, never tainted). */
  FX.noiseCanvases = function (w, h, count = 4, mono = false) {
    const out = [];
    for (let c = 0; c < count; c++) {
      const cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      const ctx = cv.getContext('2d');
      const img = ctx.createImageData(w, h);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const g = () => (Math.random() + Math.random() + Math.random()) / 3 * 255;
        if (mono) { const v = g(); d[i] = d[i + 1] = d[i + 2] = v; }
        else { d[i] = g(); d[i + 1] = g(); d[i + 2] = g(); }
        d[i + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
      out.push(cv);
    }
    return out;
  };

  /* requestAnimationFrame loop with stop(); fn(dt, t) */
  FX.loop = function (fn) {
    let id = 0, last = performance.now(), alive = true;
    const tick = now => {
      if (!alive) return;
      const dt = Math.max(0, Math.min(0.1, (now - last) / 1000)); last = now;   // rAF time can precede performance.now()
      fn(dt, now / 1000);
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => { alive = false; cancelAnimationFrame(id); };
  };

  /* Promise tween; returns {promise, cancel} */
  FX.tween = function (dur, onUpdate, ease = FX.ease) {
    let stop = false, raf = 0;
    const t0 = performance.now();
    const promise = new Promise(res => {
      const tick = now => {
        if (stop) return res(false);
        const k = FX.clamp((now - t0) / dur, 0, 1);
        onUpdate(ease(k), k);
        if (k < 1) raf = requestAnimationFrame(tick); else res(true);
      };
      raf = requestAnimationFrame(tick);
    });
    return { promise, cancel() { stop = true; cancelAnimationFrame(raf); } };
  };

  FX.loadImg = src => new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im); im.onerror = rej; im.src = src;
  });

  /* Collect timers/loops per slide so leave() can clean everything. */
  FX.bag = function () {
    const items = [];
    return {
      add(stopFn) { items.push(stopFn); return stopFn; },
      timeout(fn, ms) { const id = setTimeout(fn, ms); items.push(() => clearTimeout(id)); return id; },
      interval(fn, ms) { const id = setInterval(fn, ms); items.push(() => clearInterval(id)); return id; },
      loop(fn) { return this.add(FX.loop(fn)); },
      tween(dur, fn, ease) { const t = FX.tween(dur, fn, ease); items.push(t.cancel); return t.promise; },
      clear() { while (items.length) { try { items.pop()(); } catch (e) {} } }
    };
  };

  /* Draw a (noisy) mix: x_t = a·x0 + b·eps, approximated with canvas compositing. */
  FX.drawNoisy = function (ctx, img, noiseCv, abar, w, h) {
    const a = Math.sqrt(abar), b = Math.sqrt(1 - abar);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#6e6e6e'; ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = a; ctx.drawImage(img, 0, 0, w, h);
    ctx.globalAlpha = b * b * 0.92 + b * 0.08;
    const ox = (Math.random() * 40) | 0, oy = (Math.random() * 40) | 0;
    ctx.drawImage(noiseCv, ox, oy, noiseCv.width - 40, noiseCv.height - 40, 0, 0, w, h);
    ctx.globalAlpha = 1;
  };

  /* Text → canvas texture helper for Three.js */
  FX.textCanvas = function (text, opt = {}) {
    const w = opt.w || 1024, h = opt.h || 256;
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const c = cv.getContext('2d');
    if (opt.bg) { c.fillStyle = opt.bg; c.fillRect(0, 0, w, h); }
    if (opt.border) { c.strokeStyle = opt.border; c.lineWidth = opt.bw || 8; c.strokeRect(4, 4, w - 8, h - 8); }
    c.fillStyle = opt.color || '#ece6da';
    c.font = opt.font || `italic 110px 'Instrument Serif', Georgia, serif`;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(text, w / 2, h / 2 + (opt.dy || 0));
    return cv;
  };

  FX.fmt = n => Math.round(n).toLocaleString('en-US');
  FX.pad = (n, k) => String(n).padStart(k, '0');

  /* WebGL availability */
  FX.hasGL = (function () {
    try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); }
    catch (e) { return false; }
  })();

  window.FX = FX;
})();
