import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const STAGES = {
  nokki: {
    file: 'models/nokki.glb',
    label: 'Nokki',
    hint: 'Stage 1 · plush wisp coat',
    order: 0,
    fur: {
      sheen: 0.92,
      sheenRoughness: 0.62,
      sheenColor: 0xc4cce0,
      roughness: 0.78,
      coatLift: 0.06,
      anisotropy: 0.72,
      shells: 3,
      shellSpread: 0.014,
      envIntensity: 1.35,
      aoLift: 0.22,
    },
  },
  nokkane: {
    file: 'models/nokkane.glb',
    label: 'Nokkane',
    hint: 'Stage 2 · short living-shadow fur',
    order: 1,
    fur: {
      sheen: 0.58,
      sheenRoughness: 0.42,
      sheenColor: 0x9aa8c8,
      roughness: 0.68,
      coatLift: 0.04,
      anisotropy: 0.55,
      shells: 2,
      shellSpread: 0.009,
      envIntensity: 1.25,
      aoLift: 0.18,
    },
  },
  nokkara: {
    file: 'models/nokkara.glb',
    label: 'Nokkara',
    hint: 'Stage 3 · dense mane (loading may take a moment)',
    order: 2,
    sculpt: true,
    fur: {
      sheen: 0.88,
      sheenRoughness: 0.48,
      sheenColor: 0xd8dce8,
      bodySheen: 0.42,
      bodyColor: 0x38324a,
      maneColor: 0xc4cad8,
      roughness: 0.62,
      coatLift: 0.05,
      anisotropy: 0.78,
      shells: 2,
      shellSpread: 0.011,
      envIntensity: 1.45,
      mobileShells: 1,
      shellMeshBudget: 6,
      triangleShellCap: 45000,
    },
  },
};

const host = document.getElementById('canvas-host');
const loadingEl = document.getElementById('loading');
const loadMsg = document.getElementById('load-msg');
const loadHint = document.getElementById('load-hint');
const loadBar = document.getElementById('load-bar');
const stageButtons = [...document.querySelectorAll('.stage-btn')];
const lightButtons = [...document.querySelectorAll('.light-btn')];
const btnRotate = document.getElementById('btn-rotate');
const btnReset = document.getElementById('btn-reset');

const LIGHT_STORAGE_KEY = 'nokki-preview-light';

/** @typedef {{ mapMul: number, midLift: number, glow: number, floor: number }} CoatOpts */

