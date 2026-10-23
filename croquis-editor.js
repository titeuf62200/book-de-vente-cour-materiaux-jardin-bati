/* Editeur de croquis cote - fonctionne en local, images incorporees au catalogue. */
(function () {
  'use strict';
  const Q = id => document.getElementById(id);
  const canvas = Q('sketchCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const modes = ['keep', 'none', 'template', 'reuse', 'upload'];
  let current = null, generation = 0, ready = false, lastError = '';
  const $label = (name) => String(name || '').slice(0, 28);
  function field(id) { return Q(id).value.trim(); }
  function hasDimensions() { return ['dimensionLong', 'dimensionWide', 'dimensionHigh'].some(id => !!field(id)); }
  function drawLine(x1,y1,x2,y2,width=4,color='#365a52') {
    ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
  }
  function polygon(points,fill,stroke='#233e39') {
    ctx.fillStyle=fill;ctx.strokeStyle=stroke;ctx.lineWidth=5;
    ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);
    for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);
    ctx.closePath();ctx.fill();ctx.stroke();
  }
  function face(x,y,w,h,color='#e5efea') {polygon([[x,y],[x+w,y],[x+w,y+h],[x,y+h]],color);}
  function block(x,y,w,h,depth) {
    polygon([[x,y],[x+depth,y-depth*.55],[x+w+depth,y-depth*.55],[x+w,y]],'#f8faf7');
    face(x,y,w,h,'#e0e9e2');
    polygon([[x+w,y],[x+w+depth,y-depth*.55],[x+w+depth,y+h-depth*.55],[x+w,y+h]],'#c3d1c5');
  }
  function drawTemplate(kind) {
    ctx.save(); ctx.shadowColor='rgba(20,45,29,.10)'; ctx.shadowBlur=3;
    if(kind==='poutre')block(145,245,470,125,100);
    else if(kind==='dalle')block(165,320,475,55,130);
    else if(kind==='pilier'){block(285,180,255,290,70);polygon([[270,175],[300,118],[558,118],[585,175]],'#f0f4f0');}
    else if(kind==='poteau')block(315,100,135,350,75);
    else if(kind==='panneau')block(155,120,455,340,35);
    else if(kind==='rond'){
      ctx.fillStyle='#e0e9e3';ctx.strokeStyle='#355548';ctx.lineWidth=6;ctx.beginPath();ctx.ellipse(420,288,190,145,0,0,Math.PI*2);ctx.fill();ctx.stroke();
      ctx.beginPath();ctx.ellipse(420,288,88,67,0,0,Math.PI*2);ctx.stroke();
    }
    else block(195,240,400,180,85);
    ctx.restore();
  }
  function arrow(x1,y1,x2,y2) {
    drawLine(x1,y1,x2,y2,3,'#13694d');
    const theta=Math.atan2(y2-y1,x2-x1), a=13;
    for(const [x,y,angle] of [[x1,y1,theta],[x2,y2,theta+Math.PI]]){
      drawLine(x,y,x+a*Math.cos(angle+Math.PI/6),y+a*Math.sin(angle+Math.PI/6),3,'#13694d');
      drawLine(x,y,x+a*Math.cos(angle-Math.PI/6),y+a*Math.sin(angle-Math.PI/6),3,'#13694d');
    }
  }
  function dimensions() {
    const unit = field('dimensionUnit'), l=$label(field('dimensionLong')), w=$label(field('dimensionWide')), h=$label(field('dimensionHigh'));
    ctx.font='bold 24px Arial';ctx.textAlign='center';ctx.fillStyle='#174d38';
    if(l){arrow(170,520,655,520);ctx.fillText('Longueur : '+l+' '+unit,410,555);}
    if(w){arrow(255,605,545,605);ctx.fillText('Largeur : '+w+' '+unit,400,641);}
    if(h){arrow(815,130,815,440);ctx.save();ctx.translate(851,291);ctx.rotate(-Math.PI/2);ctx.fillText('Hauteur / ép. : '+h+' '+unit,0,0);ctx.restore();}
  }
  function paintBackground() {
    ctx.fillStyle='#fff';ctx.fillRect(0,0,960,720);
    ctx.strokeStyle='#d6e3da';ctx.lineWidth=2;ctx.strokeRect(2,2,956,716);
    ctx.font='bold 24px Arial';ctx.fillStyle='#255d43';ctx.textAlign='left';
    ctx.fillText('CROQUIS COTÉ',40,45);
  }
  async function loadPicture(source) {
    return new Promise((resolve,reject)=>{
      const image=new Image();
      image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('Image du croquis non lisible'));
      image.src=source;
    });
  }
  function drawImageInFrame(image) {
    const box={x:100,y:85,w:650,h:390};
    const k=Math.min(box.w/image.naturalWidth,box.h/image.naturalHeight);
    const dw=image.naturalWidth*k,dh=image.naturalHeight*k;
    ctx.drawImage(image,box.x+(box.w-dw)/2,box.y+(box.h-dh)/2,dw,dh);
  }
  function selectedSource(mode) {
    if(mode==='keep')return current?.croquis||'';
    if(mode==='reuse')return products.find(p=>p.reference===Q('reuseCroquis').value)?.croquis||'';
    return '';
  }
  function updateEditorVisibility() {
    const mode=Q('sketchMode').value;
    Q('sketchTemplateField').hidden=mode!=='template';
    Q('sketchReuseField').hidden=mode!=='reuse';
    Q('sketchUploadField').hidden=mode!=='upload';
    Q('sketchDimensionFields').hidden=mode==='none';
  }
  async function paint() {
    const serial=++generation;
    updateEditorVisibility();ready=false;lastError='';
    paintBackground();
    const mode=Q('sketchMode').value;
    try {
      if(mode==='template')drawTemplate(Q('sketchTemplate').value);
      else if(mode==='reuse'||mode==='keep'){
        const src=selectedSource(mode);
        if(src){const image=await loadPicture(src);if(serial!==generation)return;drawImageInFrame(image);}
        else {ctx.textAlign='center';ctx.font='21px Arial';ctx.fillText('Sélectionnez un croquis',460,280);}
      }
      else if(mode==='upload'){
        const file=Q('inputCroquis').files[0];
        if(file){
          if(!file.type.startsWith('image/'))throw new Error('Choisissez une image PNG, JPG ou WebP.');
          const url=URL.createObjectURL(file);
          try{const image=await loadPicture(url);if(serial!==generation)return;drawImageInFrame(image);}
          finally{URL.revokeObjectURL(url);}
        }else{ctx.textAlign='center';ctx.font='21px Arial';ctx.fillText('Choisissez une image de croquis',460,280);}
      }
      else{ctx.textAlign='center';ctx.font='21px Arial';ctx.fillText('Aucun croquis sélectionné',460,280);}
      if(mode!=='none')dimensions();
      ready=true;
    }catch(e){lastError=e.message;ctx.textAlign='center';ctx.font='21px Arial';ctx.fillStyle='#b42331';ctx.fillText(lastError,460,285);}
    if(serial===generation){
      const status=Q('sketchPreviewStatus');
      status.textContent=lastError||'Aperçu du croquis et des cotes (image intégrée au produit après enregistrement).';
    }
  }
  function open(item){
    current=item||null;generation++;
    const select=Q('reuseCroquis');
    const fromBook=products.filter(p=>p.croquis&&!p.archived).sort((a,b)=>a.rayon.localeCompare(b.rayon,'fr')||a.sousRayon.localeCompare(b.sousRayon,'fr'));
    select.innerHTML='<option value="">Choisir un croquis existant…</option>'+fromBook.map(p=>
      '<option value="'+escapeHtml(p.reference)+'">'+escapeHtml(p.rayon+' • '+p.sousRayon+' • '+p.reference+' • '+p.designation.slice(0,55))+'</option>').join('');
    for(const id of ['dimensionLong','dimensionWide','dimensionHigh'])Q(id).value='';
    Q('dimensionUnit').value='cm';
    Q('sketchMode').value=item?.croquis?'keep':'none';
    Q('inputCroquis').value='';
    paint();
  }
  async function resolveCroquis(){
    const mode=Q('sketchMode').value;
    if(!modes.includes(mode))throw new Error('Choix de croquis invalide');
    if(mode==='none')return '';
    if(mode==='keep'&&!hasDimensions())return current?.croquis||'';
    if(mode==='reuse'&&!hasDimensions()) {
      const src=selectedSource(mode);
      if(!src)throw new Error('Sélectionnez un croquis existant.');
      return src;
    }
    if(mode==='upload'&&!Q('inputCroquis').files[0])throw new Error('Choisissez une image de croquis.');
    if(mode==='keep'&&!current?.croquis)throw new Error('Aucun croquis à conserver.');
    if(mode==='reuse'&&!selectedSource(mode))throw new Error('Sélectionnez un croquis existant.');
    await paint();
    if(lastError||!ready)throw new Error(lastError||'Le croquis ne peut pas être généré.');
    return canvas.toDataURL('image/png');
  }
  Q('sketchMode').addEventListener('change',()=>void paint());
  Q('sketchTemplate').addEventListener('change',()=>void paint());
  Q('reuseCroquis').addEventListener('change',()=>void paint());
  Q('inputCroquis').addEventListener('change',()=>void paint());
  for(const id of ['dimensionLong','dimensionWide','dimensionHigh','dimensionUnit']){
    Q(id).addEventListener(id==='dimensionUnit'?'change':'input',()=>void paint());
  }
  window.BookSketchEditor={open,resolveCroquis};
})();
