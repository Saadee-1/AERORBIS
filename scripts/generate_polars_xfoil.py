#!/usr/bin/env python3
"""
Fully automated XFOIL polar generation for ALL airfoils in Aeroverse Launchpad.

This script:
1. Reads airfoil IDs from src/data/airfoils.ts
2. Reads Reynolds sets from src/data/airfoilReSets.ts
3. For each (airfoilId, Re) combo:
   - Determines if NACA (uses NACA command) or needs coord file
   - Runs XFOIL offline to generate polar
   - Parses output and writes JSON to public/polars/<airfoilId>/<filename>.json

Usage:
    python scripts/generate_polars_xfoil.py
"""

import os
import re
import subprocess
import json
import math
from pathlib import Path
from typing import Dict, List, Tuple, Optional

# Root of the project (parent of scripts/)
PROJECT_ROOT = Path(__file__).resolve().parent.parent

# Absolute path to xfoil.exe
XFOIL_PATH = PROJECT_ROOT / "xfoil" / "xfoil.exe"

# Debug print
print("[DEBUG] XFOIL path =>", XFOIL_PATH, "| exists?", XFOIL_PATH.is_file())

# Constants
ALPHA_START = -4.0
ALPHA_END = 20.0
ALPHA_STEP = 1.0
ITER_COUNT = 200

# Paths
AIRFOILS_TS = PROJECT_ROOT / "src" / "data" / "airfoils.ts"
RE_SETS_TS = PROJECT_ROOT / "src" / "data" / "airfoilReSets.ts"
XFOIL_COORDS_DIR = PROJECT_ROOT / "xfoil" / "coords"
RAW_POLARS_DIR = PROJECT_ROOT / "raw_polars" / "xfoil"
POLARS_OUTPUT_DIR = PROJECT_ROOT / "public" / "polars"


def format_re_filename(re_value: int) -> str:
    """Convert Reynolds number to filename format matching existing convention."""
    if re_value >= 1000000:
        return f"{re_value // 1000000}e6"
    elif re_value >= 1000:
        return f"{re_value // 1000}k"
    return str(re_value)


def is_naca_airfoil(airfoil_id: str) -> Tuple[bool, Optional[str]]:
    """
    Determine if airfoil is a NACA type and extract NACA code.
    Returns (is_naca, naca_code)
    """
    airfoil_lower = airfoil_id.lower()
    
    # NACA 4-digit: naca0006, naca2410, etc.
    match_4digit = re.match(r'^naca(\d{4})$', airfoil_lower)
    if match_4digit:
        return True, match_4digit.group(1)
    
    # NACA 5-digit: naca23012, naca23015, etc.
    match_5digit = re.match(r'^naca(\d{5})$', airfoil_lower)
    if match_5digit:
        return True, match_5digit.group(1)
    
    # NACA 6-series patterns
    # naca63215 -> 63215
    match_632 = re.match(r'^naca63(\d{3})$', airfoil_lower)
    if match_632:
        return True, f"63{match_632.group(1)}"
    
    # naca64012 -> 64012
    match_64 = re.match(r'^naca64(\w+)$', airfoil_lower)
    if match_64:
        code = match_64.group(1)
        # Handle naca64a010 -> 64A010, naca64012 -> 64012
        if code.startswith('a'):
            return True, f"64{code.upper()}"
        return True, f"64{code}"
    
    # naca65a012 -> 65A012, naca65415 -> 65415
    match_65 = re.match(r'^naca65(\w+)$', airfoil_lower)
    if match_65:
        code = match_65.group(1)
        if code.startswith('a'):
            return True, f"65{code.upper()}"
        return True, f"65{code}"
    
    return False, None


def extract_airfoil_ids() -> List[str]:
    """Extract airfoil IDs from src/data/airfoils.ts"""
    if not AIRFOILS_TS.exists():
        raise FileNotFoundError(f"Could not find {AIRFOILS_TS}")
    
    content = AIRFOILS_TS.read_text(encoding='utf-8')
    airfoil_ids = []
    
    # Find all { id: "xxx", ... } patterns
    pattern = r'\{\s*id:\s*["\']([^"\']+)["\']'
    matches = re.findall(pattern, content)
    
    for match in matches:
        airfoil_id = match.strip()
        # Skip "custom" airfoil
        if airfoil_id != "custom":
            airfoil_ids.append(airfoil_id)
    
    # Remove duplicates while preserving order
    seen = set()
    unique_ids = []
    for aid in airfoil_ids:
        if aid not in seen:
            seen.add(aid)
            unique_ids.append(aid)
    
    return unique_ids


