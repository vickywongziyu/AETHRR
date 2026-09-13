import * as T from 'three';
// North is -Z. These same bounds drive both the orthographic atlas and live markers.
export const MAP_BOUNDS={world:{x:390,z:-165,size:1150},aether:{x:0,z:0,size:245},highland:{x:0,z:153,size:190},forest:{x:430,z:94,size:260},watercourt:{x:100,z:-511,size:225},valley:{x:790,z:110,size:280}};
export function mapPoint(point,bounds){return{x:50+(point.x-bounds.x)/bounds.size*100,y:50+(point.z-bounds.z)/bounds.size*100};}
export function nearestMap(point){return Object.entries(MAP_BOUNDS).sort((a,b)=>Math.hypot(point.x-a[1].x,point.z-a[1].z)-Math.hypot(point.x-b[1].x,point.z-b[1].z))[0][0];}
// Offline asset capture only. Rendering state and object visibility are always restored.
export function captureMap(world,id,size=1024){
 const b=MAP_BOUNDS[id],{scene,renderer}=world,camera=new T.OrthographicCamera(-b.size/2,b.size/2,b.size/2,-b.size/2,.1,1200);
 camera.position.set(b.x,450,b.z);camera.up.set(0,0,-1);camera.lookAt(b.x,0,b.z);camera.updateMatrixWorld();
 const target=new T.WebGLRenderTarget(size,size);target.texture.colorSpace=T.SRGBColorSpace;
 const previous={fog:scene.fog,background:scene.background,target:renderer.getRenderTarget(),tone:renderer.toneMappingExposure},visible=[];
 const fill=new T.AmbientLight('#e6e5ef',1.4);scene.add(fill);
 try{scene.fog=null;scene.background=new T.Color('#172b3b');renderer.toneMappingExposure=1.1;
 scene.traverse(o=>{if(o.isPoints||o.isSprite){visible.push([o,o.visible]);o.visible=false;}});
 // Atlas culls remote roots in its animation loop; the capture is synchronous.
 for(const r of world.atlas.regions)if(r.root){visible.push([r.root,r.root.visible]);r.root.visible=true;}
 for(const o of scene.children)if(o.type==='Group'&&!o.visible){visible.push([o,o.visible]);o.visible=true;}
 renderer.setRenderTarget(target);renderer.render(scene,camera);
 const pixels=new Uint8Array(size*size*4);renderer.readRenderTargetPixels(target,0,0,size,size,pixels);
 const canvas=document.createElement('canvas');canvas.width=canvas.height=size;const ctx=canvas.getContext('2d'),data=ctx.createImageData(size,size);
 for(let y=0;y<size;y++)data.data.set(pixels.subarray((size-y-1)*size*4,(size-y)*size*4),y*size*4);ctx.putImageData(data,0,0);return canvas.toDataURL('image/png');
 }finally{renderer.setRenderTarget(previous.target);renderer.toneMappingExposure=previous.tone;scene.fog=previous.fog;scene.background=previous.background;visible.reverse().forEach(([o,v])=>o.visible=v);fill.removeFromParent();target.dispose();}
}
