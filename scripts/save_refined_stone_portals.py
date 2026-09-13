"""Save the two shared stone frames without changing any live Blender scene."""
from pathlib import Path
import bpy,json
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'outputs/atlas/stone-portals-v36'
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(OUT/'stone-portals.glb'))
scene=bpy.context.scene;scene.name='ATLAS · Carved stone portals V36'
scene['scope']='Two actual shared stone frames, 31 closed arch blocks each, continuous recessed backing, two-sided luminous carving. Watercourt has its original plinth; Valley does not. Separate inspection arrangement.'
scene['runtime_note']='Live destination windows, soft particle shaders, animation and teleport interaction are web runtime features, not contained in this frame archive.'
meshes=[o for o in scene.objects if o.type=='MESH'];frames=[o for o in scene.objects if o.get('region') in ['watercourt','valley']]
report={'scene':scene.name,'frames':[o.name for o in frames],'meshes':len(meshes),'vertices':sum(len(o.data.vertices) for o in meshes),'polygons':sum(len(o.data.polygons) for o in meshes)}
assert len(frames)==2 and len(meshes)==6,report
bpy.ops.object.light_add(type='AREA',location=(-4,-8,14));light=bpy.context.object;light.data.energy=1800;light.data.size=8;light.rotation_euler=(Vector((0,0,3))-light.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(12,-24,10));cam=bpy.context.object;cam.rotation_euler=(Vector((0,0,3.2))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=19;scene.camera=cam
scene.world.color=(.25,.25,.25);scene.render.engine='CYCLES';scene.cycles.samples=24;scene.render.resolution_x=1280;scene.render.resolution_y=832;scene.render.resolution_percentage=100
for screen in bpy.data.screens:
 for area in screen.areas:
  if area.type=='VIEW_3D':
   space=area.spaces.active;space.region_3d.view_distance=19;space.region_3d.view_location=(0,0,3.2);space.region_3d.view_rotation=cam.rotation_euler.to_quaternion();space.shading.type='MATERIAL'
bpy.ops.object.select_all(action='DESELECT');bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'stone-portals.blend'))
report['passed']=True;(OUT/'native-verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print('STONE_PORTALS_NATIVE_PASS',report)
