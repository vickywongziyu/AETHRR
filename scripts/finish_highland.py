import bpy,json,math
from mathutils import Vector
ROOT='/Users/ziyu/Project/Codex6 3d'
s=next(s for s in bpy.data.scenes if s.name.startswith('HIGHLAND ·'));bpy.context.window.scene=s;s.frame_set(1)
assert len([o for o in s.objects if o.type=='MESH'])==11
assert all(o.data.color_attributes.get('Color') for o in s.objects if o.type=='MESH')
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=ROOT+'/outputs/highland/horncrest.blend',compress=True)
s.render.resolution_x=1080;s.render.resolution_y=720;s.cycles.samples=16;s.cycles.use_denoising=True;s.render.filepath=ROOT+'/outputs/highland/native-preview.png';bpy.ops.render.render(write_still=True)
print('HIGHLAND_NATIVE_VERIFIED',len(s.objects))
