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
  assert.doesNotMatch(markup, /data-section-key=/);
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

  assert.match(markup, /data-section-key="output"/);
  assert.match(markup, /<h4[^>]*><\/h4>/);
  assert.match(markup, /<p[^>]*><\/p>/);
  assert.doesNotMatch(markup, /Output PPTX package validation passed\./);
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
