"""Revise only the saved Aether scene: linear palette, individual leaves, PBR surfaces."""
import bpy, math, random, json, os
from mathutils import Vector
from mathutils.noise import noise_vector
ROOT='/Users/ziyu/Project/Codex6 3d'; R=random.Random(92176)
scene=next(s for s in bpy.data.scenes if s.name.startswith('AETHER ·'))
bpy.context.window.scene=scene;scene.frame_set(1)
TEX=ROOT+'/public/aether/textures/'
def lin(v):return v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4
def kind(ob):return ob.data.materials[0].name.removeprefix('AE ').split('.')[0]
# Use source geometry and animation unchanged except the canopy surface and far rock relief.
leaves=0
for ob in list(scene.objects):
 if ob.type!='MESH':continue
 me=ob.data;k=kind(ob)
 if 'canopy' in ob.name:
  # Each disconnected source canopy lobe becomes a cluster of individual folded leaves.
  roots=list(range(len(me.vertices)))
  def root(i):
   while roots[i]!=i:roots[i]=roots[roots[i]];i=roots[i]
   return i
  for edge in me.edges:
   a,b=edge.vertices;ra,rb=root(a),root(b)
   if ra!=rb:roots[rb]=ra
  clusters={}
  for v in me.vertices:clusters.setdefault(root(v.index),[]).append(v.co.copy())
  vv=[];ff=[];colors=[]
  for points in clusters.values():
   c=sum(points,Vector())/len(points);lo=Vector(tuple(min(p[i] for p in points) for i in range(3)));hi=Vector(tuple(max(p[i] for p in points) for i in range(3)));extent=(hi-lo)*.5
   count=34;size=max(.085,min(.32,extent.x*.30))
   for j in range(count):
    a=R.random()*math.tau;radius=math.sqrt(R.random());p=c+Vector((math.cos(a)*radius*extent.x,math.sin(a)*radius*extent.y,R.uniform(-1,1)*extent.z))
    angle=R.random()*math.tau;u=Vector((math.cos(angle),math.sin(angle),R.uniform(-.4,.6)))*size;v=Vector((-math.sin(angle),math.cos(angle),R.uniform(-.35,.35)))*size*.47
    co=R.choice([(.25,.29,.085),(.34,.35,.12),(.18,.23,.064),(.40,.37,.13),(.29,.32,.085)])
    shade=R.uniform(.76,1.18);col=tuple(lin(min(1,x*shade)) for x in co)
    base=len(vv);vv.extend([p-u,p+v,p+u,p-v,p+Vector((0,0,size*.14))]);colors.extend([(*col,1)]*5)
    ff.extend([(base+4,base,base+1),(base+4,base+1,base+2),(base+4,base+2,base+3),(base+4,base+3,base)])
    leaves+=1
  new=bpy.data.meshes.new(ob.name+' individual foliage');new.from_pydata(vv,[],ff);new.materials.append(me.materials[0]);ca=new.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='POINT');ca.data.foreach_set('color',[x for c in colors for x in c]);new.update();ob.data=new
 elif k not in ['water','crystal']:
  ca=me.color_attributes.get('Color')
  if ca:
   for v in ca.data:
    c=v.color;v.color=(*[lin(max(0,min(1,x))) for x in c[:3]],c[3])
 if k=='mountain':
  for v in ob.data.vertices:
   p=v.co;v.co+=noise_vector(p*.43)*.62+noise_vector(p*.91)*.17
  for f in ob.data.polygons:f.use_smooth=True
# Material neutral exports; native texture nodes are added after GLB export.
for ma in set(m for ob in scene.objects if ob.type=='MESH' for m in ob.data.materials):
 k=ma.name.removeprefix('AE ').split('.')[0];p=ma.node_tree.nodes.get('Principled BSDF')
 if p:
  p.inputs['Emission Strength'].default_value=0
  if k=='leaves':p.inputs['Roughness'].default_value=.86
  if k=='crystal':
   # Neutral vertex multiplier lets actual glass absorption provide the turquoise.
   for ob in scene.objects:
    if ob.type=='MESH' and ma in list(ob.data.materials):
     ca=ob.data.color_attributes.get('Color')
     if ca:
      for c in ca.data:c.color=(.035,.21,.19,1)
   p.inputs['Roughness'].default_value=.12;p.inputs['Metallic'].default_value=.08
