"""Original elven water garden; non-destructive new Blender scene, linked botanical meshes."""
import bpy, math, random, json, os
from mathutils import Vector
from mathutils.noise import noise_vector
R=random.Random(9291)
ROOT='/Users/ziyu/Project/Codex6 3d'
scene=bpy.data.scenes.new('Watercourt · elven garden')
bpy.context.window.scene=scene
scene.render.engine='CYCLES';scene.cycles.samples=32
scene.render.resolution_x=1440;scene.render.resolution_y=960;scene.render.resolution_percentage=100
scene.render.fps=30;scene.frame_start=1;scene.frame_end=901
scene.world=bpy.data.worlds.new('Watercourt golden dusk');scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.18,.15,.22,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value=.55
scene.view_settings.view_transform='AgX'
def mat(name,c,rough=.8,emission=0,vertex=True):
 m=bpy.data.materials.new('WC '+name);m.diffuse_color=(*c,1);m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*c,1);p.inputs['Roughness'].default_value=rough
 if emission:p.inputs['Emission Color'].default_value=(*c,1);p.inputs['Emission Strength'].default_value=emission
 if vertex:
  v=m.node_tree.nodes.new('ShaderNodeVertexColor');v.layer_name='Color';m.node_tree.links.new(v.outputs['Color'],p.inputs['Base Color'])
 return m
stone=mat('limestone',(.52,.44,.31));trim=mat('ornament',(.42,.34,.21),.65);roof=mat('dome',(.45,.49,.46),.56)
bark=mat('bark',(.13,.075,.032));foliage=mat('leaves',(.11,.14,.035));flowers=mat('flowers',(.28,.07,.22));ground=mat('moss',(.065,.09,.026));lampmat=mat('lantern',(.95,.56,.17),.25,4,False)

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


C=(.57,.48,.34);D=(.40,.34,.23)
def curve(g,points,r,c,sides=6):
 for a,b in zip(points,points[1:]):g.tube(a,b,r,r,c,sides)