const LIGHT_PRESETS = {
  studio: {
    id: 'studio',
    label: 'Studio · bright',
    exposure: { mobile: 1.85, desktop: 1.55 },
    fog: { color: 0x3a4058, density: 0.012 },
    bg: 0x4a5068,
    coatTint: [1.15, 1.16, 1.22],
    emissiveIntensity: 2.1,
    coat: { mapMul: 2.35, midLift: 0.38, glow: 4.2, floor: 0.2 },
    envIntensity: 1.4,
    envPanels: [
      [0xffffff, 2.05, -6, 4, 2, 0, 1.1, 0],
      [0xf0e8ff, 1.35, 6, 3, -3, 0, -1.6, 0],
      [0xf8faff, 1.55, 0, 7, 0, -1.57, 0, 0],
      [0x585068, 0.55, 0, -4, 0, 1.57, 0, 0],
    ],
    lights: {
      ambient: [0xe4e8f8, 1.05],
      hemi: { sky: 0xf8f8ff, ground: 0x6e6888, int: 1.75 },
      moonKey: { color: 0xffffff, int: 3.1, pos: [-3.5, 6.5, 4.5] },
      moonFill: { color: 0xf0f4ff, int: 0.95, pos: [2, 3, 5] },
      violetRim: { color: 0xb898e8, int: 0.75, pos: [4.5, 2.5, -5] },
      softFront: { color: 0xfffaf5, int: 1.65, pos: [0, 1.2, 3.2] },
      faceLift: { color: 0xffffff, int: 2.1, pos: [0.2, 1.3, 2.6] },
      rigFront: { color: 0xffffff, int: 2.4, pos: [0, 1.05, 3.8] },
    },
    shadows: true,
  },
  moonlit: {
    id: 'moonlit',
    label: 'Moonlit · void',
    exposure: { mobile: 1.72, desktop: 1.42 },
    fog: { color: 0x08081c, density: 0.022 },
    bg: 0x060612,
    coatTint: [0.92, 0.96, 1.18],
    emissiveIntensity: 2.85,
    coat: { mapMul: 3.05, midLift: 0.55, glow: 7.2, floor: 0.22 },
    envIntensity: 1.15,
    envPanels: [
      [0xe8ecff, 1.75, -6, 4, 2, 0, 1.1, 0],
      [0x8b6ac8, 1.25, 6, 2, -4, 0, -1.6, 0],
      [0xb0bcd8, 1.05, 0, 6, 0, -1.57, 0, 0],
      [0x3d3550, 0.55, 0, -4, 0, 1.57, 0, 0],
    ],
    lights: {
      ambient: [0xc8d0e8, 0.82],
      hemi: { sky: 0xe8ecff, ground: 0x322a40, int: 1.48 },
      moonKey: { color: 0xd8e4ff, int: 2.55, pos: [-3.5, 6.5, 4.5] },
      moonFill: { color: 0xa8b8d8, int: 0.72, pos: [2, 3, 5] },
      violetRim: { color: 0x7b58b8, int: 1.15, pos: [4.5, 2.5, -5] },
      softFront: { color: 0xc0cce8, int: 1.35, pos: [0, 1, 3] },
      faceLift: { color: 0xe8ecff, int: 1.85, pos: [0.4, 1.35, 2.8] },
      rigFront: { color: 0xdce4f8, int: 2.0, pos: [0, 1.1, 3.6] },
    },
    shadows: true,
  },
  violet: {
    id: 'violet',
    label: 'Violet · awakened',
    exposure: { mobile: 1.68, desktop: 1.38 },
    fog: { color: 0x280838, density: 0.02 },
    bg: 0x1a0828,
    coatTint: [1.08, 0.88, 1.32],
    emissiveIntensity: 3.4,
    coat: { mapMul: 2.9, midLift: 0.5, glow: 8.5, floor: 0.21 },
    envIntensity: 1.28,
    envPanels: [
      [0xc8b0ff, 1.95, -5, 4, 2, 0, 1.0, 0],
      [0x9a5ce0, 1.65, 6, 2.5, -4, 0, -1.5, 0],
      [0x8868c0, 0.95, 0, 6, 0, -1.57, 0, 0],
      [0x2a1c38, 0.5, 0, -4, 0, 1.57, 0, 0],
    ],
    lights: {
      ambient: [0xb8a0e8, 0.75],
      hemi: { sky: 0xc8b0ff, ground: 0x281838, int: 1.38 },
      moonKey: { color: 0xc0b0f0, int: 2.1, pos: [-3, 6, 4] },
      moonFill: { color: 0x9060d8, int: 0.85, pos: [3, 2, 4] },
      violetRim: { color: 0xc878ff, int: 2.05, pos: [4, 2, -5] },
      softFront: { color: 0xa890e0, int: 1.1, pos: [0, 1, 3] },
      faceLift: { color: 0xd8b0ff, int: 1.75, pos: [0, 1.3, 2.5] },
      rigFront: { color: 0xe0c0ff, int: 1.9, pos: [0, 1.1, 3.5] },
    },
    shadows: true,
  },
  warm: {
    id: 'warm',
    label: 'Soft · indoor',
    exposure: { mobile: 1.75, desktop: 1.46 },
    fog: { color: 0x382818, density: 0.016 },
    bg: 0x4a3828,
    coatTint: [1.22, 1.1, 0.92],
    emissiveIntensity: 2.4,
    coat: { mapMul: 2.75, midLift: 0.46, glow: 5.8, floor: 0.19 },
    envIntensity: 1.22,
    envPanels: [
      [0xfff0e0, 1.65, -5, 4, 2, 0, 1.0, 0],
      [0xe0d0c0, 1.1, 5, 3, -3, 0, -1.4, 0],
      [0xfff8f0, 1.25, 0, 6, 0, -1.57, 0, 0],
      [0x403838, 0.45, 0, -4, 0, 1.57, 0, 0],
    ],
    lights: {
      ambient: [0xf0e8e0, 0.88],
      hemi: { sky: 0xfff8f0, ground: 0x504840, int: 1.52 },
      moonKey: { color: 0xfff8f0, int: 2.4, pos: [-3.5, 6, 4.5] },
      moonFill: { color: 0xffe8d8, int: 0.65, pos: [2, 3, 5] },
      violetRim: { color: 0xa888c8, int: 0.55, pos: [4.5, 2.5, -5] },
      softFront: { color: 0xfff4e8, int: 1.55, pos: [0, 1.1, 3.2] },
      faceLift: { color: 0xffffff, int: 1.95, pos: [0.2, 1.35, 2.6] },
      rigFront: { color: 0xfff8f0, int: 2.15, pos: [0, 1.05, 3.7] },
    },
    shadows: true,
  },
};

function loadStoredLightId() {
  try {
    const id = localStorage.getItem(LIGHT_STORAGE_KEY);
    if (id && LIGHT_PRESETS[id]) return id;
  } catch {
    /* private mode */
  }
  return 'studio';
}

let activeLightId = loadStoredLightId();

function getCoatOpts() {
  return LIGHT_PRESETS[activeLightId].coat;
}

function getExposure() {
  const p = LIGHT_PRESETS[activeLightId];
  return MOBILE ? p.exposure.mobile : p.exposure.desktop;
}

const MOBILE =
  matchMedia('(pointer: coarse)').matches ||
  matchMedia('(max-width: 520px)').matches;

/** Base mesh must read on OLED before any shell fuzz is worth it. */
const SHELL_FUR_ENABLED = !MOBILE;

let activeStage = 'nokki';
let autoRotate = true;
let loadToken = 0;
let defaultCam = { pos: new THREE.Vector3(), target: new THREE.Vector3() };
let envMap = null;
/** @type {Map<string, THREE.Texture>} */
const envMapCache = new Map();
/** @type {WeakMap<THREE.Texture, { map: THREE.Texture, emissiveMap: THREE.Texture }>} */
const textureLiftCache = new WeakMap();

/** @type {Map<string, THREE.Group>} */
const stageCache = new Map();

const rig = new THREE.Group();
rig.name = 'creatureRig';

const blend = {
  active: false,
  t: 0,
  duration: 0.95,
  from: null,
  to: null,
  fromWrap: null,
  toWrap: null,
  evolving: false,
};

let presentedStage = null;
let displayedInstance = null;
const framedStages = new Set();

