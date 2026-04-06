import { useRef, useState, type DragEvent, type KeyboardEvent } from "react";

import type { CleanupMode } from "../lib/api";
import {
  BRAND_PRESET_OPTIONS,
  TEMPLATE_FOOTER_STYLE_OPTIONS,
  TEMPLATE_LOGO_POSITION_OPTIONS,
  type NormalizeTypographySource,
  type TemplateFooterStyle,
  type TemplateLogoPosition,
  type TemplateSourceKind,
  TEMPLATE_SOURCE_OPTIONS
} from "../lib/brandPresets";

interface UploadControlPanelProps {
  file: File | null;
  mode: CleanupMode;
  normalizeTypographySource: NormalizeTypographySource;
  normalizeBrandPresetId: string;
  normalizeBrandFontFamily: string;
  templateSourceKind: TemplateSourceKind;
  templateFile: File | null;
  templateBrandPresetId: string;
  templateLogoPosition: TemplateLogoPosition;
  templateFooterStyle: TemplateFooterStyle;
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
  onNormalizeTypographySourceChange: (value: NormalizeTypographySource) => void;
  onNormalizeBrandPresetIdChange: (value: string) => void;
  onNormalizeBrandFontFamilyChange: (value: string) => void;
  onTemplateSourceKindChange: (value: TemplateSourceKind) => void;
  onTemplateFileChange: (file: File | null) => void;
  onTemplateBrandPresetIdChange: (value: string) => void;
  onTemplateLogoPositionChange: (value: TemplateLogoPosition) => void;
  onTemplateFooterStyleChange: (value: TemplateFooterStyle) => void;
  onFix: () => void;
}

