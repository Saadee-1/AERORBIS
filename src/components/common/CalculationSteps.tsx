/**
 * Shared component for rendering calculation steps in a clean, textbook-like style
 * Supports both string array format and structured CalculationStep format
 * Only creates steps when explicit "Step" headings are found
 */

export interface CalculationStep {
  equation: string;
  description: string;
}

export interface CalculationStepsProps {
  steps: string[] | CalculationStep[];
  className?: string;
}

interface ParsedStep {
  title: string;        // e.g. "Step 1: Calculate Aspect Ratio (AR)"
  equation?: string;    // the main equation line, if any
  bodyLines: string[];  // any extra explanation lines
}

interface ParsedMetadata {
  airfoil?: string;
  given?: string;
  interpretation?: string;
}

/**
 * Parse steps text into structured format
 * Only creates steps when explicit "Step" headings are found
 */
function parseSteps(steps: string[] | CalculationStep[]): {
  meta: ParsedMetadata;
  steps: ParsedStep[];
  preamble: string[];
} {
  const meta: ParsedMetadata = {};
  const parsedSteps: ParsedStep[] = [];
  const preamble: string[] = [];

  // Step title regex: matches "Step", "**Step**", "Step 1:", "Step 1.", "Step 1-", etc.
  const stepTitleRegex = /^\s*\**Step\s*\d*[:.)-]?\s*/i;

  // Check if it's structured format
  const isStructuredFormat = steps.length > 0 && typeof steps[0] !== 'string';
  
  // If structured format, handle separately (don't create fake Step headings)
  if (isStructuredFormat) {
    // For structured format, return empty steps array - will be handled in render
    return { meta, steps: [], preamble: [] };
  }

  // String format: split each step string by newlines
  const lines: string[] = [];
  (steps as string[]).forEach(step => {
    lines.push(...step.split(/\r?\n/));
  });

  let currentStep: ParsedStep | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip empty lines
    if (!trimmed) {
      continue;
    }

    // Check for metadata lines
    const airfoilMatch = trimmed.match(/^\*\*Airfoil:\*\*\s*(.+)$/i) || trimmed.match(/^Airfoil:\s*(.+)$/i);
    if (airfoilMatch) {
      if (currentStep) {
        parsedSteps.push(currentStep);
        currentStep = null;
      }
      meta.airfoil = airfoilMatch[1].trim();
      continue;
    }

    const givenMatch = trimmed.match(/^\*\*Given:\*\*\s*(.+)$/i) || trimmed.match(/^Given:\s*(.+)$/i);
    if (givenMatch) {
      if (currentStep) {
        parsedSteps.push(currentStep);
        currentStep = null;
      }
      // Given can span multiple lines, so start collecting
      meta.given = givenMatch[1].trim();
      continue;
    }

    // Continue collecting Given if we're in a Given block (next lines after "Given:")
    if (meta.given !== undefined && !stepTitleRegex.test(trimmed) && !trimmed.match(/^\*\*Interpretation:/i)) {
      meta.given += '\n' + trimmed;
      continue;
    }

    const interpretationMatch = trimmed.match(/^\*\*Interpretation:\*\*\s*(.+)$/i) || trimmed.match(/^Interpretation:\s*(.+)$/i);
    if (interpretationMatch) {
      if (currentStep) {
        parsedSteps.push(currentStep);
        currentStep = null;
      }
      meta.interpretation = interpretationMatch[1].trim();
      continue;
    }

    // Continue collecting Interpretation if we're in an Interpretation block
    if (meta.interpretation !== undefined && !stepTitleRegex.test(trimmed)) {
      meta.interpretation += '\n' + trimmed;
      continue;
    }

    // Check if this is a step title line
    if (stepTitleRegex.test(trimmed)) {
      // Save previous step if it exists
      if (currentStep && (currentStep.equation || currentStep.bodyLines.length > 0)) {
        parsedSteps.push(currentStep);
      }
      
      // Remove leading ** if present, but keep the rest
      const cleanTitle = trimmed.replace(/^\*\*/, '').replace(/\*\*$/, '').trim();
      currentStep = {
        title: cleanTitle,
        equation: undefined,
        bodyLines: [],
      };
      continue;
    }

    // If we have a current step, add this line to it
    if (currentStep) {
      // If equation is not set yet and this line looks like an equation (contains =)
      if (!currentStep.equation && trimmed.includes('=')) {
        currentStep.equation = trimmed;
      } else {
        // Add to body lines
        currentStep.bodyLines.push(trimmed);
      }
    } else {
      // No current step - this is preamble text (before any Step headings)
      preamble.push(trimmed);
    }
  }

  // Save last step if it exists
  if (currentStep && (currentStep.equation || currentStep.bodyLines.length > 0)) {
    parsedSteps.push(currentStep);
  }

  return { meta, steps: parsedSteps, preamble };
}

