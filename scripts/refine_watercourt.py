import bpy,random,math,contextlib,io,json
from mathutils import Vector
ROOT='/Users/ziyu/Project/Codex6 3d';scene=bpy.context.scene;R=random.Random(673)
# Filled understory at the banks; linked geometries keep downloads compact.
pairs=[]
for i in [0,1,2,3,4,5,6]:
 a=scene.objects.get('Tree trunk '+str(i));b=scene.objects.get('Tree leaves '+str(i))
 if a and b:pairs.append((a,b))
islands=[(-16,4,7,5,1.9),(-12,24,8,8,2.5),(21,13,8,13,3.5),(0,-15,4.2,3.5,.8),(2,28,6,6,1.5),(-24,-16,6,9,.9)]
for i in range(130):
 if i<85:
  x,y,rx,ry,h=R.choice(islands);t=R.uniform(.62,.95);a=R.random()*math.tau;x+=rx*t*math.cos(a);y+=ry*t*math.sin(a);z=-.35+h*(1-t*t)
 else:
  x=R.uniform(-35,35);y=R.uniform(40,54);z=1.5
 pair=R.choice(pairs);s=R.uniform(.10,.25) if i<85 else R.uniform(.25,.5);a=R.random()*math.tau
 for j,source in enumerate(pair):
  ob=bpy.data.objects.new(('Understory trunk ' if j==0 else 'Understory leaves ')+str(i),source.data);scene.collection.objects.link(ob);ob.location=(x,y,z);ob.scale=(s,s,s*.85);ob.rotation_euler[2]=a
terrain=scene.objects.get('Moss islands and forest banks')
for p in terrain.data.polygons:p.use_smooth=True
# Camera opening matches tested website.
cam=scene.camera;cam.location=(13,-30,29);cam.rotation_euler=(Vector((0,9,1))-cam.location).to_track_quat('-Z','Y').to_euler();cam.keyframe_insert('location',frame=1);cam.keyframe_insert('rotation_euler',frame=1);cam.keyframe_insert('location',frame=901);cam.keyframe_insert('rotation_euler',frame=901)
cam.data.lens=36
for f,pos,target in [(451,(0,1,7),(-5,16,3.4)),(676,(24,3,13),(13,18,3))]:
 cam.location=pos;cam.rotation_euler=(Vector(target)-Vector(pos)).to_track_quat('-Z','Y').to_euler();cam.keyframe_insert('location',frame=f);cam.keyframe_insert('rotation_euler',frame=f)
scene.frame_set(1)
bpy.data.libraries.write(ROOT+'/outputs/watercourt/watercourt.blend',{scene},fake_user=True)
buffer=io.StringIO()
with contextlib.redirect_stdout(buffer):
 bpy.ops.export_scene.gltf(filepath=ROOT+'/public/watercourt/watercourt.glb',export_format='GLB',use_active_scene=True,export_cameras=False,export_lights=False,export_animations=False,export_yup=True,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6)
p=ROOT+'/outputs/watercourt/scene-manifest.json';manifest=json.load(open(p));manifest['objects']=len(scene.objects);manifest['understory_plants']=130;json.dump(manifest,open(p,'w'),indent=2)
print('REFINED',len(scene.objects),buffer.getvalue()[-500:])
