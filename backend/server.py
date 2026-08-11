import os
import json
from bson import ObjectId
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import google.generativeai as genai

from analytics import get_db, get_dashboard_summary, get_historical_trends

# Load env configurations
load_dotenv()

# Initialize Gemini Model
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY and GEMINI_API_KEY != "your_gemini_api_key_here":
    genai.configure(api_key=GEMINI_API_KEY)
    gemini_enabled = True
else:
    gemini_enabled = False
    print("WARNING: GEMINI_API_KEY not configured. AI feature will return placeholders.")

app = FastAPI(title="Bridge AI Competitive Intel API")

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Helper to format MongoDB ObjectIds to strings
def serialize_mongo(doc):
    if not doc:
        return None
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    return doc

# Request model for AI Copilot
class ChatRequest(BaseModel):
    message: str

# 1. Summary Metrics Endpoint
@app.get("/api/dashboard/summary")
def get_summary():
    try:
        return get_dashboard_summary()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 2. Historical Trends Endpoint
@app.get("/api/dashboard/trends")
def get_trends():
    try:
        return get_historical_trends()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 3. SKU Explorer / Products List Endpoint with search & filters
@app.get("/api/products")
def list_products(
    platform: str = None,
    brand: str = None,
    oem: str = None,
    type_: str = Query(None, alias="type"),
    search: str = None
):
    try:
        db = get_db()
        query = {}
        if platform:
            query["platform"] = platform
        if brand:
            query["brand"] = brand
        if oem:
            query["oem"] = oem
        if type_:
            query["type"] = type_
        if search:
            query["$or"] = [
                {"name": {"$regex": search, "$options": "i"}},
                {"processor": {"$regex": search, "$options": "i"}},
                {"sku": {"$regex": search, "$options": "i"}}
            ]
            
        products = list(db.products.find(query))
        serialized = []
        
        for p in products:
            p_serial = serialize_mongo(p)
            latest_scrape = db.scrapes.find_one(
                {"product_id": ObjectId(p_serial["id"])},
                sort=[("timestamp", -1)]
            )
            if latest_scrape:
                p_serial["current_price"] = latest_scrape["price"]
                p_serial["original_price"] = latest_scrape["original_price"]
                p_serial["on_promo"] = latest_scrape["on_promo"]
                p_serial["audit"] = latest_scrape["audit"]
                
                aud = latest_scrape["audit"]
                score = sum(1 for val in aud.values() if val is True) / len(aud) * 100
                p_serial["compliance_score"] = round(score, 1)
            else:
                p_serial["current_price"] = p["base_price"]
                p_serial["original_price"] = p["base_price"]
                p_serial["on_promo"] = False
                p_serial["compliance_score"] = 100.0
                p_serial["audit"] = {}
                
            serialized.append(p_serial)
            
        return serialized
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 4. Product Details with price & compliance history endpoint
@app.get("/api/products/{product_id}")
def get_product_details(product_id: str):
    try:
        db = get_db()
        product = db.products.find_one({"_id": ObjectId(product_id)})
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
            
        product_serial = serialize_mongo(product)
        
        history = list(db.scrapes.find(
            {"product_id": ObjectId(product_id)}
        ).sort("timestamp", -1).limit(30))
        
        history_serialized = []
        for h in history:
            h_serial = serialize_mongo(h)
            h_serial["timestamp"] = h_serial["timestamp"].strftime('%Y-%m-%d %H:%M')
            del h_serial["product_id"]
            history_serialized.append(h_serial)
            
        product_serial["history"] = history_serialized[::-1]
        return product_serial
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 5. Banner Ads Timeline Endpoint
@app.get("/api/banners")
def get_banners(platform: str = None):
    try:
        db = get_db()
        query = {}
        if platform:
            query["platform"] = platform
            
        banners = list(db.banners.find(query).sort("timestamp", -1).limit(60))
        serialized = []
        for b in banners:
            b_serial = serialize_mongo(b)
            b_serial["timestamp"] = b_serial["timestamp"].strftime('%Y-%m-%d')
            serialized.append(b_serial)
        return serialized
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 6. AI Copilot Chatbot (Gemini Q&A Agent)
@app.post("/api/copilot/chat")
def ask_copilot(req: ChatRequest):
    if not gemini_enabled:
        return {
            "reply": "I'm running in demo mode since your GEMINI_API_KEY is not configured in .env. Setup the key to enable full AI analytics!"
        }
        
    try:
        db = get_db()
        
        summary = get_dashboard_summary()
        products_sample = list(db.products.find({}, {"name": 1, "brand": 1, "oem": 1, "platform": 1, "base_price": 1}).limit(10))
        
        failed_scrapes = list(db.scrapes.find({"audit.S2": False}).limit(3)) + list(db.scrapes.find({"audit.P2": False}).limit(3))
        failed_items = []
        for f in failed_scrapes:
            prod = db.products.find_one({"_id": f["product_id"]})
            if prod:
                failed_items.append(f"{prod['brand']} {prod['name']} on {prod['platform']}")
        
        system_prompt = f"""
        You are 'Bridge AI Retail Copilot', an expert data analyst assistant. 
        You help the user explore and understand competitive pricing, promotions, and brand compliance metrics for chip manufacturers (Intel, AMD, Qualcomm, Apple) across Newegg and Mercado Libre.
        
        Use the following database summary to answer the user's questions in plain English.
        Be specific, reference exact numbers where applicable, and offer actionable insights.
        
        --- DATABASE CONTEXT ---
        Current Brand Compliance Scores (85% Notebooks / 15% Desktops):
        {json.dumps(summary.get('compliance'), indent=2)}
        
        Current Share of Shelf:
        {json.dumps(summary.get('share_of_shelf'), indent=2)}
        
        Pricing and Promo Share:
        {json.dumps(summary.get('pricing'), indent=2)}
        
        Sample Products list:
        {json.dumps([serialize_mongo(p) for p in products_sample], indent=2)}
        
        Recent Compliance Failure Highlights:
        {json.dumps(failed_items, indent=2)}
        ------------------------
        
        Always keep answers concise, professional, and clear. Format using clean Markdown.
        """
        
        model = genai.GenerativeModel('gemini-pro')
        chat = model.start_chat(history=[])
        
        prompt = f"{system_prompt}\n\nUser Question: {req.message}\nAnswer:"
        response = chat.send_message(prompt)
        
        return {"reply": response.text}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)