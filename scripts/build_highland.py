"""Reference-colored cliff village. Creates only its own scene; preserves live work."""
import bpy,math,random,json,os
from mathutils import Vector
from mathutils.noise import noise
ROOT='/Users/ziyu/Project/Codex6 3d';R=random.Random(190961)
previous=bpy.context.window.scene
for old in list(bpy.data.scenes):
 if old.name.startswith('HIGHLAND ·'):
  if old==previous:previous=None
  for ob in list(old.objects):
   if len(ob.users_scene)==1:bpy.data.objects.remove(ob,do_unlink=True)
  bpy.data.scenes.remove(old)
scene=bpy.data.scenes.new('HIGHLAND · Horncrest settlement');bpy.context.window.scene=scene
scene.render.engine='CYCLES';scene.cycles.samples=32;scene.render.resolution_x=1440;scene.render.resolution_y=960;scene.render.resolution_percentage=100;scene.render.fps=24;scene.frame_end=720
scene.world=bpy.data.worlds.new('Horncrest daylight');scene.world.use_nodes=True
scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast'
materials={}
palette={'rock':(.49,.46,.39),'ground':(.26,.28,.16),'wood':(.33,.25,.16),'roof':(.35,.46,.48),'ivory':(.78,.73,.59),'red':(.47,.20,.12),'teal':(.24,.40,.39),'pine':(.16,.22,.15),'dark':(.10,.105,.08),'rope':(.43,.36,.23),'snow':(.72,.77,.77),'mountain':(.38,.46,.47)}
def linear(v):return v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4
for k,c in palette.items():
 m=bpy.data.materials.new('HC '+k);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Roughness'].default_value=.9
 v=m.node_tree.nodes.new('ShaderNodeVertexColor');v.layer_name='Color';m.node_tree.links.new(v.outputs['Color'],p.inputs['Base Color']);m.diffuse_color=(*[linear(i) for i in c],1);materials[k]=m
class Geo:
 def __init__(self):self.v=[];self.f=[];self.c=[]
 def vert(self,p,c):self.v.append(tuple(p));self.c.append((*[linear(max(0,min(1,i))) for i in c],1));return len(self.v)-1
 def face(self,points,c):self.f.append(tuple(self.vert(p,c) for p in points))
 def tube(self,a,b,r1,r2,c,n=8):
  a,b=Vector(a),Vector(b);d=(b-a).normalized();u=d.cross(Vector((0,1,0)))
  if u.length<.01:u=d.cross(Vector((1,0,0)))
  u.normalize();v=d.cross(u);ids=[]
  for p,r in [(a,r1),(b,r2)]:ids.append([self.vert(p+r*(u*math.cos(k*math.tau/n)+v*math.sin(k*math.tau/n)),c) for k in range(n)])
  for k in range(n):self.f.append((ids[0][k],ids[0][(k+1)%n],ids[1][(k+1)%n],ids[1][k]))
  self.f.extend([tuple(reversed(ids[0])),tuple(ids[1])])
 def box(self,p,s,c):
  x,y,z=p;w,d,h=s;v=[(x+a*w/2,y+b*d/2,z+e*h/2) for e in [-1,1] for b in [-1,1] for a in [-1,1]]
  for f in [(0,2,3,1),(4,5,7,6),(0,1,5,4),(2,6,7,3),(0,4,6,2),(1,3,7,5)]:self.face([v[i] for i in f],c)
 def obj(self,name,k):
  if not self.v:return
  me=bpy.data.meshes.new(name);me.from_pydata(self.v,[],self.f);me.materials.append(materials[k]);ca=me.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='POINT');ca.data.foreach_set('color',[a for c in self.c for a in c]);me.update();o=bpy.data.objects.new(name,me);scene.collection.objects.link(o);return o
G={k:Geo() for k in palette}
def co(k,s=1):return tuple(v*s for v in palette[k])
def line(k,pts,r):
 for a,b in zip(pts,pts[1:]):G[k].tube(a,b,r,r,co(k),6)
