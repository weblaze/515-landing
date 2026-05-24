import { Renderer, Program, Mesh, Triangle, Texture, RenderTarget, Geometry } from 'ogl'

export function initLegacyHero() {
  const heroEl = document.getElementById('hero')
  if (!heroEl) return

  // Restore WebGL HTML markup if the pretext grid is currently in the DOM
  let canvas = document.getElementById('hero-canvas')
  if (!canvas) {
    heroEl.innerHTML = `
      <canvas id="hero-canvas"></canvas>
      <img class="hero-image" src="/hero.webp" alt="515 House" data-hero-src="/hero.webp">
      <div class="hero-center-title halation-text">
        <h1>515<br>HOUSE</h1>
      </div>
      <div class="hero-bottom-left">
        <span class="hero-tagline">Creative agency. Three people.</span>
      </div>
      <div class="hero-bottom-right">
        <span class="hero-scroll-hint">[ Scroll ]</span>
      </div>
    `
    // Reset hero classes and styles to default WebGL layout
    heroEl.className = ''
    heroEl.style = ''
    
    canvas = document.getElementById('hero-canvas')
  }

  const heroImgEl = document.querySelector('.hero-image')

  const renderer = new Renderer({ 
    canvas, 
    width: window.innerWidth,
    height: window.innerHeight,
    alpha: false, 
    dpr: Math.min(window.devicePixelRatio, 2) 
  })
  const gl = renderer.gl
  
  function clearWithThemeColor() {
    const style = window.getComputedStyle(document.documentElement);
    const bg = style.getPropertyValue('--bg-primary').trim();
    let r = 10/255, g = 10/255, b = 10/255;
    if (bg === '#0f0e0b') { r = 15/255; g = 14/255; b = 11/255; }
    else if (bg === '#f5f3ef') { r = 245/255; g = 243/255; b = 239/255; }
    gl.clearColor(r, g, b, 1);
  }

  clearWithThemeColor()

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
    if (mainProgram) {
        mainProgram.uniforms.uImageAspect.value = imageAspect
    }
    if (heroImgEl) {
      heroImgEl.style.opacity = '0'
      heroImgEl.style.pointerEvents = 'none'
    }
  }
  img.src = heroImgEl?.getAttribute('src') || '/hero.webp'

  // --- PARTICLE DROPS SETUP ---
  const MAX_DROPS = 1000;
  const MAX_AGE = 6.0;

  const positionData = new Float32Array(MAX_DROPS * 2);
  const ageData = new Float32Array(MAX_DROPS);
  for (let i = 0; i < MAX_DROPS; i++) {
      ageData[i] = MAX_AGE; // Start all dead
  }
  let dropHead = 0;

  const pointsGeometry = new Geometry(gl, {
      position: { size: 2, data: positionData },
      age: { size: 1, data: ageData }
  });

  const pointsVertex = `
    attribute vec2 position;
    attribute float age;
    uniform float uMaxAge;
    varying float vAge;

    void main() {
        if (age >= uMaxAge) {
            gl_Position = vec4(-2.0, -2.0, 0.0, 1.0); // Offscreen
            return;
        }
        vAge = age;
        
        // Growth: start medium (80px), grow slowly to large (250px)
        float growth = age / uMaxAge;
        float size = 80.0 + growth * 170.0;
        gl_PointSize = size;
        
        // Map UV coordinates (0 to 1) to Clip Space (-1 to 1)
        vec2 clipPos = position * 2.0 - 1.0;
        gl_Position = vec4(clipPos, 0.0, 1.0);
    }
  `;

  const pointsFragment = `
    precision highp float;
    varying float vAge;
    uniform float uMaxAge;

    void main() {
        vec2 coord = gl_PointCoord * 2.0 - 1.0;
        float dist = length(coord);
        if (dist > 1.0) discard;
        
        // Soft edge envelope
        float envelope = smoothstep(1.0, 0.0, dist);
        
        // Ripple modulation
        float ripple = sin(dist * 30.0 - vAge * 15.0);
        
        // Decay strength slowly
        float decay = 1.0 - (vAge / uMaxAge);
        
        // Strength lessens with time and is modulated by the ripple
        float strength = (0.4 + ripple * 0.15) * envelope * decay;
        
        vec2 dir = normalize(coord);
        vec2 disp = dir * strength;
        
        // Encode vector from [-1, 1] to [0, 1] color
        gl_FragColor = vec4(disp * 0.5 + 0.5, 0.0, envelope * decay);
    }
  `;

  const pointsProgram = new Program(gl, {
      vertex: pointsVertex,
      fragment: pointsFragment,
      transparent: true,
      depthTest: false,
      uniforms: {
          uMaxAge: { value: MAX_AGE }
      }
  });

  const pointsMesh = new Mesh(gl, { mode: gl.POINTS, geometry: pointsGeometry, program: pointsProgram });

  // FBO Target for Displacement Map
  const target = new RenderTarget(gl, {
      width: window.innerWidth,
      height: window.innerHeight,
  });

  // --- MAIN SHADER SETUP ---
  const mainVertex = `
    attribute vec2 uv;
    attribute vec3 position;
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 1.0);
    }
  `;

  const mainFragment = `
    precision highp float;
    uniform sampler2D uTexture;
    uniform sampler2D uDispMap;
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
      
      // Read encoded normal map from FBO
      vec4 fboData = texture2D(uDispMap, vUv);
      
      // Decode premultiplied alpha displacement perfectly
      // C = disp * 0.5 + 0.5
      // FBO_RG = C * A
      // FBO_A = A
      // disp * A = FBO_RG * 2.0 - FBO_A
      vec2 disp = fboData.rg * 2.0 - vec2(fboData.a);
      
      // Pull UVs inward to create bulging fisheye effect outward
      // Distortion Scale applied directly here
      vec2 warpedUV = baseUv - disp * 0.15;
      
      warpedUV = clamp(warpedUV, 0.005, 0.995);
      
      gl_FragColor = texture2D(uTexture, warpedUV);
    }
  `;

  const mainProgram = new Program(gl, {
    vertex: mainVertex,
    fragment: mainFragment,
    uniforms: {
      uTexture: { value: mainTexture },
      uDispMap: { value: target.texture },
      uResolution: { value: [window.innerWidth, window.innerHeight] },
      uImageAspect: { value: imageAspect }
    }
  });

  const mainGeometry = new Triangle(gl);
  const mainMesh = new Mesh(gl, { geometry: mainGeometry, program: mainProgram });

  // Mouse Tracking
  let mouse = { x: 0.5, y: 0.5 };
  let prevMouse = { x: 0.5, y: 0.5 };
  let inHero = false;

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

  let isVisible = true
  const handleVisibilityChange = () => { isVisible = !document.hidden }
  document.addEventListener('visibilitychange', handleVisibilityChange)
  let lastTime = performance.now()

  let animationFrameId;

  function animate(now) {
    animationFrameId = requestAnimationFrame(animate)
    if (!isVisible) return

    const dt = (now - lastTime) / 1000.0
    lastTime = now

    // Update ages
    for (let i = 0; i < MAX_DROPS; i++) {
        if (ageData[i] < MAX_AGE) {
            ageData[i] += dt;
        }
    }

    if (inHero) {
        const dx = mouse.x - prevMouse.x;
        const dy = mouse.y - prevMouse.y;
        const distance = Math.hypot(dx, dy);
        
        // Drop a point frequently to create a continuous dynamic path
        const dropThreshold = 0.005;
        
        if (distance > dropThreshold) {
            const steps = Math.max(1, Math.floor(distance / dropThreshold));
            
            for (let i = 1; i <= steps; i++) {
                const t = i / steps;
                const px = prevMouse.x + dx * t;
                const py = prevMouse.y + dy * t;
                
                positionData[dropHead * 2] = px;
                positionData[dropHead * 2 + 1] = py;
                ageData[dropHead] = 0.0;
                
                dropHead = (dropHead + 1) % MAX_DROPS;
            }
            prevMouse.x = mouse.x;
            prevMouse.y = mouse.y;
        }
    }

    // Upload updated attributes to GPU
    pointsGeometry.attributes.age.needsUpdate = true;
    pointsGeometry.attributes.position.needsUpdate = true;

    // 1. Render droplets to FBO (Clears to transparent black each frame)
    gl.clearColor(0, 0, 0, 0);
    renderer.render({ scene: pointsMesh, target: target, clear: true });

    // 2. Render Main Shader to screen
    clearWithThemeColor();
    renderer.render({ scene: mainMesh });
  }

  function resize() {
    renderer.setSize(window.innerWidth, window.innerHeight)
    target.setSize(window.innerWidth, window.innerHeight);
    mainProgram.uniforms.uResolution.value = [window.innerWidth, window.innerHeight]
  }
  
  window.addEventListener('resize', resize)
  resize()
  animationFrameId = requestAnimationFrame(animate)
}
