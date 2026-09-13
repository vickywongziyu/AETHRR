"""Build Mira’s fitted woven travel cape, soft ties, seams and backup flight poses.

Run in factory-startup background Blender. The source V5 is never overwritten.
"""
import bpy
import json
import math
import runpy
import shutil
import subprocess
from pathlib import Path
from mathutils import Matrix, Vector

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'outputs/character/mira-cloth-v7'
OUT.mkdir(parents=True, exist_ok=True)
scene = bpy.context.scene
scene.name = 'Mira · woven travel cloak'
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
scene.render.fps = 30
bpy.ops.import_scene.gltf(filepath=str(ROOT / 'public/character/mira-grounded-run-v5.glb'))
arm = next(o for o in scene.objects if o.type == 'ARMATURE')
body = max((o for o in scene.objects if o.type == 'MESH'), key=lambda o: len(o.data.vertices))
ground_actions = {a.name: a for a in bpy.data.actions}
arm.animation_data_create()
arm.animation_data.action = ground_actions['Idle']
arm.animation_data.action_slot = ground_actions['Idle'].slots[0]
scene.frame_set(0)
bpy.context.view_layer.update()
neutral = {p.name: p.matrix_basis.copy() for p in arm.pose.bones}
arm.animation_data_clear()
for p in arm.pose.bones:
    p.matrix_basis.identity()
bpy.context.view_layer.update()


def cape_point(u, v, flow=0, phase=0):
    # A continuous open-front neck yoke widens over the shoulders, then falls.
    def profile(points):
        for i in range(len(points)-1):
            if v <= points[i+1][0]:
                x0,y0=points[i]; x1,y1=points[i+1]
                t=max(0,(v-x0)/(x1-x0))
                m0=(y1-y0)/(x1-x0) if i==0 else (y1-points[i-1][1])/(x1-points[i-1][0])
                m1=(y1-y0)/(x1-x0) if i+2==len(points) else (points[i+2][1]-y0)/(points[i+2][0]-x0)
                return (2*t**3-3*t*t+1)*y0+(t**3-2*t*t+t)*(x1-x0)*m0+(-2*t**3+3*t*t)*y1+(t**3-t*t)*(x1-x0)*m1
        return points[-1][1]
    opening=.76+.95*min(1,v/.22)
    angle=opening+(math.tau-2*opening)*(u+1)/2
    rx=profile([(0,.073),(.083,.18),(.22,.28),(.5,.30),(1,.33)])
    ry=profile([(0,.065),(.083,.14),(.22,.20),(.5,.25),(1,.29)])
    fold=(.002+.013*v)*math.sin(angle*9+.3*math.sin(v*5))
    x=(rx+fold)*math.sin(angle)
    y=.025-(ry+fold)*math.cos(angle)
    z=profile([(0,1.449),(.083,1.423),(.22,1.305),(1,.46)])+.045*abs(u)**3*v
    # Ease over the convex shoulder between the neck and shoulder seams.
    # Exported backup motion; the browser uses constrained cloth dynamics.
    wind=max(0,(v-.1)/.9)**1.5
    y+=flow*.44*wind + .014*wind*math.sin(math.tau*phase*2-v*6+u*2)
    z+=flow*.22*wind + .008*wind*math.sin(math.tau*phase*2-v*5+u*2)
    return Vector((x,y,z))


# Independent controls across width and length deform the cape continuously;
# they inherit upper-back movement without forcing the hem to swing rigidly.
COLS, ROWS = 11, 15
def control_v(row): return row/36 if row<=3 else (row-2)/12
def control_row(v): return v*36 if v<=1/12 else v*12+2
bpy.context.view_layer.objects.active = arm
arm.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
inv = arm.matrix_world.inverted()
cape_bones = []
for c in range(COLS):
    for r in range(ROWS):
        name = f'Drape_{c}_{r}'
        bone = arm.data.edit_bones.new(name)
        point = cape_point(c/(COLS-1)*2-1, control_v(r))
        bone.head = inv @ point
        bone.tail = inv @ (point + Vector((0, 0, -.12)))
        bone.parent = arm.data.edit_bones['Spine']
        cape_bones.append(name)
