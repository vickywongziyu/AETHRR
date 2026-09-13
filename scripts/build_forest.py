"""Deterministic original forest geometry. Run in Blender; creates a NEW scene."""
import bpy, math, random, json, os
from mathutils import Vector
from mathutils.noise import noise_vector
R=random.Random(7352)
ROOT='/Users/ziyu/Project/Codex6 3d'
scene=bpy.data.scenes.new('Violet Sanctuary')
bpy.context.window.scene=scene
scene.render.engine='CYCLES'
scene.cycles.samples=32
scene.render.resolution_x=1280;scene.render.resolution_y=832;scene.render.resolution_percentage=100
scene.world=bpy.data.worlds.new('Violet twilight')
scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.09,.038,.16,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value=.38
scene.view_settings.view_transform='AgX'
scene.render.fps=30;scene.frame_start=1;scene.frame_end=721

def mat(name,color,rough=1,emission=0,vertex=False):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough
 if emission:p.inputs['Emission Color'].default_value=(*color,1);p.inputs['Emission Strength'].default_value=emission
 if vertex:
  n=m.node_tree.nodes.new('ShaderNodeVertexColor');n.layer_name='Color';m.node_tree.links.new(n.outputs['Color'],p.inputs['Base Color'])
 return m
bark=mat('Bark · silver plum',(.12,.071,.11),vertex=True)
foliage=mat('Leaves · lilac',(.49,.13,.39),.82,vertex=True)
soil=mat('Earth · heather moss',(.06,.022,.08),vertex=True)
stone=mat('Stone · aged rose slate',(.2,.125,.19),.85,vertex=True)
flower=mat('Heather · violet bloom',(.42,.065,.41),.78,vertex=True)
crystal=mat('Crystal · amethyst',(.33,.035,.85),.25,2.0)
lightmat=mat('Light · warm lilac',(.68,.26,1),.3,4)

class Geo:
 def __init__(self):self.v=[];self.f=[];self.c=[]
 def vert(self,v,c):self.v.append(tuple(v));self.c.append((*c,1));return len(self.v)-1
 def tube(self,a,b,r1,r2,c,sides=7):
  a,b=Vector(a),Vector(b);d=(b-a).normalized();u=d.cross(Vector((0,1,0)))
  if u.length<.01:u=d.cross(Vector((1,0,0)))
  u.normalize();v=d.cross(u);ids=[]
  for p,r in [(a,r1),(b,r2)]:
   ring=[]
   for k in range(sides):
    t=2*math.pi*k/sides; shade=.66+.38*(.5+.5*math.sin(t+1))
    ring.append(self.vert(p+r*(u*math.cos(t)+v*math.sin(t)),[i*shade for i in c]))
   ids.append(ring)
  for k in range(sides):self.f.append((ids[0][k],ids[0][(k+1)%sides],ids[1][(k+1)%sides],ids[1][k]))
  self.f.append(tuple(reversed(ids[0])));self.f.append(tuple(ids[1]))
 def leaf(self,p,s,c,angle=None):
  p=Vector(p);a=R.random()*6.28 if angle is None else angle
  u=Vector((math.cos(a),math.sin(a),R.uniform(-.35,.5)))*s
  v=Vector((-math.sin(a),math.cos(a),R.uniform(-.3,.6)))*s*.4
  ids=[self.vert(p-u*.15,c),self.vert(p+u*.22+v*.65,c),self.vert(p+u*.55+v*.85,c),self.vert(p+u,c),self.vert(p+u*.55-v*.85,c),self.vert(p+u*.22-v*.65,c)]
  self.f.append(tuple(ids))
 def box(self,p,s,c):
  x,y,z=p;a,b,h=s
  vs=[(x+dx*a/2,y+dy*b/2,z+dz*h/2) for dz in [-1,1] for dy in [-1,1] for dx in [-1,1]]
  ids=[self.vert(v,c) for v in vs]
  for f in [(0,2,3,1),(4,5,7,6),(0,1,5,4),(2,6,7,3),(0,4,6,2),(1,3,7,5)]:self.f.append(tuple(ids[i] for i in f))
 def object(self,name,material):
  mesh=bpy.data.meshes.new(name);mesh.from_pydata(self.v,[],self.f);mesh.materials.append(material)
  col=mesh.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='POINT')
  col.data.foreach_set('color',[a for c in self.c for a in c])
  mesh.update();obj=bpy.data.objects.new(name,mesh);scene.collection.objects.link(obj);return obj

def pathx(y):return math.sin(y*.096)*2.4+math.sin(y*.2)*.75