def extract_re_sets() -> Dict[str, List[int]]:
    """Extract Reynolds number sets from src/data/airfoilReSets.ts"""
    if not RE_SETS_TS.exists():
        raise FileNotFoundError(f"Could not find {RE_SETS_TS}")
    
    content = RE_SETS_TS.read_text(encoding='utf-8')
    re_sets = {}
    
    # Find patterns like: airfoilId: [80000, 120000, 200000, 300000],
    pattern = r'(\w+):\s*\[([^\]]+)\]'
    matches = re.findall(pattern, content)
    
    for airfoil_id, numbers_str in matches:
        # Parse numbers from string like "80000, 120000, 200000, 300000"
        numbers = []
        for num_str in numbers_str.split(','):
            num_str = num_str.strip()
            if num_str:
                try:
                    numbers.append(int(num_str))
                except ValueError:
                    pass
        
        if numbers:
            re_sets[airfoil_id] = numbers
    
    return re_sets


def get_re_set_for_airfoil(airfoil_id: str, re_sets: Dict[str, List[int]]) -> List[int]:
    """Get Reynolds set for airfoil, with fallback to default."""
    if airfoil_id in re_sets:
        return re_sets[airfoil_id]
    # Default fallback
    return [200000, 500000, 1000000, 2000000]


def build_xfoil_script(airfoil_id: str, re_value: int, polar_txt_path: Path) -> str:
    """
    Build XFOIL script commands as a string.
    Returns the full script to feed to XFOIL via stdin.
    """
    is_naca, naca_code = is_naca_airfoil(airfoil_id)
    
    script_lines = []
    
    # Disable graphics/plotting (headless mode)
    script_lines.append("PLOP")
    script_lines.append("G")
    
    # Load airfoil geometry
    if is_naca:
        # Use NACA command
        script_lines.append(f"NACA {naca_code}")
    else:
        # Use coord file
        coord_file = XFOIL_COORDS_DIR / f"{airfoil_id}.dat"
        if not coord_file.exists():
            raise FileNotFoundError(f"Coord file missing: {coord_file}")
        # Use forward slashes for XFOIL path (Windows compatibility)
        coord_path = str(coord_file).replace('\\', '/')
        script_lines.append(f"LOAD {coord_path}")
    
    # Enter OPER mode
    script_lines.append("OPER")
    
    # Set viscous analysis with Reynolds number
    script_lines.append(f"VISC {re_value}")
    
    # Set iteration count
    script_lines.append(f"ITER {ITER_COUNT}")
    
    # Enable polar accumulation
    script_lines.append("PACC")
    # Use forward slashes for XFOIL path (Windows compatibility)
    polar_path = str(polar_txt_path).replace('\\', '/')
    script_lines.append(polar_path)
    script_lines.append("")  # Blank line to finish PACC
    
    # Run angle sweep
    script_lines.append(f"ASEQ {ALPHA_START} {ALPHA_END} {ALPHA_STEP}")
    
    # Disable polar accumulation
    script_lines.append("PACC")
    script_lines.append("")  # Blank line
    
    # Quit
    script_lines.append("QUIT")
    
    # Join all lines with newlines and ensure final newline
    return "\n".join(script_lines) + "\n"


def parse_xfoil_polar(polar_txt_path: Path) -> Optional[Dict]:
    """
    Parse XFOIL polar text file.
    Returns dict with alpha_deg, cl, cd, cm arrays, or None if parsing fails.
    """
    if not polar_txt_path.exists():
        return None
    
    content = polar_txt_path.read_text(encoding='utf-8')
    lines = content.split('\n')
    
    alpha_deg = []
    cl = []
    cd = []
    cm = []
    
    for line in lines:
        trimmed = line.strip()
        
        # Skip blank lines and comment lines
        if not trimmed or trimmed.startswith('#'):
            continue
        
        # Split by whitespace (handles both spaces and tabs)
        cols = re.split(r'\s+', trimmed)
        cols = [c for c in cols if c]  # Remove empty strings
        
        # Need at least 5 columns: alpha, Cl, Cd, Cdp, Cm
        if len(cols) < 5:
            continue
        
        try:
            alpha_val = float(cols[0])
            cl_val = float(cols[1])
            cd_val = float(cols[2])
            # Skip Cdp at index 3
            cm_val = float(cols[4])
            
            # Only add if all values are valid (not NaN)
            if not (math.isnan(alpha_val) or math.isnan(cl_val) or math.isnan(cd_val) or math.isnan(cm_val)):
                alpha_deg.append(alpha_val)
                cl.append(cl_val)
                cd.append(cd_val)
                cm.append(cm_val)
        except (ValueError, IndexError):
            continue
    
    if len(alpha_deg) == 0:
        return None
    
    return {
        "alpha_deg": alpha_deg,
        "cl": cl,
        "cd": cd,
        "cm": cm
    }


