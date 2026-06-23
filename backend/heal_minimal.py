"""
Minimal graph healing: connect disconnected components with nearest-neighbor
edges only when gap is small (same building first, then cross-building corridor).
Replaces aggressive bridge_* auto-edges.
"""
import json
import math
import glob
from pathlib import Path
from collections import deque

DATA_DIR = Path(__file__).parent / "data"
MAX_SAME_BUILDING = 15.0
MAX_CROSS_BUILDING = 15.0
MAX_ROOM_WAYPOINT = 5.0


def world_pos(node, buildings):
    b = buildings.get(node["building"], {})
    bpos = b.get("position", [0, 0, 0])
    return bpos[0] + node["x"], bpos[2] + node["z"]


def edge_exists(edges, a, b):
    return any(
        (e["source"] == a and e["target"] == b) or (e["source"] == b and e["target"] == a)
        for e in edges
    )


def get_components(nodes, edges):
    adj = {n["id"]: set() for n in nodes}
    for e in edges:
        if e["source"] in adj and e["target"] in adj:
            adj[e["source"]].add(e["target"])
            adj[e["target"]].add(e["source"])
    remaining = set(adj)
    components = []
    while remaining:
        seed = next(iter(remaining))
        comp = set()
        q = deque([seed])
        while q:
            u = q.popleft()
            if u in comp:
                continue
            comp.add(u)
            remaining.discard(u)
            q.extend(adj[u] - comp)
        components.append(comp)
    return components


def connect_rooms_to_waypoints(floor_name, nodes, edges, buildings):
    rooms = [n for n in nodes if n.get("type") != "waypoint"]
    waypoints = [n for n in nodes if n.get("type") == "waypoint"]
    added = 0
    for room in rooms:
        rx, rz = world_pos(room, buildings)
        candidates = [w for w in waypoints if w["building"] == room["building"]] or waypoints
        best = min(candidates, key=lambda w: (world_pos(w, buildings)[0] - rx) ** 2 + (world_pos(w, buildings)[1] - rz) ** 2)
        dist = math.hypot(rx - world_pos(best, buildings)[0], rz - world_pos(best, buildings)[1])
        if dist > MAX_ROOM_WAYPOINT or edge_exists(edges, room["id"], best["id"]):
            continue
        edges.append({"id": f"room_link_{floor_name}_{room['id']}_{best['id']}", "source": room["id"], "target": best["id"], "visible": False})
        added += 1
    return added


def heal_floor(floor_name, data):
    nodes = data["nodes"]
    edges = list(data["edges"])
    buildings = data["buildings"]
    node_by_id = {n["id"]: n for n in nodes}

    # Remove old bridge edges if any remain
    edges = [e for e in edges if not e.get("id", "").startswith("bridge_")]

    added = connect_rooms_to_waypoints(floor_name, nodes, edges, buildings)
    iteration = 0

    while True:
        comps = get_components(nodes, edges)
        if len(comps) <= 1:
            break
        iteration += 1
        if iteration > 50:
            break

        main = max(comps, key=len)
        orphans = [c for c in comps if c is not main]

        best = None
        for orphan in orphans:
            for a in orphan:
                wa = world_pos(node_by_id[a], buildings)
                bld_a = node_by_id[a]["building"]
                for b in main:
                    wb = world_pos(node_by_id[b], buildings)
                    bld_b = node_by_id[b]["building"]
                    d = math.hypot(wa[0] - wb[0], wa[1] - wb[1])
                    same = bld_a == bld_b
                    limit = MAX_SAME_BUILDING if same else MAX_CROSS_BUILDING
                    if d <= limit and (best is None or d < best[0]):
                        best = (d, a, b, same)

        if best is None:
            break

        _, a, b, same = best
        edge_id = f"gap_link_{floor_name}_{iteration}_{a}_{b}"
        edges.append({"id": edge_id, "source": a, "target": b, "visible": False})
        added += 1

    data["edges"] = edges
    return added


def main():
    total = 0
    for fpath in sorted(glob.glob(str(DATA_DIR / "map_graph_floor_*.json"))):
        floor_name = Path(fpath).stem.replace("map_graph_", "")
        with open(fpath, encoding="utf-8") as f:
            data = json.load(f)
        added = heal_floor(floor_name, data)
        with open(fpath, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
        comps = len(get_components(data["nodes"], data["edges"]))
        print(f"  {floor_name}: added {added} edges, components={comps}")
        total += added
    print(f"Total edges added: {total}")


if __name__ == "__main__":
    main()
