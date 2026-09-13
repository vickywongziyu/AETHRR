"""Archive the four shared lantern variants without modifying live scenes."""
from pathlib import Path
import bpy,json
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'outputs/atlas/lanterns-v37'
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(OUT/'lanterns.glb'))
scene=bpy.context.scene;scene.name='ATLAS · Lantern craft V37'
scene['scope']='Four real shared-factory variants: warm table lantern, amethyst hanging lantern, azure observatory wall lantern and warm cabin wall lantern. Separate inspection library, not all placed scene fixtures.'
scene['runtime_note']='Scene lighting switches, proximity lighting, shader additions and camera containment remain web runtime functionality.'
meshes=[o for o in scene.objects if o.type=='MESH'];variants=[o for o in scene.objects if o.get('libraryVariant')]
report={'scene':scene.name,'variants':[o.name for o in variants],'meshes':len(meshes),'vertices':sum(len(o.data.vertices) for o in meshes),'polygons':sum(len(o.data.polygons) for o in meshes)}
assert len(variants)==4 and len(meshes)==12,report
bpy.ops.object.light_add(type='AREA',location=(-3,-4,5));light=bpy.context.object;light.data.energy=500;light.data.size=4;light.rotation_euler=(Vector((0,0,.4))-light.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(2.5,-4.2,1.8));cam=bpy.context.object;cam.rotation_euler=(Vector((0,0,.4))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=3.3;scene.camera=cam
scene.world.color=(.24,.24,.24);scene.render.engine='CYCLES';scene.cycles.samples=24;scene.render.resolution_x=1280;scene.render.resolution_y=832;scene.render.resolution_percentage=100
for screen in bpy.data.screens:
 for area in screen.areas:
  if area.type=='VIEW_3D':
   space=area.spaces.active;space.region_3d.view_distance=3.3;space.region_3d.view_location=(0,0,.4);space.region_3d.view_rotation=cam.rotation_euler.to_quaternion();space.shading.type='MATERIAL'
bpy.ops.object.select_all(action='DESELECT');bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'lanterns.blend'))
report['passed']=True;(OUT/'native-verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print('LANTERN_NATIVE_PASS',report)
