from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel
from typing import List, Dict

from app.api.dependencies.database import get_db
from app.models.channels import ChannelConfig, MarketChannelCTS
from app.schemas.settings import ChannelConfigUpdate

router = APIRouter()

@router.get("/")
async def get_channel_configs(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ChannelConfig))
    return result.scalars().all()

@router.put("/{channel_name}")
async def update_channel_config(channel_name: str, payload: ChannelConfigUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ChannelConfig).filter_by(channel_name=channel_name))
    db_obj = result.scalars().first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Channel not found")
        
    for var, value in vars(payload).items():
        if value is not None:
            setattr(db_obj, var, value)
            
    await db.commit()
    return {"message": "Success"}

@router.get("/cts/")
async def get_cts_matrix(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(MarketChannelCTS))
    return result.scalars().all()

class CtsUpdate(BaseModel):
    total_cts_pct: float

@router.put("/cts/{market_name}/{channel_name}")
async def update_cts(market_name: str, channel_name: str, payload: CtsUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(MarketChannelCTS).filter_by(market_name=market_name, channel_name=channel_name))
    db_obj = result.scalars().first()
    if not db_obj:
        raise HTTPException(status_code=404, detail="CTS record not found")
        
    db_obj.total_cts_pct = payload.total_cts_pct
    await db.commit()
    return {"message": "Success"}
