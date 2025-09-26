#!/usr/bin/env python3
"""
FastAPI Financial Data Service
Provides comprehensive stock financial data using yfinance package
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, List, Any
import yfinance as yf
import pandas as pd
import numpy as np
import logging
from datetime import datetime, timedelta
import traceback
import time
import asyncio
from functools import wraps
import random
import httpx
from tools import FinancialAnalysisTools, TOOL_REGISTRY

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Rate limiting and caching configuration
LAST_REQUEST_TIME = {}
MIN_REQUEST_INTERVAL = 1.0  # Minimum seconds between requests
MAX_RETRIES = 3
BASE_DELAY = 2.0  # Base delay for exponential backoff

# Simple in-memory cache to reduce API calls
CACHE = {}
CACHE_TTL = 300  # 5 minutes cache TTL
CACHE_MAX_SIZE = 1000  # Maximum number of cached items

# Gemini API specific rate limiting
GEMINI_LAST_CALL = {}
GEMINI_MIN_INTERVAL = 1.0  # Minimum seconds between Gemini API calls per key

def get_cache_key(symbol, operation):
    """Generate cache key for a symbol and operation"""
    return f"{symbol.upper()}:{operation}"

def get_from_cache(cache_key):
    """Get data from cache if still valid"""
    if cache_key in CACHE:
        data, timestamp = CACHE[cache_key]
        if time.time() - timestamp < CACHE_TTL:
            logger.info(f"Cache hit for {cache_key}")
            return data
        else:
            # Remove expired data
            del CACHE[cache_key]
            logger.info(f"Cache expired for {cache_key}")
    
    return None

def set_cache(cache_key, data):
    """Set data in cache with current timestamp"""
    # Simple cache size management
    if len(CACHE) >= CACHE_MAX_SIZE:
        # Remove oldest entries (simple FIFO)
        oldest_key = next(iter(CACHE))
        del CACHE[oldest_key]
    
    CACHE[cache_key] = (data, time.time())
    logger.info(f"Cached data for {cache_key}")

def rate_limit_decorator(func):
    """Decorator to add rate limiting to functions"""
    @wraps(func)
    async def wrapper(*args, **kwargs):
        current_time = time.time()
        
        # Check if we need to wait
        if 'last_call' in LAST_REQUEST_TIME:
            time_since_last = current_time - LAST_REQUEST_TIME['last_call']
            if time_since_last < MIN_REQUEST_INTERVAL:
                wait_time = MIN_REQUEST_INTERVAL - time_since_last
                logger.info(f"Rate limiting: waiting {wait_time:.2f} seconds")
                await asyncio.sleep(wait_time)
        
        LAST_REQUEST_TIME['last_call'] = time.time()
        return await func(*args, **kwargs)
    return wrapper

def retry_with_backoff(max_retries=MAX_RETRIES, base_delay=BASE_DELAY):
    """Decorator to retry function calls with exponential backoff"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    if attempt == max_retries - 1:  # Last attempt
                        raise e
                    
                    # Check if it's a rate limit error
                    if "429" in str(e) or "Too Many Requests" in str(e):
                        delay = base_delay * (2 ** attempt) + random.uniform(0, 1)
                        logger.warning(f"Rate limited (attempt {attempt + 1}), retrying in {delay:.2f} seconds: {e}")
                        time.sleep(delay)
                    else:
                        # For other errors, shorter delay
                        delay = base_delay * (2 ** attempt) * 0.5
                        logger.warning(f"Request failed (attempt {attempt + 1}), retrying in {delay:.2f} seconds: {e}")
                        time.sleep(delay)
            
            return None
        return wrapper
    return decorator

def safe_yfinance_call(ticker_symbol, operation_name, func, *args, **kwargs):
    """Safely call yfinance functions with error handling and caching"""
    cache_key = get_cache_key(ticker_symbol, operation_name)
    
    # Try to get from cache first
    cached_result = get_from_cache(cache_key)
    if cached_result is not None:
        return cached_result
    
    try:
        logger.info(f"Calling {operation_name} for {ticker_symbol}")
        
        # Add a small random delay to avoid synchronized requests
        time.sleep(random.uniform(0.2, 0.8))
        
        result = func(*args, **kwargs)
        
        if result is None or (hasattr(result, 'empty') and result.empty):
            logger.warning(f"{operation_name} returned empty data for {ticker_symbol}")
            return None
            
        logger.info(f"{operation_name} successful for {ticker_symbol}")
        
        # Cache successful results
        set_cache(cache_key, result)
        
        return result
        
    except Exception as e:
        error_msg = str(e).lower()
        
        if "429" in error_msg or "too many requests" in error_msg:
            logger.error(f"Rate limited during {operation_name} for {ticker_symbol}: {e}")
            # Wait longer for rate limit errors
            wait_time = random.uniform(3, 8)
            logger.info(f"Waiting {wait_time:.2f} seconds due to rate limit...")
            time.sleep(wait_time)
            raise e  # Re-raise to let retry decorator handle it
        elif "404" in error_msg or "not found" in error_msg:
            logger.warning(f"Data not found during {operation_name} for {ticker_symbol}: {e}")
        else:
            logger.error(f"Error during {operation_name} for {ticker_symbol}: {e}")
        
        return None

app = FastAPI(
    title="Stock Financial Data API",
    description="Comprehensive stock financial data using yfinance",
    version="1.0.0"
)

# CORS middleware for Chrome extension
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development - restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class FinancialDataResponse(BaseModel):
    symbol: str
    company_name: Optional[str] = None
    currency: Optional[str] = None
    exchange: Optional[str] = None
    
    # Overview metrics
    market_cap: Optional[float] = None
    enterprise_value: Optional[float] = None
    shares_outstanding: Optional[float] = None
    float_shares: Optional[float] = None
    
    # Performance metrics (TTM)
    total_revenue: Optional[float] = None
    revenue_growth: Optional[float] = None
    gross_profit: Optional[float] = None
    operating_income: Optional[float] = None
    ebitda: Optional[float] = None
    net_income: Optional[float] = None
    eps_ttm: Optional[float] = None
    eps_forward: Optional[float] = None
    
    # Balance sheet
    total_cash: Optional[float] = None
    total_debt: Optional[float] = None
    net_debt: Optional[float] = None
    total_assets: Optional[float] = None
    total_equity: Optional[float] = None
    book_value: Optional[float] = None
    
    # Cash flow
    operating_cash_flow: Optional[float] = None
    free_cash_flow: Optional[float] = None
    capital_expenditures: Optional[float] = None
    
    # Valuation ratios
    pe_ratio: Optional[float] = None
    forward_pe: Optional[float] = None
    pb_ratio: Optional[float] = None
    ps_ratio: Optional[float] = None
    peg_ratio: Optional[float] = None
    ev_revenue: Optional[float] = None
    ev_ebitda: Optional[float] = None
    
    # Profitability ratios
    roe: Optional[float] = None
    roa: Optional[float] = None
    roic: Optional[float] = None
    gross_margin: Optional[float] = None
    operating_margin: Optional[float] = None
    net_margin: Optional[float] = None
    
    # Other metrics
    beta: Optional[float] = None
    dividend_yield: Optional[float] = None
    payout_ratio: Optional[float] = None
    
    # Price metrics
    current_price: Optional[float] = None
    fifty_two_week_high: Optional[float] = None
    fifty_two_week_low: Optional[float] = None
    ytd_return: Optional[float] = None
    
    # Quarterly data (last 4-8 quarters with trends)
    quarterly_revenue: Optional[List[Dict[str, Any]]] = None
    quarterly_earnings: Optional[List[Dict[str, Any]]] = None
    quarterly_cash_flow: Optional[List[Dict[str, Any]]] = None
    quarterly_balance_sheet: Optional[List[Dict[str, Any]]] = None
    
    # Analyst estimates and targets
    analyst_price_target: Optional[float] = None
    analyst_rating: Optional[str] = None
    earnings_estimate_current_year: Optional[float] = None
    earnings_estimate_next_year: Optional[float] = None
    revenue_estimate_current_year: Optional[float] = None
    revenue_estimate_next_year: Optional[float] = None
    earnings_growth_estimate: Optional[float] = None
    revenue_growth_estimate: Optional[float] = None
    
    # Additional data sources used
    data_sources_used: Optional[List[str]] = None
    
    # API status
    data_source: str = "yfinance"
    last_updated: str
    api_status: Dict[str, str] = {}

