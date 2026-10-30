/* One persistent GPU particle system that morphs between six shapes as you scroll.
   Original code. Three.js r169 (MIT) for WebGL plumbing only. */
import * as THREE from '../vendor/three.module.min.js';

const root = document.documentElement;
const canvas = document.getElementById('gl');
const RM = root.classList.contains('rm');
const MOBILE = matchMedia('(max-width: 820px)').matches || matchMedia('(pointer: coarse)').matches;
const LOW = (navigator.hardwareConcurrency || 8) <= 4;
const N = MOBILE || LOW ? 14000 : 32000;
const SHAPES = 6;

function webglOK() {
  try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); }
  catch (e) { return false; }
}

/* ---------- deterministic RNG + shape generators (object space, ~±1.8 units) ---------- */
let seed = 1337;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const gauss = () => { let u = 0, v = 0; while (u === 0) u = rnd(); v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.2831853 * v); };

function glyphPixels(text, font, w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d', { willReadFrequently: true });
  x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle';
  try { x.fontStretch = 'expanded'; } catch (e) { /* older browsers */ }
  x.font = font; x.fillText(text, w / 2, h / 2 + h * 0.04);
  const d = x.getImageData(0, 0, w, h).data, px = [];
  for (let j = 0; j < h; j += 2) for (let i = 0; i < w; i += 2) if (d[(j * w + i) * 4 + 3] > 140) px.push(i, j);
  return px;
}
function fromGlyph(px, w, h, height) {
  const n = px.length / 2;
  if (!n) return () => [gauss() * .5, gauss() * .5, 0];
  const k = height / h;
  return () => { const i = (rnd() * n) | 0; return [(px[i * 2] - w / 2 + rnd() * 2) * k, -(px[i * 2 + 1] - h / 2 + rnd() * 2) * k, (rnd() - .5) * .22]; };
}

