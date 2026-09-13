# Run after soften_mira_walk.mjs WITHOUT --contact to sample the raw gait.
import bpy,json,numpy as np
from pathlib import Path
root=Path(__file__).resolve().parents[1];bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(root/'public/character/mira-soft-walk-v3.glb'))
arm=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE');mesh=max((o for o in bpy.context.scene.objects if o.type=='MESH'),key=lambda o:len(o.data.vertices));arm.animation_data_create();result={}
for action in list(bpy.data.actions):
 if action.name not in ('Walk','Idle'):continue
 arm.animation_data.action=action
 if action.slots:arm.animation_data.action_slot=action.slots[0]
 rows=[]
 for i in range(65):
  f=action.frame_range[0]+(action.frame_range[1]-action.frame_range[0])*i/64;bpy.context.scene.frame_set(int(f),subframe=f-int(f));m=mesh.evaluated_get(bpy.context.evaluated_depsgraph_get());geo=m.to_mesh();co=np.empty(len(geo.vertices)*3,dtype=np.float32);geo.vertices.foreach_get('co',co);co=co.reshape(-1,3);mat=np.array(m.matrix_world);height=float((co@mat[2,:3]+mat[2,3]).min());rows.append({'phase':i/64,'sole':height,'lift':-height});m.to_mesh_clear()
 result[action.name]=rows
(root/'scripts/data/mira-soft-contact.json').write_text(json.dumps(result,indent=2));print('CONTACT_SAMPLES',[(k,len(v),min(x['sole'] for x in v),max(x['sole'] for x in v)) for k,v in result.items()])

