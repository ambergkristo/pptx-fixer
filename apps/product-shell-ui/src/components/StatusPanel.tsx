import type { AuditSummary, FixResponse } from "../lib/api";

interface StatusPanelProps {
  file: File | null;
  auditStatus: "idle" | "loading" | "success" | "error";
  fixStatus: "idle" | "loading" | "success" | "error";
  auditSummary: AuditSummary | null;
  fixResponse: FixResponse | null;
  errorMessage: string | null;
}

export function StatusPanel(props: StatusPanelProps) {
  const auditReady = props.auditStatus === "success" && props.auditSummary;
  const fixReady = props.fixStatus === "success" && props.fixResponse;

  return (
    <section className="grid gap-4 md:gap-5">
      <article className="rounded-[2rem] border border-stone-300/60 bg-[rgba(255,249,241,0.86)] p-6 shadow-[0_30px_80px_rgba(104,72,53,0.12)] backdrop-blur md:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-stone-500">Audit</p>
            <h2 className="mt-3 font-['Fraunces',serif] text-3xl text-stone-900">Deck readout</h2>
          </div>
          <span className="rounded-full border border-stone-300 px-3 py-1 text-xs uppercase tracking-[0.28em] text-stone-600">
            {props.auditStatus}
          </span>
        </div>

        {auditReady ? (
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <MetricCard label="Slides" value={String(props.auditSummary.slideCount)} accent="amber" />
            <MetricCard label="Font drift" value={`${props.auditSummary.fontDrift} slides`} accent="clay" />
            <MetricCard label="Size drift" value={`${props.auditSummary.fontSizeDrift} slides`} accent="sage" />
          </div>
        ) : (
          <p className="mt-6 text-sm leading-6 text-stone-600">
            {props.auditStatus === "loading"
              ? "Scanning the uploaded deck and reading font drift signatures."
              : props.file
                ? "Upload is ready. Audit details will appear here."
                : "Upload a PPTX to generate the first audit snapshot."}
          </p>
        )}
      </article>

      <article className="rounded-[2rem] border border-stone-300/60 bg-[#1f1714] p-6 text-stone-100 shadow-[0_30px_80px_rgba(32,18,14,0.28)] md:p-7">
        <p className="text-xs uppercase tracking-[0.35em] text-stone-400">Progress</p>
        <div className="mt-5 grid gap-4">
          <ProgressRow
            label="Upload audited"
            state={props.auditStatus}
            helper="Reads deck structure without modifying the source."
          />
          <ProgressRow
            label="Cleanup run"
            state={props.fixStatus}
            helper="Executes the selected safe cleanup mode."
          />
          <ProgressRow
            label="Export prepared"
            state={fixReady ? "success" : props.fixStatus === "loading" ? "loading" : "idle"}
            helper="Produces a corrected PPTX and validation-backed report."
          />
        </div>
      </article>

      <article className="rounded-[2rem] border border-stone-300/60 bg-[rgba(255,249,241,0.86)] p-6 shadow-[0_30px_80px_rgba(104,72,53,0.12)] backdrop-blur md:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-stone-500">Fix result</p>
            <h2 className="mt-3 font-['Fraunces',serif] text-3xl text-stone-900">Output summary</h2>
          </div>
          {fixReady ? (
            <a
              className="inline-flex items-center justify-center rounded-full border border-stone-900 bg-stone-900 px-5 py-3 text-xs font-semibold uppercase tracking-[0.28em] text-[#fff4e6] transition hover:-translate-y-0.5 hover:bg-[#922f25]"
              href={props.fixResponse.downloadUrl}
            >
              Download
            </a>
          ) : null}
        </div>

        {fixReady ? (
          <div className="mt-6 grid gap-3">
            <div className="grid gap-3 md:grid-cols-3">
              <MetricCard label="Mode" value={props.fixResponse.report.mode} accent="clay" />
              <MetricCard label="Changed slides" value={String(props.fixResponse.report.changesBySlide.length)} accent="amber" />
              <MetricCard
                label="Validation"
                value={Object.values(props.fixResponse.report.validation).every(Boolean) ? "Passed" : "Failed"}
                accent="sage"
              />
            </div>

            <div className="rounded-[1.5rem] border border-stone-300 bg-white px-5 py-4">
              <dl className="grid gap-3 text-sm text-stone-700 md:grid-cols-2">
                <div className="rounded-[1.1rem] bg-stone-100 px-4 py-3">
                  <dt className="text-xs uppercase tracking-[0.28em] text-stone-500">Font family changes</dt>
                  <dd className="mt-2 text-2xl font-semibold text-stone-900">
                    {props.fixResponse.report.totals.fontFamilyChanges}
                  </dd>
                </div>
                <div className="rounded-[1.1rem] bg-stone-100 px-4 py-3">
                  <dt className="text-xs uppercase tracking-[0.28em] text-stone-500">Font size changes</dt>
                  <dd className="mt-2 text-2xl font-semibold text-stone-900">
                    {props.fixResponse.report.totals.fontSizeChanges}
                  </dd>
                </div>
              </dl>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <DeltaChip
                  label="Font drift"
                  before={props.fixResponse.report.verification.fontDriftBefore}
                  after={props.fixResponse.report.verification.fontDriftAfter}
                />
                <DeltaChip
                  label="Font size drift"
                  before={props.fixResponse.report.verification.fontSizeDriftBefore}
                  after={props.fixResponse.report.verification.fontSizeDriftAfter}
                />
              </div>
            </div>
          </div>
        ) : (
          <p className="mt-6 text-sm leading-6 text-stone-600">
            {props.fixStatus === "loading"
              ? "Generating a corrected deck and validation-backed report."
              : "Run a cleanup pass to unlock the fixed deck download and before/after summary."}
          </p>
        )}

        {props.errorMessage ? (
          <div className="mt-4 rounded-[1.4rem] border border-[#c46f57] bg-[#f8e0d7] px-4 py-3 text-sm text-[#7e261b]">
            {props.errorMessage}
          </div>
        ) : null}
      </article>
    </section>
  );
}

