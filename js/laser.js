/* Laser pointer for the slide window: the mouse becomes a red laser dot with a short fading trail.
   Hides after a moment of stillness, while blacked out (B), or when the mouse leaves. L toggles it.
   Pointer-events pass straight through, so sliders, drag handles and cards still work. */
(function () {
  const KEY = 'gg-laser', TRAIL = 220, IDLE = 2500;
  let on = true;
  try { on = localStorage.getItem(KEY) !== '0'; } catch (e) {}

  const dot = document.createElement('div'); dot.id = 'laser';
  const cv = document.createElement('canvas'); cv.id = 'laser-trail';
  document.body.append(cv, dot);
  const cx = cv.getContext('2d');
  let dpr = 1, pts = [], last = 0, raf = 0, visible = false;
  function size() { dpr = devicePixelRatio || 1; cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; }
  size(); addEventListener('resize', size);

  function hide() { visible = false; dot.classList.remove('on'); pts = []; if (!raf) raf = requestAnimationFrame(draw); }
  function apply() { document.documentElement.classList.toggle('laser-on', on); if (!on) hide(); }
  const blacked = () => { const s = document.getElementById('stage'); return s && s.classList.contains('black'); };

  addEventListener('pointermove', e => {
    if (!on || e.pointerType === 'touch') return;
    if (blacked()) { if (visible) hide(); return; }
    const now = performance.now(); last = now;
    dot.style.transform = `translate(${e.clientX}px,${e.clientY}px)`;
    if (!visible) { visible = true; dot.classList.add('on'); pts = []; }
    pts.push({ x: e.clientX, y: e.clientY, t: now });
    if (!raf) raf = requestAnimationFrame(draw);
  }, { passive: true });
  document.addEventListener('mouseout', e => { if (!e.relatedTarget) hide(); });

  function draw(now) {
    raf = 0;
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx.clearRect(0, 0, innerWidth, innerHeight);
    pts = pts.filter(p => now - p.t < TRAIL);
    if (visible && (now - last > IDLE || blacked())) hide();
    cx.lineCap = 'round';
    for (let i = 1; i < pts.length; i++) {
      const a = 1 - (now - pts[i].t) / TRAIL;
      cx.strokeStyle = `rgba(255,42,30,${(a * 0.55).toFixed(3)})`;
      cx.lineWidth = 2 + 6 * a;
      cx.beginPath(); cx.moveTo(pts[i - 1].x, pts[i - 1].y); cx.lineTo(pts[i].x, pts[i].y); cx.stroke();
    }
    if (visible || pts.length) raf = requestAnimationFrame(draw);
  }

  addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey || (e.key !== 'l' && e.key !== 'L')) return;
    on = !on; apply();
    try { localStorage.setItem(KEY, on ? '1' : '0'); } catch (err) {}
  });
  apply();
})();
