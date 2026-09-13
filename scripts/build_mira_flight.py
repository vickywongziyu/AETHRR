"""Add flight poses and a flexible shoulder-pinned cape to the current Mira.

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
OUT = ROOT / 'outputs/character/mira-flight'
OUT.mkdir(parents=True, exist_ok=True)
scene = bpy.context.scene
scene.name = 'Mira · windborne traveler'
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
    width = .205 + .235 * math.sin(v * math.pi / 2)
    folds = (.008 + .040 * v) * math.sin(u * math.pi * 4)
    wave = math.tau * phase
    return Vector((
        u * width + .037 * v * v * math.sin(wave * 2 - v * 6 + u * 1.4),
        .13 + .09*u*u + .18 * v + folds + flow * .58 * v ** 1.3
        + (.030 + .030 * flow) * v ** 1.4 * math.sin(wave * 2 - v * 7 + u * 1.2),
        1.445 - .96 * v - .025 * u * u * (1-v) + .10 * abs(u) ** 3 * v * v
        + flow * .30 * v ** 1.25 + .047 * v * v * math.sin(wave * 2 - v * 5 + u * 2)
        + .010 * v * v * math.sin(wave * 3 - v * 9)))


# Independent controls across width and length deform the cape continuously;
# they inherit upper-back movement without forcing the hem to swing rigidly.
COLS, ROWS = 5, 8
bpy.context.view_layer.objects.active = arm
arm.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
inv = arm.matrix_world.inverted()
cape_bones = []
for c in range(COLS):
    for r in range(ROWS):
        name = f'FlightCape_{c}_{r}'
        bone = arm.data.edit_bones.new(name)
        point = cape_point(c/(COLS-1)*2-1, r/(ROWS-1))
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


wool = material('Mira · storm blue flight wool', (.046, .083, .112))
lining = material('Mira · muted warm flight lining', (.105, .097, .083))
clasp_mat = material('Mira · antique silver flight clasp', (.29, .28, .24), .38, .55)
nx, ny = 40, 56
vertices = [cape_point(c/nx*2-1, r/ny) for r in range(ny+1) for c in range(nx+1)]
faces = [(r*(nx+1)+c, r*(nx+1)+c+1, (r+1)*(nx+1)+c+1, (r+1)*(nx+1)+c)
         for r in range(ny) for c in range(nx)]
data = bpy.data.meshes.new('Mira · flight cape fabric')
data.from_pydata(vertices, [], faces)
data.update()
cape = bpy.data.objects.new('Mira_Flight_Cape', data)
scene.collection.objects.link(cape)
cape['flightOnly'] = True
data.materials.append(wool)
data.materials.append(lining)
for p in data.polygons:
    p.use_smooth = True
for name in cape_bones:
    cape.vertex_groups.new(name=name)
for r in range(ny+1):
    for c in range(nx+1):
        xc, yr = c/nx*(COLS-1), r/ny*(ROWS-1)
        c0, r0 = min(COLS-2, int(xc)), min(ROWS-2, int(yr))
        for ci, cw in ((c0, 1-(xc-c0)), (c0+1, xc-c0)):
            for ri, rw in ((r0, 1-(yr-r0)), (r0+1, yr-r0)):
                if cw*rw > 1e-7:
                    cape.vertex_groups[f'FlightCape_{ci}_{ri}'].add([r*(nx+1)+c], cw*rw, 'REPLACE')
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
    obj['flightOnly'] = True
    obj.parent = arm
    obj.matrix_parent_inverse = arm.matrix_world.inverted()
    obj.vertex_groups.new(name='Spine').add(list(range(len(obj.data.vertices))), 1, 'REPLACE')
    obj.modifiers.new('Upper back attachment', 'ARMATURE').object = arm


# A narrow shoulder band and clasp connect the back panel across the collar.
cv, cf = [], []
for i in range(41):
    u = i/40*2-1
    for z in (1.402, 1.430):
        cv.append((u*.205, .22-.315*math.sqrt(max(0,1-u*u)), z+.006*u*u))
for i in range(40):
    cf.append((2*i, 2*i+2, 2*i+3, 2*i+1))
cm = bpy.data.meshes.new('Mira · flight shoulder band')
cm.from_pydata(cv, [], cf)
collar = bpy.data.objects.new('Mira_Flight_Collar', cm)
scene.collection.objects.link(collar)
cm.materials.append(wool)
bind_spine(collar)
bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=10, radius=1, location=(0,-.102,1.416))
clasp = bpy.context.object
clasp.name = 'Mira_Flight_Clasp'
clasp.scale = (.020, .006, .012)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
clasp.data.materials.append(clasp_mat)
bind_spine(clasp)


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
                u, v = c/(COLS-1)*2-1, r/(ROWS-1)
                pb = arm.pose.bones[f'FlightCape_{c}_{r}']
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
for o in [arm,body,cape,collar,clasp]:
    o.select_set(True)
bpy.context.view_layer.objects.active = arm
scene.frame_set(0)
bpy.ops.export_scene.gltf(
    filepath=str(OUT/'mira-flight-v6.glb'), export_format='GLB',
    use_selection=True, use_active_scene=True, export_animations=True,
    export_animation_mode='NLA_TRACKS', export_nla_strips=True, export_extras=True,
    export_image_format='AUTO', export_draco_mesh_compression_enable=True,
    export_draco_mesh_compression_level=6, export_draco_position_quantization=16,
    export_draco_normal_quantization=12, export_draco_texcoord_quantization=14)
subprocess.run(['node', str(ROOT/'scripts/preserve_mira_ground_motion.mjs')], check=True)
shutil.copyfile(OUT/'mira-flight-v6.glb', ROOT/'public/character/mira-flight-v6.glb')
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
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'mira-flight-master.blend'))
report={'source':'mira-grounded-run-v5.glb','clothBones':len(cape_bones),'clothVertices':len(cape.data.vertices),'clips':{a.name:list(a.frame_range) for a in [*ground_actions.values(),*flight_actions]},'vertices':len(body.data.vertices),'flightOnlyMeshes':[cape.name,collar.name,clasp.name]}
(OUT/'model.json').write_text(json.dumps(report,indent=2))
print('FLIGHT_MODEL_READY',json.dumps(report),flush=True)
for clip,view,location in [('Hover','front',(2.8,-5,2.0)),('Hover','back',(-2.8,5,2.0)),('Glide','side',(5,1,1.9))]:
    action=bpy.data.actions[clip]
    arm.animation_data.action=action
    arm.animation_data.action_slot=action.slots[0]
    scene.frame_set(15)
    scene.camera.location=location
    scene.camera.rotation_euler=(Vector((0,.25,1.05))-scene.camera.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=str(OUT/f'{clip.lower()}-{view}.png')
    bpy.ops.render.render(write_still=True)