def ring(k,x,y,z,r,w):line(k,[(x+r*math.cos(i*math.tau/64),y+r*math.sin(i*math.tau/64),z) for i in range(65)],w)
def cliff(x,y,z,r,depth,name):
 rock,top=G['rock'],G['ground'];n=100;rows=22;start=len(rock.v);phase=R.random()*6
 def rad(a):return r*(1+.08*math.sin(a*5+phase)+.05*math.sin(a*13)+.035*math.sin(a*29+phase))
 for j in range(rows+1):
  t=j/rows
  for k in range(n):
   a=k*math.tau/n;rr=rad(a)*(1+.14*t+.07*math.sin(t*9+a*6))+.2*math.sin(t*31+k*1.6)
   zz=z-t*depth+noise(Vector((k*.19,t*5,phase)))*.48
   shade=.74+R.random()*.30+.14*math.sin(a*17)**2
   rock.vert((x+rr*math.cos(a),y+rr*math.sin(a),zz),co('rock',shade))
 for j in range(rows):
  for k in range(n):
   a=start+j*n+k;b=start+j*n+(k+1)%n;rock.f.extend([(a,b,b+n),(a,b+n,a+n)])
 c=top.vert((x,y,z+.05),co('ground'));last=[]
 for k in range(n):
  a=k*math.tau/n;rr=rad(a);last.append(top.vert((x+rr*math.cos(a),y+rr*math.sin(a),z),co('ground',R.uniform(.78,1.2))))
 for k in range(n):top.f.append((c,last[k],last[(k+1)%n]))
 # Broken stone ledges break the broad cliff into natural strata.
 for i in range(35):
  a=R.random()*math.tau;rr=rad(a);h=z-R.random()*depth*.75
  G['rock'].box((x+rr*math.cos(a),y+rr*math.sin(a),h),(R.uniform(1,3),R.uniform(1,3),R.uniform(.25,.7)),co('rock',R.uniform(.72,1.12)))
cliff(0,5,11,32,48,'central');cliff(-34,17,18,17,56,'west');cliff(35,22,21,18,60,'east');cliff(-23,-25,8,16,46,'front left');cliff(25,-23,9,17,46,'front right');cliff(1,27,17,16,54,'totem')
# A terrestrial massif below the mesas, not another set of hanging islands.
cliff(0,10,-24,69,28,'bedrock')
# Query actual generated terrain triangles rather than relying on nominal plateau radii.
from mathutils.bvhtree import BVHTree
terrain_v=G['rock'].v+G['ground'].v
terrain_f=G['rock'].f+[tuple(i+len(G['rock'].v) for i in f) for f in G['ground'].f]
terrain_bvh=BVHTree.FromPolygons([Vector(v) for v in terrain_v],terrain_f)
buildings=[]
reserved=[(-6,19,6,31)] # Tower and spiral staircase.
def terrain_height(x,y):
 hit=terrain_bvh.ray_cast(Vector((x,y,100)),Vector((0,0,-1)),200)[0]
 return hit.z if hit else -100

def place(kind,x,y,z,w,d,porch=0):
 # Test complete roof and porch footprint against occupied buildings and actual terrain.
 # Closest valid terrace wins; z only adjusts by the small foundation clearance.
 hx=w/2+.9;hy=d/2+.7;candidates=[]
 for dx in range(-24,25,2):
  for dy in range(-24,25,2):candidates.append((dx*dx+dy*dy,dx,dy))
 for _,dx,dy in sorted(candidates):
  xx,yy=x+dx,y+dy;rect=(xx-hx,yy-hy-porch,xx+hx,yy+hy)
  if any(not(rect[2]+.7<a or c+.7<rect[0] or rect[3]+.7<b or e+.7<rect[1]) for a,b,c,e in reserved):continue
  values=[terrain_height(xx+fx*(hx-.15),yy+fy*(hy-.15)) for fx in [-1,-.5,0,.5,1] for fy in [-1,-.5,0,.5,1]]
  if max(values)-min(values)>.22 or abs(max(values)-z)>.65:continue
  if porch and terrain_height(xx,yy-hy-porch)<z-1.5:continue
  floor=max(values)+.32
  reserved.append(rect)
  record={'kind':kind,'x':xx,'y':yy,'z':floor,'w':w,'d':d,'rect':rect,'terrain_max':max(values),'terrain_min':min(values)}
  buildings.append(record);return xx,yy,floor,record
 raise RuntimeError('No collision-free building site: '+str((kind,x,y,z,w,d)))

