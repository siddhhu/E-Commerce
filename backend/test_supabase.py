import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")

print(f"URL: {url}")
# Masking key for safety in logs
print(f"Key set: {bool(key)}")

try:
    client = create_client(url, key)
    print("✅ Client created successfully")
    buckets = client.storage.list_buckets()
    print(f"✅ Connection successful, buckets: {len(buckets)}")
except Exception as e:
    print(f"❌ Error: {e}")
