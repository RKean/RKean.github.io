import * as THREE from 'three';

export const TEXTURED_FALLBACK = new THREE.Vector3(0.16, 0.14, 0.22);

export const COAT_VERT = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vViewDirW;

void main() {
  vUv = uv;
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vNormalW = normalize(mat3(modelMatrix) * normal);
  vViewDirW = normalize(cameraPosition - worldPos.xyz);
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

export const COAT_FRAG = /* glsl */ `
precision highp float;

uniform sampler2D map;
uniform vec3 uKeyDir;
uniform vec3 uKeyColor;
uniform vec3 uRimColor;
uniform float uWrap;
uniform float uRimPower;
uniform float uRimStrength;
uniform float uGlow;
uniform float uDarkGain;
uniform float uHiGain;
uniform float uHiStart;
uniform float uHiEnd;
uniform vec3 uCoatFloor;
uniform vec3 uTint;
uniform float uAmbient;
uniform float uHasMap;
uniform vec3 uBaseColor;

varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vViewDirW;

vec3 toneHighlight(vec3 col) {
  vec3 clamped = min(col, vec3(1.0));
  vec3 excess = max(col - vec3(1.0), vec3(0.0));
  return clamped + excess / (excess + vec3(1.0));
}

void main() {
  vec3 raw = uHasMap > 0.5 ? texture2D(map, vUv).rgb : uBaseColor;
  float rawLum = dot(raw, vec3(0.2126, 0.7152, 0.0722));

  float hi = smoothstep(uHiStart, uHiEnd, rawLum);
  vec3 darkCoat = raw * uDarkGain;
  vec3 hiCoat = pow(max(raw, 0.0), vec3(0.82)) * uHiGain;
  hiCoat = mix(hiCoat, hiCoat + vec3(0.12, 0.11, 0.1), smoothstep(0.12, 0.35, rawLum));
  vec3 coat = mix(darkCoat, hiCoat, hi);
  coat = max(coat, uCoatFloor);
  coat *= uTint;

  vec3 N = normalize(vNormalW);
  vec3 L = normalize(uKeyDir);
  vec3 V = normalize(vViewDirW);

  float wrapLit = max(0.0, (dot(N, L) + uWrap) / (1.0 + uWrap));
  vec3 diffuse = coat * wrapLit * uKeyColor;

  float fresnel = pow(1.0 - clamp(abs(dot(N, V)), 0.0, 1.0), uRimPower);
  vec3 rim = uRimColor * fresnel * uRimStrength;

  float lumHot = smoothstep(0.14, 0.4, rawLum);
  float chromaV = max(raw.b - max(raw.r, raw.g) * 0.55, 0.0);
  float violetHot = smoothstep(0.04, 0.18, chromaV);
  float glowMask = clamp(max(lumHot, violetHot * 1.15), 0.0, 1.0);
  vec3 glowCol = mix(raw * uDarkGain, raw * vec3(0.58, 0.38, 1.08), 0.72);
  vec3 glow = glowCol * glowMask * uGlow;

  vec3 col = diffuse + rim + glow + coat * uAmbient;
  col = toneHighlight(col);
  gl_FragColor = vec4(col, 1.0);
}
`;

let _dummyMap = null;
function dummyMap() {
  if (!_dummyMap) {
    _dummyMap = new THREE.DataTexture(new Uint8Array([40, 36, 56, 255]), 1, 1, THREE.RGBAFormat);
    _dummyMap.colorSpace = THREE.NoColorSpace;
    _dummyMap.needsUpdate = true;
  }
  return _dummyMap;
}

export function textureReady(tex) {
  if (!tex?.image) return false;
  const img = tex.image;
  const w = img.width ?? img.naturalWidth ?? img.displayWidth ?? 0;
  const h = img.height ?? img.naturalHeight ?? img.displayHeight ?? 0;
  return w > 0 && h > 0;
}

const DEFAULT_FLOOR = [0.028, 0.025, 0.038];

/** @param {object} opts */
export function createCoatShaderMaterial(opts) {
  const {
    map: mapIn = null,
    shaderPreset: s,
    sculpt = false,
    mane = false,
    bodyColor = 0x38324a,
    maneColor = 0xb8c0d8,
  } = opts;

  const floor = new THREE.Vector3(...(s.floor || DEFAULT_FLOOR));
  const tint = new THREE.Vector3(...(s.tint || [1, 1, 1]));

  const useMap = mapIn && textureReady(mapIn);
  let map = null;
  if (useMap) {
    map = mapIn;
    map.colorSpace = THREE.NoColorSpace;
  }

  const base = sculpt
    ? new THREE.Color(mane ? maneColor : bodyColor)
    : new THREE.Color().setRGB(TEXTURED_FALLBACK.x, TEXTURED_FALLBACK.y, TEXTURED_FALLBACK.z);

  const uniforms = {
    map: { value: map || dummyMap() },
    uKeyDir: { value: new THREE.Vector3(...s.keyDir).normalize() },
    uKeyColor: { value: new THREE.Color(...s.keyColor) },
    uRimColor: { value: new THREE.Color(...s.rimColor) },
    uWrap: { value: s.wrap ?? 0.36 },
    uRimPower: { value: s.rimPower ?? 2.2 },
    uRimStrength: { value: s.rimStrength ?? 0.72 },
    uGlow: { value: s.glow ?? 1.9 },
    uDarkGain: { value: s.darkGain ?? 12 },
    uHiGain: { value: s.hiGain ?? 3.1 },
    uHiStart: { value: s.hiStart ?? 0.02 },
    uHiEnd: { value: s.hiEnd ?? 0.18 },
    uCoatFloor: { value: floor },
    uTint: { value: tint },
    uAmbient: { value: s.ambient ?? 0.12 },
    uHasMap: { value: useMap ? 1 : 0 },
    uBaseColor: {
      value: new THREE.Vector3(base.r, base.g, base.b),
    },
  };

  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: COAT_VERT,
    fragmentShader: COAT_FRAG,
    lights: false,
    toneMapped: false,
    side: THREE.DoubleSide,
    depthWrite: true,
    transparent: false,
  });

  if (map) {
    mat.map = map;
  }

  mat.userData.coatShader = true;
  mat.userData.sculpt = sculpt;
  mat.userData.mane = mane;
  mat.userData.coatMap = map;
  return mat;
}

/** @param {THREE.Material} mat @param {object} s */
export function applyShaderPresetToMaterial(mat, s) {
  if (!mat?.userData?.coatShader || !mat.uniforms) return;
  mat.uniforms.uKeyDir.value.set(...s.keyDir).normalize();
  mat.uniforms.uKeyColor.value.setRGB(...s.keyColor);
  mat.uniforms.uRimColor.value.setRGB(...s.rimColor);
  mat.uniforms.uWrap.value = s.wrap ?? 0.36;
  mat.uniforms.uRimPower.value = s.rimPower ?? 2.2;
  mat.uniforms.uRimStrength.value = s.rimStrength ?? 0.72;
  mat.uniforms.uGlow.value = s.glow ?? 1.9;
  mat.uniforms.uDarkGain.value = s.darkGain ?? 12;
  mat.uniforms.uHiGain.value = s.hiGain ?? 3.1;
  mat.uniforms.uHiStart.value = s.hiStart ?? 0.02;
  mat.uniforms.uHiEnd.value = s.hiEnd ?? 0.18;
  mat.uniforms.uCoatFloor.value.set(...(s.floor || DEFAULT_FLOOR));
  mat.uniforms.uTint.value.set(...(s.tint || [1, 1, 1]));
  mat.uniforms.uAmbient.value = s.ambient ?? 0.12;
}
