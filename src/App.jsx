
import { useEffect, useRef, useState } from "react";
import {
  Routes,
  Route,
  Navigate,
  useParams,
} from "react-router";

import { studies } from "./studies";
import StudyLayout from "./layouts/StudyLayout";
import styles from "./App.module.css";

const EXIT_DURATION = 150;
const ENTER_DURATION = 220;

/**
 * Reads the saved theme, falling back to the user's system preference.
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
 * Finds the requested study and transitions between studies.
 *
 * Exit -> switch study -> enter.
 *
 * Only one study is rendered at a time, preventing overlapping
 * navigation bars and interaction elements.
 */
function StudyPage({ theme, onToggleTheme }) {
  const { studyId } = useParams();

  const requestedStudy = studies.find(
    (item) => item.id === studyId
  );

  const [displayedStudy, setDisplayedStudy] = useState(
    () => requestedStudy ?? studies[0]
  );

  const [phase, setPhase] = useState("idle");
  const [direction, setDirection] = useState(1);

  const timerRef = useRef(null);
  const displayedRef = useRef(displayedStudy);

  // Keep a reference to the currently displayed study.
  useEffect(() => {
    displayedRef.current = displayedStudy;
  }, [displayedStudy]);

  /**
   * Responds to route changes.
   * First animates the current study out, then switches content.
   */
  useEffect(() => {
    if (!requestedStudy) return;

    const currentStudy = displayedRef.current;

    if (currentStudy.id === requestedStudy.id) return;

    const currentIndex = studies.findIndex(
      (item) => item.id === currentStudy.id
    );

    const nextIndex = studies.findIndex(
      (item) => item.id === requestedStudy.id
    );

    const nextDirection = nextIndex > currentIndex ? 1 : -1;

    window.clearTimeout(timerRef.current);

    setDirection(nextDirection);
    setPhase("exit");

    timerRef.current = window.setTimeout(() => {
      displayedRef.current = requestedStudy;
      setDisplayedStudy(requestedStudy);
      setPhase("enter");
    }, EXIT_DURATION);

    return () => window.clearTimeout(timerRef.current);
  }, [requestedStudy]);

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

  if (!requestedStudy) {
    return <Navigate to={studies[0].path} replace />;
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
        key={displayedStudy.id}
        className={`${styles.studyLayer} ${animationClass}`}
        inert={phase === "exit" || phase === "enter"}
      >
        <StudyLayout
          study={displayedStudy}
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
        element={<Navigate to={studies[0].path} replace />}
      />

      <Route
        path="/studies/:studyId"
        element={
          <StudyPage
            theme={theme}
            onToggleTheme={toggleTheme}
          />
        }
      />

      <Route
        path="*"
        element={<Navigate to={studies[0].path} replace />}
      />
    </Routes>
  );
}
