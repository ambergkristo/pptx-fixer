import React from "react";

import type { UploadResultViewModel } from "../lib/uploadResultViewModel.ts";

interface UploadResultScreenProps {
  viewModel: UploadResultViewModel;
}

type UploadResultSection = UploadResultViewModel["sections"][number];
type SectionExpansionState = Record<string, boolean>;

const STATUS_TOKENS = {
  good: {
    indicatorClassName: "bg-[var(--accent-mint)]",
    labelClassName: "text-[var(--accent-mint)]"
  },
  warning: {
    indicatorClassName: "bg-[var(--accent-amber)]",
    labelClassName: "text-[var(--accent-amber)]"
  },
  bad: {
    indicatorClassName: "bg-[var(--accent-rose)]",
    labelClassName: "text-[var(--accent-rose)]"
  }
} as const;

export function buildInitialSectionExpansionState(sections: UploadResultSection[]): SectionExpansionState {
  if (sections.length === 0) {
    return {};
  }

  const expandedSections = Object.fromEntries(
    sections.map((section) => [section.sectionKey, section.sectionStatus !== "good"])
  );
  const hasExpandedSection = Object.values(expandedSections).some(Boolean);

  if (hasExpandedSection) {
    return expandedSections;
  }

  return {
    ...expandedSections,
    [sections[0].sectionKey]: true
  };
}

export function toggleSectionExpansion(
  expandedSections: SectionExpansionState,
  sectionKey: UploadResultSection["sectionKey"]
): SectionExpansionState {
  const isExpanded = expandedSections[sectionKey] ?? true;

  return {
    ...expandedSections,
    [sectionKey]: !isExpanded
  };
}

export function UploadResultScreen(props: UploadResultScreenProps) {
  const readiness = props.viewModel.readinessSignal;
  const categoryRows = props.viewModel.categorySummary?.rows ?? [];
  const summaryLine = summarizeCompactResult(props.viewModel);

  return React.createElement(
    "section",
    {
      className: "mt-2 rounded-[12px] border border-[var(--line-strong)] bg-[var(--surface-panel)] px-3 py-3"
    },
    React.createElement(
      "div",
      {
        "data-result-layout-frame": "true",
        className: "flex w-full min-w-0 flex-col"
      },
      React.createElement(
        "div",
        {
          className: "flex items-start justify-between gap-3"
        },
        React.createElement(
          "div",
          {
            className: "min-w-0"
          },
          React.createElement(
            "p",
            {
              className: "text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--text-dim)]"
            },
            "Cleanup result"
          ),
          React.createElement(
            "h3",
            {
              className: "mt-1 text-[14px] font-semibold leading-[1.3] text-[var(--text-strong)]"
            },
            props.viewModel.headline
          )
        ),
        readiness
          ? renderStatusBadge(readiness.signalStatus, readiness.label)
          : renderStatusBadge(
              props.viewModel.overallStatus === "success"
                ? "good"
                : props.viewModel.overallStatus === "warning"
                ? "warning"
                : "bad",
              props.viewModel.overallStatus === "success"
                ? "Ready"
                : props.viewModel.overallStatus === "warning"
                ? "Warning"
                : "Failed"
            )
      ),
      categoryRows.length > 0
        ? React.createElement(
            "article",
            {
              "data-category-summary": "true",
              className: "mt-3 overflow-hidden rounded-[10px] border border-[var(--line-strong)]"
            },
            React.createElement(
              "table",
              {
                className: "w-full table-fixed border-collapse text-left"
              },
              React.createElement(
                "thead",
                null,
                React.createElement(
                  "tr",
                  {
                    className: "bg-[var(--surface-press)]"
                  },
                  ["Category", "Before", "After", "Reduction"].map((label) =>
                    React.createElement(
                      "th",
                      {
                        key: label,
                        className: "px-2 py-1.5 text-[8.5px] font-semibold uppercase tracking-[0.14em] text-[var(--text-dim)]"
                      },
                      label
                    )
                  )
                )
              ),
              React.createElement(
                "tbody",
                null,
                categoryRows.map((row) =>
                  React.createElement(
                    "tr",
                    {
                      key: row.categoryKey,
                      "data-category-row": row.categoryKey,
                      className: "border-t border-[var(--line-strong)] bg-[var(--surface-panel)]"
                    },
                    React.createElement(
                      "td",
                      {
                        className: "px-2 py-1.5 text-[10px] font-medium text-[var(--text-strong)]"
                      },
                      row.label
                    ),
                    React.createElement(
                      "td",
                      {
                        "data-category-before": row.categoryKey,
                        className: "px-2 py-1.5 text-[10px] text-[var(--text-soft)]"
                      },
                      String(row.beforeCount)
                    ),
                    React.createElement(
                      "td",
                      {
                        "data-category-after": row.categoryKey,
                        className: "px-2 py-1.5 text-[10px] text-[var(--text-soft)]"
                      },
                      String(row.afterCount)
                    ),
                    React.createElement(
                      "td",
                      {
                        "data-category-reduction": row.categoryKey,
                        className: `px-2 py-1.5 text-[10px] font-semibold ${resolveReductionClassName(row)}`
                      },
                      String(row.reductionCount)
                    )
                  )
                )
              )
            )
          )
        : null,
      React.createElement(
        "p",
        {
          "data-fixability-message": readiness?.signalStatus ?? "good",
          className: `mt-3 text-[10px] leading-[1.55] ${resolveSummaryToneClass(readiness?.signalStatus ?? "good")}`
        },
        summaryLine
      )
    )
  );
}

function renderStatusBadge(status: "good" | "warning" | "bad", label: string) {
  const statusTokens = STATUS_TOKENS[status];

  return React.createElement(
    "span",
    {
      "data-surface-status-badge": status,
      className:
        "inline-flex h-7 shrink-0 items-center justify-center rounded-full border border-[var(--line-focus)] bg-[var(--surface-press)] px-2.5 text-[9px] font-semibold uppercase tracking-[0.16em]"
    },
    React.createElement("span", {
      "aria-hidden": "true",
      className: `mr-1.5 inline-flex h-2.5 w-2.5 rounded-full ${statusTokens.indicatorClassName}`
    }),
    React.createElement(
      "span",
      {
        className: statusTokens.labelClassName
      },
      label
    )
  );
}

function resolveReductionClassName(row: NonNullable<UploadResultViewModel["categorySummary"]>["rows"][number]): string {
  if (row.reductionCount === 0 && row.afterCount > 0) {
    return "text-[var(--accent-rose)]";
  }

  if (row.reductionCount > 0) {
    return "text-[var(--accent-mint)]";
  }

  return "text-[var(--text-dim)]";
}

function summarizeCompactResult(viewModel: UploadResultViewModel): string {
  const readiness = viewModel.readinessSignal;

  if (!readiness) {
    return "Cleanup result is not available yet.";
  }

  if (readiness.signalStatus === "good") {
    return "All detected categories are now closed on this run.";
  }

  if (readiness.signalStatus === "warning") {
    return "Cleanup improved the deck, but some categories still need review.";
  }

  return "This file could not be fully repaired automatically.";
}

function resolveSummaryToneClass(status: "good" | "warning" | "bad"): string {
  if (status === "good") {
    return "text-[var(--accent-mint)]";
  }

  if (status === "warning") {
    return "text-[var(--accent-amber)]";
  }

  return "text-[var(--accent-rose)]";
}
