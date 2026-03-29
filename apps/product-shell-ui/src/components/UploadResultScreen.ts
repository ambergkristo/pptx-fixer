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
    titleClassName: "text-[var(--accent-mint)]",
    labelClassName: "text-[var(--accent-mint)]"
  },
  warning: {
    indicatorClassName: "bg-[var(--accent-amber)]",
    titleClassName: "text-[var(--accent-amber)]",
    labelClassName: "text-[var(--accent-amber)]"
  },
  bad: {
    indicatorClassName: "bg-[var(--accent-rose)]",
    titleClassName: "text-[var(--accent-rose)]",
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
  const [expandedSections, setExpandedSections] = React.useState<SectionExpansionState>(() =>
    buildInitialSectionExpansionState(props.viewModel.sections)
  );

  return React.createElement(
    "section",
    {
      className: "mt-2 flex min-h-0 flex-col overflow-auto rounded-[12px] border border-[var(--line-strong)] bg-[var(--surface-panel)] px-3 py-3"
    },
      React.createElement(
        "div",
        {
          "data-result-layout-frame": "true",
          className: "mx-auto flex w-full max-w-[680px] min-w-0 flex-col pb-0.5"
        },
      React.createElement(
        "h3",
        {
          className: "px-0.5 text-[14px] font-semibold leading-[1.3] tracking-[-0.01em] text-[var(--text-strong)]"
        },
        props.viewModel.headline
        ),
      props.viewModel.readinessSignal
        ? React.createElement(
            "article",
            {
              "data-readiness-signal": "true",
              className: "mt-3 rounded-[12px] border border-[var(--line-strong)] bg-[var(--surface-press)] px-3 py-3"
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
                  "Readiness signal"
                ),
                React.createElement(
                  "h4",
                  {
                    className: "mt-1 text-[14px] font-semibold leading-[1.3] text-[var(--text-strong)]"
                  },
                  props.viewModel.readinessSignal.label
                )
              ),
              renderStatusBadge(props.viewModel.readinessSignal.signalStatus)
            ),
            React.createElement(
              "p",
              {
                "data-readiness-description": "true",
                className: "mt-2 text-[10.5px] leading-[1.65] text-[var(--text-soft)]"
              },
              props.viewModel.readinessSignal.description
            ),
            React.createElement(
              "p",
              {
                "data-readiness-scope-note": "true",
                className: "mt-2 text-[9.5px] leading-[1.65] text-[var(--text-dim)]"
              },
              props.viewModel.readinessSignal.scopeNote
            )
          )
        : null,
      props.viewModel.categorySummary
        ? React.createElement(
            "article",
            {
              "data-category-summary": "true",
              className: "mt-3 rounded-[12px] border border-[var(--line-strong)] bg-[var(--surface-press)] px-3 py-3"
            },
            React.createElement(
              "div",
              {
                className: "flex items-end justify-between gap-3"
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
                  "Category reduction"
                ),
                React.createElement(
                  "h4",
                  {
                    className: "mt-1 text-[14px] font-semibold leading-[1.3] text-[var(--text-strong)]"
                  },
                  "Before, after, and reduction by category"
                )
              ),
              React.createElement(
                "p",
                {
                  className: "text-right text-[9.5px] leading-[1.55] text-[var(--text-dim)]"
                },
                "Real run data only"
              )
            ),
            React.createElement(
              "div",
              {
                className: "mt-3 overflow-hidden rounded-[10px] border border-[var(--line-strong)]"
              },
              React.createElement(
                "table",
                {
                  className: "w-full border-collapse text-left"
                },
                React.createElement(
                  "thead",
                  null,
                  React.createElement(
                    "tr",
                    {
                      className: "bg-[var(--surface-panel)]"
                    },
                    ["Category", "Before", "After", "Reduction", "Status"].map((label) =>
                      React.createElement(
                        "th",
                        {
                          key: label,
                          className: "px-2.5 py-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-[var(--text-dim)]"
                        },
                        label
                      )
                    )
                  )
                ),
                React.createElement(
                  "tbody",
                  null,
                  props.viewModel.categorySummary.rows.map((row) =>
                    React.createElement(
                      "tr",
                      {
                        key: row.categoryKey,
                        "data-category-row": row.categoryKey,
                        className: "border-t border-[var(--line-strong)] bg-[var(--surface-press)]"
                      },
                      React.createElement(
                        "td",
                        {
                          className: "px-2.5 py-2 text-[10.5px] font-medium text-[var(--text-strong)]"
                        },
                        row.label
                      ),
                      React.createElement(
                        "td",
                        {
                          "data-category-before": row.categoryKey,
                          className: "px-2.5 py-2 text-[10.5px] text-[var(--text-soft)]"
                        },
                        String(row.beforeCount)
                      ),
                      React.createElement(
                        "td",
                        {
                          "data-category-after": row.categoryKey,
                          className: "px-2.5 py-2 text-[10.5px] text-[var(--text-soft)]"
                        },
                        String(row.afterCount)
                      ),
                      React.createElement(
                        "td",
                        {
                          "data-category-reduction": row.categoryKey,
                          className: "px-2.5 py-2 text-[10.5px] font-semibold text-[var(--accent-mint)]"
                        },
                        String(row.reductionCount)
                      ),
                      React.createElement(
                        "td",
                        {
                          className: "px-2.5 py-2"
                        },
                        renderRowStatus(row.outcomeStatus, row.outcomeLabel)
                      )
                    )
                  )
                )
              )
            )
          )
        : null,
      props.viewModel.remainingIssues
        ? React.createElement(
            "article",
            {
              "data-remaining-issues": "true",
              className: "mt-3 rounded-[12px] border border-[var(--line-strong)] bg-[var(--surface-press)] px-3 py-3"
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
                  "What changed"
                ),
                React.createElement(
                  "h4",
                  {
                    className: "mt-1 text-[14px] font-semibold leading-[1.3] text-[var(--text-strong)]"
                  },
                  props.viewModel.remainingIssues.title
                )
              ),
              renderStatusBadge(props.viewModel.remainingIssues.sectionStatus)
            ),
            React.createElement(
              "p",
              {
                "data-remaining-issues-description": "true",
                className: "mt-2 text-[10.5px] leading-[1.65] text-[var(--text-soft)]"
              },
              props.viewModel.remainingIssues.description
            ),
            React.createElement(
              "div",
              {
                className: "mt-3 grid gap-2 md:grid-cols-2"
              },
              renderCategoryTagBlock({
                blockKey: "improved",
                title: "Improved now",
                categories: props.viewModel.remainingIssues.improvedCategories
              }),
              renderCategoryTagBlock({
                blockKey: "unresolved",
                title: "Still unresolved",
                categories: props.viewModel.remainingIssues.unresolvedCategories
              })
            ),
            React.createElement(
              "p",
              {
                "data-remaining-issues-action": "true",
                className: "mt-3 text-[9.5px] leading-[1.65] text-[var(--text-dim)]"
              },
              props.viewModel.remainingIssues.actionLine
            )
          )
        : null,
      React.createElement(
        "div",
        {
          className: "mt-3 grid gap-1.5"
        },
        props.viewModel.sections.map((section) => {
          const statusTokens = STATUS_TOKENS[section.sectionStatus];
          const isExpanded = expandedSections[section.sectionKey] ?? true;

          return React.createElement(
            "article",
            {
              key: section.sectionKey,
              "data-result-section": section.sectionKey,
              "data-section-expanded": isExpanded ? "true" : "false",
              "data-section-card": "true",
              className: "rounded-[12px] border border-[var(--line-strong)] bg-[var(--surface-press)] px-2.5 py-2"
            },
            React.createElement(
              "button",
              {
                type: "button",
                "aria-expanded": isExpanded,
                "data-section-toggle": section.sectionKey,
                onClick: () => {
                  setExpandedSections((current) => toggleSectionExpansion(current, section.sectionKey));
                },
                className:
                  "group flex w-full cursor-pointer items-start gap-2.5 rounded-[10px] px-1.5 py-1.5 text-left transition-colors hover:bg-[var(--surface-panel)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-sand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-press)]"
              },
              React.createElement(
                "div",
                {
                  "data-section-status-area": "true",
                  className:
                    "flex h-7 w-[96px] shrink-0 items-center justify-start gap-1.5 rounded-[9px] border border-[var(--line-focus)] bg-[var(--surface-panel)] px-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
                },
                React.createElement("span", {
                  "aria-hidden": "true",
                  "data-section-status": section.sectionStatus,
                  className: `h-3 w-3 rounded-full ${statusTokens.indicatorClassName}`
                }),
                React.createElement(
                  "span",
                  {
                    "data-section-status-label": section.sectionStatus,
                    className: `text-[9px] font-semibold uppercase tracking-[0.16em] ${statusTokens.labelClassName}`
                  },
                  section.sectionStatus
                )
              ),
              React.createElement(
                "div",
                {
                  "data-section-content": "true",
                  className: "min-w-0 flex-1"
                },
                React.createElement(
                  "div",
                  {
                    className: "flex items-start justify-between gap-2.5"
                  },
                  React.createElement(
                    "h4",
                    {
                      "data-section-status-title": section.sectionStatus,
                      className: `min-w-0 flex-1 text-[12px] font-semibold leading-4 tracking-[0.01em] break-words ${statusTokens.titleClassName}`
                    },
                    section.title
                  ),
                  React.createElement(
                    "span",
                    {
                      "aria-hidden": "true",
                      "data-section-toggle-indicator": section.sectionKey,
                      className:
                        "mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[var(--line-focus)] bg-[var(--surface-panel)] text-[11px] font-semibold leading-none text-[var(--text-dim)] transition-colors group-hover:text-[var(--text-strong)]"
                    },
                    isExpanded ? "-" : "+"
                  )
                )
              )
            ),
            isExpanded
              ? React.createElement(
                  "p",
                  {
                    "data-section-description": section.sectionKey,
                    className:
                      "mt-0.5 ml-[112px] pr-1.5 text-[10.5px] leading-[1.6] break-words text-[var(--text-soft)]"
                  },
                  section.description
                )
              : null
          );
        })
      )
    )
  );
}

