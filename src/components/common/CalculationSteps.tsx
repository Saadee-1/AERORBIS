/**
 * Shared component for rendering calculation steps in a clean, textbook-like style
 * Supports both string array format and structured CalculationStep format
 */

export interface CalculationStep {
  equation: string;
  description: string;
}

export interface CalculationStepsProps {
  steps: string[] | CalculationStep[];
  className?: string;
}

/**
 * Parse a step string to extract title, equation, and description
 * Handles formats like:
 * - "Lift Coefficient: CL = CL₀ + CL_α × α = 0.5 + 0.1 × 10° = 1.5"
 * - "**Airfoil:** NACA 2412"
 * - "**Given:** α = 10°, V = 50 m/s"
 */
function parseStepString(step: string, index: number): {
  title: string;
  equation: string | null;
  description: string | null;
  isMetadata: boolean;
} {
  const trimmed = step.trim();
  
  // Check for bold headings like "**Airfoil:**" or "**Given:**" or "**Interpretation:**"
  const boldHeadingMatch = trimmed.match(/^\*\*(.+?):\*\*\s*(.+)$/);
  if (boldHeadingMatch) {
    return {
      title: boldHeadingMatch[1],
      equation: null,
      description: boldHeadingMatch[2],
      isMetadata: true,
    };
  }
  
  // Check for equation patterns: "Label: formula = calculation"
  // Example: "Lift Coefficient: CL = CL₀ + CL_α × α = 0.5 + 0.1 × 10° = 1.5"
  const equationMatch = trimmed.match(/^(.+?):\s*(.+)$/);
  if (equationMatch) {
    const label = equationMatch[1].trim();
    const rest = equationMatch[2].trim();
    
    // If rest contains "=", it's an equation
    if (rest.includes('=')) {
      return {
        title: label,
        equation: rest,
        description: null,
        isMetadata: false,
      };
    } else {
      // Just a label with description
      return {
        title: label,
        equation: null,
        description: rest,
        isMetadata: false,
      };
    }
  }
  
  // Check if it's a pure equation (contains "=" and math symbols)
  if (trimmed.includes('=') && /[×÷\+\-\^²³°]/.test(trimmed)) {
    return {
      title: `Step ${index + 1}`,
      equation: trimmed,
      description: null,
      isMetadata: false,
    };
  }
  
  // Default: treat as description
  return {
    title: `Step ${index + 1}`,
    equation: null,
    description: trimmed,
    isMetadata: false,
  };
}

export function CalculationSteps({ steps, className = "" }: CalculationStepsProps) {
  if (!steps || steps.length === 0) {
    return (
      <div className={`text-sm text-slate-400 ${className}`}>
        No calculation steps available.
      </div>
    );
  }

  // Normalize steps to a common format
  const metadata: Array<{ title: string; description: string | null }> = [];
  const calculationSteps: Array<{
    title: string;
    equation: string | null;
    description: string | null;
  }> = [];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    
    if (typeof step === 'string') {
      // String format: parse it
      const parsed = parseStepString(step, i);
      
      // Handle metadata lines (Airfoil, Given, Interpretation)
      if (parsed.isMetadata) {
        metadata.push({
          title: parsed.title,
          description: parsed.description,
        });
      } else {
        // Regular calculation step
        calculationSteps.push({
          title: parsed.title,
          equation: parsed.equation,
          description: parsed.description,
        });
      }
    } else {
      // Structured format: { equation, description }
      calculationSteps.push({
        title: `Step ${i + 1}`,
        equation: step.equation,
        description: step.description,
      });
    }
  }

  return (
    <div className={`space-y-4 text-sm leading-relaxed text-slate-100 ${className}`}>
      {/* Metadata section */}
      {metadata.length > 0 && (
        <div className="space-y-2 mb-6 pb-4 border-b border-slate-700/50">
          {metadata.map((meta, i) => (
            <div key={i}>
              {meta.title === 'Airfoil' && (
                <p className="text-slate-200">
                  <span className="font-semibold text-sky-300">Airfoil:</span>{' '}
                  <span className="text-slate-100">{meta.description}</span>
                </p>
              )}
              {meta.title === 'Given' && (
                <div className="text-slate-200">
                  <p className="font-semibold text-sky-300 mb-1">Given:</p>
                  <p className="text-slate-100 whitespace-pre-wrap">{meta.description}</p>
                </div>
              )}
              {meta.title === 'Interpretation' && (
                <p className="text-slate-300 italic mt-4 pt-2 border-t border-slate-700/50">
                  <span className="font-semibold text-sky-300">Interpretation:</span>{' '}
                  {meta.description}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Calculation steps */}
      <div className="space-y-5">
        {calculationSteps.map((step, i) => (
          <div key={i} className="mb-5">
            <p className="text-sm font-semibold text-sky-300">
              {step.title}
            </p>
            {step.equation && (
              <p className="mt-2 text-base sm:text-lg text-slate-100 text-center font-mono">
                {step.equation}
              </p>
            )}
            {step.description && (
              <p className="mt-1 text-sm text-slate-300">
                {step.description}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

