from pydantic import BaseModel
from typing import List, Optional

class GlobalSettingBase(BaseModel):
    setting_value: float

class GlobalSettingCreate(GlobalSettingBase):
    setting_key: str

class GlobalSettingResponse(GlobalSettingCreate):
    class Config:
        from_attributes = True

class ChannelConfigBase(BaseModel):
    base_units_per_month: int
    channel_weight: float
    retail_adoption_fraction: float
    marketing_budget_multiplier: float

class ChannelConfigCreate(ChannelConfigBase):
    channel_name: str

class ChannelConfigResponse(ChannelConfigCreate):
    class Config:
        from_attributes = True

class ChannelConfigUpdate(BaseModel):
    base_units_per_month: Optional[int] = None
    channel_weight: Optional[float] = None
    retail_adoption_fraction: Optional[float] = None
    marketing_budget_multiplier: Optional[float] = None

class MarketChannelCTSBase(BaseModel):
    commission_pct: float
    fulfillment_pct: float
    payment_cod_pct: float
    returns_allowance_pct: float
    listing_fees_pct: float
    trade_terms_pct: float
    rebates_pct: float
    promo_accrual_pct: float
    total_cts_pct: float

class MarketChannelCTSCreate(MarketChannelCTSBase):
    market_name: str
    channel_name: str

class MarketChannelCTSResponse(MarketChannelCTSCreate):
    class Config:
        from_attributes = True