# Export no texture-node baking; browser uses shared triplanar material maps.
bpy.ops.export_scene.gltf(filepath=ROOT+'/public/aether/aether.glb',export_format='GLB',use_active_scene=True,export_cameras=False,export_lights=False,export_extras=True,export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6)
# Native PBR maps with box projection (matching browser's triplanar scale).
for ma in set(m for ob in scene.objects if ob.type=='MESH' for m in ob.data.materials):
 k=ma.name.removeprefix('AE ').split('.')[0];n=ma.node_tree.nodes;l=ma.node_tree.links;p=n.get('Principled BSDF')
 if k in ['rock','stone','bark','moss','mountain']:
  tc=n.new('ShaderNodeTexCoord');mapping=n.new('ShaderNodeVectorMath');mapping.operation='SCALE';mapping.inputs[3].default_value=.22 if k=='rock' else .065 if k=='mountain' else .65 if k=='moss' else .48;l.new(tc.outputs['Object'],mapping.inputs[0])
  imgs=[]
  for file,cs in [('rock-color.jpg','sRGB'),('rock-normal.jpg','Non-Color'),('rock-rough.jpg','Non-Color')]:
   tex=n.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(TEX+file,check_existing=True);tex.image.colorspace_settings.name=cs;tex.projection='BOX';tex.projection_blend=.22;l.new(mapping.outputs[0],tex.inputs[0]);imgs.append(tex)
  mix=n.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=1
  tint={'rock':(.72,.65,.49,1),'stone':(.36,.31,.24,1),'bark':(.16,.11,.065,1),'moss':(.22,.24,.075,1),'mountain':(.20,.25,.28,1)}[k]
  mix.inputs[2].default_value=tint;l.new(imgs[0].outputs[0],mix.inputs[1]);l.new(mix.outputs[0],p.inputs['Base Color']);l.new(imgs[2].outputs[0],p.inputs['Roughness'])
  # Box projected texture's luminance gives stable bump at projection seams.
  bump=n.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.3;bump.inputs['Distance'].default_value=.10;l.new(imgs[0].outputs[0],bump.inputs['Height']);l.new(bump.outputs[0],p.inputs['Normal'])
 if k=='crystal':
  for li in list(p.inputs['Base Color'].links):l.remove(li)
  p.inputs['Base Color'].default_value=(.12,.50,.49,1);p.inputs['Transmission Weight'].default_value=.62;p.inputs['IOR'].default_value=1.46;p.inputs['Coat Weight'].default_value=.65;p.inputs['Coat Roughness'].default_value=.08
 if k=='leaves':p.inputs['Subsurface Weight'].default_value=.045
# Match warm side sunlight and cool sky fill, retain all motion tracks.
for ob in scene.objects:
 if ob.type=='LIGHT' and ob.data.type=='SUN':ob.data.energy=4.0;ob.data.color=(1,.82,.60);ob.rotation_euler=(math.radians(61),math.radians(-18),math.radians(-38));ob.data.angle=.04
 if ob.type=='LIGHT' and ob.data.type=='AREA':ob.data.energy=700;ob.data.color=(.60,.76,1)
n=scene.world.node_tree.nodes;l=scene.world.node_tree.links;env=n.new('ShaderNodeTexEnvironment');env.image=bpy.data.images.load(TEX+'sky.hdr',check_existing=True);bg=n.get('Background');l.new(env.outputs['Color'],bg.inputs[0]);bg.inputs[1].default_value=.32
scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast';scene.view_settings.exposure=-.3
scene.render.fps=24;scene.frame_end=720;scene.frame_set(1)
for image in bpy.data.images:
 if image.filepath.startswith(TEX):image.pack()
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=ROOT+'/outputs/aether/aether-archipelago.blend',compress=True)
report={'revision':'2026-09-08 material-and-light','individual_leaves':leaves,'meshes':sum(o.type=='MESH' for o in scene.objects),'polygons':sum(len(o.data.polygons) for o in scene.objects if o.type=='MESH'),'srgb_palette_linearized':True,'packed_pbr_images':True}
json.dump(report,open(ROOT+'/outputs/aether/material-revision.json','w'),indent=2);print('AETHER_REFINED',json.dumps(report))
