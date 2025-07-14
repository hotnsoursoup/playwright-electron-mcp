# Electron App Testing Example

This example shows how to test an Electron application using the Playwright Electron MCP.

## Configuration

First, configure the MCP to point to your Electron app:

```json
{
  "mcpServers": {
    "playwright-electron": {
      "command": "npx",
      "args": [
        "@hotnsoursoup/playwright-mcp-electron@latest",
        "--config", "electron-config.json"
      ]
    }
  }
}
```

With `electron-config.json`:

```json
{
  "browser": {
    "browserName": "electron",
    "launchOptions": {
      "args": ["main.js"],
      "executablePath": "electron",
      "cwd": "/path/to/your/electron/app"
    }
  }
}
```

## Example Test Workflow

### 1. Launch and Get App Info

```javascript
// The Electron app launches automatically when MCP starts

// Get app version from main process
await electron_evaluate({ 
  expression: "app.getVersion()" 
});

// List all windows
await electron_windows();
```

### 2. Interact with the Application

```javascript
// Click a button in the renderer
await browser_click({ 
  element: "Login button",
  ref: "button[data-testid='login']" 
});

// Type in an input field
await browser_type({ 
  element: "Username field",
  ref: "input[name='username']",
  text: "testuser@example.com" 
});

// Take a screenshot
await browser_take_screenshot({ 
  filename: "login-screen.png" 
});
```

### 3. Access Main Process APIs

```javascript
// Get app paths
await electron_evaluate({ 
  expression: "app.getPath('userData')" 
});

// Check if app is ready
await electron_evaluate({ 
  expression: "app.isReady()" 
});

// Get system information
await electron_evaluate({ 
  expression: "process.versions" 
});
```

### 4. Window Management

```javascript
// Get the first window
await electron_first_window();

// Minimize/maximize windows
await electron_evaluate({ 
  expression: `
    const { BrowserWindow } = require('electron');
    const win = BrowserWindow.getAllWindows()[0];
    win.minimize();
  ` 
});
```

## Complete Example: Testing a Todo App

```javascript
// 1. Launch the app (automatic)

// 2. Verify app loaded
const windows = await electron_windows();
console.log(`App has ${windows.count} windows open`);

// 3. Add a new todo
await browser_click({ 
  element: "Add todo button",
  ref: "button.add-todo" 
});

await browser_type({ 
  element: "Todo input",
  ref: "input.todo-input",
  text: "Test the Electron app with MCP",
  submit: true 
});

// 4. Verify todo was added
await browser_snapshot();

// 5. Check app state from main process
const todoCount = await electron_evaluate({ 
  expression: `
    const { webContents } = require('electron');
    const contents = webContents.getAllWebContents()[0];
    contents.executeJavaScript('document.querySelectorAll(".todo-item").length');
  ` 
});

// 6. Save app data
await electron_evaluate({ 
  expression: `
    const fs = require('fs');
    const path = require('path');
    const { app } = require('electron');
    const dataPath = path.join(app.getPath('userData'), 'todos.json');
    // Save logic here
  ` 
});
```

## Tips

1. **Electron Path**: Make sure `electron` is in your PATH or specify the full path
2. **App Structure**: Your app's `main.js` should be in the `cwd` directory
3. **Debugging**: Use `browser_console_messages()` to see console output
4. **Screenshots**: Vision mode works with Electron apps too using `--vision` flag