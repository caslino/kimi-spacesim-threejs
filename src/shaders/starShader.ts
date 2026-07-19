import * as THREE from 'three'

export function createStarShaderMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
    },
    vertexShader: `
      uniform float uTime;
      uniform float uPixelRatio;
      attribute float aScale;
      attribute vec3 aColor;
      attribute float aTwinkleSpeed;
      
      varying vec3 vColor;
      varying float vTwinkle;
      
      void main() {
        vColor = aColor;
        
        // Twinkle effect
        vTwinkle = 0.7 + 0.3 * sin(uTime * aTwinkleSpeed);
        
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        
        // Size attenuation
        gl_PointSize = aScale * uPixelRatio * (100.0 / -mvPosition.z);
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vTwinkle;
      
      void main() {
        // Circular point
        float dist = length(gl_PointCoord - vec2(0.5));
        if (dist > 0.5) discard;
        
        // Soft edge
        float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
        
        gl_FragColor = vec4(vColor * vTwinkle, alpha * 0.9);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
}
