import os
import random
import datetime
from dotenv import load_dotenv
from pymongo import MongoClient

# Load environment variables
load_dotenv()
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/retail_intel")

client = MongoClient(MONGO_URI)
db = client.get_database()

# Clear existing collections
db.products.drop()
db.scrapes.drop()
db.banners.drop()

print("Existing database collections dropped. Generating mock seed data...")

# Define Product Base Data
brands = ["Intel", "AMD", "Qualcomm", "Apple"]
oems = ["Dell", "HP", "Lenovo", "Acer", "Asus", "MSI", "Apple"]
platforms = ["Newegg", "Mercado Libre"]

product_templates = [
    # Intel Products
    {"brand": "Intel", "oem": "Dell", "name": "Dell G16 Gaming Laptop", "type": "Notebook", "processor": "Intel Core i7-13700HX", "specs": {"RAM": "16GB", "Storage": "1TB SSD", "GPU": "RTX 4060"}, "base_price": 1399},
    {"brand": "Intel", "oem": "HP", "name": "HP Omen 16", "type": "Notebook", "processor": "Intel Core i9-14900HX", "specs": {"RAM": "32GB", "Storage": "1TB SSD", "GPU": "RTX 4070"}, "base_price": 1899},
    {"brand": "Intel", "oem": "Asus", "name": "Asus ROG Strix G16", "type": "Notebook", "processor": "Intel Core i9-13980HX", "specs": {"RAM": "32GB", "Storage": "1TB SSD", "GPU": "RTX 4080"}, "base_price": 2199},
    {"brand": "Intel", "oem": "Lenovo", "name": "Lenovo Legion Pro 5i", "type": "Notebook", "processor": "Intel Core i7-14700HX", "specs": {"RAM": "16GB", "Storage": "512GB SSD", "GPU": "RTX 4060"}, "base_price": 1299},
    {"brand": "Intel", "oem": "MSI", "name": "MSI Aegis RS Gaming Desktop", "type": "Desktop", "processor": "Intel Core i7-14700KF", "specs": {"RAM": "32GB", "Storage": "2TB SSD", "GPU": "RTX 4070 Ti Super"}, "base_price": 1999},
    
    # AMD Products
    {"brand": "AMD", "oem": "Asus", "name": "Asus ROG Zephyrus G14", "type": "Notebook", "processor": "AMD Ryzen 9 8945HS", "specs": {"RAM": "16GB", "Storage": "1TB SSD", "GPU": "RTX 4070"}, "base_price": 1599},
    {"brand": "AMD", "oem": "Lenovo", "name": "Lenovo Legion Pro 5", "type": "Notebook", "processor": "AMD Ryzen 7 7745HX", "specs": {"RAM": "32GB", "Storage": "1TB SSD", "GPU": "RTX 4070"}, "base_price": 1499},
    {"brand": "AMD", "oem": "Acer", "name": "Acer Nitro V 16", "type": "Notebook", "processor": "AMD Ryzen 7 8845HS", "specs": {"RAM": "16GB", "Storage": "512GB SSD", "GPU": "RTX 4050"}, "base_price": 999},
    {"brand": "AMD", "oem": "HP", "name": "HP Victus 16", "type": "Notebook", "processor": "AMD Ryzen 7 7840HS", "specs": {"RAM": "16GB", "Storage": "512GB SSD", "GPU": "RTX 4060"}, "base_price": 1049},
    {"brand": "AMD", "oem": "MSI", "name": "MSI Aegis ZS Desktop", "type": "Desktop", "processor": "AMD Ryzen 7 7700", "specs": {"RAM": "16GB", "Storage": "1TB SSD", "GPU": "RTX 4060 Ti"}, "base_price": 1199},

    # Qualcomm Products
    {"brand": "Qualcomm", "oem": "Dell", "name": "Dell Inspiron 14 Plus CoPilot+", "type": "Notebook", "processor": "Snapdragon X Elite X1E-80-100", "specs": {"RAM": "16GB", "Storage": "512GB SSD", "GPU": "Adreno GPU"}, "base_price": 1099},
    {"brand": "Qualcomm", "oem": "Lenovo", "name": "Lenovo Yoga Slim 7x CoPilot+", "type": "Notebook", "processor": "Snapdragon X Elite X1E-78-100", "specs": {"RAM": "16GB", "Storage": "1TB SSD", "GPU": "Adreno GPU"}, "base_price": 1199},

    # Apple Products
    {"brand": "Apple", "oem": "Apple", "name": "MacBook Pro 14", "type": "Notebook", "processor": "Apple M3 Max", "specs": {"RAM": "36GB", "Storage": "1TB SSD", "GPU": "30-core GPU"}, "base_price": 3199},
    {"brand": "Apple", "oem": "Apple", "name": "MacBook Pro 16", "type": "Notebook", "processor": "Apple M4 Pro", "specs": {"RAM": "24GB", "Storage": "512GB SSD", "GPU": "16-core GPU"}, "base_price": 2499}
]

