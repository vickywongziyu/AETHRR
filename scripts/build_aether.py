"""Aether: original floating canyon world. New scene; preserve existing scenes."""
import bpy, math, random, os, json
from mathutils import Vector
from mathutils.noise import noise_vector, noise
ROOT='/Users/ziyu/Project/Codex6 3d'
R=random.Random(71091)
# Rebuild only this task's generated scene. Preserve all unrelated live scenes.
for old in list(bpy.data.scenes):
 if old.name.startswith('AETHER ·'):
  for ob in list(old.objects):
   if len(ob.users_scene)==1:bpy.data.objects.remove(ob,do_unlink=True)
  bpy.data.scenes.remove(old)
for ma in list(bpy.data.materials):
 if ma.name.startswith('AE ') and ma.users==0:bpy.data.materials.remove(ma)
scene=bpy.data.scenes.new('AETHER · Floating archipelago')
bpy.context.window.scene=scene
scene.render.engine='CYCLES';scene.cycles.samples=32
scene.render.resolution_x=1536;scene.render.resolution_y=1024;scene.render.resolution_percentage=100
scene.render.fps=24;scene.frame_start=1;scene.frame_end=721
scene.world=bpy.data.worlds.new('Aether atmosphere');scene.world.use_nodes=True
bg=scene.world.node_tree.nodes.get('Background');bg.inputs[0].default_value=(.40,.61,.76,1);bg.inputs[1].default_value=.55
scene.view_settings.view_transform='AgX'
materials={}
def mat(name,c,rough=.9,metal=0,emit=0):
 m=bpy.data.materials.new('AE '+name);m.diffuse_color=(*c,1);m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*c,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
 v=m.node_tree.nodes.new('ShaderNodeVertexColor');v.layer_name='Color';m.node_tree.links.new(v.outputs['Color'],p.inputs['Base Color'])
 if emit:p.inputs['Emission Color'].default_value=(*c,1);p.inputs['Emission Strength'].default_value=emit
 if name in ['rock','stone','bark','moss']:
  tex=m.node_tree.nodes.new('ShaderNodeTexNoise');tex.inputs['Scale'].default_value=7 if name!='bark' else 19;tex.inputs['Detail'].default_value=4
  bump=m.node_tree.nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.38;bump.inputs['Distance'].default_value=.14
  m.node_tree.links.new(tex.outputs['Fac'],bump.inputs['Height']);m.node_tree.links.new(bump.outputs['Normal'],p.inputs['Normal'])
 materials[name]=m;return m
mat('rock',(.39,.26,.13));mat('stone',(.45,.36,.23));mat('moss',(.18,.22,.065));mat('bark',(.16,.115,.05));mat('leaves',(.16,.22,.065));mat('gold',(.46,.30,.12),.48,.55);mat('crystal',(.06,.63,.64),.16,.3,.3);mat('water',(.4,.75,.8),.24,.2,.2);mat('dark',(.025,.04,.035));mat('mountain',(.22,.32,.37))
class Geo:
 def __init__(self):self.v=[];self.f=[];self.c=[]
 def vert(self,p,c):self.v.append(tuple(p));self.c.append((*c,1));return len(self.v)-1
 def tube(self,a,b,r1,r2,c,sides=8):
  a,b=Vector(a),Vector(b);d=(b-a).normalized();u=d.cross(Vector((0,1,0)))
  if u.length<.01:u=d.cross(Vector((1,0,0)))
  u.normalize();v=d.cross(u);ids=[]
  for p,r in [(a,r1),(b,r2)]:
   ids.append([self.vert(p+r*(u*math.cos(k*math.tau/sides)+v*math.sin(k*math.tau/sides)),tuple(i*(.85+.15*math.cos(k*math.tau/sides)) for i in c)) for k in range(sides)])
  for k in range(sides):self.f.append((ids[0][k],ids[0][(k+1)%sides],ids[1][(k+1)%sides],ids[1][k]))
  self.f.extend([tuple(reversed(ids[0])),tuple(ids[1])])
 def box(self,p,s,c):
  x,y,z=p;a,b,h=s;ids=[self.vert((x+dx*a/2,y+dy*b/2,z+dz*h/2),c) for dz in [-1,1] for dy in [-1,1] for dx in [-1,1]]
  for f in [(0,2,3,1),(4,5,7,6),(0,1,5,4),(2,6,7,3),(0,4,6,2),(1,3,7,5)]:self.f.append(tuple(ids[i] for i in f))
 def object(self,name,material,parent=None):
  if not self.v:return None
  me=bpy.data.meshes.new(name);me.from_pydata(self.v,[],self.f);me.materials.append(materials[material])
  ca=me.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='POINT');ca.data.foreach_set('color',[a for c in self.c for a in c]);me.update()
  ob=bpy.data.objects.new(name,me);scene.collection.objects.link(ob)
  if parent:ob.parent=parent
  return ob
 def blob(self,p,s,c,n=12,rows=7):
  x,y,z=p;start=len(self.v)
  for j in range(rows+1):
   th=math.pi*j/rows
   for i in range(n):
    a=i*math.tau/n;rr=1+R.uniform(-.16,.16);shade=R.uniform(.74,1.16)
    self.vert((x+s[0]*math.sin(th)*math.cos(a)*rr,y+s[1]*math.sin(th)*math.sin(a)*rr,z+s[2]*math.cos(th)*rr),tuple(v*shade for v in c))
  for j in range(rows):
   for i in range(n):
    a=start+j*n+i;b=start+j*n+(i+1)%n;self.f.extend([(a,b,a+n),(b,b+n,a+n)])
