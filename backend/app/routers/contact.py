"""
Contact Router
"""
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.services.email_service import email_service

router = APIRouter()

class ContactRequest(BaseModel):
    first_name: str
    last_name: str
    email: str
    subject: str
    message: str

@router.post("")
async def submit_contact_form(data: ContactRequest):
    """Submit a contact form inquiry."""
    success = await email_service.send_contact_email(
        first_name=data.first_name,
        last_name=data.last_name,
        email=data.email,
        subject=data.subject,
        message=data.message
    )
    if not success:
        raise HTTPException(status_code=500, detail="Failed to send message")
    return {"message": "Message sent successfully"}
