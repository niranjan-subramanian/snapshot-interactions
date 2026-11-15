import { useEffect, useRef } from "react";

import cloud02 from "./assets/cloud-02.webp";
import cloud03 from "./assets/cloud-03.webp";

/* ========================================
   TWEAKABLES
======================================== */

const PIXEL_SIZE = 12; // mosaic cell size in px (try 8-24)
const SCENE_SCALE = 0.5; // resolution of the smooth sky (0.5 = half res)
const FRAME_RATE = 30;
const THEME_DURATION = 1200; // milliseconds

const CELL_OPACITY = 1; // 1 = full mosaic, lower lets the smooth sky show through
const SMOOTH_MIX = 0.25; // smooth cloud under the mosaic (only visible if CELL_OPACITY < 1)
const BLEND = "source-over"; // try "screen" for a glowier look

// Faint glass finish on each cell (set both to 0 for flat mosaic)
const GLOSS = 0;
const RIM_LIGHT = 0;

const DAY_BRIGHTNESS = 1;
const NIGHT_BRIGHTNESS = 0.5;

/* ========================================
   SKY (mirrors the old CSS gradients)
   [x, y, radiusX, radiusY, [r, g, b, a]] as fractions of width/height.
   The first entry is the top-most layer, like in CSS.
======================================== */

const DAY_GLOWS = [
  // Subtle warm sunlight in the upper-right
  [0.92, -0.12, 0.55, 0.72, [216, 186, 157, 0.24]],

  // Deep, rich blue across the left
  [0.05, 0.40, 0.62, 0.80, [38, 78, 116, 0.65]],

  // Soft slate-blue across the upper centre
  [0.48, 0.05, 0.65, 0.50, [92, 116, 143, 0.38]],

  // Muted, sunlit blue toward the upper-right
  [0.90, 0.20, 0.50, 0.60, [144, 166, 185, 0.42]],

  // Darker blue through the middle for readable white text
  [0.48, 0.48, 0.60, 0.70, [37, 75, 112, 0.32]],

  // Gentle steel-blue toward the lower-left
  [0.15, 0.90, 0.60, 0.50, [71, 108, 143, 0.45]],

  // Slightly brighter blue along the lower-right
  [0.82, 0.88, 0.52, 0.50, [91, 128, 157, 0.35]],
];


// Night glows retain the same positions and radii as the day palette.
// Only the RGBA colours change, preserving the gradient composition.
const NIGHT_GLOWS = [
  [0.08, 0.35, 0.52, 0.65, [34, 82, 122, 0.82]],
  [0.48, 0.02, 0.58, 0.35, [52, 65, 111, 0.70]],
  [0.88, 0.25, 0.46, 0.50, [88, 119, 153, 0.54]],
  [0.90, 0.60, 0.42, 0.50, [27, 57, 100, 0.78]],
  [0.20, 0.82, 0.48, 0.42, [45, 66, 96, 0.76]],
  [0.62, 0.92, 0.48, 0.38, [45, 94, 133, 0.62]],
  [0.52, 0.48, 0.43, 0.46, [9, 23, 46, 0.62]],
];

const DAY_BASE = [54, 94, 132]; // #365E84
const NIGHT_BASE = [23, 44, 70]; // #12243a

/* ========================================
   CLOUDS
   width / from / to are fractions of the canvas width (from/to = left edge).
   y is the top edge as a fraction of height.
   duration = seconds for one full pass; phase offsets the start.
======================================== */

const CLOUDS = [
  {
    src: cloud02,
    width: 0.5,
    mobileWidth: 1,
    y: -0.05,
    from: 0.25,
    to: 2.5,
    duration: 600,
    phase: 0.15,
    alpha: 0.5,
  },
    {
    src: cloud03,
    width: 0.7,
    mobileWidth: 1,
    y: 0.35,
    from: -0.7,
    to: 2.5,
    duration: 600,
    phase: 0.15,
    alpha: 0.6,
  },
];

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smoothstep = (v) => v * v * (3 - 2 * v);
const lerp = (a, b, t) => a + (b - a) * t;

function mixColour(day, night, amount) {
  return day.map((channel, i) => lerp(channel, night[i], amount));
}

