# AI Integration Guide

This document describes how the Aeroverse AI Assistant integrates with calculation tools to provide intelligent explanations and analysis.

## Overview

The AI Assistant receives complete calculation data (inputs, results, charts, metadata) from Aeroverse tools and uses it to provide detailed explanations. The payload is always included in the user message sent to Gemini, ensuring the AI has full context without needing to fetch data by Request ID.

## Architecture

### Components

1. **AeroverseAIPayload Schema** (`src/ai/schema/AeroversePayload.ts`)
   - Standardized structure for all calculation data
   - Includes: `toolName`, `inputs`, `results`, `units`, `charts`, `configuration`, `metadata`
   - Request ID included for traceability

2. **buildAeroversePayload Helper** (`src/ai/buildPayload.ts`)
   - Centralized function to build standardized payloads
   - Ensures all required fields are present
   - Adds metadata (timestamp, browser, user ID, app version)

3. **AskAIButton Component** (`src/components/tools/AskAIButton.tsx`)
   - Accepts `requestId` or `payload` directly
   - Builds payload if not provided
   - Sets payload in context before opening assistant

4. **AIAssistantContext** (`src/contexts/AIAssistantContext.tsx`)
   - Manages `currentPayload` state
   - `sendMessage` includes full payload JSON in user message
   - Fallback to localStorage if payload not in context

5. **Backend API** (`supabase/functions/ai-chat/index.ts`)
   - Receives payload in request body
   - System prompt instructs Gemini to use payload from user message
   - Never attempts to fetch data by Request ID

## Data Flow

### Standard Flow

1. **Tool calculates results** → Calls `sendCalculationEvent()` → Stores in localStorage with `requestId`
2. **User clicks "Ask AI"** → `AskAIButton` calls `openAssistantWithPayload(requestId)`
3. **Context loads payload** → Reads from localStorage → Converts to `AeroverseAIPayload` format
4. **Payload set in context** → `setCurrentPayload(payload)` → Opens assistant UI
5. **User message sent** → `sendMessage()` includes full payload JSON in message content
6. **Backend receives** → Gemini processes payload from user message → Returns explanation

### Direct Payload Flow

1. **Tool builds payload directly** → Uses `buildAeroversePayload()` helper
2. **Passes to AskAIButton** → `<AskAIButton payload={payload} />`
3. **Context sets payload** → `setCurrentPayload(finalPayload)` → Opens assistant
4. **Message includes JSON** → Full payload included in user message content

## Payload Structure

```typescript
interface AeroverseAIPayload {
  requestId?: string;              // For traceability
  toolName: string;                // e.g., "Antenna Pattern Analyzer"
  toolVersion?: string;
  inputs: Record<string, any>;     // Input parameters
  results: Record<string, any>;    // Calculated results
  units?: Record<string, string>;  // Unit information
  charts?: ChartRef[];             // Chart references
  configuration?: Record<string, any>; // User settings
  userNotes?: string;
  metadata: {
    timestamp: string;
    browser?: string;
    userId?: string | null;
    appVersion?: string;
    steps?: string[];
    unitsSystem?: string;
    approxLevel?: string;
    confidence?: string;
    warnings?: string[];
  };
}
```

## Usage Examples

### Using Request ID (Existing Flow)

```tsx
// In your tool component
const [lastRequestId, setLastRequestId] = useState<string | null>(null);

// After calculation
const eventResponse = await sendCalculationEvent({
  toolName: "Antenna Pattern Analyzer",
  inputs: { frequency: 2.4e9, antennaType: "dipole" },
  results: { gain: 2.15, directivity: 1.64 },
  // ...
});
setLastRequestId(eventResponse.requestId);

// In render
<AskAIButton requestId={lastRequestId} />
```

### Using Direct Payload (Recommended)

```tsx
// In your tool component
import { buildAeroversePayload } from '@/ai/buildPayload';

// After calculation
const payload = buildAeroversePayload({
  toolName: "Antenna Pattern Analyzer",
  inputs: { frequency: 2.4e9, antennaType: "dipole" },
  results: { gain: 2.15, directivity: 1.64 },
  units: { frequency: "Hz", gain: "dBi" },
  charts: [{ id: "polar", title: "Radiation Pattern", dataSummary: "2D polar plot" }],
  configuration: { unitSystem: "SI" },
  metadata: {
    steps: ["Calculate wavelength", "Compute gain", "Generate pattern"],
    warnings: [],
  },
});

// In render
<AskAIButton payload={payload} />
```

