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
uniform float uMapMul;
uniform vec3 uCoatFloor;
uniform vec3 uTint;
uniform float uAmbient;
uniform float uHasMap;
uniform vec3 uBaseColor;

varying vec2 vUv;
varying vec3 vNormalW;
varying vec3 vViewDirW;

void main() {
  vec3 raw = uHasMap > 0.5 ? texture2D(map, vUv).rgb : uBaseColor;
  float rawLum = dot(raw, vec3(0.2126, 0.7152, 0.0722));

  vec3 coat = pow(max(raw, 0.0), vec3(0.5)) * uMapMul;
  coat = max(coat, uCoatFloor);
  coat *= uTint;

  vec3 N = normalize(vNormalW);
  vec3 L = normalize(uKeyDir);
  vec3 V = normalize(vViewDirW);

  float wrapLit = max(0.0, (dot(N, L) + uWrap) / (1.0 + uWrap));
  vec3 diffuse = coat * wrapLit * uKeyColor;

  float fresnel = pow(1.0 - clamp(abs(dot(N, V)), 0.0, 1.0), uRimPower);
  vec3 rim = uRimColor * fresnel * uRimStrength;

  float eyeHot = smoothstep(0.18, 0.45, rawLum);
  vec3 glowCol = mix(raw, raw * vec3(0.62, 0.42, 1.0), 0.55);
  vec3 glow = glowCol * eyeHot * uGlow;

  vec3 col = diffuse + rim + glow + coat * uAmbient;
  col = col / (col + vec3(1.0));
  col = min(col, vec3(1.0));
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

  const floor = new THREE.Vector3(...(s.floor || [0.07, 0.06, 0.1]));
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
    uWrap: { value: s.wrap ?? 0.5 },
    uRimPower: { value: s.rimPower ?? 2.2 },
    uRimStrength: { value: s.rimStrength ?? 0.55 },
    uGlow: { value: s.glow ?? 1.25 },
    uMapMul: { value: s.mapMul ?? 2.1 },
    uCoatFloor: { value: floor },
    uTint: { value: tint },
    uAmbient: { value: s.ambient ?? 0.22 },
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
  mat.uniforms.uWrap.value = s.wrap ?? 0.5;
  mat.uniforms.uRimPower.value = s.rimPower ?? 2.2;
  mat.uniforms.uRimStrength.value = s.rimStrength ?? 0.55;
  mat.uniforms.uGlow.value = s.glow ?? 1.25;
  mat.uniforms.uMapMul.value = s.mapMul ?? 2.1;
  mat.uniforms.uCoatFloor.value.set(...(s.floor || [0.07, 0.06, 0.1]));
  mat.uniforms.uTint.value.set(...(s.tint || [1, 1, 1]));
  mat.uniforms.uAmbient.value = s.ambient ?? 0.22;
}
