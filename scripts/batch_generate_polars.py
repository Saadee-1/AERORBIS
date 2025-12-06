from my_converter import convert_polar

JOBS = [
    {
        "airfoil": "selig1223",
        "re": 200_000,
        "src": "raw_polars/xf-s1223-il-200000.txt",
        "out": "public/polars/selig1223/200k.json",
        "mach": 0.0,
        "source": "XFOIL via AirfoilTools (xf-s1223-il-200000)",
        "notes": "Ncrit=9, clean",
    },
    {
        "airfoil": "selig1223",
        "re": 500_000,
        "src": "raw_polars/xf-s1223-il-500000.txt",
        "out": "public/polars/selig1223/500k.json",
        "mach": 0.0,
        "source": "XFOIL via AirfoilTools (xf-s1223-il-500000)",
        "notes": "Ncrit=9, clean",
    },
    # baaki airfoils yahan add karte jana...
]

def main():
    for job in JOBS:
        print(f"=== {job['airfoil']} @ Re={job['re']} ===")
        try:
            convert_polar(**job)
        except Exception as e:
            print("  [ERROR]", e)

if __name__ == "__main__":
    main()
