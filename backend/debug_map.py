"""Debug which nodes are reachable from ENTRENCE via BFS."""
import sys
sys.path.insert(0, '.')
from wayfinding import Wayfinder

wf = Wayfinder()

# Find ENTRENCE node
ent = wf.find_room("ENTRENCE")
print(f"ENTRENCE node: {ent}")
print(f"ENTRENCE neighbors in graph: {wf.graph.get(ent['id'], [])}")

# BFS from ENTRENCE
from collections import deque
queue = deque([ent['id']])
visited = set()
while queue:
    cur = queue.popleft()
    if cur in visited:
        continue
    visited.add(cur)
    for neighbor, _ in wf.graph.get(cur, []):
        queue.append(neighbor)

print(f"\nTotal reachable from ENTRENCE: {len(visited)}")
print(f"Total nodes: {len(wf.nodes)}")

# Which rooms are NOT reachable?
unreachable_rooms = [n for nid, n in wf.nodes.items() if nid not in visited and n.get('type') != 'waypoint']
print(f"\nUnreachable rooms ({len(unreachable_rooms)}):")
for r in unreachable_rooms:
    print(f"  - [{r['floor']}] {r['label']} (id={r['id']})")
    print(f"    Edges: {wf.graph.get(r['id'], [])}")