def run_xfoil(airfoil_id: str, re_value: int, polar_txt_path: Path) -> bool:
    """
    Run XFOIL to generate polar.
    Returns True if successful, False otherwise.
    """
    if not XFOIL_PATH.exists():
        print(f"[ERROR] XFOIL executable not found at {XFOIL_PATH}")
        return False
    
    try:
        script = build_xfoil_script(airfoil_id, re_value, polar_txt_path)
    except FileNotFoundError as e:
        print(f"[SKIP] {e}")
        return False
    
    # Ensure output directory exists
    polar_txt_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Run XFOIL
    try:
        # Use subprocess with stdin to feed commands
        process = subprocess.Popen(
            [str(XFOIL_PATH)],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            cwd=str(PROJECT_ROOT)
        )
        
        stdout, stderr = process.communicate(input=script, timeout=300)  # 5 min timeout
        
        if process.returncode != 0:
            print(f"[ERROR] XFOIL failed for {airfoil_id} @ Re={re_value}: exit code {process.returncode}")
            if stderr:
                print(f"  stderr: {stderr[:200]}")  # First 200 chars
            return False
        
        return True
        
    except subprocess.TimeoutExpired:
        print(f"[ERROR] XFOIL timeout for {airfoil_id} @ Re={re_value}")
        process.kill()
        return False
    except Exception as e:
        print(f"[ERROR] XFOIL exception for {airfoil_id} @ Re={re_value}: {e}")
        return False


def write_polar_json(airfoil_id: str, re_value: int, polar_data: Dict, output_path: Path):
    """Write polar data to JSON file in Aeroverse format."""
    # Ensure output directory exists
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Build JSON structure matching existing schema
    json_data = {
        "airfoil": airfoil_id.upper() if airfoil_id.startswith("naca") else airfoil_id,
        "re": re_value,
        "alpha": polar_data["alpha_deg"],
        "cl": polar_data["cl"],
        "cd": polar_data["cd"],
        "cm": polar_data["cm"],
        "mach": 0.0,
        "meta": {
            "source": f"XFOIL 6.99 offline (Re={re_value}, Ncrit~9)",
            "notes": "Generated locally via XFOIL ASEQ sweep",
            "generated_at": None,  # Can be set to current timestamp if needed
            "filter": "none",
            "cm_estimated": False,
            "stall_alpha": None
        }
    }
    
    # Write JSON with 2-space indentation
    output_path.write_text(json.dumps(json_data, indent=2), encoding='utf-8')


def main():
    """Main execution function."""
    print("=" * 60)
    print("XFOIL Polar Generation for Aeroverse Launchpad")
    print("=" * 60)
    print()
    
    # Check XFOIL exists
    if not XFOIL_PATH.exists():
        print(f"[ERROR] XFOIL executable not found at {XFOIL_PATH}")
        print("Please ensure xfoil/xfoil.exe exists in the project root.")
        return
    
    # Extract airfoil IDs and Re sets
    print("Reading airfoil data...")
    try:
        airfoil_ids = extract_airfoil_ids()
        re_sets = extract_re_sets()
        print(f"  Found {len(airfoil_ids)} airfoils")
        print(f"  Found Re sets for {len(re_sets)} airfoils")
    except Exception as e:
        print(f"[ERROR] Failed to read airfoil data: {e}")
        return
    
    # Build job list
    jobs = []
    for airfoil_id in airfoil_ids:
        res = get_re_set_for_airfoil(airfoil_id, re_sets)
        for re_value in res:
            jobs.append((airfoil_id, re_value))
    
    print(f"\nTotal jobs: {len(jobs)}")
    print()
    
    # Statistics
    success_count = 0
    error_count = 0
    skipped_count = 0
    
    # Process each job
    for idx, (airfoil_id, re_value) in enumerate(jobs, 1):
        print(f"[{idx}/{len(jobs)}] {airfoil_id} @ Re={re_value}")
        
        # Determine paths
        polar_txt_path = RAW_POLARS_DIR / airfoil_id / f"{re_value}.txt"
        filename = format_re_filename(re_value) + ".json"
        json_output_path = POLARS_OUTPUT_DIR / airfoil_id / filename
        
        # Check if coord file needed and exists
        is_naca, _ = is_naca_airfoil(airfoil_id)
        if not is_naca:
            coord_file = XFOIL_COORDS_DIR / f"{airfoil_id}.dat"
            if not coord_file.exists():
                print(f"  [SKIP] coord file missing for {airfoil_id}")
                skipped_count += 1
                continue
        
        # Run XFOIL
        if not run_xfoil(airfoil_id, re_value, polar_txt_path):
            error_count += 1
            continue
        
        # Parse polar
        polar_data = parse_xfoil_polar(polar_txt_path)
        if not polar_data or len(polar_data["alpha_deg"]) == 0:
            print(f"  [WARNING] No data parsed from polar file, skipping JSON")
            error_count += 1
            continue
        
        # Write JSON
        try:
            write_polar_json(airfoil_id, re_value, polar_data, json_output_path)
            print(f"  ✓ Generated: {json_output_path.relative_to(PROJECT_ROOT)}")
            success_count += 1
        except Exception as e:
            print(f"  [ERROR] Failed to write JSON: {e}")
            error_count += 1
    
    # Summary
    print()
    print("=" * 60)
    print("Summary")
    print("=" * 60)
    print(f"Successful: {success_count} polars")
    print(f"Failed: {error_count} polars")
    print(f"Skipped (missing coords): {skipped_count} polars")
    print(f"Total: {len(jobs)} jobs")
    print()


if __name__ == "__main__":
    main()

