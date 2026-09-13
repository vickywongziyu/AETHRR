"""Synchronize the editable native scene with the web crystal and bird revision."""
import bpy,math
from mathutils import Vector
ROOT='/Users/ziyu/Project/Codex6 3d'
s=next(s for s in bpy.data.scenes if s.name.startswith('AETHER ·'));bpy.context.window.scene=s
for ma in bpy.data.materials:
 if ma.name.removeprefix('AE ').split('.')[0]=='crystal':
  p=ma.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(.44,.78,1,1)
  p.inputs['Metallic'].default_value=0;p.inputs['Roughness'].default_value=.025;p.inputs['Transmission Weight'].default_value=1;p.inputs['IOR'].default_value=1.55;p.inputs['Coat Weight'].default_value=1;p.inputs['Coat Roughness'].default_value=.025
for ob in list(s.objects):
 if ob.name.startswith('Motion bird'):bpy.data.objects.remove(ob,do_unlink=True)
 if ob.name.startswith('Wind birds'):ob.hide_render=True;ob.hide_viewport=True
ma=bpy.data.materials.get('AE flying silhouette') or bpy.data.materials.new('AE flying silhouette');ma.diffuse_color=(.03,.044,.044,1);ma.use_nodes=True;ma.node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=(.03,.044,.044,1);ma.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.95
wing=[(0,0,-.08),(.45,.04,.03),(.94,-.03,.30),(0,0,-.08),(.94,-.03,.30),(.27,0,.21)]
for i in range(9):
 bird=bpy.data.objects.new('Motion bird %02d'%i,None);s.collection.objects.link(bird);parts=[]
 for sign in [-1,1]:
  me=bpy.data.meshes.new('Motion bird wing');me.from_pydata([(x*sign,-z,y) for x,y,z in wing],[],[(0,1,2),(3,4,5)]);me.materials.append(ma)
  ob=bpy.data.objects.new('Motion bird wing',me);s.collection.objects.link(ob);ob.parent=bird;ob.location.x=sign*.035;parts.append(ob)
 bpy.ops.mesh.primitive_uv_sphere_add(segments=7,ring_count=5,radius=.095);body=bpy.context.object;body.name='Motion bird body';body.parent=bird;body.scale=(.7,2.5,.8);body.data.materials.append(ma)
 phase=i*.83
 for frame in range(1,722,3):
  t=(frame-1)/24;a=t*.14+phase*.16
  bird.location=(-8+(i-4)*2.8+math.sin(a)*24,26+(i%4)*3.2-math.cos(a)*8,27+(i%3)*1.3+math.sin(t*.8+phase)*.42)
  bird.rotation_euler=(0,-math.sin(a)*.12,math.atan2(-math.cos(a)*24,math.sin(a)*8));bird.keyframe_insert('location',frame=frame);bird.keyframe_insert('rotation_euler',frame=frame)
  flap=math.sin(t*(5.8+(i%3)*.35)+phase)*(.22+.48*(.5+.5*math.sin(t*.6+phase)))+.13
  for ob,sign in zip(parts,[-1,1]):ob.rotation_euler.y=-sign*flap;ob.keyframe_insert('rotation_euler',frame=frame)
s.frame_set(1);bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=ROOT+'/outputs/aether/aether-archipelago.blend',compress=True)
print('AETHER_MOTION: 9 articulated birds; transparent dielectric crystal; preserved camera, water and float tracks')
