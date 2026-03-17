"""
Stage 5 – Newsletter Generation
Produces three output artefacts:
  1. output/processed_articles.json  – Full scored/filtered dataset
  2. output/processed_articles.csv   – Same data as CSV (raw data deliverable)
  3. output/FMCG_Deal_Newsletter.xlsx – Formatted Excel newsletter

Excel workbook structure
------------------------
  Sheet 1 – "Newsletter"   : Beautifully formatted one-page newsletter draft
  Sheet 2 – "Deal Summary" : Pivot-style table: deals grouped by type with KPIs
  Sheet 3 – "All Articles" : Full scored article table for analyst reference
  Sheet 4 – "Pipeline Log" : Stage-by-stage record count / removal log
"""

import json
import csv
import os
from datetime import date, datetime

import openpyxl
from openpyxl.styles import (
    Font, PatternFill, Alignment, Border, Side, GradientFill
)
from openpyxl.utils import get_column_letter
from openpyxl.chart import BarChart, Reference


# ── Colour palette (FMCG-neutral, professional) ──────────────────────────────
NAVY      = "1B3A5C"
TEAL      = "0D7377"
GOLD      = "C9962B"
LIGHT_BG  = "EFF4FA"
MID_BG    = "D6E4F0"
WHITE     = "FFFFFF"
DARK_TEXT = "1A1A2E"
GREY_TEXT = "5A6375"
RED_ALERT = "C0392B"
GREEN_OK  = "1E8449"

DEAL_TYPE_COLORS = {
    "Acquisition":       "1B3A5C",
    "M&A":               "1B3A5C",
    "Merger":            "0D7377",
    "Investment":        "1E8449",
    "Divestiture":       "7D3C98",
    "Stake Acquisition": "1A5276",
    "Joint Venture":     "935116",
    "Other":             "5A6375",
}


def _hex_fill(hex_color: str) -> PatternFill:
    return PatternFill("solid", fgColor=hex_color)


def _font(bold=False, color=DARK_TEXT, size=10, italic=False) -> Font:
    return Font(bold=bold, color=color, size=size, italic=italic, name="Calibri")


def _border(style="thin") -> Border:
    s = Side(style=style)
    return Border(left=s, right=s, top=s, bottom=s)


def _align(h="left", v="center", wrap=False) -> Alignment:
    return Alignment(horizontal=h, vertical=v, wrap_text=wrap)


# ── Helper: write a cell ──────────────────────────────────────────────────────
def _w(ws, row, col, value, bold=False, color=DARK_TEXT, size=10,
       bg=None, align_h="left", wrap=False, italic=False, border=False):
    cell = ws.cell(row=row, column=col, value=value)
    cell.font = _font(bold=bold, color=color, size=size, italic=italic)
    cell.alignment = _align(h=align_h, wrap=wrap)
    if bg:
        cell.fill = _hex_fill(bg)
    if border:
        cell.border = _border()
    return cell


# ═══════════════════════════════════════════════════════════════════════════════
# Sheet 1: Newsletter
# ═══════════════════════════════════════════════════════════════════════════════

