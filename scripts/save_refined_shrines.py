"""Archive actual runtime shrine geometry in a separate background Blender file."""
from pathlib import Path
import bpy,json,math
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'outputs/atlas/refinement-v24'
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(OUT/'refined-shrines.glb'))
s=bpy.context.scene;s.name='AETHER · Refined shrine masonry V24';s['scope']='Three existing shrine structures with corrected stairs, grounded crystal posts and prior crafted interiors. Grove transplants are archived separately.';s['material_note']='Browser procedural stone shading is not baked into this editable PBR archive.'
s.world.color=(.20,.23,.24);s.render.engine='CYCLES';s.cycles.samples=32;s.render.resolution_x=1280;s.render.resolution_y=832;s.render.resolution_percentage=100
bpy.ops.object.light_add(type='SUN',location=(10,-20,60));sun=bpy.context.object;sun.name='Archive sunlight';sun.data.energy=2;sun.rotation_euler=(.5,-.4,-.7)
bpy.ops.object.camera_add(location=(-14,15,37));cam=bpy.context.object;cam.name='Sky garden masonry inspection';cam.rotation_euler=(Vector((-22,26,34))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.lens=42;s.camera=cam
meshes=[o for o in s.objects if o.type=='MESH'];assert len(meshes)>20
assert all(math.isfinite(v) for o in meshes for vert in o.data.vertices for v in vert.co)
bpy.ops.file.pack_all();bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'refined-shrines.blend'),compress=True)
report={'passed':True,'scene':s.name,'meshes':len(meshes),'vertices':sum(len(o.data.vertices) for o in meshes),'polygons':sum(len(o.data.polygons) for o in meshes),'packedImages':sum(bool(im.packed_file) for im in bpy.data.images),'file':'refined-shrines.blend'};(OUT/'shrine-native-verification.json').write_text(json.dumps(report,indent=2));print('REFINED_SHRINES_NATIVE_PASS',report)
