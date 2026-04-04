"""
Storage Service - File uploads to Supabase Storage
"""
import os
import uuid
from pathlib import Path
from typing import Optional
import httpx

from fastapi.concurrency import run_in_threadpool

from app.config import settings


class StorageService:
    """Service for file storage operations via Supabase."""
    
    def __init__(self):
        self.client = None
        self.bucket = settings.supabase_bucket
        self._initialized = False
    
    @property
    def is_available(self) -> bool:
        """Check if storage service is available."""
        return self._initialized and self.client is not None
    
    async def upload_file(
        self,
        file_content: bytes,
        file_name: str,
        content_type: str = "image/jpeg",
        folder: str = "products"
    ) -> str:
        """
        Upload a file to Supabase storage.
        Returns the public URL.
        Falls back to direct REST API if SDK is unavailable.
        """
        # Generate unique filename
        ext = file_name.split(".")[-1] if "." in file_name else "jpg"
        unique_name = f"{folder}/{uuid.uuid4()}.{ext}"

        # REST API Fallback
        if settings.supabase_url and settings.supabase_key:
            try:
                # Remove trailing slash from URL if present
                base_url = settings.supabase_url.rstrip("/")
                api_url = f"{base_url}/storage/v1/object/{self.bucket}/{unique_name}"
                
                headers = {
                    "Authorization": f"Bearer {settings.supabase_key}",
                    "apikey": settings.supabase_key,
                    "Content-Type": content_type
                }
                
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.post(api_url, content=file_content, headers=headers)
                    if response.status_code == 200:
                        return f"{base_url}/storage/v1/object/public/{self.bucket}/{unique_name}"
                    else:
                        print(f"REST Upload failed ({response.status_code}): {response.text}")
            except Exception as e:
                print(f"REST Upload Exception: {e}")

        # Local filesystem fallback
        try:
            uploads_dir = Path(os.getenv("UPLOADS_DIR", "uploads"))
            full_dir = uploads_dir / folder
            await run_in_threadpool(full_dir.mkdir, True, True)

            local_filename = f"{uuid.uuid4()}.{ext}"
            full_path = full_dir / local_filename
            await run_in_threadpool(full_path.write_bytes, file_content)

            return f"/uploads/{folder}/{local_filename}"
        except Exception as e:
            print(f"Local upload fallback failed: {e}")
            return None

    async def delete_file(self, file_url: str) -> bool:
        """Delete a file from storage."""
        if not self.is_available:
            return True
            
        try:
            # Extract path from URL
            # URL format: https://xxx.supabase.co/storage/v1/object/public/bucket/path
            path = file_url.split(f"/storage/v1/object/public/{self.bucket}/")[-1]
            
            self.client.storage.from_(self.bucket).remove([path])
            return True
        except Exception as e:
            print(f"Error deleting file: {e}")
            return False
    
    async def upload_product_image(
        self,
        file_content: bytes,
        file_name: str,
        content_type: str = "image/jpeg"
    ) -> str:
        """Upload a product image."""
        return await self.upload_file(
            file_content,
            file_name,
            content_type,
            folder="products"
        )
    
    async def upload_category_image(
        self,
        file_content: bytes,
        file_name: str,
        content_type: str = "image/jpeg"
    ) -> str:
        """Upload a category image."""
        return await self.upload_file(
            file_content,
            file_name,
            content_type,
            folder="categories"
        )
    
    async def upload_brand_logo(
        self,
        file_content: bytes,
        file_name: str,
        content_type: str = "image/png"
    ) -> str:
        """Upload a brand logo."""
        return await self.upload_file(
            file_content,
            file_name,
            content_type,
            folder="brands"
        )

    async def upload_from_url(
        self,
        url: str,
        folder: str = "products"
    ) -> str:
        """
        Download a file from a URL and upload it to Supabase.
        Returns the original URL if download/upload fails or if it's already a Supabase URL.
        """
        if not url or not url.startswith("http"):
            return url

        # Check if already a Supabase URL
        if "supabase.co" in url or "supabase.in" in url:
            return url

        def _candidate_urls(original: str) -> list[str]:
            candidates = [original]
            # Try toggling www/non-www for hotlink-protected hosts
            if "://www." in original:
                candidates.append(original.replace("://www.", "://", 1))
            else:
                candidates.append(original.replace("://", "://www.", 1))
            # Also try https if http was provided
            if original.startswith("http://"):
                candidates.append("https://" + original[len("http://"):])
            return list(dict.fromkeys(candidates))

        try:
            headers = {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9",
                # Many WP setups block hotlinking unless referer is same-site
                "Referer": "https://pranjay.com/",
            }

            last_err: Exception | None = None
            async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
                for candidate in _candidate_urls(url):
                    try:
                        response = await client.get(candidate, headers=headers)
                        response.raise_for_status()

                        file_content = response.content
                        file_name = candidate.split("/")[-1]
                        content_type = response.headers.get("Content-Type", "image/jpeg")

                        if "." not in file_name:
                            file_name += ".jpg"

                        # Upload to Supabase if configured; otherwise falls back to local filesystem
                        new_url = await self.upload_file(file_content, file_name, content_type, folder)
                        return new_url if new_url else url
                    except Exception as e:
                        last_err = e
                        continue

            if last_err:
                raise last_err
            return url

        except Exception as e:
            print(f"Migration error for {url}: {e}")
            return url


# Singleton instance
storage_service = StorageService()