export function UploadControlPanel(props: UploadControlPanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const templateInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const primaryActionClassName =
    "inline-flex h-9 items-center justify-center rounded-[10px] bg-[var(--accent-mint)] px-3.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0a0b0d] [font-family:'IBM_Plex_Sans',sans-serif] no-underline transition hover:bg-[#b4efc3] disabled:cursor-not-allowed disabled:bg-[var(--surface-chip)] disabled:text-[var(--text-dim)]";

  function openPicker() {
    inputRef.current?.click();
  }

  function openTemplatePicker() {
    templateInputRef.current?.click();
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
          <h1 className="mt-1.5 text-[16px] font-semibold text-[var(--text-strong)]">Repair deck</h1>
          <p className="mt-1 text-[12px] leading-5 text-[var(--text-soft)]">
            Upload one PPTX, choose a repair mode, then clean up or normalize the deck.
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
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--text-dim)]">Repair mode</p>
          <span className="text-[9px] uppercase tracking-[0.18em] text-[var(--text-dim)]">
            {props.mode === "minimal"
              ? "Fonts only"
              : props.mode === "normalize"
                ? "Role-based type"
                : props.mode === "template"
                  ? "Brand shell"
                  : "Safe cleanup"}
          </span>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-1.5">
          {([
            ["minimal", "Minimal", "Fonts only"],
            ["standard", "Cleanup", "Safe drift repair"],
            ["normalize", "Normalize", "Role-based type"],
            ["template", "Template", "Preset brand shell"]
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

        {props.mode === "normalize" ? (
          <div className="mt-2.5 rounded-[11px] border border-[var(--line-soft)] bg-[var(--surface-panel)] p-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-dim)]">
                Typography source
              </span>
              <span className="text-[9px] uppercase tracking-[0.16em] text-[var(--text-dim)]">
                Normalize only
              </span>
            </div>

            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {([
                ["auto", "Auto", "Use role dominant font"],
                ["preset", "Preset", "Apply a brand preset"],
                ["custom", "Custom", "Use one font family"]
              ] as const).map(([value, label, description]) => {
                const active = props.normalizeTypographySource === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => props.onNormalizeTypographySourceChange(value)}
                    className={`rounded-[11px] border px-2.5 py-2 text-left transition ${
                      active
                        ? "border-[rgba(155,231,176,0.6)] bg-[rgba(155,231,176,0.08)] text-[var(--text-primary)]"
                        : "border-[var(--line-soft)] bg-[var(--surface-press)] text-[var(--text-soft)] hover:border-[var(--line-focus)]"
                    }`}
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em]">{label}</p>
                    <p className={`mt-0.5 text-[10px] ${active ? "text-[var(--accent-mint)]" : "text-[var(--text-dim)]"}`}>{description}</p>
                  </button>
                );
              })}
            </div>

            {props.normalizeTypographySource === "preset" ? (
              <label className="mt-2 block">
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-dim)]">
                  Brand preset
                </span>
                <select
                  value={props.normalizeBrandPresetId}
                  onChange={(event) => props.onNormalizeBrandPresetIdChange(event.target.value)}
                  className="mt-1.5 h-9 w-full rounded-[10px] border border-[var(--line-soft)] bg-[var(--surface-press)] px-3 text-[12px] text-[var(--text-primary)] outline-none transition focus:border-[var(--line-focus)]"
                >
                  {BRAND_PRESET_OPTIONS.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 text-[10px] leading-4 text-[var(--text-dim)]">
                  {BRAND_PRESET_OPTIONS.find((preset) => preset.id === props.normalizeBrandPresetId)?.description ??
                    "Preset-driven normalization keeps deck hierarchy but swaps the dominant font system."}
                </p>
              </label>
            ) : null}

            {props.normalizeTypographySource === "custom" ? (
              <label className="mt-2 block">
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-dim)]">
                  Custom font
                </span>
                <input
                  type="text"
                  value={props.normalizeBrandFontFamily}
                  onChange={(event) => props.onNormalizeBrandFontFamilyChange(event.target.value)}
                  placeholder="For example IBM Plex Sans"
                  className="mt-1.5 h-9 w-full rounded-[10px] border border-[var(--line-soft)] bg-[var(--surface-press)] px-3 text-[12px] text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-dim)] focus:border-[var(--line-focus)]"
                />
                <p className="mt-1.5 text-[10px] leading-4 text-[var(--text-dim)]">
                  Custom font overrides the deck&apos;s detected role font family.
                </p>
              </label>
            ) : null}

            {props.normalizeTypographySource === "auto" ? (
              <p className="mt-2 text-[10px] leading-4 text-[var(--text-dim)]">
                Auto keeps the deck&apos;s dominant font family per detected role and only closes inconsistent peers.
              </p>
            ) : null}
          </div>
        ) : null}

        {props.mode === "template" ? (
          <div className="mt-2.5 rounded-[11px] border border-[var(--line-soft)] bg-[var(--surface-panel)] p-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-dim)]">
                Template shell
              </span>
              <span className="text-[9px] uppercase tracking-[0.16em] text-[var(--text-dim)]">
                {props.templateSourceKind === "upload" ? "Template derived" : "Preset driven"}
              </span>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {TEMPLATE_SOURCE_OPTIONS.map((option) => {
                const active = props.templateSourceKind === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => props.onTemplateSourceKindChange(option.value)}
                    className={`rounded-[11px] border px-2.5 py-2 text-left transition ${
                      active
                        ? "border-[rgba(155,231,176,0.6)] bg-[rgba(155,231,176,0.08)] text-[var(--text-primary)]"
                        : "border-[var(--line-soft)] bg-[var(--surface-press)] text-[var(--text-soft)] hover:border-[var(--line-focus)]"
                    }`}
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em]">{option.label}</p>
                    <p className={`mt-0.5 text-[10px] ${active ? "text-[var(--accent-mint)]" : "text-[var(--text-dim)]"}`}>{option.description}</p>
                  </button>
                );
              })}
            </div>

            {props.templateSourceKind === "preset" ? (
              <label className="mt-2 block">
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-dim)]">
                  Brand preset
                </span>
                <select
                  value={props.templateBrandPresetId}
                  onChange={(event) => props.onTemplateBrandPresetIdChange(event.target.value)}
                  className="mt-1.5 h-9 w-full rounded-[10px] border border-[var(--line-soft)] bg-[var(--surface-press)] px-3 text-[12px] text-[var(--text-primary)] outline-none transition focus:border-[var(--line-focus)]"
                >
                  {BRAND_PRESET_OPTIONS.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 text-[10px] leading-4 text-[var(--text-dim)]">
                  {BRAND_PRESET_OPTIONS.find((preset) => preset.id === props.templateBrandPresetId)?.description ??
                    "Template mode uses a preset font system and a light brand shell."}
                </p>
              </label>
            ) : (
              <div className="mt-2 rounded-[10px] border border-[var(--line-soft)] bg-[var(--surface-press)] p-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-medium text-[var(--text-primary)]" title={props.templateFile?.name ?? undefined}>
                      {props.templateFile?.name ?? "No template selected"}
                    </p>
                    <p className="mt-0.5 text-[10px] leading-4 text-[var(--text-dim)]">
                      Upload a PPTX template. CleanDeck will derive only safe shell signals from it.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={openTemplatePicker}
                    className="inline-flex h-8 items-center justify-center rounded-[10px] border border-[var(--line-focus)] bg-[var(--surface-chip)] px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-sand)] transition hover:border-[var(--accent-sand)] hover:text-[var(--text-primary)]"
                  >
                    Choose
                  </button>
                </div>
                <input
                  ref={templateInputRef}
                  className="sr-only"
                  type="file"
                  accept=".pptx"
                  onChange={(event) => {
                    const templateFile = event.target.files?.[0] ?? null;
                    if (templateFile && !/\.pptx$/i.test(templateFile.name)) {
                      props.onInvalidFile("Choose a valid .pptx template file.");
                      return;
                    }

                    props.onTemplateFileChange(templateFile);
                    event.currentTarget.value = "";
                  }}
                />
              </div>
            )}

            <div className="mt-2 grid grid-cols-2 gap-2">
              <label className="block">
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-dim)]">
                  Brand mark
                </span>
                <select
                  value={props.templateLogoPosition}
                  onChange={(event) => props.onTemplateLogoPositionChange(event.target.value as TemplateLogoPosition)}
                  className="mt-1.5 h-9 w-full rounded-[10px] border border-[var(--line-soft)] bg-[var(--surface-press)] px-3 text-[12px] text-[var(--text-primary)] outline-none transition focus:border-[var(--line-focus)]"
                >
                  {TEMPLATE_LOGO_POSITION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-dim)]">
                  Footer
                </span>
                <select
                  value={props.templateFooterStyle}
                  onChange={(event) => props.onTemplateFooterStyleChange(event.target.value as TemplateFooterStyle)}
                  className="mt-1.5 h-9 w-full rounded-[10px] border border-[var(--line-soft)] bg-[var(--surface-press)] px-3 text-[12px] text-[var(--text-primary)] outline-none transition focus:border-[var(--line-focus)]"
                >
                  {TEMPLATE_FOOTER_STYLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <p className="mt-2 text-[10px] leading-4 text-[var(--text-dim)]">
              Template mode keeps cleanup and normalization guardrails, then adds a light brand mark and optional footer shell from the selected source.
            </p>
          </div>
        ) : null}
      </div>

      <div className="mt-3 shrink-0 border-t border-[var(--line-strong)] pt-2.5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-dim)]">Run repair</p>
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
              {props.isFixing
                ? props.mode === "normalize"
                  ? "Normalizing"
                  : props.mode === "template"
                    ? "Applying"
                  : "Applying"
                : props.isAuditing
                  ? "Auditing"
                  : props.mode === "minimal"
                    ? "Run minimal"
                    : props.mode === "normalize"
                      ? "Normalize deck"
                      : props.mode === "template"
                        ? "Apply template"
                      : "Run cleanup"}
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
