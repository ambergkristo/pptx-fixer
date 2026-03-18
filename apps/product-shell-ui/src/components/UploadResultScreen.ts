import React from "react";

import type { UploadResultViewModel } from "../lib/uploadResultViewModel.ts";

interface UploadResultScreenProps {
  viewModel: UploadResultViewModel;
}

export function UploadResultScreen(props: UploadResultScreenProps) {
  return React.createElement(
    "section",
    {
      className: "mt-2 flex min-h-0 flex-col overflow-auto rounded-[12px] border border-[var(--line-strong)] bg-[var(--surface-panel)] p-2.5"
    },
    React.createElement(
      "h3",
      {
        className: "text-[15px] font-semibold text-[var(--text-strong)]"
      },
      props.viewModel.headline
    ),
    React.createElement(
      "div",
      {
        className: "mt-2 grid gap-1.5"
      },
      props.viewModel.sections.map((section) =>
        React.createElement(
          "article",
          {
            key: section.sectionKey,
            "data-section-key": section.sectionKey,
            className: "rounded-[11px] border border-[var(--line-strong)] bg-[var(--surface-press)] px-2.5 py-2"
          },
          React.createElement(
            "div",
            {
              className: "flex items-center gap-2"
            },
            React.createElement("span", {
              "aria-hidden": "true",
              "data-section-status": section.sectionStatus,
              className: `h-2.5 w-2.5 rounded-full ${resolveSectionStatusClass(section.sectionStatus)}`
            }),
            React.createElement(
              "h4",
              {
                className: "text-[12px] font-semibold text-[var(--text-primary)]"
              },
              section.title
            )
          ),
          React.createElement(
            "p",
            {
              className: "mt-1 text-[11px] leading-5 text-[var(--text-soft)]"
            },
            section.description
          )
        )
      )
    )
  );
}

function resolveSectionStatusClass(sectionStatus: "good" | "warning" | "bad"): string {
  if (sectionStatus === "good") {
    return "bg-[var(--accent-mint)]";
  }

  if (sectionStatus === "warning") {
    return "bg-[var(--accent-amber)]";
  }

  return "bg-[var(--accent-rose)]";
}
