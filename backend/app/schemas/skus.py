from pydantic import BaseModel
from typing import Optional

class SkuCalculationCacheResponse(BaseModel):
    gm_dollar_per_unit: Optional[float] = None
    gm_pct: Optional[float] = None
    monthly_revenue: Optional[float] = None
    monthly_gm_dollar: Optional[float] = None
    
    weighted_score_layer_b: Optional[float] = None
    synergy_score_layer_c: Optional[float] = None
    risk_score_layer_d: Optional[float] = None
    risk_factor: Optional[float] = None
    channel_weighted_score: Optional[float] = None
    
    pass_regulatory: Optional[bool] = None
    pass_supply_ready: Optional[bool] = None
    pass_gm_floor: Optional[bool] = None
    
    final_recommendation: Optional[str] = None
    select_for_wave_1: Optional[bool] = None
    
    adj_units_base: Optional[float] = None
    adj_units_best: Optional[float] = None
    adj_units_worst: Optional[float] = None
    
    monthly_gm_base: Optional[float] = None
    monthly_gm_best: Optional[float] = None
    monthly_gm_worst: Optional[float] = None
    
    rank_base: Optional[int] = None
    rank_best: Optional[int] = None
    rank_worst: Optional[int] = None

    class Config:
        from_attributes = True


class SkuRecordBase(BaseModel):
    sku_name: str
    brand: Optional[str] = None
    category: str
    target_market: Optional[str] = None
    primary_channel: Optional[str] = None
    ramp_month: Optional[int] = None
    regulatory_eligible: Optional[bool] = None
    regulatory_prohibition: Optional[bool] = None
    ip_risk_high: Optional[bool] = None
    supply_ready: Optional[bool] = None
    moq: Optional[int] = None
    lead_time_days: Optional[int] = None
    shelf_life_months: Optional[int] = None
    local_list_price: Optional[float] = None
    landed_cost: Optional[float] = None
    
    score_consumer_trend: Optional[int] = None
    score_point_of_diff: Optional[int] = None
    score_channel_suitability: Optional[int] = None
    score_strategic_role: Optional[int] = None
    score_marketing_leverage: Optional[int] = None
    
    score_price_ladder: Optional[int] = None
    score_usage_occasion: Optional[int] = None
    score_channel_diff: Optional[int] = None
    score_story_cohesion: Optional[int] = None
    score_operational_synergy: Optional[int] = None
    
    score_regulatory_delay: Optional[int] = None
    score_retail_listing: Optional[int] = None
    score_competitive: Optional[int] = None
    score_supply_chain: Optional[int] = None
    score_price_war: Optional[int] = None
    
    pass_portfolio_balance: Optional[bool] = None
    suggested_launch_wave: Optional[str] = None

class SkuRecordCreate(SkuRecordBase):
    sku_id: str

class SkuRecordUpdate(SkuRecordBase):
    sku_name: Optional[str] = None
    brand: Optional[str] = None
    category: Optional[str] = None

class SkuRecordResponse(SkuRecordCreate):
    cache: Optional[SkuCalculationCacheResponse] = None

    class Config:
        from_attributes = True
