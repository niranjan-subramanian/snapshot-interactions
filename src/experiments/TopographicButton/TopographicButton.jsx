
import { useEffect, useRef } from "react";
import styles from "./TopographicButton.module.css";

const GRID = 3;
const LEVELS = Array.from(
  { length: 16 },
  (_, i) => -0.48 + i * 0.115
);

const LEVEL_OPACITIES = LEVELS.map(
  () => 0.1 + Math.random() * 0.9
);

const RED = "#F05A3B";

const clamp = (v, min, max) =>
  Math.max(min, Math.min(max, v));

const lerp = (a, b, t) => a + (b - a) * t;

const random = (a, b) => a + Math.random() * (b - a);

const smoothstep = (t) => t * t * (3 - 2 * t);

/**
 * Smooth deterministic noise for the base landscape.
 */
function hash(x, y, seed) {
  const n = Math.sin(
    x * 127.1 + y * 311.7 + seed * 74.7
  ) * 43758.5453;

  return n - Math.floor(n);
}

function noise(x, y, seed) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = smoothstep(x - ix);
  const fy = smoothstep(y - iy);

  return lerp(
    lerp(
      hash(ix, iy, seed),
      hash(ix + 1, iy, seed),
      fx
    ),
    lerp(
      hash(ix, iy + 1, seed),
      hash(ix + 1, iy + 1, seed),
      fx
    ),
    fy
  ) * 2 - 1;
}

/**
 * A combination of broad ridges and finer details.
 */
function baseTerrain(x, y, seed, peaks) {
  const broad = noise(x / 92, y / 65, seed) * 0.36;
  const medium = noise(
    x / 42, y / 34, seed + 13
  ) * 0.19;

  const fine = noise(
    x / 19, y / 17, seed + 29
  ) * 0.045;

  let elevation = broad + medium + fine;

  for (const peak of peaks) {
    const dx = (x - peak.x) / peak.rx;
    const dy = (y - peak.y) / peak.ry;

    elevation +=
      peak.height * Math.exp(
        -(dx * dx + dy * dy) * 1.4
      );
  }

  return elevation;
}

/**
 * Check whether a point is inside the pill.
 */
function insidePill(x, y, w, h, margin = 0) {
  const r = h / 2 - margin;
  const left = h / 2;
  const right = w - h / 2;
  const cy = h / 2;

  if (x >= left && x <= right) {
    return y >= margin && y <= h - margin;
  }

  const cx = x < left ? left : right;

  return Math.hypot(x - cx, y - cy) <= r;
}

/** Keep the trail inside the rounded pill. */
function constrainToPill(x, y, w, h, margin = 1) {
  const r = h / 2 - margin;
  const cx = clamp(x, h / 2, w - h / 2);
  const dx = x - cx;
  const dy = y - h / 2;
  const distance = Math.hypot(dx, dy);
  if (distance <= r) return { x, y };
  return { x: cx + dx / distance * r, y: h / 2 + dy / distance * r };
}

/** Find the edge where a segment leaves the pill. */
function exitIntersection(from, to, w, h) {
  let low = 0;
  let high = 1;
  for (let i = 0; i < 28; i++) {
    const t = (low + high) / 2;
    const x = lerp(from.x, to.x, t);
    const y = lerp(from.y, to.y, t);
    if (insidePill(x, y, w, h)) low = t;
    else high = t;
  }
  return { x: lerp(from.x, to.x, low), y: lerp(from.y, to.y, low) };
}