def height(x,y):
 d=abs(x-pathx(y));bank=max(0,min(1,(d-2.4)/8))
 n=noise_vector(Vector((x*.13,y*.13,2))).z
 return -.15+.1*math.sin(y*.22)+bank*(1.1+n*1.7+max(0,abs(x)-9)*.12)

g=Geo();nx=150;ny=185
for j in range(ny+1):
 y=-17+j*94/ny
 for i in range(nx+1):
  x=-37+i*74/nx;z=height(x,y);n=noise_vector(Vector((x*.5,y*.5,5))).x
  g.vert((x,y,z),(.038+n*.018,.017+n*.005,.05+n*.023))
for j in range(ny):
 for i in range(nx):
  a=j*(nx+1)+i;g.f.append((a,a+1,a+nx+2,a+nx+1))
g.object('Forest floor',soil)
# Worn individually irregular polygon paving stones, recessed seams.
g=Geo()
def paving_corner(i,j):
 y=-14+j*.68+math.sin(i*83.2+j*24.7)*.1
 return Vector((pathx(y)+(i-2.5)*.78+math.sin(i*35.7+j*71.2)*.16,y,0))
for j in range(108):
 for i in range(5):
  corners=[paving_corner(i,j),paving_corner(i+1,j),paving_corner(i+1,j+1),paving_corner(i,j+1)]
  center=sum(corners,Vector())/4
  corners=[center+(c-center)*.95 for c in corners]
  outline=[]
  for k,c in enumerate(corners):
   outline.extend([c.lerp(corners[(k-1)%4],.12),c.lerp(corners[(k+1)%4],.12)])
  col=[c*R.uniform(.8,1.16) for c in (.24,.155,.205)];ids=[]
  for level in [-.055,.032]:
   ids.append([g.vert((c.x,c.y,height(c.x,c.y)+level),col) for c in outline])
  g.f.append(tuple(ids[1]))
  for k in range(8):g.f.append((ids[0][k],ids[0][(k+1)%8],ids[1][(k+1)%8],ids[1][k]))
paving=g.object('Winding stone path',stone)
bevel=paving.modifiers.new('Weathered edges','BEVEL');bevel.width=.025;bevel.segments=2
# Six unique botanical meshes, shared by a forest of linked tree instances.
variants=[]
for variant in range(6):
 trunk=Geo();leaves=Geo();H=R.uniform(8,12)
 def branch(p,d,length,radius,depth):
  p=Vector(p);d=Vector(d).normalized();bend=Vector((R.uniform(-.14,.14),R.uniform(-.14,.14),.12))
  mid=p+d*length*.5;end=p+(d+bend).normalized()*length
  prev=p
  for seg in range(1,5):
   t=seg/4;cur=p.lerp(end,t)+Vector((math.sin(t*math.pi)*length*.035,math.sin(t*math.pi)*length*.024,0))
   trunk.tube(prev,cur,radius*(1-(seg-1)/4*.54),radius*(1-t*.54),(.16,.087,.13),9 if depth>2 else 6);prev=cur
  if depth>0:
   for k in range(3 if depth<3 else 4):
    theta=k*2.399+R.random()*.8
    direction=d*.6+Vector((math.cos(theta)*R.uniform(.4,.9),math.sin(theta)*R.uniform(.4,.9),R.uniform(.2,.65)))
    branch(end,direction,length*R.uniform(.49,.68),radius*.49,depth-1)
  if depth<2:
   for n in range(58 if depth==0 else 24):
    t=R.random();pos=mid.lerp(end,t)+Vector((R.gauss(0,.32),R.gauss(0,.32),R.gauss(0,.2)))
    color=R.choice([(.52,.16,.4),(.68,.27,.53),(.31,.055,.3),(.76,.36,.61),(.42,.12,.45)])
    leaves.leaf(pos,R.uniform(.085,.18),color)
 branch((0,0,0),(R.uniform(-.06,.06),R.uniform(-.06,.06),1),H*.37,.28,4)
 # Several prominent angled side limbs fill canopy more naturally.
 for k in range(3):
  a=k*2.4+variant;branch((0,0,H*.24),(.8*math.cos(a),.8*math.sin(a),.8),H*.28,.105,2)
 ob=trunk.object('Tree bark %02d'%variant,bark);lf=leaves.object('Tree canopy %02d'%variant,foliage)
 
 for poly in ob.data.polygons:poly.use_smooth=True
 variants.append((ob,lf))
positions=[(-5,-1,1.6),(5,0,1.6),(-6,7,1.5),(7,12,1.5),(-5,19,1.3),(6,24,1.4),(-6,30,1.4)]
for k in range(24):positions.append((-32+k*2.8,65+R.uniform(-4,7),R.uniform(2,3.1)))
for n in range(100):
 y=R.uniform(-12,75);x=R.uniform(-32,32)
 if abs(x-pathx(y))<4.8:continue
 positions.append((x,y,R.uniform(.7,1.3)))