def solid(g,points,offset,c):
 # Closed prism: front/back and every edge get real geometry and thickness.
 v=[Vector(p) for p in points];off=Vector(offset)
 g.face(list(reversed(v)),c);g.face([p+off for p in v],c)
 for i in range(len(v)):g.face([v[i],v[(i+1)%len(v)],v[(i+1)%len(v)]+off,v[i]+off],c)

def house(x,y,z,w=7,d=10,h=5):
 x,y,z,record=place('house',x,y,z,w+1,d+1,4.5)
 record.update({'w':w,'d':d,'h':h,'door_height':2.7,'door_width':2.15})
 wood,roof=G['wood'],G['roof'];ridge=z+h+4;wall=z+h;door=2.15;door_top=z+2.7
 # Solid floor and continuous wall cores prevent grass or scenery showing through logs.
 wood.box((x,y,z-.13),(w+.45,d+.45,.30),co('wood',.88))
 for side in [-1,1]:wood.box((x+side*(w/2-.07),y,z+h/2),(.40,d+.30,h),co('wood',.83))
 wood.box((x,y+d/2-.07,z+h/2),(w,.40,h),co('wood',.82))
 for side in [-1,1]:wood.box((x+side*(w+door)/4,y-d/2+.05,z+h/2),((w-door)/2,.40,h),co('wood',.86))
 wood.box((x,y-d/2+.05,(wall+door_top)/2),(door,.40,wall-door_top),co('wood',.86))
 for j in range(12):
  zz=z+.22+j*h/12
  for side in [-1,1]:wood.tube((x+side*w/2,y-d/2,zz),(x+side*w/2,y+d/2,zz),.23,.23,co('wood',R.uniform(.85,1.14)),8)
  wood.tube((x-w/2,y+d/2,zz),(x+w/2,y+d/2,zz),.23,.23,co('wood'),8)
  if zz>door_top+.12:wood.tube((x-w/2,y-d/2-.08,zz),(x+w/2,y-d/2-.08,zz),.23,.23,co('wood'),8)
  else:
   for side in [-1,1]:wood.tube((x+side*door/2,y-d/2-.08,zz),(x+side*w/2,y-d/2-.08,zz),.23,.23,co('wood'),8)
 # Door jambs, lintel and threshold bound a human-sized opening.
 for side in [-1,1]:wood.box((x+side*(door/2+.08),y-d/2-.12,z+1.35),(.20,.48,2.7),co('wood',1.15))
 wood.box((x,y-d/2-.12,door_top+.10),(door+.40,.48,.24),co('wood',1.12))
 wood.box((x,y-d/2-.12,z+.08),(door+.30,.60,.15),co('wood',1.05))
 # A partly open door has thickness; the cabin beyond has actual walls and flooring.
 start=len(wood.v);hinge=Vector((x-door/2,y-d/2-.35,0))
 wood.box((x-.035,y-d/2-.35,z+1.30),(door-.07,.13,2.53),co('wood',.77))
 for i in range(start,len(wood.v)):
  p=Vector(wood.v[i])-hinge;a=math.radians(-68);wood.v[i]=tuple(hinge+Vector((p.x*math.cos(a)-p.y*math.sin(a),p.x*math.sin(a)+p.y*math.cos(a),p.z)))
 # Filled front and rear gables. Their top follows the exact roof slope.
 edge_z=ridge-4.5*(w/2)/(w/2+1.1)-.05
 for yy in [y-d/2-.02,y+d/2-.30]:
  solid(wood,[(x-w/2,yy,wall-.07),(x+w/2,yy,wall-.07),(x+w/2,yy,edge_z),(x,yy,ridge-.07),(x-w/2,yy,edge_z)],(0,.32,0),co('wood',.93))
 # Roof slabs close the interior, independent of decorative shingles.
 for side in [-1,1]:
  solid(wood,[(x,y-d/2-1,ridge-.07),(x+side*(w/2+1.1),y-d/2-1,ridge-4.57),(x+side*(w/2+1.1),y+d/2+1,ridge-4.57),(x,y+d/2+1,ridge-.07)],(0,0,-.24),co('wood',.8))
  for row in range(9):
   u0=row/9;u1=(row+1.12)/9;xa=x+side*(w/2+1.1)*u0;xb=x+side*(w/2+1.1)*u1;za=ridge-4.5*u0;zb=ridge-4.5*u1
   for j in range(14):
    ya=y-d/2-1+j*(d+2)/14+(.15 if row%2 else 0);yb=ya+(d+2)/14+.04;c=co('roof',R.uniform(.90,1.10))
    roof.face([(xa,ya,za+.08),(xb,ya,zb+.08),(xb,yb,zb+.08),(xa,yb,za+.08)],c)
    roof.face([(xb,ya,zb+.08),(xb,ya,zb-.04),(xb,yb,zb-.04),(xb,yb,zb+.08)],co('roof',.66))
 for yy in [y-d/2-1.1,y+d/2+1.1]:
  line('wood',[(x-w/2-1.2,yy,wall-.5),(x,yy,ridge+.2),(x+w/2+1.2,yy,wall-.5)],.22)
  wood.tube((x-w/2,yy,wall),(x+w/2,yy,wall),.20,.20,co('wood'),8)
 wood.tube((x,y-d/2-1,ridge+.17),(x,y+d/2+1,ridge+.17),.18,.18,co('wood'),10)
 # Interior bench and chest add depth without concealing any missing surfaces.
 wood.box((x-w*.28,y+d*.22,z+.65),(.85,d*.40,.16),co('wood',.95))
 for yy in [y+d*.04,y+d*.38]:wood.box((x-w*.28,yy,z+.3),(.14,.14,.6),co('wood'))
 wood.box((x+w*.25,y+d*.25,z+.5),(1.1,1.1,.95),co('wood',.72))
 # Foundation skirt and supported entrance steps.
 G['rock'].box((x,y,z-.32),(w+.55,d+.55,.34),co('rock',.84))
 for i in range(13):wood.box((x,y-d/2-1.7-i*.38,z+.12-i*.045),(w*.72,.36,.18),co('wood',R.uniform(.8,1.2)))
 for xx in [x-w*.32,x+w*.32]:
  wood.tube((xx,y-d/2-1.6,z-.4),(xx,y-d/2-1.6,wall-.2),.25,.19,co('wood'),10)
  wood.tube((xx,y-d/2-5.9,z-.6),(xx,y-d/2-5.9,z+1.1),.16,.12,co('wood'),8)
  line('rope',[(xx,y-d/2-1.8,z+1.5),(xx,y-d/2-5.9,z+.9)],.055)
 G['ivory'].face([(x-.36,y-d/2-.24,wall-.15),(x,y-d/2-.25,wall+.35),(x+.36,y-d/2-.24,wall-.15),(x,y-d/2-.26,wall-.5)],co('ivory'))
