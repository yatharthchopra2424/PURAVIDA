"use client";

import { Canvas, useFrame, useThree, extend } from "@react-three/fiber";
import { shaderMaterial, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { useRef } from "react";

// --- Shader Material Definition ---
const FluidDistortionMaterial = shaderMaterial(
    {
        uTime: 0,
        uTexture: new THREE.Texture(),
        uMouse: new THREE.Vector2(0, 0),
        uResolution: new THREE.Vector2(1, 1),
        uHover: 0,
    },
    // Vertex Shader
    `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
    // Fragment Shader
    `
    uniform float uTime;
    uniform sampler2D uTexture;
    uniform vec2 uMouse;
    uniform vec2 uResolution;
    uniform float uHover;
    varying vec2 vUv;

    // Simplex Noise (simplified for brevity)
    vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
    float snoise(vec2 v){
      const vec4 C = vec4(0.211324865405187, 0.366025403784439,
               -0.577350269189626, 0.024390243902439);
      vec2 i  = floor(v + dot(v, C.yy) );
      vec2 x0 = v -   i + dot(i, C.xx);
      vec2 i1;
      i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
      vec4 x12 = x0.xyxy + C.xxzz;
      x12.xy -= i1;
      i = mod(i, 289.0);
      vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
      + i.x + vec3(0.0, i1.x, 1.0 ));
      vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
      m = m*m ;
      m = m*m ;
      vec3 x = 2.0 * fract(p * C.www) - 1.0;
      vec3 h = abs(x) - 0.5;
      vec3 ox = floor(x + 0.5);
      vec3 a0 = x - ox;
      m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
      vec3 g;
      g.x  = a0.x  * x0.x  + h.x  * x0.y;
      g.yz = a0.yz * x12.xz + h.yz * x12.yw;
      return 130.0 * dot(m, g);
    }

    void main() {
      vec2 uv = vUv;
      
      // Aspect Ratio Correction (Cover)
      vec2 ratio = vec2(
        min((uResolution.x / uResolution.y) / (1920.0/1080.0), 1.0),
        min((uResolution.y / uResolution.x) / (1080.0/1920.0), 1.0)
      );
      vec2 uvCover = vec2(
        uv.x * ratio.x + (1.0 - ratio.x) * 0.5,
        uv.y * ratio.y + (1.0 - ratio.y) * 0.5
      );

      // Ripple Effect based on mouse (slower and more subtle)
      float dist = distance(uv, uMouse);
      float ripple = sin(dist * 15.0 - uTime * 1.0) * 0.015 * uHover;
      
      // Fluid drift (slower movement)
      float noise = snoise(uv * 2.5 + uTime * 0.05);
      
      vec2 distortedUV = uvCover + vec2(noise * 0.02 + ripple, noise * 0.02 + ripple);

      vec4 color = texture2D(uTexture, distortedUV);
      
      // Add a very subtle green tint overlay
      color.rgb = mix(color.rgb, vec3(0.353, 0.561, 0.047), 0.05);
      
      // Increased darkening for better text contrast
      color.rgb *= 0.70;

      gl_FragColor = color;
    }
  `
);

extend({ FluidDistortionMaterial });

// --- Scene Setup ---
const FluidScene = () => {
    const { viewport, size } = useThree();
    const materialRef = useRef<THREE.Material>(null);

    // Load texture
    const texture = useTexture("/images/hero-bg.png");

    useFrame((state) => {
        if (materialRef.current) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const mat = materialRef.current as any;
            
            // Slow down time significantly for gentler animation
            mat.uTime = state.clock.getElapsedTime() * 0.15;

            // Smooth mouse interaction with slower response
            const targetX = (state.pointer.x + 1) / 2;
            const targetY = (state.pointer.y + 1) / 2;

            // Slower lerp for more subtle mouse movement
            mat.uMouse.x += (targetX - mat.uMouse.x) * 0.03;
            mat.uMouse.y += (targetY - mat.uMouse.y) * 0.03;

            mat.uHover = THREE.MathUtils.lerp(mat.uHover, 1.0, 0.02);

            mat.uResolution.set(size.width, size.height);
        }
    });

    return (
        <mesh scale={[viewport.width, viewport.height, 1]}>
            <planeGeometry args={[1, 1, 32, 32]} />
            {/* @ts-expect-error - Three.js custom material */}
            <fluidDistortionMaterial ref={materialRef} uTexture={texture} />
        </mesh>
    );
};

export const FluidBackground = () => {
    return (
        <div className="absolute inset-0 z-0 bg-black">
            <Canvas 
                camera={{ position: [0, 0, 1] }} 
                dpr={[1, 2]}
                gl={{
                    antialias: false,
                    alpha: false,
                    powerPreference: "high-performance",
                }}
            >
                <FluidScene />
            </Canvas>
            
            {/* Minimal overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-transparent to-black/25 pointer-events-none" />
        </div>
    );
};