def line(g,pts,r,c):
 for a,b in zip(pts,pts[1:]):g.tube(a,b,r,r,c,6)
def ring(g,x,y,z,r,w,c):
 pts=[(x+r*math.cos(i*math.tau/64),y+r*math.sin(i*math.tau/64),z) for i in range(65)];line(g,pts,w,c)
def crystal(g,x,y,z,h,r):
 angle=R.random()*math.tau;ids=[]
 for zz,rr in [(0,r*.55),(h*.35,r),(h,0)]:
  ids.append([g.vert((x+rr*math.cos(angle+k*math.tau/6),y+rr*math.sin(angle+k*math.tau/6),z+zz),(.035+(.06 if k%2 else 0),.38+.09*(k%3),.40+.09*(k%3))) for k in range(6)])
 for j in range(2):
  for k in range(6):g.f.append((ids[j][k],ids[j][(k+1)%6],ids[j+1][(k+1)%6],ids[j+1][k]))

def tree(b,l,x,y,z,s):
 lean=R.uniform(-.5,.5)*s
 b.tube((x,y,z),(x+lean,y,z+3.3*s),.23*s,.085*s,(.20,.145,.063),8)
 for j in range(6):
  a=j*2.399;bx=x+math.cos(a)*1.5*s;by=y+math.sin(a)*1.5*s;bz=z+(3.0+R.random()*.65)*s
  b.tube((x+lean*.5,y,z+1.8*s),(bx,by,bz),.1*s,.03*s,(.18,.125,.05),6)
  for k in range(4):
   px=bx+R.uniform(-.65,.65)*s;py=by+R.uniform(-.65,.65)*s;pz=bz+R.random()*.25*s
   co=R.choice([(.15,.20,.046),(.20,.25,.064),(.25,.28,.078),(.10,.16,.045)])
   l.blob((px,py,pz),(R.uniform(.6,1.05)*s,R.uniform(.6,1.05)*s,.36*s),co,8,4)

