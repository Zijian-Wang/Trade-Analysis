# Trade Analysis Feature Integration

## Phase 2: Trade Lifecycle & Risk Contracts
- [x] **Extend Trade Model**
  - [x] Add `status` field (ACTIVE | CLOSED) - Note: PLANNED state exists in type but not used; trades logged as ACTIVE
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

- [x] **Chart View Removal**
  - [x] Remove chart view from Active Positions page due to price data mismatch issues
  - [x] Defer chart view implementation to later phase

## Policies
- [ ] **Unit Testing Enforcement**
  - [ ] All new logic must have passing `vitest` tests.
  - [ ] Check `.agent/workflows/implement_logic_with_tests.md` workflow.

## Phase 5: Chart View Implementation (Deferred)
- [ ] **Chart Data Integration**
  - [ ] Fix price data mismatch issues (symbol conversion, cache, API responses)
  - [ ] Implement reliable chart data fetching with proper error handling
  - [ ] Add chart view toggle back to Active Positions page
  - [ ] Ensure chart displays correct equity data matching trade prices

## Phase 6: Schwab Broker Integration (Auto-Sync Active Positions)

### Milestone 5.1: Backend Infrastructure Setup
- [x] **Create Vercel Serverless Functions Structure**
  - [x] Create `/api/auth/schwab/callback.ts` - OAuth callback handler
  - [x] Create `/api/auth/schwab/token.ts` - Token refresh endpoint
  - [x] Create `/api/schwab/sync.ts` - Unified sync endpoint (positions + orders → risk snapshot)
  - [ ] Update `vercel.json` to configure serverless functions

- [ ] **Token Storage & Security**
  - [ ] Design Firestore schema for storing encrypted OAuth tokens per user
  - [ ] Implement token encryption/decryption utilities
  - [ ] Add `schwabAccounts` array to user document structure
  - [ ] Store: `accessToken`, `refreshToken`, `expiresAt`, `accountHash`

- [ ] **Environment Configuration**
  - [ ] Add Schwab API credentials to Vercel environment variables
  - [ ] Set up `.env.example` with Schwab config placeholders
  - [ ] Document required environment variables

### Milestone 5.2: OAuth Flow Implementation
- [ ] **Frontend OAuth Initiation**
  - [ ] Create "Link Schwab Account" button/CTA in Settings or Active Positions page
  - [ ] Implement PKCE code generation (`code_verifier`, `code_challenge`)
  - [ ] Build OAuth authorization URL redirect flow
  - [ ] Handle OAuth callback page (`/auth/schwab/callback`)

- [x] **Backend Token Exchange**
  - [x] Implement token exchange endpoint (authorization code → access/refresh tokens)
  - [ ] Store tokens securely in Firestore (encrypted)
  - [x] Return success/error status to frontend
  - [x] Handle OAuth errors gracefully

- [ ] **Token Refresh Logic**
  - [ ] Implement automatic token refresh (check `expiresAt`, refresh before 30min expiry)
  - [ ] Handle 7-day refresh token expiry (prompt re-auth)
  - [ ] Add retry logic for expired token scenarios

### Milestone 5.3: Data Sync & Mapping
- [ ] **Account Discovery**
  - [ ] Implement `GET /trader/v1/accounts/accountNumbers` call
  - [ ] Handle multiple accounts (select primary or allow user selection)
  - [ ] Store account hash for subsequent API calls

- [ ] **Position Fetching**
  - [ ] Implement `GET /trader/v1/accounts/{hash}?fields=positions`
  - [ ] Parse Schwab position response structure
  - [ ] Map Schwab positions to Trade model:
    - `instrument.symbol` → `symbol`
    - `averagePrice` → `entryPrice` (for contracts)
    - `longQuantity`/`shortQuantity` → `shares` + `direction`
    - `marketValue` → current value (for display)

- [ ] **Stop Order Fetching**
  - [x] Implement stop order fetching for open stops
  - [x] Treat `AWAITING_STOP_CONDITION` as an existing stop order (market hours do not affect stop existence)
  - [x] Filter stop orders (`STOP`, `STOP_LIMIT`, `TRAILING_STOP`)
  - [x] Map stop orders to positions by symbol
  - [x] Extract `stopPrice` as effective stop for risk calculation (where available)

