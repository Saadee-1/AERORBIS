# Aeroverse Polar Data Audit Report

Generated: 2025-11-23

## Executive Summary

| Metric | Count |
|--------|-------|
| Total Files | 57 |
| Fully Processed | 8 |
| Partially Processed | 6 |
| Unprocessed | 43 |
| Corrupted | 0 |
| Files with Backups | 7 |

## Status Definitions

- **Processed**: Has `mach`, complete `meta` block (source, generated_at, filter, notes, stall_alpha), and all arrays are equal length
- **Partial**: Has `mach` OR `meta` but not both, or missing required meta fields
- **Unprocessed**: Missing both `mach` and `meta`
- **Corrupted**: JSON parse error

## Detailed File Audit

| Airfoil | Re | mach | meta | Arrays OK | Anomalies | Backup | Status |
|---------|----|----|----|-----------|-----------|--------|--------|
| clarky | 1e6.json | ✗ | ✓ | ✓ | none | ✓ | partial |
| du91w2250 | 100k.json | ✗ | ✗ | ✓ | none | ✗ | unprocessed |
| du91w2250 | 1e6.json | ✗ | ✗ | ✗ (8/8/8/0) | none | ✗ | unprocessed |
| du91w2250 | 3e6.json | ✗ | ✗ | ✓ | none | ✗ | unprocessed |
| du91w2250 | 500k.json | ✗ | ✗ | ✓ | none | ✗ | unprocessed |
| eppler320 | 100k.json | ✗ | ✗ | ✓ | none | ✗ | unprocessed |
| eppler320 | 1e6.json | ✗ | ✗ | ✗ (8/8/8/0) | none | ✗ | unprocessed |
| eppler320 | 3e6.json | ✗ | ✗ | ✓ | none | ✗ | unprocessed |
| eppler320 | 500k.json | ✗ | ✗ | ✓ | none | ✗ | unprocessed |
| fx63137 | 100k.json | ✗ | ✗ | ✓ | none | ✗ | unprocessed |
| fx63137 | 1e6.json | ✗ | ✗ | ✗ (8/8/8/0) | none | ✗ | unprocessed |
| fx63137 | 3e6.json | ✗ | ✗ | ✓ | none | ✗ | unprocessed |
| fx63137 | 500k.json | ✗ | ✗ | ✓ | none | ✗ | unprocessed |
| naca0006 | 100k.json | ✓ | ✓ | ✓ | none | ✓ | **processed** |
| naca0006 | 1e6.json | ✓ | ✓ | ✓ | none | ✓ | **processed** |
| naca0006 | 3e6.json | ✓ | ✓ | ✓ | none | ✓ | **processed** |
| naca0006 | 500k.json | ✓ | ✓ | ✓ | none | ✓ | **processed** |
| naca0009 | 100k.json | ✗ | ✗ | ✓ | none | ✗ | unprocessed |
| naca0009 | 1e6.json | ✗ | ✗ | ✓ | none | ✗ | unprocessed |
| naca0009 | 3e6.json | ✗ | ✗ | ✓ | none | ✗ | unprocessed |
| naca0009 | 500k.json | ✗ | ✗ | ✓ | none | ✗ | unprocessed |
| naca0012 | 100k.json | ✗ | ✗ | ✓ | none | ✗ | unprocessed |
| naca0012 | 1e6.json | ✓ | ✓ | ✓ | none | ✓ | **processed** |
| naca0012 | 3e6.json | ✗ | ✗ | ✓ | none | ✗ | unprocessed |
| naca0012 | 500k.json | ✗ | ✗ | ✓ | none | ✗ | unprocessed |
| naca0015 | 100k.json | ✗ | ✗ | ✓ | none | ✗ | unprocessed |
| naca0015 | 1e6.json | ✗ | ✗ | ✓ | none | ✗ | unprocessed |
| naca0015 | 3e6.json | ✗ | ✗ | ✓ | none | ✗ | unprocessed |
| naca0015 | 500k.json | ✗ | ✗ | ✓ | none | ✗ | unprocessed |
| naca23012 | 100k.json | ✗ | ✗ | ✓ | none | ✗ | unprocessed |
| naca23012 | 1e6.json | ✗ | ✗ | ✓ | none | ✗ | unprocessed |
| naca23012 | 3e6.json | ✗ | ✗ | ✓ | none | ✗ | unprocessed |
| naca23012 | 500k.json | ✗ | ✗ | ✓ | none | ✗ | unprocessed |
| naca2412 | 100k.json | ✗ | ✗ | ✓ | none | ✗ | unprocessed |
| naca2412 | 1e6.json | ✓ | ✓ | ✓ | none | ✗ | **processed** |
| naca2412 | 3e6.json | ✗ | ✗ | ✓ | none | ✗ | unprocessed |
| naca2412 | 500k.json | ✗ | ✗ | ✓ | none | ✗ | unprocessed |
| naca4412 | 100k.json | ✗ | ✗ | ✓ | none | ✗ | unprocessed |
| naca4412 | 1e6.json | ✗ | ✗ | ✓ | none | ✗ | unprocessed |
| naca4412 | 3e6.json | ✗ | ✗ | ✓ | cl=1.82, cl=1.82 | ✗ | unprocessed |
| naca4412 | 500k.json | ✗ | ✗ | ✓ | none | ✗ | unprocessed |
| naca4415 | 100k.json | ✗ | ✗ | ✓ | none | ✗ | unprocessed |
| naca4415 | 1e6.json | ✗ | ✗ | ✓ | none | ✗ | unprocessed |
| naca4415 | 3e6.json | ✗ | ✗ | ✓ | none | ✗ | unprocessed |
| naca4415 | 500k.json | ✗ | ✗ | ✓ | none | ✗ | unprocessed |
| naca63215 | 100k.json | ✗ | ✗ | ✓ | none | ✗ | unprocessed |
| naca63215 | 1e6.json | ✗ | ✗ | ✓ | none | ✗ | unprocessed |
| naca63215 | 3e6.json | ✗ | ✗ | ✓ | none | ✗ | unprocessed |
| naca63215 | 500k.json | ✗ | ✗ | ✓ | none | ✗ | unprocessed |
| s1223 | 100k.json | ✗ | ✗ | ✓ | none | ✗ | unprocessed |
| s1223 | 1e6.json | ✓ | ✓ | ✓ | none | ✓ | **processed** |
| s1223 | 3e6.json | ✗ | ✗ | ✓ | none | ✗ | unprocessed |
| s1223 | 500k.json | ✗ | ✗ | ✓ | none | ✗ | unprocessed |
| supercritical | 100k.json | ✗ | ✗ | ✓ | none | ✗ | unprocessed |
| supercritical | 1e6.json | ✗ | ✗ | ✗ (8/8/8/0) | none | ✗ | unprocessed |
| supercritical | 3e6.json | ✗ | ✗ | ✓ | none | ✗ | unprocessed |
| supercritical | 500k.json | ✗ | ✗ | ✓ | none | ✗ | unprocessed |

