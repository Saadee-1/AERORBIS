#!/usr/bin/env node

/**
 * Convert AirfoilTools/XFOIL polar text files to Aeroverse JSON format
 * 
 * Usage:
 *   npx ts-node scripts/convertAirfoilToolsPolar.ts \
 *     --airfoil <id> \
 *     --re <value> \
 *     --src <path-to-txt> \
 *     --out <path-to-json> \
 *     [--mach 0.0] \
 *     [--source "XFOIL via AirfoilTools"] \
 *     [--notes "optional note"]
 */

import * as fs from 'fs';
import * as path from 'path';

interface PolarData {
  meta: {
    airfoil: string;
    re: number;
    mach: number;
    source: string;
    notes?: string;
  };
  data: {
    alpha_deg: number[];
    cl: number[];
    cd: number[];
    cm: number[];
  };
}

interface Args {
  airfoil?: string;
  re?: string;
  src?: string;
  out?: string;
  mach?: string;
  source?: string;
  notes?: string;
}

function parseArgs(): Args {
  const args: Args = {};
  const argv = process.argv.slice(2);
  
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i]?.replace(/^--/, '');
    const value = argv[i + 1];
    
    if (key && value) {
      args[key as keyof Args] = value;
    }
  }
  
  return args;
}

function parsePolarText(filePath: string): { alpha_deg: number[]; cl: number[]; cd: number[]; cm: number[] } {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  const alpha_deg: number[] = [];
  const cl: number[] = [];
  const cd: number[] = [];
  const cm: number[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip blank lines and comment lines
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    
    // Split by whitespace (handles both spaces and tabs)
    const cols = trimmed.split(/\s+/).filter(col => col.length > 0);
    
    // Need at least 5 columns: alpha, Cl, Cd, Cdp, Cm
    if (cols.length < 5) {
      continue;
    }
    
    // Parse columns:
    // 0: alpha (degrees)
    // 1: Cl (lift coefficient)
    // 2: Cd (drag coefficient)
    // 4: Cm (moment coefficient) - skip Cdp at index 3
    const alphaVal = parseFloat(cols[0]);
    const clVal = parseFloat(cols[1]);
    const cdVal = parseFloat(cols[2]);
    const cmVal = parseFloat(cols[4]);
    
    // Only add if all values are valid numbers
    if (
      !isNaN(alphaVal) &&
      !isNaN(clVal) &&
      !isNaN(cdVal) &&
      !isNaN(cmVal)
    ) {
      alpha_deg.push(alphaVal);
      cl.push(clVal);
      cd.push(cdVal);
      cm.push(cmVal);
    }
  }
  
  if (alpha_deg.length === 0) {
    throw new Error(`No valid data points found in ${filePath}`);
  }
  
  return { alpha_deg, cl, cd, cm };
}

function main() {
  const args = parseArgs();
  
  // Validate required arguments
  if (!args.airfoil) {
    console.error('Error: --airfoil is required');
    process.exit(1);
  }
  
  if (!args.re) {
    console.error('Error: --re is required');
    process.exit(1);
  }
  
  if (!args.src) {
    console.error('Error: --src is required');
    process.exit(1);
  }
  
  if (!args.out) {
    console.error('Error: --out is required');
    process.exit(1);
  }
  
  // Parse numeric values
  const re = parseFloat(args.re);
  if (isNaN(re)) {
    console.error(`Error: Invalid Reynolds number: ${args.re}`);
    process.exit(1);
  }
  
  const mach = args.mach ? parseFloat(args.mach) : 0.0;
  if (isNaN(mach)) {
    console.error(`Error: Invalid Mach number: ${args.mach}`);
    process.exit(1);
  }
  
  // Check source file exists
  if (!fs.existsSync(args.src)) {
    console.error(`Error: Source file not found: ${args.src}`);
    process.exit(1);
  }
  
  // Parse the polar text file
  console.log(`Reading polar data from: ${args.src}`);
  let data;
  try {
    data = parsePolarText(args.src);
  } catch (error) {
    console.error(`Error parsing polar file: ${error}`);
    process.exit(1);
  }
  
  console.log(`Parsed ${data.alpha_deg.length} data points`);
  
  // Build JSON object matching Aeroverse schema (as specified in step 4)
  const polarJson: PolarData = {
    meta: {
      airfoil: args.airfoil,
      re: re,
      mach: mach,
      source: args.source || 'XFOIL via AirfoilTools',
      ...(args.notes && { notes: args.notes }),
    },
    data: {
      alpha_deg: data.alpha_deg,
      cl: data.cl,
      cd: data.cd,
      cm: data.cm,
    },
  };
  
  // Ensure output directory exists
  const outDir = path.dirname(args.out);
  if (!fs.existsSync(outDir)) {
    console.log(`Creating directory: ${outDir}`);
    fs.mkdirSync(outDir, { recursive: true });
  }
  
  // Write JSON file with 2-space indentation
  const jsonString = JSON.stringify(polarJson, null, 2);
  fs.writeFileSync(args.out, jsonString, 'utf-8');
  
  console.log(`✓ Successfully wrote polar JSON to: ${args.out}`);
  console.log(`  Airfoil: ${args.airfoil}`);
  console.log(`  Reynolds: ${re.toLocaleString()}`);
  console.log(`  Mach: ${mach}`);
  console.log(`  Data points: ${data.alpha_deg.length}`);
}

main();

