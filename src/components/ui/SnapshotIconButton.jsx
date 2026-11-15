
import styles from "./SnapshotIconButton.module.css";

/**
 * Shared icon button with an accessible label
 * and a delayed tooltip.
 */
export default function SnapshotIconButton({
  label,
  onClick,
  children,
  active = false,
  disabled = false,
  className = "",
}) {
  return (
    <button
      type="button"
      className={[
        styles.button,
        active ? styles.active : "",
        className,
      ].filter(Boolean).join(" ")}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      title={label}
    >
      {children}
    </button>
  );
}
