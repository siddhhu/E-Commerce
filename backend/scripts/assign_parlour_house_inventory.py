#!/usr/bin/env python3
"""Assign Colors Queen / legacy inventory to the Parlour House seller account."""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.database import async_session_maker
from app.services.inventory_service import assign_legacy_inventory_to_parlour_house


async def main() -> None:
    async with async_session_maker() as session:
        result = await assign_legacy_inventory_to_parlour_house(session)
        print("Parlour House inventory assignment complete:")
        for key, value in result.items():
            print(f"  {key}: {value}")


if __name__ == "__main__":
    asyncio.run(main())
