---
name: playwright
description: Browser automation and testing via Playwright MCP server. Navigate, interact, screenshot, and assert web application behavior.
---

# Playwright

Browser automation and end-to-end testing via the Playwright MCP (Model Context Protocol) server. Use this skill to interact with web applications — navigate pages, fill forms, click buttons, take screenshots, and assert DOM state.

**This skill requires an external MCP server** — it is not a CLI-based tool.

---

## When to Activate

- User asks to test a web application interactively
- End-to-end testing of a web UI
- Visual verification of UI changes
- Debugging UI issues that require browser interaction
- User says "test in browser", "check the UI", "open the page"

---

## Prerequisites

### MCP Server Required

The Playwright MCP server must be configured in your OpenCode setup. Add to your `opencode.json`:

```json
{
  "mcp": {
    "playwright": {
      "command": "npx",
      "args": ["@anthropic/mcp-playwright"]
    }
  }
}
```

Or use the Docker variant:

```json
{
  "mcp": {
    "playwright": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "mcr.microsoft.com/playwright/mcp"]
    }
  }
}
```

### Fallback When MCP is Unavailable

If the Playwright MCP server is not configured:

1. Report to the user: "Playwright MCP server is not available. Install it with: `npm install -g @anthropic/mcp-playwright`"
2. Suggest alternatives:
   - Write Playwright test scripts that the user can run manually
   - Use `curl` for API-level testing
   - Describe expected UI behavior for manual verification

---

## Available MCP Tools

When the Playwright MCP server is running, these tools are available:

| Tool | Description |
|------|-------------|
| `playwright_navigate` | Navigate to a URL |
| `playwright_screenshot` | Take a screenshot of the current page |
| `playwright_click` | Click an element (by selector or text) |
| `playwright_fill` | Fill an input field |
| `playwright_select` | Select from a dropdown |
| `playwright_evaluate` | Execute JavaScript in the browser |
| `playwright_get_text` | Get text content of an element |
| `playwright_wait_for` | Wait for an element or condition |

---

## Workflow

### 1. Start the Application

Ensure the application is running locally:

```bash
# Check if already running
curl -s http://localhost:<port> > /dev/null 2>&1 && echo "Running" || echo "Not running"

# Start if needed (use the project's dev command)
<packageManager> run dev &
```

### 2. Navigate and Interact

Use MCP tools to interact with the application:

```
Navigate to http://localhost:<port>
Screenshot the page
Click on "Login" button
Fill the email field with "test@example.com"
Screenshot to verify the form state
```

### 3. Assert and Verify

Check that the UI matches expectations:

```
Get text of the ".welcome-message" element
Screenshot the final state
```

### 4. Report Results

Return:

1. **What was tested** — pages visited, interactions performed
2. **Screenshots** — key states captured
3. **Issues found** — any UI bugs or unexpected behavior
4. **Pass/Fail** — overall assessment

---

## Writing Playwright Tests

For persistent test coverage, write Playwright test files:

```typescript
import {test, expect} from '@playwright/test';

test('should display welcome message after login', async ({page}) => {
    await page.goto('http://localhost:3000');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await expect(page.locator('.welcome-message')).toHaveText('Welcome, Test User');
});
```

Place test files following the project's existing pattern (e.g., `e2e/`, `tests/`, `__tests__/`).

---

## Rules

- **Always screenshot key states** — before and after interactions, to document what happened
- **Use stable selectors** — prefer `data-testid`, `role`, or semantic selectors over fragile CSS classes
- **Wait for readiness** — use `waitFor` before asserting on elements that load asynchronously
- **Report MCP unavailability** — if tools are missing, tell the user how to install the MCP server
- **Do not assume the app is running** — check first, start if needed
