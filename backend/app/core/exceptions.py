"""
Custom Exceptions
"""
from typing import Any, Optional

from fastapi import HTTPException, status


class PranjayException(HTTPException):
    """Base exception for Pranjay."""
    
    def __init__(
        self,
        status_code: int,
        detail: str,
        headers: Optional[dict[str, Any]] = None
    ):
        super().__init__(status_code=status_code, detail=detail, headers=headers)


class NotFoundException(PranjayException):
    """Resource not found exception."""
    
    def __init__(self, resource: str = "Resource"):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{resource} not found"
        )


class UnauthorizedException(PranjayException):
    """Unauthorized access exception."""
    
    def __init__(self, detail: str = "Could not validate credentials"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"}
        )


class ForbiddenException(PranjayException):
    """Forbidden access exception."""
    
    def __init__(self, detail: str = "Not enough permissions"):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail
        )


class BadRequestException(PranjayException):
    """Bad request exception."""
    
    def __init__(self, detail: str = "Bad request"):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail
        )


class ConflictException(PranjayException):
    """Conflict exception."""
    
    def __init__(self, detail: str = "Resource already exists"):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail=detail
        )


class ValidationException(PranjayException):
    """Validation exception."""
    
    def __init__(self, detail: str = "Validation error"):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=detail
        )


class OTPExpiredException(BadRequestException):
    """OTP expired exception."""
    
    def __init__(self):
        super().__init__(detail="OTP has expired. Please request a new one.")


class OTPInvalidException(BadRequestException):
    """Invalid OTP exception."""
    
    def __init__(self):
        super().__init__(detail="Invalid OTP. Please try again.")


class InsufficientStockException(BadRequestException):
    """Insufficient stock exception."""
    
    def __init__(self, product_name: str):
        super().__init__(detail=f"Insufficient stock for product: {product_name}")
