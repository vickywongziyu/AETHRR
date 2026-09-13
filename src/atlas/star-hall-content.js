// Fictional constellations of this world, expressed in its fixed sky coordinates.
export const STAR_CHARTS=[
 {id:'swan',name:'银翼座',az:32,el:58,color:'#d6eaff',points:[[-3,0],[0,0],[3,0],[0,-2],[0,2.8]],edges:[[0,1],[1,2],[3,1],[1,4]],text:'两翼横展，长颈指向高处。观星人把它记作穿过云海的第一只银鸟。'},
 {id:'crown',name:'山冠座',az:104,el:64,color:'#efdab1',points:[[-3,-1],[-2,2],[0,.4],[2,2],[3,-1],[-3,-1]],edges:[[0,1],[1,2],[2,3],[3,4],[4,0]],text:'三道尖峰与一条低弧，像角冠山城的屋脊。它是群岛夜航者辨认东方的图案。'},
 {id:'seed',name:'月籽座',az:-42,el:72,color:'#dfc7f2',points:[[-2,-1],[0,-2],[2,-1],[2,1],[0,2.5],[-2,1]],edges:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,0]],text:'六颗亮星围成一粒种子。林间的藏书人相信，所有远行都从这样微小的光开始。'},
];
export const STAR_TOLERANCE=1.5;
export const STAR_HOLD_SECONDS=1.6;
export function angularError(az,el,chart){const d=Math.PI/180;return Math.acos(Math.min(1,Math.max(-1,Math.sin(el*d)*Math.sin(chart.el*d)+Math.cos(el*d)*Math.cos(chart.el*d)*Math.cos((az-chart.az)*d))))/d;}
