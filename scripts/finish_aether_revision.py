"""Balance the native camera background separately from HDR illumination."""
import bpy
ROOT='/Users/ziyu/Project/Codex6 3d'
s=next(s for s in bpy.data.scenes if s.name.startswith('AETHER ·'))
bpy.context.window.scene=s
n=s.world.node_tree.nodes;l=s.world.node_tree.links
env=next(v for v in n if v.type=='TEX_ENVIRONMENT')
bg=n.get('Background');bg.inputs[1].default_value=.50
camera_bg=n.new('ShaderNodeBackground');camera_bg.inputs[1].default_value=1.6
l.new(env.outputs['Color'],camera_bg.inputs[0])
path=n.new('ShaderNodeLightPath');mix=n.new('ShaderNodeMixShader')
l.new(path.outputs['Is Camera Ray'],mix.inputs[0]);l.new(bg.outputs[0],mix.inputs[1]);l.new(camera_bg.outputs[0],mix.inputs[2])
l.new(mix.outputs[0],next(v for v in n if v.type=='OUTPUT_WORLD').inputs['Surface'])
for ma in bpy.data.materials:
 if ma.name.removeprefix('AE ').split('.')[0]!='mountain':continue
 n=ma.node_tree.nodes;l=ma.node_tree.links;p=n.get('Principled BSDF')
 photo=next(v for v in n if v.type=='TEX_IMAGE' and 'rock-color' in v.image.name)
 gray=n.new('ShaderNodeRGBToBW');l.new(photo.outputs[0],gray.inputs[0])
 tint=n.new('ShaderNodeMixRGB');tint.blend_type='MULTIPLY';tint.inputs[0].default_value=1;tint.inputs[2].default_value=(.11,.22,.32,1)
 l.new(gray.outputs[0],tint.inputs[1]);l.new(tint.outputs[0],p.inputs['Base Color'])
s.view_settings.exposure=0
s.frame_set(1)
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=ROOT+'/outputs/aether/aether-archipelago.blend',compress=True)
s.render.engine='CYCLES';s.cycles.samples=16;s.cycles.use_denoising=True
s.render.resolution_x=960;s.render.resolution_y=624;s.render.resolution_percentage=100
s.render.filepath=ROOT+'/outputs/aether/native-preview.png'
bpy.ops.render.render(write_still=True)
