"""Resolves the Wikidata QIDs and current claims needed for the Q7681850 changeset."""
import json
import urllib.parse
import urllib.request

API = "https://www.wikidata.org/w/api.php"
UA = {"User-Agent": "tamsen-seo-audit/1.0 (will@teamzissou.io)"}


def get(params):
    url = API + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers=UA)
    return json.load(urllib.request.urlopen(req))


print("=== candidate QIDs ===")
for term in ["filmmaker", "podcaster", "Matrix Award", "documentary filmmaker", "film producer"]:
    data = get({"action": "wbsearchentities", "search": term, "language": "en", "format": "json", "limit": 5})
    print(f"--- {term} ---")
    for d in data.get("search", []):
        print("   ", d["id"], "|", d.get("label"), "|", (d.get("description") or "")[:65])

print("\n=== current Q7681850 claims ===")
ent = get({"action": "wbgetentities", "ids": "Q7681850", "format": "json"})
e = ent["entities"]["Q7681850"]
print("label:", e["labels"].get("en", {}).get("value"))
print("description:", e["descriptions"].get("en", {}).get("value"))
for pid in ["P106", "P166", "P800", "P2397", "P856"]:
    claims = e["claims"].get(pid, [])
    vals = []
    for c in claims:
        dv = c["mainsnak"].get("datavalue", {}).get("value")
        vals.append(dv.get("id") if isinstance(dv, dict) and "id" in dv else dv)
    print(f"{pid}: {vals}")
    refs = sum(1 for c in claims if c.get("references"))
    print(f"     claims={len(claims)} with_references={refs}")
