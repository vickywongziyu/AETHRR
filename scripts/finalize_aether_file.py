import bpy
scene=next(s for s in bpy.data.scenes if s.name.startswith('AETHER ·'))
bpy.context.window.scene=scene
scene.frame_set(1)
for screen in bpy.data.screens:
 for area in screen.areas:
  if area.type=='VIEW_3D':
   area.spaces.active.region_3d.view_perspective='CAMERA'
   area.spaces.active.shading.type='MATERIAL'
   area.spaces.active.overlay.show_overlays=False
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath='/Users/ziyu/Project/Codex6 3d/outputs/aether/aether-archipelago.blend',compress=True)
print('AETHER_EDITABLE_PROJECT_SAVED')
