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
    pdf.multi_cell(0, 6, "CMDB-first integration discovery with AI-powered intelligence,\nautonomous CMDB governance, and service map analytics.\n\nBuilt with Claude-assisted development. Sold through Compass.\nOperated with 14 people. $40M ARR by Year 5.")
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
    for label, value in [("Year 5 ARR", "$40.0M"), ("Year 5 Headcount", "14"), ("ARR/Employee", "$2.86M (11-19x industry median)"), ("Break-even", "Late Year 2"), ("5-Year Cumulative Profit", "~$37.5M"), ("Funding Required", "None (bootstrappable)")]:
        pdf.row(label, value)

    # Product Portfolio
    pdf.add_page()
    pdf.h2("Product Portfolio", (0, 180, 140))
    w = [42, 75, 35, 38]
    pdf.th(["Product", "Description", "Tier", "Status"], w)
    for r in [
        ("Pathfinder Discovery", "Agents, Gateway, Classification, SN sync", "Starter $15", "Built"),
        ("Integration Intel", "AI health, summaries, EA recon, rationalize", "Professional $28", "Built"),
        ("CMDB Ops Agent", "8 autonomous agents, 4 autonomy levels", "Enterprise $38", "Built"),
        ("Service Map Intel", "Coverage, risk, change impact, self-healing", "Enterprise $38", "Built"),
    ]:
        pdf.tr(r, w)
    pdf.ln(4)
    pdf.p("Intelligence layer is the moat. Discovery is table stakes; AI health scoring, autonomous CMDB agents, and change impact analysis have no direct competitor in the ServiceNow ecosystem.")

    # Revenue
    pdf.add_page()
    pdf.h2("Five-Year Revenue (Base Case)", (60, 200, 120))
    w2 = [15, 18, 18, 22, 22, 22, 22, 22]
    pdf.th(["Year", "Partners", "Clients", "ARR", "Revenue", "OpEx", "Cash Flow", "Cumulative"], w2)
    for r in [
        ("Y1", "0", "3", "$65k", "$25k", "$1.03M", "-$1.01M", "-$1.01M"),
        ("Y2", "15", "33", "$1.5M", "$900k", "$1.31M", "-$410k", "-$1.42M"),
        ("Y3", "40", "110", "$5.8M", "$4.2M", "$1.62M", "+$2.58M", "+$1.16M"),
        ("Y4", "75", "255", "$15.5M", "$11.5M", "$2.05M", "+$9.45M", "+$10.61M"),
        ("Y5", "110", "495", "$40.0M", "$29.5M", "$2.58M", "+$26.9M", "+$37.5M"),
    ]:
        pdf.tr(r, w2)
    pdf.ln(4)

    pdf.h3("Scenario Analysis")
    w3 = [45, 35, 35, 35]
    pdf.th(["Metric", "Conservative", "Base Case", "Aggressive"], w3)
    for r in [
        ("Y5 ARR", "$28.0M", "$40.0M", "$56.0M"),
        ("Y5 Clients", "347", "495", "693"),
        ("Break-even", "Early Y3", "Late Y2", "Mid Y2"),
        ("5-Year Profit", "$18.5M", "$37.5M", "$63.4M"),
        ("Funding Needed", "Maybe $500k", "None", "None"),
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
    pdf.p("Year 5: $40M ARR on 14 people = $2.86M ARR/employee. Typical SaaS at this ARR: 150-250 people at $150-250k ARR/employee.")

    # Capital Efficiency
    pdf.h2("Capital Efficiency", (200, 200, 0))
    pdf.p("No sales team (Compass). No support org (partners handle tier-1). Minimal marketing (content only). AI-multiplied engineering (2-3x output). Claude API tokens are 0.3% of revenue.")
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
        ("NRR", "120-130%", "145-165%", "Intelligence upsell"),
        ("Y5 Cumulative CF", "-$5.8M", "+$37.5M", "Profitable from Y2"),
    ]:
        pdf.tr(r, w5)
    pdf.ln(4)
    pdf.p("Deal flow: Pilot 75 hosts (Starter $15) -> Expand 300 hosts (Professional $28) -> Full estate 800 hosts (Enterprise $38). Single client LTV: $364,800/yr Avennorth ARR.")

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
