# Trade Analysis Feature Integration

## Phase 2: Trade Lifecycle & Risk Contracts
- [x] **Extend Trade Model**
  - [x] Add `status` field (PLANNED | ACTIVE | CLOSED)
  - [x] Create `RiskContract` interface
  - [x] Refactor `Trade` to contain array of `RiskContract[]`
  - [x] Add `structureStop` vs `contractStop` support
  - [x] Update `tradeService.ts` for new data model
  - [x] Migrate existing trades data

- [x] **Active Position Management UI**
  - [x] Implement Top Navigation (Entry | Active | Portfolio)
  - [x] Create `ActivePositions` page with Portfolio Risk Header
  - [x] Build position table (Symbol, Dir, Setup, Entry, Stop, Current, Shares, Risk)
  - [x] Implement actions: Chart, Move Stop, Add Position, Close

- [x] **Portfolio Overview UI**
  - [x] Create `PortfolioOverview` page
  - [x] Implement "Risk by Symbol" Pie Chart (`recharts`)
  - [x] Implement "Cash vs Deployed Risk" Donut Chart (`recharts`)
  - [x] Integrate real portfolio data

- [x] **Entry Setup Visuals**
  - [x] Refactor `TradeInputCard` to "Blue Card" split layout
  - [x] Apply specific typography and spacing from design

- [x] **Entry Setup Context Mode**
  - [x] Extend `TradeInputCard` to accept parent trade context
  - [x] Display freed risk and remaining portfolio budget
  - [x] Create new `RiskContract` under existing trade
  - [x] Ensure parent trade is not mutated

- [x] **Refactor Core Logic**
  - [x] Extract risk calculation to UI-agnostic service (riskCalculator.ts)
  - [x] Separate calculation from React state

- [x] **Localization Updates**
  - [x] Add new strings for Active Management
  - [x] Add strings for Portfolio Summary
  - [x] Update both `en.json` and `zh.json`

## Phase 3: Visualization & Refinement
- [x] **UI Text Updates**
  - [x] Rename "Active" to "Active Positions"
  - [x] Rename "Portfolio" to "Portfolio Overview"

- [x] **Chart Component Architecture**
  - [x] Extract `PositionChart` into reusable `MarketChart` component
  - [x] Ensure `MarketChart` accepts: symbol, market, and optional price levels (Entry/Stop/Target)

- [x] **Active Positions Fixes**
  - [x] Debug "White Page" crash on row expand
  - [x] Implement multi-market grouping (US vs CN cards)

- [x] **Entry Planning Enhancements**
  - [x] Integrate `MarketChart` into `TradeInputCard`
  - [x] Fetch and display daily K-line data for selected ticker

- [x] **Portfolio Overview Multi-Market**
  - [x] Segment risk/capital analysis by market (US/CN)
  - [x] Display separate portfolio cards if multiple markets utilized

## Phase 4: Bug Fixes & QA
- [x] **Chart Reliability**
  - [x] Fix `MarketChart` failing to load (handle 0-width gracefully)
  - [x] Ensure resize observer is robust

- [x] **Interaction Fixes**
  - [x] Replace `window.confirm` with `AlertDialog` for Close Position
  - [x] Ensure delete action works reliably

- [x] **Verification**
  - [x] Run browser test for Chart loading
  - [x] Run browser test for Close Position action

## Policies
- [ ] **Unit Testing Enforcement**
  - [ ] All new logic must have passing `vitest` tests.
  - [ ] Check `.agent/workflows/implement_logic_with_tests.md` workflow.

## Documentation
- [ ] Update `AGENT_SPEC.md` with actual implementation names
