/* 10 · Limitations — a corridor of past frames receding in time; beyond ~3 s (64 frames) they dissolve into noise. */
Deck.register('limits', (function () {
  const bag = FX.bag();
  const SP = 0.3, KEEP = 64, TAIL = 30, TOTAL = KEEP + TAIL;
  let S = null, el0, fallback = null;

  function build(el) {
    const canvas = el.querySelector('.l-gl');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    canvas.addEventListener('webglcontextlost', () => Deck.glFail(Deck.cur() === el));
    renderer.setPixelRatio(Math.min(1.6, (window.devicePixelRatio || 1) * (Deck.scale || 1)));
    renderer.setSize(1920, 1080, false);
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x0a0a0b, 14, 40);
    const camera = new THREE.PerspectiveCamera(46, 1920 / 1080, 0.1, 100);
    camera.position.set(-0.35, 0.15, 3.1);
    camera.lookAt(-1.2, -0.25, -18);

    const frames = (window.GG_FRAMES || []).map(src => {
      const t = new THREE.Texture(); const im = new Image();
      im.onload = () => { t.image = im; t.needsUpdate = true; }; im.src = src;
      t.colorSpace = THREE.SRGBColorSpace; return t;
    });
    const ncv = document.createElement('canvas'); ncv.width = 128; ncv.height = 102;
    const nctx = ncv.getContext('2d'); const npool = FX.noiseCanvases(160, 128, 4, true);
    const ntex = new THREE.CanvasTexture(ncv);

    const geo = new THREE.PlaneGeometry(1.5, 1.2);
    const planes = [];
    for (let i = 0; i < TOTAL; i++) {
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: frames[i % frames.length], transparent: true, side: THREE.DoubleSide }));
      const side = i % 2 ? 1 : -1;
      m.userData = { side, fi: i % frames.length };
      m.rotation.y = -side * 0.95;
      scene.add(m); planes.push(m);
    }
    // the ~3 s boundary: a glowing gate
    const zGate = -(KEEP - 0.5) * SP - 1.8;
    const gateGeo = new THREE.PlaneGeometry(3.9, 2.1);
    const gate = new THREE.LineSegments(new THREE.EdgesGeometry(gateGeo), new THREE.LineBasicMaterial({ color: 0x5ef2ff }));
    gate.position.set(0, 0, zGate);
    const gateFill = new THREE.Mesh(gateGeo, new THREE.MeshBasicMaterial({ color: 0x5ef2ff, transparent: true, opacity: 0.05, side: THREE.DoubleSide, depthWrite: false }));
    gateFill.position.copy(gate.position);
    scene.add(gate, gateFill);
    // floor grid
    const grid = new THREE.GridHelper(60, 120, 0x2a2a30, 0x1a1a1f);
    grid.position.set(0, -1.05, -20); scene.add(grid);

    S = { renderer, scene, camera, frames, planes, ntex, nctx, npool, gate, gateFill, zGate, u: 0, head: 0, t: 0 };
  }

  function layout() {
    const { planes, u } = S;
    planes.forEach((m, i) => {
      const age = i + u;                                   // 0 = newest
      const z = -age * SP - 1.2;
      m.position.set(m.userData.side * 1.3, 0, z);
      if (age < KEEP) {
        m.material.map = S.frames[m.userData.fi];
        m.material.opacity = FX.clamp(1 - age / KEEP * 0.25, 0, 1) * FX.clamp((age + 0.2) * 1.2, 0, 1);
      } else {
        const d = (age - KEEP) / TAIL;
        m.material.map = S.ntex;
        m.material.opacity = Math.max(0, 0.75 * (1 - d));
      }
    });
  }

  function frame(dt) {
    const s = S; s.t += dt;
    s.u += dt * 7;                     // frames per second flowing into the past
    while (s.u >= 1) {                 // a new frame arrives: every frame ages by one
      s.u -= 1;
      s.planes.forEach(m => { m.userData.fi = (m.userData.fi + s.frames.length - 1) % s.frames.length; m.userData.side *= -1; m.rotation.y = -m.userData.side * 0.95; });
    }
    layout();
    if (((s.t * 15) | 0) % 2 === 0) {
      s.nctx.drawImage(s.npool[(Math.random() * 4) | 0], (Math.random() * 30) | 0, (Math.random() * 24) | 0, 128, 102, 0, 0, 128, 102);
      s.ntex.needsUpdate = true;
    }
    s.gateFill.material.opacity = 0.04 + 0.03 * Math.sin(s.t * 3);
    s.camera.position.x = -0.35 + Math.sin(s.t * 0.4) * 0.12;
    s.renderer.render(s.scene, s.camera);
    // labels
    const v = new THREE.Vector3();
    const put = (sel, x, y, z) => {
      v.set(x, y, z).project(s.camera);
      const d = el0.querySelector(sel);
      d.style.left = ((v.x + 1) * 960).toFixed(1) + 'px'; d.style.top = ((1 - v.y) * 540).toFixed(1) + 'px';
    };
    put('.l-now', -1.3, 0.72, -1.5);
    put('.l-edge', 0, 1.2, S.zGate);
    put('.l-lost', 0, 0.2, S.zGate - 5);
  }

  function makeFallback(el) {
    if (fallback) return;
    fallback = document.createElement('div');
    fallback.className = 'l-fallback';
    const fr = window.GG_FRAMES || [];
    for (let i = 0; i < 11; i++) {
      const im = document.createElement('img');
      im.src = fr[i % fr.length];
      im.style.filter = `blur(${Math.max(0, i - 6) * 1.6}px) grayscale(${Math.max(0, i - 6) / 4})`;
      im.style.opacity = 1 - Math.max(0, i - 6) * 0.2;
      fallback.appendChild(im);
    }
    el.insertBefore(fallback, el.querySelector('.head'));
  }

  return {
    init(el) { el0 = el; },
    enter(el, step) {
      if (step >= 1) Deck.hudGlow();
      if (Deck.use3D() && !S) { try { build(el); } catch (e) { console.warn(e); Deck.glFail(false); } }
      if (!Deck.use3D()) {
        el.querySelector('.l-gl').style.display = 'none'; makeFallback(el); fallback.style.display = ''; return;
      }
      if (fallback) fallback.style.display = 'none';
      el.querySelector('.l-gl').style.display = '';
      bag.loop(frame);
    },
    step(el, n, dir) {
      if (n === 1 && dir > 0) bag.timeout(() => Deck.hudGlow(), 600);
    },
    leave() { bag.clear(); }
  };
})());
