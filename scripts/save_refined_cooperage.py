"""Archive the five shared storage-prop variants in a separate factory scene."""
from pathlib import Path
import bpy, json
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'outputs/atlas/cooperage-v34'
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(OUT/'cooperage.glb'))
scene=bpy.context.scene
scene.name='ATLAS · Cooperage V34'
scene['scope']='Five variants generated with the actual current shared web factories: three barrel sizes and two crate sizes. Separate inspection arrangement; not a complete town or all 51 placed fixtures.'
scene['runtime_note']='Inventory, vaults, fishing, animation, painted shader additions and camera restrictions remain web runtime functionality. Packed wood color and normal maps are included.'
meshes=[o for o in scene.objects if o.type=='MESH']
variants=[o for o in scene.objects if o.get('libraryVariant') is not None]
report={'scene':scene.name,'variants':[o.name for o in variants],'meshes':len(meshes),'vertices':sum(len(o.data.vertices) for o in meshes),'polygons':sum(len(o.data.polygons) for o in meshes)}
assert len(variants)==5 and len(meshes)==15,report
bpy.ops.file.pack_all()
report['packed_images']=sum(bool(im.packed_file) for im in bpy.data.images)
assert report['packed_images']==2,report
bpy.ops.object.light_add(type='AREA',location=(-3,-4,6));light=bpy.context.object
light.data.energy=750;light.data.size=5
light.rotation_euler=(Vector((0,-.6,.4))-light.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(4.2,-6.8,4.0));cam=bpy.context.object
cam.rotation_euler=(Vector((0,-.6,.35))-cam.location).to_track_quat('-Z','Y').to_euler()
cam.data.type='ORTHO';cam.data.ortho_scale=6.1;scene.camera=cam
scene.world.color=(.23,.23,.23)
scene.render.engine='CYCLES';scene.cycles.samples=24
scene.render.resolution_x=1280;scene.render.resolution_y=832;scene.render.resolution_percentage=100
for screen in bpy.data.screens:
 for area in screen.areas:
  if area.type=='VIEW_3D':
   space=area.spaces.active;space.region_3d.view_distance=6.1;space.region_3d.view_location=(0,-.6,.35);space.region_3d.view_rotation=cam.rotation_euler.to_quaternion();space.shading.type='MATERIAL'
bpy.ops.object.select_all(action='DESELECT')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'cooperage.blend'))
report['passed']=True
(OUT/'native-verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print('COOPERAGE_NATIVE_PASS',report)
