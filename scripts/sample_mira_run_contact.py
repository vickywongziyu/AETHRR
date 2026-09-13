"""Sample raw V5 soles and align ground contact with backward foot travel.

Run after refine_mira_run.mjs WITHOUT --contact, in factory-startup Blender.
"""
import json
from pathlib import Path

import bpy
import numpy as np

root = Path(__file__).resolve().parents[1]


def sample(filename):
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for action in list(bpy.data.actions):
        bpy.data.actions.remove(action)
    bpy.ops.import_scene.gltf(filepath=str(root / 'public/character' / filename))
    arm = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE')
    mesh = max((o for o in bpy.context.scene.objects if o.type == 'MESH'),
               key=lambda o: len(o.data.vertices))
    action = bpy.data.actions['Run']
    arm.animation_data_create()
    arm.animation_data.action = action
    if action.slots:
        arm.animation_data.action_slot = action.slots[0]
    rows = []
    for i in range(65):
        f = action.frame_range[0] + (action.frame_range[1] - action.frame_range[0]) * i / 64
        bpy.context.scene.frame_set(int(f), subframe=f - int(f))
        evaluated = mesh.evaluated_get(bpy.context.evaluated_depsgraph_get())
        geometry = evaluated.to_mesh()
        co = np.empty(len(geometry.vertices) * 3, dtype=np.float32)
        geometry.vertices.foreach_get('co', co)
        co = co.reshape(-1, 3)
        matrix = np.array(evaluated.matrix_world)
        rows.append(float((co @ matrix[2, :3] + matrix[2, 3]).min()))
        evaluated.to_mesh_clear()
    return rows


raw = sample('mira-grounded-run-v5.glb')
rows = []
for i, sole in enumerate(raw):
    # Toe trajectories reverse into backward stance near phase .23. Keep
    # the preceding forward swing airborne rather than pinning it to the
    # floor. Repeat the same low flight arc for the opposite half-cycle.
    phase = (i / 64) % .5
    target = .035 * np.sin(np.pi * (phase - .03) / .20) ** 2 if .03 < phase < .23 else 0.0
    rows.append({'phase': i / 64, 'sole': sole, 'target': target, 'lift': target - sole})
(root / 'scripts/data/mira-run-contact.json').write_text(json.dumps({'Run': rows}, indent=2))
print('RUN_CONTACT_PROFILE', {'raw': [min(raw), max(raw)],
                              'target': [min(r['target'] for r in rows), max(r['target'] for r in rows)],
                              'flightSamples': sum(r['target'] > .005 for r in rows[:-1])})
