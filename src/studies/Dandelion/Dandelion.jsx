
import { useEffect, useRef } from "react";
import styles from "./Dandelion.module.css";

const SEED_COUNT = 112;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

// Deterministic randomness keeps the flower consistent across renders.
function random(seed) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Generate each seed as a separate object so it can later detach
// and move independently in response to wind.
function createSeeds() {
  return Array.from({ length: SEED_COUNT }, (_, i) => {
    const t = (i + 0.5) / SEED_COUNT;
    const y = 1 - 2 * t;
    const ring = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = i * GOLDEN_ANGLE;

    // Project a spherical distribution into two dimensions.
    const depth = Math.sin(theta) * ring;
    const horizontal = Math.cos(theta) * ring;

    const irregularity = lerp(0.94, 1.07, random(i + 8));

    return {
      id: i,
      x: horizontal * irregularity,
      y: y * irregularity,
      depth,
      angle: Math.atan2(y, horizontal),

      length: lerp(0.86, 1.12, random(i + 19)),
      spread: lerp(0.85, 1.16, random(i + 37)),
      filaments: Math.floor(lerp(17, 26, random(i + 51))),
      rotation: random(i + 71) * Math.PI * 2,
      opacity: lerp(0.64, 0.98, random(i + 91)),

      attached: true,
      growth: 1,
    };
  }).sort((a, b) => a.depth - b.depth);
}

function getPalette() {
  const dark =
    document.documentElement.dataset.theme === "dark" ||
    document.body.dataset.theme === "dark";

  return dark
    ? {
        stem: "#4f3727",
        stemShadow: "#4f3727",
        filament: "#F0E9D8",
        filamentSoft: "#D8D1C2",
        seed: "#B8B5AA",
        core: "#4f3727",
      }
    : {
        stem: "#76523b",
        stemShadow: "#7E8873",
        filament: "#C7C3B4",
        filamentSoft: "#D6D0BD",
        seed: "#76523b",
        core: "#76523b",
      };
}


/**
 * Combine several slow oscillations to create an organic
 * breeze that doesn't feel like a repeating sine wave.
 *
 * Time is measured in seconds.
 */
function getIdleMotion(time) {
  const primary =
    Math.sin(time * 0.43 + 0.3) * 0.62;

  const secondary =
    Math.sin(time * 0.71 + 1.8) * 0.25;

  const tertiary =
    Math.sin(time * 0.19 + 2.4) * 0.13;

  const breeze = primary + secondary + tertiary;

  return {
    // Maximum horizontal displacement of roughly 7px.
    swayX: breeze * 7,

    // Tiny vertical movement.
    swayY:
      Math.sin(time * 0.36 + 1.1) * 1.1,

    // Small rotational lag in radians.
    rotation:
      Math.sin(time * 0.39 - 0.35) * 0.009 +
      Math.sin(time * 0.67 + 1.2) * 0.003,
  };
}

/**
 * Each seed receives a slightly different amount of
 * secondary movement, preventing the head from looking
 * like a completely rigid object.
 */
function getSeedMotion(seed, time) {
  const phase = seed.id * 2.39996;

  return {
    x:
      Math.sin(time * 0.64 + phase) * 0.42 +
      Math.sin(time * 0.31 + phase * 0.6) * 0.18,

    y:
      Math.cos(time * 0.53 + phase) * 0.3,

    rotation:
      Math.sin(time * 0.48 + phase) * 0.003,
  };
}


// Draw the gently curved stem as a tapered botanical stroke.

/**
 * Draw a slender, naturally curved dandelion stem.
 * The path is intentionally restrained to preserve
 * the minimal botanical composition.
 */
