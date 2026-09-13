"""Assemble the Meshy body with a separate, cleanly skinned travel cloak."""
import bpy,math,json,runpy,sys
import numpy as np
from pathlib import Path
from mathutils import Vector,Matrix
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'outputs/character/meshy-mira';WORK=ROOT/'work/meshy-mira'
scene=bpy.data.scenes.new('Mira · independent travel cloak');bpy.context.window.scene=scene
bpy.ops.import_scene.gltf(filepath=str(OUT/'mira-meshy-body-rigged-v3.glb'))
arm=next(o for o in scene.objects if o.type=='ARMATURE');mesh=next(o for o in scene.objects if o.type=='MESH');body=mesh
original_actions={a.name:a for a in bpy.data.actions};arm.animation_data_clear()
for pb in arm.pose.bones:pb.matrix_basis.identity()
bpy.context.view_layer.update()
for mat in body.data.materials:
 p=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
 for sock in ['Emission Color','Emission Strength']:
  if sock in p.inputs:
   for link in list(p.inputs[sock].links):mat.node_tree.links.remove(link)
 p.inputs['Emission Strength'].default_value=0;p.inputs['Roughness'].default_value=.8;p.inputs['Metallic'].default_value=0
 if 'Specular IOR Level' in p.inputs:p.inputs['Specular IOR Level'].default_value=.25
levels=[1.43,1.12,.80,.48];xs=[-.17,0,.17];cape=[]
bpy.context.view_layer.objects.active=arm;arm.select_set(True);bpy.ops.object.mode_set(mode='EDIT');inv=arm.matrix_world.inverted()
for col,x in enumerate(xs):
 parent=arm.data.edit_bones['Spine']
 for row,z in enumerate(levels):
  name=f'Cape_{col}_{row}';b=arm.data.edit_bones.new(name);b.head=inv@Vector((x,.10,z));b.tail=inv@Vector((x,.10,z-.25));b.parent=parent;parent=b;cape.append(name)
bpy.ops.object.mode_set(mode='OBJECT')
def material(name,color,rough=.85,metal=0):
 m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal;return m
wool=material('Mira · slate blue wool',(.047,.074,.098));lining=material('Mira · warm linen lining',(.19,.17,.13));silver=material('Mira · silver leaf clasp',(.36,.35,.30),.35,.65)
verts=[];faces=[];nr=48;nu=80
knots=[0,.075,.19,.36,.57,.78,1]
zs=[1.445,1.405,1.29,1.085,.825,.56,.29];rx=[.075,.218,.258,.27,.28,.29,.30];ry=[.085,.20,.28,.37,.40,.40,.40];opens=[.035,.35,.93,1.28,1.32,1.33,1.34]
for row in range(nr+1):
 t=row/nr;z=float(np.interp(t,knots,zs));xr=float(np.interp(t,knots,rx));yr=float(np.interp(t,knots,ry));opening=float(np.interp(t,knots,opens))
 for col in range(nu+1):
  u=col/nu;theta=opening+(math.tau-2*opening)*u
  fold=(.002+.013*t)*math.cos(theta*12+.5*math.sin(t*4));r=1+fold/max(xr,.01)
  x=xr*math.sin(theta)*r;y=-yr*math.cos(theta)*r;zz=z+.012*t*t*math.cos(theta*4)
  verts.append((x,y,zz))
for row in range(nr):
 for col in range(nu):
  a=row*(nu+1)+col;b=a+1;c=b+nu+1;d=a+nu+1;faces.append((a,d,c,b))
me=bpy.data.meshes.new('Mira · continuous woven cloak');me.from_pydata(verts,[],faces);me.update();cloak=bpy.data.objects.new('Mira_Travel_Cloak',me);scene.collection.objects.link(cloak);cloak.data.materials.append(wool);cloak.data.materials.append(lining)
for p in me.polygons:p.use_smooth=True
for name in cape:cloak.vertex_groups.new(name=name)
for i,(x,y,z) in enumerate(verts):
 colpos=min(2,max(0,(x+.17)/.17));c0=min(1,int(colpos));cw=colpos-c0
 if z>=levels[0]:r0=0;rw=0
 elif z<=levels[-1]:r0=2;rw=1
 else:r0=next(k for k in range(3) if levels[k]>=z>=levels[k+1]);rw=(levels[r0]-z)/(levels[r0]-levels[r0+1])
 for col,wc in [(c0,1-cw),(c0+1,cw)]:
  for row,wr in [(r0,1-rw),(r0+1,rw)]:
   if wc*wr>.00001:cloak.vertex_groups[f'Cape_{col}_{row}'].add([i],wc*wr,'REPLACE')