def safe_get(data, key, date=None, default=None):
    """Safely get value from dict, object, or DataFrame, handling various data types"""
    try:
        if data is None:
            return default
            
        # Handle DataFrame case (new functionality)
        if hasattr(data, 'loc') and date is not None:
            try:
                # More explicit checks
                if hasattr(data, 'index') and hasattr(data, 'columns'):
                    if key in data.index and date in data.columns:
                        value = data.loc[key, date]
                        # Handle pandas NaN and inf values immediately
                        if pd.isna(value) or (isinstance(value, (int, float)) and not np.isfinite(value)):
                            return default
                        return value
                return default
            except (KeyError, ValueError, IndexError) as e:
                logger.debug(f"DataFrame access failed for {key}, {date}: {e}")
                return default
        # Handle dict case
        elif isinstance(data, dict):
            value = data.get(key, default)
        # Handle object case
        else:
            value = getattr(data, key, default)
            
        # Handle pandas NaN and inf values for non-DataFrame cases
        if pd.isna(value) or (isinstance(value, float) and not np.isfinite(value)):
            return default
        
        return value
    except (AttributeError, KeyError, TypeError, ValueError) as e:
        logger.debug(f"safe_get failed for {key}: {e}")
        return default

def calculate_ratio(numerator, denominator):
    """Calculate ratio safely"""
    try:
        if numerator is None or denominator is None or denominator == 0:
            return None
        return float(numerator) / float(denominator)
    except (TypeError, ZeroDivisionError, ValueError):
        return None

def process_quarterly_data(df, data_type="revenue"):
    """Process quarterly financial data into list format with enhanced metrics"""
    if df is None or df.empty:
        return None
    
    try:
        quarters = []
        # Get last 4 quarters (or up to 8 for better trend analysis)
        max_quarters = min(8, len(df))
        
        # Log available structure for debugging
        if hasattr(df, 'index') and hasattr(df, 'columns'):
            logger.info(f"Available QUARTERS in {data_type}: {list(df.columns)[:5]}")
            logger.info(f"Available METRICS in {data_type}: {list(df.index)[:10]}")
        
        for i, date in enumerate(df.columns[:max_quarters]):
            # Format period as YYYY-QX
            if hasattr(date, 'strftime'):
                period = date.strftime("%Y-%m-%d")  # Use simple date format
            else:
                period = str(date)[:10] if len(str(date)) > 10 else str(date)
            
            if data_type == "revenue":
                # Use DIRECT DataFrame access since safe_get is failing
                def get_value(field_name):
                    try:
                        if field_name in df.index and date in df.columns:
                            value = df.loc[field_name, date]
                            if pd.isna(value) or (isinstance(value, (int, float)) and not np.isfinite(value)):
                                return None
                            return float(value) if isinstance(value, (int, float)) else value
                    except Exception:
                        pass
                    return None
                
                quarter_data = {
                    "period": period,
                    "revenue": (get_value('Total Revenue') or 
                              get_value('Operating Revenue')),
                    "gross_profit": get_value('Gross Profit'),
                    "operating_income": (get_value('Operating Income') or
                                       get_value('EBIT')),
                    "net_income": (get_value('Net Income') or
                                 get_value('Net Income From Continuing Operation Net Minority Interest') or
                                 get_value('Net Income From Continuing And Discontinued Operation') or
                                 get_value('Normalized Income')),
                    "ebitda": (get_value('EBITDA') or
                             get_value('Normalized EBITDA')),
                    "total_expenses": get_value('Total Expenses'),
                    "research_development": get_value('Research And Development'),
                    "selling_general_admin": get_value('Selling General And Administration')
                }
            elif data_type == "cash_flow":
                # Use correct data access pattern: df.loc[metric, quarter]
                quarter_data = {
                    "period": period,
                    "operating_cash_flow": (safe_get(df, 'Operating Cash Flow', date) or
                                          safe_get(df, 'Cash Flow From Continuing Operating Activities', date)),
                    "free_cash_flow": (safe_get(df, 'Free Cash Flow', date) or
                                     safe_get(df, 'Free Cash Flow From Operations', date)),
                    "capital_expenditures": (safe_get(df, 'Capital Expenditures', date) or
                                           safe_get(df, 'Capital Expenditure', date)),
                    "cash_dividends_paid": safe_get(df, 'Cash Dividends Paid', date),
                    "repurchase_of_capital_stock": safe_get(df, 'Repurchase Of Capital Stock', date)
                }
            elif data_type == "balance_sheet":
                # Use correct data access pattern: df.loc[metric, quarter]
                quarter_data = {
                    "period": period,
                    "total_assets": safe_get(df, 'Total Assets', date),
                    "total_debt": (safe_get(df, 'Total Debt', date) or
                                 safe_get(df, 'Net Debt', date)),
                    "total_cash": (safe_get(df, 'Cash And Cash Equivalents', date) or
                                 safe_get(df, 'Cash', date)),
                    "stockholder_equity": (safe_get(df, 'Stockholders Equity', date) or
                                         safe_get(df, 'Total Stockholder Equity', date) or
                                         safe_get(df, 'Ordinary Shares Number', date)),
                    "working_capital": safe_get(df, 'Working Capital', date)
                }
            else:
                quarter_column = df[date]
                quarter_data = {
                    "period": period,
                    "value": quarter_column.iloc[0] if len(quarter_column) > 0 else None
                }
            
            quarters.append(quarter_data)
        
        return quarters
    except Exception as e:
        logger.error(f"Error processing quarterly data: {e}")
        return None

def calculate_quarterly_trends(quarters):
    """Calculate quarter-over-quarter and year-over-year growth rates"""
    if not quarters or len(quarters) < 2:
        return quarters
        
    try:
        # Add growth calculations to each quarter
        for i, quarter in enumerate(quarters):
            if i > 0:  # QoQ growth
                prev_quarter = quarters[i-1]
                quarter['growth_qoq'] = {}
                
                for key, value in quarter.items():
                    if key not in ['period', 'growth_qoq', 'growth_yoy'] and isinstance(value, (int, float)) and value is not None:
                        prev_value = prev_quarter.get(key)
                        if prev_value and isinstance(prev_value, (int, float)) and prev_value != 0:
                            growth = ((value - prev_value) / abs(prev_value)) * 100
                            quarter['growth_qoq'][key] = round(growth, 2)
            
            if i >= 4:  # YoY growth (4 quarters back)
                year_ago_quarter = quarters[i-4] if i-4 < len(quarters) else None
                if year_ago_quarter:
                    quarter['growth_yoy'] = {}
                    
                    for key, value in quarter.items():
                        if key not in ['period', 'growth_qoq', 'growth_yoy'] and isinstance(value, (int, float)) and value is not None:
                            year_ago_value = year_ago_quarter.get(key)
                            if year_ago_value and isinstance(year_ago_value, (int, float)) and year_ago_value != 0:
                                growth = ((value - year_ago_value) / abs(year_ago_value)) * 100
                                quarter['growth_yoy'][key] = round(growth, 2)
        
        return quarters
    except Exception as e:
        logger.error(f"Error calculating quarterly trends: {e}")
        return quarters

def has_data(data):
    """Helper function to check if data is available (handles both dict and DataFrame)"""
    if data is None:
        return False
    if isinstance(data, dict):
        return len(data) > 0
    if hasattr(data, 'empty'):
        return not data.empty
    return False

@app.get("/")
async def root():
    return {
        "service": "Stock Financial Data API",
        "version": "1.0.0",
        "documentation": "/docs",
        "health": "/health"
    }

@app.get("/health")
async def health():
    """Health check endpoint with cache and rate limiting status"""
    current_time = time.time()
    
    # Calculate time since last request
    time_since_last_request = None
    if 'last_call' in LAST_REQUEST_TIME:
        time_since_last_request = current_time - LAST_REQUEST_TIME['last_call']
    
    # Cache statistics
    cache_stats = {
        "cache_size": len(CACHE),
        "cache_max_size": CACHE_MAX_SIZE,
        "cache_ttl_seconds": CACHE_TTL
    }
    
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "rate_limiting": {
            "min_request_interval_seconds": MIN_REQUEST_INTERVAL,
            "time_since_last_request": time_since_last_request,
            "max_retries": MAX_RETRIES,
            "base_delay_seconds": BASE_DELAY
        },
        "cache": cache_stats,
        "version": "1.0.0",
        "features": [
            "rate_limiting",
            "caching", 
            "retry_with_backoff",
            "yfinance_integration"
        ]
    }

