# Soft anatomical color regions; colors deform with vertices through morphs.
for p in me.polygons:p.material_index=0
colors=me.color_attributes.new(name='MiraSkinColor',type='FLOAT_COLOR',domain='POINT')
for v in me.vertices:
 x,y,z=v.co
 lipw=math.exp(-((x/.028)**6+((z-.704)/.012)**6))*max(0,min(1,(-y-.10)/.04))
 blush=sum(math.exp(-(((x-s*.054)/.022)**2+((z-.757)/.019)**2)) for s in [-1,1])*.20
 c=np.array([.48,.26,.155])*(1-lipw)+np.array([.34,.095,.068])*lipw
 c=c*(1-blush)+np.array([.53,.22,.145])*blush
 colors.data[v.index].color=(*c,1)
colorNode=skin.node_tree.nodes.new('ShaderNodeVertexColor');colorNode.layer_name=colors.name
skin.node_tree.links.new(colorNode.outputs['Color'],skin.node_tree.nodes['Principled BSDF'].inputs['Base Color'])
# Rebuild brows as slim surface-following geometry with individually tapered strands.
from mathutils.bvhtree import BVHTree
bvh=BVHTree.FromPolygons([v.co for v in me.vertices],[list(p.vertices) for p in me.polygons])
def surface(x,z):
 hit=bvh.ray_cast(Vector((x,-1,z)),Vector((0,1,0)))
 return float(hit[0].y)-.0007 if hit[0] is not None else -.15
hairmat=mat('Mira · black hair',(.012,.009,.007),.3)
hairmat.node_tree.nodes['Principled BSDF'].inputs['Anisotropic'].default_value=.55

def curve(name,points,radius,material):
 data=bpy.data.curves.new(name,'CURVE');data.dimensions='3D';data.resolution_u=12;data.bevel_depth=radius;data.bevel_resolution=3
 spline=data.splines.new('BEZIER');spline.bezier_points.add(len(points)-1)
 for i,(bp,p) in enumerate(zip(spline.bezier_points,points)):
  bp.co=p;bp.handle_left_type='AUTO';bp.handle_right_type='AUTO';bp.radius=max(.06,math.sin(math.pi*(i+.2)/(len(points)-.6))**.5) if i<len(points)-1 else .06
 o=bpy.data.objects.new(name,data);scene.collection.objects.link(o);o.data.materials.append(material);return o
for side in [-1,1]:
 for strand in range(6):
  pts=[]
  for i in range(10):
   t=i/9;x=side*(.018+.047*t);z=.815+.009*math.sin(math.pi*t*.92)-.003*t+strand*.00065
   pts.append((x,surface(x,z)-.0006,z))
  curve('Mira · brow hair',pts,.00055,hairmat)
# Extract actual eye boundary edges. Lash geometry follows the same eyelid morphs.
edge_counts={}
for p in me.polygons:
 for a,b in zip(p.vertices,list(p.vertices[1:])+[p.vertices[0]]):
  key=tuple(sorted((a,b)));edge_counts[key]=edge_counts.get(key,0)+1
boundary={v for e,n in edge_counts.items() if n==1 for v in e}
for side in [-1,1]:
 ec=center('joint-'+('l' if side==1 else 'r')+'-eye')
 eyelid=sorted([i for i in boundary if abs(me.vertices[i].co.x-ec[0])<.033 and abs(me.vertices[i].co.z-ec[2])<.014],key=lambda i:me.vertices[i].co.x)
 for vi in eyelid:
  c=me.vertices[vi].co
  if c.z<ec[2]+.001:continue
  ends=[c+Vector((0,-.0005,0)),c+Vector((side*.0008,-.003,.0018)),c+Vector((side*.0018,-.0046,.0033))]
  lash=curve('Mira · upper eyelash',ends,.00038,hairmat)
  bpy.context.view_layer.objects.active=lash;lash.select_set(True);bpy.ops.object.convert(target='MESH');lash=bpy.context.object;lash.select_set(False)
  lash.shape_key_add(name='Basis')
  for name in expressions:
   k=lash.shape_key_add(name=name);d=head.data.shape_keys.key_blocks[name].data[vi].co-c
   for pt in k.data:pt.co+=d
# Model oral teeth separately, tucked behind the deformable lip edge.
teeth=mat('Mira · teeth ivory',(.69,.64,.52),.28)
for i in range(-4,5):
 x=i*.0062;y=-.164+abs(i)*.001
 tooth=sphere('Mira · upper tooth',(x,y,.704),(.0033,.004,.0055),teeth)
# Curved cap from scalp topology, plus independent wavy tresses.
capfaces=[]
for p in me.polygons:
 c=p.center
 if all((v.co.z>(.878-.38*abs(v.co.x)) if v.co.y<-.035 else v.co.z>.723) for v in [me.vertices[i] for i in p.vertices]):capfaces.append(list(p.vertices))
capinds=sorted({v for f in capfaces for v in f});capmap={v:i for i,v in enumerate(capinds)}
capmesh=bpy.data.meshes.new('Mira · scalp shell')
capmesh.from_pydata([me.vertices[i].co+me.vertices[i].normal*.005 for i in capinds],[],[[capmap[i] for i in f] for f in capfaces]);capmesh.update()
cap=bpy.data.objects.new('Mira · black hair foundation',capmesh);scene.collection.objects.link(cap);capmesh.materials.append(hairmat)
for p in capmesh.polygons:p.use_smooth=True
subcap=cap.modifiers.new('Smooth crown','SUBSURF');subcap.levels=2
# Front side-part sweep. Many overlapping flattened strands share a coherent flow.
for side in [-1,1]:
 for j in range(18):
  t=j/17
  pts=[(-.012+side*.009*t,-.079+.022*t,.949-.006*t),
       (side*(.038+.01*t),-.115+.022*t,.931-.007*t),
       (side*(.083+.011*t),-.126+.035*t,.889-.016*t),
       (side*(.104+.012*t),-.107+.046*t,.834-.023*t),
       (side*(.119+.011*t),-.087+.051*t,.776-.036*t),
       (side*(.113+.022*t),-.049+.053*t,.721-.053*t),
       (side*(.132+.018*t),-.036+.061*t,.663-.062*t)]
  curve('Mira · swept black lock',pts,.0065,hairmat)
# Long back waves, longer than the generated source hair, down to mid-back.
for j in range(34):
 a=-math.pi*.12+math.pi*1.24*j/33
 x=.108*math.cos(a);y=.065+.065*math.sin(a)
 pts=[]
 for i in range(9):
  t=i/8;z=.89-t*(.39+.035*math.sin(j*2.1));wave=.017*math.sin(t*math.pi*3+j*.22)
  pts.append((x*(.78+.32*t)+wave,y+.016*math.sin(t*math.pi*2+j*.31),z))
 curve('Mira · long wavy back hair',pts,.008,hairmat)