def _build_newsletter_sheet(ws, articles: list[dict], pipeline_log: list[dict]):
    ws.sheet_view.showGridLines = False
    ws.column_dimensions["A"].width = 3
    for col_letter in ["B", "C", "D", "E", "F", "G", "H"]:
        ws.column_dimensions[col_letter].width = 22
    ws.column_dimensions["I"].width = 3

    issue_date = date.today().strftime("%B %d, %Y")
    top_deals = [a for a in articles if a.get("score_deal", 0) >= 10][:10]

    row = 1

    # ── Banner ────────────────────────────────────────────────────────────────
    ws.merge_cells(f"B{row}:H{row}")
    _w(ws, row, 2, "FMCG DEAL INTELLIGENCE", bold=True, color=WHITE,
       size=20, bg=NAVY, align_h="center")
    ws.row_dimensions[row].height = 36
    row += 1

    ws.merge_cells(f"B{row}:H{row}")
    _w(ws, row, 2, f"M&A · Investments · Divestitures  |  {issue_date}",
       color=WHITE, size=11, bg=TEAL, align_h="center", italic=True)
    ws.row_dimensions[row].height = 22
    row += 1

    ws.merge_cells(f"B{row}:H{row}")
    _w(ws, row, 2, "", bg=MID_BG)
    ws.row_dimensions[row].height = 8
    row += 1

    # ── KPI strip ─────────────────────────────────────────────────────────────
    total_deals = len(top_deals)
    deal_types = {}
    for a in top_deals:
        dt = a.get("deal_type_detected", "Other")
        deal_types[dt] = deal_types.get(dt, 0) + 1

    acquisitions = deal_types.get("Acquisition", 0) + deal_types.get("M&A", 0)
    investments  = deal_types.get("Investment", 0)
    divestitures = deal_types.get("Divestiture", 0)
    other_deals  = total_deals - acquisitions - investments - divestitures

    kpis = [
        ("DEALS TRACKED", str(total_deals), NAVY),
        ("ACQUISITIONS",  str(acquisitions), TEAL),
        ("INVESTMENTS",   str(investments),  GREEN_OK),
        ("DIVESTITURES",  str(divestitures), "7D3C98"),
    ]
    kpi_cols = [2, 4, 6, 8]
    for (label, val, color), col in zip(kpis, kpi_cols):
        ws.merge_cells(start_row=row, start_column=col,
                       end_row=row, end_column=col + 1)
        _w(ws, row, col, label, bold=True, color=WHITE, size=9,
           bg=color, align_h="center")
    ws.row_dimensions[row].height = 18
    row += 1

    for (label, val, color), col in zip(kpis, kpi_cols):
        ws.merge_cells(start_row=row, start_column=col,
                       end_row=row, end_column=col + 1)
        _w(ws, row, col, val, bold=True, color=color, size=22,
           align_h="center", bg=LIGHT_BG)
    ws.row_dimensions[row].height = 34
    row += 1

    ws.merge_cells(f"B{row}:H{row}")
    _w(ws, row, 2, "", bg=MID_BG)
    ws.row_dimensions[row].height = 10
    row += 1

    # ── Editor's Note ─────────────────────────────────────────────────────────
    ws.merge_cells(f"B{row}:H{row}")
    _w(ws, row, 2, "EDITOR'S NOTE", bold=True, color=WHITE, size=10, bg=NAVY)
    ws.row_dimensions[row].height = 18
    row += 1

    editors_note = (
        f"This edition monitors {len(articles)} unique deal-related articles "
        f"sourced from Tier-1 and Tier-2 financial outlets (Reuters, Bloomberg, FT, WSJ, CNBC and peers). "
        f"Pipeline removed duplicates/near-duplicates and filtered for FMCG relevance. "
        f"All deal values are as reported by sources; exchange-rate differences may apply. "
        f"This newsletter is AI-assisted and intended for internal strategy use only."
    )
    ws.merge_cells(f"B{row}:H{row}")
    _w(ws, row, 2, editors_note, color=GREY_TEXT, size=9,
       bg=LIGHT_BG, wrap=True, italic=True)
    ws.row_dimensions[row].height = 46
    row += 1

    ws.merge_cells(f"B{row}:H{row}")
    _w(ws, row, 2, "", bg=MID_BG)
    ws.row_dimensions[row].height = 8
    row += 1

    # ── Deal sections by type ─────────────────────────────────────────────────
    sections = {
        "Acquisitions & Mergers": [a for a in top_deals
                                   if a.get("deal_type_detected") in
                                   ("Acquisition", "M&A", "Merger", "Stake Acquisition")],
        "Investments & Funding Rounds": [a for a in top_deals
                                         if a.get("deal_type_detected") == "Investment"],
        "Divestitures & Exits": [a for a in top_deals
                                 if a.get("deal_type_detected") == "Divestiture"],
        "Other Noteworthy Activity": [a for a in top_deals
                                      if a.get("deal_type_detected") not in
                                      ("Acquisition", "M&A", "Merger",
                                       "Stake Acquisition", "Investment", "Divestiture")],
    }
    section_colors = {
        "Acquisitions & Mergers": NAVY,
        "Investments & Funding Rounds": GREEN_OK,
        "Divestitures & Exits": "7D3C98",
        "Other Noteworthy Activity": TEAL,
    }

    for section_title, section_articles in sections.items():
        if not section_articles:
            continue

        # Section header
        ws.merge_cells(f"B{row}:H{row}")
        _w(ws, row, 2, f"  {section_title.upper()}",
           bold=True, color=WHITE, size=10,
           bg=section_colors[section_title])
        ws.row_dimensions[row].height = 20
        row += 1

        # Column headers for article table
        headers = ["Date", "Headline", "Summary", "Source", "Deal Score", "Credibility"]
        col_map = [2, 3, 5, 7, 8, 9]  # col index (B=2 .. I=9)
        col_spans = [1, 2, 2, 1, 1, 1]  # merge widths

        for header, col, span in zip(headers, col_map, col_spans):
            end_col = col + span - 1
            if span > 1:
                ws.merge_cells(start_row=row, start_column=col,
                               end_row=row, end_column=end_col)
            _w(ws, row, col, header, bold=True, color=WHITE, size=9,
               bg=TEAL, align_h="center", border=True)
        ws.row_dimensions[row].height = 18
        row += 1

        # Article rows
        for i, article in enumerate(section_articles):
            bg = WHITE if i % 2 == 0 else LIGHT_BG
            pub_date = article.get("published_date", "")
            title    = article.get("title", "")
            summary  = article.get("summary", "")[:200] + ("…" if len(article.get("summary", "")) > 200 else "")
            source   = article.get("source", "")
            deal_s   = f"{article.get('score_deal', 0):.0f}/40"
            cred_s   = f"{article.get('credibility_score', 0)}/10"
            tier     = article.get('source_tier', 0)
            cred_bg  = GREEN_OK if tier == 1 else (TEAL if tier == 2 else GREY_TEXT)

            _w(ws, row, 2, pub_date,  size=9, bg=bg, align_h="center", border=True)
            ws.merge_cells(start_row=row, start_column=3,
                           end_row=row, end_column=4)
            _w(ws, row, 3, title, bold=True, size=9, bg=bg, wrap=True, border=True)
            ws.merge_cells(start_row=row, start_column=5,
                           end_row=row, end_column=6)
            _w(ws, row, 5, summary, size=8, bg=bg, wrap=True,
               color=GREY_TEXT, border=True)
            _w(ws, row, 7, source,  size=9, bg=bg, align_h="center", border=True)
            _w(ws, row, 8, deal_s,  size=9, bg=bg, align_h="center", border=True)
            _w(ws, row, 9, cred_s,  size=9, bg=cred_bg,
               color=WHITE, align_h="center", border=True)
            ws.row_dimensions[row].height = 52
            row += 1

        # Section spacer
        ws.merge_cells(f"B{row}:H{row}")
        _w(ws, row, 2, "", bg=MID_BG)
        ws.row_dimensions[row].height = 8
        row += 1

    # ── Footer ────────────────────────────────────────────────────────────────
    ws.merge_cells(f"B{row}:H{row}")
    _w(ws, row, 2,
       f"Generated by FMCG Deal Intelligence Pipeline  |  {issue_date}  |  "
       f"Sources: Reuters, Bloomberg, FT, WSJ, CNBC & industry press  |  "
       f"For internal use only – not for redistribution",
       size=8, color=WHITE, bg=NAVY, align_h="center", italic=True, wrap=True)
    ws.row_dimensions[row].height = 28


