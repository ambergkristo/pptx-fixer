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