for p in [(-21,-28,8,8,12,5),(24,-28,9,8.8,13,5.4),(-15,-2,11,6,9,4),(15,-3,11,6.5,10,4.5),(34,12,21,7,10,4.5),(-36,10,18,6,8,4)]:house(*p)

def tent(x,y,z,r,h):
 x,y,z,record=place('tent',x,y,z,r*2,r*2)
 record.update({'r':r,'h':h})
 n=48;g=G['ivory'];outer=[];inner=[];door_h=min(2.7,h*.39)
 levels=sorted(set([0,door_h,h*.60,h]))
 def radius(zz):
  t=zz/h
  return r*(1-t*.2857) if t<.42 else r*.88*(1-(t-.42)/.58)+.18*((t-.42)/.58)
 for zz in levels:
  outer.append([g.vert((x+radius(zz)*math.cos(k*math.tau/n),y+radius(zz)*math.sin(k*math.tau/n),z+zz),co('ivory',.83+.18*math.sin(k*math.tau/n+1))) for k in range(n)])
  inner.append([g.vert((x+max(.07,radius(zz)-.10)*math.cos(k*math.tau/n),y+max(.07,radius(zz)-.10)*math.sin(k*math.tau/n),z+zz),co('ivory',.65)) for k in range(n)])
 for j in range(len(levels)-1):
  for k in range(n):
   kk=(k+1)%n
   if j==0 and k in [34,35,36,37]:continue
   g.f.append((outer[j][k],outer[j][kk],outer[j+1][kk],outer[j+1][k]))
   g.f.append((inner[j][kk],inner[j][k],inner[j+1][k],inner[j+1][kk]))
 for j in [0,len(levels)-1]:
  for k in range(n):g.f.append((outer[j][k],inner[j][k],inner[j][(k+1)%n],outer[j][(k+1)%n]))
 for k in [34,38]:g.f.append((outer[0][k],inner[0][k],inner[1][k],outer[1][k]))
 for k in [34,35,36,37]:g.f.append((outer[1][k],inner[1][k],inner[1][k+1],outer[1][k+1]))
 g.f.append(tuple(outer[-1]));g.f.append(tuple(reversed(inner[-1])))
 G['rock'].tube((x,y,z-.45),(x,y,z-.20),r+.05,r+.02,co('rock',.85),48)
 G['wood'].tube((x,y,z-.22),(x,y,z+.015),r+.02,r+.02,co('wood',.76),48)
 # Interior sleeping platform remains inside the lined shell.
 G['wood'].box((x-r*.32,y+r*.15,z+.22),(r*.6,r*.8,.35),co('wood',.82))
 for k in range(8):
  if k==6:continue # Keep the front entrance clear of a central support pole.
  a=k*math.tau/8;line('wood',[(x+(r-.16)*math.cos(a),y+(r-.16)*math.sin(a),z),(x-.3*math.cos(a),y-.3*math.sin(a),z+h+1.7)],.07)
 for hfrac in [.14,.55]:
  zz=h*hfrac
  # Leave the doorway clear instead of stretching a stripe through its opening.
  for k in range(n):
   if zz<door_h and k in [34,35,36,37]:continue
   a=k*math.tau/n;b=(k+1)*math.tau/n;rr=radius(zz)+.035
   line('red',[(x+rr*math.cos(a),y+rr*math.sin(a),z+zz),(x+rr*math.cos(b),y+rr*math.sin(b),z+zz)],.095)
