"""
Bulk Upload Service - CSV/Excel product imports
"""
import io
from typing import Optional
from uuid import UUID

import pandas as pd
from sqlalchemy.ext.asyncio import AsyncSession
from slugify import slugify

from app.models.product import Product, ProductCreate
from app.services.product_service import ProductService


class BulkUploadService:
    """Service for bulk product uploads."""
    
    REQUIRED_COLUMNS = ["name", "sku", "mrp", "selling_price"]
    OPTIONAL_COLUMNS = [
        "description", "short_description", "b2b_price",
        "stock_quantity", "min_order_quantity", "unit",
        "category_id", "brand_id", "is_featured"
    ]
    
    def __init__(self, session: AsyncSession):
        self.session = session
        self.product_service = ProductService(session)
    
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
            is_featured=bool(row.get("is_featured", False)) if pd.notna(row.get("is_featured")) else False
        )
        
        self.session.add(product)
        return "created"
    
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
            "is_featured": False
        }
        
        output = io.BytesIO()
        df.to_csv(output, index=False)
        return output.getvalue()
