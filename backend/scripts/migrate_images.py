"""
Image Migration Script — WordPress → Supabase Storage
Fetches product images from a custom source URL (FTP direct IP, local folder, or any accessible URL)
and uploads them to Supabase Storage, then updates product_images table in DB.

Usage:
    # Option A: Try fetching from a direct server IP (bypass DNS)
    python scripts/migrate_images.py --mode ip --ip 1.2.3.4

    # Option B: Upload from a local folder of downloaded images
    python scripts/migrate_images.py --mode local --folder /path/to/wp-uploads

    # Option C: Try Supabase Storage from old project
    python scripts/migrate_images.py --mode supabase-old

Requirements: pip install supabase httpx tqdm
"""
import asyncio
import argparse
import os
import sys
import re
import httpx
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.database import async_session

# ─── Config ──────────────────────────────────────────────────────────────────
SUPABASE_URL   = os.getenv("SUPABASE_URL", "https://gbtotfcxvwyfuzniiizw.supabase.co")
SUPABASE_KEY   = os.getenv("SUPABASE_SERVICE_KEY", "")  # needs SERVICE key (not anon)
BUCKET         = os.getenv("SUPABASE_BUCKET", "products")
CONCURRENCY    = 5   # simultaneous uploads
TIMEOUT        = 20  # seconds per image request

def extract_filename(url: str) -> str:
    """Get filename from URL."""
    return url.split("/")[-1].split("?")[0]

def extract_wp_path(url: str) -> str:
    """Get wp-content/uploads/YEAR/MONTH/filename from URL."""
    match = re.search(r"wp-content/uploads/(.+)$", url)
    return match.group(1) if match else extract_filename(url)

async def fetch_image(url: str, server_ip: str = None, timeout: int = TIMEOUT) -> bytes | None:
    """Fetch image bytes from URL, optionally bypassing DNS with direct IP."""
    headers = {}
    fetch_url = url

    if server_ip:
        # Rewrite URL to use direct IP, set Host header so server responds correctly
        parsed = url.replace("http://pranjay.com", f"http://{server_ip}")
        parsed = parsed.replace("https://pranjay.com", f"http://{server_ip}")
        parsed = parsed.replace("https://www.pranjay.com", f"http://{server_ip}")
        fetch_url = parsed
        headers["Host"] = "pranjay.com"

    try:
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=False) as client:
            resp = await client.get(fetch_url, headers=headers)
            if resp.status_code == 200:
                return resp.content
            else:
                return None
    except Exception:
        return None

async def upload_to_supabase(image_bytes: bytes, storage_path: str) -> str | None:
    """Upload image bytes to Supabase Storage and return public URL."""
    if not SUPABASE_KEY:
        print("  ⚠️  SUPABASE_SERVICE_KEY not set — cannot upload")
        return None

    content_type = "image/jpeg"
    if storage_path.endswith(".webp"):
        content_type = "image/webp"
    elif storage_path.endswith(".png"):
        content_type = "image/png"

    upload_url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{storage_path}"
    headers = {
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": content_type,
        "x-upsert": "true",
    }

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(upload_url, content=image_bytes, headers=headers)
            if resp.status_code in (200, 201):
                public_url = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{storage_path}"
                return public_url
            else:
                print(f"  ❌ Upload failed {resp.status_code}: {resp.text[:100]}")
                return None
    except Exception as e:
        print(f"  ❌ Upload error: {e}")
        return None