for p in [(-35,28,18,4.6,7),(36,33,21,4.8,7.5),(-3,5,11,4.3,8),(11,24,17,3.2,7),(-16,11,11,3.0,6)]:tent(*p)
scene['building_records']=json.dumps(buildings)

bridge_routes=[]
def bridge(a,b,width=2.2,sag=1.7):
 bridge_routes.append({'a':list(a),'b':list(b),'width':width})
 a,b=Vector(a),Vector(b);d=b-a;side=Vector((-d.y,d.x,0)).normalized();N=max(12,int(d.length/.55))
 def point(t):return a.lerp(b,t)+Vector((0,0,-math.sin(t*math.pi)*sag))
 for i in range(N+1):
  p=point(i/N);G['wood'].tube(p-side*width/2,p+side*width/2,.115,.115,co('wood',R.uniform(.8,1.2)),5)
 for sign in [-1,1]:
  pts=[point(i/N)+side*width*.58*sign+Vector((0,0,1.5)) for i in range(N+1)];line('rope',pts,.065)
  for i in range(0,N+1,4):line('rope',[point(i/N)+side*width*.58*sign,pts[i]],.035)
  for p in [a,b]:G['wood'].tube(p+side*width*.58*sign,p+side*width*.58*sign+Vector((0,0,2.3)),.20,.12,co('wood'),8)