@app.get("/financial/{symbol}", response_model=FinancialDataResponse)
@rate_limit_decorator
async def get_financial_data(
    symbol: str,
    include_quarterly: bool = Query(True, description="Include quarterly financial data")
):
    """
    Get comprehensive financial data for a stock symbol
    
    Based on yfinance package capabilities:
    - Company info and key statistics
    - Income statement data (revenue, earnings, etc.)  
    - Balance sheet data (cash, debt, assets, etc.)
    - Cash flow data (operating CF, free CF, etc.)
    - Valuation ratios (P/E, P/B, EV/Revenue, etc.)
    - Quarterly financial data (last 4 quarters)
    """
    try:
        logger.info(f"Fetching financial data for {symbol}")
        
        # Create yfinance Ticker object
        ticker = yf.Ticker(symbol)
        
        # Get basic info with rate limiting and retry logic
        logger.info(f"Getting basic info for {symbol}")
        info = safe_yfinance_call(symbol, "basic_info", lambda: ticker.info)
        logger.info(f"Info object keys count: {len(info.keys()) if info else 0}")
        if info:
            logger.info(f"Info sample data: totalCash={safe_get(info, 'totalCash')}, trailingEps={safe_get(info, 'trailingEps')}, trailingPE={safe_get(info, 'trailingPE')}")
        
        if not info or len(info) < 5:  # Basic validation
            raise HTTPException(status_code=404, detail=f"No data found for symbol {symbol}")
        
        # Use more info fields directly since financial statements may be incomplete
        logger.info(f"Processing {symbol} with {len(info.keys())} info fields available")
        
        # Get comprehensive financial data using all available yfinance methods
        logger.info(f"Getting comprehensive financial data for {symbol} using enhanced yfinance methods")
        
        # Traditional financial statements
        income_stmt = safe_yfinance_call(symbol, "income_statement", lambda: ticker.income_stmt)
        balance_sheet = safe_yfinance_call(symbol, "balance_sheet", lambda: ticker.balance_sheet)
        cash_flow = safe_yfinance_call(symbol, "cash_flow", lambda: ticker.cashflow)
        
        # TTM (Trailing Twelve Months) data - often more current
        ttm_income = safe_yfinance_call(symbol, "ttm_income_stmt", lambda: ticker.ttm_income_stmt)
        ttm_cashflow = safe_yfinance_call(symbol, "ttm_cashflow", lambda: ticker.ttm_cashflow)
        
        # Earnings data - using earnings_history instead of deprecated earnings
        earnings_history = safe_yfinance_call(symbol, "earnings_history", lambda: ticker.earnings_history)
        
        # Analyst estimates and targets
        earnings_estimate = safe_yfinance_call(symbol, "earnings_estimate", lambda: ticker.earnings_estimate)
        revenue_estimate = safe_yfinance_call(symbol, "revenue_estimate", lambda: ticker.revenue_estimate)
        analyst_price_targets = safe_yfinance_call(symbol, "analyst_price_targets", lambda: ticker.analyst_price_targets)
        growth_estimates = safe_yfinance_call(symbol, "growth_estimates", lambda: ticker.growth_estimates)
        
        # Quarterly data if requested
        quarterly_income = None
        quarterly_cash_flow = None
        if include_quarterly:
            quarterly_income = safe_yfinance_call(symbol, "quarterly_income", lambda: ticker.quarterly_income_stmt)
            quarterly_cash_flow = safe_yfinance_call(symbol, "quarterly_cash_flow", lambda: ticker.quarterly_cashflow)
        
        # Extract data safely
        current_price = safe_get(info, 'currentPrice') or safe_get(info, 'regularMarketPrice')
        market_cap = safe_get(info, 'marketCap')
        shares_outstanding = safe_get(info, 'sharesOutstanding') or safe_get(info, 'impliedSharesOutstanding')
        
        # Get latest financial data (most recent year/quarter)
        latest_revenue = None
        latest_net_income = None
        latest_cash_flow = None
        latest_total_assets = None
        latest_total_debt = None
        latest_total_cash = None
        
        # Extract financial data with priority: TTM > Annual Statements > Info fields
        latest_revenue = None
        latest_net_income = None
        latest_cash_flow = None
        
        # 1. Try TTM data first (most current)
        if ttm_income is not None and not ttm_income.empty:
            try:
                ttm_data = ttm_income.iloc[:, 0] if len(ttm_income.columns) > 0 else ttm_income
                latest_revenue = safe_get(ttm_data, 'Total Revenue')
                latest_net_income = safe_get(ttm_data, 'Net Income')
                logger.info(f"Extracted from TTM: revenue={latest_revenue}, net_income={latest_net_income}")
            except Exception as e:
                logger.warning(f"Error extracting TTM data for {symbol}: {e}")
        
        # 2. Fallback to annual income statement
        if (latest_revenue is None or latest_net_income is None) and income_stmt is not None and not income_stmt.empty and len(income_stmt.columns) > 0:
            try:
                latest_col = income_stmt.iloc[:, 0]  # Most recent year
                if latest_revenue is None:
                    latest_revenue = safe_get(latest_col, 'Total Revenue')
                if latest_net_income is None:
                    latest_net_income = safe_get(latest_col, 'Net Income')
                logger.info(f"Extracted from annual: revenue={latest_revenue}, net_income={latest_net_income}")
            except Exception as e:
                logger.warning(f"Error extracting from income statement for {symbol}: {e}")
        
        # 3. Try earnings estimates for revenue
        if latest_revenue is None and revenue_estimate is not None and not revenue_estimate.empty:
            try:
                # Revenue estimate usually has current year estimates
                latest_revenue = safe_get(revenue_estimate.iloc[0] if len(revenue_estimate) > 0 else {}, 'avg')
                logger.info(f"Using revenue estimate: {latest_revenue}")
            except Exception as e:
                logger.warning(f"Error extracting revenue estimate for {symbol}: {e}")
        
        # 4. Try earnings history for net income
        if latest_net_income is None and earnings_history is not None and not earnings_history.empty:
            try:
                # Get most recent actual earnings
                latest_earnings = earnings_history.iloc[-1] if len(earnings_history) > 0 else {}
                latest_net_income = safe_get(latest_earnings, 'actual') or safe_get(latest_earnings, 'estimate')
                logger.info(f"Using earnings history: {latest_net_income}")
            except Exception as e:
                logger.warning(f"Error extracting earnings history for {symbol}: {e}")
        
        # 5. Final fallback to info fields
        if latest_revenue is None:
            latest_revenue = safe_get(info, 'totalRevenue')
        if latest_net_income is None:
            latest_net_income = safe_get(info, 'netIncomeToCommon')
            
        # Extract cash flow data
        if ttm_cashflow is not None and not ttm_cashflow.empty:
            try:
                ttm_cf_data = ttm_cashflow.iloc[:, 0] if len(ttm_cashflow.columns) > 0 else ttm_cashflow
                latest_cash_flow = safe_get(ttm_cf_data, 'Operating Cash Flow')
                logger.info(f"Extracted TTM cash flow: {latest_cash_flow}")
            except Exception as e:
                logger.warning(f"Error extracting TTM cash flow for {symbol}: {e}")
                
        if latest_cash_flow is None and cash_flow is not None and not cash_flow.empty:
            latest_cash_flow = safe_get(cash_flow.iloc[:, 0] if len(cash_flow.columns) > 0 else {}, 'Operating Cash Flow')
        
        if balance_sheet is not None and not balance_sheet.empty:
            latest_balance = balance_sheet.iloc[:, 0] if len(balance_sheet.columns) > 0 else {}
            latest_total_assets = safe_get(latest_balance, 'Total Assets')
            latest_total_debt = safe_get(latest_balance, 'Total Debt')
            latest_total_cash = safe_get(latest_balance, 'Cash And Cash Equivalents')
        
        if cash_flow is not None and not cash_flow.empty:
            latest_cash_flow = safe_get(cash_flow.iloc[:, 0] if len(cash_flow.columns) > 0 else {}, 'Operating Cash Flow')
        
        # Calculate derived metrics
        net_debt = calculate_ratio(latest_total_debt, 1) - calculate_ratio(latest_total_cash, 1) if latest_total_debt and latest_total_cash else None
        ev_revenue = calculate_ratio(safe_get(info, 'enterpriseValue'), latest_revenue)
        ev_ebitda = calculate_ratio(safe_get(info, 'enterpriseValue'), safe_get(info, 'ebitda'))
        
        # Calculate ROE and ROA with safe multiplication
        roe_ratio = calculate_ratio(latest_net_income, safe_get(info, 'totalStockholderEquity'))
        roe = roe_ratio * 100 if roe_ratio is not None else None
        
        roa_ratio = calculate_ratio(latest_net_income, latest_total_assets)
        roa = roa_ratio * 100 if roa_ratio is not None else None
        
        # Extract analyst estimates and targets
        analyst_target_price = None
        analyst_rating = None
        earnings_est_current = None
        earnings_est_next = None
        revenue_est_current = None
        revenue_est_next = None
        earnings_growth_est = None
        revenue_growth_est = None
        
        # Using global has_data function
        
        # Analyst price targets
        if has_data(analyst_price_targets):
            try:
                if isinstance(analyst_price_targets, dict):
                    target_data = analyst_price_targets
                else:
                    target_data = analyst_price_targets.iloc[0] if len(analyst_price_targets) > 0 else {}
                analyst_target_price = safe_get(target_data, 'mean') or safe_get(target_data, 'current')
                analyst_rating = safe_get(target_data, 'recommendationKey')
                logger.info(f"Analyst target: {analyst_target_price}, rating: {analyst_rating}")
            except Exception as e:
                logger.warning(f"Error extracting analyst targets for {symbol}: {e}")
        
        # Earnings estimates
        if has_data(earnings_estimate):
            try:
                if isinstance(earnings_estimate, dict):
                    current_year = earnings_estimate.get('Current Year', {})
                    next_year = earnings_estimate.get('Next Year', {})
                else:
                    current_year = earnings_estimate.loc['Current Year'] if 'Current Year' in earnings_estimate.index else {}
                    next_year = earnings_estimate.loc['Next Year'] if 'Next Year' in earnings_estimate.index else {}
                earnings_est_current = safe_get(current_year, 'avg')
                earnings_est_next = safe_get(next_year, 'avg')
                logger.info(f"Earnings estimates - current: {earnings_est_current}, next: {earnings_est_next}")
            except Exception as e:
                logger.warning(f"Error extracting earnings estimates for {symbol}: {e}")
        
        # Revenue estimates
        if has_data(revenue_estimate):
            try:
                if isinstance(revenue_estimate, dict):
                    current_year = revenue_estimate.get('Current Year', {})
                    next_year = revenue_estimate.get('Next Year', {})
                else:
                    current_year = revenue_estimate.loc['Current Year'] if 'Current Year' in revenue_estimate.index else {}
                    next_year = revenue_estimate.loc['Next Year'] if 'Next Year' in revenue_estimate.index else {}
                revenue_est_current = safe_get(current_year, 'avg')
                revenue_est_next = safe_get(next_year, 'avg')
                logger.info(f"Revenue estimates - current: {revenue_est_current}, next: {revenue_est_next}")
            except Exception as e:
                logger.warning(f"Error extracting revenue estimates for {symbol}: {e}")
        
        # Growth estimates
        if has_data(growth_estimates):
            try:
                if isinstance(growth_estimates, dict):
                    next_year_growth = growth_estimates.get('Next Year', {})
                else:
                    next_year_growth = growth_estimates.loc['Next Year'] if 'Next Year' in growth_estimates.index else {}
                earnings_growth_est = safe_get(next_year_growth, 'earningsGrowth')
                revenue_growth_est = safe_get(next_year_growth, 'revenueGrowth')
                logger.info(f"Growth estimates - earnings: {earnings_growth_est}, revenue: {revenue_growth_est}")
            except Exception as e:
                logger.warning(f"Error extracting growth estimates for {symbol}: {e}")
        
        # Track data sources used
        data_sources_used = ['info']
        if has_data(ttm_income):
            data_sources_used.append('ttm_income_stmt')
        if has_data(ttm_cashflow):
            data_sources_used.append('ttm_cashflow')
        if has_data(income_stmt):
            data_sources_used.append('income_stmt')
        if has_data(earnings_history):
            data_sources_used.append('earnings_history')
        if has_data(analyst_price_targets):
            data_sources_used.append('analyst_price_targets')
        if has_data(earnings_estimate):
            data_sources_used.append('earnings_estimate')
        if has_data(revenue_estimate):
            data_sources_used.append('revenue_estimate')
        if has_data(growth_estimates):
            data_sources_used.append('growth_estimates')
        
        # Process quarterly data with enhanced metrics and trends
        quarterly_revenue_data = None
        quarterly_cash_flow_data = None
        quarterly_balance_sheet_data = None
        
        if include_quarterly:
            # Get quarterly data using correct yfinance methods
            quarterly_income = safe_yfinance_call(symbol, "quarterly_financials", lambda: ticker.quarterly_financials)
            quarterly_cash_flow = safe_yfinance_call(symbol, "quarterly_cashflow", lambda: ticker.quarterly_cashflow)
            quarterly_balance_sheet = safe_yfinance_call(symbol, "quarterly_balance_sheet", lambda: ticker.quarterly_balance_sheet)
            
            if has_data(quarterly_income):
                quarterly_revenue_data = process_quarterly_data(quarterly_income, "revenue")
                quarterly_revenue_data = calculate_quarterly_trends(quarterly_revenue_data)
                data_sources_used.append('quarterly_financials')
            if has_data(quarterly_cash_flow):
                quarterly_cash_flow_data = process_quarterly_data(quarterly_cash_flow, "cash_flow")
                quarterly_cash_flow_data = calculate_quarterly_trends(quarterly_cash_flow_data)
                data_sources_used.append('quarterly_cashflow')
            if has_data(quarterly_balance_sheet):
                quarterly_balance_sheet_data = process_quarterly_data(quarterly_balance_sheet, "balance_sheet")
                quarterly_balance_sheet_data = calculate_quarterly_trends(quarterly_balance_sheet_data)
                data_sources_used.append('quarterly_balance_sheet')
        
        # Build response
        response = FinancialDataResponse(
            symbol=symbol.upper(),
            company_name=safe_get(info, 'longName') or safe_get(info, 'shortName'),
            currency=safe_get(info, 'currency'),
            exchange=safe_get(info, 'exchange'),
            
            # Overview
            market_cap=market_cap,
            enterprise_value=safe_get(info, 'enterpriseValue'),
            shares_outstanding=shares_outstanding,
            float_shares=safe_get(info, 'floatShares'),
            
            # Performance - use info fallback if financial statements don't have data
            total_revenue=latest_revenue or safe_get(info, 'totalRevenue'),
            revenue_growth=safe_get(info, 'revenueGrowth'),
            ebitda=safe_get(info, 'ebitda'),
            net_income=latest_net_income or safe_get(info, 'netIncomeToCommon'),
            eps_ttm=safe_get(info, 'trailingEps'),
            eps_forward=safe_get(info, 'forwardEps'),
            
            # Balance sheet - use info fallback if financial statements don't have data
            total_cash=latest_total_cash or safe_get(info, 'totalCash'),
            total_debt=latest_total_debt or safe_get(info, 'totalDebt'),
            net_debt=net_debt,
            total_assets=latest_total_assets,
            book_value=safe_get(info, 'bookValue'),
            
            # Cash flow - use info fallback if financial statements don't have data
            operating_cash_flow=latest_cash_flow or safe_get(info, 'operatingCashFlow'),
            free_cash_flow=safe_get(info, 'freeCashflow'),
            
            # Ratios
            pe_ratio=safe_get(info, 'trailingPE') or safe_get(info, 'forwardPE'),
            forward_pe=safe_get(info, 'forwardPE'), 
            pb_ratio=safe_get(info, 'priceToBook'),
            ps_ratio=safe_get(info, 'priceToSalesTrailing12Months'),
            peg_ratio=safe_get(info, 'pegRatio'),
            ev_revenue=ev_revenue,
            ev_ebitda=ev_ebitda,
            
            # Profitability
            roe=roe,
            roa=roa,
            gross_margin=safe_get(info, 'grossMargins') * 100 if safe_get(info, 'grossMargins') is not None else None,
            operating_margin=safe_get(info, 'operatingMargins') * 100 if safe_get(info, 'operatingMargins') is not None else None,
            net_margin=safe_get(info, 'profitMargins') * 100 if safe_get(info, 'profitMargins') is not None else None,
            
            # Other
            beta=safe_get(info, 'beta'),
            dividend_yield=safe_get(info, 'dividendYield') * 100 if safe_get(info, 'dividendYield') is not None else None,
            payout_ratio=safe_get(info, 'payoutRatio') * 100 if safe_get(info, 'payoutRatio') is not None else None,
            
            # Price
            current_price=current_price or safe_get(info, 'regularMarketPrice') or safe_get(info, 'previousClose'),
            fifty_two_week_high=safe_get(info, 'fiftyTwoWeekHigh'),
            fifty_two_week_low=safe_get(info, 'fiftyTwoWeekLow'),
            
            # Quarterly
            quarterly_revenue=quarterly_revenue_data,
            quarterly_cash_flow=quarterly_cash_flow_data,
            quarterly_balance_sheet=quarterly_balance_sheet_data,
            
            # Analyst estimates and targets
            analyst_price_target=analyst_target_price,
            analyst_rating=analyst_rating,
            earnings_estimate_current_year=earnings_est_current,
            earnings_estimate_next_year=earnings_est_next,
            revenue_estimate_current_year=revenue_est_current,
            revenue_estimate_next_year=revenue_est_next,
            earnings_growth_estimate=earnings_growth_est * 100 if earnings_growth_est is not None else None,
            revenue_growth_estimate=revenue_growth_est * 100 if revenue_growth_est is not None else None,
            
            # Data sources tracking
            data_sources_used=data_sources_used,
            
            last_updated=datetime.now().isoformat(),
            api_status={
                "yfinance": "success",
                "financial_statements": "enhanced" if len([s for s in data_sources_used if 'ttm' in s or 'estimate' in s]) > 0 else "limited",
                "quarterly_data": "success" if quarterly_revenue_data else "limited",
                "analyst_data": "success" if analyst_target_price or earnings_est_current else "unavailable"
            }
        )
        
        logger.info(f"Successfully processed financial data for {symbol}")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching financial data for {symbol}: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        
        # Check if it's a rate limit error
        if "429" in str(e) or "Too Many Requests" in str(e):
            raise HTTPException(
                status_code=429, 
                detail=f"Rate limited by Yahoo Finance. Please try again in a few seconds. Error: {str(e)}"
            )
        elif "404" in str(e) or "not found" in str(e).lower():
            raise HTTPException(
                status_code=404,
                detail=f"Stock symbol '{symbol}' not found or data unavailable"
            )
        else:
            raise HTTPException(
                status_code=500, 
                detail=f"Internal server error while fetching data for {symbol}: {str(e)}"
            )