# Insert Products into database & retain their generated IDs mapping
inserted_products = []
for p in product_templates:
    # Add platforms
    for platform in platforms:
        prod_doc = p.copy()
        prod_doc["platform"] = platform
        prod_doc["sku"] = f"{p['brand'][:3].upper()}-{p['oem'][:3].upper()}-{random.randint(100000, 999999)}"
        res = db.products.insert_one(prod_doc)
        prod_doc["_id"] = res.inserted_id
        inserted_products.append(prod_doc)

print(f"Seeded {len(inserted_products)} unique products across Newegg and Mercado Libre.")

# Generate historical metrics for the past 30 days
end_date = datetime.datetime.now()
start_date = end_date - datetime.timedelta(days=30)

scrapes_to_insert = []
banners_to_insert = []

current_date = start_date
while current_date <= end_date:
    # 3 Scrapes per day (Morning 9:00, Afternoon 14:00, Evening 20:00)
    for hour in [9, 14, 20]:
        scrape_time = current_date.replace(hour=hour, minute=0, second=0, microsecond=0)
        
        for p in inserted_products:
            # Pricing logic with fluctuations
            price = p["base_price"]
            original_price = p["base_price"]
            on_promo = False
            discount = 0
            
            # 15% chance of a discount
            if random.random() < 0.15:
                discount = random.choice([50, 100, 150, 200])
                price -= discount
                on_promo = True
            
            # Compliance Audit Logic (S1, S2, P1, P2, P3, P4, P5)
            # Default passes
            audit = {
                "S1": True,  # Brand name in list page title
                "S2": True,  # Badge on listing card
                "P1": True,  # Brand name in product page title
                "P2": True,  # Badge on product page
                "P3": True,  # Brand listed in specification table
                "P4": True,  # Brand rich media present
                "P5": True   # OEM rich media present
            }
            
            # Audit failures logic to make reports realistic
            # Qualcomm has lower badge compliance early on (first 15 days)
            if p["brand"] == "Qualcomm" and (scrape_time - start_date).days < 15:
                if random.random() < 0.25:
                    audit["S2"] = False  # Missing listing card badge
                if random.random() < 0.20:
                    audit["P2"] = False  # Missing product page badge
                    
            # Intel / AMD sometimes miss specs generation info
            if p["brand"] in ["Intel", "AMD"] and random.random() < 0.05:
                audit["P3"] = False  # Spec table error
                
            # Random occasional rich media missing
            if random.random() < 0.03:
                audit["P4"] = False  # Brand rich media missing
            if random.random() < 0.02:
                audit["P5"] = False  # OEM rich media missing

            scrapes_to_insert.append({
                "product_id": p["_id"],
                "timestamp": scrape_time,
                "price": price,
                "original_price": original_price,
                "on_promo": on_promo,
                "discount": discount,
                "audit": audit
            })
            
    # Homepage Banner Tracking (1 banner check per day per platform)
    # Real working brand store pages
    real_links = {
        "Newegg": {
            "Intel": "https://www.newegg.com/p/pl?d=intel+core+laptop",
            "AMD": "https://www.newegg.com/p/pl?d=amd+ryzen+laptop",
            "Qualcomm": "https://www.newegg.com/p/pl?d=snapdragon+laptop",
            "Apple": "https://www.newegg.com/p/pl?d=macbook+pro"
        },
        "Mercado Libre": {
            "Intel": "https://listado.mercadolibre.com.br/notebook-intel-core",
            "AMD": "https://listado.mercadolibre.com.br/notebook-amd-ryzen",
            "Qualcomm": "https://listado.mercadolibre.com.br/notebook-snapdragon",
            "Apple": "https://listado.mercadolibre.com.br/macbook-pro"
        }
    }

    for platform in platforms:
        # Determine which brand gets the banner today
        featured_brand = random.choices(brands, weights=[40, 35, 15, 10], k=1)[0]
        banner_discount = random.choice([0, 10, 15, 20])
        
        banners_to_insert.append({
            "platform": platform,
            "timestamp": current_date.replace(hour=12, minute=0, second=0),
            "featured_brand": featured_brand,
            "banner_url": f"https://images.unsplash.com/photo-banner-{featured_brand.lower()}",
            "link_url": real_links[platform][featured_brand],
            "discount_percentage": banner_discount
        })
            
    current_date += datetime.timedelta(days=1)

# Write to Database
db.scrapes.insert_many(scrapes_to_insert)
db.banners.insert_many(banners_to_insert)

print(f"Generated and loaded {len(scrapes_to_insert)} price/audit logs into MongoDB.")
print(f"Generated and loaded {len(banners_to_insert)} daily homepage banner logs into MongoDB.")
print("Database seeding completed successfully! 🎉")