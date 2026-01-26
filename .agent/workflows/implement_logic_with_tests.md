---
description: Implement logic with mandatory unit tests (Vitest)
---

1.  **Analyze**: Understand the logic requirements and edge cases.
2.  **Implement**: Write the function/component logic.
3.  **Test Creation**:
    *   Create a test file `[filename].test.ts` (or `.test.tsx`).
    *   Import the function/component.
    *   Write `describe` and `it` blocks covering:
        *   **Happy Path**: Expected valid inputs.
        *   **Edge Cases**: Nulls, empty strings, limits (0, negative).
        *   **Error Handling**: Ensure errors are thrown/caught as expected.
4.  **Execute Tests**:
    *   Run `npx vitest run [filename]` or `npm test`.
5.  **Refine**:
    *   If tests fail, debug and fix the implementation or test.
    *   **CRITICAL**: Do not mark the task as done until tests pass.
6.  **Verify**: Ensure no regressions in related code.