# Apply thickness before the armature so the lining inherits identical cloth weights.
bpy.context.view_layer.objects.active=cloak;cloak.select_set(True);solid=cloak.modifiers.new('Tailored double layer','SOLIDIFY');solid.thickness=.002;solid.material_offset=1;solid.material_offset_rim=1;bpy.ops.object.modifier_apply(modifier=solid.name)
mod=cloak.modifiers.new('Independent cloth skeleton','ARMATURE');mod.object=arm
# Neck clasp and folded-down hood are separate from body skinning.
def bind_spine(obj):
 obj.vertex_groups.new(name='Spine').add(list(range(len(obj.data.vertices))),1,'REPLACE');m=obj.modifiers.new('Mantle attachment','ARMATURE');m.object=arm
bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=12,radius=1,location=(0,-.085,1.435));clasp=bpy.context.object;clasp.name='Mira_Leaf_Clasp';clasp.scale=(.026,.008,.015);bpy.ops.object.transform_apply(location=True,rotation=True,scale=True);clasp.data.materials.append(silver);bind_spine(clasp)
# A narrow folded hood rests at the back of the neck; it never covers the hair.
hv=[];hf=[]
for i in range(41):
 theta=.68+(math.tau-1.36)*i/40
 for j in range(9):
  v=j/8;rad=.11+.065*v;hv.append((rad*math.sin(theta),-.07*math.cos(theta)+.017*v,1.415-.036*v+.009*math.sin(v*math.pi)))
for i in range(40):
 for j in range(8):
  a=i*9+j;hf.append((a,a+9,a+10,a+1))
hme=bpy.data.meshes.new('Folded hood cloth');hme.from_pydata(hv,[],hf);hood=bpy.data.objects.new('Mira_Folded_Hood',hme);scene.collection.objects.link(hood);hood.data.materials.append(wool)
for p in hme.polygons:p.use_smooth=True
bind_spine(hood)
scene.render.fps=30
# Sample provider clips before adding cloth keys; preserve the proven body animation.
arm.animation_data_create();samples={}
for target,source in [('Walk','Walking'),('Run','Running')]:
 action=original_actions[source];arm.animation_data.action=action
 if action.slots:arm.animation_data.action_slot=action.slots[0]
 start,end=action.frame_range;duration=(end-start)/24;frames=round(duration*30);poses=[]
 for j in range(frames+1):
  f=start+(end-start)*j/frames;scene.frame_set(int(f),subframe=f-int(f));pose={}
  for pb in arm.pose.bones:
   if pb.name not in cape:pose[pb.name]=pb.matrix_basis.copy()
  poses.append(pose)
 samples[target]=poses
arm.animation_data_clear()
for pb in arm.pose.bones:pb.matrix_basis.identity()
for side in ['Left','Right']:
 pb=arm.pose.bones[side+'Arm'];bone=pb.bone
 d=arm.data.bones[side+'ForeArm'].head_local-bone.head_local
 q=d.normalized().rotation_difference(Vector((.08 if side=='Left' else -.08,0,-1)).normalized())
 pb.matrix=Matrix.LocRotScale(bone.head_local,q@bone.matrix_local.to_quaternion(),Vector((1,1,1)))
 bpy.context.view_layer.update()
