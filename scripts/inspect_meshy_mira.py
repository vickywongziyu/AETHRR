"""Native orthographic inspection of a real Meshy export, preserving its shape."""
import bpy,sys,argparse,runpy,json,hashlib
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('--model',type=Path,required=True);p.add_argument('--out',type=Path,required=True);a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);a.out.mkdir(parents=True,exist_ok=True)
scene=bpy.data.scenes.new('Mira · Meshy native inspection');bpy.context.window.scene=scene
bpy.ops.import_scene.gltf(filepath=str(a.model.resolve()))
meshes=[o for o in scene.objects if o.type=='MESH']
studio=runpy.run_path(str(ROOT/'scripts/render_mira_reference_master.py'),run_name='mira_meshy_studio')
origin=bpy.data.objects.new('Mira · common model frame',None);scene.collection.objects.link(origin)
for o in list(scene.objects):
 if o!=origin and o.parent is None:o.parent=origin
lo,hi=studio['bounds'](meshes);origin.scale*=1.74/(hi.z-lo.z);bpy.context.view_layer.update();lo,hi=studio['bounds'](meshes);origin.location=(-(lo.x+hi.x)/2,-(lo.y+hi.y)/2,-lo.z);bpy.context.view_layer.update()
studio['configure_white_studio'](scene,1.74);scene.cycles.samples=24
report={'source':str(a.model),'sourceSha256':hashlib.sha256(a.model.read_bytes()).hexdigest(),'meshCount':len(meshes),'vertices':sum(len(o.data.vertices) for o in meshes),'polygons':sum(len(o.data.polygons) for o in meshes),'textures':[],'armatures':len([o for o in scene.objects if o.type=='ARMATURE']),'morphs':{o.name:[k.name for k in o.data.shape_keys.key_blocks] for o in meshes if o.data.shape_keys},'accepted':False}
for i in bpy.data.images:
 if i.type=='IMAGE' and i.size[0]:report['textures'].append({'name':i.name,'size':list(i.size)})
jobs=[('front',(0,-6,.89),(0,0,.89),2.05,768,1024),('back',(0,6,.89),(0,0,.89),2.05,768,1024),('threequarter',(-4.24,-4.24,.89),(0,0,.89),2.05,768,1024),('face',(0,-6,1.58),(0,0,1.58),.50,768,768)]
for name,pos,target,scale,w,h in jobs:
 scene.camera=studio['camera'](scene,'Mira Meshy · '+name,pos,target,scale);scene.render.resolution_x=w;scene.render.resolution_y=h;scene.render.filepath=str(a.out/(name+'.png'));bpy.ops.render.render(write_still=True)
(a.out/'inspection.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print('MESHY_INSPECTION',json.dumps(report))
