import type { SlideQaSummary } from "./slideQaSummary.ts";

export interface TopProblemSlideSummary {
  slideIndex: number;
  brandScore: number;
  qualityLabel: SlideQaSummary["qualityLabel"];
  summaryLine: string;
  keyIssues: string[];
}

export interface TopProblemSlideInput {
  slideIndex: number;
  slideQaSummary: SlideQaSummary;
}

export function summarizeTopProblemSlides(
  slides: TopProblemSlideInput[]
): TopProblemSlideSummary[] {
  const rankedSlides = slides
    .filter((slide) => !isFullyClean(slide.slideQaSummary))
    .sort((left, right) => {
      if (left.slideQaSummary.brandScore !== right.slideQaSummary.brandScore) {
        return left.slideQaSummary.brandScore - right.slideQaSummary.brandScore;
      }

      return left.slideIndex - right.slideIndex;
    });

  return rankedSlides.slice(0, 5).map((slide) => ({
    slideIndex: slide.slideIndex,
    brandScore: slide.slideQaSummary.brandScore,
    qualityLabel: slide.slideQaSummary.qualityLabel,
    summaryLine: slide.slideQaSummary.summaryLine,
    keyIssues: [...slide.slideQaSummary.keyIssues]
  }));
}

function isFullyClean(slideQaSummary: SlideQaSummary): boolean {
  return slideQaSummary.brandScore === 100 && slideQaSummary.keyIssues.length === 0;
}
