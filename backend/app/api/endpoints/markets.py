from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List

from app.api.dependencies.database import get_db
from app.models.markets import Market
from app.schemas.markets import MarketResponse, MarketCreate

router = APIRouter()

@router.get("/", response_model=List[MarketResponse])
async def read_markets(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Market))
    markets = result.scalars().all()
    return markets

@router.post("/", response_model=MarketResponse)
async def create_market(market: MarketCreate, db: AsyncSession = Depends(get_db)):
    db_market = Market(market_name=market.market_name)
    db.add(db_market)
    await db.commit()
    await db.refresh(db_market)
    return db_market
