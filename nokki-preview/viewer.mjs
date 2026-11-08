import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
const ASSET_VER = '?v=9';

const BAKED_ALBEDO = {
  nokki: `models/nokki-albedo.jpg${ASSET_VER}`,
  nokkane: `models/nokkane-albedo.jpg${ASSET_VER}`,
};

const STAGES = {
  nokki: {
    file: `models/nokki.glb${ASSET_VER}`,
    label: 'Nokki',
    hint: 'Stage 1 · plush wisp coat',
    order: 0,
    fur: {
      sheen: 0.48,
      sheenRoughness: 0.52,
      sheenColor: 0xc8d0e8,
      roughness: 0.84,
      coatLift: 0.06,
      anisotropy: 0.72,
      shells: 3,
      shellSpread: 0.014,
      envIntensity: 0.95,
      aoLift: 0.22,
    },
  },
  nokkane: {
    file: `models/nokkane.glb${ASSET_VER}`,
    label: 'Nokkane',
    hint: 'Stage 2 · short living-shadow fur',
    order: 1,
    fur: {
      sheen: 0.42,
      sheenRoughness: 0.5,
      sheenColor: 0xb0bcd8,
      roughness: 0.82,
      coatLift: 0.04,
      anisotropy: 0.55,
      shells: 2,
      shellSpread: 0.009,
      envIntensity: 0.9,
      aoLift: 0.18,
    },
  },
  nokkara: {
    file: `models/nokkara.glb${ASSET_VER}`,
    label: 'Nokkara',
    hint: 'Stage 3 · dense mane (loading may take a moment)',
    order: 2,
    sculpt: true,
    fur: {
      sheen: 0.5,
      sheenRoughness: 0.55,
      sheenColor: 0xd0d8e8,
      bodySheen: 0.38,
      bodyColor: 0x2e2838,
      maneColor: 0xb8c4d8,
      roughness: 0.86,
      coatLift: 0.05,
      anisotropy: 0.78,
      shells: 2,
      shellSpread: 0.011,
      envIntensity: 0.85,
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

const LIGHT_PRESETS = {
  studio: {
    id: 'studio',
    label: 'Studio · bright',
    exposure: { mobile: 1.14, desktop: 1.06 },
    fog: { color: 0x3a4058, density: 0.012 },
    bg: 0x4a5068,
    envIntensity: 1.05,
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
    exposure: { mobile: 1.12, desktop: 1.04 },
    fog: { color: 0x08081c, density: 0.022 },
    bg: 0x060612,
    envIntensity: 0.92,
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
    exposure: { mobile: 1.1, desktop: 1.02 },
    fog: { color: 0x280838, density: 0.02 },
    bg: 0x1a0828,
    envIntensity: 0.88,
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
    exposure: { mobile: 1.16, desktop: 1.08 },
    fog: { color: 0x382818, density: 0.016 },
    bg: 0x4a3828,
    envIntensity: 0.95,
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

function getExposure() {
  const p = LIGHT_PRESETS[activeLightId];
  return MOBILE ? p.exposure.mobile : p.exposure.desktop;
}

const MOBILE =
  matchMedia('(pointer: coarse)').matches ||
  matchMedia('(max-width: 520px)').matches;

let activeStage = 'nokki';
let autoRotate = true;
let loadToken = 0;
let defaultCam = { pos: new THREE.Vector3(), target: new THREE.Vector3() };
let envMap = null;
/** @type {Map<string, THREE.Texture>} */
const envMapCache = new Map();

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
const textureLoader = new THREE.TextureLoader();
/** @type {Map<string, THREE.Texture>} */
const bakedAlbedoCache = new Map();

function getBakedAlbedo(stageId) {
  const url = BAKED_ALBEDO[stageId];
  if (!url) return null;
  if (bakedAlbedoCache.has(stageId)) return bakedAlbedoCache.get(stageId);
  const tex = textureLoader.load(url);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  bakedAlbedoCache.set(stageId, tex);
  return tex;
}

function creatureEnvMul(stageId) {
  const presetMul = LIGHT_PRESETS[activeLightId].envIntensity;
  const stageMul = STAGES[stageId]?.fur?.envIntensity ?? 1;
  return presetMul * stageMul;
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
        if (!m.userData?.creaturePBR) return;
        m.envMap = tex;
        m.envMapIntensity = m.userData.stageEnvBase * mul;
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

function syncCreatureEnv(root) {
  if (!root) return;
  const presetMul = LIGHT_PRESETS[activeLightId].envIntensity;
  root.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    mats.forEach((m) => {
      if (!m?.userData?.creaturePBR) return;
      m.envMap = envMap;
      m.envMapIntensity = m.userData.stageEnvBase * presetMul;
    });
  });
}

function syncAllCreatureEnv() {
  for (const root of stageCache.values()) syncCreatureEnv(root);
  syncCreatureEnv(displayedInstance);
  if (blend.active) {
    syncCreatureEnv(blend.from);
    syncCreatureEnv(blend.to);
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
    syncAllCreatureEnv();
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

function applyStagePBR(root, stageId) {
  const cfg = STAGES[stageId];
  const profile = cfg.fur;
  const sculpt = !!cfg.sculpt;
  const stageEnvBase = creatureEnvMul(stageId);
  const bakedMap = sculpt ? null : getBakedAlbedo(stageId);
  if (bakedMap) renderer.initTexture(bakedMap);

  const box = new THREE.Box3().setFromObject(root);
  const height = box.max.y - box.min.y || 1;
  const maneY = box.min.y + height * 0.58;

  root.traverse((mesh) => {
    if (!mesh.isMesh || !mesh.material) return;
    const meshBox = new THREE.Box3().setFromObject(mesh);
    const centerY = (meshBox.max.y + meshBox.min.y) * 0.5;
    const mane = sculpt && centerY >= maneY;

    const sheen = mane
      ? profile.sheen ?? 0.5
      : sculpt
        ? (profile.bodySheen ?? 0.38)
        : (profile.sheen ?? 0.45);
    const rough = profile.roughness ?? 0.84;

    const mat = new THREE.MeshPhysicalMaterial({
      color: sculpt ? (mane ? profile.maneColor : profile.bodyColor) : 0xffffff,
      map: bakedMap ?? null,
      metalness: 0,
      roughness: mane ? rough * 0.92 : rough,
      sheen,
      sheenRoughness: profile.sheenRoughness ?? 0.52,
      sheenColor: new THREE.Color(profile.sheenColor ?? 0xc8d0e8),
      clearcoat: 0,
      envMap,
      envMapIntensity: stageEnvBase,
      emissive: 0x000000,
      emissiveIntensity: 0,
    });
    mat.userData.creaturePBR = true;
    mat.userData.stageEnvBase = profile.envIntensity ?? 1;
    mat.userData.stageId = stageId;

    mesh.material = mat;
    mesh.castShadow = !MOBILE;
    mesh.receiveShadow = false;
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

function prepareStageRoot(gltf, stageId) {
  const root = gltf.scene;
  const cfg = STAGES[stageId];
  frameCreature(root, !!cfg.sculpt);
  applyStagePBR(root, stageId);
  root.userData.stageId = stageId;
  return root;
}

function instantiateFromCache(stageId) {
  const template = stageCache.get(stageId);
  const instance = template.clone(true);
  syncCreatureEnv(instance);
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
