"""Local UV projection study on the actual Rodin mesh; not a final character.

The original design image is sampled by a material on the same 3D surface.
No new raster artwork, external service, or replacement person is generated.
"""
import bpy
import bmesh
import json
from pathlib import Path
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'work/character-reference-v1/local-refinement'
OUT.mkdir(parents=True,exist_ok=True)
scene=bpy.data.scenes.new('Mira · Local refinement study')
bpy.context.window.scene=scene
bpy.ops.import_scene.gltf(filepath=str(ROOT/'outputs/character/reference-master/mira-rodin-source.glb'))
obj=next(o for o in scene.objects if o.type=='MESH')
obj.name='Mira · Local refinement candidate'
mesh=obj.data
before=len(mesh.vertices)
bm=bmesh.new();bm.from_mesh(mesh)
bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=0.000001)
bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
bm.to_mesh(mesh);bm.free();mesh.update()
for poly in mesh.polygons:poly.use_smooth=True

# Landmark correspondences derived from the original portrait and the actual
# baseline front render. Kept explicit so a failed alignment can be revised.
landmarks=[[-.044,.788,531,162],[.057,.788,584,172],
           [.013,.735,560,193],[.008,.700,552,215],[-.005,.663,543,244]]
A=np.array([[x,z,1.] for x,z,u,v in landmarks])
pixels=np.array([[u,v] for x,z,u,v in landmarks])
coeff=np.linalg.lstsq(A,pixels,rcond=None)[0]
uv=mesh.uv_layers.new(name='MiraOriginalFaceProjection')
for loop in mesh.loops:
    co=mesh.vertices[loop.vertex_index].co
    u,v=np.array([co.x,co.z,1.])@coeff
    uv.data[loop.index].uv=(float(u/1024),float(1-v/1536))

def smoothstep(a,b,v):
    t=max(0.,min(1.,(v-a)/(b-a)))
    return t*t*(3-2*t)

mask=mesh.color_attributes.new(name='MiraFaceProjectionMask',type='FLOAT_COLOR',domain='POINT')
affected=0
for v in mesh.vertices:
    x,y,z=v.co
    ellipse=(x/.118)**2+((z-.773)/.132)**2
    w=(1-smoothstep(.70,1.,ellipse))*(1-smoothstep(-.13,-.065,y))
    mask.data[v.index].color=(w,w,w,1)
    affected+=w>.01

mat=mesh.materials[0].copy();mat.name='Mira · Original-image face projection study'
mesh.materials[0]=mat
nodes=mat.node_tree.nodes;links=mat.node_tree.links
principled=next(n for n in nodes if n.type=='BSDF_PRINCIPLED')
base_input=principled.inputs['Base Color']
base_source=base_input.links[0].from_socket if base_input.is_linked else None
if base_source is None:raise RuntimeError('Expected actual Rodin base color texture.')
image=bpy.data.images.load(str(ROOT/'outputs/character/mira-concept-v2.png'),check_existing=True)
image.pack()
uvnode=nodes.new('ShaderNodeUVMap');uvnode.uv_map=uv.name
tex=nodes.new('ShaderNodeTexImage');tex.image=image;tex.interpolation='Cubic';tex.extension='CLIP'
attr=nodes.new('ShaderNodeVertexColor');attr.layer_name=mask.name
mix=nodes.new('ShaderNodeMixRGB');mix.blend_type='MIX'
links.new(uvnode.outputs['UV'],tex.inputs['Vector'])
links.new(attr.outputs['Color'],mix.inputs[0])
links.new(base_source,mix.inputs[1]);links.new(tex.outputs['Color'],mix.inputs[2])
links.new(mix.outputs[0],base_input)

import runpy
studio=runpy.run_path(str(ROOT/'scripts/render_mira_reference_master.py'),run_name='mira_local_studio')
studio['configure_white_studio'](scene,1.90)
scene.cycles.samples=32
scene.render.resolution_x=768;scene.render.resolution_y=768
scene.render.resolution_percentage=100
views=[('front',(0,-6,.80),(0,0,.80)),
       ('side',(-6,0,.80),(0,0,.80)),
       ('threequarter',(-4.243,-4.243,.80),(0,0,.80))]
for name,position,target in views:
    cam=studio['camera'](scene,'Mira Local · '+name,position,target,.57)
    scene.camera=cam;scene.render.filepath=str(OUT/(name+'-candidate.png'))
    bpy.ops.render.render(write_still=True)

# This file contains a visible study, not a rigged or accepted master.
for material in mesh.materials:
    if material and material.use_nodes:
        for n in material.node_tree.nodes:
            if n.type=='TEX_IMAGE' and n.image and not n.image.packed_file:n.image.pack()
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'mira-local-refinement-study.blend'))
(OUT/'study.json').write_text(json.dumps({'status':'rendered_pending_visual_audit',
    'originalVertices':before,'weldedVertices':len(mesh.vertices),'faces':len(mesh.polygons),
    'faceVerticesAffected':int(affected),'projectionLandmarks':landmarks,
    'sourceImage':'outputs/character/mira-concept-v2.png','sourceMesh':'outputs/character/reference-master/mira-rodin-source.glb',
    'rigged':False,'expressions':False,'finalMaster':False},indent=2))