# ═══════════════════════════════════════════════════════════════════════════════
# Sheet 2: Deal Summary
# ═══════════════════════════════════════════════════════════════════════════════

def _build_summary_sheet(ws, articles: list[dict]):
    ws.sheet_view.showGridLines = False
    ws.column_dimensions["A"].width = 3
    col_widths = {"B": 25, "C": 15, "D": 18, "E": 20, "F": 18, "G": 3}
    for col, w in col_widths.items():
        ws.column_dimensions[col].width = w

    row = 1
    ws.merge_cells(f"B{row}:F{row}")
    _w(ws, row, 2, "DEAL SUMMARY — BY TYPE", bold=True,
       color=WHITE, size=13, bg=NAVY, align_h="center")
    ws.row_dimensions[row].height = 28
    row += 2

    # Group by deal type
    groups: dict[str, list[dict]] = {}
    for a in articles:
        dt = a.get("deal_type_detected", "Other")
        groups.setdefault(dt, []).append(a)

    # Table header
    headers = ["Deal Type", "# Deals", "Avg Relevance Score",
               "Avg Credibility Score", "Sources (sample)"]
    for i, h in enumerate(headers, start=2):
        _w(ws, row, i, h, bold=True, color=WHITE, size=10,
           bg=TEAL, align_h="center", border=True)
    ws.row_dimensions[row].height = 20
    row += 1

    chart_categories = []
    chart_counts     = []

    for dt, items in sorted(groups.items(), key=lambda x: -len(x[1])):
        avg_rel  = sum(a.get("relevance_score", 0) for a in items) / len(items)
        avg_cred = sum(a.get("credibility_score", 0) for a in items) / len(items)
        sources  = ", ".join(sorted({a.get("source", "") for a in items})[:3])
        bg_hex   = DEAL_TYPE_COLORS.get(dt, GREY_TEXT)

        _w(ws, row, 2, dt,          bold=True, color=WHITE, size=10,
           bg=bg_hex, border=True)
        _w(ws, row, 3, len(items),  size=10, align_h="center", border=True,
           bg=LIGHT_BG)
        _w(ws, row, 4, f"{avg_rel:.1f}",  size=10, align_h="center",
           border=True, bg=LIGHT_BG)
        _w(ws, row, 5, f"{avg_cred:.1f}", size=10, align_h="center",
           border=True, bg=LIGHT_BG)
        _w(ws, row, 6, sources,     size=9, color=GREY_TEXT, border=True,
           bg=LIGHT_BG, wrap=True)

        chart_categories.append(dt)
        chart_counts.append(len(items))
        ws.row_dimensions[row].height = 22
        row += 1

    row += 2

    # ── Bar chart ─────────────────────────────────────────────────────────────
    chart = BarChart()
    chart.type = "col"
    chart.title = "Deal Count by Type"
    chart.style = 10
    chart.y_axis.title = "Number of Deals"
    chart.x_axis.title = "Deal Type"
    chart.width = 18
    chart.height = 12

    # Write data for chart
    ws.cell(row=row, column=2, value="Deal Type")
    ws.cell(row=row, column=3, value="Count")
    for i, (cat, cnt) in enumerate(zip(chart_categories, chart_counts), start=1):
        ws.cell(row=row + i, column=2, value=cat)
        ws.cell(row=row + i, column=3, value=cnt)

    data = Reference(ws, min_col=3, min_row=row, max_row=row + len(chart_categories))
    cats = Reference(ws, min_col=2, min_row=row + 1, max_row=row + len(chart_categories))
    chart.add_data(data, titles_from_data=True)
    chart.set_categories(cats)
    ws.add_chart(chart, f"B{row + len(chart_categories) + 2}")


