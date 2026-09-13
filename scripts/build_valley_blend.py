"""Create an independently editable Blender scene from the web scene's real geometry."""
import bpy, math, random, json
from mathutils import Vector
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'outputs/valley'
bpy.ops.wm.read_factory_settings(use_empty=True)
scene=bpy.context.scene
scene.render.fps=24
bpy.ops.import_scene.gltf(filepath=str(OUT/'north-valley.glb'))
scene.frame_start=1;scene.frame_end=1152
camera=next(o for o in scene.objects if o.type=='CAMERA')
scene.camera=camera

scene.render.engine='CYCLES';scene.cycles.samples=32
scene.cycles.use_denoising=True
scene.render.resolution_x=1920;scene.render.resolution_y=1080;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX'

# Keep the baked vertex snow coverage; restore physical microrelief for the editable renderer.
for mat in bpy.data.materials:
    if not mat.use_nodes:continue
    nodes=mat.node_tree.nodes;links=mat.node_tree.links
    bsdf=next((n for n in nodes if n.type=='BSDF_PRINCIPLED'),None)
    if not bsdf:continue
    for node in nodes:
        if node.type=='VERTEX_COLOR':node.layer_name='Color'
    if mat.name.startswith(('Granite_Snow_Ground','River_stone','Scanned_granite')):
        tex=nodes.new('ShaderNodeTexNoise');tex.inputs['Scale'].default_value=2.5;tex.inputs['Detail'].default_value=5;tex.inputs['Roughness'].default_value=.73
        bump=nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.3;bump.inputs['Distance'].default_value=.12
        links.new(tex.outputs['Fac'],bump.inputs['Height']);links.new(bump.outputs['Normal'],bsdf.inputs['Normal'])
    if mat.name.startswith('Flowing_river'):
        bsdf.inputs['Base Color'].default_value=(.045,.10,.115,1)
        bsdf.inputs['Metallic'].default_value=.3;bsdf.inputs['Roughness'].default_value=.2
        bsdf.inputs['Coat Weight'].default_value=.4
        tex=nodes.new('ShaderNodeTexNoise');tex.noise_dimensions='4D';tex.inputs['Scale'].default_value=3;tex.inputs['Detail'].default_value=3
        tex.inputs['W'].default_value=0;tex.inputs['W'].keyframe_insert('default_value',frame=1)
        tex.inputs['W'].default_value=8;tex.inputs['W'].keyframe_insert('default_value',frame=1152)
        bump=nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.22;bump.inputs['Distance'].default_value=.09
        links.new(tex.outputs['Fac'],bump.inputs['Height']);links.new(bump.outputs['Normal'],bsdf.inputs['Normal'])

world=bpy.data.worlds.new('Alpine late afternoon');scene.world=world;world.use_nodes=True
nodes=world.node_tree.nodes;links=world.node_tree.links;nodes.clear()
sky=nodes.new('ShaderNodeTexSky');sky.sky_type='MULTIPLE_SCATTERING';sky.sun_elevation=.34;sky.sun_rotation=math.radians(145);sky.altitude=.6;sky.air_density=1.2
bg=nodes.new('ShaderNodeBackground');bg.inputs['Strength'].default_value=.06
output=nodes.new('ShaderNodeOutputWorld');links.new(sky.outputs['Color'],bg.inputs['Color']);links.new(bg.outputs[0],output.inputs['Surface'])
sun_data=bpy.data.lights.new('Warm sun','SUN');sun_data.energy=2.7;sun_data.color=(1,.83,.61);sun_data.angle=.07
sun=bpy.data.objects.new('Warm sun',sun_data);scene.collection.objects.link(sun)
sun.rotation_euler=Vector((85,-55,-80)).to_track_quat('-Z','Y').to_euler()
area_data=bpy.data.lights.new('Blue skylight','AREA');area_data.energy=1200;area_data.color=(.59,.74,1);area_data.shape='DISK';area_data.size=150
area=bpy.data.objects.new('Blue skylight',area_data);scene.collection.objects.link(area);area.location=(0,20,100)

water=next((o for o in scene.objects if o.name.startswith('River_animated_surface') and o.type=='MESH'),None)
if water:
    bpy.context.view_layer.objects.active=water
    water.select_set(True);bpy.ops.object.transform_apply(location=False,rotation=True,scale=True);water.select_set(False)
    wave=water.modifiers.new('Subtle moving water','WAVE');wave.height=.025;wave.width=.45;wave.speed=.11;wave.narrowness=1.8

# Sparse animated snow. All objects remain editable and the source scene is untouched.
rand=random.Random(81)
snow_mat=bpy.data.materials.new('Snowflakes');snow_mat.diffuse_color=(.92,.97,1,1);snow_mat.use_nodes=True
snow_bsdf=snow_mat.node_tree.nodes.get('Principled BSDF');snow_bsdf.inputs['Base Color'].default_value=(.92,.97,1,1);snow_bsdf.inputs['Roughness'].default_value=.8
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=.025)
prototype=bpy.context.object;prototype.name='Snowflake_000';prototype.data.materials.append(snow_mat)
snow_collection=bpy.data.collections.new('Animated snow');scene.collection.children.link(snow_collection)
for c in list(prototype.users_collection):c.objects.unlink(prototype)
snow_collection.objects.link(prototype)
for i in range(160):
    obj=prototype if i==0 else bpy.data.objects.new(f'Snowflake_{i:03}',prototype.data)
    if i:snow_collection.objects.link(obj)
    x=rand.uniform(-65,65);y=rand.uniform(-80,100);z=rand.uniform(12,65)
    obj.location=(x,y,z);obj.keyframe_insert('location',frame=1)
    obj.location=(x+rand.uniform(-3,4),y+rand.uniform(-2,3),z-35);obj.keyframe_insert('location',frame=1152)

for name,frame in [('河谷全景',1),('林间小屋',277),('河上木桥',530),('山间瞭望台',784),('雪山之巅',968)]:
    scene.timeline_markers.new(name,frame=frame)
scene.frame_set(1)
for o in bpy.context.selected_objects:o.select_set(False)
camera.select_set(True);bpy.context.view_layer.objects.active=camera
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type=='VIEW_3D':
            area.spaces.active.region_3d.view_perspective='CAMERA'
            area.spaces.active.shading.type='MATERIAL'
scene['description']='North Valley — 48 second editable alpine camera tour. Snow, river and scenery are real geometry.'
scene['source']='Based on user reference; CC0 rock/branch materials from Poly Haven.'
scene['web_preview']='http://127.0.0.1:5173/valley.html'
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'north-valley.blend'),compress=True)
stats={'objects':len(scene.objects),'meshes':sum(o.type=='MESH' for o in scene.objects),'cameras':sum(o.type=='CAMERA' for o in scene.objects),'frames':1152,'fps':24,'duration_seconds':48,'camera_animation':bool(camera.animation_data),'packed_images':sum(bool(i.packed_file) for i in bpy.data.images)}
(OUT/'scene-manifest.json').write_text(json.dumps(stats,indent=2))
print('VALLEY_BLEND_READY',json.dumps(stats))