def island(name,x,y,z,r,depth,floating=False,trees=12):
 parent=bpy.data.objects.new(name,None);scene.collection.objects.link(parent)
 parent['floating']=floating
 rock=Geo();top=Geo();b=Geo();leaves=Geo();grass=Geo()
 n=80;rows=14;phase=R.random()*7
 def radius(a):return r*(1+.105*math.sin(3*a+phase)+.075*math.sin(7*a+phase)+.035*math.sin(17*a))
 # radial terrace top, low relief
 top.vert((x,y,z+.1),(.21,.235,.077))
 for j in range(1,9):
  t=j/8
  for k in range(n):
   a=k*math.tau/n;rr=radius(a)*t;zz=z+noise(Vector((x+rr*math.cos(a),y+rr*math.sin(a),3)))*.33*t
   shade=R.uniform(.8,1.15);top.vert((x+rr*math.cos(a),y+rr*math.sin(a),zz),tuple(v*shade for v in (.22,.23,.082)))
 for k in range(n):top.f.append((0,1+k,1+(k+1)%n))
 for j in range(7):
  for k in range(n):
   a=1+j*n+k;b1=1+j*n+(k+1)%n;top.f.append((a,a+n,b1+n,b1))
 # weathered cliffs, vertical folds and wide broken rims
 for j in range(rows+1):
  t=j/rows
  taper=((1-t)**.72*(1+.12*math.sin(t*14+phase))) if floating else .93+.09*math.sin(t*3)
  for k in range(n):
   a=k*math.tau/n;rr=radius(a)*taper*(1+.036*math.sin(k*3.23+j*.9))
   zz=z-depth*t+(math.sin(k*5.34)*.42+R.uniform(-.25,.25))*math.sin(math.pi*t)
   cc=(.42,.29,.15);s=.75+R.random()*.35+.15*math.sin(k*3.23)
   rock.vert((x+rr*math.cos(a),y+rr*math.sin(a),zz),tuple(v*s for v in cc))
 for j in range(rows):
  for k in range(n):
   a=j*n+k;bb=j*n+(k+1)%n;rock.f.extend([(a,bb,a+n),(bb,bb+n,a+n)])
 # long fractured pendant shards under the floating rock mass
 if floating:
  for q in range(11):
   a=q*2.399;rr=r*R.uniform(.25,.64);px=x+rr*math.cos(a);py=y+rr*math.sin(a)
   rock.tube((px*.98,py,z-depth*R.uniform(.80,1.25)),(px,py,z-depth*.28),r*.035,r*.17,(.34,.24,.13),5)
 # many cliff ribs, shards and hanging vegetation
 for k in range(38):
  a=k*math.tau/38;rr=radius(a)*.94;h=R.uniform(.22,.80)*depth
  start=(x+rr*math.cos(a),y+rr*math.sin(a),z-.5)
  end=(x+rr*(.4 if floating else .92)*math.cos(a),y+rr*(.4 if floating else .92)*math.sin(a),z-h)
  rock.tube(end,start,r*.035,r*.08,(.41,.28,.14),7)
  if k%3==0:
   for q in range(3):
    leaves.blob((start[0],start[1],z-q*.8),(.7,.5,.6),(.13,.19,.042),7,4)
 for i in range(trees):
  a=R.random()*math.tau;rr=math.sqrt(R.random())*r*.86
  tx=x+rr*math.cos(a);ty=y+rr*math.sin(a)
  # leave the front-facing central shrine clear
  if name=='Sanctuary' and (math.hypot(tx-x,ty-y)<6.8 or (ty<y and abs(tx-x)<5.8)):continue
  tree(b,leaves,tx,ty,z+.12,R.uniform(.65,1.3)*(1 if r>5 else .65))
 for i in range(int(r*r*2)):
  a=R.random()*math.tau;rr=R.random()*r*.98;tx=x+rr*math.cos(a);ty=y+rr*math.sin(a);h=R.uniform(.18,.48)
  for q in range(2):
   aa=R.random()*6.28;ids=[grass.vert((tx+math.cos(aa)*.10,ty+math.sin(aa)*.10,z+.06),(.24,.26,.07)),grass.vert((tx-math.cos(aa)*.10,ty-math.sin(aa)*.10,z+.06),(.24,.26,.07)),grass.vert((tx+.13,ty,z+h),(.38,.35,.10))];grass.f.append(tuple(ids))
 for g,label,m in [(rock,'cliffs','rock'),(top,'terrace','moss'),(b,'trees','bark'),(leaves,'canopy','leaves'),(grass,'grass','leaves')]:g.object(name+' '+label,m,parent)
 if floating:
  parent.location.z=0;parent.keyframe_insert('location',frame=1)
  parent.location.z=.6;parent.keyframe_insert('location',frame=181)
  parent.location.z=0;parent.keyframe_insert('location',frame=361)
  parent.location.z=-.6;parent.keyframe_insert('location',frame=541)
  parent.location.z=0;parent.keyframe_insert('location',frame=721)
 return parent