function makeShapes(dust) {
  const out = [];
  // 0 hero: "IZ" initials
  const g0 = glyphPixels('IZ', '900 250px Archivo, Arial Black, Arial, sans-serif', 640, 300);
  const s0 = fromGlyph(g0, 640, 300, 2.6);
  out.push(i => dust[i] ? null : s0());
  // 1 stats: four bar columns on a base grid
  const hs = [1.15, 2.2, 1.55, 1.85];
  out.push(i => {
    if (dust[i]) return null;
    const r = rnd();
    if (r < .18) return [(rnd() - .5) * 3.6, -1.1, (rnd() - .5) * 1.2];
    const b = (rnd() * 4) | 0, w = .5, cx = (b - 1.5) * .85, h = hs[b];
    const face = rnd();
    let x = (rnd() - .5) * w, y = rnd() * h, z = (rnd() - .5) * w;
    if (face < .5) { if (rnd() < .5) x = Math.sign(x || 1) * w / 2; else z = Math.sign(z || 1) * w / 2; }
    else if (face < .65) y = h;
    return [cx + x, -1.1 + y, z];
  });
  // 2 works: laptop with a </> glyph on screen
  const g2 = glyphPixels('</>', '800 170px JetBrains Mono, Consolas, monospace', 520, 220);
  const s2 = fromGlyph(g2, 520, 220, 1.05);
  const tilt = -0.22, sw = 2.7, sh = 1.7, by = -.62;
  const onScreen = (u, v) => [u, by + v * Math.cos(tilt), v * Math.sin(tilt)]; // leans back, away from camera
  out.push(i => {
    if (dust[i]) return null;
    const r = rnd();
    if (r < .34) { // screen bezel
      const t = rnd() * 2 * (sw + sh); let u, v;
      if (t < sw) { u = t - sw / 2; v = 0; } else if (t < sw + sh) { u = sw / 2; v = t - sw; } else if (t < 2 * sw + sh) { u = t - sw - sh - sw / 2; v = sh; } else { u = -sw / 2; v = t - 2 * sw - sh; }
      const p = onScreen(u + gauss() * .012, v + gauss() * .012); return p;
    }
    if (r < .66) { const q = s2(); const p = onScreen(q[0], q[1] + sh / 2); p[2] += q[2] * .3; return p; }
    // keyboard deck: key grid + edge
    const kx = Math.round((rnd() - .5) * 14) / 14 * 2.6, kz = Math.round(rnd() * 6) / 6 * 1.25;
    if (rnd() < .3) { const t = rnd(); return [(t - .5) * 2.9, by - .02, .05 + 1.45 * (rnd() < .5 ? 0 : 1)]; }
    return [kx + (rnd() - .5) * .09, by - .02, .15 + kz + (rnd() - .5) * .09];
  });
  // 3 skills: node network
  const nodes = []; for (let k = 0; k < 46; k++) { const t = rnd() * 6.283, u = rnd() * 2 - 1, rr = 1.05 + rnd() * .7, s = Math.sqrt(1 - u * u); nodes.push([Math.cos(t) * s * rr * 1.15, u * rr * .95, Math.sin(t) * s * rr]); }
  const edges = []; nodes.forEach((a, ia) => {
    nodes.map((b, ib) => [ib, (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2]).sort((p, q) => p[1] - q[1]).slice(1, 4).forEach(([ib]) => { if (ia < ib) edges.push([ia, ib]); else if (!edges.some(e => e[0] === ib && e[1] === ia)) edges.push([ib, ia]); });
  });
  out.push(i => {
    if (dust[i]) return null;
    if (rnd() < .36) { const n = nodes[(rnd() * nodes.length) | 0], s = .045; return [n[0] + gauss() * s, n[1] + gauss() * s, n[2] + gauss() * s]; }
    const [a, b] = edges[(rnd() * edges.length) | 0], t = rnd(), A = nodes[a], B = nodes[b];
    return [A[0] + (B[0] - A[0]) * t + gauss() * .008, A[1] + (B[1] - A[1]) * t + gauss() * .008, A[2] + (B[2] - A[2]) * t + gauss() * .008];
  });
  // 4 experience: double helix
  out.push(i => {
    if (dust[i]) return null;
    const turns = 2.4, H = 3.6, R = .72;
    if (rnd() < .3) { const k = (rnd() * 30) | 0, t = (k + .5) / 30, a = t * turns * 6.283, s = rnd() * 2 - 1; return [Math.cos(a) * R * s, (t - .5) * H, Math.sin(a) * R * s]; }
    const t = rnd(), a = t * turns * 6.283 + (rnd() < .5 ? 0 : Math.PI);
    return [Math.cos(a) * R + gauss() * .025, (t - .5) * H + gauss() * .02, Math.sin(a) * R + gauss() * .025];
  });
  // 5 contact: globe with graticule and an orbit ring
  out.push(i => {
    if (dust[i]) return null;
    const R = 1.45, r = rnd();
    if (r < .2) { const a = rnd() * 6.283, rr = 2.15 + gauss() * .015; const x = Math.cos(a) * rr, z = Math.sin(a) * rr; const c = Math.cos(.42), s = Math.sin(.42); return [x, z * s, z * c]; }
    if (r < .48) {
      if (rnd() < .5) { const m = ((rnd() * 9) | 0) / 9 * Math.PI, t = rnd() * 6.283; return [Math.cos(t) * Math.cos(m) * R, Math.sin(t) * R, Math.cos(t) * Math.sin(m) * R]; }
      const l = (((rnd() * 5) | 0) - 2) * .5, t = rnd() * 6.283, rr = Math.cos(l) * R; return [Math.cos(t) * rr, Math.sin(l) * R, Math.sin(t) * rr];
    }
    const u = rnd() * 2 - 1, t = rnd() * 6.283, s = Math.sqrt(1 - u * u), rr = R * (.985 + rnd() * .03); return [Math.cos(t) * s * rr, u * rr, Math.sin(t) * s * rr];
  });
  return out;
}

/* ---------- shaders (NaN-safe: no pow/atan/log of runtime values, all divisors max()'d) ---------- */
const VERT = `
attribute vec3 p1; attribute vec3 p2; attribute vec3 p3; attribute vec3 p4; attribute vec3 p5; attribute vec4 aRnd;
uniform float uP, uTime, uSize, uPR, uMotion, uAlpha; uniform vec2 uMouse;
varying vec3 vCol; varying float vA;
vec3 pick(float i){ if(i<.5) return position; if(i<1.5) return p1; if(i<2.5) return p2; if(i<3.5) return p3; if(i<4.5) return p4; return p5; }
vec3 spin(vec3 v, float a){ float c=cos(a), s=sin(a); return vec3(c*v.x+s*v.z, v.y, -s*v.x+c*v.z); }
void main(){
  float P = clamp(uP, 0., 4.9999);
  float seg = floor(P); float f = P - seg;
  float st = aRnd.y * .4;
  float k = smoothstep(st, st + .6, f);
  vec3 A = pick(seg), B = pick(seg + 1.);
  float spA = seg > 2.5 ? uTime * .22 * uMotion : 0.;
  float spB = seg + 1. > 2.5 ? uTime * .22 * uMotion : 0.;
  A = spin(A, spA); B = spin(B, spB);
  vec3 pos = mix(A, B, k);
  float tr = sin(k * 3.14159265);
  float ph = aRnd.z * 6.2831853;
  pos += tr * 0.75 * vec3(sin(ph + uTime * .7 * uMotion + pos.y * 1.7), cos(aRnd.w * 6.2831853 + uTime * .6 * uMotion), sin(ph * 1.3 + pos.x * 1.3));
  pos += (0.035 + aRnd.x * .02) * uMotion * vec3(sin(uTime * .9 + aRnd.x * 40.), cos(uTime * .75 + aRnd.y * 40.), sin(uTime * .6 + aRnd.z * 40.));
  pos.xy += uMouse * (0.08 + aRnd.w * .12) * (pos.z * .5 + .5);
  vec4 mv = modelViewMatrix * vec4(pos, 1.);
  float d = max(-mv.z, .1);
  float sz = uSize * uPR * (.55 + aRnd.w * .9) * (6. / d) * (1. + tr * .6);
  gl_PointSize = clamp(sz, 1., 48.);
  gl_Position = projectionMatrix * mv;
  float white = step(.88, aRnd.x);
  vec3 red = vec3(1., .0, .2) * (.65 + aRnd.z * .55);
  vCol = mix(red, vec3(1., .92, .94), white);
  vA = uAlpha * 1.55 * (.45 + .55 * aRnd.y) * (1. - tr * .35) * clamp(1.4 - d * .12, .25, 1.);
}`;
const FRAG = `
precision mediump float;
varying vec3 vCol; varying float vA;
void main(){
  vec2 c = gl_PointCoord - .5; float r = dot(c, c) * 4.;
  float a = clamp(1. - r, 0., 1.); a *= a;
  if (a < .01) discard;
  gl_FragColor = vec4(vCol * a * clamp(vA, 0., 1.), 1.);
}`;

/* ---------- layout per shape (fraction of half-width / half-height) ---------- */
const LAY_D = [ { x: .42, y: .02, s: 1.0, a: 1 }, { x: .38, y: -.05, s: .78, a: .62 }, { x: .44, y: .02, s: .86, a: .5 }, { x: .45, y: 0, s: 1.0, a: .85 }, { x: .5, y: 0, s: .95, a: .85 }, { x: 0, y: .02, s: 1.1, a: .75 } ];
const LAY_M = [ { x: .42, y: -.36, s: .62, a: .5 }, { x: 0, y: .1, s: .6, a: .45 }, { x: 0, y: .2, s: .62, a: .35 }, { x: 0, y: .15, s: .75, a: .5 }, { x: 0, y: .1, s: .7, a: .45 }, { x: 0, y: .05, s: .85, a: .45 } ];
const sm = t => t * t * (3 - 2 * t);

async function init() {
  if (!canvas || !webglOK()) { root.classList.add('no-gl'); return; }
  // wait (briefly) for the display fonts so the glyphs sample the real typeface
  if (document.fonts && document.fonts.load) {
    await Promise.race([Promise.all([document.fonts.load('900 250px Archivo'), document.fonts.load('800 170px "JetBrains Mono"')]).catch(() => {}), new Promise(r => setTimeout(r, 1800))]);
  }
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: false });
  } catch (e) { root.classList.add('no-gl'); return; }
  renderer.setClearColor(0x000000, 1);
  const PR = Math.min(window.devicePixelRatio || 1, MOBILE ? 1.5 : 1.75);
  renderer.setPixelRatio(PR);

  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(40, 1, .1, 50); cam.position.set(0, 0, 6);

  // geometry
  const dust = new Uint8Array(N); for (let i = 0; i < N; i++) dust[i] = rnd() < .2 ? 1 : 0;
  const dustPos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { dustPos[i * 3] = (rnd() - .5) * 9; dustPos[i * 3 + 1] = (rnd() - .5) * 5.5; dustPos[i * 3 + 2] = (rnd() - .5) * 4 - .5; }
  const gens = makeShapes(dust);
  const geo = new THREE.BufferGeometry();
  const names = ['position', 'p1', 'p2', 'p3', 'p4', 'p5'];
  gens.forEach((gen, s) => {
    const a = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const p = gen(i) || [dustPos[i * 3] + gauss() * .05 * s, dustPos[i * 3 + 1] + gauss() * .05 * s, dustPos[i * 3 + 2]];
      a[i * 3] = isFinite(p[0]) ? p[0] : 0; a[i * 3 + 1] = isFinite(p[1]) ? p[1] : 0; a[i * 3 + 2] = isFinite(p[2]) ? p[2] : 0;
    }
    geo.setAttribute(names[s], new THREE.BufferAttribute(a, 3));
  });
  const r4 = new Float32Array(N * 4);
  for (let i = 0; i < N; i++) { r4[i * 4] = dust[i] ? rnd() * .8 : rnd(); r4[i * 4 + 1] = dust[i] ? rnd() * .45 : rnd(); r4[i * 4 + 2] = rnd(); r4[i * 4 + 3] = rnd(); }
  geo.setAttribute('aRnd', new THREE.BufferAttribute(r4, 4));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 10);

  const U = { uP: { value: 0 }, uTime: { value: 0 }, uSize: { value: MOBILE ? 2.7 : 2.3 }, uPR: { value: PR }, uMotion: { value: RM ? 0 : 1 }, uAlpha: { value: 1 }, uMouse: { value: new THREE.Vector2() } };
  const mat = new THREE.ShaderMaterial({ uniforms: U, vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; scene.add(pts);

  // scroll → target progress
  const secs = Array.from(document.querySelectorAll('[data-shape]')).sort((a, b) => a.dataset.shape - b.dataset.shape);
  let anchors = [], vw = 1, vh = 1, halfH = 1, halfW = 1, lay = MOBILE ? LAY_M : LAY_D;
  function measure() {
    vw = canvas.clientWidth || innerWidth; vh = canvas.clientHeight || innerHeight;
    renderer.setSize(vw, vh, false); cam.aspect = vw / Math.max(1, vh); cam.updateProjectionMatrix();
    halfH = Math.tan(THREE.MathUtils.degToRad(20)) * 6; halfW = halfH * cam.aspect;
    lay = vw <= 820 ? LAY_M : LAY_D;
    anchors = secs.map((s, i) => { if (i === 0) return 0; const r = s.getBoundingClientRect(); return Math.max(0, r.top + scrollY + Math.min(r.height, vh) / 2 - vh * .62); });
    dirty = true;
  }
  function targetP() {
    const y = scrollY;
    for (let i = SHAPES - 2; i >= 0; i--) {
      if (y >= anchors[i]) {
        const a = anchors[i], b = anchors[i + 1], W = Math.max(1, Math.min(vh * .9, (b - a) * .65));
        return i + Math.max(0, Math.min(1, (y - (b - W)) / W));
      }
    }
    return 0;
  }
  let p = 0, dirty = true, mouseT = [0, 0], mouse = [0, 0];
  if (!RM) addEventListener('pointermove', e => { mouseT = [(e.clientX / Math.max(1, innerWidth)) * 2 - 1, -((e.clientY / Math.max(1, innerHeight)) * 2 - 1)]; }, { passive: true });
  addEventListener('resize', () => { clearTimeout(measure.t); measure.t = setTimeout(measure, 120); });
  addEventListener('scroll', () => { dirty = true; if (RM) kick(); }, { passive: true });
  if ('ResizeObserver' in window) new ResizeObserver(() => { clearTimeout(measure.t); measure.t = setTimeout(measure, 120); }).observe(document.body);
  measure();
  p = RM ? Math.round(targetP()) : targetP();

  function applyLayout() {
    const P = Math.max(0, Math.min(SHAPES - 1, p)), i = Math.min(SHAPES - 2, Math.floor(P)), f = sm(P - i), A = lay[i], B = lay[i + 1];
    const L = k => A[k] + (B[k] - A[k]) * f;
    const base = Math.min(halfH, halfW * 1.1) / 2.05;
    pts.position.set(L('x') * halfW, L('y') * halfH, 0);
    pts.scale.setScalar(L('s') * base);
    U.uAlpha.value = L('a');
    U.uP.value = P;
  }

  // loop with pause on hidden tab / context loss
  let raf = 0, last = performance.now(), t = 0, running = false, lost = false, losses = 0, frames = 0, slow = 0, dead = false;
  function frame(now) {
    raf = 0; if (!running || lost || dead) return;
    const dt = Math.min(.05, Math.max(0, (now - last) / 1000)); last = now;
    if (!RM) {
      t += dt;
      const tp = targetP(); p += (tp - p) * (1 - Math.exp(-dt * 4.2)); if (Math.abs(tp - p) < 1e-4) p = tp;
      mouse[0] += (mouseT[0] - mouse[0]) * (1 - Math.exp(-dt * 3)); mouse[1] += (mouseT[1] - mouse[1]) * (1 - Math.exp(-dt * 3));
      U.uTime.value = t; U.uMouse.value.set(mouse[0], mouse[1]);
      pts.rotation.y = Math.sin(t * .23) * .22 + mouse[0] * .32; pts.rotation.x = -mouse[1] * .16 + Math.sin(t * .17) * .04;
    } else { p = Math.round(targetP()); }
    applyLayout();
    renderer.render(scene, cam);
    if (frames++ === 0) root.classList.add('gl-on');
    // adaptive quality: if the first ~90 frames are slow, draw half the points
    if (frames < 90 && dt > .045) slow++;
    if (frames === 90 && slow > 45) geo.setDrawRange(0, Math.floor(N / 2));
    if (!RM) raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf && running && !lost && !dead) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  function start() { running = true; kick(); }
  function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }
  document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());
  if (RM) addEventListener('resize', () => setTimeout(kick, 150));

  let lostTimer = 0;
  canvas.addEventListener('webglcontextlost', e => {
    e.preventDefault(); lost = true; losses++; stop(); root.classList.add('gl-lost');
    clearTimeout(lostTimer);
    lostTimer = setTimeout(() => { if (lost) giveUp(); }, 5000);
    if (losses >= 3) giveUp();
  });
  canvas.addEventListener('webglcontextrestored', () => {
    if (dead) return;
    lost = false; clearTimeout(lostTimer); root.classList.remove('gl-lost');
    measure(); if (!document.hidden) start();
  });
  function giveUp() {
    dead = true; stop(); clearTimeout(lostTimer);
    root.classList.remove('gl-on'); root.classList.add('no-gl', 'gl-lost');
    try { geo.dispose(); mat.dispose(); renderer.dispose(); } catch (e) { /* ignore */ }
  }
  window.__gl = { lose: () => renderer.getContext().getExtension('WEBGL_lose_context'), get p() { return p; } };
  if (!document.hidden) start();
}

init().catch(err => { root.classList.add('no-gl'); console.warn('3D disabled:', err && err.message); });
