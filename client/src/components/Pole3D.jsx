import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

// Poste de barbería en 3D con piezas de cromo orbitando.
// Todo el movimiento es suave: se calcula con el tiempo real (no por cuadro)
// y frena de a poco, así se ve igual de fluido en cualquier PC.
export default function Pole3D({ className = '' }) {
  const hostRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ---------- Escena ----------
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;

    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
    const target = new THREE.Vector3(0, 0, 0);

    // Luz principal, luz de borde (atrás) y relleno suave
    const key = new THREE.DirectionalLight(0xffffff, 1.3);
    key.position.set(3, 4, 5);
    const rim = new THREE.DirectionalLight(0xffffff, 2.2);
    rim.position.set(-4, 2, -5);
    scene.add(key, rim, new THREE.AmbientLight(0xffffff, 0.3));

    // ---------- Textura de rayas (negro, blanco, gris) ----------
    const S = 512;
    const cv = document.createElement('canvas');
    cv.width = cv.height = S;
    const ctx = cv.getContext('2d');
    const img = ctx.createImageData(S, S);
    const bands = [[13, 13, 13], [250, 250, 249], [150, 150, 148], [250, 250, 249]];
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const c = bands[Math.floor((((x + y) % S) / S) * bands.length)];
        const i = (y * S + x) * 4;
        img.data[i] = c[0]; img.data[i + 1] = c[1]; img.data[i + 2] = c[2]; img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    const stripes = new THREE.CanvasTexture(cv);
    stripes.colorSpace = THREE.SRGBColorSpace;
    stripes.wrapS = stripes.wrapT = THREE.RepeatWrapping;
    stripes.repeat.set(1, 2.2);
    stripes.anisotropy = renderer.capabilities.getMaxAnisotropy();

    // ---------- Materiales ----------
    const chrome = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, metalness: 1, roughness: 0.12 });
    const darkChrome = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.9, roughness: 0.26 });
    const stripeMat = new THREE.MeshPhysicalMaterial({ map: stripes, roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.08 });
    const glass = new THREE.MeshPhysicalMaterial({
      color: 0xffffff, transparent: true, opacity: 0.14, roughness: 0.02, metalness: 0,
      clearcoat: 1, clearcoatRoughness: 0, envMapIntensity: 1.6, depthWrite: false,
    });
    const bubble = new THREE.MeshPhysicalMaterial({
      color: 0xffffff, transparent: true, opacity: 0.32, roughness: 0, metalness: 0.1,
      clearcoat: 1, envMapIntensity: 2.2, depthWrite: false,
    });

    // ---------- El poste ----------
    const pole = new THREE.Group();
    const H = 3.4;
    pole.add(
      new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, H, 96, 1, true), stripeMat),
      new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, H, 96, 1, true), glass),
    );
    const part = (geo, mat, y) => { const m = new THREE.Mesh(geo, mat); m.position.y = y; pole.add(m); return m; };
    part(new THREE.CylinderGeometry(0.7, 0.7, 0.18, 96), chrome, H / 2 + 0.09);
    part(new THREE.SphereGeometry(0.62, 96, 48, 0, Math.PI * 2, 0, Math.PI / 2), chrome, H / 2 + 0.18);
    part(new THREE.CylinderGeometry(0.08, 0.12, 0.2, 32), darkChrome, H / 2 + 0.88);
    part(new THREE.SphereGeometry(0.15, 48, 24), chrome, H / 2 + 1.05);
    part(new THREE.CylinderGeometry(0.7, 0.7, 0.18, 96), chrome, -H / 2 - 0.09);
    part(new THREE.CylinderGeometry(0.62, 0.38, 0.5, 96), darkChrome, -H / 2 - 0.43);
    part(new THREE.SphereGeometry(0.16, 48, 24), chrome, -H / 2 - 0.72);

    const tilt = new THREE.Group();     // inclinación + mouse + scroll
    tilt.add(pole);
    scene.add(tilt);

    // ---------- Piezas que orbitan (como en las webs del video) ----------
    const orbit = new THREE.Group();
    tilt.add(orbit);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.018, 16, 200), chrome);
    ring.rotation.set(Math.PI / 2 - 0.32, 0, 0.18);
    tilt.add(ring);
    const sats = [
      { mesh: new THREE.Mesh(new THREE.SphereGeometry(0.2, 64, 32), chrome), r: 1.45, a: 0.4, y: 0.9, d: 0.55 },
      { mesh: new THREE.Mesh(new THREE.SphereGeometry(0.13, 48, 24), darkChrome), r: 1.6, a: 2.5, y: -0.9, d: 0.7 },
      { mesh: new THREE.Mesh(new THREE.SphereGeometry(0.3, 64, 32), bubble), r: 1.75, a: 4.3, y: 0.15, d: 0.85 },
      { mesh: new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.045, 24, 64), chrome), r: 1.5, a: 5.6, y: 1.45, d: 1 },
    ];
    sats.forEach((o) => { o.mesh.scale.setScalar(0.0001); orbit.add(o.mesh); });

    // Sombra suave en el piso
    const sh = document.createElement('canvas');
    sh.width = sh.height = 256;
    const sctx = sh.getContext('2d');
    const g = sctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, 'rgba(0,0,0,0.26)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    sctx.fillStyle = g;
    sctx.fillRect(0, 0, 256, 256);
    const shadowMat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sh), transparent: true, depthWrite: false });
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1), shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(0.35, -H / 2 - 1.05, 0);
    scene.add(shadow);

    // ---------- Tamaño ----------
    const resize = () => {
      const w = host.clientWidth, h = host.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      if (reduce) frame(performance.now());
    };
    const ro = new ResizeObserver(resize);

    // ---------- Mouse ----------
    let mx = 0, my = 0;
    const onMove = (e) => {
      mx = e.clientX / window.innerWidth - 0.5;
      my = e.clientY / window.innerHeight - 0.5;
    };
    window.addEventListener('pointermove', onMove, { passive: true });

    // ---------- Ayudas de movimiento ----------
    const clamp01 = (v) => Math.min(Math.max(v, 0), 1);
    const expo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
    const damp = (a, b, speed, dt) => a + (b - a) * (1 - Math.exp(-speed * dt));

    // Estado suavizado
    let cx = 0, cy = 0, sp = 0, spin = 0;
    let last = performance.now();
    const born = performance.now();

    function frame(now) {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const t = reduce ? 99 : (now - born) / 1000;

      // Mouse y scroll suavizados (frenan de a poco)
      cx = damp(cx, mx, 3, dt);
      cy = damp(cy, my, 3, dt);
      const scroll = clamp01(window.scrollY / Math.max(window.innerHeight, 1));
      sp = damp(sp, scroll, 6, dt);

      // Entrada: la cámara se acerca y el poste gira rápido y se acomoda
      const kIn = expo(clamp01(t / 2.4));
      const spinSpeed = 0.32 + 5 * Math.exp(-t * 1.8);
      if (!reduce) spin += spinSpeed * dt;
      pole.rotation.y = spin;
      stripes.offset.y = reduce ? 0 : -t * 0.2;

      // Cámara: se acerca al entrar y se mueve un poco con el mouse (profundidad real)
      // (el 19.4 controla el tamaño del poste: más alto = más chico)
      camera.position.set(cx * 0.9, 0.15 - cy * 0.5 + sp * 0.6, 19.4 - 3.6 * kIn + sp * 1.5);
      camera.lookAt(target);

      // Poste: inclinado, flota, y con el scroll gira y sube
      const bob = Math.sin(t * 0.8) * 0.06;
      tilt.rotation.set(cy * 0.12, cx * 0.35 + sp * 0.9, -0.16 - sp * 0.25);
      tilt.position.y = (1 - kIn) * -0.9 + bob + sp * 0.8;

      // Órbita: entran una por una, giran despacio y se abren con el scroll
      orbit.rotation.y = t * 0.22;
      ring.rotation.z = 0.18 + t * 0.05;
      ring.scale.setScalar(Math.max(expo(clamp01((t - 0.6) / 1.6)), 0.0001) * (1 + sp * 0.4));
      sats.forEach((o, i) => {
        const k = expo(clamp01((t - o.d) / 1.4));
        const r = o.r * (1 + sp * 0.6);
        o.mesh.position.set(Math.cos(o.a) * r, o.y + Math.sin(t * 0.9 + i * 1.7) * 0.12, Math.sin(o.a) * r);
        o.mesh.scale.setScalar(Math.max(k, 0.0001));
        o.mesh.rotation.set(t * 0.4 + i, t * 0.3, 0);
      });

      // Sombra: se achica cuando el poste sube
      shadow.scale.setScalar(1 - bob * 1.5 - sp * 0.3);
      shadowMat.opacity = kIn * (1 - sp);

      renderer.render(scene, camera);
    }

    // ---------- Bucle (se pausa si no se ve) ----------
    let raf = 0, visible = true;
    function loop() {
      cancelAnimationFrame(raf);
      if (reduce) { frame(performance.now()); return; }
      const tick = (now) => {
        frame(now);
        if (visible && !document.hidden) raf = requestAnimationFrame(tick);
      };
      last = performance.now();
      raf = requestAnimationFrame(tick);
    }
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) loop(); });
    const onVis = () => { if (!document.hidden) loop(); };
    document.addEventListener('visibilitychange', onVis);
    ro.observe(host);
    resize();
    io.observe(host);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('visibilitychange', onVis);
      scene.traverse((o) => { o.geometry?.dispose(); o.material?.map?.dispose(); o.material?.dispose(); });
      envTex.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={hostRef} className={className} aria-hidden="true" />;
}