/**
 * Shared component for rendering calculation steps in a clean, textbook-like style
 * Supports both string array format and structured CalculationStep format
 * Only creates steps when explicit "Step" headings are found
 * Parses equations with 2+ '=' into Formula / Put values / Result format
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

interface EquationStep {
  label: string;          // e.g. "Find AR"
  formulaLine: string;    // e.g. "AR = b² / S"
  valuesLine: string;     // e.g. "= 2.00² / 1.50"
  resultLine: string;     // e.g. "2.67"
}

interface ParsedMetadata {
  airfoil?: string;
  given?: string;
  interpretation?: string;
}

/**
 * Check if a symbol is a simple engineering variable name
 */
function isSimpleSymbol(symbol: string): boolean {
  // Common engineering symbols: AR, k, CL, CD, CDi, q, L, D, L/D, Re, etc.
  const simpleSymbols = /^(AR|k|CL|CD|CDi|q|L|D|L\/D|Re|Isp|Ve|F|ṁ|Pe|Pa|Ae|W\/S|ρ|V|μ|α|β|γ|θ|φ|π|e|S|b|c|h|t|d|r|R|P|T|M|N|F|W|m|g|a|v|u|x|y|z)$/i;
  // Also check for simple patterns like "Lift", "Drag", "Thrust", etc.
  const simpleWords = /^(Lift|Drag|Thrust|Force|Power|Energy|Velocity|Speed|Density|Pressure|Temperature|Mass|Weight|Area|Volume|Length|Height|Width|Depth|Radius|Diameter)$/i;
  
  const cleaned = symbol.trim();
  return simpleSymbols.test(cleaned) || simpleWords.test(cleaned) || cleaned.length <= 3;
}

/**
 * Parse an equation line into structured format
 * Handles lines like: "AR = b² / S = 2.00² / 1.50 = 2.67"
 */
function parseEquationLine(line: string, autoIndex: number): EquationStep | null {
  const trimmed = line.trim();
  
  // Must contain at least 2 '=' characters
  const equalsCount = (trimmed.match(/=/g) || []).length;
  if (equalsCount < 2) {
    return null;
  }
  
  // Split by '=' and clean up
  const rawParts = trimmed.split('=');
  const parts = rawParts.map(p => p.trim()).filter(p => p.length > 0);
  
  if (parts.length < 3) {
    return null;
  }
  
  const left = parts[0];
  const formula = parts[0] + ' = ' + parts[1];
  const substituted = parts.slice(1, parts.length - 1).join(' = ');
  const result = parts[parts.length - 1];
  
  // Determine label
  let label: string;
  if (isSimpleSymbol(left)) {
    label = `Find ${left}`;
  } else {
    // Extract label from left side if it has a colon (e.g. "Lift Coefficient: CL")
    const colonMatch = left.match(/^(.+?):\s*(.+)$/);
    if (colonMatch) {
      const labelPart = colonMatch[1].trim();
      const symbolPart = colonMatch[2].trim();
      if (isSimpleSymbol(symbolPart)) {
        label = `Find ${symbolPart}`;
      } else {
        label = labelPart;
      }
    } else {
      label = `Step ${autoIndex}`;
    }
  }
  
  return {
    label,
    formulaLine: formula,
    valuesLine: substituted ? `= ${substituted}` : '',
    resultLine: result,
  };
}

/**
 * Parse steps text into structured format
 * Only creates steps when explicit "Step" headings are found
 * Also parses equation lines into Formula / Values / Result format
 */
