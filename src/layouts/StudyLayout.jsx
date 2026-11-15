
import { useState } from "react";
import StudyNavigation from "../components/StudyNavigation";
import StudyInfoModal from "../components/StudyInfoModal";
import styles from "./StudyLayout.module.css";

export default function StudyLayout({ study, theme, onToggleTheme }) {
  const [infoOpen, setInfoOpen] = useState(false);

  const StudyComponent = study.component;
  const isFullScreen = study.layout === "fullscreen";

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
          <StudyComponent />
        </div>

        <div
          className={`${styles.navigationArea} ${
            isFullScreen ? styles.navigationFull : ""
          }`}
        >
          <StudyNavigation
            study={study}
            infoOpen={infoOpen}
            onToggleInfo={() => setInfoOpen(true)}
            theme={theme}
            onToggleTheme={onToggleTheme}
          />
        </div>
      </div>

      <StudyInfoModal
        study={study}
        isOpen={infoOpen}
        onClose={() => setInfoOpen(false)}
      />
    </main>
  );
}
