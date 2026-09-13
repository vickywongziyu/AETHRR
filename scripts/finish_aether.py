"""Finish native flowing-water material and add atmospheric sky for editable Blender animation."""
import bpy, math
from mathutils import Vector
ROOT='/Users/ziyu/Project/Codex6 3d'
scene=next(s for s in bpy.data.scenes if s.name.startswith('AETHER ·'))
bpy.context.window.scene=scene
# Nishita daylight for the native renderer. Web runtime uses its own animated atmosphere.
world=scene.world;nodes=world.node_tree.nodes;links=world.node_tree.links
sky=nodes.new('ShaderNodeTexSky');sky.sky_type='SINGLE_SCATTERING';sky.sun_elevation=math.radians(30);sky.sun_rotation=math.radians(145);sky.altitude=.3;sky.air_density=1.1
links.new(sky.outputs['Color'],nodes.get('Background').inputs[0]);nodes.get('Background').inputs[1].default_value=.20
water=next(o.data.materials[0] for o in scene.objects if o.name.startswith('Waterfall'))
nodes=water.node_tree.nodes;links=water.node_tree.links;bs=nodes.get('Principled BSDF')
uv=nodes.new('ShaderNodeTexCoord');mapping=nodes.new('ShaderNodeMapping');links.new(uv.outputs['UV'],mapping.inputs['Vector'])
tex=nodes.new('ShaderNodeTexNoise');tex.inputs['Scale'].default_value=1;tex.inputs['Detail'].default_value=3;links.new(mapping.outputs[0],tex.inputs['Vector'])
mapping.inputs['Scale'].default_value=(26,5,1)
for f,y in [(1,0),(721,30)]:mapping.inputs['Location'].default_value[1]=y;mapping.inputs['Location'].keyframe_insert('default_value',frame=f)
ramp=nodes.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].position=.22;ramp.color_ramp.elements[0].color=(.04,.27,.32,1);ramp.color_ramp.elements[1].position=.72;ramp.color_ramp.elements[1].color=(.8,.94,.94,1)
links.new(tex.outputs['Fac'],ramp.inputs[0]);links.new(ramp.outputs[0],bs.inputs['Base Color']);bs.inputs['Roughness'].default_value=.25
bump=nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.28;bump.inputs['Distance'].default_value=.05;links.new(tex.outputs['Fac'],bump.inputs['Height']);links.new(bump.outputs[0],bs.inputs['Normal'])
scene.frame_set(1)
bpy.data.libraries.write(ROOT+'/outputs/aether/aether-archipelago.blend',{scene},fake_user=True,compress=True)
print('Native animation saved: 30 seconds; camera, floating islands, birds and flowing-water material.')
