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

  // Single Main Image Texture (No Ping-Pong Buffers Needed)
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

  // Mouse Tracking State
  let targetMouse = { x: 0.5, y: 0.5 };
  let currentMouse = { x: 0.5, y: 0.5 };
  let decay = 0.0;
  let time = 0.0;
  let inHero = false;

  const heroEl = document.getElementById('hero')

  heroEl.addEventListener('mousemove', (e) => {
    const rect = heroEl.getBoundingClientRect();
    // OGL vUv is (0,0) at bottom-left, (1,1) at top-right
    targetMouse.x = (e.clientX - rect.left) / rect.width;
    targetMouse.y = 1.0 - ((e.clientY - rect.top) / rect.height);
    
    // If just entered, snap current to target to avoid sweeping from center
    if (!inHero) {
        currentMouse.x = targetMouse.x;
        currentMouse.y = targetMouse.y;
        inHero = true;
    }
    
    // Reset decay to full strength on movement
    decay = 1.0; 
  });
  
  heroEl.addEventListener('mouseleave', () => {
    inHero = false;
  });

  // Shader Setup - Single Pass Spherical Barrel Distortion
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
    uniform vec2 uMouse;
    uniform float uDecay;
    uniform float uTime;
    uniform vec2 uResolution;
    uniform float uImageAspect;
    varying vec2 vUv;

    // Cover-fit UV mapping
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
      
      // Aspect-corrected distance calculation so the ripple is a perfect circle
      vec2 aspect = vec2(uResolution.x / uResolution.y, 1.0);
      vec2 uvAspect = vUv * aspect;
      vec2 mouseAspect = uMouse * aspect;
      
      vec2 toMouse = uvAspect - mouseAspect;
      float dist = length(toMouse);
      
      // 1. Smoothstep Falloff (radius of effect)
      float envelope = smoothstep(0.3, 0.0, dist);
      
      // 2. Concentric ring ripple modulation
      // sin(dist * frequency - time * speed)
      float ripple = sin(dist * 30.0 - uTime * 10.0);
      
      // 3. Distortion Strength formulation
      // Base barrel push + ripple modulation, scaled by distance envelope and time decay
      float distortionMagnitude = 0.05 + (ripple * 0.02);
      float strength = distortionMagnitude * envelope * uDecay;
      
      // Calculate normalized direction in standard UV space
      vec2 dir = vUv - uMouse;
      float dirLen = length(dir);
      if (dirLen > 0.0) {
          dir /= dirLen;
      }
      
      // Apply warp: subtracting pulls UVs inward, which creates a bulging fisheye effect outward
      vec2 warpedUV = baseUv - dir * strength;
      
      // Clamp to prevent sampling outside texture boundaries
      warpedUV = clamp(warpedUV, 0.005, 0.995);
      
      gl_FragColor = texture2D(uTexture, warpedUV);
    }
  `

  const program = new Program(gl, {
    vertex,
    fragment,
    uniforms: {
      uTexture: { value: mainTexture },
      uMouse: { value: [0.5, 0.5] },
      uDecay: { value: 0.0 },
      uTime: { value: 0.0 },
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

    // Update Time
    time += dt

    // Smoothly lerp current mouse towards target mouse to create a slow trailing effect
    currentMouse.x += (targetMouse.x - currentMouse.x) * 0.02;
    currentMouse.y += (targetMouse.y - currentMouse.y) * 0.02;

    // Linearly reduce decay to 0 over 5 seconds so it dies out very slowly
    decay = Math.max(0.0, decay - (dt / 5.0));

    // Update Uniforms
    program.uniforms.uMouse.value = [currentMouse.x, currentMouse.y];
    program.uniforms.uDecay.value = decay;
    program.uniforms.uTime.value = time;

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
