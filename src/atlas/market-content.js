import {CRAFT_GOODS} from './profession-content.js';
import {FURNITURE} from './housing-content.js';
export const MARKET_KEY='aether.market.v1';
export const SHOPS=[
 {id:'provisions',name:'山风杂货铺',subtitle:'食物与旅途用品',x:-5,y:-11.8,yaw:Math.PI/2,kind:'goods',color:'cloth'},
 {id:'apothecary',name:'银铃药房',subtitle:'药草与玻璃器皿',x:-5,y:-4.9,yaw:Math.PI/2,kind:'herbs',color:'leather'},
 {id:'vault',name:'山城保管库',subtitle:'旅人物品寄存',x:5,y:-11.8,yaw:-Math.PI/2,kind:'vault',color:'red'},
 {id:'courier',name:'五境驿站',subtitle:'行会委托与货运',x:5,y:-4.9,yaw:-Math.PI/2,kind:'post',color:'paper'},
];
export const GOODS=[{id:'bread',name:'山麦面包',price:3,sell:1,shop:'provisions'},{id:'tea',name:'松针茶',price:5,sell:2,shop:'provisions'},{id:'lantern',name:'铜皮旅行灯',price:12,sell:6,shop:'provisions'},{id:'tonic',name:'银铃草露',price:8,sell:4,shop:'apothecary'},{id:'vial',name:'空玻璃瓶',price:2,sell:1,shop:'apothecary'},...CRAFT_GOODS,...FURNITURE.filter(f=>f.id!=='lantern').map(f=>({...f,shop:'provisions'}))];
export const DELIVERY_REGIONS=['aether','highland','forest','watercourt','valley'];