- [ ] **Instrument Type Detection**
  - [ ] Check `instrument.assetType` from Schwab response
  - [ ] Mark unsupported types: `OPTION` (multi-leg), `FUTURE`, complex derivatives
  - [ ] Add `instrumentType` and `isSupported` flags to Trade model
  - [ ] Return clear "Unsupported" labels in sync response

### Milestone 5.4: Risk Calculation & UI Integration
- [ ] **Risk Snapshot Service**
  - [ ] Create `schwabRiskService.ts` to compute risk from synced data
  - [ ] Calculate effective stop per position (stop order price OR "no stop")
  - [ ] Compute position risk: `shares × |entryPrice - effectiveStop|`
  - [ ] Calculate portfolio totals: total risk $, risk % of account
  - [ ] Exclude unsupported instruments from risk totals (or mark as "unknown")

- [ ] **Frontend Sync Integration**
  - [ ] Add "Sync Schwab Account" button/action in Active Positions page
  - [ ] Implement auto-sync on page load (if account linked)
  - [ ] Add polling mechanism (every 2-5 minutes while user on Active Positions page)
  - [ ] Display sync status (last sync time, sync in progress, errors)

- [ ] **UI Updates for Synced Positions**
  - [ ] Show synced positions alongside manually logged trades
  - [ ] Add visual indicator (badge/icon) for "Synced from Schwab"
  - [ ] Display "Unsupported" badge for complex instruments
  - [ ] Show "No Stop Order" warning for positions without stops
  - [ ] Update portfolio risk summary with synced data

### UI Enhancement: Market Session Indicator
- [x] Add market session status indicator icon on market cards (US/CN)
  - [x] US: Sun (OPEN), Sunrise/Sunset (EXT), Moon (CLOSED), CalendarX (HOLIDAY)
  - [x] CN: Sun (OPEN), Coffee (LUNCH), Moon (CLOSED)

- [ ] **Error Handling & UX**
  - [ ] Handle API rate limits gracefully
  - [ ] Show clear error messages for OAuth failures
  - [ ] Display "Re-authentication required" when refresh token expires
  - [ ] Add loading states during sync operations

### Milestone 5.5: Testing & Documentation
- [ ] **Unit Tests**
  - [ ] Test token encryption/decryption utilities
  - [ ] Test Schwab data mapping functions
  - [ ] Test risk calculation with synced positions
  - [ ] Test unsupported instrument detection

- [ ] **Integration Testing**
  - [ ] Test OAuth flow end-to-end (with Schwab sandbox if available)
  - [ ] Test token refresh logic
  - [ ] Test sync endpoint with mock Schwab responses
  - [ ] Test error scenarios (expired tokens, API failures)

- [ ] **Documentation**
  - [ ] Update `AGENT_SPEC.md` with Schwab integration details
  - [ ] Document API endpoints and data flow
  - [ ] Add developer setup guide for Schwab credentials
  - [ ] Document unsupported instrument handling

### Dependencies & Prerequisites
- [ ] **Schwab Developer Account Setup**
  - [ ] Register application on [developer.schwab.com](https://developer.schwab.com)
  - [ ] Select "Accounts and Trading Production" API product
  - [ ] Configure callback URL (HTTPS required)
  - [ ] Wait for app approval (2-5 business days)
  - [ ] Obtain Client ID and Client Secret

- [ ] **Infrastructure**
  - [ ] Vercel project configured for serverless functions
  - [ ] Firebase project with Firestore enabled
  - [ ] Environment variables configured in Vercel dashboard

## Policies
- [ ] **Unit Testing Enforcement**
  - [ ] All new logic must have passing `vitest` tests.
  - [ ] Check `.agent/workflows/implement_logic_with_tests.md` workflow.

## Documentation
- [x] Update `AGENT_SPEC.md` with actual implementation names
- [x] Update `PRD.md` to reflect current trade lifecycle (no Planned state)
- [x] Update `schwab-api-research.md` with implementation milestones
