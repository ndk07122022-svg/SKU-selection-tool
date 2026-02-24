from app.models.skus import SkuRecord, SkuCalculationCache
from typing import Dict, Any

class CalculationEngine:
    def __init__(self, global_settings: Dict[str, float], channel_configs: Dict[str, Dict[str, float]], cts_matrix: Dict[str, Dict[str, float]]):
        self.settings = global_settings
        self.channels = channel_configs
        self.cts = cts_matrix
        
    def _get_setting(self, key: str, default: float = 0.0) -> float:
        return self.settings.get(key, default)

    def calculate_sku(self, sku: SkuRecord) -> SkuCalculationCache:
        cache = SkuCalculationCache(sku_id=sku.sku_id)
        
        # We need both Market and Channel to proceed fully
        if not sku.target_market or not sku.primary_channel:
            return cache # Returns empty cache but prevents crashes
            
        market = sku.target_market
        channel = sku.primary_channel
        
        # 1. Financial Constants
        list_price = sku.local_list_price or 0.0
        landed_cost = sku.landed_cost or 0.0
        
        # 2. CTS Matrix Lookup
        # We assume the CTS matrix dict is nested: cts[market][channel] = total_cts
        cts_pct = 0.0
        if market in self.cts and channel in self.cts[market]:
            cts_pct = self.cts[market][channel]
            
        # 3. Core Financials
        cache.gm_dollar_per_unit = list_price - (landed_cost + (cts_pct * list_price))
        cache.gm_pct = (cache.gm_dollar_per_unit / list_price) if list_price > 0 else 0.0
        
        # 4. Layer B: Market & Channel Fit (Scores 1-5)
        w1 = self._get_setting("consumer_trend_weight", 0.2)
        w2 = self._get_setting("point_of_diff_weight", 0.2)
        w3 = self._get_setting("channel_suitability_weight", 0.2)
        w4 = self._get_setting("strategic_role_weight", 0.2)
        w5 = self._get_setting("marketing_leverage_weight", 0.2)
        
        score_b = (
            (sku.score_consumer_trend or 0) * w1 +
            (sku.score_point_of_diff or 0) * w2 +
            (sku.score_channel_suitability or 0) * w3 +
            (sku.score_strategic_role or 0) * w4 +
            (sku.score_marketing_leverage or 0) * w5
        )
        cache.weighted_score_layer_b = score_b
        
        # Channel-Weighted Score
        ch_weight = 1.0 # default
        if channel in self.channels:
            ch_weight = self.channels[channel].get("channel_weight", 1.0)
        cache.channel_weighted_score = score_b * ch_weight

        # 5. Layer C: Strategic Synergy
        s1 = self._get_setting("price_ladder_weight", 0.2)
        s2 = self._get_setting("usage_occasion_weight", 0.2)
        s3 = self._get_setting("channel_diff_weight", 0.2)
        s4 = self._get_setting("story_cohesion_weight", 0.2)
        s5 = self._get_setting("operational_synergy_weight", 0.2)
        
        score_c = (
            (sku.score_price_ladder or 0) * s1 +
            (sku.score_usage_occasion or 0) * s2 +
            (sku.score_channel_diff or 0) * s3 +
            (sku.score_story_cohesion or 0) * s4 +
            (sku.score_operational_synergy or 0) * s5
        )
        cache.synergy_score_layer_c = score_c

        # 6. Layer D: Risk Heatmap
        r1 = self._get_setting("regulatory_delay_weight", 0.2)
        r2 = self._get_setting("retail_listing_weight", 0.2)
        r3 = self._get_setting("competitive_weight", 0.2)
        r4 = self._get_setting("supply_chain_weight", 0.2)
        r5 = self._get_setting("price_war_weight", 0.2)
        
        score_d = (
            (sku.score_regulatory_delay or 0) * r1 +
            (sku.score_retail_listing or 0) * r2 +
            (sku.score_competitive or 0) * r3 +
            (sku.score_supply_chain or 0) * r4 +
            (sku.score_price_war or 0) * r5
        )
        cache.risk_score_layer_d = score_d
        
        # Risk factor = 1 - (RiskScore - 1)/4
        cache.risk_factor = 1.0 - (max(0, score_d - 1) / 4.0)

        # 7. Pass Gates
        cache.pass_regulatory = (sku.regulatory_eligible == True)
        cache.pass_supply_ready = (sku.supply_ready == True)
        
        gm_floor = self._get_setting("gm_floor_pct", 0.35)
        cache.pass_gm_floor = cache.gm_pct >= gm_floor

        # 8. Demand Logic (Simplified for space, would pull full scenario factors)
        base_units = self.channels.get(channel, {}).get("base_units_per_month", 0)
        ramp_factor = 1.0 # In real implementation, lookup from settings based on ramp_month
        lbi = self._get_setting("listing_breadth_index", 0.2)
        
        # Adj Units = Base * Ramp * Risk * LBI
        adj_units = base_units * ramp_factor * cache.risk_factor * lbi
        cache.adj_units_base = adj_units
        
        cache.monthly_revenue = adj_units * list_price
        cache.monthly_gm_dollar = adj_units * cache.gm_dollar_per_unit

        # 9. Final Recommendation Logic
        min_launch_score = self._get_setting("launch_now_min_score", 4.0)
        max_launch_risk = self._get_setting("launch_now_max_risk", 2.5)
        
        if sku.ip_risk_high or sku.regulatory_prohibition:
            cache.final_recommendation = "Do Not Launch"
            cache.select_for_wave_1 = False
        elif (cache.pass_regulatory and cache.pass_supply_ready and cache.pass_gm_floor and
              cache.channel_weighted_score >= min_launch_score and 
              cache.risk_score_layer_d <= max_launch_risk):
            cache.final_recommendation = "Launch Now"
            cache.select_for_wave_1 = True
        else:
            cache.final_recommendation = "Phase Later"
            cache.select_for_wave_1 = False

        return cache
