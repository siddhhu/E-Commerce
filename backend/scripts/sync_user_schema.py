import asyncio
import sys
from pathlib import Path

# Add backend directory to path
sys.path.append(str(Path.cwd()))

from app.database import async_session
from sqlalchemy import text
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def sync_schema():
    async with async_session() as session:
        print("🔄 Syncing 'users' table schema...")
        
        # 1. Update Enum Type Labels
        # Note: ALTER TYPE ... ADD VALUE cannot run inside a transaction block in some versions
        print("\n🔄 Updating 'usertype' enum type...")
        enum_values = ["seller", "customer"]
        for val in enum_values:
            try:
                # We catch the error if it already exists because IF NOT EXISTS for ADD VALUE 
                # is only in very recent Postgres versions (13+)
                await session.execute(text(f"ALTER TYPE usertype ADD VALUE '{val}';"))
                await session.commit() 
                print(f"  ✅ Added value '{val}' to enum usertype.")
            except Exception as e:
                await session.rollback()
                if "already exists" in str(e):
                    print(f"  ⏭️  Value '{val}' already exists in enum usertype.")
                else:
                    print(f"  ❌ Error adding enum value '{val}' to usertype: {e}")
        
        # 1.1 Update UserRole Enum Type
        print("\n🔄 Updating 'userrole' enum type...")
        role_values = ["CUSTOMER", "ADMIN", "SUPER_ADMIN", "customer", "admin", "super_admin"]
        for val in role_values:
            try:
                await session.execute(text(f"ALTER TYPE userrole ADD VALUE '{val}';"))
                await session.commit() 
                print(f"  ✅ Added value '{val}' to enum userrole.")
            except Exception as e:
                await session.rollback()
                if "already exists" in str(e):
                    print(f"  ⏭️  Value '{val}' already exists in enum userrole.")
                else:
                    print(f"  ❌ Error adding enum value '{val}' to userrole: {e}")

        # 2. Add Missing Columns
        print("\n🔄 Adding missing columns to 'users' table...")
        columns_to_add = [
            ("pan", "VARCHAR"),
            ("aadhaar", "VARCHAR"),
            ("shop_license", "VARCHAR"),
        ]
        
        for col_name, col_type in columns_to_add:
            try:
                await session.execute(text(f"ALTER TABLE users ADD COLUMN IF NOT EXISTS {col_name} {col_type};"))
                print(f"  ✅ Column '{col_name}' checked/added.")
            except Exception as e:
                print(f"  ❌ Error adding column '{col_name}': {e}")
        
        # 3. Data migration for UserType Enum change
        print("\n🔄 Migrating 'user_type' data mapping...")
        try:
            # Update B2B to seller
            await session.execute(text("UPDATE users SET user_type = 'seller' WHERE user_type = 'B2B';"))
            # Update B2C to customer
            await session.execute(text("UPDATE users SET user_type = 'customer' WHERE user_type = 'B2C';"))
            print("  ✅ 'user_type' data migrated successfully.")
        except Exception as e:
            print(f"  ❌ Error migrating 'user_type' data: {e}")
            
        # 4. Reset Admin Password
        print("\n🔐 Resetting Admin credentials...")
        try:
            admin_email = "admin@pranjay.com"
            new_password = "Pranjay2026"
            hashed_password = pwd_context.hash(new_password)
            
            # Ensure admin user has ADMIN role (uppercase to match current DB)
            await session.execute(text(
                "UPDATE users SET hashed_password = :hash, role = 'ADMIN', is_active = true WHERE email = :email"
            ), {"hash": hashed_password, "email": admin_email})
            
            print(f"  ✅ Password reset for '{admin_email}' to '{new_password}'.")
        except Exception as e:
            print(f"  ❌ Error resetting admin password: {e}")
        
        await session.commit()
        print("\n🎉 Schema and Data synchronization completed!")

if __name__ == "__main__":
    asyncio.run(sync_schema())
