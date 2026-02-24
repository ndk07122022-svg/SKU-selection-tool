import pandas as pd
import io
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.settings import GlobalSetting
from app.models.channels import ChannelConfig, MarketChannelCTS
from app.models.skus import SkuRecord, SkuCalculationCache
from app.core.calculator import CalculationEngine

async def parse_and_seed_excel(file_bytes: bytes, db: AsyncSession, mapping: dict = None, default_market: str = None) -> dict:
    """Parses the Excel file and seeds the database."""
    stats = {"settings": 0, "channels": 0, "cts_rows": 0, "skus": 0}
    
    mapping = mapping or {}
    
    # Pre-seed the default configurations (so the tool works even if uploading just a SKU list)
    await _seed_default_configs(db)
    
    with io.BytesIO(file_bytes) as f:
        # Check available sheets
        try:
            excel_file = pd.ExcelFile(f)
            sheet_names = excel_file.sheet_names
            
            # If the user uploaded the full file, update config. Otherwise, skip gracefully.
            if "SETTINGS" in sheet_names:
                df_settings = pd.read_excel(excel_file, sheet_name="SETTINGS")
                await _parse_settings(df_settings, db)
                stats["settings"] = len(df_settings)
                
            if "SCENARIO_SETUP" in sheet_names:
                df_scenarios = pd.read_excel(excel_file, sheet_name="SCENARIO_SETUP")
                await _parse_channels(df_scenarios, db)
                stats["channels"] = 4 
                
            if "CTS_Components" in sheet_names:
                df_cts = pd.read_excel(excel_file, sheet_name="CTS_Components")
                await _parse_cts(df_cts, db)
                stats["cts_rows"] = len(df_cts)
                
            # Find the SKU list
            df_skus = _get_sku_df(excel_file)
            stats["skus"] = await _parse_skus(df_skus, db, mapping, default_market)
                
        except Exception as e:
            print(f"Error parsing Excel file: {e}")
            raise e

    return stats

def _get_sku_df(excel_file: pd.ExcelFile) -> pd.DataFrame:
    sheet_names = excel_file.sheet_names
    sku_sheet = None
    if "SKUs Shortlist" in sheet_names:
        sku_sheet = "SKUs Shortlist"
    elif "Sheet1" in sheet_names:
        sku_sheet = "Sheet1"
    elif len(sheet_names) == 1:
        sku_sheet = sheet_names[0]
        
    if sku_sheet:
        df_skus = pd.read_excel(excel_file, sheet_name=sku_sheet, header=None)
        header_row_idx = 0
        for idx, row in df_skus.iterrows():
            row_str = str(row.values).lower()
            if 'sku' in row_str or 'name' in row_str or 'category' in row_str:
                header_row_idx = idx
                break
        return pd.read_excel(excel_file, sheet_name=sku_sheet, header=header_row_idx)
    else:
        raise Exception("Could not find a valid SKU sheet in the uploaded file.")

def extract_headers(file_bytes: bytes) -> list:
    with io.BytesIO(file_bytes) as f:
        excel_file = pd.ExcelFile(f)
        df = _get_sku_df(excel_file)
        return [str(col).strip() for col in df.columns]

