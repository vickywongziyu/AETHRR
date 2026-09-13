"""Geometric regression: interiors are enclosed and terrain stays below occupied floors."""
import bpy,json,math
from mathutils import Vector
from mathutils.bvhtree import BVHTree
ROOT='/Users/ziyu/Project/Codex6 3d';s=next(s for s in bpy.data.scenes if s.name.startswith('HIGHLAND ·'));bpy.context.window.scene=s
records=json.loads(s['building_records'])
def tree(kinds):
 vv=[];ff=[]
 for ob in s.objects:
  if ob.type!='MESH' or ob.data.materials[0].name.removeprefix('HC ').split('.')[0] not in kinds:continue
  start=len(vv);vv.extend([ob.matrix_world@v.co for v in ob.data.vertices]);ff.extend([tuple(start+i for i in f.vertices) for f in ob.data.polygons])
 return BVHTree.FromPolygons(vv,ff)
wood=tree(['wood']);cloth=tree(['ivory']);terrain=tree(['rock','ground']);report=[]
def hit(bvh,start,direction,limit,label):
 q=bvh.ray_cast(Vector(start),Vector(direction),limit)
 assert q[0] is not None,label
 return round(q[3],3)
for i,r in enumerate(records):
 x,y,z=r['x'],r['y'],r['z'];checks={}
 if r['kind']=='house':
  w,d=r['w'],r['d']
  for label,direction,limit in [('left',(-1,0,0),w/2+.4),('right',(1,0,0),w/2+.4),('back',(0,1,0),d/2+.4),('roof',(0,0,1),r['h']+4),('floor',(0,0,-1),2)]:checks[label]=hit(wood,(x,y,z+1.5),direction,limit,f'house {i} missing {label}')
  for sign in [-1,1]:checks['gable'+str(sign)]=hit(wood,(x,y,z+r['h']+1),(0,sign,0),d/2+.7,f'house {i} missing gable')
  checks['lintel']=hit(wood,(x,y,z+3.2),(0,-1,0),d/2+.7,f'house {i} missing lintel')
  sx=w/2-.4;sy=d/2-.4
 else:
  for label,direction in [('left',(-1,0,0)),('right',(1,0,0)),('back',(0,1,0)),('roof',(0,0,1))]:checks[label]=hit(cloth,(x,y,z+1.2),direction,r['h']+1,f'tent {i} missing {label}')
  checks['floor']=hit(wood,(x,y,z+1.2),(0,0,-1),1.3,f'tent {i} missing floor');sx=sy=r['r']-.15
  assert wood.ray_cast(Vector((x,y-r['r']-.25,z+1.4)),Vector((0,1,0)),1.5)[0] is None,f'tent {i} pole obstructs doorway'
  checks['doorway_clear']=True
 max_h=-100
 for a in range(31):
  for b in range(31):
   dx=(a/30*2-1)*sx;dy=(b/30*2-1)*sy
   if r['kind']=='tent' and dx*dx+dy*dy>sx*sx:continue
   p=terrain.ray_cast(Vector((x+dx,y+dy,100)),Vector((0,0,-1)),200)[0]
   if p:max_h=max(max_h,p.z)
 assert max_h<z-.03,f'building {i} terrain enters interior: terrain {max_h}, floor {z}'
 report.append({'building':i,'kind':r['kind'],'ray_hits':checks,'minimum_floor_clearance':round(z-max_h,4)})
for i,a in enumerate(records):
 for b in records[i+1:]:
  x0,y0,x1,y1=a['rect'];u0,v0,u1,v1=b['rect']
  assert x1<=u0 or u1<=x0 or y1<=v0 or v1<=y0,'Building footprints overlap'
routes=json.loads(s['bridge_routes'])
for route in routes:
 a,b=Vector(route['a']),Vector(route['b']);d=b-a;side=Vector((-d.y,d.x,0)).normalized()
 for i in range(101):
  for offset in [-.6,0,.6]:
   p=a.lerp(b,i/100)+side*(route['width']*offset)
   for r in records:
    x0,y0,x1,y1=r['rect']
    assert not(x0<p.x<x1 and y0<p.y<y1),'Bridge crosses building footprint: '+str((route,r['kind'],r['x'],r['y']))
json.dump({'passed':True,'buildings':report,'footprints_disjoint':True,'bridges_clear_of_buildings':len(routes)},open(ROOT+'/outputs/highland/structure-verification.json','w'),indent=2)
print('STRUCTURES_VERIFIED',len(report),'enclosed interiors, dense terrain checks and disjoint footprints')
