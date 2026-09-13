import bpy,json,os
scene=bpy.context.scene
assert scene.camera is not None
assert len(scene.objects)>1400
assert bpy.data.objects.get('Portal animated energy') is not None
petal=next(o for o in scene.objects if o.name.startswith('Drifting petal'))
scene.frame_set(1);a=tuple(petal.evaluated_get(bpy.context.evaluated_depsgraph_get()).location)
scene.frame_set(180);b=tuple(petal.evaluated_get(bpy.context.evaluated_depsgraph_get()).location)
assert a!=b
assert scene.camera.animation_data and scene.camera.animation_data.action
scene.frame_set(1)
print('BLENDER_VERIFIED',json.dumps({'scenes':[s.name for s in bpy.data.scenes],'objects':len(scene.objects),'camera':scene.camera.name,'petal_frame1':a,'petal_frame180':b,'animation':[scene.frame_start,scene.frame_end,scene.render.fps]}))

import sys
if '--finalize' in sys.argv:
 for obj in scene.objects:
  if obj.name.startswith('Drifting petal') and obj.animation_data:
   for curve in obj.animation_data.drivers:
    if curve.data_path=='location' and curve.array_index==2:
     curve.driver.expression=curve.driver.expression.replace('frame/90','(frame-1)/60')
 scene.frame_set(1)
 bpy.ops.wm.save_as_mainfile(filepath=bpy.data.filepath,compress=True)
