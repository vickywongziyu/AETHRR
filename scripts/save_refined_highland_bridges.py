"""Archive verified Highland bridge geometry, only in background factory-startup."""
from pathlib import Path
import bpy,json
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'outputs/atlas/bridgeheads-v38'
export=json.loads((ROOT/'work/atlas/bridgeheads-v38/export.json').read_text())
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(OUT/'horncrest-bridgeheads.glb'))
scene=bpy.context.scene;scene.name='HORNCREST · Grounded bridges V38'
scene['scope']='Actual Highland scenery: five terrain-fitted village walkways, three preserved original crossings, complete relocated trees and existing settlement.'
scene['runtime_note']='Web shaders, illumination controls, navigation and user saves remain JavaScript. This native archive contains editable geometry and portable materials.'
scene['bridge_profiles']=json.dumps(export['bridges']['records'],ensure_ascii=False)
scene['tree_moves']=json.dumps(export['trees'],ensure_ascii=False)
meshes=[o for o in scene.objects if o.type=='MESH']
wood=next(o for o in meshes if o.name=='Horncrest_wood')
expected=next(m['triangles'] for m in export['meshes'] if m['name']=='Horncrest_wood')
assert len(wood.data.polygons)==expected
bridges=[bpy.data.objects.get('山城桥面 '+str(i)) for i in range(1,6)]
assert all(o is not None for o in bridges)
assert all(t['triangles']==888 for t in export['trees'])
scene.world.color=(.16,.19,.22);scene.render.engine='CYCLES';scene.cycles.samples=32
scene.render.resolution_x=1280;scene.render.resolution_y=832;scene.render.resolution_percentage=100
bpy.ops.object.light_add(type='SUN',location=(50,-80,120));sun=bpy.context.object;sun.name='Archive daylight';sun.data.energy=2;sun.rotation_euler=(.4,-.5,-.4)
bpy.ops.object.camera_add(location=(23,42,28));cam=bpy.context.object;cam.name='Eastern bridge inspection';target=Vector((16.5,28.5,20.3));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.lens=34;cam.data.clip_start=.04;cam.data.clip_end=1200;scene.camera=cam
bpy.ops.object.select_all(action='DESELECT')
for screen in bpy.data.screens:
 for area in screen.areas:
  if area.type=='VIEW_3D':
   space=area.spaces.active;space.region_3d.view_distance=20;space.region_3d.view_location=target;space.region_3d.view_rotation=cam.rotation_euler.to_quaternion();space.shading.type='MATERIAL';space.clip_end=1500
bpy.ops.file.pack_all()
report={'scene':scene.name,'meshes':len(meshes),'vertices':sum(len(o.data.vertices) for o in meshes),'polygons':sum(len(o.data.polygons) for o in meshes),'wood_polygons':len(wood.data.polygons),'expected_wood_polygons':expected,'bridge_roots':[o.name for o in bridges],'complete_tree_moves':len(export['trees']),'packed_images':sum(bool(i.packed_file) for i in bpy.data.images)}
assert report['packed_images']>0
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'horncrest-bridgeheads.blend'))
(OUT/'native-verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print('BRIDGE_NATIVE_PASS',report)
