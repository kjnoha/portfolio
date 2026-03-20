/* ── HAMBURGER MENU LOGIC ── */
const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');

if (hamburger && navLinks) {
  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navLinks.classList.toggle('active');
  });

  document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('active');
      navLinks.classList.remove('active');
    });
  });
}

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      setTimeout(() => entry.target.classList.add('visible'), i * 80);
    }
  });
}, { threshold: 0.1 });

const animClasses = ['.fade-in', '.slide-in-left', '.slide-in-right', '.flip-in', '.reveal-up', '.zoom-blur-in', '.pop-in', '.rotate-in'];
document.querySelectorAll(animClasses.join(', ')).forEach(el => observer.observe(el));

/* ── LIGHTNING BACKGROUND LOGIC ── */
const canvas = document.getElementById('lightning-canvas');
if (canvas) {
  const gl = canvas.getContext("webgl");
  if (gl) {
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const vertexShaderSource = `
          attribute vec2 aPosition;
          void main() {
            gl_Position = vec4(aPosition, 0.0, 1.0);
          }
        `;

    const fragmentShaderSource = `
          precision mediump float;
          uniform vec2 iResolution;
          uniform float iTime;
          uniform float uHue;
          uniform float uXOffset;
          uniform float uSpeed;
          uniform float uIntensity;
          uniform float uSize;
          
          #define OCTAVE_COUNT 10

          vec3 hsv2rgb(vec3 c) {
              vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0,4.0,2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
              return c.z * mix(vec3(1.0), rgb, c.y);
          }

          float hash11(float p) {
              p = fract(p * .1031);
              p *= p + 33.33;
              p *= p + p;
              return fract(p);
          }

          float hash12(vec2 p) {
              vec3 p3 = fract(vec3(p.xyx) * .1031);
              p3 += dot(p3, p3.yzx + 33.33);
              return fract((p3.x + p3.y) * p3.z);
          }

          mat2 rotate2d(float theta) {
              float c = cos(theta);
              float s = sin(theta);
              return mat2(c, -s, s, c);
          }

          float noise(vec2 p) {
              vec2 ip = floor(p);
              vec2 fp = fract(p);
              float a = hash12(ip);
              float b = hash12(ip + vec2(1.0, 0.0));
              float c = hash12(ip + vec2(0.0, 1.0));
              float d = hash12(ip + vec2(1.0, 1.0));
              
              vec2 t = smoothstep(0.0, 1.0, fp);
              return mix(mix(a, b, t.x), mix(c, d, t.x), t.y);
          }

          float fbm(vec2 p) {
              float value = 0.0;
              float amplitude = 0.5;
              for (int i = 0; i < OCTAVE_COUNT; ++i) {
                  value += amplitude * noise(p);
                  p *= rotate2d(0.45);
                  p *= 2.0;
                  amplitude *= 0.5;
              }
              return value;
          }

          void mainImage( out vec4 fragColor, in vec2 fragCoord ) {
              vec2 uv = fragCoord / iResolution.xy;
              uv = 2.0 * uv - 1.0;
              uv.x *= iResolution.x / iResolution.y;
              uv.x += uXOffset;
              
              uv += 2.0 * fbm(uv * uSize + 0.8 * iTime * uSpeed) - 1.0;
              
              float dist = abs(uv.x);
              vec3 baseColor = hsv2rgb(vec3(uHue / 360.0, 0.7, 0.8));
              vec3 col = baseColor * pow(mix(0.0, 0.07, hash11(iTime * uSpeed)) / dist, 1.0) * uIntensity;
              col = pow(col, vec3(1.0));
              fragColor = vec4(col, 1.0);
          }

          void main() {
              mainImage(gl_FragColor, gl_FragCoord.xy);
          }
        `;

    const compileShader = (source, type) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Shader compile error:", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vertexShader = compileShader(vertexShaderSource, gl.VERTEX_SHADER);
    const fragmentShader = compileShader(fragmentShaderSource, gl.FRAGMENT_SHADER);
    if (vertexShader && fragmentShader) {
      const program = gl.createProgram();
      if (program) {
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
          console.error("Program linking error:", gl.getProgramInfoLog(program));
        } else {
          gl.useProgram(program);

          const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
          const vertexBuffer = gl.createBuffer();
          gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
          gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

          const aPosition = gl.getAttribLocation(program, "aPosition");
          gl.enableVertexAttribArray(aPosition);
          gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

          const iResolutionLocation = gl.getUniformLocation(program, "iResolution");
          const iTimeLocation = gl.getUniformLocation(program, "iTime");
          const uHueLocation = gl.getUniformLocation(program, "uHue");
          const uXOffsetLocation = gl.getUniformLocation(program, "uXOffset");
          const uSpeedLocation = gl.getUniformLocation(program, "uSpeed");
          const uIntensityLocation = gl.getUniformLocation(program, "uIntensity");
          const uSizeLocation = gl.getUniformLocation(program, "uSize");

          const startTime = performance.now();
          const hue = 220; // Default lightning hue
          const xOffset = 0, speed = 1.6, intensity = 0.6, size = 2;

          const render = () => {
            resizeCanvas();
            gl.viewport(0, 0, canvas.width, canvas.height);
            gl.uniform2f(iResolutionLocation, canvas.width, canvas.height);
            const currentTime = performance.now();
            gl.uniform1f(iTimeLocation, (currentTime - startTime) / 1000.0);
            gl.uniform1f(uHueLocation, hue);
            gl.uniform1f(uXOffsetLocation, xOffset);
            gl.uniform1f(uSpeedLocation, speed);
            gl.uniform1f(uIntensityLocation, intensity);
            gl.uniform1f(uSizeLocation, size);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
            requestAnimationFrame(render);
          };
          requestAnimationFrame(render);
        }
      }
    }
  }
}

