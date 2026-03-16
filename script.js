/* ============================================
   HAPPY PRINCEMAS - Fogos de Artifício & Animações
   Inspirado em Prince (Otimizado)
   ============================================ */

const canvas = document.getElementById('fireworks-canvas');
const ctx = canvas.getContext('2d', { alpha: false });

// Buffer offscreen pra evitar flickering
let dpr = 1;
function resizeCanvas() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.scale(dpr, dpr);
}
resizeCanvas();

let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(resizeCanvas, 150);
});

const W = () => canvas.width / dpr;
const H = () => canvas.height / dpr;

// Paleta Prince - pré-convertida pra RGB
const PRINCE_COLORS_RGB = [
    [155, 89, 182], [142, 68, 173], [108, 52, 131], [195, 155, 211],
    [212, 175, 55], [241, 196, 15], [224, 176, 255],
    [255, 255, 255], [245, 245, 245],
    [233, 30, 155], [255, 105, 180],
    [125, 60, 255], [179, 136, 255],
];

// Limite de partículas para manter performance
const MAX_PARTICLES = 600;
const MAX_RAIN = 40;

// =============================================
// PARTÍCULA (Otimizada - sem gradiente, trail simplificado)
// =============================================
class Particle {
    constructor(x, y, r, g, b, vx, vy, size, gravity, friction, fade) {
        this.x = x;
        this.y = y;
        this.r = r;
        this.g = g;
        this.b = b;
        this.vx = vx;
        this.vy = vy;
        this.size = size;
        this.gravity = gravity;
        this.friction = friction;
        this.fade = fade;
        this.alpha = 1;
        // Trail simplificado: apenas 3 posições anteriores
        this.tx1 = x; this.ty1 = y;
        this.tx2 = x; this.ty2 = y;
    }

    update() {
        // Shift trail positions
        this.tx2 = this.tx1;
        this.ty2 = this.ty1;
        this.tx1 = this.x;
        this.ty1 = this.y;

        this.vx *= this.friction;
        this.vy *= this.friction;
        this.vy += this.gravity;
        this.x += this.vx;
        this.y += this.vy;
        this.alpha -= this.fade;
    }

    draw() {
        const a = this.alpha;
        if (a <= 0) return;

        // Trail (2 pontos, mais leve)
        const a2 = a * 0.15;
        const a1 = a * 0.3;
        const halfSize = this.size * 0.5;

        ctx.fillStyle = `rgba(${this.r},${this.g},${this.b},${a2})`;
        ctx.fillRect(this.tx2 - halfSize, this.ty2 - halfSize, this.size, this.size);

        ctx.fillStyle = `rgba(${this.r},${this.g},${this.b},${a1})`;
        ctx.fillRect(this.tx1 - halfSize, this.ty1 - halfSize, this.size, this.size);

        // Partícula principal (fillRect é mais rápido que arc)
        ctx.fillStyle = `rgba(${this.r},${this.g},${this.b},${a})`;
        ctx.fillRect(this.x - halfSize, this.y - halfSize, this.size, this.size);

        // Brilho central (só se grande o suficiente)
        if (this.size > 1.5) {
            const qs = this.size * 0.3;
            ctx.fillStyle = `rgba(255,255,255,${a * 0.5})`;
            ctx.fillRect(this.x - qs, this.y - qs, qs * 2, qs * 2);
        }
    }
}

// =============================================
// FOGUETE (Otimizado - sem shadowBlur)
// =============================================
class Rocket {
    constructor(x, targetY) {
        this.x = x;
        this.y = H();
        this.targetY = targetY;
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = -(7 + Math.random() * 3);
        this.exploded = false;
        // Trail simplificado
        this.trail = new Float32Array(20); // 10 pontos x,y
        this.trailLen = 0;
        this.trailIdx = 0;
    }

    update() {
        // Circular buffer para trail
        const idx = (this.trailIdx % 10) * 2;
        this.trail[idx] = this.x;
        this.trail[idx + 1] = this.y;
        this.trailIdx++;
        if (this.trailLen < 10) this.trailLen++;

        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.06;

        if (this.vy >= 0 || this.y <= this.targetY) {
            this.exploded = true;
        }
    }

    draw() {
        // Trail do foguete
        for (let i = 0; i < this.trailLen; i++) {
            const ti = ((this.trailIdx - this.trailLen + i) % 10) * 2;
            const alpha = (i / this.trailLen) * 0.5;
            ctx.fillStyle = `rgba(212,175,55,${alpha})`;
            ctx.fillRect(this.trail[ti] - 1, this.trail[ti + 1] - 1, 2, 2);
        }

        // Ponto brilhante (sem shadowBlur)
        ctx.fillStyle = '#fff';
        ctx.fillRect(this.x - 2, this.y - 2, 4, 4);
        ctx.fillStyle = 'rgba(212,175,55,0.6)';
        ctx.fillRect(this.x - 4, this.y - 4, 8, 8);
    }
}