for n,(x,y,s) in enumerate(positions):
 angle=R.random()*6.28
 for j,source in enumerate(variants[n%6]):
  ob=source if n<6 else bpy.data.objects.new(('Trunk' if j==0 else 'Canopy')+' %03d'%n,source.data)
  if n>=6:scene.collection.objects.link(ob)
  ob.location=(x,y,height(x,y)-.1);ob.scale=(s,s,s);ob.rotation_euler[2]=angle
# Scattered crag meshes, linked variations.
rockmeshes=[]
for n in range(5):
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3,radius=1)
 ob=bpy.context.object;ob.name='Boulder %02d'%n;ob.data.materials.append(stone)
 colors=ob.data.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='POINT')
 for v,c in zip(ob.data.vertices,colors.data):
  v.co*=.94+noise_vector(v.co*2.8).x*.2;c.color=(.1+R.random()*.05,.065+R.random()*.025,.12+R.random()*.035,1)
 rockmeshes.append(ob)
for n in range(180):
 y=R.uniform(-13,74);x=R.uniform(-31,31)
 if abs(x-pathx(y))<3:continue
 source=rockmeshes[n%5];ob=bpy.data.objects.new('Mossy stone %03d'%n,source.data)
 scene.collection.objects.link(ob)
 s=R.uniform(.35,1.8);ob.location=(x,y,height(x,y)+s*.2);ob.scale=(s,s*.8,s*R.uniform(.6,1.2));ob.rotation_euler=(R.random(),R.random(),R.random()*6.28)
for source in rockmeshes:bpy.data.objects.remove(source,do_unlink=True)
# Reusable dense flower / grass patches, individual leaves and five-petal blossoms.
patches=[]
for v in range(5):
 g=Geo()
 for k in range(60):
  x,y=R.uniform(-1.25,1.25),R.uniform(-1.25,1.25);h=R.uniform(.13,.55);c=R.choice([(.15,.035,.16),(.27,.08,.31),(.37,.085,.34)])
  g.tube((x,y,0),(x+.025,y,h),.008,.003,(.09,.065,.11),3)
  for j in range(3):g.leaf((x,y,h*(.25+j*.22)),R.uniform(.07,.17),c)
  if k%2==0:
   for j in range(5):g.leaf((x,y,h),.065,R.choice([(.72,.19,.51),(.48,.16,.69),(.83,.34,.62)]),j*6.28/5)
 ob=g.object('Heather patch %02d'%v,flower);patches.append(ob)
for n in range(1100):
 y=R.uniform(-14,75);x=pathx(y)+R.choice([-1,1])*R.uniform(2.5,10) if n<750 else R.uniform(-32,32)
 if abs(x-pathx(y))<2.4:continue
 source=patches[n%5];ob=source if n<5 else bpy.data.objects.new('Heather %03d'%n,source.data)
 if n>=5:scene.collection.objects.link(ob)
 ob.location=(x,y,height(x,y));s=R.uniform(.65,1.4);ob.scale=(s,s,s);ob.rotation_euler[2]=R.random()*6.28
# Ornamental columns, stairs and a pointed Gothic portal.
g=Geo();C=(.185,.12,.185)
def pillar(x,y,h=3.8):
 z=height(x,y)
 for zz,sz in [(.12,(1.05,1.05,.24)),(.35,(.84,.84,.2)),(.58,(.68,.68,.23)),(h-.32,(.74,.74,.2)),(h-.08,(1,1,.23))]:g.box((x,y,z+zz),sz,C)
 g.tube((x,y,z+.58),(x,y,z+h-.4),.29,.23,C,8)
 for k in range(8):
  t=k*6.28/8;g.tube((x+.25*math.cos(t),y+.25*math.sin(t),z+.65),(x+.21*math.cos(t),y+.21*math.sin(t),z+h-.42),.028,.024,(.24,.16,.24),4)
 g.tube((x,y,z+h),(x,y,z+h+.52),.25,0,C,4)
for y in [17,25,33,40]:
 for side in [-1,1]:pillar(pathx(y)+side*3.4,y,R.uniform(3.2,4.5))
for n in range(10):g.box((pathx(46),44+n*.53,.07+n*.13),(7.2,.58,.2+n*.26),C)
px=pathx(49);py=49;base=1.5
for side in [-1,1]:
 g.box((px+side*2.65,py,base+2.5),(.74,1.15,5),C)
 for offset in [0,.26]:
  points=[]
  for k in range(17):
   t=k/16;points.append((px+side*(2.65+offset)*(1-t**1.55),py-.2-offset*.12,base+4.65+t*2.5))
  for a,b in zip(points,points[1:]):g.tube(a,b,.23 if offset==0 else .12,.23 if offset==0 else .12,C,6)
 for zz in [1.1,4.8,5.4]:g.box((px+side*2.65,py,zz),(.98,1.35,.24),C)
 g.tube((px+side*2.65,py,6.1),(px+side*2.65,py,7.55),.33,0,C,4)
