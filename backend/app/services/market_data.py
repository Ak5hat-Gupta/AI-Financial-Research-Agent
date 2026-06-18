"""Market & fundamentals data.

Tries yfinance for live quotes/fundamentals; falls back to a curated offline
sample set so every feature works without network access or API keys.
"""
from __future__ import annotations

# Curated snapshot used as an offline fallback / seed. Figures in millions
# except price, eps, beta, shares (millions) and margins.
SAMPLE: dict[str, dict] = {
    "AAPL": {
        "company": "Apple Inc.", "sector": "Technology", "price": 212.4, "eps": 6.6,
        "beta": 1.27, "market_cap": 3250000, "shares_outstanding": 15300,
        "revenue": 391035, "gross_profit": 180683, "operating_income": 123216,
        "net_income": 93736, "total_assets": 364980, "total_equity": 56950,
        "total_debt": 106629, "current_assets": 152987, "current_liabilities": 176392,
        "inventory": 7286, "interest_expense": 3933, "fcf": 108807,
        "net_debt": 76686, "peers": ["MSFT", "GOOGL", "SAMSUNG", "DELL"],
    },
    "MSFT": {
        "company": "Microsoft Corp.", "sector": "Technology", "price": 467.5, "eps": 12.1,
        "beta": 0.91, "market_cap": 3470000, "shares_outstanding": 7430,
        "revenue": 245122, "gross_profit": 171008, "operating_income": 109433,
        "net_income": 88136, "total_assets": 512163, "total_equity": 268477,
        "total_debt": 67133, "current_assets": 159734, "current_liabilities": 125286,
        "inventory": 1246, "interest_expense": 2935, "fcf": 74071,
        "net_debt": 12000, "peers": ["AAPL", "GOOGL", "AMZN", "CRM"],
    },
    "GOOGL": {
        "company": "Alphabet Inc.", "sector": "Communication Services", "price": 178.2, "eps": 8.0,
        "beta": 1.03, "market_cap": 2180000, "shares_outstanding": 12200,
        "revenue": 350018, "gross_profit": 203706, "operating_income": 112390,
        "net_income": 100118, "total_assets": 450256, "total_equity": 325084,
        "total_debt": 28000, "current_assets": 200000, "current_liabilities": 89000,
        "inventory": 0, "interest_expense": 400, "fcf": 72764,
        "net_debt": -90000, "peers": ["MSFT", "META", "AMZN", "AAPL"],
    },
    "AMZN": {
        "company": "Amazon.com Inc.", "sector": "Consumer Discretionary", "price": 197.9, "eps": 5.5,
        "beta": 1.15, "market_cap": 2060000, "shares_outstanding": 10500,
        "revenue": 637959, "gross_profit": 311669, "operating_income": 68593,
        "net_income": 59248, "total_assets": 624894, "total_equity": 285970,
        "total_debt": 130000, "current_assets": 190867, "current_liabilities": 179431,
        "inventory": 34214, "interest_expense": 2406, "fcf": 38200,
        "net_debt": 50000, "peers": ["WMT", "GOOGL", "MSFT", "SHOP"],
    },
    "META": {
        "company": "Meta Platforms Inc.", "sector": "Communication Services", "price": 612.0, "eps": 23.9,
        "beta": 1.21, "market_cap": 1550000, "shares_outstanding": 2530,
        "revenue": 164501, "gross_profit": 134283, "operating_income": 69380,
        "net_income": 62360, "total_assets": 276054, "total_equity": 182637,
        "total_debt": 49000, "current_assets": 100000, "current_liabilities": 36000,
        "inventory": 0, "interest_expense": 1100, "fcf": 54072,
        "net_debt": -30000, "peers": ["GOOGL", "SNAP", "PINS", "MSFT"],
    },
    "NVDA": {
        "company": "NVIDIA Corp.", "sector": "Technology", "price": 138.6, "eps": 2.9,
        "beta": 1.66, "market_cap": 3400000, "shares_outstanding": 24500,
        "revenue": 130497, "gross_profit": 97858, "operating_income": 81453,
        "net_income": 72880, "total_assets": 111601, "total_equity": 79327,
        "total_debt": 10000, "current_assets": 80126, "current_liabilities": 18047,
        "inventory": 10080, "interest_expense": 247, "fcf": 60853,
        "net_debt": -25000, "peers": ["AMD", "INTC", "AVGO", "TSM"],
    },
    "TSLA": {
        "company": "Tesla Inc.", "sector": "Consumer Discretionary", "price": 345.2, "eps": 2.0,
        "beta": 2.05, "market_cap": 1100000, "shares_outstanding": 3210,
        "revenue": 97690, "gross_profit": 17450, "operating_income": 7076,
        "net_income": 7091, "total_assets": 122070, "total_equity": 72913,
        "total_debt": 13000, "current_assets": 58360, "current_liabilities": 28748,
        "inventory": 12017, "interest_expense": 350, "fcf": 3580,
        "net_debt": -15000, "peers": ["GM", "F", "RIVN", "BYD"],
    },
}


