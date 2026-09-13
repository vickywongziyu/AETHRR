"""Separate native archive of the actual V21 web geometry. Factory-startup only."""
from pathlib import Path
import bpy,json
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'outputs/atlas/star-hall-v21'
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(OUT/'aether-star-hall.glb'))
scene=bpy.context.scene;scene.name='STELLARIUM · Aether star hall'
scene['source']='src/atlas/star-hall-architecture.js'
scene['scope']='Actual separate architecture, door and telescope hinges. The original five landscapes and live Blender scenes are preserved. Web sky, floating-parent motion, observation controls and journal saving remain in JS.'
scene['material_note']='The browser uses a custom triplanar stone shader. Native wall material uses the same local CC0 rock photograph in a box projection, an approximate native presentation.'
# Keep the authored coordinates: glTF Y-up becomes native Z-up automatically.
wall=next((m for m in bpy.data.materials if m.name.startswith('Stone · Observatory wall')),None)
if wall:
    wall.use_nodes=True;n=wall.node_tree.nodes;l=wall.node_tree.links;shader=next(x for x in n if x.type=='BSDF_PRINCIPLED')
    tex=n.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(ROOT/'public/aether/textures/rock-color.jpg'),check_existing=True);tex.projection='BOX';tex.projection_blend=.25
    geo=n.new('ShaderNodeNewGeometry');l.new(geo.outputs['Position'],tex.inputs['Vector']);mix=n.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=.55;mix.inputs[1].default_value=(.63,.61,.50,1);l.new(tex.outputs['Color'],mix.inputs[2]);l.new(mix.outputs[0],shader.inputs['Base Color']);shader.inputs['Roughness'].default_value=.9
scene.world.color=(.12,.16,.20);scene.render.engine='CYCLES';scene.cycles.samples=32
scene.render.resolution_x=1440;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
bpy.ops.object.light_add(type='SUN',location=(15,32,45));sun=bpy.context.object;sun.name='Stellarium archive sunlight';sun.data.energy=2;sun.rotation_euler=(.5,-.4,-.4)
for name,eye,target in [('Star hall overview',(13,48,12),(4,44.5,7.5)),('Observation tower',(-11,53,57),(-4.1,59.7,51))]:
    bpy.ops.object.camera_add(location=eye);camera=bpy.context.object;camera.name=name;camera.data.lens=36;camera.rotation_euler=(Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler()
scene.camera=bpy.data.objects['Star hall overview']
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':
            space=area.spaces.active;space.region_3d.view_distance=17;space.region_3d.view_location=(4,44.5,7.5);space.region_3d.view_rotation=scene.camera.rotation_euler.to_quaternion();space.shading.type='MATERIAL';space.clip_end=1000
bpy.ops.file.pack_all();meshes=[o for o in scene.objects if o.type=='MESH']
report={'scene':scene.name,'meshes':len(meshes),'vertices':sum(len(o.data.vertices) for o in meshes),'polygons':sum(len(o.data.polygons) for o in meshes),'packed_images':sum(bool(i.packed_file) for i in bpy.data.images),'hinges':[o.name for o in scene.objects if o.type=='EMPTY' and any(k in o.name for k in ['观星木门','方位转轴','仰角转轴'])]}
assert len(report['hinges'])==3,report
assert report['meshes']>20 and report['packed_images']>=3,report
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'aether-star-hall.blend'))
(OUT/'native-verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print('STAR_NATIVE_PASS',report)
