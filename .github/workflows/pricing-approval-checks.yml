"""Decide whether a freshly collected firm-updates.json needs to be committed.

Every collector run rewrites timestamps (generatedAt, verifiedAt, expiresAt), so
a plain `git diff` always reports a change and every run became a commit and a
production deploy. This script compares only *material* content and skips the
commit when nothing a visitor could see has changed.

Safety: the app drops a patch once it is older than 18h (lib/firmUpdates.ts)
and marks the snapshot stale after 18h (lib/firmUpdateStatus.ts), and the JSON
is bundled at build time. A timestamp-only refresh is therefore still published
whenever any committed patch (or the snapshot itself) would lapse within
--min-remaining-hours, so skipping never lets verified data silently expire.
Any error or ambiguity results in PUBLISH.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

MAX_AGE = timedelta(hours=18)  # Mirrors the 18h limits in lib/firmUpdates.ts and lib/firmUpdateStatus.ts.
DEFAULT_MIN_REMAINING_HOURS = 12.0
VOLATILE_PATCH_FIELDS = {"verifiedAt", "expiresAt", "sha256"}


def parse_time(value: object) -> datetime | None:
    if not isinstance(value, str) or not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    return parsed if parsed.tzinfo else None


def min_remaining_hours(raw: object) -> float:
    """Validated horizon; must leave room below the 18h TTL, else use the default."""
    try:
        hours = float(raw)
    except (TypeError, ValueError):
        return DEFAULT_MIN_REMAINING_HOURS
    if not 0 < hours < MAX_AGE.total_seconds() / 3600:
        return DEFAULT_MIN_REMAINING_HOURS
    return hours


def material(snapshot: dict) -> dict:
    """Snapshot content with per-run volatile values removed."""
    patches = sorted(
        ({k: v for k, v in p.items() if k not in VOLATILE_PATCH_FIELDS} for p in snapshot.get("patches", [])),
        key=lambda p: json.dumps(p, sort_keys=True),
    )
    diagnostics = {}
    for firm, diag in (snapshot.get("sourceDiagnostics") or {}).items():
        # Page byte counts fluctuate on every fetch; reachability and title do not.
        if isinstance(diag, dict) and "error" not in diag:
            diagnostics[firm] = {"ok": True, "title": diag.get("title", "")}
        else:
            diagnostics[firm] = diag
    out = {k: v for k, v in snapshot.items() if k not in {"generatedAt", "patches", "sourceDiagnostics"}}
    out["patches"] = patches
    out["sourceDiagnostics"] = diagnostics
    return out


def earliest_lapse(snapshot: dict) -> datetime | None:
    """First moment a re-publish would extend: the snapshot's or a patch's 18h freshness limit.

    A patch whose expiresAt comes from the source itself (e.g. a promotion end) and is
    earlier than its 18h limit cannot be extended by republishing identical data; once it
    passes, the next collector output differs materially and is published anyway.
    """
    generated = parse_time(snapshot.get("generatedAt"))
    if generated is None:
        return None
    lapses = [generated + MAX_AGE]
    for patch in snapshot.get("patches", []):
        verified, expires = parse_time(patch.get("verifiedAt")), parse_time(patch.get("expiresAt"))
        if verified is None or expires is None:
            return None
        if verified + MAX_AGE <= expires:
            lapses.append(verified + MAX_AGE)
    return min(lapses)


def decide(previous_text: str | None, current_text: str, now: datetime, horizon_hours: float) -> tuple[str, str]:
    try:
        current = json.loads(current_text)
    except (TypeError, ValueError) as exc:
        return "publish", f"current snapshot unreadable ({exc.__class__.__name__})"
    if not previous_text:
        return "publish", "no committed snapshot to compare"
    try:
        previous = json.loads(previous_text)
    except ValueError:
        return "publish", "committed snapshot unreadable"
    if not isinstance(previous, dict) or not isinstance(current, dict):
        return "publish", "snapshot is not a JSON object"
    if previous.get("schemaVersion") != current.get("schemaVersion"):
        return "publish", "schemaVersion changed"
    try:
        if material(previous) != material(current):
            return "publish", "material pricing/review/coverage content changed"
        lapse = earliest_lapse(previous)
    except (AttributeError, TypeError) as exc:
        return "publish", f"could not compare snapshots ({exc.__class__.__name__})"
    if lapse is None:
        return "publish", "committed snapshot has unparseable timestamps"
    remaining = lapse - now
    if remaining < timedelta(hours=horizon_hours):
        return "publish", f"committed data lapses in {remaining.total_seconds() / 3600:.1f}h (< {horizon_hours:g}h); refreshing timestamps"
    return "skip", f"only timestamps changed; committed data stays valid for {remaining.total_seconds() / 3600:.1f}h"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--previous", help="committed firm-updates.json (missing/empty means publish)")
    parser.add_argument("--current", required=True, help="freshly generated firm-updates.json")
    parser.add_argument("--now", help="ISO timestamp override for testing/replay")
    parser.add_argument("--min-remaining-hours", default=os.environ.get("MADPROPS_MIN_REMAINING_HOURS"))
    args = parser.parse_args(argv)

    now = parse_time(args.now) if args.now else datetime.now(timezone.utc)
    horizon = min_remaining_hours(args.min_remaining_hours)
    try:
        previous_path = Path(args.previous) if args.previous else None
        previous_text = previous_path.read_text() if previous_path and previous_path.is_file() else None
        current_text = Path(args.current).read_text()
    except OSError as exc:
        decision, reason = "publish", f"could not read snapshot ({exc.__class__.__name__})"
    else:
        if now is None:
            decision, reason = "publish", "invalid --now value"
        else:
            decision, reason = decide(previous_text, current_text, now, horizon)

    print(f"{decision}: {reason}")
    if os.environ.get("GITHUB_OUTPUT"):
        with open(os.environ["GITHUB_OUTPUT"], "a") as out:
            out.write(f"decision={decision}\nreason={reason}\n")
    if os.environ.get("GITHUB_STEP_SUMMARY"):
        with open(os.environ["GITHUB_STEP_SUMMARY"], "a") as summary:
            summary.write(f"\n**Publish decision:** {decision} — {reason}\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
