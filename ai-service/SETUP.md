# EventGo AI Chat — Setup Guide

A floating AI chat assistant powered by **AWS Bedrock (Claude claude-sonnet-4-20250514)** that answers user
questions about vendors, features, budgets, and event planning — using live data
from your PostgreSQL database.

---

## Architecture

```
frontend-user (React)
    └── ChatWidget.jsx          ← floating chat bubble UI
            │  POST /api/chat
            ▼
backend (Node.js / Express)
    └── src/modules/chat/
            chat.routes.js      ← /api/chat endpoint
            chat.controller.js  ← proxies to Python service
            │  POST http://localhost:8000/chat
            ▼
ai-service/ (Python / FastAPI)
    └── main.py                 ← fetches live DB data + calls Bedrock
            │
            ├── PostgreSQL      ← reads vendors, categories in real-time
            └── AWS Bedrock     ← Claude claude-sonnet-4-20250514 (claude-sonnet-4-20250514)
```

---

## File Placement

Copy the new files into your project exactly as shown:

```
your-project/
├── ai-service/                         ← NEW folder (sibling of backend/)
│   ├── main.py
│   ├── requirements.txt
│   └── .env.example  →  .env           ← copy & fill in
│
├── backend/
│   ├── src/
│   │   ├── app.js                      ← UPDATED (add chat route)
│   │   └── modules/
│   │       └── chat/                   ← NEW folder
│   │           ├── chat.controller.js
│   │           └── chat.routes.js
│   └── .env                            ← ADD: AI_SERVICE_URL=http://localhost:8000
│
└── frontend-user/
    └── src/
        └── components/
            ├── chat/                   ← NEW folder/
            │   └── ChatWidget.jsx
            └── layout/
                └── Layout.jsx          ← UPDATED (import ChatWidget)/
```

---

## Step 1 — AWS Bedrock Setup

1. Log in to **AWS Console** → go to **Amazon Bedrock**
2. In the left menu, click **Model access** → **Manage model access**
3. Enable **Claude claude-sonnet-4-20250514** (under Anthropic)
4. Go to **IAM** → create or use an existing user → attach policy:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [{
       "Effect": "Allow",
       "Action": ["bedrock:InvokeModel"],
       "Resource": "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-sonnet-4-20250514-v1:0"
     }]
   }
   ```
5. Generate **Access Key ID** and **Secret Access Key** for that IAM user

---

## Step 2 — AI Service Setup

```bash
# Navigate to the ai-service folder
cd ai-service

# Create virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create your .env file
cp .env.example .env
```

Edit `ai-service/.env`:
```env
AWS_ACCESS_KEY_ID=AKIA...your_key...
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1

# Same DATABASE_URL as your backend
DATABASE_URL=postgresql://user:password@localhost:5432/eventgo
```

Start the AI service:
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Verify it's running:
```bash
curl http://localhost:8000/health
# → {"status":"ok","service":"eventgo-ai-chat"}
```

---

## Step 3 — Backend Setup

Add to your **backend `.env`** file:
```env
AI_SERVICE_URL=http://localhost:8000
```

Replace `backend/src/app.js` with the updated version (adds the `/api/chat` route).

Add the new files:
```
backend/src/modules/chat/chat.controller.js
backend/src/modules/chat/chat.routes.js
```

No new npm packages needed — uses native `fetch` (Node 18+).

Restart the backend:
```bash
npm run dev
```

---

## Step 4 — Frontend Setup

Replace:
```
frontend-user/src/components/layout/Layout.jsx
```

Add new file:
```
frontend-user/src/components/chat/ChatWidget.jsx
```

No new npm packages needed — uses existing dependencies (React, lucide-react, axios).

Restart frontend:
```bash
npm run dev
```

---

## Running All Services

You need **3 terminals**:

```bash
# Terminal 1 — AI service
cd ai-service && source venv/bin/activate && uvicorn main:app --port 8000 --reload

# Terminal 2 — Backend
cd backend && npm run dev

# Terminal 3 — Frontend
cd frontend-user && npm run dev
```

---

## What the AI Can Answer

| Topic | Example Questions |
|-------|-------------------|
| Vendor recommendations | "Best venues for a wedding under RM15,000?" |
| Vendor comparisons | "Compare The Grand Ballroom vs Garden Terrace" |
| Platform features | "How do I add a vendor to my event?" |
| Budget planning | "How should I split my RM20,000 event budget?" |
| Expense tracking | "What expense categories are available?" |
| Category browsing | "What photography vendors do you have in KL?" |
| General planning tips | "How far in advance should I book catering?" |

---

## Troubleshooting

**"AI service unavailable" error**
→ Make sure `uvicorn` is running on port 8000 and `AI_SERVICE_URL` is set in backend `.env`

**"Bedrock error: AccessDeniedException"**
→ Check that Bedrock model access is enabled for Claude claude-sonnet-4-20250514 in your AWS region

**"could not connect to server" (DB error in AI service)**
→ Check `DATABASE_URL` in `ai-service/.env` matches your backend's database URL

**Chat widget not appearing**
→ Make sure `Layout.jsx` was updated and `ChatWidget.jsx` is in `src/components/chat/`
