from sqlalchemy import Column, String, Integer, Float, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class SkuRecord(Base):
    __tablename__ = "sku_records"

    sku_id = Column(String, primary_key=True, index=True)
    sku_name = Column(String, nullable=False)
    brand = Column(String, nullable=True)
    category = Column(String, nullable=False)
    
    target_market = Column(String, nullable=True)
    primary_channel = Column(String, nullable=True)
    
    ramp_month = Column(Integer, nullable=True)
    regulatory_eligible = Column(Boolean, nullable=True)
    regulatory_prohibition = Column(Boolean, nullable=True)
    ip_risk_high = Column(Boolean, nullable=True)
    supply_ready = Column(Boolean, nullable=True)
    moq = Column(Integer, nullable=True)
    lead_time_days = Column(Integer, nullable=True)
    shelf_life_months = Column(Integer, nullable=True)
    
    local_list_price = Column(Float, nullable=True)
    landed_cost = Column(Float, nullable=True)
    
    score_consumer_trend = Column(Integer, nullable=True)
    score_point_of_diff = Column(Integer, nullable=True)
    score_channel_suitability = Column(Integer, nullable=True)
    score_strategic_role = Column(Integer, nullable=True)
    score_marketing_leverage = Column(Integer, nullable=True)
    
    score_price_ladder = Column(Integer, nullable=True)
    score_usage_occasion = Column(Integer, nullable=True)
    score_channel_diff = Column(Integer, nullable=True)
    score_story_cohesion = Column(Integer, nullable=True)
    score_operational_synergy = Column(Integer, nullable=True)
    
    score_regulatory_delay = Column(Integer, nullable=True)
    score_retail_listing = Column(Integer, nullable=True)
    score_competitive = Column(Integer, nullable=True)
    score_supply_chain = Column(Integer, nullable=True)
    score_price_war = Column(Integer, nullable=True)
    
    pass_portfolio_balance = Column(Boolean, nullable=True)
    suggested_launch_wave = Column(String, nullable=True)

    cache = relationship("SkuCalculationCache", back_populates="sku", uselist=False, cascade="all, delete-orphan")


class SkuCalculationCache(Base):
    __tablename__ = "sku_calculation_cache"

    sku_id = Column(String, ForeignKey("sku_records.sku_id"), primary_key=True)
    
    gm_dollar_per_unit = Column(Float, nullable=True)
    gm_pct = Column(Float, nullable=True)
    monthly_revenue = Column(Float, nullable=True)
    monthly_gm_dollar = Column(Float, nullable=True)
    
    weighted_score_layer_b = Column(Float, nullable=True)
    synergy_score_layer_c = Column(Float, nullable=True)
    risk_score_layer_d = Column(Float, nullable=True)
    risk_factor = Column(Float, nullable=True)
    channel_weighted_score = Column(Float, nullable=True)
    
    pass_regulatory = Column(Boolean, nullable=True)
    pass_supply_ready = Column(Boolean, nullable=True)
    pass_gm_floor = Column(Boolean, nullable=True)
    
    final_recommendation = Column(String, nullable=True)
    select_for_wave_1 = Column(Boolean, nullable=True)
    
    adj_units_base = Column(Float, nullable=True)
    adj_units_best = Column(Float, nullable=True)
    adj_units_worst = Column(Float, nullable=True)
    
    monthly_gm_base = Column(Float, nullable=True)
    monthly_gm_best = Column(Float, nullable=True)
    monthly_gm_worst = Column(Float, nullable=True)
    
    rank_base = Column(Integer, nullable=True)
    rank_best = Column(Integer, nullable=True)
    rank_worst = Column(Integer, nullable=True)

    sku = relationship("SkuRecord", back_populates="cache")