rest={pb.name:pb.matrix_basis.copy() for pb in arm.pose.bones if pb.name not in cape}
samples['Idle']=[{k:m.copy() for k,m in rest.items()} for _ in range(121)]
finished=[]
for name,poses in samples.items():
 arm.animation_data_create();action=bpy.data.actions.new(name);arm.animation_data.action=action
 for frame,pose in enumerate(poses,1):
  scene.frame_set(frame)
  for pb in arm.pose.bones:pb.matrix_basis.identity();pb.rotation_mode='QUATERNION'
  for bone,mat in pose.items():
   if name!='Idle' and any(k in bone for k in ['Arm','Hand','Shoulder']):
    loc,rot,scale=mat.decompose();neutral=rest[bone].to_quaternion();rot=neutral.slerp(rot,.55);mat=Matrix.LocRotScale(loc,rot,scale)
   arm.pose.bones[bone].matrix_basis=mat
  phase=(frame-1)/max(1,len(poses)-1)*math.tau
  if name=='Idle':
   for bn,amp in [('Spine',.007),('Head',.009)]:
    pb=arm.pose.bones[bn];pb.matrix_basis=pb.matrix_basis@Matrix.Rotation(math.sin(phase)*amp,4,'X')
  # Lock horizontal root translation in armature space while retaining vertical bounce.
  bpy.context.view_layer.update();hips=arm.pose.bones['Hips'];m=hips.matrix.copy();m.translation.x=arm.data.bones['Hips'].head_local.x;m.translation.y=arm.data.bones['Hips'].head_local.y;hips.matrix=m
  for col in range(3):
   for row in range(4):
    pb=arm.pose.bones[f'Cape_{col}_{row}'];pb.rotation_mode='XYZ'
    amp={'Idle':.008,'Walk':.025,'Run':.045}[name]
    pb.rotation_euler=(({'Idle':0,'Walk':.065,'Run':.20}[name]+amp*math.sin(phase-row*.6+col*.5)),.006*math.sin(phase+col),amp*.35*math.sin(phase-row*.4))
  for pb in arm.pose.bones:
   pb.keyframe_insert('location',frame=frame);pb.keyframe_insert('rotation_euler' if pb.rotation_mode=='XYZ' else 'rotation_quaternion',frame=frame);pb.keyframe_insert('scale',frame=frame)
 action.use_fake_user=True;finished.append(action);arm.animation_data_clear()
for a in original_actions.values():bpy.data.actions.remove(a)
# NLA tracks are explicit export units, with no unrelated scene objects.
arm.animation_data_create()
for a in finished:
 t=arm.animation_data.nla_tracks.new();t.name=a.name;s=t.strips.new(a.name,1,a);s.action_frame_start=a.frame_range[0];s.action_frame_end=a.frame_range[1]
for pb in arm.pose.bones:pb.matrix_basis.identity()
for track in arm.animation_data.nla_tracks:track.mute=True
scene.frame_set(1);bpy.context.view_layer.update()
for o in bpy.context.selected_objects:o.select_set(False)

for o in [arm,body,cloak,clasp,hood]:o.select_set(True)
bpy.context.view_layer.objects.active=arm
for track in arm.animation_data.nla_tracks:track.mute=False
bpy.ops.export_scene.gltf(filepath=str(OUT/'mira-meshy-web.glb'),export_format='GLB',use_selection=True,use_active_scene=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_nla_strips=True,export_image_format='JPEG',export_jpeg_quality=90,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6)
# Set a clean neutral opening pose and a white orthographic studio for review.
for track in arm.animation_data.nla_tracks:track.mute=True
arm.animation_data.action=bpy.data.actions['Idle'];arm.animation_data.action_slot=bpy.data.actions['Idle'].slots[0];scene.frame_set(1)
studio=runpy.run_path(str(ROOT/'scripts/render_mira_reference_master.py'),run_name='mira_studio');studio['configure_white_studio'](scene,1.7);scene.cycles.samples=24
scene.camera=studio['camera'](scene,'Mira · front',(0,-6,.86),(0,0,.86),1.96);scene.render.resolution_x=768;scene.render.resolution_y=1024
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'mira-meshy-master.blend'))
report={'clothVertices':len(cloak.data.vertices),'clothSeparate':True,'bones':len(arm.data.bones),'clips':{a.name:list(a.frame_range) for a in finished},'morphs':False,'source':'mira-meshy-body-rigged-v3.glb','webGLB':'mira-meshy-web.glb'}
(OUT/'web-model.json').write_text(json.dumps(report,indent=2)+'\n');print('FINISHED_MIRA',report,flush=True)
jobs=[('Idle',1,'front'),('Run',6,'front'),('Run',6,'back'),('Walk',9,'back')]
if '--quick' in sys.argv:
 jobs=[('Walk',9,'back')];scene.cycles.samples=8;scene.render.resolution_x=512;scene.render.resolution_y=683
for clip,frame,yaw in jobs:
 arm.animation_data.action=bpy.data.actions[clip];arm.animation_data.action_slot=bpy.data.actions[clip].slots[0];scene.frame_set(frame)
 scene.camera.location=(0,-6 if yaw=='front' else 6,.86);scene.camera.rotation_euler=(Vector((0,0,.86))-scene.camera.location).to_track_quat('-Z','Y').to_euler()
 scene.render.filepath=str(WORK/f'finished-{clip}-{yaw}.png');bpy.ops.render.render(write_still=True)