function parseSteps(steps: string[] | CalculationStep[]): {
  meta: ParsedMetadata;
  steps: ParsedStep[];
  equationSteps: EquationStep[];
  preamble: string[];
  otherLines: string[];
} {
  const meta: ParsedMetadata = {};
  const parsedSteps: ParsedStep[] = [];
  const equationSteps: EquationStep[] = [];
  const preamble: string[] = [];
  const otherLines: string[] = [];

  // Step title regex: matches "Step", "**Step**", "Step 1:", "Step 1.", "Step 1-", etc.
  const stepTitleRegex = /^\s*\**Step\s*\d*[:.)-]?\s*/i;

  // Check if it's structured format
  const isStructuredFormat = steps.length > 0 && typeof steps[0] !== 'string';
  
  // If structured format, handle separately (don't create fake Step headings)
  if (isStructuredFormat) {
    // For structured format, return empty steps array - will be handled in render
    return { meta, steps: [], equationSteps: [], preamble: [], otherLines: [] };
  }

  // String format: split each step string by newlines
  const lines: string[] = [];
  (steps as string[]).forEach(step => {
    lines.push(...step.split(/\r?\n/));
  });

  let currentStep: ParsedStep | null = null;
  let equationStepIndex = 1;

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
    // Stop if we hit another metadata header or step title
    if (meta.given !== undefined && 
        !stepTitleRegex.test(trimmed) && 
        !trimmed.match(/^\*\*Interpretation:/i) && 
        !trimmed.match(/^Interpretation:/i) &&
        !trimmed.match(/^\*\*Given:/i) &&
        !trimmed.match(/^Given:/i) &&
        !trimmed.match(/^\*\*Airfoil:/i) &&
        !trimmed.match(/^Airfoil:/i)) {
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
    // Stop if we hit another metadata header or step title
    if (meta.interpretation !== undefined && 
        !stepTitleRegex.test(trimmed) &&
        !trimmed.match(/^\*\*Given:/i) &&
        !trimmed.match(/^Given:/i) &&
        !trimmed.match(/^\*\*Airfoil:/i) &&
        !trimmed.match(/^Airfoil:/i) &&
        !trimmed.match(/^\*\*Interpretation:/i) &&
        !trimmed.match(/^Interpretation:/i)) {
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

    // Check if this is an equation line (2+ '=' characters, not a metadata header)
    if (!trimmed.match(/^(Step|Airfoil|Given|Interpretation)/i)) {
      const equationStep = parseEquationLine(trimmed, equationStepIndex);
      if (equationStep) {
        // If we have a current step, save it first
        if (currentStep) {
          parsedSteps.push(currentStep);
          currentStep = null;
        }
        equationSteps.push(equationStep);
        equationStepIndex++;
        continue;
      }
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
      // No current step - check if it's preamble or other text
      if (meta.given === undefined && meta.airfoil === undefined && meta.interpretation === undefined) {
        preamble.push(trimmed);
      } else {
        // After metadata, but before steps - treat as other lines
        otherLines.push(trimmed);
      }
    }
  }

  // Save last step if it exists
  if (currentStep && (currentStep.equation || currentStep.bodyLines.length > 0)) {
    parsedSteps.push(currentStep);
  }

  return { meta, steps: parsedSteps, equationSteps, preamble, otherLines };
}

export function CalculationSteps({ steps, className = "" }: CalculationStepsProps) {
  if (!steps || steps.length === 0) {
    return (
      <div className={`text-sm text-slate-400 ${className}`}>
        No calculation steps available.
      </div>
    );
  }

  const { meta, steps: parsedSteps, equationSteps, preamble, otherLines } = parseSteps(steps);

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

  // If no steps and no equation steps, render as plain text
  if (parsedSteps.length === 0 && equationSteps.length === 0) {
    // Combine preamble and other lines
    const allText = [...preamble, ...otherLines];
    
    // If we have metadata, render it properly even without Step headings
    if (meta.airfoil || meta.given || meta.interpretation) {
      return (
        <div className={`space-y-4 text-sm leading-relaxed text-slate-100 ${className}`}>
          {/* Preamble text */}
          {allText.length > 0 && (
            <div className="text-slate-200 whitespace-pre-wrap mb-4">
              {allText.join('\n')}
            </div>
          )}

          {/* Metadata section */}
          <div className="space-y-2 mb-4 pb-4 border-b border-slate-700/50">
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

          {/* Interpretation at bottom */}
          {meta.interpretation && (
            <p className="text-sm italic text-slate-300 whitespace-pre-wrap pt-2 border-t border-slate-700/50">
              <span className="font-semibold text-sky-300">Interpretation:</span>{' '}
              {meta.interpretation}
            </p>
          )}
        </div>
      );
    }
    
    // No metadata - just render as plain text
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
      {(meta.airfoil || meta.given) && (
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

      {/* Equation steps (Formula / Put values / Result format) */}
      {equationSteps.length > 0 && (
        <div className="space-y-4 mb-6">
          {equationSteps.map((step, idx) => (
            <div key={idx} className="mb-4">
              <p className="text-sm font-semibold text-sky-300">
                {`Step ${idx + 1}: ${step.label}`}
              </p>
              <p className="mt-1 text-sm sm:text-base text-slate-100 font-mono">
                {step.formulaLine}
              </p>
              {step.valuesLine && (
                <p className="text-sm sm:text-base text-slate-100 font-mono">
                  {step.valuesLine}
                </p>
              )}
              <p className="text-sm sm:text-base text-emerald-300 font-mono">
                {`= ${step.resultLine}`}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Traditional steps (with explicit Step headings) */}
      {parsedSteps.length > 0 && (
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
      )}

      {/* Other lines (non-equation, non-step text) */}
      {otherLines.length > 0 && (
        <div className="text-slate-200 whitespace-pre-wrap">
          {otherLines.join('\n')}
        </div>
      )}

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
