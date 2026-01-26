# Trade Risk Analysis — Agent Specification

## Role

You are an implementation and refactoring agent for the Trade Risk Analysis codebase.
Your goal is to maintain the **Trade Lifecycle**, **Active Management**, and **Visualization** features while ensuring strict adherence to the **Unit Testing Policy**.

---

## Ground Rules

1.  **Current Phase**: Phase 4 Complete (Bug Fixes & QA). Maintenance & Policy Enforcement Mode.
2.  **Naming Convention**: Adhere to the "Data Dictionary" below.
3.  **Core Principle**: Logic must be UI-agnostic (moved from hooks to pure services).
4.  **Persistence**: Hybrid model (Firebase for Auth Users, LocalStorage for Guests).
5.  **Testing**: All new logic requires a corresponding `.test.ts` file in `src/test/`.

---

## Data Dictionary (Actual Implementation)

| Concept | File / Component | Notes |
| :--- | :--- | :--- |
| **Trade Model** | `src/app/services/tradeService.ts` | Supports `RiskContract[]` and `status` ('PLANNED'/'ACTIVE'/'CLOSED'). |
| **Entry Form** | `src/app/components/TradeInputCard.tsx` | Handles user input, validation, and Context Mode (Add to Position). |
| **Risk Logic** | `src/app/services/riskCalculator.ts` | Pure function service for all risk math. |
| **Active List** | `src/app/pages/ActivePositionsPage.tsx` | Displays grouped trades (US/CN), supports expansion for charts. |
| **Portfolio** | `src/app/pages/PortfolioOverviewPage.tsx` | Multi-market risk analysis (Allocated Risk vs Safe Capital). |
| **Charting** | `src/app/components/MarketChart.tsx` | Reusable `lightweight-charts` component with ResizeObserver stability. |
| **Dialogs** | `src/app/components/ConfirmDialog.tsx` | Generic alert/confirmation dialog (replaces window.confirm). |
| **Persistence** | `src/app/services/tradeService.ts` | Handles unified API for Firestore/LocalStorage. |

---

## Trade Model Specification

### Lifecycle States
1.  **PLANNED**: Created in Entry Setup, not yet executed.
2.  **ACTIVE**: Position is open and managed.
3.  **CLOSED**: Position is fully exited.

### Data Structure active
```typescript
interface Trade {
  id: string;
  symbol: string;
  status: 'PLANNED' | 'ACTIVE' | 'CLOSED';
  structureStop: number; // Thesis invalidation point
  contracts: RiskContract[]; // Array of executions
  market: 'US' | 'CN'; // Market segment
  // ...
}

interface RiskContract {
  id: string;
  entryPrice: number;
  shares: number;
  contractStop?: number; // Optional strict stop
}
```

---

## Risk Model

**Effective Stop Logic**:
> If `RiskContract.contractStop` is defined, use it.
> Else, use `Trade.structureStop`.

**Risk Calculation**:
`Trade Risk ($) = Σ (Contract.shares * |Contract.entry - EffectiveStop|)`

---

## Feature Implementation Status

### 1. Active Position Management (Complete)
*   **Location**: `src/app/pages/ActivePositionsPage.tsx`
*   **Features**:
    *   Grouped by Market (US/CN).
    *   Expandable rows showing `MarketChart`.
    *   Actions: Add to Position, Adjust Stop, Close Position (with Dialog).

### 2. Entry Setup Reuse (Context Mode) (Complete)
*   **Component**: `TradeInputCard.tsx`
*   **Logic**:
    *   Accepts `parentTrade` to pre-fill context.
    *   Integrated `MarketChart` for visual planning.

### 3. Portfolio Risk Summary (Complete)
*   **Location**: `src/app/pages/PortfolioOverviewPage.tsx`
*   **Metrics**:
    *   Market-specific risk segmentation.
    *   Total Open Risk ($/%) and Position Counts.

---

## Localization
*   **Framework**: `src/app/locales/{en,zh}.json`
*   **Rule**: No hardcoded strings. All new UI text must be added to JSON files immediately.

---