@app.get("/quarterly-trends/{symbol}")
@rate_limit_decorator
async def get_quarterly_trends(
    symbol: str,
    quarters: int = Query(8, ge=4, le=12, description="Number of quarters to analyze (4-12)")
):
    """
    Get detailed quarterly financial trends and growth analysis
    
    Shows quarter-over-quarter and year-over-year growth rates for:
    - Revenue, profit margins, and expenses
    - Cash flow metrics
    - Balance sheet changes
    - Key ratios evolution
    """
    try:
        ticker = yf.Ticker(symbol)
        
        # Fetch quarterly data using correct yfinance methods
        quarterly_income = safe_yfinance_call(symbol, "quarterly_financials", lambda: ticker.quarterly_financials)
        quarterly_cash_flow = safe_yfinance_call(symbol, "quarterly_cashflow", lambda: ticker.quarterly_cashflow)  
        quarterly_balance_sheet = safe_yfinance_call(symbol, "quarterly_balance_sheet", lambda: ticker.quarterly_balance_sheet)
        
        if not any([has_data(quarterly_income), has_data(quarterly_cash_flow), has_data(quarterly_balance_sheet)]):
            raise HTTPException(status_code=404, detail=f"No quarterly data found for symbol {symbol}")
        
        # Process and calculate trends
        trends_data = {}
        
        if has_data(quarterly_income):
            revenue_data = process_quarterly_data(quarterly_income, "revenue")
            trends_data["revenue_trends"] = calculate_quarterly_trends(revenue_data)
        
        if has_data(quarterly_cash_flow):
            cash_flow_data = process_quarterly_data(quarterly_cash_flow, "cash_flow") 
            trends_data["cash_flow_trends"] = calculate_quarterly_trends(cash_flow_data)
            
        if has_data(quarterly_balance_sheet):
            balance_sheet_data = process_quarterly_data(quarterly_balance_sheet, "balance_sheet")
            trends_data["balance_sheet_trends"] = calculate_quarterly_trends(balance_sheet_data)
        
        # Calculate key insights
        insights = generate_quarterly_insights(trends_data)
        
        return {
            "symbol": symbol.upper(),
            "quarters_analyzed": min(quarters, 8),
            "trends": trends_data,
            "insights": insights,
            "last_updated": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching quarterly trends for {symbol}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error analyzing quarterly trends for {symbol}: {str(e)}"
        )

