import { portfolioData } from './data/portfolioData.js';
import { gsap } from 'gsap';
import Lenis from 'lenis';

// ─── Touch / Mobile Detection ──────────────────────────────────────────────────
const isTouchDevice = window.matchMedia('(hover: none)').matches || 'ontouchstart' in window;

// ─── 0-A. LENIS SMOOTH SCROLL ──────────────────────────────────────────────────
const lenis = new Lenis({
  duration:  1.4,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smooth: true,
  smoothTouch: false,
  touchMultiplier: 2,
});

gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);

document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', (e) => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) {
      e.preventDefault();
      lenis.scrollTo(target, { offset: -80, duration: 1.4 });
    }
  });
});

// ─── 0-A2. HERO ENTRANCE ANIMATION ────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
  tl
    .from('.hello-label',   { opacity: 0, y: 24, duration: 0.7 })
    .from('.hero-name',     { opacity: 0, y: 30, duration: 0.8, scale: 0.96 }, '-=0.4')
    .from('.hero-subtitle', { opacity: 0, y: 20, duration: 0.65 }, '-=0.4')
    .from('.big-word-wrapper', { opacity: 0, scale: 0.85, duration: 0.8, ease: 'back.out(1.7)' }, '-=0.3')
    .from('.pulse-bar',     { opacity: 0, y: 10, duration: 0.5 }, '-=0.3')
    .from('.hero-desc',     { opacity: 0, y: 18, duration: 0.6 }, '-=0.35')
    .from('.cta-group > *', { opacity: 0, y: 16, stagger: 0.12, duration: 0.55, ease: 'back.out(1.4)' }, '-=0.35');
});

// ═══════════════════════════════════════════════════════════════════════════════
// 0-B. INTERACTIVE GALAXY CANVAS
// ═══════════════════════════════════════════════════════════════════════════════
const canvas = document.getElementById('space-canvas');
const ctx    = canvas.getContext('2d');

function resizeCanvas() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', () => { resizeCanvas(); buildGalaxy(); });

// ── Mouse state ─────────────────────────────────────────────────────────────
let mx = -9999, my = -9999;           // mouse in screen coords
let galaxyOffsetX = 0, galaxyOffsetY = 0;  // current parallax offset
let targetOffsetX = 0, targetOffsetY = 0;  // target parallax offset

window.addEventListener('mousemove', (e) => {
  mx = e.clientX;
  my = e.clientY;
  // Parallax: mouse distance from center drives a small galaxy tilt
  const cx = canvas.width  / 2;
  const cy = canvas.height / 2;
  targetOffsetX = (mx - cx) * 0.03;
  targetOffsetY = (my - cy) * 0.03;
});

// ── Shockwaves (on click) ────────────────────────────────────────────────────
const shockwaves = [];
canvas.addEventListener('click', (e) => {
  shockwaves.push({ x: e.clientX, y: e.clientY, r: 0, maxR: 220, life: 1 });
});

// ── Galaxy particles ─────────────────────────────────────────────────────────
const GALAXY_PARTICLES = 1000;
const ARMS = 3;
const galaxyParticles = [];

function buildGalaxy() {
  galaxyParticles.length = 0;
  for (let i = 0; i < GALAXY_PARTICLES; i++) {
    const arm       = i % ARMS;
    const t         = Math.random();
    const baseAngle = (arm / ARMS) * Math.PI * 2;
    const spiral    = t * Math.PI * 4;
    const angle     = baseAngle + spiral;
    const radius    = t * 220;
    const scatter   = (Math.random() - 0.5) * (radius * 0.55);

    const ox = Math.cos(angle) * radius + Math.sin(angle) * scatter;  // origin X
    const oy = Math.sin(angle) * radius - Math.cos(angle) * scatter;  // origin Y

    const brightness = Math.pow(1 - t, 0.5);
    const alpha      = 0.06 + brightness * 0.45;   // dimmer overall
    const size       = 0.2 + Math.random() * (brightness * 0.85); // smaller
    const hue        = 170 + Math.random() * 40;
    const sat        = 35  + brightness * 45;
    const lit        = 58  + brightness * 28;

    galaxyParticles.push({
      ox, oy,           // resting position
      px: ox, py: oy,   // current position
      vx: 0, vy: 0,     // velocity (used for repulsion)
      alpha, size, hue, sat, lit
    });
  }
}
buildGalaxy();

