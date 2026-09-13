import bpy,json,numpy as np,argparse,sys
from pathlib import Path
root=Path(__file__).resolve().parents[1];bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
parser=argparse.ArgumentParser();parser.add_argument('--model',default='public/character/mira-grounded-run-v5.glb');parser.add_argument('--output',default='work/meshy-mira/gait-run/foot-contact-verification.json');args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
bpy.ops.import_scene.gltf(filepath=str(root/args.model))
arm=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE');mesh=max((o for o in bpy.context.scene.objects if o.type=='MESH'),key=lambda o:len(o.data.vertices));arm.animation_data_create();result={}
for action in list(bpy.data.actions):
 if action.name not in ('Walk','Run','Idle'):continue
 arm.animation_data.action=action
 if action.slots:arm.animation_data.action_slot=action.slots[0]
 rows=[]
 for i in range(128):
  f=action.frame_range[0]+(action.frame_range[1]-action.frame_range[0])*i/128;bpy.context.scene.frame_set(int(f),subframe=f-int(f));m=mesh.evaluated_get(bpy.context.evaluated_depsgraph_get());geo=m.to_mesh();co=np.empty(len(geo.vertices)*3,dtype=np.float32);geo.vertices.foreach_get('co',co);co=co.reshape(-1,3);mat=np.array(m.matrix_world);world=co@mat[:3,:3].T+mat[:3,3];height=float(world[:,2].min());left=float(world[world[:,0]>.00733,2].min());right=float(world[world[:,0]<.00733,2].min());rows.append({'phase':i/128,'sole':height,'left':left,'right':right,'lift':-height if action.name=='Walk' else max(0,-height)});m.to_mesh_clear()
 result[action.name]=rows
(root/args.output).write_text(json.dumps(result,indent=2));print('CONTACT_SAMPLES',[(k,len(v),min(x['sole'] for x in v),max(x['sole'] for x in v)) for k,v in result.items()])

walk_error=max(abs(r['sole']) for r in result['Walk']);run_min=min(r['sole'] for r in result['Run']);assert walk_error<.008,(walk_error, 'walking sole error');assert run_min>-.008,(run_min,'running penetration');print('CONTACT_PASS',walk_error,run_min)

assert max(abs(r['sole']) for r in result['Idle'])<.008

walk=result['Walk'];half=len(walk)//2
asymmetry=max(abs(r['left']-walk[(i+half)%len(walk)]['right']) for i,r in enumerate(walk))
contacts={side:sum(r[side]<.005 for r in walk) for side in ['left','right']}
assert asymmetry<.006,('Unequal sole trajectory',asymmetry)
assert abs(contacts['left']-contacts['right'])<=4,('Unequal stance duration',contacts)
print('BILATERAL_CONTACT_PASS',asymmetry,contacts)

run=result['Run']
run_asymmetry=max(abs(r['left']-run[(i+64)%128]['right']) for i,r in enumerate(run))
run_contacts={side:sum(r[side]<.005 for r in run) for side in ['left','right']}
flight_samples=sum(r['sole']>.005 for r in run)
assert run_asymmetry<.008,('Asymmetric running boot path',run_asymmetry)
assert abs(run_contacts['left']-run_contacts['right'])<=4,('Unequal running stance',run_contacts)
assert max(r['sole'] for r in run)<.05,('Excessive running flight height',max(r['sole'] for r in run))
assert 8<=flight_samples<=40,('Expected brief flight with longer ground support',flight_samples)
print('RUN_CONTACT_PASS',run_asymmetry,run_contacts,flight_samples)
