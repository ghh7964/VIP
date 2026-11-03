/* 4 · Data collection — a wall of streaming (frame, action) tiles + 70M counter */
Deck.register('data', (function () {
  const bag = FX.bag();
  const TW = 96, TH = 77, COLS = 20, ROWS = 14;
  const ACTS = ['↑', '↓', '←', '→', 'FIRE', 'USE', '↑ FIRE', '→ ↑'];
  let ctx, frames = [], ready = false, counter, flashes = [];

  function drawTile(c, r, fi, flash) {
    const x = c * TW, y = r * TH;
    ctx.globalAlpha = 1;
    ctx.drawImage(frames[fi], x, y, TW - 2, TH - 2);
    if (flash > 0) {
      ctx.globalAlpha = flash * 0.55; ctx.fillStyle = '#ff4a1c'; ctx.fillRect(x, y, TW - 2, TH - 2);
      ctx.globalAlpha = Math.min(1, flash * 1.4);
      ctx.fillStyle = '#0a0a0b'; ctx.fillRect(x + 4, y + TH - 26, 56, 20);
      ctx.fillStyle = '#ece6da'; ctx.font = '600 13px "JetBrains Mono", monospace';
      ctx.fillText(flashes.find(f => f.c === c && f.r === r)?.a || '', x + 8, y + TH - 11);
    }
    ctx.globalAlpha = 1;
  }

  return {
    init(el) {
      ctx = el.querySelector('.tile-wall').getContext('2d');
      counter = el.querySelector('.counter-n');
      Promise.all((window.GG_FRAMES || []).map(FX.loadImg)).then(ims => {
        frames = ims; ready = true;
        ctx.fillStyle = '#0a0a0b'; ctx.fillRect(0, 0, 1920, 1080);
        for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) drawTile(c, r, (Math.random() * frames.length) | 0, 0);
      });
    },
    enter(el, step) {
      counter.textContent = step >= 1 ? '70,000,000' : '0';
      let acc = 0;
      bag.loop(dt => {
        if (!ready) return;
        acc += dt;
        const every = Deck.lite ? 0.25 : 0.05;
        while (acc > every) {
          acc -= every;
          const c = (Math.random() * COLS) | 0, r = (Math.random() * ROWS) | 0;
          const f = { c, r, fi: (Math.random() * frames.length) | 0, life: 1, a: ACTS[(Math.random() * ACTS.length) | 0] };
          flashes = flashes.filter(o => !(o.c === c && o.r === r));
          flashes.push(f);
        }
        flashes.forEach(f => { f.life -= dt * 1.4; drawTile(f.c, f.r, f.fi, Math.max(0, f.life)); });
        flashes = flashes.filter(f => f.life > 0);
      });
    },
    step(el, n, dir) {
      if (n === 1 && dir > 0) {
        bag.tween(2400, k => { counter.textContent = FX.fmt(k * 70e6); }, t => 1 - Math.pow(1 - t, 4));
      }
      if (n === 0) counter.textContent = '0';
    },
    leave() { bag.clear(); }
  };
})());
