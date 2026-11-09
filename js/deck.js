/* Deck engine: stage scaling, slides/steps, transitions, HUD, letterbox, presenter sync. */
(function () {
  const W = 1920, H = 1080, MAIN = 11;
  const Deck = window.Deck = {
    ctrls: {}, idx: 0, step: 0, lite: false, busy: false, started: false,
    t0: null, pending: null, integrity: 100
  };
  const $ = s => document.querySelector(s);
  let stage, slides, noiseCvs, fxNoise, fxCtx, hudEl;

  Deck.register = (id, c) => { Deck.ctrls[id] = c; };
  const ctrlOf = el => el && Deck.ctrls[el.dataset.id];
  const stepsOf = el => +(el.dataset.steps || 0);
  Deck.cur = () => slides[Deck.idx];

  function fit() {
    const s = Math.min(innerWidth / W, innerHeight / H);
    stage.style.transform = `translate(-50%,-50%) scale(${s})`;
    Deck.scale = s;
  }

  function setSteps(el, n) {
    for (let k = 1; k <= 8; k++) el.classList.toggle('s' + k, k <= n);
  }

  // Stepping back: let what is leaving fade out first, then bring back what returns.
  const shownAt = (e, n) => (!e.dataset.f || n >= +e.dataset.f) && (!e.dataset.fout || n < +e.dataset.fout);
  let backTimer = 0;
  function clearBack(el) {
    clearTimeout(backTimer);
    if (!el) return;
    el.classList.remove('back');
    el.querySelectorAll('.go-out,.come-in').forEach(e => e.classList.remove('go-out', 'come-in'));
  }
  function markBack(el, from, to) {
    clearBack(el);
    el.classList.add('back');
    el.querySelectorAll('[data-f],[data-fout]').forEach(e => {
      const a = shownAt(e, from), b = shownAt(e, to);
      if (a && !b) e.classList.add('go-out');
      else if (!a && b) e.classList.add('come-in');
    });
    backTimer = setTimeout(() => clearBack(el), 1400);
  }

  /* ---------------- public helpers for slides ---------------- */
  Deck.letterbox = on => stage.classList.toggle('lb-on', !!on);
  Deck.hudShow = on => stage.classList.toggle('hud-off', !on);
  Deck.hudGlow = () => { hudEl.classList.remove('glow'); void hudEl.offsetWidth; hudEl.classList.add('glow'); };
  let intTween = null, intShown = 100;
  Deck.setIntegrity = function (v, instant) {
    const from = intShown, prev = Deck.integrity;
    Deck.integrity = v;
    if (intTween) intTween.cancel();
    const el = $('#hud-int');
    const paint = x => {
      intShown = x; el.textContent = Math.round(x) + '%';
      hudEl.classList.toggle('int-low', x < 50);
    };
    if (instant) paint(v);
    else { intTween = FX.tween(Math.abs(v - from) * 22 + 200, k => paint(FX.lerp(from, v, k))); }
    if (v >= 100 && prev < 60 && !instant) {
      hudEl.classList.add('int-ok');
      setTimeout(() => hudEl.classList.remove('int-ok'), 2600);
    }
  };

  /* ---------------- navigation ---------------- */
  function keyHit(k) {
    const kb = hudEl && hudEl.querySelector(`kbd[data-k="${k}"]`); if (!kb) return;
    kb.classList.remove('hit'); void kb.offsetWidth; kb.classList.add('hit');
    clearTimeout(kb._t); kb._t = setTimeout(() => kb.classList.remove('hit'), 160);
  }
  Deck.next = function () {
    keyHit('next');
    if (Deck.busy) { Deck.pending = 'next'; return; }
    const el = Deck.cur();
    if (Deck.step < stepsOf(el)) Deck.goto(Deck.idx, Deck.step + 1);
    else if (Deck.idx < slides.length - 1) Deck.goto(Deck.idx + 1, 0, { dir: 1 });
  };
  Deck.prev = function () {
    keyHit('prev');
    if (Deck.busy) { Deck.pending = 'prev'; return; }
    if (Deck.step > 0) Deck.goto(Deck.idx, Deck.step - 1);
    else if (Deck.idx > 0) Deck.goto(Deck.idx - 1, -1, { dir: -1 });
  };

  Deck.goto = async function (i, step = 0, o = {}) {
    i = FX.clamp(i | 0, 0, slides.length - 1);
    const el = slides[i], n = stepsOf(el);
    step = (step < 0 || step > n) ? n : step;
    const from = Deck.started ? Deck.cur() : null;

    if (from === el) {
      const prev = Deck.step;
      if (step === prev) return;
      Deck.step = step;
      if (step < prev) markBack(el, prev, step); else clearBack(el);
      setSteps(el, step);
      const c = ctrlOf(el);
      try { c && c.step && c.step(el, step, step > prev ? 1 : -1, prev); } catch (e) { console.error(e); }
      afterChange();
      return;
    }
    if (Deck.busy) { Deck.pending = [i, step, o]; return; }
    Deck.busy = true;
    const dir = o.dir != null ? o.dir : (i > Deck.idx ? 1 : -1);
    let trans = (o.instant || !from) ? 'cut' : ((dir > 0 ? el.dataset.trans : from.dataset.trans) || 'fade');
    if (Deck.lite && trans === 'denoise') trans = 'fade';

    const swap = () => {
      if (from) {
        from.classList.remove('active', 'show-paper');
        const fc = ctrlOf(from);
        try { fc && fc.leave && fc.leave(from); } catch (e) { console.error(e); }
      }
      clearBack(from);
      Deck.idx = i; Deck.step = step;
      if (i >= 1 && Deck.t0 == null) Deck.t0 = Date.now();
      el.classList.add('no-anim');
      setSteps(el, step);
      el.classList.add('active');
      Deck.letterbox(false);
      Deck.hudShow(el.dataset.hud !== 'off');
      Deck.setIntegrity(100, true);
      const c = ctrlOf(el);
      try { c && c.enter && c.enter(el, step, dir); } catch (e) { console.error(e); }
      void el.offsetWidth;
      requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove('no-anim')));
    };

    try { await runTransition(trans, from, el, swap); } catch (e) { console.error(e); }
    Deck.started = true;
    Deck.busy = false;
    afterChange();
    const p = Deck.pending; Deck.pending = null;
    if (p === 'next') Deck.next();
    else if (p === 'prev') Deck.prev();
    else if (p) Deck.goto(p[0], p[1], p[2]);
  };

  /* ---------------- transitions ---------------- */
  async function runTransition(kind, from, to, swap) {
    if (kind === 'cut' || !from) { swap(); return; }
    if (kind === 'fade') {
      await from.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 240, easing: 'ease-in', fill: 'forwards' }).finished;
      swap();
      from.getAnimations().forEach(a => a.cancel());
      await to.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 380, easing: 'ease-out' }).finished;
      return;
    }
    // denoise: forward diffusion out, 4 DDIM steps in
    const ddim = $('#fx-ddim');
    let alive = true;
    const drawNoise = () => {
      if (!alive) return;
      const cv = noiseCvs[(Math.random() * noiseCvs.length) | 0];
      fxCtx.drawImage(cv, (Math.random() * 60) | 0, (Math.random() * 40) | 0, 480, 270, 0, 0, 480, 270);
      requestAnimationFrame(drawNoise);
    };
    drawNoise();
    await FX.tween(260, k => {
      fxNoise.style.opacity = k;
      from.style.filter = `blur(${k * 10}px)`;
    }, t => t * t).promise;
    from.style.filter = '';
    swap();
    for (let k = 1; k <= 4; k++) {
      ddim.textContent = `DENOISING · DDIM STEP ${k}/4`;
      ddim.style.opacity = 1;
      fxNoise.style.opacity = 1 - k / 4 * 0.98;
      to.style.filter = `blur(${(4 - k) * 3.5}px) saturate(${0.5 + k / 8})`;
      await FX.sleep(95);
    }
    to.style.filter = '';
    fxNoise.style.opacity = 0;
    ddim.style.opacity = 0;
    alive = false;
  }

  /* ---------------- HUD ---------------- */
  function lvlText() {
    const id = Deck.cur().dataset.id;
    if (id === 'boot') return '--/' + MAIN;
    if (id === 'qa') return 'Q&A';
    return FX.pad(Deck.idx, 2) + '/' + MAIN;
  }
  function updateHud() {
    const el = Deck.cur(); if (!el) return;
    const note = (window.DECK_NOTES || {})[el.dataset.id] || {};
    $('#hud-lvl').textContent = lvlText();
    $('#hud-title').textContent = note.title || '';
  }
  function initHud() {
    hudEl = $('#hud');
  }

  /* ---------------- presenter sync ---------------- */
  let bc = null; const seen = new Set();
  function publish() {
    const el = Deck.cur();
    const st = { type: 'state', idx: Deck.idx, step: Deck.step, steps: stepsOf(el), id: el.dataset.id,
      t0: Deck.t0, total: slides.length, ids: slides.map(s => s.dataset.id), ts: Date.now() };
    try { bc && bc.postMessage(st); } catch (e) {}
    try { localStorage.setItem('gg-state', JSON.stringify(st)); } catch (e) {}
  }
  function handleCmd(m) {
    if (!m || m.type !== 'cmd' || seen.has(m.nonce)) return;
    seen.add(m.nonce);
    if (m.cmd === 'next') Deck.next();
    else if (m.cmd === 'prev') Deck.prev();
    else if (m.cmd === 'goto') Deck.goto(m.idx, m.step || 0);
    else if (m.cmd === 'reset') { Deck.t0 = Deck.idx >= 1 ? Date.now() : null; publish(); }
    else if (m.cmd === 'hello') publish();
    else if (m.cmd === 'black') stage.classList.toggle('black');
  }
  function initSync() {
    try { bc = new BroadcastChannel('gamengen-deck'); bc.onmessage = e => handleCmd(e.data); } catch (e) { bc = null; }
    addEventListener('storage', e => {
      if (e.key === 'gg-cmd' && e.newValue) { try { handleCmd(JSON.parse(e.newValue)); } catch (err) {} }
    });
  }

  function afterChange() {
    updateHud();
    const h = '#' + Deck.idx + (Deck.step ? '.' + Deck.step : '');
    if (location.hash !== h) { try { history.replaceState(null, '', h); } catch (e) { } }
    publish();
    FX.$$(document, '.ov-c').forEach((c, k) => c.classList.toggle('cur', k === Deck.idx));
  }

  /* ---------------- overlays ---------------- */
  function buildOverview() {
    const g = $('.ov-grid');
    slides.forEach((s, k) => {
      const id = s.dataset.id, note = (window.DECK_NOTES || {})[id] || {};
      const b = document.createElement('button');
      b.className = 'ov-c';
      b.innerHTML = `<b>${id === 'qa' ? 'Q&A' : FX.pad(k, 2)}</b><span>${note.title || id}</span><small>${note.budget ? note.budget + ' s' : ''}</small>`;
      b.onclick = () => { toggle('#overview', false); Deck.goto(k, 0); };
      g.appendChild(b);
    });
  }
  function toggle(sel, on) {
    const el = $(sel);
    el.classList.toggle('on', on == null ? !el.classList.contains('on') : on);
  }
  // 3D runs unless the presenter chose lite mode or this PC can't do WebGL.
  // Missing WebGL only swaps the 3D scenes for still images; every other effect stays.
  Deck.use3D = () => !Deck.lite && Deck.gl && !!window.THREE;
  function syncMode() {
    document.body.classList.toggle('lite', Deck.lite);
    document.body.classList.toggle('no3d', !Deck.use3D());
    $('.lite-state').textContent = '저사양 모드: ' + (Deck.lite ? '켜짐 (3D·무거운 효과 끔)' : '꺼짐') +
      (Deck.gl ? '' : ' · 이 PC는 WebGL 사용 불가: 3D는 정지 이미지로 표시');
  }
  function reenter() {   // re-enter current slide so it can switch renderers
    const el = Deck.cur(), c = ctrlOf(el);
    try { c && c.leave && c.leave(el); c && c.enter && c.enter(el, Deck.step, 1); } catch (e) { console.error(e); }
  }
  Deck.setLite = function (on) {
    Deck.lite = on;
    try { localStorage.setItem('gg-lite', on ? '1' : '0'); } catch (e) {}
    syncMode(); reenter();
  };
  // A 3D slide calls this when its WebGL renderer can't start or its context is lost.
  Deck.glFail = function (now) {
    if (!Deck.gl) return;
    console.warn('WebGL failed: 3D slides fall back to still images');
    Deck.gl = false; syncMode();
    if (now) reenter();
  };
  function fullscreen() {
    const d = document, de = d.documentElement;
    if (d.fullscreenElement || d.webkitFullscreenElement) (d.exitFullscreen || d.webkitExitFullscreen).call(d);
    else (de.requestFullscreen || de.webkitRequestFullscreen).call(de);
  }

  /* ---------------- input ---------------- */
  let numBuf = '', numTimer = 0;
  function initKeys() {
    addEventListener('keydown', e => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key;
      const helpOn = $('#help').classList.contains('on'), ovOn = $('#overview').classList.contains('on');
      if (helpOn || ovOn) {
        if (k === 'Escape' || k === 'o' || k === 'O' || k === '?' || k === 'h') { toggle('#help', false); toggle('#overview', false); e.preventDefault(); }
        return;
      }
      const el = Deck.cur(), c = ctrlOf(el);
      if (c && c.key && c.key(e, el) === true) { e.preventDefault(); return; }
      if (/^[0-9]$/.test(k)) {
        numBuf += k; clearTimeout(numTimer); numTimer = setTimeout(() => numBuf = '', 1600); return;
      }
      switch (k) {
        case 'Enter':
          if (numBuf) { Deck.goto(+numBuf, 0); numBuf = ''; } else Deck.next();
          break;
        case 'ArrowRight': case 'ArrowDown': case 'PageDown': case ' ': case 'n': Deck.next(); break;
        case 'ArrowLeft': case 'ArrowUp': case 'PageUp': case 'Backspace': Deck.prev(); break;
        case 'Home': Deck.goto(0, 0); break;
        case 'End': Deck.goto(MAIN, 0); break;
        case 'o': case 'O': toggle('#overview'); break;
        case 'f': case 'F': fullscreen(); break;
        case 'b': case 'B': case '.': stage.classList.toggle('black'); break;
        case 'g': case 'G': if (el.querySelector('.paper')) el.classList.toggle('show-paper'); break;
        case 'p': case 'P': window.open('presenter.html', 'gg-presenter', 'width=1400,height=860'); break;
        case 'm': case 'M': Deck.setLite(!Deck.lite); toggle('#help', true); setTimeout(() => toggle('#help', false), 1400); break;
        case 'q': case 'Q': Deck.goto(slides.length - 1, 0); break;
        case 'r': case 'R': Deck.t0 = Deck.idx >= 1 ? Date.now() : null; publish(); break;
        case '?': case 'h': case 'H': toggle('#help'); break;
        case 'Escape': el.classList.remove('show-paper'); stage.classList.remove('black'); break;
        default: return;
      }
      e.preventDefault();
    });
    // touch swipe
    let sx = null;
    addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
    addEventListener('touchend', e => {
      if (sx == null) return;
      const dx = e.changedTouches[0].clientX - sx; sx = null;
      if (Math.abs(dx) > 60) (dx < 0 ? Deck.next : Deck.prev)();
    });
  }

  /* Map a pointer event to stage coordinates (1920×1080). */
  Deck.toStage = function (ev) {
    const r = stage.getBoundingClientRect();
    return { x: (ev.clientX - r.left) / r.width * W, y: (ev.clientY - r.top) / r.height * H };
  };

  /* ---------------- start ---------------- */
  Deck.start = function () {
    stage = $('#stage');
    slides = Array.from(document.querySelectorAll('.slide'));
    Deck.slides = slides;
    let lite = /[?&]lite/.test(location.search);
    try { if (localStorage.getItem('gg-lite') === '1') lite = true; } catch (e) {}
    Deck.lite = lite; Deck.gl = FX.hasGL;
    syncMode();

    fit(); addEventListener('resize', fit);
    fxNoise = $('#fx-noise'); fxCtx = fxNoise.getContext('2d');
    noiseCvs = FX.noiseCanvases(540, 310, 3);

    const cfg = window.DECK_CONFIG || {};
    if (cfg.presenters) $('#tc-presenter').textContent = cfg.presenters.map(p => p.filter(Boolean).join(' ')).join(' · ');

    initHud(); initSync(); initKeys(); buildOverview();
    slides.forEach(el => { const c = ctrlOf(el); try { c && c.init && c.init(el); } catch (e) { console.error(e); } });

    const m = /^#(\d+)(?:\.(\d+))?/.exec(location.hash);
    Deck.goto(m ? +m[1] : 0, m && m[2] ? +m[2] : 0, { instant: true });
    addEventListener('hashchange', () => {
      const mm = /^#(\d+)(?:\.(\d+))?/.exec(location.hash);
      if (mm && (+mm[1] !== Deck.idx || +(mm[2] || 0) !== Deck.step)) Deck.goto(+mm[1], +(mm[2] || 0));
    });
  };
})();
