import { RotateCcw } from "lucide-react";
import styles from "./ResetButton.module.css";

export default function ResetButton({
  onClick,
  disabled = false,
  label = "start again",
  className = "",
}) {
  return (
    <button
      type="button"
      className={`${styles.resetButton} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      <RotateCcw size={14} strokeWidth={1.8} aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}