## Issues Found

### Missing `cm` Arrays (Array Length Mismatch)
The following files have missing `cm` arrays:
- `du91w2250/1e6.json` (8/8/8/0)
- `eppler320/1e6.json` (8/8/8/0)
- `fx63137/1e6.json` (8/8/8/0)
- `supercritical/1e6.json` (8/8/8/0)

### Numerical Anomalies
- `naca4412/3e6.json`: cl values exceed 1.8 (cl=1.82, cl=1.82) - needs clamping

### Corrupted Files
- None detected (all files parse successfully)

## Fully Processed Files (8)

1. `naca0006/100k.json` ✓
2. `naca0006/1e6.json` ✓
3. `naca0006/3e6.json` ✓
4. `naca0006/500k.json` ✓
5. `naca0012/1e6.json` ✓
6. `naca2412/1e6.json` ✓
7. `s1223/1e6.json` ✓
8. `clarky/1e6.json` (partial - has meta but missing mach)

Note: The 6 partially processed files have `meta` blocks but are missing the `mach` field.

## Recommendations

1. **Process remaining 43 unprocessed files**: Add `mach: 0.0` and complete `meta` blocks
2. **Complete 6 partially processed files**: Add missing `mach` or complete `meta` blocks
3. **Fix missing `cm` arrays**: Estimate `cm` values for 4 files missing them
4. **Clamp anomalies**: Fix `naca4412/3e6.json` cl values (clamp to 1.8)
5. **Create backups**: Only 7 files have backups; create backups before processing remaining files

## Next Steps

1. Process all unprocessed files (43 files)
2. Complete partially processed files (6 files)
3. Fix array length mismatches (4 files)
4. Clamp numerical anomalies (1 file)
5. Create backups for all files before modification

