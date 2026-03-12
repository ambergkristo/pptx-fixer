from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import re
from xml.etree import ElementTree as ET
from zipfile import BadZipFile, ZipFile

PML_NS = "http://schemas.openxmlformats.org/presentationml/2006/main"
DML_NS = "http://schemas.openxmlformats.org/drawingml/2006/main"
NS = {"p": PML_NS, "a": DML_NS}


class PptxReadError(ValueError):
    """Raised when a PPTX file cannot be read safely."""


@dataclass(frozen=True)
class FontSignature:
    typeface: str | None
    size: int | None
    bold: bool | None
    italic: bool | None

    def is_informative(self) -> bool:
        return any(
            value is not None
            for value in (self.typeface, self.size, self.bold, self.italic)
        )

    def as_dict(self) -> dict[str, object]:
        return {
            "typeface": self.typeface,
            "size": self.size,
            "bold": self.bold,
            "italic": self.italic,
        }


@dataclass(frozen=True)
class Paragraph:
    text: str
    level: int | None
    margin_left: str | None
    indent: str | None
    space_before: str | None
    space_after: str | None
    line_spacing: str | None
    font_signatures: tuple[FontSignature, ...]


@dataclass(frozen=True)
class TextBody:
    shape_index: int
    shape_name: str
    paragraphs: tuple[Paragraph, ...]


@dataclass(frozen=True)
class Slide:
    slide_number: int
    text_bodies: tuple[TextBody, ...]


@dataclass(frozen=True)
class Presentation:
    slides: tuple[Slide, ...]


def load_presentation(path: str | Path) -> Presentation:
    pptx_path = Path(path)
    if pptx_path.suffix.lower() != ".pptx":
        raise PptxReadError(f"Expected a .pptx file: {pptx_path}")
    if not pptx_path.exists():
        raise PptxReadError(f"File not found: {pptx_path}")

    try:
        with ZipFile(pptx_path) as archive:
            names = set(archive.namelist())
            if "ppt/presentation.xml" not in names:
                raise PptxReadError("Missing ppt/presentation.xml in archive.")

            slide_names = sorted(
                (name for name in names if re.fullmatch(r"ppt/slides/slide\d+\.xml", name)),
                key=_slide_sort_key,
            )
            if not slide_names:
                raise PptxReadError("No slide XML files found in archive.")

            slides = tuple(
                _parse_slide(slide_index + 1, archive.read(slide_name))
                for slide_index, slide_name in enumerate(slide_names)
            )
    except BadZipFile as exc:
        raise PptxReadError(f"Invalid .pptx archive: {pptx_path}") from exc

    return Presentation(slides=slides)


def _slide_sort_key(slide_name: str) -> int:
    match = re.search(r"slide(\d+)\.xml$", slide_name)
    if match is None:
        return 0
    return int(match.group(1))


def _parse_slide(slide_number: int, slide_xml: bytes) -> Slide:
    root = ET.fromstring(slide_xml)
    text_bodies: list[TextBody] = []

    for shape_index, shape in enumerate(root.findall(".//p:sp", NS), start=1):
        text_body = shape.find("p:txBody", NS)
        if text_body is None:
            continue

        c_nv_pr = shape.find("p:nvSpPr/p:cNvPr", NS)
        if c_nv_pr is not None:
            shape_name = c_nv_pr.attrib.get("name", f"Shape {shape_index}")
        else:
            shape_name = f"Shape {shape_index}"

        paragraphs = tuple(_parse_paragraph(paragraph) for paragraph in text_body.findall("a:p", NS))
        if any(paragraph.text for paragraph in paragraphs):
            text_bodies.append(
                TextBody(
                    shape_index=shape_index,
                    shape_name=shape_name,
                    paragraphs=paragraphs,
                )
            )

    return Slide(slide_number=slide_number, text_bodies=tuple(text_bodies))


def _parse_paragraph(paragraph: ET.Element) -> Paragraph:
    p_pr = paragraph.find("a:pPr", NS)
    font_signatures = tuple(_run_font_signature(run) for run in paragraph.findall("a:r", NS))
    return Paragraph(
        text="".join(run.text or "" for run in paragraph.findall("a:r/a:t", NS)).strip(),
        level=_parse_int(_attrib(p_pr, "lvl")),
        margin_left=_attrib(p_pr, "marL"),
        indent=_attrib(p_pr, "indent"),
        space_before=_spacing_value(p_pr, "a:spcBef"),
        space_after=_spacing_value(p_pr, "a:spcAft"),
        line_spacing=_spacing_value(p_pr, "a:lnSpc"),
        font_signatures=font_signatures,
    )


def _run_font_signature(run: ET.Element) -> FontSignature:
    r_pr = run.find("a:rPr", NS)
    latin = r_pr.find("a:latin", NS) if r_pr is not None else None
    return FontSignature(
        typeface=latin.attrib.get("typeface") if latin is not None else None,
        size=_parse_int(_attrib(r_pr, "sz")),
        bold=_parse_bool(_attrib(r_pr, "b")),
        italic=_parse_bool(_attrib(r_pr, "i")),
    )


def _spacing_value(p_pr: ET.Element | None, child_name: str) -> str | None:
    if p_pr is None:
        return None
    child = p_pr.find(child_name, NS)
    if child is None or len(child) == 0:
        return None
    value_node = child[0]
    val = value_node.attrib.get("val")
    if val is None:
        return None
    tag_name = value_node.tag.split("}", 1)[-1]
    return f"{tag_name}:{val}"


def _attrib(element: ET.Element | None, name: str) -> str | None:
    if element is None:
        return None
    return element.attrib.get(name)


def _parse_int(value: str | None) -> int | None:
    if value is None:
        return None
    try:
        return int(value)
    except ValueError:
        return None


def _parse_bool(value: str | None) -> bool | None:
    if value is None:
        return None
    if value == "1":
        return True
    if value == "0":
        return False
    return None
