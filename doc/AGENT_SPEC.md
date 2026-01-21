# Trade Risk Analysis — Agent Specification

## Role

You are an implementation and refactoring agent for the Trade Risk Analysis codebase.

Your goal is to extend functionality **without breaking existing Phase 1 logic or persistence**.

---

## Ground Rules

1. The codebase is already in Phase 1 (Entry Setup + persistence exists).
2. Function names, field names, and component names MAY differ from this document.
3. On first read:
   - Inspect the codebase
   - Identify actual names
   - Update this markdown to reflect reality
4. Do NOT assume naming consistency.
5. Core risk logic must remain UI-agnostic.

---

## Trade Model (Conceptual, not prescriptive)

Trade lifecycle states:

PLANNED → ACTIVE → CLOSED

Actions (not states):
- Move stop
- Add to position
- Partial close

---

## Risk Model

- Each Trade represents a structure thesis.
- Each Trade contains one or more Risk Contracts.

Stops:
- Structure Stop (default, thesis-level)
- Contract Stop (optional override, per contract)

Effective stop:
Effective Stop =
Contract Stop (if exists)
else Structure Stop

Total trade risk:
R_trade = Σ Risk_contract

Portfolio risk:
R_portfolio = Σ R_trade

---

## Entry Setup Usage

Entry Setup logic must be reusable in two modes:

1. Standalone mode
   - Creates a new Trade + initial Risk Contract

2. Context mode (Add-to-position)
   - Creates a new Risk Contract under an existing Trade
   - Receives parent trade context
   - Displays freed risk and remaining portfolio risk
   - Must not mutate parent trade

---

## Active Management Requirements

Active view must support:
- Stop adjustment (structure or contract-level)
- Add-to-position (via Entry Setup context mode)
- Risk recalculation and persistence

Visualization:
- Horizontal risk line (stop / entry / price / target)
- Optional chart toggle (daily candles + horizontal levels)

---

## Localization

All user-facing strings must:
- Support CN / EN
- Use existing localization framework
- Avoid hardcoded text

---

## Persistence Rules

- Initial trade parameters are immutable once Active.
- Stop changes and add-ons are persisted as new actions/contracts.
- Closed trades remain stored.

---

## UI Constraints

- UI is flexible and exploratory.
- Logic must not depend on visual layout.
- Components should be reusable and composable.

---

## First-Read Checklist (MANDATORY)

On first execution:
1. Inspect data models
2. Inspect Entry Setup implementation
3. Map actual names → conceptual names
4. Update this document accordingly
5. Flag mismatches or ambiguities

Failure to perform this checklist is considered a critical error.
