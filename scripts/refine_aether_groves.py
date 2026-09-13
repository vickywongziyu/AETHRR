"""Rigidly transplant original trees; preserve every trunk, leaf and old source file."""
import bpy, json, math, os
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
R='/Users/ziyu/Project/Codex6 3d'; OUT=R+'/outputs/atlas/refinement-v24';os.makedirs(OUT,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=R+'/outputs/aether/aether-archipelago.blend')
scene=bpy.context.scene;scene.frame_set(1);report={'source':'outputs/aether/aether-archipelago.blend','groves':[]};selected=[]
for name,cx,cy,z,r,count in [('Sky garden',-22,26,32,7,16),('Observatory',0,62,47,6,8)]:
 tree=bpy.data.objects[name+' trees'];canopy=bpy.data.objects[name+' canopy'];terrace=bpy.data.objects[name+' terrace'];assert len(tree.data.vertices)==count*88
 tp=np.empty(len(tree.data.vertices)*3);tree.data.vertices.foreach_get('co',tp);tp=tp.reshape(-1,3)
 lp=np.empty(len(canopy.data.vertices)*3);canopy.data.vertices.foreach_get('co',lp);lp=lp.reshape(-1,3)
 prefix=len(lp)-count*4080;assert prefix==6630
 bvh=BVHTree.FromPolygons([v.co for v in terrace.data.vertices],[list(p.vertices) for p in terrace.data.polygons],all_triangles=False)
 center=np.array([cx,cy]);bases=[tp[i*88:i*88+8].mean(axis=0) for i in range(count)];candidates=[]
 for radius in np.arange(3.65,r-.32,.16):
  for angle in np.arange(0,2*math.pi,math.pi/96):
   xy=center+radius*np.array([math.cos(angle),math.sin(angle)]);hit=bvh.ray_cast(Vector((float(xy[0]),float(xy[1]),z+2)),Vector((0,0,-1)),4)[0]
   if hit is not None:candidates.append(np.array([xy[0],xy[1],hit.z+.07]))
 placed=[];rows=[];all_deltas={}
 # Place the largest crowns first; all vertices keep their pairwise distances.
 order=sorted(range(count),key=lambda i:tp[i*88+8:i*88+16,2].mean()-bases[i][2],reverse=True)
 def clear(points,base):
  # Structural steps have radius 3.1; keep every stump outside them.
  if np.linalg.norm(base[:2]-center)<3.5:return False
  near=points[(points[:,2]>z+.35)&(points[:,2]<z+5.2)]
  if len(near) and np.min(np.linalg.norm(near[:,:2]-center,axis=1))<2.23:return False
  if name=='Sky garden':
   # Existing portal's position and yaw; keep its real frame/veil clear.
   q=points[(points[:,2]>z)&(points[:,2]<z+5.4),:2]-np.array([-25.6,22.8]);co,si=math.cos(.66),math.sin(.66)
   x=q[:,0]*co+q[:,1]*si;y=-q[:,0]*si+q[:,1]*co
   if np.any((abs(x)<2.5)&(abs(y)<1.15)):return False
  else:
   # Telescope spiral base and upper platform at the same original position.
   q=points[points[:,2]>z,:2]-np.array([-4.1,59.7])
   if len(q) and np.min(np.linalg.norm(q,axis=1))<1.9:return False
  return True
 for i in order:
  base=bases[i];a,b=prefix+i*4080,prefix+(i+1)*4080;original=np.concatenate([tp[i*88:(i+1)*88],lp[a:b]])
  assert np.linalg.norm(lp[a:b,:2].mean(axis=0)-base[:2])<1.5,'Leaf ownership differs from original builder'
  options=sorted(candidates,key=lambda p:float(np.sum((p-base)**2)))
  chosen=None
  for p in options:
   if any(np.linalg.norm(p[:2]-q[:2])<.8 for q in placed):continue
   delta=p-base
   if clear(original+delta,p):chosen=p;break
  assert chosen is not None,'No safe tree placement for '+name+' '+str(i)
  delta=chosen-base;tp[i*88:(i+1)*88]+=delta;lp[a:b]+=delta;placed.append(chosen);all_deltas[i]=delta
  shifted=original+delta;near=shifted[(shifted[:,2]>z+.35)&(shifted[:,2]<z+5.2)]
  rows.append({'tree':i,'from':base.tolist(),'to':chosen.tolist(),'translation':delta.tolist(),'minimumShrineClearance':float(np.min(np.linalg.norm(near[:,:2]-center,axis=1))) if len(near) else None,'vertices':len(original)})
 tree.data.vertices.foreach_set('co',tp.ravel());canopy.data.vertices.foreach_set('co',lp.ravel());tree.data.update();canopy.data.update()
 # Verify unchanged topology and rigid per-tree displacement, including leaves.
 assert len(tree.data.vertices)==count*88 and len(canopy.data.vertices)==prefix+count*4080
 for i in range(count):
  a,b=prefix+i*4080,prefix+(i+1)*4080;points=np.concatenate([tp[i*88:(i+1)*88],lp[a:b]])
  assert clear(points,bases[i]+all_deltas[i])
 selected.extend([tree,canopy]);report['groves'].append({'name':name,'treeCount':count,'leafCount':len(lp)//5,'retainedVineVertices':prefix,'trees':sorted(rows,key=lambda row:row['tree'])})
# Save a distinct native archive; never edit the original scenery project.
scene['grove_refinement_v24']=json.dumps(report);bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=OUT+'/aether-groves-refined.blend',compress=True)
bpy.ops.object.select_all(action='DESELECT')
for ob in selected:ob.select_set(True)
bpy.context.view_layer.objects.active=selected[0]
asset=R+'/public/aether/refined-groves-v24.glb'
bpy.ops.export_scene.gltf(filepath=asset,export_format='GLB',use_selection=True,export_animations=False,export_extras=False,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6,export_draco_position_quantization=16,export_draco_normal_quantization=12,export_draco_color_quantization=12)
report['assetBytes']=os.path.getsize(asset);report['passed']=True
open(OUT+'/grove-verification.json','w').write(json.dumps(report,indent=2))
print('GROVE_REFINEMENT_PASS',report['assetBytes'],sum(g['treeCount'] for g in report['groves']))