const renderer = new THREE.WebGLRenderer({
  antialias: !MOBILE,
  alpha: false,
  powerPreference: 'high-performance',
  stencil: false,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MOBILE ? 1.65 : 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = getExposure();
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
host.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(LIGHT_PRESETS[activeLightId].bg);
scene.fog = new THREE.FogExp2(
  LIGHT_PRESETS[activeLightId].fog.color,
  LIGHT_PRESETS[activeLightId].fog.density,
);

const camera = new THREE.PerspectiveCamera(42, 1, 0.05, 120);
camera.position.set(0, 1.15, 3.2);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.rotateSpeed = 0.85;
controls.zoomSpeed = 0.9;
controls.panSpeed = 0.7;
controls.minDistance = 0.8;
controls.maxDistance = 12;
controls.maxPolarAngle = Math.PI * 0.92;
controls.target.set(0, 0.65, 0);
controls.touches = {
  ONE: THREE.TOUCH.ROTATE,
  TWO: THREE.TOUCH.DOLLY_PAN,
};

const ambient = new THREE.AmbientLight();
scene.add(ambient);

const hemi = new THREE.HemisphereLight();
scene.add(hemi);

const moonFill = new THREE.DirectionalLight();
scene.add(moonFill);

const moonKey = new THREE.DirectionalLight();
moonKey.shadow.mapSize.set(MOBILE ? 768 : 1024, MOBILE ? 768 : 1024);
moonKey.shadow.bias = -0.0002;
moonKey.shadow.normalBias = 0.02;
scene.add(moonKey);

const violetRim = new THREE.DirectionalLight();
scene.add(violetRim);

const softFront = new THREE.DirectionalLight();
scene.add(softFront);

const faceLift = new THREE.PointLight(0xffffff, 1, 12);
scene.add(faceLift);

const rigFront = new THREE.PointLight(0xffffff, 1, 14);
scene.add(rigFront);

const groundMat = new THREE.MeshPhysicalMaterial({
  color: 0x0a0810,
  roughness: 0.82,
  metalness: 0.18,
  envMapIntensity: 0.55,
});
const ground = new THREE.Mesh(new THREE.CircleGeometry(14, 48), groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const pedestal = new THREE.Mesh(
  new THREE.CylinderGeometry(0.55, 0.7, 0.06, 28),
  new THREE.MeshPhysicalMaterial({
    color: 0x12101a,
    roughness: 0.8,
    metalness: 0.15,
    envMapIntensity: 0.4,
  }),
);
pedestal.position.y = 0.03;
pedestal.receiveShadow = true;
scene.add(pedestal);

scene.add(rig);

const loader = new GLTFLoader();
const furNoise = makeFurNoiseTexture();

function makeFurNoiseTexture() {
  const s = 64;
  const data = new Uint8Array(s * s);
  for (let i = 0; i < s * s; i++) {
    const x = i % s;
    const y = (i / s) | 0;
    const n =
      Math.sin(x * 0.41 + y * 0.27) * 0.5 +
      Math.sin(x * 0.17 - y * 0.33) * 0.35 +
      Math.random() * 0.15;
    data[i] = Math.floor(THREE.MathUtils.clamp(n, 0, 1) * 255);
  }
  const tex = new THREE.DataTexture(data, s, s, THREE.RedFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 6);
  tex.needsUpdate = true;
  return tex;
}

function buildEnvFromPreset(presetId) {
  const preset = LIGHT_PRESETS[presetId];
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();

  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color(preset.bg);

  for (const [color, scale, px, py, pz, rx, ry, rz] of preset.envPanels) {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(8, 8),
      new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, toneMapped: false }),
    );
    m.position.set(px, py, pz);
    m.rotation.set(rx, ry, rz);
    m.scale.setScalar(scale);
    envScene.add(m);
  }

  const envTex = pmrem.fromScene(envScene, 0.06).texture;
  pmrem.dispose();
  envScene.traverse((o) => {
    if (o.isMesh) {
      o.geometry.dispose();
      o.material.dispose();
    }
  });
  return envTex;
}

function getEnvMapForPreset(presetId) {
  if (envMapCache.has(presetId)) {
    return envMapCache.get(presetId);
  }
  try {
    const tex = buildEnvFromPreset(presetId);
    envMapCache.set(presetId, tex);
    return tex;
  } catch (err) {
    console.warn('PMREM build failed for', presetId, err);
    return envMap ?? null;
  }
}

function updateLightPickerUi(presetId) {
  lightButtons.forEach((btn) => {
    const on = btn.dataset.light === presetId;
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.classList.toggle('is-active', on);
  });
}

function setDir(light, spec) {
  light.color.setHex(spec.color);
  light.intensity = spec.int;
  light.position.set(...spec.pos);
}

function applyLightsFromPreset(presetId) {
  const preset = LIGHT_PRESETS[presetId];
  const L = preset.lights;
  ambient.color.setHex(L.ambient[0]);
  ambient.intensity = L.ambient[1];
  hemi.color.setHex(L.hemi.sky);
  hemi.groundColor.setHex(L.hemi.ground);
  hemi.intensity = L.hemi.int;
  setDir(moonFill, L.moonFill);
  setDir(moonKey, L.moonKey);
  setDir(violetRim, L.violetRim);
  setDir(softFront, L.softFront);
  moonKey.castShadow = preset.shadows && !MOBILE;
  faceLift.color.setHex(L.faceLift.color);
  faceLift.intensity = L.faceLift.int;
  faceLift.position.set(...L.faceLift.pos);
  rigFront.color.setHex(L.rigFront.color);
  rigFront.intensity = L.rigFront.int;
  rigFront.position.set(...L.rigFront.pos);
  renderer.toneMappingExposure = getExposure();
  scene.background.setHex(preset.bg);
  scene.fog.color.setHex(preset.fog.color);
  scene.fog.density = preset.fog.density;
}

function assignEnvMap(tex) {
  scene.environment = tex;
  const mul = LIGHT_PRESETS[activeLightId].envIntensity;
  groundMat.envMap = tex;
  groundMat.envMapIntensity = 0.55 * mul;
  pedestal.material.envMap = tex;
  pedestal.material.envMapIntensity = 0.4 * mul;

  const walk = (root) => {
    if (!root) return;
    root.traverse((o) => {
      if (!o.isMesh || !o.material) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m) => {
        m.envMap = tex;
        if (m.userData?.furBase && m.userData.baseEnvMul) {
          m.envMapIntensity = m.userData.baseEnvMul * mul;
        }
      });
    });
  };
  for (const root of stageCache.values()) walk(root);
  walk(displayedInstance);
  if (blend.active) {
    walk(blend.from);
    walk(blend.to);
  }
}

