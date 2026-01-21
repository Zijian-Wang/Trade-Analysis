---
description: Verify a feature or bug fix using the browser subagent
---

1.  **Analyze the Requirement**: Identify the specific feature or bug to be verified.
2.  **Define the Test Case**:
    *   **Pre-conditions**: What state must the app be in? (e.g., Logged in, Settings configured)
    *   **Action**: What steps should the agent take? (e.g., Click 'Add', Type 'AAPL')
    *   **Expected Result**: What should exist on the screen? (e.g., 'Chart visible', 'Success message')
3.  **Launch Browser Subagent**:
    *   Use `browser_subagent` tool.
    *   **TaskName**: "Verifying [Feature Name]".
    *   **Task**: "Navigate to `http://localhost:5173`. [Insert Steps]. Verify [Expected Result]. Return a summary of what worked and what didn't. take a screenshot if it fails."
    *   **RecordingName**: "[feature_name]_verification".
4.  **Review Output**:
    *   Check the subagent's report.
    *   Check the recorded video/screenshots in the artifacts directory.
5.  **Iterate**: If verification fails, debug, fix, and repeat step 3.
