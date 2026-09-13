import bpy
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
path=ROOT/'outputs/valley/north-valley.blend'
bpy.ops.wm.open_mainfile(filepath=str(path))
image=bpy.data.images.load(str(ROOT/'public/assets/granite.jpg'),check_existing=True)
for mat in bpy.data.materials:
    if not mat.name.startswith('Granite_Snow_Ground'):continue
    nodes=mat.node_tree.nodes;links=mat.node_tree.links
    bsdf=next(n for n in nodes if n.type=='BSDF_PRINCIPLED')
    color=next(n for n in nodes if n.type=='VERTEX_COLOR')
    color.layer_name='Color'
    geometry=nodes.new('ShaderNodeNewGeometry')
    mapping=nodes.new('ShaderNodeVectorMath');mapping.operation='SCALE';mapping.inputs['Scale'].default_value=.15
    tex=nodes.new('ShaderNodeTexImage');tex.image=image;tex.projection='BOX';tex.projection_blend=.2
    bw=nodes.new('ShaderNodeRGBToBW')
    mix=nodes.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=.8
    links.new(geometry.outputs['Position'],mapping.inputs[0]);links.new(mapping.outputs[0],tex.inputs['Vector']);links.new(tex.outputs['Color'],bw.inputs[0])
    links.new(color.outputs['Color'],mix.inputs[1]);links.new(bw.outputs[0],mix.inputs[2]);links.new(mix.outputs[0],bsdf.inputs['Base Color'])
    bump=next(n for n in nodes if n.type=='BUMP');links.new(bw.outputs[0],bump.inputs['Height']);bump.inputs['Strength'].default_value=.35;bump.inputs['Distance'].default_value=.25
bpy.ops.file.pack_all()
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(path),compress=True)
s=bpy.context.scene;s.cycles.samples=8;s.render.resolution_x=800;s.render.resolution_y=450;s.render.resolution_percentage=100;s.render.filepath=str(ROOT/'outputs/valley/north-valley-blender-preview.png');bpy.ops.render.render(write_still=True)
print('FINAL_VALLEY_MATERIALS_SAVED')