function syncCoatUniforms(root) {
  if (!root) return;
  const coat = getCoatOpts();
  root.traverse((o) => {
    if (!o.isMesh) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    mats.forEach((m) => {
      const u = m.userData?.coatUniforms;
      if (!u) return;
      u.uMapMul.value = coat.mapMul;
      u.uMidLift.value = coat.midLift;
      u.uGlowStrength.value = coat.glow;
      u.uFloor.value = coat.floor;
    });
  });
}

function syncAllCoatUniforms() {
  for (const root of stageCache.values()) syncCoatUniforms(root);
  syncCoatUniforms(displayedInstance);
  if (blend.active) {
    syncCoatUniforms(blend.from);
    syncCoatUniforms(blend.to);
  }
}

function applyPresetCoatTint(root) {
  if (!root) return;
  const preset = LIGHT_PRESETS[activeLightId];
  const tint = preset.coatTint;
  const ei = preset.emissiveIntensity ?? 2;
  root.traverse((o) => {
    if (!o.isMesh) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    mats.forEach((m) => {
      if (!m?.userData?.furBase || m.userData?.isShell) return;
      if (m.userData.mobileCoat) {
        m.color.setRGB(tint[0], tint[1], tint[2]);
        m.emissiveIntensity = ei;
      }
    });
  });
}

function applyPresetCoatTintAll() {
  for (const root of stageCache.values()) applyPresetCoatTint(root);
  applyPresetCoatTint(displayedInstance);
  if (blend.active) {
    applyPresetCoatTint(blend.from);
    applyPresetCoatTint(blend.to);
  }
}

function setLightPreset(presetId) {
  if (!LIGHT_PRESETS[presetId]) return;
  if (presetId === activeLightId) {
    updateLightPickerUi(presetId);
    return;
  }
  activeLightId = presetId;
  updateLightPickerUi(presetId);
  try {
    localStorage.setItem(LIGHT_STORAGE_KEY, presetId);
  } catch {
    /* private mode */
  }
  try {
    applyLightsFromPreset(presetId);
    const tex = getEnvMapForPreset(presetId);
    if (tex) {
      envMap = tex;
      assignEnvMap(tex);
    }
    syncAllCoatUniforms();
    applyPresetCoatTintAll();
  } catch (err) {
    console.error('setLightPreset failed', err);
  }
}

function setLoading(visible, msg, hint = '', progress = null) {
  loadingEl.classList.toggle('is-hidden', !visible);
  loadMsg.textContent = msg;
  loadMsg.classList.remove('err');
  loadHint.textContent = hint;
  if (progress !== null) {
    loadBar.style.width = `${Math.min(100, Math.round(progress * 100))}%`;
  } else if (!visible) {
    loadBar.style.width = '0%';
  }
}

function isCacheTemplate(group) {
  for (const template of stageCache.values()) {
    if (template === group) return true;
  }
  return false;
}

function disposeCreatureGroup(group) {
  if (!group || isCacheTemplate(group)) return;
  group.traverse((obj) => {
    if (obj.isMesh) {
      obj.geometry?.dispose();
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach((m) => {
        if (!m) return;
        if (m.userData?.isShell) return;
        ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap', 'sheenColorMap'].forEach(
          (k) => m[k]?.dispose?.(),
        );
        m.dispose();
      });
    }
  });
  if (group.parent) group.parent.remove(group);
}

const COAT_MIDTONE = new THREE.Color(0x6e6488);
const COAT_LIFT = new THREE.Color(0xd8dce8);

const MIN_COAT_LUM = MOBILE ? 0.32 : 0.26;
const COAT_GAMMA = 0.52;

function liftCoatAlbedoTexture(sourceTex) {
  if (!sourceTex?.image) return null;
  if (textureLiftCache.has(sourceTex)) return textureLiftCache.get(sourceTex);

  const img = sourceTex.image;
  const w = img.width || img.naturalWidth;
  const h = img.height || img.naturalHeight;
  if (!w || !h) return null;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);
  const id = ctx.getImageData(0, 0, w, h);
  const emData = new Uint8ClampedArray(w * h * 4);

  for (let i = 0; i < id.data.length; i += 4) {
    let r = id.data[i] / 255;
    let g = id.data[i + 1] / 255;
    let b = id.data[i + 2] / 255;

    r = r ** COAT_GAMMA;
    g = g ** COAT_GAMMA;
    b = b ** COAT_GAMMA;

    let lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;

    if (lum < MIN_COAT_LUM) {
      const lift = MIN_COAT_LUM / Math.max(lum, 0.02);
      r = Math.min(1, r * lift * 1.08 + 0.08);
      g = Math.min(1, g * lift * 1.02 + 0.06);
      b = Math.min(1, b * lift * 1.15 + 0.14);
      r = r * 0.82 + 0.14;
      g = g * 0.78 + 0.1;
      b = b * 0.88 + 0.2;
      lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }

    id.data[i] = Math.round(r * 255);
    id.data[i + 1] = Math.round(g * 255);
    id.data[i + 2] = Math.round(b * 255);

    const hot = THREE.MathUtils.smoothstep(lum, 0.38, 0.85);
    emData[i] = Math.round(90 + r * 120 * hot + hot * 80);
    emData[i + 1] = Math.round(40 + g * 70 * hot);
    emData[i + 2] = Math.round(140 + b * 100 * hot + hot * 115);
    emData[i + 3] = Math.round(255 * hot);
  }

  ctx.putImageData(id, 0, 0);
  const liftedMap = new THREE.CanvasTexture(canvas);
  liftedMap.colorSpace = THREE.SRGBColorSpace;
  liftedMap.flipY = sourceTex.flipY;
  liftedMap.wrapS = sourceTex.wrapS;
  liftedMap.wrapT = sourceTex.wrapT;
  liftedMap.minFilter = THREE.LinearMipmapLinearFilter;
  liftedMap.magFilter = THREE.LinearFilter;
  liftedMap.generateMipmaps = true;
  liftedMap.anisotropy = renderer.capabilities.getMaxAnisotropy();
  liftedMap.needsUpdate = true;

  const emCanvas = document.createElement('canvas');
  emCanvas.width = w;
  emCanvas.height = h;
  emCanvas.getContext('2d').putImageData(new ImageData(emData, w, h), 0, 0);
  const emissiveMap = new THREE.CanvasTexture(emCanvas);
  emissiveMap.colorSpace = THREE.SRGBColorSpace;
  emissiveMap.flipY = sourceTex.flipY;
  emissiveMap.wrapS = sourceTex.wrapS;
  emissiveMap.wrapT = sourceTex.wrapT;
  emissiveMap.needsUpdate = true;

  const packed = { map: liftedMap, emissiveMap };
  textureLiftCache.set(sourceTex, packed);
  return packed;
}