def ring(g,x,y,z,r,w,h,c,n=64):
 for i in range(n):
  a=i*math.tau/n;b=(i+1)*math.tau/n
  ids=[]
  for zz in [z-h/2,z+h/2]:
   for rr,t in [(r-w/2,a),(r+w/2,a),(r+w/2,b),(r-w/2,b)]:ids.append(g.vert((x+rr*math.cos(t),y+rr*math.sin(t),zz),c))
  for f in [(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]:g.f.append(tuple(ids[k] for k in f))
def disk(g,x,y,z,r,h,c,n=64):g.tube((x,y,z-h/2),(x,y,z+h/2),r,r,c,n)
def gazebo(name,x,y,r=2.6,h=4.1,z=.1):
 g=Geo();orn=Geo();shell=Geo()
 for i in range(4):disk(g,x,y,z+i*.17,r+.65-i*.15,.22,C)
 base=z+.65
 # stone floor radial slab seams
 for i in range(12):
  a=i*math.tau/12;curve(orn,[(x,y,base+.04),(x+(r+.12)*math.cos(a),y+(r+.12)*math.sin(a),base+.04)],.012,D,4)
 for k in range(8):
  a=k*math.tau/8;cx=x+(r-.2)*math.cos(a);cy=y+(r-.2)*math.sin(a)
  for zz,rr,hh in [(0,.40,.14),(.16,.33,.12),(.30,.27,.13),(h-.37,.28,.12),(h-.19,.38,.18)]:disk(g,cx,cy,base+zz,rr,hh,C,24)
  g.tube((cx,cy,base+.35),(cx,cy,base+h-.43),.225,.187,C,24)
  for j in range(12):
   t=j*math.tau/12;curve(orn,[(cx+.225*math.cos(t),cy+.225*math.sin(t),base+.4),(cx+.188*math.cos(t),cy+.188*math.sin(t),base+h-.43)],.015,D,4)
  # capital curls
  for j in [-1,1]:
   pts=[]
   for q in range(21):
    t=q/20*math.tau;rr=.12*(1-q/28)
    pts.append((cx+j*.18+rr*math.cos(t),cy-.22,base+h-.27+rr*math.sin(t)))
   curve(orn,pts,.018,C)
 for zz,rr,w,hh in [(h,r+.05,.40,.25),(h+.2,r+.14,.47,.14),(h+.37,r+.13,.30,.13)]:ring(g,x,y,base+zz,rr,w,hh,C)
 # continuous scalloped hemisphere
 dz=base+h+.36;rh=r*1.01;dh=r*.67
 rows=18;cols=96
 for j in range(rows+1):
  t=j/rows*math.pi/2;rr=rh*math.cos(t);zz=dz+dh*math.sin(t)
  for k in range(cols):
   a=k*math.tau/cols;rr2=rr*(1+.018*math.sin(a*8)*math.cos(t))
   shade=.93+.07*math.sin(a*8)
   shell.vert((x+rr2*math.cos(a),y+rr2*math.sin(a),zz),tuple(v*shade for v in (.47,.49,.44)))
 for j in range(rows):
  for k in range(cols):
   a=j*cols+k;b=j*cols+(k+1)%cols;shell.f.append((a,b,b+cols,a+cols))
 # raised petal tracery follows shell
 for k in range(8):
  a=k*math.tau/8
  for side in [-1,1]:
   pts=[]
   for j in range(35):
    t=.035+j/34*1.47;aa=a+side*.27*math.sin(t*2)**1.1;rr=(rh+.035)*math.cos(t);zz=dz+dh*math.sin(t)+.035
    pts.append((x+rr*math.cos(aa),y+rr*math.sin(aa),zz))
   curve(orn,pts,.036,C)
  # crest leaf at base
  pts=[]
  for j in range(29):
   t=j/28*math.tau;aa=a+.16*math.sin(t);el=.15+.18*(1-math.cos(t));rr=(rh+.025)*math.cos(el)
   pts.append((x+rr*math.cos(aa),y+rr*math.sin(aa),dz+dh*math.sin(el)+.035))
  curve(orn,pts,.025,C)
 disk(orn,x,y,dz+dh+.06,.15,.16,C,24);orn.tube((x,y,dz+dh+.12),(x,y,dz+dh+.65),.14,0,C,16)
 for geo,label,m in [(g,'stone',stone),(orn,'carvings',trim),(shell,'dome',roof)]:
  ob=geo.object(name+' '+label,m)
  if label=='dome':
   for p in ob.data.polygons:p.use_smooth=True
 return base+h
# Main water temples echo the supplied composition.
gazebo('West foreground rotunda',-10,-10,2.35,3.4)
gazebo('East foreground rotunda',12,-8,3.25,4.2)
gazebo('Old moon rotunda',-5,16,2.8,4.1)
gazebo('Little water shrine',5,16,1.6,2.8)
gazebo('Terrace rotunda',18,19,4.1,4.6,2.3)
gazebo('Distant shrine',7,36,2.1,3.7,1.2)
# Bridges: separately laid stones, open water underneath, profiled parapets.
bridges=[]
def bridge(name,start,end,width=2.4,arch=1.0,bend=0):
 g=Geo();og=Geo();sx,sy,sz=start;ex,ey,ez=end;dx=ex-sx;dy=ey-sy;L=math.hypot(dx,dy);nx=-dy/L;ny=dx/L
 def point(t,side=0,dz=0):return (sx+dx*t+nx*(math.sin(t*math.pi)*bend+side),sy+dy*t+ny*(math.sin(t*math.pi)*bend+side),sz+(ez-sz)*t+arch*math.sin(t*math.pi)+dz)
 steps=int(L/.55)
 for j in range(steps):
  for k in range(4):
   t0=(j+.025)/steps;t1=(j+.975)/steps;a=-width/2+(k+.025)*width/4;b=-width/2+(k+.975)*width/4;ids=[]
   col=tuple(v*R.uniform(.88,1.08) for v in C)
   for zz in [-.35,0]:
    for t,s in [(t0,a),(t1,a),(t1,b),(t0,b)]:ids.append(g.vert(point(t,s,zz),col))
   for f in [(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]:g.f.append(tuple(ids[i] for i in f))
 for side in [-1,1]:
  for lift,r in [(-.24,.10),(.12,.12),(.30,.065)]:curve(og,[point(j/80,side*(width/2+.06),lift) for j in range(81)],r,C,8)
  for j in range(steps):
   p=point((j+.5)/steps,side*(width/2+.06),.05);g.box(p,(.32,.32,.35),C)
 for t in [.22,.5,.78]:
  p=point(t);disk(g,p[0],p[1],.13,.65,.27,C,12);g.tube((p[0],p[1],.2),(p[0],p[1],p[2]-.4),.44,.36,D,12)
 g.object(name+' paving',stone);og.object(name+' moulding',trim);bridges.append([start,end])
bridge('Central arched bridge',(-12,3,.8),(19,5,1.7),2.9,1.25,1.6)
bridge('Foreground crescent',(-10,-10,.65),(12,-8,.65),2.2,1.0,1.3)
bridge('Entrance walkway',(-24,-23,.5),(-10,-10,.65),2.6,.2,-.6)
bridge('Moon shrine walkway',(-12,3,.8),(-5,16,.65),1.8,.45,-.9)
bridge('Shrine link',(-5,16,.65),(5,16,.65),1.5,.3,-1)
bridge('Terrace ascent',(19,5,1.7),(18,19,2.95),3,.2,0)
bridge('Rear garden way',(18,19,2.95),(7,36,1.85),2,.6,1)
# Islands and surrounding forest floor as sculpted, irregular radial terrain.
islands=[(-16,4,7,5,1.9),(-12,24,8,8,2.5),(21,13,8,13,3.5),(0,-15,4.2,3.5,.8),(2,28,6,6,1.5),(-24,-16,6,9,.9)]
terrain=Geo()
def island(x,y,rx,ry,h):
 N=64;M=14;base=len(terrain.v)
 for j in range(M+1):
  t=j/M
  for k in range(N):
   a=k*math.tau/N;ir=1+.06*math.sin(a*5)+.04*math.sin(a*9+2);xx=x+t*rx*math.cos(a)*ir;yy=y+t*ry*math.sin(a)*ir
   zz=-.35+h*(1-t*t)+noise_vector(Vector((xx*.4,yy*.4,6))).z*.25*(1-t)
   c=R.choice([(.065,.078,.028),(.10,.12,.04),(.12,.13,.047),(.06,.064,.025)])
   terrain.vert((xx,yy,zz),c)
 for j in range(M):
  for k in range(N):
   a=base+j*N+k;b=base+j*N+(k+1)%N;terrain.f.append((a,a+N,b+N,b))
for a in islands:island(*a)
for x,y,rx,ry,h in [(-38,15,17,60,4),(40,20,16,60,5),(0,55,60,17,5)]:island(x,y,rx,ry,h)
terrain.object('Moss islands and forest banks',ground)
def landheight(x,y):
 best=-.4
 for cx,cy,rx,ry,h in islands+[(-38,15,17,60,4),(40,20,16,60,5),(0,55,60,17,5)]:
  d=((x-cx)/rx)**2+((y-cy)/ry)**2
  if d<1:best=max(best,-.35+h*(1-d))
 return best
# Botanical meshes: branches, tapering trunks, roots and thousands of individual leaves.
variants=[]
for v in range(6):
 trunk=Geo();leaves=Geo();H=R.uniform(11,15)
 palette=[(.105,.135,.034),(.17,.19,.055),(.21,.21,.062),(.08,.105,.027),(.14,.16,.042)] if v<4 else [(.24,.048,.074),(.32,.065,.095),(.16,.026,.046),(.37,.10,.12)]
 def branch(p,d,length,radius,depth):
  p=Vector(p);d=Vector(d).normalized();end=p+(d+Vector((R.uniform(-.12,.12),R.uniform(-.12,.12),.13))).normalized()*length;prev=p
  for j in range(1,5):
   t=j/4;cur=p.lerp(end,t)+Vector((math.sin(t*math.pi)*length*.06,0,0));trunk.tube(prev,cur,radius*(1-(j-1)/4*.55),radius*(1-t*.55),(.16,.10,.051),10 if depth>1 else 5);prev=cur
  if depth:
   for k in range(4 if depth==3 else 3):
    a=k*2.399+R.random();dd=d*.45+Vector((math.cos(a)*.9,math.sin(a)*.9,R.uniform(.1,.7)))
    branch(end,dd,length*R.uniform(.56,.73),radius*.48,depth-1)
  if depth<=1:
   for k in range(90 if depth==0 else 35):
    pos=p.lerp(end,R.uniform(.35,1.15))+Vector((R.gauss(0,.57),R.gauss(0,.57),R.gauss(0,.38)))
    leaves.leaf(pos,R.uniform(.13,.28),R.choice(palette))
 branch((0,0,0),(0,0,1),H*.36,.64,3)
 for k in range(5):
  a=k*2.399;branch((0,0,H*.26),(.8*math.cos(a),.8*math.sin(a),.6),H*.3,.22,2)
 for k in range(9):
  a=k*2.399;curve(trunk,[(0,0,1.4),(.5*math.cos(a),.5*math.sin(a),.3),(2*math.cos(a),2*math.sin(a),0)],.18,(.14,.09,.043),8)
 ob=trunk.object('Tree trunk template '+str(v),bark);lf=leaves.object('Tree leaves template '+str(v),foliage)
 for p in ob.data.polygons:p.use_smooth=True
 variants.append((ob,lf))
positions=[(-16,4,1.55,4),(-14,25,1.65,0),(26,19,1.6,1),(-29,-7,1.8,2),(0,29,1.3,3),(28,-6,1.5,0),(-5,-16,.45,4)]
for i in range(52):
 if i<24:x=R.uniform(-39,39);y=R.uniform(41,64)
 else:x=R.choice([-1,1])*R.uniform(29,44);y=R.uniform(-18,51)
 positions.append((x,y,R.uniform(.9,1.6),i%6))
for i,(x,y,s,v) in enumerate(positions):
 a=R.random()*math.tau
 for j,source in enumerate(variants[v]):
  ob=bpy.data.objects.new(('Tree trunk ' if j==0 else 'Tree leaves ')+str(i),source.data);scene.collection.objects.link(ob);ob.location=(x,y,max(-.1,landheight(x,y)));ob.scale=(s,s,s*(1.15 if v==4 else 1));ob.rotation_euler[2]=a
for pair in variants:
 for ob in pair:bpy.data.objects.remove(ob,do_unlink=True)
# Hanging wisteria curtains, shared botanical sprays.
g=Geo()
for i in range(150):
 x=R.uniform(-3,3);y=R.uniform(-1.7,1.7);length=R.uniform(.6,3.5)
 for j in range(int(length*14)):
  t=j/(length*14);p=(x+math.sin(j*.3)*.04,y+math.cos(j*.4)*.04,-t*length)
  g.leaf(p,R.uniform(.055,.10)*(1-.6*t),R.choice([(.33,.16,.36),(.45,.25,.48),(.24,.11,.29),(.51,.3,.5)]))
wist=g.object('Wisteria curtain template',flowers)
for i,(x,y,z,s) in enumerate([(-12,20,13,1.4),(20,24,14,1.5),(27,10,13,1.7),(-24,2,12,1.3),(-8,34,13,1.3),(11,38,15,1.3),(25,-4,16,1.2)]):
 ob=bpy.data.objects.new('Wisteria hanging '+str(i),wist.data);scene.collection.objects.link(ob);ob.location=(x,y,z);ob.scale=(s,s,s)
bpy.data.objects.remove(wist,do_unlink=True)
# Rocks, ferns, and burgundy flowering ground cover at the shoreline.
rock_sources=[]
for i in range(4):
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=1);ob=bpy.context.object;ob.name='WC rock template';ob.data.materials.append(ground)
 col=ob.data.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='POINT')
 for ve,co in zip(ob.data.vertices,col.data):
  ve.co*=R.uniform(.84,1.12);co.color=(*R.choice([(.12,.14,.067),(.16,.16,.10),(.08,.1,.036)]),1)
 rock_sources.append(ob)
