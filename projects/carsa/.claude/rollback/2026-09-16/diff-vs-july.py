#!/usr/bin/env python3
"""Compare each 2026-09-16 capture with its 7 Jul 2026 counterpart (explicit label map), write unified diffs for changed pages into diffs/, and summarise in diff-vs-july.md."""

import difflib
import glob
import os

HERE = os.path.dirname(os.path.abspath(__file__))
JULY = os.path.dirname(HERE)
DIFFS = os.path.join(HERE, "diffs")

# Sept label -> July label. Labels absent here had no July capture.
MAP = {
    "home": "home", "used-cars": "srp", "deals": "deals", "detail_used": "vdp-template",
    "car-finance-calculator": "finance-calc", "get-started": "get-started", "part-exchange": "part-exchange",
    "value-car": "value-car", "faq": "faq", "car-finance": "car-finance", "models": "all-models",
    "detail_models": "models-template", "detail_make": "makes-template", "detail_fuel": "fuel-template",
    "detail_near": "near-template", "detail_blog": "blog-template", "blog": "blog-index",
    "detail_promotions": "promotions-tpl", "detail_stores": "stores-template", "stores": "find-store",
    "detail_store": "sell-locations-tpl", "detail_terms": "terms-tpl", "reviews": "reviews", "contact": "contact",
    "careers": "careers", "carsa": "about-carsa", "car-preparation": "car-prep", "overview": "car-care",
    "reserve": "reserve", "tiktok": "tiktok", "podpoint": "podpoint", "404": "404", "sell-car": "sell-car-draft",
    "mot-service-wolverhampton": "mot-wolverhampton", "car-extras": "car-extras",
    "car-paint-interior-protection": "car-protect", "carsacover": "carsacover", "electric-vehicle-cover": "carsacover-ev",
    "cosmetic-maintenance-plan": "cosmetic-plan", "shine-protect-alloy-wheel-protection": "alloy-protect",
    "williams-ceramic-paint-protection": "ceramic-paint", "extended-mechanical-warranty": "ext-warranty",
    "electric-vehicle-extended-warranty": "ev-ext-warranty", "drive-away-car-insurance": "driveaway-ins",
    "payment-failure": "payment-fail", "payment-success": "payment-success", "car-redirect": "car-redirect",
    "impel-test": "impel-test", "chatbot-test": "chatbot-test", "search-demo": "search-demo", "our-team": "our-team",
    "wishlist": "wishlist", "selected-results": "selected-results", "old-home": "old-home",
    "home-autumn-deals": "home-autumn-deals", "home-v1-pre-autumn-deals": "home-v1-pre-autumn",
    "home-04-03-2026-pre-sell-car": "home-pre-sell", "home---sell-car-update": "home-sell-update",
    "sell-car-test-landing-page": "sell-car-test", "vehicle-search-results-backup-31-03-2026": "srp-backup",
    "vehicle-search-results---highlighted-card": "srp-highlighted",
    "vehicle-search-results---price-promotion": "srp-price-promo",
    "vehicle-search-results---attention-grabber-test": "srp-promo-test", "part-exchange-3": "part-ex-dnu",
    "static-template-slug-1749539540598": "all-components", "site": "site",
}
SUFFIXES = {"head": "head", "body": "body", "footer": "footer"}


def read(path):
    return open(path, encoding="utf-8", errors="replace").read() if os.path.exists(path) else None


def label_of(name):
    for s in ("-head.html", "-body.html", "-footer.html"):
        if name.endswith(s):
            return name[: -len(s)], s
    return None, None


os.makedirs(DIFFS, exist_ok=True)
rows, changed, new, gone = [], [], [], []
sept = sorted(os.path.basename(p) for p in glob.glob(os.path.join(HERE, "*.html")))
july_all = set(os.path.basename(p) for p in glob.glob(os.path.join(JULY, "*.html")))
seen_july = set()

for name in sept:
    label, suffix = label_of(name)
    jlabel = MAP.get(label)
    jname = f"{jlabel}{suffix}" if jlabel else None
    a, b = read(os.path.join(HERE, name)), read(os.path.join(JULY, jname)) if jname else None
    if jname:
        seen_july.add(jname)
    if b is None:
        status = "new" if jlabel is None else "new (July block empty)"
        new.append(name)
    elif a == b:
        status = "identical"
    else:
        status = "changed"
        changed.append(name)
        diff = difflib.unified_diff(b.splitlines(keepends=True), a.splitlines(keepends=True), fromfile=f"july/{jname}", tofile=f"sept/{name}")
        open(os.path.join(DIFFS, name.replace(".html", ".diff")), "w").write("".join(diff))
    rows.append((name, jname or "", status, len(a)))

gone = sorted(july_all - seen_july)
with open(os.path.join(HERE, "diff-vs-july.md"), "w") as f:
    f.write("# 2026-09-16 capture vs 7 Jul 2026 snapshot\n\nExplicit label map in diff-vs-july.py; unified diffs for changed files in diffs/.\n\n")
    f.write(f"identical {len(rows)-len(changed)-len(new)} · changed {len(changed)} · new {len(new)} · July-only {len(gone)}\n\n")
    f.write("| Sept file | July file | Status | Bytes |\n|---|---|---|---|\n")
    for r in rows:
        f.write(f"| {r[0]} | {r[1]} | {r[2]} | {r[3]} |\n")
    f.write("\n## July files with no Sept counterpart (block now empty, or page gone)\n\n")
    for g in gone:
        f.write(f"- {g}\n")

print("CHANGED:", *changed, sep="\n  ")
print("NEW:", *new, sep="\n  ")
print("GONE:", *gone, sep="\n  ")
