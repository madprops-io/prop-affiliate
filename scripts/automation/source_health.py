"""Summarize verified pricing coverage and source outages.

A successful collection run does not mean every firm was verified.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

def render(data):
    patches = data.get("patches", [])
    review = data.get("review", [])
    coverage = data.get("coverage", {})
    diagnostics = data.get("sourceDiagnostics", {})
    unsupported = data.get("unsupportedFirms", {})
    verified_by_firm = {}
    for patch in patches:
        key = patch.get("key", "")
        firm = next((name for name in ("tradeify", "daytraders", "apex", "lucid") if key.startswith(name + "-")), "other")
        verified_by_firm[firm] = verified_by_firm.get(firm, 0) + 1
    lines = ["# MadProps source health", "",
             f"Collected: {data.get('generatedAt', 'unknown')}", "",
             f"- Verified plan patches: **{len(patches)}**",
             f"- Plans requiring investigation: **{len(review)}**",
             f"- Firms without collector integrations: **{len(unsupported)}**", "",
             "## Integrated source status", "",
             "| Firm | Verified plans | Source status |",
             "|---|---:|---|"]
    for firm in sorted(diagnostics):
        status = diagnostics[firm]
        state = ("BLOCKED / ERROR: " + str(status["error"])) if "error" in status else "Fetched"
        lines.append(f"| {firm} | {verified_by_firm.get(firm, 0)} | {state.replace('|', '/')} |")
    lines += ["", "## Firms awaiting integrations", ""]
    for firm, count in sorted(unsupported.items(), key=lambda pair: -pair[1]):
        lines.append(f"- {firm}: {count} Sheet plans")
    lines += ["", "## Interpretation", "",
              "A green GitHub workflow only confirms that the collector ran; it does **not** confirm all firms are current.",
              "Blocked sources must retain existing data and must never be reported as freshly verified.",
              "Unknown coupon codes and affiliate codes require review.", ""]
    return "\n".join(lines)

if __name__ == "__main__":
    data = json.loads((ROOT / "data/firm-updates.json").read_text())
    report = render(data)
    output = ROOT / "data/source-health.md"
    output.write_text(report)
    print(report)
    import os
    if os.environ.get("GITHUB_STEP_SUMMARY"):
        with open(os.environ["GITHUB_STEP_SUMMARY"], "a") as stream:
            stream.write(report)
