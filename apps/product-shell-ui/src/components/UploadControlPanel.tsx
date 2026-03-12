import type { CleanupMode } from "../lib/api";

interface UploadControlPanelProps {
  file: File | null;
  mode: CleanupMode;
  isAuditing: boolean;
  isFixing: boolean;
  onFileChange: (file: File | null) => void;
  onModeChange: (mode: CleanupMode) => void;
  onFix: () => void;
}

export function UploadControlPanel(props: UploadControlPanelProps) {
  const busy = props.isAuditing || props.isFixing;

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-white/20 bg-[linear-gradient(145deg,rgba(98,22,17,0.97),rgba(27,18,16,0.94))] p-6 text-stone-100 shadow-[0_30px_100px_rgba(28,10,6,0.35)] md:p-8">
      <div className="absolute -right-12 top-8 h-28 w-28 rounded-full border border-white/10 bg-white/5 blur-[2px]" />
      <div className="absolute bottom-6 right-6 h-20 w-20 rounded-full bg-[#f8c88e]/10 blur-2xl" />

      <p className="text-xs uppercase tracking-[0.45em] text-stone-300">CleanDeck</p>
      <h1 className="mt-4 max-w-sm font-['Fraunces',serif] text-4xl leading-none text-[#fff4e6] md:text-5xl">
        Make messy decks feel intentional again.
      </h1>
      <p className="mt-4 max-w-md text-sm leading-6 text-stone-300 md:text-base">
        Upload a PowerPoint, run a safe cleanup pass, and get a report before anything leaves the original structure.
      </p>

      <label className="mt-8 block rounded-[1.75rem] border border-white/15 bg-white/8 p-5 backdrop-blur">
        <span className="text-xs uppercase tracking-[0.35em] text-stone-300">Upload PPTX</span>
        <div className="mt-3 flex items-center justify-between gap-4 rounded-[1.4rem] border border-dashed border-white/20 bg-black/10 px-4 py-5">
          <div>
            <p className="text-lg font-medium text-[#fff6ed]">
              {props.file ? props.file.name : "Choose a presentation"}
            </p>
            <p className="mt-1 text-sm text-stone-300">
              {props.file ? "Ready for audit and cleanup." : "Only .pptx files are supported."}
            </p>
          </div>
          <span className="rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.25em] text-stone-200">
            Browse
          </span>
        </div>
        <input
          className="sr-only"
          type="file"
          accept=".pptx"
          onChange={(event) => props.onFileChange(event.target.files?.[0] ?? null)}
        />
      </label>

      <div className="mt-6">
        <p className="text-xs uppercase tracking-[0.35em] text-stone-300">Cleanup mode</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {([
            ["minimal", "Minimal", "Font family normalization only"],
            ["standard", "Standard", "Full safe cleanup pipeline"]
          ] as const).map(([value, label, description]) => {
            const active = props.mode === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => props.onModeChange(value)}
                className={`rounded-[1.4rem] border px-4 py-4 text-left transition duration-300 ${
                  active
                    ? "border-[#f8c88e] bg-[#f8c88e] text-stone-950 shadow-[0_14px_30px_rgba(248,200,142,0.18)]"
                    : "border-white/12 bg-white/7 text-stone-100 hover:border-white/25 hover:bg-white/10"
                }`}
              >
                <p className="font-semibold uppercase tracking-[0.2em]">{label}</p>
                <p className={`mt-2 text-sm leading-5 ${active ? "text-stone-800" : "text-stone-300"}`}>
                  {description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        disabled={!props.file || busy}
        onClick={props.onFix}
        className="mt-8 inline-flex w-full items-center justify-center rounded-full bg-[#fff4e6] px-6 py-4 text-sm font-semibold uppercase tracking-[0.3em] text-stone-950 transition duration-300 hover:-translate-y-0.5 hover:bg-[#f8c88e] disabled:cursor-not-allowed disabled:bg-stone-500/40 disabled:text-stone-300"
      >
        {props.isFixing ? "Running cleanup" : "Fix deck"}
      </button>
    </section>
  );
}
