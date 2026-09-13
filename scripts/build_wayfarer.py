"""Original rigged adult female wayfarer; independent Blender scene and web GLB."""
import bpy, math, json
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'outputs/character';OUT.mkdir(exist_ok=True,parents=True)
scene=bpy.data.scenes.new('Mira · The Wayfarer')
bpy.context.window.scene=scene
scene.render.engine='CYCLES';scene.cycles.samples=40
scene.render.resolution_x=1000;scene.render.resolution_y=1100;scene.render.resolution_percentage=100
scene.world=bpy.data.worlds.new('Wayfarer studio');scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.13,.16,.20,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value=.4
scene.view_settings.view_transform='AgX'
scene.render.image_settings.file_format='PNG';scene.render.fps=30

def mat(name,color,rough=.6,metal=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 s=m.node_tree.nodes.get('Principled BSDF');s.inputs['Base Color'].default_value=(*color,1);s.inputs['Roughness'].default_value=rough;s.inputs['Metallic'].default_value=metal
 return m
skin=mat('Warm porcelain',(.64,.42,.32),.55)
hair=mat('Black hair · blue undertone',(.008,.011,.018),.49)
hairglint=mat('Hair reflected ribbons',(.017,.022,.030),.53)
cloth=mat('Storm blue wool',(.055,.084,.102),.92)
lining=mat('Warm slate lining',(.15,.16,.17),.94)
dress=mat('Charcoal travel tunic',(.036,.05,.055),.88)
leather=mat('Weathered chestnut leather',(.105,.063,.042),.62)
sole=mat('Boot soles',(.023,.025,.026),.9)
metal=mat('Antique silver',(.38,.43,.43),.32,.7)
iris=mat('Hazel eyes',(.055,.043,.028),.3)
white=mat('Eye ivory',(.78,.75,.69),.38)
lip=mat('Muted rose',(.33,.12,.10),.6)
char=[]
rigdata=bpy.data.armatures.new('Wayfarer skeleton');rig=bpy.data.objects.new('Wayfarer_Rig',rigdata);scene.collection.objects.link(rig)
bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
bones={}
def bone(name,head,tail,parent=None):
 b=rigdata.edit_bones.new(name);b.head=head;b.tail=tail
 if parent:b.parent=rigdata.edit_bones[parent]
 bones[name]=(head,tail)
bone('Root',(0,0,0),(0,0,.25));bone('Hips',(0,0,.86),(0,0,1.03),'Root');bone('Spine',(0,0,1.03),(0,0,1.27),'Hips');bone('Chest',(0,0,1.27),(0,0,1.43),'Spine');bone('Neck',(0,0,1.43),(0,0,1.51),'Chest');bone('Head',(0,0,1.51),(0,0,1.78),'Neck')
for side,sign in [('L',1),('R',-1)]:
 bone('Thigh.'+side,(sign*.10,0,.91),(sign*.105,0,.51),'Hips');bone('Shin.'+side,(sign*.105,0,.51),(sign*.105,0,.11),'Thigh.'+side);bone('Foot.'+side,(sign*.105,0,.11),(sign*.105,-.16,.06),'Shin.'+side)
 bone('UpperArm.'+side,(sign*.18,0,1.37),(sign*.26,-.012,1.10),'Chest');bone('Forearm.'+side,(sign*.26,-.012,1.10),(sign*.29,-.04,.87),'UpperArm.'+side);bone('Hand.'+side,(sign*.29,-.04,.87),(sign*.30,-.045,.79),'Forearm.'+side)
bone('Cape',(0,.11,1.34),(0,.23,.94),'Chest');bone('CapeHem',(0,.23,.94),(0,.32,.47),'Cape');bone('Hair',(0,.11,1.66),(0,.16,1.35),'Head');bone('HairTips',(0,.16,1.35),(0,.20,1.13),'Hair')
bpy.ops.object.mode_set(mode='OBJECT');rig.select_set(False)

def mesh(name,verts,faces,material,weights):
 data=bpy.data.meshes.new(name);data.from_pydata(verts,[],faces);data.update();o=bpy.data.objects.new(name,data);scene.collection.objects.link(o);o.data.materials.append(material)
 for f in data.polygons:f.use_smooth=True
 bind(o,weights);return o
def bind(o,weights):
 o.parent=rig
 mod=o.modifiers.new('Wayfarer skin','ARMATURE');mod.object=rig
 groups={}
 for v in o.data.vertices:
  w={weights:1} if isinstance(weights,str) else weights(v.co)
  for name,weight in w.items():
   if weight<=.0001:continue
   if name not in groups:groups[name]=o.vertex_groups.new(name=name)
   groups[name].add([v.index],weight,'REPLACE')
 char.append(o)
 return o
def uv(name,p,s,material,weights,segments=32,rings=20):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,location=p);o=bpy.context.object;o.name=name;o.scale=s
 bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
 o.data.materials.append(material)
 for f in o.data.polygons:f.use_smooth=True
 return bind(o,weights)
