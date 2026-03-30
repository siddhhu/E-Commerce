"""
Banner Service - Database operations for banners
"""
from typing import Optional
from uuid import UUID

from sqlalchemy import desc, select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.banner import Banner, BannerCreate, BannerUpdate


class BannerService:
    """Banner service for database operations."""
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def list_banners(
        self,
        skip: int = 0,
        limit: int = 20,
        is_active: Optional[bool] = None
    ) -> list[Banner]:
        """List banners with filtering and pagination."""
        query = select(Banner)
        
        if is_active is not None:
            query = query.where(Banner.is_active == is_active)
        
        query = query.order_by(Banner.sort_order.asc(), desc(Banner.created_at))
        query = query.offset(skip).limit(limit)
        
        result = await self.session.execute(query)
        return result.scalars().all()
    
    async def count_banners(self, is_active: Optional[bool] = None) -> int:
        """Count total banners."""
        query = select(func.count(Banner.id))
        
        if is_active is not None:
            query = query.where(Banner.is_active == is_active)
            
        result = await self.session.execute(query)
        return result.scalar() or 0
    
    async def get_banner(self, banner_id: UUID) -> Optional[Banner]:
        """Get banner by ID."""
        result = await self.session.execute(select(Banner).where(Banner.id == banner_id))
        return result.scalar_one_or_none()
    
    async def create_banner(self, banner_in: BannerCreate) -> Banner:
        """Create a new banner."""
        banner = Banner.from_orm(banner_in)
        self.session.add(banner)
        await self.session.commit()
        await self.session.refresh(banner)
        return banner
    
    async def update_banner(self, banner: Banner, banner_in: BannerUpdate) -> Banner:
        """Update a banner."""
        update_data = banner_in.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(banner, field, value)
        
        self.session.add(banner)
        await self.session.commit()
        await self.session.refresh(banner)
        return banner
    
    async def delete_banner(self, banner: Banner) -> None:
        """Delete a banner."""
        await self.session.delete(banner)
        await self.session.commit()