# ═══════════════════════════════════════════════════════════════════════════════
# Sheet 3: All Articles
# ═══════════════════════════════════════════════════════════════════════════════

def _build_articles_sheet(ws, articles: list[dict]):
    ws.sheet_view.showGridLines = True
    headers = [
        "ID", "Title", "Source", "Published Date", "Deal Type",
        "FMCG Score", "Deal Score", "Recency Score", "Credibility Score",
        "Relevance Score", "Source Tier", "Credibility Flag", "URL",
    ]
    field_map = [
        "id", "title", "source", "published_date", "deal_type_detected",
        "score_fmcg", "score_deal", "score_recency", "credibility_score",
        "relevance_score", "source_tier", "credibility_flag", "url",
    ]
    col_widths = [6, 50, 18, 14, 18, 12, 12, 13, 17, 15, 12, 30, 40]

    for i, (h, w) in enumerate(zip(headers, col_widths), start=1):
        ws.column_dimensions[get_column_letter(i)].width = w
        cell = ws.cell(row=1, column=i, value=h)
        cell.font = _font(bold=True, color=WHITE)
        cell.fill = _hex_fill(NAVY)
        cell.alignment = _align(h="center")
        cell.border = _border()
    ws.row_dimensions[1].height = 20

    for r, article in enumerate(articles, start=2):
        bg = LIGHT_BG if r % 2 == 0 else WHITE
        for c, field in enumerate(field_map, start=1):
            val = article.get(field, "")
            cell = ws.cell(row=r, column=c, value=val)
            cell.font = _font(size=9)
            cell.fill = _hex_fill(bg)
            cell.alignment = _align(wrap=True)
            cell.border = _border()
        ws.row_dimensions[r].height = 30


# ═══════════════════════════════════════════════════════════════════════════════
# Sheet 4: Pipeline Log
# ═══════════════════════════════════════════════════════════════════════════════