S=(.50,.39,.245);G=(.48,.32,.135)
def shrine(name,x,y,z,r=3.2,parent=None):
 stone=Geo();orn=Geo();dark=Geo();cr=Geo()
 for j in range(5):stone.tube((x,y,z+j*.18),(x,y,z+j*.18+.18),r+1.6-j*.22,r+1.6-j*.22,S,64)
 base=z+.9;h=r*1.18
 # ring of columns and true open archways
 for k in range(8):
  a=k*math.tau/8;cx=x+r*math.cos(a);cy=y+r*math.sin(a)
  stone.tube((cx,cy,base),(cx,cy,base+h),.29,.21,S,12)
  for zz,rad in [(base,.39),(base+.2,.33),(base+h-.2,.33),(base+h,.40)]:stone.tube((cx,cy,zz),(cx,cy,zz+.14),rad,rad,S,16)
  b=a+math.tau/8
  pts=[]
  for j in range(25):
   t=j/24;aa=a+(b-a)*t
   pts.append((x+r*math.cos(aa),y+r*math.sin(aa),base+h-.8+math.sin(math.pi*t)*.9))
  line(stone,pts,.18,S);line(orn,[(px*1,py*1,pz+.19) for px,py,pz in pts],.055,G)
 # tall ribbed pointed dome
 n=80;rows=24;start=len(stone.v)
 for j in range(rows+1):
  t=j/rows;rr=r*1.10*(math.cos(t*math.pi/2)**.72);zz=base+h+t*r*1.4
  for k in range(n):
   a=k*math.tau/n;rr2=rr*(1+.035*math.cos(a*8));s=.80+.1*math.cos(a*8)+R.random()*.1
   stone.vert((x+rr2*math.cos(a),y+rr2*math.sin(a),zz),tuple(v*s for v in S))
 for j in range(rows):
  for k in range(n):
   a=start+j*n+k;b=start+j*n+(k+1)%n;stone.f.append((a,b,b+n,a+n))
 for k in range(8):
  a=k*math.tau/8;pts=[]
  for j in range(32):
   t=j/31;rr=r*1.15*(math.cos(t*math.pi/2)**.72);pts.append((x+rr*math.cos(a),y+rr*math.sin(a),base+h+t*r*1.4+.05))
  line(orn,pts,.10,G)
  crystal(cr,x+r*1.07*math.cos(a),y+r*1.07*math.sin(a),base+h-.1,r*.70,.15*r)
  # leaf-shaped gold tracery loop against dome
  pts=[]
  for j in range(37):
   t=j/36*math.tau;tt=.17+.27*(1-math.cos(t));aa=a+.21*math.sin(t);rr=r*1.145*(math.cos(tt*math.pi/2)**.72)
   pts.append((x+rr*math.cos(aa),y+rr*math.sin(aa),base+h+tt*r*1.4+.04))
  line(orn,pts,.04,G)
 ring(stone,x,y,base+h,r*1.13,.22,S);ring(orn,x,y,base+h+.22,r*1.15,.055,G)
 crystal(cr,x,y,base+h+r*1.4-.1,r*.94,r*.19)
 crystal(cr,x,y,base+.2,r*.85,r*.24)
 for k in range(10):
  a=k*math.tau/10;cx=x+(r+1.3)*math.cos(a);cy=y+(r+1.3)*math.sin(a)
  stone.tube((cx,cy,z+.65),(cx,cy,z+1.35),.20,.15,S,10);crystal(cr,cx,cy,z+1.35,.48,.14)
 for g,label,m in [(stone,'masonry','stone'),(orn,'tracery','gold'),(cr,'crystals','crystal')]:g.object(name+' '+label,m,parent)
 # stone pavement radial seams and slabs
 slabs=Geo()
 for k in range(40):
  a=k*math.tau/40;line(slabs,[(x+(r+.1)*math.cos(a),y+(r+.1)*math.sin(a),z+.94),(x+(r+1.3)*math.cos(a),y+(r+1.3)*math.sin(a),z+.94)],.018,(.19,.15,.1))
 slabs.object(name+' paving','dark',parent)

