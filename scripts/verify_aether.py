import bpy,json,os
scene=next(s for s in bpy.data.scenes if s.name.startswith('AETHER ·'));bpy.context.window.scene=scene
assert scene.camera and scene.camera.animation_data
assert scene.frame_end==720 and scene.render.fps==24
floating=[o for o in scene.objects if o.get('floating')]
assert len(floating)==20 and all(o.animation_data for o in floating)
falls=[o for o in scene.objects if o.name.startswith('Waterfall')]
assert len(falls)==5
assert falls[0].data.materials[0].node_tree.animation_data
assert sum(1 for i in bpy.data.images if i.packed_file)>=4
assert any('individual foliage' in o.data.name for o in scene.objects if o.type=='MESH')
birds=[o for o in scene.objects if o.type=='EMPTY' and o.name.startswith('Motion bird')]
assert len(birds)==9 and all(o.animation_data for o in birds)
wing=next(o for o in scene.objects if o.name.startswith('Motion bird wing'));scene.frame_set(1);wa=list(wing.rotation_euler);scene.frame_set(7);assert wa!=list(wing.rotation_euler)
crystal=next(m for m in bpy.data.materials if m.name.startswith('AE crystal'));assert crystal.node_tree.nodes.get('Principled BSDF').inputs['Transmission Weight'].default_value==1
camera=scene.camera;scene.frame_set(1);a=list(camera.location);scene.frame_set(361);b=list(camera.location);assert a!=b
scene.frame_set(1)
report={'verified':True,'scenes_in_file':len(bpy.data.scenes),'objects':len(scene.objects),'floating_islands':len(floating),'waterfalls':len(falls),'camera_at_frame_1':a,'camera_at_frame_361':b,'duration_seconds':30,'native_water_animation':True,'articulated_birds':9,'transparent_crystal':True}
print('AETHER_NATIVE_VERIFIED',json.dumps(report))
open('/Users/ziyu/Project/Codex6 3d/outputs/aether/native-verification.json','w').write(json.dumps(report,indent=2))
