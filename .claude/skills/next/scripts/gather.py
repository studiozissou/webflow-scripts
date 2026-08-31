#!/usr/bin/env python3
"""Collect spec, git, worktree and PR state for /next and emit it as JSON."""

import json
import os
import re
import subprocess
import sys
import time
from collections import defaultdict

WINDOW_DAYS = int(os.environ.get("NEXT_WINDOW_DAYS", "21"))

# Status headers in this repo were written once at spec-creation time and rarely
# corrected, so the vocabulary has drifted to ~28 variants. Match on the leading
# token rather than the whole string, and keep anything unmatched visible as
# "unparsed" instead of silently guessing at it.
BUCKETS = [
    ("blocked", ("blocked",)),
    ("closed", ("done", "closed", "✅", "complete", "shipped")),
    ("buildable", ("ready to build", "ready to plan", "ready to implement",
                   "ready to action", "ready", "approved", "planned")),
    ("in_flight", ("planning", "draft", "partial", "in progress", "wip")),
]


def sh(args, cwd=None):
    try:
        r = subprocess.run(args, cwd=cwd, capture_output=True, text=True, timeout=30)
        return r.stdout.strip() if r.returncode == 0 else ""
    except Exception:
        return ""


def repo_root():
    return sh(["git", "rev-parse", "--show-toplevel"]) or os.getcwd()


def bucket_of(raw):
    low = raw.strip().lower()
    if "blocked on" in low:
        return "blocked"
    for name, keys in BUCKETS:
        for k in keys:
            if low.startswith(k):
                return name
    return "unparsed"


def parse_spec(path, root):
    try:
        with open(path, encoding="utf-8", errors="ignore") as f:
            head = f.read(4000)
    except OSError:
        return None

    def field(name):
        m = re.search(r"^\*\*%s:\*\*\s*(.+)$" % name, head, re.M)
        return m.group(1).strip() if m else ""

    rel = os.path.relpath(path, root)
    # Group by directory, never by the free-text **Client:** header — the header
    # says "NEM Life" where the directory says "nem-life", and grouping on it
    # splits one client into several phantom rows.
    m = re.match(r"projects/([^/]+)/", rel)
    client = m.group(1) if m else "internal"

    slug = field("Slug").strip("`") or os.path.splitext(os.path.basename(path))[0]
    raw = field("Status")
    title = re.search(r"^#\s+(.+)$", head, re.M)

    return {
        "path": rel,
        "client": client,
        "client_label": field("Client"),
        "slug": slug,
        "title": title.group(1).strip() if title else slug,
        "status_raw": raw,
        # "unlabelled" (no header at all) and "unparsed" (header present but not
        # recognised) need different fixes — one needs a header added, the other
        # needs prose replaced with a real status. Collapsing them hides that.
        "status": bucket_of(raw) if raw else "unlabelled",
        "created": field("Created"),
    }


def find_specs(root):
    out = []
    roots = [os.path.join(root, ".claude", "specs")]
    pdir = os.path.join(root, "projects")
    if os.path.isdir(pdir):
        for c in sorted(os.listdir(pdir)):
            roots.append(os.path.join(pdir, c, ".claude", "specs"))
    for d in roots:
        if not os.path.isdir(d):
            continue
        for dirpath, _, files in os.walk(d):
            for fn in files:
                if fn.endswith(".md"):
                    s = parse_spec(os.path.join(dirpath, fn), root)
                    if s:
                        out.append(s)
    return out


def recent_commit_text(root):
    return sh(["git", "log", "--all", "--since=%d.days" % WINDOW_DAYS,
               "--pretty=%s%n%b"], cwd=root).lower()


def recently_touched_files(root):
    """Paths touched by a commit inside the window.

    Deliberately not filesystem mtime: a fresh worktree or clone stamps every
    file with the checkout time, which would mark the entire backlog as recent
    and defeat the whole point of corroboration. Git history is the only
    trustworthy recency signal here.
    """
    raw = sh(["git", "log", "--all", "--since=%d.days" % WINDOW_DAYS,
              "--name-only", "--pretty=format:"], cwd=root)
    return {l.strip() for l in raw.splitlines() if l.strip()}


def worktrees(root):
    raw = sh(["git", "worktree", "list", "--porcelain"], cwd=root)
    out, cur = [], {}
    for line in raw.splitlines():
        if line.startswith("worktree "):
            if cur:
                out.append(cur)
            cur = {"path": line[9:]}
        elif line.startswith("branch "):
            cur["branch"] = line[7:].replace("refs/heads/", "")
    if cur:
        out.append(cur)

    for w in out:
        b = w.get("branch", "")
        w["branch"] = b
        n = sh(["git", "rev-list", "--count", "origin/main..%s" % b], cwd=root) if b else ""
        w["unmerged"] = int(n) if n.isdigit() else None
        w["dirty"] = len([l for l in sh(["git", "status", "--porcelain"],
                                        cwd=w["path"]).splitlines() if l.strip()])
    return out


def open_prs(root):
    raw = sh(["gh", "pr", "list", "--state", "open", "--json",
              "number,title,headRefName"], cwd=root)
    try:
        return json.loads(raw) if raw else []
    except json.JSONDecodeError:
        return []


def main():
    root = repo_root()
    specs = find_specs(root)
    commits = recent_commit_text(root)
    touched = recently_touched_files(root)
    wts = worktrees(root)
    branch_blob = " ".join((w.get("branch") or "") + " " + w["path"] for w in wts).lower()

    # A spec is only "active" if something outside its own Status header agrees it
    # is live. Without this, 62 stale Ready-to-Build rows drown the real answer.
    for s in specs:
        slug = s["slug"].lower()
        in_commits = bool(slug) and slug in commits
        in_branch = bool(slug) and slug in branch_blob
        recent_file = s["path"] in touched
        s["corroborated_by"] = [k for k, v in (
            ("recent commit", in_commits),
            ("live branch/worktree", in_branch),
            ("spec edited recently", recent_file)) if v]
        s["active"] = s["status"] in ("buildable", "in_flight") and bool(s["corroborated_by"])
        s["stale"] = s["status"] == "buildable" and not s["corroborated_by"]

    by_client = defaultdict(lambda: {"active": [], "stale": 0, "blocked": []})
    for s in specs:
        c = by_client[s["client"]]
        if s["active"]:
            c["active"].append(s)
        elif s["stale"]:
            c["stale"] += 1
        if s["status"] == "blocked":
            c["blocked"].append(s)

    # Most corroboration first — a spec backed by a commit and a live branch is a
    # better answer to "what's next" than one backed only by an edit.
    for c in by_client.values():
        c["active"].sort(key=lambda s: -len(s["corroborated_by"]))

    print(json.dumps({
        "root": root,
        "window_days": WINDOW_DAYS,
        "generated": time.strftime("%Y-%m-%d %H:%M"),
        "totals": {
            "specs": len(specs),
            "active": sum(1 for s in specs if s["active"]),
            "stale_buildable": sum(1 for s in specs if s["stale"]),
            "unparsed": sum(1 for s in specs if s["status"] == "unparsed"),
            "unlabelled": sum(1 for s in specs if s["status"] == "unlabelled"),
        },
        "unparsed_specs": [{"path": s["path"], "status_raw": s["status_raw"]}
                           for s in specs if s["status"] == "unparsed"],
        "clients": {k: {"active": v["active"], "stale": v["stale"],
                        "blocked": v["blocked"]}
                    for k, v in sorted(by_client.items())},
        "worktrees": wts,
        "open_prs": open_prs(root),
    }, indent=1))


if __name__ == "__main__":
    sys.exit(main())
