"""
Admin Bulk Upload Router
"""
from fastapi import APIRouter, Depends, File, Query, UploadFile
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.core.dependencies import get_current_admin
from app.database import get_session
from app.models.user import User
from app.services.bulk_upload_service import BulkUploadService

router = APIRouter()


class BulkUploadResult(BaseModel):
    """Bulk upload result."""
    success: bool
    error: str | None = None
    created: int
    updated: int
    failed: int
    errors: list[dict]


@router.post("/products", response_model=BulkUploadResult)
async def bulk_upload_products(
    file: UploadFile = File(...),
    update_existing: bool = Query(False, description="Update existing products by SKU"),
    current_user: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session)
):
    """
    Bulk upload products from CSV or Excel file.
    
    Required columns: name, sku, mrp, selling_price
    Optional columns: description, short_description, b2b_price, stock_quantity,
                     min_order_quantity, unit, category_id, brand_id, is_featured
    """
    bulk_service = BulkUploadService(session)
    
    # Read file content
    file_content = await file.read()
    
    # Determine file type and process
    if file.filename.endswith('.csv'):
        result = await bulk_service.process_csv(file_content, update_existing)
    elif file.filename.endswith(('.xlsx', '.xls')):
        result = await bulk_service.process_excel(file_content, update_existing=update_existing)
    else:
        return BulkUploadResult(
            success=False,
            error="Unsupported file format. Use CSV or Excel (.xlsx, .xls)",
            created=0,
            updated=0,
            failed=0,
            errors=[]
        )
    
    return BulkUploadResult(**result)


@router.get("/products/template")
async def download_template(
    current_user: User = Depends(get_current_admin),
    session: AsyncSession = Depends(get_session)
):
    """Download CSV template for bulk upload."""
    bulk_service = BulkUploadService(session)
    template_content = bulk_service.generate_template()
    
    return Response(
        content=template_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=product_upload_template.csv"
        }
    )
