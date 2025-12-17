AI EXECUTION RULES — AEROVERSE
0. Scope of Authority

The AI is authorized to:

Fix lint errors

Fix TypeScript typing

Fix React hook rule violations

Refactor structure-only code (hooks order, declarations, typing)

Improve UI layout spacing ONLY when explicitly requested

The AI is NOT authorized to modify physics, math, algorithms, or engineering logic.

1. ABSOLUTE NO-TOUCH ZONES (CRITICAL)

The AI must never modify:

Any formula, constant, coefficient, or numerical relationship

Any physics, aerodynamics, propulsion, orbital, or performance equations

Any chart data generation logic (values, curves, sampling logic)

Any solver, integrator, optimizer, or worker math

Any “magic numbers” used for engineering meaning

Any mission logic or sizing constraint logic

If a lint error exists inside such code:

✅ Fix typing ONLY

❌ Do NOT refactor logic

❌ Do NOT simplify expressions

If unsure → STOP and ask.

2. WHAT AI IS ALLOWED TO CHANGE

The AI MAY:

Replace any with unknown + proper narrowing

Add explicit interfaces & types

Convert let → const when safe

Fix React hook order violations

Move hooks to top-level unconditionally

Split components only to fix hook rules

Add guards (if (!data) return null) AFTER hooks

Fix dependency arrays (no logic changes)

Fix empty interfaces / empty catch blocks safely

Replace forbidden require() with import

3. REACT HOOK RULES (MANDATORY)

If lint reports:

react-hooks/rules-of-hooks

react-hooks/exhaustive-deps

Then AI must:

Move ALL hooks to top level

Remove conditional hook calls

Use early returns after hooks

Wrap unstable values with useMemo / useCallback

NEVER silence the rule unless explicitly instructed

4. LINT-FIRST STRATEGY (STRICT ORDER)

The AI must work in this order:

Fix errors (build-breaking)

Fix hook violations

Fix TypeScript structural issues

Leave warnings unless explicitly told

No skipping. No mixing tasks.

5. INTERLINKING SYSTEM PROTECTION

For interlinking (InterlinkCTA, designSession, shared data):

❌ Do NOT change field meaning

❌ Do NOT rename keys

❌ Do NOT alter data flow

✅ Only fix typing, null safety, UI visibility logic

6. UI & GRAPH RULES

❌ Do NOT change chart scales, values, domains, curves

❌ Do NOT alter plotted data

✅ Allowed: margins, padding, label position, tooltip style

✅ Allowed: conditional rendering fixes

7. AUTONOMY LIMIT

The AI must:

Execute only the task explicitly requested

Avoid “improvements”, “optimizations”, or “cleanup” unless asked

Never touch unrelated files

If a change affects more than requested files → STOP.

8. FAILURE MODE

If a task conflicts with these rules:

AI must refuse

Explain the conflict

Ask for confirmation

9. PRIME DIRECTIVE

Correctness > Cleanliness > Style

Passing build and preserving engineering intent is the top priority.

End of rules.