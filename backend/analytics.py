import os
import pandas as pd
from datetime import datetime, timedelta
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/retail_intel")

def get_db():
    client = MongoClient(MONGO_URI)
    return client.get_database()

def get_dashboard_summary():
    db = get_db()
    
    products = list(db.products.find())
    scrapes = list(db.scrapes.find())
    banners = list(db.banners.find())
    
    if not products or not scrapes:
        return {}
        
    df_prod = pd.DataFrame(products)
    df_scrap = pd.DataFrame(scrapes)
    
    df_prod['_id'] = df_prod['_id'].astype(str)
    df_scrap['product_id'] = df_scrap['product_id'].astype(str)
    
    df = pd.merge(df_scrap, df_prod, left_on='product_id', right_on='_id')
    
    latest_date = df['timestamp'].max()
    df_latest = df[df['timestamp'] >= (latest_date - timedelta(hours=24))]
    
    def calc_weighted_compliance(group):
        audit_cols = ['S1', 'S2', 'P1', 'P2', 'P3', 'P4', 'P5']
        audits = pd.json_normalize(group['audit'])
        for col in audit_cols:
            if col not in audits.columns:
                audits[col] = True
        
        group['score'] = audits[audit_cols].mean(axis=1).values * 100
        
        notebooks = group[group['type'] == 'Notebook']
        desktops = group[group['type'] == 'Desktop']
        
        nb_score = float(notebooks['score'].mean()) if len(notebooks) > 0 else 100.0
        dt_score = float(desktops['score'].mean()) if len(desktops) > 0 else 100.0
        
        if len(notebooks) > 0 and len(desktops) > 0:
            weighted_score = (nb_score * 0.85) + (dt_score * 0.15)
        elif len(notebooks) > 0:
            weighted_score = nb_score
        else:
            weighted_score = dt_score
            
        return round(float(weighted_score), 1)

    compliance_summary = {}
    for platform in df_latest['platform'].unique():
        compliance_summary[platform] = {}
        df_plat = df_latest[df_latest['platform'] == platform]
        
        for brand in df_plat['brand'].unique():
            df_brand = df_plat[df_plat['brand'] == brand]
            compliance_summary[platform][brand] = calc_weighted_compliance(df_brand)

    shelf_summary = {}
    for platform in df_latest['platform'].unique():
        shelf_summary[platform] = {}
        df_plat = df_latest[df_latest['platform'] == platform]
        total_products = len(df_plat['product_id'].unique())
        
        for brand in ['Intel', 'AMD', 'Qualcomm', 'Apple']:
            brand_products = len(df_plat[df_plat['brand'] == brand]['product_id'].unique())
            pct = (brand_products / total_products * 100) if total_products > 0 else 0
            shelf_summary[platform][brand] = round(float(pct), 1)

    pricing_summary = []
    for platform in df_latest['platform'].unique():
        df_plat = df_latest[df_latest['platform'] == platform]
        for brand in df_plat['brand'].unique():
            df_b = df_plat[df_plat['brand'] == brand]
            avg_price = df_b['price'].mean()
            discounted_count = df_b[df_b['on_promo'] == True]['product_id'].nunique()
            total_count = df_b['product_id'].nunique()
            
            pricing_summary.append({
                "platform": platform,
                "brand": brand,
                "avg_price": round(float(avg_price), 2),
                "promo_share": round(float((discounted_count / total_count * 100) if total_count > 0 else 0), 1)
            })

    return {
        "compliance": compliance_summary,
        "share_of_shelf": shelf_summary,
        "pricing": pricing_summary
    }

def get_historical_trends(days=30):
    db = get_db()
    products = list(db.products.find())
    scrapes = list(db.scrapes.find())
    
    if not products or not scrapes:
        return []
        
    df_prod = pd.DataFrame(products)
    df_scrap = pd.DataFrame(scrapes)
    
    df_prod['_id'] = df_prod['_id'].astype(str)
    df_scrap['product_id'] = df_scrap['product_id'].astype(str)
    
    df = pd.merge(df_scrap, df_prod, left_on='product_id', right_on='_id')
    df['date'] = df['timestamp'].dt.date
    
    trends = []
    unique_dates = sorted(df['date'].unique())
    
    for date in unique_dates:
        df_date = df[df['date'] == date]
        date_str = date.strftime('%Y-%m-%d')
        
        for platform in df_date['platform'].unique():
            df_plat = df_date[df_date['platform'] == platform]
            total_items = len(df_plat)
            
            for brand in ['Intel', 'AMD', 'Qualcomm', 'Apple']:
                df_brand = df_plat[df_plat['brand'] == brand]
                if len(df_brand) == 0:
                    continue
                    
                shelf_pct = (len(df_brand) / total_items * 100) if total_items > 0 else 0
                
                audits = pd.json_normalize(df_brand['audit'])
                audit_cols = ['S1', 'S2', 'P1', 'P2', 'P3', 'P4', 'P5']
                for col in audit_cols:
                    if col not in audits.columns:
                        audits[col] = True
                compliance_avg = audits[audit_cols].mean().mean() * 100
                
                avg_price = df_brand['price'].mean()
                
                trends.append({
                    "date": date_str,
                    "platform": platform,
                    "brand": brand,
                    "shelf_share": round(float(shelf_pct), 1),
                    "compliance": round(float(compliance_avg), 1),
                    "avg_price": round(float(avg_price), 2)
                })
                
    return trends

if __name__ == "__main__":
    print("Testing Analytics Calculations...")
    summary = get_dashboard_summary()
    print("Compliance scores calculated:")
    import pprint
    pprint.pprint(summary.get("compliance"))