let galaxyAngle = 0;

function drawGalaxy() {
  // Lerp parallax offset
  galaxyOffsetX += (targetOffsetX - galaxyOffsetX) * 0.04;
  galaxyOffsetY += (targetOffsetY - galaxyOffsetY) * 0.04;

  const cx = canvas.width  / 2 + galaxyOffsetX;
  const cy = canvas.height / 2 + galaxyOffsetY;

  // Convert mouse to galaxy-local coords (accounting for rotation + offset)
  const cosA = Math.cos(-galaxyAngle);
  const sinA = Math.sin(-galaxyAngle);
  const localMx = (mx - cx) * cosA - (my - cy) * sinA;
  const localMy = (mx - cx) * sinA + (my - cy) * cosA;
  const REPEL_R  = 90;    // repulsion radius (px in galaxy space)
  const REPEL_F  = 2.2;   // repulsion force
  const RETURN_F = 0.06;  // spring return force
  const DAMPING  = 0.82;  // velocity damping

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(galaxyAngle);

  for (const p of galaxyParticles) {
    // Spring return to origin
    const dox = p.ox - p.px;
    const doy = p.oy - p.py;
    p.vx += dox * RETURN_F;
    p.vy += doy * RETURN_F;

    // Mouse repulsion
    const dx  = p.px - localMx;
    const dy  = p.py - localMy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < REPEL_R && dist > 0.1) {
      const force = (1 - dist / REPEL_R) * REPEL_F;
      p.vx += (dx / dist) * force;
      p.vy += (dy / dist) * force;
    }

    // Shockwave repulsion (in galaxy-local space)
    for (const sw of shockwaves) {
      const swlx = (sw.x - cx) * cosA - (sw.y - cy) * sinA;
      const swly = (sw.x - cx) * sinA + (sw.y - cy) * cosA;
      const sdx  = p.ox - swlx;
      const sdy  = p.oy - swly;
      const sd   = Math.sqrt(sdx * sdx + sdy * sdy);
      const ring = Math.abs(sd - sw.r);
      if (ring < 25) {
        const force = (1 - ring / 25) * 3.5;
        p.vx += (sdx / (sd + 1)) * force;
        p.vy += (sdy / (sd + 1)) * force;
      }
    }

    // Apply velocity + damping
    p.vx *= DAMPING;
    p.vy *= DAMPING;
    p.px += p.vx;
    p.py += p.vy;

    // Draw particle
    ctx.beginPath();
    ctx.arc(p.px, p.py, p.size, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${p.hue}, ${p.sat}%, ${p.lit}%, ${p.alpha})`;
    ctx.fill();
  }

  // Core glow
  const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 60);
  coreGrad.addColorStop(0,   'rgba(0, 217, 255, 0.20)');
  coreGrad.addColorStop(0.4, 'rgba(0, 180, 220, 0.08)');
  coreGrad.addColorStop(1,   'rgba(0, 0, 0, 0)');
  ctx.beginPath();
  ctx.arc(0, 0, 60, 0, Math.PI * 2);
  ctx.fillStyle = coreGrad;
  ctx.fill();

  ctx.restore();
  galaxyAngle += 0.00022;

  // Draw shockwave rings (in screen space)
  for (let i = shockwaves.length - 1; i >= 0; i--) {
    const sw = shockwaves[i];
    ctx.beginPath();
    ctx.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(0, 217, 255, ${sw.life * 0.35})`;
    ctx.lineWidth   = 1.5 * sw.life;
    ctx.stroke();
    sw.r    += 5;
    sw.life -= 0.025;
    if (sw.life <= 0) shockwaves.splice(i, 1);
  }
}