function drawStem(ctx, headX, headY, bottomY, palette, scale, anchorX = headX) {
  const stemLength = bottomY - headY;
  const stemWidth = Math.max(1.4, 2.15 * scale);
  const displacement = headX - anchorX;

  // Cubic control points: the base stays anchored, while the upper
  // stem takes most of the displacement and bends into the seed head.
  const startX = anchorX + 12 * scale;
  const startY = bottomY;
  const endX = headX;
  const endY = headY + 6 * scale;
  const lowerX = anchorX + 35 * scale + displacement * 0.08;
  const lowerY = headY + stemLength * 0.70;
  const upperX = headX - 22 * scale - displacement * 0.28;
  const upperY = headY + stemLength * 0.28;

  ctx.save();
  ctx.lineCap = "round";

  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.bezierCurveTo(lowerX, lowerY, upperX, upperY, endX, endY);
  ctx.strokeStyle = palette.stem;
  ctx.lineWidth = stemWidth;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(startX - 0.8 * scale, startY);
  ctx.bezierCurveTo(
    lowerX - 1.1 * scale, lowerY,
    upperX - 0.6 * scale, upperY,
    endX - 0.5 * scale, endY + 2 * scale
  );
  ctx.strokeStyle = palette.stemShadow;
  ctx.globalAlpha = 0.28;
  ctx.lineWidth = 0.45 * scale;
  ctx.stroke();
  ctx.restore();
}

// Small receptacle beneath the seed head.
function drawReceptacle(ctx, x, y, scale, palette) {
  ctx.save();
  ctx.translate(x, y);

  ctx.fillStyle = palette.core;

  ctx.beginPath();
  ctx.moveTo(-6 * scale, 0);
  ctx.quadraticCurveTo(-5 * scale, 9 * scale, 0, 11 * scale);
  ctx.quadraticCurveTo(5 * scale, 9 * scale, 6 * scale, 0);
  ctx.quadraticCurveTo(0, 3 * scale, -6 * scale, 0);
  ctx.fill();

  // Tiny pointed bracts.
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 1.6 * scale, 5 * scale);
    ctx.quadraticCurveTo(
      i * 2.5 * scale,
      -2 * scale,
      i * 3.5 * scale,
      -7 * scale
    );
    ctx.strokeStyle = palette.stem;
    ctx.lineWidth = 0.7 * scale;
    ctx.stroke();
  }

  ctx.restore();
}

// Draw one individual seed, including the achene, stalk,
// and its delicate umbrella of pappus filaments.

/**
 * Draw an individual dandelion seed.
 *
 * Each seed has a fine connecting stalk, a small tapered body,
 * and a delicate, slightly asymmetric pappus.
 *
 * The seed geometry remains independent so it can later
 * detach and drift in response to wind.
 */
function drawSeed(ctx, seed, headX, headY, radius, palette, scale) {
  if (!seed.attached) return;

  const depthScale = lerp(0.76, 1.06, (seed.depth + 1) / 2);
  const angle = seed.angle;

  const anchorRadius = radius * 0.18;
  const baseX = headX + seed.x * anchorRadius;
  const baseY = headY + seed.y * anchorRadius;

  const outward = radius * (0.72 + 0.12 * seed.length);
  const tipX = headX + seed.x * outward;
  const tipY = headY + seed.y * outward;

  const seedLength = 7.8 * scale * seed.length * depthScale;
  const umbrellaRadius = 10.5 * scale * seed.spread * depthScale;

  ctx.save();
  ctx.lineCap = "round";

  // Softer, less prominent connecting stalk.
  ctx.beginPath();
  ctx.moveTo(baseX, baseY);
  ctx.quadraticCurveTo(
    (baseX + tipX) / 2 + Math.sin(seed.rotation) * 2.2 * scale,
    (baseY + tipY) / 2,
    tipX,
    tipY
  );

  ctx.strokeStyle = palette.stemShadow;
  ctx.globalAlpha = seed.opacity * depthScale * 0.48;
  ctx.lineWidth = 0.38 * scale;
  ctx.stroke();

  // Small, tapered seed body.
  const bodyX = lerp(baseX, tipX, 0.30);
  const bodyY = lerp(baseY, tipY, 0.30);

  ctx.save();
  ctx.translate(bodyX, bodyY);
  ctx.rotate(angle + Math.PI / 2);

  ctx.beginPath();
  ctx.moveTo(0, -2.8 * scale);
  ctx.quadraticCurveTo(
    -0.8 * scale,
    -0.8 * scale,
    0,
    2.5 * scale
  );
  ctx.quadraticCurveTo(
    0.8 * scale,
    -0.8 * scale,
    0,
    -2.8 * scale
  );

  ctx.fillStyle = palette.seed;
  ctx.globalAlpha = seed.opacity * depthScale * 0.8;
  ctx.fill();

  ctx.restore();

  // The centre of the pappus.
  const cx = tipX + Math.cos(angle) * seedLength * 0.35;
  const cy = tipY + Math.sin(angle) * seedLength * 0.35;

  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(cx, cy);
  ctx.strokeStyle = palette.filament;
  ctx.globalAlpha = seed.opacity * depthScale * 0.65;
  ctx.lineWidth = 0.38 * scale;
  ctx.stroke();

  // Individual filaments.
  // Introduce a slight directional bias and variation in
  // curvature without dramatically altering the silhouette.
  for (let j = 0; j < seed.filaments; j++) {
    const a =
      (j / seed.filaments) * Math.PI * 2 +
      seed.rotation * 0.18;

    const variation = random(seed.id * 101 + j * 17);

    const length =
      umbrellaRadius * lerp(0.76, 1.12, variation);

    // Slight asymmetry prevents perfectly circular starbursts.
    const directionalBias =
      Math.cos(a - angle) * 0.12;

    const dx =
      Math.cos(a) * length * (1 + directionalBias);

    const dy =
      Math.sin(a) * length * 0.73;

    const bend =
      Math.sin(a * 2 + seed.rotation) *
      1.6 *
      scale;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.quadraticCurveTo(
      cx + dx * 0.52 + bend,
      cy + dy * 0.46,
      cx + dx,
      cy + dy
    );

    ctx.strokeStyle =
      j % 3 === 0
        ? palette.filament
        : palette.filamentSoft;

    ctx.globalAlpha =
      seed.opacity *
      depthScale *
      lerp(0.34, 0.72, variation);

    ctx.lineWidth =
      (j % 4 === 0 ? 0.5 : 0.34) * scale;

    ctx.stroke();
  }

  ctx.restore();
}