def _build_pipeline_log_sheet(ws, pipeline_log: list[dict]):
    ws.sheet_view.showGridLines = False
    ws.column_dimensions["A"].width = 3
    col_widths = {"B": 30, "C": 20, "D": 20, "E": 40, "F": 3}
    for col, w in col_widths.items():
        ws.column_dimensions[col].width = w

    row = 1
    ws.merge_cells(f"B{row}:E{row}")
    _w(ws, row, 2, "PIPELINE EXECUTION LOG", bold=True,
       color=WHITE, size=13, bg=NAVY, align_h="center")
    ws.row_dimensions[row].height = 26
    row += 2

    headers = ["Stage", "Input Records", "Output Records", "Notes"]
    for i, h in enumerate(headers, start=2):
        _w(ws, row, i, h, bold=True, color=WHITE, size=10,
           bg=TEAL, align_h="center", border=True)
    ws.row_dimensions[row].height = 20
    row += 1

    stage_colors = [NAVY, TEAL, GREEN_OK, "7D3C98", GOLD]
    for i, entry in enumerate(pipeline_log):
        bg = LIGHT_BG if i % 2 == 0 else WHITE
        color = stage_colors[i % len(stage_colors)]
        _w(ws, row, 2, entry.get("stage", ""),    bold=True, color=WHITE,
           bg=color, size=10, border=True)
        _w(ws, row, 3, entry.get("input", ""),    size=10, align_h="center",
           bg=bg, border=True)
        _w(ws, row, 4, entry.get("output", ""),   size=10, align_h="center",
           bg=bg, border=True)
        _w(ws, row, 5, entry.get("notes", ""),    size=9, color=GREY_TEXT,
           bg=bg, border=True, wrap=True)
        ws.row_dimensions[row].height = 28
        row += 1

    row += 2
    ws.merge_cells(f"B{row}:E{row}")
    _w(ws, row, 2,
       "PIPELINE DESIGN NOTES  ·  "
       "Stage 1 Ingestion: loads CSV/JSON; normalises fields. "
       "Stage 2 De-dup: exact hash dedup → TF-IDF cosine similarity ≥0.55 near-dedup (union-find clustering). "
       "Stage 3 Relevance: FMCG keyword score (0–40) + deal keyword score (0–40) + recency bonus (0–10); "
       "threshold = 8 combined (FMCG+deal). "
       "Stage 4 Credibility: 3-tier source whitelist (Reuters/Bloomberg Tier-1 = 9 pts; "
       "CNBC/BBC Tier-2 = 7 pts; Trade press Tier-3 = 5 pts; unknown = 3; blocked = 0). "
       "Stage 5 Newsletter: top articles ranked by composite score → Excel workbook.",
       size=9, color=GREY_TEXT, wrap=True, bg=LIGHT_BG)
    ws.row_dimensions[row].height = 80


# ═══════════════════════════════════════════════════════════════════════════════
# Main entry-point
# ═══════════════════════════════════════════════════════════════════════════════

def generate(
    articles: list[dict],
    pipeline_log: list[dict],
    output_dir: str = "output",
):
    """
    Write all output files.
    Returns dict of output file paths.
    """
    os.makedirs(output_dir, exist_ok=True)

    # ── 1. JSON ───────────────────────────────────────────────────────────────
    json_path = os.path.join(output_dir, "processed_articles.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(articles, f, indent=2, default=str)

    # ── 2. CSV ────────────────────────────────────────────────────────────────
    csv_path = os.path.join(output_dir, "processed_articles.csv")
    if articles:
        fieldnames = list(articles[0].keys())
        with open(csv_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(articles)

    # ── 3. Excel ──────────────────────────────────────────────────────────────
    xlsx_path = os.path.join(output_dir, "FMCG_Deal_Newsletter.xlsx")
    wb = openpyxl.Workbook()

    # Rename default sheet
    ws_news = wb.active
    ws_news.title = "Newsletter"
    ws_news.sheet_view.showGridLines = False

    ws_summary  = wb.create_sheet("Deal Summary")
    ws_articles = wb.create_sheet("All Articles")
    ws_log      = wb.create_sheet("Pipeline Log")

    _build_newsletter_sheet(ws_news,     articles, pipeline_log)
    _build_summary_sheet(ws_summary,     articles)
    _build_articles_sheet(ws_articles,   articles)
    _build_pipeline_log_sheet(ws_log,    pipeline_log)

    # Set tab colours
    ws_news.sheet_properties.tabColor     = NAVY
    ws_summary.sheet_properties.tabColor  = TEAL
    ws_articles.sheet_properties.tabColor = GREEN_OK
    ws_log.sheet_properties.tabColor      = GOLD

    wb.save(xlsx_path)

    print(f"[Newsletter] Outputs written to '{output_dir}/':")
    print(f"             → {os.path.basename(json_path)}")
    print(f"             → {os.path.basename(csv_path)}")
    print(f"             → {os.path.basename(xlsx_path)}")

    return {
        "json":  json_path,
        "csv":   csv_path,
        "xlsx":  xlsx_path,
    }
