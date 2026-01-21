# Trade Analysis Feature Integration

## Phase 2: Trade Lifecycle & Risk Contracts

- [ ] **Extend Trade Model**
  - [ ] Add `status` field (PLANNED | ACTIVE | CLOSED)
  - [ ] Create `RiskContract` interface
  - [ ] Refactor `Trade` to contain array of `RiskContract[]`
  - [ ] Add `structureStop` vs `contractStop` support
  - [ ] Update `tradeService.ts` for new data model
  - [ ] Migrate existing trades data

- [ ] **Active Position Management UI**
  - [ ] Implement Top Navigation (Entry | Active | Portfolio)
  - [ ] Create `ActivePositions` page with Portfolio Risk Header
  - [ ] Build position table (Symbol, Dir, Setup, Entry, Stop, Current, Shares, Risk)
  - [ ] Implement actions: Chart, Move Stop, Add Position, Close

- [ ] **Portfolio Overview UI**
  - [ ] Create `PortfolioOverview` page
  - [ ] Implement "Risk by Symbol" Pie Chart (`recharts`)
  - [ ] Implement "Cash vs Deployed Risk" Donut Chart (`recharts`)
  - [ ] Integrate real portfolio data

- [ ] **Entry Setup Visuals**
  - [ ] Refactor `TradeInputCard` to "Blue Card" split layout
  - [ ] Apply specific typography and spacing from design

- [ ] **Entry Setup Context Mode**
  - [ ] Extend `TradeInputCard` to accept parent trade context
  - [ ] Display freed risk and remaining portfolio budget
  - [ ] Create new `RiskContract` under existing trade
  - [ ] Ensure parent trade is not mutated

- [ ] **Portfolio Risk Summary**
  - [ ] (Integrated into Active Positions Header & Portfolio Page)

- [ ] **Refactor Core Logic**
  - [ ] Extract risk calculation to UI-agnostic service
  - [ ] Create `riskCalculator.ts` engine
  - [ ] Separate calculation from React state

- [ ] **Localization Updates**
  - [ ] Add new strings for Active Management
  - [ ] Add strings for Portfolio Summary
  - [ ] Update both `en.json` and `zh.json`

## Phase 3: Visualization (Optional)

- [ ] Chart toggle with candlestick display
- [ ] Horizontal level indicators

## Documentation

- [ ] Update `AGENT_SPEC.md` with actual implementation names
