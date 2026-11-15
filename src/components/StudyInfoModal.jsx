
import { useEffect, useRef } from "react";
import styles from "./StudyInfoModal.module.css";

export default function StudyInfoModal({
  study,
  isOpen,
  onClose,
}) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  function handleBackdropClick(event) {
    if (event.target === dialogRef.current) {
      onClose();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className={styles.modal}
      onClick={handleBackdropClick}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      aria-labelledby="study-info-title"
    >
      <button
        type="button"
        className={styles.closeButton}
        onClick={onClose}
        aria-label="Close study information"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        >
          <path d="M6 6L18 18M18 6L6 18" />
        </svg>
      </button>

      <div className={styles.content}>

        <h2
          id="study-info-title"
          className={styles.title}
        >
          {study.title}
        </h2>

        <p className={styles.description}>
          {study.description}
        </p>
      </div>
    </dialog>
  );
}