function liftTexturesOnRoot(root) {
  root.traverse((obj) => {
    if (!obj.isMesh || !obj.material) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    mats.forEach((m) => {
      if (!m.map || m.userData?.liftProcessed) return;
      const lifted = liftCoatAlbedoTexture(m.map);
      if (lifted) {
        m.userData.originalMap = m.map;
        m.userData.liftProcessed = true;
        m.userData.liftedPack = lifted;
      }
    });
  });
}

function copyMaterialMaps(source, target) {
  if (!source) return;
  for (const k of [
    'map',
    'normalMap',
    'roughnessMap',
    'metalnessMap',
    'aoMap',
    'emissiveMap',
  ]) {
    if (source[k]) {
      target[k] = source[k];
      if (k === 'map' || k === 'emissiveMap') target[k].colorSpace = THREE.SRGBColorSpace;
    }
  }
}

function isGlossyAccent(mat, mesh) {
  const e = mat?.emissive;
  if (e && e.r + e.g + e.b > 0.04) return true;
  if (mat?.emissiveMap) return true;
  if (mat?.emissiveIntensity > 0.1) return true;
  const label = `${mat?.name || ''} ${mesh?.name || ''}`;
  if (/eye|crystal|gem|wet|vein|glow|flame|pupil|iris/i.test(label)) return true;
  return false;
}

/** Multiply albedo in-shader, lift midtones, floor crushed blacks, bloom eyes/flame from texture. */
function applyCoatReadabilityShader(material, coat = getCoatOpts()) {
  if (!material.map) return;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uMapMul = { value: coat.mapMul };
    shader.uniforms.uMidLift = { value: coat.midLift };
    shader.uniforms.uGlowStrength = { value: coat.glow };
    shader.uniforms.uFloor = { value: coat.floor };
    material.userData.coatUniforms = shader.uniforms;
    shader.fragmentShader =
      /* glsl */ `
      uniform float uMapMul;
      uniform float uMidLift;
      uniform float uGlowStrength;
      uniform float uFloor;
    ` + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <map_fragment>',
      /* glsl */ `
        #include <map_fragment>
        diffuseColor.rgb *= uMapMul;
        diffuseColor.rgb += vec3(uMidLift * 0.2, uMidLift * 0.16, uMidLift * 0.3);
        vec3 coalFloor = vec3(0.18, 0.14, 0.26) * uFloor;
        diffuseColor.rgb = max(diffuseColor.rgb, coalFloor);
        float coatLum = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
        float hotLo = smoothstep(0.12, 0.38, coatLum);
        float hotHi = smoothstep(0.38, 0.82, coatLum);
        vec3 violet = vec3(0.58, 0.38, 1.0);
        vec3 glowCol = mix(diffuseColor.rgb, diffuseColor.rgb * violet, 0.55);
        totalEmissiveRadiance += glowCol * (hotLo * 0.35 + hotHi * 1.0) * uGlowStrength;
        diffuseColor.rgb = mix(diffuseColor.rgb, max(diffuseColor.rgb, glowCol * 0.75), hotHi * 0.45);
      `,
    );
  };
  material.customProgramCacheKey = () => `coat-read-${activeLightId}`;
  material.needsUpdate = true;
}

function liftCoatAlbedo(color, hasTexture) {
  if (hasTexture) {
    color.setRGB(1.35, 1.3, 1.45);
  }
  color.lerp(COAT_LIFT, hasTexture ? 0.22 : 0.4);
  color.lerp(COAT_MIDTONE, hasTexture ? 0.12 : 0.28);
  const hsl = { h: 0, s: 0, l: 0 };
  color.getHSL(hsl);
  if (hsl.l < 0.34) hsl.l = 0.34;
  color.setHSL(hsl.h, hsl.s * 0.88, hsl.l);
}

