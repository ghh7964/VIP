/* 2 · What does a game engine do? — pulse around the loop, Rules+Render shatter into one network */
Deck.register('engine', (function () {
  const bag = FX.bag();
  let path, dot, len;

  function shatter(el) {
    FX.$$(el, '.shard-src').forEach(src => {
      const x = src.offsetLeft, y = src.offsetTop, w = src.offsetWidth, h = src.offsetHeight;
      const cols = 5, rows = 3;
      for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
        const s = document.createElement('div');
        s.className = 'shard';
        Object.assign(s.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' });
        const j = () => FX.rand(-6, 6);
        const x0 = c / cols * 100, x1 = (c + 1) / cols * 100, y0 = r / rows * 100, y1 = (r + 1) / rows * 100;
        s.style.clipPath = `polygon(${x0 + j()}% ${y0 + j()}%, ${x1 + j()}% ${y0 + j()}%, ${x1 + j()}% ${y1 + j()}%, ${x0 + j()}% ${y1 + j()}%)`;
        el.appendChild(s);
        const dx = (c - cols / 2) * FX.rand(40, 90), dy = FX.rand(60, 260) * (r - 0.6);
        s.animate([
          { transform: 'translate(0,0) rotate(0)', opacity: 1 },
          { transform: `translate(${dx}px,${dy}px) rotate(${FX.rand(-70, 70)}deg) scale(.6)`, opacity: 0 }
        ], { duration: FX.rand(700, 1100), easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'forwards' })
          .finished.then(() => s.remove());
      }
    });
  }

  return {
    init(el) {
      path = el.querySelector('#eng-pulse-path');
      dot = el.querySelector('.eng-pulse');
      len = path.getTotalLength();
    },
    enter(el) {
      let d = 0;
      bag.loop(dt => {
        d = (d + dt * 560) % len;
        const p = path.getPointAtLength(d);
        dot.setAttribute('cx', p.x); dot.setAttribute('cy', p.y);
      });
    },
    step(el, n, dir, prev) {
      if (n === 1 && prev === 0) shatter(el);
    },
    leave(el) { bag.clear(); FX.$$(el, '.shard').forEach(s => s.remove()); }
  };
})());
