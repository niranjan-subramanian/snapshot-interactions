import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSnapshotActions } from "../../components/SnapshotActionsContext";
import { createArchiveLayout, getArchiveBounds } from "./archiveLayout";
import styles from "./SpatialArchive.module.css";

const MIN_ZOOM = 0.65;
const MAX_ZOOM = 2.5;
const EDGE_PADDING = 90;
const CAMERA_SMOOTHING = 0.15;
const MOMENTUM_FRICTION = 0.7;
const MOMENTUM_STRENGTH = 0.9;
const KEYBOARD_SPEED = 650;
const KEYBOARD_ACCELERATION = 10;
const KEYBOARD_DECELERATION = 8;
const DRAG_THRESHOLD = 7;
const CLOSENESS = 2;

const DIRECTIONS = {
  arrowup: [0, 1],
  w: [0, 1],

  arrowdown: [0, -1],
  s: [0, -1],

  arrowleft: [1, 0],
  a: [1, 0],

  arrowright: [-1, 0],
  d: [-1, 0],
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

function isTypingTarget(target) {
  return target instanceof Element && Boolean(
    target.closest("input, textarea, select, [contenteditable], [role='textbox']")
  );
}

// Camera bounds are measured from currently visible tiles, not the entire archive

function clampCamera(camera, bounds, viewport, anchor) {
  function constrain(position, min, max, viewportSize) {
    const left = position + min * camera.scale;
    const right = position + max * camera.scale;
    const size = right - left;

    if (size <= viewportSize) {
      const anchorCoordinate = viewportSize === viewport.clientWidth ? anchor.x : anchor.y;
      const centered = viewportSize / 2 - anchorCoordinate * camera.scale;
      return clamp(position, centered - EDGE_PADDING, centered + EDGE_PADDING);
    }

    return clamp(
      position,
      viewportSize - max * camera.scale - EDGE_PADDING,
      EDGE_PADDING - min * camera.scale
    );
  }

  return {
    ...camera,
    x: constrain(camera.x, bounds.minX, bounds.maxX, viewport.clientWidth),
    y: constrain(camera.y, bounds.minY, bounds.maxY, viewport.clientHeight),
  };
}

export default function SpatialArchive() {
  const viewportRef = useRef(null);
  const worldRef = useRef(null);
  const pointerRef = useRef(null);
  const cameraRef = useRef({ x: 0, y: 0, scale: 1 });
  const targetCameraRef = useRef({ x: 0, y: 0, scale: 1 });
  const velocityRef = useRef({ x: 0, y: 0 });
  const momentumRef = useRef(false);
  const pressedKeysRef = useRef(new Set());
  const keyboardVelocityRef = useRef({ x: 0, y: 0 });
  const initializedRef = useRef(false);
  const archive = useMemo(() => createArchiveLayout(), []);
  const [selectedId, setSelectedId] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [addedCount, setAddedCount] = useState(0);

  const visibleBounds = useMemo(
    () => getArchiveBounds(archive.tiles.filter(tile => tile.revealAt <= addedCount)),
    [archive, addedCount]
  );

  const boundsRef = useRef(visibleBounds);
  boundsRef.current = visibleBounds;

  const getMinimumZoom = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return MIN_ZOOM;

    const bounds = boundsRef.current;
    const anchor = archive.anchor;
    const radiusX = Math.max(anchor.x - bounds.minX, bounds.maxX - anchor.x);
    const radiusY = Math.max(anchor.y - bounds.minY, bounds.maxY - anchor.y);
    const padding = 35;

    const fitScale = Math.min(
      (viewport.clientWidth - padding * 2) / Math.max(radiusX * 2, 1),
      (viewport.clientHeight - padding * 2) / Math.max(radiusY * 2, 1)
    );

    return Math.min(MIN_ZOOM, Math.max(0.05, fitScale));
  }, [archive]);

  const { setActions } = useSnapshotActions();

  const updateCamera = useCallback((next, immediate = false) => {
    const viewport = viewportRef.current;
    const bounded = viewport ? clampCamera(next, boundsRef.current, viewport, archive.anchor) : next;
    targetCameraRef.current = bounded;

    if (immediate) {
      cameraRef.current = bounded;

      if (worldRef.current) {
        worldRef.current.style.transform = `translate3d(${bounded.x}px, ${bounded.y}px, 0) scale(${bounded.scale})`;
      }
    }
  }, [archive]);

  const stopMomentum = useCallback(() => {
    momentumRef.current = false;
    velocityRef.current = { x: 0, y: 0 };
  }, []);

  const fitArchive = useCallback((immediate = false) => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const { width, height } = viewport.getBoundingClientRect();
    if (!width || !height) return;

    const initial = archive.initialBounds;
    const padding = 35;

    const scale = clamp(
      Math.min(
        (width - padding * 2) / (initial.maxX - initial.minX),
        (height - padding * 2) / (initial.maxY - initial.minY)
      ) * CLOSENESS,
      getMinimumZoom(),
      MAX_ZOOM
    );

    stopMomentum();
    keyboardVelocityRef.current = { x: 0, y: 0 };

    updateCamera({
      x: width / 2 - archive.anchor.x * scale,
      y: height / 2 - archive.anchor.y * scale,
      scale,
    }, immediate);

    setSelectedId(null);
  }, [archive, stopMomentum, updateCamera, getMinimumZoom]);

  useEffect(() => {
    setActions([
      {
        id: "recenter",
        label: "Recenter archive",
        icon: <RecenterIcon />,
        onClick: () => fitArchive(),
      },
      {
        id: "add-tile",
        label: addedCount >= archive.additions ? "All tiles added" : "Add a tile",
        icon: <AddTileIcon />,
        disabled: addedCount >= archive.additions,
        onClick: () => setAddedCount(count => Math.min(count + 1, archive.additions)),
      },
    ]);

    return () => setActions([]);
  }, [fitArchive, setActions, addedCount, archive.additions]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const observer = new ResizeObserver(() => {
      if (!viewport.clientWidth || !viewport.clientHeight) return;

      if (!initializedRef.current) {
        fitArchive(true);
        initializedRef.current = true;
      } else {
        updateCamera(targetCameraRef.current);
      }
    });

    observer.observe(viewport);
    return () => observer.disconnect();
  }, [fitArchive, updateCamera]);

  useEffect(() => {
    let frameId;
    let previousTime = 0;

    function animate(time) {
      const dt = previousTime ? Math.min((time - previousTime) / 1000, 0.05) : 1 / 60;
      previousTime = time;

      const viewport = viewportRef.current;

      if (viewport && initializedRef.current) {
        let dx = 0;
        let dy = 0;

        for (const key of pressedKeysRef.current) {
          const direction = DIRECTIONS[key];

          if (direction) {
            dx += direction[0];
            dy += direction[1];
          }
        }

        const length = Math.hypot(dx, dy);

        if (length) {
          dx /= length;
          dy /= length;
          momentumRef.current = false;
          velocityRef.current = { x: 0, y: 0 };
        }

        const kv = keyboardVelocityRef.current;
        const responsiveness = length ? KEYBOARD_ACCELERATION : KEYBOARD_DECELERATION;
        const amount = 1 - Math.exp(-responsiveness * dt);

        kv.x = lerp(kv.x, dx * KEYBOARD_SPEED, amount);
        kv.y = lerp(kv.y, dy * KEYBOARD_SPEED, amount);

        const target = targetCameraRef.current;
        const nextTarget = {
          ...target,
          x: target.x + kv.x * dt,
          y: target.y + kv.y * dt,
        };

        if (momentumRef.current && !length) {
          const frameFactor = dt * 60;
          const friction = Math.pow(MOMENTUM_FRICTION, frameFactor);

          velocityRef.current.x *= friction;
          velocityRef.current.y *= friction;

          nextTarget.x += velocityRef.current.x * frameFactor;
          nextTarget.y += velocityRef.current.y * frameFactor;

          if (Math.hypot(velocityRef.current.x, velocityRef.current.y) < 0.1) {
            momentumRef.current = false;
          }
        }

        const bounded = clampCamera(nextTarget, boundsRef.current, viewport, archive.anchor);

        if (bounded.x !== nextTarget.x) {
          velocityRef.current.x = 0;
          kv.x = 0;
        }

        if (bounded.y !== nextTarget.y) {
          velocityRef.current.y = 0;
          kv.y = 0;
        }

        targetCameraRef.current = bounded;

        const current = cameraRef.current;
        const smoothing = 1 - Math.pow(1 - CAMERA_SMOOTHING, dt * 60);

        const nextCamera = {
          x: lerp(current.x, bounded.x, smoothing),
          y: lerp(current.y, bounded.y, smoothing),
          scale: lerp(current.scale, bounded.scale, smoothing),
        };

        cameraRef.current = nextCamera;

        if (worldRef.current) {
          worldRef.current.style.transform =
            `translate3d(${nextCamera.x}px, ${nextCamera.y}px, 0) scale(${nextCamera.scale})`;
        }
      }

      frameId = requestAnimationFrame(animate);
    }

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [archive]);

  useEffect(() => {
    function onKeyDown(event) {
      const key = event.key.toLowerCase();
      if (!DIRECTIONS[key] || event.altKey || event.ctrlKey || event.metaKey || isTypingTarget(event.target)) return;

      const active = document.activeElement;
      const viewport = viewportRef.current;
      if (active && active !== document.body && active !== viewport && !viewport?.contains(active)) return;

      event.preventDefault();
      pressedKeysRef.current.add(key);
      setSelectedId(null);
    }

    function onKeyUp(event) {
      pressedKeysRef.current.delete(event.key.toLowerCase());
    }

    function onBlur() {
      pressedKeysRef.current.clear();
      keyboardVelocityRef.current = { x: 0, y: 0 };
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    function handleWheel(event) {
      event.preventDefault();
      stopMomentum();

      const rect = viewport.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;

      const previous = targetCameraRef.current;

      const scale = clamp(
        previous.scale * Math.exp(event.deltaY * 0.001),
        getMinimumZoom(),
        MAX_ZOOM
      );

      const worldX = (mouseX - previous.x) / previous.scale;
      const worldY = (mouseY - previous.y) / previous.scale;

      updateCamera({
        x: mouseX - worldX * scale,
        y: mouseY - worldY * scale,
        scale,
      });

      setSelectedId(null);
    }

    viewport.addEventListener("wheel", handleWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", handleWheel);
  }, [stopMomentum, updateCamera, getMinimumZoom]);

  function handlePointerDown(event) {
    if (event.button !== 0 || pointerRef.current) return;

    stopMomentum();
    pressedKeysRef.current.clear();
    keyboardVelocityRef.current = { x: 0, y: 0 };

    const current = targetCameraRef.current;

    pointerRef.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      cameraX: current.x,
      cameraY: current.y,
      moved: false,
      lastTime: performance.now(),
      lastX: event.clientX,
      lastY: event.clientY,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event) {
    const pointer = pointerRef.current;
    if (!pointer || pointer.id !== event.pointerId) return;

    const dx = event.clientX - pointer.x;
    const dy = event.clientY - pointer.y;

    if (!pointer.moved && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
      pointer.moved = true;
      setDragging(true);
    }

    if (!pointer.moved) return;

    const now = performance.now();
    const dt = Math.max(now - pointer.lastTime, 1);
    const vx = ((event.clientX - pointer.lastX) / dt) * 16.67;
    const vy = ((event.clientY - pointer.lastY) / dt) * 16.67;

    velocityRef.current = {
      x: lerp(velocityRef.current.x, vx, 0.35),
      y: lerp(velocityRef.current.y, vy, 0.35),
    };

    pointer.lastTime = now;
    pointer.lastX = event.clientX;
    pointer.lastY = event.clientY;

    updateCamera({
      ...targetCameraRef.current,
      x: pointer.cameraX + dx,
      y: pointer.cameraY + dy,
    });
  }

  function handlePointerUp(event) {
    const pointer = pointerRef.current;
    if (!pointer || pointer.id !== event.pointerId) return;

    const wasDragging = pointer.moved;
    pointerRef.current = null;
    setDragging(false);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (wasDragging) {
      if (performance.now() - pointer.lastTime > 80) {
        velocityRef.current = { x: 0, y: 0 };
      }

      velocityRef.current.x *= MOMENTUM_STRENGTH;
      velocityRef.current.y *= MOMENTUM_STRENGTH;
      momentumRef.current = Math.hypot(velocityRef.current.x, velocityRef.current.y) > 0.1;
      return;
    }

    const tileElement = event.target.closest("[data-tile-id]");

    if (!tileElement) {
      setSelectedId(null);
      return;
    }

    const tile = archive.tiles.find(item => item.id === tileElement.dataset.tileId);
    if (tile) focusTile(tile);
  }

  function focusTile(tile) {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const { width, height } = viewport.getBoundingClientRect();

    const scale = clamp(Math.min(
      width / (tile.width * 2.2),
      height / (tile.height * 2.2)
    ), getMinimumZoom(), MAX_ZOOM);

    stopMomentum();
    keyboardVelocityRef.current = { x: 0, y: 0 };

    updateCamera({
      x: width / 2 - (tile.x + tile.width / 2) * scale,
      y: height / 2 - (tile.y + tile.height / 2) * scale,
      scale,
    });

    setSelectedId(tile.id);
  }

  return (
    <div
      ref={viewportRef}
      className={`${styles.viewport} ${dragging ? styles.dragging : ""}`}
      tabIndex={0}
      aria-label="Spatial archive. Drag or use arrow keys or WASD to move, and scroll to zoom."
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => {
        pointerRef.current = null;
        stopMomentum();
        setDragging(false);
      }}
    >
      <div
        ref={worldRef}
        className={styles.world}
        style={{
          width: archive.width,
          height: archive.height,
          transform: "translate3d(0px, 0px, 0) scale(1)",
        }}
      >
        {archive.tiles.filter(tile => tile.revealAt <= addedCount).map(tile => (
          <div
            key={tile.id}
            data-tile-id={tile.id}
            className={`${styles.tile} ${selectedId === tile.id ? styles.selected : ""}`}
            style={{
              left: tile.x,
              top: tile.y,
              width: tile.width,
              height: tile.height,
              backgroundColor: tile.kind === "blank" ? "var(--color-surface-muted)" : undefined,
            }}
          >
            {tile.image && <img src={tile.image} alt="" draggable={false} />}
          </div>
        ))}
      </div>
    </div>
  );
}

function RecenterIcon() {
    return (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
    >
        <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
        <circle cx="12" cy="12" r="4" />
    </svg>
    );
}

function AddTileIcon() {
    return (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        aria-hidden="true"
    >
        <path d="M12 5v14M5 12h14" />
    </svg>
    );
}