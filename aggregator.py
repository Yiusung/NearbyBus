#!/usr/bin/env python3
"""
HK Bus Stop Aggregator
Fetches stops from KMB, CTB, NLB and produces a unified positional-JSON stops.json
Usage: python3 aggregator.py
Output: stops.json (~1.4MB raw, ~400KB gzipped)
"""

import requests
import json
import time
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor, as_completed

session = requests.Session()
session.headers.update({"User-Agent": "HKBusAggregator/1.0"})

SCHEMA = ["id", "en", "tc", "lat", "lng", "op"]
seen = {}   # dedup key -> row
failed = 0


def add_stop(stop_id, en, tc, lat, lng, op):
    global failed
    key = f"{op}_{stop_id}"
    if key in seen:
        return
    if not lat or not lng:
        failed += 1
        return
    try:
        lat = round(float(lat), 6)
        lng = round(float(lng), 6)
    except (ValueError, TypeError):
        failed += 1
        return
    seen[key] = [stop_id, en, tc, lat, lng, op]


# ── KMB ───────────────────────────────────────────
def fetch_kmb():
    print("[KMB] Fetching all stops...")
    try:
        r = session.get("https://data.etabus.gov.hk/v1/transport/kmb/stop", timeout=30)
        r.raise_for_status()
        stops = r.json().get("data", [])
        for s in stops:
            add_stop(s["stop"], s.get("name_en", ""), s.get("name_tc", ""),
                     s.get("lat"), s.get("long"), "kmb")
        print(f"[KMB] Done — {len(stops)} stops")
    except Exception as e:
        print(f"[KMB] ERROR: {e}")


# ── CTB (Citybus) ─────────────────────────────────
def fetch_ctb():
    print("[CTB] Fetching routes...")
    try:
        r = session.get("https://rt.data.gov.hk/v2/transport/citybus/route/ctb", timeout=30)
        r.raise_for_status()
        routes = [rt["route"] for rt in r.json().get("data", [])]
        print(f"[CTB] {len(routes)} routes found, fetching stops per route...")

        all_stop_ids = set()

        def get_route_stops(route):
            ids = set()
            for direction in ["outbound", "inbound"]:
                try:
                    url = f"https://rt.data.gov.hk/v2/transport/citybus/route-stop/ctb/{route}/{direction}"
                    resp = session.get(url, timeout=15)
                    if resp.ok:
                        for item in resp.json().get("data", []):
                            ids.add(item["stop"])
                except Exception:
                    pass
                time.sleep(0.05)
            return ids

        with ThreadPoolExecutor(max_workers=8) as pool:
            futures = {pool.submit(get_route_stops, r): r for r in routes}
            for f in as_completed(futures):
                all_stop_ids.update(f.result())

        print(f"[CTB] {len(all_stop_ids)} unique stops, fetching metadata...")

        def get_stop_meta(sid):
            try:
                resp = session.get(f"https://rt.data.gov.hk/v2/transport/citybus/stop/{sid}", timeout=10)
                if resp.ok:
                    d = resp.json().get("data", {})
                    add_stop(sid, d.get("name_en", ""), d.get("name_tc", ""),
                             d.get("lat"), d.get("long"), "ctb")
            except Exception:
                pass

        with ThreadPoolExecutor(max_workers=12) as pool:
            list(pool.map(get_stop_meta, all_stop_ids))

        print(f"[CTB] Done")
    except Exception as e:
        print(f"[CTB] ERROR: {e}")


# ── NLB (New Lantao Bus) ─────────────────────────
def fetch_nlb():
    print("[NLB] Fetching routes...")
    try:
        r = session.post(
            "https://rt.data.gov.hk/v2/transport/nlb/route.php",
            json={"action": "list"},
            timeout=30,
        )
        r.raise_for_status()
        routes = r.json().get("routes", [])
        print(f"[NLB] {len(routes)} routes, fetching stop lists...")

        def get_route_stops(route_id):
            try:
                resp = session.post(
                    "https://rt.data.gov.hk/v2/transport/nlb/stop.php",
                    json={"action": "list", "routeId": route_id},
                    timeout=15,
                )
                if resp.ok:
                    for s in resp.json().get("stops", []):
                        add_stop(
                            s.get("stopId", ""),
                            s.get("stopName_en", ""),
                            s.get("stopName_tc", ""),
                            s.get("latitude"),
                            s.get("longitude"),
                            "nlb",
                        )
            except Exception:
                pass

        with ThreadPoolExecutor(max_workers=6) as pool:
            list(pool.map(get_route_stops, [r["routeId"] for r in routes]))

        print(f"[NLB] Done")
    except Exception as e:
        print(f"[NLB] ERROR: {e}")


# ── Main ──────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 50)
    print("HK Bus Stop Aggregator")
    print("=" * 50)

    t0 = time.time()
    fetch_kmb()
    fetch_ctb()
    fetch_nlb()

    output = {
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "schema": SCHEMA,
        "data": list(seen.values()),
    }

    with open("stops.json", "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, separators=(",", ":"))

    elapsed = time.time() - t0
    raw_size = len(json.dumps(output, ensure_ascii=False, separators=(",", ":")))

    print("=" * 50)
    print(f"Total unique stops : {len(seen)}")
    print(f"Failed/invalid     : {failed}")
    print(f"File size          : {raw_size / 1024:.0f} KB")
    print(f"Time elapsed       : {elapsed:.1f}s")
    print(f"Output             : stops.json")
    print("=" * 50)
