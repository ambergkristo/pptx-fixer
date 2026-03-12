from __future__ import annotations

import io
import json
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path
from zipfile import ZipFile

from pptx_fixer.audit import audit_pptx
from pptx_fixer.cli import main
from pptx_fixer.pptx_reader import PptxReadError


CONTENT_TYPES_XML = """<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
</Types>
"""

ROOT_RELS_XML = """<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>
"""

PRESENTATION_XML = """<?xml version="1.0" encoding="UTF-8"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:sldIdLst>
    <p:sldId id="256" r:id="rId1" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/>
  </p:sldIdLst>
</p:presentation>
"""

PRESENTATION_RELS_XML = """<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/>
</Relationships>
"""


def make_slide_xml(paragraphs: list[str]) -> str:
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr/>
      <p:sp>
        <p:nvSpPr>
          <p:cNvPr id="2" name="Body 1"/>
          <p:cNvSpPr/>
          <p:nvPr/>
        </p:nvSpPr>
        <p:spPr/>
        <p:txBody>
          <a:bodyPr/>
          <a:lstStyle/>
          {''.join(paragraphs)}
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:sld>
"""


def paragraph_xml(
    text: str,
    *,
    typeface: str = "Arial",
    size: int = 1800,
    bold: int = 0,
    italic: int = 0,
    margin_left: str = "171450",
    indent: str = "-171450",
    space_after: str = "0",
    level: int = 0,
) -> str:
    return f"""
<a:p>
  <a:pPr lvl="{level}" marL="{margin_left}" indent="{indent}">
    <a:spcAft><a:spcPts val="{space_after}"/></a:spcAft>
  </a:pPr>
  <a:r>
    <a:rPr sz="{size}" b="{bold}" i="{italic}">
      <a:latin typeface="{typeface}"/>
    </a:rPr>
    <a:t>{text}</a:t>
  </a:r>
</a:p>
"""


def build_pptx(path: Path, slide_xml: str) -> None:
    with ZipFile(path, "w") as archive:
        archive.writestr("[Content_Types].xml", CONTENT_TYPES_XML)
        archive.writestr("_rels/.rels", ROOT_RELS_XML)
        archive.writestr("ppt/presentation.xml", PRESENTATION_XML)
        archive.writestr("ppt/_rels/presentation.xml.rels", PRESENTATION_RELS_XML)
        archive.writestr("ppt/slides/slide1.xml", slide_xml)


class AuditTests(unittest.TestCase):
    def test_audit_returns_empty_report_for_consistent_text_body(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            pptx_path = Path(temp_dir) / "consistent.pptx"
            slide_xml = make_slide_xml(
                [
                    paragraph_xml("Alpha"),
                    paragraph_xml("Beta"),
                ]
            )
            build_pptx(pptx_path, slide_xml)

            report = audit_pptx(pptx_path)

            self.assertEqual(report["summary"]["issue_count"], 0)
            self.assertEqual(report["issues"], [])
            self.assertEqual(report["source"]["slides"], 1)

    def test_audit_detects_font_and_spacing_drift(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            pptx_path = Path(temp_dir) / "drift.pptx"
            slide_xml = make_slide_xml(
                [
                    paragraph_xml("Alpha"),
                    paragraph_xml("Beta", typeface="Calibri"),
                    paragraph_xml("Gamma", margin_left="228600", indent="-114300", space_after="200"),
                ]
            )
            build_pptx(pptx_path, slide_xml)

            report = audit_pptx(pptx_path)

            rule_ids = {issue["rule_id"] for issue in report["issues"]}
            self.assertEqual(report["summary"]["issue_count"], 3)
            self.assertEqual(rule_ids, {"RULE_001", "RULE_002", "RULE_003"})

    def test_cli_prints_json_report(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            pptx_path = Path(temp_dir) / "consistent.pptx"
            slide_xml = make_slide_xml([paragraph_xml("Alpha"), paragraph_xml("Beta")])
            build_pptx(pptx_path, slide_xml)

            stdout = io.StringIO()
            with redirect_stdout(stdout):
                exit_code = main([str(pptx_path), "--indent", "0"])

            self.assertEqual(exit_code, 0)
            parsed = json.loads(stdout.getvalue())
            self.assertEqual(parsed["mode"], "audit")
            self.assertEqual(parsed["summary"]["issue_count"], 0)

    def test_rejects_non_pptx_input(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            invalid_path = Path(temp_dir) / "not-a-pptx.txt"
            invalid_path.write_text("plain text", encoding="utf-8")

            with self.assertRaises(PptxReadError):
                audit_pptx(invalid_path)


if __name__ == "__main__":
    unittest.main()
