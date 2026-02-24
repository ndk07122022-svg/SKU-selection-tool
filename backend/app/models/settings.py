from sqlalchemy import Column, String, Float
from app.core.database import Base

class GlobalSetting(Base):
    __tablename__ = "global_settings"

    setting_key = Column(String, primary_key=True, index=True)
    setting_value = Column(Float, nullable=False)
