import { test } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { UploadResultScreen } from "../apps/product-shell-ui/src/components/UploadResultScreen.ts";
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

test("respects section order", () => {
  const markup = renderToStaticMarkup(
    React.createElement(UploadResultScreen, { viewModel: buildViewModel() })
  );

  assert.ok(markup.indexOf("Output") < markup.indexOf("Deck readiness"));
  assert.ok(markup.indexOf("Deck readiness") < markup.indexOf("Cleanup result"));
  assert.ok(markup.indexOf("Cleanup result") < markup.indexOf("Recommended action"));
  assert.ok(markup.indexOf("Recommended action") < markup.indexOf("Output file"));
});

test("renders the correct status class for each section", () => {
  const markup = renderToStaticMarkup(
    React.createElement(UploadResultScreen, { viewModel: buildViewModel() })
  );

  assert.match(markup, /data-section-status="good"[^>]*bg-\[var\(--accent-mint\)\]/);
  assert.match(markup, /data-section-status="warning"[^>]*bg-\[var\(--accent-amber\)\]/);
  assert.match(markup, /data-section-status="bad"[^>]*bg-\[var\(--accent-rose\)\]/);
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
