import { test } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  UploadResultScreen,
  buildInitialSectionExpansionState,
  toggleSectionExpansion
} from "../apps/product-shell-ui/src/components/UploadResultScreen.ts";
import type { UploadResultViewModel } from "../apps/product-shell-ui/src/lib/uploadResultViewModel.ts";

test("renders a compact cleanup result with category table only", () => {
  const markup = renderToStaticMarkup(
    React.createElement(UploadResultScreen, { viewModel: buildViewModel() })
  );

  assert.match(markup, /Safe cleanup completed with warnings\./);
  assert.match(markup, /data-category-summary="true"/);
  assert.match(markup, /Category/);
  assert.match(markup, /Before/);
  assert.match(markup, /After/);
  assert.match(markup, /Fixed/);
  assert.doesNotMatch(markup, /Reduction/);
  assert.doesNotMatch(markup, /Status/);
  assert.doesNotMatch(markup, /Download report/);
  assert.doesNotMatch(markup, /Why this label/);
  assert.doesNotMatch(markup, /Still unresolved/);
});

test("renders category rows with before after and reduction values", () => {
  const markup = renderToStaticMarkup(
    React.createElement(UploadResultScreen, { viewModel: buildViewModel() })
  );

  assert.match(markup, /data-category-row="font_consistency"/);
  assert.match(markup, /data-category-before="font_consistency"[^>]*>3</);
  assert.match(markup, /data-category-after="font_consistency"[^>]*>0</);
  assert.match(markup, /data-category-reduction="font_consistency"[^>]*>3</);
  assert.match(markup, /data-category-row="paragraph_spacing"/);
  assert.match(markup, /data-category-before="paragraph_spacing"[^>]*>2</);
  assert.match(markup, /data-category-after="paragraph_spacing"[^>]*>1</);
  assert.match(markup, /data-category-reduction="paragraph_spacing"[^>]*>1</);
});

test("renders a short warning message when issues remain", () => {
  const markup = renderToStaticMarkup(
    React.createElement(UploadResultScreen, { viewModel: buildViewModel() })
  );

  assert.match(markup, /data-fixability-message="warning"/);
  assert.match(markup, /Cleanup improved the deck, but some categories still need review\./);
});

test("renders a short blocked message when the file cannot be fully repaired", () => {
  const markup = renderToStaticMarkup(
    React.createElement(UploadResultScreen, { viewModel: buildBlockedViewModel() })
  );

  assert.match(markup, /data-surface-status-badge="bad"/);
  assert.match(markup, /Manual review needed/);
  assert.match(markup, /data-fixability-message="bad"/);
  assert.match(markup, /This file could not be fully repaired automatically\./);
});

test("renders the compact layout frame without max-width scroll framing", () => {
  const markup = renderToStaticMarkup(
    React.createElement(UploadResultScreen, { viewModel: buildViewModel() })
  );

  assert.match(markup, /data-result-layout-frame="true"/);
  assert.doesNotMatch(markup, /max-w-\[680px\]/);
});

test("renders the headline and no category rows when categories are missing", () => {
  const markup = renderToStaticMarkup(
    React.createElement(UploadResultScreen, {
      viewModel: {
        overallStatus: "success",
        headline: "Safe cleanup completed successfully.",
        sections: []
      }
    })
  );

  assert.match(markup, /Safe cleanup completed successfully\./);
  assert.doesNotMatch(markup, /data-category-row=/);
  assert.match(markup, /Safe cleanup result is not available yet\./);
});

test("all-good default state still expands the first section", () => {
  const initialState = buildInitialSectionExpansionState(buildAllGoodViewModel().sections);

  assert.equal(initialState.output, true);
  assert.equal(initialState.deck, false);
  assert.equal(initialState.cleanup, false);
  assert.equal(initialState.action, false);
  assert.equal(initialState.file, false);
});

test("toggle collapses and restores section state", () => {
  const initialState = buildInitialSectionExpansionState(buildViewModel().sections);
  const collapsedState = toggleSectionExpansion(initialState, "deck");
  const restoredState = toggleSectionExpansion(collapsedState, "deck");

  assert.equal(collapsedState.deck, false);
  assert.equal(restoredState.deck, true);
});

