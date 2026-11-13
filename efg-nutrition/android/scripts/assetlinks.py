#!/usr/bin/env python3
"""Generate site association using an ACTUAL app signing certificate, never a placeholder."""
import argparse
import json
import re
from pathlib import Path

def generate(fingerprint):
    fingerprint = fingerprint.strip().upper()
    if not re.fullmatch(r"(?:[0-9A-F]{2}:){31}[0-9A-F]{2}", fingerprint):
        raise ValueError("Expected a SHA-256 certificate fingerprint: 32 colon-separated hex bytes")
    return [{
        "relation": ["delegate_permission/common.handle_all_urls"],
        "target": {
            "namespace": "android_app",
            "package_name": "ar.com.nutricionconciencia.app",
            "sha256_cert_fingerprints": [fingerprint]
        }
    }]

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--sha256", required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    data = generate(args.sha256)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
