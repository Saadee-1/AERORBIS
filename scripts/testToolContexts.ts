// scripts/testToolContexts.ts
/**
 * AI CONTEXT SELF-TEST SCRIPT (Windows-friendly)
 *
 * Scans each src/tools/<tool>/index.tsx file and calls its tool handler (handleCalculate)
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
  // TODO: refine type for `context` — changed any -> unknown automatically by chore/typed-cleanup
  context?: unknown;
}

const results: TestResult[] = [];

// TODO: refine type for `context` — changed any -> unknown automatically by chore/typed-cleanup
const fakeUpdateToolContext = (toolName: string, context: unknown) => {
  if (!context) {
    throw new Error("No context received.");
  }
  const ctx = context as Record<string, unknown>;
  if (!ctx.tool) throw new Error("Missing 'tool' field.");
  if (!ctx.inputs) throw new Error("Missing 'inputs' field.");
  if (!ctx.results) throw new Error("Missing 'results' field.");
  if (typeof ctx.inputs !== "object") throw new Error("'inputs' is not an object.");
  if (typeof ctx.results !== "object") throw new Error("'results' is not an object.");
  if (!Object.keys(ctx.inputs as object).length) throw new Error("Inputs object is empty.");
  if (!Object.keys(ctx.results as object).length) throw new Error("Results object is empty.");

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
      // TODO: refine type for `toolModule` — changed any -> unknown automatically by chore/typed-cleanup
      const toolModule: unknown = await import(fileUrl);

      // Detect a handler to call
      const mod = toolModule as Record<string, unknown>;
      const handler =
        (mod.handleCalculate as (...args: unknown[]) => unknown) ||
        ((mod.default as Record<string, unknown>)?.handleCalculate as (...args: unknown[]) => unknown) ||
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
      // TODO: refine type for `capturedContext` — changed any -> unknown automatically by chore/typed-cleanup
      let capturedContext: unknown = null;
      // TODO: refine type for `ctx` — changed any -> unknown automatically by chore/typed-cleanup
      const wrappedUpdate = (ctx: unknown) => {
        capturedContext = ctx;
      };

      // Some handlers expect parameters object; call defensively
      try {
        // If handler expects a single object argument, pass an object; otherwise best-effort.
        const maybePromise = handler({
          ...sampleInputs,
          updateToolContext: wrappedUpdate,
        }) as unknown;

        if (maybePromise && typeof (maybePromise as { then?: unknown }).then === "function") {
          await (maybePromise as Promise<unknown>);
        }
      } catch (invokeErr: unknown) {
        results.push({
          toolName: toolFolder,
          passed: false,
          message: "❌ Error executing handler: " + ((invokeErr as Error)?.message || String(invokeErr)),
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

      const ctx = capturedContext as Record<string, unknown>;
      if (!ctx.tool) {
        results.push({
          toolName: toolFolder,
          passed: false,
          message: "❌ Missing field: tool",
          context: capturedContext,
        });
        continue;
      }

      if (!ctx.inputs) {
        results.push({
          toolName: toolFolder,
          passed: false,
          message: "❌ Missing field: inputs",
          context: capturedContext,
        });
        continue;
      }

      if (!ctx.results) {
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
    } catch (err: unknown) {
      results.push({
        toolName: toolFolder,
        passed: false,
        message: "❌ Error: " + ((err as Error)?.message || String(err)),
      });
    }
  }

  console.log("\n====================================");
  console.log("📊 AI CONTEXT SELF-TEST REPORT");
  console.log("====================================\n");

  for (const r of results) {
    console.log(`${r.passed ? "🟢" : "🔴"} ${r.toolName}: ${r.message}`);
    if (r.context) {
      const ctx = r.context as Record<string, unknown>;
      console.log("   → tool:", ctx.tool);
      console.log("   → inputs keys:", Object.keys(ctx.inputs as object));
      console.log("   → results keys:", Object.keys(ctx.results as object));
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
