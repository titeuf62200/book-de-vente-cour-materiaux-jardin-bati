/* Palette HSV pour les couleurs des sous-rayons — souris, tactile et clavier. */
(function(){
 'use strict';
 const el=id=>document.getElementById(id);
 const clamp=n=>Math.min(1,Math.max(0,n));
 let selected={h:0,s:0,v:1};

 function hexToHsv(hex){
  const r=parseInt(hex.slice(1,3),16)/255,g=parseInt(hex.slice(3,5),16)/255,b=parseInt(hex.slice(5,7),16)/255;
  const hi=Math.max(r,g,b),lo=Math.min(r,g,b),delta=hi-lo;
  let h=0;
  if(delta){
   if(hi===r)h=((g-b)/delta)%6;
   else if(hi===g)h=(b-r)/delta+2;
   else h=(r-g)/delta+4;
   h=(h*60+360)%360;
  }
  return {h:h,s:hi===0?0:delta/hi,v:hi};
 }
 function hsvToHex(h,s,v){
  const chroma=v*s,sector=(h%360)/60,second=chroma*(1-Math.abs(sector%2-1));
  const triplets=[[chroma,second,0],[second,chroma,0],[0,chroma,second],[0,second,chroma],[second,0,chroma],[chroma,0,second]];
  const rgb=triplets[Math.min(5,Math.floor(sector))],offset=v-chroma;
  return '#'+rgb.map(n=>Math.round((n+offset)*255).toString(16).padStart(2,'0')).join('').toUpperCase();
 }
 function drawPicker(changeText){
  const hex=hsvToHex(selected.h,selected.s,selected.v);
  el('sectorColorInput').value=hex;
  const square=el('sectorColorSquare');
  square.style.setProperty('--picker-hue',String(selected.h));
  el('sectorColorCursor').style.left=(selected.s*100)+'%';
  el('sectorColorCursor').style.top=((1-selected.v)*100)+'%';
  el('sectorHueInput').value=String(Math.round(selected.h)%360);
  el('sectorColorSample').style.backgroundColor=hex;
  if(changeText!==false)el('sectorColorHexInput').value=hex;
  square.setAttribute('aria-label','Nuance choisie '+hex+'. Flèches gauche et droite : saturation, haut et bas : luminosité.');
  if(typeof updateSectorPreview==='function')updateSectorPreview();
 }
 window.setSectorColorPicker=function(hex){
  const color=String(hex||'').toUpperCase();
  selected=/^#[0-9A-F]{6}$/.test(color)?hexToHsv(color):{h:0,s:0,v:1};
  drawPicker(true);
 };
 window.initSectorColorPicker=function(){
  const square=el('sectorColorSquare'),hue=el('sectorHueInput'),hexField=el('sectorColorHexInput');
  if(!square||!hue||!hexField)return;
  let dragId=null;
  function pickPoint(event){
   const bounds=square.getBoundingClientRect();
   if(!bounds.width||!bounds.height)return;
   selected.s=clamp((event.clientX-bounds.left)/bounds.width);
   selected.v=1-clamp((event.clientY-bounds.top)/bounds.height);
   drawPicker(true);
  }
  square.addEventListener('pointerdown',event=>{
   if(event.pointerType==='mouse'&&event.button!==0)return;
   dragId=event.pointerId;
   if(square.setPointerCapture)square.setPointerCapture(dragId);
   pickPoint(event);event.preventDefault();
  });
  square.addEventListener('pointermove',event=>{if(dragId===event.pointerId)pickPoint(event);});
  function endDrag(event){if(dragId===event.pointerId)dragId=null;}
  square.addEventListener('pointerup',endDrag);
  square.addEventListener('pointercancel',endDrag);
  square.addEventListener('lostpointercapture',()=>{dragId=null;});
  square.addEventListener('keydown',event=>{
   const step=event.shiftKey?.1:.02;
   if(event.key==='ArrowLeft')selected.s=clamp(selected.s-step);
   else if(event.key==='ArrowRight')selected.s=clamp(selected.s+step);
   else if(event.key==='ArrowUp')selected.v=clamp(selected.v+step);
   else if(event.key==='ArrowDown')selected.v=clamp(selected.v-step);
   else return;
   event.preventDefault();drawPicker(true);
  });
  hue.addEventListener('input',()=>{selected.h=Number(hue.value);drawPicker(true);});
  hexField.addEventListener('input',()=>{
   const text=hexField.value.trim().replace(/^#?/,'#').toUpperCase();
   if(/^#[0-9A-F]{6}$/.test(text)){selected=hexToHsv(text);drawPicker(false);hexField.setCustomValidity('');}
   else hexField.setCustomValidity('Saisir une couleur à 6 chiffres, par exemple #8547AF.');
  });
  hexField.addEventListener('blur',()=>{
   const text=hexField.value.trim().replace(/^#?/,'#').toUpperCase();
   hexField.setCustomValidity('');
   if(/^#[0-9A-F]{6}$/.test(text)){selected=hexToHsv(text);drawPicker(true);}
   else hexField.value=el('sectorColorInput').value;
  });
  window.setSectorColorPicker(el('sectorColorInput').value||'#547FAD');
 };
})();