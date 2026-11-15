
import { useEffect, useRef, useState } from "react";
import {
  Routes,
  Route,
  Navigate,
  useParams,
} from "react-router";

import { snapshots } from "./snapshots";
import SnapshotLayout from "./layouts/SnapshotLayout";
import styles from "./App.module.css";

const EXIT_DURATION = 150;
const ENTER_DURATION = 220;

/**
 * Reads the saved theme, falling back to the system preference.
 */
function getInitialTheme() {
  const savedTheme = localStorage.getItem("portfolio-theme");

  if (savedTheme === "light" || savedTheme === "dark") {
    return savedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/**
 * Finds the requested snapshot and manages transitions.
 *
 * Exit -> switch snapshot -> enter.
 */
function SnapshotPage({ theme, onToggleTheme }) {
  const { slug } = useParams();

  const requestedSnapshot = snapshots.find(
    (item) => item.slug === slug
  );

  const [displayedSnapshot, setDisplayedSnapshot] = useState(
    () => requestedSnapshot ?? snapshots[0]
  );

  const [phase, setPhase] = useState("idle");
  const [direction, setDirection] = useState(1);

  const timerRef = useRef(null);
  const displayedRef = useRef(displayedSnapshot);

  // Keep a reference to the currently displayed snapshot.
  useEffect(() => {
    displayedRef.current = displayedSnapshot;
  }, [displayedSnapshot]);

  /**
   * Responds to route changes.
   * Animates the current snapshot out before switching content.
   */
  useEffect(() => {
    if (!requestedSnapshot) return;

    const currentSnapshot = displayedRef.current;

    if (currentSnapshot.id === requestedSnapshot.id) return;

    const currentIndex = snapshots.findIndex(
      (item) => item.id === currentSnapshot.id
    );

    const nextIndex = snapshots.findIndex(
      (item) => item.id === requestedSnapshot.id
    );

    const nextDirection = nextIndex > currentIndex ? 1 : -1;

    window.clearTimeout(timerRef.current);

    setDirection(nextDirection);
    setPhase("exit");

    timerRef.current = window.setTimeout(() => {
      displayedRef.current = requestedSnapshot;
      setDisplayedSnapshot(requestedSnapshot);
      setPhase("enter");
    }, EXIT_DURATION);

    return () => window.clearTimeout(timerRef.current);
  }, [requestedSnapshot]);

  /**
   * Finishes the entrance animation.
   */
  useEffect(() => {
    if (phase !== "enter") return;

    const timer = window.setTimeout(() => {
      setPhase("idle");
    }, ENTER_DURATION);

    return () => window.clearTimeout(timer);
  }, [phase]);

  if (!requestedSnapshot) {
    return <Navigate to={snapshots[0].path} replace />;
  }

  const animationClass =
    phase === "exit"
      ? direction === 1
        ? styles.exitForward
        : styles.exitBackward
      : phase === "enter"
        ? direction === 1
          ? styles.enterForward
          : styles.enterBackward
        : "";

  return (
    <div className={styles.transitionRoot}>
      <div
        key={displayedSnapshot.id}
        className={`${styles.studyLayer} ${animationClass}`}
        inert={phase === "exit" || phase === "enter"}
      >
        <SnapshotLayout
          snapshot={displayedSnapshot}
          theme={theme}
          onToggleTheme={onToggleTheme}
        />
      </div>
    </div>
  );
}

/**
 * Application routing and global theme management.
 */
export default function App() {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("portfolio-theme", theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((current) =>
      current === "light" ? "dark" : "light"
    );
  }

  return (
    <Routes>
      <Route
        path="/"
        element={<Navigate to={snapshots[0].path} replace />}
      />

      <Route
        path="/snapshots/:slug"
        element={
          <SnapshotPage
            theme={theme}
            onToggleTheme={toggleTheme}
          />
        }
      />

      <Route
        path="*"
        element={<Navigate to={snapshots[0].path} replace />}
      />
    </Routes>
  );
}
