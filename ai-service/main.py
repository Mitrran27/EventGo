# """
# EventGo AI Chat Microservice
# Powered by AWS Bedrock (Claude claude-sonnet-4-20250514)
# Run: uvicorn main:app --host 0.0.0.0 --port 8000 --reload
# """

# import json
# import os
# import re
# from typing import Optional

# import boto3
# import psycopg2
# import psycopg2.extras
# from dotenv import load_dotenv
# from fastapi import FastAPI, HTTPException
# from fastapi.middleware.cors import CORSMiddleware
# from pydantic import BaseModel

# load_dotenv()

# app = FastAPI(title="EventGo AI Chat", version="1.0.0")

# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# # ── AWS Bedrock client ────────────────────────────────────────────────────────
# bedrock = boto3.client(
#     service_name="bedrock-runtime",
#     region_name=os.getenv("AWS_REGION", "us-east-1"),
#     aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
#     aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
# )

# MODEL_ID = "anthropic.claude-sonnet-4-20250514-v1:0"


# # ── DB helpers ────────────────────────────────────────────────────────────────
# def get_db_conn():
#     return psycopg2.connect(os.getenv("DATABASE_URL"), cursor_factory=psycopg2.extras.RealDictCursor)


# def fetch_vendors(filters: dict = None) -> list[dict]:
#     """Fetch active vendors, optionally filtered by category or price."""
#     try:
#         conn = get_db_conn()
#         cur = conn.cursor()
#         query = """
#             SELECT v.id, v.name, v.description, v.min_price, v.max_price,
#                    v.location, v.image_url, vc.name AS category
#             FROM vendors v
#             JOIN vendor_categories vc ON v.category_id = vc.id
#             WHERE v.deleted = false AND v.is_active = true
#         """
#         params = []
#         if filters:
#             if filters.get("category"):
#                 query += " AND LOWER(vc.name) LIKE %s"
#                 params.append(f"%{filters['category'].lower()}%")
#             if filters.get("max_budget"):
#                 query += " AND v.min_price <= %s"
#                 params.append(filters["max_budget"])
#             if filters.get("location"):
#                 query += " AND LOWER(v.location) LIKE %s"
#                 params.append(f"%{filters['location'].lower()}%")
#         query += " ORDER BY v.created_at DESC LIMIT 30"
#         cur.execute(query, params)
#         rows = cur.fetchall()
#         conn.close()
#         return [dict(r) for r in rows]
#     except Exception as e:
#         print(f"DB error fetching vendors: {e}")
#         return []


# def fetch_vendor_categories() -> list[str]:
#     try:
#         conn = get_db_conn()
#         cur = conn.cursor()
#         cur.execute("SELECT name FROM vendor_categories WHERE deleted = false ORDER BY name")
#         rows = cur.fetchall()
#         conn.close()
#         return [r["name"] for r in rows]
#     except Exception as e:
#         print(f"DB error fetching categories: {e}")
#         return ["Venue", "Catering", "Photography", "Decoration", "Entertainment", "Transportation"]


# def fetch_expense_categories() -> list[str]:
#     try:
#         conn = get_db_conn()
#         cur = conn.cursor()
#         cur.execute("SELECT name FROM expense_categories WHERE deleted = false ORDER BY name")
#         rows = cur.fetchall()
#         conn.close()
#         return [r["name"] for r in rows]
#     except Exception as e:
#         print(f"DB error fetching expense cats: {e}")
#         return []


# # ── System prompt builder ─────────────────────────────────────────────────────
# def build_system_prompt(vendors: list[dict], vendor_cats: list[str], expense_cats: list[str]) -> str:
#     vendors_json = json.dumps(vendors, indent=2, default=str)
#     return f"""You are EventGo Assistant — a friendly, knowledgeable AI helper for the EventGo platform, a Malaysian event planning marketplace.

# ## Your Role
# Help users plan their events by:
# - Recommending suitable vendors from the live database (provided below)
# - Explaining EventGo platform features and how to use them
# - Comparing vendors based on price, category, and location
# - Advising on event budgets and expense planning
# - Guiding users through the event planning process

# ## Platform Features You Can Explain
# - **Explore Vendors**: Browse and filter vendors by category, price range, and location
# - **My Events**: Create and manage events with type, date, and total budget
# - **Expense Tracker**: Track estimated vs actual costs per expense category
# - **Shortlist & Select Vendors**: Add vendors to events with SHORTLISTED or SELECTED status
# - **Compare Vendors**: Side-by-side comparison of up to 3 vendors
# - **Favourites**: Save vendors you love for later
# - **Contact Requests**: Send enquiry messages directly to vendors
# - **Dashboard**: Overview of all your events, budgets, and spending