for a,b,w in [((-23,-9,8),(-22,-1,11),2.1),((25,-7,9),(22,1,11),2.2),((-23,20,18),(-11,20,17),1.8),((16,26,17),(23,26,21),1.8),((-7,-19,9),(8,-19,9),2)]:bridge(a,b,w)
# Continuous route from Aether's Arrival island: local-to-world is (-x,z,150+y).
cliff(17,-94,6,5,43,'crossing rest');cliff(8,-65,7,6,44,'crossing lookout')
for a,b in [((17,-122,7.2),(17,-99,6)),((17,-89,6),(8,-71,7)),((8,-59,7),(5,-29,10))]:bridge(a,b,2.6,1.3)
scene['bridge_routes']=json.dumps(bridge_routes)
# Horned tower: real carved facets, painted bands and spiral walkway.
x,y,z=0,25,17;h=29;r=3.5
for k in range(40):
 a=k*math.tau/40;G['wood'].tube((x+r*math.cos(a),y+r*math.sin(a),z),(x+r*.8*math.cos(a),y+r*.8*math.sin(a),z+h),.285,.23,co('wood',R.uniform(.82,1.32)),7)
for zz in [z+1,z+9,z+20,z+h]:
 ring('red',x,y,zz,r+.25,.29);ring('ivory',x,y,zz+.52,r+.28,.13)
for k in range(16):
 a=k*math.tau/16;rr=r+.3;xx=x+rr*math.cos(a);yy=y+rr*math.sin(a)
 # Colored shield fringe hangs below the mask.
 tangent=Vector((-math.sin(a),math.cos(a),0))*.64;c=Vector((xx,yy,z+19))
 G['teal' if k%2 else 'ivory'].face([c+tangent+Vector((0,0,1.8)),c-tangent+Vector((0,0,1.8)),c-tangent*.8-Vector((0,0,.6)),c-Vector((0,0,1.4)),c+tangent*.8-Vector((0,0,.6))],co('teal' if k%2 else 'ivory'))
# Frontal red/ivory emblem, not text: brow, eyes, muzzle and teeth.
fy=y-r-.45
G['red'].box((0,fy,z+25.2),(6.7,.4,6.7),co('red'))
for sign in [-1,1]:
 G['ivory'].face([(sign*.45,fy-.24,z+27.5),(sign*2.4,fy-.24,z+28),(sign*2.8,fy-.24,z+25.4),(sign*.85,fy-.24,z+25.0)],co('ivory'))
 G['dark'].face([(sign*1.15,fy-.26,z+26.3),(sign*1.8,fy-.26,z+27),(sign*2.2,fy-.26,z+25.9),(sign*1.5,fy-.26,z+25.5)],co('dark'))
G['ivory'].face([(-.6,fy-.28,z+26.4),(.6,fy-.28,z+26.4),(1.2,fy-.28,z+23.6),(-1.2,fy-.28,z+23.6)],co('ivory'))
for i in range(7):G['ivory'].box((-2.7+i*.9,fy-.22,z+22.6),(.57,.35,1.2),co('ivory'))
for sign in [-1,1]:
 pts=[(sign*3,y,z+h-1),(sign*5,y-.3,z+h-1.3),(sign*7.7,y-.2,z+h-.7),(sign*10,y,z+h+1),(sign*11.7,y+.1,z+h+3.7)]
 for i in range(len(pts)-1):G['ivory' if i<2 else 'dark'].tube(pts[i],pts[i+1],1.25*(1-i/4),1.25*(1-(i+1)/4),co('ivory' if i<2 else 'dark'),12)