function MetricCard(props: { label: string; value: string; accent: "amber" | "clay" | "sage" }) {
  const accentClass =
    props.accent === "amber"
      ? "bg-[#f6d59c]/45 text-[#8d5913]"
      : props.accent === "clay"
        ? "bg-[#eac0b0]/55 text-[#8e2f1e]"
        : "bg-[#dbe4d6]/70 text-[#3c5f49]";

  return (
    <div className="rounded-[1.5rem] border border-stone-300 bg-white px-4 py-4">
      <div className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] ${accentClass}`}>
        {props.label}
      </div>
      <p className="mt-4 text-2xl font-semibold text-stone-900">{props.value}</p>
    </div>
  );
}

function ProgressRow(props: {
  label: string;
  state: "idle" | "loading" | "success" | "error";
  helper: string;
}) {
  const stateClass =
    props.state === "success"
      ? "bg-[#d4ecc5] text-[#274b1f]"
      : props.state === "loading"
        ? "bg-[#f8c88e] text-[#6d4510]"
        : props.state === "error"
          ? "bg-[#f3b3a4] text-[#6e1d15]"
          : "bg-white/10 text-stone-300";

  return (
    <div className="flex items-start gap-4 rounded-[1.4rem] border border-white/10 bg-white/5 px-4 py-4">
      <span className={`mt-1 inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] ${stateClass}`}>
        {props.state}
      </span>
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#fff4e6]">{props.label}</p>
        <p className="mt-1 text-sm leading-6 text-stone-300">{props.helper}</p>
      </div>
    </div>
  );
}

function DeltaChip(props: { label: string; before: number; after: number | null }) {
  return (
    <div className="rounded-[1.25rem] border border-stone-300 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.28em] text-stone-500">{props.label}</p>
      <p className="mt-2 text-lg font-semibold text-stone-900">
        {props.before} <span className="text-stone-400">-&gt;</span> {props.after ?? "n/a"}
      </p>
    </div>
  );
}
