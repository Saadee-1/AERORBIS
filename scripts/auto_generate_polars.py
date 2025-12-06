#!/usr/bin/env python3
"""
Auto-generate Aeroverse polar JSONs from AirfoilTools/XFOIL-style polar text files.

- Supports BOTH:
  • Remote TXT via HTTP(S) (e.g. AirfoilTools polar text URLs)
  • Local TXT files already on disk

- For each entry in AIRFOIL_BATCH, it will:
  1) Load/download the TXT polar file
  2) Parse alpha, Cl, Cd, Cm columns
  3) Build JSON in the same schema as existing Aeroverse polar files
  4) Write to the desired output path (creating folders if needed)

Usage (from repo root):
    python scripts/auto_generate_polars.py
    python scripts/auto_generate_polars.py --only selig1223
    python scripts/auto_generate_polars.py --dry-run

You ONLY need to edit AIRFOIL_BATCH below.
"""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import List, Optional
from urllib.parse import urlparse
from urllib.request import urlopen


# ==============================
# CONFIG: Fill this gradually
# ==============================

@dataclass
class PolarJob:
    airfoil: str
    re: int
    src: str          # URL (http/https) OR local txt path
    out: str          # output JSON path (relative to repo root)
    mach: float = 0.0
    source: str = "XFOIL / AirfoilTools import"
    notes: str = ""


#: List of all airfoil/Re jobs you want to generate.
#: Start small (e.g. only S1223 1–2 Re), then add more entries over time.
AIRFOIL_BATCH: List[PolarJob] = [
    # EXAMPLES (uncomment + adjust):

    # Polar from remote AirfoilTools text URL:
    # Polar text URL usually looks like:
    #   https://airfoiltools.com/polar/text?polar=xf-s1223-il-200000
    #
    # PolarJob(
    #     airfoil="selig1223",
    #     re=200_000,
    #     src="https://airfoiltools.com/polar/text?polar=xf-s1223-il-200000",
    #     out="public/polars/selig1223/200k.json",
    #     mach=0.0,
    #     source="XFOIL via AirfoilTools (xf-s1223-il-200000)",
    #     notes="Ncrit=9, clean",
    # ),

    # Polar from local file you already downloaded:
    # PolarJob(
    #     airfoil="selig1223",
    #     re=500_000,
    #     src="raw_polars/xf-s1223-il-500000.txt",
    #     out="public/polars/selig1223/500k.json",
    #     mach=0.0,
    #     source="XFOIL via AirfoilTools (xf-s1223-il-500000)",
    #     notes="Ncrit=9, clean",
    # ),
]


# ==============================
# Core functions
# ==============================


def is_url(path_or_url: str) -> bool:
    """Return True if the string looks like an HTTP/HTTPS URL."""
    parsed = urlparse(path_or_url)
    return parsed.scheme in ("http", "https")


def fetch_text(src: str) -> str:
    """
    Fetch the raw polar text.

    - If 'src' is an http/https URL, download via urllib.
    - Otherwise, treat as local file path.
    """
    if is_url(src):
        print(f"  [fetch] downloading {src}")
        with urlopen(src) as resp:
            charset = resp.headers.get_content_charset() or "utf-8"
            return resp.read().decode(charset, errors="replace")
    else:
        path = Path(src)
        if not path.is_file():
            raise FileNotFoundError(f"Local polar file not found: {path}")
        print(f"  [fetch] reading local file {path}")
        return path.read_text(encoding="utf-8")


def parse_airfoiltools_polar(text: str):
    """
    Parse an AirfoilTools/XFOIL-style polar text block.

    Assumed columns per data row:
        alpha  Cl  Cd  Cdp  Cm  Top_Xtr  Bot_Xtr

    We skip:
        - empty lines
        - lines starting with '#' (comments)
        - lines that can't be parsed as floats
    """
    alphas: List[float] = []
    cls: List[float] = []
    cds: List[float] = []
    cms: List[float] = []

    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        parts = line.split()
        if len(parts) < 5:
            # not enough columns, skip
            continue
        try:
            alpha = float(parts[0])
            cl = float(parts[1])
            cd = float(parts[2])
            cm = float(parts[4])
        except ValueError:
            # some malformed / header-like line
            continue

        alphas.append(alpha)
        cls.append(cl)
        cds.append(cd)
        cms.append(cm)

    if not alphas:
        raise ValueError("No data rows parsed from polar TXT (alpha list empty).")

    if not (len(alphas) == len(cls) == len(cds) == len(cms)):
        raise ValueError(
            f"Length mismatch: alpha={len(alphas)}, cl={len(cls)}, "
            f"cd={len(cds)}, cm={len(cms)}"
        )

    return alphas, cls, cds, cms


def build_polar_json(job: PolarJob, alphas, cls, cds, cms) -> dict:
    """
    Build JSON dict that matches Aeroverse polar schema:

    {
      "meta": {
        "airfoil": "selig1223",
        "re": 200000,
        "mach": 0.0,
        "source": "...",
        "notes": "..."
      },
      "data": {
        "alpha_deg": [...],
        "cl": [...],
        "cd": [...],
        "cm": [...]
      }
    }
    """
    meta = {
        "airfoil": job.airfoil,
        "re": job.re,
        "mach": job.mach,
        "source": job.source,
        "notes": job.notes,
    }

    data = {
        "alpha_deg": alphas,
        "cl": cls,
        "cd": cds,
        "cm": cms,
    }

    return {"meta": meta, "data": data}


def write_json(path: Path, payload: dict):
    """Write JSON with indent=2, ensuring parent folders exist."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)
    print(f"  [write] {path} (points={len(payload['data']['alpha_deg'])})")


# ==============================
# CLI
# ==============================


def main(argv: Optional[list[str]] = None) -> int:
    parser = argparse.ArgumentParser(
        description="Batch-generate Aeroverse polar JSONs from AirfoilTools/XFOIL-style TXT files."
    )
    parser.add_argument(
        "--only",
        metavar="AIRFOIL_ID",
        help="Only process jobs for this airfoil id (e.g. 'selig1223').",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show which jobs WOULD run, but do not fetch or write any files.",
    )

    args = parser.parse_args(argv)

    if not AIRFOIL_BATCH:
        print("No jobs defined in AIRFOIL_BATCH. Edit scripts/auto_generate_polars.py to add some.")
        return 0

    jobs = AIRFOIL_BATCH
    if args.only:
        jobs = [j for j in jobs if j.airfoil == args.only]
        if not jobs:
            print(f"No jobs found for airfoil id '{args.only}'.")
            return 1

    print(f"Total jobs configured: {len(AIRFOIL_BATCH)}")
    print(f"Jobs to run now     : {len(jobs)}")
    if args.dry_run:
        print("\n[DRY RUN] Listing jobs:")
        for j in jobs:
            print(
                f"  - {j.airfoil} @ Re={j.re} "
                f"src={j.src} out={j.out}"
            )
        return 0

    for job in jobs:
        print(f"\n=== {job.airfoil} @ Re={job.re} ===")
        try:
            raw_text = fetch_text(job.src)
            alphas, cls, cds, cms = parse_airfoiltools_polar(raw_text)
            payload = build_polar_json(job, alphas, cls, cds, cms)
            out_path = Path(job.out)
            write_json(out_path, payload)
        except Exception as e:
            print(f"  [ERROR] {e}")
            # Continue with next job instead of aborting entire batch
            continue

    print("\nDone.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
