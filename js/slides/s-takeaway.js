/* 11 · Takeaway — an endless wireframe world that "denoises" into shape as it approaches. */
Deck.register('takeaway', (function () {
  const bag = FX.bag();
  let S = null;
  const NX = 90, NZ = 120, SX = 44, SZ = 70;

  function hash(x, z) { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); }
  function vnoise(x, z) {
    const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
    const u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
    const a = hash(xi, zi), b = hash(xi + 1, zi), c = hash(xi, zi + 1), d = hash(xi + 1, zi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function height(x, z) {
    const valley = Math.min(1, Math.abs(x) / 7);            // a path to walk down
    return (vnoise(x * 0.18, z * 0.18) * 3.2 + vnoise(x * 0.5, z * 0.5) * 0.8 - 1.3) * valley * valley + (Math.abs(x) > 14 ? (Math.abs(x) - 14) * 0.25 : 0);
  }

  function build(el) {
    const canvas = el.querySelector('.e-gl');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    canvas.addEventListener('webglcontextlost', () => Deck.glFail(Deck.cur() === el));
    renderer.setPixelRatio(Math.min(1.5, (window.devicePixelRatio || 1) * (Deck.scale || 1)));
    renderer.setSize(1920, 1080, false);
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x0a0a0b, 8, 52);
    const camera = new THREE.PerspectiveCamera(58, 1920 / 1080, 0.1, 120);
    camera.position.set(1.2, 2.1, 6); camera.lookAt(3.2, 0.6, -30);
    const geo = new THREE.PlaneGeometry(SX, SZ, NX, NZ);
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, 0, -SZ / 2 + 8);
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x5ef2ff, wireframe: true, transparent: true, opacity: 0.55 }));
    scene.add(mesh);
    const base = Float32Array.from(geo.attributes.position.array);
    const jitter = new Float32Array(base.length / 3).map(() => Math.random() * 2 - 1);
    S = { renderer, scene, camera, geo, base, jitter, off: 0, t: 0 };
  }

  function frame(dt) {
    const s = S; s.t += dt; s.off += dt * 3.2;
    const pos = s.geo.attributes.position.array, b = s.base;
    for (let i = 0, j = 0; i < pos.length; i += 3, j++) {
      const x = b[i], z = b[i + 2];
      const dist = -z;                                          // distance ahead of the camera
      const settle = FX.clamp((dist - 12) / 26, 0, 1);          // far = noisy, near = clean terrain
      const n = s.jitter[j] * 2.2 * settle * (0.6 + 0.4 * Math.sin(s.t * 7 + j));
      pos[i + 1] = height(x, z - s.off) * (1 - settle * 0.5) + n;
    }
    s.geo.attributes.position.needsUpdate = true;
    s.camera.position.y = 2.1 + Math.sin(s.t * 0.6) * 0.12;
    s.renderer.render(s.scene, s.camera);
  }

  return {
    enter(el, step) {
      Deck.letterbox(step >= 3); Deck.hudShow(step < 3);
      if (Deck.use3D() && !S) { try { build(el); } catch (e) { console.warn(e); Deck.glFail(false); } }
      if (!Deck.use3D()) { el.querySelector('.e-gl').style.display = 'none'; return; }
      el.querySelector('.e-gl').style.display = '';
      bag.loop(frame);
    },
    step(el, n) { Deck.letterbox(n >= 3); Deck.hudShow(n < 3); },
    leave() { bag.clear(); }
  };
})());
