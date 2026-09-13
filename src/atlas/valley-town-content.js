export const VALLEY_TOWN_BUILDINGS=[
 {id:'hall',name:'北境驿务厅',x:0,z:-12,yaw:0,w:9,d:11,h:4.3,rise:2.8,rooms:['驿务大厅','路图室']},
 {id:'lodge',name:'雪炉会馆',x:-12,z:0,yaw:Math.PI/2,w:9,d:11,h:3.9,rise:2.7,rooms:['炉边食堂','旅人寝室']},
 {id:'storehouse',name:'雪松货栈',x:13,z:0,yaw:-Math.PI/2,w:8.5,d:9,h:4.0,rise:2.6,rooms:['交货柜台','公共保管库']},
];
export const VALLEY_ORDERS=[
 {id:'winter-fuel',name:'为雪夜备柴',text:'驿务厅正在为夜间路标和会馆炉火储备燃料。原木可以在老木屋旁的炭窑制炭，也能在木作台加工。',input:{fuel:3,timber:2},coins:12},
 {id:'road-provisions',name:'给长路留一餐',text:'下一批行旅需要能随身携带的口粮。采山麦、取水，在旅舍磨粉、烘烤，再用松针泡茶。',input:{bread:3,tea:2},coins:16},
 {id:'waylights',name:'让归路亮起来',text:'为北境的新路灯备好玻璃和铜件。驿站会将一盏旅行灯留给你，作为共同修整归路的纪念。',input:{glass:2,ingot:2},coins:20,reward:{lantern:1}},
];
