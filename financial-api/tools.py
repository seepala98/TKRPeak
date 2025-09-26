# Financial Analysis Tools for Agentic AI
# Tool calling implementation for dynamic financial analysis

import yfinance as yf
import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import json

class FinancialAnalysisTools:
    """
    Comprehensive financial analysis tools for agentic AI
    Each method represents a tool that the AI can call dynamically
    """
    
    def __init__(self):
        self.cache = {}  # Simple caching for tool results
    
    # ===== CORE DATA FETCHING TOOLS =====
    
    async def fetch_quarterly_data(self, ticker: str, quarters: int = 8, metrics: Optional[List[str]] = None) -> Dict[str, Any]:
        """
        Tool: Fetch specific quarterly data points
        Allows AI to request exactly what it needs for analysis
        """
        try:
            stock = yf.Ticker(ticker)
            
            # Default comprehensive metrics if none specified
            if not metrics:
                metrics = ["revenue", "net_income", "free_cash_flow", "total_debt", "total_cash"]
            
            # Fetch quarterly data
            quarterly_financials = stock.quarterly_financials
            quarterly_balance = stock.quarterly_balance_sheet
            quarterly_cashflow = stock.quarterly_cashflow
            
            # Process last N quarters
            quarters_data = []
            for i, date in enumerate(quarterly_financials.columns[:quarters]):
                quarter_data = {
                    "period": date.strftime("%Y-Q%s") if hasattr(date, 'strftime') else str(date)[:10],
                    "date": str(date)[:10]
                }
                
                # Add requested metrics
                for metric in metrics:
                    quarter_data[metric] = self._extract_metric(
                        metric, date, quarterly_financials, quarterly_balance, quarterly_cashflow
                    )
                
                quarters_data.append(quarter_data)
            
            return {
                "success": True,
                "ticker": ticker,
                "quarters": len(quarters_data),
                "data": quarters_data,
                "tool_used": "fetch_quarterly_data"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "tool_used": "fetch_quarterly_data"
            }
    
    async def calculate_financial_ratios(self, ticker: str, ratios: List[str], include_industry: bool = True) -> Dict[str, Any]:
        """
        Tool: Calculate specific financial ratios
        AI can request specific ratios it wants to analyze
        """
        try:
            stock = yf.Ticker(ticker)
            info = stock.info
            
            # Latest financial data
            income_stmt = stock.income_stmt
            balance_sheet = stock.balance_sheet
            cashflow = stock.cashflow
            
            calculated_ratios = {}
            
            for ratio in ratios:
                calculated_ratios[ratio] = self._calculate_specific_ratio(
                    ratio, info, income_stmt, balance_sheet, cashflow
                )
            
            # Add industry comparison if requested
            industry_comparison = {}
            if include_industry and 'industry' in info:
                industry_comparison = await self._get_industry_benchmarks(info['industry'], ratios)
            
            return {
                "success": True,
                "ticker": ticker,
                "ratios": calculated_ratios,
                "industry_comparison": industry_comparison,
                "tool_used": "calculate_financial_ratios"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "tool_used": "calculate_financial_ratios"
            }
    
    async def compare_with_peers(self, ticker: str, peers: List[str], metrics: List[str]) -> Dict[str, Any]:
        """
        Tool: Compare company against competitors
        AI can dynamically choose which peers and metrics to compare
        """
        try:
            comparison_data = {}
            
            # Add target company
            target_data = await self._get_company_metrics(ticker, metrics)
            comparison_data[ticker] = target_data
            
            # Add peer companies
            for peer in peers:
                peer_data = await self._get_company_metrics(peer, metrics)
                comparison_data[peer] = peer_data
            
            # Calculate rankings and percentiles
            rankings = self._calculate_peer_rankings(comparison_data, metrics)
            
            return {
                "success": True,
                "target_ticker": ticker,
                "peers": peers,
                "comparison_data": comparison_data,
                "rankings": rankings,
                "tool_used": "compare_with_peers"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "tool_used": "compare_with_peers"
            }
    
    async def get_analyst_consensus(self, ticker: str, include_history: bool = True) -> Dict[str, Any]:
        """
        Tool: Get analyst ratings and price targets
        Provides market sentiment and professional analysis
        """
        try:
            stock = yf.Ticker(ticker)
            
            # Get recommendations and price targets
            recommendations = stock.recommendations
            analyst_price_targets = stock.analyst_price_targets
            earnings_estimate = stock.earnings_estimate
            
            consensus_data = {
                "current_price": stock.info.get('currentPrice'),
                "analyst_targets": {},
                "recommendations": {},
                "earnings_estimates": {}
            }
            
            # Process analyst price targets
            if analyst_price_targets is not None and not analyst_price_targets.empty:
                consensus_data["analyst_targets"] = {
                    "mean_target": analyst_price_targets.get('targetMeanPrice'),
                    "high_target": analyst_price_targets.get('targetHighPrice'),
                    "low_target": analyst_price_targets.get('targetLowPrice'),
                    "number_of_analysts": analyst_price_targets.get('numberOfAnalystOpinions')
                }
            
            # Process recommendations
            if recommendations is not None and not recommendations.empty:
                latest_recs = recommendations.head(1).iloc[0] if len(recommendations) > 0 else {}
                consensus_data["recommendations"] = {
                    "strong_buy": latest_recs.get('strongBuy', 0),
                    "buy": latest_recs.get('buy', 0),
                    "hold": latest_recs.get('hold', 0),
                    "sell": latest_recs.get('sell', 0),
                    "strong_sell": latest_recs.get('strongSell', 0)
                }
            
            return {
                "success": True,
                "ticker": ticker,
                "consensus": consensus_data,
                "tool_used": "get_analyst_consensus"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "tool_used": "get_analyst_consensus"
            }
    
    async def fetch_market_context(self, ticker: str, include_sector: bool = True, timeframe: str = "6M") -> Dict[str, Any]:
        """
        Tool: Get market context and sector performance
        Helps AI understand broader market conditions
        """
        try:
            stock = yf.Ticker(ticker)
            info = stock.info
            
            # Get sector and industry info
            sector = info.get('sector', 'Unknown')
            industry = info.get('industry', 'Unknown')
            
            # Fetch market indices for comparison
            market_data = {}
            indices = {
                "^GSPC": "S&P 500",
                "^DJI": "Dow Jones",
                "^IXIC": "NASDAQ"
            }
            
            for index_ticker, name in indices.items():
                index_data = yf.Ticker(index_ticker)
                hist = index_data.history(period=timeframe)
                if not hist.empty:
                    start_price = hist['Close'].iloc[0]
                    end_price = hist['Close'].iloc[-1]
                    performance = ((end_price - start_price) / start_price) * 100
                    
                    market_data[name] = {
                        "performance": round(performance, 2),
                        "timeframe": timeframe
                    }
            
            # Get sector ETF performance if available
            sector_performance = {}
            if include_sector and sector != 'Unknown':
                sector_etf = self._get_sector_etf(sector)
                if sector_etf:
                    etf_data = yf.Ticker(sector_etf)
                    hist = etf_data.history(period=timeframe)
                    if not hist.empty:
                        start_price = hist['Close'].iloc[0]
                        end_price = hist['Close'].iloc[-1]
                        performance = ((end_price - start_price) / start_price) * 100
                        
                        sector_performance = {
                            "sector": sector,
                            "etf_ticker": sector_etf,
                            "performance": round(performance, 2),
                            "timeframe": timeframe
                        }
            
            return {
                "success": True,
                "ticker": ticker,
                "sector": sector,
                "industry": industry,
                "market_indices": market_data,
                "sector_performance": sector_performance,
                "tool_used": "fetch_market_context"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "tool_used": "fetch_market_context"
            }
    
    # ===== ADVANCED ANALYSIS TOOLS =====
    
    async def detect_financial_anomalies(self, ticker: str, lookback_periods: int = 12, sensitivity: str = "medium") -> Dict[str, Any]:
        """
        Tool: Detect unusual patterns in financial data
        AI can identify red flags or opportunities
        """
        try:
            stock = yf.Ticker(ticker)
            quarterly_data = stock.quarterly_financials
            
            if quarterly_data is None or quarterly_data.empty:
                return {"success": False, "error": "No quarterly data available"}
            
            anomalies = []
            
            # Get last N quarters
            recent_quarters = quarterly_data.iloc[:, :lookback_periods]
            
            # Define sensitivity thresholds
            thresholds = {
                "low": 2.0,      # 2 standard deviations
                "medium": 1.5,   # 1.5 standard deviations  
                "high": 1.0      # 1 standard deviation
            }
            
            threshold = thresholds.get(sensitivity, 1.5)
            
            # Check for anomalies in key metrics
            key_metrics = [
                'Total Revenue', 'Net Income', 'Operating Income',
                'Gross Profit', 'Total Operating Expenses'
            ]
            
            for metric in key_metrics:
                if metric in recent_quarters.index:
                    values = recent_quarters.loc[metric].dropna()
                    if len(values) >= 4:  # Need at least 4 data points
                        
                        # Calculate rolling statistics
                        mean_val = values.mean()
                        std_val = values.std()
                        
                        # Check latest value against historical pattern
                        latest_value = values.iloc[0]  # Most recent quarter
                        z_score = abs((latest_value - mean_val) / std_val) if std_val > 0 else 0
                        
                        if z_score > threshold:
                            anomaly_type = "spike" if latest_value > mean_val else "drop"
                            anomalies.append({
                                "metric": metric,
                                "type": anomaly_type,
                                "z_score": round(z_score, 2),
                                "latest_value": latest_value,
                                "historical_mean": round(mean_val, 2),
                                "severity": "high" if z_score > 2 else "medium"
                            })
            
            return {
                "success": True,
                "ticker": ticker,
                "anomalies_detected": len(anomalies),
                "anomalies": anomalies,
                "sensitivity_used": sensitivity,
                "tool_used": "detect_financial_anomalies"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "tool_used": "detect_financial_anomalies"
            }
    
    async def assess_financial_health(self, ticker: str, include_scores: bool = True) -> Dict[str, Any]:
        """
        Tool: Calculate comprehensive financial health assessment
        Provides overall financial stability score
        """
        try:
            stock = yf.Ticker(ticker)
            info = stock.info
            
            # Get financial statements
            income_stmt = stock.income_stmt
            balance_sheet = stock.balance_sheet
            cashflow = stock.cashflow
            
            health_assessment = {
                "overall_score": 0,
                "category_scores": {},
                "key_indicators": {},
                "risk_factors": [],
                "strengths": []
            }
            
            # Calculate liquidity ratios
            current_ratio = self._calculate_current_ratio(balance_sheet)
            quick_ratio = self._calculate_quick_ratio(balance_sheet)
            
            # Calculate leverage ratios
            debt_to_equity = self._calculate_debt_to_equity(balance_sheet)
            debt_to_assets = self._calculate_debt_to_assets(balance_sheet)
            
            # Calculate profitability ratios
            roe = info.get('returnOnEquity')
            roa = info.get('returnOnAssets')
            profit_margin = info.get('profitMargins')
            
            # Calculate efficiency ratios
            asset_turnover = self._calculate_asset_turnover(income_stmt, balance_sheet)
            
            # Score each category (0-100)
            liquidity_score = self._score_liquidity(current_ratio, quick_ratio)
            leverage_score = self._score_leverage(debt_to_equity, debt_to_assets)
            profitability_score = self._score_profitability(roe, roa, profit_margin)
            efficiency_score = self._score_efficiency(asset_turnover)
            
            # Calculate overall score
            overall_score = (liquidity_score + leverage_score + profitability_score + efficiency_score) / 4
            
            health_assessment.update({
                "overall_score": round(overall_score, 1),
                "category_scores": {
                    "liquidity": round(liquidity_score, 1),
                    "leverage": round(leverage_score, 1),
                    "profitability": round(profitability_score, 1),
                    "efficiency": round(efficiency_score, 1)
                },
                "key_indicators": {
                    "current_ratio": current_ratio,
                    "quick_ratio": quick_ratio,
                    "debt_to_equity": debt_to_equity,
                    "debt_to_assets": debt_to_assets,
                    "roe": roe,
                    "roa": roa,
                    "profit_margin": profit_margin,
                    "asset_turnover": asset_turnover
                }
            })
            
            # Add risk factors and strengths based on scores
            if liquidity_score < 60:
                health_assessment["risk_factors"].append("Low liquidity - potential cash flow issues")
            elif liquidity_score > 80:
                health_assessment["strengths"].append("Strong liquidity position")
                
            if leverage_score < 60:
                health_assessment["risk_factors"].append("High debt levels - financial leverage risk")
            elif leverage_score > 80:
                health_assessment["strengths"].append("Conservative debt management")
                
            if profitability_score < 60:
                health_assessment["risk_factors"].append("Below-average profitability")
            elif profitability_score > 80:
                health_assessment["strengths"].append("Strong profitability metrics")
            
            return {
                "success": True,
                "ticker": ticker,
                "assessment": health_assessment,
                "tool_used": "assess_financial_health"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "tool_used": "assess_financial_health"
            }
    
    # ===== HELPER METHODS =====
    
    def _extract_metric(self, metric: str, date, financials_df, balance_df, cashflow_df):
        """Extract specific metric from appropriate financial statement"""
        # Map metrics to their likely locations and names
        metric_mapping = {
            "revenue": ("Total Revenue", financials_df),
            "net_income": ("Net Income", financials_df),
            "gross_profit": ("Gross Profit", financials_df),
            "operating_income": ("Operating Income", financials_df),
            "ebitda": ("EBITDA", financials_df),
            "total_debt": ("Total Debt", balance_df),
            "total_cash": ("Cash And Cash Equivalents", balance_df),
            "total_assets": ("Total Assets", balance_df),
            "stockholder_equity": ("Stockholders Equity", balance_df),
            "free_cash_flow": ("Free Cash Flow", cashflow_df),
            "operating_cash_flow": ("Operating Cash Flow", cashflow_df)
        }
        
        if metric in metric_mapping:
            field_name, df = metric_mapping[metric]
            try:
                if field_name in df.index and date in df.columns:
                    value = df.loc[field_name, date]
                    return float(value) if pd.notna(value) else None
            except:
                pass
        
        return None
    
    def _calculate_specific_ratio(self, ratio: str, info: dict, income_stmt, balance_sheet, cashflow):
        """Calculate specific financial ratio"""
        try:
            if ratio == "P/E":
                return info.get('trailingPE')
            elif ratio == "P/B":
                return info.get('priceToBook')
            elif ratio == "ROE":
                return info.get('returnOnEquity')
            elif ratio == "ROA":
                return info.get('returnOnAssets')
            elif ratio == "Current_Ratio":
                return self._calculate_current_ratio(balance_sheet)
            elif ratio == "Debt_to_Equity":
                return self._calculate_debt_to_equity(balance_sheet)
            # Add more ratios as needed
            else:
                return None
        except:
            return None
    
    def _calculate_current_ratio(self, balance_sheet):
        """Calculate current ratio from balance sheet"""
        try:
            if balance_sheet is not None and not balance_sheet.empty:
                current_assets = balance_sheet.loc['Current Assets'].iloc[0] if 'Current Assets' in balance_sheet.index else None
                current_liabilities = balance_sheet.loc['Current Liabilities'].iloc[0] if 'Current Liabilities' in balance_sheet.index else None
                
                if current_assets and current_liabilities and current_liabilities != 0:
                    return current_assets / current_liabilities
        except:
            pass
        return None
    
    def _calculate_debt_to_equity(self, balance_sheet):
        """Calculate debt-to-equity ratio"""
        try:
            if balance_sheet is not None and not balance_sheet.empty:
                total_debt = balance_sheet.loc['Total Debt'].iloc[0] if 'Total Debt' in balance_sheet.index else None
                stockholder_equity = balance_sheet.loc['Stockholders Equity'].iloc[0] if 'Stockholders Equity' in balance_sheet.index else None
                
                if total_debt and stockholder_equity and stockholder_equity != 0:
                    return total_debt / stockholder_equity
        except:
            pass
        return None
    
    # Additional helper methods implementation
    
    async def _get_industry_benchmarks(self, industry: str, ratios: List[str]) -> Dict[str, Any]:
        """Get industry benchmark ratios (placeholder implementation)"""
        # This would typically fetch from industry database
        # For now, return placeholder values
        benchmarks = {}
        for ratio in ratios:
            benchmarks[f"{ratio}_industry_avg"] = "N/A"
        return benchmarks
    
    async def _get_company_metrics(self, ticker: str, metrics: List[str]) -> Dict[str, Any]:
        """Get specific metrics for a company"""
        try:
            stock = yf.Ticker(ticker)
            info = stock.info
            
            company_metrics = {"ticker": ticker}
            for metric in metrics:
                if metric.lower() == "market_cap":
                    company_metrics[metric] = info.get("marketCap")
                elif metric.lower() == "pe_ratio":
                    company_metrics[metric] = info.get("trailingPE")
                elif metric.lower() == "revenue":
                    company_metrics[metric] = info.get("totalRevenue")
                elif metric.lower() == "profit_margin":
                    company_metrics[metric] = info.get("profitMargins")
                else:
                    company_metrics[metric] = info.get(metric)
            
            return company_metrics
        except:
            return {"ticker": ticker, "error": "Data unavailable"}
    
    def _calculate_peer_rankings(self, comparison_data: Dict[str, Any], metrics: List[str]) -> Dict[str, Any]:
        """Calculate peer rankings for metrics"""
        rankings = {}
        
        for metric in metrics:
            values = []
            for ticker, data in comparison_data.items():
                if metric in data and data[metric] is not None:
                    try:
                        values.append((ticker, float(data[metric])))
                    except:
                        continue
            
            if values:
                # Sort by value (descending for most metrics)
                values.sort(key=lambda x: x[1], reverse=True)
                rankings[metric] = {ticker: rank + 1 for rank, (ticker, _) in enumerate(values)}
            else:
                rankings[metric] = {}
        
        return rankings
    
    def _calculate_quick_ratio(self, balance_sheet):
        """Calculate quick ratio (more conservative than current ratio)"""
        try:
            if balance_sheet is not None and not balance_sheet.empty:
                current_assets = balance_sheet.loc['Current Assets'].iloc[0] if 'Current Assets' in balance_sheet.index else None
                inventory = balance_sheet.loc['Inventory'].iloc[0] if 'Inventory' in balance_sheet.index else 0
                current_liabilities = balance_sheet.loc['Current Liabilities'].iloc[0] if 'Current Liabilities' in balance_sheet.index else None
                
                if current_assets and current_liabilities and current_liabilities != 0:
                    quick_assets = current_assets - (inventory or 0)
                    return quick_assets / current_liabilities
        except:
            pass
        return None
    
    def _calculate_debt_to_assets(self, balance_sheet):
        """Calculate debt-to-assets ratio"""
        try:
            if balance_sheet is not None and not balance_sheet.empty:
                total_debt = balance_sheet.loc['Total Debt'].iloc[0] if 'Total Debt' in balance_sheet.index else None
                total_assets = balance_sheet.loc['Total Assets'].iloc[0] if 'Total Assets' in balance_sheet.index else None
                
                if total_debt and total_assets and total_assets != 0:
                    return total_debt / total_assets
        except:
            pass
        return None
    
    def _calculate_asset_turnover(self, income_stmt, balance_sheet):
        """Calculate asset turnover ratio"""
        try:
            if (income_stmt is not None and not income_stmt.empty and 
                balance_sheet is not None and not balance_sheet.empty):
                revenue = income_stmt.loc['Total Revenue'].iloc[0] if 'Total Revenue' in income_stmt.index else None
                total_assets = balance_sheet.loc['Total Assets'].iloc[0] if 'Total Assets' in balance_sheet.index else None
                
                if revenue and total_assets and total_assets != 0:
                    return revenue / total_assets
        except:
            pass
        return None
    
    def _score_liquidity(self, current_ratio, quick_ratio):
        """Score liquidity based on ratios (0-100 scale)"""
        score = 0
        
        if current_ratio:
            if current_ratio >= 2.0:
                score += 50
            elif current_ratio >= 1.5:
                score += 35
            elif current_ratio >= 1.0:
                score += 20
            else:
                score += 10
        
        if quick_ratio:
            if quick_ratio >= 1.5:
                score += 50
            elif quick_ratio >= 1.0:
                score += 35
            elif quick_ratio >= 0.8:
                score += 20
            else:
                score += 10
        
        return min(score, 100)
    
    def _score_leverage(self, debt_to_equity, debt_to_assets):
        """Score leverage health (0-100 scale, higher is better)"""
        score = 0
        
        if debt_to_equity is not None:
            if debt_to_equity <= 0.3:
                score += 50
            elif debt_to_equity <= 0.6:
                score += 35
            elif debt_to_equity <= 1.0:
                score += 20
            else:
                score += 10
        
        if debt_to_assets is not None:
            if debt_to_assets <= 0.2:
                score += 50
            elif debt_to_assets <= 0.4:
                score += 35
            elif debt_to_assets <= 0.6:
                score += 20
            else:
                score += 10
        
        return min(score, 100)
    
    def _score_profitability(self, roe, roa, profit_margin):
        """Score profitability metrics (0-100 scale)"""
        score = 0
        
        if roe is not None:
            roe_pct = roe * 100 if roe < 1 else roe
            if roe_pct >= 20:
                score += 35
            elif roe_pct >= 15:
                score += 25
            elif roe_pct >= 10:
                score += 15
            else:
                score += 5
        
        if roa is not None:
            roa_pct = roa * 100 if roa < 1 else roa
            if roa_pct >= 15:
                score += 35
            elif roa_pct >= 10:
                score += 25
            elif roa_pct >= 5:
                score += 15
            else:
                score += 5
        
        if profit_margin is not None:
            margin_pct = profit_margin * 100 if profit_margin < 1 else profit_margin
            if margin_pct >= 20:
                score += 30
            elif margin_pct >= 10:
                score += 20
            elif margin_pct >= 5:
                score += 10
            else:
                score += 5
        
        return min(score, 100)
    
    def _score_efficiency(self, asset_turnover):
        """Score efficiency metrics (0-100 scale)"""
        if asset_turnover is None:
            return 50  # Neutral score
        
        if asset_turnover >= 2.0:
            return 100
        elif asset_turnover >= 1.5:
            return 80
        elif asset_turnover >= 1.0:
            return 60
        elif asset_turnover >= 0.5:
            return 40
        else:
            return 20
    
    def _get_sector_etf(self, sector: str) -> Optional[str]:
        """Get sector ETF ticker for given sector"""
        sector_etfs = {
            "Technology": "XLK",
            "Healthcare": "XLV", 
            "Financial Services": "XLF",
            "Consumer Cyclical": "XLY",
            "Industrials": "XLI",
            "Energy": "XLE",
            "Utilities": "XLU",
            "Real Estate": "XLRE",
            "Materials": "XLB",
            "Consumer Defensive": "XLP",
            "Communication Services": "XLC"
        }
        return sector_etfs.get(sector)

# Tool registry for function calling
TOOL_REGISTRY = {
    "fetch_quarterly_data": FinancialAnalysisTools().fetch_quarterly_data,
    "calculate_financial_ratios": FinancialAnalysisTools().calculate_financial_ratios,
    "compare_with_peers": FinancialAnalysisTools().compare_with_peers,
    "get_analyst_consensus": FinancialAnalysisTools().get_analyst_consensus,
    "fetch_market_context": FinancialAnalysisTools().fetch_market_context,
    "detect_financial_anomalies": FinancialAnalysisTools().detect_financial_anomalies,
    "assess_financial_health": FinancialAnalysisTools().assess_financial_health
}
