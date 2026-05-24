import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.core.security import verify_password, hash_password

load_dotenv()
db_url = os.getenv("DATABASE_URL")
if db_url.startswith("postgresql+asyncpg://"):
    db_url = db_url.replace("postgresql+asyncpg://", "postgresql://")

def check_admin():
    engine = create_engine(db_url)
    with engine.connect() as conn:
        with conn.begin():
            result = conn.execute(text("SELECT email, hashed_password FROM users WHERE email = 'pawantheblizz@gmail.com'"))
            admin = result.mappings().fetchone()
            if admin:
                pwd = admin["hashed_password"]
                print("Admin found.")
                if verify_password("Pranjay2026", pwd):
                    print("Password Pranjay2026 matches.")
                else:
                    print("Password Pranjay2026 DOES NOT match. Resetting it...")
                    new_hash = hash_password("Pranjay2026")
                    conn.execute(text("UPDATE users SET hashed_password = :h WHERE email = 'pawantheblizz@gmail.com'"), {"h": new_hash})
                    print("Password has been reset to Pranjay2026.")
            else:
                print("Admin not found.")

check_admin()
