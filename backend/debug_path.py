from wayfinding import Wayfinder

wf = Wayfinder()

# Test a simple same-floor route: Front desk -> Dean Office
result = wf.find_path('Dean Office')
if result and 'error' not in result:
    print(f"Route: Front desk -> {result['destination']}")
    print(f"Floor: {result['floor']}")
    print(f"Distance: {result['distance_m']}m, Time: {result['time_min']} min")
    print(f"Steps: {len(result['path_ids'])} nodes")
    print(f"Directions: {result['directions']}")
    print()
    print("Path world coords (x, z):")
    for i, coord in enumerate(result['path_coords']):
        nid = result['path_ids'][i]
        label = wf.nodes[nid].get('label', 'waypoint')
        ntype = wf.nodes[nid].get('type', 'room')
        print(f"  {i:2d}. ({coord[0]:6.1f}, {coord[2]:6.1f})  [{ntype:8s}] {label}")
else:
    print("ERROR:", result)
