export const PROFESSIONS={aether:'星砂熔制',highland:'山城铜作',forest:'月桂药剂',watercourt:'晨露陶艺',valley:'雪线木作',kitchen:'旅舍烹饪'};
export const CRAFT_GOODS=[
 {id:'moon-seed',name:'月桂种子包',sell:0,shop:null},
 {id:'wheat-seed',name:'山麦种子包',sell:0,shop:null},
 {id:'grain',name:'山麦粒',price:1,sell:0,shop:'provisions'},
 {id:'ore',name:'铜矿碎块',price:1,sell:0,shop:'provisions'},
 {id:'fuel',name:'木炭包',price:1,sell:0,shop:'provisions'},
 {id:'sand',name:'石英砂',price:1,sell:0,shop:'provisions'},
 {id:'roughwood',name:'干燥原木',price:1,sell:0,shop:'provisions'},
 {id:'clay',name:'细陶土',price:1,sell:0,shop:'provisions'},
 {id:'cloth-bolt',name:'厚织布',price:2,sell:1,shop:'provisions'},
 {id:'nails',name:'铁钉包',price:1,sell:0,shop:'provisions'},
 {id:'flour',name:'山麦粉',price:1,sell:0,shop:'provisions'},
 {id:'water',name:'净水罐',price:1,sell:0,shop:'provisions'},
 {id:'pine',name:'干松针',price:2,sell:1,shop:'apothecary'},
 {id:'herb-pack',name:'药房干草包',price:2,sell:1,shop:'apothecary'},
 {id:'glass',name:'星砂玻璃片',sell:1,shop:null},
 {id:'ingot',name:'山风铜锭',sell:1,shop:null},
 {id:'timber',name:'刨光木料',sell:0,shop:null},
 {id:'ceramic',name:'百合陶坯',sell:1,shop:null},
 {id:'extract',name:'月桂浸液',sell:3,shop:null},
];
export const RECIPES=[
 {id:'moon-seeds',site:'forest',name:'拣选月桂籽',level:1,input:{'herb-pack':2},output:{'moon-seed':3}},
 {id:'wheat-seeds',site:'forest',name:'拣选山麦籽',level:1,input:{grain:1},output:{'wheat-seed':3}},
 {id:'charcoal',site:'valley',name:'烧制木炭',level:1,input:{roughwood:1},output:{fuel:3}},
 {id:'flour',site:'kitchen',name:'磨制山麦粉',level:1,input:{grain:1},output:{flour:2}},
 {id:'glass',site:'aether',name:'熔制星砂玻璃',level:1,input:{sand:2,fuel:1},output:{glass:2}},
 {id:'vials',site:'aether',name:'吹制空玻璃瓶',level:2,input:{glass:1},output:{vial:2}},
 {id:'ingots',site:'highland',name:'熔炼山风铜锭',level:1,input:{ore:2,fuel:1},output:{ingot:2}},
 {id:'lamp',site:'highland',name:'组装铜皮旅行灯',level:2,input:{ingot:1,glass:1,timber:1},output:{lantern:1}},
 {id:'extract',site:'forest',name:'研制月桂浸液',level:1,input:{'herb-pack':2,vial:1},output:{extract:1}},
 {id:'tonic',site:'forest',name:'调制银铃草露',level:2,input:{extract:1,water:1},output:{tonic:1}},
 {id:'ceramic',site:'watercourt',name:'塑成百合陶坯',level:1,input:{clay:2},output:{ceramic:1}},
 {id:'planter',site:'watercourt',name:'栽制月桂盆栽',level:2,input:{ceramic:1,'herb-pack':1},output:{planter:1}},
 {id:'timber',site:'valley',name:'刨制木料',level:1,input:{roughwood:1},output:{timber:2}},
 {id:'stool',site:'valley',name:'制作软垫木凳',level:2,input:{timber:2,'cloth-bolt':1},output:{stool:1}},
 {id:'table',site:'valley',name:'制作旅人边桌',level:3,input:{timber:4,nails:2},output:{'side-table':1}},
 {id:'bread',site:'kitchen',name:'烘烤山麦面包',level:1,input:{flour:2,water:1},output:{bread:3}},
 {id:'tea',site:'kitchen',name:'冲泡松针茶',level:1,input:{pine:1,water:1},output:{tea:2}},
];
export const EFFECTS={
 bread:{name:'饱足',text:'材料配方制作时间缩短 25%',duration:300000},
 tea:{name:'凝神',text:'钓鱼咬钩后的收竿时间增加 2 秒',duration:300000},
 tonic:{name:'草木亲和',text:'采集时间由 0.9 秒缩短为 0.6 秒',duration:300000},
};
export const APPRENTICE_KIT={ore:4,fuel:4,sand:4,roughwood:3,clay:4,'herb-pack':5,vial:2,flour:4,water:5,pine:2,'cloth-bolt':1,nails:2};
export const professionLevel=xp=>Math.min(5,1+Math.floor((xp||0)/2));

export const recipeDuration=(xp,wellFed=false)=>3000*(1-(professionLevel(xp)-1)*.05)*(wellFed?.75:1);