def generate_quarterly_insights(trends_data):
    """Generate key insights from quarterly trends data"""
    insights = {
        "revenue_growth": {"trend": "stable", "latest_qoq": None, "latest_yoy": None},
        "profitability": {"trend": "stable", "margin_direction": "stable"},
        "cash_generation": {"trend": "stable", "fcf_trend": "stable"},
        "balance_sheet": {"trend": "stable", "debt_trend": "stable"}
    }
    
    try:
        # Analyze revenue trends
        if "revenue_trends" in trends_data and trends_data["revenue_trends"]:
            latest = trends_data["revenue_trends"][0]  # Most recent quarter
            
            if "growth_qoq" in latest and "revenue" in latest["growth_qoq"]:
                insights["revenue_growth"]["latest_qoq"] = latest["growth_qoq"]["revenue"]
                
            if "growth_yoy" in latest and "revenue" in latest["growth_yoy"]:
                insights["revenue_growth"]["latest_yoy"] = latest["growth_yoy"]["revenue"]
                
            # Determine trend direction
            qoq_growth = insights["revenue_growth"]["latest_qoq"]
            if qoq_growth:
                if qoq_growth > 5:
                    insights["revenue_growth"]["trend"] = "accelerating"
                elif qoq_growth < -5:
                    insights["revenue_growth"]["trend"] = "declining"
        
        # Analyze cash flow trends
        if "cash_flow_trends" in trends_data and trends_data["cash_flow_trends"]:
            latest = trends_data["cash_flow_trends"][0]
            
            if "growth_qoq" in latest and "free_cash_flow" in latest["growth_qoq"]:
                fcf_growth = latest["growth_qoq"]["free_cash_flow"]
                if fcf_growth:
                    if fcf_growth > 10:
                        insights["cash_generation"]["fcf_trend"] = "improving"
                    elif fcf_growth < -10:
                        insights["cash_generation"]["fcf_trend"] = "declining"
        
    except Exception as e:
        logger.error(f"Error generating insights: {e}")
    
    return insights

# ===== AGENTIC AI ENDPOINTS =====

class AgenticAnalysisRequest(BaseModel):
    ticker: str
    analysis_type: str = "comprehensive"  # comprehensive, quick, specific
    focus_areas: Optional[List[str]] = None  # specific areas to focus on
    gemini_api_key: str

@app.post("/agentic-analysis")
async def perform_agentic_analysis(request: AgenticAnalysisRequest):
    """
    Agentic AI Financial Analysis with Function Calling
    AI dynamically decides what tools to use for comprehensive analysis
    """
    try:
        logger.info(f"Starting agentic analysis for {request.ticker}")
        
        # Initialize the financial analysis tools
        tools = FinancialAnalysisTools()
        
        # Define available tools for the AI
        tool_schemas = [
            {
                "name": "fetch_quarterly_data",
                "description": "Fetch quarterly financial data for specific periods and metrics",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "ticker": {"type": "string"},
                        "quarters": {"type": "integer", "minimum": 1, "maximum": 12},
                        "metrics": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "Specific metrics to fetch (revenue, net_income, free_cash_flow, etc.)"
                        }
                    },
                    "required": ["ticker"]
                }
            },
            {
                "name": "calculate_financial_ratios",
                "description": "Calculate specific financial ratios and compare to industry benchmarks",
                "parameters": {
                    "type": "object", 
                    "properties": {
                        "ticker": {"type": "string"},
                        "ratios": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "Ratios to calculate (P/E, ROE, Current_Ratio, Debt_to_Equity, etc.)"
                        },
                        "include_industry": {"type": "boolean"}
                    },
                    "required": ["ticker", "ratios"]
                }
            },
            {
                "name": "compare_with_peers",
                "description": "Compare company metrics against industry competitors",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "ticker": {"type": "string"},
                        "peers": {
                            "type": "array", 
                            "items": {"type": "string"},
                            "description": "Competitor ticker symbols"
                        },
                        "metrics": {
                            "type": "array",
                            "items": {"type": "string"}
                        }
                    },
                    "required": ["ticker", "peers", "metrics"]
                }
            },
            {
                "name": "get_analyst_consensus",
                "description": "Get analyst ratings, price targets, and recommendations",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "ticker": {"type": "string"},
                        "include_history": {"type": "boolean"}
                    },
                    "required": ["ticker"]
                }
            },
            {
                "name": "fetch_market_context",
                "description": "Get broader market conditions and sector performance",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "ticker": {"type": "string"},
                        "include_sector": {"type": "boolean"},
                        "timeframe": {"type": "string", "enum": ["1M", "3M", "6M", "1Y"]}
                    },
                    "required": ["ticker"]
                }
            },
            {
                "name": "detect_financial_anomalies", 
                "description": "Identify unusual patterns or red flags in financial data",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "ticker": {"type": "string"},
                        "lookback_periods": {"type": "integer", "minimum": 4, "maximum": 20},
                        "sensitivity": {"type": "string", "enum": ["low", "medium", "high"]}
                    },
                    "required": ["ticker"]
                }
            },
            {
                "name": "assess_financial_health",
                "description": "Calculate comprehensive financial health score and assessment",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "ticker": {"type": "string"},
                        "include_scores": {"type": "boolean"}
                    },
                    "required": ["ticker"]
                }
            }
        ]
        
        # Create initial analysis prompt for Gemini
        initial_prompt = f"""You are a DECISIVE financial analyst AI with access to specialized financial analysis tools. Your goal is to provide CLEAR, ACTIONABLE investment recommendations.

IMPORTANT: You have access to 7 financial analysis tools. You MUST call these tools to gather data before making any conclusions.

MANDATORY FIRST STEPS for {request.ticker}:
1. IMMEDIATELY call fetch_quarterly_data for {request.ticker} to get recent quarterly financial data
2. IMMEDIATELY call assess_financial_health for {request.ticker} to get overall financial health score

After getting initial data from these tools, you may call additional tools based on what you discover:
- calculate_financial_ratios: For detailed ratio analysis
- compare_with_peers: If you need competitive benchmarking  
- fetch_market_context: For market conditions and sector performance
- detect_financial_anomalies: If you spot concerning patterns
- get_analyst_consensus: For professional analyst opinions

FINAL ANALYSIS REQUIREMENTS:
- Be DECISIVE in your recommendation - avoid wishy-washy language
- Choose ONE clear recommendation: STRONG BUY, BUY, HOLD, SELL, or STRONG SELL
- Provide specific reasoning for your recommendation
- Consider: Growth prospects, financial health, valuation, competitive position
- End your analysis with: "RECOMMENDATION: [YOUR_CHOICE]" for clarity

DO NOT provide any analysis or recommendations until you have called tools and received actual data.

Your task: Analyze {request.ticker} stock thoroughly and provide a DECISIVE investment recommendation. START NOW by calling fetch_quarterly_data and assess_financial_health."""

        # Call Gemini with function calling capability
        analysis_result = await call_gemini_with_function_calling(
            initial_prompt, 
            tool_schemas, 
            tools,
            request.gemini_api_key,
            request.ticker
        )
        
        logger.info(f"Agentic analysis completed for {request.ticker}")
        
        return {
            "success": True,
            "ticker": request.ticker,
            "analysis_type": request.analysis_type,
            "result": analysis_result
        }
        
    except Exception as e:
        logger.error(f"Error in agentic analysis for {request.ticker}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Agentic analysis failed: {str(e)}")

