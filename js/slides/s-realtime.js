/* 8 · Real-time — draggable decoder wipe (Fig. 12) + 4-step budget + live 20 FPS monitor */
Deck.register('realtime', (function () {
  const bag = FX.bag();
  let wipe, wa, handle, video, pos = 0.5, dragging = false;
  const set = p => {
    pos = FX.clamp(p, 0, 1);
    wa.style.clipPath = `inset(0 ${((1 - pos) * 100).toFixed(2)}% 0 0)`;
    handle.style.left = (pos * 100) + '%';
  };
  function sweep() {
    const keys = [[0.5, 0.1], [0.1, 0.9], [0.9, 0.5]];
    let chain = Promise.resolve();
    keys.forEach(([a, b]) => { chain = chain.then(() => dragging ? null : bag.tween(1100, k => { if (!dragging) set(FX.lerp(a, b, k)); }, FX.easeIO)); });
  }
  return {
    init(el) {
      wipe = el.querySelector('.wipe'); wa = el.querySelector('.w-a'); handle = el.querySelector('.w-handle');
      video = el.querySelector('.rt-video');
      const from = ev => { const r = wipe.getBoundingClientRect(); set((ev.clientX - r.left) / r.width); };
      wipe.addEventListener('pointerdown', ev => {
        dragging = true; wipe.setPointerCapture(ev.pointerId); from(ev);
        const mv = e => from(e);
        const up = () => { wipe.removeEventListener('pointermove', mv); wipe.removeEventListener('pointerup', up); };
        wipe.addEventListener('pointermove', mv); wipe.addEventListener('pointerup', up);
      });
      set(0.5);
    },
    enter(el, step) {
      dragging = false; set(0.5);
      bag.timeout(sweep, 700);
      if (step >= 1) { const p = video.play(); if (p && p.catch) p.catch(() => {}); }
    },
    step(el, n) {
      if (n >= 1) { const p = video.play(); if (p && p.catch) p.catch(() => {}); }
      else video.pause();
    },
    leave() { bag.clear(); video.pause(); }
  };
})());
