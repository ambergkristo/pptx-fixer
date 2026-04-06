import { useRef, useState, type DragEvent, type KeyboardEvent } from "react";

import type { CleanupMode } from "../lib/api";

interface UploadControlPanelProps {
  file: File | null;
  mode: CleanupMode;
  statusText: string;
  statusTone: "neutral" | "success" | "warning" | "danger";
  errorMessage: string | null;
  isAuditing: boolean;
  isFixing: boolean;
  canRunFix: boolean;
  fixedPptxAction: {
    state: "hidden" | "ready" | "blocked";
    href: string | null;
    fileName: string | null;
    message: string | null;
  };
  onFileChange: (file: File | null) => void;
  onInvalidFile: (message: string) => void;
  onModeChange: (mode: CleanupMode) => void;
  onFix: () => void;
}

export function UploadControlPanel(props: UploadControlPanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const primaryActionClassName =
    "inline-flex h-9 items-center justify-center rounded-[10px] bg-[var(--accent-mint)] px-3.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0a0b0d] [font-family:'IBM_Plex_Sans',sans-serif] no-underline transition hover:bg-[#b4efc3] disabled:cursor-not-allowed disabled:bg-[var(--surface-chip)] disabled:text-[var(--text-dim)]";

  function openPicker() {
    inputRef.current?.click();
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setIsDragActive(true);
  }

  function handleDragEnter(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragActive(true);
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
      return;
    }

    setIsDragActive(false);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragActive(false);

    const droppedFiles = Array.from(event.dataTransfer.files);
    if (droppedFiles.length === 0) {
      return;
    }

    const file = droppedFiles[0];
    if (!/\.pptx$/i.test(file.name)) {
      props.onInvalidFile("Drop a valid .pptx file.");
      return;
    }

    props.onFileChange(file);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    openPicker();
  }

  function handleFixedPptxDownload() {
    if (props.fixedPptxAction.href == null) {
      return;
    }

    window.location.assign(props.fixedPptxAction.href);
  }

  const statusToneClass =
    props.statusTone === "success"
      ? "text-[var(--accent-mint)]"
      : props.statusTone === "warning"
        ? "text-[var(--accent-amber)]"
        : props.statusTone === "danger"
          ? "text-[var(--accent-rose)]"
          : "text-[var(--text-soft)]";
  const blockedFixedPptxActionClass =
    props.fixedPptxAction.state === "ready"
      ? primaryActionClassName
      : "border border-[rgba(217,107,107,0.36)] bg-[rgba(217,107,107,0.14)] text-[var(--accent-rose)]";

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-[16px] border border-[var(--line-strong)] bg-[var(--surface-panel)] p-3 shadow-[0_18px_40px_rgba(0,0,0,0.24)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--text-dim)]">Input</p>
          <h1 className="mt-1.5 text-[16px] font-semibold text-[var(--text-strong)]">Safe cleanup</h1>
          <p className="mt-1 text-[12px] leading-5 text-[var(--text-soft)]">
            Upload one PPTX, pick a safe cleanup mode, then repair obvious formatting drift.
          </p>
        </div>
        <span className="rounded-full border border-[var(--line-soft)] bg-[var(--surface-press)] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-[var(--accent-mint)]">
          PPTX
        </span>
      </div>

      <div
        role="button"
        tabIndex={0}
        className={`mt-3 flex h-[136px] min-h-[136px] cursor-pointer flex-col justify-between overflow-hidden rounded-[14px] border px-3 py-3 outline-none transition ${
          isDragActive
            ? "border-[var(--accent-mint)] bg-[rgba(155,231,176,0.08)] shadow-[inset_0_0_0_1px_rgba(155,231,176,0.2)]"
            : "border-[var(--line-soft)] bg-[var(--surface-press)] hover:border-[var(--line-focus)]"
        }`}
        onClick={openPicker}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onKeyDown={handleKeyDown}
      >
        <div className="min-w-0 space-y-1.5 overflow-hidden">
          <p className="truncate text-[13px] font-medium text-[var(--text-primary)]" title={props.file?.name}>
            {props.file ? props.file.name : "Drop PPTX here"}
          </p>
          <p className="max-h-[40px] overflow-hidden text-[12px] leading-5 text-[var(--text-soft)]">
            {props.file
              ? "Automatic audit runs after file selection."
              : "Drag a presentation onto this surface or open the file picker."}
          </p>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-[10px] uppercase tracking-[0.2em] text-[var(--text-dim)]">
            {props.file ? "File ready" : "Single deck"}
          </span>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              openPicker();
            }}
            className="inline-flex h-8 items-center justify-center rounded-[10px] border border-[var(--line-focus)] bg-[var(--surface-chip)] px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-sand)] transition hover:border-[var(--accent-sand)] hover:text-[var(--text-primary)]"
          >
            Choose file
          </button>
        </div>

        <input
          ref={inputRef}
          className="sr-only"
          type="file"
          accept=".pptx"
          onChange={(event) => {
            props.onFileChange(event.target.files?.[0] ?? null);
            event.currentTarget.value = "";
          }}
        />
      </div>

      <div className="mt-3 shrink-0 rounded-[14px] border border-[var(--line-strong)] bg-[var(--surface-press)] p-2.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--text-dim)]">Safe cleanup mode</p>
          <span className="text-[9px] uppercase tracking-[0.18em] text-[var(--text-dim)]">
            {props.mode === "minimal" ? "Fonts only" : "Fonts + size"}
          </span>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-1.5">
          {([
            ["minimal", "Minimal", "Fonts only"],
            ["standard", "Standard", "Fonts + size"]
          ] as const).map(([value, label, description]) => {
            const active = props.mode === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => props.onModeChange(value)}
                className={`rounded-[11px] border px-2.5 py-2 text-left transition ${
                  active
                    ? "border-[rgba(155,231,176,0.6)] bg-[rgba(155,231,176,0.08)] text-[var(--text-primary)]"
                    : "border-[var(--line-soft)] bg-[var(--surface-panel)] text-[var(--text-soft)] hover:border-[var(--line-focus)]"
                }`}
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em]">{label}</p>
                <p className={`mt-0.5 text-[10px] ${active ? "text-[var(--accent-mint)]" : "text-[var(--text-dim)]"}`}>{description}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3 shrink-0 border-t border-[var(--line-strong)] pt-2.5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-dim)]">Run safe cleanup</p>
            <p className="mt-0.5 truncate text-[11px] text-[var(--text-dim)]">Original file stays untouched.</p>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap gap-2">
          {props.fixedPptxAction.state !== "ready" ? (
            <button
              type="button"
              disabled={!props.canRunFix}
              onClick={props.onFix}
              className={primaryActionClassName}
            >
              {props.isFixing ? "Applying" : props.isAuditing ? "Auditing" : "Run safe cleanup"}
            </button>
          ) : null}

          {props.fixedPptxAction.state === "ready" && props.fixedPptxAction.href ? (
            <button
              type="button"
              data-fixed-pptx-action="ready"
              onClick={handleFixedPptxDownload}
              className={primaryActionClassName}
            >
              Download fixed PPTX
            </button>
          ) : null}

          {props.fixedPptxAction.state === "blocked" ? (
            <button
              type="button"
              disabled
              data-fixed-pptx-action="blocked"
              className={`inline-flex h-9 cursor-not-allowed items-center justify-center rounded-[10px] px-3.5 text-[11px] font-semibold uppercase tracking-[0.16em] ${blockedFixedPptxActionClass}`}
            >
              Fixed PPTX unavailable
            </button>
          ) : null}
        </div>

        <p className={`mt-2 min-h-[18px] truncate whitespace-nowrap text-[11px] ${statusToneClass}`} title={props.statusText}>
          {props.statusText}
        </p>

        {props.fixedPptxAction.message ? (
          <p
            data-fixed-pptx-message={props.fixedPptxAction.state}
            className={`mt-1 truncate whitespace-nowrap text-[11px] ${
              props.fixedPptxAction.state === "blocked" ? "text-[var(--accent-rose)]" : "text-[var(--accent-mint)]"
            }`}
            title={props.fixedPptxAction.message}
          >
            {props.fixedPptxAction.message}
          </p>
        ) : null}

        {props.fixedPptxAction.state === "ready" && props.fixedPptxAction.fileName ? (
          <p className="mt-1 truncate whitespace-nowrap text-[10px] text-[var(--text-dim)]" title={props.fixedPptxAction.fileName}>
            {props.fixedPptxAction.fileName}
          </p>
        ) : null}

        {props.errorMessage ? (
          <p className="mt-1 truncate whitespace-nowrap text-[11px] text-[var(--accent-rose)]" title={props.errorMessage}>
            {props.errorMessage}
          </p>
        ) : null}
      </div>
    </section>
  );
}