bpy.ops.object.mode_set(mode='OBJECT')


def material(name, color, roughness=.9, metal=0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Roughness'].default_value = roughness
    p.inputs['Metallic'].default_value = metal
    p.inputs['Specular IOR Level'].default_value = .25
    return m


# Embedded PBR weave. This is a tile of tiny fibers, not large painted folds.
import numpy as np
rng=np.random.default_rng(719)
size=512
xx,yy=np.meshgrid(np.arange(size),np.arange(size))
warp=np.cos(xx*math.tau/8); weft=np.cos(yy*math.tau/8)
checker=((xx//8+yy//8)%2)*2-1
height=(warp*(1+checker*.25)+weft*(1-checker*.25))*.5
noise=rng.normal(0,1,(size,size))
def map_image(name,rgb,colorspace='sRGB'):
    image=bpy.data.images.new(name,width=size,height=size,alpha=True)
    image.colorspace_settings.name=colorspace
    pixels=np.ones((size,size,4),dtype=np.float32)
    pixels[:,:,:3]=np.clip(rgb,0,1)
    image.pixels.foreach_set(pixels.ravel())
    image.filepath_raw=str(OUT/(name+'.png'));image.file_format='PNG';image.save()
    image.pack()
    return image
base=np.array([.145,.205,.237])[None,None,:]*(1+.045*height[:,:,None]+.016*noise[:,:,None])
rough=np.repeat(np.clip(.94+.027*height+.012*noise,.86,.99)[:,:,None],3,axis=2)
dy,dx=np.gradient(height)
norm=np.stack([-dx*.20,-dy*.20,np.ones_like(dx)],axis=-1)
norm/=np.linalg.norm(norm,axis=-1,keepdims=True)
images=[map_image('storm-wool-color',base),map_image('storm-wool-roughness',rough,'Non-Color'),map_image('storm-wool-normal',norm*.5+.5,'Non-Color')]
wool=material('Mira · matte woven storm wool',(.025,.040,.049),.94)
p=wool.node_tree.nodes.get('Principled BSDF');p.inputs['Specular IOR Level'].default_value=.15
p.inputs['Sheen Weight'].default_value=0;p.inputs['Sheen Roughness'].default_value=.9
nodes=wool.node_tree.nodes;links=wool.node_tree.links
uv=nodes.new('ShaderNodeTexCoord')
for im,socket in zip(images,['Base Color','Roughness','Normal']):
    tex=nodes.new('ShaderNodeTexImage');tex.image=im;links.new(uv.outputs['UV'],tex.inputs['Vector'])
    if socket=='Normal':
        normal=nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.65
        links.new(tex.outputs['Color'],normal.inputs['Color']);links.new(normal.outputs['Normal'],p.inputs[socket])
    else: links.new(tex.outputs['Color'],p.inputs[socket])
lining=material('Mira · brushed wool reverse',(.028,.036,.040),.97)
lining.node_tree.nodes.get('Principled BSDF').inputs['Specular IOR Level'].default_value=.12
cord_mat=material('Mira · soft woven ties',(.035,.049,.055),.97)
nx, ny = 60, 72
vertices = [cape_point(c/nx*2-1, r/ny) for r in range(ny+1) for c in range(nx+1)]
faces = [(r*(nx+1)+c, r*(nx+1)+c+1, (r+1)*(nx+1)+c+1, (r+1)*(nx+1)+c)
         for r in range(ny) for c in range(nx)]
faces=[face[::-1] for face in faces]
data = bpy.data.meshes.new('Mira · flight cape fabric')
data.from_pydata(vertices, [], faces)
data.update()
cape = bpy.data.objects.new('Mira_Flight_Cape', data)
scene.collection.objects.link(cape)
cape['travelCloth'] = True
cape['clothGrid'] = [COLS, ROWS]
uv_layer=data.uv_layers.new(name='Woven UV')
for polygon in data.polygons:
    for li in polygon.loop_indices:
        vi=data.loops[li].vertex_index
        uv_layer.data[li].uv=(vi%(nx+1)/nx*8,vi//(nx+1)/ny*10)
data.materials.append(wool)
data.materials.append(lining)
for p in data.polygons:
    p.use_smooth = True
for name in cape_bones:
    cape.vertex_groups.new(name=name)
for r in range(ny+1):
    for c in range(nx+1):
        xc, yr = c/nx*(COLS-1), control_row(r/ny)
        c0, r0 = min(COLS-2, int(xc)), min(ROWS-2, int(yr))
        for ci, cw in ((c0, 1-(xc-c0)), (c0+1, xc-c0)):
            for ri, rw in ((r0, 1-(yr-r0)), (r0+1, yr-r0)):
                if cw*rw > 1e-7:
                    cape.vertex_groups[f'Drape_{ci}_{ri}'].add([r*(nx+1)+c], cw*rw, 'REPLACE')
bpy.ops.object.select_all(action='DESELECT')
cape.select_set(True)
bpy.context.view_layer.objects.active = cape
solid = cape.modifiers.new('Wool and lining', 'SOLIDIFY')
solid.thickness = .002
solid.material_offset = 1
solid.material_offset_rim = 1
bpy.ops.object.modifier_apply(modifier=solid.name)
modifier = cape.modifiers.new('Flexible flight controls', 'ARMATURE')
modifier.object = arm
cape.parent = arm
cape.matrix_parent_inverse = arm.matrix_world.inverted()


def bind_spine(obj):
    obj['travelCloth'] = True
    obj.parent = arm
    obj.matrix_parent_inverse = arm.matrix_world.inverted()
    obj.vertex_groups.new(name='Spine').add(list(range(len(obj.data.vertices))), 1, 'REPLACE')
    obj.modifiers.new('Upper back attachment', 'ARMATURE').object = arm


# Soft cord knot, asymmetric bow and hanging ties follow the chest surface.
# All points are modeled against the actual neck/chest profile, not a hoop.
def cord(name, points, radius=.0024):
    curve=bpy.data.curves.new(name,'CURVE');curve.dimensions='3D'
    curve.resolution_u=12;curve.bevel_depth=radius;curve.bevel_resolution=3
    spline=curve.splines.new('BEZIER');spline.bezier_points.add(len(points)-1)
    for p,co in zip(spline.bezier_points,points):
        p.co=co;p.handle_left_type='AUTO';p.handle_right_type='AUTO'
    obj=bpy.data.objects.new(name,curve);scene.collection.objects.link(obj)
    bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
    bpy.ops.object.convert(target='MESH')
    obj.data.materials.append(cord_mat);bind_spine(obj)
    return obj
parts=[]
parts.append(cord('Mira_Travel_Neck_Ties',[
    tuple(cape_point(-1,0)),(.04,-.066,1.422),(0,-.082,1.406),(-.04,-.066,1.422),tuple(cape_point(1,0))]))
parts.append(cord('Mira_Travel_Bow_Left',[(0,-.085,1.406),(-.026,-.094,1.417),(-.034,-.096,1.398),(-.018,-.093,1.389),(0,-.086,1.406)],.0027))
parts.append(cord('Mira_Travel_Bow_Right',[(0,-.086,1.406),(.027,-.092,1.408),(.031,-.100,1.392),(.016,-.096,1.388),(0,-.086,1.406)],.0027))
parts.append(cord('Mira_Travel_Tie_Left',[(0,-.088,1.405),(-.009,-.102,1.378),(-.014,-.122,1.342),(-.026,-.133,1.294)]))
parts.append(cord('Mira_Travel_Tie_Right',[(.004,-.088,1.405),(.012,-.106,1.374),(.023,-.126,1.325),(.019,-.140,1.282)]))
# Rolled edges use the same cloth controls as the main fabric.
hem_vertices=[];hem_faces=[];hem_uvs=[]
paths=[[(i/120*2-1,1) for i in range(121)], [(-1,i/120) for i in range(121)],[(1,i/120) for i in range(121)],[(i/120*2-1,0) for i in range(121)]]
weights=[]
for path in paths:
    offset=len(hem_vertices)
    for j,(u,v) in enumerate(path):
        center=cape_point(u,v)
        tangent=(cape_point(*path[min(j+1,len(path)-1)])-cape_point(*path[max(0,j-1)])).normalized()
        n=Vector((0,1,.1));side=tangent.cross(n).normalized();normal=tangent.cross(side).normalized()
        for k in range(6):
            hem_vertices.append(center+.0017*(side*math.cos(k*math.tau/6)+normal*math.sin(k*math.tau/6)))
            weights.append((u,v));hem_uvs.append((j/10,k/6))
        if j:
            for k in range(6):hem_faces.append((offset+(j-1)*6+k,offset+j*6+k,offset+j*6+(k+1)%6,offset+(j-1)*6+(k+1)%6))
mesh=bpy.data.meshes.new('Mira · rolled wool seams');mesh.from_pydata(hem_vertices,[],hem_faces);mesh.update()
hem=bpy.data.objects.new('Mira_Travel_Rolled_Hem',mesh);scene.collection.objects.link(hem);mesh.materials.append(cord_mat)
hem['travelCloth']=True
for p in mesh.polygons:p.use_smooth=True
for name in cape_bones:hem.vertex_groups.new(name=name)
for i,(u,v) in enumerate(weights):
    xc,yr=(u+1)/2*(COLS-1),control_row(v);c0,r0=min(COLS-2,int(xc)),min(ROWS-2,int(yr))
    for ci,cw in ((c0,1-(xc-c0)),(c0+1,xc-c0)):
        for ri,rw in ((r0,1-(yr-r0)),(r0+1,yr-r0)):
            if cw*rw>1e-7:hem.vertex_groups[f'Drape_{ci}_{ri}'].add([i],cw*rw,'REPLACE')
hem.modifiers.new('Cloth edge controls','ARMATURE').object=arm;hem.parent=arm;hem.matrix_parent_inverse=arm.matrix_world.inverted()
parts.append(hem)


def aim_bone(name, child, direction):
    pb = arm.pose.bones[name]
    head = arm.matrix_world @ pb.matrix.translation
    tail = arm.matrix_world @ arm.pose.bones[child].matrix.translation
    delta = (tail-head).normalized().rotation_difference(Vector(direction).normalized())
    rotation = Matrix.Translation(head) @ delta.to_matrix().to_4x4() @ Matrix.Translation(-head)
    pb.matrix = arm.matrix_world.inverted() @ rotation @ arm.matrix_world @ pb.matrix
    bpy.context.view_layer.update()


def rotate_hips(angle, rise):
    pb = arm.pose.bones['Hips']
    head = arm.matrix_world @ pb.matrix.translation
    transform = Matrix.Translation(head+Vector((0,0,rise))) @ Matrix.Rotation(angle,4,'X') @ Matrix.Translation(-head)
    pb.matrix = arm.matrix_world.inverted() @ transform @ arm.matrix_world @ pb.matrix
    bpy.context.view_layer.update()


flight_actions = []
for name, flow, seconds in [('Hover', 0, 4), ('Glide', 1, 3)]:
    arm.animation_data_create()
    action = bpy.data.actions.new(name)
    arm.animation_data.action = action
    frames = round(seconds * scene.render.fps)
    for frame in range(frames+1):
        scene.frame_set(frame)
        phase = frame/frames
        wave = math.sin(math.tau*phase)
        for pb in arm.pose.bones:
            pb.rotation_mode = 'QUATERNION'
            pb.matrix_basis = neutral.get(pb.name, Matrix.Identity(4))
        bpy.context.view_layer.update()
        for side, sign in [('Left',1), ('Right',-1)]:
            aim_bone(side+'Arm', side+'ForeArm', (sign*(.28+.05*flow+.012*wave), .10*flow-.05, -1))
            aim_bone(side+'ForeArm', side+'Hand', (sign*.12, -.17, -1))
            aim_bone(side+'UpLeg', side+'Leg', (sign*.012, -.08+.24*flow, -1))
            aim_bone(side+'Leg', side+'Foot', (sign*.006, .18+.26*flow+.02*wave, -1))
            aim_bone(side+'Foot', side+'ToeBase', (0, -.6, -.8))
        rotate_hips(.025 + .22*flow + .007*wave, .16+.026*wave)
        for c in range(COLS):
            for r in range(ROWS):
                u, v = c/(COLS-1)*2-1, control_v(r)
                pb = arm.pose.bones[f'Drape_{c}_{r}']
                delta = cape_point(u,v,flow,phase)-cape_point(u,v)
                pb.location = pb.bone.matrix_local.to_3x3().inverted() @ arm.matrix_world.to_3x3().inverted() @ delta
        for pb in arm.pose.bones:
            pb.keyframe_insert('location',frame=frame)
            pb.keyframe_insert('rotation_quaternion',frame=frame)
            pb.keyframe_insert('scale',frame=frame)
    action.use_fake_user = True
    flight_actions.append(action)
    arm.animation_data_clear()

arm.animation_data_create()
for action in [*ground_actions.values(), *flight_actions]:
    track = arm.animation_data.nla_tracks.new()
    track.name = action.name
    strip = track.strips.new(action.name, int(action.frame_range[0]), action)
    strip.action_frame_start, strip.action_frame_end = action.frame_range
    strip.extrapolation = 'NOTHING'
bpy.ops.object.select_all(action='DESELECT')
for o in [arm,body,cape,*parts]:
    o.select_set(True)
bpy.context.view_layer.objects.active = arm
scene.frame_set(0)
bpy.ops.export_scene.gltf(
    filepath=str(OUT/'mira-cloth-v7.glb'), export_format='GLB',
    use_selection=True, use_active_scene=True, export_animations=True,
    export_animation_mode='NLA_TRACKS', export_nla_strips=True, export_extras=True,
    export_image_format='AUTO', export_draco_mesh_compression_enable=True,
    export_draco_mesh_compression_level=6, export_draco_position_quantization=16,
    export_draco_normal_quantization=12, export_draco_texcoord_quantization=14)
subprocess.run(['node', str(ROOT/'scripts/preserve_mira_ground_motion.mjs'), str(OUT/'mira-cloth-v7.glb')], check=True)
shutil.copyfile(OUT/'mira-cloth-v7.glb', ROOT/'public/character/mira-cloth-v7.glb')
for track in arm.animation_data.nla_tracks:
    track.mute=True
arm.animation_data.action = flight_actions[0]
arm.animation_data.action_slot = flight_actions[0].slots[0]
scene.frame_set(15)
studio = runpy.run_path(str(ROOT/'scripts/render_mira_reference_master.py'),run_name='flight_studio')
studio['configure_white_studio'](scene,1.9)
scene.cycles.samples=12
scene.render.resolution_x=640
scene.render.resolution_y=800
scene.camera=studio['camera'](scene,'Mira · flight portrait',(3.5,-5,2.1),(0,.15,1.05),2.35)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'mira-cloth-master.blend'))
report={'source':'mira-grounded-run-v5.glb','clothBones':len(cape_bones),'clothVertices':len(cape.data.vertices),'clips':{a.name:list(a.frame_range) for a in [*ground_actions.values(),*flight_actions]},'vertices':len(body.data.vertices),'travelClothMeshes':[cape.name,*[o.name for o in parts]],'clothGrid':[COLS,ROWS]}
(OUT/'model.json').write_text(json.dumps(report,indent=2))
print('FLIGHT_MODEL_READY',json.dumps(report),flush=True)
for clip,view,location in [('Idle','front',(2.1,-5,2.0)),('Idle','back',(-2.8,5,2.0)),('Glide','side',(5,1,1.9)),('Idle','neck',(0,-5,1.6))]:
    action=bpy.data.actions[clip]
    arm.animation_data.action=action
    arm.animation_data.action_slot=action.slots[0]
    scene.frame_set(15)
    scene.camera.location=location
    scene.camera.rotation_euler=(Vector((0,.25,1.05))-scene.camera.location).to_track_quat('-Z','Y').to_euler()
    if view=='neck':
        scene.camera.data.ortho_scale=.48
        scene.camera.rotation_euler=(Vector((0,-.04,1.385))-scene.camera.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=str(OUT/f'{clip.lower()}-{view}.png')
    bpy.ops.render.render(write_still=True)
