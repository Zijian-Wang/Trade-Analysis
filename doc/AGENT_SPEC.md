# Trade Risk Analysis — Agent Specification

## Role

You are an implementation and refactoring agent for the Trade Risk Analysis codebase.
Your goal is to execute **Phase 2 (Active Management)** integration while maintaining existing Phase 1 persistence.

---

## Ground Rules

1.  **Current Phase**: Phase 1 Complete (Entry Setup + Persistence). Moving to Phase 2.
2.  **Naming Convention**: Adhere to the "Data Dictionary" below.
3.  **Core Principle**: Logic must be UI-agnostic (moved from hooks to pure services).
4.  **Persistence**: Hybrid model (Firebase for Auth Users, LocalStorage for Guests).

---

## Data Dictionary (Actual Implementation)

| Concept | File / Component | Notes |
| :--- | :--- | :--- |
| **Trade Model** | `src/app/services/tradeService.ts` | Currently flat interface. Moving to composite `RiskContract[]`. |
| **Entry Form** | `src/app/components/TradeInputCard.tsx` | Handles user input and validation. |
| **Risk Logic** | `src/app/hooks/useTradeCalculator.ts` | **Refactor Target**: Move core math to `src/app/services/riskCalculator.ts`. |
| **Persistence** | `src/app/services/tradeService.ts` | Handles unified API for Firestore/LocalStorage. |
| **History UI** | `src/app/components/TradeHistory.tsx` | Displays list of trades. |
| **Risk Line** | *(Planned)* | To be implemented in `src/app/components/ui/RiskLine.tsx`. |

---

## Trade Model Specification (Phase 2)

### Lifecycle States
1.  **PLANNED**: Created in Entry Setup, not yet executed.
2.  **ACTIVE**: Position is open and managed.
3.  **CLOSED**: Position is fully exited.

### Data Structure plan
```typescript
interface Trade {
  id: string;
  symbol: string;
  status: 'PLANNED' | 'ACTIVE' | 'CLOSED';
  structureStop: number; // Thesis invalidation point
  contracts: RiskContract[]; // Array of executions
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

## Feature Requirements

### 1. Active Position Management
*   **Location**: `src/app/pages/ActivePositions.tsx` (New)
*   **Capabilities**:
    *   List active trades.
    *   Action: **Add to Position** (Opens Entry Setup in context mode).
    *   Action: **Move Stop** (Updates `structureStop` or `contractStop`).
    *   Action: **Close** (Sets status to CLOSED).

### 2. Entry Setup Reuse (Context Mode)
*   **Component**: `TradeInputCard.tsx`
*   **Logic**:
    *   Accept `parentTrade` prop.
    *   If present, lock `Ticker` and pre-fill `Structure Stop`.
    *   Show "Freed Risk" if parent trade stop was moved to breakeven+.

### 3. Portfolio Risk Summary
*   **Location**: `src/app/components/PortfolioRiskSummary.tsx` (New)
*   **Metrics**:
    *   Total Open Risk ($).
    *   Total Open Risk (%).
    *   Exposure Check (prevent new trades if > Max Risk).

---

## Localization
*   **Framework**: `src/app/locales/{en,zh}.json`
*   **Rule**: No hardcoded strings. All new UI text must be added to JSON files immediately.

---

## Persistence Extensions
*   Existing `tradeService.ts` must be updated to handle the `contracts` array and `status` field.
*   **Migration**: Backward compatibility for existing flat trades is required (treat as single-contract Active trades).

---
