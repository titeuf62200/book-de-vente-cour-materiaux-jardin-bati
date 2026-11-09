/* Atelier de croquis : dessin tactile et silhouettes, sans serveur ni API IA.
   Extension non destructive de l'éditeur historique du Book. */
(function(){
'use strict';
const Q=id=>document.getElementById(id);
const overlay=Q('sketchDrawCanvas'),base=Q('sketchCanvas');
if(!overlay||!base||!window.BookSketchEditor)return;
const ctx=overlay.getContext('2d'),library=Array.isArray(window.BOOK_CLIPARTS)?window.BOOK_CLIPARTS:[];
const BW=960,BH=720;
let chosen='brouette',operations=[],draft=null,pointer=null,paintGeneration=0;
const clipCache=new Map();
const oldOpen=window.BookSketchEditor.open;
const oldResolve=window.BookSketchEditor.resolveCroquis;
const oldRefresh=window.BookSketchEditor.refreshGroup;
const field=id=>String(Q(id)?.value||'').trim();
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const escape=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function defaultClipart(){
 const group=norm(field('inputSousRayon'));
 const pairs=[['cloture','cloture'],['portail','portail'],['pave','dalle'],['dalle','dalle'],['bordure','bordure'],['terrasse','lame'],['poteau','poteau'],['lambourde','lame'],['liteau','poutre'],['poutre','poutre'],['madrier','poutre'],['bastaing','poutre'],['osb','palette'],['gazon','rouleau'],['arros','arrosage'],['jardin','brouette']];
 return pairs.find(p=>group.includes(p[0]))?.[1]||'brouette';
}
function gallery(){
 const needle=norm(field('sketchClipartFilter'));
 const list=library.filter(c=>norm(c.label+' '+c.group).includes(needle));
 Q('sketchClipartGallery').innerHTML=list.map(c=>
  '<button type="button" class="book-sketch-tile sketch-template-tile'+(c.id===chosen?' selected':'')+'" data-clipart="'+escape(c.id)+'" aria-pressed="'+(c.id===chosen)+'" title="'+escape(c.label)+'">'
  +'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 130" aria-hidden="true"><g fill="none" stroke="#425b55" stroke-linejoin="round" stroke-linecap="round" stroke-width="3">'+c.shape+'</g></svg>'
  +'<span>'+escape(c.label)+'</span></button>').join('')
 ||'<p class="sketch-library-empty">Aucun modèle trouvé. Vous pouvez toujours dessiner librement ou importer votre propre dessin.</p>';
}
function visibility(){
 const mode=field('sketchMode');
 Q('sketchClipartField').hidden=mode!=='clipart';
 Q('sketchDimensionFields').hidden=mode==='none'?true:false;
}
function loadClipart(){
 const item=library.find(x=>x.id===chosen);
 if(!item)return Promise.resolve(null);
 if(clipCache.has(item.id))return clipCache.get(item.id);
 const svg='<svg xmlns="http://www.w3.org/2000/svg" width="200" height="130" viewBox="0 0 200 130">'
  +'<g fill="none" stroke="#294e43" stroke-width="3.3" stroke-linecap="round" stroke-linejoin="round">'+item.shape+'</g></svg>';
 const src='data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(svg);
 const value=new Promise((resolve,reject)=>{
  const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('Silhouette impossible à lire.'));
  img.src=src;
 });
 clipCache.set(item.id,value);
 return value;
}
function line(g,x1,y1,x2,y2){
 g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.stroke();
}
function head(g,x,y,a){
 line(g,x,y,x-15*Math.cos(a-Math.PI/6),y-15*Math.sin(a-Math.PI/6));
 line(g,x,y,x-15*Math.cos(a+Math.PI/6),y-15*Math.sin(a+Math.PI/6));
}
function arrow(g,x1,y1,x2,y2,double=false){
 line(g,x1,y1,x2,y2);
 const a=Math.atan2(y2-y1,x2-x1);
 head(g,x2,y2,a);
 if(double)head(g,x1,y1,a+Math.PI);
}
function writeDimension(g,value,x,y){
 g.font='bold 21px Arial';g.textAlign='center';
 const width=Math.min(350,g.measureText(value).width+14);
 g.fillStyle='#fff';g.fillRect(x-width/2,y-23,width,31);
 g.fillStyle='#075a45';g.fillText(value,x,y);
}
function drawTemplate(){
 ctx.fillStyle='#fff';ctx.fillRect(0,0,BW,BH);
 ctx.strokeStyle='#cbd7d1';ctx.lineWidth=2;ctx.strokeRect(2,2,BW-4,BH-4);
 ctx.fillStyle='#edf4ef';ctx.fillRect(10,12,940,56);
 ctx.fillStyle='#244d3d';ctx.font='bold 23px Arial';ctx.textAlign='left';
 ctx.fillText('CROQUIS COTÉ · LEROY MERLIN CALAIS',26,49);
 ctx.fillStyle='#657c70';ctx.textAlign='center';ctx.font='19px Arial';
 ctx.fillText(field('sketchMode')==='clipart'?'SILHOUETTE PRODUIT':'DESSIN LIBRE · VUE PRINCIPALE',480,120);
 ctx.strokeStyle='#176a51';ctx.lineWidth=2.5;
 const unit=field('dimensionUnit')||'cm';
 const val=s=>/\b(?:mm|cm|m)$/i.test(s)?s:s+' '+unit;
 const length=field('dimensionLong'),width=field('dimensionWide'),height=field('dimensionHigh');
 if(width){arrow(ctx,160,493,428,493,true);writeDimension(ctx,'Largeur : '+val(width),294,539);}
 if(length){arrow(ctx,532,493,813,493,true);writeDimension(ctx,'Longueur : '+val(length),675,539);}
 if(height){
  arrow(ctx,870,182,870,433,true);
  ctx.save();ctx.translate(921,310);ctx.rotate(-Math.PI/2);
  writeDimension(ctx,'Hauteur / ép. : '+val(height),0,0);ctx.restore();
 }
 ctx.fillStyle='#697d72';ctx.font='18px Arial';ctx.textAlign='center';
 ctx.fillText('Schéma indicatif hors échelle · cotes réelles à vérifier',480,642);
 if(!length&&!width&&!height){
  ctx.fillStyle='#957221';ctx.font='bold 19px Arial';
  ctx.fillText('Saisissez les dimensions du produit ou ajoutez des cotes manuelles',480,591);
 }
}
function renderOperation(op){
 if(!op||!op.points?.length)return;
 const a=op.points[0],b=op.points[op.points.length-1]||a;
 ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
 ctx.lineWidth=op.width;ctx.strokeStyle=op.color;
 if(op.tool==='eraser')ctx.globalCompositeOperation='destination-out';
 if(op.tool==='pen'||op.tool==='eraser'){
  ctx.beginPath();ctx.moveTo(a.x,a.y);
  if(op.points.length===1)ctx.lineTo(a.x+.01,a.y+.01);
  else op.points.slice(1).forEach(p=>ctx.lineTo(p.x,p.y));
  ctx.stroke();
 }else if(op.tool==='rectangle'){
  ctx.strokeRect(a.x,a.y,b.x-a.x,b.y-a.y);
 }else{
  line(ctx,a.x,a.y,b.x,b.y);
  const angle=Math.atan2(b.y-a.y,b.x-a.x);
  if(op.tool==='measure'||op.tool==='arrow')head(ctx,b.x,b.y,angle);
  if(op.tool==='measure'){
   head(ctx,a.x,a.y,angle+Math.PI);
   writeDimension(ctx,String(op.label||'Cote').slice(0,40),(a.x+b.x)/2,(a.y+b.y)/2-12);
  }
 }
 ctx.restore();
}
function overlayOperations(){
 operations.forEach(renderOperation);
 if(draft)renderOperation(draft);
}
async function refresh(){
 const generation=++paintGeneration,mode=field('sketchMode');
 visibility();
 if(mode==='draw'||mode==='clipart'){
  drawTemplate();
  if(mode==='clipart'){
   try{
    const icon=await loadClipart();
    if(generation!==paintGeneration)return;
    if(icon)ctx.drawImage(icon,175,165,620,270);
   }catch(e){
    if(generation!==paintGeneration)return;
    ctx.fillStyle='#ad3f3f';ctx.font='18px Arial';ctx.fillText('Silhouette momentanément indisponible',310,360);
   }
  }
 }else{
  ctx.clearRect(0,0,BW,BH);
  if(mode==='upload'){
   const length=field('dimensionLong'),width=field('dimensionWide'),height=field('dimensionHigh');
   if(length||width||height){
    const unit=field('dimensionUnit')||'cm';
    const val=x=>/\b(?:mm|cm|m)$/i.test(x)?x:x+' '+unit;
    ctx.strokeStyle='#126b50';ctx.lineWidth=2.5;
    if(width){arrow(ctx,135,486,410,486,true);writeDimension(ctx,'Largeur : '+val(width),272,532);}
    if(length){arrow(ctx,545,486,814,486,true);writeDimension(ctx,'Longueur : '+val(length),680,532);}
    if(height){arrow(ctx,874,186,874,433,true);ctx.save();ctx.translate(925,308);ctx.rotate(-Math.PI/2);writeDimension(ctx,'Hauteur / ép. : '+val(height),0,0);ctx.restore();}
   }
  }
 }
 if(generation!==paintGeneration)return;
 overlayOperations();
}
function coordinates(e){
 const rect=overlay.getBoundingClientRect();
 return {x:Math.max(0,Math.min(BW,(e.clientX-rect.left)*BW/rect.width)),y:Math.max(0,Math.min(BH,(e.clientY-rect.top)*BH/rect.height))};
}
function start(e){
 if(pointer!==null||(e.pointerType==='mouse'&&e.button!==0))return;
 e.preventDefault();
 if(field('sketchMode')==='none'){Q('sketchMode').value='draw';Q('sketchMode').dispatchEvent(new Event('change',{bubbles:true}));}
 pointer=e.pointerId;
 draft={tool:field('sketchDrawTool')||'pen',color:field('sketchDrawColor')||'#17463b',
  width:Number(field('sketchDrawWidth'))||5,label:field('sketchMeasureText')||'Cote',points:[coordinates(e)]};
 try{overlay.setPointerCapture(pointer);}catch(error){}
 void refresh();
}
function move(e){
 if(pointer!==e.pointerId||!draft)return;
 e.preventDefault();
 const point=coordinates(e);
 if(draft.tool==='pen'||draft.tool==='eraser')draft.points.push(point);
 else draft.points[1]=point;
 void refresh();
}
function stop(e){
 if(pointer!==e.pointerId||!draft)return;
 e.preventDefault();
 if(draft.tool==='pen'||draft.tool==='eraser')draft.points.push(coordinates(e));
 else draft.points[1]=coordinates(e);
 operations.push(draft);draft=null;pointer=null;
 try{overlay.releasePointerCapture(e.pointerId);}catch(error){}
 void refresh();
 Q('sketchPreviewStatus').textContent='Tracé ajouté. Enregistrez le produit pour conserver ce croquis.';
}
function reset(){
 chosen=defaultClipart();operations=[];draft=null;pointer=null;
 Q('sketchClipartFilter').value='';gallery();void refresh();
}
window.BookSketchEditor.open=function(item){oldOpen(item);reset();};
window.BookSketchEditor.refreshGroup=function(){oldRefresh();chosen=defaultClipart();gallery();void refresh();};
window.BookSketchEditor.resolveCroquis=async function(){
 const mode=field('sketchMode');
 if(mode==='clipart'||mode==='draw'){
  await refresh();
  return overlay.toDataURL('image/png');
 }
 const uploadHasDimensions=mode==='upload'&&['dimensionLong','dimensionWide','dimensionHigh'].some(id=>field(id));
 if(!operations.length&&!uploadHasDimensions)return oldResolve();
 // Le dessin manuel s'ajoute au croquis standard, sans modifier ses anciennes cotes.
 await oldResolve();
 await refresh();
 const combined=document.createElement('canvas');combined.width=BW;combined.height=BH;
 const c=combined.getContext('2d');
 c.drawImage(base,0,0);c.drawImage(overlay,0,0);
 return combined.toDataURL('image/png');
};
Q('sketchMode').addEventListener('change',()=>void refresh());
Q('sketchClipartFilter').addEventListener('input',gallery);
Q('sketchClipartGallery').addEventListener('click',event=>{
 const btn=event.target.closest('[data-clipart]');if(!btn||!library.some(x=>x.id===btn.dataset.clipart))return;
 chosen=btn.dataset.clipart;gallery();
 Q('sketchMode').value='clipart';
 Q('sketchMode').dispatchEvent(new Event('change',{bubbles:true}));
 void refresh();
});
for(const id of ['dimensionLong','dimensionWide','dimensionHigh','dimensionUnit']){
 Q(id).addEventListener(id==='dimensionUnit'?'change':'input',()=>void refresh());
}
Q('sketchUndo').addEventListener('click',()=>{operations.pop();void refresh();});
Q('sketchClearDraw').addEventListener('click',()=>{operations=[];draft=null;pointer=null;void refresh();});
overlay.addEventListener('pointerdown',start);
overlay.addEventListener('pointermove',move);
overlay.addEventListener('pointerup',stop);
overlay.addEventListener('pointercancel',stop);
gallery();
void refresh();
window.BookSketchAtelier={refresh,clipartCount:library.length};
})();