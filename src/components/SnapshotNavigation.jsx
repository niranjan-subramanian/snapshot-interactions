
import { Link } from "react-router";
import { snapshots } from "../snapshots";
import SnapshotIconButton from "./ui/SnapshotIconButton";
import styles from "./SnapshotNavigation.module.css";

/**
 * Navigation between snapshots and access to
 * information about the current snapshot.
 */
export default function SnapshotNavigation({
  snapshot,
  infoOpen,
  onToggleInfo,
  actions,
}) {
  const currentIndex = snapshots.findIndex(
    (item) => item.id === snapshot.id
  );

  const previous = snapshots[currentIndex - 1];
  const next = snapshots[currentIndex + 1];

  return (
    <nav
      className={styles.navigation}
      aria-label="Snapshot navigation"
    >
      <div className={styles.arrows}>
        {previous ? (
          <Link
            to={previous.path}
            className={styles.iconButton}
            aria-label="Previous snapshot"
            title="Previous snapshot"
          >
            <ArrowLeft />
          </Link>
        ) : (
          <span
            className={`${styles.iconButton} ${styles.disabled}`}
            aria-hidden="true"
          >
            <ArrowLeft />
          </span>
        )}

        {next ? (
          <Link
            to={next.path}
            className={styles.iconButton}
            aria-label="Next snapshot"
            title="Next snapshot"
          >
            <ArrowRight />
          </Link>
        ) : (
          <span
            className={`${styles.iconButton} ${styles.disabled}`}
            aria-hidden="true"
          >
            <ArrowRight />
          </span>
        )}
      </div>

      <span className={styles.divider} aria-hidden="true" />

      <div className={styles.studyDetails}>
        <SnapshotIconButton
          label={`About ${snapshot.title}`}
          onClick={onToggleInfo}
          active={infoOpen}
        >
          <InfoIcon />
        </SnapshotIconButton>

        <div className={styles.studyLabel}>
          <span className={styles.title}>
            {snapshot.title.toLowerCase()}
          </span>
        </div>
      </div>

      {actions && (
        <>
          <span className={styles.divider} aria-hidden="true" />
          <div className={styles.actions}>{actions}</div>
        </>
      )}
    </nav>
  );
}

function ArrowLeft() {
  return (
    <svg viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 5L8 12L15 19" />
    </svg>
  );
}

function ArrowRight() {
  return (
    <svg viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5L16 12L9 19" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.6"
      strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </svg>
  );
}
