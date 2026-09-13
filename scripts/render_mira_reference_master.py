"""Render one actual character mesh from fixed orthographic cameras.

Run in Blender with a real, reviewed GLB; never substitutes a placeholder or
neutral face when the required facial controls are missing.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import struct
import sys

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
FACIAL_KEYS = ('Mira_EyesClosed', 'Mira_Happy', 'Mira_MouthOpen')


def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument('--model', type=Path, required=True)
    p.add_argument('--out', type=Path, default=ROOT / 'outputs/character/reference-master')
    p.add_argument('--yaw', type=float, default=0, help='Align face toward -Y; +X is anatomical left')
    p.add_argument('--height', type=float, default=1.74)
    p.add_argument('--head-z', type=float, default=0.915, help='Head target as fraction of model height')
    p.add_argument('--setup-only', action='store_true')
    p.add_argument('--body-only', action='store_true', help='Explicit incomplete geometry preview, not final set')
    return p.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])


def digest_meshes(meshes):
    h = hashlib.sha256()
    for obj in sorted(meshes, key=lambda o: o.name):
        h.update(obj.name.encode())
        for row in obj.matrix_world:
            h.update(struct.pack('<4d', *row))
        for vertex in obj.data.vertices:
            h.update(struct.pack('<3d', *vertex.co))
        for polygon in obj.data.polygons:
            h.update(struct.pack('<I', len(polygon.vertices)))
            h.update(struct.pack('<' + 'I' * len(polygon.vertices), *polygon.vertices))
    return h.hexdigest()


def bounds(meshes):
    points = [obj.matrix_world @ Vector(c) for obj in meshes for c in obj.bound_box]
    return (Vector(tuple(min(p[i] for p in points) for i in range(3))),
            Vector(tuple(max(p[i] for p in points) for i in range(3))))


def face_controls(meshes, active=None):
    found = set()
    for obj in meshes:
        if obj.data.shape_keys:
            for key in obj.data.shape_keys.key_blocks:
                if key.name in FACIAL_KEYS:
                    key.value = float(key.name == active)
                    found.add(key.name)
    return found


def camera(scene, name, position, target, ortho):
    data = bpy.data.cameras.new(name)
    data.type = 'ORTHO'
    data.ortho_scale = ortho
    data.lens = 50
    data.clip_start = 0.01
    data.clip_end = 100
    data.dof.use_dof = False
    obj = bpy.data.objects.new(name, data)
    scene.collection.objects.link(obj)
    obj.location = position
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat('-Z', 'Y').to_euler()
    return obj


def configure_white_studio(scene, height):
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 96
    scene.cycles.use_denoising = True
    scene.render.film_transparent = True
    scene.view_settings.view_transform = 'Standard'
    scene.view_settings.exposure = 0
    scene.view_settings.gamma = 1
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGB'
    scene.render.image_settings.color_depth = '8'
    scene.render.resolution_percentage = 100
    world = bpy.data.worlds.new('Mira Reference · neutral studio')
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs['Color'].default_value = (1, 1, 1, 1)
    world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.45
    scene.world = world
    for i, (x, y) in enumerate(((3, -3), (-3, -3), (3, 3), (-3, 3))):
        data = bpy.data.lights.new(f'Mira Reference · diffuse {i}', 'AREA')
        data.energy = 70
        data.shape = 'DISK'
        data.size = 4
        light = bpy.data.objects.new(data.name, data)
        scene.collection.objects.link(light)
        light.location = (x, y, height * 1.4)
        light.rotation_euler = (Vector((0, 0, height * 0.55)) - light.location).to_track_quat('-Z', 'Y').to_euler()
    # Composited white has RGB 1 under Standard; no ground plane/cast shadow.
    scene.use_nodes = True
    if hasattr(scene, 'compositing_node_group'):
        tree = bpy.data.node_groups.new('Mira Reference · white composite', 'CompositorNodeTree')
        tree.interface.new_socket(name='Image', in_out='OUTPUT', socket_type='NodeSocketColor')
        scene.compositing_node_group = tree
        output = tree.nodes.new('NodeGroupOutput')
    else:
        tree = scene.node_tree
        tree.nodes.clear()
        output = tree.nodes.new('CompositorNodeComposite')
    nodes = tree.nodes
    render = nodes.new('CompositorNodeRLayers')
    white = nodes.new('CompositorNodeAlphaOver')
    if 'Background' in white.inputs:
        white.inputs['Factor'].default_value = 1
        white.inputs['Background'].default_value = (1, 1, 1, 1)
        foreground = white.inputs['Foreground']
    else:
        white.inputs[0].default_value = 1
        white.inputs[1].default_value = (1, 1, 1, 1)
        foreground = white.inputs[2]
    render.scene = scene
    tree.links.new(render.outputs['Image'], foreground)
    tree.links.new(white.outputs[0], output.inputs[0])


def main():
    args = parse_args()
    if not args.model.is_file() or args.model.suffix.lower() not in ('.glb', '.gltf'):
        raise RuntimeError('A real reviewed GLB/glTF character is required; no model substitution.')
    args.out.mkdir(parents=True, exist_ok=True)
    scene = bpy.data.scenes.new('Mira · Unified Reference Studio')
    bpy.context.window.scene = scene
    bpy.ops.import_scene.gltf(filepath=str(args.model.resolve()))
    meshes = [obj for obj in scene.objects if obj.type == 'MESH']
    if not meshes:
        raise RuntimeError('The imported asset contains no meshes.')
    origin = bpy.data.objects.new('Mira · common coordinate frame', None)
    scene.collection.objects.link(origin)
    roots = [obj for obj in scene.objects if obj != origin and obj.parent is None]
    for obj in roots:
        obj.parent = origin
    origin.rotation_euler.z = math.radians(args.yaw)
    bpy.context.view_layer.update()
    lo, hi = bounds(meshes)
    if hi.z - lo.z <= 0:
        raise RuntimeError('Degenerate model bounds')
    origin.scale *= args.height / (hi.z - lo.z)
    bpy.context.view_layer.update()
    lo, hi = bounds(meshes)
    origin.location = (-(lo.x + hi.x) / 2, -(lo.y + hi.y) / 2, -lo.z)
    bpy.context.view_layer.update()
    controls = face_controls(meshes)
    missing = sorted(set(FACIAL_KEYS) - controls)
    if missing and not (args.body_only or args.setup_only):
        raise RuntimeError('Facial rig not finished. Missing: ' + ', '.join(missing))
    configure_white_studio(scene, args.height)
    h = args.height
    target = (0, 0, h * 0.5)
    lo, hi = bounds(meshes)
    # Portrait framing fits the complete silhouette without per-view rescaling.
    extent = max(hi.x - lo.x, hi.y - lo.y)
    full_scale = max(h * 1.15, extent * 1.5 * 1.15)
    cameras = {}
    views = [('01-front', (0, -6, h/2)), ('02-left', (6, 0, h/2)),
             ('03-right', (-6, 0, h/2)), ('04-back', (0, 6, h/2)),
             ('05-front-threequarter', (-4.243, -4.243, h/2)),
             ('06-back-threequarter', (-4.243, 4.243, h/2))]
    for name, position in views:
        cameras[name] = camera(scene, name, position, target, full_scale)
    head_z = h * args.head_z
    cameras['07-close-front-neutral'] = camera(scene, '07-close-front-neutral', (0, -6, head_z), (0, 0, head_z), h * 0.35)
    cameras['08-close-right'] = camera(scene, '08-close-right', (-6, 0, head_z), (0, 0, head_z), h * 0.35)
    jobs = [(name, name, None, 2048, 3072) for name, _ in views]
    if not args.body_only:
        jobs += [('07-close-front-neutral', '07-close-front-neutral', None, 2048, 2048),
                 ('08-close-right', '08-close-right', None, 2048, 2048),
                 ('09-expression-eyes-closed', '07-close-front-neutral', FACIAL_KEYS[0], 2048, 2048),
                 ('10-expression-happy', '07-close-front-neutral', FACIAL_KEYS[1], 2048, 2048),
                 ('11-expression-mouth-open', '07-close-front-neutral', FACIAL_KEYS[2], 2048, 2048)]
    baseline = digest_meshes(meshes)
    scene.camera = cameras['01-front']
    report = {'status': 'setup_only' if args.setup_only else 'render_in_progress',
              'source': str(args.model.resolve()), 'source_sha256': hashlib.sha256(args.model.read_bytes()).hexdigest(),
              'rest_mesh_sha256': baseline, 'missing_facial_keys': missing,
              'model_height': h, 'axis_convention': 'front -Y; anatomical left +X; up +Z',
              'renders': [], 'visual_identity_audit': 'pending; geometry invariance alone does not prove resemblance'}
    def save_report():
        (args.out / 'render-manifest.json').write_text(json.dumps(report, ensure_ascii=False, indent=2))
    save_report()
    bpy.ops.wm.save_as_mainfile(filepath=str(args.out / 'mira-reference-studio.blend'))
    if args.setup_only:
        print('SETUP_ONLY: actual model loaded; no completed reference renders claimed.')
        return
    for name, cam, expression, width, height in jobs:
        face_controls(meshes, expression)
        bpy.context.view_layer.update()
        assert digest_meshes(meshes) == baseline, 'Rest mesh changed between views'
        scene.camera = cameras[cam]
        scene.render.resolution_x, scene.render.resolution_y = width, height
        path = args.out / (name + '.png')
        scene.render.filepath = str(path)
        bpy.ops.render.render(write_still=True)
        report['renders'].append({'file': path.name, 'camera': cam, 'type': 'ORTHO',
                                  'expression': expression, 'size': [width, height],
                                  'rest_mesh_sha256': baseline})
        save_report()
    face_controls(meshes)
    scene.camera = cameras['01-front']
    report['status'] = 'body_preview_only' if args.body_only else 'rendered_pending_visual_audit'
    save_report()
    bpy.ops.wm.save_as_mainfile(filepath=str(args.out / 'mira-reference-studio.blend'))


if __name__ == '__main__':
    main()
