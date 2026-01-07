#!/bin/sh
# bin/view_model.sh - Render a view model from a trace JSON and .view rules
set -eu

if [ $# -ne 3 ]; then
    echo "Usage: $0 <view_file> <trace_json> <out_json>" >&2
    exit 1
fi

VIEW_FILE="$1"
TRACE_JSON="$2"
OUT_JSON="$3"

command -v python3 >/dev/null 2>&1 || { echo "error: need python3" >&2; exit 127; }

python3 - "$VIEW_FILE" "$TRACE_JSON" "$OUT_JSON" <<'PY'
import json
import sys
from datetime import datetime, timezone

view_path, trace_path, out_path = sys.argv[1:4]

def parse_view(path):
    data = {
        "view_id": None,
        "version": None,
        "status": None,
        "interface_id": None,
        "order_primary": None,
        "order_secondary": None,
        "nav_octree": False,
        "time_bucket_seconds": None,
        "topic_key_source": None,
        "depth_max": 6,
        "output_model": None,
        "output_must_include": []
    }
    in_output = False
    with open(path, "r", encoding="utf-8") as fh:
        for raw in fh:
            line = raw.split("#", 1)[0].strip()
            if not line:
                continue
            if in_output:
                if line.startswith("end output"):
                    in_output = False
                    continue
                if line.startswith("-"):
                    data["output_must_include"].append(line[1:].strip())
                continue
            if line.startswith("output must_include"):
                in_output = True
                continue
            if line.startswith("view "):
                data["view_id"] = line.split(None, 1)[1]
                continue
            if line.startswith("version "):
                data["version"] = line.split(None, 1)[1]
                continue
            if line.startswith("status "):
                data["status"] = line.split(None, 1)[1]
                continue
            if line.startswith("requires interface "):
                data["interface_id"] = line.split(None, 2)[2]
                continue
            if line.startswith("order primary "):
                data["order_primary"] = line.split(None, 2)[2]
                continue
            if line.startswith("order secondary "):
                data["order_secondary"] = line.split(None, 2)[2]
                continue
            if line.startswith("nav octree "):
                data["nav_octree"] = line.split(None, 2)[2] == "enabled"
                continue
            if line.startswith("time_bucket_seconds "):
                data["time_bucket_seconds"] = int(line.split()[1])
                continue
            if line.startswith("topic_key_source "):
                data["topic_key_source"] = line.split()[1]
                continue
            if line.startswith("depth_max "):
                data["depth_max"] = int(line.split()[1])
                continue
            if line.startswith("output model "):
                data["output_model"] = line.split(None, 2)[2]
                continue
    return data

def parse_timestamp(value):
    if isinstance(value, (int, float)):
        return int(value)
    if isinstance(value, str) and value.isdigit():
        return int(value)
    if isinstance(value, str):
        raw = value.strip()
        if raw.endswith("Z"):
            raw = raw[:-1] + "+00:00"
        try:
            dt = datetime.fromisoformat(raw)
            return int(dt.replace(tzinfo=timezone.utc).timestamp())
        except ValueError:
            return 0
    return 0

def bucket_key(epoch, seconds):
    start = (epoch // seconds) * seconds
    dt = datetime.fromtimestamp(start, tz=timezone.utc)
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")

view = parse_view(view_path)

required = ["view_id", "interface_id", "order_primary", "order_secondary", "output_model"]
missing = [k for k in required if not view.get(k)]
if missing:
    sys.stderr.write("error: missing view fields: %s\n" % ", ".join(missing))
    sys.exit(2)

if view["order_primary"] != "timestamp_asc" or view["order_secondary"] != "entry_id_lex":
    sys.stderr.write("error: unsupported order in view\n")
    sys.exit(2)

if view["output_model"] != "view_model.v3":
    sys.stderr.write("error: unsupported output model\n")
    sys.exit(2)

if view["nav_octree"] and not view["time_bucket_seconds"]:
    sys.stderr.write("error: nav octree enabled without time_bucket_seconds\n")
    sys.exit(2)

with open(trace_path, "r", encoding="utf-8") as fh:
    trace = json.load(fh)

testimony = trace.get("testimony", trace)
entries_in = testimony.get("entries") or trace.get("entries")
if not entries_in:
    sys.stderr.write("error: trace missing entries\n")
    sys.exit(2)

trace_id = trace.get("trace_id") or testimony.get("trace_id")
rid = trace.get("ulp", {}).get("rid")
if not trace_id and rid:
    trace_id = "sha256:%s" % rid
if not trace_id:
    sys.stderr.write("error: trace missing trace_id\n")
    sys.exit(2)

if testimony.get("interface") and testimony.get("interface") != view["interface_id"]:
    sys.stderr.write("error: interface mismatch\n")
    sys.exit(2)

entries_map = {}
ordering = []

for entry in entries_in:
    entry_id = entry.get("id")
    quadrant = entry.get("quadrant")
    unit = entry.get("unit")
    timestamp = entry.get("timestamp")
    content = entry.get("content")
    if content is None:
        content = entry.get("text")
    if not entry_id or not quadrant or not unit or not timestamp:
        sys.stderr.write("error: entry missing required fields\n")
        sys.exit(2)
    topic_key = entry.get("topic_key")
    entry_out = {
        "id": entry_id,
        "quadrant": quadrant,
        "unit": unit,
        "timestamp": timestamp,
        "content": content if content is not None else ""
    }
    if isinstance(topic_key, str) and topic_key:
        entry_out["topic_key"] = topic_key
    epoch = parse_timestamp(timestamp)
    ordering.append((epoch, entry_id))
    entries_map[entry_id] = entry_out

ordering.sort(key=lambda item: (item[0], item[1]))
ordered_ids = [entry_id for _, entry_id in ordering]

quadrant_keys = ["known_known", "known_unknown", "unknown_known", "unknown_unknown"]
quadrants = {key: {"entries": []} for key in quadrant_keys}

for entry_id in ordered_ids:
    entry = entries_map[entry_id]
    quadrant = entry["quadrant"]
    if quadrant not in quadrants:
        quadrants[quadrant] = {"entries": []}
    quadrants[quadrant]["entries"].append(entry_id)

nav = {
    "type": "octree",
    "enabled": bool(view["nav_octree"]),
    "time_bucket_seconds": view["time_bucket_seconds"] or 0,
    "depth_max": view["depth_max"],
    "nodes": []
}

if view["nav_octree"]:
    node_map = {}
    for entry_id in ordered_ids:
        entry = entries_map[entry_id]
        epoch = parse_timestamp(entry["timestamp"])
        bucket = bucket_key(epoch, view["time_bucket_seconds"])
        if view["topic_key_source"] == "explicit_only":
            topic = entry.get("topic_key") or "~"
        else:
            topic = entry.get("topic_key") or "~"
        path = (entry["quadrant"], bucket, f"topic:{topic}")
        node_map.setdefault(path, []).append(entry_id)
    for path in sorted(node_map.keys()):
        nav["nodes"].append({
            "path": list(path),
            "entries": node_map[path]
        })

view_model = {
    "view_model_version": "v3",
    "trace_id": trace_id,
    "interface_id": view["interface_id"],
    "view_id": view["view_id"],
    "generated_at": testimony.get("created") or trace.get("created") or "",
    "order": [view["order_primary"], view["order_secondary"]],
    "quadrants": quadrants,
    "entries": entries_map,
    "nav": nav,
    "hash_panel": {
        "trace_hash": trace_id,
        "verify_instructions": "Compute sha256 over canonical trace bytes; compare."
    }
}

with open(out_path, "w", encoding="utf-8") as fh:
    json.dump(view_model, fh, indent=2, sort_keys=True)
    fh.write("\n")
PY