patches=[]
for i in range(4):
 g=Geo()
 for k in range(85):
  x,y=R.uniform(-.8,.8),R.uniform(-.8,.8);h=R.uniform(.15,.65)
  g.tube((x,y,0),(x,y,h),.007,.003,(.065,.10,.024),3)
  for j in range(4):g.leaf((x,y,h*(.2+j*.19)),.14,R.choice([(.13,.17,.04),(.07,.12,.028),(.21,.06,.09)]))
  if k%3==0:
   for j in range(5):g.leaf((x,y,h),.07,R.choice([(.43,.11,.25),(.32,.09,.28),(.53,.2,.34)]),j*math.tau/5)
 patches.append(g.object('Ground bloom template',flowers))
for i in range(480):
 cx,cy,rx,ry,h=R.choice(islands);a=R.random()*math.tau;t=R.uniform(.55,1.0);x=cx+rx*t*math.cos(a);y=cy+ry*t*math.sin(a);z=landheight(x,y)
 source=rock_sources[i%4] if i<170 else patches[i%4];ob=bpy.data.objects.new('Shore rock' if i<170 else 'Flower bed',source.data);scene.collection.objects.link(ob)
 ob.location=(x,y,z);s=R.uniform(.35,1.1);ob.scale=(s,s,s*.7) if i<170 else (s,s,s);ob.rotation_euler[2]=R.random()*math.tau
