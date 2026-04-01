#!/usr/bin/env python3
"""Generate PDF for the 5-year business case."""
import os
from fpdf import FPDF

OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))

class AvennorthPDF(FPDF):
    def header(self):
        self.set_font("Helvetica", "B", 8)
        self.set_text_color(100, 100, 120)
        self.cell(0, 6, "AVENNORTH  |  CONFIDENTIAL", new_x="LMARGIN", new_y="NEXT")
        self.ln(4)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "", 7)
        self.set_text_color(100, 100, 120)
        self.cell(0, 10, "Avennorth Pathfinder + Intelligence Platform  |  Page %d" % self.page_no(), align="C")

    def h1(self, text):
        self.set_font("Helvetica", "B", 18)
        self.set_text_color(20, 20, 30)
        self.cell(0, 12, text, new_x="LMARGIN", new_y="NEXT")
        self.ln(2)

    def h2(self, text, color=(0, 150, 80)):
        self.set_font("Helvetica", "B", 13)
        self.set_text_color(*color)
        self.cell(0, 9, text, new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(*color)
        self.line(self.get_x(), self.get_y(), self.get_x() + 50, self.get_y())
        self.ln(4)

    def h3(self, text):
        self.set_font("Helvetica", "B", 10)
        self.set_text_color(50, 50, 70)
        self.cell(0, 7, text, new_x="LMARGIN", new_y="NEXT")
        self.ln(2)

    def p(self, text):
        self.set_font("Helvetica", "", 9)
        self.set_text_color(40, 40, 50)
        self.multi_cell(0, 5, text)
        self.ln(2)

    def row(self, label, value, note=""):
        self.set_font("Helvetica", "", 9)
        self.set_text_color(80, 80, 100)
        self.cell(55, 6, label)
        self.set_font("Helvetica", "B", 10)
        self.set_text_color(20, 20, 30)
        self.cell(35, 6, str(value))
        if note:
            self.set_font("Helvetica", "", 8)
            self.set_text_color(120, 120, 140)
            self.cell(0, 6, note)
        self.ln(6)

    def th(self, cols, widths):
        self.set_font("Helvetica", "B", 7)
        self.set_text_color(255, 255, 255)
        self.set_fill_color(30, 30, 50)
        for i, col in enumerate(cols):
            self.cell(widths[i], 6, col, border=1, fill=True, align="C")
        self.ln()

    def tr(self, cells, widths):
        self.set_font("Helvetica", "", 7)
        self.set_text_color(40, 40, 50)
        for i, cell in enumerate(cells):
            self.cell(widths[i], 5, str(cell), border=1, align="C" if i > 0 else "L")
        self.ln()


def generate():
    pdf = AvennorthPDF()
    pdf.set_auto_page_break(auto=True, margin=20)

    # Cover
    pdf.add_page()
    pdf.ln(30)
    pdf.set_font("Helvetica", "B", 28)
    pdf.set_text_color(20, 20, 30)
    pdf.cell(0, 14, "Avennorth Pathfinder", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 16)
    pdf.set_text_color(80, 80, 100)
    pdf.cell(0, 10, "Five-Year Business Case", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(10)
    pdf.set_font("Helvetica", "", 11)
    pdf.set_text_color(100, 100, 120)
    pdf.multi_cell(0, 6, "CMDB-first integration discovery with AI-powered intelligence,\nautonomous CMDB governance, and service map analytics.\n\nTwo packages: Standard (Discovery + CMDB Ops) and Professional\n(+ Integration Intelligence + Service Map Intelligence).\nDual-scenario model: ~$33M (moderate) to ~$84M (penetration) Y5 ARR.")
    pdf.ln(20)
    pdf.set_font("Helvetica", "", 9)
    pdf.cell(0, 6, "Version: Business Case v1.0  |  March 2026  |  Confidential")

    # Exec Summary
    pdf.add_page()
    pdf.h1("Executive Summary")
    pdf.p("Avennorth Pathfinder is a 4-product platform built for ServiceNow environments. Three structural advantages create a capital-efficient business bootstrappable from existing cash flow:")
    pdf.ln(2)
    for item in [
        "1. Existing Avennorth team (3 people, $420k/yr already budgeted) handles SN dev, QA, and architecture",
        "2. Claude-assisted development (2-3x productivity) - 10 phases, 104+ tests, 4 products built lean",
        "3. Compass distribution (zero sales team) - consulting firms sell Pathfinder as a SOW line item",
    ]:
        pdf.p(item)
    pdf.ln(2)
    pdf.h3("Key Numbers")
    for label, value in [("Y5 ARR (Likely)", "~$84.0M"), ("Y5 ARR (Bear/Bull/Best)", "$33M / $110M / $135M"), ("Year 5 Headcount", "~16"), ("Y5 EBITDA Margin", "91.6%"), ("Y5 Customers", "546 (Likely)"), ("Funding Required", "None (bootstrappable)")]:
        pdf.row(label, value)

    # Product Portfolio
    pdf.add_page()
    pdf.h2("Product Portfolio", (0, 180, 140))
    w = [42, 75, 35, 38]
    pdf.th(["Product", "Description", "Package", "Status"], w)
    for r in [
        ("Pathfinder Discovery", "Agents, Gateway, Classification, SN sync", "Standard", "Built"),
        ("CMDB Ops", "Automated hygiene, CI lifecycle, stale cleanup", "Standard", "Built"),
        ("Integration Intel", "AI health, summaries, EA recon, rationalize", "Professional", "Built"),
        ("Service Map Intel", "Coverage, risk, change impact, self-healing", "Professional", "Built"),
    ]:
        pdf.tr(r, w)
    pdf.ln(4)
    pdf.p("Intelligence layer is the moat. Discovery is table stakes; AI health scoring, autonomous CMDB agents, and change impact analysis have no direct competitor in the ServiceNow ecosystem.")

    # Revenue
    pdf.add_page()
    pdf.h2("Revenue Projections (Dual Scenario)", (60, 200, 120))
    pdf.h3("Likely Case (Penetration Pricing = Base Plan)")
    w2 = [15, 18, 18, 22, 22, 22, 22, 22]
    pdf.th(["Year", "Partners", "Clients", "ARR", "Revenue", "OpEx", "Cash Flow", "EBITDA"], w2)
    for r in [
        ("Y1", "0", "39", "$3.0M", "$1.5M", "$2.20M", "-$700k", "--"),
        ("Y2", "20", "94", "$10.2M", "$6.6M", "$3.20M", "+$3.4M", "--"),
        ("Y3", "45", "180", "$24.5M", "$17.0M", "$4.20M", "+$12.8M", "--"),
        ("Y4", "70", "301", "$48.0M", "$36.0M", "$5.80M", "+$30.2M", "--"),
        ("Y5", "100", "546", "$84.0M", "$66.0M", "$6.50M", "+$59.5M", "91.6%"),
    ]:
        pdf.tr(r, w2)
    pdf.ln(4)

    pdf.h3("Scenario Analysis")
    w3 = [40, 30, 30, 30, 30]
    pdf.th(["Metric", "Bear", "Likely (Base)", "Bull", "Best Case"], w3)
    for r in [
        ("Y5 ARR", "~$33M", "~$84M", "~$110M", "~$135M"),
        ("Y5 Customers", "217", "546", "710", "875"),
        ("Y5 EBITDA", "89.6%", "91.6%", "92.3%", "92.8%"),
        ("Profitable Y1?", "No", "Yes", "Yes", "Yes"),
    ]:
        pdf.tr(r, w3)

    # Staffing
    pdf.add_page()
    pdf.h2("Lean Staffing Model", (0, 200, 200))
    w4 = [15, 15, 15, 145]
    pdf.th(["Year", "Total", "New", "Key Hires"], w4)
    for r in [
        ("Y1", "5", "+2", "Go/Systems Eng ($190k) + Python/AI Eng ($185k). Existing: founder, SN dev, QA."),
        ("Y2", "7", "+2", "Go/Platform Eng ($180k) + Channel Manager ($140k)"),
        ("Y3", "9", "+2", "Support Eng ($130k) + Content Marketing ($120k)"),
        ("Y4", "11", "+2", "Senior AI/ML Eng ($210k) + 2nd Support ($130k)"),
        ("Y5", "14", "+3", "2nd Channel Mgr ($145k) + Platform Eng ($185k) + CSM ($125k)"),
    ]:
        pdf.tr(r, w4)
    pdf.ln(4)
    pdf.p("Likely: ~$84M ARR on ~16 people = ~$5.25M ARR/employee. Bear: ~$33M. Bull: ~$110M. Best: ~$135M. All scenarios vastly outperform typical SaaS ARR/employee ratios.")

    # Capital Efficiency
    pdf.h2("Capital Efficiency", (200, 200, 0))
    pdf.p("No sales team (Compass). No support org (partners handle tier-1). Minimal marketing (content only). AI-multiplied engineering (2-3x output). $50K starting price removes procurement friction.")
    pdf.ln(2)
    pdf.h3("Why Bootstrappable")
    pdf.p("Year 1 incremental cost is $610k (2 engineers + infrastructure + legal). Avennorth consulting revenue absorbs this. Break-even late Year 2. No pitch decks, no dilution, no board seats.")

    # Compass
    pdf.add_page()
    pdf.h2("Compass Channel Economics", (0, 200, 200))
    w5 = [45, 35, 35, 40]
    pdf.th(["Metric", "Direct Only", "Compass", "Impact"], w5)
    for r in [
        ("CAC", "$35-50k", "$8-15k", "~70% lower"),
        ("Sales Cycle", "3-6 months", "2-4 weeks", "~80% faster"),
        ("Sales Team (Y3)", "4-6 AEs", "1-2 channel mgrs", "~70% less HC"),
        ("Std->Pro Upgrade", "--", "15-35%/yr", "Standard surfaces gaps"),
        ("Y5 Cumulative CF", "--", "+$19.5M (mod.)", "Profitable from Y1 (pen.)"),
    ]:
        pdf.tr(r, w5)
    pdf.ln(4)
    pdf.p("Deal flow: Standard S-tier pilot ($50K/yr) -> Expand to M-tier ($90K/yr) -> Upgrade to Professional ($175K/yr). Partner earns 20-30% markup.")

    # Next Steps
    pdf.h2("Next Steps", (0, 150, 80))
    for step in [
        "1. Validate with 3-5 design partners (ServiceNow customers, free pilots)",
        "2. Hire Go/Systems engineer + Python/AI engineer",
        "3. File provisional patents (confidence model + autonomous agent lifecycle)",
        "4. Build Compass integration module (months 6-9)",
        "5. First paying customer (month 9-10)",
        "6. 15 Compass partners trained (Year 2 Q1)",
    ]:
        pdf.p(step)

    pdf.output(os.path.join(OUTPUT_DIR, "five-year-business-case.pdf"))
    print("Generated five-year-business-case.pdf")


if __name__ == "__main__":
    generate()
