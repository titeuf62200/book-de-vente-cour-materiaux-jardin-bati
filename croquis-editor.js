/* Croquis de caisse : sélection de vrais schémas du book, cotes entièrement ressaisies.
   Les formes sont prélevées des dessins d'origine ; les anciens textes/chiffres ne sont jamais copiés. */
(function(){
'use strict';
const Q=id=>document.getElementById(id), canvas=Q('sketchCanvas');
if(!canvas)return;
const ctx=canvas.getContext('2d');
const MODELS={
 'Maçonnerie - Chapeaux de piliers':{ref:'384426',type:'chapeau',name:'Chapeau de pilier'},
 'Maçonnerie - Éléments de piliers':{ref:'61655202',type:'element',name:'Élément de pilier'},
 'Maçonnerie - Couvre-murs':{ref:'66382316',type:'couvre',name:'Couvre-mur'},
 'Bois de charpente - Madriers':{ref:'67012736',type:'wood',name:'Madrier'},
 'Bois de charpente - Bastaings':{ref:'67012946',type:'wood',name:'Bastaing'},
 'Bois de charpente - Chevrons':{ref:'67013674',type:'wood',name:'Chevron'},
 'Bois de charpente - Poutres':{ref:'67013814',type:'wood',name:'Poutre'},
 'Bois brut - Liteaux et lattes':{ref:'67013863',type:'wood',name:'Liteau / latte'},
 'Bois brut - Demi-bastaings':{ref:'67014591',type:'wood',name:'Demi-bastaing'},
 'Bois brut - Lambourdes':{ref:'67014731',type:'wood',name:'Lambourde'},
 'Panneaux - OSB':{ref:'70406721',type:'wood',name:'Panneau OSB'},
 'Clôtures - Panneaux et portillons':{ref:'14091280',type:'panneau',name:'Panneau de clôture'},
 'Clôtures - Poteaux':{ref:'590842',type:'poteau',name:'Poteau de clôture'},
 'Clôtures - Accessoires et fixations':{ref:'13156472',type:'fixation',name:'Support / fixation'},
 'Terrasses - Lames et lambourdes':{ref:'65950822',type:'wood',name:'Lame de terrasse'},
 'Terrasses - Dalles bois et clipsables':{ref:'36277360',type:'dalle',name:'Dalle bois'},
 'Sols extérieurs - Bordures béton':{ref:'62482266',type:'bordure',name:'Bordure béton'},
 'Sols extérieurs - Bordures bois, PVC et métal':{ref:'64966342',type:'bordure',name:'Bordure'},
 'Sols extérieurs - Pas japonais':{ref:'151473',type:'dalle',name:'Pas japonais'}
};
/* Coordonnées, sur le schéma original de 572 x 180 pixels :
   zones de la forme uniquement (sans flèches, références ni cotes d'origine). */
const CROP={
 chapeau:[[91,62,145,67],[333,63,200,68]],
 element:[[111,66,105,79],[353,61,169,77]],
 couvre:[[94,63,142,65],[337,80,197,53]],
 wood:[[82,59,166,84],[326,79,214,45]],
 panneau:[[80,60,156,76],[410,63,47,73]],
 poteau:[[128,65,47,70],[401,64,54,73]],
 fixation:[[123,69,73,67],[402,65,53,71]],
 dalle:[[98,66,136,68],[348,96,180,27]],
 bordure:[[92,71,154,55],[348,95,180,28]]
};
const TEMPLATES={chapeau:'pilier',element:'pilier',couvre:'dalle',wood:'poutre',panneau:'panneau',poteau:'poteau',fixation:'bloc',dalle:'dalle',bordure:'dalle'};
let current=null,generation=0,ready=false,lastError='',chosenBookRef='';
function trim(s){return String(s||'').trim();}
function field(id){return trim(Q(id).value);}
function hasDimensions(){return ['dimensionLong','dimensionWide','dimensionHigh'].some(id=>field(id));}
function currentGroup(){return Q('inputSousRayon').value;}
function sourcesForGroup(){const rayon=Q('inputRayon').value,group=currentGroup();return products.filter(p=>!p.archived&&p.rayon===rayon&&p.sousRayon===group&&p.croquis);}
function recommended(){const model=MODELS[currentGroup()];if(!model)return null;const p=products.find(p=>p.reference===model.ref&&p.rayon===Q('inputRayon').value&&p.croquis&&!p.archived);return p?{...model,product:p}:null;}
function escapeText(s){return String(s||'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
function optionRef(ref){const p=products.find(p=>p.reference===ref);return p&&p.croquis?p:null;}
function currentBookSource(){return optionRef(field('bookSketchSource'));}
function drawLine(x1,y1,x2,y2,width=3,color='#203f4a'){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();}
function rect(x,y,w,h,fill,stroke='#263d48'){ctx.fillStyle=fill;ctx.fillRect(x,y,w,h);ctx.lineWidth=4;ctx.strokeStyle=stroke;ctx.strokeRect(x,y,w,h);}
function polygon(points,fill,stroke='#263d48'){ctx.fillStyle=fill;ctx.strokeStyle=stroke;ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(...points[0]);points.slice(1).forEach(p=>ctx.lineTo(...p));ctx.closePath();ctx.fill();ctx.stroke();}
function block(x,y,w,h,depth){
 polygon([[x,y],[x+depth,y-depth*.5],[x+w+depth,y-depth*.5],[x+w,y]],'#f7f9f7');
 rect(x,y,w,h,'#d1dbd5');
 polygon([[x+w,y],[x+w+depth,y-depth*.5],[x+w+depth,y+h-depth*.5],[x+w,y+h]],'#b9cfc5');
}
function drawGeneric(kind){
 ctx.save();ctx.shadowColor='#d7ddd9';ctx.shadowBlur=1;
 if(kind==='poutre'){rect(175,211,185,138,'#edd2a2');rect(550,265,280,54,'#edd2a2');}
 else if(kind==='pilier'){rect(182,211,175,136,'#d5dadd');polygon([[555,313],[620,236],[749,236],[823,313]],'#d5dadd');}
 else if(kind==='poteau'){rect(224,188,106,187,'#edd2a2');rect(645,198,90,178,'#edd2a2');}
 else if(kind==='panneau'){rect(154,204,239,152,'#edd2a2');rect(678,220,45,138,'#edd2a2');}
 else if(kind==='dalle'){rect(160,238,238,109,'#d5dadd');rect(563,297,258,29,'#d5dadd');}
 else if(kind==='rond'){
  ctx.fillStyle='#d5dadd';ctx.strokeStyle='#203f4a';ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(272,284,112,81,0,0,Math.PI*2);ctx.fill();ctx.stroke();
  rect(566,283,234,40,'#d5dadd');
 }else{block(185,243,170,107,40);rect(563,277,242,65,'#d5dadd');}
 ctx.restore();
}
function arrow(x1,y1,x2,y2){
 drawLine(x1,y1,x2,y2,2.5);
 const a=Math.atan2(y2-y1,x2-x1);
 for(const [x,y,t] of [[x1,y1,a],[x2,y2,a+Math.PI]]){
  drawLine(x,y,x+10*Math.cos(t+Math.PI/6),y+10*Math.sin(t+Math.PI/6),2.5);
  drawLine(x,y,x+10*Math.cos(t-Math.PI/6),y+10*Math.sin(t-Math.PI/6),2.5);
 }
}
function paintBase(){
 ctx.fillStyle='#fff';ctx.fillRect(0,0,960,720);
 ctx.strokeStyle='#cbd7dc';ctx.lineWidth=2;ctx.strokeRect(2,2,956,716);
 ctx.fillStyle='#f0f3f5';ctx.fillRect(10,12,940,55);
 ctx.fillStyle='#466170';ctx.textAlign='left';ctx.font='bold 22px Arial';
 ctx.fillText('CROQUIS COTÉ • MODÈLE RÉUTILISABLE',28,47);
 drawLine(478,100,478,423,1,'#d9e3e7');
 ctx.textAlign='center';ctx.font='19px Arial';ctx.fillStyle='#516b7c';
 ctx.fillText('VUE PRINCIPALE',270,126);
 ctx.fillText('VUE DE PROFIL / LONGITUDINALE',690,126);
}
function drawDimensions(){
 const unit=field('dimensionUnit')||'cm';
 const len=field('dimensionLong'),wide=field('dimensionWide'),high=field('dimensionHigh');
 ctx.fillStyle='#086f50';ctx.textAlign='center';ctx.font='bold 21px Arial';
 if(wide){arrow(165,468,390,468);ctx.fillText('Largeur : '+wide.slice(0,28)+' '+unit,276,508);}
 if(len){arrow(559,468,820,468);ctx.fillText('Longueur : '+len.slice(0,28)+' '+unit,690,508);}
 if(high){
  arrow(885,193,885,375);
  ctx.save();ctx.translate(916,287);ctx.rotate(-Math.PI/2);
  ctx.fillText('Hauteur / ép. : '+high.slice(0,28)+' '+unit,0,0);ctx.restore();
 }
 ctx.textAlign='center';ctx.font='18px Arial';ctx.fillStyle='#5c7080';
 ctx.fillText('Croquis schématique — hors échelle • dimensions saisies manuellement',480,632);
 if(!hasDimensions()){
  ctx.font='bold 20px Arial';ctx.fillStyle='#936920';
  ctx.fillText('Cotes à renseigner pour ce nouveau produit',480,586);
 }
}
function imageLoad(src){
 return new Promise((resolve,reject)=>{
  const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('Impossible de lire le croquis source'));img.src=src;
 });
}
function drawContain(img,origin,target){
 const [x,y,w,h]=target;
 const scale=Math.min(w/origin[2],h/origin[3]);
 const sw=origin[2]*scale,sh=origin[3]*scale;
 ctx.drawImage(img,origin[0],origin[1],origin[2],origin[3],x+(w-sw)/2,y+(h-sh)/2,sw,sh);
}
async function drawOriginalModel(ref){
 const model=MODELS[currentGroup()];
 const src=optionRef(ref);
 if(!src||!model||!CROP[model.type])throw new Error('Modèle géométrique indisponible pour ce sous-rayon.');
 const image=await imageLoad(src.croquis);
 const scaleX=image.naturalWidth/572,scaleY=image.naturalHeight/180;
 const areas=CROP[model.type];
 const crop=area=>[area[0]*scaleX,area[1]*scaleY,area[2]*scaleX,area[3]*scaleY];
 drawContain(image,crop(areas[0]),[128,180,295,222]);
 drawContain(image,crop(areas[1]),[528,180,313,222]);
}
function drawWhole(img){
 const x=100,y=182,w=750,h=275;
 const k=Math.min(w/img.naturalWidth,h/img.naturalHeight);
 ctx.drawImage(img,x+(w-img.naturalWidth*k)/2,y+(h-img.naturalHeight*k)/2,img.naturalWidth*k,img.naturalHeight*k);
}
function setHint(text,error=false){
 const el=Q('sketchPreviewStatus');el.textContent=text;el.classList.toggle('sketch-error',error);
}
function updateVisibility(){
 const mode=field('sketchMode');
 Q('bookSourceField').hidden=mode!=='book';
 Q('sketchTemplateField').hidden=mode!=='template';
 Q('sketchReuseField').hidden=mode!=='reuse';
 Q('sketchUploadField').hidden=mode!=='upload';
 Q('sketchDimensionFields').hidden=mode==='none';
}
function gallery(){
 const list=sourcesForGroup(),selected=field('bookSketchSource'),area=Q('bookSketchGallery');
 const max=8;
 area.innerHTML=list.slice(0,max).map(p=>'<button type="button" class="book-sketch-tile'+(p.reference===selected?' selected':'')+'" data-book-ref="'+escapeText(p.reference)+'" aria-pressed="'+(p.reference===selected?'true':'false')+'"><img loading="lazy" alt="Croquis de '+escapeText(p.designation)+'" src="'+escapeText(p.croquis)+'"><span>'+escapeText(p.reference)+'</span></button>').join('');
}
function populateGroup(autopick){
 const sources=sourcesForGroup(),pref=recommended(),sel=Q('bookSketchSource');
 const prev=autopick?'':(chosenBookRef||field('bookSketchSource'));
 const ordered=sources.slice().sort((a,b)=>Number(a.reference!==pref?.ref)-Number(b.reference!==pref?.ref)||a.reference.localeCompare(b.reference,'fr'));
 sel.innerHTML='<option value="">Choisir une référence comme modèle…</option>'+ordered.map(p=>'<option value="'+escapeText(p.reference)+'">'+escapeText(p.reference+' — '+p.designation.slice(0,78))+'</option>').join('');
 chosenBookRef=prev&&sources.some(p=>p.reference===prev)?prev:(pref?.ref||'');
 sel.value=chosenBookRef;
 Q('bookSketchInfo').textContent=pref
   ?'Modèle conseillé : '+pref.name+' — dessin issu de la référence '+pref.ref+'. Seules ses formes sont reprises : les anciens chiffres et la référence d’origine sont écartés.'
   :'Aucun dessin original validé automatiquement pour ce sous-rayon. Choisissez un gabarit, ou copiez un croquis original seulement si sa forme et ses cotes conviennent.';
 gallery();
 return !!pref;
}
function genericKind(group){
 if(/chevron|madrier|bastaing|liteau|lambourde|lames/i.test(group))return'poutre';
 if(/pilier|couvre-mur/i.test(group))return'pilier';
 if(/poteaux/i.test(group))return'poteau';
 if(/panneau|clôture|OSB/i.test(group))return'panneau';
 if(/dalle|pav|bordure|terrass|japonais/i.test(group))return'dalle';
 return '';
}
function unitByGroup(){return /Bois|OSB/.test(currentGroup())?'mm':'cm';}
function refreshGroup(){
 const had=field('sketchMode');
 const hasBook=populateGroup(true);
 if(!current){
  const candidate=hasBook?'book':(genericKind(currentGroup())?'template':'none');
  Q('sketchMode').value=candidate;
  if(candidate==='template')Q('sketchTemplate').value=genericKind(currentGroup());
  Q('dimensionUnit').value=unitByGroup();
 }else if(had==='book'&&!hasBook){
  Q('sketchMode').value='keep';
 }
 void paint();
}
async function paint(){
 const n=++generation;ready=false;lastError='';updateVisibility();paintBase();
 const mode=field('sketchMode');
 try{
  if(mode==='book'){
   const ref=field('bookSketchSource');
   if(!ref)throw new Error('Ce sous-rayon ne dispose pas d’un modèle graphique réutilisable. Choisissez un gabarit.');
   await drawOriginalModel(ref);
   if(n!==generation)return;
  }else if(mode==='template')drawGeneric(field('sketchTemplate'));
  else if(mode==='reuse'||mode==='keep'){
   const source=mode==='keep'?current?.croquis:optionRef(field('reuseCroquis'))?.croquis;
   if(source){const image=await imageLoad(source);if(n!==generation)return;drawWhole(image);}
   else throw new Error('Sélectionnez un croquis existant.');
  }else if(mode==='upload'){
   const file=Q('inputCroquis').files?.[0];
   if(!file)throw new Error('Sélectionnez une image de croquis.');
   if(!/^image\/(?:png|jpeg|webp)$/.test(file.type))throw new Error('Utilisez un fichier PNG, JPG ou WebP.');
   const url=URL.createObjectURL(file);
   try{const image=await imageLoad(url);if(n!==generation)return;drawWhole(image);}
   finally{URL.revokeObjectURL(url);}
  }else{
   ctx.fillStyle='#6b7b82';ctx.textAlign='center';ctx.font='22px Arial';
   ctx.fillText('Aucun croquis sélectionné',480,292);
  }
  if(mode==='book'||mode==='template')drawDimensions();
  else if(mode==='reuse'||mode==='keep'||mode==='upload'){
   ctx.fillStyle='#ad6b19';ctx.textAlign='center';ctx.font='18px Arial';
   ctx.fillText('Image originale : elle peut déjà contenir des cotes. Vérifiez-la avant de la copier.',480,592);
  }
  ready=true;
  if(n===generation)setHint(mode==='book'
    ?'Forme issue d’un vrai croquis du book, sans anciennes dimensions. Saisissez les nouvelles cotes.'
    :mode==='reuse'?'Copie intégrale du croquis choisi : les anciennes cotes ne sont pas modifiées.'
    :'Aperçu du croquis avant enregistrement.');
 }catch(e){
  if(n!==generation)return;
  lastError=e.message;ctx.fillStyle='#b42331';ctx.textAlign='center';ctx.font='18px Arial';ctx.fillText(lastError.slice(0,75),480,275);
  setHint(lastError,true);
 }
}
function open(item){
 current=item||null;
 const all=products.filter(p=>!p.archived&&p.croquis).sort((a,b)=>a.rayon.localeCompare(b.rayon,'fr')||a.sousRayon.localeCompare(b.sousRayon,'fr'));
 Q('reuseCroquis').innerHTML='<option value="">Sélectionner un ancien croquis…</option>'+all.map(p=>'<option value="'+escapeText(p.reference)+'">'+escapeText(p.rayon+' • '+p.sousRayon+' • '+p.reference+' • '+p.designation.slice(0,40))+'</option>').join('');
 for(const id of ['dimensionLong','dimensionWide','dimensionHigh'])Q(id).value='';
 Q('dimensionUnit').value=unitByGroup();
 Q('inputCroquis').value='';
 const hasBook=populateGroup(true);
 if(item?.croquis)Q('sketchMode').value='keep';
 else if(hasBook)Q('sketchMode').value='book';
 else if(genericKind(currentGroup())){
  Q('sketchMode').value='template';Q('sketchTemplate').value=genericKind(currentGroup());
 }else Q('sketchMode').value='none';
 void paint();
}
async function resolveCroquis(){
 const mode=field('sketchMode');
 if(mode==='none')return '';
 if(mode==='keep'&&!hasDimensions())return current?.croquis||'';
 if(mode==='reuse'&&!hasDimensions()){
  const source=optionRef(field('reuseCroquis'))?.croquis;
  if(!source)throw new Error('Sélectionnez un croquis existant.');
  return source;
 }
 if((mode==='reuse'||mode==='keep')&&hasDimensions())
   throw new Error('Ce croquis contient ses anciennes cotes. Choisissez le modèle conseillé ou un gabarit pour les remplacer.');
 if(mode==='upload'&&!Q('inputCroquis').files?.[0])throw new Error('Importez une image.');
 await paint();
 if(!ready||lastError)throw new Error(lastError||'Le croquis ne peut pas être créé.');
 return canvas.toDataURL('image/png');
}
Q('sketchMode').addEventListener('change',()=>void paint());
Q('sketchTemplate').addEventListener('change',()=>void paint());
Q('reuseCroquis').addEventListener('change',()=>void paint());
Q('inputCroquis').addEventListener('change',()=>void paint());
Q('bookSketchSource').addEventListener('change',()=>{
 chosenBookRef=field('bookSketchSource');gallery();void paint();
});
Q('bookSketchGallery').addEventListener('click',e=>{
 const button=e.target.closest('[data-book-ref]');if(!button)return;
 const ref=button.dataset.bookRef;if(!sourcesForGroup().some(p=>p.reference===ref))return;
 chosenBookRef=ref;Q('bookSketchSource').value=ref;gallery();void paint();
});
for(const id of ['dimensionLong','dimensionWide','dimensionHigh','dimensionUnit'])
 Q(id).addEventListener(id==='dimensionUnit'?'change':'input',()=>void paint());
Q('inputSousRayon').addEventListener('change',refreshGroup);
Q('inputRayon').addEventListener('change',refreshGroup);
window.BookSketchEditor={open,resolveCroquis,refreshGroup,MODEL_COUNT:Object.keys(MODELS).length};
})();