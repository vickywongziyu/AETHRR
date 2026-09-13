import bpy,json,numpy as np,hashlib
R='/Users/ziyu/Project/Codex6 3d';OUT=R+'/outputs/atlas/refinement-v24';bpy.ops.wm.open_mainfile(filepath=OUT+'/aether-groves-refined.blend');report=json.load(open(OUT+'/grove-verification.json'))
names=[g['name']+' '+kind for g in report['groves'] for kind in ['trees','canopy']];dst={name:bpy.data.objects[name] for name in names}
with bpy.data.libraries.load(R+'/outputs/aether/aether-archipelago.blend',link=False) as (source,target):target.objects=list(names)
old={name:ob for name,ob in zip(names,target.objects)};checks=[]
for grove in report['groves']:
 n=grove['treeCount'];deltas={row['tree']:np.array(row['translation']) for row in grove['trees']}
 for kind,stride in [('trees',88),('canopy',4080)]:
  name=grove['name']+' '+kind;a,b=old[name].data,dst[name].data;assert len(a.vertices)==len(b.vertices);assert len(a.polygons)==len(b.polygons)
  ia=np.empty(len(a.loops),dtype=np.int32);ib=np.empty(len(b.loops),dtype=np.int32);a.loops.foreach_get('vertex_index',ia);b.loops.foreach_get('vertex_index',ib);assert np.array_equal(ia,ib)
  pa=np.empty(len(a.vertices)*3);pb=np.empty(len(b.vertices)*3);a.vertices.foreach_get('co',pa);b.vertices.foreach_get('co',pb);pa=pa.reshape(-1,3);pb=pb.reshape(-1,3);prefix=len(pa)-n*stride;assert np.array_equal(pa[:prefix],pb[:prefix]);error=0
  for i in range(n):error=max(error,float(np.abs(pb[prefix+i*stride:prefix+(i+1)*stride]-pa[prefix+i*stride:prefix+(i+1)*stride]-deltas[i]).max()))
  assert error<.00001
  checks.append({'mesh':name,'sameTopology':True,'untouchedVineVertices':prefix,'maxRigidTranslationError':error,'vertices':len(pa)})
report['independentNativeChecks']=checks;report['sourceSha256']=hashlib.sha256(open(R+'/outputs/aether/aether-archipelago.blend','rb').read()).hexdigest();open(OUT+'/grove-verification.json','w').write(json.dumps(report,indent=2));print('NATIVE_RIGID_GROVES_PASS',checks)
