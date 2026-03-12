from __future__ import annotations

import argparse
import json
import sys

from .audit import audit_pptx
from .pptx_reader import PptxReadError


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="pptx-fixer",
        description="Audit a PPTX file for obvious formatting drift.",
    )
    parser.add_argument("path", help="Path to a .pptx file")
    parser.add_argument(
        "--indent",
        type=int,
        default=2,
        help="JSON indentation level for the lint report output",
    )
    args = parser.parse_args(argv)

    try:
        report = audit_pptx(args.path)
    except PptxReadError as exc:
        print(str(exc), file=sys.stderr)
        return 2

    json.dump(report, sys.stdout, indent=args.indent)
    sys.stdout.write("\n")
    return 0
