
import { Link } from "react-router";
import { studies } from "../studies";
import styles from "./StudyNavigation.module.css";

/**
 * Navigation between studies, study information,
 * and the global light/dark theme toggle.
 */
export default function StudyNavigation({
  study,
  infoOpen,
  onToggleInfo,
  theme,
  onToggleTheme,
}) {
  const currentIndex = studies.findIndex(
    (item) => item.id === study.id
  );

  const previous = studies[currentIndex - 1];
  const next = studies[currentIndex + 1];

  return (
    <nav
      className={styles.navigation}
      aria-label="Study navigation"
    >
      {/* Previous and next study */}
      <div className={styles.arrows}>
        {previous ? (
          <Link
            to={previous.path}
            className={styles.iconButton}
            aria-label="Previous study"
          >
            <ArrowLeft />
          </Link>
        ) : (
          <span
            className={`${styles.iconButton} ${styles.disabled}`}
          >
            <ArrowLeft />
          </span>
        )}

        {next ? (
          <Link
            to={next.path}
            className={styles.iconButton}
            aria-label="Next study"
          >
            <ArrowRight />
          </Link>
        ) : (
          <span
            className={`${styles.iconButton} ${styles.disabled}`}
          >
            <ArrowRight />
          </span>
        )}
      </div>

      <span className={styles.divider} aria-hidden="true" />

      {/* Study information and title */}
      <div className={styles.studyDetails}>
        <button
          type="button"
          className={`${styles.iconButton} ${
            infoOpen ? styles.active : ""
          }`}
          onClick={onToggleInfo}
          aria-label={`About ${study.title}`}
          aria-expanded={infoOpen}
        >
          <InfoIcon />
        </button>

        <div className={styles.studyLabel}>

          <span className={styles.title}>
            {study.title.toLowerCase()}
          </span>
        </div>
      </div>

      <span className={styles.divider} aria-hidden="true" />

      {/* Global theme toggle */}
      <button
        type="button"
        className={styles.iconButton}
        onClick={onToggleTheme}
        aria-label={`Switch to ${
          theme === "dark" ? "light" : "dark"
        } mode`}
        title={`Switch to ${
          theme === "dark" ? "light" : "dark"
        } mode`}
      >
        {theme === "dark" ? <SunIcon /> : <MoonIcon />}
      </button>
    </nav>
  );
}

function ArrowLeft() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 5L8 12L15 19" />
    </svg>
  );
}

function ArrowRight() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 5L16 12L9 19" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
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