async def call_gemini_with_retry(request_data: Dict, api_key: str, iteration: int, max_retries: int = 3):
    """
    Call Gemini API with exponential backoff retry logic for rate limits
    """
    # Respect rate limiting - ensure minimum interval between calls
    api_key_hash = api_key[:10]  # Use first 10 chars as identifier
    current_time = time.time()
    
    if api_key_hash in GEMINI_LAST_CALL:
        time_since_last = current_time - GEMINI_LAST_CALL[api_key_hash]
        if time_since_last < GEMINI_MIN_INTERVAL:
            sleep_time = GEMINI_MIN_INTERVAL - time_since_last
            logger.info(f"Rate limiting: waiting {sleep_time:.1f}s before Gemini API call")
            await asyncio.sleep(sleep_time)
    
    for attempt in range(max_retries):
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}",
                    json=request_data,
                    headers={"Content-Type": "application/json"}
                )
                
                if response.status_code == 429:
                    # Rate limited - implement exponential backoff
                    wait_time = (2 ** attempt) + random.uniform(1, 3)  # 2^attempt + 1-3 random seconds
                    logger.warning(f"Rate limited (429) on iteration {iteration}, attempt {attempt + 1}. Waiting {wait_time:.1f}s...")
                    await asyncio.sleep(wait_time)
                    continue
                
                if not response.is_success:
                    if attempt == max_retries - 1:  # Last attempt
                        raise HTTPException(status_code=response.status_code, detail=f"Gemini API error: {response.text}")
                    else:
                        logger.warning(f"Gemini API error {response.status_code} on attempt {attempt + 1}, retrying...")
                        await asyncio.sleep(1)
                        continue
                
                # Update last successful call time
                GEMINI_LAST_CALL[api_key_hash] = time.time()
                return response.json()
                
        except httpx.TimeoutException:
            if attempt == max_retries - 1:
                raise HTTPException(status_code=408, detail="Gemini API timeout")
            logger.warning(f"Timeout on attempt {attempt + 1}, retrying...")
            await asyncio.sleep(2)
        except Exception as e:
            if attempt == max_retries - 1:
                raise HTTPException(status_code=500, detail=f"Gemini API call failed: {str(e)}")
            logger.warning(f"Error on attempt {attempt + 1}: {str(e)}, retrying...")
            await asyncio.sleep(1)
    
    raise HTTPException(status_code=500, detail="Max retries exceeded for Gemini API")

async def call_gemini_with_function_calling(prompt: str, tool_schemas: List[Dict], tools: FinancialAnalysisTools, api_key: str, ticker: str):
    """
    Call Gemini with function calling capability
    AI can dynamically call tools based on its analysis needs
    """
    try:
        max_iterations = 5  # Prevent infinite loops
        iteration = 0
        conversation_history = []
        tool_results = {}
        
        # Initial conversation setup
        conversation_history.append({
            "role": "user",
            "parts": [{"text": prompt}]
        })
        
        while iteration < max_iterations:
            logger.info(f"Agentic AI iteration {iteration + 1} for {ticker}")
            
            # Prepare Gemini request with function calling
            request_data = {
                "contents": conversation_history,
                "tools": [{
                    "function_declarations": tool_schemas
                }],
                "generationConfig": {
                    "temperature": 0.1,  # Very low temperature for deterministic function calling
                    "topK": 1,
                    "topP": 0.1,
                    "maxOutputTokens": 2048
                }
            }
            
            logger.info(f"Sending request to Gemini for iteration {iteration + 1}")
            logger.info(f"Tools available: {[tool['name'] for tool in tool_schemas]}")
            logger.info(f"Conversation history length: {len(conversation_history)}")
            
            # Call Gemini API with retry logic for rate limits
            gemini_response = await call_gemini_with_retry(request_data, api_key, iteration + 1)
            
            if not gemini_response.get("candidates"):
                logger.warning(f"No candidates in Gemini response for {ticker}")
                break
                
            candidate = gemini_response["candidates"][0]
            logger.info(f"Gemini response candidate: {candidate}")
            
            # Check if AI wants to call a function
            content_parts = candidate.get("content", {}).get("parts", [])
            has_function_call = any("functionCall" in part for part in content_parts)
            
            if has_function_call:
                # Find all function calls in the response (there might be multiple)
                function_calls_in_response = []
                text_parts = []
                
                for part in content_parts:
                    if "functionCall" in part:
                        function_calls_in_response.append(part["functionCall"])
                    elif "text" in part:
                        text_parts.append(part["text"])
                
                logger.info(f"Found {len(function_calls_in_response)} function call(s) and {len(text_parts)} text part(s)")
                
                # Add any text responses to conversation first
                if text_parts:
                    conversation_history.append({
                        "role": "model",
                        "parts": [{"text": " ".join(text_parts)}]
                    })
                
                # Execute each function call
                for function_call in function_calls_in_response:
                    function_name = function_call["name"]
                    function_args = function_call.get("args", {})
                    
                    logger.info(f"AI calling function: {function_name} with args: {function_args}")
                    
                    # Execute the function call
                    if function_name in TOOL_REGISTRY:
                        try:
                            # Ensure ticker is in the arguments
                            if "ticker" not in function_args:
                                function_args["ticker"] = ticker
                                
                            tool_result = await TOOL_REGISTRY[function_name](**function_args)
                            tool_results[function_name] = tool_result
                            
                            logger.info(f"Tool {function_name} executed successfully: {tool_result.get('success', 'unknown')}")
                            
                            # Add function call and result to conversation
                            conversation_history.append({
                                "role": "model",
                                "parts": [{"functionCall": function_call}]
                            })
                            
                            conversation_history.append({
                                "role": "function",
                                "parts": [{
                                    "functionResponse": {
                                        "name": function_name,
                                        "response": tool_result
                                    }
                                }]
                            })
                            
                        except Exception as e:
                            logger.error(f"Error executing function {function_name}: {str(e)}")
                            # Add error to conversation
                            conversation_history.append({
                                "role": "function", 
                                "parts": [{
                                    "functionResponse": {
                                        "name": function_name,
                                        "response": {"success": False, "error": str(e)}
                                    }
                                }]
                            })
                    else:
                        logger.warning(f"Function {function_name} not found in TOOL_REGISTRY")
                
            else:
                # AI provided final analysis without function calls
                final_analysis = candidate["content"]["parts"][0].get("text", "")
                
                return {
                    "final_analysis": final_analysis,
                    "tool_calls_made": len(tool_results),
                    "tools_used": list(tool_results.keys()),
                    "tool_results": tool_results,
                    "iterations": iteration + 1
                }
            
            iteration += 1
            
            # Add small delay between iterations to respect rate limits
            if iteration < max_iterations:
                await asyncio.sleep(0.5)  # 500ms delay between iterations
        
        # If we've reached max iterations, return what we have
        return {
            "final_analysis": "Analysis completed with maximum iterations reached.",
            "tool_calls_made": len(tool_results),
            "tools_used": list(tool_results.keys()),
            "tool_results": tool_results,
            "iterations": iteration,
            "note": "Maximum iterations reached"
        }
        
    except Exception as e:
        logger.error(f"Error in Gemini function calling: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Function calling failed: {str(e)}")

