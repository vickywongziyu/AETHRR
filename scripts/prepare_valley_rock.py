import bpy
from pathlib import Path
root=Path(__file__).resolve().parents[1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(root/'public/assets/valley/boulder/model.gltf'))
for obj in list(bpy.context.scene.objects):
    if obj.type=='MESH':
        bpy.context.view_layer.objects.active=obj
        mod=obj.modifiers.new('Web optimized scan','DECIMATE');mod.ratio=.18
        bpy.ops.object.modifier_apply(modifier=mod.name)
        for poly in obj.data.polygons:poly.use_smooth=True
bpy.ops.export_scene.gltf(filepath=str(root/'public/assets/valley/granite-scan.glb'),export_format='GLB')
print('VALLEY_ROCK_READY')
