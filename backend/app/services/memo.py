"""Institutional investment-memo generator.

Composes fundamentals, ratios, a DCF valuation, peer comps and news sentiment
into a structured, sectioned memo. Narrative sections are written by the LLM when
a provider is configured, and fall back to deterministic, data-grounded prose so
the feature works fully offline.
"""
from __future__ import annotations

from app.schemas.finance import DCFRequest
from app.schemas.memo import MemoResponse, MemoSection
from app.services import competitors as comp_svc
from app.services import news as news_svc
from app.services.llm import get_llm
from app.services.market_data import get_fundamentals
from app.services.ratios import compute_ratios
from app.services.valuation import run_dcf

SYSTEM = (
    "You are a buy-side equity analyst writing a concise, neutral section of an "
    "institutional investment memo. Use the supplied figures. 3-5 sentences, no headers."
)


def _rating(upside: float | None, health: float, sent: float) -> tuple[str, str]:
    score = 0
    if upside is not None:
        score += 2 if upside >= 15 else 1 if upside >= 5 else -2 if upside <= -15 else -1 if upside <= -5 else 0
    score += 1 if health >= 60 else -1 if health < 40 else 0
    score += 1 if sent > 0.15 else -1 if sent < -0.15 else 0
    rating = "Buy" if score >= 2 else "Sell" if score <= -2 else "Hold"
    conviction = "High" if abs(score) >= 3 else "Moderate" if abs(score) >= 1 else "Low"
    return rating, conviction


def _section(title: str, instruction: str, context: str, fallback: str) -> MemoSection:
    llm = get_llm()
    if llm.is_live:
        body = llm.complete(SYSTEM, f"Section: {title}\n{instruction}\n\nData:\n{context}", max_tokens=320)
    else:
        body = fallback
    return MemoSection(title=title, body=body.strip())


def generate_memo(ticker: str, live: bool = False) -> MemoResponse:
    ticker = ticker.upper().strip()
    f = get_fundamentals(ticker, live=live)
    company = f.get("company", ticker)
    ratios = compute_ratios(ticker, company, f)
    dcf = run_dcf(
        DCFRequest(
            ticker=ticker, company=company, base_fcf=f.get("fcf"),
            shares_outstanding=f.get("shares_outstanding"), net_debt=f.get("net_debt", 0),
            current_price=f.get("price"),
        )
    )
    comps = comp_svc.compare(ticker, [], live=live)
    sent = news_svc.analyze_sentiment(ticker, company)
    rating, conviction = _rating(dcf.upside_pct, ratios.health_score, sent.score)

    rev, ni = f.get("revenue", 0), f.get("net_income", 0)
    nm = (ni / rev * 100) if rev else 0
    ctx = (
        f"{company} ({ticker}); sector {f.get('sector','n/a')}; price ${f.get('price')}; "
        f"mkt cap ${f.get('market_cap')}M; revenue ${rev}M; net income ${ni}M; net margin {nm:.1f}%; "
        f"FCF ${f.get('fcf')}M; health {ratios.health_score}/100; DCF fair value "
        f"${dcf.fair_value_per_share}; upside {dcf.upside_pct}%; verdict {dcf.verdict}; "
        f"sentiment {sent.overall} ({sent.score})."
    )
    peers = ", ".join(p["ticker"] for p in comps.peers[1:5]) or "n/a"

    sections = [
        _section("Executive Summary",
            f"Summarise the thesis and state the {rating} rating with a ${dcf.fair_value_per_share} target.",
            ctx,
            f"We rate {company} ({ticker}) a {rating} ({conviction.lower()} conviction) with a "
            f"${dcf.fair_value_per_share:,.2f} 12-month target versus ${f.get('price'):,.2f} today "
            f"({dcf.upside_pct:+.1f}% implied). The thesis rests on a {ratios.health_score:.0f}/100 "
            f"financial-health profile, {nm:.1f}% net margins and {sent.overall} news sentiment. "
            f"{dcf.commentary}"),
        _section("Business Overview",
            "Describe the business model and revenue base.", ctx,
            f"{company} operates in the {f.get('sector','—')} sector with trailing revenue of "
            f"${rev:,.0f}M and net income of ${ni:,.0f}M (a {nm:.1f}% net margin). The company "
            f"generates roughly ${f.get('fcf'):,.0f}M of free cash flow, underpinning its "
            f"${f.get('market_cap'):,.0f}M market capitalisation."),
        _section("Industry & Competitive Landscape",
            "Describe the competitive set.", ctx,
            f"{ticker} competes against {peers}. The peer comparison benchmarks valuation multiples, "
            f"margins and returns; {comps.commentary}"),
        _section("Competitive Advantage",
            "Assess the moat.", ctx,
            f"{company}'s margin structure ({nm:.1f}% net) and cash generation suggest "
            f"{'a durable competitive position' if nm >= 15 else 'a moderate moat that warrants monitoring'}. "
            f"Sustained returns on equity are the key signal to track."),
        _section("Growth Drivers",
            "List the growth drivers.", ctx,
            "Primary drivers are revenue expansion in the core segment, operating leverage on a fixed "
            "cost base, and reinvestment of free cash flow. The DCF assumes a near-term growth rate "
            f"decaying toward {dcf.assumptions.get('terminal_growth')} terminal growth."),
        _section("Key Risks",
            "List the principal risks.", ctx,
            "Key risks include execution against guidance, margin pressure from input costs or "
            "competition, balance-sheet leverage, and multiple compression if growth disappoints. "
            f"News sentiment is currently {sent.overall}."),
        _section("Financial Analysis",
            "Comment on the financial-health profile.", ctx,
            f"{ratios.commentary}"),
        _section("Comparable Companies",
            "Summarise the relative-value read.", ctx,
            f"Against {peers}, {ticker} is assessed on P/E, margins, ROE and leverage. {comps.commentary}"),
        _section("Valuation",
            "Summarise the DCF.", ctx,
            f"Our discounted cash-flow model yields an intrinsic value of "
            f"${dcf.fair_value_per_share:,.2f} per share (enterprise value ${dcf.enterprise_value:,.0f}M), "
            f"versus ${f.get('price'):,.2f} in the market — {dcf.verdict.lower()}."),
        _section("Investment Recommendation",
            f"Conclude with the {rating} rating and what would change the view.", ctx,
            f"We initiate at {rating} ({conviction} conviction), target ${dcf.fair_value_per_share:,.2f} "
            f"({dcf.upside_pct:+.1f}%). We would revisit on a material change to growth, margins, or the "
            f"discount rate. This is educational research, not investment advice."),
    ]

    return MemoResponse(
        ticker=ticker, company=company, rating=rating, conviction=conviction,
        target_price=dcf.fair_value_per_share, current_price=f.get("price"),
        upside_pct=dcf.upside_pct, health_score=ratios.health_score, sentiment=sent.overall,
        sections=sections,
    )


