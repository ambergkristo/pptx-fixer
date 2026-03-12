from __future__ import annotations

from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .pptx_reader import (
    FontSignature,
    Paragraph,
    Presentation,
    TextBody,
    load_presentation,
)


RULE_FONT_DRIFT = "RULE_001"
RULE_BULLET_SPACING = "RULE_002"
RULE_PARAGRAPH_SPACING = "RULE_003"


@dataclass(frozen=True)
class BulletSpacingSignature:
    level: int | None
    margin_left: str | None
    indent: str | None

    def is_informative(self) -> bool:
        return any(value is not None for value in (self.level, self.margin_left, self.indent))

    def as_dict(self) -> dict[str, Any]:
        return {
            "level": self.level,
            "margin_left": self.margin_left,
            "indent": self.indent,
        }


@dataclass(frozen=True)
class ParagraphSpacingSignature:
    space_before: str | None
    space_after: str | None
    line_spacing: str | None

    def is_informative(self) -> bool:
        return any(
            value is not None
            for value in (self.space_before, self.space_after, self.line_spacing)
        )

    def as_dict(self) -> dict[str, Any]:
        return {
            "space_before": self.space_before,
            "space_after": self.space_after,
            "line_spacing": self.line_spacing,
        }


def audit_pptx(path: str | Path) -> dict[str, Any]:
    presentation = load_presentation(path)
    issues = _collect_issues(presentation)
    counts = Counter(issue["rule_id"] for issue in issues)

    return {
        "tool": "pptx-fixer",
        "mode": "audit",
        "version": "0.1.0",
        "source": {
            "path": str(Path(path)),
            "slides": len(presentation.slides),
            "text_bodies": sum(len(slide.text_bodies) for slide in presentation.slides),
        },
        "summary": {
            "issue_count": len(issues),
            "issue_types": dict(sorted(counts.items())),
        },
        "issues": issues,
    }


def _collect_issues(presentation: Presentation) -> list[dict[str, Any]]:
    issues: list[dict[str, Any]] = []
    for slide in presentation.slides:
        for text_body in slide.text_bodies:
            issues.extend(_detect_font_drift(slide.slide_number, text_body))
            issues.extend(_detect_spacing_drift(slide.slide_number, text_body))
    return issues


def _detect_font_drift(slide_number: int, text_body: TextBody) -> list[dict[str, Any]]:
    paragraph_signatures: list[tuple[Paragraph, FontSignature]] = []
    for paragraph in text_body.paragraphs:
        signature = _paragraph_font_signature(paragraph)
        if signature is not None:
            paragraph_signatures.append((paragraph, signature))

    distinct_signatures = {signature for _, signature in paragraph_signatures}
    if len(distinct_signatures) <= 1:
        return []

    grouped = Counter(signature for _, signature in paragraph_signatures)
    examples = [
        {
            "text": paragraph.text,
            "font": signature.as_dict(),
        }
        for paragraph, signature in paragraph_signatures[:3]
    ]

    return [
        {
            "rule_id": RULE_FONT_DRIFT,
            "rule_name": "font_drift",
            "severity": "warning",
            "slide": slide_number,
            "shape": {
                "index": text_body.shape_index,
                "name": text_body.shape_name,
            },
            "message": "Detected multiple paragraph-level font signatures in one text body.",
            "evidence": {
                "paragraph_count": len(paragraph_signatures),
                "distinct_signatures": [signature.as_dict() for signature in grouped.keys()],
                "examples": examples,
            },
        }
    ]


def _detect_spacing_drift(slide_number: int, text_body: TextBody) -> list[dict[str, Any]]:
    issues: list[dict[str, Any]] = []
    bullet_signatures: list[tuple[Paragraph, BulletSpacingSignature]] = []
    paragraph_signatures: list[tuple[Paragraph, ParagraphSpacingSignature]] = []

    for paragraph in text_body.paragraphs:
        bullet_signature = BulletSpacingSignature(
            level=paragraph.level,
            margin_left=paragraph.margin_left,
            indent=paragraph.indent,
        )
        if bullet_signature.is_informative():
            bullet_signatures.append((paragraph, bullet_signature))

        spacing_signature = ParagraphSpacingSignature(
            space_before=paragraph.space_before,
            space_after=paragraph.space_after,
            line_spacing=paragraph.line_spacing,
        )
        if spacing_signature.is_informative():
            paragraph_signatures.append((paragraph, spacing_signature))

    if len({signature for _, signature in bullet_signatures}) > 1:
        issues.append(
            _build_spacing_issue(
                slide_number=slide_number,
                text_body=text_body,
                rule_id=RULE_BULLET_SPACING,
                rule_name="bullet_spacing_drift",
                message="Detected inconsistent paragraph indentation or bullet spacing in one text body.",
                signatures=bullet_signatures,
            )
        )

    if len({signature for _, signature in paragraph_signatures}) > 1:
        issues.append(
            _build_spacing_issue(
                slide_number=slide_number,
                text_body=text_body,
                rule_id=RULE_PARAGRAPH_SPACING,
                rule_name="paragraph_spacing_drift",
                message="Detected inconsistent paragraph spacing in one text body.",
                signatures=paragraph_signatures,
            )
        )

    return issues


def _build_spacing_issue(
    *,
    slide_number: int,
    text_body: TextBody,
    rule_id: str,
    rule_name: str,
    message: str,
    signatures: list[tuple[Paragraph, Any]],
) -> dict[str, Any]:
    examples = [
        {
            "text": paragraph.text,
            "spacing": signature.as_dict(),
        }
        for paragraph, signature in signatures[:3]
    ]
    return {
        "rule_id": rule_id,
        "rule_name": rule_name,
        "severity": "warning",
        "slide": slide_number,
        "shape": {
            "index": text_body.shape_index,
            "name": text_body.shape_name,
        },
        "message": message,
        "evidence": {
            "paragraph_count": len(signatures),
            "distinct_signatures": [signature.as_dict() for signature in {sig for _, sig in signatures}],
            "examples": examples,
        },
    }


def _paragraph_font_signature(paragraph: Paragraph) -> FontSignature | None:
    signatures = [signature for signature in paragraph.font_signatures if signature.is_informative()]
    if not signatures:
        return None

    distinct = {signature for signature in signatures}
    if len(distinct) != 1:
        return None

    return signatures[0]
