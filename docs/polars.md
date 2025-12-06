# Polar Data Conversion Guide

This guide explains how to convert raw AirfoilTools/XFOIL polar text files into Aeroverse's JSON format.

## Overview

Aeroverse uses JSON polar files stored in `public/polars/<airfoil-id>/<reynolds>.json`. Each file contains aerodynamic data (lift, drag, moment coefficients) across a range of angles of attack for a specific airfoil at a specific Reynolds number.

## Downloading Raw Polar Data

1. Visit [AirfoilTools.com](https://airfoiltools.com/)
2. Search for your airfoil (e.g., "Selig 1223")
3. Navigate to the "Polar" section
4. Configure:
   - Reynolds number (match the per-airfoil Re set from `src/data/airfoilReSets.ts`)
   - Mach number (typically 0.0 for low-speed)
   - Ncrit (transition point, typically 9 for clean conditions)
5. Click "Calculate" to generate the polar
6. Download the polar data as a text file (usually named something like `xf-s1223-il-200000.txt`)

### Alternative: XFOIL Direct

If you have XFOIL installed, you can generate polars directly:

```
XFOIL> load <airfoil>.dat
XFOIL> oper
XFOIL> visc <reynolds>
XFOIL> mach <mach>
XFOIL> pacc
XFOIL> <output-filename>.txt
XFOIL> <blank line>
XFOIL> iter <iterations>
XFOIL> aseq <alpha_min> <alpha_max> <alpha_step>
XFOIL> pacc
```

## Converting to Aeroverse Format

Use the conversion script to transform the raw text file into Aeroverse's JSON format:

```bash
npx ts-node scripts/convertAirfoilToolsPolar.ts \
  --airfoil selig1223 \
  --re 200000 \
  --src raw_polars/xf-s1223-il-200000.txt \
  --out public/polars/selig1223/200k.json \
  --mach 0.0 \
  --source "XFOIL via AirfoilTools (polar xf-s1223-il-200000)" \
  --notes "Ncrit=9, clean, per-airfoil Re set"
```

### Script Arguments

- `--airfoil <id>` (required): Airfoil identifier matching the ID in `src/data/airfoils.ts`
- `--re <value>` (required): Reynolds number (e.g., `200000` or `200k`)
- `--src <path>` (required): Path to the input text file from AirfoilTools/XFOIL
- `--out <path>` (required): Path where the JSON file should be written
- `--mach <value>` (optional): Mach number, defaults to `0.0`
- `--source <string>` (optional): Source description, defaults to `"XFOIL via AirfoilTools"`
- `--notes <string>` (optional): Additional notes about the polar data

### Example: Converting Multiple Reynolds Numbers

For an airfoil with a per-airfoil Re set like `[80000, 120000, 200000, 300000]`:

```bash
# Convert each Reynolds number
npx ts-node scripts/convertAirfoilToolsPolar.ts \
  --airfoil selig1223 \
  --re 80000 \
  --src raw_polars/xf-s1223-il-80000.txt \
  --out public/polars/selig1223/80k.json \
  --source "XFOIL via AirfoilTools" \
  --notes "Ncrit=9, clean"

npx ts-node scripts/convertAirfoilToolsPolar.ts \
  --airfoil selig1223 \
  --re 120000 \
  --src raw_polars/xf-s1223-il-120000.txt \
  --out public/polars/selig1223/120k.json \
  --source "XFOIL via AirfoilTools" \
  --notes "Ncrit=9, clean"

npx ts-node scripts/convertAirfoilToolsPolar.ts \
  --airfoil selig1223 \
  --re 200000 \
  --src raw_polars/xf-s1223-il-200000.txt \
  --out public/polars/selig1223/200k.json \
  --source "XFOIL via AirfoilTools" \
  --notes "Ncrit=9, clean"

npx ts-node scripts/convertAirfoilToolsPolar.ts \
  --airfoil selig1223 \
  --re 300000 \
  --src raw_polars/xf-s1223-il-300000.txt \
  --out public/polars/selig1223/300k.json \
  --source "XFOIL via AirfoilTools" \
  --notes "Ncrit=9, clean"
```

## Input File Format

The script expects AirfoilTools/XFOIL text format with columns:

```
alpha    Cl      Cd      Cdp     Cm      Top_Xtr  Bot_Xtr
```

- Lines starting with `#` are treated as comments and skipped
- Blank lines are skipped
- Each data line should have at least 5 columns (alpha, Cl, Cd, Cdp, Cm)
- The script extracts: alpha (col 0), Cl (col 1), Cd (col 2), Cm (col 4)

## Output JSON Format

The script generates JSON files matching Aeroverse's schema:

```json
{
  "meta": {
    "airfoil": "selig1223",
    "re": 200000,
    "mach": 0.0,
    "source": "XFOIL via AirfoilTools (polar xf-s1223-il-200000)",
    "notes": "Ncrit=9, clean, per-airfoil Re set"
  },
  "data": {
    "alpha_deg": [-4.0, -2.0, 0.0, 2.0, ...],
    "cl": [-0.42, -0.21, 0.00, 0.42, ...],
    "cd": [0.035, 0.025, 0.020, 0.018, ...],
    "cm": [-0.035, -0.035, -0.035, -0.035, ...]
  }
}
```

## Per-Airfoil Reynolds Sets

Each airfoil has a recommended set of 4 Reynolds numbers defined in `src/data/airfoilReSets.ts`. When converting polars, use these Reynolds numbers to ensure consistency:

- **STOL/slow UAV**: 80k, 120k, 200k, 300k
- **Glider/endurance**: 150k, 300k, 500k, 800k
- **Trainer/GA**: 500k, 1M, 2M, 3M
- **Fast/laminar**: 2M, 4M, 6M, 9M

Check `src/data/airfoilReSets.ts` for the exact set for each airfoil.

## File Naming Convention

Output files should use Reynolds number in the format:
- `100k.json` for 100,000
- `500k.json` for 500,000
- `1e6.json` for 1,000,000
- `3e6.json` for 3,000,000

This matches the existing polar file naming in `public/polars/`.

## Quality Checklist

Before committing converted polar files:

- [ ] All 4 Reynolds numbers from the per-airfoil Re set are converted
- [ ] File names match the Reynolds number format (100k, 500k, 1e6, 3e6)
- [ ] Source and notes fields are descriptive
- [ ] Data arrays have reasonable length (typically 30+ points for real polars)
- [ ] Alpha range covers typical operating range (e.g., -4° to 16°)
- [ ] No NaN or invalid values in the arrays
- [ ] JSON file is properly formatted (2-space indentation)

## Troubleshooting

**Error: "No valid data points found"**
- Check that the input file has data lines (not just headers)
- Verify the file format matches AirfoilTools/XFOIL output
- Ensure columns are space/tab-separated

**Error: "Source file not found"**
- Verify the `--src` path is correct
- Use absolute paths if relative paths don't work

**Invalid Reynolds number**
- Ensure `--re` is a numeric value (e.g., `200000` not `200k`)
- The script accepts numeric values; file naming uses `200k.json` format