g.object('Sanctuary architecture',stone)
# Fallen architectural pieces.
g=Geo()
for i in range(27):
 y=R.uniform(22,43);x=pathx(y)+R.choice([-1,1])*R.uniform(4,7);z=height(x,y)
 g.box((x,y,z+.25),(R.uniform(.3,1.15),R.uniform(.3,.9),R.uniform(.3,.6)),C)
g.object('Fallen ruins',stone)
# Path lanterns and hovering crystals.
g=Geo();cg=Geo()
for n,y in enumerate([2,11,21,31,40,47]):
 x=pathx(y)+(-1 if n%2==0 else 1)*2.7;z=height(x,y)
 g.box((x,y,z+.12),(.6,.6,.24),C);g.tube((x,y,z+.2),(x,y,z+1.35),.14,.11,C,6);g.box((x,y,z+1.35),(.42,.42,.12),C)
 cg.tube((x,y,z+1.55),(x,y,z+1.85),.12,0,(.4,.12,.8),6);cg.tube((x,y,z+1.35),(x,y,z+1.55),0,.12,(.4,.12,.8),6)
 data=bpy.data.lights.new('Lantern light %d'%n,'POINT');data.energy=65;data.color=(.57,.14,1);data.shadow_soft_size=.5;ob=bpy.data.objects.new(data.name,data);scene.collection.objects.link(ob);ob.location=(x,y,z+1.7)
g.object('Path lanterns',stone);cg.object('Lantern crystals',lightmat)
# Portal perimeter glow, exported geometry; web adds animated energy membrane.
g=Geo();points=[(px-2.35,py-.6,base),(px-2.35,py-.6,base+4.5)]
for k in range(1,19):
 t=k/18;points.append((px-2.35*(1-t**1.55),py-.6,base+4.5+t*2.5))
for k in range(1,19):
 t=1-k/18;points.append((px+2.35*(1-t**1.55),py-.6,base+4.5+t*2.5))
points.append((px+2.35,py-.6,base))
for a,b in zip(points,points[1:]):g.tube(a,b,.035,.035,(.58,.12,1),5)
g.object('Portal luminous rim',lightmat)
for x,y,z,energy,color,size in [(-9,8,17,2300,(1,.57,.75),9),(5,27,14,1900,(.67,.36,1),8),(px,47,4,480,(.5,.12,1),3),(-10,-8,12,1700,(1,.63,.8),10)]:
 d=bpy.data.lights.new('Moonlit clearing','AREA');d.energy=energy;d.color=color;d.shape='DISK';d.size=size;o=bpy.data.objects.new(d.name,d);scene.collection.objects.link(o);o.location=(x,y,z)
# Camera follows four chapters and returns to entrance, a seamless 24-second loop.
cdata=bpy.data.cameras.new('Forest journey camera');cam=bpy.data.objects.new(cdata.name,cdata);scene.collection.objects.link(cam);scene.camera=cam;cdata.lens=24;cdata.clip_end=250
poses=[(1,(0,-9,2.5),(1,22,4.5)),(181,(1,8,2.5),(0,33,4.6)),(361,(-1,26,2.9),(px,49,4.2)),(541,(px,39,2.7),(px,49,4.5)),(721,(0,-9,2.5),(1,22,4.5))]
for f,p,t in poses:
 cam.location=p;cam.rotation_euler=(Vector(t)-Vector(p)).to_track_quat('-Z','Y').to_euler();cam.keyframe_insert('location',frame=f);cam.keyframe_insert('rotation_euler',frame=f)
scene.frame_set(1)
# Preserve other scenes in-memory, export active forest only.
bpy.ops.wm.save_as_mainfile(filepath=ROOT+'/outputs/forest/violet-sanctuary.blend')
bpy.ops.export_scene.gltf(filepath=ROOT+'/public/forest/violet-sanctuary.glb',export_format='GLB',use_active_scene=True,export_cameras=True,export_lights=False,export_animations=True,export_yup=True,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6)
with open(ROOT+'/outputs/forest/scene-manifest.json','w') as f:json.dump({'scene':scene.name,'objects':len(scene.objects),'frames':721,'fps':30,'portal':[px,base, -py], 'original_geometry':True,'chapters':['森林入口','花径','遗迹','传送门']},f,ensure_ascii=False,indent=2)
print('FOREST_READY',len(scene.objects))
