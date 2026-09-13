"""Add Blender-native looping foliage, petals, fireflies and portal energy."""
import bpy,math,random
from mathutils import Vector
scene=bpy.context.scene;root='/Users/ziyu/Project/Codex6 3d';r=random.Random(119)
for obj in scene.objects:
 if obj.type=='MESH' and ('Canopy' in obj.name or 'Tree canopy' in obj.name):
  base=obj.rotation_euler[2]
  for frame,delta in [(1,0),(181,.009),(361,0),(541,-.009),(721,0)]:
   obj.rotation_euler[2]=base+delta;obj.keyframe_insert(data_path='rotation_euler',index=2,frame=frame)
for m in {slot.material for o in scene.objects if o.type=='MESH' for slot in o.material_slots}:
 if not m or not m.use_nodes:continue
 nodes=m.node_tree.nodes;links=m.node_tree.links;p=nodes.get('Principled BSDF');vertex=next((n for n in nodes if n.type=='VERTEX_COLOR'),None)
 if 'Leaves' in m.name or 'Heather' in m.name:
  if vertex:links.new(vertex.outputs['Color'],p.inputs['Emission Color'])
  p.inputs['Emission Strength'].default_value=.15 if 'Leaves' in m.name else .025
 if any(word in m.name for word in ['Bark','Stone','Earth']):
  tex=nodes.new('ShaderNodeTexNoise');tex.inputs['Scale'].default_value=12 if 'Bark' in m.name else 7;tex.inputs['Detail'].default_value=4
  coord=nodes.new('ShaderNodeTexCoord');links.new(coord.outputs['Object'],tex.inputs['Vector'])
  bump=nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.35;bump.inputs['Distance'].default_value=.025;links.new(tex.outputs['Fac'],bump.inputs['Height']);links.new(bump.outputs['Normal'],p.inputs['Normal'])
# Native shader energy membrane, matching the pointed arch silhouette.
px=math.sin(49*.096)*2.4+math.sin(49*.2)*.75;vs=[(px-2.35,48.36,1.5),(px-2.35,48.36,6)]
for k in range(1,19):
 t=k/18;vs.append((px-2.35*(1-t**1.55),48.36,6+t*2.5))
for k in range(1,19):
 t=1-k/18;vs.append((px+2.35*(1-t**1.55),48.36,6+t*2.5))
vs.append((px+2.35,48.36,1.5));mesh=bpy.data.meshes.new('Energy membrane');mesh.from_pydata(vs,[],[tuple(range(len(vs)))]);obj=bpy.data.objects.new('Portal animated energy',mesh);scene.collection.objects.link(obj)
m=bpy.data.materials.new('Portal living light');m.use_nodes=True;nodes=m.node_tree.nodes;links=m.node_tree.links;nodes.clear();out=nodes.new('ShaderNodeOutputMaterial');em=nodes.new('ShaderNodeEmission');em.inputs[0].default_value=(.35,.03,.8,1);wave=nodes.new('ShaderNodeTexWave');wave.wave_type='BANDS';wave.bands_direction='X';wave.inputs['Scale'].default_value=2.8;wave.inputs['Distortion'].default_value=6
for f,phase in [(1,0),(721,math.pi*2)]:wave.inputs['Phase Offset'].default_value=phase;wave.inputs['Phase Offset'].keyframe_insert(data_path='default_value',frame=f)
links.new(wave.outputs['Color'],em.inputs['Strength']);links.new(em.outputs[0],out.inputs[0]);mesh.materials.append(m)
# Small original petal instances follow a looping breeze using native drivers.
leafmesh=bpy.data.meshes.new('Falling petal');leafmesh.from_pydata([(-.055,0,0),(0,.1,.018),(.055,0,0),(0,-.09,.02)],[],[(0,1,2,3)])
leafmat=bpy.data.materials.new('Petal rose');leafmat.diffuse_color=(.56,.19,.37,1);leafmesh.materials.append(leafmat)
for i in range(110):
 o=bpy.data.objects.new('Drifting petal %03d'%i,leafmesh);scene.collection.objects.link(o);x,y,z=r.uniform(-13,13),r.uniform(-8,57),r.uniform(.5,12);phase=r.random()*math.tau;o.location=(x,y,z)
 for axis,expr in [(0,f'{x}+sin(frame*0.008726646+{phase})*.8'),(1,f'{y}+cos(frame*0.008726646+{phase})*.6'),(2,f'(({z}-(frame-1)/60)%12)+.2')]:o.driver_add('location',axis).driver.expression=expr
 for axis in range(3):o.driver_add('rotation_euler',axis).driver.expression=f'frame*.008726646+{phase+axis}'
# Final save contains only the final forest scene and its dependencies.
# Then run verify_blender_forest.py -- --finalize in background to save a normal main file.
scene.frame_set(1);scene.render.engine='CYCLES';scene.cycles.samples=24
scene.world.node_tree.nodes['Background'].inputs[1].default_value=.6
scene.render.resolution_x=1280;scene.render.resolution_y=832
bpy.data.libraries.write(root+'/outputs/forest/violet-sanctuary.blend',{scene},fake_user=True,compress=True)
print('FINAL_BLENDER_SAVED',scene.name,len(scene.objects))