def bridge(name,a,b,width=2.0,sag=2.5):
 a,b=Vector(a),Vector(b);d=b-a;side=Vector((-d.y,d.x,0)).normalized();g=Geo();rope=Geo();post=Geo();length=d.length;n=int(length/.44)
 def at(t):return a+d*t-Vector((0,0,sag*math.sin(math.pi*t)))
 for j in range(n+1):
  p=at(j/n)
  g.tube(p-side*width/2,p+side*width/2,.105,.105,(.23,.16,.08),4)
 for s in [-1,1]:
  for h in [.6,1.5]:line(rope,[at(j/80)+side*width*.55*s+Vector((0,0,h)) for j in range(81)],.047,(.20,.155,.087))
  for j in range(0,n+1,3):
   p=at(j/n)+side*width*.55*s;rope.tube(p,p+Vector((0,0,1.5)),.026,.026,(.29,.22,.11),5)
  for p in [a,b]:
   p=p+side*width*.65*s;post.tube(p-Vector((0,0,.2)),p+Vector((0,0,2)),.23,.15,S,12)
   post.blob(p+Vector((0,0,2)),(.28,.28,.3),S,10,5)
 for geo,m in [(g,'bark'),(rope,'bark'),(post,'stone')]:geo.object(name+' '+m,m)

# Foreground terrace and layered canyon islands.
main=island('Sanctuary',14,-7,8,11,39,False,23);shrine('Crystal sanctuary',14,-10,8,3.7)
island('Arrival',-17,-18,7,10,40,False,17)
island('Bridge garden',-12,12,10,10,42,False,20)
island('East canyon',36,13,4,12,45,False,24)
island('Old terrace',6,28,5,12,48,False,26)
island('West canyon',-36,32,2,15,50,False,25)
bridge('Sanctuary suspension',(-9,-19,7.2),(6,-11,8.2),2.1,2.6)
bridge('Long suspended crossing',(-15,-9,7.2),(-13,3,10.2),1.7,2.1)
bridge('Eastern crossing',(23,-3,8.2),(29,7,4.2),1.6,1.5)
float_specs=[('Sky garden',-22,26,32,7,17,16),('Falls crown',17,39,48,8,19,15),('Observatory',0,62,47,6,16,8),('Drifting rock',-3,37,29,3.8,13,5),('Far crown',35,71,57,5,17,6),('West drift',-43,53,44,4.2,13,6),('High drift',-18,85,67,4,14,5)]
parents={}
for name,x,y,z,r,d,t in float_specs:
 p=island(name,x,y,z,r,d,True,t);parents[name]=p
 if name in ['Sky garden','Observatory']:shrine(name+' shrine',x,y,z,1.5,p)
for i in range(13):
 x=R.uniform(-70,65);y=R.uniform(55,120);z=R.uniform(15,56)
 island('Small drifting isle %02d'%i,x,y,z,R.uniform(1.1,2.7),R.uniform(5,10),True,2)