# ## Vendor Categories Available
# {', '.join(vendor_cats)}

# ## Expense Categories Available
# {', '.join(expense_cats)}

# ## Live Vendor Database (as of now)
# ```json
# {vendors_json}
# ```

# ## Response Guidelines
# - Be warm, helpful and conversational — like a knowledgeable friend
# - When recommending vendors, mention their name, category, price range (min_price–max_price in MYR), and location
# - For budget advice, use Malaysian context (MYR currency)
# - If asked to compare vendors, present a clear comparison table or structured breakdown
# - If a user describes their event type/budget, proactively suggest the most relevant vendors
# - Keep responses concise but complete — use bullet points for lists
# - If asked something outside event planning, gently redirect to how you can help with their event
# - Always mention that prices are starting ranges and users should contact vendors directly for exact quotes
# - Use "RM" for Malaysian Ringgit
# """


# # ── Request / Response models ─────────────────────────────────────────────────
# class Message(BaseModel):
#     role: str  # "user" or "assistant"
#     content: str


# class ChatRequest(BaseModel):
#     messages: list[Message]
#     user_context: Optional[dict] = None  # e.g. {"name": "Ali", "eventType": "Wedding"}


# class ChatResponse(BaseModel):
#     reply: str
#     vendors_mentioned: list[str] = []


# # ── Chat endpoint ─────────────────────────────────────────────────────────────
# @app.post("/chat", response_model=ChatResponse)
# async def chat(req: ChatRequest):
#     if not req.messages:
#         raise HTTPException(status_code=400, detail="No messages provided")

#     # Detect if the conversation is about vendors so we can pre-filter
#     last_user_msg = ""
#     for m in reversed(req.messages):
#         if m.role == "user":
#             last_user_msg = m.content.lower()
#             break

#     # Smart context: figure out filters from the user's message
#     filters = {}
#     budget_match = re.search(r"rm\s*([\d,]+)|budget.*?([\d,]+)", last_user_msg)
#     if budget_match:
#         raw = (budget_match.group(1) or budget_match.group(2) or "").replace(",", "")
#         if raw.isdigit():
#             filters["max_budget"] = int(raw)

#     location_keywords = ["kuala lumpur", "kl", "selangor", "putrajaya", "penang", "johor"]
#     for loc in location_keywords:
#         if loc in last_user_msg:
#             filters["location"] = loc
#             break

#     category_keywords = {
#         "venue": "venue", "hall": "venue", "ballroom": "venue",
#         "catering": "catering", "food": "catering", "caterer": "catering",
#         "photo": "photography", "photographer": "photography",
#         "video": "videography", "videographer": "videography",
#         "decor": "decoration", "decoration": "decoration", "florist": "decoration",
#         "entertain": "entertainment", "band": "entertainment", "music": "entertainment",
#         "transport": "transportation", "car": "transportation",
#         "makeup": "beauty", "beauty": "beauty",
#     }
#     for kw, cat in category_keywords.items():
#         if kw in last_user_msg:
#             filters["category"] = cat
#             break

#     # Fetch live data
#     vendors = fetch_vendors(filters if filters else None)
#     vendor_cats = fetch_vendor_categories()
#     expense_cats = fetch_expense_categories()

#     system_prompt = build_system_prompt(vendors, vendor_cats, expense_cats)

#     # Add user context if available
#     if req.user_context:
#         system_prompt += f"\n\n## Current User Context\n{json.dumps(req.user_context, indent=2)}"

#     # Build Bedrock messages
#     bedrock_messages = [{"role": m.role, "content": m.content} for m in req.messages]

#     try:
#         response = bedrock.invoke_model(
#             modelId=MODEL_ID,
#             body=json.dumps({
#                 "anthropic_version": "bedrock-2023-05-31",
#                 "max_tokens": 1024,
#                 "system": system_prompt,
#                 "messages": bedrock_messages,
#             }),
#             contentType="application/json",
#             accept="application/json",
#         )
#         body = json.loads(response["body"].read())
#         reply_text = body["content"][0]["text"]
#     except Exception as e:
#         print(f"Bedrock error: {e}")
#         raise HTTPException(status_code=502, detail=f"AI service error: {str(e)}")

#     # Extract vendor names mentioned in the reply
#     mentioned = [v["name"] for v in vendors if v["name"].lower() in reply_text.lower()]

#     return ChatResponse(reply=reply_text, vendors_mentioned=mentioned)