## Message Format

When payload is available, the user message includes:

```
Please explain this {toolName} calculation in detail.

Please analyze the following JSON payload and explain the calculation in detail. 
Do not ask for external access or try to fetch data by Request ID. Use only the data provided below.

```json
{
  "requestId": "calc-...",
  "toolName": "...",
  "inputs": {...},
  "results": {...},
  ...
}
```

Use this payload to:
1. Provide a short summary of the calculation
2. Explain step-by-step how the formulas map to the results
3. Check units consistency
4. Identify any warnings or assumptions
5. Suggest next steps
```

## Fallback Handling

### Missing Payload

If payload is missing or incomplete:

1. **Telemetry logged** → `FALLBACK_MISSING_RESULTS` with reason code
2. **UI shows warning** → "No results found in payload. Please verify the calculation completed."
3. **Options provided**:
   - "Attach current snapshot" → Rebuilds payload from current tool state
   - "Retry" → Attempts to reload from localStorage

### Error Codes

- `NO_REQUEST_ID_OR_PAYLOAD` → Neither requestId nor payload provided
- `PAYLOAD_EXPIRED` → Stored data has expired (>30 days)
- `PAYLOAD_NOT_FOUND` → Request ID not found in localStorage
- `PAYLOAD_BUILD_ERROR` → Failed to build payload from partial data

## Telemetry & Logging

All assistant invocations are logged with:

- `requestId` → Trace ID for debugging
- `toolName` → Which tool generated the calculation
- `payloadChecksum` → Hash of payload for verification
- `hasInputs` → Whether inputs are present
- `hasResults` → Whether results are present
- `payloadSize` → Size of payload JSON (bytes)

Example log:

```javascript
console.log('✅ Including full payload JSON in user message:', {
  toolName: 'Antenna Pattern Analyzer',
  requestId: 'calc-1763455425558-ppfww8ktb',
  payloadSize: 1234,
});
```

## Backend Processing

The backend (`supabase/functions/ai-chat/index.ts`) receives:

1. **Messages array** → Includes user message with payload JSON
2. **Request body** → `aeroversePayload`, `calculationContext`, `requestId`
3. **System prompt** → Instructs Gemini to use payload from user message

The system prompt explicitly states:

> CRITICAL: PAYLOAD HANDLING
> - The user message may contain a JSON payload wrapped in ```json code blocks
> - ALWAYS use the payload JSON from the user message - it contains the full calculation data
> - DO NOT attempt to access external systems or fetch data by Request ID
> - If the payload JSON is present in the user message, you MUST use it to provide explanations

## Best Practices

1. **Always use `buildAeroversePayload()`** → Ensures consistent structure
2. **Include all calculation data** → Inputs, results, steps, warnings
3. **Provide chart references** → Include `id`, `title`, `dataSummary`
4. **Set metadata** → Units system, confidence level, approximation method
5. **Log telemetry** → Track payload delivery for debugging

## Debugging

### Check Payload in Console

```javascript
// In browser console
const payload = JSON.parse(localStorage.getItem('calc-{requestId}'));
console.log('Payload:', payload);
```

### Verify Message Content

Check network tab → `ai-chat` request → Request body → `messages[].content` → Should contain payload JSON

### Test Payload Build

```javascript
import { buildAeroversePayload } from '@/ai/buildPayload';

const testPayload = buildAeroversePayload({
  toolName: "Test Tool",
  inputs: { test: 123 },
  results: { result: 456 },
});

console.log('Test payload:', testPayload);
```

## Testing Checklist

- [ ] Payload includes all required fields
- [ ] Payload JSON is included in user message
- [ ] Backend receives payload in request body
- [ ] Gemini receives payload in message content
- [ ] Fallback UI appears when payload missing
- [ ] Telemetry logs missing payload cases
- [ ] Error handling works for expired/invalid payloads

## Future Enhancements

- Chart image capture (html2canvas) → Include `imageBase64` in payload
- Payload compression → For very large payloads
- Payload caching → Reduce redundant data transfer
- Real-time updates → Stream partial results as calculation progresses

