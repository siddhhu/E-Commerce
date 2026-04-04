"""
Bulk Upload Service - CSV/Excel product imports
"""
import io
from typing import Optional
from uuid import UUID

import pandas as pd
from sqlalchemy.ext.asyncio import AsyncSession
from slugify import slugify

from app.models.product import Product, ProductCreate, ProductImage
from app.services.product_service import ProductService
from app.services.storage_service import storage_service


class BulkUploadService:
    """Service for bulk product uploads."""
    
    REQUIRED_COLUMNS = ["name", "sku", "mrp", "selling_price"]
    OPTIONAL_COLUMNS = [
        "description", "short_description", "b2b_price",
        "stock_quantity", "min_order_quantity", "unit",
        "category_id", "brand_id", "is_featured", "image_url"
    ]
    
    def __init__(self, session: AsyncSession):
        self.session = session
        self.product_service = ProductService(session)

    def _normalize_dataframe(self, df: pd.DataFrame) -> pd.DataFrame:
        """Normalize known external CSV formats (e.g., WooCommerce export) to expected columns."""
        if df is None or df.empty:
            return df

        # Build a case-insensitive map of columns
        col_map = {str(c).strip().lower(): c for c in df.columns}

        def rename_if_present(source_lower: str, dest: str, rename_map: dict[str, str]) -> None:
            if source_lower in col_map:
                rename_map[col_map[source_lower]] = dest

        # WooCommerce -> internal mappings
        rename_map: dict[str, str] = {}
        rename_if_present("name", "name", rename_map)
        rename_if_present("sku", "sku", rename_map)
        rename_if_present("regular price", "mrp", rename_map)
        rename_if_present("sale price", "selling_price", rename_map)
        rename_if_present("description", "description", rename_map)
        rename_if_present("short description", "short_description", rename_map)
        rename_if_present("stock", "stock_quantity", rename_map)
        rename_if_present("is featured?", "is_featured", rename_map)
        # Keep the original casing expected by _process_row (it checks row.get("Images"))
        rename_if_present("images", "Images", rename_map)

        if rename_map:
            df = df.rename(columns=rename_map)

        # If selling_price is missing but mrp exists, fallback selling_price to mrp
        if "selling_price" not in df.columns and "mrp" in df.columns:
            df["selling_price"] = df["mrp"]
        if "selling_price" in df.columns and "mrp" in df.columns:
            # If selling_price is empty, fallback to mrp
            df["selling_price"] = df["selling_price"].where(df["selling_price"].notna(), df["mrp"])

        # SKU fallback: if SKU is empty, use WooCommerce ID as SKU
        if "sku" in df.columns and "ID" in df.columns:
            sku_series = df["sku"].astype(str).str.strip()
            missing_sku = sku_series.isna() | (sku_series == "") | (sku_series.str.lower() == "nan")
            if missing_sku.any():
                df.loc[missing_sku, "sku"] = df.loc[missing_sku, "ID"].astype(str).str.strip()

        return df
    
    async def process_csv(
        self,
        file_content: bytes,
        update_existing: bool = False
    ) -> dict:
        """
        Process CSV file for bulk product upload.
        Returns summary of results.
        """
        df = pd.read_csv(io.BytesIO(file_content))
        df = self._normalize_dataframe(df)
        return await self._process_dataframe(df, update_existing)
    
    async def process_excel(
        self,
        file_content: bytes,
        sheet_name: Optional[str] = None,
        update_existing: bool = False
    ) -> dict:
        """
        Process Excel file for bulk product upload.
        Returns summary of results.
        """
        df = pd.read_excel(
            io.BytesIO(file_content),
            sheet_name=sheet_name or 0
        )
        df = self._normalize_dataframe(df)
        return await self._process_dataframe(df, update_existing)
    
    async def _process_dataframe(
        self,
        df: pd.DataFrame,
        update_existing: bool = False
    ) -> dict:
        """Process dataframe and create/update products."""
        # Validate columns
        missing_columns = [
            col for col in self.REQUIRED_COLUMNS
            if col not in df.columns
        ]
        
        if missing_columns:
            return {
                "success": False,
                "error": f"Missing required columns: {missing_columns}",
                "created": 0,
                "updated": 0,
                "failed": 0,
                "errors": []
            }
        
        created = 0
        updated = 0
        failed = 0
        errors = []
        
        for idx, row in df.iterrows():
            try:
                result = await self._process_row(row, update_existing)
                if result == "created":
                    created += 1
                elif result == "updated":
                    updated += 1
                elif result == "skipped":
                    pass  # SKU exists and update_existing is False
            except Exception as e:
                failed += 1
                errors.append({
                    "row": idx + 2,  # +2 for header and 0-index
                    "sku": row.get("sku", "N/A"),
                    "error": str(e)
                })
        
        await self.session.commit()
        
        return {
            "success": True,
            "created": created,
            "updated": updated,
            "failed": failed,
            "errors": errors[:20]  # Limit errors to 20
        }
    
    async def _process_row(
        self,
        row: pd.Series,
        update_existing: bool
    ) -> str:
        """Process a single row. Returns 'created', 'updated', or 'skipped'."""
        sku = str(row["sku"]).strip()
        
        # Check if product exists
        from sqlmodel import select
        result = await self.session.execute(
            select(Product).where(Product.sku == sku)
        )
        existing = result.scalar_one_or_none()
        
        if existing:
            if not update_existing:
                return "skipped"
            
            # Update existing product
            if pd.notna(row.get("name")):
                existing.name = row["name"]
            if pd.notna(row.get("mrp")):
                existing.mrp = float(row["mrp"])
            if pd.notna(row.get("selling_price")):
                existing.selling_price = float(row["selling_price"])
            if pd.notna(row.get("b2b_price")):
                existing.b2b_price = float(row["b2b_price"])
            if pd.notna(row.get("description")):
                existing.description = row["description"]
            if pd.notna(row.get("short_description")):
                existing.short_description = row["short_description"]
            if pd.notna(row.get("stock_quantity")):
                existing.stock_quantity = int(row["stock_quantity"])
            if pd.notna(row.get("min_order_quantity")):
                existing.min_order_quantity = int(row["min_order_quantity"])
            if pd.notna(row.get("unit")):
                existing.unit = row["unit"]
            if pd.notna(row.get("category_id")):
                existing.category_id = UUID(str(row["category_id"]))
            if pd.notna(row.get("brand_id")):
                existing.brand_id = UUID(str(row["brand_id"]))
            if pd.notna(row.get("is_featured")):
                existing.is_featured = bool(row["is_featured"])
            if pd.notna(row.get("image_url")):
                image_url = str(row["image_url"])
                # Auto-migrate if it's an external URL
                if image_url.startswith("http") and "supabase" not in image_url:
                    image_url = await storage_service.upload_from_url(image_url)
                existing.image_url = image_url
            
            # Handle WooCommerce 'Images' column (comma-separated URLs)
            if pd.notna(row.get("Images")):
                await self._process_product_images(existing.id, str(row["Images"]), existing)
            
            self.session.add(existing)
            return "updated"
        
        # Create new product
        name = str(row["name"]).strip()
        slug = slugify(name)
        
        # Ensure unique slug
        slug_result = await self.session.execute(
            select(Product).where(Product.slug == slug)
        )
        if slug_result.scalar_one_or_none():
            slug = f"{slug}-{sku}"
        
        product = Product(
            name=name,
            slug=slug,
            sku=sku,
            mrp=float(row["mrp"]),
            selling_price=float(row["selling_price"]),
            b2b_price=float(row["b2b_price"]) if pd.notna(row.get("b2b_price")) else None,
            description=row.get("description") if pd.notna(row.get("description")) else None,
            short_description=row.get("short_description") if pd.notna(row.get("short_description")) else None,
            stock_quantity=int(row.get("stock_quantity", 0)) if pd.notna(row.get("stock_quantity")) else 0,
            min_order_quantity=int(row.get("min_order_quantity", 1)) if pd.notna(row.get("min_order_quantity")) else 1,
            unit=row.get("unit", "pcs") if pd.notna(row.get("unit")) else "pcs",
            category_id=UUID(str(row["category_id"])) if pd.notna(row.get("category_id")) else None,
            brand_id=UUID(str(row["brand_id"])) if pd.notna(row.get("brand_id")) else None,
            is_featured=bool(row.get("is_featured", False)) if pd.notna(row.get("is_featured")) else False,
        )
        
        if pd.notna(row.get("image_url")):
            image_url = str(row["image_url"])
            # Auto-migrate if it's an external URL
            if image_url.startswith("http") and "supabase" not in image_url:
                image_url = await storage_service.upload_from_url(image_url)
            product.image_url = image_url
        
        self.session.add(product)
        await self.session.flush()  # Get product ID
        
        # Handle WooCommerce 'Images' column (comma-separated URLs)
        if pd.notna(row.get("Images")):
            await self._process_product_images(product.id, str(row["Images"]), product)
        
        return "created"
    
    async def _process_product_images(
        self,
        product_id: UUID,
        images_str: str,
        product: Product
    ) -> None:
        """Process comma-separated image URLs from WooCommerce CSV."""
        # Split by comma and clean URLs
        image_urls = [url.strip() for url in images_str.split(",") if url.strip()]
        
        if not image_urls:
            return
        
        # Download and create ProductImage records
        for idx, url in enumerate(image_urls[:8]):  # Limit to 8 images
            try:
                # Download and store locally
                local_url = await storage_service.upload_from_url(url, folder="products")

                if not local_url:
                    continue
                if isinstance(local_url, str) and local_url.startswith("http"):
                    continue
                
                # Create ProductImage record
                product_image = ProductImage(
                    product_id=product_id,
                    image_url=local_url,
                    alt_text=product.name,
                    is_primary=(idx == 0),  # First image is primary
                    sort_order=idx
                )
                self.session.add(product_image)
                
                # Also set product.image_url to first image as fallback
                if idx == 0:
                    product.image_url = local_url
                    self.session.add(product)
                    
            except Exception as e:
                print(f"Error processing image {url}: {e}")
                continue
    
    def generate_template(self) -> bytes:
        """Generate a CSV template for bulk upload."""
        columns = self.REQUIRED_COLUMNS + self.OPTIONAL_COLUMNS
        df = pd.DataFrame(columns=columns)
        
        # Add sample row
        df.loc[0] = {
            "name": "Sample Lipstick",
            "sku": "LIP-001",
            "mrp": 599.00,
            "selling_price": 499.00,
            "b2b_price": 399.00,
            "description": "Premium matte lipstick",
            "short_description": "Long-lasting matte finish",
            "stock_quantity": 100,
            "min_order_quantity": 10,
            "unit": "pcs",
            "category_id": "",
            "brand_id": "",
            "is_featured": False,
            "image_url": "https://example.com/sample.jpg"
        }
        
        output = io.BytesIO()
        df.to_csv(output, index=False)
        return output.getvalue()