/** Keep the layout identical to the approved static illustration. */
function getGeometry(width, height) {
  const scale = Math.min(1.45, Math.max(0.55, Math.min(width / 1100, height / 780)));
  return {
    scale,
    baseHeadX: width < 700 ? width * 0.49 : width * 0.38,
    baseHeadY: height * 0.38,
    radius: 112 * scale,
    bottomY: height + 28 * scale,
  };
}

/** A detached seed has a tiny achene and a separate, floating pappus. */
function drawFloatingSeed(ctx, seed, palette, scale) {
  const r = 10.5 * scale * seed.spread;
  ctx.save();
  ctx.translate(seed.flight.x, seed.flight.y);
  ctx.rotate(seed.flight.angle);
  ctx.globalAlpha = Math.min(1, seed.flight.opacity);
  ctx.lineCap = "round";

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -7.8 * scale);
  ctx.strokeStyle = palette.stemShadow;
  ctx.lineWidth = 0.5 * scale;
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(0, 1.2 * scale, 0.85 * scale, 2.4 * scale, 0, 0, Math.PI * 2);
  ctx.fillStyle = palette.seed;
  ctx.fill();

  for (let j = 0; j < seed.filaments; j++) {
    const a = j / seed.filaments * Math.PI * 2 + seed.rotation * 0.18;
    const variation = random(seed.id * 101 + j * 17);
    const len = r * lerp(0.76, 1.12, variation);
    const dx = Math.cos(a) * len;
    const dy = Math.sin(a) * len * 0.73;
    ctx.beginPath();
    ctx.moveTo(0, -7.8 * scale);
    ctx.quadraticCurveTo(dx * 0.5, -7.8 * scale + dy * 0.45, dx, -7.8 * scale + dy);
    ctx.strokeStyle = j % 3 === 0 ? palette.filament : palette.filamentSoft;
    ctx.globalAlpha = seed.flight.opacity * lerp(0.34, 0.72, variation);
    ctx.lineWidth = (j % 4 === 0 ? 0.5 : 0.34) * scale;
    ctx.stroke();
  }
  ctx.restore();
}