// ── Shooting Stars ───────────────────────────────────────────────────────────
const shootingStars = [];

function spawnShootingStar() {
  const x     = Math.random() * canvas.width;
  const y     = Math.random() * canvas.height * 0.6;
  const angle = (25 + Math.random() * 35) * (Math.PI / 180);
  const speed = 7 + Math.random() * 7;
  const len   = 90 + Math.random() * 130;
  shootingStars.push({ x, y, angle, speed, len, life: 1.0, decay: 0.02 + Math.random() * 0.016 });
}

function scheduleNextStar() {
  setTimeout(() => { spawnShootingStar(); scheduleNextStar(); }, 3000 + Math.random() * 4000);
}
scheduleNextStar();

function drawShootingStars() {
  for (let i = shootingStars.length - 1; i >= 0; i--) {
    const s  = shootingStars[i];
    const dx = Math.cos(s.angle) * s.len;
    const dy = Math.sin(s.angle) * s.len;
    const g  = ctx.createLinearGradient(s.x, s.y, s.x - dx, s.y - dy);
    g.addColorStop(0,   `rgba(255,255,255,${s.life * 0.92})`);
    g.addColorStop(0.3, `rgba(180,230,255,${s.life * 0.5})`);
    g.addColorStop(1,   'rgba(255,255,255,0)');
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(s.x - dx, s.y - dy);
    ctx.strokeStyle = g;
    ctx.lineWidth   = 1.5 * s.life;
    ctx.lineCap     = 'round';
    ctx.stroke();
    s.x    += Math.cos(s.angle) * s.speed;
    s.y    += Math.sin(s.angle) * s.speed;
    s.life -= s.decay;
    if (s.life <= 0) shootingStars.splice(i, 1);
  }
}

// ── Main animation loop ──────────────────────────────────────────────────────
function renderSpace() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGalaxy();
  drawShootingStars();
  requestAnimationFrame(renderSpace);
}
renderSpace();


// ─── 1. CUSTOM CURSOR (desktop only) ───────────────────────────────────────────
if (!isTouchDevice) {
  const cursorDot  = document.getElementById('cursor-dot');
  const cursorRing = document.getElementById('cursor-ring');
  const cursorGlow = document.getElementById('cursor-glow');

  let mouseX = window.innerWidth  / 2;
  let mouseY = window.innerHeight / 2;
  let ringX  = mouseX, ringY = mouseY;
  let glowX  = mouseX, glowY = mouseY;

  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    gsap.set(cursorDot, { x: mouseX, y: mouseY });
  });

  gsap.ticker.add(() => {
    const lerpRing = 0.12;
    const lerpGlow = 0.06;
    ringX += (mouseX - ringX) * lerpRing;
    ringY += (mouseY - ringY) * lerpRing;
    gsap.set(cursorRing, { x: ringX, y: ringY });
    glowX += (mouseX - glowX) * lerpGlow;
    glowY += (mouseY - glowY) * lerpGlow;
    gsap.set(cursorGlow, { x: glowX, y: glowY });
  });

  const interactiveEls = 'a, button, [data-hover]';
  document.addEventListener('mouseover', (e) => {
    if (e.target.closest(interactiveEls)) {
      gsap.to(cursorRing, { width: 54, height: 54, borderColor: 'rgba(0,217,255,0.55)', duration: 0.25 });
      gsap.to(cursorDot,  { scale: 1.5, duration: 0.25 });
    }
  });
  document.addEventListener('mouseout', (e) => {
    if (e.target.closest(interactiveEls)) {
      gsap.to(cursorRing, { width: 40, height: 40, borderColor: 'rgba(255,255,255,0.18)', duration: 0.25 });
      gsap.to(cursorDot,  { scale: 1, duration: 0.25 });
    }
  });
} // end cursor block

