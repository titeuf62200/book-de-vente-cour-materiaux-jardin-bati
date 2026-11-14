/* Nuanciers adaptatifs du Book : enrichissement depuis les références réelles.
   Pas de dimension inventée : seuls les formats explicitement cités sont retenus.
   Le catalogue Supabase reste la source de vérité, sans copie statique. */
(function(){
 'use strict';
 function normal(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();}
 function num(n){return Number(String(n).replace(',','.'));}
 function mm(n,unit){return Math.round(num(n)*(unit==='cm'?10:1)*10)/10;}
 function family(p){
  const title=normal(p.designation), group=normal(p.sousRayon);
  if(p.rayon==='Matériaux' && p.sousRayonCode==='020' &&
     /LAMBOURDE|PLANCHE|POTEAU|LISSE|CHEVRON|POUTRE|VOLIGE|MADRIER|BASTAING|LITEAU|LATTE/.test(title))return 'charpente';
  if(p.rayon==='Jardin'){
   if(/PAS JAPONAIS/.test(group)||/PAS JAP/.test(title))return 'pas-japonais';
   if(/PAV[EÉ]S/.test(group)||/\bPAVE\b/.test(title))return 'paves';
   if(/BORDURE/.test(group)||/\bBORDURE\b/.test(title))return 'bordures';
   if(/DALL/.test(group)||/\bDALLE\b/.test(title))return 'dalles';
  }
  return '';
 }
 function parseProduct(p){
  const kind=family(p);
  if(!kind)return null;
  const title=normal(p.designation).replace(/\s+/g,' ');
  if(kind==='charpente'){
   const pair=title.match(/\b(\d{2,3}(?:[.,]\d+)?)\s*[X×*]\s*(\d{2,3}(?:[.,]\d+)?)(?!\d)/);
   if(!pair)return null;
   const a=num(pair[1]),b=num(pair[2]);
   if(a<10||b<10||a>300||b>300)return null;
   const length=title.match(/(?:^|[\s(])(\d+(?:[.,]\d+)?)\s*M(?:\b|\s|\))/);
   return {kind,w:a,h:b,length:length?Math.round(num(length[1])*1000):0,unit:'mm'};
  }
  if(kind==='bordures')return null; // Les anciens profils sont déjà validés ; pas d'approximation.
  const triplet=title.match(/(\d{2,3}(?:[.,]\d+)?)\s*[X×*]\s*(\d{2,3}(?:[.,]\d+)?)\s*[X×*]\s*(\d{1,2}(?:[.,]\d+)?)\s*CM\b/);
  let a,b,e;
  if(triplet){a=mm(triplet[1],'cm');b=mm(triplet[2],'cm');e=mm(triplet[3],'cm');}
  else {
   const pair=title.match(/(\d{2,3}(?:[.,]\d+)?)\s*[X×*]\s*(\d{2,3}(?:[.,]\d+)?)\s*CM\b/);
   const thick=title.match(/(?:EP(?:AISSEUR)?\s*|EPAISSEUR\s*)(\d{1,2}(?:[.,]\d+)?)\s*MM\b/);
   if(!pair||!thick)return null;
   a=mm(pair[1],'cm');b=mm(pair[2],'cm');e=mm(thick[1],'mm');
  }
  if(a<60||b<60||a>1200||b>1200||e<=0||e>150)return null;
  // Les pas japonais sont irréguliers : dimensions = rectangle enveloppe, pas contour exact.
  return {kind,w:a,h:b,length:e,unit:'mm'};
 }
 function expand(rayon, products, profiles){
  const represented=new Set(profiles.flatMap(p=>p.refs||[]).map(String));
  const output=profiles.filter(p=>p.kind && (p.refs||[]).some(ref=>products.some(x=>!x.archived&&x.rayon===rayon&&String(x.reference)===String(ref))))
      .map(p=>({...p,refs:p.refs.filter(ref=>products.some(x=>!x.archived&&x.rayon===rayon&&String(x.reference)===String(ref)))}));
  const byKey=new Map();
  for(const p of products){
   if(p.archived||p.rayon!==rayon||represented.has(String(p.reference)))continue;
   const parsed=parseProduct(p);
   if(!parsed)continue;
   const key=[parsed.kind,parsed.w,parsed.h,parsed.length].join('-');
   let entry=byKey.get(key);
   if(!entry){
    const name=(parsed.kind==='charpente'?'SECTION BOIS':parsed.kind==='pas-japonais'?'PAS JAPONAIS':parsed.kind==='dalles'?'DALLE':'PAVÉ')+
       ' '+(parsed.w/10)+' × '+(parsed.h/10)+' cm'+(parsed.kind==='charpente'?' · COUPE':(' · ÉP. '+parsed.length/10+' cm'));
    entry={id:'auto-'+key,kind:parsed.kind,name,w:parsed.w,h:parsed.h,length:parsed.length,refs:[],auto:true};
    byKey.set(key,entry);
   }
   entry.refs.push(String(p.reference));
  }
  return output.concat([...byKey.values()]);
 }
 window.BookSmartNuancier={expand,parseProduct};
})();