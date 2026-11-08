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
      bodyColor: 0x22202c,
      maneColor: 0xaeb6ca,
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
const btnRotate = document.getElementById('btn-rotate');
const btnReset = document.getElementById('btn-reset');

const MOBILE =
  matchMedia('(pointer: coarse)').matches ||
  matchMedia('(max-width: 520px)').matches;

let activeStage = 'nokki';
let autoRotate = true;
let loadToken = 0;
let defaultCam = { pos: new THREE.Vector3(), target: new THREE.Vector3() };
let envMap = null;

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
renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
host.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05040a);
scene.fog = new THREE.FogExp2(0x0a0812, 0.038);

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

scene.add(new THREE.AmbientLight(0x9aa4bc, 0.52));

const hemi = new THREE.HemisphereLight(0xc8d4ec, 0x18121c, 1.18);
scene.add(hemi);

const moonFill = new THREE.DirectionalLight(0x9aaec8, 0.42);
moonFill.position.set(2, 3, 5);
scene.add(moonFill);

const moonKey = new THREE.DirectionalLight(0xb8c8e8, 2.35);
moonKey.position.set(-3.5, 6.5, 4.5);
moonKey.castShadow = true;
moonKey.shadow.mapSize.set(MOBILE ? 768 : 1024, MOBILE ? 768 : 1024);
moonKey.shadow.bias = -0.0002;
moonKey.shadow.normalBias = 0.02;
scene.add(moonKey);

const violetRim = new THREE.DirectionalLight(0x6b4a9e, 1.25);
violetRim.position.set(4.5, 2.5, -5);
scene.add(violetRim);

const softFront = new THREE.DirectionalLight(0x7a6d8c, 0.48);
softFront.position.set(0, 1, 3);
scene.add(softFront);

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

function buildNightStudioEnv(renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();

  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color(0x06050c);

  const addPanel = (color, intensity, pos, rot) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(8, 8),
      new THREE.MeshBasicMaterial({
        color,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    );
    m.position.copy(pos);
    m.rotation.set(rot.x, rot.y, rot.z);
    m.scale.setScalar(intensity);
    envScene.add(m);
  };

  addPanel(0xc8d4f0, 1.4, new THREE.Vector3(-6, 4, 2), new THREE.Euler(0, Math.PI * 0.35, 0));
  addPanel(0x5c3d8f, 0.9, new THREE.Vector3(6, 2, -4), new THREE.Euler(0, -Math.PI * 0.5, 0));
  addPanel(0x8899b0, 0.55, new THREE.Vector3(0, 6, 0), new THREE.Euler(-Math.PI / 2, 0, 0));
  addPanel(0x2a2438, 0.35, new THREE.Vector3(0, -4, 0), new THREE.Euler(Math.PI / 2, 0, 0));

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

function isGlossyAccent(mat) {
  const e = mat?.emissive;
  if (e && (e.r + e.g + e.b > 0.08)) return true;
  if (mat?.metalness > 0.35) return true;
  if (mat?.name && /eye|crystal|gem|wet|vein|glow/i.test(mat.name)) return true;
  return false;
}

function toFurPhysical(source, profile, env, { mane = false, sculpt = false } = {}) {
  const p = new THREE.MeshPhysicalMaterial();
  const maps = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'metalnessMap', 'aoMap', 'emissiveMap'];
  maps.forEach((k) => {
    if (source?.[k]) p[k] = source[k];
  });

  if (source?.color) p.color.copy(source.color);
  if (source?.emissive) p.emissive.copy(source.emissive);
  if (source?.emissiveIntensity !== undefined) p.emissiveIntensity = source.emissiveIntensity;

  const glossy = isGlossyAccent(source);

  if (sculpt) {
    p.color.setHex(mane ? profile.maneColor : profile.bodyColor);
    p.roughness = mane ? profile.roughness * 0.85 : profile.roughness * 1.05;
  } else if (source?.color) {
    p.color.copy(source.color);
    p.color.lerp(new THREE.Color(profile.sheenColor), 0.11);
    p.color.multiplyScalar(1 + profile.coatLift);
    if (source.roughness !== undefined) {
      p.roughness = THREE.MathUtils.clamp(source.roughness + 0.05, 0.42, 0.88);
    } else {
      p.roughness = profile.roughness;
    }
  } else {
    p.roughness = profile.roughness;
  }

  const sheen =
    profile.bodySheen !== undefined ? (mane ? profile.sheen : profile.bodySheen) : profile.sheen;
  p.sheen = glossy ? Math.min(0.35, sheen * 0.4) : sheen;
  p.sheenRoughness = profile.sheenRoughness;
  p.sheenColor.setHex(profile.sheenColor);
  p.metalness = glossy ? Math.max(0.15, source?.metalness ?? 0.1) : 0.04;
  p.anisotropy = glossy ? 0.15 : profile.anisotropy;
  p.anisotropyRotation = 0.35;
  p.clearcoat = glossy ? 0.55 : 0.08;
  p.clearcoatRoughness = glossy ? 0.18 : 0.65;
  p.envMap = env;
  p.envMapIntensity = glossy ? profile.envIntensity * 1.65 : profile.envIntensity;
  p.aoMapIntensity = 1 - (profile.aoLift ?? 0);

  p.userData.furBase = true;
  return p;
}