export default function TopographicButton() {
  const buttonRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const button = buttonRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");

    if (!button || !canvas || !ctx) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );

    const state = {
      width: 0, height: 0, cols: 0, rows: 0, field: null,
      seed: Math.random() * 1000, peaks: [],
      phase: 0, energy: 0, targetEnergy: 0,
      pointer: null, head: null, trail: [], hovering: false,
      frame: null, lastTime: 0,
    };

    /**
     * Create multiple asymmetric elevations.
     * A new variation is generated on every entry.
     */
    function regenerateTerrain() {
      const { width: w, height: h } = state;

      state.seed = Math.random() * 1000;

      state.peaks = [
        {
          x: w * random(0.18, 0.32),
          y: h * random(0.25, 0.75),
          rx: random(32, 57),
          ry: random(22, 38),
          height: random(0.5, 0.85),
        },
        {
          x: w * random(0.65, 0.85),
          y: h * random(0.2, 0.8),
          rx: random(28, 53),
          ry: random(20, 35),
          height: random(0.4, 0.75),
        },
        {
          x: w * random(0.38, 0.62),
          y: h * random(0.1, 0.9),
          rx: random(55, 85),
          ry: random(25, 48),
          height: random(-0.35, 0.35),
        },
      ];
    }

    function resize() {
      const rect = button.getBoundingClientRect();
      const dpr = Math.min(
        window.devicePixelRatio || 1,
        2
      );

      state.width = rect.width;
      state.height = rect.height;

      state.cols = Math.ceil(rect.width / GRID) + 1;
      state.rows = Math.ceil(rect.height / GRID) + 1;

      state.field = new Float32Array(
        state.cols * state.rows
      );

      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      state.pointer = null;
      state.head = null;
      state.trail = [];

      regenerateTerrain();
    }

    /** Animate the landscape independently of cursor movement. */
    function updateField() {
      const { cols, rows, field, phase } = state;
      const driftX = Math.sin(phase * 0.23) * 12;
      const driftY = Math.cos(phase * 0.19) * 9;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const px = x * GRID;
          const py = y * GRID;
          const broad = noise((px + driftX) / 92, (py + driftY) / 65, state.seed) * 0.36;
          const medium = noise((px - driftX * 0.4) / 42, py / 34, state.seed + 13) * 0.19;
          const fine = noise(px / 19 + phase * 0.04, py / 17, state.seed + 29) * 0.035;
          let height = broad + medium + fine;
          for (let i = 0; i < state.peaks.length; i++) {
            const peak = state.peaks[i];
            const cx = peak.x + Math.sin(phase * 0.35 + i * 2) * 12;
            const cy = peak.y + Math.cos(phase * 0.27 + i * 2) * 8;
            const dx = (px - cx) / peak.rx;
            const dy = (py - cy) / peak.ry;
            const pulse = 0.85 + 0.15 * Math.sin(phase * 0.48 + i);
            height += peak.height * pulse * Math.exp(-(dx * dx + dy * dy) * 1.4);
          }
          field[y * cols + x] = height;
        }
      }
    }

    function interpolate(a, b, level) {
      const d = b - a;

      return Math.abs(d) < 0.00001
        ? 0.5
        : clamp((level - a) / d, 0, 1);
    }

    /**
     * Marching squares extracts the contour lines
     * from the changing height field.
     */
    function drawContours(level) {
      const { cols, rows, field } = state;

      ctx.beginPath();

      for (let y = 0; y < rows - 1; y++) {
        for (let x = 0; x < cols - 1; x++) {
          const i = y * cols + x;

          const tl = field[i];
          const tr = field[i + 1];
          const bl = field[i + cols];
          const br = field[i + cols + 1];

          const px = x * GRID;
          const py = y * GRID;

          const edges = [null, null, null, null];

          if ((tl >= level) !== (tr >= level)) {
            edges[0] = [
              px + interpolate(tl, tr, level) * GRID,
              py,
            ];
          }

          if ((tr >= level) !== (br >= level)) {
            edges[1] = [
              px + GRID,
              py + interpolate(tr, br, level) * GRID,
            ];
          }

          if ((bl >= level) !== (br >= level)) {
            edges[2] = [
              px + interpolate(bl, br, level) * GRID,
              py + GRID,
            ];
          }

          if ((tl >= level) !== (bl >= level)) {
            edges[3] = [
              px,
              py + interpolate(tl, bl, level) * GRID,
            ];
          }

          const crossings = edges
            .map((point, index) =>
              point ? index : -1
            )
            .filter((index) => index !== -1);

          function connect(a, b) {
            ctx.moveTo(...edges[a]);
            ctx.lineTo(...edges[b]);
          }

          if (crossings.length === 2) {
            connect(crossings[0], crossings[1]);
          } else if (crossings.length === 4) {
            const centre =
              (tl + tr + bl + br) / 4;

            if ((centre >= level) === (tl >= level)) {
              connect(0, 1);
              connect(2, 3);
            } else {
              connect(0, 3);
              connect(1, 2);
            }
          }
        }
      }

      ctx.stroke();
    }

    /** Add interpolated samples so quick cursor movements leave no gaps. */
    function addTrailPoint(point, force = false) {
      const trail = state.trail;
      const last = trail[trail.length - 1];
      if (!last) { trail.push(point); return; }
      const distance = Math.hypot(point.x - last.x, point.y - last.y);
      if (distance < 1.25 && !force) return;
      const steps = Math.max(1, Math.ceil(distance / 3));
      for (let i = 1; i <= steps; i++) {
        trail.push({ x: lerp(last.x, point.x, i / steps), y: lerp(last.y, point.y, i / steps) });
      }
    }

    /** Draw the accumulated path with smoothed joins and a circular head. */
    function drawRoute() {
      const points = state.trail;
      if (!points.length) return;
      ctx.globalAlpha = state.energy;
      ctx.strokeStyle = RED;
      ctx.lineWidth = 1.2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length - 1; i++) {
        const p = points[i], next = points[i + 1];
        ctx.quadraticCurveTo(p.x, p.y, (p.x + next.x) / 2, (p.y + next.y) / 2);
      }
      const end = points[points.length - 1];
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
      if (state.hovering && state.head) {
        ctx.beginPath();
        ctx.arc(state.head.x, state.head.y, 3.4, 0, Math.PI * 2);
        ctx.fillStyle = RED;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    /**
     * Draw the landscape and route.
     */
    function draw() {
      const { width, height, energy } = state;

      ctx.clearRect(0, 0, width, height);

      if (energy < 0.002 && !state.hovering) return;

      const computed = getComputedStyle(button);

      const lineColor = computed
        .getPropertyValue("--topology-line")
        .trim();

      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 0.85;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";

      for (let i = 0; i < LEVELS.length; i++) {
        const depth = i / (LEVELS.length - 1);

        ctx.globalAlpha = state.energy * LEVEL_OPACITIES[i];

        drawContours(LEVELS[i]);
      }

      ctx.globalAlpha = 1;

      drawRoute();
    }

    /** The landscape moves on its own; the route follows the pointer with lag. */
    function animate(timestamp) {
      const dt = Math.min((timestamp - (state.lastTime || timestamp)) / 1000, 0.05);
      state.lastTime = timestamp;
      if (!reducedMotion.matches) state.phase += dt;
      const follow = reducedMotion.matches ? 1 : 1 - Math.exp(-dt * 15);
      state.energy += (state.targetEnergy - state.energy) *
        (reducedMotion.matches ? 1 : 1 - Math.exp(-dt * 9));
      if (state.hovering && state.pointer && state.head) {
        const next = constrainToPill(
          lerp(state.head.x, state.pointer.x, follow),
          lerp(state.head.y, state.pointer.y, follow),
          state.width, state.height
        );
        state.head = next;
        addTrailPoint(next);
      }
      updateField();
      draw();
      state.frame = requestAnimationFrame(animate);
    }

    function localPoint(event) {
      const rect = button.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }

    function handleEnter(event) {
      if (event.pointerType === "touch") return;
      regenerateTerrain();
      const p = localPoint(event);
      // Find a true perimeter entry on the ray from the pill centre.
      const centre = { x: state.width / 2, y: state.height / 2 };
      const outward = { x: centre.x + (p.x - centre.x) * 20,
                        y: centre.y + (p.y - centre.y) * 20 };
      const entry = exitIntersection(centre, outward, state.width, state.height);
      state.hovering = true;
      state.targetEnergy = 1;
      state.pointer = constrainToPill(p.x, p.y, state.width, state.height);
      state.head = entry;
      state.trail = [entry];
    }

    function handleMove(event) {
      if (event.pointerType === "touch" || !state.hovering) return;
      const p = localPoint(event);
      state.pointer = constrainToPill(p.x, p.y, state.width, state.height);
    }

    function handleLeave(event) {
      if (state.hovering && state.head) {
        const p = localPoint(event);
        const from = constrainToPill(state.head.x, state.head.y, state.width, state.height, 0);
        // Extend beyond the actual pointer exit, then intersect the boundary.
        const beyond = { x: p.x + (p.x - state.width / 2) * 0.5,
                         y: p.y + (p.y - state.height / 2) * 0.5 };
        const exit = insidePill(beyond.x, beyond.y, state.width, state.height)
          ? constrainToPill(beyond.x, beyond.y, state.width, state.height, 0)
          : exitIntersection(from, beyond, state.width, state.height);
        addTrailPoint(exit, true);
      }
      state.hovering = false;
      state.pointer = null;
      state.head = null;
      state.targetEnergy = 0;
    }

    function handleFocus() { state.targetEnergy = 1; }
    function handleBlur() { if (!state.hovering) state.targetEnergy = 0; }

    const observer = new ResizeObserver(resize);
    observer.observe(button);

    button.addEventListener("pointerenter", handleEnter);
    button.addEventListener("pointermove", handleMove);
    button.addEventListener("pointerleave", handleLeave);
    button.addEventListener("focus", handleFocus);
    button.addEventListener("blur", handleBlur);

    resize();
    state.frame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(state.frame);
      observer.disconnect();

      button.removeEventListener(
        "pointerenter",
        handleEnter
      );
      button.removeEventListener(
        "pointermove",
        handleMove
      );
      button.removeEventListener(
        "pointerleave",
        handleLeave
      );
      button.removeEventListener(
        "focus",
        handleFocus
      );
      button.removeEventListener(
        "blur",
        handleBlur
      );
    };
  }, []);

  return (
    <div className={styles.root}>
      <button
        ref={buttonRef}
        className={styles.button}
        type="button"
      >
        <canvas
          ref={canvasRef}
          className={styles.terrain}
          aria-hidden="true"
        />

        <span className={styles.label}>
          Explore Trails
        </span>
      </button>
    </div>
  );
}