for i in range(110):
 a=i/110*math.tau*2.2;zz=z+1+i/110*18;rr=r+.8;G['wood'].box((rr*math.cos(a),y+rr*math.sin(a),zz),(1,.6,.14),co('wood'))
line('rope',[(4.3*math.cos(i*.13),y+4.3*math.sin(i*.13),z+2+i/110*18) for i in range(111)],.055)
def pine(x,y,z,h):
 G['wood'].tube((x,y,z),(x,y,z+h),h*.032,.025,co('wood',.7),7)
 for j in range(9):
  t=.19+j*.085;bz=z+h*t;length=h*.26*(1-t)**.6
  for k in range(6):
   a=k*math.tau/6+j*.76;start=Vector((x,y,bz));tip=start+Vector((math.cos(a)*length,math.sin(a)*length,-length*.14));G['wood'].tube(start,tip,.055,.008,co('wood',.7),5)
   for q in range(9):
    t2=(q+1)/10;p=start.lerp(tip,t2);u=Vector((math.cos(a),math.sin(a),.25))*(.25+length*.13)*(1-t2*.45);v=Vector((-math.sin(a),math.cos(a),.1))*(.25+length*.09)*(1-t2*.35)
    for side in [-1,1]:G['pine'].face([p-u*.45,p+v*side,p+u+Vector((0,0,.18))],co('pine',R.uniform(.7,1.30)))
 G['pine'].tube((x,y,z+h*.82),(x,y,z+h+.3),.42,0,co('pine'),7)
for cx,cy,zz,r,count in [(0,5,11,30,55),(-34,17,18,15,24),(35,22,21,15,23),(-23,-25,8,14,18),(25,-23,9,15,20)]:
 for i in range(count):
  a=R.random()*math.tau;rr=R.uniform(.72,1)*r;px=cx+rr*math.cos(a);py=cy+rr*math.sin(a)
  # Keep the houses, central tower and connecting paths readable.
  if py<-30 and abs(px)<30:continue
  if any(a-2<px<c+2 and b-2<py<d+2 for a,b,c,d in reserved):continue
  pine(px,py,zz,R.uniform(5.5,11))
# Smaller ceremonial posts echo the reference and mark the crossing.
for x,y,z in [(-34,-24,8),(38,-15,9),(-27,7,18),(20,31,21),(17,-94,6),(8,-65,7)]:
 G['wood'].tube((x,y,z),(x+.35,y,z+8),.72,.46,co('wood',1.2),14)
 for h in [1.5,5,7]:ring('ivory',x+.2,y,z+h,.68,.09)
 for sign in [-1,1]:line('ivory',[(x,y,z+7),(x+sign*1.7,y,z+7.3),(x+sign*2.3,y,z+8)],.18)
# Rear and flank ridges fill the opposite horizon; snow collects on high crests.
for i in range(30):
 a=i/29*math.pi;x=math.cos(a)*103;y=91+math.sin(a)*86;H=R.uniform(42,75);rr=R.uniform(23,38);n=40;rows=20;g=G['mountain'];start=len(g.v)
 for j in range(rows+1):
  t=j/rows
  for k in range(n):
   ang=k*math.tau/n;rad=rr*(1-t)**1.1*(1+.22*math.sin(k*4.7+i)+R.uniform(-.07,.07));p=(x+rad*math.cos(ang)+t*8,y+rad*math.sin(ang),-29+t*H+noise(Vector((k*.2,j*.3,i)))*2)
   c=co('snow' if t>.78+noise(Vector((k*.3,i,0)))*.13 else 'mountain',R.uniform(.8,1.17));g.vert(p,c)
 for j in range(rows):
  for k in range(n):
   a=start+j*n+k;b=start+j*n+(k+1)%n;g.f.extend([(a,b,b+n),(a,b+n,a+n)])
