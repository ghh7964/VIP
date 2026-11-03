/* 5 · The model — Three.js exploded view of GameNGen.
   step 0: noisy latent → U-Net → next frame
   step 1: text prompt appears, gets struck out
   step 2: prompt shatters → keycaps; action tokens rain into cross-attention
   step 3: past 64 frames fly in and stack behind the noisy latent (channel concat)
   step 4: output travels the loop back into the history stack                     */
Deck.register('model', (function () {
  const bag = FX.bag();
  const CYAN = 0x5ef2ff, ORANGE = 0xff4a1c, INK = 0xece6da;
  let S = null;            // scene state, built lazily
  let el0, curStep = 0;

  const NS = 0.75;         // U-Net scale
  const CAM = [
    { p: [-1.9, 0.8, 12.5], t: [-1.9, 0.6, 0] },
    { p: [-1.9, 0.8, 12.5], t: [-1.9, 0.6, 0] },
    { p: [-1.9, 0.8, 12.5], t: [-1.9, 0.6, 0] },
    { p: [-8.96, 3.3, 9.63], t: [-3.46, 0, -1.77] },
    { p: [-1.9, 0.65, 13.4], t: [-1.9, 0.4, 0] }
  ];

  function tex(src) {
    const t = new THREE.Texture();
    const im = new Image();
    im.onload = () => { t.image = im; t.needsUpdate = true; };
    im.src = src;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  function edges(geo, color, opacity) {
    return new THREE.LineSegments(new THREE.EdgesGeometry(geo),
      new THREE.LineBasicMaterial({ color, transparent: true, opacity }));
  }
  function framePlane(map, w, h, edgeColor, edgeOp) {
    const g = new THREE.PlaneGeometry(w, h);
    const m = new THREE.MeshBasicMaterial({ map, transparent: true, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(g, m);
    if (edgeColor != null) mesh.add(edges(g, edgeColor, edgeOp == null ? 1 : edgeOp));
    return mesh;
  }
  function label(text, cls) {
    const d = document.createElement('div');
    d.className = 'ml ' + (cls || '');
    d.innerHTML = text;
    el0.querySelector('.m-labels').appendChild(d);
    return d;
  }

  function build(el) {
    const canvas = el.querySelector('.m-gl');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    canvas.addEventListener('webglcontextlost', () => Deck.glFail(Deck.cur() === el));
    renderer.setPixelRatio(Math.min(1.6, (window.devicePixelRatio || 1) * (Deck.scale || 1)));
    renderer.setSize(1920, 1080, false);
    renderer.setClearColor(0x000000, 0);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1920 / 1080, 0.1, 200);
    const frames = (window.GG_FRAMES || []).map(tex);

    // --- noisy latent x_t (animated noise texture) ---
    const ncv = document.createElement('canvas'); ncv.width = 160; ncv.height = 128;
    const nctx = ncv.getContext('2d');
    const npool = FX.noiseCanvases(200, 160, 4);
    const ntex = new THREE.CanvasTexture(ncv);
    const xt = framePlane(ntex, 1.5, 1.2, INK, 0.9);
    xt.position.set(-3.3, 0, 0);
    scene.add(xt);

    // --- denoising U-Net (bow-tie of two square frustums) ---
    const net = new THREE.Group();
    const mkHalf = sign => {
      const g = new THREE.CylinderGeometry(0.72, 1.85, 1.8, 4, 1, true);
      g.rotateY(Math.PI / 4);
      g.rotateZ(sign * Math.PI / 2);
      g.translate(sign * 0.9, 0, 0);
      const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: 0.08, side: THREE.DoubleSide, depthWrite: false }));
      m.add(edges(g, CYAN, 0.95));
      return m;
    };
    net.add(mkHalf(1), mkHalf(-1));
    net.scale.setScalar(NS);
    // inner "denoising" rings sweeping through
    const rings = [];
    for (let i = 0; i < 3; i++) {
      const rg = new THREE.PlaneGeometry(1, 1);
      const ring = edges(rg, CYAN, 0.6);
      ring.rotation.y = Math.PI / 2;
      net.add(ring); rings.push(ring);
    }
    scene.add(net);

    // arrows
    const arrowMat = new THREE.LineBasicMaterial({ color: 0x6b675f });
    const line = (a, b) => new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...a), new THREE.Vector3(...b)]), arrowMat);
    scene.add(line([-2.55, 0, 0], [-1.85 * NS, 0, 0]), line([1.85 * NS, 0, 0], [2.55, 0, 0]));

    // --- output frame ---
    const out = framePlane(frames[0], 1.5, 1.2, CYAN, 1);
    out.position.set(3.3, 0, 0);
    scene.add(out);

    // --- text prompt card + rails ---
    const pcv = FX.textCanvas('“a cat on the beach”', { w: 1024, h: 256, bg: '#18181c', border: '#6b675f', bw: 6, font: `italic 118px 'Instrument Serif', Georgia, serif`, dy: 6 });
    const ptex = new THREE.CanvasTexture(pcv); ptex.colorSpace = THREE.SRGBColorSpace;
    const card = framePlane(ptex, 2.6, 0.65, null);
    card.position.set(0, 2.25, 0);
    const strike = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 0.07), new THREE.MeshBasicMaterial({ color: ORANGE }));
    strike.position.set(0, 0, 0.01); strike.scale.x = 0.0001;
    card.add(strike);
    scene.add(card);
    const railMat = new THREE.LineDashedMaterial({ color: 0x8a857c, dashSize: 0.08, gapSize: 0.07, transparent: true, opacity: 0.9 });
    const rails = [-0.7, 0, 0.7].map(x => {
      const xe = x * 0.95, xl = xe / NS;
      const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x, 1.9, 0), new THREE.Vector3(xe, (0.72 + 1.13 * Math.abs(xl) / 1.8) * 0.707 * NS, 0)]), railMat);
      l.computeLineDistances(); scene.add(l); return l;
    });

    // --- keycaps ---
    const keys = [];
    const keyDefs = [['↑', -1.45, 0.62], ['←', -0.7, 0.62], ['→', 0.05, 0.62], ['FIRE', 1.05, 1.1]];
    keyDefs.forEach(([lab, x, w]) => {
      const kc = FX.textCanvas(lab, { w: w > 0.8 ? 360 : 200, h: 200, bg: '#1d1d22', border: '#5ef2ff', bw: 10, color: '#ece6da', font: `700 ${lab.length > 1 ? 76 : 110}px 'JetBrains Mono', monospace`, dy: 4 });
      const kt = new THREE.CanvasTexture(kc); kt.colorSpace = THREE.SRGBColorSpace;
      const side = new THREE.MeshBasicMaterial({ color: 0x2a2a31 });
      const front = new THREE.MeshBasicMaterial({ map: kt });
      const g = new THREE.BoxGeometry(w, 0.62, 0.26);
      const m = new THREE.Mesh(g, [side, side, side, side, front, side]);
      m.add(edges(g, CYAN, 0.5));
      m.position.set(x + w / 2 - 0.3, 2.3, 0);
      m.userData = { baseZ: 0, press: 0, x: m.position.x };
      m.scale.setScalar(0.0001);
      scene.add(m); keys.push(m);
    });

    // --- history stack: 64 frames behind x_t ---
    const stack = [];
    for (let i = 0; i < 64; i++) {
      const p = framePlane(frames[(i * 3 + 5) % frames.length], 1.5, 1.2, ORANGE, i < 4 ? 0.9 : 0.35);
      p.userData = { slotZ: -0.07 * (i + 1), fly: 0 };
      p.position.set(-9, 0, p.userData.slotZ);
      p.visible = false;
      p.material.opacity = 1 - i / 64 * 0.7;
      scene.add(p); stack.push(p);
    }
    const stackBox = edges(new THREE.BoxGeometry(1.62, 1.32, 0.07 * 64 + 0.1), 0xff8a3d, 0.0);
    stackBox.position.set(-3.3, 0, -0.07 * 32 - 0.02);
    scene.add(stackBox);

    // --- loop path from output back into the stack ---
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(3.3, -0.62, 0.05), new THREE.Vector3(3.2, -1.75, 0.3), new THREE.Vector3(0, -2.2, 0.5),
      new THREE.Vector3(-3.2, -1.75, 0.3), new THREE.Vector3(-3.3, -0.62, 0.05)]);
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 80, 0.025, 8, false),
      new THREE.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: 0 }));
    scene.add(tube);
    const packet = framePlane(frames[1], 0.75, 0.6, CYAN, 1);
    packet.visible = false; scene.add(packet);

    // --- shards & tokens pools ---
    const shards = [], tokens = [];
    const tokGeo = new THREE.BoxGeometry(0.13, 0.13, 0.13);

    // labels
    const L = {
      xt: label('x<sub>t</sub> · 노이즈 섞인 latent'),
      net: label('디노이징 UNet', 'gen'),
      out: label('다음 프레임', 'gen'),
      prompt: label('텍스트 프롬프트 → cross-attention'),
      act: label('키 입력 임베딩 → cross-attention', 'gen'),
      hist: label('과거 64프레임 ≈ 3초 · 채널 방향으로 이어 붙임', 'real'),
      loop: label('새 프레임은 다시 과거 프레임으로 ↺', 'gen')
    };
    const anchors = {
      xt: [-3.3, 0.72, 0], net: [0, -1.12, 0], out: [3.3, 0.72, 0], prompt: [0, 2.72, 0],
      act: [0, 2.78, 0], hist: [-3.3, -0.75, -2.3], loop: [0, -2.27, 0.5]
    };
    L.net.style.transform = 'translate(-50%, 0)';
    L.loop.style.transform = 'translate(-50%, 8px)';
    L.hist.style.transform = 'translate(-50%, 14px)';

    const camPos = new THREE.Vector3(...CAM[0].p), camTgt = new THREE.Vector3(...CAM[0].t);
    camera.position.copy(camPos);

    S = { renderer, scene, camera, frames, xt, ntex, nctx, npool, net, rings, out, card, strike, rails, railMat, keys,
      stack, stackBox, curve, tube, packet, shards, tokens, tokGeo, L, anchors, camPos, camTgt,
      t: 0, loopT: -1, frameIdx: 2, lastAuto: 0, lastClick: -9 };

    // clicks on keycaps
    const ray = new THREE.Raycaster();
    canvas.addEventListener('pointerdown', ev => {
      if (curStep < 2) return;
      const p = Deck.toStage(ev);
      ray.setFromCamera(new THREE.Vector2(p.x / 960 - 1, 1 - p.y / 540), camera);
      const hit = ray.intersectObjects(keys, false)[0];
      if (hit) { press(keys.indexOf(hit.object)); S.lastClick = S.t; }
    });
  }

  function press(i) {
    const k = S.keys[i]; if (!k) return;
    k.userData.press = 1;
    const m = new THREE.Mesh(S.tokGeo, new THREE.MeshBasicMaterial({ color: CYAN, transparent: true }));
    const x0 = k.position.x;
    m.userData = { a: new THREE.Vector3(x0, 1.95, 0.05), b: new THREE.Vector3(x0 * 0.4, 0.3, 0.05), k: 0 };
    m.position.copy(m.userData.a);
    S.scene.add(m); S.tokens.push(m);
  }

  function shatterCard() {
    const { card, scene, shards } = S;
    const cols = 8, rows = 3, W = 2.6, H = 0.65;
    for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
      const t = card.material.map.clone(); t.needsUpdate = true;
      t.repeat.set(1 / cols, 1 / rows); t.offset.set(c / cols, r / rows);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(W / cols, H / rows), new THREE.MeshBasicMaterial({ map: t, transparent: true, side: THREE.DoubleSide }));
      m.position.set(card.position.x - W / 2 + (c + .5) * W / cols, card.position.y - H / 2 + (r + .5) * H / rows, 0.02);
      m.userData = { v: new THREE.Vector3(FX.rand(-1.5, 1.5) + (c - cols / 2) * 0.35, FX.rand(-0.5, 2.2), FX.rand(0.5, 3)), w: new THREE.Vector3(FX.rand(-6, 6), FX.rand(-6, 6), FX.rand(-6, 6)), life: 1 };
      scene.add(m); shards.push(m);
    }
    card.visible = false;
  }

  function setStep(n, dir, instant) {
    curStep = n;
    const { L } = S;
    L.xt.classList.toggle('on', true);
    L.net.classList.toggle('on', true);
    L.out.classList.toggle('on', n !== 3);
    L.prompt.classList.toggle('on', n === 1);
    L.act.classList.toggle('on', n === 2);
    L.hist.classList.toggle('on', n === 3);
    L.loop.classList.toggle('on', n >= 4);

    // prompt card
    S.card.visible = n === 1;
    S.rails.forEach(r => { r.visible = n >= 1; });
    if (n === 1) {
      S.strike.scale.x = 0.0001;
      if (instant) S.strike.scale.x = 1;
      else bag.timeout(() => bag.tween(500, k => { S.strike.scale.x = Math.max(0.0001, k); }), 1500);
    }
    if (n === 0) S.strike.scale.x = 0.0001;
    if (n === 2 && dir > 0 && !instant) shatterCard();
    S.railMat.color.setHex(n >= 2 ? CYAN : 0x8a857c);

    // keycaps
    S.keys.forEach((k, i) => {
      const target = n >= 2 ? 1 : 0.0001;
      if (instant || n < 2) k.scale.setScalar(target);
      else if (dir > 0 && n === 2) bag.timeout(() => bag.tween(600, e => k.scale.setScalar(Math.max(0.0001, e)), t => {
        const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
      }), 350 + i * 110);
      else k.scale.setScalar(target);
    });

    // history stack
    S.stack.forEach((p, i) => {
      if (n >= 3) {
        p.visible = true;
        if (instant || dir < 0) { p.userData.fly = 1; p.position.set(-3.3, 0, p.userData.slotZ); }
        else if (p.userData.fly < 1) {
          p.userData.fly = 0; p.position.set(-9 - i * 0.05, FX.rand(-0.4, 0.4), p.userData.slotZ);
          p.userData.delay = i * 0.028;
        }
      } else { p.visible = false; p.userData.fly = 0; p.position.x = -9; }
    });
    S.stackBox.material.opacity = n >= 3 ? 0.5 : 0;

    // loop
    S.tube.material.opacity = n >= 4 ? 0.85 : 0;
    S.loopT = n >= 4 ? 0 : -1;
    S.packet.visible = false;

    // lower-third quote position
    const q = el0.querySelector('.m-quote');
    if (q) q.style.transitionDelay = n === 2 && dir > 0 ? '1.3s' : '0s';
  }

  function frame(dt) {
    const s = S; s.t += dt;
    const { camera, camPos, camTgt } = s;
    const c = CAM[curStep];
    const sway = Math.sin(s.t * 0.35) * 0.18;
    camPos.lerp(new THREE.Vector3(c.p[0] + sway, c.p[1], c.p[2]), 1 - Math.pow(0.02, dt));
    camTgt.lerp(new THREE.Vector3(...c.t), 1 - Math.pow(0.02, dt));
    camera.position.copy(camPos); camera.lookAt(camTgt);

    // noise texture
    if (((s.t * 20) | 0) % 2 === 0) {
      s.nctx.drawImage(s.npool[(Math.random() * 4) | 0], (Math.random() * 40) | 0, (Math.random() * 32) | 0, 160, 128, 0, 0, 160, 128);
      s.ntex.needsUpdate = true;
    }
    // rings sweeping through the network
    s.rings.forEach((r, i) => {
      const u = ((s.t * 0.45 + i / 3) % 1);
      const x = FX.lerp(-1.75, 1.75, u);  // in the net's local (unscaled) space
      const h = (0.72 + 1.13 * Math.abs(x) / 1.8) * 1.414 * 0.96;
      r.position.x = x; r.scale.set(h, h, 1);
      r.material.opacity = 0.55 * Math.sin(u * Math.PI);
    });

    // shards
    s.shards.forEach(m => {
      const u = m.userData; u.life -= dt * 0.9;
      u.v.y -= dt * 4.5;
      m.position.addScaledVector(u.v, dt);
      m.rotation.x += u.w.x * dt; m.rotation.y += u.w.y * dt; m.rotation.z += u.w.z * dt;
      m.material.opacity = Math.max(0, u.life);
    });
    for (let i = s.shards.length - 1; i >= 0; i--) if (s.shards[i].userData.life <= 0) { s.scene.remove(s.shards[i]); s.shards.splice(i, 1); }

    // keycaps: press animation + auto-press
    s.keys.forEach(k => {
      k.userData.press = Math.max(0, k.userData.press - dt * 4);
      k.position.z = -0.14 * Math.sin(k.userData.press * Math.PI);
      k.children[0].material.opacity = 0.5 + k.userData.press * 0.5;
    });
    if (curStep >= 2 && s.t - s.lastAuto > 0.62 && s.t - s.lastClick > 2.5) {
      s.lastAuto = s.t; press((Math.random() * 4) | 0);
    }
    // tokens
    s.tokens.forEach(m => {
      const u = m.userData; u.k += dt * 1.25;
      m.position.lerpVectors(u.a, u.b, FX.easeIO(Math.min(1, u.k)));
      m.rotation.x += dt * 3; m.rotation.y += dt * 2;
      m.material.opacity = u.k < 0.85 ? 1 : Math.max(0, (1 - u.k) / 0.15);
    });
    for (let i = s.tokens.length - 1; i >= 0; i--) if (s.tokens[i].userData.k >= 1) { s.scene.remove(s.tokens[i]); s.tokens[i].material.dispose(); s.tokens.splice(i, 1); }

    // history stack fly-in
    s.stack.forEach(p => {
      const u = p.userData;
      if (!p.visible || u.fly >= 1) return;
      if (u.delay > 0) { u.delay -= dt; return; }
      u.fly = Math.min(1, u.fly + dt * 1.6);
      const e = FX.ease(u.fly);
      p.position.x = FX.lerp(-9, -3.3, e);
      p.position.y *= (1 - e * 0.2);
      if (u.fly >= 1) p.position.y = 0;
    });

    // output loop
    if (s.loopT >= 0) {
      s.loopT += dt / 2.4;
      if (s.loopT < 0.15) {                 // new frame appears at the output
        s.out.scale.setScalar(0.85 + s.loopT / 0.15 * 0.15);
        s.packet.visible = false;
      } else if (s.loopT < 0.85) {          // travels along the loop
        const u = (s.loopT - 0.15) / 0.7;
        s.packet.visible = true;
        s.packet.material.map = s.out.material.map;
        s.packet.position.copy(s.curve.getPointAt(FX.easeIO(u)));
        s.packet.scale.setScalar(FX.lerp(1, 2, u));
      } else {                               // joins the stack front, stack shifts back
        s.packet.visible = false;
        if (!s.shifted) {
          s.shifted = true;
          for (let i = s.stack.length - 1; i > 0; i--) s.stack[i].material.map = s.stack[i - 1].material.map;
          s.stack[0].material.map = s.out.material.map;
          s.stack.forEach(p => { p.material.needsUpdate = true; });
          s.frameIdx = (s.frameIdx + 1) % s.frames.length;
          s.out.material.map = s.frames[s.frameIdx]; s.out.material.needsUpdate = true;
        }
        if (s.loopT >= 1) { s.loopT = 0; s.shifted = false; }
      }
    }

    s.renderer.render(s.scene, camera);

    // HTML labels follow their 3D anchors
    const v = new THREE.Vector3();
    for (const k in s.anchors) {
      v.set(...s.anchors[k]).project(camera);
      const lab = s.L[k];
      lab.style.left = ((v.x + 1) * 960).toFixed(1) + 'px';
      lab.style.top = ((1 - v.y) * 540).toFixed(1) + 'px';
    }
  }

  return {
    init(el) { el0 = el; },
    enter(el, step, dir) {
      if (Deck.use3D() && !S) { try { build(el); } catch (e) { console.warn(e); Deck.glFail(false); } }
      if (!Deck.use3D()) { el.querySelector('.m-gl').style.display = 'none'; el.querySelector('.m-labels').style.display = 'none'; return; }
      el.querySelector('.m-gl').style.display = '';
      el.querySelector('.m-labels').style.display = '';
      const c = CAM[step];
      S.camPos.set(...c.p); S.camTgt.set(...c.t);
      setStep(step, dir, true);
      bag.loop(frame);
    },
    step(el, n, dir) { if (S && Deck.use3D()) setStep(n, dir, false); else curStep = n; },
    leave(el) {
      bag.clear();
      if (S) {
        S.shards.forEach(m => S.scene.remove(m)); S.shards.length = 0;
        S.tokens.forEach(m => S.scene.remove(m)); S.tokens.length = 0;
      }
      if (!Deck.use3D()) el.querySelector('.m-labels').style.display = 'none';
    }
  };
})());