def rings(name,rows,material,weights,n=40):
 v=[];f=[]
 for z,rx,ry,cy in rows:
  for i in range(n):a=i/n*math.tau;v.append((math.cos(a)*rx,cy+math.sin(a)*ry,z))
 for j in range(len(rows)-1):
  for i in range(n):a=j*n+i;b=j*n+(i+1)%n;f.append((a,b,b+n,a+n))
 f.extend([tuple(range(n-1,-1,-1)),tuple((len(rows)-1)*n+i for i in range(n))])
 return mesh(name,v,f,material,weights)
def tube(name,points,radii,material,weights,n=10):
 v=[];f=[];points=[Vector(p) for p in points]
 for j,p in enumerate(points):
  tangent=(points[min(j+1,len(points)-1)]-points[max(0,j-1)]).normalized();axis=tangent.cross(Vector((0,1,0)))
  if axis.length<.1:axis=tangent.cross(Vector((1,0,0)))
  axis.normalize();other=tangent.cross(axis).normalized()
  for i in range(n):a=i/n*math.tau;v.append(p+radii[j]*(axis*math.cos(a)+other*math.sin(a)))
 for j in range(len(points)-1):
  for i in range(n):a=j*n+i;b=j*n+(i+1)%n;f.append((a,b,b+n,a+n))
 f.extend([tuple(range(n-1,-1,-1)),tuple((len(points)-1)*n+i for i in range(n))]);return mesh(name,v,f,material,weights)
def torsoWeight(p):
 if p.z<1.03:return {'Hips':1}
 t=max(0,min(1,(p.z-1.12)/.25));return {'Spine':1-t,'Chest':t}
# Continuous tailored silhouette; opaque travel clothing.
rings('Travel tunic',[(.77,.19,.125,0),(.87,.18,.12,0),(1.0,.13,.10,0),(1.10,.12,.09,0),(1.23,.155,.107,0),(1.33,.18,.105,0),(1.40,.165,.08,0),(1.43,.074,.059,0)],dress,torsoWeight)
rings('High linen collar',[(1.38,.079,.066,0),(1.47,.065,.058,0)],lining,'Neck')
uv('Neck',(0,0,1.47),(.052,.049,.09),skin,'Neck')
# Face is sculpted in latitude rings, with a narrower jaw and flattened facial plane.
rows=[(1.50,.026,.05,-.027),(1.525,.055,.068,-.017),(1.56,.084,.085,-.004),(1.61,.105,.092,0),(1.67,.111,.099,.004),(1.73,.108,.095,.008),(1.78,.088,.079,.01),(1.81,.02,.023,.01)]
rings('Face',rows,skin,'Head',48)
uv('Nose bridge',(0,-.095,1.64),(.010,.011,.033),skin,'Head',20,14)
uv('Nose tip',(0,-.105,1.614),(.015,.014,.010),skin,'Head',20,14)
for sign in [-1,1]:
 uv('Ear', (sign*.105,.003,1.639),(.020,.015,.034),skin,'Head',20,14)
 uv('Eye', (sign*.045,-.087,1.665),(.025,.005,.008),white,'Head',24,12)
 uv('Iris',(sign*.046,-.093,1.665),(.007,.0015,.007),iris,'Head',20,12)
 uv('Pupil',(sign*.046,-.095,1.665),(.003,.001,.004),hair,'Head',16,10)
 uv('Catchlight',(sign*.046-.002,-.097,1.668),(.0012,.0007,.0014),white,'Head',12,8)
 pts=[(sign*(.020+k*.012),-.098+abs(k-2)*.002,1.674+math.sin(k/4*math.pi)*.003) for k in range(5)]
 tube('Upper lashes',pts,[.0015,.002,.0023,.002,.001],hair,'Head',6)
 tube('Eyebrow',[(sign*.023,-.094,1.698),(sign*.045,-.098,1.702),(sign*.071,-.087,1.698)],[.002,.003,.001],hair,'Head',8)
