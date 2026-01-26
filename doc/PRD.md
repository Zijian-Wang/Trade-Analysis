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
3. Only three trade states: Planned → Active → Closed  
4. Localization-first (CN / EN)  
5. Core logic must remain UI-agnostic  

---

## 3. Trade Lifecycle

### 3.1 Planned (Entry Setup)

Defines a new risk contract.

**Inputs**
- Account size
- Risk %
- Entry price
- Structure stop price

**Outputs**
- Position size
- Initial risk ($)
- Initial R

**Notes**
- Once a trade becomes Active, initial parameters must not be mutated.
- Entry Setup must be reusable in both standalone and contextual modes.

---

### 3.2 Active (Position Management)

Represents all live positions with mutable risk.

**Key Capabilities**
- Adjust stop (structure or contract-level override)
- Add to position (new risk contract)
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

### 5.3 Chart View (Toggle)

Optional chart mode for each position:
- Daily candlesticks
- Horizontal lines:
  - Entry
  - Structure stop
  - Contract stop (if overridden)
  - Target (optional)

Charts are read-only and assistive.

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
- Broker integration
- Strategy optimization
- Alerts / automation

---

## 11. Current Status

- Phase 1 logic implemented
- Data persistence enabled
- Future work will extend Active Management and visualization layers
