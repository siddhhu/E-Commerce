"""
Storage Service - File uploads to Supabase Storage
"""
import uuid
from typing import Optional
import httpx

from app.config import settings


class StorageService:
    """Service for file storage operations via Supabase."""
    
    def __init__(self):
        self.client = None
        self.bucket = settings.supabase_bucket
        self._initialized = False
        
        # Only initialize if Supabase credentials are provided
        if settings.supabase_url and settings.supabase_key:
            try:
                from supabase import create_client, Client
                self.client: Client = create_client(
                    settings.supabase_url,
                    settings.supabase_key
                )
                self._initialized = True
            except Exception as e:
                print(f"Warning: Could not initialize Supabase client: {e}")
    
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

        # Try SDK first if available
        if self.is_available:
            try:
                self.client.storage.from_(self.bucket).upload(
                    unique_name,
                    file_content,
                    {"content-type": content_type}
                )
                return self.client.storage.from_(self.bucket).get_public_url(unique_name)
            except Exception as e:
                print(f"SDK Upload failed, trying REST fallback: {e}")

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

        # Return a placeholder URL if everything fails
        return f"https://placeholder.com/{folder}/{file_name}"

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

        if not settings.supabase_url or not settings.supabase_key:
            return url

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url, follow_redirects=True)
                response.raise_for_status()
                
                content = response.content
                content_type = response.headers.get("content-type", "image/jpeg")
                
                # Get filename from URL or use a default
                file_name = url.split("/")[-1].split("?")[0] or "image.jpg"
                if "." not in file_name:
                    file_name += ".jpg"
                
                return await self.upload_file(
                    content,
                    file_name,
                    content_type,
                    folder=folder
                )
        except Exception as e:
            print(f"Error migrating image from {url}: {e}")
            return url


# Singleton instance
storage_service = StorageService()