for ob in rock_sources+patches:bpy.data.objects.remove(ob,do_unlink=True)
# Bronze warm lanterns along circulation.
lanterns=[];g=Geo();lg=Geo()
for x,y,z in [(-12,2,1),(-8,5,1.6),(0,6,2.15),(9,6,2.3),(18,5,1.7),(-7,-10,1),(-1,-8,1.6),(7,-8,1.4),(-6,13,.7),(6,18,.7),(15,18,3),(21,18,3),(-20,-17,.5),(11,31,2.7)]:
 g.box((x,y,z+.08),(.4,.4,.16),D);g.tube((x,y,z+.15),(x,y,z+1.25),.055,.038,D,8)
 for zz in [1.25,1.70]:g.box((x,y,z+zz),(.32,.32,.075),D)
 for a in [-1,1]:
  for b in [-1,1]:g.tube((x+a*.13,y+b*.13,z+1.27),(x+a*.13,y+b*.13,z+1.68),.012,.012,D,4)
 g.tube((x,y,z+1.74),(x,y,z+1.94),.25,0,D,4);lg.tube((x,y,z+1.29),(x,y,z+1.65),.065,.055,(1,.62,.2),8);lanterns.append([x,z+1.47,-y])
 d=bpy.data.lights.new('WC warm lantern','POINT');d.energy=35;d.color=(1,.56,.16);d.shadow_soft_size=.3;ob=bpy.data.objects.new(d.name,d);scene.collection.objects.link(ob);ob.location=(x,y,z+1.5)
