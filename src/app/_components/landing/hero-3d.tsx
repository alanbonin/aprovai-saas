'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface Palette {
  violet: number;
  mint:   number;
  gold:   number;
  pink:   number;
  core:   number;
}

interface SceneRef {
  destroy: () => void;
}

// Teal-first palette for AprovAI360
const DEFAULT_PALETTE: Palette = {
  violet: 0x0ab5bd,
  mint:   0x00ffa3,
  gold:   0xffd166,
  pink:   0xff5ea8,
  core:   0x7ad8df,
};

function makeRadialTexture(colorHex: number): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d')!;
  const col = new THREE.Color(colorHex);
  const r = Math.round(col.r * 255), g = Math.round(col.g * 255), b = Math.round(col.b * 255);
  const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0,   `rgba(${r},${g},${b},1)`);
  grad.addColorStop(0.4, `rgba(${r},${g},${b},0.4)`);
  grad.addColorStop(1,   `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function mountScene(el: HTMLElement, palette: Palette, intensity: number, speedMul: number): SceneRef {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x050511, 0.04);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0, 0, 9);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  el.appendChild(renderer.domElement);
  renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;';

  // Lighting
  const keyLight = new THREE.PointLight(palette.violet, 4 * intensity, 30, 1.6);
  keyLight.position.set(-4, 3, 4);
  scene.add(keyLight);
  const fillLight = new THREE.PointLight(palette.mint, 3 * intensity, 30, 1.6);
  fillLight.position.set(4, -2, 3);
  scene.add(fillLight);
  const rim = new THREE.PointLight(palette.gold, 1.5 * intensity, 30, 1.6);
  rim.position.set(0, 5, -3);
  scene.add(rim);
  scene.add(new THREE.AmbientLight(0x102030, 0.5));

  // Glass orb
  const orbGroup = new THREE.Group();
  scene.add(orbGroup);

  const glassGeo = new THREE.IcosahedronGeometry(1.4, 6);
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: 0.0,
    roughness: 0.05,
    transmission: 0.95,
    thickness: 1.2,
    ior: 1.45,
    attenuationColor: new THREE.Color(palette.violet),
    attenuationDistance: 1.5,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    transparent: true,
    opacity: 0.9,
  });
  const orb = new THREE.Mesh(glassGeo, glassMat);
  orbGroup.add(orb);

  const coreGeo = new THREE.IcosahedronGeometry(0.55, 3);
  const coreMat = new THREE.MeshStandardMaterial({
    color: palette.violet,
    emissive: palette.violet,
    emissiveIntensity: 2.4,
    roughness: 0.3,
    metalness: 0,
  });
  const core = new THREE.Mesh(coreGeo, coreMat);
  orbGroup.add(core);

  // Halo sprites
  const haloTex = makeRadialTexture(palette.violet);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: haloTex, color: palette.violet,
    blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.85,
  }));
  halo.scale.set(6.5, 6.5, 1);
  halo.position.z = -0.5;
  scene.add(halo);

  const haloTex2 = makeRadialTexture(palette.mint);
  const halo2 = new THREE.Sprite(new THREE.SpriteMaterial({
    map: haloTex2, color: palette.mint,
    blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.4,
  }));
  halo2.scale.set(9, 9, 1);
  halo2.position.set(1.5, -0.5, -1);
  scene.add(halo2);

  // Orbital rings
  const ringGeo = new THREE.TorusGeometry(2.2, 0.005, 8, 200);
  const ringMat = new THREE.MeshBasicMaterial({ color: palette.violet, transparent: true, opacity: 0.35 });
  const ring1 = new THREE.Mesh(ringGeo, ringMat);
  ring1.rotation.x = Math.PI / 2;
  scene.add(ring1);
  const ring2 = new THREE.Mesh(ringGeo, ringMat.clone());
  ring2.rotation.x = Math.PI / 3;
  ring2.rotation.y = Math.PI / 4;
  scene.add(ring2);
  const ring3 = new THREE.Mesh(
    new THREE.TorusGeometry(2.7, 0.003, 8, 200),
    new THREE.MeshBasicMaterial({ color: palette.mint, transparent: true, opacity: 0.25 })
  );
  ring3.rotation.x = Math.PI / 2.5;
  ring3.rotation.z = Math.PI / 6;
  scene.add(ring3);

  // Knowledge particle nodes
  const nodeCount = 28;
  const nodeGroup = new THREE.Group();
  scene.add(nodeGroup);
  const nodeColors = [palette.violet, palette.mint, palette.gold, palette.pink, 0xffffff];

  interface NodeData {
    mesh: THREE.Mesh;
    glow: THREE.Sprite;
    baseRadius: number;
    theta: number;
    phi: number;
    thetaSpeed: number;
    phiSpeed: number;
    wobble: number;
  }
  const nodeData: NodeData[] = [];

  for (let i = 0; i < nodeCount; i++) {
    const radius = 2.4 + Math.random() * 1.6;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.sin(phi) * Math.sin(theta);
    const z = radius * Math.cos(phi);
    const pos = new THREE.Vector3(x, y, z);

    const color = nodeColors[Math.floor(Math.random() * nodeColors.length)];
    const size = 0.04 + Math.random() * 0.06;
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(size, 12, 12),
      new THREE.MeshBasicMaterial({ color })
    );
    m.position.copy(pos);
    nodeGroup.add(m);

    const g = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeRadialTexture(color), color,
      blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.75,
    }));
    g.scale.setScalar(0.4 + Math.random() * 0.4);
    g.position.copy(pos);
    nodeGroup.add(g);

    nodeData.push({
      mesh: m, glow: g, baseRadius: radius, theta, phi,
      thetaSpeed: (Math.random() - 0.5) * 0.0015 * speedMul,
      phiSpeed:   (Math.random() - 0.5) * 0.0008 * speedMul,
      wobble: Math.random() * Math.PI * 2,
    });
  }

  // Neural-net lines
  const lineMaxPairs = 60;
  const linePositions = new Float32Array(lineMaxPairs * 2 * 3);
  const lineColors    = new Float32Array(lineMaxPairs * 2 * 3);
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
  lineGeo.setAttribute('color',    new THREE.BufferAttribute(lineColors,    3));
  const lineSegs = new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({
    vertexColors: true, transparent: true, opacity: 0.4,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  scene.add(lineSegs);

  function updateLines() {
    let pairs = 0;
    const pos = lineGeo.attributes.position.array as Float32Array;
    const col = lineGeo.attributes.color.array as Float32Array;
    const violetC = new THREE.Color(palette.violet);
    const mintC   = new THREE.Color(palette.mint);
    for (let i = 0; i < nodeData.length && pairs < lineMaxPairs; i++) {
      for (let j = i + 1; j < nodeData.length && pairs < lineMaxPairs; j++) {
        const a = nodeData[i].mesh.position;
        const b = nodeData[j].mesh.position;
        const d = a.distanceTo(b);
        if (d < 1.6) {
          const idx = pairs * 6;
          pos[idx]=a.x; pos[idx+1]=a.y; pos[idx+2]=a.z;
          pos[idx+3]=b.x; pos[idx+4]=b.y; pos[idx+5]=b.z;
          const fade = 1 - d / 1.6;
          const mix = THREE.MathUtils.lerp(0.2, 0.8, fade);
          const c = violetC.clone().lerp(mintC, mix);
          col[idx]=c.r; col[idx+1]=c.g; col[idx+2]=c.b;
          col[idx+3]=c.r; col[idx+4]=c.g; col[idx+5]=c.b;
          pairs++;
        }
      }
    }
    for (let k = pairs * 6; k < pos.length; k++) pos[k] = 0;
    lineGeo.setDrawRange(0, pairs * 2);
    lineGeo.attributes.position.needsUpdate = true;
    lineGeo.attributes.color.needsUpdate = true;
  }

  // Starfield
  const starCount = 800;
  const starsGeo = new THREE.BufferGeometry();
  const starPos   = new Float32Array(starCount * 3);
  const starColor = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const r2 = 18 + Math.random() * 15;
    const t2 = Math.random() * Math.PI * 2;
    const p2 = Math.acos(2 * Math.random() - 1);
    starPos[i*3]   = r2 * Math.sin(p2) * Math.cos(t2);
    starPos[i*3+1] = r2 * Math.sin(p2) * Math.sin(t2);
    starPos[i*3+2] = r2 * Math.cos(p2) - 5;
    const sc = Math.random() > 0.9
      ? new THREE.Color(palette.mint)
      : Math.random() > 0.7
        ? new THREE.Color(palette.violet)
        : new THREE.Color(0xffffff);
    starColor[i*3]=sc.r; starColor[i*3+1]=sc.g; starColor[i*3+2]=sc.b;
  }
  starsGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  starsGeo.setAttribute('color',    new THREE.BufferAttribute(starColor, 3));
  const stars = new THREE.Points(starsGeo, new THREE.PointsMaterial({
    size: 0.05, vertexColors: true, transparent: true, opacity: 0.85,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  scene.add(stars);

  // Resize
  function resize() {
    const w = el.clientWidth || window.innerWidth;
    const h = el.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(el);

  // Mouse parallax
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  function onMouse(e: MouseEvent) {
    const rect = el.getBoundingClientRect();
    mouse.tx = ((e.clientX - rect.left) / rect.width  - 0.5) * 2;
    mouse.ty = ((e.clientY - rect.top)  / rect.height - 0.5) * 2;
  }
  window.addEventListener('mousemove', onMouse);

  // Scroll dolly
  let scrollProgress = 0;
  function onScroll() {
    scrollProgress = Math.min(1, window.scrollY / Math.max(1, window.innerHeight));
  }
  window.addEventListener('scroll', onScroll);

  // Animation loop
  const clock = new THREE.Clock();
  let raf: number;

  function tick() {
    clock.getDelta();
    const t = clock.getElapsedTime();

    mouse.x += (mouse.tx - mouse.x) * 0.05;
    mouse.y += (mouse.ty - mouse.y) * 0.05;

    orbGroup.rotation.y = t * 0.15 * speedMul + mouse.x * 0.3;
    orbGroup.rotation.x = Math.sin(t * 0.2 * speedMul) * 0.1 + mouse.y * 0.2;
    orb.scale.setScalar(1 + Math.sin(t * 0.8) * 0.02);
    core.rotation.y = -t * 0.4 * speedMul;
    core.rotation.x =  t * 0.3 * speedMul;

    halo.material.opacity = 0.7 + Math.sin(t * 0.9) * 0.15;

    ring1.rotation.z =  t * 0.1 * speedMul;
    ring2.rotation.z = -t * 0.07 * speedMul;
    ring3.rotation.x = Math.PI / 2.5 + Math.sin(t * 0.3) * 0.2;

    nodeData.forEach((n) => {
      n.theta += n.thetaSpeed;
      n.phi   += n.phiSpeed;
      const r = n.baseRadius + Math.sin(t * 0.5 + n.wobble) * 0.08;
      const x = r * Math.sin(n.phi) * Math.cos(n.theta);
      const y = r * Math.sin(n.phi) * Math.sin(n.theta);
      const z = r * Math.cos(n.phi);
      n.mesh.position.set(x, y, z);
      n.glow.position.set(x, y, z);
      n.glow.material.opacity = 0.6 + Math.sin(t * 1.2 + n.wobble) * 0.25;
    });
    nodeGroup.rotation.y = t * 0.04 * speedMul;
    nodeGroup.rotation.x = Math.sin(t * 0.05) * 0.1;

    updateLines();

    camera.position.z = 9 + scrollProgress * 3;
    camera.position.y = -scrollProgress * 1.2;
    camera.lookAt(0, 0, 0);

    stars.rotation.y = t * 0.01;

    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  }
  tick();

  return {
    destroy() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('mousemove', onMouse);
      window.removeEventListener('scroll', onScroll);
      renderer.dispose();
      if (renderer.domElement.parentNode === el) {
        el.removeChild(renderer.domElement);
      }
    },
  };
}

export default function Hero3D() {
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const scene = mountScene(el, DEFAULT_PALETTE, 1.0, 1.0);
    return () => scene.destroy();
  }, []);

  return <div ref={canvasRef} style={{ position: 'absolute', inset: 0, zIndex: 0 }} />;
}