async def _seed_default_configs(db: AsyncSession):
    """Inserts the default values into the DB if they don't exist yet."""
    # 1. Global Settings Defaults
    default_settings = {
        "consumer_trend_weight": 0.2, "point_of_diff_weight": 0.2, "channel_suitability_weight": 0.2,
        "strategic_role_weight": 0.2, "marketing_leverage_weight": 0.2, "price_ladder_weight": 0.2,
        "usage_occasion_weight": 0.2, "channel_diff_weight": 0.2, "story_cohesion_weight": 0.2,
        "operational_synergy_weight": 0.2, "regulatory_delay_weight": 0.2, "retail_listing_weight": 0.2,
        "competitive_weight": 0.2, "supply_chain_weight": 0.2, "price_war_weight": 0.2,
        "launch_now_min_score": 4.0, "launch_now_max_risk": 2.5, "phase_later_min_score": 3.0,
        "phase_later_max_risk": 3.5, "price_multiplier": 1.0, "import_freight_pct": 0.1,
        "duties_taxes_pct": 0.15, "listing_breadth_index": 0.2, "gm_floor_pct": 0.35
    }
    
    for k, v in default_settings.items():
        res = await db.execute(select(GlobalSetting).filter_by(setting_key=k))
        if not res.scalars().first():
            db.add(GlobalSetting(setting_key=k, setting_value=v))
            
    # 2. Channel Defaults
    channels = [
        {"name": "E-Com", "units": 500, "weight": 0.35, "adopt": 0.85, "market": 1.1},
        {"name": "MT", "units": 350, "weight": 0.3, "adopt": 0.7, "market": 1.0},
        {"name": "GT", "units": 250, "weight": 0.2, "adopt": 0.55, "market": 0.95},
        {"name": "Rx/Clinic", "units": 500, "weight": 0.15, "adopt": 0.6, "market": 1.05}
    ]
    
    for c in channels:
        res = await db.execute(select(ChannelConfig).filter_by(channel_name=c["name"]))
        if not res.scalars().first():
            db.add(ChannelConfig(
                channel_name=c["name"], base_units_per_month=c["units"], channel_weight=c["weight"],
                retail_adoption_fraction=c["adopt"], marketing_budget_multiplier=c["market"]
            ))
            
    # 3. Basic CTS Matrix
    markets = ["Nepal", "India", "UAE"]
    for m in markets:
        for c in channels:
            ch_name = c["name"]
            res = await db.execute(select(MarketChannelCTS).filter_by(market_name=m, channel_name=ch_name))
            if not res.scalars().first():
                # Rough defaults matching the Excel
                db.add(MarketChannelCTS(
                    market_name=m, channel_name=ch_name, commission_pct=0.12 if ch_name == "E-Com" else 0.0,
                    fulfillment_pct=0.03 if ch_name == "E-Com" else 0.02, payment_cod_pct=0.02 if ch_name == "E-Com" else 0.0,
                    returns_allowance_pct=0.02 if ch_name == "E-Com" else 0.01, listing_fees_pct=0.02 if ch_name == "MT" else 0.0,
                    trade_terms_pct=0.1 if ch_name == "MT" else (0.08 if ch_name != "E-Com" else 0.0),
                    rebates_pct=0.02 if ch_name != "Rx/Clinic" and ch_name != "E-Com" else 0.0,
                    promo_accrual_pct=0.03 if ch_name == "MT" else 0.02,
                    total_cts_pct=0.19 if ch_name == "E-Com" else 0.17 # simplified
                ))
    await db.commit()

async def _parse_settings(df: pd.DataFrame, db: AsyncSession):
    pass

async def _parse_channels(df: pd.DataFrame, db: AsyncSession):
    pass

async def _parse_cts(df: pd.DataFrame, db: AsyncSession):
    pass

