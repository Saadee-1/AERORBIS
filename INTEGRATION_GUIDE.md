# Quick Guide: Adding AI Integration to Tools

## Steps to Add to Any Tool

### 1. Update Tool Component

```tsx
import { useToolContext } from "@/hooks/useToolContext";
import { PDFExportButton } from "@/components/tools/PDFExportButton";

const YourTool = () => {
  const { updateToolContext, sendCalculationEvent } = useToolContext();
  const [lastRequestId, setLastRequestId] = useState<string | null>(null);
  
  // In your calculation function:
  const calculate = async () => {
    // ... your calculation logic ...
    
    const result = { /* your results */ };
    
    // Prepare calculation steps (machine-friendly format)
    const steps = [
      "Step 1: Formula with numeric substitution",
      "Step 2: Next step...",
      // etc.
    ];
    
    // Send calculation event
    const eventResponse = await sendCalculationEvent({
      toolId: "your-tool-id",
      toolName: "Your Tool Name",
      inputs: { /* original inputs */ },
      results: { /* numeric results */ },
      steps: steps,
      metadata: {
        units: unitSystem,
        approxLevel: "analytic" | "hybrid" | "empirical",
        confidence: "high" | "medium" | "low",
        warnings: [] // any warnings
      }
    });
    
    if (eventResponse) {
      setLastRequestId(eventResponse.requestId);
    }
    
    // Update tool context (existing)
    updateToolContext({
      tool: "YourTool",
      inputs: { /* formatted inputs */ },
      results: { /* formatted results */ }
    });
  };
  
  // In your results UI:
  return (
    <div>
      {result && (
        <div>
          <div className="flex justify-between">
            <h3>Results</h3>
            <PDFExportButton 
              requestId={lastRequestId} 
              toolName="Your Tool Name"
              disabled={!lastRequestId}
            />
          </div>
          {/* Your results display */}
        </div>
      )}
    </div>
  );
};
```

### 2. Calculation Steps Format

Steps should be machine-readable with formulas and numeric substitution:

```tsx
const steps = [
  `Formula: E = mc²`,
  `Substitution: E = ${mass} × ${c}²`,
  `Result: E = ${energy} J`
];
```

### 3. Metadata Guidelines

- **approxLevel**: 
  - `"analytic"` - Exact formulas (e.g., lift equation)
  - `"hybrid"` - Mix of analytic and empirical
  - `"empirical"` - Data-driven approximations

- **confidence**:
  - `"high"` - Well-established formulas, validated
  - `"medium"` - Good approximations, some assumptions
  - `"low"` - Rough estimates, many assumptions

### 4. Example: Thrust Calculator

```tsx
const eventResponse = await sendCalculationEvent({
  toolId: "thrust-calculator",
  toolName: "Thrust Calculator",
  inputs: {
    massFlow: mDot,
    exhaustVelocity: Ve,
    exitPressure: Pe,
    ambientPressure: Pa,
    exitArea: Ae
  },
  results: {
    thrust: T,
    specificImpulse: Isp,
    effectiveExhaustVelocity: Ve_eff
  },
  steps: [
    `Thrust: T = ṁ × Ve + (Pe - Pa) × Ae`,
    `T = ${mDot} × ${Ve} + (${Pe} - ${Pa}) × ${Ae}`,
    `T = ${T} N`,
    `Isp: Isp = Ve / g₀ = ${Ve} / 9.80665 = ${Isp} s`
  ],
  metadata: {
    units: unitSystem,
    approxLevel: "analytic",
    confidence: "high"
  }
});
```

## Testing

1. Run a calculation
2. Check browser console for event response
3. Verify requestId is stored
4. Test PDF export button
5. Test follow-up Q&A in AI assistant

