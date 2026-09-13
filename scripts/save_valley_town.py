"""Import the actual web northern waystation into a separate native Blender file.
Run in background with --factory-startup; never touch the live Blender session.
"""
from pathlib import Path
import bpy, json, math
from mathutils import Vector, Quaternion
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'outputs/atlas/valley-town-v19'
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(OUT/'snowcedar-town.glb'))
scene=bpy.context.scene
scene.name='SNOWCEDAR · Northern waystation'
scene['scope']='Standalone export of the Northern valley town. Web interactions live in src/atlas/valley-town.js. Original scenes are preserved.'
scene['source']='src/atlas/valley-town-architecture.js'
# Door and shutter groups retain their hinge origins; point lights remain editable.
scene.world.color=(.16,.20,.22)
scene.render.engine='CYCLES'
scene.cycles.samples=32
scene.render.resolution_x=1440
scene.render.resolution_y=1000
scene.render.resolution_percentage=100
bpy.ops.object.light_add(type='AREA',location=(-15,-22,28))
key=bpy.context.object;key.name='Snowcedar studio key';key.data.energy=5000;key.data.shape='DISK';key.data.size=30
key.rotation_euler=(Vector((0,0,3))-key.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.light_add(type='SUN',location=(20,-20,40))
sun=bpy.context.object;sun.name='Snowcedar sunlight';sun.data.energy=2;sun.rotation_euler=(.4,-.5,-.4)
bpy.ops.object.camera_add(location=(-31,-34,27))
camera=bpy.context.object;camera.name='Snowcedar overview';target=Vector((0,0,5));camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.lens=40;scene.camera=camera
bpy.ops.object.select_all(action='DESELECT')
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':
            space=area.spaces.active;space.region_3d.view_distance=60;space.region_3d.view_location=(0,0,5);space.region_3d.view_rotation=camera.rotation_euler.to_quaternion();space.shading.type='MATERIAL';space.clip_end=1000
bpy.ops.file.pack_all()
meshes=[o for o in scene.objects if o.type=='MESH']
report={'meshes':len(meshes),'vertices':sum(len(o.data.vertices) for o in meshes),'polygons':sum(len(o.data.polygons) for o in meshes),'packed_images':sum(bool(im.packed_file) for im in bpy.data.images),'doors':[o.name for o in scene.objects if o.type=='EMPTY' and ('正门' in o.name or '内门' in o.name)],'scene':scene.name}
assert len(report['doors'])==6,report
assert report['meshes']>50 and report['packed_images']>=5,report
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'snowcedar-town.blend'))
(OUT/'native-verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print('SNOWCEDAR_NATIVE_PASS',report)
