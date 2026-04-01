#!/usr/bin/env python3
"""Generate PDF versions of Avennorth Pathfinder business model documents.

Uses fpdf2 (pure Python, no native dependencies).
Run: python3 generate_pdfs.py
"""

import os
from fpdf import FPDF

OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__)) + "/current"


class AvennorthPDF(FPDF):
    """Avennorth-branded PDF with dark theme header/footer."""

    def header(self):
        self.set_font("Helvetica", "B", 8)
        self.set_text_color(100, 100, 120)
        self.cell(0, 6, "AVENNORTH  |  CONFIDENTIAL", align="L")
        self.ln(8)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "", 7)
        self.set_text_color(100, 100, 120)
        self.cell(0, 10, "Avennorth Pathfinder + Intelligence Platform  |  Page %d" % self.page_no(), align="C")

    def section_title(self, title, color=(200, 255, 0)):
        self.set_font("Helvetica", "B", 14)
        self.set_text_color(*color)
        self.cell(0, 10, title, ln=True)
        self.set_draw_color(*color)
        self.line(self.get_x(), self.get_y(), self.get_x() + 60, self.get_y())
        self.ln(4)

    def subsection(self, title):
        self.set_font("Helvetica", "B", 11)
        self.set_text_color(60, 60, 80)
        self.cell(0, 8, title, ln=True)
        self.ln(2)

    def body_text(self, text):
        self.set_font("Helvetica", "", 9)
        self.set_text_color(40, 40, 50)
        self.multi_cell(0, 5, text)
        self.ln(2)

    def metric_row(self, label, value, note=""):
        self.set_font("Helvetica", "", 9)
        self.set_text_color(80, 80, 100)
        x = self.get_x()
        self.cell(60, 6, label)
        self.set_font("Helvetica", "B", 10)
        self.set_text_color(20, 20, 30)
        self.cell(40, 6, str(value))
        if note:
            self.set_font("Helvetica", "", 8)
            self.set_text_color(120, 120, 140)
            self.cell(0, 6, note)
        self.ln(6)

    def table_header(self, cols, widths):
        self.set_font("Helvetica", "B", 8)
        self.set_text_color(255, 255, 255)
        self.set_fill_color(30, 30, 50)
        for i, col in enumerate(cols):
            self.cell(widths[i], 7, col, border=1, fill=True, align="C")
        self.ln()

    def table_row(self, cells, widths, bold_last=False):
        self.set_font("Helvetica", "", 8)
        self.set_text_color(40, 40, 50)
        for i, cell in enumerate(cells):
            if bold_last and i == len(cells) - 1:
                self.set_font("Helvetica", "B", 8)
                self.set_text_color(0, 150, 80)
            self.cell(widths[i], 6, str(cell), border=1, align="C" if i > 0 else "L")
            if bold_last and i == len(cells) - 1:
                self.set_font("Helvetica", "", 8)
                self.set_text_color(40, 40, 50)
        self.ln()


