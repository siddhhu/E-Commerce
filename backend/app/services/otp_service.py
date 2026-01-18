"""
OTP Service - Generate, Store, and Verify OTPs
"""
from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.config import settings
from app.core.exceptions import OTPExpiredException, OTPInvalidException
from app.core.security import generate_otp, hash_otp, verify_otp
from app.models.otp import OTPCode


class OTPService:
    """Service for OTP operations."""
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def create_otp(
        self,
        email: str,
        user_id: Optional[UUID] = None
    ) -> str:
        """Generate and store a new OTP for the given email."""
        # Generate OTP
        otp = generate_otp(settings.otp_length)
        
        # Hash OTP for storage
        otp_hash = hash_otp(otp)
        
        # Calculate expiry
        expires_at = datetime.utcnow() + timedelta(minutes=settings.otp_expire_minutes)
        
        # Invalidate any existing unused OTPs for this email
        existing_otps = await self.session.execute(
            select(OTPCode).where(
                OTPCode.email == email,
                OTPCode.is_used == False
            )
        )
        for existing_otp in existing_otps.scalars():
            existing_otp.is_used = True
        
        # Create new OTP record
        otp_record = OTPCode(
            email=email,
            user_id=user_id,
            otp_hash=otp_hash,
            expires_at=expires_at
        )
        
        self.session.add(otp_record)
        await self.session.commit()
        
        return otp
    
    async def verify_otp(self, email: str, otp: str) -> bool:
        """Verify an OTP for the given email."""
        # Fetch the latest unused OTP for this email
        result = await self.session.execute(
            select(OTPCode)
            .where(
                OTPCode.email == email,
                OTPCode.is_used == False
            )
            .order_by(OTPCode.created_at.desc())
            .limit(1)
        )
        otp_record = result.scalar_one_or_none()
        
        if not otp_record:
            raise OTPInvalidException()
        
        # Check if expired
        if datetime.utcnow() > otp_record.expires_at:
            otp_record.is_used = True
            await self.session.commit()
            raise OTPExpiredException()
        
        # Verify OTP hash
        if not verify_otp(otp, otp_record.otp_hash):
            raise OTPInvalidException()
        
        # Mark OTP as used
        otp_record.is_used = True
        await self.session.commit()
        
        return True
    
    async def cleanup_expired_otps(self) -> int:
        """Clean up expired OTPs. Returns count of deleted records."""
        result = await self.session.execute(
            select(OTPCode).where(
                OTPCode.expires_at < datetime.utcnow()
            )
        )
        expired_otps = result.scalars().all()
        count = len(expired_otps)
        
        for otp in expired_otps:
            await self.session.delete(otp)
        
        await self.session.commit()
        return count
