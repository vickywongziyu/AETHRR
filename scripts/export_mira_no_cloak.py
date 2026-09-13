"""Derive a reversible no-cloak variant, retaining the validated body and clips."""
from pathlib import Path
import json
import struct

root = Path(__file__).resolve().parents[1]
source = root / 'outputs/character/meshy-mira/mira-meshy-web.glb'
data = source.read_bytes()
size = struct.unpack_from('<I', data, 12)[0]
document = json.loads(data[20:20 + size])
removed = []
for node in document['nodes']:
    if node.get('name') in ('Mira_Folded_Hood', 'Mira_Leaf_Clasp', 'Mira_Travel_Cloak'):
        node.pop('mesh', None)
        node.pop('skin', None)
        removed.append(node['name'])
assert len(removed) == 3
# Keep buffer offsets and animation targets intact. Unreferenced garment meshes
# are not instantiated; preserving the binary also avoids recompressing the body.
header = json.dumps(document, separators=(',', ':')).encode()
header += b' ' * (-len(header) % 4)
tail = data[20 + size:]
result = struct.pack('<4sII', b'glTF', 2, 20 + len(header) + len(tail))
result += struct.pack('<II', len(header), 0x4E4F534A) + header + tail
for relative in ('public/character/mira-no-cloak.glb', 'outputs/character/meshy-mira/mira-no-cloak.glb'):
    (root / relative).write_bytes(result)
print('No-cloak variant:', len(result), 'bytes;', ', '.join(removed))
