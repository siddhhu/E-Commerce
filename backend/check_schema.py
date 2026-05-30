import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def main():
    engine = create_async_engine("postgresql+asyncpg://postgres.gbtotfcxvwyfuzniiizw:yclCKcSqqxhOuw7U@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?prepared_statement_cache_size=0", pool_pre_ping=True)
    async with engine.connect() as conn:
        result = await conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'products';"))
        columns = [row[0] for row in result]
        print("Columns in 'products':", columns)
        if 'category_ids' in columns:
            print("category_ids exists!")
        else:
            print("category_ids DOES NOT exist!")
    await engine.dispose()

asyncio.run(main())
