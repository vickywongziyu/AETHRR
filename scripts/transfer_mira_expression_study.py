"""Evaluate expression transfer without replacing the Rodin rest geometry.
Study outputs are NOT final modeling references. No external services.
"""
import bpy,bmesh,runpy,json,hashlib,struct
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.geometry import barycentric_transform
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'work/character-reference-v1/expression-transfer';OUT.mkdir(parents=True,exist_ok=True)
scene=bpy.data.scenes.new('Mira · original geometry expression transfer');bpy.context.window.scene=scene
bpy.ops.import_scene.gltf(filepath=str(ROOT/'outputs/character/reference-master/mira-rodin-source.glb'))
obj=next(o for o in scene.objects if o.type=='MESH');obj.name='Mira · source-preserving transfer study'
rest=[v.co.copy() for v in obj.data.vertices]
with bpy.data.libraries.load(str(ROOT/'work/character-reference-v1/topology-study/mira-face-topology-study.blend'),link=False) as (a,b):
 b.objects=[n for n in a.objects if n=='Mira · reconstructed face study']
donor=b.objects[0]
# Query donor triangles in common coordinates; do not display donor appearance.
donor.data.calc_loop_triangles();tris=[tuple(t.vertices) for t in donor.data.loop_triangles]
coords=[v.co.copy() for v in donor.data.vertices]
bvh=BVHTree.FromPolygons(coords,tris,all_triangles=True)
def smoothstep(a,b,v):
 t=max(0.,min(1.,(v-a)/(b-a)));return t*t*(3-2*t)
weights=[]
for v in obj.data.vertices:
 x,y,z=v.co
 # A conservative front-face mask prevents moving cloak, neck, crown, accessories.
 ellipse=(x/.102)**2+((z-.766)/.117)**2
 w=(1-smoothstep(.72,1.,ellipse))*(1-smoothstep(-.13,-.075,y))
 hit=bvh.find_nearest(v.co)
 weights.append((w,hit))
obj.shape_key_add(name='Basis')
report={'status':'transfer_study_pending_visual_audit','restGeometryPreserved':True,'bodyAccessoriesDisplaced':False,'morphs':{}}
for name in ['Mira_EyesClosed','Mira_Happy','Mira_MouthOpen']:
 source=donor.data.shape_keys.key_blocks[name];key=obj.shape_key_add(name=name);moved=0
 for v,(w,hit) in zip(obj.data.vertices,weights):
  loc,normal,ti,dist=hit
  if w<=0 or loc is None:continue
  ids=tris[ti];a,b,c=[coords[i] for i in ids]
  da,db,dc=[source.data[i].co-coords[i] for i in ids]
  d=barycentric_transform(loc,a,b,c,da,db,dc)
  key.data[v.index].co=v.co+d*w;moved+=(d*w).length>1e-6
 report['morphs'][name]={'movedVertices':moved}
assert all(v.co==r for v,r in zip(obj.data.vertices,rest))
for key in obj.data.shape_keys.key_blocks:
 for v,ref in zip(key.data,rest):
  if ref.z<.645:assert (v.co-ref).length<1e-8,'Body changed'
studio=runpy.run_path(str(ROOT/'scripts/render_mira_reference_master.py'),run_name='mira_transfer_studio')
studio['configure_white_studio'](scene,1.9);scene.cycles.samples=32
scene.render.resolution_x=768;scene.render.resolution_y=768
scene.camera=studio['camera'](scene,'Mira Transfer · fixed face camera',(0,-6,.79),(0,0,.79),.46)
for name,active in [('neutral',None),('closed','Mira_EyesClosed'),('happy','Mira_Happy'),('open','Mira_MouthOpen')]:
 for key in obj.data.shape_keys.key_blocks:key.value=float(key.name==active)
 scene.render.filepath=str(OUT/(name+'.png'));bpy.ops.render.render(write_still=True)
for key in obj.data.shape_keys.key_blocks:key.value=0
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'mira-expression-transfer-study.blend'))
(OUT/'report.json').write_text(json.dumps(report,indent=2))
print('MIRA_TRANSFER',json.dumps(report))
