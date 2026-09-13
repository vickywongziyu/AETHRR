"""Save a separate editable two-shore world without replacing either source file."""
import bpy,math,json
from mathutils import Vector
ROOT='/Users/ziyu/Project/Codex6 3d';s=next(s for s in bpy.data.scenes if s.name.startswith('AETHER ·'));bpy.context.window.scene=s
with bpy.data.libraries.load(ROOT+'/outputs/highland/horncrest.blend',link=False) as (source,dest):dest.objects=[n for n in source.objects if n.startswith('Horncrest ') and n not in ['Horncrest camera','Horncrest warm afternoon']]
root=bpy.data.objects.new('Horncrest opposite shore',None);s.collection.objects.link(root);root.location=(0,-150,0);root.rotation_euler.z=math.pi
count=0
for ob in dest.objects:
 if ob and ob.type=='MESH':s.collection.objects.link(ob);ob.parent=root;count+=1
assert count==11
s.name='AETHER + HORN​​CREST · Connected world';s.frame_end=1440
cam=s.camera;cam.animation_data_clear()
old_suns=[(o.data,o.data.energy) for o in s.objects if o.type=='LIGHT' and o.data.type=='SUN']
ld=bpy.data.lights.new('Horncrest shore sunlight','SUN');ld.energy=0;ld.color=(1,.84,.65);ld.angle=.06
sun=bpy.data.objects.new('Horncrest shore sunlight',ld);s.collection.objects.link(sun);sun.location=(-65,-95,66);sun.rotation_euler=(Vector((0,-150,12))-sun.location).to_track_quat('-Z','Y').to_euler()
views=[((18,22,36),(-10,18,-25)),((17,60,-36),(0,48,-62)),((-21,23,72),(0,18,146)),((-40,38,99),(0,19,155)),((19,37,145),(0,33,175)),((8,31,122),(-10,26,10)),((18,22,36),(-10,18,-25))]
for i,(p,target) in enumerate(views):
 f=1+i*240;q=max(0,min(1,(p[2]-65)/55));q=q*q*(3-2*q);ld.energy=3.5*q;ld.keyframe_insert('energy',frame=f)
 for data,energy in old_suns:data.energy=energy*(1-q);data.keyframe_insert('energy',frame=f)
 cam.location=(p[0],-p[2],p[1]);aim=Vector((target[0],-target[2],target[1]));cam.rotation_euler=(aim-cam.location).to_track_quat('-Z','Y').to_euler();cam.keyframe_insert('location',frame=f);cam.keyframe_insert('rotation_euler',frame=f)
# Keep environmental tracks cycling during the extended camera journey.
for action in bpy.data.actions:
 if action==cam.animation_data.action:continue
 for layer in action.layers:
  for strip in layer.strips:
   for bag in strip.channelbags:
    for curve in bag.fcurves:
     if not any(m.type=='CYCLES' for m in curve.modifiers):curve.modifiers.new('CYCLES')
s.frame_set(1);bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=ROOT+'/outputs/highland/aether-horncrest.blend',compress=True)
json.dump({'single_scene':True,'new_meshes':count,'source_world_preserved':True,'camera_seconds':60,'regions':['Floating archipelago','Horncrest settlement'],'transform_blender':{'translation':[0,-150,0],'rotation_z':math.pi}},open(ROOT+'/outputs/highland/combined-verification.json','w'),indent=2)
print('CONNECTED_NATIVE_READY',count)
