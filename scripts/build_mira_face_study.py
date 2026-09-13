"""Data-only CC0 MakeHuman topology study. Not a final Mira design approval.
No addon registration, preferences writes, external API calls, or website edits.
"""
import bpy, gzip, json, math, runpy, os
from pathlib import Path
from mathutils import Vector
import numpy as np
ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'work/vendor/mpfb2/src/mpfb/data'
OUT=ROOT/'work/character-reference-v1/topology-study';OUT.mkdir(parents=True,exist_ok=True)
scene=bpy.data.scenes.new('Mira · Facial topology study');bpy.context.window.scene=scene
verts=[];uvs=[];records=[];group=''
for line in (DATA/'3dobjs/base.obj').read_text().splitlines():
 a=line.split()
 if not a:continue
 if a[0]=='v':verts.append(tuple(map(float,a[1:4])))
 elif a[0]=='vt':uvs.append(tuple(map(float,a[1:3])))
 elif a[0]=='g':group=a[1]
 elif a[0]=='f':records.append((group,[int(x.split('/')[0])-1 for x in a[1:]],[int(x.split('/')[1])-1 for x in a[1:]]))
raw=np.array(verts,dtype=float)
def delta(path):
 d=np.zeros_like(raw)
 with gzip.open(DATA/'targets'/path,'rt') as f:
  for line in f:
   a=line.split()
   if len(a)==4 and not a[0].startswith('#'):d[int(a[0])]=list(map(float,a[1:]))
 return d
ethnic={'caucasian':.75,'asian':.25}
for eth,w in ethnic.items():raw+=w*delta(f'macrodetails/{eth}-female-young.target.gz')
details={'head/head-oval.target.gz':.15,'nose/nose-scale-horiz-decr.target.gz':.15,
'mouth/mouth-lowerlip-volume-incr.target.gz':.15,'mouth/mouth-upperlip-volume-incr.target.gz':.15,
'eyes/l-eye-scale-incr.target.gz':.12,'eyes/r-eye-scale-incr.target.gz':.12}
for path,w in details.items():raw+=w*delta(path)
# Fit scale derived from Rodin head bounds, retaining source topology and morphs.
scale=np.array([.135,.14,.14]);shift=np.array([0.,.027,-.126])
def convert(a):return a[:,[0,2,1]]*np.array([scale[0],-scale[2],scale[1]])+shift
co=convert(raw)
selected=[(i,rec) for i,rec in enumerate(records) if rec[0]=='body' and all(raw[v,1]>5.25 for v in rec[1])]
inds=sorted({v for i,rec in selected for v in rec[1]});mapping={v:i for i,v in enumerate(inds)}
me=bpy.data.meshes.new('Mira · CC0 face topology');me.from_pydata(co[inds].tolist(),[],[[mapping[v] for v in rec[1]] for i,rec in selected]);me.update()
head=bpy.data.objects.new('Mira · reconstructed face study',me);scene.collection.objects.link(head)
uv=me.uv_layers.new(name='SourceUV')
for p,(orig,rec) in zip(me.polygons,selected):
 p.use_smooth=True
 for li,ui in zip(p.loop_indices,rec[2]):uv.data[li].uv=uvs[ui]
def mat(name,color,rough=.45):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough
 return m
skin=mat('Mira · warm skin',(.48,.26,.155),.48)
skin.node_tree.nodes['Principled BSDF'].inputs['Subsurface Weight'].default_value=.065
lips=mat('Mira · muted rose lips',(.34,.09,.065),.38)
me.materials.append(skin);me.materials.append(lips)
lipfaces=set(map(int,json.loads(gzip.open(DATA/'uv_layers/lips_solid.json.gz','rt').read())))
for p,(orig,rec) in zip(me.polygons,selected):
 if orig in lipfaces:p.material_index=1