def generate_v03():
    pdf = AvennorthPDF()
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.add_page()

    # Title
    pdf.set_font("Helvetica", "B", 20)
    pdf.set_text_color(20, 20, 30)
    pdf.cell(0, 12, "Avennorth Pathfinder", ln=True)
    pdf.set_font("Helvetica", "", 12)
    pdf.set_text_color(80, 80, 100)
    pdf.cell(0, 8, "Business Case v0.3.1 - Updated for 4-Product Portfolio", ln=True)
    pdf.ln(6)

    # Product Portfolio
    pdf.section_title("1. Product Portfolio", (0, 180, 140))
    products = [
        ("Pathfinder Discovery", "eBPF/ETW agents, Gateway, classification engine, ServiceNow sync", "Built (Phases 1-3)"),
        ("Integration Intelligence", "AI health scoring, summarization, rationalization, EA reconciliation", "Built (Phases 4-5)"),
        ("CMDB Ops Agent", "8 autonomous agents for CMDB quality management", "Built (Phase 6)"),
        ("Service Map Intelligence", "Coverage analysis, risk scoring, change impact, self-healing", "Built (Phase 7)"),
    ]
    w = [55, 90, 45]
    pdf.table_header(["Product", "Description", "Status"], w)
    for p in products:
        pdf.table_row(p, w)
    pdf.ln(4)

    # Build Metrics
    pdf.section_title("2. What Was Built", (0, 120, 200))
    metrics = [
        ("Go Services", "5 binaries", "Gateway + Linux/Windows/K8s agents + mock-agent"),
        ("Python Services", "4 FastAPI apps", "AI Engine + IntegIntel + CMDB Ops + Service Map"),
        ("ServiceNow Tables", "6 custom", "Extending cmdb_ci + standalone tables"),
        ("REST Endpoints", "7", "Batch upsert integrations/interfaces/agents/health"),
        ("Business Rules", "6", "Auto-name, health status, stale check, agent lifecycle"),
        ("Workspace Pages", "6 (Polaris)", "Overview, Integrations, Agents, Gaps, EA, Health"),
        ("CMDB Agents", "8 autonomous", "Duplicate, stale, orphan, compliance, health, etc."),
        ("Unit Tests", "104+", "All passing across Go + Python"),
        ("CI/CD", "GitHub Actions", "11 parallel jobs"),
    ]
    for label, value, note in metrics:
        pdf.metric_row(label, value, note)
    pdf.ln(2)

    # Cost to Build
    pdf.add_page()
    pdf.section_title("3. Cost to Build", (60, 60, 200))
    costs = [
        ("Engineering - Go (Gateway + 3 Agents)", "$560k"),
        ("Engineering - Python (4 Intelligence Products)", "$420k"),
        ("ServiceNow Scoped App", "$180k"),
        ("QA & Testing (104+ tests, CI/CD)", "$135k"),
        ("Cloud Infrastructure (9 months)", "$54k"),
        ("AI Engine Costs (Claude API)", "$36k"),
        ("ServiceNow Dev Instances", "$18k"),
        ("Technology Partner Program", "$35k"),
        ("Patent Filing (2 patents)", "$50k"),
        ("Legal & Compliance", "$25k"),
        ("Sales & Marketing Ramp", "$120k"),
        ("Contingency (10%)", "$163k"),
    ]
    w2 = [120, 40]
    pdf.table_header(["Category", "Amount"], w2)
    for c in costs:
        pdf.table_row(c, w2)
    pdf.ln(2)
    pdf.set_font("Helvetica", "B", 12)
    pdf.set_text_color(0, 150, 80)
    pdf.cell(120, 8, "TOTAL BUILD INVESTMENT")
    pdf.cell(40, 8, "$1.80M", align="R")
    pdf.ln(10)

    # Pricing
    pdf.section_title("4. Pricing Model", (200, 255, 0))
    pdf.body_text("Two packages, priced annually by Managed Node count:")
    packages = [
        ("Standard", "Discovery Engine + CMDB Ops", "Automated hygiene, CI lifecycle, stale record cleanup"),
        ("Professional", "Standard + Integration Intel + Service Map Intel", "Data flow analysis, anomaly detection, dependency mapping"),
    ]
    w3a = [35, 75, 80]
    pdf.table_header(["Package", "Contents", "Key Features"], w3a)
    for p in packages:
        pdf.table_row(p, w3a)
    pdf.ln(2)
    tiers = [
        ("S", "Up to 500", "$50,000/yr", "$100,000/yr"),
        ("M", "501-2,000", "$90,000/yr", "$175,000/yr"),
        ("L", "2,001-5,000", "$150,000/yr", "$250,000/yr"),
        ("XL", "5,001+", "$200,000+/yr", "Custom"),
    ]
    w3 = [20, 45, 55, 55]
    pdf.table_header(["Tier", "Managed Nodes", "Standard (starting at)", "Professional (starting at)"], w3)
    for t in tiers:
        pdf.table_row(t, w3)
    pdf.ln(4)

    # Revenue Projections
    pdf.add_page()
    pdf.section_title("5. Revenue Projections (Dual Scenario)", (60, 200, 120))
    pdf.body_text("Scenario A: Moderate Growth")
    proj_a = [
        ("Year 1", "16", "$1.2M", "$600k", "$1.80M", "-$1.20M", "First customers, Standard S-tier."),
        ("Year 2", "38", "$3.8M", "$2.5M", "$2.40M", "+$100k", "15% Std->Pro upgrade, 8% churn."),
        ("Year 3", "72", "$8.5M", "$6.2M", "$3.40M", "+$2.80M", "25% upgrade, 3% price increase."),
        ("Year 4", "120", "$17.5M", "$13.0M", "$5.20M", "+$7.80M", "35% upgrade, portfolio flywheel."),
        ("Year 5", "217", "$33.2M", "$25.0M", "$5.50M", "+$19.5M", "89.6% EBITDA margin."),
    ]
    w4 = [18, 15, 23, 23, 22, 22, 67]
    pdf.table_header(["Year", "Clients", "ARR", "Revenue", "OpEx", "Cash Flow", "Notes"], w4)
    for p in proj_a:
        pdf.table_row(p, w4, bold_last=False)
    pdf.ln(4)
    pdf.body_text("Scenario Analysis:")
    w4b = [35, 30, 30, 30, 30]
    pdf.table_header(["Metric", "Bear", "Likely (Base)", "Bull", "Best Case"], w4b)
    for r in [
        ("Y5 ARR", "~$33M", "~$84M", "~$110M", "~$135M"),
        ("Y5 Customers", "217", "546", "710", "875"),
        ("Y5 EBITDA", "89.6%", "91.6%", "92.3%", "92.8%"),
        ("Profitable Y1?", "No", "Yes", "Yes", "Yes"),
    ]:
        pdf.table_row(r, w4b)
    pdf.ln(4)

    pdf.body_text(
        "Key assumptions (Likely): Std->Pro upgrade 0% Y1, 15% Y2, 25% Y3, 35% Y4-Y5. "
        "Logo churn 5% Y1, 8% Y2-Y3, 10% Y4-Y5. Price increase 0% Y1-Y2, 3% Y3-Y4, 5% Y5. "
        "XL Professional blended at $350K/yr."
    )

    pdf.output(os.path.join(OUTPUT_DIR, "v03-business-case.pdf"))
    print("Generated v03-business-case.pdf")


