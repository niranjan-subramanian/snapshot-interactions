/**
 * SENTENCE CHECKLIST STUDY
 *
 * Converts an editable sentence and parses into interactive
 * checklist items with completion animations.
 */

import { useLayoutEffect, useRef, useState, useEffect } from "react";
import styles from "./SentenceChecklist.module.css";
import ResetButton from "../../components/ui/ResetButton";
import { useSnapshotActions } from "../../components/SnapshotActionsContext";

const EXIT_DURATION = 260;
const MAX_TASKS = 5;
const MAX_CHARACTERS = 200;

// Splits the input into sentance tasks while preserving punctuation
function parseSentence(value) {
    const matches = [...value.matchAll(/([^.!?]+)([.!?]+|$)/g)];

    return matches
        .map((match) => ({
            text: match[1].trim(),
            punctuation: match[2],
        }))
        .filter((part) => part.text.length > 0);
}

// Checks both the character limit and the max number of tasks
function isWithinLimits(value) {
    if (value.length > MAX_CHARACTERS) {
        return false;
    }

    const taskCount = parseSentence(value).length;
    return taskCount <= MAX_TASKS;
}

export default function SentenceChecklist() {
    const [text, setText] = useState("");
    const [tasks, setTasks] = useState([]);
    const [completed, setCompleted] = useState([]);
    const [phase, setPhase] = useState("editing");

    const editorRef = useRef(null);
    const contentRef = useRef(null);
    const wrapperRef = useRef(null);
    const resetTimerRef = useRef(null);

    const canGenerate = text.trim().length > 0;
    const generated = phase === "generated";
    const exiting = phase === "exiting";

    const { setActions } = useSnapshotActions();

    useEffect(() => {
    setActions([
        {
        id: "reset",
        label: "Reset checklist",
        icon: <ResetIcon />,
        onClick: resetChecklist,
        disabled: phase !== "generated",
        },
    ]);

    return () => setActions([]);
    }, [phase, setActions]);

    // Keeps outer wrapper at the content height for smooth layout transitions
    useLayoutEffect(() => {
        const wrapper = wrapperRef.current;
        const content = contentRef.current;

        if (!wrapper || !content) return;

        const updateHeight = () => {
            wrapper.style.height = `${content.getBoundingClientRect().height}px`;
        };

        updateHeight();

        const observer = new ResizeObserver(updateHeight);
        observer.observe(content);

        return () => observer.disconnect();
    }, [phase]);

    // Syncs editable text to rwact state
    function handleInput(event) {
        const editor = event.currentTarget;
        const nextText = editor.textContent ?? "";

        if (!isWithinLimits(nextText)) {
            editor.textContent = text;

            // Restore the caret to the end after rejecting input
            const selection = window.getSelection();
            const range = document.createRange();

            range.selectNodeContents(editor);
            range.collapse(false);

            selection?.removeAllRanges();
            selection?.addRange(range);

            return;
        }

        setText(nextText);
    }

    // Predicts next text before insertion so an invalid input can be blocked
    function handleBeforeInput(event) {
        const inputEvent = event.nativeEvent;
        const inputType = inputEvent?.inputType ?? "";

        if (inputEvent?.isComposing) return;

        if (
            inputType.startsWith("delete") ||
            inputType.startsWith("history")
        ) {
            return;
        }

        if (inputType === "insertFromPaste") {
            event.preventDefault();
            return;
        }



        const editor = editorRef.current;
        const selection = window.getSelection();

        if (!editor || !selection || selection.rangeCount === 0) {
            return;
        }

        const range = selection.getRangeAt(0);

        if (!editor.contains(range.commonAncestorContainer)) {
            return;
        }

        const beforeRange = range.cloneRange();
        beforeRange.selectNodeContents(editor);
        beforeRange.setEnd(range.startContainer, range.startOffset);

        const afterRange = range.cloneRange();
        afterRange.selectNodeContents(editor);
        afterRange.setStart(range.endContainer, range.endOffset);

        const nextText =
            beforeRange.toString() +
            (inputEvent.data ?? "") +
            afterRange.toString();

        if (!isWithinLimits(nextText)) {
            event.preventDefault();
        }
    }

    // Inserts as much pasted clipboard content as the limits allow.
    function handlePaste(event) {
        event.preventDefault();

        const editor = editorRef.current;
        const selection = window.getSelection();

        if (!editor || !selection || selection.rangeCount === 0) {
            return;
        }

        const range = selection.getRangeAt(0);

        if (!editor.contains(range.commonAncestorContainer)) {
            return;
        }

        const pastedText = event.clipboardData
            .getData("text/plain")
            .replace(/\s+/g, " ");

        const beforeRange = range.cloneRange();
        beforeRange.selectNodeContents(editor);
        beforeRange.setEnd(range.startContainer, range.startOffset);

        const afterRange = range.cloneRange();
        afterRange.selectNodeContents(editor);
        afterRange.setStart(range.endContainer, range.endOffset);

        const before = beforeRange.toString();
        const after = afterRange.toString();

        let acceptedText = "";

        for (const character of pastedText) {
            const candidate = before + acceptedText + character + after;

            if (!isWithinLimits(candidate)) break;

            acceptedText += character;
        }

        range.deleteContents();

        if (acceptedText) {
            const node = document.createTextNode(acceptedText);
            range.insertNode(node);
            range.setStartAfter(node);
        }

        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);

        setText(editor.textContent ?? "");
    }

    // Converts the sentences into checklist items and transitions to the generated phase
    function generateChecklist() {
        if (!canGenerate || phase !== "editing") return;

        const parsed = parseSentence(text);
        if (!parsed.length) return;

        setTasks(parsed);
        setCompleted([]);
        setPhase("generated");
    }

    // Handles pressing the Enter key to generate the checklist
    function handleKeyDown(event) {
        if (event.key === "Enter") {
            event.preventDefault();
            generateChecklist();
        }
    }

    //  Toggles the completion state of a task and updates the corresponding sentence part
    function toggleTask(index) {
        setCompleted((previous) =>
            previous.includes(index)
                ? previous.filter((item) => item !== index)
                : [...previous, index]
        );
    }

    //  Resets the checklist and transitions back to the editing phase
    function resetChecklist() {
        if (exiting) return;

        setPhase("exiting");

        resetTimerRef.current = window.setTimeout(() => {
            setText("");
            setTasks([]);
            setCompleted([]);
            setPhase("editing");
        }, EXIT_DURATION);
    }

    //  Clears the reset timer when the component unmounts to prevent memory leaks
    useLayoutEffect(() => {
        return () => {
            if (resetTimerRef.current) {
                window.clearTimeout(resetTimerRef.current);
            }
        };
    }, []);

    return (
        <div className={styles.root}>
            <div ref={wrapperRef} className={styles.heightWrapper}>
                <div ref={contentRef} className={styles.content}>
                    {phase === "editing" ? (
                        <div className={styles.editor}>
                            <div
                                className={styles.inputLine}
                                onClick={(event) => {
                                    if (event.target.closest("button")) return;
                                    editorRef.current?.focus();
                                }}
                            >
                                {!canGenerate && (
                                    <span
                                        className={styles.placeholder}
                                        aria-hidden="true"
                                    >
                                        Start typing your checklist...
                                    </span>
                                )}

                                <span
                                    ref={editorRef}
                                    className={styles.editable}
                                    contentEditable
                                    role="textbox"
                                    aria-label="Write your checklist"
                                    aria-multiline="false"
                                    suppressContentEditableWarning
                                    spellCheck={false}
                                    onInput={handleInput}
                                    onBeforeInput={handleBeforeInput}
                                    onPaste={handlePaste}
                                    onKeyDown={handleKeyDown}
                                />

                                {canGenerate && (
                                    <button
                                        type="button"
                                        className={styles.enterHint}
                                        onClick={generateChecklist}
                                        aria-label="Generate checklist"
                                    >
                                        enter <span aria-hidden="true">↵</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div
                            className={`${styles.generated} ${
                                exiting ? styles.exiting : ""
                            }`}
                        >
                            <div className={styles.sentence}>
                                {tasks.map((task, index) => (
                                    <span
                                        key={index}
                                        className={`${styles.sentencePart} ${
                                            completed.includes(index)
                                                ? styles.sentencePartComplete
                                                : ""
                                        }`}
                                    >
                                        {task.text}
                                        {task.punctuation}
                                        {index < tasks.length - 1 ? " " : ""}
                                    </span>
                                ))}
                            </div>

                            <div className={styles.taskList}>
                                {tasks.map((task, index) => {
                                    const isCompleted = completed.includes(index);

                                    return (
                                        <button
                                            key={index}
                                            type="button"
                                            className={`${styles.taskCard} ${
                                                isCompleted ? styles.taskCompleted : ""
                                            }`}
                                            style={{
                                                "--card-index": index,
                                            }}
                                            onClick={() => toggleTask(index)}
                                            aria-pressed={isCompleted}
                                        >
                                            <span
                                                className={`${styles.checkbox} ${
                                                    isCompleted ? styles.checked : ""
                                                }`}
                                            >
                                                <svg
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2.3"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    aria-hidden="true"
                                                >
                                                    <path d="M5 12L10 17L19 7" />
                                                </svg>
                                            </span>

                                            <span className={styles.taskText}>
                                                {task.text}
                                                <span
                                                    className={`${styles.strike} ${
                                                        isCompleted
                                                            ? styles.strikeVisible
                                                            : ""
                                                    }`}
                                                />
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function ResetIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 11a9 9 0 1 1 2.6 6.4" />
      <path d="M3 4v7h7" />
    </svg>
  );
}
