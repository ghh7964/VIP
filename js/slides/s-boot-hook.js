/* 0 · Boot  /  1 · Hook */
Deck.register('boot', {
  enter() { Deck.hudShow(false); }
});

Deck.register('hook', (function () {
  const bag = FX.bag();
  let video, amb, actx;
  return {
    init(el) {
      video = el.querySelector('.hook-video');
      amb = el.querySelector('.hook-ambient');
      actx = amb.getContext('2d');
    },
    enter(el, step, dir) {
      Deck.letterbox(step < 2);
      if (dir > 0 && step === 0) { try { video.currentTime = 0; } catch (e) {} }
      const p = video.play(); if (p && p.catch) p.catch(() => {});
      // ambient glow = the live video, blurred (drawImage only; no pixel reads)
      let acc = 0;
      bag.loop(dt => {
        acc += dt; if (acc < 1 / 15) return; acc = 0;
        if (video.readyState >= 2) { try { actx.drawImage(video, 0, 0, 48, 27); } catch (e) {} }
      });
    },
    step(el, n) { Deck.letterbox(n < 2); },
    leave() { bag.clear(); video.pause(); }
  };
})());