def generate_v04():
    pdf = AvennorthPDF()
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.add_page()

    pdf.set_font("Helvetica", "B", 20)
    pdf.set_text_color(20, 20, 30)
    pdf.cell(0, 12, "Avennorth Pathfinder x Compass", ln=True)
    pdf.set_font("Helvetica", "", 12)
    pdf.set_text_color(80, 80, 100)
    pdf.cell(0, 8, "Channel Distribution Strategy v0.4.1", ln=True)
    pdf.ln(6)

    # Flywheel
    pdf.section_title("1. The Compass Flywheel", (0, 200, 200))
    steps = [
        "1. Consultant uses Compass to scope ServiceNow engagement",
        "2. Pathfinder added as SOW line item (one click)",
        "3. Deploy agents during implementation (week 1-2)",
        "4. Client sees live integration map with AI health scores",
        "5. Pilot expands: Starter -> Professional -> Enterprise (NRR 150%+)",
        "6. Consultant repeats on next 10 engagements",
    ]
    for s in steps:
        pdf.body_text(s)
    pdf.ln(2)

    pdf.body_text(
        "Intelligence products strengthen the flywheel: deploy agents -> discover integrations -> "
        "AI scores health -> autonomous agents fix CMDB quality -> coverage gaps self-heal. "
        "Each product creates more value, driving higher NRR and faster tier upgrades."
    )

    # Channel Economics
    pdf.section_title("2. Channel vs. Direct Economics", (0, 180, 140))
    comparisons = [
        ("Customer Acquisition Cost", "$35-50k", "$8-15k", "~70% lower"),
        ("Sales Cycle", "3-6 months", "2-4 weeks", "~80% faster"),
        ("First-Year Deal Size", "$60-120k", "$15-30k", "Lower entry, higher LTV"),
        ("Sales Team Required", "4-6 AEs (Y3)", "1-2 channel mgrs", "~70% less HC"),
        ("Net Revenue Retention", "120-130%", "145-165%", "Intelligence drives it"),
        ("Time to First Revenue", "Month 10-12", "Month 8-9", "Faster payback"),
    ]
    w = [45, 35, 35, 40]
    pdf.table_header(["Metric", "Direct Only", "Compass", "Impact"], w)
    for c in comparisons:
        pdf.table_row(c, w, bold_last=True)
    pdf.ln(4)

    # Deal Flow
    pdf.add_page()
    pdf.section_title("3. Example Deal Flow", (200, 255, 0))
    deals = [
        ("Pilot (Mo 1-3)", "200 nodes", "Standard S", "$50K/yr AV", "$12.5K/yr partner"),
        ("Expand (Mo 4-8)", "800 nodes", "Standard M", "$90K/yr AV", "$22.5K/yr partner"),
        ("Upgrade (Mo 9+)", "800 nodes", "Professional M", "$175K/yr AV", "$43.75K/yr partner"),
    ]
    w2 = [35, 25, 35, 40, 40]
    pdf.table_header(["Stage", "Nodes", "Package/Tier", "Avennorth", "Partner (25%)"], w2)
    for d in deals:
        pdf.table_row(d, w2)
    pdf.ln(4)
    pdf.body_text("Single client journey: Standard pilot -> node expansion -> Professional upgrade. Partner earns 20-30% markup. Both incentivized to expand.")

    # Projections
    pdf.section_title("4. Five-Year Projections (Likely Case)", (60, 200, 120))
    proj = [
        ("Y1", "0", "39", "$3.0M", "$1.5M", "$2.20M", "7"),
        ("Y2", "20", "94", "$10.2M", "$6.6M", "$3.20M", "10"),
        ("Y3", "45", "180", "$24.5M", "$17.0M", "$4.20M", "14"),
        ("Y4", "70", "301", "$48.0M", "$36.0M", "$5.80M", "16"),
        ("Y5", "100", "546", "$84.0M", "$66.0M", "$6.50M", "16"),
    ]
    w3 = [15, 20, 20, 25, 25, 22, 15]
    pdf.table_header(["Year", "Partners", "Clients", "ARR", "Revenue", "OpEx", "HC"], w3)
    for p in proj:
        pdf.table_row(p, w3)
    pdf.ln(4)

    pdf.body_text(
        "Likely (Base): ~$84M ARR at 91.6% EBITDA, 546 customers. "
        "Bear: ~$33M (217 customers). Bull: ~$110M (710). Best: ~$135M (875). "
        "Penetration pricing is the base plan -- $50K entry removes procurement friction."
    )

    pdf.output(os.path.join(OUTPUT_DIR, "v04-compass-channel.pdf"))
    print("Generated v04-compass-channel.pdf")