# Native sheet waterfalls, animated in the web runtime by material.
falls=[(18,32,47,68,3.0),(21,34,47,58,.65),(14,-16,8,36,2.6),(-19,20,32,48,1.1),(6,18,5,30,2)]
for index,(x,y,z,h,w) in enumerate(falls):
 g=Geo();rows=64;cols=12
 for j in range(rows+1):
  t=j/rows
  for k in range(cols+1):
   u=k/cols;xx=x+(u-.5)*w*(1+.28*t)+.12*math.sin(t*8+u*5);yy=y-.45*t+.12*math.sin(u*19+t*9)
   g.vert((xx,yy,z-t*h),(.40+.13*math.sin(k*2)**2,.70+.14*math.sin(k*2)**2,.75+.13*math.sin(k*2)**2))
 for j in range(rows):
  for k in range(cols):
   a=j*(cols+1)+k;g.f.append((a,a+1,a+cols+2,a+cols+1))
 ob=g.object('Waterfall_%d'%index,'water');uv=ob.data.uv_layers.new(name='UVMap')
 for p in ob.data.polygons:
  for li in p.loop_indices:
   vi=ob.data.loops[li].vertex_index;uv.data[li].uv=(vi%(cols+1)/cols,1-(vi//(cols+1))/rows)
 # native sheet scale motion and cycles
 for frame,val in [(1,1),(181,1.02),(361,1),(541,.98),(721,1)]:ob.scale.x=val;ob.keyframe_insert(data_path='scale',frame=frame)
# distant mountain wall around rear horizon
mountains=Geo()
for k in range(39):
 a=-.3+k/38*3.8;x=math.cos(a)*145;y=78+math.sin(a)*100;h=R.uniform(27,67);r=R.uniform(13,26)
 n=31;start=len(mountains.v)
 for j in range(17):
  t=j/16
  for i in range(n):
   angle=i*math.tau/n;rr=r*1.6*(1-t)**1.20*(1+.30*math.sin(i*5.41+k)+R.uniform(-.20,.20));zz=-24+h*t+R.uniform(-3.8,3.8)*math.sin(t*math.pi)
   mountains.vert((x+rr*math.cos(angle)+t*12+math.sin(t*12+k)*2,y+rr*math.sin(angle)+math.sin(t*8+k)*4,zz),(.24+.10*t,.31+.10*t,.33+.12*t))
 for j in range(16):
  for i in range(n):
   a=start+j*n+i;b=start+j*n+(i+1)%n;mountains.f.extend([(a,b,a+n),(b,b+n,a+n)])
mountainob=mountains.object('Distant mountain range','mountain')
for poly in mountainob.data.polygons:poly.use_smooth=True
# Animated orbiting birds: silhouette wings have native transforms.
birds=Geo()
for i in range(9):
 p=(R.uniform(-14,13),R.uniform(10,30),R.uniform(25,29));x,y,z=p
 line(birds,[(x-.8,y,z+.1),(x-.28,y,z+.26),(x,y,z),(x+.28,y,z+.26),(x+.8,y,z+.1)],.035,(.09,.13,.13))
birdob=birds.object('Wind birds','dark')
for frame,x in [(1,-20),(361,15),(721,-20)]:birdob.location.x=x;birdob.keyframe_insert('location',frame=frame)
# Lights and 30 second camera journey retained in native .blend.
ld=bpy.data.lights.new('Warm western sun','SUN');ld.energy=3.2;ld.angle=.12
sun=bpy.data.objects.new('Warm western sun',ld);scene.collection.objects.link(sun);sun.rotation_euler=(math.radians(28),math.radians(-28),math.radians(-35))
ld=bpy.data.lights.new('Sky fill','AREA');ld.energy=2200;ld.shape='DISK';ld.size=80
fill=bpy.data.objects.new('Sky fill',ld);scene.collection.objects.link(fill);fill.location=(0,-10,65)
camd=bpy.data.cameras.new('Aether journey camera');cam=bpy.data.objects.new('Aether journey camera',camd);scene.collection.objects.link(cam);scene.camera=cam;camd.lens=32;camd.clip_end=700
views=[((18,-36,22),(-10,25,18)),((28,-32,19),(14,-9,14)),((-5,-32,15),(2,-10,10)),((-40,3,41),(-22,26,34)),((40,7,50),(17,36,40)),((17,36,60),(0,62,48)),((18,-36,22),(-10,25,18))]
for i,(pos,look) in enumerate(views):
 cam.location=pos;cam.rotation_euler=(Vector(look)-cam.location).to_track_quat('-Z','Y').to_euler();cam.keyframe_insert('location',frame=1+i*120);cam.keyframe_insert('rotation_euler',frame=1+i*120)
scene.frame_set(1)
# Isolate new scene in saved .blend while leaving user's other live scenes intact.
os.makedirs(ROOT+'/outputs/aether',exist_ok=True);os.makedirs(ROOT+'/public/aether',exist_ok=True)
bpy.data.libraries.write(ROOT+'/outputs/aether/aether-archipelago.blend',{scene},fake_user=True,compress=True)
bpy.ops.export_scene.gltf(filepath=ROOT+'/public/aether/aether.glb',export_format='GLB',use_active_scene=True,export_cameras=False,export_lights=False,export_extras=True,export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6)
report={'scene':scene.name,'objects':len(scene.objects),'meshes':sum(o.type=='MESH' for o in scene.objects),'vertices':sum(len(o.data.vertices) for o in scene.objects if o.type=='MESH'),'faces':sum(len(o.data.polygons) for o in scene.objects if o.type=='MESH'),'floating_islands':20,'waterfalls':len(falls),'bridges':3,'frames':721,'fps':24}
open(ROOT+'/outputs/aether/model-report.json','w').write(json.dumps(report,indent=2));print('AETHER_COMPLETE',json.dumps(report))
