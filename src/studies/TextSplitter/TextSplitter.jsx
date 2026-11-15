import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Scissors, Square} from "lucide-react";
import styles from "./TextSplitter.module.css";
import ResetButton from "../../components/ui/ResetButton";

const INITIAL_TEXT =
  "I'm a firm believer that good design is as little design as possible. " +
  "\"Less is more\" as it ensures our attention is focused on what matters most " +
  "whilst keeping everything else unburdened by nonsense. " +
  "Back to the purity of origin: back to simplicity.";

const INITIAL_WIDTH = 560;
const MIN_WIDTH = 220;
const GAP_AFTER_SPLIT = 32;
const EDGE_PADDING = 12;
const RESERVED_BOTTOM = 180;

const clamp = (value, min, max) =>
  Math.min(Math.max(value, min), Math.max(min, max));

// Return each visual line, including lines created by automatic wrapping.
function measureLines(element) {
  if (!element) return [];
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const lines = [];
  const elementRect = element.getBoundingClientRect();
  let node;

  while ((node = walker.nextNode())) {
    const text = node.textContent || "";
    for (let i = 0; i < text.length; i++) {
      const range = document.createRange();
      range.setStart(node, i);
      range.setEnd(node, i + 1);
      const rect = range.getBoundingClientRect();
      if (!rect.height) continue;
      const top = rect.top - elementRect.top;
      const bottom = rect.bottom - elementRect.top;
      const last = lines[lines.length - 1];
      if (last && Math.abs(last.top - top) < 2) {
        last.end = i + 1;
        last.bottom = Math.max(last.bottom, bottom);
      } else {
        lines.push({ top, bottom, start: i, end: i + 1 });
      }
    }
  }
  return lines;
}

// Snap the cut preview to the closest boundary between rendered lines.
function getCutBoundary(element, pointerY) {
  const lines = measureLines(element);
  if (lines.length < 2) return null;
  const boundaries = lines.slice(0, -1).map((line, index) => ({
    y: (line.bottom + lines[index + 1].top) / 2,
    index: line.end,
  }));
  return boundaries.reduce((closest, boundary) =>
    Math.abs(boundary.y - pointerY) < Math.abs(closest.y - pointerY)
      ? boundary
      : closest
  );
}

function CutCursor({ x, y, visible }) {
  if (!visible) return null;
  return (
    <div
      className={styles.cutCursor}
      style={{ transform: `translate3d(${x - 14}px, ${y - 14}px, 0)` }}
    >
      <svg viewBox="0 0 28 28" aria-hidden="true">
        <path d="M2 14H26" />
        <path d="M2 10V18M26 10V18" />
        <path d="M14 5V11M14 17V23" />
      </svg>
    </div>
  );
}

function TextBox({
  box, selected, splitting, previewY, contentRef,
  onPointerDown, onPointerMove, onPointerLeave, onSplit, onResizeStart,
}) {
  return (
    <div
      className={[
        styles.textBox,
        splitting ? styles.splitting : "",
        box.isNew ? styles.newBox : "",
      ].join(" ")}
      style={{ left: box.x, top: box.y, width: box.width, zIndex: selected ? 2 : 1 }}
      onPointerDown={(event) => onPointerDown(event, box.id)}
      onPointerMove={(event) => onPointerMove(event, box.id)}
      onPointerLeave={onPointerLeave}
      onClick={(event) => {
        if (splitting) {
          event.stopPropagation();
          onSplit(box.id, event);
        }
      }}
    >
      <span className={styles.boxLabel}>{box.label}</span>
      <span className={`${styles.handle} ${styles.topLeft}`} />
      <span className={`${styles.handle} ${styles.topRight}`} />
      <span className={`${styles.handle} ${styles.bottomLeft}`} />
      <span className={`${styles.handle} ${styles.bottomRight}`} />

      <div ref={contentRef} className={styles.textContent}>{box.text}</div>

    {!splitting && (
    <div
        className={styles.resizeHandle}
        onPointerDown={(event) => onResizeStart(event, box.id)}
        onClick={(event) => event.stopPropagation()}
        role="separator"
        aria-label="Resize text box"
    />
    )}
    {splitting && previewY !== null && (
    <div
        className={styles.cutPreview}
        style={{ top: previewY }}
    />
    )}
    </div>
  );
}

