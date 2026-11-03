/* 3 · Diffusion recap — interactive noise scrubber, latent card */
Deck.register('diffusion', (function () {
  const bag = FX.bag();
  let ctx, img, noise, tEl, thumb, fill, scrub, t = 0, anim = null, ready = false;
  const abar = t => Math.pow(Math.cos(t * Math.PI / 2), 2) * 0.9999; // cosine-ish schedule, t ∈ [0,1]

  function render() {
    if (!ready) return;
    FX.drawNoisy(ctx, img, noise[(Math.random() * noise.length) | 0], abar(t), 640, 512);
    tEl.textContent = Math.round(t * 1000);
    thumb.style.left = (t * 100) + '%';
  }
  function animateTo(target, dur, stepwise) {
    if (anim) anim.cancel();
    const from = t;
    anim = FX.tween(dur, (k, raw) => {
      const kk = stepwise ? Math.round(raw * stepwise) / stepwise : k;
      t = FX.lerp(from, target, kk);
    }, stepwise ? (x => x) : FX.easeIO);
  }

  return {
    init(el) {
      ctx = el.querySelector('.dn-canvas').getContext('2d');
      tEl = el.querySelector('.dn-t b');
      thumb = el.querySelector('.dn-thumb');
      scrub = el.querySelector('.dn-scrub');
      noise = FX.noiseCanvases(680, 552, 3);
      FX.loadImg(window.GG_HERO).then(im => {
        img = im; ready = true; render();
        const lc = el.querySelector('.lat-canvas').getContext('2d');
        lc.imageSmoothingEnabled = true;
        lc.drawImage(im, 0, 0, 40, 32);
      });
      const setFromEvent = ev => {
        const r = scrub.querySelector('.dn-track').getBoundingClientRect();
        if (anim) { anim.cancel(); anim = null; }
        t = FX.clamp((ev.clientX - r.left) / r.width, 0, 1);
      };
      scrub.addEventListener('pointerdown', ev => {
        scrub.setPointerCapture(ev.pointerId); setFromEvent(ev);
        const mv = e => setFromEvent(e);
        const up = () => { scrub.removeEventListener('pointermove', mv); scrub.removeEventListener('pointerup', up); };
        scrub.addEventListener('pointermove', mv); scrub.addEventListener('pointerup', up);
      });
    },
    enter(el, step) {
      if (step === 0) { t = 0; bag.timeout(() => animateTo(1, 2400), 600); }  // forward process: clean → noise
      else t = 0;
      let acc = 0;
      bag.loop(dt => { acc += dt; if (acc > 1 / 14) { acc = 0; render(); } });
    },
    step(el, n, dir, prev) {
      if (n === 1 && dir > 0) { t = 1; animateTo(0, 2600, 10); }   // generation: denoise in 10 visible steps
      if (n === 0 && dir < 0) animateTo(1, 800);
    },
    leave() { bag.clear(); if (anim) anim.cancel(); anim = null; }
  };
})());