/** Draw flower, with a temporary gust bending the stem and the head. */
function drawFlower(ctx, width, height, seeds, time = 0, gustX = 0, gustY = 0) {
  const palette = getPalette();
  const { scale, baseHeadX, baseHeadY, radius, bottomY } = getGeometry(width, height);
  const motion = getIdleMotion(time);
  const headX = baseHeadX + motion.swayX * scale + Math.tanh(gustX / 2.5) * 72 * scale;
  const headY = baseHeadY + motion.swayY * scale + Math.tanh(gustY / 2.5) * 38 * scale;

  ctx.clearRect(0, 0, width, height);
  drawStem(ctx, headX, headY, bottomY, palette, scale, baseHeadX);

  ctx.save();
  ctx.translate(headX, headY);
  ctx.rotate(motion.rotation + Math.tanh(gustX / 2.5) * 0.065 + Math.tanh(gustY / 2.5) * 0.014);
  ctx.translate(-headX, -headY);

  // Preserve depth ordering of the original drawing.
  const drawAttached = (seed) => {
    if (!seed.attached) return;
    const secondary = getSeedMotion(seed, time);
    ctx.save();
    ctx.translate(secondary.x * scale, secondary.y * scale);
    const originalOpacity = seed.opacity;
    seed.opacity *= seed.growth ?? 1;
    drawSeed(ctx, seed, headX, headY, radius, palette, scale);
    seed.opacity = originalOpacity;
    ctx.restore();
  };
  seeds.filter(seed => seed.depth < 0).forEach(drawAttached);
  drawReceptacle(ctx, headX, headY + radius * 0.12, scale, palette);
  seeds.filter(seed => seed.depth >= 0).forEach(drawAttached);
  ctx.restore();

  seeds.forEach(seed => {
    if (seed.flight) drawFloatingSeed(ctx, seed, palette, scale);
  });
}

