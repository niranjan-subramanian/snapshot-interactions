
import { useState } from "react";
import SnapshotNavigation from "../components/SnapshotNavigation";
import SnapshotInfoModal from "../components/SnapshotInfoModal";
import styles from "./SnapshotLayout.module.css";

export default function SnapshotLayout({
  snapshot,
  theme,
  onToggleTheme,
}) {
  const [infoOpen, setInfoOpen] = useState(false);

  const SnapshotComponent = snapshot.component;
  const isFullScreen = snapshot.layout === "fullscreen";

  return (
    <main className={styles.page}>
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
        >
          <SnapshotNavigation
            snapshot={snapshot}
            infoOpen={infoOpen}
            onToggleInfo={() => setInfoOpen(true)}
            theme={theme}
            onToggleTheme={onToggleTheme}
          />
        </div>
      </div>

      <SnapshotInfoModal
        snapshot={snapshot}
        isOpen={infoOpen}
        onClose={() => setInfoOpen(false)}
      />
    </main>
  );
}
