/**
 * Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { z } from 'zod';
import type { BrowserContext } from 'playwright';
import type { Tool } from './tool.js';
import { defineTool } from './tool.js';
import type { Context } from '../context.js';

const electronEvaluateSchema = z.object({
  expression: z.string().describe('JavaScript expression to evaluate in the main Electron process'),
});

const electronWindowsSchema = z.object({});

const electronFirstWindowSchema = z.object({
  timeout: z.number().optional().describe('Maximum time to wait for the window in milliseconds'),
});

const electronBrowserWindowSchema = z.object({
  windowIndex: z.number().optional().describe('Index of the window to get BrowserWindow for (defaults to 0)'),
});

export default function electronTools(): Tool<any>[] {
  return [
    defineTool({
      capability: 'core',
      schema: {
        name: 'electron_evaluate',
        title: 'Evaluate JavaScript in Electron main process',
        description: 'Evaluate JavaScript expression in the main Electron process',
        inputSchema: electronEvaluateSchema,
        type: 'readOnly',
      },
      handle: async (context: Context, args: z.output<typeof electronEvaluateSchema>) => {
        const { browserContext } = await (context as any)._ensureBrowserContext();
        const electronApp = getElectronApp(browserContext);
        const result = await electronApp.evaluate(args.expression);
        return {
          code: [`electronApp.evaluate(${JSON.stringify(args.expression)})`],
          resultOverride: {
            content: [{
              type: 'text',
              text: JSON.stringify({ result, type: typeof result }, null, 2),
            }],
          },
          captureSnapshot: false,
          waitForNetwork: false,
        };
      },
    }),
    defineTool({
      capability: 'core',
      schema: {
        name: 'electron_windows',
        title: 'Get all Electron windows',
        description: 'Get all open Electron windows',
        inputSchema: electronWindowsSchema,
        type: 'readOnly',
      },
      handle: async (context: Context, args: z.output<typeof electronWindowsSchema>) => {
        const { browserContext } = await (context as any)._ensureBrowserContext();
        const electronApp = getElectronApp(browserContext);
        const windows = electronApp.windows();
        const windowInfo = await Promise.all(windows.map(async (window: any, index: number) => ({
          index,
          title: await window.title(),
          url: window.url(),
        })));
        return {
          code: [`electronApp.windows()`],
          resultOverride: {
            content: [{
              type: 'text',
              text: JSON.stringify({ count: windows.length, windows: windowInfo }, null, 2),
            }],
          },
          captureSnapshot: false,
          waitForNetwork: false,
        };
      },
    }),
    defineTool({
      capability: 'core',
      schema: {
        name: 'electron_first_window',
        title: 'Get first Electron window',
        description: 'Get the first window of the Electron application',
        inputSchema: electronFirstWindowSchema,
        type: 'readOnly',
      },
      handle: async (context: Context, args: z.output<typeof electronFirstWindowSchema>) => {
        const { browserContext } = await (context as any)._ensureBrowserContext();
        const electronApp = getElectronApp(browserContext);
        const window = await electronApp.firstWindow({ timeout: args.timeout });
        return {
          code: [`electronApp.firstWindow(${args.timeout ? `{ timeout: ${args.timeout} }` : ''})`],
          resultOverride: {
            content: [{
              type: 'text',
              text: JSON.stringify({
                title: await window.title(),
                url: window.url(),
              }, null, 2),
            }],
          },
          captureSnapshot: false,
          waitForNetwork: false,
        };
      },
    }),
    defineTool({
      capability: 'core',
      schema: {
        name: 'electron_browser_window',
        title: 'Get BrowserWindow object',
        description: 'Get BrowserWindow object for a specific window',
        inputSchema: electronBrowserWindowSchema,
        type: 'readOnly',
      },
      handle: async (context: Context, args: z.output<typeof electronBrowserWindowSchema>) => {
        const { browserContext } = await (context as any)._ensureBrowserContext();
        const electronApp = getElectronApp(browserContext);
        const windows = electronApp.windows();
        const windowIndex = args.windowIndex || 0;
        
        if (windowIndex >= windows.length) {
          throw new Error(`Window index ${windowIndex} is out of range. Available windows: ${windows.length}`);
        }
        
        const window = windows[windowIndex];
        const browserWindow = await electronApp.browserWindow(window);
        
        return {
          code: [`electronApp.browserWindow(electronApp.windows()[${windowIndex}])`],
          resultOverride: {
            content: [{
              type: 'text',
              text: JSON.stringify({
                windowIndex,
                browserWindow: 'BrowserWindow object available for further operations',
              }, null, 2),
            }],
          },
          captureSnapshot: false,
          waitForNetwork: false,
        };
      },
    }),
  ];
}

function getElectronApp(context: BrowserContext): any {
  // Access the Electron application through the context's internal properties
  // This is a bit hacky but necessary since the context doesn't directly expose the electron app
  const electronApp = (context as any)._electronApp || (context as any)._browser?._electronApp;
  if (!electronApp) {
    throw new Error('Electron application not found. Make sure you are using the electron browser type.');
  }
  return electronApp;
}