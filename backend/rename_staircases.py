import json, glob, os

for f in glob.glob('data/map_graph_floor_*.json'):
    with open(f, 'r', encoding='utf-8') as file:
        data = json.load(file)
    
    modified = False
    for n in data.get('nodes', []):
        if n.get('label', '').lower() == 'staircase':
            if n.get('building') == 'building_1':
                n['label'] = 'Staircase 1'
                modified = True
            elif n.get('building') == 'building_2':
                n['label'] = 'Staircase 2'
                modified = True
    
    if modified:
        with open(f, 'w', encoding='utf-8') as file:
            json.dump(data, file, indent=4)
        print(f"Updated {f}")