tube('Upper lip',[(-.027,-.090,1.575),(-.012,-.100,1.578),(0,-.102,1.576),(.012,-.100,1.578),(.027,-.090,1.575)],[.001,.003,.0025,.003,.001],lip,'Head',8)
uv('Lower lip',(0,-.099,1.570),(.023,.005,.004),lip,'Head',20,10)
# Close scalp cap with an open hairline in front.
v=[];f=[];N=56;M=14
for j in range(M+1):
 for i in range(N):
  a=i/N*math.tau;front=max(0,-math.sin(a));end=1.85-.55*front;t=.012+(end-.012)*j/M
  v.append((.121*math.sin(t)*math.cos(a),.012+.110*math.sin(t)*math.sin(a),1.686+.146*math.cos(t)))
for j in range(M):
 for i in range(N):a=j*N+i;b=j*N+(i+1)%N;f.append((a,a+N,b+N,b))
mesh('Black hair crown',v,f,hair,'Head')
def hairWeight(p):
 t=max(0,min(1,(1.54-p.z)/.23));q=max(0,min(1,(1.34-p.z)/.18));return {'Head':1-t,'Hair':t*(1-q),'HairTips':t*q}
# Long overlapping curved locks, with broad volume and narrow reflected strands.
for i in range(19):
 a=-.1+i/18*(math.pi+.2);x=math.cos(a)*.115;y=.025+math.sin(a)*.096
 pts=[(x*.6,y*.75,1.80),(x,y,1.72),(x*1.08,y+.015,1.55),(x*1.16,y+.045,1.38),(x*.93+.01*math.sin(i),y+.12,1.16+.025*math.sin(i*2)),(x*.85,y+.13,1.095+.035*math.sin(i))]
 tube('Long black lock %02d'%i,pts,[.006,.027,.033,.032,.023,.002],hair,hairWeight,10)
 if i%2==0:tube('Fine hair ribbon %02d'%i,[(x+.004,y-.009,z) for x,y,z in pts],[.0005,.002,.002,.0018,.001,.0002],hairglint,hairWeight,6)
# Side-swept fringe, tapered at cheek level.
for sign in [-1,1]:
 for i in range(4):
  pts=[(sign*.012,-.049-i*.004,1.822),(sign*(.048+i*.012),-.096,1.76),(sign*(.085+i*.008),-.093+i*.005,1.64),(sign*(.100+i*.006),-.070,1.48-i*.012)]
  tube('Face framing fringe',pts,[.021,.023,.017,.001],hair,'Head',10)
# Sleeves, trousers, boots and relaxed mitten-shaped hands.
for side,sign in [('L',1),('R',-1)]:
 uv('Sleeve shoulder',(sign*.18,0,1.345),(.078,.075,.085),cloth,'UpperArm.'+side)
 tube('Upper sleeve',[(sign*.18,0,1.36),(sign*.22,-.006,1.23),(sign*.26,-.012,1.10)],[.073,.062,.053],cloth,'UpperArm.'+side,16)
 tube('Sleeve cuff',[(sign*.26,-.012,1.11),(sign*.275,-.025,.98),(sign*.29,-.04,.88)],[.056,.047,.041],dress,'Forearm.'+side,16)
 uv('Gloved hand',(sign*.295,-.045,.837),(.037,.026,.066),leather,'Hand.'+side,24,16)
 uv('Thumb',(sign*.271,-.066,.848),(.019,.018,.032),leather,'Hand.'+side,20,12)
 tube('Trouser thigh',[(sign*.10,0,.90),(sign*.10,0,.72),(sign*.105,0,.50)],[.091,.081,.062],dress,'Thigh.'+side,20)
 tube('Boot shaft',[(sign*.105,0,.50),(sign*.105,0,.40),(sign*.105,0,.15)],[.067,.073,.052],leather,'Shin.'+side,24)
 uv('Boot foot',(sign*.105,-.053,.088),(.063,.118,.069),leather,'Foot.'+side,28,16)
 uv('Boot sole',(sign*.105,-.06,.030),(.067,.121,.028),sole,'Foot.'+side,28,12)
 tube('Boot rim',[(sign*.105+.067*math.cos(i/24*math.tau),.061*math.sin(i/24*math.tau),.48) for i in range(25)],[.008]*25,leather,'Shin.'+side,6)
 for z in [.40,.27]:tube('Boot strap',[(sign*.105+.07*math.cos(i/24*math.tau),.060*math.sin(i/24*math.tau),z) for i in range(25)],[.006]*25,sole,'Shin.'+side,6)
