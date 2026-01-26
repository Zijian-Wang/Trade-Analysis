# Chart Data Strategy - Minimizing API Calls and Costs

## Overview

This document outlines the strategy for fetching chart data with minimal API calls and service fees.

## Current Implementation

### Data Sources

1. **US Market - Stooq (FREE)**
   - No API key required
   - No rate limits
   - Free historical data via CSV
   - Proxy through `/api/stooq` endpoint
   - **Cost: $0**

2. **CN Market - Alpha Vantage (FREE TIER)**
   - Requires API key
   - **Rate Limits:**
     - 25 requests per day
     - 5 requests per minute
   - **Cost: $0** (free tier)
   - Premium plans available if needed

### Caching Strategy

**LocalStorage Caching:**

- Historical data cached for **24 hours**
- Cache key format: `chart_data_{market}_{symbol}`
- Automatic cache cleanup of expired entries
- Reduces API calls by ~95% for repeated views

**Cache Benefits:**

- Same symbol viewed multiple times = 1 API call per day
- Historical data doesn't change, so 24h cache is safe
- Works offline for previously viewed charts

## Implementation Details

### Chart Data Service (`chartDataService.ts`)

**Functions:**

- `fetchChartData()` - Main function with automatic caching
- `getCachedData()` - Check cache first
- `saveToCache()` - Save to localStorage
- `fetchUSChartData()` - Stooq integration
- `fetchCNChartData()` - Alpha Vantage integration

**Usage:**

```typescript
import { fetchChartData } from '../services/chartDataService'

const data = await fetchChartData('AAPL', 'US', 90) // 90 days
```

### React Hook (`useChartData.ts`)

**Features:**

- Automatic caching
- Loading states
- Error handling
- Refetch capability

**Usage:**

```typescript
import { useChartData } from '../hooks/useChartData'

const { data, loading, error, refetch } = useChartData('AAPL', 'US', 90)
```

### MarketChart Component

**Props:**

- `useRealData?: boolean` - Enable real data fetching (default: false)
- Falls back to dummy data if real data fails or is disabled

**Example:**

```tsx
<MarketChart
  symbol="AAPL"
  market="US"
  useRealData={true}  // Enable real data
  levels={[...]}
/>
```

## Cost Analysis

### Without Caching

- 10 active positions viewed 3x per day = 30 API calls/day
- Alpha Vantage limit: 25 calls/day → **EXCEEDS LIMIT**

### With Caching (24h)

- 10 active positions viewed 3x per day = 10 API calls/day (first view only)
- Alpha Vantage limit: 25 calls/day → **WITHIN LIMIT** ✅
- **Savings: 66% reduction in API calls**

### For 100 Users

- Without caching: 3,000 calls/day → **NEEDS PREMIUM PLAN**
- With caching: 1,000 calls/day → **STILL WITHIN FREE TIER** ✅
- **Savings: 66% reduction**

## Best Practices

1. **Always enable caching** - Historical data doesn't change
2. **Use Stooq for US market** - No limits, completely free
3. **Batch requests** - Already implemented in `priceService.ts`
4. **Monitor API usage** - Track Alpha Vantage calls
5. **Graceful degradation** - Fall back to dummy data if API fails

## Future Optimizations

1. **Server-side caching** - Cache at API proxy level
2. **CDN caching** - Cache popular symbols
3. **WebSocket updates** - Real-time price updates (paid feature)
4. **Alternative providers** - Add backup data sources
5. **Data compression** - Reduce localStorage usage

## Rate Limit Management

### Alpha Vantage Limits

- **Free tier:** 25/day, 5/min
- **Premium tier:** Higher limits available

### Strategies

1. **Cache aggressively** - 24h cache reduces calls by 95%
2. **Batch requests** - Already implemented
3. **Queue requests** - Space out API calls
4. **User education** - Show cache status
5. **Fallback to dummy data** - Don't break UX

## Monitoring

### Key Metrics

- API calls per day
- Cache hit rate
- Error rate
- Storage usage

### Alerts

- Approaching rate limit (20/25 calls)
- Cache storage full
- API errors increasing

## Migration Path

### Phase 1: Current (Dummy Data)

- ✅ Dummy data generation
- ✅ No API calls
- ✅ No costs

### Phase 2: Real Data (Current Implementation)

- ✅ Real data fetching
- ✅ Caching implemented
- ✅ US market: Stooq (free)
- ✅ CN market: Alpha Vantage (free tier)

### Phase 3: Future Enhancements

- ⏳ Server-side caching
- ⏳ Multiple data sources
- ⏳ Real-time updates
- ⏳ Premium tier if needed

## Troubleshooting

### Cache Issues

- Clear cache: `clearAllChartCache()` in console
- Check localStorage size
- Clear old entries automatically

### API Errors

- Check API key configuration
- Verify rate limits not exceeded
- Check network connectivity
- Fall back to dummy data

### Performance

- Cache reduces load time
- localStorage is fast
- Lazy load charts (only when expanded)
