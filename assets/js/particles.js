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

let GLYPH = { w: 2.9, h: 1.7, cx: 0, cy: 0 };
function makeShapes(dust) {
  const out = [];
  // 0 hero: "IZ" initials
  const g0 = glyphPixels('IZ', '700 250px Fredoka, "Arial Rounded MT Bold", Arial, sans-serif', 640, 300);
  const s0 = fromGlyph(g0, 640, 300, 2.6);
  { // ink bounds of the initials in local units (used to fit the mobile hero glyph into free space)
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; const k = 2.6 / 300;
    for (let i = 0; i < g0.length; i += 2) { const x = g0[i], y = g0[i + 1]; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 > x0 && y1 > y0) GLYPH = { w: (x1 - x0 + 2) * k, h: (y1 - y0 + 2) * k, cx: ((x0 + x1) / 2 - 320) * k, cy: -((y0 + y1) / 2 - 150) * k };
  }
  out.push(i => dust[i] ? null : s0());
  // 1 stats: an original round creature (big eyes, pointy ears, curly leaf tail, sprout on top)
  const ell = (cx, cy, cz, rx, ry, rz) => { const u = rnd() * 2 - 1, t = rnd() * 6.283, q = Math.sqrt(1 - u * u); return [cx + Math.cos(t) * q * rx, cy + u * ry, cz + Math.sin(t) * q * rz]; };
  const disc = (cx, cy, cz, r) => { const a = rnd() * 6.283, rr = Math.sqrt(rnd()) * r; return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, cz]; };
  out.push(i => {
    if (dust[i]) return null;
    const r = rnd();
    if (r < .3) return ell(0, -.55, 0, .95, .78, .72); // body
    if (r < .56) return ell(0, .5, .05, .78, .68, .66); // head
    if (r < .68) { const sd = rnd() < .5 ? -1 : 1, t = rnd(), w = (1 - t) * .26 * Math.sqrt(rnd()), a = rnd() * 6.283; // ears (cones)
      return [sd * (.42 + t * .38) + Math.cos(a) * w, 1.02 + t * .78 + Math.sin(a) * w * .4, Math.sin(a) * w * .5]; }
    if (r < .78) { const t = rnd(), a = t * 4.2, R0 = .55 * (1 - t * .55); // curly tail
      return [1.05 + Math.cos(a - 1.2) * R0 + gauss() * .04, -.75 + t * .6 + Math.sin(a - 1.2) * R0 + gauss() * .04, -.25 + gauss() * .04]; }
    if (r < .9) { const sd = rnd() < .5 ? -1 : 1; return rnd() < .8 ? disc(sd * .28, .52, .72, .16) : disc(sd * .23, .6, .74, .05); } // eyes + shine
    if (r < .94) { const sd = rnd() < .5 ? -1 : 1, t = rnd(); return [sd * .4 * Math.sin(t * 3.14) * (.5 + .5 * rnd()), 1.2 + t * .38, 0]; } // sprout leaves
    if (r < .97) { const t = rnd() * 3.14; return [Math.cos(t) * .14, .22 - Math.sin(t) * .07, .7]; } // smile
    const sd = rnd() < .5 ? -1 : 1; return ell(sd * .48, -1.28, .2, .22, .1, .2); // feet
  });
  // 2 works: laptop with a </> glyph on screen
  const g2 = glyphPixels('</>', '700 170px Fredoka, "Arial Rounded MT Bold", Arial, sans-serif', 520, 220);
  const s2 = fromGlyph(g2, 520, 220, 1.05);
  const tilt = -0.22, sw = 2.7, sh = 1.7, by = -.62;
  const onScreen = (u, v) => [u, by + v * Math.cos(tilt), v * Math.sin(tilt)]; // leans back, away from camera
  out.push(i => {
    if (dust[i]) return null;
    const r = rnd();
    if (r < .24) { // screen bezel
      const t = rnd() * 2 * (sw + sh); let u, v;
      if (t < sw) { u = t - sw / 2; v = 0; } else if (t < sw + sh) { u = sw / 2; v = t - sw; } else if (t < 2 * sw + sh) { u = t - sw - sh - sw / 2; v = sh; } else { u = -sw / 2; v = t - 2 * sw - sh; }
      const p = onScreen(u + gauss() * .012, v + gauss() * .012); return p;
    }
    if (r < .5) { const q = s2(); const p = onScreen(q[0], q[1] + sh / 2); p[2] += q[2] * .3; return p; }
    // keyboard deck, tilted toward the camera so it reads as a surface (not an edge-on line):
    // outlined key caps on a 13×5 grid with a space bar, a trackpad and the deck rim
    const deck = (x, z) => [x, by - .03 - z * .58, .06 + z * .8];
    const rect = (x0, z0, x1, z1) => { const w = x1 - x0, d = z1 - z0, t = rnd() * 2 * (w + d); let x, z;
      if (t < w) { x = x0 + t; z = z0; } else if (t < w + d) { x = x1; z = z0 + t - w; } else if (t < 2 * w + d) { x = x1 - (t - w - d); z = z1; } else { x = x0; z = z1 - (t - 2 * w - d); }
      return deck(x + gauss() * .006, z + gauss() * .006); };
    const q = rnd();
    if (q < .12) return rect(-1.45, 0, 1.45, 1.95); // deck rim
    if (q < .2) return rect(-.46, 1.38, .46, 1.84); // trackpad
    const KW = 2.6 / 11, KD = 1.15 / 4, row = (rnd() * 4) | 0; let c0 = (rnd() * 11) | 0, c1 = c0;
    if (row === 3 && c0 >= 3 && c0 <= 7) { c0 = 3; c1 = 7; } // space bar
    const x0 = -1.3 + c0 * KW + KW * .17, x1 = -1.3 + (c1 + 1) * KW - KW * .17, z0 = .1 + row * KD + KD * .2, z1 = .1 + (row + 1) * KD - KD * .2;
    if (rnd() < .9) return rect(x0, z0, x1, z1);
    return deck(x0 + rnd() * (x1 - x0), z0 + rnd() * (z1 - z0)); // a little fill so caps glow
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
  // 4 experience: a growing vine (double helix) with leaves along it
  out.push(i => {
    if (dust[i]) return null;
    const turns = 2.2, H = 3.6, R = .72;
    if (rnd() < .38) { // leaves: almond outline + midrib, pointing out from the strand
      const k = (rnd() * 22) | 0, t = (k + .5) / 22, a = t * turns * 6.283 + (k % 2 ? Math.PI : 0);
      const bx = Math.cos(a) * R, bz = Math.sin(a) * R, by = (t - .5) * H, ox = Math.cos(a), oz = Math.sin(a);
      const L = .5, u = rnd(), side = rnd() < .5 ? -1 : 1, w = rnd() < .7 ? Math.sin(u * Math.PI) * .16 * side : 0;
      return [bx + ox * u * L - oz * w * .3, by + u * L * .35 + w, bz + oz * u * L + ox * w * .3];
    }
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
  float w = aRnd.x;
  vec3 cyan = mix(vec3(.0, .62, .74), vec3(.10, .83, .90), aRnd.z);
  vec3 col = cyan;
  col = mix(col, vec3(.02, .38, .52), step(.62, w) * step(w, .74));   // deep teal for contrast
  col = mix(col, vec3(1., .99, .96), step(.86, w));                    // soft white sparkle
  col = mix(col, vec3(1., .80, .25), step(.955, w));                   // sun yellow
  col = mix(col, vec3(.42, .80, .37), step(.93, w) * step(w, .955));   // grass green
  vCol = col;
  vA = uAlpha * 1.7 * (.55 + .45 * aRnd.y) * (1. - tr * .35) * clamp(1.4 - d * .12, .25, 1.);
}`;
const FRAG = `
precision mediump float;
varying vec3 vCol; varying float vA;
void main(){
  vec2 c = gl_PointCoord - .5; float r = dot(c, c) * 4.;
  float a = clamp(1. - r, 0., 1.); a *= a;
  if (a < .01) discard;
  float al = a * clamp(vA, 0., 1.);
  gl_FragColor = vec4(vCol, al);
}`;

/* ---------- layout per shape (fraction of half-width / half-height) ---------- */
const LAY_D = [ { x: .42, y: .02, s: 1.0, a: 1 }, { x: .38, y: -.05, s: .78, a: .62 }, { x: .45, y: .31, s: .6, a: .72 }, { x: .45, y: 0, s: 1.0, a: .85 }, { x: .5, y: 0, s: .95, a: .85 }, { x: 0, y: .02, s: 1.1, a: .75 } ];
const LAY_M = [ { x: .42, y: -.36, s: .62, a: .5 }, { x: 0, y: .1, s: .6, a: .45 }, { x: 0, y: .2, s: .62, a: .35 }, { x: 0, y: .15, s: .75, a: .5 }, { x: 0, y: .1, s: .7, a: .45 }, { x: 0, y: .05, s: .85, a: .45 } ];
const sm = t => t * t * (3 - 2 * t);

async function init() {
  if (!canvas || !webglOK()) { root.classList.add('no-gl'); return; }
  // wait (briefly) for the display fonts so the glyphs sample the real typeface
  if (document.fonts && document.fonts.load) {
    await Promise.race([Promise.all([document.fonts.load('700 250px Fredoka')]).catch(() => {}), new Promise(r => setTimeout(r, 1800))]);
  }
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: false });
  } catch (e) { root.classList.add('no-gl'); return; }
  renderer.setClearColor(0x000000, 0); // transparent: the CSS sky shows through
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

  const U = { uP: { value: 0 }, uTime: { value: 0 }, uSize: { value: MOBILE ? 3.0 : 2.6 }, uPR: { value: PR }, uMotion: { value: RM ? 0 : 1 }, uAlpha: { value: 1 }, uMouse: { value: new THREE.Vector2() } };
  const mat = new THREE.ShaderMaterial({ uniforms: U, vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, depthTest: false, blending: THREE.NormalBlending });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; scene.add(pts);

  // scroll → target progress
  const secs = Array.from(document.querySelectorAll('[data-shape]')).sort((a, b) => a.dataset.shape - b.dataset.shape);
  let anchors = [], vw = 1, vh = 1, halfH = 1, halfW = 1, lay = MOBILE ? LAY_M : LAY_D;
  function measure() {
    vw = canvas.clientWidth || innerWidth; vh = canvas.clientHeight || innerHeight;
    renderer.setSize(vw, vh, false); cam.aspect = vw / Math.max(1, vh); cam.updateProjectionMatrix();
    halfH = Math.tan(THREE.MathUtils.degToRad(20)) * 6; halfW = halfH * cam.aspect;
    lay = vw <= 820 ? LAY_M : LAY_D;
    if (lay === LAY_M) fitHeroGlyph();
    anchors = secs.map((s, i) => { if (i === 0) return 0; const r = s.getBoundingClientRect(); return Math.max(0, r.top + scrollY + Math.min(r.height, vh) / 2 - vh * .62); });
    dirty = true;
  }
  // mobile: put the "IZ" initials in the empty space right of the facts + buttons (never behind text);
  // fall back to the gap above the eyebrow, and only then to a faint backdrop
  const LAY_M0 = { ...LAY_M[0] };
  function fitHeroGlyph() {
    const L0 = LAY_M[0]; Object.assign(L0, LAY_M0);
    const hero = document.getElementById('top'); if (!hero) return;
    const base = Math.min(halfH, halfW * 1.1) / 2.05, pxPerU = vw / (2 * halfW), gw = GLYPH.w * base * pxPerU, gh = GLYPH.h * base * pxPerU; // glyph px size at s=1
    if (!(gw > 0 && gh > 0)) return;
    const sy = scrollY, rect = el => { const r = el.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top + sy, b: r.bottom + sy }; };
    const textRect = el => { try { const rg = document.createRange(); rg.selectNodeContents(el); const r = rg.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top + sy, b: r.bottom + sy }; } catch (e) { return rect(el); } };
    const lis = [...hero.querySelectorAll('.hero__facts li')].map(textRect), btns = [...hero.querySelectorAll('.hero__cta .btn')].map(rect);
    const place = (cx, cy, s, a) => { if (![cx, cy, s].every(isFinite)) return false; L0.x = (cx - vw / 2) / (vw / 2) - GLYPH.cx * s * base / halfW; L0.y = (vh / 2 - cy) / (vh / 2) - GLYPH.cy * s * base / halfH; L0.s = s; L0.a = a; return true; };
    const M = 22, fit = .8; // margin px, and headroom for the idle sway rotation
    // candidate column right of the buttons plus the last k fact lines; keep the one that fits the biggest glyph
    let best = null;
    for (let k = 0; k <= lis.length; k++) {
      const items = btns.concat(lis.slice(lis.length - k)).filter(r => r.r > r.l); if (!items.length) continue;
      const right = Math.max(...items.map(r => r.r)), top = Math.min(...items.map(r => r.t)) - (k ? 0 : M), bot = Math.max(...items.map(r => r.b));
      const aw = vw - M - (right + M), ah = Math.min(bot, vh) - top, sc = Math.min(.62, aw * fit / gw, ah * fit / gh);
      if (aw > 0 && ah > 0 && bot <= vh + 40 && (!best || sc > best.sc)) best = { sc, cx: right + M + aw / 2, cy: top + ah / 2 };
    }
    if (best && best.sc * gw >= 100 && place(best.cx, best.cy, best.sc, .8)) return;
    const eb = hero.querySelector('.eyebrow'), hd = document.querySelector('header');
    if (eb) {
      const t0 = hd ? hd.getBoundingClientRect().bottom + sy : 0, t1 = rect(eb).t, ah = t1 - t0 - 2 * M;
      const s = Math.min(.5, ah * fit / gh, (vw - 2 * M) * fit / gw);
      if (ah >= 56 && s * gw >= 90 && place(vw / 2, t0 + M + ah / 2, s, .7)) return;
    }
    L0.a = .3; // faint backdrop as a last resort
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
