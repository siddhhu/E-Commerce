import os
import httpx
from dotenv import load_dotenv

load_dotenv()

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")
bucket = os.environ.get("SUPABASE_BUCKET", "products")

print(f"URL: {url}")
print(f"Bucket: {bucket}")

# Test direct REST API upload
test_path = "test-rest-upload.txt"
api_url = f"{url}/storage/v1/object/{bucket}/{test_path}"

headers = {
    "Authorization": f"Bearer {key}",
    "apikey": key,
    "Content-Type": "text/plain"
}

try:
    with httpx.Client() as client:
        response = client.post(api_url, content="Hello Supabase REST!", headers=headers)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        if response.status_code == 200:
            print(f"✅ REST Upload successful!")
            # Get public URL
            public_url = f"{url}/storage/v1/object/public/{bucket}/{test_path}"
            print(f"Public URL: {public_url}")
except Exception as e:
    print(f"❌ REST Error: {e}")
