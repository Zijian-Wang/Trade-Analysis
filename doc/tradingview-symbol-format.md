# TradingView Symbol Format Requirements

## Overview

This document outlines the symbol format requirements for TradingView APIs and charting libraries, with focus on Chinese (CN) market.

## Important Notes

### Lightweight Charts Library

The `lightweight-charts` library (currently used in `MarketChart.tsx`) is a **client-side visualization library** that does NOT fetch data. It only displays data you provide to it. Therefore, symbol format doesn't matter for the chart library itself - you provide the data directly.

### TradingView Data Feeds

If you want to fetch data from TradingView's data feeds or REST API, you need to use their specific symbol formats.

## Chinese Market (CN) Symbol Format

### TradingView REST API / Broker API Format

For Chinese stocks, TradingView uses exchange prefixes:

- **Shanghai Stock Exchange (SSE)**: `SSE:SYMBOL`
  - Example: `SSE:600000` (for stock code 600000)
  - Example: `SSE:600519` (for stock code 600519 - 贵州茅台)

- **Shenzhen Stock Exchange (SZSE)**: `SZSE:SYMBOL`
  - Example: `SZSE:000001` (for stock code 000001)
  - Example: `SZSE:300750` (for stock code 300750 - 宁德时代)

### TradingView Advanced Charts Library Format

For the Advanced Charts Library (not lightweight-charts):

- **`name` property**: Should contain ONLY the symbol identifier (e.g., `600000`, `000001`, `300750`)
  - Do NOT include exchange information in the name
  - This is what users see in the UI

- **`ticker` property** (optional): Can use `EXCHANGE:SYMBOL` format
  - Example: `SSE:600000` or `SZSE:000001`
  - Used internally for data requests
  - Should avoid colons unless following TradingView format

### Current Codebase Format

The current codebase uses **Alpha Vantage API** format:

- Shanghai stocks: `SYMBOL.SHH` (e.g., `600000.SHH`)
- Shenzhen stocks: `SYMBOL.SHZ` (e.g., `000001.SHZ`)

This is **different** from TradingView's format.

## US Market Symbol Format

### TradingView Format

- **Standard format**: `EXCHANGE:SYMBOL`
  - Example: `NYSE:AAPL`
  - Example: `NASDAQ:MSFT`
  - Example: `NYSE:IBM`

- **For Advanced Charts Library**:
  - `name`: Just the symbol (e.g., `AAPL`, `MSFT`)
  - `ticker`: Optional, can be `NYSE:AAPL` format

### Current Codebase Format

The current codebase uses **Stooq API** format:

- Format: `SYMBOL.US` (e.g., `AAPL.US`)

## Symbol Detection Logic for CN Market

Based on current codebase patterns:

```typescript
// Shanghai Stock Exchange (SSE)
// Stocks starting with 5 or 6
if (/^[56]/.test(symbol)) {
  // TradingView format: SSE:SYMBOL
  // Alpha Vantage format: SYMBOL.SHH
}

// Shenzhen Stock Exchange (SZSE)
// Stocks starting with 0, 1, 2, 3 (and not starting with 920)
if (/^\d+$/.test(symbol) && !symbol.startsWith('920')) {
  // TradingView format: SZSE:SYMBOL
  // Alpha Vantage format: SYMBOL.SHZ
}
```

## Recommendations

1. **For Lightweight Charts (Current Implementation)**
   - Symbol format doesn't matter since you provide data directly
   - Current dummy data generation is fine
   - If integrating real data, use whatever format your data provider requires

2. **If Integrating TradingView Data Feed**
   - Use `SSE:SYMBOL` or `SZSE:SYMBOL` format for Chinese stocks
   - Use `EXCHANGE:SYMBOL` format for US stocks
   - Implement proper symbol mapping in your datafeed

3. **Symbol Format Helper Function**
   Consider creating a utility function to convert between formats:

```typescript
function formatSymbolForTradingView(
  symbol: string,
  market: 'US' | 'CN',
): string {
  if (market === 'CN') {
    // Determine exchange
    if (/^[56]/.test(symbol)) {
      return `SSE:${symbol}`
    } else if (/^\d+$/.test(symbol) && !symbol.startsWith('920')) {
      return `SZSE:${symbol}`
    }
  } else if (market === 'US') {
    // Would need exchange detection logic
    // For now, assume NYSE or use a mapping
    return `NYSE:${symbol}` // or NASDAQ, etc.
  }
  return symbol
}
```

## References

- [TradingView Symbology Documentation](https://www.tradingview.com/charting-library-docs/latest/connecting_data/Symbology/)
- [TradingView REST API Specification](https://www.tradingview.com/broker-api-docs/rest-api-spec)
- [Lightweight Charts Documentation](https://tradingview.github.io/lightweight-charts/docs)
