"""Archive actual runtime doors separately; run only background --factory-startup."""
from pathlib import Path
import bpy,json
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'outputs/atlas/doors-v30'
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(OUT/'refined-doors.glb'))
scene=bpy.context.scene
scene.name='ATLAS · Refined timber doors V30'
scene['scope']='16 existing doors arranged in four inspection rows, with original local dimensions and hinge origins. Actual buildings remain in the web world.'
scene['source']='src/atlas/building-fixtures.js'
scene['runtime_note']='Portable PBR materials and editable geometry; procedural web shaders, dynamic collision and interaction controllers are not baked.'
bpy.ops.object.light_add(type='AREA',location=(5,-8,14))
key=bpy.context.object;key.name='Door inspection light';key.data.energy=3000;key.data.shape='DISK';key.data.size=12;key.rotation_euler=(Vector((6,-5,1.4))-key.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.light_add(type='SUN')
bpy.context.object.data.energy=2
bpy.context.object.rotation_euler=(.3,-.6,-.4)
bpy.ops.object.camera_add(location=(22,-25,19))
cam=bpy.context.object;cam.rotation_euler=(Vector((6,-6,1.3))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.lens=48;scene.camera=cam
scene.world.color=(.18,.18,.18)
scene.render.engine='CYCLES'
scene.cycles.samples=32
scene.render.resolution_x=1280;scene.render.resolution_y=832;scene.render.resolution_percentage=100
bpy.ops.file.pack_all()
meshes=[o for o in scene.objects if o.type=='MESH']
doors=[o for o in scene.objects if o.get('doorConstruction')=='solid-timber-v30']
report={'scene':scene.name,'meshes':len(meshes),'vertices':sum(len(o.data.vertices) for o in meshes),'polygons':sum(len(o.data.polygons) for o in meshes),'packed_images':sum(bool(i.packed_file) for i in bpy.data.images),'doors':[o.name for o in doors],'frames':[o.name for o in scene.objects if o.get('doorFrame')=='recessed-jamb-v30']}
assert len(doors)==16 and len(meshes)==64 and len(report['frames'])==16,report
assert report['polygons']>16*7336 and report['packed_images']>=2,report
for o in doors:
 assert o.type=='EMPTY'
 assert all(abs(v-1)<1e-6 for v in o.scale)
for screen in bpy.data.screens:
 for area in screen.areas:
  if area.type=='VIEW_3D':
   space=area.spaces.active;space.region_3d.view_distance=25;space.region_3d.view_location=(6,-6,1.3);space.region_3d.view_rotation=cam.rotation_euler.to_quaternion();space.shading.type='MATERIAL'
bpy.ops.object.select_all(action='DESELECT')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'refined-doors.blend'))
(OUT/'native-verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print('DOORS_NATIVE_PASS',report)