def _from_yfinance(ticker: str) -> dict | None:
    try:
        import yfinance as yf
    except Exception:
        return None
    try:
        t = yf.Ticker(ticker)
        info = t.info or {}
        if not info or info.get("regularMarketPrice") is None:
            return None
        return {
            "company": info.get("longName") or info.get("shortName") or ticker,
            "sector": info.get("sector", ""),
            "price": info.get("currentPrice") or info.get("regularMarketPrice"),
            "eps": info.get("trailingEps"),
            "beta": info.get("beta"),
            "market_cap": _m(info.get("marketCap")),
            "shares_outstanding": _m(info.get("sharesOutstanding")),
            "revenue": _m(info.get("totalRevenue")),
            "gross_profit": _m(info.get("grossProfits")),
            "operating_income": None,
            "net_income": _m(info.get("netIncomeToCommon")),
            "total_assets": None,
            "total_equity": None,
            "total_debt": _m(info.get("totalDebt")),
            "current_assets": None,
            "current_liabilities": None,
            "inventory": None,
            "interest_expense": None,
            "fcf": _m(info.get("freeCashflow")),
            "net_debt": _m((info.get("totalDebt") or 0) - (info.get("totalCash") or 0)),
            "peers": [],
        }
    except Exception:
        return None


def _m(v):
    """Convert absolute dollars to millions."""
    if v is None:
        return None
    try:
        return round(float(v) / 1_000_000, 2)
    except (TypeError, ValueError):
        return None


def get_fundamentals(ticker: str, live: bool = True) -> dict:
    ticker = ticker.upper().strip()
    if live:
        data = _from_yfinance(ticker)
        if data:
            data["ticker"] = ticker
            data["source"] = "yfinance"
            # Backfill any gaps from sample if we have it.
            if ticker in SAMPLE:
                for k, v in SAMPLE[ticker].items():
                    if data.get(k) in (None, 0, "") and v is not None:
                        data[k] = v
            return data
    base = SAMPLE.get(ticker)
    if base:
        return {**base, "ticker": ticker, "source": "sample"}
    # Unknown ticker — return a neutral placeholder so the UI still renders.
    return {
        "ticker": ticker, "company": ticker, "sector": "", "source": "unknown",
        "price": 100.0, "eps": 5.0, "beta": 1.0, "market_cap": 50000,
        "shares_outstanding": 500, "revenue": 20000, "gross_profit": 8000,
        "operating_income": 3000, "net_income": 2200, "total_assets": 30000,
        "total_equity": 14000, "total_debt": 6000, "current_assets": 12000,
        "current_liabilities": 8000, "inventory": 2000, "interest_expense": 300,
        "fcf": 2500, "net_debt": 2000, "peers": [],
    }


def list_known_tickers() -> list[str]:
    return sorted(SAMPLE.keys())
