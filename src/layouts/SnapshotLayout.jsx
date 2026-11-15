
import { useEffect, useState } from "react";
import SnapshotNavigation from "../components/SnapshotNavigation";
import SnapshotInfoModal from "../components/SnapshotInfoModal";
import SnapshotIconButton from "../components/ui/SnapshotIconButton";
import {
  SnapshotActionsProvider,
  useSnapshotActions,
} from "../components/SnapshotActionsContext";
import styles from "./SnapshotLayout.module.css";

/**
 * Provides each snapshot with its own set of
 * navigation actions.
 */
export default function SnapshotLayout({
  snapshot,
  theme,
  onToggleTheme,
}) {
  return (
    <SnapshotActionsProvider key={snapshot.id}>
      <SnapshotLayoutContent
        snapshot={snapshot}
        theme={theme}
        onToggleTheme={onToggleTheme}
      />
    </SnapshotActionsProvider>
  );
}

/**
 * Shared layout for all snapshots.
 * Handles navigation, preview mode, theme controls,
 * and the specific snapshot actions
 */
function SnapshotLayoutContent({
  snapshot,
  theme,
  onToggleTheme,
}) {
  const [infoOpen, setInfoOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  const { actions } = useSnapshotActions();

  const SnapshotComponent = snapshot.component;
  const isFullScreen = snapshot.layout === "fullscreen";

  /**
   * Press Escape to leave preview mode
   */
  useEffect(() => {
    if (!previewMode) return;

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setPreviewMode(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [previewMode]);

  /**
   * Hide all interface controls without
   * unmounting active snapshot
   */
  function enterPreviewMode() {
    setInfoOpen(false);
    setPreviewMode(true);
  }

  return (
    <main className={styles.page}>
      {/* Fixed page-level controls */}
      <div
        className={styles.pageControls}
        hidden={previewMode}
      >
        <SnapshotIconButton
          label="Hide UI"
          onClick={enterPreviewMode}
        >
          <EyeOffIcon />
        </SnapshotIconButton>

        <SnapshotIconButton
          label={`Switch to ${
            theme === "dark" ? "light" : "dark"
          } mode`}
          onClick={onToggleTheme}
        >
          {theme === "dark" ? <SunIcon /> : <MoonIcon />}
        </SnapshotIconButton>
      </div>

      {/* Snapshot and navigation */}
      <div
        className={`${styles.studyGroup} ${
          isFullScreen ? styles.studyGroupFull : ""
        }`}
      >
        <div
          className={`${styles.interaction} ${
            isFullScreen ? styles.interactionFull : ""
          }`}
        >
          <SnapshotComponent />
        </div>

        <div
          className={`${styles.navigationArea} ${
            isFullScreen ? styles.navigationFull : ""
          }`}
          hidden={previewMode}
        >
          <SnapshotNavigation
            snapshot={snapshot}
            infoOpen={infoOpen}
            onToggleInfo={() => setInfoOpen(true)}
            actions={
              actions.length > 0
                ? actions.map((action) => (
                    <SnapshotIconButton
                      key={action.id}
                      label={action.label}
                      onClick={action.onClick}
                      disabled={action.disabled}
                    >
                      {action.icon}
                    </SnapshotIconButton>
                  ))
                : null
            }
          />
        </div>
      </div>

      {/* Snapshot information */}
      {!previewMode && (
        <SnapshotInfoModal
          snapshot={snapshot}
          isOpen={infoOpen}
          onClose={() => setInfoOpen(false)}
        />
      )}

      {/* Accessible preview instructions */}
      {previewMode && (
        <span className={styles.srOnly}>
          Preview mode. Press Escape to restore the interface.
        </span>
      )}
    </main>
  );
}

function EyeOffIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 3l18 18" />
      <path d="M10.6 5.2A10.7 10.7 0 0 1 12 5c5.5 0 9 7 9 7a16 16 0 0 1-3 3.8" />
      <path d="M6.5 6.5C3.8 8.2 3 12 3 12s3.5 7 9 7a9.7 9.7 0 0 0 4.4-1" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5 8.5 8.5 0 1 0 20.5 14.5Z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}