@app.get("/agentic-tools")
async def get_available_tools():
    """Get list of available tools for agentic analysis"""
    tool_descriptions = {
        "fetch_quarterly_data": "Fetch quarterly financial statements and metrics",
        "calculate_financial_ratios": "Calculate and compare financial ratios", 
        "compare_with_peers": "Compare against industry competitors",
        "get_analyst_consensus": "Get analyst ratings and price targets",
        "fetch_market_context": "Get market conditions and sector performance",
        "detect_financial_anomalies": "Identify unusual financial patterns",
        "assess_financial_health": "Calculate comprehensive health score"
    }
    
    return {
        "available_tools": len(tool_descriptions),
        "tools": tool_descriptions,
        "description": "These tools can be dynamically called by the AI based on analysis needs",
        "tool_registry_keys": list(TOOL_REGISTRY.keys())
    }

@app.post("/test-function-calling")
async def test_function_calling(ticker: str, gemini_api_key: str):
    """
    Debug endpoint to test if function calling is working
    """
    try:
        logger.info(f"Testing function calling for {ticker}")
        
        # Simple test prompt that should trigger function calls
        test_prompt = f"""You have access to financial analysis tools. You MUST call the fetch_quarterly_data function for {ticker} right now. Do not provide any text response - just call the function."""
        
        # Minimal tool schema for testing
        test_tools = [{
            "name": "fetch_quarterly_data",
            "description": "Fetch quarterly financial data",
            "parameters": {
                "type": "object",
                "properties": {
                    "ticker": {"type": "string"},
                    "quarters": {"type": "integer", "default": 4}
                },
                "required": ["ticker"]
            }
        }]
        
        # Test Gemini call
        request_data = {
            "contents": [{
                "role": "user",
                "parts": [{"text": test_prompt}]
            }],
            "tools": [{
                "function_declarations": test_tools
            }],
            "generationConfig": {
                "temperature": 0.1,
                "maxOutputTokens": 1024
            }
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={gemini_api_key}",
                json=request_data,
                headers={"Content-Type": "application/json"}
            )
            
            if not response.is_success:
                return {"error": f"Gemini API error: {response.status_code} {response.text}"}
            
            gemini_response = response.json()
            logger.info(f"Gemini test response: {gemini_response}")
            
            # Check if function call was made
            candidates = gemini_response.get("candidates", [])
            if not candidates:
                return {"error": "No candidates in response", "response": gemini_response}
            
            candidate = candidates[0]
            content = candidate.get("content", {})
            parts = content.get("parts", [])
            
            function_calls = []
            text_responses = []
            
            for part in parts:
                if "functionCall" in part:
                    function_calls.append(part["functionCall"])
                if "text" in part:
                    text_responses.append(part["text"])
            
            return {
                "success": True,
                "ticker": ticker,
                "function_calls_detected": len(function_calls),
                "function_calls": function_calls,
                "text_responses": text_responses,
                "full_response": gemini_response
            }
            
    except Exception as e:
        logger.error(f"Function calling test failed: {str(e)}")
        return {"error": str(e)}

@app.post("/test-tools")
async def test_tools_directly(ticker: str):
    """
    Test individual tools directly to verify they work
    """
    try:
        logger.info(f"Testing tools directly for {ticker}")
        tools = FinancialAnalysisTools()
        
        results = {}
        
        # Test fetch_quarterly_data
        try:
            result = await tools.fetch_quarterly_data(ticker, quarters=4)
            results["fetch_quarterly_data"] = {
                "success": result.get("success", False),
                "quarters": result.get("quarters", 0),
                "has_data": len(result.get("data", [])) > 0
            }
        except Exception as e:
            results["fetch_quarterly_data"] = {"error": str(e)}
        
        # Test assess_financial_health
        try:
            result = await tools.assess_financial_health(ticker, include_scores=True)
            results["assess_financial_health"] = {
                "success": result.get("success", False),
                "overall_score": result.get("assessment", {}).get("overall_score", "N/A")
            }
        except Exception as e:
            results["assess_financial_health"] = {"error": str(e)}
        
        # Test compare_with_peers (key tool that was failing)
        try:
            result = await tools.compare_with_peers(
                ticker, 
                peers=["WMT", "BABA"], 
                metrics=["revenue", "net_income", "ROE", "Current_Ratio", "Debt_to_Equity"]
            )
            
            if result.get("success", False):
                comparison_data = result.get("comparison_data", {})
                # Count how many metrics have non-null values
                metrics_with_data = 0
                total_metrics = 0
                for company_data in comparison_data.values():
                    for metric, value in company_data.items():
                        if metric != "ticker":
                            total_metrics += 1
                            if value is not None:
                                metrics_with_data += 1
                
                results["compare_with_peers"] = {
                    "success": True,
                    "companies_compared": len(comparison_data),
                    "metrics_with_data": metrics_with_data,
                    "total_metrics": total_metrics,
                    "data_completeness": f"{metrics_with_data}/{total_metrics}",
                    "comparison_data": comparison_data  # Include actual data for verification
                }
            else:
                results["compare_with_peers"] = {
                    "success": False,
                    "error": result.get("error", "Unknown error")
                }
        except Exception as e:
            results["compare_with_peers"] = {"error": str(e)}
        
        # Test get_analyst_consensus (failing tool)
        try:
            result = await tools.get_analyst_consensus(ticker, include_history=True)
            
            if result.get("success", False):
                consensus = result.get("consensus", {})
                analyst_targets = consensus.get("analyst_targets", {})
                recommendations = consensus.get("recommendations", {})
                
                # Convert any numpy objects to native Python types for JSON serialization
                def clean_for_json(obj):
                    if isinstance(obj, dict):
                        return {k: clean_for_json(v) for k, v in obj.items()}
                    elif hasattr(obj, 'item'):  # numpy scalar
                        return obj.item()
                    elif hasattr(obj, 'tolist'):  # numpy array
                        return obj.tolist()
                    else:
                        return obj
                
                results["get_analyst_consensus"] = {
                    "success": True,
                    "has_price_targets": len(analyst_targets) > 0 if analyst_targets else False,
                    "has_recommendations": len(recommendations) > 0 if recommendations else False,
                    "price_targets": clean_for_json(analyst_targets),
                    "recommendations": clean_for_json(recommendations)
                }
            else:
                results["get_analyst_consensus"] = {
                    "success": False,
                    "error": result.get("error", "Unknown error")
                }
        except Exception as e:
            results["get_analyst_consensus"] = {"error": str(e)}
        
        return {
            "success": True,
            "ticker": ticker,
            "tool_test_results": results,
            "tool_registry_available": list(TOOL_REGISTRY.keys())
        }
        
    except Exception as e:
        logger.error(f"Direct tool test failed: {str(e)}")
        return {"error": str(e)}