function toCoatMaterial(source, profile, env, { mane = false, sculpt = false, mesh = null } = {}) {
  const lifted = source?.userData?.liftedPack;
  const preset = LIGHT_PRESETS[activeLightId];
  const envMul = preset.envIntensity;

  if (MOBILE && !sculpt) {
    const m = new THREE.MeshStandardMaterial();
    if (lifted) {
      m.map = lifted.map;
      m.emissiveMap = lifted.emissiveMap;
      m.emissive.set(0x8868ff);
      m.emissiveIntensity = preset.emissiveIntensity ?? 2.5;
    } else {
      copyMaterialMaps(source, m);
    }
    const tint = preset.coatTint;
    m.color.setRGB(tint[0], tint[1], tint[2]);
    m.metalness = 0;
    m.roughness = 0.6;
    m.envMap = env;
    m.envMapIntensity = profile.envIntensity * envMul * 0.85;
    m.userData.baseEnvMul = profile.envIntensity * 0.85;
    m.userData.furBase = true;
    m.userData.mobileCoat = true;
    return m;
  }

  const p = new THREE.MeshPhysicalMaterial();
  if (lifted) {
    p.map = lifted.map;
    p.emissiveMap = lifted.emissiveMap;
    p.emissive.set(0x7040c8);
    p.emissiveIntensity = preset.emissiveIntensity ?? 2;
  } else {
    copyMaterialMaps(source, p);
  }

  const hasMap = !!p.map;
  const glossy = isGlossyAccent(source, mesh);

  if (source?.emissive && !lifted) p.emissive.copy(source.emissive);
  if (source?.emissiveIntensity !== undefined && !lifted) {
    p.emissiveIntensity = source.emissiveIntensity;
  }

  if (sculpt) {
    p.color.setHex(mane ? profile.maneColor : profile.bodyColor);
    p.roughness = mane ? profile.roughness * 0.85 : profile.roughness * 1.05;
    p.metalness = 0;
  } else if (hasMap) {
    const tint = preset.coatTint;
    p.color.setRGB(tint[0], tint[1], tint[2]);
    p.roughness = glossy ? 0.38 : 0.58;
    p.metalness = 0;
  } else if (source?.color) {
    p.color.copy(source.color);
    liftCoatAlbedo(p.color, false);
    p.roughness = THREE.MathUtils.clamp((source.roughness ?? profile.roughness) * 0.8, 0.35, 0.72);
    p.metalness = 0;
  } else {
    p.color.copy(COAT_MIDTONE);
    p.roughness = profile.roughness;
    p.metalness = 0;
  }

  if (glossy) {
    p.emissiveIntensity = Math.max(p.emissiveIntensity, 2.4);
    p.roughness = Math.min(p.roughness, 0.32);
  }

  const sheen =
    profile.bodySheen !== undefined ? (mane ? profile.sheen : profile.bodySheen) : profile.sheen;
  p.sheen = glossy ? 0.2 : sheen * 0.5;
  p.sheenRoughness = profile.sheenRoughness;
  p.sheenColor.setHex(profile.sheenColor);
  p.anisotropy = glossy ? 0.15 : profile.anisotropy * 0.55;
  p.anisotropyRotation = 0.35;
  p.clearcoat = glossy ? 0.35 : 0;
  p.clearcoatRoughness = 0.7;
  p.envMap = env;
  const baseEnv = glossy ? profile.envIntensity * 1.5 : profile.envIntensity * 1.1;
  p.envMapIntensity = baseEnv * envMul;
  p.userData.baseEnvMul = baseEnv;
  p.aoMapIntensity = hasMap ? 0.65 : 1;

  if (hasMap && !MOBILE) {
    applyCoatReadabilityShader(p, getCoatOpts());
  }

  p.userData.furBase = true;
  return p;
}

