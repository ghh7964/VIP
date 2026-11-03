/* 9 · Results — PSNR count-up, audience poll (Fig. 5), human-eval bars vs. a 50% chance line */
Deck.register('results', (function () {
  const bag = FX.bag();
  const DATA = [
    { v: 58, l1: '1.6초 영상', l2: '' },
    { v: 60, l1: '3.2초 영상', l2: '' },
    { v: 50, l1: '3초 영상', l2: '5~10분 생성한 뒤' }
  ];
  let pv, bars = [], vals = [], chance, chanceL;
  const X0 = 110, X1 = 900, Y0 = 470, Y1 = 40;
  const Y = v => Y0 - v / 100 * (Y0 - Y1);

  function build(el) {
    const svg = el.querySelector('.hu-chart');
    let h = '';
    [0, 25, 75, 100].forEach(v => { h += `<line x1="${X0}" x2="${X1}" y1="${Y(v)}" y2="${Y(v)}" stroke="rgba(255,255,255,.07)"/><text class="ax-t" x="${X0 - 14}" y="${Y(v) + 6}" text-anchor="end">${v}%</text>`; });
    h += `<line x1="${X0}" x2="${X1}" y1="${Y0}" y2="${Y0}" stroke="#3a3a42" stroke-width="2"/>`;
    DATA.forEach((d, i) => {
      const cx = X0 + 150 + i * 270, w = 170;
      h += `<rect class="bar" x="${cx - w / 2}" y="${Y(d.v)}" width="${w}" height="${Y0 - Y(d.v)}" rx="6"/>`;
      h += `<text class="v" x="${cx}" y="${Y(d.v) - 18}" text-anchor="middle">0%</text>`;
      h += `<text x="${cx}" y="${Y0 + 34}" text-anchor="middle">${d.l1}</text>`;
      if (d.l2) h += `<text x="${cx}" y="${Y0 + 60}" text-anchor="middle" fill="#6b675f">${d.l2}</text>`;
    });
    h += `<line class="chance" x1="${X0}" x2="${X1}" y1="${Y(50)}" y2="${Y(50)}"/>`;
    h += `<text class="chance-l" x="${X1 + 18}" y="${Y(50) - 6}"><tspan>찍기</tspan><tspan x="${X1 + 18}" dy="28">수준</tspan></text>`;
    h += `<text class="ax-t" x="${X0 - 14}" y="${Y(50) + 6}" text-anchor="end" style="fill:#ece6da">50%</text>`;
    svg.innerHTML = h;
    bars = FX.$$(svg, '.bar'); vals = FX.$$(svg, '.v');
    chance = svg.querySelector('.chance'); chanceL = svg.querySelector('.chance-l');
    bars.forEach(b => { b.style.transformBox = 'fill-box'; b.style.transformOrigin = '50% 100%'; });
  }
  function show(on, instant) {
    const L = X1 - X0;
    chance.style.strokeDasharray = on ? '12 10' : `0 ${L}`;
    chance.style.transition = 'none';
    chanceL.style.transition = instant ? 'none' : 'opacity .5s .7s';
    chanceL.style.opacity = on ? 1 : 0;
    if (on && !instant) {
      // draw the chance line first
      chance.style.strokeDasharray = `0 ${L}`;
      bag.tween(800, k => { chance.style.strokeDasharray = k < 1 ? `${L * k} ${L}` : '12 10'; });
    }
    bars.forEach((b, i) => {
      b.style.transition = instant ? 'none' : `transform 1s cubic-bezier(.2,.8,.2,1) ${1.1 + i * 0.35}s`;
      b.style.transform = on ? 'scaleY(1)' : 'scaleY(0)';
      const target = DATA[i].v;
      if (!on) vals[i].textContent = '';
      else if (instant) vals[i].textContent = target + '%';
      else { vals[i].textContent = ''; bag.timeout(() => bag.tween(1000, k => { vals[i].textContent = Math.round(target * k) + '%'; }), 1100 + i * 350); }
    });
  }
  return {
    init(el) { pv = el.querySelector('.pb-v'); build(el); show(false, true); },
    enter(el, step) {
      if (step === 0) bag.tween(1300, k => { pv.textContent = (29.4 * k).toFixed(1); });
      else pv.textContent = '29.4';
      show(step >= 3, true);
    },
    step(el, n, dir) { show(n >= 3, dir < 0); },
    leave() { bag.clear(); }
  };
})());