# Belt, cross-body bag and clasp.
rings('Leather waist belt',[(1.017,.134,.105,0),(1.065,.135,.105,0)],leather,'Spine',48)
uv('Belt buckle',(0,-.108,1.044),(.027,.008,.023),metal,'Spine',20,12)
uv('Satchel',(.22,.017,.91),(.086,.066,.119),leather,'Hips',28,16)
tube('Satchel shoulder strap',[(-.11,-.104,1.39),(-.015,-.115,1.27),(.09,-.108,1.12),(.20,-.06,.97)],[.012]*4,leather,torsoWeight,8)
uv('Satchel clasp',(.22,-.048,.944),(.017,.008,.020),metal,'Hips',16,10)
# Sweeping open-front travel cloak: lined surface with a softly rippled hem.
def capeWeight(p):
 t=max(0,min(1,(1.31-p.z)/.42));q=max(0,min(1,(.97-p.z)/.42));return {'Chest':1-t,'Cape':t*(1-q),'CapeHem':t*q}
v=[];f=[];N=64;M=20
for j in range(M+1):
 t=j/M;z=1.43-.94*t;rx=.14+.14*math.sin(t*math.pi/2)+.105*t;ry=.10+.18*t
 for i in range(N+1):
  a=-.32+(math.pi+.64)*i/N;fold=(math.sin(a*13+t*.5)*.009+math.sin(a*21)*.003)*t
  v.append(((rx+fold)*math.cos(a),.015+(ry+fold)*math.sin(a)+.045*t*t,z+.018*math.sin(a*5)*t*t))
for j in range(M):
 for i in range(N):a=j*(N+1)+i;f.append((a,a+N+1,a+N+2,a+1))
cape=mesh('Travel cloak · outer wool',v,f,cloth,capeWeight)
solid=cape.modifiers.new('Lined wool thickness','SOLIDIFY');solid.thickness=.008;solid.material_offset=1;cape.data.materials.append(lining)
bpy.context.view_layer.objects.active=cape;cape.select_set(True);bpy.ops.object.modifier_apply(modifier=solid.name);cape.select_set(False)
for edge in [0,N]:tube('Cloak edge piping',[v[j*(N+1)+edge] for j in range(M+1)],[.005]*(M+1),lining,capeWeight,7)
tube('Cloak hem stitching',[v[M*(N+1)+i] for i in range(N+1)],[.0038]*(N+1),lining,capeWeight,6)
# Folded hood sits behind the neck, leaving her long hair visible.
uv('Folded hood',(0,.065,1.37),(.145,.065,.060),cloth,'Chest',32,18)
tube('Collar trim',[(-.14,-.035,1.435),(-.08,-.081,1.427),(0,-.092,1.40),(.08,-.081,1.427),(.14,-.035,1.435)],[.014]*5,lining,'Chest',10)
uv('Moon clasp',(0,-.111,1.398),(.025,.009,.030),metal,'Chest',24,14)
# Merge all cloth/body sections; vertex groups and material regions stay intact.
bpy.ops.object.select_all(action='DESELECT')
for o in char:o.select_set(True)
bpy.context.view_layer.objects.active=char[0];bpy.ops.object.join();character=bpy.context.object;character.name='Mira · Black-haired Wayfarer'
# In-place locomotion clips, sampled at 30 fps; cape and hair have bone-driven secondary motion.
rig.animation_data_create()
for name,count,amplitude in [('Idle',90,0),('Walk',30,.55),('Run',22,.83)]:
 action=bpy.data.actions.new(name);rig.animation_data.action=action
 for frame in range(count+1):
  phase=frame/count*math.tau
  for pb in rig.pose.bones:pb.rotation_mode='XYZ';pb.rotation_euler=(0,0,0);pb.location=(0,0,0)
  root=rig.pose.bones['Root'];root.location.y=(.009*math.sin(phase) if name=='Idle' else .025*(1-math.cos(phase*2)))
  rig.pose.bones['Chest'].rotation_euler.x=.018*math.sin(phase) + (.08 if name=='Run' else 0)
  rig.pose.bones['Head'].rotation_euler.z=.035*math.sin(phase)
  for side,offset in [('L',0),('R',math.pi)]:
   q=phase+offset;rig.pose.bones['Thigh.'+side].rotation_euler.x=math.sin(q)*amplitude
   rig.pose.bones['Shin.'+side].rotation_euler.x=-max(0,math.sin(q))*(.83 if name=='Run' else .62)*bool(amplitude)
   rig.pose.bones['Foot.'+side].rotation_euler.x=.13*math.sin(q)*bool(amplitude)
   rig.pose.bones['UpperArm.'+side].rotation_euler.x=-math.sin(q)*amplitude*.55
   rig.pose.bones['Forearm.'+side].rotation_euler.x=-.15-(.40 if name=='Run' else .05)
  rig.pose.bones['Cape'].rotation_euler.x=-.07+(.04 if name=='Idle' else .12)*math.sin(phase-.5)
  rig.pose.bones['CapeHem'].rotation_euler.x=.04+.07*math.sin(phase-1.1)
  rig.pose.bones['CapeHem'].rotation_euler.y=.035*math.sin(phase)
  rig.pose.bones['Hair'].rotation_euler.x=.015*math.sin(phase-.4)
  rig.pose.bones['HairTips'].rotation_euler.x=.025*math.sin(phase-.9)
  for pb in rig.pose.bones:pb.keyframe_insert('rotation_euler',frame=frame);pb.keyframe_insert('location',frame=frame)
 track=rig.animation_data.nla_tracks.new();track.name=name;strip=track.strips.new(name,1,action);strip.name=name;track.mute=True