function addShellFur(mesh, profile, env, { mane = false, layers = 2 } = {}) {
  if (!SHELL_FUR_ENABLED) return [];
  const shells = [];
  const spread = profile.shellSpread * (mane ? 1.2 : 1);
  const baseSheen = mane && profile.bodySheen !== undefined ? profile.sheen : profile.sheen;
  const layerCount = Math.min(layers, 2);

  for (let i = 1; i <= layerCount; i++) {
    const t = i / layerCount;
    const shellMat = new THREE.MeshPhysicalMaterial({
      color: profile.sheenColor,
      transparent: true,
      opacity: 0.028 - t * 0.008,
      depthWrite: false,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      roughness: 0.95,
      metalness: 0,
      sheen: baseSheen * (0.35 + t * 0.25),
      sheenRoughness: profile.sheenRoughness + 0.12,
      sheenColor: new THREE.Color(profile.sheenColor),
      envMap: env,
      envMapIntensity: profile.envIntensity * 0.35,
    });
    shellMat.userData.isShell = true;

    const shell = mesh.clone();
    shell.material = shellMat;
    shell.castShadow = false;
    shell.receiveShadow = false;
    shell.renderOrder = mesh.renderOrder + i;
    const inflate = spread * i;
    shellMat.onBeforeCompile = (shader) => {
      shader.uniforms.uInflate = { value: inflate };
      shader.uniforms.uNoise = { value: furNoise };
      shader.vertexShader =
        'uniform float uInflate;\nuniform sampler2D uNoise;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        /* glsl */ `
          #include <begin_vertex>
          #ifdef USE_UV
            float strand = texture2D(uNoise, uv * 5.0).r;
            float push = uInflate * (0.65 + strand * 0.55);
            transformed += normal * push;
          #else
            transformed += normal * uInflate;
          #endif
        `,
      );
      shader.fragmentShader =
        'uniform sampler2D uNoise;\n' + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <opaque_fragment>',
        /* glsl */ `
          #ifdef USE_UV
            float fuzz = texture2D(uNoise, vUv * 8.0).r;
            diffuseColor.a *= smoothstep(0.2, 0.9, fuzz);
          #endif
          #include <opaque_fragment>
        `,
      );
    };

    mesh.parent.add(shell);
    shells.push(shell);
  }
  return shells;
}

function applyStageFur(root, stageId, env) {
  const cfg = STAGES[stageId];
  const profile = cfg.fur;
  const sculpt = !!cfg.sculpt;

  const box = new THREE.Box3().setFromObject(root);
  const height = box.max.y - box.min.y || 1;
  const maneY = box.min.y + height * 0.58;

  const meshStats = [];
  root.traverse((obj) => {
    if (obj.isMesh && obj.geometry) {
      const tri = obj.geometry.index
        ? obj.geometry.index.count / 3
        : obj.geometry.attributes.position.count / 3;
      meshStats.push({ mesh: obj, tri });
    }
  });
  meshStats.sort((a, b) => b.tri - a.tri);

  let shellBudget = SHELL_FUR_ENABLED ? (sculpt ? profile.shellMeshBudget ?? 4 : 1) : 0;
  let shellLayers = SHELL_FUR_ENABLED ? Math.min(profile.shells, 2) : 0;

  meshStats.forEach(({ mesh, tri }, idx) => {
    const meshBox = new THREE.Box3().setFromObject(mesh);
    const centerY = (meshBox.max.y + meshBox.min.y) * 0.5;
    const mane = sculpt ? centerY >= maneY : centerY >= maneY * 0.92;

    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const newMats = mats.map((src) =>
      toCoatMaterial(src, profile, env, { mane, sculpt, mesh }),
    );
    mesh.material = newMats.length === 1 ? newMats[0] : newMats;
    mesh.castShadow = true;
    mesh.receiveShadow = false;

    if (
      SHELL_FUR_ENABLED &&
      idx < shellBudget &&
      tri < (profile.triangleShellCap ?? Infinity)
    ) {
      addShellFur(mesh, profile, env, { mane, layers: shellLayers });
    }
  });

  root.userData.furApplied = true;
}

function frameCreature(root, sculpt) {
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  root.position.sub(center);
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  const targetHeight = sculpt ? 1.65 : 1.35;
  root.scale.setScalar(targetHeight / maxDim);

  const grounded = new THREE.Box3().setFromObject(root);
  root.position.y -= grounded.min.y;

  const framed = new THREE.Box3().setFromObject(root);
  const sphere = framed.getBoundingSphere(new THREE.Sphere());
  const dist = sphere.radius / Math.sin((camera.fov * Math.PI) / 360);
  const y = framed.max.y * 0.45 + framed.min.y * 0.55;

  defaultCam.pos.set(dist * 0.35, y + dist * 0.28, dist * 1.05);
  defaultCam.target.set(0, y, 0);
  controls.minDistance = sphere.radius * 0.55;
  controls.maxDistance = sphere.radius * 6;

  return { y, sphere };
}

function setCreatureOpacity(group, alpha) {
  group.traverse((obj) => {
    if (!obj.isMesh) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    mats.forEach((m) => {
      if (!m || m.userData?.isShell) return;
      m.transparent = alpha < 0.999;
      m.opacity = alpha;
      m.depthWrite = alpha > 0.92;
    });
  });
}

function sanitizeGltfMaterials(root) {
  root.traverse((obj) => {
    if (!obj.isMesh || !obj.material) return;
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    mats.forEach((m) => {
      if (m.map) {
        m.map.colorSpace = THREE.SRGBColorSpace;
        m.map.anisotropy = renderer.capabilities.getMaxAnisotropy();
      }
      m.metalness = 0;
      if (m.map) {
        m.roughness = THREE.MathUtils.clamp(m.roughness * 0.5, 0.35, 0.72);
      }
    });
  });
}

function prepareStageRoot(gltf, stageId) {
  const root = gltf.scene;
  const cfg = STAGES[stageId];
  sanitizeGltfMaterials(root);
  if (!cfg.sculpt) liftTexturesOnRoot(root);
  frameCreature(root, !!cfg.sculpt);
  applyStageFur(root, stageId, envMap);
  applyPresetCoatTint(root);
  root.userData.stageId = stageId;
  return root;
}

function instantiateFromCache(stageId) {
  const template = stageCache.get(stageId);
  const instance = template.clone(true);
  instance.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    mats.forEach((m) => {
      m.envMap = envMap;
    });
  });
  return instance;
}

function attachPresented(group, alpha = 1) {
  if (displayedInstance && displayedInstance !== group) {
    disposeCreatureGroup(displayedInstance);
  }
  rig.clear();
  const holder = new THREE.Group();
  holder.add(group);
  rig.add(holder);
  setCreatureOpacity(group, alpha);
  displayedInstance = group;
  presentedStage = stageIdFromGroup(group);
  return holder;
}

function stageIdFromGroup(group) {
  return group.userData.stageId;
}

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

function startBlend(fromGroup, toGroup, evolving) {
  blend.active = true;
  blend.t = 0;
  blend.from = fromGroup;
  blend.to = toGroup;
  blend.evolving = evolving;

  if (displayedInstance && displayedInstance !== fromGroup) {
    disposeCreatureGroup(displayedInstance);
  }

  rig.clear();
  blend.fromWrap = new THREE.Group();
  blend.toWrap = new THREE.Group();
  blend.fromWrap.add(fromGroup);
  blend.toWrap.add(toGroup);
  rig.add(blend.fromWrap, blend.toWrap);

  setCreatureOpacity(fromGroup, 1);
  setCreatureOpacity(toGroup, 0);
  blend.toWrap.scale.setScalar(0.88);
  displayedInstance = null;
  presentedStage = stageIdFromGroup(toGroup);
}

function finishBlend() {
  if (blend.from && blend.from !== blend.to) {
    disposeCreatureGroup(blend.from);
  }
  const incoming = blend.to;
  blend.active = false;
  blend.from = null;
  blend.to = null;
  blend.fromWrap = null;
  blend.toWrap = null;
  attachPresented(incoming, 1);
}

function updateBlend(dt) {
  if (!blend.active) return;
  blend.t += dt / blend.duration;
  const u = easeInOut(Math.min(1, blend.t));
  const evolveBoost = blend.evolving ? Math.sin(u * Math.PI) * 0.06 : 0;

  setCreatureOpacity(blend.from, 1 - u);
  setCreatureOpacity(blend.to, u);

  if (blend.toWrap) blend.toWrap.scale.setScalar(0.88 + u * 0.12 + evolveBoost);
  if (blend.fromWrap) blend.fromWrap.scale.setScalar(1 - u * 0.08);

  if (blend.t >= 1) finishBlend();
}

function outgoingCreature() {
  if (blend.active && blend.from) return blend.from;
  return displayedInstance;
}

function applyCameraIfNew(stageId) {
  if (framedStages.has(stageId)) return;
  framedStages.add(stageId);
  camera.position.copy(defaultCam.pos);
  controls.target.copy(defaultCam.target);
  controls.update();
}

function loadStage(stageId, { force = false } = {}) {
  if (stageId === presentedStage && !force && !blend.active) return;

  const cfg = STAGES[stageId];
  const token = ++loadToken;
  const prevStage = presentedStage ?? activeStage;
  const evolving =
    prevStage &&
    STAGES[stageId].order !== STAGES[prevStage]?.order &&
    Math.abs(STAGES[stageId].order - STAGES[prevStage].order) === 1;

  stageButtons.forEach((btn) => {
    btn.setAttribute('aria-pressed', btn.dataset.stage === stageId ? 'true' : 'false');
  });

  activeStage = stageId;

  if (stageCache.has(stageId)) {
    const outgoing = outgoingCreature();
    const incoming = instantiateFromCache(stageId);
    applyCameraIfNew(stageId);
    if (outgoing) {
      startBlend(outgoing, incoming, evolving);
    } else {
      attachPresented(incoming, 1);
    }
    setLoading(false, '');
    return;
  }

  setLoading(true, `Loading ${cfg.label}…`, cfg.hint, 0);

  loader.load(
    cfg.file,
    (gltf) => {
      if (token !== loadToken) return;
      const prepared = prepareStageRoot(gltf, stageId);
      stageCache.set(stageId, prepared);

      const outgoing = outgoingCreature();
      const incoming = instantiateFromCache(stageId);
      applyCameraIfNew(stageId);

      if (outgoing) {
        startBlend(outgoing, incoming, evolving);
      } else {
        attachPresented(incoming, 1);
      }

      setLoading(false, '');
    },
    (xhr) => {
      if (token !== loadToken) return;
      if (xhr.total) {
        setLoading(true, `Loading ${cfg.label}…`, cfg.hint, xhr.loaded / xhr.total);
      }
    },
    (err) => {
      if (token !== loadToken) return;
      console.error(err);
      loadMsg.textContent = `Could not load ${cfg.label}.`;
      loadMsg.classList.add('err');
      loadHint.textContent = 'Check your connection and try again.';
    },
  );
}

function resetCamera() {
  camera.position.copy(defaultCam.pos);
  controls.target.copy(defaultCam.target);
  controls.update();
}

function resize() {
  const w = host.clientWidth;
  const h = host.clientHeight;
  if (w <= 0 || h <= 0) return;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
}

stageButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const id = btn.dataset.stage;
    if (id === presentedStage && !blend.active) return;
    loadStage(id);
  });
});

btnRotate.addEventListener('click', () => {
  autoRotate = !autoRotate;
  btnRotate.setAttribute('aria-pressed', autoRotate ? 'true' : 'false');
  btnRotate.textContent = autoRotate ? 'Auto-rotate · On' : 'Auto-rotate · Off';
});

btnReset.addEventListener('click', resetCamera);

const ro = new ResizeObserver(resize);
ro.observe(host);

const idle = { phase: Math.random() * Math.PI * 2 };
let lastT = performance.now();
let autoYaw = 0;

function updateIdle(dt) {
  idle.phase += dt;
  const breath = Math.sin(idle.phase * 1.65) * 0.014;
  const sway = Math.sin(idle.phase * 0.62) * 0.035;
  const bob = Math.sin(idle.phase * 2.05) * 0.01;
  const tilt = Math.sin(idle.phase * 0.88) * 0.022;

  rig.position.y = bob;
  rig.rotation.x = tilt;
  rig.rotation.z = sway * 0.4;
  const baseScale = 1 + breath;
  if (!blend.active) {
    rig.scale.setScalar(baseScale);
  } else {
    rig.scale.setScalar(baseScale * 0.98 + 0.02);
  }
}

function tick(now) {
  requestAnimationFrame(tick);
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;

  if (autoRotate) autoYaw += dt * 0.22;
  rig.rotation.y = autoYaw;

  updateIdle(dt);
  updateBlend(dt);
  controls.update();
  renderer.render(scene, camera);
}

applyLightsFromPreset(activeLightId);
try {
  envMap = getEnvMapForPreset(activeLightId);
  if (envMap) assignEnvMap(envMap);
} catch (err) {
  console.warn('Initial env map failed', err);
}
updateLightPickerUi(activeLightId);

let lastLightPickMs = 0;
function onLightPick(evt) {
  const btn = evt.target.closest('.light-btn');
  if (!btn?.dataset.light) return;
  if (evt.type === 'click' && evt.pointerType && evt.pointerType !== 'mouse') return;
  const now = performance.now();
  if (now - lastLightPickMs < 320) return;
  lastLightPickMs = now;
  evt.preventDefault();
  setLightPreset(btn.dataset.light);
}

lightButtons.forEach((btn) => {
  btn.addEventListener('click', onLightPick);
  btn.addEventListener('pointerup', onLightPick);
});

resize();
requestAnimationFrame(tick);
loadStage('nokki', { force: true });

document.addEventListener('visibilitychange', () => {
  if (document.hidden) lastT = performance.now();
});
