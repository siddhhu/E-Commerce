"""
User Service - User profile management
"""
import secrets
import string
from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.exceptions import BadRequestException, NotFoundException
from app.core.security import hash_password
from app.models.user import User, UserRole, UserUpdate, SellerStatus


class UserService:
    """Service for user operations."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_user_by_id(self, user_id: UUID) -> User:
        """Get user by ID or raise exception."""
        result = await self.session.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()

        if not user:
            raise NotFoundException("User")

        return user

    async def update_user(self, user_id: UUID, data: UserUpdate) -> User:
        """Update user profile."""
        user = await self.get_user_by_id(user_id)

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(user, field, value)

        self.session.add(user)
        await self.session.commit()
        await self.session.refresh(user)

        return user

    async def list_users(
        self,
        skip: int = 0,
        limit: int = 20,
        role: Optional[UserRole] = None,
        is_active: Optional[bool] = None
    ) -> list[User]:
        """List users with optional filters."""
        query = select(User)

        if role:
            query = query.where(User.role == role)
        if is_active is not None:
            query = query.where(User.is_active == is_active)

        query = query.offset(skip).limit(limit).order_by(User.created_at.desc())

        result = await self.session.execute(query)
        return result.scalars().all()

    async def count_users(
        self,
        role: Optional[UserRole] = None,
        is_active: Optional[bool] = None
    ) -> int:
        """Count users with optional filters."""
        from sqlalchemy import func

        query = select(func.count(User.id))

        if role:
            query = query.where(User.role == role)
        if is_active is not None:
            query = query.where(User.is_active == is_active)

        result = await self.session.execute(query)
        return result.scalar() or 0

    async def set_user_role(self, user_id: UUID, role: UserRole) -> User:
        """Set user role (admin only)."""
        user = await self.get_user_by_id(user_id)
        user.role = role

        self.session.add(user)
        await self.session.commit()
        await self.session.refresh(user)

        return user

    async def deactivate_user(self, user_id: UUID) -> User:
        """Deactivate a user account."""
        user = await self.get_user_by_id(user_id)
        user.is_active = False

        self.session.add(user)
        await self.session.commit()
        await self.session.refresh(user)

        return user

    async def reactivate_user(self, user_id: UUID) -> User:
        """Reactivate a user account."""
        user = await self.get_user_by_id(user_id)
        user.is_active = True

        self.session.add(user)
        await self.session.commit()
        await self.session.refresh(user)

        return user

    async def verify_user(self, user_id: UUID, is_verified: bool = True) -> User:
        """Verify/Approve a user (B2B)."""
        user = await self.get_user_by_id(user_id)
        user.is_verified = is_verified

        self.session.add(user)
        await self.session.commit()
        await self.session.refresh(user)

        return user

    # ── Seller Application Flow ────────────────────────────────────────────────

    async def submit_seller_application(
        self,
        user_id: UUID,
        invoice_url: str,
        bank_proof_url: str,
        bank_account_holder_name: str,
        bank_account_number: str,
        bank_ifsc: str,
        bank_name: str | None = None,
    ) -> User:
        """
        Seller submits their registration invoice/document.
        Sets seller_status → pending and saves the document URL.
        Admin is notified separately by the caller.
        """
        user = await self.get_user_by_id(user_id)

        if user.seller_status == "approved":
            raise BadRequestException("Your seller account is already approved.")

        user.seller_invoice_url = invoice_url
        user.seller_bank_proof_url = bank_proof_url
        user.bank_account_holder_name = bank_account_holder_name.strip()
        user.bank_account_number = bank_account_number.strip()
        user.bank_ifsc = bank_ifsc.strip().upper()
        user.bank_name = bank_name.strip() if bank_name else None
        user.seller_status = "pending"
        user.updated_at = datetime.utcnow()

        self.session.add(user)
        await self.session.commit()
        await self.session.refresh(user)

        return user

    async def list_pending_sellers(self) -> list[User]:
        """List all sellers awaiting approval."""
        result = await self.session.execute(
            select(User).where(User.seller_status == "pending")
            .order_by(User.updated_at.asc())
        )
        return result.scalars().all()

    async def _get_seller_login_email(self, user: User) -> str:
        """Use the seller's registration email as their login username."""
        if not user.contact_email or not user.contact_email.strip():
            raise BadRequestException("Cannot approve seller until seller email is provided.")

        login_email = user.contact_email.strip().lower()
        result = await self.session.execute(
            select(User).where(
                User.id != user.id,
                or_(User.email == login_email, User.seller_username == login_email)
            )
        )
        if result.scalar_one_or_none():
            raise BadRequestException(
                "Cannot approve seller because this email is already used by another account."
            )

        return login_email

    def _generate_plain_password(self, length: int = 12) -> str:
        """Generate a secure random plain-text password."""
        alphabet = string.ascii_letters + string.digits + "!@#$%"
        # Ensure at least one of each category
        password = [
            secrets.choice(string.ascii_uppercase),
            secrets.choice(string.ascii_lowercase),
            secrets.choice(string.digits),
            secrets.choice("!@#$%"),
        ]
        password += [secrets.choice(alphabet) for _ in range(length - 4)]
        secrets.SystemRandom().shuffle(password)
        return "".join(password)

    async def approve_seller(self, user_id: UUID) -> tuple[User, str]:
        """
        Super-admin approves a seller.
        - Uses the seller's registration email as the login username
        - Generates a secure random password
        - Stores the hashed password as hashed_password (for login)
        - Stores the plain password in seller_plain_password (for admin to read once)
        - Sets seller_status → approved
        Returns (user, plain_password) — caller is responsible for showing it to admin.
        """
        user = await self.get_user_by_id(user_id)
        username = await self._get_seller_login_email(user)

        if user.seller_status == "approved" and user.seller_username and user.seller_plain_password:
            if user.seller_username != username:
                user.seller_username = username
                user.updated_at = datetime.utcnow()
                self.session.add(user)
                await self.session.commit()
                await self.session.refresh(user)
            # Already approved with credentials — return existing credentials
            return user, user.seller_plain_password or ""

        missing_fields = []
        if not user.business_name:
            missing_fields.append("business name")
        if not user.gst_number:
            missing_fields.append("GST number")
        if not user.bank_account_holder_name:
            missing_fields.append("bank account holder name")
        if not user.bank_account_number:
            missing_fields.append("bank account number")
        if not user.bank_ifsc:
            missing_fields.append("IFSC")
        if not user.seller_bank_proof_url:
            missing_fields.append("bank proof document")
        if missing_fields:
            raise BadRequestException(
                "Cannot approve seller until these details are provided: "
                + ", ".join(missing_fields)
            )

        plain_password = self._generate_plain_password()

        user.seller_username = username
        user.seller_plain_password = plain_password          # plain — admin reads this
        user.hashed_password = hash_password(plain_password) # used by login endpoint
        user.seller_status = "approved"
        user.is_verified = True
        user.updated_at = datetime.utcnow()

        self.session.add(user)
        await self.session.commit()
        await self.session.refresh(user)

        return user, plain_password

    async def reject_seller(self, user_id: UUID) -> User:
        """Super-admin rejects a seller application."""
        user = await self.get_user_by_id(user_id)

        user.seller_status = "rejected"
        user.updated_at = datetime.utcnow()

        self.session.add(user)
        await self.session.commit()
        await self.session.refresh(user)

        return user
