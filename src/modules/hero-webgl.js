import { Renderer, Program, Mesh, Triangle, Texture } from 'ogl'

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

  // Main Image Texture
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

  // --- TRAIL ARRAY SETUP ---
  const MAX_POINTS = 100;
  // Each point is [x, y, age]
  const trail = new Array(MAX_POINTS * 3).fill(0);
  const MAX_AGE = 6.0; // 6 seconds to die out entirely

  for (let i = 0; i < MAX_POINTS * 3; i += 3) {
      trail[i + 2] = MAX_AGE; // Start all points as dead
  }
  let trailIndex = 0;

  // Mouse Tracking
  let mouse = { x: 0.5, y: 0.5 };
  let prevMouse = { x: 0.5, y: 0.5 };
  let inHero = false;

  const heroEl = document.getElementById('hero')

  heroEl.addEventListener('mousemove', (e) => {
    const rect = heroEl.getBoundingClientRect();
    mouse.x = (e.clientX - rect.left) / rect.width;
    mouse.y = 1.0 - ((e.clientY - rect.top) / rect.height);
    
    if (!inHero) {
        prevMouse.x = mouse.x;
        prevMouse.y = mouse.y;
        inHero = true;
    }
  });
  
  heroEl.addEventListener('mouseleave', () => {
    inHero = false;
  });

  // Shader Setup - Fisheye/Ripple mapped across array of droplets
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
    #define MAX_POINTS 100

    uniform sampler2D uTexture;
    uniform vec3 uTrail[MAX_POINTS]; // [x, y, age]
    uniform float uMaxAge;
    uniform vec2 uResolution;
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
      
      vec2 aspect = vec2(uResolution.x / uResolution.y, 1.0);
      vec2 uvAspect = vUv * aspect;
      
      vec2 totalDisplacement = vec2(0.0);
      
      for(int i = 0; i < MAX_POINTS; i++) {
          vec3 point = uTrail[i];
          float age = point.z;
          
          if (age >= uMaxAge) continue;
          
          vec2 mouseAspect = point.xy * aspect;
          vec2 toMouse = uvAspect - mouseAspect;
          float dist = length(toMouse);
          
          // Small radius for drops (0.04 matches the previous size request)
          float envelope = smoothstep(0.04, 0.0, dist);
          
          if (envelope > 0.0) {
              // Concentric ring ripple modulation
              float ripple = sin(dist * 60.0 - age * 15.0);
              
              // Distortion Magnitude
              float distortionMagnitude = 0.05 + (ripple * 0.015);
              
              // Decay the bulge slowly over its lifetime
              float decay = 1.0 - (age / uMaxAge);
              float strength = distortionMagnitude * envelope * decay;
              
              // Calculate normalized direction in standard UV space
              vec2 dir = vUv - point.xy;
              float dirLen = length(dir);
              if (dirLen > 0.0) {
                  dir /= dirLen;
              }
              
              totalDisplacement += dir * strength;
          }
      }
      
      // Pull UVs inward to create bulging fisheye effect outward
      vec2 warpedUV = baseUv - totalDisplacement;
      
      // Clamp to prevent texture repeating/barcode edge bleeding
      warpedUV = clamp(warpedUV, 0.005, 0.995);
      
      gl_FragColor = texture2D(uTexture, warpedUV);
    }
  `

  const program = new Program(gl, {
    vertex,
    fragment,
    uniforms: {
      uTexture: { value: mainTexture },
      uTrail: { value: trail },
      uMaxAge: { value: MAX_AGE },
      uResolution: { value: [window.innerWidth, window.innerHeight] },
      uImageAspect: { value: imageAspect }
    }
  })

  const geometry = new Triangle(gl)
  const mesh = new Mesh(gl, { geometry, program })

  let isVisible = true
  document.addEventListener('visibilitychange', () => { isVisible = !document.hidden })
  let lastTime = performance.now()

  function animate(now) {
    requestAnimationFrame(animate)
    if (!isVisible) return

    const dt = (now - lastTime) / 1000.0
    lastTime = now

    // Increase age of all active drops
    for (let i = 0; i < MAX_POINTS; i++) {
        if (trail[i * 3 + 2] < MAX_AGE) {
            trail[i * 3 + 2] += dt;
        }
    }

    if (inHero) {
        // Distance in UV space
        const dx = mouse.x - prevMouse.x;
        const dy = mouse.y - prevMouse.y;
        const distance = Math.hypot(dx, dy);
        
        // Drop a point every 0.01 UV distance (~20 pixels) to create a line of discrete droplets
        const dropThreshold = 0.01;
        
        if (distance > dropThreshold) {
            const steps = Math.max(1, Math.floor(distance / dropThreshold));
            
            for (let i = 1; i <= steps; i++) {
                const t = i / steps;
                const px = prevMouse.x + dx * t;
                const py = prevMouse.y + dy * t;
                
                // Add new drop to array
                trail[trailIndex * 3] = px;
                trail[trailIndex * 3 + 1] = py;
                trail[trailIndex * 3 + 2] = 0.0; // Age = 0
                
                trailIndex = (trailIndex + 1) % MAX_POINTS;
            }
            prevMouse.x = mouse.x;
            prevMouse.y = mouse.y;
        }
    }

    // Force OGL to upload the new array data to the GPU by passing a new standard Array reference
    program.uniforms.uTrail.value = trail.slice(0);
    
    renderer.render({ scene: mesh })
  }

  function resize() {
    renderer.setSize(window.innerWidth, window.innerHeight)
    program.uniforms.uResolution.value = [window.innerWidth, window.innerHeight]
  }
  
  window.addEventListener('resize', resize)
  resize()
  requestAnimationFrame(animate)
}
