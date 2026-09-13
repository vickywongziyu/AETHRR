export const RESOURCE_TYPES={
 sand:{name:'星砂床',verb:'筛取石英砂',tool:'筛砂',item:'sand',yield:3,duration:2600,cooldown:180000,color:'#dfcfa1',hint:'石英砂可在晶石圣所熔制玻璃。'},
 ore:{name:'山风铜矿脉',verb:'开采铜矿',tool:'采矿',item:'ore',yield:3,duration:3000,cooldown:180000,color:'#bd8351',hint:'铜矿碎块可在山风铜作坊熔炼。'},
 wood:{name:'雪线作业松',verb:'伐取原木',tool:'伐木',item:'roughwood',yield:3,duration:3400,cooldown:240000,color:'#b68d65',hint:'原木可刨成木料，也可在炭窑烧制木炭。'},
 herb:{name:'月桂药圃',verb:'采收药草',tool:'药草',item:'herb-pack',yield:3,duration:2400,cooldown:180000,color:'#ad8ec0',hint:'采好的药草包可在月桂药草台研制浸液。'},
 clay:{name:'晨露陶土层',verb:'挖取陶土',tool:'掘土',item:'clay',yield:3,duration:2600,cooldown:180000,color:'#bb9981',hint:'陶土可在晨露陶作台塑成陶坯。'},
 water:{name:'前湾澄水泵',verb:'装满净水罐',tool:'取水',item:'water',yield:3,duration:2000,cooldown:60000,color:'#94c4c7',hint:'净水用于厨房烹饪和药草调制。'},
 pine:{name:'松针采收丛',verb:'采收松针',tool:'药草',item:'pine',yield:2,duration:2200,cooldown:180000,color:'#89a080',hint:'松针配上净水，可以在旅舍厨房泡茶。'},
 grain:{name:'山麦梯田',verb:'收割山麦',tool:'农事',item:'grain',yield:3,duration:2800,cooldown:240000,color:'#d2b576',hint:'山麦先磨成面粉，再在厨房烘烤面包。'},
};
// Stable IDs keep depletion timers independent of lazy-loading order. World XZ
// for shore sites; Aether nodes are located on the actual named floating terrace.
export const RESOURCE_SITES=[
 {id:'sand-garden',place:'云上花园',region:'aether',kind:'sand',surface:'Sky_garden_terrace',offset:[3,2]},
 {id:'sand-drift',place:'漂流岩台',region:'aether',kind:'sand',surface:'Drifting_rock_terrace',offset:[1,0]},
 {id:'ore-west',place:'西坡露头',region:'highland',kind:'ore',xz:[-18,131]},
 {id:'ore-east',place:'东坡露头',region:'highland',kind:'ore',xz:[18,139]},
 {id:'grain-terrace',place:'山城下层田圃',region:'highland',kind:'grain',xz:[18,123]},
 {id:'herb-bank',place:'林间河岸',region:'forest',kind:'herb',xz:[444,147]},
 {id:'herb-grove',place:'林荫药圃',region:'forest',kind:'herb',xz:[448,159]},
 {id:'clay-west',place:'西岸土层',region:'watercourt',kind:'clay',xz:[63,-465]},
 {id:'clay-east',place:'东岸浅滩',region:'watercourt',kind:'clay',xz:[106,-477]},
 {id:'water-quay',place:'前湾步道',region:'watercourt',kind:'water',xz:[116,-439.12],quay:true},
 {id:'wood-bank',place:'河岸作业点',region:'valley',kind:'wood',xz:[824,181]},
 {id:'wood-ridge',place:'林坡作业点',region:'valley',kind:'wood',xz:[828,165]},
 {id:'pine-bank',place:'松林河湾',region:'valley',kind:'pine',xz:[812,185]},
];
export const RESOURCE_SKILLS=[...new Set(Object.values(RESOURCE_TYPES).map(r=>r.tool))];
export const resourceLevel=xp=>Math.min(5,1+Math.floor((xp||0)/5));
export const resourceDuration=(kind,xp=0,tonic=false)=>RESOURCE_TYPES[kind].duration*(1-(resourceLevel(xp)-1)*.04)*(tonic&&['herb','pine','grain'].includes(kind)?.75:1);