// =============================================
// PURPLE RAIN (no canvas, sem DOM)
// =============================================
class RainDrop {
    constructor() {
        this.reset();
    }

    reset() {
        this.x = Math.random() * W();
        this.y = -10 - Math.random() * 100;
        this.speed = 3 + Math.random() * 4;
        this.length = 10 + Math.random() * 15;
        this.alpha = 0.15 + Math.random() * 0.25;
    }

    update() {
        this.y += this.speed;
        if (this.y > H() + 20) this.reset();
    }

    draw() {
        ctx.strokeStyle = `rgba(156,39,176,${this.alpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x, this.y + this.length);
        ctx.stroke();
    }
}

// =============================================
// ESTADO GLOBAL
// =============================================
let particles = [];
let rockets = [];
const rainDrops = [];

// Brilhos de fundo (estrelas) - array fixo, reciclado
const SPARKLE_COUNT = 40;
const sparkles = new Array(SPARKLE_COUNT);
for (let i = 0; i < SPARKLE_COUNT; i++) {
    sparkles[i] = {
        x: Math.random() * W(),
        y: Math.random() * H(),
        size: Math.random() * 1.5 + 0.5,
        alpha: Math.random(),
        maxAlpha: 0.3 + Math.random() * 0.4,
        speed: 0.003 + Math.random() * 0.008,
        growing: Math.random() > 0.5
    };
}

// Rain drops iniciais
for (let i = 0; i < MAX_RAIN; i++) {
    rainDrops.push(new RainDrop());
}

// =============================================
// EXPLOSÕES (Contagem otimizada)
// =============================================
function createExplosion(x, y, type) {
    // Respeita limite de partículas
    const available = MAX_PARTICLES - particles.length;
    if (available <= 10) return;

    const colorIdx = Math.floor(Math.random() * PRINCE_COLORS_RGB.length);
    const [cr, cg, cb] = PRINCE_COLORS_RGB[colorIdx];
    const count = Math.min(50 + Math.floor(Math.random() * 30), available);

    switch (type) {
        case 'chrysanthemum':
            for (let i = 0; i < count; i++) {
                const angle = (Math.PI * 2 / count) * i;
                const speed = 2 + Math.random() * 3;
                const [r, g, b] = PRINCE_COLORS_RGB[Math.floor(Math.random() * 5)];
                particles.push(new Particle(
                    x, y, r, g, b,
                    Math.cos(angle) * speed, Math.sin(angle) * speed,
                    1.5 + Math.random() * 1.5, 0.03, 0.985, 0.01 + Math.random() * 0.008
                ));
            }
            break;

        case 'peony':
            for (let i = 0; i < count; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 1 + Math.random() * 4;
                particles.push(new Particle(
                    x, y, cr, cg, cb,
                    Math.cos(angle) * speed, Math.sin(angle) * speed,
                    1.5 + Math.random() * 2, 0.035, 0.98, 0.012
                ));
            }
            break;

        case 'willow':
            for (let i = 0; i < count; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 1 + Math.random() * 2.5;
                const isGold = Math.random() > 0.5;
                particles.push(new Particle(
                    x, y,
                    isGold ? 212 : 224, isGold ? 175 : 176, isGold ? 55 : 255,
                    Math.cos(angle) * speed, Math.sin(angle) * speed,
                    1 + Math.random() * 1, 0.06, 0.98, 0.006
                ));
            }
            break;

        case 'starburst': {
            const arms = 5 + Math.floor(Math.random() * 3);
            for (let i = 0; i < count; i++) {
                const armAngle = (Math.PI * 2 / arms) * Math.floor(i / (count / arms));
                const spread = (Math.random() - 0.5) * 0.4;
                const speed = 2 + Math.random() * 3;
                const isGold = i % 2 === 0;
                particles.push(new Particle(
                    x, y,
                    isGold ? 212 : 155, isGold ? 175 : 89, isGold ? 55 : 182,
                    Math.cos(armAngle + spread) * speed, Math.sin(armAngle + spread) * speed,
                    1.5 + Math.random() * 1.5, 0.03, 0.985, 0.01
                ));
            }
            break;
        }

        case 'ring':
            for (let i = 0; i < count; i++) {
                const angle = (Math.PI * 2 / count) * i;
                const speed = 3 + Math.random() * 0.5;
                const [r, g, b] = PRINCE_COLORS_RGB[Math.floor(Math.random() * PRINCE_COLORS_RGB.length)];
                particles.push(new Particle(
                    x, y, r, g, b,
                    Math.cos(angle) * speed, Math.sin(angle) * speed,
                    1.8, 0.02, 0.99, 0.012
                ));
            }
            break;

        default:
            for (let i = 0; i < count; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 1 + Math.random() * 4;
                particles.push(new Particle(
                    x, y, cr, cg, cb,
                    Math.cos(angle) * speed, Math.sin(angle) * speed,
                    1 + Math.random() * 2, 0.04, 0.98, 0.012
                ));
            }
    }
}

const EXPLOSION_TYPES = ['chrysanthemum', 'peony', 'willow', 'starburst', 'ring', 'default'];

function launchRocket() {
    if (rockets.length >= 8) return; // Limita foguetes simultâneos
    const x = W() * 0.15 + Math.random() * W() * 0.7;
    const targetY = H() * 0.1 + Math.random() * H() * 0.35;
    rockets.push(new Rocket(x, targetY));
}

// =============================================
// LOOP PRINCIPAL (requestAnimationFrame)
// =============================================
let lastTime = 0;

function animate(timestamp) {
    // Delta time para animação consistente
    const dt = Math.min((timestamp - lastTime) / 16.67, 2); // normalizado pra 60fps, cap em 2x
    lastTime = timestamp;

    const w = W();
    const h = H();

    // Limpa com trail - fundo escuro
    ctx.fillStyle = 'rgba(13,0,26,0.2)';
    ctx.fillRect(0, 0, w, h);

    // Brilhos (estrelas) - array fixo, sem alocação
    for (let i = 0; i < SPARKLE_COUNT; i++) {
        const s = sparkles[i];
        if (s.growing) {
            s.alpha += s.speed * dt;
            if (s.alpha >= s.maxAlpha) s.growing = false;
        } else {
            s.alpha -= s.speed * dt;
            if (s.alpha <= 0) {
                s.x = Math.random() * w;
                s.y = Math.random() * h;
                s.alpha = 0;
                s.maxAlpha = 0.3 + Math.random() * 0.4;
                s.growing = true;
            }
        }
        ctx.fillStyle = `rgba(255,255,255,${Math.max(0, s.alpha)})`;
        ctx.fillRect(s.x, s.y, s.size, s.size);
    }

    // Purple Rain (no canvas)
    for (let i = 0; i < rainDrops.length; i++) {
        rainDrops[i].update();
        rainDrops[i].draw();
    }

    // Foguetes
    let ri = rockets.length;
    while (ri--) {
        const rocket = rockets[ri];
        rocket.update();
        rocket.draw();
        if (rocket.exploded) {
            const type = EXPLOSION_TYPES[Math.floor(Math.random() * EXPLOSION_TYPES.length)];
            createExplosion(rocket.x, rocket.y, type);
            rockets.splice(ri, 1);
        }
    }

    // Partículas - iteração reversa para splice seguro
    let pi = particles.length;
    while (pi--) {
        const p = particles[pi];
        p.update();
        if (p.alpha <= 0.01) {
            particles.splice(pi, 1);
        } else {
            p.draw();
        }
    }

    requestAnimationFrame(animate);
}

requestAnimationFrame(animate);

// =============================================
// LANÇAMENTO AUTOMÁTICO (intervalo variado)
// =============================================
function scheduleAutoLaunch() {
    const count = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < count; i++) {
        setTimeout(launchRocket, i * 250);
    }
    // Próximo lançamento com intervalo variável
    setTimeout(scheduleAutoLaunch, 1500 + Math.random() * 2000);
}

// Rajada inicial suave
setTimeout(() => {
    for (let i = 0; i < 3; i++) {
        setTimeout(launchRocket, i * 400);
    }
    // Inicia loop automático após rajada inicial
    setTimeout(scheduleAutoLaunch, 1500);
}, 800);

// Clique cria explosão
document.addEventListener('click', (e) => {
    const type = EXPLOSION_TYPES[Math.floor(Math.random() * EXPLOSION_TYPES.length)];
    createExplosion(e.clientX, e.clientY, type);
});

// =============================================
// ALTERNÂNCIA DE TEXTO
// =============================================
const mainText = document.getElementById('main-text');
const yearDisplay = document.getElementById('year-display');

const textStates = [
    { text: 'Happy Princemas', year: '2027' },
    { text: '2027', year: '' },
];

let currentState = 0;

function animateTextSwitch() {
    mainText.classList.add('flash-transition');

    // Rajada de fogos durante transição
    for (let i = 0; i < 3; i++) {
        setTimeout(launchRocket, i * 200);
    }

    setTimeout(() => {
        currentState = (currentState + 1) % textStates.length;
        mainText.textContent = textStates[currentState].text;
        yearDisplay.textContent = textStates[currentState].year;

        if (currentState === 1) {
            mainText.style.fontFamily = "'Great Vibes', cursive";
            mainText.style.fontSize = 'clamp(4rem, 15vw, 10rem)';
            yearDisplay.style.display = 'none';
        } else {
            mainText.style.fontFamily = "'Cinzel Decorative', cursive";
            mainText.style.fontSize = '';
            yearDisplay.style.display = 'block';
        }
    }, 400);

    setTimeout(() => {
        mainText.classList.remove('flash-transition');
    }, 1000);
}

setInterval(animateTextSwitch, 4500);

// =============================================
// RAJADA PERIÓDICA (menos intensa)
// =============================================
setInterval(() => {
    for (let i = 0; i < 5; i++) {
        setTimeout(launchRocket, i * 150);
    }
}, 12000);