/* ── SCROLL EXPANSION LOGIC ── */
const expSection = document.getElementById('scroll-expansion');
if (expSection) {
  const mediaBox = expSection.querySelector('.expansion-media-box');
  const mediaOverlay = expSection.querySelector('.media-overlay');
  const bgOverlay = expSection.querySelector('.expansion-bg');
  const titleLeft = expSection.querySelector('.h2-split-left');
  const titleRight = expSection.querySelector('.h2-split-right');
  const subTextLeft = expSection.querySelector('.p-split-left');
  const subTextRight = expSection.querySelector('.p-split-right');
  const tagline = expSection.querySelector('.expansion-tagline');

  const updateExpansionParallax = () => {
    const rect = expSection.getBoundingClientRect();
    const scrollStart = rect.top;
    const scrollRange = rect.height - window.innerHeight;

    let progress = 0;
    if (scrollStart <= 0) {
      progress = Math.min(1, Math.max(0, -scrollStart / scrollRange));
    }

    const isMobile = window.innerWidth < 768;
    const mediaWidth = 300 + progress * (isMobile ? 650 : 1250);
    const mediaHeight = 400 + progress * (isMobile ? 200 : 400);
    const textTranslateX = progress * (isMobile ? 180 : 150);

    if (mediaBox) {
      mediaBox.style.width = `${mediaWidth}px`;
      mediaBox.style.height = `${mediaHeight}px`;
    }

    if (titleLeft) titleLeft.style.transform = `translateX(-${textTranslateX}vw)`;
    if (titleRight) titleRight.style.transform = `translateX(${textTranslateX}vw)`;

    if (subTextLeft) subTextLeft.style.transform = `translateX(-${textTranslateX}vw)`;
    if (subTextRight) subTextRight.style.transform = `translateX(${textTranslateX}vw)`;

    // Overlay lightens initially, then re-darkens for tagline readability
    const taglineProgress = Math.min(1, Math.max(0, (progress - 0.35) / 0.3));
    if (mediaOverlay) {
      const baseFade = Math.max(0, 0.7 - progress * 0.3);
      const taglineDarken = taglineProgress * 0.5;
      mediaOverlay.style.opacity = baseFade + taglineDarken;
    }
    if (bgOverlay) bgOverlay.style.opacity = Math.max(0, 1 - progress);

    // Tagline fades in as text splits (35% → 65% progress)
    if (tagline) {
      tagline.style.opacity = taglineProgress;
      const taglineScale = 0.85 + taglineProgress * 0.15;
      tagline.style.transform = `translate(-50%, -50%) scale(${taglineScale})`;
    }

    requestAnimationFrame(updateExpansionParallax);
  };

  requestAnimationFrame(updateExpansionParallax);
}
