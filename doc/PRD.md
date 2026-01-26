# Trade Risk Analysis — Product Requirements Document (PRD)

## 1. Overview

**Purpose**  
Trade Risk Analysis is a risk-first trading tool designed to help traders define, monitor, and manage risk at both the trade and portfolio level.

The system emphasizes:
- structural stops
- controlled exposure
- portfolio-level awareness
- visual clarity over signal density

This product is not a signal generator or broker replacement.

---

## 2. Core Principles

1. Risk-first, P/L-second  
2. Structure defines validity  
3. Trades are logged as Active with follow-up actions (add to position, close)  
4. Localization-first (CN / EN)  
5. Core logic must remain UI-agnostic  

---

## 3. Trade Lifecycle

### 3.1 Entry Setup (Log Active Trade)

Users log trades directly as **Active** positions. Entry Setup calculates position size and risk based on:
- Account size
- Risk %
- Entry price
- Structure stop price

**Outputs**
- Position size
- Initial risk ($)
- Initial R

**Notes**
- Trades are created with `status: 'ACTIVE'` by default
- Initial parameters (entry, structure stop) must not be mutated after creation
- Entry Setup must be reusable in both standalone and contextual modes (adding to existing position)

---

### 3.2 Active (Position Management)

Represents all live positions with mutable risk. All logged trades start as Active.

**Key Capabilities**
- Adjust stop (structure or contract-level override)
- Add to position (new risk contract via Entry Setup in context mode)
- Partial or full close

---

### 3.3 Closed

Represents completed trades.
Persistence is required but analytics are out of MVP scope.

---

## 4. Stop Model

### Structure Stop
- Defined at first entry
- Represents thesis invalidation
- Default stop for all contracts

### Contract Stop (Optional Override)
- Disabled by default
- Explicit user action required
- Applies only to the specific add-on contract

**Effective Stop Rule**
Effective Stop =
Contract Stop (if exists)
else Structure Stop

---

## 5. Active Position UI

### 5.1 Position List (Data View)

Each active position displays:
- Symbol
- Entry price
- Structure stop
- Current stop
- Current price
- Risk remaining ($ / %)
- Trade state badge

Inline actions:
- Move stop
- Add to position
- Close position

---

### 5.2 Visual Risk Line

Each position includes a horizontal visual indicator:

| Stop | Entry | Current | Target (optional) |

Purpose:
- Immediate risk comprehension
- Non-emotional visual encoding

---

### 5.3 Chart View (Deferred to Phase 5)

Chart view has been deferred to a later phase due to price data mismatch issues. The current implementation focuses on the Visual Risk Line for risk comprehension.

**Planned Features (Phase 5):**
- Daily candlesticks with historical data
- Horizontal lines:
  - Entry
  - Structure stop
  - Contract stop (if overridden)
  - Target (optional)
- Charts are read-only and assistive

---

## 6. Portfolio Risk Summary

Displayed prominently in Active view:
- Total portfolio risk ($)
- Risk % of account
- Number of active positions

---

## 7. Entry Setup Reuse (Context Mode)

When Entry Setup is triggered from Active Management:
- Parent trade context is passed
- Display:
  - Freed risk
  - Remaining portfolio risk budget
- Risk validation is enforced
- Parent trade is not mutated

---

## 8. Localization

All features must support:
- Chinese (CN)
- English (EN)

Requirements:
- No hardcoded strings
- Localized labels, tooltips, warnings
- Locale-aware number formatting

---

## 9. Component Guidelines

Core logic must be separated from UI.

Recommended conceptual components:
- Risk calculation engine
- Entry Setup form
- Active position manager
- Visual risk indicators
- Chart renderer

---

## 10. Out of Scope (MVP)

- Signal generation
- Backtesting
- Strategy optimization
- Alerts / automation

---

## 11. Broker Integration (Phase 2)

Broker integration for auto-syncing active positions and stop orders is planned as a Phase 2 feature. See `doc/schwab-api-research.md` for implementation plan.

**Key Requirements:**
- OAuth 2.0 authentication flow (backend proxy required)
- Auto-sync active positions and working stop orders
- Map broker data to Trade Analysis models
- Handle unsupported instrument types (multi-leg options, complex derivatives) with clear labeling
- Generate current account risk status from synced data

---

## 12. Current Status

- Phase 1 logic implemented
- Data persistence enabled (Firebase + LocalStorage)
- Active position management UI complete
- Portfolio overview implemented
- Future work: Broker integration, enhanced visualization, contract stop override UI