g.object('Bronze lantern structures',trim);lg.object('Warm lantern flames',lampmat)
# Native Blender animated lake material, web replaces it with a planar reflection surface.
watermat=mat('water',(.12,.085,.21),.14,0,False);p=watermat.node_tree.nodes.get('Principled BSDF');p.inputs['Metallic'].default_value=.58
n=watermat.node_tree.nodes.new('ShaderNodeTexNoise');n.inputs['Scale'].default_value=3.4;n.inputs['Detail'].default_value=3
tex=watermat.node_tree.nodes.new('ShaderNodeTexCoord');mapping=watermat.node_tree.nodes.new('ShaderNodeMapping');watermat.node_tree.links.new(tex.outputs['Generated'],mapping.inputs[0]);watermat.node_tree.links.new(mapping.outputs[0],n.inputs[0]);bump=watermat.node_tree.nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.22;bump.inputs['Distance'].default_value=.14;watermat.node_tree.links.new(n.outputs['Fac'],bump.inputs['Height']);watermat.node_tree.links.new(bump.outputs[0],p.inputs['Normal'])
for f,v in [(1,0),(901,2)]:mapping.inputs['Location'].default_value[0]=v;mapping.inputs['Location'].keyframe_insert('default_value',frame=f)
bpy.ops.mesh.primitive_plane_add(size=160,location=(0,15,0));water=bpy.context.object;water.name='WC Water Surface';water.data.materials.append(watermat)
# Lighting and camera journey; animation supported directly in .blend.
d=bpy.data.lights.new('WC sunset','SUN');d.energy=3.2;d.color=(1,.73,.42);d.angle=.10;ob=bpy.data.objects.new(d.name,d);scene.collection.objects.link(ob);ob.rotation_euler=(.5,-.55,-.45)
d=bpy.data.lights.new('WC sky fill','AREA');d.energy=2400;d.color=(.6,.64,1);d.shape='DISK';d.size=35;ob=bpy.data.objects.new(d.name,d);scene.collection.objects.link(ob);ob.location=(0,10,30)
c=bpy.data.cameras.new('Watercourt journey');cam=bpy.data.objects.new(c.name,c);scene.collection.objects.link(cam);scene.camera=cam;c.lens=30;c.clip_end=300
poses=[(1,(27,-38,25),(0,10,3)),(226,(4,-17,8),(-2,10,2.4)),(451,(-1,7,5.4),(-5,16,3.5)),(676,(17,8,9),(14,20,5)),(901,(27,-38,25),(0,10,3))]
for f,pos,target in poses:
 cam.location=pos;cam.rotation_euler=(Vector(target)-Vector(pos)).to_track_quat('-Z','Y').to_euler();cam.keyframe_insert('location',frame=f);cam.keyframe_insert('rotation_euler',frame=f)