export default function Dandelion() {
  const canvasRef = useRef(null);
  const seedsRef = useRef(null);
  if (seedsRef.current === null) seedsRef.current = createSeeds();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reducedMotion = motionPreference.matches;
    let frame = null;
    let width = 0;
    let height = 0;
    let lastTime = null;
    let gustX = 0;
    let gustY = 0;
    let gustTargetX = 0;
    let gustTargetY = 0;
    let gustVelocityX = 0;
    let gustVelocityY = 0;
    let lastRelease = -Infinity;
    let lastPointer = null;
    let activeTouchId = null;

    // Regeneration: wait until the flower is mostly empty, rest briefly,
    // then reveal its seeds progressively over four seconds.
    const REGEN_THRESHOLD = Math.ceil(SEED_COUNT * 0.28);
    const REGEN_PAUSE = 2.7;
    const REGEN_DURATION = 4.2;
    let regeneration = "idle"; // idle | waiting | growing
    let regenerationStart = 0;

    // Seeds near the centre of the projected head appear first. A little
    // deterministic variation prevents an obviously mechanical wipe.
    const growthOrder = [...seedsRef.current].sort((a, b) => {
      const aOrder = Math.hypot(a.x, a.y) + (random(a.id + 871) - 0.5) * 0.3;
      const bOrder = Math.hypot(b.x, b.y) + (random(b.id + 871) - 0.5) * 0.3;
      return aOrder - bOrder;
    });
    const growthRank = new Map(growthOrder.map((seed, index) => [seed.id, index]));

    const paint = (time = 0) => drawFlower(ctx, width, height, seedsRef.current, time, gustX, gustY);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      if (!width || !height) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (reducedMotion) paint(0);
    };

    // A finger swipe uses the same wind physics as a mouse sweep.
    // Only begin a touch interaction close to the flower; otherwise ignore it.
    const onPointerDown = (event) => {
      if (event.pointerType !== "touch" || reducedMotion || regeneration !== "idle") return;
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const { scale, baseHeadX, baseHeadY, radius } = getGeometry(width, height);
      const headX = baseHeadX + getIdleMotion(event.timeStamp / 1000).swayX * scale + Math.tanh(gustX / 2.5) * 72 * scale;
      const headY = baseHeadY + getIdleMotion(event.timeStamp / 1000).swayY * scale + Math.tanh(gustY / 2.5) * 38 * scale;
      if (Math.hypot(x - headX, y - headY) > radius * 2.2) return;
      activeTouchId = event.pointerId;
      lastPointer = { x, y, time: event.timeStamp };
      canvas.setPointerCapture?.(event.pointerId);
    };

    /** Wind responds to pointer velocity, not absolute pointer position. */
    const onPointerMove = (event) => {
      if (reducedMotion || regeneration !== "idle") return;
      if (event.pointerType === "touch" && event.pointerId !== activeTouchId) return;
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const now = event.timeStamp;
      const previous = lastPointer;
      lastPointer = { x, y, time: now };
      if (!previous) return;
      const dt = now - previous.time;
      if (dt <= 0 || dt > 120) return;

      const dx = x - previous.x;
      const dy = y - previous.y;
      const speed = Math.hypot(dx, dy) / dt; // px per ms
      const { scale, baseHeadX, baseHeadY, radius } = getGeometry(width, height);
      const headX = baseHeadX + getIdleMotion(now / 1000).swayX * scale + Math.tanh(gustX / 2.5) * 72 * scale;
      const headY = baseHeadY + getIdleMotion(now / 1000).swayY * scale + Math.tanh(gustY / 2.5) * 38 * scale;
      // Measure distance from the entire swept pointer segment, so fast strokes register.
      const segmentLengthSquared = dx * dx + dy * dy;
      const t = segmentLengthSquared ? Math.max(0, Math.min(1, ((headX - previous.x) * dx + (headY - previous.y) * dy) / segmentLengthSquared)) : 0;
      const closestX = previous.x + dx * t;
      const closestY = previous.y + dy * t;
      const distance = Math.hypot(closestX - headX, closestY - headY);
      const proximity = Math.max(0, 1 - distance / (radius * 1.65));
      if (!proximity) return;

      // Preserve the pointer direction on both axes. A vertical sweep
      // now bends the stem vertically rather than being treated as horizontal wind.
      const direction = Math.abs(dx) > 0.5 ? Math.sign(dx) : 0;
      const strength = Math.min(1.65, speed * 1.3) * proximity;
      const distanceMoved = Math.hypot(dx, dy) || 1;
      gustTargetX = (dx / distanceMoved) * strength;
      gustTargetY = (dy / distanceMoved) * strength;

      // A sharp sweep transfers a short impulse into the stem. This is
      // intentionally separate from the slower, sustained wind target.
      // The spring carries that momentum after the pointer has moved away.
      if (speed > 0.7) {
        const impulse = Math.min(1, (speed - 0.7) / 1.6) * proximity;
        gustVelocityX += (dx / distanceMoved) * impulse * 6.5;
        gustVelocityY += (dy / distanceMoved) * impulse * 6.5;
      }

      if (speed < 0.85 || distance > radius * 1.12 || now - lastRelease < 300) return;
      lastRelease = now;

      const candidates = seedsRef.current
        .filter(seed => seed.attached)
        .map(seed => {
          const px = headX + seed.x * radius * (0.72 + 0.12 * seed.length);
          const py = headY + seed.y * radius * (0.72 + 0.12 * seed.length);
          return { seed, px, py, distance: Math.hypot(px - closestX, py - closestY) };
        })
        .filter(item => item.distance < radius * 0.68)
        .sort((a, b) => a.distance - b.distance);

      const count = Math.min(candidates.length, speed > 1.8 ? 4 : 2);
      candidates.slice(0, count).forEach(({ seed, px, py }) => {
        seed.attached = false;
        seed.growth = 0;
        seed.flight = {
          x: px,
          y: py,
          vx: direction * (24 + random(seed.id + 201) * 24) + dx / dt * 25,
          vy: -12 - random(seed.id + 301) * 20 + (dy / dt) * 25,
          angle: seed.rotation,
          spin: (random(seed.id + 401) - 0.5) * 0.8,
          phase: seed.id * 2.39996,
          opacity: seed.opacity,
        };
      });
    };

    const resetPointer = (event) => {
      if (event?.pointerType === "touch" && event.pointerId !== activeTouchId) return;
      lastPointer = null;
      activeTouchId = null;
      gustTargetX = 0;
      gustTargetY = 0;
    };

    const render = (timestamp) => {
      const time = timestamp / 1000;
      const dt = lastTime === null ? 0 : Math.min(0.04, (timestamp - lastTime) / 1000);
      lastTime = timestamp;

      // Begin recovery after most seeds have dispersed and the user
      // has paused interaction. All seed depths can now detach.
      if (regeneration === "idle") {
        const remaining = seedsRef.current.reduce((n, seed) => n + Number(seed.attached), 0);
        if (remaining <= REGEN_THRESHOLD && time - lastRelease / 1000 >= 1.4) {
          regeneration = "waiting";
          regenerationStart = time;
        }
      } else if (regeneration === "waiting" && time - regenerationStart >= REGEN_PAUSE) {
        regeneration = "growing";
        regenerationStart = time;
        // Keep already detached seeds in flight while the head grows back.
        for (const seed of seedsRef.current) {
          seed.attached = true;
          seed.growth = 0;
        }
      } else if (regeneration === "growing") {
        const progress = Math.min(1, (time - regenerationStart) / REGEN_DURATION);
        for (const seed of seedsRef.current) {
          const rank = growthRank.get(seed.id) / (SEED_COUNT - 1);
          const local = Math.max(0, Math.min(1, (progress - rank * 0.72) / 0.28));
          seed.growth = local * local * (3 - 2 * local);
        }
        if (progress >= 1) {
          regeneration = "idle";
          for (const seed of seedsRef.current) seed.growth = 1;
        }
      }

      // Fast response to a gust; slower, spring-like settling afterward.
      gustTargetX *= Math.exp(-dt * 3.2);
      gustTargetY *= Math.exp(-dt * 3.2);
      // Damped spring: wind gives the stem momentum, so it bends,
      // overshoots slightly, then settles instead of snapping back.
      const stiffness = 30;
      const damping = 6.8;
      gustVelocityX += (stiffness * (gustTargetX - gustX) - damping * gustVelocityX) * dt;
      gustVelocityY += (stiffness * (gustTargetY - gustY) - damping * gustVelocityY) * dt;
      gustX += gustVelocityX * dt;
      gustY += gustVelocityY * dt;
      // No hard clamp: tanh in drawFlower gently saturates large gusts
      // without the abrupt collision at the previous +/-1.8 limit.
      for (const seed of seedsRef.current) {
        if (!seed.flight) continue;
        const f = seed.flight;
        const breeze = Math.sin(time * 0.65 + f.phase) * 11 + Math.sin(time * 1.17 + f.phase * 0.3) * 5;
        f.vx += (breeze - f.vx * 0.12) * dt;
        f.vy += (6 + Math.sin(time * 1.2 + f.phase) * 7 - f.vy * 0.08) * dt;
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        f.angle += f.spin * dt;
        // Retire individual drifting seeds only after they leave the view.
        const margin = 55 * getGeometry(width, height).scale;
        if (f.x < -margin || f.x > width + margin || f.y < -margin || f.y > height + margin) {
          seed.flight = null;
        }
      }
      if (width && height) paint(time);
      frame = requestAnimationFrame(render);
    };

    const onMotionChange = (event) => {
      reducedMotion = event.matches;
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      lastTime = null;
      gustX = 0;
      gustY = 0;
      gustTargetX = 0;
      gustTargetY = 0;
      gustVelocityX = 0;
      gustVelocityY = 0;
      if (reducedMotion) {
        regeneration = "idle";
        for (const seed of seedsRef.current) {
          if (seed.attached) seed.growth = 1;
        }
        paint(0);
      } else frame = requestAnimationFrame(render);
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    const themeObserver = new MutationObserver(() => {
      if (reducedMotion && width && height) paint(0);
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    themeObserver.observe(document.body, { attributes: true, attributeFilter: ["data-theme"] });
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", resetPointer);
    canvas.addEventListener("pointercancel", resetPointer);
    canvas.addEventListener("pointerleave", resetPointer);
    window.addEventListener("blur", resetPointer);
    motionPreference.addEventListener("change", onMotionChange);
    resize();
    if (!reducedMotion) frame = requestAnimationFrame(render);

    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      themeObserver.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", resetPointer);
      canvas.removeEventListener("pointercancel", resetPointer);
      canvas.removeEventListener("pointerleave", resetPointer);
      window.removeEventListener("blur", resetPointer);
      motionPreference.removeEventListener("change", onMotionChange);
    };
  }, []);

  return (
    <div className={styles.root}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        style={{ touchAction: "none" }}
        aria-label="An interactive dandelion that releases seeds when you sweep nearby"
        role="img"
      />
    </div>
  );
}
