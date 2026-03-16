"""
Storage Service - File uploads to Supabase Storage
"""
import uuid
from typing import Optional

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
        """
        if not self.is_available:
            # Return a placeholder URL for development
            return f"https://placeholder.com/{folder}/{file_name}"
        
        # Generate unique filename
        ext = file_name.split(".")[-1] if "." in file_name else "jpg"
        unique_name = f"{folder}/{uuid.uuid4()}.{ext}"
        
        # Upload to Supabase
        self.client.storage.from_(self.bucket).upload(
            unique_name,
            file_content,
            {"content-type": content_type}
        )
        
        # Get public URL
        public_url = self.client.storage.from_(self.bucket).get_public_url(unique_name)
        
        return public_url
    
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


# Singleton instance
storage_service = StorageService()
