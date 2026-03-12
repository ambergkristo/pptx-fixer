import type { CleanupMode } from "../lib/api";

interface UploadControlPanelProps {
  file: File | null;
  mode: CleanupMode;
  isAuditing: boolean;
  isFixing: boolean;
  canRunFix: boolean;
  onFileChange: (file: File | null) => void;
  onModeChange: (mode: CleanupMode) => void;
  onFix: () => void;
}

export function UploadControlPanel(props: UploadControlPanelProps) {
  return (
    <section className="flex h-full flex-col gap-4 rounded-[22px] border border-[#2a2a33] bg-[#141418] p-4 shadow-[0_18px_48px_rgba(0,0,0,0.24)]">
      <div className="rounded-[18px] border border-[#2a2a33] bg-[#1b1b21] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#8d8d9a]">Upload</p>
            <h1 className="mt-2 text-xl font-semibold text-[#f3f3f1]">Choose a deck</h1>
          </div>
          <span className="rounded-full border border-[#2a2a33] bg-[#131319] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#9be7b0]">
            PPTX only
          </span>
        </div>

        <label className="mt-4 block cursor-pointer rounded-[16px] border border-[#2f313b] bg-[#121218] px-4 py-4 transition hover:border-[#4a4d5b]">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-[#f3f3f1]">
                {props.file ? props.file.name : "Select presentation"}
              </p>
              <p className="mt-1 text-xs leading-5 text-[#9d9dad]">
                {props.file ? "Automatic audit runs after file selection." : "Choose a PPTX from your computer."}
              </p>
            </div>
            <span className="rounded-[10px] border border-[#3a3f48] bg-[#1b1d24] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#d7c4a1]">
              Choose file
            </span>
          </div>
          <input
            className="sr-only"
            type="file"
            accept=".pptx"
            onChange={(event) => props.onFileChange(event.target.files?.[0] ?? null)}
          />
        </label>
      </div>

      <div className="rounded-[18px] border border-[#2a2a33] bg-[#1b1b21] p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#8d8d9a]">Cleanup mode</p>
            <p className="mt-1 text-xs leading-5 text-[#9d9dad]">Minimal keeps size drift intact. Standard runs the full safe pipeline.</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
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
                className={`rounded-[14px] border px-3 py-3 text-left transition ${
                  active
                    ? "border-[#9be7b0]/70 bg-[#152019] text-[#f3f3f1]"
                    : "border-[#2f313b] bg-[#14151b] text-[#c8c8d1] hover:border-[#494c58]"
                }`}
              >
                <p className="text-sm font-semibold uppercase tracking-[0.14em]">{label}</p>
                <p className={`mt-1 text-xs ${active ? "text-[#9be7b0]" : "text-[#8f90a0]"}`}>{description}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-[18px] border border-[#2a2a33] bg-[#1b1b21] p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#8d8d9a]">Action</p>
        <p className="mt-1 text-xs leading-5 text-[#9d9dad]">
          Fix runs only after audit succeeds. The original file stays untouched.
        </p>

        <button
          type="button"
          disabled={!props.canRunFix}
          onClick={props.onFix}
          className="mt-4 inline-flex w-full items-center justify-center rounded-[14px] bg-[#9be7b0] px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-[#0f1510] transition hover:bg-[#b1efc2] disabled:cursor-not-allowed disabled:bg-[#2b2e37] disabled:text-[#747684]"
        >
          {props.isFixing ? "Applying cleanup" : props.isAuditing ? "Waiting for audit" : "Fix deck"}
        </button>
      </div>
    </section>
  );
}
