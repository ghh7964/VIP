/* 6 · Auto-regressive drift — live error-accumulation illustration, photocopy stack, glitch-out.
   Canvas ops are drawImage/compositing only (no pixel reads, no ctx.filter → works in Safari & file://). */
Deck.register('drift', (function () {
  const bag = FX.bag();
  const N = 40;
  let sim, sctx, slots, simN, orig, k = 0, noise, sheets = [];

  function reset() {
    k = 0;
    if (!orig) return;
    sctx.globalAlpha = 1;
    sctx.drawImage(orig[0], 0, 0, 320, 256);
    slots.forEach(c => c.getContext('2d').drawImage(orig[0], 0, 0, 160, 128));
    simN.textContent = '0';
  }

  // Each step crossfades along the paper's real rollout (Fig. 4 top: frames 0,10,20,30,40)
  // with a little jitter and sensor noise, so the degradation looks like the paper, not a filter.
  function iterate() {
    if (!orig) return;
    k++;
    const s = k / N, p = Math.min(3.999, s * 4), a = Math.floor(p), f = p - a;
    const jx = FX.rand(-1.2, 1.2) * (0.3 + s), jy = FX.rand(-0.8, 0.8) * (0.3 + s);
    sctx.globalAlpha = 1;
    sctx.drawImage(orig[a], jx, jy, 320, 256);
    sctx.globalAlpha = f;
    sctx.drawImage(orig[a + 1], jx, jy, 320, 256);
    sctx.globalAlpha = 0.03 + 0.07 * s;
    sctx.drawImage(noise[(Math.random() * noise.length) | 0], 0, 0, 320, 256);
    sctx.globalAlpha = 1;
    // shift history (newest in front)
    for (let i = 0; i < slots.length - 1; i++) slots[i].getContext('2d').drawImage(slots[i + 1], 0, 0);
    slots[slots.length - 1].getContext('2d').drawImage(sim, 0, 0, 160, 128);
    simN.textContent = k;
  }
  const integrityAt = kk => Math.max(6, Math.round(100 * (1 - Math.pow(kk / N, 0.85))));

  function showSheets(on, instant) {
    sheets.forEach((sh, i) => {
      sh.style.transitionDelay = instant || !on ? '0s' : (i * 0.18) + 's';
      sh.style.opacity = on ? 1 : 0;
      sh.style.transform = on
        ? `translateX(${i * 212}px) translateZ(${-i * 18}px) rotateY(-14deg) rotateZ(${(i % 2 ? 1.6 : -1.4)}deg)`
        : `translateX(${i * 212}px) translateY(80px) rotateY(-14deg)`;
    });
  }

  function glitchOut(el, instant) {
    if (instant) { Deck.letterbox(true); Deck.hudShow(false); return; }
    el.classList.add('glitching');
    Deck.setIntegrity(0);
    bag.timeout(() => { el.classList.remove('glitching'); Deck.letterbox(true); Deck.hudShow(false); }, 950);
  }

  return {
    init(el) {
      sim = el.querySelector('.sim'); sctx = sim.getContext('2d');
      slots = FX.$$(el, '.lane-play .hs');
      simN = el.querySelector('.sim-n');
      noise = FX.noiseCanvases(320, 256, 3);
      Promise.all([0, 1, 2, 3, 4].map(i => FX.loadImg(`assets/fig/fig4_no_${i}.jpg`))).then(ims => { orig = ims; reset(); });
      const mono = FX.noiseCanvases(160, 128, 3, true);
      // photocopies
      const wrap = el.querySelector('.copies');
      for (let i = 0; i < 6; i++) {
        const sh = document.createElement('div');
        sh.className = 'sheet';
        const f = `grayscale(${i * 0.2}) brightness(${1 + i * 0.14}) contrast(${1 + i * 0.18}) blur(${i * 0.55}px)`;
        sh.innerHTML = `<div class="sh-img"><img src="assets/img/hero2.jpg" alt="" style="filter:${f}"><canvas class="sh-n" width="160" height="128" style="opacity:${i * 0.055}"></canvas></div><b>복사 ${i + 1}</b>`;
        sh.querySelector('canvas').getContext('2d').drawImage(mono[i % 3], 0, 0, 160, 128);
        sh.style.zIndex = 10 - i;
        wrap.appendChild(sh); sheets.push(sh);
      }
      showSheets(false, true);
    },
    enter(el, step) {
      reset();
      if (step >= 1) { for (let i = 0; i < N; i++) iterate(); Deck.setIntegrity(integrityAt(N), true); }
      showSheets(step >= 2, true);
      if (step >= 3) glitchOut(el, true);
    },
    step(el, n, dir) {
      if (n === 1 && dir > 0) {
        reset(); Deck.setIntegrity(100, true);
        let i = 0;
        bag.interval(() => {
          if (i >= N) return;
          iterate(); i++;
          Deck.setIntegrity(integrityAt(i), true);
        }, 170);
      }
      if (n === 0) { reset(); Deck.setIntegrity(100); }
      showSheets(n >= 2, false);
      if (n === 3 && dir > 0) glitchOut(el, false);
      if (n === 2 && dir < 0) { Deck.letterbox(false); Deck.hudShow(true); Deck.setIntegrity(integrityAt(N), true); }
    },
    leave(el) { bag.clear(); el.classList.remove('glitching'); }
  };
})());
