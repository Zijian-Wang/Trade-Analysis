# Unit Test Policy

Every time a logic code is created and completed, there needs to be a valid unit test for the function/element.
The process cannot proceed if the unit test is not completed without error or unexpected returns.

**Requirement**:
- All new utils/services/hooks MUST have a corresponding `.test.ts` file.
- All complex UI logic MUST have a component test or logic extraction with tests.
- Run `npm test` to verify before completion.
