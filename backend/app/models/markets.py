from sqlalchemy import Column, String
from app.core.database import Base

class Market(Base):
    __tablename__ = "markets"

    market_name = Column(String, primary_key=True, index=True)