rig.animation_data.action=bpy.data.actions['Idle'];scene.frame_start=1;scene.frame_end=90;scene.frame_set(1)
# Web export includes only the character, rig and clips.
bpy.ops.object.select_all(action='DESELECT');character.select_set(True);rig.select_set(True);bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=str(ROOT/'public/character/mira-wayfarer.glb'),export_format='GLB',use_selection=True,use_active_scene=True,export_animations=True,export_animation_mode='ACTIONS',export_nla_strips=True,export_skins=True,export_force_sampling=True,export_yup=True)
# Separate studio objects stay out of the exported character.
floor=mat('Studio floor',(.055,.072,.082),.85)
bpy.ops.mesh.primitive_cylinder_add(vertices=96,radius=.67,depth=.07,location=(0,0,-.04));bpy.context.object.name='Display plinth';bpy.context.object.data.materials.append(floor)
bevel=bpy.context.object.modifiers.new('Soft rim','BEVEL');bevel.width=.025;bevel.segments=3
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.08));bpy.context.object.data.materials.append(floor)
def area(name,position,power,color,size):
 data=bpy.data.lights.new(name,'AREA');data.energy=power;data.color=color;data.shape='DISK';data.size=size;o=bpy.data.objects.new(name,data);scene.collection.objects.link(o);o.location=position;o.rotation_euler=(Vector((0,0,1))-o.location).to_track_quat('-Z','Y').to_euler()
area('Warm key',(-2.5,-3.5,4),360,(1,.86,.73),3);area('Cool fill',(3,-1,2.5),230,(.68,.80,1),2.5);area('Hair rim',(0,2.5,3.3),520,(.74,.84,1),2)
camdata=bpy.data.cameras.new('Portrait camera');cam=bpy.data.objects.new('Portrait camera',camdata);scene.collection.objects.link(cam);scene.camera=cam;camdata.type='ORTHO';camdata.ortho_scale=2.25
cam.location=(2.6,-4.5,2.2);cam.rotation_euler=(Vector((0,0,.94))-cam.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'mira-wayfarer.blend'))
scene.render.filepath=str(OUT/'mira-front.png');bpy.ops.render.render(write_still=True)
cam.location=(-2.8,4.5,2.1);cam.rotation_euler=(Vector((0,0,.94))-cam.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(OUT/'mira-back.png');bpy.ops.render.render(write_still=True)
(OUT/'model-manifest.json').write_text(json.dumps({'name':'Mira / 米拉（暂名）','height':1.84,'bones':len(rigdata.bones),'vertices':len(character.data.vertices),'polygons':len(character.data.polygons),'clips':['Idle','Walk','Run'],'original_model':True,'features':['black long hair','lined travel cloak','leather boots','satchel','full skeletal skinning']},ensure_ascii=False,indent=2))
print('WAYFARER_COMPLETE')
