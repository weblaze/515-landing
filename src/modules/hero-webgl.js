import { Renderer, Program, Mesh, Triangle, Texture } from 'ogl'

const CONFIG = {
  brushSize: 0.03,       // Smaller radius for the drops
  brushStrength: 0.6,    // Height of the liquid drops
  decay: 0.995,          // extremely slow fade out (leaves a long trail)
  distortionScale: 0.1   // Magnification bulge amount
};

export function initHeroWebGL() {
  const canvas = document.getElementById('hero-canvas')
  if (!canvas) return

  const heroImgEl = document.querySelector('.hero-image')

  const renderer = new Renderer({ 
    canvas, 
    width: window.innerWidth,
    height: window.innerHeight,
    alpha: false, 
    dpr: Math.min(window.devicePixelRatio, 2) 
  })
  const gl = renderer.gl
  gl.clearColor(0, 0, 0, 1)

  // 1. Setup Hidden 2D Canvas (The Displacement Height Map)
  const dispCanvas = document.createElement('canvas');
  dispCanvas.width = window.innerWidth;
  dispCanvas.height = window.innerHeight;
  const ctx = dispCanvas.getContext('2d', { willReadFrequently: true });
  
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, dispCanvas.width, dispCanvas.height);

  const dispTexture = new Texture(gl, {
    image: dispCanvas,
    generateMipmaps: false,
    minFilter: gl.LINEAR,
    magFilter: gl.LINEAR
  });

  // 2. Main Image Texture
  const mainTexture = new Texture(gl, {
    generateMipmaps: false,
    minFilter: gl.LINEAR,
    magFilter: gl.LINEAR,
    wrapS: gl.CLAMP_TO_EDGE,
    wrapT: gl.CLAMP_TO_EDGE
  })
  
  let imageAspect = 1.5;

  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.onload = () => {
    mainTexture.image = img
    imageAspect = img.naturalWidth / img.naturalHeight
    if (program) {
        program.uniforms.uImageAspect.value = imageAspect
    }
    if (heroImgEl) {
      heroImgEl.style.opacity = '0'
      heroImgEl.style.pointerEvents = 'none'
    }
  }
  img.src = heroImgEl?.getAttribute('src') || '/hero.webp'

  // 3. Mouse Tracking
  let mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  let prevMouse = { x: mouse.x, y: mouse.y };
  let inHero = false;

  const heroEl = document.getElementById('hero')

  heroEl.addEventListener('mousemove', (e) => {
    const rect = heroEl.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
    
    if (!inHero) {
        prevMouse.x = mouse.x;
        prevMouse.y = mouse.y;
        inHero = true;
    }
  });
  
  heroEl.addEventListener('mouseleave', () => {
    inHero = false;
  });

  // 4. Shader Setup
  const vertex = `
    attribute vec2 uv;
    attribute vec3 position;
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 1.0);
    }
  `

  const fragment = `
    precision highp float;
    uniform sampler2D uTexture;
    uniform sampler2D uDispMap;
    uniform float uDistortionScale;
    uniform vec2 uResolution;
    uniform vec2 uTexel;
    uniform float uImageAspect;
    varying vec2 vUv;

    vec2 coverUv(vec2 uv, vec2 res, float imgAspect) {
      float screenAspect = res.x / res.y;
      vec2 s = vec2(1.0);
      if (screenAspect > imgAspect) {
        s.y = screenAspect / imgAspect;
      } else {
        s.x = imgAspect / screenAspect;
      }
      return (uv - 0.5) * s + 0.5;
    }

    void main() {
      vec2 baseUv = coverUv(vUv, uResolution, uImageAspect);
      
      // Sample the center height of the displacement map
      float center = texture2D(uDispMap, vUv).r;
      
      // Optimization: if there's no displacement here, render normally
      if (center < 0.001) {
          gl_FragColor = texture2D(uTexture, baseUv);
          return;
      }

      // Compute gradient (slope) of the displacement map by sampling neighbors
      float right = texture2D(uDispMap, vUv + vec2(uTexel.x, 0.0)).r;
      float left  = texture2D(uDispMap, vUv - vec2(uTexel.x, 0.0)).r;
      float up    = texture2D(uDispMap, vUv + vec2(0.0, uTexel.y)).r;
      float down  = texture2D(uDispMap, vUv - vec2(0.0, uTexel.y)).r;
      
      vec2 grad = vec2(right - left, up - down);
      
      // Create ripple effect inside the drop based on its height
      float ripple = sin(center * 20.0);
      float magnitude = uDistortionScale + (ripple * 0.01);
      
      // Pull UVs inward along the gradient slope to create an outward bulging fisheye effect
      vec2 warpedUV = baseUv - grad * magnitude;
      
      // Clamp to prevent edge bleeding
      warpedUV = clamp(warpedUV, 0.005, 0.995);
      
      gl_FragColor = texture2D(uTexture, warpedUV);
    }
  `

  const program = new Program(gl, {
    vertex,
    fragment,
    uniforms: {
      uTexture: { value: mainTexture },
      uDispMap: { value: dispTexture },
      uDistortionScale: { value: CONFIG.distortionScale },
      uResolution: { value: [window.innerWidth, window.innerHeight] },
      uTexel: { value: [1.0 / window.innerWidth, 1.0 / window.innerHeight] },
      uImageAspect: { value: imageAspect }
    }
  })

  const geometry = new Triangle(gl)
  const mesh = new Mesh(gl, { geometry, program })

  // 5. Render Loop
  let isVisible = true
  document.addEventListener('visibilitychange', () => { isVisible = !document.hidden })

  function animate() {
    requestAnimationFrame(animate)
    if (!isVisible) return

    // Fade out the hidden canvas very slowly
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = `rgba(0, 0, 0, ${1.0 - CONFIG.decay})`;
    ctx.fillRect(0, 0, dispCanvas.width, dispCanvas.height);

    if (inHero) {
        const distance = Math.hypot(mouse.x - prevMouse.x, mouse.y - prevMouse.y);
        const radius = dispCanvas.width * CONFIG.brushSize;
        
        if (distance > 0.1) {
            // Draw droplets along the path
            const steps = Math.max(1, Math.ceil(distance / (radius * 0.2)));

            for (let i = 1; i <= steps; i++) {
                const t = i / steps;
                const px = prevMouse.x + (mouse.x - prevMouse.x) * t;
                const py = prevMouse.y + (mouse.y - prevMouse.y) * t;

                const gradient = ctx.createRadialGradient(
                    px, py, 0,
                    px, py, radius
                );
                gradient.addColorStop(0, `rgba(255, 255, 255, ${CONFIG.brushStrength})`);
                gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

                // Use 'lighten' to merge drops without building up an unnatural flat plateau
                ctx.globalCompositeOperation = 'lighten';
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(px, py, radius, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        prevMouse.x = mouse.x;
        prevMouse.y = mouse.y;
    }

    // Pass the updated height map to the shader
    dispTexture.image = dispCanvas;
    dispTexture.needsUpdate = true;
    
    renderer.render({ scene: mesh })
  }

  function resize() {
    renderer.setSize(window.innerWidth, window.innerHeight)
    dispCanvas.width = window.innerWidth;
    dispCanvas.height = window.innerHeight;
    program.uniforms.uResolution.value = [window.innerWidth, window.innerHeight]
    program.uniforms.uTexel.value = [1.0 / window.innerWidth, 1.0 / window.innerHeight]
    
    // Clear canvas on resize to prevent scaling artifacts
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, dispCanvas.width, dispCanvas.height);
  }
  
  window.addEventListener('resize', resize)
  resize()
  animate()
}