export default function TextSplitter() {
  const canvasRef = useRef(null);
  const contentRefs = useRef(new Map());
  const dragRef = useRef(null);
  const resizeRef = useRef(null);
  const nextIdRef = useRef(2);
  const [boxes, setBoxes] = useState([{
    id: 1, label: "Text box", text: INITIAL_TEXT,
    x: 100, y: 110, width: INITIAL_WIDTH, isNew: false,
  }]);
  const [selectedId, setSelectedId] = useState(1);
  const [splitMode, setSplitMode] = useState(false);
  const [preview, setPreview] = useState(null);
  const [cursor, setCursor] = useState({ x: 0, y: 0, visible: false });
  const [resetCount, setResetCount] = useState(0);

  const setContentRef = useCallback((id, node) => {
    if (node) contentRefs.current.set(id, node);
    else contentRefs.current.delete(id);
  }, []);

    // Centre the initial box in the workspace above the floating controls.
    useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const text = contentRefs.current.get(1);

    if (!canvas || !text) return;

    const width = Math.min(
        INITIAL_WIDTH,
        canvas.clientWidth - EDGE_PADDING * 2
    );

    const x = (canvas.clientWidth - width) / 2;

    const availableHeight = Math.max(
      0,
      canvas.clientHeight - RESERVED_BOTTOM
    );

    const y = Math.max(
      EDGE_PADDING,
      (availableHeight - text.offsetHeight) / 2
    );

    setBoxes((current) =>
        current.map((box) =>
        box.id === 1
            ? { ...box, x, y, width }
            : box
        )
    );
    }, [resetCount]);

  // Keep boxes inside the viewport when the browser window changes size.
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => {
      const availableHeight = Math.max(0, canvas.clientHeight - RESERVED_BOTTOM);
      setBoxes((current) => current.map((box) => {
        const width = Math.min(box.width, Math.max(1, canvas.clientWidth - EDGE_PADDING * 2));
        const element = contentRefs.current.get(box.id);
        const height = element?.parentElement?.offsetHeight || 100;
        const x = clamp(box.x, EDGE_PADDING, Math.max(EDGE_PADDING, canvas.clientWidth - width - EDGE_PADDING));
        const y = clamp(box.y, EDGE_PADDING, Math.max(EDGE_PADDING, availableHeight - height - EDGE_PADDING));
        return box.width === width && box.x === x && box.y === y ? box : { ...box, width, x, y };
      }));
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  function exitSplitMode() {
    setSplitMode(false);
    setPreview(null);
    setCursor((current) => ({ ...current, visible: false }));
  }

  // Escape deactivates the tool, even when another element has focus.
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      setSplitMode(false);
      setPreview(null);
      setCursor((current) => ({ ...current, visible: false }));
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, []);

  function handleCanvasPointerDown(event) {
    if (splitMode && !event.target.closest(`.${styles.textBox}`)) {
      exitSplitMode();
    }
  }

  //T
  function handlePointerDown(event, id) {
    if (event.button !== 0) return;
    if (splitMode) {
      setSelectedId(id);
      return;
    }
    const box = boxes.find((item) => item.id === id);
    if (!box || !canvasRef.current) return;
    setSelectedId(id);
    dragRef.current = {
      id, startX: event.clientX, startY: event.clientY,
      originalX: box.x, originalY: box.y,
      width: event.currentTarget.offsetWidth,
      height: event.currentTarget.offsetHeight,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  // Resize from the right edge; do not let the pointer-down start a drag.
  function handleResizeStart(event, id) {
    if (event.button !== 0 || splitMode) return;
    event.stopPropagation();
    const box = boxes.find((item) => item.id === id);
    if (!box) return;
    setSelectedId(id);
    resizeRef.current = {
      id, startX: event.clientX, originalWidth: box.width, x: box.x,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleCanvasPointerMove(event) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    setCursor({ x: event.clientX - rect.left, y: event.clientY - rect.top, visible: splitMode });

    if (resizeRef.current) {
      const resize = resizeRef.current;
      const maxWidth = Math.max(1, canvas.clientWidth - resize.x - EDGE_PADDING);
      const minWidth = Math.min(MIN_WIDTH, maxWidth);
      const width = clamp(resize.originalWidth + event.clientX - resize.startX, minWidth, maxWidth);
      setBoxes((current) => current.map((box) =>
        box.id === resize.id ? { ...box, width } : box
      ));
      return;
    }

    if (!dragRef.current) return;
    const drag = dragRef.current;
    const availableHeight = Math.max(0, canvas.clientHeight - RESERVED_BOTTOM);
    const x = clamp(drag.originalX + event.clientX - drag.startX,
      EDGE_PADDING, Math.max(EDGE_PADDING, canvas.clientWidth - drag.width - EDGE_PADDING));
    const y = clamp(drag.originalY + event.clientY - drag.startY,
      EDGE_PADDING, Math.max(EDGE_PADDING, availableHeight - drag.height - EDGE_PADDING));
    setBoxes((current) => current.map((box) =>
      box.id === drag.id ? { ...box, x, y } : box
    ));
  }

  function handlePointerUp() {
    dragRef.current = null;
    resizeRef.current = null;
  }

  function handleBoxPointerMove(event, id) {
    if (!splitMode) return;

    const element = contentRefs.current.get(id);
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const localY = event.clientY - rect.top;
    const boundary = getCutBoundary(element, localY);

    setPreview(
      boundary
        ? {
            boxId: id,
            y: boundary.y,
            index: boundary.index,
          }
        : null
    );
  }

  // Cut whichever box was clicked, even if it wasn't selected beforehand.
  function handleSplit(id, event) {
    if (!splitMode) return;
    const box = boxes.find((item) => item.id === id);
    const element = contentRefs.current.get(id);
    const canvas = canvasRef.current;
    if (!box || !element || !canvas) return;

    const localY = event.clientY - element.getBoundingClientRect().top;
    const boundary = getCutBoundary(element, localY);
    if (!boundary) return;
    const upperText = box.text.slice(0, boundary.index);
    const lowerText = box.text.slice(boundary.index);
    if (!upperText.trim() || !lowerText.trim()) return;

    const lines = measureLines(element);
    const splitLine = lines.findIndex((line) => line.end === boundary.index);
    if (splitLine < 0) return;
    const lineHeight = parseFloat(getComputedStyle(element).lineHeight);
    const upperHeight = (splitLine + 1) * lineHeight;
    const lowerLineCount = Math.max(1, lines.length - splitLine - 1);
    const lowerHeight = lowerLineCount * lineHeight;
    const availableHeight = Math.max(0, canvas.clientHeight - RESERVED_BOTTOM);
    const lowerY = clamp(box.y + upperHeight + GAP_AFTER_SPLIT,
      EDGE_PADDING, Math.max(EDGE_PADDING, availableHeight - lowerHeight - EDGE_PADDING));
    const newId = nextIdRef.current++;

    setBoxes((current) => [
      ...current.map((item) => item.id === id ? { ...item, text: upperText } : item),
      { id: newId, label: `Text box ${newId}`, text: lowerText,
        x: box.x, y: lowerY, width: box.width, isNew: true },
    ]);
    setSelectedId(newId);
    setPreview(null);
    // Intentionally keep splitMode active until Escape, outside click, or button toggle.
  }

  function toggleSplitMode() {
    if (splitMode) exitSplitMode();
    else {
      handlePointerUp();
      setSplitMode(true);
      setPreview(null);
    }
  }
  // reset the splitter
function resetSplitter() {
  dragRef.current = null;
  resizeRef.current = null;
  nextIdRef.current = 2;

  setSelectedId(1);
  setSplitMode(false);
  setPreview(null);
  setCursor({ x: 0, y: 0, visible: false });

  setBoxes([
    {
      id: 1,
      label: "Text box",
      text: INITIAL_TEXT,
      x: 100,
      y: 110,
      width: INITIAL_WIDTH,
      isNew: false,
    },
  ]);

  // Re-centre after React restores the original text.
  setResetCount((count) => count + 1);
}

  return (
    <div className={styles.root}>
      <div
        ref={canvasRef}
        className={[styles.canvas, splitMode ? styles.cutMode : ""].join(" ")}
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handleCanvasPointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={() => {
          handlePointerUp();
          setCursor((current) => ({ ...current, visible: false }));
          setPreview(null);
        }}
      >
        {boxes.map((box) => (
          <TextBox
            key={box.id}
            box={box}
            selected={box.id === selectedId}
            splitting={splitMode}
            previewY={preview?.boxId === box.id ? preview.y : null}
            contentRef={(node) => setContentRef(box.id, node)}
            onPointerDown={handlePointerDown}
            onPointerMove={handleBoxPointerMove}
            onPointerLeave={() => setPreview(null)}
            onSplit={handleSplit}
            onResizeStart={handleResizeStart}
          />
        ))}
        <CutCursor x={cursor.x} y={cursor.y} visible={cursor.visible} />
      </div>

      <div className={styles.controls}>
        <ResetButton onClick={resetSplitter} />

        <button
          type="button"
          className={[
            styles.splitButton,
            splitMode ? styles.splitButtonActive : "",
          ].join(" ")}
          onClick={toggleSplitMode}
          aria-pressed={splitMode}
        >
          {splitMode
            ? <Square size={12} strokeWidth={1.7} />
            : <Scissors size={12} strokeWidth={1.7} />}
          <span>{splitMode ? "Stop splitting" : "Split text"}</span>
        </button>
      </div>
    </div>
  );
}
