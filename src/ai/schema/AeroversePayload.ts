/**
 * Global standard JSON schema for all Aeroverse tools AI payloads
 * 
 * This ensures consistent data structure when passing calculation results
 * to the AI assistant across all tools.
 */

export interface ChartRef {
  /** DOM id or internal chart id */
  id: string;
  
  /** Chart title */
  title: string;
  
  /** Short summary like "CL vs alpha, 0-20deg" */
  dataSummary?: string;
  
  /** Optional pre-captured PNG as base64 */
  imageBase64?: string;
}

export interface AeroverseAIPayload {
  /** Optional request ID for traceability (kept for backward compatibility) */
  requestId?: string;
  
  /** Tool identifier (e.g., "LiftDrag", "Thrust", "Antenna") */
  toolName: string;
  
  /** Optional tool version */
  toolVersion?: string;
  
  /** Input parameters used for calculation */
  inputs: Record<string, any>;
  
  /** Calculated results */
  results: Record<string, any>;
  
  /** Unit information for inputs and results */
  units?: Record<string, string>;
  
  /** Charts/visualizations generated (IDs and titles) */
  charts?: ChartRef[];
  
  /** Tool-specific configuration (computation mode, resolution, etc.) */
  configuration?: Record<string, any>;
  
  /** Optional user notes */
  userNotes?: string;
  
  /** Additional metadata */
  metadata: {
    /** ISO timestamp when calculation was performed */
    timestamp: string;
    
    /** Browser user agent */
    browser?: string;
    
    /** Optional user ID */
    userId?: string | null;
    
    /** Application version */
    appVersion?: string;
    
    /** Optional legacy version field for backward compatibility */
    version?: string;
    
    /** Optional user notes (legacy, prefer top-level userNotes) */
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

