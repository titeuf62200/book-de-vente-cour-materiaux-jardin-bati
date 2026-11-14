/* Identification locale : EAN certain, comparaison photo indicative.
   Aucun appel IA, aucune transmission des photos prises ou importées à un serveur. */
(function(){
'use strict';
const el=id=>document.getElementById(id);
const dialog=el('finderDialog');
if(!dialog)return;
const video=el('finderVideo'),cameraBox=el('finderCameraBox');
let stream=null,scanTimer=null,detector=null,busy=false,detecting=false,runId=0;
const photoFeatures=new Map();
const status=(message,isError=false)=>{
 const node=el('finderStatus');node.textContent=message;
 node.classList.toggle('finder-error',isError);
};
function catalog(){return products.filter(p=>!p.archived);}
function escape(s){return escapeHtml(String(s??''));}
function stopCamera(){
 if(scanTimer){clearInterval(scanTimer);scanTimer=null;}
 if(stream){stream.getTracks().forEach(track=>track.stop());stream=null;}
 video.pause();video.srcObject=null;cameraBox.hidden=true;el('finderCameraBtn').textContent='Activer la caméra';
}
function close(){
 runId++;stopCamera();dialog.close();
}
function open(){
 el('finderEan').value='';el('finderPhoto').value='';
 el('finderResults').innerHTML='';
 status('Scanner un EAN permet une identification exacte. La recherche photo propose uniquement des produits ressemblants.');
 dialog.showModal();
}
function makeResult(p){
 const img=safeImage(p.photo),code=validEan(p.ean)?p.ean:'EAN non renseigné';
 return '<article class="finder-result"><div class="finder-result-image">'+(img?imageMarkup(img,p.designation):'<span>Sans photo</span>')+'</div>'
  +'<div class="finder-result-meta"><strong>'+escape(p.designation)+'</strong><span>RÉF. '+escape(p.reference)+' · '+escape(p.rayon)+'</span><small>'+escape(code)+'</small></div>'
  +'<button type="button" class="btn btn-outline" data-finder-ref="'+escape(p.reference)+'">Voir la fiche</button></article>';
}
function showExact(query){
 const input=String(query||'').replace(/\s/g,'').trim();
 if(!input){el('finderResults').innerHTML='';status('Saisissez un EAN ou une référence Leroy Merlin.',true);return false;}
 const matches=catalog().filter(p=>(p.ean&&p.ean===input)||(p.reference&&p.reference===input));
 const results=el('finderResults');
 if(!matches.length){
  results.innerHTML='';
  status('Aucune fiche ne correspond à ce code dans le book actuel. Vérifiez le code et l’actualisation du catalogue.',true);
  return false;
 }
 results.innerHTML='<h3>Correspondance dans le catalogue</h3>'+matches.map(makeResult).join('');
 status(matches.length===1?'Référence trouvée grâce au code enregistré.':'Plusieurs fiches utilisent ce code : vérifiez le produit.');
 return true;
}
async function createDetector(){
 if(typeof BarcodeDetector==='undefined')return null;
 try{
  const supported=typeof BarcodeDetector.getSupportedFormats==='function'?await BarcodeDetector.getSupportedFormats():['ean_13','code_128'];
  const formats=['ean_13','ean_8','code_128'].filter(f=>supported.includes(f));
  return formats.length?new BarcodeDetector({formats}):null;
 }catch(e){return null;}
}
async function detectCode(source){
 if(!detector)detector=await createDetector();
 if(!detector)return '';
 try{
  const found=await detector.detect(source);
  for(const b of found){
   const digits=String(b.rawValue||'').replace(/[\s-]/g,'');
   if(/^\d{13}$/.test(digits)&&validEan(digits))return digits;
   if(/^\d{6,10}$/.test(digits)&&catalog().some(p=>p.reference===digits))return digits;
  }
 }catch(e){/* image non décodable par ce navigateur */}
 return '';
}
async function scanFrame(){
 if(detecting||!stream||video.readyState<2||busy||!dialog.open)return;
 detecting=true;
 try{
  const value=await detectCode(video);
  if(value){stopCamera();el('finderEan').value=value;showExact(value);}
 }finally{detecting=false;}
}
async function toggleCamera(){
 if(stream){stopCamera();return;}
 if(!navigator.mediaDevices?.getUserMedia){status('Caméra non disponible sur ce navigateur. Vous pouvez importer une photo ou saisir le code.',true);return;}
 try{
  stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280}},audio:false});
  video.srcObject=stream;cameraBox.hidden=false;
  await video.play();
  el('finderCameraBtn').textContent='Arrêter la caméra';
  detector=await createDetector();
  status(detector?'Pointez le code EAN : il sera lu automatiquement. Vous pouvez aussi photographier le produit.':
   'La détection automatique du code n’est pas prise en charge ici. Photographiez le produit pour rechercher des ressemblances, ou saisissez l’EAN.');
  scanTimer=setInterval(()=>void scanFrame(),650);
 }catch(e){
  stopCamera();status('Accès à la caméra refusé ou indisponible. Utilisez une photo depuis la galerie ou la saisie EAN.',true);
 }
}
function drawThumbnail(source){
 const c=document.createElement('canvas');c.width=64;c.height=64;
 const ctx=c.getContext('2d',{willReadFrequently:true});
 if(!ctx)throw Error('Le navigateur ne permet pas la lecture des pixels.');
 ctx.fillStyle='#fff';ctx.fillRect(0,0,64,64);
 const w=source.naturalWidth||source.videoWidth||source.width;
 const h=source.naturalHeight||source.videoHeight||source.height;
 if(!w||!h)throw Error('L’image est vide.');
 const scale=Math.min(64/w,64/h);
 const sw=w*scale,sh=h*scale;
 ctx.drawImage(source,(64-sw)/2,(64-sh)/2,sw,sh);
 return ctx.getImageData(0,0,64,64).data;
}
function signature(source){
 const data=drawThumbnail(source),rgb=[],lum=[];
 // Répartition de couleur sur 4 × 4 zones, et empreinte de contours 9 × 8.
 for(let y=0;y<4;y++)for(let x=0;x<4;x++){
  let R=0,G=0,B=0;
  for(let j=0;j<16;j++)for(let i=0;i<16;i++){
   const n=((y*16+j)*64+x*16+i)*4;R+=data[n];G+=data[n+1];B+=data[n+2];
  }
  rgb.push(R/65280,G/65280,B/65280);
 }
 for(let y=0;y<8;y++){
  const line=[];
  for(let x=0;x<9;x++){
   const xx=Math.min(63,Math.floor((x+.5)*64/9)),yy=Math.floor((y+.5)*64/8),i=(yy*64+xx)*4;
   line.push((data[i]*.3+data[i+1]*.59+data[i+2]*.11)/255);
  }
  for(let x=0;x<8;x++)lum.push(line[x]>line[x+1]?1:0);
 }
 return {rgb,lum};
}
function difference(a,b){
 let color=0,edges=0;
 for(let i=0;i<a.rgb.length;i++){const d=a.rgb[i]-b.rgb[i];color+=d*d;}
 for(let i=0;i<a.lum.length;i++)edges+=a.lum[i]!==b.lum[i]?1:0;
 return .70*Math.sqrt(color/a.rgb.length)+.30*(edges/a.lum.length);
}
function loadImage(src){
 return new Promise((resolve,reject)=>{
  const img=new Image();
  img.onload=()=>resolve(img);img.onerror=()=>reject(Error('Photo catalogue inaccessible'));
  img.src=src;
 });
}
async function photoSignature(p){
 const url=safeImage(p.photo);
 if(!url)return null;
 if(photoFeatures.has(url))return photoFeatures.get(url);
 try{
  const img=await loadImage(url);
  const res=signature(img);
  photoFeatures.set(url,res);
  return res;
 }catch(e){return null;}
}
async function inspectImage(source){
 if(busy)return;
 busy=true;const currentRun=++runId;
 el('finderResults').innerHTML='';
 el('finderCaptureBtn').disabled=true;
 const sourceLabel=source instanceof File?'la photo choisie':'la photo prise';
 try{
  if(source instanceof File&&(!source.type.startsWith('image/')||source.size>16*1024*1024)){
   throw Error('Choisissez une image JPG/PNG/WebP de moins de 16 Mo.');
  }
  const img=source instanceof File?await createImageBitmap(source):source;
  status('Analyse locale de '+sourceLabel+'…');
  const ean=await detectCode(img);
  if(ean){
   if(source instanceof File&&typeof img.close==='function')img.close();
   el('finderEan').value=ean;
   showExact(ean);
   return;
  }
  const input=signature(img);
  if(source instanceof File&&typeof img.close==='function')img.close();
  // Les images du Book sont chargées à la demande : pour une comparaison
  // photographique, préparer la bibliothèque complète sans appel d'IA.
  if(window.BOOK_SUPABASE_CONFIG?.url&&typeof bookEnsureMedia==='function'){
   status('Préparation des photos du catalogue pour la comparaison…');
   await bookEnsureMedia(catalog().map(p=>p.reference));
   if(currentRun!==runId)return;
  }
  const entries=catalog().filter(p=>safeImage(p.photo));
  if(!entries.length)throw Error('Le catalogue ne dispose pas encore de photos comparables.');
  const matches=[],limit=6;let index=0,complete=0;
  async function worker(){
   while(index<entries.length){
    if(currentRun!==runId)return;
    const p=entries[index++];
    const ref=await photoSignature(p);
    if(ref)matches.push({p,score:difference(input,ref)});
    if(++complete%25===0)status('Comparaison locale des photos : '+complete+' / '+entries.length+'…');
   }
  }
  await Promise.all(Array.from({length:6},()=>worker()));
  if(currentRun!==runId)return;
  matches.sort((a,b)=>a.score-b.score);
  if(!matches.length)throw Error('Aucune photo du catalogue n’a pu être comparée.');
  const top=matches.slice(0,limit);
  el('finderResults').innerHTML='<h3>Produits visuellement ressemblants</h3><p class="finder-warning">Comparaison indicative : une photo ne permet pas de garantir la référence, la taille ou le coloris. Vérifiez les dimensions et l’EAN avant de choisir.</p>'+top.map(x=>makeResult(x.p)).join('');
  status('Comparaison effectuée localement sur '+matches.length+' photos du catalogue. Les premières suggestions ne sont pas des identifications certaines.');
 }catch(e){
  if(currentRun===runId){el('finderResults').innerHTML='';status(e.message||'Impossible d’analyser cette image.',true);}
 }finally{
  busy=false;el('finderCaptureBtn').disabled=false;
 }
}
function capture(){
 if(!stream||video.readyState<2){status('Activez la caméra avant de photographier.',true);return;}
 const c=document.createElement('canvas');c.width=video.videoWidth;c.height=video.videoHeight;
 c.getContext('2d').drawImage(video,0,0,c.width,c.height);
 stopCamera();
 void inspectImage(c);
}
el('identifyProductBtn').addEventListener('click',open);
el('finderClose').addEventListener('click',close);
dialog.addEventListener('close',()=>{runId++;stopCamera();});
el('finderCameraBtn').addEventListener('click',()=>void toggleCamera());
el('finderCaptureBtn').addEventListener('click',capture);
el('finderEanBtn').addEventListener('click',()=>showExact(el('finderEan').value));
el('finderEan').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();showExact(e.target.value);}});
el('finderPhoto').addEventListener('change',e=>{const file=e.target.files?.[0];if(file){stopCamera();void inspectImage(file);}});
el('finderResults').addEventListener('click',e=>{
 const btn=e.target.closest('[data-finder-ref]');if(!btn)return;
 const p=catalog().find(p=>p.reference===btn.dataset.finderRef);if(!p)return;
 close();
 state.search=p.reference;state.rayon=p.rayon;state.group='';
 el('searchInput').value=p.reference;el('rayonSelect').value=p.rayon;
 render();el('toolSection').scrollIntoView({behavior:'smooth',block:'start'});
});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&stream)stopCamera();});
window.BookProductFinder={open,close};
})();
