import {drawEmblem} from './discovery-art.js';

// Canvas text never interprets markup. Limit the excerpt; the folio keeps the full text.
export function wishExcerpt(text,columns=7,rows=7){
 const chars=Array.from(String(text).replace(/\s+/gu,' ').trim()),limit=columns*rows;
 if(chars.length>limit)chars.splice(limit-1,chars.length,'…');
 const lines=[];for(let i=0;i<chars.length;i+=columns)lines.push(chars.slice(i,i+columns).join(''));
 return lines;
}
export function drawWishPaper(canvas,wish){
 canvas.width=256;canvas.height=448;const c=canvas.getContext('2d');
 const wash=c.createLinearGradient(0,0,256,448);wash.addColorStop(0,'#eddfbd');wash.addColorStop(.6,'#d9c9a5');wash.addColorStop(1,'#c3ab83');c.fillStyle=wash;c.fillRect(0,0,256,448);
 for(let i=0;i<2300;i++){c.fillStyle=i%2?'#765c3520':'#fff9df2a';c.fillRect((i*71.23)%256,(i*37.33)%448,1+(i%3),.6);}
 c.strokeStyle='#8b795157';c.lineWidth=1;c.strokeRect(17,18,222,410);c.strokeRect(21,22,214,402);
 c.strokeStyle='#64745c';drawEmblem(c,'watercourt',128,70,23);
 c.fillStyle='#594b36';c.textAlign='center';c.font='23px "Kaiti SC","Songti SC",serif';
 wishExcerpt(wish.text).forEach((line,i)=>c.fillText(line,128,131+i*33,198));
 c.strokeStyle='#90764f6b';c.beginPath();c.moveTo(62,363);c.lineTo(194,363);c.stroke();
 c.font='16px "Kaiti SC","Songti SC",serif';c.fillStyle='#715e42';
 const signature=Array.from(wish.name||'无名旅人');c.fillText(signature.length>10?signature.slice(0,9).join('')+'…':signature.join(''),128,390,200);
 return canvas;
}