export function CalculationSteps({ steps, className = "" }: CalculationStepsProps) {
  if (!steps || steps.length === 0) {
    return (
      <div className={`text-sm text-slate-400 ${className}`}>
        No calculation steps available.
      </div>
    );
  }

  const { meta, steps: parsedSteps, preamble } = parseSteps(steps);

  // If structured format, render it without Step headings
  const isStructuredFormat = steps.length > 0 && typeof steps[0] !== 'string';
  if (isStructuredFormat) {
    return (
      <div className={`space-y-4 text-sm leading-relaxed text-slate-100 ${className}`}>
        {(steps as CalculationStep[]).map((step, i) => (
          <div key={i} className="mb-4">
            {step.equation && (
              <p className="text-base sm:text-lg text-slate-100 text-center font-mono mb-1">
                {step.equation}
              </p>
            )}
            {step.description && (
              <p className="text-sm text-slate-300">
                {step.description}
              </p>
            )}
          </div>
        ))}
      </div>
    );
  }

  // If no steps were found (no Step headings), just render as plain text
  if (parsedSteps.length === 0) {
    // Combine preamble and any remaining text
    const allText = [...preamble];
    
    // String format without Step headings - render as paragraphs
    return (
      <div className={`text-sm text-slate-200 whitespace-pre-wrap leading-relaxed ${className}`}>
        {allText.join('\n')}
      </div>
    );
  }

  return (
    <div className={`space-y-4 text-sm leading-relaxed text-slate-100 ${className}`}>
      {/* Preamble text (before any Step headings) */}
      {preamble.length > 0 && (
        <div className="text-slate-200 whitespace-pre-wrap mb-4">
          {preamble.join('\n')}
        </div>
      )}

      {/* Metadata section */}
      {(meta.airfoil || meta.given || meta.interpretation) && (
        <div className="space-y-2 mb-6 pb-4 border-b border-slate-700/50">
          {meta.airfoil && (
            <p className="text-sm font-semibold text-sky-300 mb-1">
              Airfoil: <span className="font-normal text-slate-100">{meta.airfoil}</span>
            </p>
          )}
          {meta.given && (
            <div className="text-slate-200">
              <p className="text-sm font-semibold text-sky-300 mb-1">Given:</p>
              <p className="text-slate-100 whitespace-pre-wrap">{meta.given}</p>
            </div>
          )}
        </div>
      )}

      {/* Calculation steps */}
      <div className="space-y-5">
        {parsedSteps.map((step, i) => (
          <div key={i} className="mb-5">
            <p className="text-sm font-semibold text-sky-300">
              {step.title}
            </p>
            {step.equation && (
              <p className="mt-2 text-base sm:text-lg text-slate-100 text-center font-mono">
                {step.equation}
              </p>
            )}
            {step.bodyLines.length > 0 && (
              <p className="mt-1 text-sm text-slate-200 whitespace-pre-wrap">
                {step.bodyLines.join('\n')}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Interpretation at bottom */}
      {meta.interpretation && (
        <p className="mt-4 text-sm italic text-slate-300 whitespace-pre-wrap pt-2 border-t border-slate-700/50">
          <span className="font-semibold text-sky-300">Interpretation:</span>{' '}
          {meta.interpretation}
        </p>
      )}
    </div>
  );
}