def generate_v05():
    pdf = AvennorthPDF()
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.add_page()

    pdf.set_font("Helvetica", "B", 20)
    pdf.set_text_color(20, 20, 30)
    pdf.cell(0, 12, "Avennorth Pathfinder", ln=True)
    pdf.set_font("Helvetica", "", 12)
    pdf.set_text_color(80, 80, 100)
    pdf.cell(0, 8, "Lean Build Model v0.5.1 - Validated by Actual Build", ln=True)
    pdf.ln(6)

    # Force Multipliers
    pdf.section_title("1. Four Force Multipliers (Validated)", (0, 180, 140))
    multipliers = [
        ("Existing Team", "SN developer + QA/DevOps already on payroll. Built scoped app, workspace, Helm, CI/CD."),
        ("AI-Assisted Dev", "Claude Code built 10 phases with 104+ tests. Each engineer ships 2-3x."),
        ("Compass Distribution", "No sales team. Channel managers enable partners; partners sell."),
        ("Full-Stack AI", "Python intelligence layer built in parallel with Go services. 4 FastAPI products."),
    ]
    for title, desc in multipliers:
        pdf.subsection(title)
        pdf.body_text(desc)

    # Staffing
    pdf.section_title("2. Year-by-Year Hiring", (0, 200, 200))
    staff = [
        ("Year 1", "5", "+2", "Founder, Go/Systems Eng ($190k), Python/AI Eng ($185k), SN Dev (existing), QA (existing)"),
        ("Year 2", "7", "+2", "Go/Platform Eng ($180k), Channel Manager ($140k)"),
        ("Year 3", "9", "+2", "Support Eng ($130k), Content/Dev Marketing ($120k)"),
        ("Year 4", "11", "+2", "Senior AI/ML Eng ($210k), 2nd Support Eng ($130k)"),
        ("Year 5", "14", "+3", "2nd Channel Mgr ($145k), Platform Eng ($185k), CSM ($125k)"),
    ]
    w = [18, 15, 15, 142]
    pdf.table_header(["Year", "Total", "New", "Roles"], w)
    for s in staff:
        pdf.table_row(s, w)
    pdf.ln(4)

    # Cost Model
    pdf.add_page()
    pdf.section_title("3. Real Cost Model (Base Case)", (255, 140, 60))
    costs = [
        ("Y1", "$375k", "$420k", "$48k", "$24k", "$1.03M", "$25k", "-$1.01M"),
        ("Y2", "$320k", "$420k + $375k prior", "$60k", "$48k", "$1.70M", "$900k", "-$800k"),
        ("Y3", "$250k", "$420k + $695k prior", "$84k", "$72k", "$2.11M", "$4.20M", "+$2.09M"),
        ("Y4", "$340k", "$420k + $945k prior", "$108k", "$96k", "$2.65M", "$11.50M", "+$8.85M"),
        ("Y5", "$455k", "$420k + $1.29M prior", "$144k", "$120k", "$3.32M", "$29.50M", "+$26.18M"),
    ]
    w2 = [12, 22, 42, 18, 18, 22, 22, 22]
    pdf.table_header(["Yr", "New Hire", "Team + Prior Salaries", "Infra", "AI $", "OpEx", "Rev", "CF"], w2)
    for c in costs:
        pdf.table_row(c, w2)
    pdf.ln(4)

    # Capital Efficiency
    pdf.section_title("4. Capital Efficiency (Confirmed)", (200, 255, 0))
    efficiency = [
        ("Y5 ARR (Likely)", "~$84.0M", "Penetration pricing = base plan"),
        ("Y5 ARR (Bear/Bull/Best)", "$33M / $110M / $135M", "Four-scenario analysis"),
        ("Y5 Headcount", "~16", "vs. 300-500 typical SaaS at this ARR"),
        ("Y5 Customers (Likely)", "546", "100 Compass partners, 70 direct, 476 channel"),
        ("Y5 EBITDA Margin", "91.6%", "Profitable in Year 1"),
        ("ARR/Employee", "~$5.25M", "20-35x industry median"),
        ("Funding Required", "Bootstrappable", "$610k incremental Year 1 investment"),
    ]
    for label, value, note in efficiency:
        pdf.metric_row(label, value, note)
    pdf.ln(4)

    # What was built
    pdf.section_title("5. What Was Actually Built (Lean)", (0, 180, 200))
    built = [
        ("Languages", "Go + Python + JavaScript (ServiceNow)"),
        ("Go Binaries", "5 (gateway, linux/windows/k8s agents, mock-agent)"),
        ("Python Services", "4 FastAPI apps (AI engine, IntegIntel, CMDB Ops, Service Map)"),
        ("SN Artifacts", "6 tables, 7 REST endpoints, 6 business rules, 6 workspace pages, 3 flows"),
        ("CMDB Agents", "8 autonomous (observe/diagnose/recommend/act/verify lifecycle)"),
        ("Tests", "104+ unit tests, all passing, GitHub Actions CI/CD"),
        ("Helm Charts", "2 (gateway Deployment + agent DaemonSet)"),
        ("Deployment Doc", "55-story WBS across Crawl/Walk/Run/Fly stages"),
    ]
    for label, value in built:
        pdf.metric_row(label, value)

    pdf.output(os.path.join(OUTPUT_DIR, "v05-lean-model.pdf"))
    print("Generated v05-lean-model.pdf")


if __name__ == "__main__":
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    generate_v03()
    generate_v04()
    generate_v05()
    print("\nAll PDFs generated in:", OUTPUT_DIR)