function buildViewModel(): UploadResultViewModel {
  return {
    overallStatus: "warning",
    headline: "Safe cleanup completed with warnings.",
    readinessSignal: {
      signalStatus: "warning",
      label: "Mostly ready",
      description: "This deck appears mostly ready after cleanup, with only minor remaining formatting issues.",
      reasonLine: "This label is shown because only low-severity unresolved categories remain after cleanup: Paragraph spacing, Alignment.",
      blockerLine: "2 unresolved categories are still blocking a better readiness state.",
      blockerCategories: ["Paragraph spacing", "Alignment"],
      useNowLine: "Usable now only if minor residual drift is acceptable, but review the unresolved categories before sharing.",
      scopeNote: "Category reduction is deck-specific on the current eligible-cleanup boundary. It does not imply broad category closure."
    },
    categorySummary: {
      rows: [
        {
          categoryKey: "font_consistency",
          label: "Font family",
          beforeCount: 3,
          afterCount: 0,
          reductionCount: 3,
          outcomeLabel: "Resolved",
          outcomeStatus: "good"
        },
        {
          categoryKey: "font_size_consistency",
          label: "Font size",
          beforeCount: 0,
          afterCount: 0,
          reductionCount: 0,
          outcomeLabel: "Clean",
          outcomeStatus: "good"
        },
        {
          categoryKey: "paragraph_spacing",
          label: "Paragraph spacing",
          beforeCount: 2,
          afterCount: 1,
          reductionCount: 1,
          outcomeLabel: "Reduced",
          outcomeStatus: "warning"
        },
        {
          categoryKey: "bullet_indentation",
          label: "Bullet indentation",
          beforeCount: 0,
          afterCount: 0,
          reductionCount: 0,
          outcomeLabel: "Clean",
          outcomeStatus: "good"
        },
        {
          categoryKey: "alignment",
          label: "Alignment",
          beforeCount: 1,
          afterCount: 1,
          reductionCount: 0,
          outcomeLabel: "Unchanged",
          outcomeStatus: "bad"
        },
        {
          categoryKey: "line_spacing",
          label: "Line spacing",
          beforeCount: 0,
          afterCount: 0,
          reductionCount: 0,
          outcomeLabel: "Clean",
          outcomeStatus: "good"
        }
      ]
    },
    remainingIssues: {
      sectionStatus: "warning",
      title: "What improved and what still needs review",
      description: "Improved categories reflect real reduction on this deck. Unresolved categories are still blocking a better readiness state.",
      improvedCategories: ["Font family", "Paragraph spacing"],
      unresolvedCategories: ["Paragraph spacing", "Alignment"],
      actionLine: "Current run recommendation: Automatic cleanup resolved most detected drift."
    },
    sections: [
      {
        sectionKey: "output",
        sectionStatus: "good",
        title: "Output",
        description: "Output PPTX package validation passed."
      },
      {
        sectionKey: "deck",
        sectionStatus: "warning",
        title: "Deck readiness",
        description: "This deck appears mostly ready after cleanup, with only minor remaining formatting issues."
      },
      {
        sectionKey: "cleanup",
        sectionStatus: "warning",
        title: "Safe cleanup result",
        description: "Cleanup produced a small brand consistency improvement."
      },
      {
        sectionKey: "action",
        sectionStatus: "warning",
        title: "Recommended action",
        description: "Automatic cleanup resolved most detected drift."
      },
      {
        sectionKey: "file",
        sectionStatus: "bad",
        title: "Output file",
        description: "Output file metadata could not be captured because the output file is missing."
      }
    ]
  };
}

function buildBlockedViewModel(): UploadResultViewModel {
  return {
    ...buildViewModel(),
    overallStatus: "failure",
    headline: "Safe cleanup failed.",
    readinessSignal: {
      signalStatus: "bad",
      label: "Manual review needed",
      description: "This deck still requires manual review after cleanup.",
      reasonLine: "This label is shown because the current run still requires manual attention and unresolved categories remain: Paragraph spacing, Alignment.",
      blockerLine: "2 unresolved categories are still blocking a better readiness state.",
      blockerCategories: ["Paragraph spacing", "Alignment"],
      useNowLine: "Still needs review. Do not treat the current output as finished until the unresolved categories are reviewed.",
      scopeNote: "Category reduction is deck-specific on the current manual-review boundary. It does not imply broad category closure."
    }
  };
}

function buildAllGoodViewModel(): UploadResultViewModel {
  return {
    overallStatus: "success",
    headline: "Safe cleanup completed successfully.",
    readinessSignal: {
      signalStatus: "good",
      label: "Ready",
      description: "This deck is ready.",
      reasonLine: "This label is shown because no unresolved categories remain after cleanup.",
      blockerLine: "No unresolved categories are blocking a better readiness state.",
      blockerCategories: [],
      useNowLine: "Good enough to use now based on this run. No unresolved categories remain in the current report.",
      scopeNote: "Category reduction is deck-specific on the current eligible-cleanup boundary. It does not imply broad category closure."
    },
    categorySummary: {
      rows: []
    },
    remainingIssues: {
      sectionStatus: "good",
      title: "What improved",
      description: "Improved categories reflect real reduction on this deck. No unresolved categories remain in the current report.",
      improvedCategories: ["Font family"],
      unresolvedCategories: [],
      actionLine: "Current run recommendation: No further action is recommended."
    },
    sections: [
      {
        sectionKey: "output",
        sectionStatus: "good",
        title: "Output",
        description: "Output PPTX package validation passed."
      },
      {
        sectionKey: "deck",
        sectionStatus: "good",
        title: "Deck readiness",
        description: "This deck is ready."
      },
      {
        sectionKey: "cleanup",
        sectionStatus: "good",
        title: "Safe cleanup result",
        description: "Cleanup produced a major brand consistency improvement."
      },
      {
        sectionKey: "action",
        sectionStatus: "good",
        title: "Recommended action",
        description: "No further action is recommended."
      },
      {
        sectionKey: "file",
        sectionStatus: "good",
        title: "Output file",
        description: "Output file metadata was captured successfully."
      }
    ]
  };
}
