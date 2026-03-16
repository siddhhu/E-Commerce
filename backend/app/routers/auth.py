"""
Auth Router - Authentication endpoints
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, EmailStr

from app.database import get_session
from app.models.otp import OTPRequest, OTPVerify
from app.models.user import UserRead
from app.services.auth_service import AuthService
from app.services.otp_service import OTPService
from app.services.email_service import email_service
from app.services.firebase_service import firebase_service

router = APIRouter()


class TokenResponse(BaseModel):
    """Token response schema."""
    access_token: str
    refresh_token: str
    token_type: str
    user: UserRead


class RefreshTokenRequest(BaseModel):
    """Refresh token request schema."""
    refresh_token: str


class MessageResponse(BaseModel):
    """Simple message response."""
    message: str


class FirebaseTokenRequest(BaseModel):
    """Request schema for Firebase ID token verification."""
    id_token: str


class AdminLoginRequest(BaseModel):
    """Admin login request schema."""
    email: str
    password: str


@router.post("/request-otp", response_model=MessageResponse)
async def request_otp(
    data: OTPRequest,
    session: AsyncSession = Depends(get_session)
):
    """
    Request OTP for email verification.
    Sends an OTP to the provided email address.
    """
    otp_service = OTPService(session)
    auth_service = AuthService(session)
    
    # Get or create user
    user, is_new = await auth_service.get_or_create_user(data.email)
    
    # Generate and store OTP
    otp = await otp_service.create_otp(data.email, user.id)
    
    # Send OTP email
    await email_service.send_otp_email(data.email, otp)
    
    return {"message": "OTP sent to your email"}


@router.post("/verify-firebase", response_model=TokenResponse)
async def verify_firebase(
    data: FirebaseTokenRequest,
    session: AsyncSession = Depends(get_session)
):
    """
    Verify Firebase ID token and get access tokens.
    Returns JWT tokens and user profile.
    """
    # 1. Verify token with Firebase Admin
    decoded_token = await firebase_service.verify_id_token(data.id_token)
    
    # 2. Extract phone number
    phone_number = decoded_token.get("phone_number")
    if not phone_number:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Firebase token does not contain a phone number. Please use Phone Authentication."
        )
        
    auth_service = AuthService(session)
    
    # 3. Get or create user by phone
    user, is_new = await auth_service.get_or_create_user_by_phone(phone_number)
    
    # 4. Generate tokens
    tokens = auth_service.generate_tokens(user)
    
    return TokenResponse(
        access_token=tokens["access_token"],
        refresh_token=tokens["refresh_token"],
        token_type=tokens["token_type"],
        user=UserRead.model_validate(user)
    )


@router.post("/verify-otp", response_model=TokenResponse)
async def verify_otp(
    data: OTPVerify,
    session: AsyncSession = Depends(get_session)
):
    """
    Verify OTP and get access tokens.
    Returns JWT tokens and user profile.
    """
    otp_service = OTPService(session)
    auth_service = AuthService(session)
    
    # Verify OTP
    await otp_service.verify_otp(data.email, data.otp)
    
    # Get user and mark as verified
    user = await auth_service.get_user_by_email(data.email)
    user = await auth_service.mark_user_verified(user)
    
    # Generate tokens
    tokens = auth_service.generate_tokens(user)
    
    # Send welcome email for new users
    if user.is_verified:
        await email_service.send_welcome_email(data.email, user.full_name)
    
    return TokenResponse(
        access_token=tokens["access_token"],
        refresh_token=tokens["refresh_token"],
        token_type=tokens["token_type"],
        user=UserRead.model_validate(user)
    )


@router.post("/admin/login", response_model=TokenResponse)
async def admin_login(
    data: AdminLoginRequest,
    session: AsyncSession = Depends(get_session)
):
    """
    Login endpoint exclusively for admins using email and password.
    """
    auth_service = AuthService(session)
    user = await auth_service.authenticate_admin(data.email, data.password)
    
    if not user:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password or inadequate permissions",
        )
        
    tokens = auth_service.generate_tokens(user)
    
    return TokenResponse(
        access_token=tokens["access_token"],
        refresh_token=tokens["refresh_token"],
        token_type=tokens["token_type"],
        user=UserRead.model_validate(user)
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    data: RefreshTokenRequest,
    session: AsyncSession = Depends(get_session)
):
    """
    Refresh access token using refresh token.
    """
    auth_service = AuthService(session)
    
    tokens = await auth_service.refresh_tokens(data.refresh_token)
    
    # Get user for response
    from app.core.security import verify_refresh_token
    from uuid import UUID
    
    payload = verify_refresh_token(data.refresh_token)
    user = await auth_service.get_user_by_id(UUID(payload["sub"]))
    
    return TokenResponse(
        access_token=tokens["access_token"],
        refresh_token=tokens["refresh_token"],
        token_type=tokens["token_type"],
        user=UserRead.model_validate(user)
    )