async def _parse_skus(df: pd.DataFrame, db: AsyncSession, mapping: dict, default_market: str = None) -> int:
    # Clear existing to prevent constraint issues on re-upload
    await db.execute(SkuCalculationCache.__table__.delete())
    await db.execute(SkuRecord.__table__.delete())
    
    count = 0
    records_to_insert = []
    
    def get_val(cols, key, default=''):
        excel_col = mapping.get(key, key)
        return cols.get(excel_col, default)
    
    for _, row in df.iterrows():
        # Clean col names mapping
        cols = {str(k).strip(): v for k, v in row.to_dict().items()}
        
        sku_id = str(get_val(cols, 'SKU ID'))
        if not sku_id or sku_id == 'nan' or pd.isna(get_val(cols, 'SKU Name', None)):
            continue
            
        target_mkt = str(get_val(cols, 'Target Market', '')) if not pd.isna(get_val(cols, 'Target Market', None)) else None
        if default_market:
            target_mkt = default_market
            
        record = SkuRecord(
            sku_id=sku_id,
            sku_name=str(get_val(cols, 'SKU Name', '')),
            brand=str(get_val(cols, 'Brand', '')) if not pd.isna(get_val(cols, 'Brand', None)) else None,
            category=str(get_val(cols, 'Category', '')),
            target_market=target_mkt,
            primary_channel=str(get_val(cols, 'Primary Channel', '')) if not pd.isna(get_val(cols, 'Primary Channel', None)) else None,
            
            ramp_month=int(get_val(cols, 'Ramp Month (1-4+)', 0)) if not pd.isna(get_val(cols, 'Ramp Month (1-4+)', None)) else None,
            regulatory_eligible=(str(get_val(cols, 'Regulatory Eligible', '')).lower() == 'yes') if not pd.isna(get_val(cols, 'Regulatory Eligible', None)) else None,
            regulatory_prohibition=(str(get_val(cols, 'Regulatory Prohibition', '')).lower() == 'yes') if not pd.isna(get_val(cols, 'Regulatory Prohibition', None)) else None,
            ip_risk_high=(str(get_val(cols, 'IP Risk High', '')).lower() == 'yes') if not pd.isna(get_val(cols, 'IP Risk High', None)) else False,
            supply_ready=(str(get_val(cols, 'Supply Ready', '')).lower() == 'yes') if not pd.isna(get_val(cols, 'Supply Ready', None)) else None,
            
            moq=int(get_val(cols, 'MOQ', 0)) if not pd.isna(get_val(cols, 'MOQ', None)) else None,
            lead_time_days=int(get_val(cols, 'Lead Time (days)', 0)) if not pd.isna(get_val(cols, 'Lead Time (days)', None)) else None,
            shelf_life_months=int(get_val(cols, 'Shelf Life (months)', 0)) if not pd.isna(get_val(cols, 'Shelf Life (months)', None)) else None,
            
            local_list_price=float(get_val(cols, 'Local List Price (calc)', 0.0)) if not pd.isna(get_val(cols, 'Local List Price (calc)', None)) else None,
            landed_cost=float(get_val(cols, 'Landed Cost (calc)', 0.0)) if not pd.isna(get_val(cols, 'Landed Cost (calc)', None)) else None,
            
            score_consumer_trend=int(get_val(cols, 'Consumer Trend', 0)) if not pd.isna(get_val(cols, 'Consumer Trend', None)) else None,
            score_point_of_diff=int(get_val(cols, 'Point of Diff', 0)) if not pd.isna(get_val(cols, 'Point of Diff', None)) else None,
            score_channel_suitability=int(get_val(cols, 'Channel Suitability', 0)) if not pd.isna(get_val(cols, 'Channel Suitability', None)) else None,
            score_strategic_role=int(get_val(cols, 'Strategic Role', 0)) if not pd.isna(get_val(cols, 'Strategic Role', None)) else None,
            score_marketing_leverage=int(get_val(cols, 'Marketing Leverage', 0)) if not pd.isna(get_val(cols, 'Marketing Leverage', None)) else None,
            
            score_price_ladder=int(get_val(cols, 'Price Ladder', 0)) if not pd.isna(get_val(cols, 'Price Ladder', None)) else None,
            score_usage_occasion=int(get_val(cols, 'Usage Occasion', 0)) if not pd.isna(get_val(cols, 'Usage Occasion', None)) else None,
            score_channel_diff=int(get_val(cols, 'Channel Diff', 0)) if not pd.isna(get_val(cols, 'Channel Diff', None)) else None,
            score_story_cohesion=int(get_val(cols, 'Story Cohesion', 0)) if not pd.isna(get_val(cols, 'Story Cohesion', None)) else None,
            score_operational_synergy=int(get_val(cols, 'Operational Synergy', 0)) if not pd.isna(get_val(cols, 'Operational Synergy', None)) else None,
            
            score_regulatory_delay=int(get_val(cols, 'Regulatory Delay', 0)) if not pd.isna(get_val(cols, 'Regulatory Delay', None)) else None,
            score_retail_listing=int(get_val(cols, 'Retail Listing', 0)) if not pd.isna(get_val(cols, 'Retail Listing', None)) else None,
            score_competitive=int(get_val(cols, 'Competitive', 0)) if not pd.isna(get_val(cols, 'Competitive', None)) else None,
            score_supply_chain=int(get_val(cols, 'Supply Chain', 0)) if not pd.isna(get_val(cols, 'Supply Chain', None)) else None,
            score_price_war=int(get_val(cols, 'Price War', 0)) if not pd.isna(get_val(cols, 'Price War', None)) else None,
            
            pass_portfolio_balance=(str(get_val(cols, 'Pass: Portfolio Balance (manual)', '')).lower() == 'yes') if not pd.isna(get_val(cols, 'Pass: Portfolio Balance (manual)', None)) else None,
            suggested_launch_wave=str(get_val(cols, 'Suggested Launch Wave', '')) if not pd.isna(get_val(cols, 'Suggested Launch Wave', None)) else None,
        )
        records_to_insert.append(record)
        count += 1
        
    db.add_all(records_to_insert)
    
    # Needs a flush so they get IDs / attached to DB session
    await db.flush()
    
    # Calculate for all inserted
    settings_res = await db.execute(select(GlobalSetting))
    settings = {s.setting_key: s.setting_value for s in settings_res.scalars().all()}
    
    channels_res = await db.execute(select(ChannelConfig))
    channels = {c.channel_name: {
        "base_units_per_month": c.base_units_per_month,
        "channel_weight": c.channel_weight,
    } for c in channels_res.scalars().all()}
    
    cts_res = await db.execute(select(MarketChannelCTS))
    cts_matrix = {}
    for cts in cts_res.scalars().all():
        if cts.market_name not in cts_matrix:
            cts_matrix[cts.market_name] = {}
        cts_matrix[cts.market_name][cts.channel_name] = cts.total_cts_pct
        
    engine = CalculationEngine(settings, channels, cts_matrix)
    
    caches = []
    for r in records_to_insert:
        cache = engine.calculate_sku(r)
        caches.append(cache)
        
    db.add_all(caches)
    await db.commit()
    
    return count
