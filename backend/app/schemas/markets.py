from pydantic import BaseModel

class MarketBase(BaseModel):
    market_name: str

class MarketResponse(MarketBase):
    class Config:
        from_attributes = True

class MarketCreate(MarketBase):
    pass