# @app.get("/health")
# async def health():
#     return {"status": "ok", "service": "eventgo-ai-chat"}



# --------------------

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


# ── DB helpers ────────────────────────────────────────────────────────────────
def get_db_conn():
    return psycopg2.connect(
        os.getenv("DATABASE_URL"),
        cursor_factory=psycopg2.extras.RealDictCursor,
    )


def fetch_vendors(filters: dict = None) -> list[dict]:
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
            if filters.get("max_budget"):
                query += ' AND v."minPrice" <= %s'
                params.append(filters["max_budget"])
            if filters.get("min_budget"):
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


def fetch_vendor_categories() -> list[str]:
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


def fetch_expense_categories() -> list[str]:
    try:
        conn = get_db_conn()
        cur  = conn.cursor()
        cur.execute("SELECT name FROM expense_categories WHERE deleted = false ORDER BY name")
        rows = cur.fetchall()
        conn.close()
        return [r["name"] for r in rows]
    except Exception as e:
        print(f"DB error: {e}")
        return []


# ── Hallucination guard ───────────────────────────────────────────────────────
def format_vendor_line(v: dict) -> str:
    """Format a single vendor as a clean text line from real DB data."""
    min_p = f"RM{int(v['min_price']):,}" if v.get('min_price') is not None else "RM?"
    max_p = f"RM{int(v['max_price']):,}" if v.get('max_price') is not None else "RM?"
    desc  = (v.get("description") or "").strip()
    desc_line = f"\n  {desc[:120]}" if desc else ""
    return f"**{v['name']}** — {v['category']} | {min_p}–{max_p} | {v['location']}{desc_line}"


def sanitize_reply(reply_text: str, real_vendors: list[dict]) -> str:
    """
    Detect hallucinated vendor names in the AI reply.
    If any bold **Name** in the reply is NOT a real vendor from the DB,
    discard the AI reply and build a guaranteed-accurate response instead.
    """
    if not real_vendors:
        return reply_text

    real_names_lower = {v["name"].lower() for v in real_vendors}

    # Extract bold names from the reply (**Vendor Name**)
    bold_names = re.findall(r"\*\*([^*]{4,60})\*\*", reply_text)
    hallucinated = []
    for name in bold_names:
        name_clean = name.strip().lower()
        # Skip category headers (short or all-alpha single words)
        if len(name_clean) < 5:
            continue
        # Check if this name matches any real vendor (partial match allowed)
        is_real = any(
            name_clean in real.lower() or real.lower() in name_clean
            for real in real_names_lower
        )
        if not is_real:
            hallucinated.append(name.strip())

    if not hallucinated:
        return reply_text  # clean — use AI response as-is

    print(f"WARNING: Hallucinated vendors detected: {hallucinated} — rebuilding from DB")

    # Build guaranteed-accurate response grouped by category
    lines = ["Here are the available vendors from our database:\n"]
    by_category: dict = {}
    for v in real_vendors:
        cat = v.get("category", "Other")
        by_category.setdefault(cat, []).append(v)

    for cat, vlist in sorted(by_category.items()):
        lines.append(f"**{cat}**")
        for v in vlist:
            lines.append(format_vendor_line(v))
        lines.append("")

    lines.append("Prices are starting ranges — contact vendors directly for exact quotes.")
    return "\n".join(lines)


# ── System prompt ─────────────────────────────────────────────────────────────
def build_system_prompt(vendors: list[dict], vendor_cats: list[str], expense_cats: list[str]) -> str:
    vendors_json = json.dumps(vendors, indent=2, default=str)
    return f"""You are EventGo Assistant — a concise, helpful AI for EventGo, a Malaysian event planning platform.

## STRICT RESPONSE RULES — FOLLOW EXACTLY
- NEVER repeat the same vendor twice in one response
- NEVER list vendors in one section then mention them again below
- Keep responses SHORT and DIRECT — no filler, no padding
- Use ONE clean grouped list only, not multiple sections
- Do NOT say "here are some vendors" AND THEN say "some vendors that match" — one intro only
- Do NOT summarise the list again after showing it
- Maximum 150 words unless the user explicitly asks for more detail
- Only recommend vendors that exist in the Live Vendors list below — do NOT invent vendors

## Your Role
- Recommend vendors from the live database below
- Explain EventGo features: My Events, Expense Tracker, Shortlist, Compare Vendors, Favourites, Contact Requests
- Help with budget planning and vendor comparisons
- All prices are in RM (Malaysian Ringgit)

## Vendor Categories Available: {', '.join(vendor_cats)}
## Expense Categories Available: {', '.join(expense_cats)}

## Live Vendors (ONLY recommend these — do not make up others):
```json
{vendors_json}
```

## Exact format for listing vendors — use this every time, no variations:
**[Name]** — [Category] | RM[minPrice]–RM[maxPrice] | [Location]
[One sentence max about what they offer]

End every vendor list with one line: "Prices are starting ranges — contact vendors directly for exact quotes."
"""


