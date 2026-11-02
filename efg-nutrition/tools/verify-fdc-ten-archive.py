#!/usr/bin/env python3
"""Offline QA gate for NCC's ten USDA SR Legacy evidence records.

Validates immutable ZIP bytes against the separately checked-in, unapproved
review manifest. Verifying a capture is NOT authenticating its remote origin,
preparation equivalence, medical suitability, or permission to publish.
"""
import argparse
import hashlib
import json
import math
import sys
import zipfile
from pathlib import Path

IDS = {"k":1008, "p":1003, "c":1005, "f":1004, "fi":1079}
EXPECTED = {"apple":171688, "oats_raw":173904, "milk_skim":173432,
            "yogurt_greek_light":170894, "spinach_cooked":168463,
            "chicken":171477, "oil":171413, "brownrice":169704,
            "potato":170440, "banana":173944}


def check(test, message):
    if not test:
        raise ValueError(message)


def sha(value):
    return hashlib.sha256(value).hexdigest()


def verify(path: Path, review_path: Path):
    review = json.loads(review_path.read_text(encoding="utf-8"))
    check(review.get("readiness") == "NOT_REVIEWED" and review.get("publishable") is False
          and review.get("rawSourceBackendSeeded") is False,
          "Review manifest must remain UNREVIEWED, unseeded and non-publishable")
    rows = review.get("records", [])
    check(len(rows) == len(EXPECTED) and
          {r.get("foodId"): r.get("fdcId") for r in rows} == EXPECTED,
          "Review manifest must contain exactly ten pinned food ID mappings")
    check(len({r["fdcId"] for r in rows}) == 10, "Duplicate pinned FDC ID")
    with zipfile.ZipFile(path) as bundle:
        files = bundle.namelist()
        check(len(files) == 11 and set(files) == {"manifest.json"} |
              {f"records/{n}.json" for n in EXPECTED.values()},
              "Evidence ZIP has missing or unexpected paths")
        check(all(0 <= x.file_size <= 500_000 for x in bundle.infolist()),
              "Oversized evidence entry")
        package = json.loads(bundle.read("manifest.json"))
        check(package.get("publishable") is False and package.get("operatorReviewed") is False
              and package.get("clinicalEvidence") is False,
              "Evidence falsely claims approval or clinical suitability")
        check(package.get("archiveSha256") == "sha256:" + review.get("sourceArchiveSha256", ""),
              "Source archive hash differs from review manifest")
        selected = package.get("selected", [])
        check(len(selected) == 10 and
              {x.get("foodId"): x.get("fdcId") for x in selected} == EXPECTED,
              "Evidence selected IDs differ from pinned list")
        source_by_id = {x["foodId"]: x for x in selected}
        for row in rows:
            food = row["foodId"]
            source = source_by_id[food]
            raw = bundle.read(f"records/{row['fdcId']}.json")
            digest = sha(raw)
            check(source.get("canonicalRecordSha256") == "sha256:" + digest and
                  row.get("canonicalRecordSha256") == digest,
                  f"Canonical record hash mismatch: {food}")
            record = json.loads(raw)
            check(record.get("fdcId") == row["fdcId"] and
                  record.get("dataType") == "SR Legacy" and
                  source.get("dataType") == "SR Legacy",
                  f"Food identity/type mismatch: {food}")
            check(record.get("description") == row.get("description") ==
                  source.get("description"),
                  f"Source description/preparation changed: {food}")
            check(row.get("unit") == source.get("unit") == "g" and
                  row.get("reviewStatus") == "pending_operator_review" and
                  row.get("canPublish") is False,
                  f"Food cannot be approved or silently switched from 100 g: {food}")
            for key, nutrient_id in IDS.items():
                candidates = [n for n in record.get("foodNutrients", [])
                              if n.get("nutrient", {}).get("id") == nutrient_id]
                check(len(candidates) == 1,
                      f"Missing or duplicated {key} nutrient: {food}")
                item = candidates[0]
                required_unit = "KCAL" if key == "k" else "G"
                check(str(item.get("nutrient", {}).get("unitName", "")).upper() ==
                      required_unit, f"Wrong nutrient unit {key}: {food}")
                value = item.get("amount")
                check(type(value) in (int, float) and
                      math.isfinite(value) and value >= 0,
                      f"Invalid nutrient amount {key}: {food}")
                check(abs(value-row.get("per100g", {}).get(key, math.inf)) < 1e-7
                      and abs(value-source.get("nutrientsPer100g", {}).get(
                          str(nutrient_id), math.inf)) < 1e-7,
                      f"Nutrient differs from fixed review manifest {food}/{key}")
        chick = next(x for x in rows if x["foodId"] == "chicken")
        milk = next(x for x in rows if x["foodId"] == "milk_skim")
        check("BLOCKED_GENERIC_CHICKEN" in chick.get("issue", ""),
              "Generic chicken must not inherit roasted breast source")
        check(milk.get("issue") == "MASS_VOLUME_CONVERSION_NEEDS_REVIEW",
              "100 g of milk cannot silently become 100 ml")
    return {"status": "EVIDENCE_INTEGRITY_PASS_NOT_APPROVED",
            "records_verified": 10, "records_approved": 0,
            "publishable": False,
            "source_archive_digest_checked_against_manifest": True,
            "remote_USDA_origin_reauthenticated": False,
            "clinical_suitability_verified": False}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("archive", type=Path, help="Downloaded inner evidence ZIP")
    parser.add_argument("--review", type=Path,
                        default=Path(__file__).resolve().parent.parent / "docs" /
                        "NCC_FDC_10_OFFICIAL_SOURCE_REVIEW_20261102.json")
    args = parser.parse_args()
    try:
        print(json.dumps(verify(args.archive, args.review), sort_keys=True))
    except (ValueError, OSError, zipfile.BadZipFile, json.JSONDecodeError) as exc:
        print(f"FAIL: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
