import { test } from "node:test";
import assert from "node:assert/strict";

import { summarizeTopProblemSlides } from "../packages/audit/topProblemSlides.ts";

test("returns worst slides first by brand score", () => {
  const result = summarizeTopProblemSlides([
    {
      slideIndex: 3,
      slideQaSummary: {
        brandScore: 88,
        qualityLabel: "good",
        summaryLine: "good",
        keyIssues: ["Alignment inconsistency detected"]
      }
    },
    {
      slideIndex: 1,
      slideQaSummary: {
        brandScore: 40,
        qualityLabel: "poor",
        summaryLine: "poor",
        keyIssues: ["Font family drift detected"]
      }
    },
    {
      slideIndex: 2,
      slideQaSummary: {
        brandScore: 70,
        qualityLabel: "warning",
        summaryLine: "warning",
        keyIssues: ["Paragraph spacing drift detected"]
      }
    }
  ]);

  assert.deepEqual(result.map((slide) => slide.slideIndex), [1, 2, 3]);
});

test("breaks brand-score ties by lower slide index", () => {
  const result = summarizeTopProblemSlides([
    {
      slideIndex: 4,
      slideQaSummary: {
        brandScore: 70,
        qualityLabel: "warning",
        summaryLine: "warning",
        keyIssues: ["Alignment inconsistency detected"]
      }
    },
    {
      slideIndex: 2,
      slideQaSummary: {
        brandScore: 70,
        qualityLabel: "warning",
        summaryLine: "warning",
        keyIssues: ["Paragraph spacing drift detected"]
      }
    }
  ]);

  assert.deepEqual(result.map((slide) => slide.slideIndex), [2, 4]);
});

test("caps the result length at five slides", () => {
  const result = summarizeTopProblemSlides(
    Array.from({ length: 7 }, (_, index) => ({
      slideIndex: index + 1,
      slideQaSummary: {
        brandScore: 70 + index,
        qualityLabel: "warning" as const,
        summaryLine: "warning",
        keyIssues: ["Paragraph spacing drift detected"]
      }
    }))
  );

  assert.equal(result.length, 5);
  assert.deepEqual(result.map((slide) => slide.slideIndex), [1, 2, 3, 4, 5]);
});

test("copies only existing slide qa summary fields and omits fully clean slides", () => {
  const result = summarizeTopProblemSlides([
    {
      slideIndex: 1,
      slideQaSummary: {
        brandScore: 100,
        qualityLabel: "good",
        summaryLine: "Slide is mostly consistent with minor formatting drift.",
        keyIssues: []
      }
    },
    {
      slideIndex: 2,
      slideQaSummary: {
        brandScore: 92,
        qualityLabel: "good",
        summaryLine: "Slide is mostly consistent with minor formatting drift.",
        keyIssues: ["Font size drift detected"]
      }
    }
  ]);

  assert.deepEqual(result, [
    {
      slideIndex: 2,
      brandScore: 92,
      qualityLabel: "good",
      summaryLine: "Slide is mostly consistent with minor formatting drift.",
      keyIssues: ["Font size drift detected"]
    }
  ]);
});

test("returns deterministic output across repeated runs", () => {
  const input = [
    {
      slideIndex: 3,
      slideQaSummary: {
        brandScore: 88,
        qualityLabel: "good" as const,
        summaryLine: "good",
        keyIssues: ["Alignment inconsistency detected"]
      }
    },
    {
      slideIndex: 1,
      slideQaSummary: {
        brandScore: 40,
        qualityLabel: "poor" as const,
        summaryLine: "poor",
        keyIssues: ["Font family drift detected"]
      }
    }
  ];

  assert.deepEqual(summarizeTopProblemSlides(input), summarizeTopProblemSlides(input));
});