# Gentle looping sway on botanical objects in the editable Blender scene.
for ob in list(scene.objects):
 if ob.name.startswith(('Tree leaves ','Wisteria hanging')):
  orig=ob.rotation_euler.copy()
  for f,ang in [(1,0),(226,.012),(451,0),(676,-.012),(901,0)]:ob.rotation_euler.x=orig.x+ang;ob.keyframe_insert('rotation_euler',frame=f)
scene.frame_set(1)
for area in bpy.context.screen.areas:
 if area.type=='VIEW_3D':area.spaces.active.region_3d.view_perspective='CAMERA'
# Save this scene only, leaving existing files and scenes intact.
bpy.data.libraries.write(ROOT+'/outputs/watercourt/watercourt.blend',{scene},fake_user=True)
water.hide_render=True;water.hide_set(True)
bpy.ops.export_scene.gltf(filepath=ROOT+'/public/watercourt/watercourt.glb',export_format='GLB',use_active_scene=True,export_cameras=False,export_lights=False,export_animations=False,export_yup=True)
water.hide_render=False;water.hide_set(False)
with open(ROOT+'/outputs/watercourt/scene-manifest.json','w') as f:json.dump({'scene':scene.name,'objects':len(scene.objects),'lanterns':lanterns,'frames':901,'fps':30,'gazebos':6,'bridges':7,'trees':len(positions),'reference':'reference.png','original_geometry':True},f,indent=2)
print('WATERCOURT_READY',len(scene.objects))
