import os
import uuid
import datetime
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.core.security import hash_password

load_dotenv()
db_url = os.getenv("DATABASE_URL")
if db_url.startswith("postgresql+asyncpg://"):
    db_url = db_url.replace("postgresql+asyncpg://", "postgresql://")

def separate_accounts():
    engine = create_engine(db_url)
    
    with engine.connect() as conn:
        with conn.begin():
            # 1. Fetch the super admin row
            result = conn.execute(text("SELECT * FROM users WHERE email = 'pawantheblizz@gmail.com'"))
            admin = result.mappings().fetchone()
            
            if not admin:
                print("Admin not found!")
                return
                
            if admin.get("seller_username") != "parlar-house1506@pranjay.com":
                print("Seller username is different or already separated.")
                return
            
            # 2. Insert new row for seller
            seller_hashed = hash_password("4WpdkY5w8QW%")
            new_id = str(uuid.uuid4())
            fake_email = f"parlar_dummy_{new_id[:8]}@pranjay.com"
            now = datetime.datetime.utcnow()
            
            conn.execute(text("""
                INSERT INTO users (id, email, full_name, business_name, contact_email, user_type, role, is_active, is_verified, hashed_password, seller_status, seller_username, seller_plain_password, created_at, updated_at)
                VALUES (:id, :email, :full_name, :business_name, :contact_email, 'seller', 'CUSTOMER', true, true, :hashed, 'approved', 'parlar-house1506@pranjay.com', '4WpdkY5w8QW%', :now, :now)
            """), {
                "id": new_id,
                "email": fake_email,
                "full_name": admin.get("full_name") or "Parlar House",
                "business_name": admin.get("business_name") or "Parlar House",
                "contact_email": admin.get("contact_email") or "pawantheblizz@gmail.com",
                "hashed": seller_hashed,
                "now": now
            })
            
            # 3. Clean up admin row
            conn.execute(text("""
                UPDATE users SET seller_status = 'none', seller_username = NULL, seller_plain_password = NULL WHERE email = 'pawantheblizz@gmail.com'
            """))
            
            print("Successfully separated seller and admin accounts!")

separate_accounts()
