"""Invoices Router - Seller invoice uploads"""

from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_active_user
from app.core.exceptions import BadRequestException
from app.database import get_session
from app.models.user import User, UserType
from app.services.storage_service import storage_service

router = APIRouter()

MAX_INVOICE_BYTES = 10 * 1024 * 1024
ALLOWED_TYPES = {"application/pdf", "image/jpeg", "image/png"}


@router.post("/upload", status_code=201)
async def upload_invoice(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    session: AsyncSession = Depends(get_session),
):
    if current_user.user_type != UserType.seller:
        raise BadRequestException("Invoice upload is only required for sellers")

    content_type = (file.content_type or "").lower().strip()
    if content_type not in ALLOWED_TYPES:
        raise BadRequestException("Invalid invoice file type. Allowed: PDF, JPG, PNG")

    content = await file.read()
    if len(content) > MAX_INVOICE_BYTES:
        raise BadRequestException("Invoice file too large (max 10MB)")

    invoice_url = await storage_service.upload_file(
        content,
        file.filename,
        content_type=content_type,
        folder="invoices",
    )

    if not invoice_url:
        raise BadRequestException("Failed to upload invoice")

    return {"invoice_url": invoice_url}
