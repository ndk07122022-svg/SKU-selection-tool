from sqlalchemy import Column, String, Integer, Float
from app.core.database import Base

class ChannelConfig(Base):
    __tablename__ = "channel_configs"

    channel_name = Column(String, primary_key=True, index=True)
    base_units_per_month = Column(Integer, nullable=False)
    channel_weight = Column(Float, nullable=False)
    retail_adoption_fraction = Column(Float, nullable=False)
    marketing_budget_multiplier = Column(Float, nullable=False)

class MarketChannelCTS(Base):
    __tablename__ = "market_channel_cts"

    market_name = Column(String, primary_key=True, index=True)
    channel_name = Column(String, primary_key=True, index=True)
    
    commission_pct = Column(Float, nullable=False, default=0.0)
    fulfillment_pct = Column(Float, nullable=False, default=0.0)
    payment_cod_pct = Column(Float, nullable=False, default=0.0)
    returns_allowance_pct = Column(Float, nullable=False, default=0.0)
    listing_fees_pct = Column(Float, nullable=False, default=0.0)
    trade_terms_pct = Column(Float, nullable=False, default=0.0)
    rebates_pct = Column(Float, nullable=False, default=0.0)
    promo_accrual_pct = Column(Float, nullable=False, default=0.0)
    total_cts_pct = Column(Float, nullable=False, default=0.0)