for k,g in G.items():
 ob=g.obj('Horncrest '+k,k)
 if ob and k in ['rock','mountain']:
  for f in ob.data.polygons:f.use_smooth=True
# Export geometry with linear reference palette. Runtime adds restrained surface textures.
os.makedirs(ROOT+'/public/highland',exist_ok=True);os.makedirs(ROOT+'/outputs/highland',exist_ok=True)
bpy.ops.export_scene.gltf(filepath=ROOT+'/public/highland/horncrest.glb',export_format='GLB',use_active_scene=True,export_cameras=False,export_lights=False,export_extras=True,export_animations=False,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6)
# Native close inspection uses the same palette plus real stone relief.
texroot=ROOT+'/public/aether/textures/'
for k in ['rock','wood','roof','ground','mountain']:
 m=materials[k];n=m.node_tree.nodes;l=m.node_tree.links;p=n.get('Principled BSDF');tc=n.new('ShaderNodeTexCoord');mapn=n.new('ShaderNodeVectorMath');mapn.operation='SCALE';mapn.inputs[3].default_value=.3;l.new(tc.outputs['Object'],mapn.inputs[0]);im=n.new('ShaderNodeTexImage');im.image=bpy.data.images.load(texroot+'rock-color.jpg',check_existing=True);im.projection='BOX';im.projection_blend=.2;l.new(mapn.outputs[0],im.inputs[0]);bump=n.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.23;bump.inputs['Distance'].default_value=.075;l.new(im.outputs[0],bump.inputs['Height']);l.new(bump.outputs[0],p.inputs['Normal']);im.image.pack()
n=scene.world.node_tree.nodes;l=scene.world.node_tree.links;env=n.new('ShaderNodeTexEnvironment');env.image=bpy.data.images.load(texroot+'sky.hdr',check_existing=True);env.image.pack();l.new(env.outputs[0],n.get('Background').inputs[0]);n.get('Background').inputs[1].default_value=.55
ld=bpy.data.lights.new('Horncrest warm afternoon','SUN');ld.energy=3.5;ld.color=(1,.84,.65);ld.angle=.06;sun=bpy.data.objects.new('Horncrest warm afternoon',ld);scene.collection.objects.link(sun);sun.rotation_euler=(.8,-.4,-.6)
cd=bpy.data.cameras.new('Horncrest camera');cam=bpy.data.objects.new('Horncrest camera',cd);scene.collection.objects.link(cam);scene.camera=cam;cam.location=(53,-100,56);aim=Vector((0,5,19));cam.rotation_euler=(aim-cam.location).to_track_quat('-Z','Y').to_euler();cd.lens=38
for frame,p in [(1,(53,-100,56)),(241,(-40,-49,34)),(481,(24,-8,45)),(721,(53,-100,56))]:cam.location=p;cam.rotation_euler=(aim-cam.location).to_track_quat('-Z','Y').to_euler();cam.keyframe_insert('location',frame=frame);cam.keyframe_insert('rotation_euler',frame=frame)
scene.frame_set(1)
report={'scene':scene.name,'meshes':sum(o.type=='MESH' for o in scene.objects),'polygons':sum(len(o.data.polygons) for o in scene.objects if o.type=='MESH'),'houses':6,'tents':5,'totem_towers':1,'world_offset':[0,0,150],'world_y_rotation':math.pi,'linear_vertex_palette':True,'buildings':buildings,'structure_revision':'closed-shells-and-terrain-clearance'}
json.dump(report,open(ROOT+'/outputs/highland/model-report.json','w'),indent=2)
bpy.data.libraries.write(ROOT+'/outputs/highland/horncrest.blend',{scene},fake_user=True,compress=True)
bpy.context.window.scene=previous if previous else scene
print('HIGHLAND_READY',json.dumps(report))
