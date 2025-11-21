// scripts/testToolContexts.ts
/**
 * AI CONTEXT SELF-TEST SCRIPT (Windows-friendly)
 *
 * Scans src/tools/**/index.tsx and calls each tool handler (handleCalculate)
 * while intercepting updateToolContext to make sure the tool sends:
 *    { tool, inputs, results }
 *
 * Usage:
 *   npx ts-node scripts/testToolContexts.ts
 */

import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";

const TOOL_DIR = path.join(process.cwd(), "src", "tools");

interface TestResult {
  toolName: string;
  passed: boolean;
  message: string;
  context?: any;
}

const results: TestResult[] = [];

const fakeUpdateToolContext = (toolName: string, context: any) => {
  if (!context) {
    throw new Error("No context received.");
  }
  if (!context.tool) throw new Error("Missing 'tool' field.");
  if (!context.inputs) throw new Error("Missing 'inputs' field.");
  if (!context.results) throw new Error("Missing 'results' field.");
  if (typeof context.inputs !== "object") throw new Error("'inputs' is not an object.");
  if (typeof context.results !== "object") throw new Error("'results' is not an object.");
  if (!Object.keys(context.inputs).length) throw new Error("Inputs object is empty.");
  if (!Object.keys(context.results).length) throw new Error("Results object is empty.");

  return context;
};

const sampleInputs = {
  massFlow: 5,
  exhaustVelocity: 1500,
  airspeed: 40,
  density: 1.225,
  wingArea: 10,
  wingSpan: 10,
  angleOfAttack: 4,
  CLmax: 1.4,
  CD0: 0.02,
  e: 0.8,
  weight: 500,
  exitPressure: 90000,
  ambientPressure: 101325,
};

(async () => {
  console.log("====================================");
  console.log("🔍 AI CONTEXT SELF-TEST STARTED");
  console.log("====================================\n");

  if (!fs.existsSync(TOOL_DIR) || !fs.statSync(TOOL_DIR).isDirectory()) {
    console.error("Tool directory not found:", TOOL_DIR);
    process.exit(1);
  }

  const toolFolders = fs.readdirSync(TOOL_DIR);

  for (const toolFolder of toolFolders) {
    const toolPath = path.join(TOOL_DIR, toolFolder);

    if (!fs.statSync(toolPath).isDirectory()) continue;

    const indexFile = path.join(toolPath, "index.tsx");
    if (!fs.existsSync(indexFile)) {
      results.push({
        toolName: toolFolder,
        passed: false,
        message: "❌ index.tsx not found.",
      });
      continue;
    }

    try {
      // Convert the absolute file path to a file:// URL so import() works on Windows
      const fileUrl = pathToFileURL(indexFile).href;

      // Dynamically import the module (ESM loader wants file:// URLs on Windows)
      const toolModule: any = await import(fileUrl);

      // Detect a handler to call
      const handler =
        toolModule.handleCalculate ||
        toolModule.default?.handleCalculate ||
        null;

      if (!handler) {
        results.push({
          toolName: toolFolder,
          passed: false,
          message: "❌ No handleCalculate found.",
        });
        continue;
      }

      // Interceptor to capture the context the tool sends
      let capturedContext: any = null;
      const wrappedUpdate = (ctx: any) => {
        capturedContext = ctx;
      };

      // Some handlers expect parameters object; call defensively
      try {
        // If handler expects a single object argument, pass an object; otherwise best-effort.
        const maybePromise = handler({
          ...sampleInputs,
          updateToolContext: wrappedUpdate,
        });

        if (maybePromise && typeof maybePromise.then === "function") {
          await maybePromise;
        }
      } catch (invokeErr: any) {
        results.push({
          toolName: toolFolder,
          passed: false,
          message: "❌ Error executing handler: " + (invokeErr?.message || String(invokeErr)),
        });
        continue;
      }

      // Validate the captured context
      if (!capturedContext) {
        results.push({
          toolName: toolFolder,
          passed: false,
          message: "❌ No context sent via updateToolContext().",
        });
        continue;
      }

      if (!capturedContext.tool) {
        results.push({
          toolName: toolFolder,
          passed: false,
          message: "❌ Missing field: tool",
          context: capturedContext,
        });
        continue;
      }

      if (!capturedContext.inputs) {
        results.push({
          toolName: toolFolder,
          passed: false,
          message: "❌ Missing field: inputs",
          context: capturedContext,
        });
        continue;
      }

      if (!capturedContext.results) {
        results.push({
          toolName: toolFolder,
          passed: false,
          message: "❌ Missing field: results",
          context: capturedContext,
        });
        continue;
      }

      // All checks passed for this tool
      results.push({
        toolName: toolFolder,
        passed: true,
        message: "✅ Context OK",
        context: capturedContext,
      });
    } catch (err: any) {
      results.push({
        toolName: toolFolder,
        passed: false,
        message: "❌ Error: " + (err?.message || String(err)),
      });
    }
  }

  console.log("\n====================================");
  console.log("📊 AI CONTEXT SELF-TEST REPORT");
  console.log("====================================\n");

  for (const r of results) {
    console.log(`${r.passed ? "🟢" : "🔴"} ${r.toolName}: ${r.message}`);
    if (r.context) {
      console.log("   → tool:", r.context.tool);
      console.log("   → inputs keys:", Object.keys(r.context.inputs));
      console.log("   → results keys:", Object.keys(r.context.results));
    }
  }

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log("\n====================================");
  console.log(`✔ Passed: ${passed}`);
  console.log(`✘ Failed: ${failed}`);
  console.log("====================================\n");

  if (failed === 0) {
    console.log("🎉 ALL TOOLS ARE SENDING VALID AI CONTEXT!");
  } else {
    console.log("⚠ Some tools need fixes. See errors above.");
  }
})();
