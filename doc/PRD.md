# Trade Risk Analysis — Product Requirements Document (PRD)

## 1. Overview

**Purpose**  
Trade Risk Analysis is a risk-first trading tool designed to help traders define, monitor, and manage risk at both the trade and portfolio level.

The system emphasizes:
- Risk-based position sizing
- Portfolio-level risk awareness
- Broker integration for real-time position sync
- Multi-market support (US & China)

This product is not a signal generator or broker replacement.

---

## 2. Core Features

### 2.1 Entry Planning (Position Calculator)

The Entry tab provides a position sizing calculator based on risk parameters:

**Inputs:**
- Portfolio capital
- Risk % per trade
- Entry price
- Stop loss price
- Target price (optional)
- Direction (Long/Short)
- Setup/Sentiment tag

**Outputs:**
- Position size (shares/lots)
- Risk amount ($)
- Risk per share
- R/R ratio (if target provided)

**Market Support:**
- US Market: Standard share sizing
- CN Market: 100-share lot sizing

---

### 2.2 Active Positions Management

Displays and manages all active positions grouped by market.

**Features:**
- Position list with key metrics (Symbol, Cost, Stop, Price, Shares, Risk)
- Company name (when available) displayed under the symbol for readability
  - US: resolved from a static SEC-derived ticker directory served from `public/symbols/us_ticker_to_name.json` (lazy-loaded)
  - CN: resolved from a static local map (lazy-loaded), with optional fallback when missing
  - Options: show the *underlying* company name on desktop only (does not crowd expiry/strike lines)
- Total portfolio risk per market ($ and %)
- Actions: Adjust stop, Add to position, Close position, Edit shares
- Manual position entry for non-synced positions
- Market session status indicator (icon-only) on each market card:
  - US: Open / Extended / Closed (incl. Holiday)
  - CN: Open / Closed (incl. Lunch break)

**Schwab Integration (US Market):**
- When linked, Schwab becomes the source of truth for US positions
- Portfolio capital synced from account liquidation value
- Positions show average cost from Schwab
- Stop protection derived from open stop orders (stop market / stop limit)
- Positions without protective stop orders flagged with warning (does not depend on market hours)

---

### 2.3 Broker Integration (Schwab)

**Authentication:**
- OAuth 2.0 flow with PKCE
- Secure token storage in Firebase

**Sync Capabilities:**
- Account liquidation value → Portfolio capital
- Active positions with average cost basis
- Open stop orders (stop market, stop limit) are treated as risk protection even outside market hours
- Auto-sync on page load and every 5 minutes

**Data Model:**
- `syncedFromBroker: true` flag for broker positions
- `hasWorkingStop` flag to identify unprotected positions (stop order existence; market hours do not affect this)
- Manual US trades hidden when Schwab is linked

---

### 2.4 Portfolio Overview (Work in Progress)

Portfolio overview UI is deferred. The app currently focuses on Entry + Active Positions workflows, with portfolio overview planned for a future phase.

---

## 3. User System

### 3.1 Authentication

- Firebase Authentication
- Email/password sign-up with email verification
- Google OAuth sign-in
- Guest mode with localStorage persistence

### 3.2 User Preferences

Stored per-user in Firebase:
- Default portfolio capital (US/CN)
- Active markets
- Single market mode toggle
- Language follows market setting
- Schwab linked status

---

## 4. Localization

Full support for:
- English (EN)
- Chinese (CN)

All UI text externalized to locale files. Language can automatically follow market selection.

---

## 5. Data Persistence

### Logged-in Users
- Trades stored in Firebase Firestore
- Preferences synced across devices
- Schwab tokens stored securely

### Guest Users
- Trades stored in localStorage
- Preferences stored in localStorage
- Data migrated on sign-up

---

## 6. Technical Stack

- **Frontend:** React + TypeScript + Vite
- **Styling:** Tailwind CSS + Radix UI
- **Backend:** Vercel Serverless Functions
- **Database:** Firebase Firestore
- **Auth:** Firebase Authentication
- **Broker API:** Schwab Individual Trader API

---

## 7. Out of Scope

- Signal generation
- Backtesting
- Strategy optimization
- Alerts / automation
- Real-time price streaming
- Options / futures support
- Trade history analytics

---

## 8. Future Considerations

- Additional broker integrations
- CN market broker support
- Trade journaling and analytics
- Mobile-optimized experience
