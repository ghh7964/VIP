/* 7 · Noise augmentation — noise dial (α ∈ [0, 0.7], 10 buckets), callback diptych, Fig. 4 + Fig. 7 evidence */
Deck.register('fix', (function () {
  const bag = FX.bag();
  const AMAX = 0.7, NB = 10;
  // traced from paper Fig. 7 (right): PSNR per auto-regressive step 0..63
  const PSNR_AUG = [25.5,23.79,22.25,21.4,20.88,20.56,20.24,19.93,19.64,19.41,19.24,19.02,18.93,18.68,18.54,18.48,18.54,18.36,18.28,18.15,18.09,17.98,17.9,17.81,17.75,17.7,17.58,17.42,17.34,17.19,17.18,17.22,17.17,17.05,17.0,16.96,16.96,16.96,16.89,16.8,16.82,16.74,16.78,16.7,16.66,16.61,16.67,16.62,16.6,16.57,16.57,16.53,16.48,16.44,16.52,16.53,16.51,16.48,16.49,16.48,16.44,16.4,16.35,16.32];
  const PSNR_NO = [25.45,23.46,21.68,20.58,19.72,19.03,18.21,17.48,16.65,16.01,15.45,14.84,14.42,13.91,13.47,13.1,12.85,12.54,12.33,12.11,11.86,11.65,11.58,11.48,11.3,11.24,11.14,11.07,10.95,10.89,10.82,10.8,10.76,10.76,10.71,10.67,10.61,10.54,10.48,10.42,10.41,10.37,10.35,10.32,10.36,10.37,10.44,10.37,10.41,10.45,10.46,10.5,10.53,10.56,10.59,10.59,10.55,10.59,10.56,10.55,10.59,10.63,10.63,10.56];
  let noise, cvs, needle, bks, aEl, bEl, alpha = 0, c1, c1ctx, c2ctx, hero, hist = [], lines = [];

  function setAlpha(a) {
    alpha = a;
    const b = Math.min(NB, Math.floor(a / AMAX * NB) + 1);
    needle.style.transform = `rotate(${-90 + a / AMAX * 180}deg)`;
    bks.forEach((p, i) => p.classList.toggle('on', i === b - 1));
    aEl.textContent = a.toFixed(2); bEl.textContent = b;
  }
  function paintNoise() {
    cvs.forEach(c => {
      const x = c.getContext('2d');
      x.globalAlpha = 1;
      x.drawImage(noise[(Math.random() * noise.length) | 0], (Math.random() * 60) | 0, (Math.random() * 40) | 0, 160, 128, 0, 0, 160, 128);
      c.style.opacity = Math.min(0.92, Math.sqrt(alpha / AMAX) * 0.9);
    });
  }
  function buildDial(el) {
    const g = el.querySelector('.buckets');
    const cx = 210, cy = 220, r = 165;
    for (let i = 0; i < NB; i++) {
      const a0 = Math.PI + i / NB * Math.PI + 0.02, a1 = Math.PI + (i + 1) / NB * Math.PI - 0.02;
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p.setAttribute('d', `M${cx + r * Math.cos(a0)},${cy + r * Math.sin(a0)} A${r},${r} 0 0 1 ${cx + r * Math.cos(a1)},${cy + r * Math.sin(a1)}`);
      p.setAttribute('class', 'bk');
      g.appendChild(p);
    }
    bks = FX.$$(g, '.bk');
  }
  function buildChart(el) {
    const svg = el.querySelector('.psnr');
    const X0 = 70, X1 = 730, Y0 = 440, Y1 = 44, ymin = 10, ymax = 26;
    const X = i => X0 + i / 63 * (X1 - X0), Y = v => Y0 - (v - ymin) / (ymax - ymin) * (Y0 - Y1);
    let h = '';
    for (let v = 10; v <= 26; v += 4) h += `<line class="grid" x1="${X0}" x2="${X1}" y1="${Y(v)}" y2="${Y(v)}"/><text x="${X0 - 12}" y="${Y(v) + 5}" text-anchor="end">${v}</text>`;
    for (let i = 0; i <= 60; i += 20) h += `<text x="${X(i)}" y="${Y0 + 28}" text-anchor="middle">${i}</text>`;
    h += `<line class="ax" x1="${X0}" x2="${X1}" y1="${Y0}" y2="${Y0}"/><line class="ax" x1="${X0}" x2="${X0}" y1="${Y0}" y2="${Y1}"/>`;
    h += `<text class="t-lab" x="${(X0 + X1) / 2}" y="${Y0 + 50}" text-anchor="middle">생성한 프레임 수 →</text>`;
    h += `<text class="t-lab" x="16" y="${Y1 - 8}">PSNR (dB)</text>`;
    const pts = arr => arr.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
    h += `<polyline class="ln ln-no" points="${pts(PSNR_NO)}"/><polyline class="ln ln-aug" points="${pts(PSNR_AUG)}"/>`;
    h += `<text class="lg" x="${X1 - 4}" y="${Y(16.3) - 30}" text-anchor="end" fill="#5ef2ff">노이즈 증강 있음 · 16.3</text>`;
    h += `<text class="lg" x="${X1 - 4}" y="${Y(10.6) - 30}" text-anchor="end" fill="#ff4a1c">없음 · 10.6</text>`;
    svg.innerHTML = h;
    lines = FX.$$(svg, '.ln');
    lines.forEach(l => { const L = l.getTotalLength(); l.style.strokeDasharray = L; l.style.strokeDashoffset = L; });
  }
  function drawLines(on, instant) {
    lines.forEach((l, i) => {
      l.style.transition = instant ? 'none' : `stroke-dashoffset 2.2s cubic-bezier(.3,.7,.2,1) ${0.5 + i * 0.5}s`;
      l.style.strokeDashoffset = on ? 0 : l.style.strokeDasharray;
    });
  }
  // diptych: left = week-5 denoising loop, right = noisy past → clean next frame
  function drawDip(t) {
    if (!hero) return;
    const u = t % 3.4, k = FX.clamp(u / 2.4, 0, 1);
    FX.drawNoisy(c1ctx, hero, noise[(Math.random() * noise.length) | 0], Math.pow(Math.sin(k * Math.PI / 2), 2), 320, 256);
    const x = c2ctx;
    x.fillStyle = '#111114'; x.fillRect(0, 0, 320, 256);
    const nz = 0.55 + 0.25 * Math.sin(t * 2.2);
    hist.forEach((im, i) => {
      const px = 10 + i * 16, py = 20 + i * 34, w = 130, h = 104;
      x.globalAlpha = 1; x.drawImage(im, px, py, w, h);
      x.globalAlpha = nz; x.drawImage(noise[(Math.random() * noise.length) | 0], 0, 0, 130, 104, px, py, w, h);
      x.globalAlpha = 1; x.strokeStyle = '#ff4a1c'; x.lineWidth = 2; x.strokeRect(px, py, w, h);
    });
    x.fillStyle = '#6b675f'; x.fillRect(190, 126, 18, 3);
    x.beginPath(); x.moveTo(214, 127.5); x.lineTo(204, 121); x.lineTo(204, 134); x.fill();
    if (hist[3]) { x.drawImage(hist[3], 218, 80, 96, 77); }
    x.strokeStyle = '#5ef2ff'; x.lineWidth = 3; x.strokeRect(218, 80, 96, 77);
  }

  return {
    init(el) {
      noise = FX.noiseCanvases(220, 168, 4);
      cvs = FX.$$(el, '.na-f canvas');
      needle = el.querySelector('.needle');
      aEl = el.querySelector('.na-a'); bEl = el.querySelector('.na-b');
      buildDial(el); buildChart(el); setAlpha(0);
      c1ctx = el.querySelector('.dip-c1').getContext('2d');
      c2ctx = el.querySelector('.dip-c2').getContext('2d');
      FX.loadImg(window.GG_HERO).then(im => hero = im);
      Promise.all([0, 1, 2, 4].map(i => FX.loadImg(`assets/fig/fig4_aug_${i}.jpg`))).then(a => hist = a);
    },
    enter(el, step) {
      Deck.setIntegrity(step >= 3 ? 100 : 8, true);
      drawLines(step >= 4, true);
      // training loop: a fresh random noise level every example
      bag.interval(() => setAlpha(Math.random() * AMAX), 1150);
      bag.timeout(() => setAlpha(0.42), 300);
      let acc = 0;
      bag.loop((dt, t) => {
        acc += dt; if (acc < 1 / 12) return; acc = 0;
        if (Deck.step < 2) paintNoise();
        else if (Deck.step === 2) drawDip(t);
      });
    },
    step(el, n, dir) {
      if (n === 3 && dir > 0) bag.timeout(() => Deck.setIntegrity(100), 700);
      if (n < 3) Deck.setIntegrity(8, true);
      drawLines(n >= 4, false);
    },
    leave() { bag.clear(); }
  };
})());
