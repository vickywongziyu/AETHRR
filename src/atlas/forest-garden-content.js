export const GARDEN_BEDS=['west-1','west-2','west-3','east-1','east-2','east-3'];
export const GARDEN_CROPS=[
 {id:'moonleaf',name:'月桂',seed:'moon-seed',yield:{'herb-pack':3},duration:45000,color:'#a9c496',flower:'#d7abdf',text:'枝间的小花成熟后，可连同叶片晒成药草包，用于浸液、草露与盆栽。'},
 {id:'wheat',name:'山麦',seed:'wheat-seed',yield:{grain:3},duration:60000,color:'#a6b672',flower:'#d9bf7b',text:'谷粒可以磨粉烘成口粮，也能拣选下一轮播种的种子。'},
];
export const GARDEN_BUILDINGS=[
 {id:'glasshouse',name:'月桂育苗温室',x:-9,z:-6,yaw:0,w:9,d:13,h:3.2,rooms:['育苗长厅']},
 {id:'herbarium',name:'紫叶药草馆',x:7,z:-1,yaw:-Math.PI/2,w:9,d:11,h:3.6,rooms:['药草工坊','林间标本室']},
];
