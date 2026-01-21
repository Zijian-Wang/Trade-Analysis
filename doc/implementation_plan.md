# Trade Analysis — Testing & Maintenance Plan

## Summary
Phases 1-4 (Features, UI, Visualization, Bug Fixes) are complete. The project is now in a **Maintenance & Quality Assurance** phase. The primary objective is to enforce strict unit testing for all logic and prevent regressions.

---

## Current Focus: Testing Policy Enforcement

**Goal**: Ensure every Logic Component has a corresponding Unit Test.

### Policy
> **Every time a logic code is created and completed, there needs to be a valid unit test... the process cannot proceed if unit test is not completed.**

### workflows
- **New Logic**: Follow `.agent/workflows/implement_logic_with_tests.md`
- **Verification**: Use `.agent/workflows/verify_feature.md` for UI/Browser testing.

---

## TODOs (Maintenance)

- [ ] **Audit Existing Logic**
  - [ ] Check `tradeService.ts` coverage
  - [ ] Check `riskCalculator.ts` coverage
  - [ ] Check `marketDataService` (if exists) or chart logic
- [ ] **Backfill Tests**
  - [ ] Create tests for any uncovered utility functions
- [ ] **UI/Integration Tests**
  - [ ] Add more browser verification scenarios to `.agent/workflows/`

---

## Recent Completions (Phase 4)

| Feature | Implementation | Verified |
| :--- | :--- | :--- |
| **MarketChart Stability** | `ResizeObserver` in `MarketChart.tsx` | ✅ Build Passed |
| **Safe Close Action** | `ConfirmDialog` in `ActivePositionsPage` | ✅ Build Passed |
| **Syntax Fixes** | Fixed duplicate function in `ActivePositionsPage` | ✅ Build Passed |

---

## Verification Plan (Ongoing)

Before marking any future task as "Done":
1.  **Unit Tests**: Run `npm test` (vitest). Must pass.
2.  **Build**: Run `npm run build`. Must pass.
3.  **UI Check**: Run `npm run dev` and verify locally or via browser agent.
