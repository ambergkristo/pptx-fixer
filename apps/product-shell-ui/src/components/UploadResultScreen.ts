import React from "react";

import type { UploadResultViewModel } from "../lib/uploadResultViewModel.ts";

interface UploadResultScreenProps {
  viewModel: UploadResultViewModel;
}

const STATUS_TOKENS = {
  good: {
    indicatorClassName: "bg-[var(--accent-mint)]",
    titleClassName: "text-[var(--accent-mint)]"
  },
  warning: {
    indicatorClassName: "bg-[var(--accent-amber)]",
    titleClassName: "text-[var(--accent-amber)]"
  },
  bad: {
    indicatorClassName: "bg-[var(--accent-rose)]",
    titleClassName: "text-[var(--accent-rose)]"
  }
} as const;

export function UploadResultScreen(props: UploadResultScreenProps) {
  return React.createElement(
    "section",
    {
      className: "mt-2 flex min-h-0 flex-col overflow-auto rounded-[12px] border border-[var(--line-strong)] bg-[var(--surface-panel)] px-3 py-3"
    },
    React.createElement(
      "div",
      {
        "data-result-layout-frame": "true",
        className: "mx-auto flex w-full max-w-[680px] min-w-0 flex-col pb-1"
      },
      React.createElement(
        "h3",
        {
          className: "text-[14px] font-semibold tracking-[-0.01em] text-[var(--text-strong)]"
        },
        props.viewModel.headline
      ),
      React.createElement(
        "div",
        {
          className: "mt-3 grid gap-2"
        },
        props.viewModel.sections.map((section) => {
          const statusTokens = STATUS_TOKENS[section.sectionStatus];

          return React.createElement(
            "article",
            {
              key: section.sectionKey,
              "data-section-key": section.sectionKey,
              "data-section-card": "true",
              className: "rounded-[11px] border border-[var(--line-strong)] bg-[var(--surface-press)] px-2.5 py-2.5"
            },
            React.createElement(
              "div",
              {
                className: "flex items-start gap-3"
              },
              React.createElement(
                "div",
                {
                  "data-section-status-area": "true",
                  className: "flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] border border-[var(--line-focus)] bg-[var(--surface-panel)] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
                },
                React.createElement("span", {
                  "aria-hidden": "true",
                  "data-section-status": section.sectionStatus,
                  className: `h-3 w-3 rounded-full ${statusTokens.indicatorClassName}`
                })
              ),
              React.createElement(
                "div",
                {
                  "data-section-content": "true",
                  className: "min-w-0 flex-1 pt-0.5"
                },
                React.createElement(
                  "h4",
                  {
                    "data-section-status-title": section.sectionStatus,
                    className: `text-[12px] font-semibold tracking-[0.01em] ${statusTokens.titleClassName}`
                  },
                  section.title
                ),
                React.createElement(
                  "p",
                  {
                    className: "mt-1 text-[10.5px] leading-5 text-[var(--text-soft)]"
                  },
                  section.description
                )
              )
            )
          );
        })
      )
    )
  );
}
