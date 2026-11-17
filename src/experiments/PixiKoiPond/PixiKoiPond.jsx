import { useEffect, useRef, useState } from "react";
import * as PIXI from "pixi.js";
import kohaku from "./assets/kohaku.png";
import tancho from "./assets/tancho.png";
import benigoi from "./assets/benigoi.png";

import { Grid2X2, Grid2X2X} from "lucide-react";
import { useSnapshotActions } from "../../components/SnapshotActionsContext";

/** Minimal, interactive koi on a white background. Utilising pixi.js@7. */
const PIXEL_SIZE = 8;
const PIXEL_SOFTNESS = 0.1;
const SHADOW_OFFSET_X = 8;
const SHADOW_OFFSET_Y = 12;
const SHADOW_ALPHA = 0.18;
const SHADOW_BLUR = 5; 
const COLS = 40;
const ROWS = 8;
const SPACING = 3;
const HISTORY_MAX = 300;
const CURSOR_RADIUS = 190;
const TURN_RATE = 0.0055;
const WANDER_RATE = 0.004;
const TAIL_WAVE = 0.022;
const LENGTH_RANGE = [150, 600];

const FISH = [
  { image: kohaku, x: 0.8, y: 0.4, heading: -0.5, vw: 0.7, speed: 1.4, phase: 0, bend: 0.0035 },
  { image: tancho, x: 0.3, y: 0.3, heading: 0.7, vw: 0.53, speed: 1.6, phase: 2.1, bend: -0.003 },
  { image: kohaku, x: 0.62, y: 0.84, heading: -0.6, vw: 0.25, speed: 2.3, phase: 4.2, bend: 0.003 },
  { image: benigoi, x: 0.62, y: 0.54, heading: 0.4, vw: 0.33, speed: 1.9, phase: 3.4, bend: 0.002 },
];

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const angleDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