async def migrate_from_ip(server_ip: str):
    """Try to download images from WordPress server via direct IP."""
    print(f"\n🔍 Fetching all image URLs from DB...")

    async with async_session() as session:
        result = await session.execute(
            text("SELECT id, image_url FROM product_images WHERE image_url LIKE 'http%pranjay.com%' ORDER BY is_primary DESC")
        )
        rows = list(result.fetchall())

    print(f"📦 Found {len(rows)} images to migrate")
    print(f"🌐 Trying server IP: {server_ip}")

    # Test one image first
    test_url = rows[0][1]
    print(f"\n🧪 Testing with: {test_url}")
    test_bytes = await fetch_image(test_url, server_ip)
    if not test_bytes:
        print(f"❌ Cannot reach images via IP {server_ip}")
        print("   Try finding the correct IP from your hosting provider's cPanel or using:")
        print("   nslookup pranjay.com (before switching to Vercel)")
        return
    print(f"✅ Image accessible! ({len(test_bytes)} bytes)")

    sem = asyncio.Semaphore(CONCURRENCY)
    success = 0
    failed = 0

    async def process_one(img_id: str, img_url: str):
        nonlocal success, failed
        async with sem:
            storage_path = extract_wp_path(img_url)
            img_bytes = await fetch_image(img_url, server_ip)
            if not img_bytes:
                print(f"  ⏭ Skip (fetch failed): {extract_filename(img_url)}")
                failed += 1
                return

            new_url = await upload_to_supabase(img_bytes, storage_path)
            if new_url:
                async with async_session() as session:
                    await session.execute(
                        text("UPDATE product_images SET image_url = :url WHERE id = :id"),
                        {"url": new_url, "id": img_id}
                    )
                    await session.commit()
                success += 1
                if success % 50 == 0:
                    print(f"  💾 Progress: {success} uploaded, {failed} failed")
            else:
                failed += 1

    tasks = [process_one(str(r[0]), r[1]) for r in rows]
    await asyncio.gather(*tasks)

    print(f"\n🎉 Done! ✅ {success} uploaded | ❌ {failed} failed")

async def migrate_from_local(folder: str):
    """Upload images from a local folder (downloaded from FTP/cPanel)."""
    folder_path = Path(folder)
    if not folder_path.exists():
        print(f"❌ Folder not found: {folder}")
        return

    # Get all image files
    image_files = list(folder_path.rglob("*.jpg")) + \
                  list(folder_path.rglob("*.jpeg")) + \
                  list(folder_path.rglob("*.png")) + \
                  list(folder_path.rglob("*.webp"))

    print(f"📁 Found {len(image_files)} images in {folder}")

    # Build filename → DB id mapping
    async with async_session() as session:
        result = await session.execute(
            text("SELECT id, image_url FROM product_images WHERE image_url LIKE 'http%pranjay.com%'")
        )
        rows = list(result.fetchall())

    # Map filename → (id, original_url)
    filename_map = {}
    for img_id, img_url in rows:
        fname = extract_filename(img_url).lower()
        filename_map[fname] = (str(img_id), img_url)

    print(f"🔗 DB has {len(rows)} images to update")

    success = 0
    no_match = 0

    for local_file in image_files:
        fname = local_file.name.lower()
        if fname not in filename_map:
            no_match += 1
            continue

        img_id, img_url = filename_map[fname]
        img_bytes = local_file.read_bytes()
        storage_path = extract_wp_path(img_url)

        new_url = await upload_to_supabase(img_bytes, storage_path)
        if new_url:
            async with async_session() as session:
                await session.execute(
                    text("UPDATE product_images SET image_url = :url WHERE id = :id"),
                    {"url": new_url, "id": img_id}
                )
                await session.commit()
            success += 1
            if success % 50 == 0:
                print(f"  💾 Progress: {success} uploaded...")

    print(f"\n🎉 Done! ✅ {success} uploaded | ⚠️ {no_match} local files had no DB match")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Migrate WordPress images to Supabase Storage")
    parser.add_argument("--mode", choices=["ip", "local"], required=True,
                        help="ip = fetch via server IP | local = upload from folder")
    parser.add_argument("--ip", help="Direct IP of old WordPress server (for --mode ip)")
    parser.add_argument("--folder", help="Local folder of downloaded images (for --mode local)")
    args = parser.parse_args()

    if args.mode == "ip":
        if not args.ip:
            print("❌ --ip required for mode=ip")
            sys.exit(1)
        asyncio.run(migrate_from_ip(args.ip))
    elif args.mode == "local":
        if not args.folder:
            print("❌ --folder required for mode=local")
            sys.exit(1)
        asyncio.run(migrate_from_local(args.folder))
