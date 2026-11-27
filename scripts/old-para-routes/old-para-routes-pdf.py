"""Writes the list of every old Para route as a PDF, for the owner to read and mark up.

Each route with its Para ID, name, mode, whether the old app verified it and whether it has a
line, grouped by mode. Read from the source file (old-para-routes.v1.json), not the studio's
files, so it lists what the old app held. The PDF is not committed.

    python3 scripts/old-para-routes/old-para-routes-pdf.py <out.pdf>

Needs reportlab (pip install reportlab).
"""

import json
import sys
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

SOURCE = Path(__file__).with_name("old-para-routes.v1.json")
MODES = [("jeepney", "Jeepney"), ("bus", "Bus"), ("uv", "UV Express")]


def route_rows(routes, styles):
    """The table's rows: a header, then one route each, in Para ID order."""
    cell = styles["BodyText"].clone("cell", fontSize=8, leading=10)
    rows = [["Para ID", "Name", "Verified", "Line"]]
    for route in sorted(routes, key=lambda r: r["paraId"]):
        rows.append(
            [
                route["paraId"],
                Paragraph(route["name"].replace("&", "&amp;").replace("<", "&lt;"), cell),
                "Verified" if route["isVerified"] else "Unverified",
                "Has line" if route["line"] else "No line",
            ]
        )
    return rows


def table_of(rows):
    table = Table(rows, colWidths=[22 * mm, 108 * mm, 22 * mm, 20 * mm], repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("FONT", (0, 0), (-1, 0), "Helvetica-Bold", 8),
                ("FONT", (0, 1), (-1, -1), "Helvetica", 8),
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e5e7eb")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f6f7f9")]),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LINEBELOW", (0, 0), (-1, 0), 0.5, colors.grey),
            ]
        )
    )
    return table


def main():
    if len(sys.argv) != 2:
        sys.exit("Usage: python3 scripts/old-para-routes/old-para-routes-pdf.py <out.pdf>")
    source = json.loads(SOURCE.read_text(encoding="utf-8"))
    routes = source["routes"]
    styles = getSampleStyleSheet()
    with_line = sum(1 for r in routes if r["line"])
    verified = sum(1 for r in routes if r["isVerified"])
    story = [
        Paragraph("Old Para routes", styles["Title"]),
        Paragraph(
            f"{len(routes)} routes from the old Para app's database (backup of 2026-10-30): "
            f"{with_line} with a line, {verified} verified. Extracted {source['extractedAt']}.",
            styles["BodyText"],
        ),
        Spacer(1, 4 * mm),
    ]
    for index, (mode, label) in enumerate(MODES):
        of_mode = [r for r in routes if r["mode"] == mode]
        if index > 0:
            story.append(PageBreak())
        story.append(Paragraph(f"{label} ({len(of_mode)})", styles["Heading2"]))
        story.append(table_of(route_rows(of_mode, styles)))
    unknown = [r for r in routes if r["mode"] not in dict(MODES)]
    if unknown:
        sys.exit(f"{len(unknown)} routes have a mode the list does not know: {unknown[0]['mode']}")

    def footer(canvas, doc):
        canvas.setFont("Helvetica", 7)
        canvas.drawRightString(A4[0] - 15 * mm, 10 * mm, f"Page {doc.page}")

    doc = SimpleDocTemplate(
        sys.argv[1],
        pagesize=A4,
        leftMargin=15 * mm,
        rightMargin=15 * mm,
        topMargin=15 * mm,
        bottomMargin=15 * mm,
        title="Old Para routes",
    )
    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    print(f"Wrote {sys.argv[1]}: {len(routes)} routes.", file=sys.stderr)


if __name__ == "__main__":
    main()
