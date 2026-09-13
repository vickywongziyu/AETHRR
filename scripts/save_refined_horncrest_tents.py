"""Archive the current Horncrest web geometry in a separate native scene.
Run only with Blender background --factory-startup; preserve live user scenes.
"""
from pathlib import Path
import bpy, json
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'outputs/atlas/tent-refinement-v28'
export=json.loads((ROOT/'work/atlas/tent-refinement-v28/export.json').read_text())
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(OUT/'horncrest-tents-refined.glb'))
scene=bpy.context.scene
scene.name='HORNCREST · Tailored tents V28'
scene['scope']='Actual local-coordinate Horncrest scenery root. Five refined tents plus preserved six houses, terrain and internal bridges. Other regions and world-level systems are not duplicated.'
scene['runtime_note']='Browser painted shaders, navigation, interaction controllers and user progress remain JavaScript; this archive contains editable geometry and portable materials.'
scene['furniture_removed_triangles']=export['removal']['removedTriangles']
scene['tent_floors']=json.dumps(export['houses'],ensure_ascii=False)
mesh_objects=[o for o in scene.objects if o.type=='MESH']
wood=next(o for o in mesh_objects if o.name=='Horncrest_wood')
expected=next(o for o in export['meshes'] if o['name']=='Horncrest_wood')['triangles']
assert len(wood.data.polygons)==expected,(len(wood.data.polygons),expected)
houses=[bpy.data.objects.get(r['name']) for r in export['houses']]
assert all(o is not None for o in houses)
scene.world.color=(.16,.19,.22)
scene.render.engine='CYCLES'
scene.cycles.samples=32
scene.render.resolution_x=1280
scene.render.resolution_y=832
scene.render.resolution_percentage=100
bpy.ops.object.light_add(type='SUN',location=(50,-80,120))
sun=bpy.context.object;sun.name='Horncrest archive daylight';sun.data.energy=2;sun.rotation_euler=(.4,-.5,-.4)
# Separate interior camera retains the real first tent's local viewing direction.
b=export['houses'][0];x,y,z=b['position'];origin=Vector((x,-z,y))
bpy.ops.object.camera_add(location=origin+Vector((0,-2.116,1.62)))
cam=bpy.context.object;cam.name='Tent 07 interior';target=origin+Vector((.6,3,1.45))
cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.lens=24;cam.data.clip_start=.04;scene.camera=cam
bpy.ops.object.light_add(type='AREA',location=origin+Vector((0,-3,3.5)))
fill=bpy.context.object;fill.name='Archive interior inspection fill';fill.data.energy=90;fill.data.color=(1,.83,.64);fill.data.size=4
fill.rotation_euler=(origin+Vector((0,1,1))-fill.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.select_all(action='DESELECT')
for screen in bpy.data.screens:
 for area in screen.areas:
  if area.type=='VIEW_3D':
   space=area.spaces.active;space.region_3d.view_distance=7;space.region_3d.view_location=origin+Vector((0,0,2));space.region_3d.view_rotation=cam.rotation_euler.to_quaternion();space.shading.type='MATERIAL';space.clip_start=.04;space.clip_end=1000
bpy.ops.file.pack_all()
report={'scene':scene.name,'meshes':len(mesh_objects),'vertices':sum(len(o.data.vertices) for o in mesh_objects),'polygons':sum(len(o.data.polygons) for o in mesh_objects),'wood_polygons':len(wood.data.polygons),'expected_wood_polygons':expected,'tents':[o.name for o in houses],'packed_images':sum(bool(i.packed_file) for i in bpy.data.images),'removed_triangles':scene['furniture_removed_triangles']}
assert report['packed_images']>0
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'horncrest-tents-refined.blend'))
(OUT/'native-verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print('HORNCREST_NATIVE_PASS',report)