// ─── CURSOR SPARKLE TRAIL (desktop only) ───────────────────────────────────────
if (!isTouchDevice) {
  const SPARKLE_COLORS = ['#00d9ff','#f59e0b','#a855f7','#84cc16','#ec4899'];
  let sparkleThrottle = 0;
  window.addEventListener('mousemove', (e) => {
    const now = Date.now();
    if (now - sparkleThrottle < 60) return;
    sparkleThrottle = now;
    const s = document.createElement('div');
    s.className = 'cursor-sparkle';
    const sz = 4 + Math.random() * 5;
    const color = SPARKLE_COLORS[Math.floor(Math.random() * SPARKLE_COLORS.length)];
    s.style.cssText = `left:${e.clientX}px;top:${e.clientY}px;width:${sz}px;height:${sz}px;background:${color};box-shadow:0 0 ${sz*2}px ${color};`;
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 700);
  });
}

// ─── RIPPLE on click ───────────────────────────────────────────────────────────
document.addEventListener('click', (e) => {
  const host = e.target.closest('.ripple-host');
  if (!host) return;

  const rect   = host.getBoundingClientRect();
  const size   = Math.max(rect.width, rect.height) * 2;
  const x      = e.clientX - rect.left - size / 2;
  const y      = e.clientY - rect.top  - size / 2;

  const wave = document.createElement('span');
  wave.className = 'ripple-wave' + (host.classList.contains('btn-outline') ? ' cyan' : '');
  wave.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px;`;
  host.appendChild(wave);
  setTimeout(() => wave.remove(), 700);
});

// ─── RIPPLE on hover (nav links) ───────────────────────────────────────────────
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('mouseenter', (e) => {
    const rect  = link.getBoundingClientRect();
    const x     = e.clientX - rect.left;
    const y     = e.clientY - rect.top;
    const wave  = document.createElement('span');
    wave.className = 'nav-ripple-wave';
    wave.style.left = x + 'px';
    wave.style.top  = y + 'px';
    link.appendChild(wave);
    setTimeout(() => wave.remove(), 600);
  });
});

// ─── MOBILE NAV TOGGLE ─────────────────────────────────────────────────────────
const navToggle = document.getElementById('nav-toggle');
const navEl     = document.querySelector('nav');
if (navToggle && navEl) {
  navToggle.addEventListener('click', () => {
    navToggle.classList.toggle('active');
    navEl.classList.toggle('nav-open');
  });
  // Auto-close mobile menu when a link is tapped
  navEl.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      navToggle.classList.remove('active');
      navEl.classList.remove('nav-open');
    });
  });
}

// ─── 2. DATA INJECTION ─────────────────────────────────────────────────────────
document.getElementById('user-name').textContent  = portfolioData.name;
document.getElementById('user-about').textContent = portfolioData.about;

// ─── 3. CYCLING BIG WORD ───────────────────────────────────────────────────────
const words = ['DEVELOPER', 'BUILDER', 'CREATOR', 'ENGINEER'];
let wordIndex = 0;
const bigWordEl = document.getElementById('big-word');

// Ensure initial state class is correct
bigWordEl.className = 'big-word state-visible';

function cycleWord() {
  // 1. Animate the current word out upward
  bigWordEl.className = 'big-word state-hidden-up';

  // 2. After transition ends, switch text and animate in from below
  setTimeout(() => {
    wordIndex = (wordIndex + 1) % words.length;
    bigWordEl.textContent = words[wordIndex];
    // Start below, then transition to center
    bigWordEl.className = 'big-word state-hidden-down';
    // Force reflow so the browser registers the hidden-down position first
    void bigWordEl.offsetWidth;
    bigWordEl.className = 'big-word state-visible';
  }, 480); // must match CSS transition duration (0.45s)
}

setInterval(cycleWord, 3200);

// ─── 4. PLANETARY ORBIT SYSTEM ────────────────────────────────────────────────
const orbitSystem = document.getElementById('orbit-system');

// Tech stack data with icon SVG paths (using CDN svg logos)
const techItems = [
  { name: 'React',       orbit: 1, startAngle: -90,  speed: 65,  iconUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg' },
  { name: 'Next.js',    orbit: 1, startAngle: 90,   speed: 65,  iconUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nextjs/nextjs-original.svg' },
  { name: 'LangChain',  orbit: 2, startAngle: -150, speed: 95,  iconUrl: 'https://avatars.githubusercontent.com/u/126733545?s=48' },
  { name: 'Tailwind',   orbit: 2, startAngle: -30,  speed: 95,  iconUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/tailwindcss/tailwindcss-plain.svg' },
  { name: 'Node.js',    orbit: 2, startAngle: 90,   speed: 95,  iconUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg' },
  { name: 'TypeScript', orbit: 3, startAngle: -120, speed: 135, iconUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg' },
  { name: 'Python',     orbit: 3, startAngle: 0,    speed: 135, iconUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg' },
  { name: 'FastAPI',    orbit: 2, startAngle: -90,  speed: 95,  iconUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/fastapi/fastapi-original.svg' },
  { name: 'Docker',     orbit: 3, startAngle: 120,  speed: 135, iconUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/docker/docker-original.svg' },
  { name: 'Git',        orbit: 4, startAngle: -60,  speed: 180, iconUrl: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/git/git-original.svg' },
];

// Orbit radii — responsive based on viewport width
function getOrbitRadii() {
  const w = window.innerWidth;
  if (w <= 360) return { 1: 70,  2: 110, 3: 0,   4: 0 };
  if (w <= 480) return { 1: 90,  2: 140, 3: 0,   4: 0 };
  if (w <= 768) return { 1: 110, 2: 180, 3: 0,   4: 0 };
  if (w <= 1024) return { 1: 140, 2: 240, 3: 300, 4: 390 };
  return { 1: 160, 2: 270, 3: 385, 4: 505 };
}
let RADII = getOrbitRadii();

techItems.forEach((tech) => {
  const iconEl = document.createElement('div');
  iconEl.className = 'tech-icon';
  iconEl.setAttribute('data-hover', 'true');

  const card = document.createElement('div');
  card.className = 'tech-icon-card';

  const img = document.createElement('img');
  img.src = tech.iconUrl;
  img.alt = tech.name;
  img.width = 28;
  img.height = 28;
  img.onerror = () => {
    img.style.display = 'none';
    card.innerHTML = `<span style="font-size:9px;font-weight:700;color:rgba(0,217,255,0.8)">${tech.name.slice(0,3)}</span>`;
  };
  card.appendChild(img);

  const label = document.createElement('span');
  label.className = 'tech-icon-label';
  label.textContent = tech.name;

  iconEl.appendChild(card);
  iconEl.appendChild(label);
  orbitSystem.appendChild(iconEl);

  // Hide icons on orbits that don't fit the current viewport
  const radius = RADII[tech.orbit];
  if (radius === 0) { iconEl.style.display = 'none'; }

  const startRad = (tech.startAngle * Math.PI) / 180;
  const state = { angle: startRad };
  const fullCircle = Math.PI * 2;
  const direction = tech.orbit % 2 === 0 ? 1 : -1;

  gsap.to(state, {
    angle: startRad + fullCircle * direction,
    duration: tech.speed,
    repeat: -1,
    ease: 'none',
    onUpdate: () => {
      const r = RADII[tech.orbit];
      if (r === 0) { iconEl.style.display = 'none'; return; }
      iconEl.style.display = '';
      const x = Math.cos(state.angle) * r;
      const y = Math.sin(state.angle) * r;
      gsap.set(iconEl, { x, y, xPercent: -50, yPercent: -50 });
    },
  });
});

// Update orbit radii on resize
window.addEventListener('resize', () => { RADII = getOrbitRadii(); });

// ─── 5. PULSE BAR ─────────────────────────────────────────────────────────────
const dots = document.querySelectorAll('.bar-dot');
let activeDot = -1;

setInterval(() => {
  dots.forEach(d => d.style.background = 'rgba(255,255,255,0.2)');
  activeDot = (activeDot + 1) % dots.length;
  dots[activeDot].style.background = 'rgba(0,217,255,0.6)';
}, 1000);

// ─── 6. PROJECTS SECTION ──────────────────────────────────────────────────────
const projectsGrid = document.getElementById('projects-grid');
portfolioData.projects.forEach(project => {
  const card = document.createElement('div');
  card.className = 'glass-card reveal';
  card.innerHTML = `
    <h3 style="font-size:1.25rem;margin-bottom:0.75rem;color:var(--cyan);font-family:'Comfortaa',sans-serif;">${project.title}</h3>
    <p style="color:var(--text-secondary);margin-bottom:1.25rem;font-size:0.9rem;line-height:1.6;">${project.description}</p>
    <div style="display:flex;flex-wrap:wrap;gap:0.4rem;margin-bottom:1.25rem;">
      ${project.tech.map(t => `<span style="font-size:0.72rem;padding:0.2rem 0.55rem;background:rgba(255,255,255,0.04);border-radius:99px;border:1px solid var(--border);color:var(--text-secondary)">${t}</span>`).join('')}
    </div>
    <a href="${project.link}" target="_blank" style="color:var(--cyan);text-decoration:none;font-size:0.85rem;font-weight:600;">View Project →</a>
  `;
  projectsGrid.appendChild(card);

  // 3D tilt on mouse-move (desktop only)
  if (!isTouchDevice) {
    card.addEventListener('mousemove', (e) => {
      const r   = card.getBoundingClientRect();
      const cx  = r.left + r.width  / 2;
      const cy  = r.top  + r.height / 2;
      const rx  = ((e.clientY - cy) / (r.height / 2)) * -6;
      const ry  = ((e.clientX - cx) / (r.width  / 2)) *  6;
      card.style.transform = `translateY(-8px) rotateX(${rx}deg) rotateY(${ry}deg)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  }
});