head.shape_key_add(name='Basis')
expressions={'Mira_EyesClosed':{'eye-left-closure':1,'eye-right-closure':1},'Mira_Happy':{'mouth-corner-puller':.65,'mouth-upward-retraction':.25},'Mira_MouthOpen':{'mouth-open':.8}}
for name,units in expressions.items():
 d=np.zeros_like(raw)
 for eth,w in ethnic.items():
  for unit,strength in units.items():d+=delta(f'expression/units/{eth}/{unit}.target.gz')*w*strength
 key=head.shape_key_add(name=name)
 for i,v in enumerate(convert(raw+d)[inds]):key.data[i].co=v
sub=head.modifiers.new('Subdivision for eyelid and lip curvature','SUBSURF');sub.levels=2;sub.render_levels=2
# True spherical eye geometry with brown irises, no image projection.
groups=json.loads((DATA/'mesh_metadata/basemesh_vertex_groups.json').read_text())
def center(name):return np.mean(co[[i for lo,hi in groups[name] for i in range(lo,hi+1)]],axis=0)
white=mat('Mira · sclera',(.68,.65,.56),.25);iris=mat('Mira · brown iris',(.11,.049,.016),.3);black=mat('Mira · pupil',(.003,.002,.001),.18)
def sphere(name,loc,sc,m):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=48,ring_count=32,location=loc)
 o=bpy.context.object;o.name=name;o.scale=sc;o.data.materials.append(m)
 for p in o.data.polygons:p.use_smooth=True
 return o
for side in ['l','r']:
 c=center('joint-'+side+'-eye');r=.0202
 sphere('Mira · '+side+' eyeball',c,(r,r,r),white)
 sphere('Mira · '+side+' iris',c+np.array([0,-r*.94,0]),(.0087,.0025,.0087),iris)
 sphere('Mira · '+side+' pupil',c+np.array([0,-r*1.055,0]),(.0038,.0008,.0038),black)
# Keep dark oral cavity behind opening; this is not a substitute for lip motion.
oral=mat('Mira · oral cavity',(.035,.007,.008),.8)
sphere('Mira · oral cavity',(0,-.115,.704),(.038,.015,.018),oral)
if os.environ.get('MIRA_FACE_APPEARANCE')=='1':
 exec((ROOT/'scripts/mira_face_appearance_study.py').read_text())
studio=runpy.run_path(str(ROOT/'scripts/render_mira_reference_master.py'),run_name='mira_face_studio')
studio['configure_white_studio'](scene,1.9);scene.cycles.samples=32
scene.render.resolution_x=768;scene.render.resolution_y=768
views=[('front',(0,-6,.80),None),('right',(-6,0,.80),None),('threequarter',(-4.243,-4.243,.80),None),('closed',(0,-6,.80),'Mira_EyesClosed'),('happy',(0,-6,.80),'Mira_Happy'),('open',(0,-6,.80),'Mira_MouthOpen')]
report={'status':'topology_study_not_final_character','sourceAssetLicense':'CC0-1.0','sourceRepository':'https://github.com/makehumancommunity/mpfb2','vertexCount':len(inds),'faceCount':len(selected),'morphs':{},'designApproved':False}
for k in head.data.shape_keys.key_blocks:
 if k.name!='Basis':report['morphs'][k.name]={'movedVertices':sum((v.co-head.data.shape_keys.key_blocks['Basis'].data[i].co).length>1e-6 for i,v in enumerate(k.data))}
for name,pos,active in views:
 for o in scene.objects:
  if o.type=='MESH' and o.data.shape_keys:
   for k in o.data.shape_keys.key_blocks:k.value=float(k.name==active)
 scene.camera=studio['camera'](scene,'Mira Face · '+name,pos,(0,0,.80),.43)
 scene.render.filepath=str(OUT/(name+'.png'));bpy.ops.render.render(write_still=True)
for o in scene.objects:
 if o.type=='MESH' and o.data.shape_keys:
  for k in o.data.shape_keys.key_blocks:k.value=0
scene.camera=next(o for o in scene.objects if o.name=='Mira Face · threequarter')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'mira-face-topology-study.blend'))
(OUT/'report.json').write_text(json.dumps(report,indent=2))
print('MIRA_FACE_STUDY',json.dumps(report))
