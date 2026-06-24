import json, glob
for f in glob.glob('data/map_graph_floor_*.json'):
  with open(f, 'r', encoding='utf-8') as file:
    data = json.load(file)
    print(f'--- {f} ---')
    for bid, b in data.get('buildings', {}).items():
        print(f'  Bldg {bid}: {b.get("name")}')
    for n in data.get('nodes', []):
      if 'staircase' in n.get('label', '').lower():
         print(f'  Node: {n.get("label")} in bldg {n.get("building")}')
