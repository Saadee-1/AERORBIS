// scripts/testToolContexts.ts

/**
 * AI CONTEXT SELF-TEST SCRIPT
 * -------------------------------------
 * This script validates that EVERY tool in Aeroverse
 * provides a clean and canonical AI context:
 *
 *    { tool, inputs, results }
 *
 * It dynamically imports each calculator,
 * calls its calculation handler with synthetic inputs,
 * intercepts updateToolContext,
 * and reports PASS/FAIL for all tools.
 */

import fs from "fs";
import path from "path";

const TOOL_DIR = path.join(process.cwd(), "src/tools");

interface TestResult {
  toolName: string;
  passed: boolean;
  message: string;
  context?: any;
}

const results: TestResult[] = [];

/** Fake updateToolContext to capture what tools send */
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

/** Synthetic test inputs for most tools */
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
  weight: 600,
  pressureAmbient: 101325,
  pressureExit: 95000,
};

/** Main test runner */
(async () => {
  console.log("====================================");
  console.log("🔍 AI CONTEXT SELF-TEST STARTED");
  console.log("====================================\n");

  const toolFolders = fs.readdirSync(TOOL_DIR);

  for (const toolFolder of toolFolders) {
    const toolPath = path.join(TOOL_DIR, toolFolder);

    if (!fs.statSync(toolPath).isDirectory()) continue;

    const indexFile = path.join(toolPath, "index.tsx");
    if (!fs.existsSync(indexFile)) continue;

    try {
      const toolModule = await import(indexFile);

      // Find handler (most tools export handleCalculate or similar)
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

      // Wrap updateToolContext to intercept output
      let capturedContext: any = null;
      const wrappedUpdate = (ctx: any) => {
        capturedContext = fakeUpdateToolContext(toolFolder, ctx);
      };

      // Call handler
      await handler({
        ...sampleInputs,
        updateToolContext: wrappedUpdate,
      });

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
        message: "❌ Error: " + err.message,
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