function addShellFur(mesh, profile, env, { mane = false, layers = 2 } = {}) {
  const shells = [];
  const spread = profile.shellSpread * (mane ? 1.35 : 1);
  const baseSheen = mane && profile.bodySheen !== undefined ? profile.sheen : profile.sheen;

  for (let i = 1; i <= layers; i++) {
    const t = i / layers;
    const shellMat = new THREE.MeshPhysicalMaterial({
      color: 0x101018,
      transparent: true,
      opacity: (0.11 - t * 0.04) * (mane ? 1.2 : 1),
      depthWrite: false,
      side: THREE.BackSide,
      roughness: 0.9,
      metalness: 0,
      sheen: baseSheen * (0.55 + t * 0.35),
      sheenRoughness: profile.sheenRoughness + 0.08,
      sheenColor: new THREE.Color(profile.sheenColor),
      anisotropy: profile.anisotropy * 0.85,
      envMap: env,
      envMapIntensity: profile.envIntensity * 0.6,
    });
    shellMat.userData.isShell = true;

    const shell = mesh.clone();
    shell.material = shellMat;
    shell.castShadow = false;
    shell.receiveShadow = false;
    shell.renderOrder = mesh.renderOrder + i;
    const inflate = spread * i;
    if (MOBILE) {
      shell.scale.multiplyScalar(1 + inflate * 4.2);
    } else {
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
            diffuseColor.a *= smoothstep(0.15, 0.85, fuzz);
          #endif
          #include <opaque_fragment>
        `,
        );
      };
    }

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

  let shellBudget = sculpt && MOBILE ? profile.shellMeshBudget ?? 8 : meshStats.length;
  let shellLayers = profile.shells;
  if (sculpt && MOBILE && profile.mobileShells !== undefined) {
    shellLayers = profile.mobileShells;
  }

  meshStats.forEach(({ mesh, tri }, idx) => {
    const meshBox = new THREE.Box3().setFromObject(mesh);
    const centerY = (meshBox.max.y + meshBox.min.y) * 0.5;
    const mane = sculpt ? centerY >= maneY : centerY >= maneY * 0.92;

    const src = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    const furMat = toFurPhysical(src, profile, env, { mane, sculpt });
    mesh.material = furMat;
    mesh.castShadow = true;
    mesh.receiveShadow = false;

    if (idx < shellBudget && tri < (profile.triangleShellCap ?? Infinity)) {
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
      if (!m) return;
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
  applyStageFur(root, stageId, envMap);
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

envMap = buildNightStudioEnv(renderer);
scene.environment = envMap;
groundMat.envMap = envMap;
pedestal.material.envMap = envMap;

resize();
requestAnimationFrame(tick);
loadStage('nokki', { force: true });

document.addEventListener('visibilitychange', () => {
  if (document.hidden) lastT = performance.now();
});