# ── Request / Response models ─────────────────────────────────────────────────
class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[Message]
    user_context: Optional[dict] = None


class ChatResponse(BaseModel):
    reply: str
    vendors_mentioned: list[str] = []


# ── Smart filter extraction ───────────────────────────────────────────────────
def extract_filters(text: str) -> dict:
    filters = {}
    text    = text.lower()

    # Max budget: "under RM5000", "below RM5000", "budget RM5000", "less than RM5000"
    max_match = re.search(
        r"(?:under|below|max(?:imum)?|budget(?:\s+of)?|less\s+than)\s*rm\s*([\d,]+)"
        r"|rm\s*([\d,]+)\s*(?:budget|max(?:imum)?|or\s+less|and\s+below)",
        text
    )
    if max_match:
        raw = (max_match.group(1) or max_match.group(2) or "").replace(",", "")
        if raw.isdigit():
            filters["max_budget"] = int(raw)

    # Min budget: "minimum RM2000", "at least RM2000", "from RM2000", "above RM2000"
    min_match = re.search(
        r"(?:minimum|min(?:imum)?|at\s+least|from|starting\s+(?:at|from)|above|more\s+than)\s*rm\s*([\d,]+)"
        r"|rm\s*([\d,]+)\s*(?:minimum|min(?:imum)?|and\s+above|or\s+more)",
        text
    )
    if min_match:
        raw = (min_match.group(1) or min_match.group(2) or "").replace(",", "")
        if raw.isdigit():
            filters["min_budget"] = int(raw)

    # Fallback: bare "rm2000" with no qualifier → treat as min budget
    if not filters.get("min_budget") and not filters.get("max_budget"):
        plain = re.search(r"rm\s*([\d,]+)", text)
        if plain:
            raw = plain.group(1).replace(",", "")
            if raw.isdigit():
                filters["min_budget"] = int(raw)

    # Location
    for loc in ["kuala lumpur", "kl", "selangor", "putrajaya", "penang", "johor"]:
        if loc in text:
            filters["location"] = loc
            break

    # Category
    category_map = {
        "venue": "venue", "hall": "venue", "ballroom": "venue",
        "catering": "catering", "food": "catering", "caterer": "catering",
        "photo": "photography", "photographer": "photography",
        "video": "videography", "videographer": "videography",
        "decor": "decoration", "decoration": "decoration", "florist": "decoration",
        "entertain": "entertainment", "band": "entertainment", "music": "entertainment",
        "transport": "transportation",
        "makeup": "beauty", "beauty": "beauty",
    }
    for kw, cat in category_map.items():
        if kw in text:
            filters["category"] = cat
            break

    return filters


# ── Chat endpoint ─────────────────────────────────────────────────────────────
@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    if not req.messages:
        raise HTTPException(status_code=400, detail="No messages provided")

    last_user_msg = next(
        (m.content for m in reversed(req.messages) if m.role == "user"), ""
    )

    filters  = extract_filters(last_user_msg)
    vendors  = fetch_vendors(filters if filters else None)
    cats     = fetch_vendor_categories()
    exp_cats = fetch_expense_categories()

    print(f"Filters: {filters} → {len(vendors)} vendors")

    system_prompt = build_system_prompt(vendors, cats, exp_cats)
    if req.user_context:
        system_prompt += f"\n\n## Current User\n{json.dumps(req.user_context, indent=2)}"

    ollama_messages = [{"role": "system", "content": system_prompt}]
    for m in req.messages:
        ollama_messages.append({"role": m.role, "content": m.content})

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{OLLAMA_BASE_URL}/api/chat",
                json={
                    "model":    OLLAMA_MODEL,
                    "messages": ollama_messages,
                    "stream":   False,
                    "options":  {
                        "temperature": 0.3,  # lower = more focused, less repetition
                        "num_predict": 512,  # cap response length
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


@app.get("/health")
async def health():
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r      = await client.get(f"{OLLAMA_BASE_URL}/api/tags")
            models = [m["name"] for m in r.json().get("models", [])]
        return {"status": "ok", "service": "eventgo-ai-chat", "ollama": "connected", "models": models}
    except Exception:
        return {"status": "degraded", "service": "eventgo-ai-chat", "ollama": "disconnected"}