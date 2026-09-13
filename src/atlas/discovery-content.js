// Editable website content. Empty contact values intentionally display as
// “待填写”; never publish a made-up email, handle or personal credential.
export const CONTACT={name:'ZIYU',heading:'写给旅人的回信',intro:'谢谢你走进这片小小世界。愿下一段旅途，我们仍有机会相遇。',entries:[
 {label:'邮箱',kind:'email',value:''},
 {label:'微信',kind:'text',value:''},
 {label:'社交主页',kind:'url',value:''},
]};
export const DISCOVERIES=[
 {id:'highland-letter',region:'highland',title:'留给旅人的信',seal:'回信',match:'山城木屋 01',clue:'牛角山城的第一间木屋，灯下的书桌上留着一封信。',body:'山风翻过屋檐，炉火仍替迟归的人留着温度。\n\n这封信通向这片世界的主人。打开它，留下下一次相遇的可能。',contact:true},
 {id:'aether-chart',region:'aether',title:'风的航图',seal:'风',match:'云上藏书亭',clue:'循着通往云上藏书亭的路，寻找石座上的蜡封。',body:'浮岛之间没有永远相同的风。\n\n旅人记下云影的位置，也记下自己曾停留的地方。水边那座远庭祈愿亭，收藏着来自五境的花。'},
 {id:'forest-page',region:'forest',title:'月下残页',seal:'月',match:'紫境遗迹',clue:'紫境光门旁，有一方低矮石座。残页藏在灯影之外。',body:'不必摘下所有星光，只带走一朵星露花。\n\n等到风、松、月、水与雪都在行囊里相遇，将它们的故事告诉远庭的水。'},
 {id:'watercourt-record',region:'watercourt',title:'旧月花谱',seal:'水',match:'旧月藏书亭',clue:'水庭的旧月藏书亭里，一册花谱摊在桌前。',body:'晴穗花记住天空，银铃花记住山路，星露花记住月色。\n晨露百合记住清水，雪绒花记住冬天。\n\n每种花采集一次，远庭祈愿亭便会为你留一个位置。'},
 {id:'valley-note',region:'valley',title:'雪线以南',seal:'雪',match:'北境旅人木屋',clue:'沿北境河谷寻找亮着灯的木屋，桌上有一卷未寄出的札记。',body:'大雪总会停。\n\n把走过的路折进纸里，把尚未说出的愿望留给远方。旅途没有终点时，也可以先写下一个新的开始。'},
];
export const FLOWER_REQUIREMENTS=[
 {id:'aether-flower',region:'aether',name:'晴穗花',place:'浮空群岛'},
 {id:'highland-flower',region:'highland',name:'银铃花',place:'牛角山城'},
 {id:'forest-flower',region:'forest',name:'星露花',place:'紫境森林'},
 {id:'watercourt-flower',region:'watercourt',name:'晨露百合',place:'精灵水庭'},
 {id:'valley-flower',region:'valley',name:'雪绒花',place:'北境河谷'},
];

// Optional hints reveal the exact location only when requested.
export const DISCOVERY_HINTS={
 'highland-letter':{riddle:'山风没有带走的，是一盏灯下等候的回信。',detail:'先看炉火，再找靠墙的书桌。封蜡上刻着屋檐。'},
 'aether-chart':{riddle:'风从石座间穿过，有人把方向留在纸上。',detail:'走进藏书亭，在水晶右侧的石座寻找罗盘纹章。'},
 'forest-page':{riddle:'光门照不到的地方，月亮留下了另一半。',detail:'沿光门旁的小径看向低石座，紫色蜡封就在卷角。'},
 'watercourt-record':{riddle:'旧月不记年月，只记得五种花开的方向。',detail:'旧月藏书亭的桌上有一枚百合蜡封；许愿台在另一座远庭祈愿亭。'},
 'valley-note':{riddle:'雪线以南，有一封信始终没有寄出。',detail:'找到亮灯的旅人木屋，桌上那卷带山脊纹章的札记尚未收起。'},
};
