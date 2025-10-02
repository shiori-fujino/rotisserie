#!/usr/bin/env python3
import subprocess
import sys

# List all your scraper scripts here
SCRAPERS = [
    "42gladesville_scraper_db.py",
    "no5_scraper_db.py",
    "kyoto206_scraper_db.py",
    "sakura57_scraper_db.py",
    "ginza_scraper_db.py",
    "ginza479_scraper_db.py",
]

def run(cmd):
    print(f"\n=== Running {cmd} ===\n")
    result = subprocess.run([sys.executable, cmd], capture_output=True, text=True)
    print(result.stdout)
    if result.stderr:
        print("STDERR:", result.stderr)

def main():
    for s in SCRAPERS:
        run(s)

if __name__ == "__main__":
    main()