function geometryData() {
  const vertices = new Float32Array((COLS + 1) * (ROWS + 1) * 2);
  const uvs = new Float32Array(vertices.length);
  const indices = [];
  for (let i = 0; i <= COLS; i++) {
    for (let j = 0; j <= ROWS; j++) {
      const k = (i * (ROWS + 1) + j) * 2;
      uvs[k] = i / COLS;
      uvs[k + 1] = j / ROWS;
    }
  }
  for (let i = 0; i < COLS; i++) {
    for (let j = 0; j < ROWS; j++) {
      const a = i * (ROWS + 1) + j;
      const b = (i + 1) * (ROWS + 1) + j;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  return { vertices, uvs, indices: new Uint16Array(indices) };
}

function seedHistory(f) {
  f.history = [];
  let x = f.x;
  let y = f.y;
  let angle = f.heading;
  for (let i = 0; i < HISTORY_MAX; i++) {
    x -= Math.cos(angle) * SPACING;
    y -= Math.sin(angle) * SPACING;
    angle += f.bend;
    f.history.push({ x, y });
  }
}

function setFishSize(f, width) {
  f.length = clamp(f.vw * width, LENGTH_RANGE[0], LENGTH_RANGE[1]);
  f.bodyHeight = (f.length * f.texHeight) / f.texWidth;
}

function updateMeshPositions(f) {
  const { history, length, data, bodyHeight } = f;
  const centers = [];
  let trailIndex = 0;
  let traveled = 0;
  const points = [{ x: f.x, y: f.y }, ...history];

  for (let i = 0; i <= COLS; i++) {
    const target = (i / COLS) * length;
    while (trailIndex < points.length - 2) {
      const a = points[trailIndex];
      const b = points[trailIndex + 1];
      const segment = Math.hypot(b.x - a.x, b.y - a.y);
      if (traveled + segment >= target) break;
      traveled += segment;
      trailIndex++;
    }
    const a = points[trailIndex];
    const b = points[Math.min(trailIndex + 1, points.length - 1)];
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    const t = seg ? clamp((target - traveled) / seg, 0, 1) : 0;
    centers.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  }

  const amplitude = length * TAIL_WAVE * (1 + f.panic * 1.4);
  for (let i = 0; i <= COLS; i++) {
    const t = i / COLS;
    const a = centers[Math.max(0, i - 1)];
    const b = centers[Math.min(COLS, i + 1)];
    const mag = Math.hypot(a.x - b.x, a.y - b.y) || 1;
    const nx = -(a.y - b.y) / mag;
    const ny = (a.x - b.x) / mag;
    const wave = Math.sin(f.swim - t * 7) * Math.pow(t, 1.7) * amplitude;
    for (let j = 0; j <= ROWS; j++) {
      const k = (i * (ROWS + 1) + j) * 2;
      const offset = (j / ROWS - 0.5) * bodyHeight + wave;
      data.vertices[k] = centers[i].x + nx * offset;
      data.vertices[k + 1] = centers[i].y + ny * offset;
    }
  }

  if (f.mesh) {
    const buffer = f.mesh.geometry.getBuffer("aVertexPosition");
    buffer.data.set(data.vertices);
    buffer.update();
  }
  if (f.shadow) {
    const buffer = f.shadow.geometry.getBuffer("aVertexPosition");
    buffer.data.set(data.vertices);
    buffer.update();
  }
}

function moveFish(f, dt, w, h, pointer) {
  const dx = f.x - pointer.x;
  const dy = f.y - pointer.y;
  const danger = clamp(1 - Math.hypot(dx, dy) / CURSOR_RADIUS, 0, 1);
  f.panic += (danger - f.panic) * Math.min(1, 0.08 * dt);

  f.wander += WANDER_RATE * dt;
  f.heading += Math.sin(f.wander + f.phase) * TURN_RATE * dt;

  let desired = null;
  if (danger > 0) {
    desired = Math.atan2(dy, dx);
  } else {
    const margin = Math.min(110, w * 0.08);
    if (f.x < margin || f.x > w - margin || f.y < margin || f.y > h - margin) {
      desired = Math.atan2(h / 2 - f.y, w / 2 - f.x);
    }
  }
  if (desired !== null) {
    const maxTurn = (0.018 + f.panic * 0.045) * dt;
    f.heading += clamp(angleDiff(desired, f.heading), -maxTurn, maxTurn);
  }

  const targetSpeed = f.speed * (1 + f.panic * 2.7);
  f.currentSpeed += (targetSpeed - f.currentSpeed) * Math.min(1, 0.08 * dt);
  f.x += Math.cos(f.heading) * f.currentSpeed * dt;
  f.y += Math.sin(f.heading) * f.currentSpeed * dt;
  f.swim += (0.13 + f.panic * 0.18) * dt;

  const front = f.history[0];
  if (Math.hypot(f.x - front.x, f.y - front.y) >= SPACING) {
    f.history.unshift({ x: f.x, y: f.y });
    if (f.history.length > HISTORY_MAX) f.history.pop();
  }
  updateMeshPositions(f);
}

export default function PixiKoiPond() {
  const hostRef = useRef(null);
  const appRef = useRef(null);
  const sizeRef = useRef({ width: 1, height: 1 });
  const pixelSizeRef = useRef(PIXEL_SIZE);
  const [pixelated, setPixelated] = useState(true);
  const { setActions } = useSnapshotActions();

  // Keep the pixelation toggle in the shared snapshot navigation.
  useEffect(() => {
    setActions([
      {
        id: "pixelation",
        label: pixelated ? "Disable pixelation" : "Enable pixelation",
        icon: pixelated
          ? <Grid2X2X size={15} strokeWidth={1.7} />
          : <Grid2X2 size={15} strokeWidth={1.7} />,
        onClick: () => setPixelated((current) => !current),
      },
    ]);
    return () => setActions([]);
  }, [pixelated, setActions]);

  // Switch renderer resolution without resetting fish positions or animation.
  useEffect(() => {
    const pixelSize = pixelated ? PIXEL_SIZE : 1;
    pixelSizeRef.current = pixelSize;
    const app = appRef.current;
    if (!app) return;
    const { width, height } = sizeRef.current;
    app.stage.scale.set(1 / pixelSize);
    app.renderer.resize(Math.ceil(width / pixelSize), Math.ceil(height / pixelSize));
    app.render();
  }, [pixelated]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    let app;
    let resizeObserver;
    let intersectionObserver;
    let fish = [];
    let width = Math.max(1, host.clientWidth);
    let height = Math.max(1, host.clientHeight);
    sizeRef.current = { width, height };
    const pointer = { x: -10000, y: -10000 };
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const onMove = (event) => {
      const rect = host.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
        pointer.x = pointer.y = -10000;
      } else {
        pointer.x = x;
        pointer.y = y;
      }
    };
    const onLeave = () => { pointer.x = pointer.y = -10000; };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("blur", onLeave);

    const init = async () => {
      app = new PIXI.Application({
        width: Math.ceil(width / pixelSizeRef.current),
        height: Math.ceil(height / pixelSizeRef.current),
        backgroundAlpha: 0,
        antialias: false,
        autoDensity: false,
        resolution: 1,
        powerPreference: "high-performance",
      });
      if (disposed) { app.destroy(true); return; }
      appRef.current = app;
      sizeRef.current = { width, height };

      // All fish remain in CSS-pixel coordinates. Only the render output
      // is downsampled, then enlarged to create a fixed pixel grid.
      app.stage.scale.set(1 / pixelSizeRef.current);
      Object.assign(app.view.style, {
        display: "block",
        width: "100%",
        height: "100%",
        imageRendering: "pixelated",
        filter: `blur(${PIXEL_SOFTNESS}px)`,
      });
      host.appendChild(app.view);

      const textures = FISH.map((spec) => PIXI.Texture.from(spec.image));
      await Promise.all(textures.map((texture) =>
        texture.baseTexture.valid
          ? Promise.resolve()
          : new Promise((resolve, reject) => {
              texture.baseTexture.once("loaded", resolve);
              texture.baseTexture.once("error", reject);
            })
      ));
      if (disposed) return;

      fish = FISH.map((spec, index) => {
        const texture = textures[index];
        const data = geometryData();
        const f = {
          ...spec,
          x: spec.x * width,
          y: spec.y * height,
          currentSpeed: spec.speed,
          swim: spec.phase,
          panic: 0,
          wander: spec.phase,
          data,
          texWidth: texture.baseTexture.realWidth,
          texHeight: texture.baseTexture.realHeight,
        };
        setFishSize(f, width);
        seedHistory(f);
        updateMeshPositions(f);
        // Duplicate the animated mesh for a soft, transparent silhouette shadow.
        const shadowGeometry = new PIXI.MeshGeometry(
          data.vertices.slice(), data.uvs, data.indices
        );
        const shadow = new PIXI.Mesh(
          shadowGeometry,
          new PIXI.MeshMaterial(texture, { tint: 0x000000 })
        );
        shadow.alpha = SHADOW_ALPHA;
        shadow.position.set(SHADOW_OFFSET_X, SHADOW_OFFSET_Y);
        shadow.filters = [new PIXI.BlurFilter(SHADOW_BLUR)];
        shadow.state.culling = false;

        const geometry = new PIXI.MeshGeometry(data.vertices, data.uvs, data.indices);
        const mesh = new PIXI.Mesh(geometry, new PIXI.MeshMaterial(texture));
        mesh.state.culling = false;
        f.mesh = mesh;
        f.shadow = shadow;
        // Both meshes deform together; the shadow is always underneath its fish.
        app.stage.addChild(shadow, mesh);
        return f;
      });

      const tick = () => {
        const dt = Math.min(app.ticker.deltaTime, 2);
        if (!Number.isFinite(dt)) return;
        for (const f of fish) moveFish(f, dt, width, height, pointer);
      };
      if (reduced) {
        app.render();
        app.ticker.stop();
      } else {
        app.ticker.add(tick);
      }

      resizeObserver = new ResizeObserver(() => {
        const nextW = Math.max(1, host.clientWidth);
        const nextH = Math.max(1, host.clientHeight);
        if (nextW === width && nextH === height) return;
        const sx = nextW / width;
        const sy = nextH / height;
        for (const f of fish) {
          f.x *= sx;
          f.y *= sy;
          for (const p of f.history) { p.x *= sx; p.y *= sy; }
        }
        width = nextW;
        height = nextH;
        sizeRef.current = { width, height };
        const pixelSize = pixelSizeRef.current;
        app.renderer.resize(Math.ceil(width / pixelSize), Math.ceil(height / pixelSize));
        for (const f of fish) {
          setFishSize(f, width);
          updateMeshPositions(f);
        }
        if (reduced) app.render();
      });
      resizeObserver.observe(host);

      intersectionObserver = new IntersectionObserver(([entry]) => {
        if (reduced || !app) return;
        app.ticker[entry.isIntersecting ? "start" : "stop"]();
      });
      intersectionObserver.observe(host);
    };

    init().catch((error) => {
      if (!disposed) console.error("Koi animation failed to initialise:", error);
    });

    return () => {
      disposed = true;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("blur", onLeave);
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      appRef.current = null;
      app?.destroy(true, { children: true, texture: false, baseTexture: false });
    };
  }, []);

  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        background: "transparent",
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
}
