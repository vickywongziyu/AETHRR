"""Save an isolated native archive of the actual web hearth fixtures."""
from pathlib import Path
import bpy,json
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'outputs/atlas/hearths-v31'
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(OUT/'inn-hearths.glb'))
scene=bpy.context.scene;scene.name='ATLAS · Inn hearths V31'
scene['scope']='Three actual existing hearth fixtures, side by side at original local scale. Closed curved flame geometry uses a static neutral lit pose.'
scene['runtime_note']='Web animation, custom painted architectural shaders, interaction, collision and user saved progress are not baked.'
scene['source']='src/atlas/hearth-fire.js; src/atlas/building-fixtures.js; src/atlas/town-props.js'
bpy.ops.object.light_add(type='AREA',location=(2,-5,7))
key=bpy.context.object;key.data.energy=900;key.data.size=8;key.rotation_euler=(Vector((3,0,1.3))-key.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(10,-13,7))
cam=bpy.context.object;cam.rotation_euler=(Vector((3,0,1.5))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.lens=52;scene.camera=cam
scene.world.color=(.18,.18,.18);scene.render.engine='CYCLES';scene.cycles.samples=32
scene.render.resolution_x=1280;scene.render.resolution_y=832;scene.render.resolution_percentage=100
bpy.ops.file.pack_all()
meshes=[o for o in scene.objects if o.type=='MESH'];fixtures=[o.name for o in scene.objects if o.get('hearthArchive')=='v31'];fires=[o.name for o in scene.objects if o.get('hearthFire')=='v31'];tongues=[o.name for o in scene.objects if o.type=='EMPTY' and o.get('baseHeight')]
report={'scene':scene.name,'meshes':len(meshes),'vertices':sum(len(o.data.vertices) for o in meshes),'polygons':sum(len(o.data.polygons) for o in meshes),'packed_images':sum(bool(im.packed_file) for im in bpy.data.images),'fixtures':fixtures,'fires':fires,'tongues':len(tongues)}
assert len(fixtures)==3 and len(fires)==3 and len(tongues)==21,report
assert report['packed_images']>=2 and report['polygons']>40000,report
for screen in bpy.data.screens:
 for area in screen.areas:
  if area.type=='VIEW_3D':
   space=area.spaces.active;space.region_3d.view_distance=13;space.region_3d.view_location=(3,0,1.5);space.region_3d.view_rotation=cam.rotation_euler.to_quaternion();space.shading.type='MATERIAL'
bpy.ops.object.select_all(action='DESELECT')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'inn-hearths.blend'))
(OUT/'native-verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print('HEARTHS_NATIVE_PASS',report)
