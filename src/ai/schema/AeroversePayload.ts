/**
 * Global standard JSON schema for all Aeroverse tools AI payloads
 * 
 * This ensures consistent data structure when passing calculation results
 * to the AI assistant across all tools.
 */

export interface AeroverseAIPayload {
  /** Tool identifier (e.g., "LiftDrag", "Thrust", "Antenna") */
  toolName: string;
  
  /** Input parameters used for calculation */
  inputs: Record<string, any>;
  
  /** Calculated results */
  results: Record<string, any>;
  
  /** Unit information for inputs and results */
  units?: Record<string, string>;
  
  /** Charts/visualizations generated (IDs and titles) */
  charts?: Array<{ id: string; title: string }>;
  
  /** Tool-specific configuration (computation mode, resolution, etc.) */
  configuration?: Record<string, any>;
  
  /** Additional metadata */
  metadata: {
    /** ISO timestamp when calculation was performed */
    timestamp: string;
    
    /** Application version */
    version: string;
    
    /** Optional user notes */
    userNotes?: string;
    
    /** Calculation steps/formulas used */
    steps?: string[];
    
    /** Units system used (SI, Imperial, Custom) */
    unitsSystem?: string;
    
    /** Approximation level (analytic, numeric, approximate) */
    approxLevel?: string;
    
    /** Confidence level (high, medium, low) */
    confidence?: string;
    
    /** Warnings or alerts */
    warnings?: string[];
  };
}

/**
 * Request ID reference for linking payloads to stored calculation events
 */
export interface AeroverseAIRequest {
  /** Unique request ID generated during calculation */
  requestId: string;
  
  /** Complete payload data */
  payload: AeroverseAIPayload;
}

