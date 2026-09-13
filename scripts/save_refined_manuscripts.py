"""Archive the six actual runtime manuscripts in a separate factory-startup scene."""
from pathlib import Path
import bpy, json
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'outputs/atlas/manuscripts-v33'
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(OUT/'manuscripts.glb'))
scene=bpy.context.scene
scene.name='ATLAS · Manuscripts V33'
scene['scope']='Six actual runtime objects, arranged for inspection: four bound folios and two curled maps. Printed canvases are packed; dynamic journal progress is a fresh-profile 0/3 snapshot.'
scene['runtime_note']='Reading dialogs, clicks, camera boundaries, observation progress and saved state remain web functionality. Original world placement is recorded as sourcePosition, not reproduced in this inspection arrangement.'
mesh_objects=[o for o in scene.objects if o.type=='MESH']
objects=[o for o in scene.objects if o.get('archive')=='manuscripts-v33']
report={'scene':scene.name,'objects':[o.name for o in objects],'meshes':len(mesh_objects),'vertices':sum(len(o.data.vertices) for o in mesh_objects),'polygons':sum(len(o.data.polygons) for o in mesh_objects)}
assert len(objects)==6 and len(mesh_objects)==54,report
bpy.ops.file.pack_all()
report['packed_images']=sum(bool(im.packed_file) for im in bpy.data.images)
assert report['packed_images']==6,report
bpy.ops.object.light_add(type='AREA',location=(2,-4,7))
light=bpy.context.object
light.data.energy=850;light.data.size=7
light.rotation_euler=(Vector((3,-1,0))-light.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(8,-10,10))
cam=bpy.context.object
cam.rotation_euler=(Vector((3,-1,0))-cam.location).to_track_quat('-Z','Y').to_euler()
cam.data.type='ORTHO';cam.data.ortho_scale=10.3;scene.camera=cam
scene.world.color=(.22,.22,.22)
scene.render.engine='CYCLES';scene.cycles.samples=24
scene.render.resolution_x=1280;scene.render.resolution_y=832;scene.render.resolution_percentage=100
for screen in bpy.data.screens:
 for area in screen.areas:
  if area.type=='VIEW_3D':
   space=area.spaces.active;space.region_3d.view_distance=10;space.region_3d.view_location=(3,-1,0);space.region_3d.view_rotation=cam.rotation_euler.to_quaternion();space.shading.type='MATERIAL'
bpy.ops.object.select_all(action='DESELECT')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'manuscripts.blend'))
(OUT/'native-verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print('MANUSCRIPTS_NATIVE_PASS',report)
