import * as THREE from 'three';

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

  float hot = smoothstep(0.02, 0.12, rawLum);
  float hotHi = smoothstep(0.12, 0.42, rawLum);
  vec3 glowCol = mix(raw, raw * vec3(0.7, 0.45, 1.0), 0.65);
  vec3 glow = glowCol * (hot * 0.55 + hotHi * 2.4) * uGlow;

  vec3 col = diffuse + rim + glow + coat * uAmbient;
  gl_FragColor = vec4(col, 1.0);
}
`;

let _dummyMap = null;
function dummyMap() {
  if (!_dummyMap) {
    _dummyMap = new THREE.DataTexture(new Uint8Array([120, 110, 140, 255]), 1, 1, THREE.RGBAFormat);
    _dummyMap.colorSpace = THREE.SRGBColorSpace;
    _dummyMap.needsUpdate = true;
  }
  return _dummyMap;
}

/** @param {object} opts */
export function createCoatShaderMaterial(opts) {
  const {
    map = null,
    shaderPreset: s,
    sculpt = false,
    mane = false,
    bodyColor = 0x38324a,
    maneColor = 0xb8c0d8,
  } = opts;

  const floor = new THREE.Vector3(...(s.floor || [0.08, 0.07, 0.12]));
  const tint = new THREE.Vector3(...(s.tint || [1, 1, 1]));

  const base = new THREE.Color(mane ? maneColor : bodyColor);
  const uniforms = {
    map: { value: map || dummyMap() },
    uKeyDir: { value: new THREE.Vector3(...s.keyDir).normalize() },
    uKeyColor: { value: new THREE.Color(...s.keyColor) },
    uRimColor: { value: new THREE.Color(...s.rimColor) },
    uWrap: { value: s.wrap ?? 0.5 },
    uRimPower: { value: s.rimPower ?? 2.2 },
    uRimStrength: { value: s.rimStrength ?? 0.9 },
    uGlow: { value: s.glow ?? 3 },
    uMapMul: { value: s.mapMul ?? 2.4 },
    uCoatFloor: { value: floor },
    uTint: { value: tint },
    uAmbient: { value: s.ambient ?? 0.35 },
    uHasMap: { value: map ? 1 : 0 },
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
    map.colorSpace = THREE.SRGBColorSpace;
  }

  mat.userData.coatShader = true;
  mat.userData.sculpt = sculpt;
  mat.userData.mane = mane;
  mat.userData.shaderPresetRef = s;
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
  mat.uniforms.uRimStrength.value = s.rimStrength ?? 0.9;
  mat.uniforms.uGlow.value = s.glow ?? 3;
  mat.uniforms.uMapMul.value = s.mapMul ?? 2.4;
  mat.uniforms.uCoatFloor.value.set(...(s.floor || [0.08, 0.07, 0.12]));
  mat.uniforms.uTint.value.set(...(s.tint || [1, 1, 1]));
  mat.uniforms.uAmbient.value = s.ambient ?? 0.35;
}
