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

test("renders the headline", () => {
  const markup = renderToStaticMarkup(
    React.createElement(UploadResultScreen, { viewModel: buildViewModel() })
  );

  assert.match(markup, /Cleanup completed with warnings\./);
});

test("renders all sections", () => {
  const markup = renderToStaticMarkup(
    React.createElement(UploadResultScreen, { viewModel: buildViewModel() })
  );

  assert.match(markup, /Output/);
  assert.match(markup, /Deck readiness/);
  assert.match(markup, /Cleanup result/);
  assert.match(markup, /Recommended action/);
  assert.match(markup, /Output file/);
});

test("renders the centered max-width layout frame", () => {
  const markup = renderToStaticMarkup(
    React.createElement(UploadResultScreen, { viewModel: buildViewModel() })
  );

  assert.match(markup, /data-result-layout-frame="true"/);
  assert.match(markup, /max-w-\[680px\]/);
  assert.match(markup, /mx-auto/);
});

test("renders one consistent section card wrapper per section", () => {
  const markup = renderToStaticMarkup(
    React.createElement(UploadResultScreen, { viewModel: buildViewModel() })
  );

  const cardMatches = markup.match(/data-section-card="true"/g) ?? [];
  const statusAreaMatches = markup.match(/data-section-status-area="true"/g) ?? [];
  const contentAreaMatches = markup.match(/data-section-content="true"/g) ?? [];

  assert.equal(cardMatches.length, 5);
  assert.equal(statusAreaMatches.length, 5);
  assert.equal(contentAreaMatches.length, 5);
});

test("renders the headline and no section rows when sections is empty", () => {
  const markup = renderToStaticMarkup(
    React.createElement(UploadResultScreen, {
      viewModel: {
        overallStatus: "success",
        headline: "Cleanup completed successfully.",
        sections: []
      }
    })
  );

  assert.match(markup, /Cleanup completed successfully\./);
  assert.doesNotMatch(markup, /data-result-section=/);
});

test("renders empty section strings without fallback text", () => {
  const markup = renderToStaticMarkup(
    React.createElement(UploadResultScreen, {
      viewModel: {
        overallStatus: "warning",
        headline: "Cleanup completed with warnings.",
        sections: [
          {
            sectionKey: "output",
            sectionStatus: "good",
            title: "",
            description: ""
          }
        ]
      }
    })
  );

  assert.match(markup, /data-result-section="output"/);
  assert.match(markup, /<h4[^>]*><\/h4>/);
  assert.match(markup, /<p[^>]*><\/p>/);
  assert.doesNotMatch(markup, /Output PPTX package validation passed\./);
});

test("renders stable section hooks from section keys", () => {
  const markup = renderToStaticMarkup(
    React.createElement(UploadResultScreen, { viewModel: buildViewModel() })
  );

  assert.match(markup, /data-result-section="output"/);
  assert.match(markup, /data-result-section="deck"/);
  assert.match(markup, /data-result-section="cleanup"/);
  assert.match(markup, /data-result-section="action"/);
  assert.match(markup, /data-result-section="file"/);
});

test("renders section toggles as focusable buttons with aria-expanded state", () => {
  const markup = renderToStaticMarkup(
    React.createElement(UploadResultScreen, { viewModel: buildViewModel() })
  );

  assert.match(markup, /<button[^>]*type="button"[^>]*aria-expanded="false"[^>]*data-section-toggle="output"/);
  assert.match(markup, /<button[^>]*type="button"[^>]*aria-expanded="true"[^>]*data-section-toggle="deck"/);
  assert.match(markup, /focus-visible:ring-2/);
  assert.match(markup, /focus-visible:ring-offset-2/);
});

test("renders bad and warning sections expanded while good sections start collapsed", () => {
  const markup = renderToStaticMarkup(
    React.createElement(UploadResultScreen, { viewModel: buildViewModel() })
  );

  assert.match(markup, /data-result-section="output"[^>]*data-section-expanded="false"/);
  assert.doesNotMatch(markup, /data-section-description="output"/);
  assert.match(markup, /data-result-section="deck"[^>]*data-section-expanded="true"/);
  assert.match(markup, /data-section-description="deck"/);
  assert.match(markup, /data-result-section="cleanup"[^>]*data-section-expanded="true"/);
  assert.match(markup, /data-section-description="cleanup"/);
  assert.match(markup, /data-result-section="action"[^>]*data-section-expanded="true"/);
  assert.match(markup, /data-section-description="action"/);
  assert.match(markup, /data-result-section="file"[^>]*data-section-expanded="true"/);
  assert.match(markup, /data-section-description="file"/);
});

test("all-good default state still expands the first section", () => {
  const initialState = buildInitialSectionExpansionState(buildAllGoodViewModel().sections);

  assert.equal(initialState.output, true);
  assert.equal(initialState.deck, false);
  assert.equal(initialState.cleanup, false);
  assert.equal(initialState.action, false);
  assert.equal(initialState.file, false);
});

test("toggle collapses description", () => {
  const initialState = buildInitialSectionExpansionState(buildViewModel().sections);
  const collapsedState = toggleSectionExpansion(initialState, "deck");

  assert.equal(collapsedState.deck, false);
  assert.equal(collapsedState.cleanup, true);
});

test("toggle restores description", () => {
  const initialState = buildInitialSectionExpansionState(buildViewModel().sections);
  const collapsedState = toggleSectionExpansion(initialState, "deck");
  const restoredState = toggleSectionExpansion(collapsedState, "deck");

  assert.equal(restoredState.deck, true);
});

test("respects section order", () => {
  const markup = renderToStaticMarkup(
    React.createElement(UploadResultScreen, { viewModel: buildViewModel() })
  );

  assert.ok(markup.indexOf('data-result-section="output"') < markup.indexOf('data-result-section="deck"'));
  assert.ok(markup.indexOf('data-result-section="deck"') < markup.indexOf('data-result-section="cleanup"'));
  assert.ok(markup.indexOf('data-result-section="cleanup"') < markup.indexOf('data-result-section="action"'));
  assert.ok(markup.indexOf('data-result-section="action"') < markup.indexOf('data-result-section="file"'));
});

test("renders the stable status token mapping for indicators and titles", () => {
  const markup = renderToStaticMarkup(
    React.createElement(UploadResultScreen, { viewModel: buildViewModel() })
  );

  assert.match(markup, /data-section-status="good"[^>]*bg-\[var\(--accent-mint\)\]/);
  assert.match(markup, /data-section-status="warning"[^>]*bg-\[var\(--accent-amber\)\]/);
  assert.match(markup, /data-section-status="bad"[^>]*bg-\[var\(--accent-rose\)\]/);
  assert.match(markup, /data-section-status-title="good"[^>]*text-\[var\(--accent-mint\)\]/);
  assert.match(markup, /data-section-status-title="warning"[^>]*text-\[var\(--accent-amber\)\]/);
  assert.match(markup, /data-section-status-title="bad"[^>]*text-\[var\(--accent-rose\)\]/);
});

function buildViewModel(): UploadResultViewModel {
  return {
    overallStatus: "warning",
    headline: "Cleanup completed with warnings.",
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
        title: "Cleanup result",
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

function buildAllGoodViewModel(): UploadResultViewModel {
  return {
    overallStatus: "success",
    headline: "Cleanup completed successfully.",
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
        title: "Cleanup result",
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
