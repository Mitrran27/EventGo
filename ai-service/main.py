"""
EventGo AI Chat Microservice
Powered by Ollama (local, free, no API keys needed)
Run: uvicorn main:app --host 0.0.0.0 --port 8000 --reload
"""

import json
import os
import re
from typing import Optional

import httpx
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv()

app = FastAPI(title="EventGo AI Chat", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL    = os.getenv("OLLAMA_MODEL", "llama3.2")


# ── Location distance matrix (KL area, approximate road km) ──────────────────
LOCATION_DISTANCES_KM: dict = {
    "cheras":        {"Kuala Lumpur": 12, "Selangor": 25, "Putrajaya": 22, "Petaling Jaya": 18},
    "petaling jaya": {"Kuala Lumpur": 15, "Selangor": 8,  "Putrajaya": 28, "Petaling Jaya": 0},
    "subang":        {"Kuala Lumpur": 22, "Selangor": 10, "Putrajaya": 30, "Petaling Jaya": 8},
    "klang":         {"Kuala Lumpur": 38, "Selangor": 15, "Putrajaya": 45, "Petaling Jaya": 22},
    "ampang":        {"Kuala Lumpur": 8,  "Selangor": 30, "Putrajaya": 28, "Petaling Jaya": 20},
    "kepong":        {"Kuala Lumpur": 12, "Selangor": 20, "Putrajaya": 35, "Petaling Jaya": 18},
    "puchong":       {"Kuala Lumpur": 25, "Selangor": 12, "Putrajaya": 18, "Petaling Jaya": 12},
    "sepang":        {"Kuala Lumpur": 55, "Selangor": 35, "Putrajaya": 25, "Petaling Jaya": 40},
    "shah alam":     {"Kuala Lumpur": 30, "Selangor": 5,  "Putrajaya": 35, "Petaling Jaya": 15},
    "bangsar":       {"Kuala Lumpur": 5,  "Selangor": 20, "Putrajaya": 30, "Petaling Jaya": 12},
    "mont kiara":    {"Kuala Lumpur": 8,  "Selangor": 18, "Putrajaya": 35, "Petaling Jaya": 14},
    "cyberjaya":     {"Kuala Lumpur": 45, "Selangor": 25, "Putrajaya": 8,  "Petaling Jaya": 28},
    "kajang":        {"Kuala Lumpur": 22, "Selangor": 30, "Putrajaya": 15, "Petaling Jaya": 25},
    "semenyih":      {"Kuala Lumpur": 35, "Selangor": 28, "Putrajaya": 20, "Petaling Jaya": 32},
    "rawang":        {"Kuala Lumpur": 35, "Selangor": 30, "Putrajaya": 55, "Petaling Jaya": 28},
    "damansara":     {"Kuala Lumpur": 10, "Selangor": 15, "Putrajaya": 32, "Petaling Jaya": 8},
    "bukit jalil":   {"Kuala Lumpur": 12, "Selangor": 18, "Putrajaya": 22, "Petaling Jaya": 14},
    "sri petaling":  {"Kuala Lumpur": 10, "Selangor": 20, "Putrajaya": 20, "Petaling Jaya": 16},
    "wangsa maju":   {"Kuala Lumpur": 8,  "Selangor": 28, "Putrajaya": 30, "Petaling Jaya": 20},
    "setapak":       {"Kuala Lumpur": 7,  "Selangor": 28, "Putrajaya": 32, "Petaling Jaya": 20},
    "batu caves":    {"Kuala Lumpur": 15, "Selangor": 18, "Putrajaya": 40, "Petaling Jaya": 20},
    "sentul":        {"Kuala Lumpur": 5,  "Selangor": 22, "Putrajaya": 35, "Petaling Jaya": 18},
    "titiwangsa":    {"Kuala Lumpur": 4,  "Selangor": 25, "Putrajaya": 35, "Petaling Jaya": 18},
    "klcc":          {"Kuala Lumpur": 2,  "Selangor": 22, "Putrajaya": 30, "Petaling Jaya": 14},
    "bukit bintang": {"Kuala Lumpur": 2,  "Selangor": 22, "Putrajaya": 30, "Petaling Jaya": 15},
}


def get_distance_context(user_location: str, vendor_locations: list) -> str:
    user_loc_lower = user_location.lower().strip()
    matched_key = None
    for key in LOCATION_DISTANCES_KM:
        if key in user_loc_lower or user_loc_lower in key:
            matched_key = key
            break
    if not matched_key:
        return ""
    distances = LOCATION_DISTANCES_KM[matched_key]
    # Sort vendor locations by distance
    loc_with_dist = []
    for loc in vendor_locations:
        for dist_key, km in distances.items():
            if dist_key in loc.lower() or loc.lower() in dist_key:
                loc_with_dist.append((loc, km))
                break
    if not loc_with_dist:
        return ""
    loc_with_dist.sort(key=lambda x: x[1])
    lines = [f"Approximate road distances from {user_location.title()} (sorted nearest first):"]
    for loc, km in loc_with_dist:
        lines.append(f"  - {loc}: ~{km} km away")
    return "\n".join(lines)


# ── DB helpers ────────────────────────────────────────────────────────────────
def get_db_conn():
    return psycopg2.connect(
        os.getenv("DATABASE_URL"),
        cursor_factory=psycopg2.extras.RealDictCursor,
    )


def fetch_vendors(filters: dict = None) -> list:
    try:
        conn  = get_db_conn()
        cur   = conn.cursor()
        query = """
            SELECT v.id, v.name, v.description,
                   v."minPrice" AS min_price, v."maxPrice" AS max_price,
                   v.location, v."imageUrl" AS image_url, vc.name AS category
            FROM vendors v
            JOIN vendor_categories vc ON v."categoryId" = vc.id
            WHERE v.deleted = false AND v."isActive" = true
        """
        params = []
        if filters:
            if filters.get("category"):
                query += " AND LOWER(vc.name) LIKE %s"
                params.append(f"%{filters['category'].lower()}%")
            if filters.get("max_budget") is not None:
                query += ' AND v."minPrice" <= %s'
                params.append(filters["max_budget"])
            if filters.get("min_budget") is not None:
                query += ' AND v."minPrice" >= %s'
                params.append(filters["min_budget"])
            if filters.get("location"):
                query += " AND LOWER(v.location) LIKE %s"
                params.append(f"%{filters['location'].lower()}%")
        query += ' ORDER BY v."minPrice" ASC LIMIT 30'
        cur.execute(query, params)
        rows = cur.fetchall()
        conn.close()
        return [dict(r) for r in rows]
    except Exception as e:
        print(f"DB error fetching vendors: {e}")
        return []


def fetch_vendor_categories() -> list:
    try:
        conn = get_db_conn()
        cur  = conn.cursor()
        cur.execute("SELECT name FROM vendor_categories WHERE deleted = false ORDER BY name")
        rows = cur.fetchall()
        conn.close()
        return [r["name"] for r in rows]
    except Exception as e:
        print(f"DB error fetching categories: {e}")
        return ["Venue", "Catering", "Photography", "Decoration", "Entertainment", "Transportation"]


def fetch_expense_categories() -> list:
    try:
        conn = get_db_conn()
        cur  = conn.cursor()
        cur.execute("SELECT name FROM expense_categories WHERE deleted = false ORDER BY name")
        rows = cur.fetchall()
        conn.close()
        return [r["name"] for r in rows]
    except Exception as e:
        print(f"DB error fetching expense categories: {e}")
        return []


def fetch_market_stats() -> dict:
    try:
        conn = get_db_conn()
        cur  = conn.cursor()

        cur.execute("""
            SELECT COUNT(*) AS total_vendors,
                   ROUND(AVG(v."minPrice")) AS avg_min_price,
                   MIN(v."minPrice") AS lowest_price,
                   MAX(v."maxPrice") AS highest_price
            FROM vendors v
            WHERE v.deleted = false AND v."isActive" = true
        """)
        overall = dict(cur.fetchone())

        cur.execute("""
            SELECT v.name, v."minPrice" AS min_price, vc.name AS category
            FROM vendors v
            JOIN vendor_categories vc ON v."categoryId" = vc.id
            WHERE v.deleted = false AND v."isActive" = true
            ORDER BY v."minPrice" ASC LIMIT 1
        """)
        cheapest = dict(cur.fetchone() or {})

        cur.execute("""
            SELECT v.name, v."maxPrice" AS max_price, vc.name AS category
            FROM vendors v
            JOIN vendor_categories vc ON v."categoryId" = vc.id
            WHERE v.deleted = false AND v."isActive" = true
            ORDER BY v."maxPrice" DESC LIMIT 1
        """)
        priciest = dict(cur.fetchone() or {})

        cur.execute("""
            SELECT vc.name AS category,
                   COUNT(*) AS vendor_count,
                   ROUND(AVG(v."minPrice")) AS avg_min,
                   MIN(v."minPrice") AS min_price,
                   MAX(v."maxPrice") AS max_price
            FROM vendors v
            JOIN vendor_categories vc ON v."categoryId" = vc.id
            WHERE v.deleted = false AND v."isActive" = true
            GROUP BY vc.name
            ORDER BY avg_min ASC
        """)
        cat_stats = {r["category"]: {
            "count":               r["vendor_count"],
            "avg_starting_price":  int(r["avg_min"] or 0),
            "price_range":         f"RM{int(r['min_price'] or 0):,}–RM{int(r['max_price'] or 0):,}",
        } for r in cur.fetchall()}

        cur.execute("""
            SELECT DISTINCT v.location FROM vendors v
            WHERE v.deleted = false AND v."isActive" = true
            ORDER BY v.location
        """)
        locations = [r["location"] for r in cur.fetchall()]

        conn.close()
        avg = int(overall.get("avg_min_price") or 0)
        return {
            "total_vendors":          int(overall.get("total_vendors") or 0),
            "avg_starting_price":     avg,
            "lowest_starting_price":  int(overall.get("lowest_price") or 0),
            "highest_max_price":      int(overall.get("highest_price") or 0),
            "price_tiers": {
                "budget":   f"under RM{avg // 2:,}",
                "mid":      f"RM{avg // 2:,}–RM{avg * 2:,}",
                "premium":  f"above RM{avg * 2:,}",
            },
            "cheapest_vendor":  cheapest,
            "priciest_vendor":  priciest,
            "by_category":      cat_stats,
            "locations":        locations,
        }
    except Exception as e:
        print(f"DB error fetching market stats: {e}")
        return {}


# ── Context enrichment ────────────────────────────────────────────────────────
SUITABILITY_MAP = {
    "Venue":          "weddings, corporate dinners, gala events, receptions, birthday parties",
    "Catering":       "weddings, corporate lunches, private dining, buffets, birthday parties",
    "Photography":    "weddings, engagements, corporate headshots, events, family portraits",
    "Videography":    "weddings, corporate videos, event highlights, live streaming",
    "Decoration":     "weddings, birthday parties, corporate events, themed parties, solemnization",
    "Entertainment":  "weddings, corporate events, birthday parties, concerts, team building",
    "Transportation": "weddings, airport transfers, corporate travel, VIP events",
    "Beauty":         "weddings, photoshoots, proms, graduations, special occasions",
}

# Capacity heuristic based on max price
def estimate_capacity(max_p: int) -> str:
    if max_p < 2000:   return "small events, up to ~50 guests"
    if max_p < 8000:   return "medium events, ~50–150 guests"
    if max_p < 20000:  return "large events, ~150–500 guests"
    return "large/grand events, 500+ guests"

# Budget planning advice by event type
BUDGET_SPLIT_ADVICE = {
    "wedding": {
        "Venue":          "25–35%",
        "Catering":       "30–40%",
        "Photography":    "10–15%",
        "Decoration":     "8–12%",
        "Entertainment":  "5–10%",
        "Beauty":         "3–5%",
        "Transportation": "2–4%",
        "Miscellaneous":  "5–10%",
    },
    "corporate": {
        "Venue":          "30–40%",
        "Catering":       "25–35%",
        "Photography":    "8–12%",
        "Decoration":     "5–10%",
        "Entertainment":  "5–10%",
        "Transportation": "3–5%",
        "Miscellaneous":  "5–10%",
    },
    "birthday": {
        "Venue":          "20–30%",
        "Catering":       "25–35%",
        "Decoration":     "15–20%",
        "Photography":    "8–12%",
        "Entertainment":  "10–15%",
        "Miscellaneous":  "5–10%",
    },
}

# General planning timeline
BOOKING_TIMELINE = {
    "Venue":          "6–12 months in advance (books up fastest)",
    "Catering":       "3–6 months in advance",
    "Photography":    "3–6 months in advance (good photographers fill up early)",
    "Decoration":     "2–3 months in advance",
    "Entertainment":  "2–4 months in advance",
    "Beauty":         "1–3 months in advance",
    "Transportation": "1–2 months in advance",
}


def enrich_vendors(vendors: list, stats: dict) -> list:
    enriched    = []
    avg_overall = stats.get("avg_starting_price", 0)

    for v in vendors:
        cat     = v.get("category", "")
        min_p   = int(v.get("min_price") or 0)
        max_p   = int(v.get("max_price") or 0)
        cat_avg = stats.get("by_category", {}).get(cat, {}).get("avg_starting_price", avg_overall)

        # Price tier
        if avg_overall and min_p < avg_overall // 2:
            tier = "budget-friendly"
        elif avg_overall and min_p <= avg_overall * 2:
            tier = "mid-range"
        else:
            tier = "premium"

        # vs market comparison
        if cat_avg > 0:
            diff_pct = round(((min_p - cat_avg) / cat_avg) * 100)
            if diff_pct <= -20:
                vs_market = f"{abs(diff_pct)}% below {cat} average — great value"
            elif diff_pct >= 20:
                vs_market = f"{diff_pct}% above {cat} average — premium option"
            else:
                vs_market = f"around {cat} average price"
        else:
            vs_market = "price data unavailable"

        enriched.append({
            "name":               v["name"],
            "category":           cat,
            "price_range":        f"RM{min_p:,}–RM{max_p:,}",
            "min_price":          min_p,
            "max_price":          max_p,
            "location":           v.get("location", ""),
            "price_tier":         tier,
            "vs_market":          vs_market,
            "suitable_for":       SUITABILITY_MAP.get(cat, "various events"),
            "estimated_capacity": estimate_capacity(max_p),
            "description":        (v.get("description") or "").strip(),
            "booking_lead_time":  BOOKING_TIMELINE.get(cat, "2–3 months in advance"),
        })

    return enriched


# ── Hallucination guard ───────────────────────────────────────────────────────
PLATFORM_TERMS = {
    "my events", "expense tracker", "shortlist", "compare vendors", "favourites",
    "contact requests", "dashboard", "platform features", "event planning",
    "vendor categories", "expense categories", "market overview",
    "catering", "venue", "photography", "videography", "decoration",
    "entertainment", "transportation", "beauty", "available vendors",
    "strict rules", "distance data", "response format", "budget split",
    "booking timeline", "planning tips",
}


def format_vendor_line(v: dict) -> str:
    min_p     = f"RM{int(v['min_price']):,}" if v.get("min_price") is not None else "RM?"
    max_p = f"RM{int(v['max_price']):,}" if v.get("max_price") is not None else "RM?"
    desc  = (v.get("description") or "").strip()
    desc_line = f"\n  {desc[:120]}" if desc else ""
    return f"**{v['name']}** — {v['category']} | {min_p}–{max_p} | {v['location']}{desc_line}"


def sanitize_reply(reply_text: str, real_vendors: list) -> str:
    """
    Only flags bold names on vendor-listing lines (contain RM price or | pipe).
    Prevents platform terms like **Expense Tracker** being wrongly flagged.
    """
    if not real_vendors:
        return reply_text

    real_names_lower = {v["name"].lower() for v in real_vendors}

    # Only check bold names on lines that look like vendor entries
    vendor_line_re = re.compile(
        r'\*\*([^*]{4,80})\*\*[^\n]*(?:RM\d|rm\d|\|)',
        re.MULTILINE
    )
    candidate_names = vendor_line_re.findall(reply_text)

    hallucinated = []
    for name in candidate_names:
        name_clean = name.strip().lower()
        if any(term in name_clean or name_clean in term for term in PLATFORM_TERMS):
            continue
        if " " not in name_clean and len(name_clean) < 20:
            continue
        # Check if this name matches any real vendor (partial match allowed)
        is_real = any(
            name_clean in real.lower() or real.lower() in name_clean
            for real in real_names_lower
        )
        if not is_real:
            hallucinated.append(name.strip())

    # Always check for known hallucinated names
    for pat in ["Decorative Wonders", "Starlight Entertainment",
                "Bloom Beauty Studio", "Glamour Makeup", "Pegasus Studios"]:
        if re.search(re.escape(pat), reply_text, re.IGNORECASE):
            hallucinated.append(pat)

    if hallucinated:
        print(f"WARNING: Hallucinated vendors: {hallucinated} — rebuilding from DB")
        by_category: dict = {}
        for v in real_vendors:
            by_category.setdefault(v.get("category", "Other"), []).append(v)
        lines_out = ["Here are the available vendors from our database:\n"]
        for cat, vlist in sorted(by_category.items()):
            lines_out.append(f"**{cat}**")
            for v in vlist:
                lines_out.append(format_vendor_line(v))
            lines_out.append("")
        lines_out.append("Prices are starting ranges — contact vendors directly for exact quotes.")
        return "\n".join(lines_out)

    # Strip fabricated distance/time sentences
    sentences = re.split(r'(?<=[.!?])\s+', reply_text)
    cleaned   = [s for s in sentences if not re.search(
        r'(approximately|about|around|roughly)\s+\d+\s*(minute|hour|km|kilometer)',
        s, re.IGNORECASE
    )]
    if len(cleaned) < len(sentences):
        print("WARNING: Stripped fabricated distance claim from reply")
    return " ".join(cleaned)


# ── Intent detection ──────────────────────────────────────────────────────────
def detect_intent(text: str) -> str:
    """
    Detect what the user is asking about so we can inject the right context.
    Returns one of: vendor_search | comparison | budget_advice | platform_feature |
                    location | capacity | event_planning | general
    """
    t = text.lower()

    if any(w in t for w in ["compare", "difference between", "better", "vs ", "versus", "which is better"]):
        return "comparison"

    if any(w in t for w in ["how do i", "how to", "what is the", "how does", "explain",
                              "what does", "track", "add vendor", "shortlist", "favourite",
                              "contact vendor", "create event", "dashboard", "expense tracker",
                              "my events", "platform"]):
        return "platform_feature"

    if any(w in t for w in ["split", "budget advice", "how much should", "percentage",
                              "allocate", "breakdown", "enough for", "realistic budget",
                              "what can i get for", "afford", "plan my budget"]):
        return "budget_advice"

    if any(w in t for w in ["nearest", "closest", "near", "close to", "from ", "distance",
                              "how far", "location", "which area"]):
        return "location"

    if any(w in t for w in ["guest", "pax", "people", "capacity", "accommodate", "fit",
                              "how many", "seat"]):
        return "capacity"

    if any(w in t for w in ["what should i book", "book first", "plan", "how early",
                              "when to book", "checklist", "steps", "timeline", "tips",
                              "advice", "suggest", "recommend for my event",
                              "what do i need for"]):
        return "event_planning"

    if any(w in t for w in ["vendor", "photographer", "caterer", "venue", "catering",
                              "decoration", "entertainment", "transport", "makeup", "beauty",
                              "show me", "list", "available", "do you have", "wedding",
                              "corporate", "birthday", "under rm", "below rm", "cheapest",
                              "affordable", "budget", "price", "cost", "starting from"]):
        return "vendor_search"

    return "general"


# ── System prompt ─────────────────────────────────────────────────────────────
def build_system_prompt(
    enriched_vendors: list,
    stats: dict,
    vendor_cats: list,
    expense_cats: list,
    distance_context: str = "",
    intent: str = "general",
) -> str:

    # ── Vendor list section ───────────────────────────────────────────────────
    by_cat: dict = {}
    for v in enriched_vendors:
        by_cat.setdefault(v["category"], []).append(v)

    vendor_lines = []
    for cat, vlist in sorted(by_cat.items()):
        vendor_lines.append(f"\n### {cat}")
        for v in vlist:
            vendor_lines.append(
                f"- **{v['name']}** ({v['location']})\n"
                f"  Price: {v['price_range']} [{v['price_tier']}] — {v['vs_market']}\n"
                f"  Best for: {v['suitable_for']}\n"
                f"  Capacity: {v['estimated_capacity']}\n"
                f"  Book: {v['booking_lead_time']}\n"
                f"  About: {v['description'][:150] if v['description'] else 'No description available.'}"
            )
    vendors_text = "\n".join(vendor_lines) if vendor_lines else "No vendors currently available."

    # ── Market stats section ──────────────────────────────────────────────────
    market_summary = ""
    if stats:
        bc  = stats.get("by_category", {})
        mkt = "\n".join(
            f"  - {cat}: {info['count']} vendor(s), avg starting RM{info['avg_starting_price']:,}, range {info['price_range']}"
            for cat, info in bc.items()
        )
        market_summary = f"""
## Market Overview (Live Data)
- Total active vendors: {stats.get('total_vendors', 0)}
- Lowest starting price: RM{stats.get('lowest_starting_price', 0):,}
- Highest max price: RM{stats.get('highest_max_price', 0):,}
- Average starting price: RM{stats.get('avg_starting_price', 0):,}
- Price tiers: {stats.get('price_tiers', {})}
- Most affordable: {stats.get('cheapest_vendor', {}).get('name', 'N/A')} ({stats.get('cheapest_vendor', {}).get('category', '')})
- Most premium: {stats.get('priciest_vendor', {}).get('name', 'N/A')} ({stats.get('priciest_vendor', {}).get('category', '')})
- Locations covered: {', '.join(stats.get('locations', []))}

By category:
{mkt}
"""

    # ── Distance section ──────────────────────────────────────────────────────
    dist_section = distance_context if distance_context else (
        "No distance data for this query. If asked about distances, "
        "state vendor locations only and suggest Google Maps for exact distances."
    )

    # ── Budget advice section ─────────────────────────────────────────────────
    budget_advice_text = "\n".join([
        f"\n### {etype.title()} Event Budget Split (recommended):",
        *[f"  - {cat}: {pct}" for cat, pct in splits.items()]
    ] for etype, splits in BUDGET_SPLIT_ADVICE.items())

    # Fix — join properly
    budget_lines = []
    for etype, splits in BUDGET_SPLIT_ADVICE.items():
        budget_lines.append(f"\n**{etype.title()} Events:**")
        for cat, pct in splits.items():
            budget_lines.append(f"  - {cat}: {pct}")
    budget_advice_text = "\n".join(budget_lines)

    # ── Booking timeline section ──────────────────────────────────────────────
    timeline_text = "\n".join(f"  - {cat}: {lead}" for cat, lead in BOOKING_TIMELINE.items())

    exp_str    = ', '.join(expense_cats) if expense_cats else "Food, Venue, Decoration, etc."
    vendor_str = ', '.join(vendor_cats)  if vendor_cats  else "Venue, Catering, Photography, etc."

    # ── Intent-specific instructions ──────────────────────────────────────────
    intent_instructions = {
        "vendor_search": """
## For this vendor search query:
- List ONLY vendors from the Available Vendors section below
- Use the format: **[Name]** — [Category] | [price_range] | [location] | [price_tier]
- Follow with one sentence using vs_market and suitable_for
- Group by category if showing multiple categories
- End with: "Prices are starting ranges — contact vendors for exact quotes."
""",
        "comparison": """
## For this comparison query:
- Compare ONLY vendors that exist in the Available Vendors section
- Use a clear side-by-side format covering: Price, Location, Best For, Capacity, Value
- Give a clear recommendation at the end based on the user's implied needs
- Do NOT invent vendors that aren't listed
""",
        "budget_advice": """
## For this budget advice query:
- Use the Budget Split Advice section below for percentage recommendations
- Apply the recommended split to the user's stated budget amount if given
- Show a clear RM breakdown table if a budget amount was mentioned
- Reference real vendor prices from the Available Vendors section to show what fits
- Give practical Malaysian event planning advice
""",
        "platform_feature": """
## For this platform feature query:
- Answer clearly and concisely using the Platform Features section below
- Give step-by-step instructions if the user is asking "how to"
- You can mention relevant vendors if it helps illustrate the answer
- Do NOT list all vendors unless specifically asked
""",
        "location": """
## For this location query:
- Use ONLY the Distance Data section below for distances — do NOT guess or invent km/minutes
- Rank vendors by distance from the user's location (nearest first)
- If distance data is unavailable, state the vendor locations and suggest Google Maps
- Use format: **[Name]** — [Category] | [price_range] | [location] | ~X km away
""",
        "capacity": """
## For this capacity query:
- Use the "Capacity" field from each vendor in the Available Vendors section
- Match vendors whose estimated_capacity fits the user's guest count
- Be explicit: state which vendors CAN and CANNOT accommodate the requested size
- Use format: **[Name]** — [Category] | [price_range] | [estimated_capacity]
""",
        "event_planning": """
## For this event planning advice query:
- Use the Booking Timeline section to give lead time advice
- Use the Budget Split section for budget planning guidance
- Recommend specific vendors from the Available Vendors section that fit the event type
- Give practical, actionable advice tailored to Malaysian events
- Structure advice as clear numbered steps if appropriate
""",
        "general": """
## For this general query:
- Answer helpfully using whatever context is most relevant
- If vendors are relevant, reference them from the Available Vendors section only
- Keep the response focused and concise
""",
    }

    active_instruction = intent_instructions.get(intent, intent_instructions["general"])

    return f"""You are EventGo Assistant — a knowledgeable, friendly AI for EventGo, a Malaysian event planning marketplace.

{market_summary}

## ABSOLUTE RULES — NEVER BREAK THESE
1. ONLY recommend vendors from "Available Vendors" below — NEVER invent vendor names
2. If a vendor is not listed, it does not exist on EventGo — say so honestly
3. NEVER repeat the same vendor twice in one response
4. NEVER fabricate distances, travel times, or minutes — use Distance Data section only
5. All prices in RM (Malaysian Ringgit)
6. Keep responses concise and direct — no padding or repetition

{active_instruction}

## Distance Data (use ONLY these figures — do not guess any other distances)
{dist_section}

## Budget Split Advice (use for budget planning questions)
{budget_advice_text}

## Booking Timeline (use for "when to book" and planning questions)
{timeline_text}

## How to Use Enriched Vendor Context
- price_tier → describe as budget-friendly, mid-range, or premium
- vs_market → explain relative value (e.g., "35% below Venue average — great value")
- suitable_for → match to user's event type
- estimated_capacity → answer guest count questions
- booking_lead_time → answer "how early should I book" questions

## Available Vendors (ONLY these exist — do not invent others):
{vendors_text}

## Vendor Categories on EventGo: {vendor_str}

## Platform Features (use for "how do I" questions)
- **My Events**: Create and manage events. Go to "My Events" → click "Create Event" → fill in event name, type, date, and total budget.
- **Expense Tracker**: Track estimated vs actual spending per category ({exp_str}). Go to your event → "Expenses" tab → add expense items with estimated and actual amounts.
- **Shortlist & Select**: Save vendors to your event. Browse vendors → click "Add to Event" → choose status: SHORTLISTED (considering) or SELECTED (confirmed).
- **Compare Vendors**: Compare up to 3 vendors side by side. Select vendors → click "Compare" to see a side-by-side breakdown of price, category, and location.
- **Favourites**: Bookmark any vendor by clicking the heart icon on their profile. View saved vendors under "Favourites" in your profile.
- **Contact Requests**: Send a direct enquiry to any vendor from their profile page. The vendor will respond via the platform.
- **Dashboard**: Your home screen showing all events, total budget, total spent, and upcoming event dates.

## Response Format for vendor lists:
**[Name]** — [Category] | [price_range] | [location] | [price_tier]
[One sentence using vs_market and suitable_for]

End ALL vendor lists with: "Prices are starting ranges — contact vendors directly for exact quotes."
"""


# ── Request / Response models ─────────────────────────────────────────────────
class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list
    user_context: Optional[dict] = None


class ChatResponse(BaseModel):
    reply: str
    vendors_mentioned: list = []


# ── Filter extraction ─────────────────────────────────────────────────────────
def extract_filters(text: str) -> dict:
    filters = {}
    t = text.lower()

    # Max budget
    max_match = re.search(
        r'(?:under|below|max(?:imum)?|budget(?:\s+of)?|less\s+than)\s*rm\s*([\d,]+)'
        r'|rm\s*([\d,]+)\s*(?:budget|max(?:imum)?|or\s+less|and\s+below)',
        t
    )
    if max_match:
        raw = (max_match.group(1) or max_match.group(2) or "").replace(",", "")
        if raw.isdigit():
            filters["max_budget"] = int(raw)

    # Min budget
    min_match = re.search(
        r'(?:minimum|min(?:imum)?|at\s+least|starting\s+(?:at|from)|above|more\s+than)\s*rm\s*([\d,]+)'
        r'|rm\s*([\d,]+)\s*(?:minimum|min(?:imum)?|and\s+above|or\s+more)',
        t
    )
    if min_match:
        raw = (min_match.group(1) or min_match.group(2) or "").replace(",", "")
        if raw.isdigit():
            filters["min_budget"] = int(raw)

    # Fallback: bare RM amount
    if not filters.get("min_budget") and not filters.get("max_budget"):
        plain = re.search(r'rm\s*([\d,]+)', t)
        if plain:
            raw = plain.group(1).replace(",", "")
            if raw.isdigit():
                filters["min_budget"] = int(raw)

    # Vendor location filter
    for loc in ["kuala lumpur", " kl ", "selangor", "putrajaya", "petaling jaya",
                "penang", "johor", "cyberjaya"]:
        if loc.strip() in t:
            filters["location"] = loc.strip()
            break

    # User location (for "nearest to X")
    nearest_match = re.search(
        r'(?:nearest|closest|near|close\s+to|from|distance\s+from)\s+([a-zA-Z\s]{3,25}?)(?:\s*\?|$|\.|,)',
        t
    )
    if nearest_match:
        filters["user_location"] = nearest_match.group(1).strip()

    # Category filter
    category_map = {
        "venue": "venue", "hall": "venue", "ballroom": "venue", "hotel": "venue",
        "catering": "catering", "food": "catering", "caterer": "catering", "buffet": "catering",
        "photo": "photography", "photographer": "photography",
        "video": "videography", "videographer": "videography",
        "decor": "decoration", "decoration": "decoration", "florist": "decoration",
        "entertain": "entertainment", "band": "entertainment", "music": "entertainment", "emcee": "entertainment",
        "transport": "transportation", "car": "transportation", "limo": "transportation",
        "makeup": "beauty", "beauty": "beauty", "bridal": "beauty",
    }
    for kw, cat in category_map.items():
        if kw in t:
            filters["category"] = cat
            break

    # Guest count extraction
    pax_match = re.search(r'(\d+)\s*(?:guest|pax|people|person|attendee)', t)
    if pax_match:
        filters["guest_count"] = int(pax_match.group(1))

    # Event type
    for etype in ["wedding", "corporate", "birthday", "gala", "dinner", "party", "seminar", "conference"]:
        if etype in t:
            filters["event_type"] = etype
            break

    return filters


# ── Chat endpoint ─────────────────────────────────────────────────────────────
@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    if not req.messages:
        raise HTTPException(status_code=400, detail="No messages provided")

    # Handle both Pydantic objects and plain dicts
    def msg_role(m):    return m["role"]    if isinstance(m, dict) else m.role
    def msg_content(m): return m["content"] if isinstance(m, dict) else m.content

    last_user_msg = next(
        (msg_content(m) for m in reversed(req.messages) if msg_role(m) == "user"), ""
    )

    # Detect intent to inject the right instructions
    intent  = detect_intent(last_user_msg)
    filters = extract_filters(last_user_msg)

    # For platform feature questions, don't filter vendors by category
    # (we still want to show all vendors as context)
    vendor_filters = filters.copy()
    if intent == "platform_feature":
        vendor_filters.pop("category", None)
        vendor_filters.pop("min_budget", None)
        vendor_filters.pop("max_budget", None)

    vendors  = fetch_vendors(vendor_filters if vendor_filters else None)
    stats    = fetch_market_stats()
    enriched = enrich_vendors(vendors, stats)
    cats     = fetch_vendor_categories()
    exp_cats = fetch_expense_categories()

    # Distance context
    distance_ctx = ""
    user_loc     = filters.get("user_location", "")
    if user_loc or intent == "location":
        vendor_locs  = list({v["location"] for v in vendors})
        distance_ctx = get_distance_context(user_loc, vendor_locs) if user_loc else ""
        if user_loc and not distance_ctx:
            distance_ctx = (
                f"Distance data for '{user_loc}' is not in our database. "
                f"Do NOT guess distances. State vendor locations and suggest Google Maps."
            )

    print(f"Intent: {intent} | Filters: {filters} | Vendors: {len(vendors)} | avg RM{stats.get('avg_starting_price', 0)}")

    system_prompt = build_system_prompt(enriched, stats, cats, exp_cats, distance_ctx, intent)

    if req.user_context:
        system_prompt += f"\n\n## Current User Context\n{json.dumps(req.user_context, indent=2)}"

    ollama_messages = [{"role": "system", "content": system_prompt}]
    for m in req.messages:
        ollama_messages.append({"role": msg_role(m), "content": msg_content(m)})

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{OLLAMA_BASE_URL}/api/chat",
                json={
                    "model":    OLLAMA_MODEL,
                    "messages": ollama_messages,
                    "stream":   False,
                    "options":  {
                        "temperature": 0.3,
                        "num_predict": 600,
                    },
                },
            )
            response.raise_for_status()
            data       = response.json()
            reply_text = data["message"]["content"]
    except httpx.ConnectError:
        raise HTTPException(
            status_code=502,
            detail="Cannot connect to Ollama. Make sure Ollama is running: `ollama serve`",
        )
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=502, detail=f"Ollama error: {e.response.text}")
    except Exception as e:
        print(f"Ollama error: {e}")
        raise HTTPException(status_code=502, detail=str(e))

    # Guard against hallucinated vendor names
    reply_text = sanitize_reply(reply_text, vendors)

    mentioned = [v["name"] for v in vendors if v["name"].lower() in reply_text.lower()]
    return ChatResponse(reply=reply_text, vendors_mentioned=mentioned)


# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r      = await client.get(f"{OLLAMA_BASE_URL}/api/tags")
            models = [m["name"] for m in r.json().get("models", [])]
        return {"status": "ok", "service": "eventgo-ai-chat", "ollama": "connected", "models": models}
    except Exception:
        return {"status": "degraded", "service": "eventgo-ai-chat", "ollama": "disconnected"}