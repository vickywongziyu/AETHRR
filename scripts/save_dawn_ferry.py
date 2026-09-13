"""Separate native archive of the actual V22 web geometry. Factory-startup only."""
from pathlib import Path
import bpy,json
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'outputs/atlas/boat-v22'
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(OUT/'dawn-ferry.glb'))
scene=bpy.context.scene;scene.name='WATERCOURT · Dawn ferry'
scene['source']='src/atlas/ferry-architecture.js'
scene['scope']='Actual boat, west landing and two gangplank hinges, in original local source coordinates. Web parent scale is 1.6. Sailing, collision, wake and camera behavior remain in JavaScript. Original landscapes and live Blender scenes preserved.'
scene['material_note']='Native PBR wood maps are packed. The browser adds procedural grain and animated wake; these runtime effects are not exported.'
# Keep the authored coordinates: glTF Y-up becomes native Z-up automatically.
scene.world.color=(.12,.16,.20);scene.render.engine='CYCLES';scene.cycles.samples=32
scene.render.resolution_x=1440;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
bpy.ops.object.light_add(type='SUN',location=(15,32,45));sun=bpy.context.object;sun.name='Stellarium archive sunlight';sun.data.energy=2;sun.rotation_euler=(.5,-.4,-.4)
for name,eye,target in [('Ferry overview',(33,-54,6),(26,-45,1)),('West landing',(-22,-54,8),(-30,-42,1))]:
    bpy.ops.object.camera_add(location=eye);camera=bpy.context.object;camera.name=name;camera.data.lens=36;camera.rotation_euler=(Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler()
scene.camera=bpy.data.objects['Ferry overview']
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':
            space=area.spaces.active;space.region_3d.view_distance=14;space.region_3d.view_location=(26,-45,1);space.region_3d.view_rotation=scene.camera.rotation_euler.to_quaternion();space.shading.type='MATERIAL';space.clip_end=1000
bpy.ops.file.pack_all();meshes=[o for o in scene.objects if o.type=='MESH']
report={'scene':scene.name,'meshes':len(meshes),'vertices':sum(len(o.data.vertices) for o in meshes),'polygons':sum(len(o.data.polygons) for o in meshes),'packed_images':sum(bool(i.packed_file) for i in bpy.data.images),'hinges':[o.name for o in scene.objects if o.type=='EMPTY' and any(k in o.name for k in ['可升降舷梯'])]}
assert len(report['hinges'])==2,report
assert report['meshes']>8 and report['packed_images']>=3,report
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'dawn-ferry.blend'))
(OUT/'native-verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print('FERRY_NATIVE_PASS',report)