@app.get("/basic/{symbol}")
@rate_limit_decorator
async def get_basic_info(symbol: str):
    """Get basic stock information quickly"""
    try:
        ticker = yf.Ticker(symbol)
        
        # Use safe call for basic info
        info = safe_yfinance_call(symbol, "basic_info_quick", lambda: ticker.info)
        
        if not info:
            raise HTTPException(status_code=404, detail=f"No data found for symbol {symbol}")
        
        return {
            "symbol": symbol.upper(),
            "name": safe_get(info, 'longName') or safe_get(info, 'shortName'),
            "current_price": safe_get(info, 'currentPrice') or safe_get(info, 'regularMarketPrice'),
            "market_cap": safe_get(info, 'marketCap'),
            "pe_ratio": safe_get(info, 'trailingPE'),
            "currency": safe_get(info, 'currency'),
            "exchange": safe_get(info, 'exchange'),
            "last_updated": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching basic info for {symbol}: {str(e)}")
        
        # Check if it's a rate limit error
        if "429" in str(e) or "Too Many Requests" in str(e):
            raise HTTPException(
                status_code=429, 
                detail=f"Rate limited by Yahoo Finance. Please try again in a few seconds."
            )
        else:
            raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.post("/cache/clear")
async def clear_cache():
    """Clear the API cache - useful for debugging"""
    global CACHE
    cache_size_before = len(CACHE)
    CACHE.clear()
    
    logger.info(f"Cache cleared - removed {cache_size_before} items")
    
    return {
        "status": "success",
        "message": f"Cache cleared - removed {cache_size_before} items",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/cache/stats")
async def cache_stats():
    """Get detailed cache statistics"""
    current_time = time.time()
    
    # Analyze cache contents
    cache_items = []
    for cache_key, (data, timestamp) in CACHE.items():
        age_seconds = current_time - timestamp
        cache_items.append({
            "key": cache_key,
            "age_seconds": age_seconds,
            "expires_in_seconds": CACHE_TTL - age_seconds,
            "is_expired": age_seconds > CACHE_TTL
        })
    
    return {
        "cache_size": len(CACHE),
        "cache_max_size": CACHE_MAX_SIZE,
        "cache_ttl_seconds": CACHE_TTL,
        "cache_items": sorted(cache_items, key=lambda x: x['age_seconds']),
        "timestamp": datetime.now().isoformat()
    }


@app.get("/search/{query}")
async def search_symbols(query: str, limit: int = Query(10, ge=1, le=50)):
    """Search for stock symbols"""
    try:
        # Use yfinance search functionality if available
        # For now, return a simple response
        return {
            "query": query,
            "results": [],
            "message": "Search functionality can be enhanced with additional libraries",
            "last_updated": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error searching for {query}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/debug-safe-get/{symbol}")
async def debug_safe_get(symbol: str):
    """
    Debug the exact processing logic that should work
    """
    try:
        import yfinance as yf
        ticker = yf.Ticker(symbol)
        
        quarterly_income = safe_yfinance_call(symbol, "quarterly_financials", lambda: ticker.quarterly_financials)
        
        if quarterly_income is None or quarterly_income.empty:
            return {"error": "No quarterly data", "symbol": symbol}
            
        # Test the EXACT same logic as in process_quarterly_data
        results = []
        max_quarters = min(3, len(quarterly_income.columns))
        
        for i, date in enumerate(quarterly_income.columns[:max_quarters]):
            # Format period as YYYY-QX
            if hasattr(date, 'strftime'):
                period = date.strftime("%Y-%m-%d")  # Use simple date format
            else:
                period = str(date)[:10] if len(str(date)) > 10 else str(date)
            
            # Test get_value function
            def get_value(field_name):
                try:
                    if field_name in quarterly_income.index and date in quarterly_income.columns:
                        value = quarterly_income.loc[field_name, date]
                        if pd.isna(value) or (isinstance(value, (int, float)) and not np.isfinite(value)):
                            return None
                        return float(value) if isinstance(value, (int, float)) else value
                except Exception as e:
                    return f"ERROR: {str(e)}"
                return None
                
            quarter_result = {
                "period": period,
                "ebitda": get_value('EBITDA'),
                "normalized_ebitda": get_value('Normalized EBITDA'),
                "net_income": get_value('Net Income From Continuing Operation Net Minority Interest'),
                "ebit": get_value('EBIT'),
                "available_fields": [field for field in quarterly_income.index if field in ['EBITDA', 'Normalized EBITDA', 'Net Income From Continuing Operation Net Minority Interest', 'EBIT', 'Total Expenses']]
            }
            results.append(quarter_result)
        
        return {
            "symbol": symbol.upper(),
            "quarters_tested": len(results),
            "results": results
        }
        
    except Exception as e:
        logger.error(f"Error debugging exact processing logic for {symbol}: {str(e)}")
        return {"error": str(e), "symbol": symbol}

@app.get("/debug/{symbol}")
async def debug_symbol_data(symbol: str):
    """
    Debug endpoint to see what data is available for a symbol
    """
    try:
        import yfinance as yf
        ticker = yf.Ticker(symbol)
        info = safe_yfinance_call(symbol, "basic_info", lambda: ticker.info)
        
        if not info:
            return {"error": "No info data available", "symbol": symbol}
        
        # Get available keys and sample values
        debug_data = {}
        financial_keys = ['trailingEps', 'forwardEps', 'trailingPE', 'forwardPE', 'priceToBook', 
                         'totalCash', 'totalDebt', 'totalStockholderEquity', 'bookValue', 
                         'operatingCashFlow', 'freeCashflow', 'grossMargins', 'operatingMargins',
                         'profitMargins', 'beta', 'dividendYield', 'payoutRatio', 'enterpriseToRevenue',
                         'enterpriseToEbitda', 'pegRatio', 'priceToSalesTrailing12Months',
                         'netIncomeToCommon', 'totalRevenue', 'ebitda']
        
        for key in financial_keys:
            if key in info and info[key] is not None:
                debug_data[key] = info[key]
            else:
                debug_data[key] = "NOT_FOUND"
        
        # Check financial statements
        try:
            income_stmt = safe_yfinance_call(symbol, "income_statement", lambda: ticker.income_stmt)
            debug_data["income_stmt_available"] = income_stmt is not None and not income_stmt.empty
            debug_data["income_stmt_columns"] = len(income_stmt.columns) if income_stmt is not None and hasattr(income_stmt, 'columns') else 0
            if income_stmt is not None and hasattr(income_stmt, 'index'):
                debug_data["income_stmt_sample_fields"] = list(income_stmt.index)[:10]
        except Exception as e:
            debug_data["income_stmt_available"] = False
            debug_data["income_stmt_error"] = str(e)
            
        try:
            balance_sheet = safe_yfinance_call(symbol, "balance_sheet", lambda: ticker.balance_sheet)
            debug_data["balance_sheet_available"] = balance_sheet is not None and not balance_sheet.empty
            debug_data["balance_sheet_columns"] = len(balance_sheet.columns) if balance_sheet is not None and hasattr(balance_sheet, 'columns') else 0
        except Exception as e:
            debug_data["balance_sheet_available"] = False
            debug_data["balance_sheet_error"] = str(e)
        
        # NEW: Check quarterly data specifically using correct methods
        try:
            quarterly_income = safe_yfinance_call(symbol, "quarterly_financials", lambda: ticker.quarterly_financials)
            debug_data["quarterly_income_available"] = quarterly_income is not None and not quarterly_income.empty
            debug_data["quarterly_income_columns"] = len(quarterly_income.columns) if quarterly_income is not None and hasattr(quarterly_income, 'columns') else 0
            if quarterly_income is not None and hasattr(quarterly_income, 'index'):
                debug_data["quarterly_income_fields"] = list(quarterly_income.index)[:15]
                # Show sample data from most recent quarter
                if len(quarterly_income.columns) > 0:
                    latest_quarter = quarterly_income.iloc[:, 0]  # Most recent quarter
                    debug_data["quarterly_income_sample_values"] = {
                        str(field): str(value) for field, value in latest_quarter.head(10).items()
                    }
        except Exception as e:
            debug_data["quarterly_income_available"] = False
            debug_data["quarterly_income_error"] = str(e)
            
        try:
            quarterly_cf = safe_yfinance_call(symbol, "quarterly_cashflow", lambda: ticker.quarterly_cashflow)
            debug_data["quarterly_cashflow_available"] = quarterly_cf is not None and not quarterly_cf.empty
            debug_data["quarterly_cashflow_columns"] = len(quarterly_cf.columns) if quarterly_cf is not None and hasattr(quarterly_cf, 'columns') else 0
        except Exception as e:
            debug_data["quarterly_cashflow_available"] = False
            debug_data["quarterly_cashflow_error"] = str(e)
            
        try:
            quarterly_bs = safe_yfinance_call(symbol, "quarterly_balance_sheet", lambda: ticker.quarterly_balance_sheet)
            debug_data["quarterly_balance_sheet_available"] = quarterly_bs is not None and not quarterly_bs.empty
            debug_data["quarterly_balance_sheet_columns"] = len(quarterly_bs.columns) if quarterly_bs is not None and hasattr(quarterly_bs, 'columns') else 0
        except Exception as e:
            debug_data["quarterly_balance_sheet_available"] = False
            debug_data["quarterly_balance_sheet_error"] = str(e)
            
        return {
            "symbol": symbol.upper(),
            "total_info_keys": len(info.keys()),
            "sample_info_keys": list(info.keys())[:20],
            "financial_data": debug_data
        }
        
    except Exception as e:
        logger.error(f"Error debugging {symbol}: {str(e)}")
        return {"error": str(e), "symbol": symbol}

@app.get("/test-quarterly/{symbol}")
async def test_quarterly_data(symbol: str):
    """
    Test endpoint to directly check quarterly data structure without caching
    """
    try:
        import yfinance as yf
        ticker = yf.Ticker(symbol)
        
        results = {}
        
        # Test quarterly income statement using correct method
        try:
            quarterly_income = ticker.quarterly_financials  # Fixed method name
            if quarterly_income is not None and not quarterly_income.empty:
                # Show actual structure and sample data
                results["quarterly_income"] = {
                    "available": True,
                    "shape": quarterly_income.shape,
                    "columns": [str(col) for col in quarterly_income.columns],  # quarters/dates
                    "all_index": [str(idx) for idx in quarterly_income.index],  # ALL field names
                    "revenue_fields": [str(idx) for idx in quarterly_income.index if 'revenue' in str(idx).lower()],
                    "income_fields": [str(idx) for idx in quarterly_income.index if 'income' in str(idx).lower()],
                    "sample_data": {
                        str(quarterly_income.columns[0]): {
                            str(field): str(quarterly_income.loc[field, quarterly_income.columns[0]])  # Show raw value as string
                            for field in quarterly_income.index  # Show ALL fields, not just first 10
                        }
                    }
                }
            else:
                results["quarterly_income"] = {"available": False}
        except Exception as e:
            results["quarterly_income"] = {"error": str(e)}
        
        return {
            "symbol": symbol.upper(),
            "results": results
        }
        
    except Exception as e:
        logger.error(f"Error testing quarterly data for {symbol}: {str(e)}")
        return {"error": str(e), "symbol": symbol}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
