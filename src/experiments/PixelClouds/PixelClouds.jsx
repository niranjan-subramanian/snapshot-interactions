import { useEffect, useRef } from "react";

import cloud02 from "./assets/cloud-02.webp";
import cloud03 from "./assets/cloud-03.webp";

/* ========================================
   Constants
======================================== */

const PIXEL_SIZE = 12; 
const SCENE_SCALE = 0.5; 
const FRAME_RATE = 30;

const CELL_OPACITY = 1; 
const SMOOTH_MIX = 0.25;
const BLEND = "source-over"; 

const GLOSS = 0;
const RIM_LIGHT = 0;

const DAY_BRIGHTNESS = 1;
const NIGHT_BRIGHTNESS = 1;

/* ========================================
   SKY (mirrors the old CSS gradients)
   [x, y, radiusX, radiusY, [r, g, b, a]] as fractions of width/height.
   The first entry is the top-most layer, like in CSS.
======================================== */

const DAY_GLOWS = [
  [0.90, -0.10, 0.62, 0.80, [224, 244, 255, 0.40]],

  [0.08, 0.08, 0.78, 0.75, [44, 151, 230, 0.42]],

  [0.52, 0.42, 0.85, 0.85, [106, 194, 247, 0.30]],

  [0.50, 1.05, 0.95, 0.70, [190, 231, 251, 0.62]],
];

const NIGHT_GLOWS = [
  [0.90, -0.10, 0.62, 0.80, [65, 91, 133, 0.20]],

  [0.08, 0.08, 0.78, 0.75, [24, 35, 79, 0.42]],

  [0.52, 0.42, 0.85, 0.85, [43, 49, 91, 0.18]],

  [0.50, 1.05, 0.95, 0.70, [55, 77, 113, 0.28]],
];

const NIGHT_BASE = [9, 17, 33];

const DAY_BASE = [87, 174, 235]; // bright clear blue

/* ========================================
   CLOUDS
======================================== */

const CLOUDS = [
  {
    src: cloud02,
    width: 0.5,
    mobileWidth: 1,
    y: -0.05,
    from: 0.25,
    to: 1.5,
    duration: 200,
    phase: 0.7,
    alpha: 1,
  },
    {
    src: cloud03,
    width: 0.7,
    mobileWidth: 1,
    y: 0.25,
    from: -0.7,
    to: 1.7,
    duration: 200,
    phase: 0.2,
    alpha: 1,
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

    // Travel from fully offscreen left to fully offscreen right.
    // The position resets only when the whole cloud has left the canvas.
    const p = (((t / cloud.duration + cloud.phase) % 1) + 1) % 1;
    const cw = (isMobile ? cloud.mobileWidth : cloud.width) * w;
    const ch = cw * (img.naturalHeight / img.naturalWidth);
    const x = -cw + p * (w + cw);

    ctx.globalAlpha = cloud.alpha * lerp(1, 0.28, nightAmount);
    ctx.drawImage(img, x, cloud.y * h, cw, ch);
  }

  ctx.globalAlpha = 1;
}

export default function PixelClouds() {
  const canvasRef = useRef(null);
  useEffect(() => {
    
    // Follow the site's existing data-theme attribute without reinitialising the canvas.
    const themeElement = document.documentElement;
    const getNightTarget = () =>
      themeElement.getAttribute("data-theme") === "dark" ? 1 : 0;
    let nightAmountCurrent = getNightTarget();
    let nightTarget = nightAmountCurrent;
    let lastThemeTime = null;

    const themeObserver = new MutationObserver(() => {
      nightTarget = getNightTarget();
      if (reduceMotion) {
        nightAmountCurrent = nightTarget;
        render(performance.now());
      }
    });

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

    const startTime = performance.now();

    const render = (time) => {
      if (!width) return;

      const t = reduceMotion ? 0 : (time - startTime) / 1000;
      // Smoothly interpolate between day and night over roughly one second.
      const delta = lastThemeTime === null ? 0 : Math.min(time - lastThemeTime, 100);
      lastThemeTime = time;
      const progress = reduceMotion ? 1 : Math.min(1, delta / 950);
      nightAmountCurrent += (nightTarget - nightAmountCurrent) * progress;
      const nightAmount = nightAmountCurrent;

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

    themeObserver.observe(themeElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);

    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    intersectionObserver.observe(canvas);

    if (reduceMotion) {
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
      themeObserver.disconnect();
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