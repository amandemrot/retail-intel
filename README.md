# 🏆 Bridge AI — Retail Competitive Intelligence Dashboard

A full-stack multi-brand competitive intelligence and compliance monitoring platform for tracking **Intel, AMD, Qualcomm, and Apple** product positioning across **Newegg (US)** and **Mercado Libre (BR)**.

Built with **FastAPI + React + MongoDB Atlas + Google Gemini AI**.

---

## 📸 Features Overview
<img width="1916" height="912" alt="image" src="https://github.com/user-attachments/assets/9e8d4b5d-3839-42b5-b130-e3626a49fbf1" />



### 1. Dashboard Summary
- **Weighted Compliance Scores** — 85% Notebook / 15% Desktop weighted average per brand
- **Share of Shelf** — Brand visibility as percentage of total product listings
- **Promo Share** — Percentage of SKUs currently on discount per brand
- **Competitiveness Leaderboard** — Dynamic ranking: `(Compliance × 0.4) + (Visibility × 0.3) + (Promo × 0.3)`

### 2. 30-Day Historical Trend Charts
- Share of Shelf timeline (Recharts line graph)
- Compliance Score timeline (Recharts line graph)
- Platform toggle: Newegg ↔ Mercado Libre

### 3. SKU Explorer & Auditing
- **Search** by SKU, product name, or processor
- **Filter** by Brand (Intel/AMD/Qualcomm/Apple) and Type (Notebook/Desktop)
- **CSV Export** — Download filtered results as `.csv`
- **Audit Modal** — Drill-down per product showing:
  - Hardware specs (CPU, GPU, RAM, Storage)
  - Compliance checklist (S1, S2, P1–P5 rubric)
  - 30-day scraped price history graph

### 4. Homepage Banner Ad Tracking
- Daily ad share cards with featured brand, discount tags, and campaign links
- Links redirect to real Newegg/Mercado Libre search results

### 5. AI Competitive Copilot
- Natural language Q&A powered by **Google Gemini Pro**
- Context-aware answers using live database metrics
- Example: *"Which brand has the best compliance on Newegg?"*

### 6. Mobile Responsive
- Collapsible hamburger nav on mobile
- 3 breakpoints: 992px / 768px / 480px
- All tables horizontally scrollable

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Python, FastAPI, Uvicorn |
| **Database** | MongoDB Atlas (Cloud) |
| **Analytics** | Pandas (aggregation & weighted scoring) |
| **AI** | Google Gemini Pro API |
| **Frontend** | React 18, Vite, Recharts, Lucide Icons |
| **Styling** | Vanilla CSS, Glassmorphism, Dark Theme |

---

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- MongoDB Atlas account (or local MongoDB)

### 1. Clone the repo
```bash
git clone https://github.com/amandemrot/retail-intel.git
cd retail-intel
```

### 2. Backend Setup
```bash
cd backend

# Create a .env file (copy from template)
cp .env.example .env
# Edit .env and add your real MongoDB URI and Gemini API key

# Install dependencies
pip install -r requirements.txt

# Seed the database with 30 days of mock data
python generate_seed_data.py

# Start the API server
python server.py
```
Server runs at `http://127.0.0.1:8000`

### 3. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```
App runs at `http://localhost:5173`

---

## 📁 Project Structure

```
retail-intel/
├── backend/
│   ├── .env.example          # Environment variables template
│   ├── requirements.txt      # Python dependencies
│   ├── generate_seed_data.py # Database seeder (30 days × 3 scrapes/day)
│   ├── analytics.py          # Compliance scoring & aggregation engine
│   └── server.py             # FastAPI REST API + Gemini Copilot
├── frontend/
│   ├── src/
│   │   ├── App.jsx           # Main dashboard UI (4 tabs)
│   │   ├── index.css         # Responsive glassmorphic styles
│   │   └── main.jsx          # React entry point
│   ├── package.json
│   └── vite.config.js
├── .gitignore
└── README.md
```

---

## 📊 Compliance Scoring Logic

The weighted compliance score for each brand is calculated as:

```
Weighted Score = (Notebook Avg × 0.85) + (Desktop Avg × 0.15)
```

Each product is audited against 7 rubric checks:
| Code | Check | Page |
|------|-------|------|
| S1 | Brand name in title | Search/List |
| S2 | Badge present | Search/List |
| P1 | Brand name in title | Product |
| P2 | Badge present | Product |
| P3 | Specs table compliance | Product |
| P4 | Brand rich media | Product |
| P5 | OEM rich media | Product |

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/summary` | KPI metrics (compliance, shelf, pricing) |
| GET | `/api/dashboard/trends` | 30-day historical trend data |
| GET | `/api/products?platform=&brand=&type=&search=` | Filtered product list |
| GET | `/api/products/{id}` | Product details + price history |
| GET | `/api/banners?platform=` | Homepage banner ad timeline |
| POST | `/api/copilot/chat` | AI Copilot natural language query |

---

## 👤 Author

**Aman Demrot**  
Chemical Engineering @ MNIT Jaipur  
Full-stack Developer (MERN)  
[GitHub](https://github.com/amandemrot)