function drawSky(ctx, w, h, amount) {
  const [br, bg, bb] = mixColour(DAY_BASE, NIGHT_BASE, amount);
  const baseColour = `rgb(${br}, ${bg}, ${bb})`;
  ctx.globalAlpha = 1;
  ctx.fillStyle = baseColour;
  ctx.fillRect(0, 0, w, h);

  // CSS paints the first gradient on top, so draw in reverse
  for (let i = DAY_GLOWS.length - 1; i >= 0; i--) {
    const [x, y, rx, ry, dayColour] = DAY_GLOWS[i];
    const [r, g, b, a] = mixColour(dayColour, NIGHT_GLOWS[i][4], amount);

    ctx.save();
    ctx.translate(x * w, y * h);
    ctx.scale(rx * w, ry * h);

    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${a})`);
    gradient.addColorStop(0.8, `rgba(${r}, ${g}, ${b}, 0)`);

    ctx.fillStyle = gradient;
    ctx.fillRect(-1 / rx - 2, -1 / ry - 2, 2 / rx + 4, 2 / ry + 4);
    ctx.restore();
  }
}

function drawClouds(ctx, w, h, clouds, t, nightAmount) {
  const isMobile = w < 700;

  for (const cloud of clouds) {
    const { img } = cloud;
    if (!img.complete || !img.naturalWidth) continue;

    // 0 -> 1 progress through the drift, wrapping
    const p = (((t / cloud.duration + cloud.phase) % 1) + 1) % 1;

    // Fade in and out at the ends so the wrap is invisible
    const fade = smoothstep(clamp01(Math.min(p / 0.2, (1 - p) / 0.2)));

    const cw = (isMobile ? cloud.mobileWidth : cloud.width) * w;
    const ch = cw * (img.naturalHeight / img.naturalWidth);
    const x = (cloud.from + (cloud.to - cloud.from) * p) * w;

    ctx.globalAlpha = cloud.alpha * fade * lerp(1, 0.45, nightAmount);
    ctx.drawImage(img, x, cloud.y * h, cw, ch);
  }

  ctx.globalAlpha = 1;
}

export default function PixelClouds({ theme = "light" }) {
  const canvasRef = useRef(null);
  const renderRef = useRef(null);
  const initialAmount = theme === "dark" ? 1 : 0;
  const transitionRef = useRef({
    from: initialAmount,
    to: initialAmount,
    start: 0,
  });

  // Change the target without rebuilding the canvases or restarting the clouds.
  useEffect(() => {
    const transition = transitionRef.current;
    const now = performance.now();
    const progress = transition.start
      ? smoothstep(clamp01((now - transition.start) / THEME_DURATION))
      : 1;
    const current = lerp(transition.from, transition.to, progress);
    const target = theme === "dark" ? 1 : 0;

    transitionRef.current = { from: current, to: target, start: now };
    renderRef.current?.(now);
  }, [theme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const clouds = CLOUDS.map((c) => {
      const img = new Image();
      img.src = c.src;
      return { ...c, img };
    });

    // Offscreen canvases
    const scene = document.createElement("canvas"); // sky, then sky + clouds
    const sceneCtx = scene.getContext("2d");

    const cloudLayer = document.createElement("canvas"); // clouds only
    const cloudCtx = cloudLayer.getContext("2d");

    const cells = document.createElement("canvas"); // 1px = 1 cell
    const cellsCtx = cells.getContext("2d");

    const pixels = document.createElement("canvas"); // mosaic of the whole scene
    const pixelsCtx = pixels.getContext("2d");

    // One glass tile (faint gloss + rim light), repeated across the grid
    const tile = document.createElement("canvas");
    tile.width = tile.height = PIXEL_SIZE;
    const tileCtx = tile.getContext("2d");

    const gloss = tileCtx.createLinearGradient(0, 0, PIXEL_SIZE, PIXEL_SIZE);
    gloss.addColorStop(0, `rgba(255, 255, 255, ${GLOSS})`);
    gloss.addColorStop(0.6, "rgba(255, 255, 255, 0)");
    tileCtx.fillStyle = gloss;
    tileCtx.fillRect(0, 0, PIXEL_SIZE, PIXEL_SIZE);

    tileCtx.fillStyle = `rgba(255, 255, 255, ${RIM_LIGHT})`;
    tileCtx.fillRect(0, 0, PIXEL_SIZE, 1);
    tileCtx.fillRect(0, 0, 1, PIXEL_SIZE);

    const tilePattern = pixelsCtx.createPattern(tile, "repeat");

    let width = 0;
    let height = 0;
    let cols = 0;
    let rows = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = Math.max(1, Math.round(rect.width));
      height = Math.max(1, Math.round(rect.height));

      canvas.width = width;
      canvas.height = height;
      pixels.width = width;
      pixels.height = height;

      scene.width = cloudLayer.width = Math.max(
        1,
        Math.ceil(width * SCENE_SCALE)
      );
      scene.height = cloudLayer.height = Math.max(
        1,
        Math.ceil(height * SCENE_SCALE)
      );

      cols = Math.ceil(width / PIXEL_SIZE);
      rows = Math.ceil(height / PIXEL_SIZE);
      cells.width = cols;
      cells.height = rows;

      render(performance.now());
    };

    const render = (time) => {
      if (!width) return;

      const t = reduceMotion ? 0 : time / 1000;
      const transition = transitionRef.current;
      const progress = reduceMotion
        ? 1
        : smoothstep(clamp01((time - transition.start) / THEME_DURATION));
      const nightAmount = lerp(transition.from, transition.to, progress);

      /* 1. Sky and clouds, drawn separately at reduced resolution */
      drawSky(sceneCtx, scene.width, scene.height, nightAmount);

      cloudCtx.clearRect(0, 0, cloudLayer.width, cloudLayer.height);
      drawClouds(cloudCtx, cloudLayer.width, cloudLayer.height, clouds, t, nightAmount);

      /* 2. Smooth sky, plus a little smooth cloud underneath */
      ctx.globalCompositeOperation = "source-over";
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.globalAlpha = 1;
      ctx.drawImage(scene, 0, 0, width, height);

      ctx.globalAlpha = SMOOTH_MIX;
      ctx.drawImage(cloudLayer, 0, 0, width, height);
      ctx.globalAlpha = 1;

      /* 2b. Bake the clouds into the scene so the mosaic covers everything */
      sceneCtx.drawImage(cloudLayer, 0, 0);

      /* 3. Whole scene (sky + clouds) averaged to one pixel per cell.
            Flat areas average to nearly the same colour as the smooth sky,
            so the mosaic only shows where the colour changes */
      cellsCtx.imageSmoothingEnabled = true;
      cellsCtx.imageSmoothingQuality = "high";
      cellsCtx.clearRect(0, 0, cols, rows);
      cellsCtx.drawImage(
        scene,
        0,
        0,
        width / PIXEL_SIZE,
        height / PIXEL_SIZE
      );

      /* 4. Scale the cells up with no smoothing to get the mosaic */
      const gridW = cols * PIXEL_SIZE;
      const gridH = rows * PIXEL_SIZE;

      pixelsCtx.globalCompositeOperation = "source-over";
      pixelsCtx.clearRect(0, 0, width, height);
      pixelsCtx.imageSmoothingEnabled = false;
      pixelsCtx.drawImage(cells, 0, 0, gridW, gridH);

      // Optional glass finish on every cell
      pixelsCtx.globalCompositeOperation = "source-atop";
      pixelsCtx.fillStyle = tilePattern;
      pixelsCtx.fillRect(0, 0, gridW, gridH);
      pixelsCtx.globalCompositeOperation = "source-over";

      /* 5. Mosaic over the whole background */
      ctx.globalCompositeOperation = BLEND;
      ctx.globalAlpha = CELL_OPACITY;
      ctx.drawImage(pixels, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";


        /* 6. Darken the finished atmosphere */
        const brightness = lerp(
        DAY_BRIGHTNESS,
        NIGHT_BRIGHTNESS,
        nightAmount
        );

        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = 1;
        ctx.fillStyle = `rgba(0, 0, 0, ${1 - brightness})`;
        ctx.fillRect(0, 0, width, height);

    };

    renderRef.current = render;

    /* Loop (paused when offscreen, skipped for reduced motion) */
    let frameId = 0;
    let lastFrame = 0;
    let visible = true;

    const loop = (time) => {
      frameId = requestAnimationFrame(loop);
      if (!visible || time - lastFrame < 1000 / FRAME_RATE) return;
      lastFrame = time;
      render(time);
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);

    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    intersectionObserver.observe(canvas);

    if (reduceMotion) {
      // Draw a still frame once the clouds have loaded
      clouds.forEach(({ img }) => {
        img.onload = () => render(0);
      });
    } else {
      frameId = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      renderRef.current = null;
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    />
  );
}