def memo_to_pdf(memo: MemoResponse) -> bytes:
    """Render a memo to a clean, branded PDF (reportlab)."""
    import io

    from reportlab.lib import colors
    from reportlab.lib.enums import TA_LEFT
    from reportlab.lib.pagesizes import LETTER
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import inch
    from reportlab.platypus import (
        Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle,
    )

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=LETTER, topMargin=0.8 * inch, bottomMargin=0.8 * inch,
                            leftMargin=0.9 * inch, rightMargin=0.9 * inch, title=f"{memo.ticker} memo")
    ss = getSampleStyleSheet()
    h1 = ParagraphStyle("h1", parent=ss["Title"], fontSize=20, spaceAfter=2, textColor=colors.HexColor("#0F172A"))
    sub = ParagraphStyle("sub", parent=ss["Normal"], fontSize=10, textColor=colors.HexColor("#64748B"), spaceAfter=12)
    sh = ParagraphStyle("sh", parent=ss["Heading2"], fontSize=12, spaceBefore=12, spaceAfter=4,
                        textColor=colors.HexColor("#047857"))
    body = ParagraphStyle("body", parent=ss["Normal"], fontSize=10, leading=15, alignment=TA_LEFT,
                          textColor=colors.HexColor("#1F2937"))

    rating_color = {"Buy": "#059669", "Sell": "#DC2626", "Hold": "#D97706"}.get(memo.rating, "#334155")
    el: list = [
        Paragraph(f"{memo.company} ({memo.ticker})", h1),
        Paragraph("Investment Memo · AI-generated · educational use only", sub),
    ]
    data = [[
        Paragraph(f"<b>Rating</b><br/><font color='{rating_color}'><b>{memo.rating}</b></font> ({memo.conviction})", body),
        Paragraph(f"<b>Target</b><br/>{_money(memo.target_price)}", body),
        Paragraph(f"<b>Price</b><br/>{_money(memo.current_price)}", body),
        Paragraph(f"<b>Upside</b><br/>{('%+.1f%%' % memo.upside_pct) if memo.upside_pct is not None else '—'}", body),
        Paragraph(f"<b>Health</b><br/>{memo.health_score:.0f}/100", body),
    ]]
    t = Table(data, colWidths=[1.5 * inch] * 5)
    t.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    el += [t, Spacer(1, 6)]
    for s in memo.sections:
        el += [Paragraph(s.title, sh), Paragraph(s.body.replace("\n", "<br/>"), body)]
    doc.build(el)
    return buf.getvalue()


def _money(v):
    return f"${v:,.2f}" if isinstance(v, (int, float)) else "—"