function renderStatusBadge(status: "good" | "warning" | "bad") {
  const statusTokens = STATUS_TOKENS[status];

  return React.createElement(
    "span",
    {
      "data-surface-status-badge": status,
      className:
        "inline-flex h-7 shrink-0 items-center justify-center rounded-full border border-[var(--line-focus)] bg-[var(--surface-panel)] px-2.5 text-[9px] font-semibold uppercase tracking-[0.16em]"
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
      status
    )
  );
}

function renderRowStatus(status: "good" | "warning" | "bad", label: string) {
  const statusTokens = STATUS_TOKENS[status];

  return React.createElement(
    "span",
    {
      "data-category-status": status,
      className:
        "inline-flex rounded-full border border-[var(--line-focus)] bg-[var(--surface-panel)] px-2 py-1 text-[8.5px] font-semibold uppercase tracking-[0.14em]"
    },
    React.createElement(
      "span",
      {
        className: statusTokens.labelClassName
      },
      label
    )
  );
}

function renderCategoryTagBlock(props: {
  blockKey: "improved" | "unresolved";
  title: string;
  categories: string[];
}) {
  return React.createElement(
    "div",
    {
      "data-category-tag-block": props.blockKey,
      className: "rounded-[10px] border border-[var(--line-strong)] bg-[var(--surface-panel)] px-2.5 py-2.5"
    },
    React.createElement(
      "p",
      {
        className: "text-[9px] font-semibold uppercase tracking-[0.16em] text-[var(--text-dim)]"
      },
      props.title
    ),
    React.createElement(
      "div",
      {
        className: "mt-2 flex flex-wrap gap-1.5"
      },
      props.categories.length > 0
        ? props.categories.map((category) =>
            React.createElement(
              "span",
              {
                key: `${props.blockKey}-${category}`,
                "data-category-tag": `${props.blockKey}:${category}`,
                className:
                  "inline-flex rounded-full border border-[var(--line-focus)] bg-[var(--surface-press)] px-2 py-1 text-[9px] font-medium text-[var(--text-soft)]"
              },
              category
            )
          )
        : React.createElement(
            "span",
            {
              "data-category-tag": `${props.blockKey}:none`,
              className:
                "inline-flex rounded-full border border-[var(--line-focus)] bg-[var(--surface-press)] px-2 py-1 text-[9px] font-medium text-[var(--text-dim)]"
            },
            "None"
          )
    )
  );
}
