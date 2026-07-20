#!/usr/bin/env python3
"""Return success when a Playwright JSON result executed a tagged REQ test."""

import json
import re
import sys
from pathlib import Path


def values(value):
    if isinstance(value, str):
        return [value]
    if isinstance(value, dict):
        return [str(value.get("type", "")), str(value.get("description", ""))]
    return []


def tagged(node, ancestry, req_id):
    text = [*ancestry, str(node.get("title", ""))]
    for field in ("annotations", "tags"):
        for value in node.get(field, []):
            text.extend(values(value))
    return any(req_id in value for value in text)


def executed(test):
    results = test.get("results", [])
    return any(result.get("status") not in {"skipped", "interrupted"} for result in results)


def contains_tagged_execution(node, ancestry, req_id):
    title = str(node.get("title", ""))
    path = [*ancestry, title] if title else ancestry
    for spec in node.get("specs", []):
        if tagged(spec, path, req_id) and any(executed(test) for test in spec.get("tests", [])):
            return True
    for test in node.get("tests", []):
        if tagged(test, path, req_id) and executed(test):
            return True
    return any(contains_tagged_execution(suite, path, req_id) for suite in node.get("suites", []))


def main():
    if len(sys.argv) != 3 or not re.fullmatch(r"REQ-[A-Z0-9-]+", sys.argv[1]):
        raise SystemExit("usage: has-req-tagged-e2e-result.py REQ-XXX e2e-results.json")

    req_id, filename = sys.argv[1:]
    with Path(filename).open(encoding="utf-8") as handle:
        report = json.load(handle)
    raise SystemExit(0 if contains_tagged_execution(report, [], req_id) else 1)


if __name__ == "__main__":
    main()