// ─── 7. CERTIFICATIONS SECTION ────────────────────────────────────────────────
const certsGrid = document.getElementById('certs-grid');
portfolioData.certifications.forEach(cert => {
  const card = document.createElement('div');
  card.className = 'glass-card reveal';
  card.style.borderLeft = `3px solid ${cert.color}`;
  card.innerHTML = `
    <p style="font-size:0.75rem;color:var(--text-muted);margin-bottom:0.4rem;">${cert.date}</p>
    <h3 style="font-size:1.05rem;margin-bottom:0.3rem;font-family:'Comfortaa',sans-serif;">${cert.title}</h3>
    <p style="font-weight:600;font-size:0.85rem;color:${cert.color}">${cert.issuer}</p>
  `;
  certsGrid.appendChild(card);

  // 3D tilt on mouse-move (desktop only)
  if (!isTouchDevice) {
    card.addEventListener('mousemove', (e) => {
      const r   = card.getBoundingClientRect();
      const cx  = r.left + r.width  / 2;
      const cy  = r.top  + r.height / 2;
      const rx  = ((e.clientY - cy) / (r.height / 2)) * -5;
      const ry  = ((e.clientX - cx) / (r.width  / 2)) *  5;
      card.style.transform = `translateY(-6px) rotateX(${rx}deg) rotateY(${ry}deg)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  }
});

// ─── 8. REACH CARD — Mini Galaxy Background ────────────────────────────────────
const reachCanvas = document.getElementById('reach-galaxy');
if (reachCanvas) {
  const rc = reachCanvas.getContext('2d');

  function sizeReachCanvas() {
    reachCanvas.width  = reachCanvas.offsetWidth;
    reachCanvas.height = reachCanvas.offsetHeight;
  }
  sizeReachCanvas();
  window.addEventListener('resize', sizeReachCanvas);

  const REACH_COUNT = 180;
  const reachPts = Array.from({ length: REACH_COUNT }, () => ({
    x:    Math.random(),
    y:    Math.random(),
    r:    0.4 + Math.random() * 1.1,
    a:    0.05 + Math.random() * 0.3,
    hue:  170 + Math.random() * 45,
    spd:  (Math.random() - 0.5) * 0.00012,
  }));

  const MINI_ARMS = 2;
  const miniArm = Array.from({ length: 60 }, (_, i) => {
    const arm = i % MINI_ARMS;
    const t   = Math.random();
    const ang = (arm / MINI_ARMS) * Math.PI * 2 + t * Math.PI * 3;
    const rad = t * 0.18;
    return {
      ox: 0.75 + Math.cos(ang) * rad,
      oy: 0.55 + Math.sin(ang) * rad,
      a:  0.08 + Math.pow(1 - t, 0.5) * 0.35,
      r:  0.4 + Math.random() * 1.2,
      hue: 175 + Math.random() * 35,
    };
  });

  let miniAngle = 0;

  function drawReachGalaxy() {
    const W = reachCanvas.width;
    const H = reachCanvas.height;
    rc.clearRect(0, 0, W, H);
    for (const p of reachPts) {
      p.x = (p.x + p.spd + 1) % 1;
      rc.beginPath();
      rc.arc(p.x * W, p.y * H, p.r, 0, Math.PI * 2);
      rc.fillStyle = `hsla(${p.hue}, 50%, 75%, ${p.a})`;
      rc.fill();
    }
    const gx = W * 0.78;
    const gy = H * 0.52;
    rc.save();
    rc.translate(gx, gy);
    rc.rotate(miniAngle);
    for (const p of miniArm) {
      const px = (p.ox - 0.78) * W;
      const py = (p.oy - 0.52) * H;
      rc.beginPath();
      rc.arc(px, py, p.r, 0, Math.PI * 2);
      rc.fillStyle = `hsla(${p.hue}, 60%, 72%, ${p.a})`;
      rc.fill();
    }
    const cg = rc.createRadialGradient(0, 0, 0, 0, 0, 28);
    cg.addColorStop(0,   'rgba(0,217,255,0.18)');
    cg.addColorStop(0.5, 'rgba(0,200,220,0.06)');
    cg.addColorStop(1,   'rgba(0,0,0,0)');
    rc.beginPath();
    rc.arc(0, 0, 28, 0, Math.PI * 2);
    rc.fillStyle = cg;
    rc.fill();
    rc.restore();
    miniAngle += 0.0004;
    requestAnimationFrame(drawReachGalaxy);
  }
  drawReachGalaxy();
}

// ─── 9. SCROLL REVEAL (IntersectionObserver) ───────────────────────────────────
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    // Stagger siblings in same grid
    const grid = entry.target.parentElement;
    const siblings = grid ? [...grid.querySelectorAll('.reveal:not(.in-view)')] : [];
    siblings.forEach((el, i) => {
      setTimeout(() => el.classList.add('in-view'), i * 110);
    });
    entry.target.classList.add('in-view');
    revealObserver.unobserve(entry.target);
  });
}, { threshold: 0.1 });

const titleObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in-view');
      titleObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.25 });

document.querySelectorAll('.section-title, .section-tag').forEach(el => titleObserver.observe(el));
document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// ─── 10. WORKFLOW STEP STAGGER ─────────────────────────────────────────────────
const workflowObs = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const steps      = document.querySelectorAll('.workflow-step');
    const connectors = document.querySelectorAll('.wf-connector');
    steps.forEach((step, i) => {
      setTimeout(() => step.classList.add('wf-visible'), i * 120);
    });
    connectors.forEach((conn, i) => {
      setTimeout(() => conn.classList.add('wf-visible'), i * 120 + 80);
    });
    workflowObs.unobserve(entry.target);
  });
}, { threshold: 0.2 });

const workflowRow = document.querySelector('.workflow-row');
if (workflowRow) workflowObs.observe(workflowRow);
