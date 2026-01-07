# Account Feature Implementation Plan

## Overview
- **Goal:** Add user authentication and data persistence.
- **Backend:** Supabase (PostgreSQL + Auth).
- **Frontend:** React Router + React Query.

## Persistent State
1. **Profiles:** 
   - `market_preference` (US/CN)
   - `default_currency` (USD/CNY)
   - `portfolio_capital_usd` (Default 300k)
   - `portfolio_capital_cny` (Default 1.5M)
   - `risk_per_trade_default` (Default 0.75%)
2. **Trades:** Full history of logged trades.

## Database Schema

### Table: `profiles`
- `id`: UUID (Primary Key, references auth.users)
- `market_preference`: Text
- `portfolio_usd`: Numeric
- `portfolio_cny`: Numeric
- `updated_at`: Timestamp

### Table: `trades`
- `id`: UUID (Primary Key)
- `user_id`: UUID (Foreign Key)
- `symbol`: Text
- `direction`: Text
- `entry`: Numeric
- `stop`: Numeric
- `target`: Numeric
- `position_size`: Numeric
- `risk_amount`: Numeric
- `created_at`: Timestamp

## Implementation Steps
1. **Phase 1:** Setup Supabase and Auth Routing (`/login`, `/dashboard`).
2. **Phase 2:** Refactor `App.tsx` state to fetch from `profiles` table.
3. **Phase 3:** Migrate `loggedTrades` to the `trades` table.
4. **Phase 4:** Enable Row Level Security (RLS) to ensure users only see their own data.
