"""Documents Router - KYC certificate uploads for checkout verification."""

from fastapi import APIRouter, Depends, File, UploadFile

from app.core.dependencies import get_current_active_user
from app.core.exceptions import BadRequestException
from app.models.user import User
from app.services.storage_service import storage_service

router = APIRouter()

MAX_DOCUMENT_BYTES = 10 * 1024 * 1024
ALLOWED_TYPES = {"application/pdf", "image/jpeg", "image/png"}


@router.post("/kyc-upload", status_code=201)
async def upload_kyc_document(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
):
    """Upload a business/identity document for one-time checkout verification."""
    content_type = (file.content_type or "").lower().strip()
    if content_type not in ALLOWED_TYPES:
        raise BadRequestException("Invalid file type. Allowed: PDF, JPG, PNG")

    content = await file.read()
    if len(content) > MAX_DOCUMENT_BYTES:
        raise BadRequestException("File too large (max 10MB)")

    document_url = await storage_service.upload_file(
        content,
        file.filename,
        content_type=content_type,
        folder="kyc",
    )

    if not document_url:
        raise BadRequestException("Failed to upload document")

    return {"document_url": document_url}
