// Oil-in-water fluid distortion fragment shader
// Inspired by Navier-Stokes visual approximation

precision highp float;

varying vec2 vUv;

uniform float uTime;
uniform vec2 uMouse;
uniform vec2 uResolution;
uniform float uIntensity;

// Simplex noise functions
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                     -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

// Fluid-like turbulence
float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;
  for (int i = 0; i < 6; i++) {
    value += amplitude * snoise(p * frequency);
    amplitude *= 0.5;
    frequency *= 2.0;
  }
  return value;
}

void main() {
  vec2 uv = vUv;
  vec2 aspect = vec2(uResolution.x / uResolution.y, 1.0);
  vec2 uvAspect = uv * aspect;

  // Mouse influence
  vec2 mouseAspect = uMouse * aspect;
  float mouseDist = distance(uvAspect, mouseAspect);
  float mouseInfluence = smoothstep(0.5, 0.0, mouseDist) * uIntensity;

  // Time-based flow
  float slowTime = uTime * 0.15;
  float medTime = uTime * 0.3;

  // Create layered fluid distortion
  vec2 distortion = vec2(
    fbm(uvAspect * 3.0 + vec2(slowTime, 0.0) + mouseInfluence * 0.5),
    fbm(uvAspect * 3.0 + vec2(0.0, slowTime) + mouseInfluence * 0.5)
  );

  // Second distortion layer (oil patterns)
  vec2 distortion2 = vec2(
    fbm(uvAspect * 2.0 + distortion + vec2(medTime * 0.7, medTime * 0.3)),
    fbm(uvAspect * 2.0 + distortion + vec2(medTime * 0.3, medTime * 0.7))
  );

  // Apply distortion
  vec2 finalUV = uv + distortion2 * 0.04 + distortion * 0.02;

  // Color palette: deep dark luxury tones with gold accents
  vec3 darkTeal = vec3(0.176, 0.274, 0.022);        // Dark green
  vec3 emeraldDeep = vec3(0.353, 0.561, 0.047);     // #5a8f0c
  vec3 darkGold = vec3(0.545, 0.353, 0.169);        // Dark gold #8B5A2B
  vec3 gold = vec3(0.831, 0.686, 0.216);            // #D4AF37 luxury gold
  vec3 warmGlow = vec3(0.878, 0.722, 0.388);        // Warm golden glow

  // Create color layers like oil on water
  float layer1 = fbm(finalUV * 4.0 + vec2(slowTime * 0.5));
  float layer2 = fbm(finalUV * 6.0 - vec2(slowTime * 0.3));
  float layer3 = snoise(finalUV * 8.0 + distortion2);

  // Mix colors based on layers - darker base with gold highlights
  vec3 color = darkTeal;
  color = mix(color, emeraldDeep, smoothstep(-0.3, 0.3, layer1));
  color = mix(color, darkGold, smoothstep(0.0, 0.6, layer2) * 0.4);

  // Add iridescent gold accents (like oil film)
  float iridescence = smoothstep(0.3, 0.5, layer3) * smoothstep(0.7, 0.5, layer3);
  color = mix(color, gold, iridescence * 0.4);

  // Mouse highlight - golden glow near cursor
  float mouseGlow = smoothstep(0.3, 0.0, mouseDist) * mouseInfluence;
  color = mix(color, warmGlow, mouseGlow * 0.25);

  // Stronger vignette for dramatic effect
  float vignette = smoothstep(1.4, 0.5, length(uv - 0.5) * 2.0);
  color *= mix(0.5, 1.0, vignette);

  // Final output
  gl_FragColor = vec4(color, 1.0);
}
