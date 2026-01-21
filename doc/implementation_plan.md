# Trade Analysis — Feature Integration Plan

## Summary

The codebase is in **Phase 1** with Entry Setup (standalone mode) and basic trade persistence implemented. This plan outlines step-by-step integration of Phase 2 features: Trade lifecycle states, Risk Contract model, Active Position Management, and Portfolio Risk Summary.

---

## Current State Analysis

### Implemented (Phase 1)
| Concept | Actual Implementation |
|---------|----------------------|
| Entry Setup Form | `TradeInputCard.tsx` |
| Position Calculator | `useTradeCalculator.ts` hook |
| Trade History | `TradeHistory.tsx` |
| Persistence | `tradeService.ts` (Firebase + localStorage) |
| Localization | `en.json`, `zh.json` in `/locales` |

### Key Gaps
1. **No lifecycle states** — all trades implicitly "logged" (no PLANNED → ACTIVE → CLOSED)
2. **No `RiskContract` abstraction** — each trade is a single flat record
3.- [ ] **Active Position Management UI**
  - [ ] Implement Top Navigation (Entry Planning | Active Positions | Portfolio)
  - [ ] Create `ActivePositions` page with Portfolio Risk Header
  - [ ] Build position table: Symbol, Dir, Setup, Entry, Stop, Current, Shares, Risk Remaining
  - [ ] Implement action icons: Chart, Move Stop, Add Position, Close
  - [ ] **Design Match**: Replicate clean table style and risk summary header

- [ ] **Portfolio Overview UI**
  - [ ] Implement "Risk by Symbol" Pie Chart
  - [ ] Implement "Cash vs Deployed Risk" Donut Chart
  - [ ] Use `recharts` library for premium visualization

- [ ] **Entry Setup Refinement**
  - [ ] Align `TradeInputCard` with "Blue Card" design
  - [ ] Split layout: Inputs (Left) vs Stats (Right)

---

## Step-by-Step Integration

### Phase 2A: Data Model Extension

#### Step 1: Extend Trade Interface
[MODIFY] [tradeService.ts](file:///d:/Zijian_Self_Practice/Trade-Analysis/src/app/services/tradeService.ts)

```typescript
// New types
export type TradeStatus = 'PLANNED' | 'ACTIVE' | 'CLOSED';

export interface RiskContract {
  id: string;
  entryPrice: number;
  shares: number;
  riskAmount: number;
  contractStop?: number;  // Optional override
  createdAt: Timestamp;
}

export interface Trade {
  id?: string;
  symbol: string;
  direction: 'long' | 'short';
  status: TradeStatus;              // NEW
  structureStop: number;            // Renamed from 'stop'
  contracts: RiskContract[];        // NEW
  // ... existing fields for backward compat
}
```

#### Step 2: Create Risk Calculation Engine
[NEW] [riskCalculator.ts](file:///d:/Zijian_Self_Practice/Trade-Analysis/src/app/services/riskCalculator.ts)

Extract core calculation logic from `useTradeCalculator.ts` into a UI-agnostic service:
- `calculatePositionSize(params)` 
- `calculateEffectiveStop(contract, structureStop)`
- `calculateTradeRisk(trade)`
- `calculatePortfolioRisk(trades[])`

---

### Phase 2B: Active Position Management

#### Step 3: Create Active Positions Page
[NEW] [ActivePositions.tsx](file:///d:/Zijian_Self_Practice/Trade-Analysis/src/app/pages/ActivePositions.tsx)

**Design Ref**: `UIRef_LightMode_2_ActivePositions.png`

- [ ] **Portfolio Risk Summary**
  - [ ] Integrated into `ActivePositions` header (Total Risk $, Active Count)
  - [ ] Detailed view in `PortfolioOverview` tab
  - Status Badge (e.g., "Normal")
- **Table Section**:
  - Columns: Symbol, Dir, Setup, Entry, Stop, Current, Shares, Risk Remaining
  - Actions: Chart (toggle), Move Stop (modal), Add (context), Close (confirm)

#### Step 4: Portfolio Charts
[NEW] [PortfolioOverview.tsx](file:///d:/Zijian_Self_Practice/Trade-Analysis/src/app/pages/PortfolioOverview.tsx)

**Design Ref**: `UIRef_LightMode_3_PortfolioOverview.png`

- Install `recharts` for data visualization
- **Chart 1**: "Risk by Symbol" (Pie Chart) - shows allocation of risk
- **Chart 2**: "Cash vs Deployed Risk" (Donut Chart) - visualizes exposure


#### Step 5: Stop Adjustment Modal
[NEW] [StopAdjustModal.tsx](file:///d:/Zijian_Self_Practice/Trade-Analysis/src/app/components/StopAdjustModal.tsx)

- Allow adjusting structure stop or contract stop
- Recalculate and persist risk changes

---

### Phase 2C: Entry Setup Context Mode

#### Step 6: Extend TradeInputCard
[MODIFY] [TradeInputCard.tsx](file:///d:/Zijian_Self_Practice/Trade-Analysis/src/app/components/TradeInputCard.tsx)

Add optional `parentTrade` prop to enable context mode:
```tsx
interface TradeInputCardProps {
  parentTrade?: Trade;  // Context mode when provided
  onContractAdded?: (contract: RiskContract) => void;
}
```

Display in context mode:
- Freed risk from parent
- Remaining portfolio risk budget
- Pre-fill structure stop from parent

---

### Phase 2D: UI Refinement & Navigation

#### Step 7: Top Navigation & Layout
[MODIFY] [Header.tsx](file:///d:/Zijian_Self_Practice/Trade-Analysis/src/app/components/Header.tsx)

- Implement 3-tab navigation: Entry Planning | Active Positions | Portfolio
- Update routing in `App.tsx` to support these views

#### Step 8: Entry Form Styling 
[MODIFY] [TradeInputCard.tsx](file:///d:/Zijian_Self_Practice/Trade-Analysis/src/app/components/TradeInputCard.tsx)

**Design Ref**: `UIRef_LightMode_1_EntryPlaning.png`

- Refactor to 2-column layout
- Style "Position Size" card with primary blue background
- Ensure typography matches design (clean sans-serif, bold headers)

---

### Phase 2E: Localization

#### Step 8: Add New Strings
[MODIFY] [en.json](file:///d:/Zijian_Self_Practice/Trade-Analysis/src/app/locales/en.json)
[MODIFY] [zh.json](file:///d:/Zijian_Self_Practice/Trade-Analysis/src/app/locales/zh.json)

Add keys for:
- `activePositions.*` (title, actions, labels)
- `portfolioSummary.*` (totalRisk, riskPercent, positionCount)
- `stopAdjust.*` (modal labels)

---

## Verification Plan

### Automated Tests
- Extend `tradeService.test.ts` with lifecycle state tests
- Add `riskCalculator.test.ts` for pure calculation tests
- Run: `npm run test`

### Manual Verification
- Log a trade → verify status = PLANNED
- Activate trade → verify status = ACTIVE
- Add-to-position → verify new contract created
- Adjust stop → verify risk recalculation
- Close trade → verify status = CLOSED

---

## Migration Strategy

Existing trades (without `status` field) should default to:
```typescript
status: 'CLOSED'  // or 'ACTIVE' based on business decision
contracts: [{ /* migrate from flat fields */ }]
```
