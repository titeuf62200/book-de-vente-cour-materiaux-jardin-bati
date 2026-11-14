/*
 * Book de vente Calais — version autonome depuis le PDF du 23/10/2026.
 * Pas d'appel réseau ; les photos et croquis originaux sont dans /assets.
 * Les données modifiées sont enregistrées dans localStorage du navigateur.
 */
'use strict';
const INITIAL = Array.isArray(window.BOOK_INITIAL_PRODUCTS) ? window.BOOK_INITIAL_PRODUCTS : [];
const STORAGE = 'book_vente_calais_v1';
const UNIVERSES = ['Matériaux','Jardin'];
const MASTER_GROUPS = {"Matériaux":["Maçonnerie - Chapeaux de piliers","Maçonnerie - Éléments de piliers","Maçonnerie - Couvre-murs","Bois de charpente - Madriers","Bois de charpente - Bastaings","Bois de charpente - Chevrons","Bois de charpente - Poutres","Bois brut - Liteaux et lattes","Bois brut - Demi-bastaings","Bois brut - Lambourdes","Panneaux - OSB"],"Jardin":["Clôtures - Panneaux et portillons","Clôtures - Poteaux","Clôtures - Lames, profils et poteaux","Clôtures - Accessoires et fixations","Clôtures - Entretien","Terrasses - Lames et lambourdes","Terrasses - Dalles bois et clipsables","Terrasses - Accessoires et pose","Sols extérieurs - Pavés","Sols extérieurs - Dalles minérales","Sols extérieurs - Pas japonais","Sols extérieurs - Bordures béton","Sols extérieurs - Bordures bois, PVC et métal","Sols extérieurs - Graviers et galets","Sols extérieurs - Gazon synthétique","Sols extérieurs - Aménagement et plots","Jardin - Divers"]};

/* Nomenclatures sous-rayons photographiées : numéros propres à chaque univers. */
const OFFICIAL_SECTORS = {"Matériaux":[{"code":"001","name":"MATÉRIEL DE CONSTRUCTION","color":"#547FAD"},{"code":"005","name":"POUDRES","color":"#D7A23D"},{"code":"010","name":"ÉLÉMENTS DE CONSTRUCTION","color":"#D97B8B"},{"code":"015","name":"AGRÉGATS","color":"#83974D"},{"code":"016","name":"BOIS DE CHAUFFAGE ET PELLETS","color":"#BA8156"},{"code":"019","name":"PANNEAUX ET DALLES","color":"#5CA7A9"},{"code":"020","name":"BOIS BRUT","color":"#9675BA"},{"code":"021","name":"BARDAGES ET CLINS","color":"#D68C68"},{"code":"023","name":"TOITURE PRIMAIRE POUR MAISON","color":"#638FCD"},{"code":"024","name":"TOITURE SECONDAIRE POUR ANNEXE","color":"#B46FB4"},{"code":"025","name":"ÉVACUATION EAUX DE PLUIE/USÉES","color":"#47A28E"},{"code":"030","name":"ÉTANCHÉITÉ - PROTECTION","color":"#B78D4A"},{"code":"035","name":"ISOLATION DE L'HABITAT","color":"#77A457"},{"code":"040","name":"CLOISON - PLAFOND","color":"#6E89A6"},{"code":"094","name":"OBI","color":"#C27D97"},{"code":"099","name":"ARTICLES SERVICES","color":"#7B8B98"}],"Jardin":[{"code":"004","name":"VÉGÉTAL & SEMIS","color":"#64A65A"},{"code":"024","name":"OUTIL & MATÉRIEL DU JARDINIER","color":"#CA824B"},{"code":"032","name":"PRODUITS DE SOIN DU JARDIN","color":"#94B64F"},{"code":"036","name":"ARROSAGE & GESTION DE L'EAU","color":"#48A5C3"},{"code":"040","name":"OUTILLAGE MOTORISÉ & NHP","color":"#D77361"},{"code":"054","name":"CONTENANTS & DÉCORATION","color":"#B387B7"},{"code":"056","name":"SOL EXTÉRIEUR","color":"#D6AD47"},{"code":"060","name":"DÉLIMITATION DE TERRAIN","color":"#71AD8F"},{"code":"064","name":"PORTAIL","color":"#8294C2"},{"code":"068","name":"ABRI CARPORT & RANGEMENT","color":"#A0936D"},{"code":"071","name":"PERGOLA","color":"#8BA35D"},{"code":"072","name":"MOBILIER DE JARDIN & PARASOL","color":"#C39B74"},{"code":"074","name":"CUISSON EXTÉRIEURE","color":"#D68062"},{"code":"080","name":"PISCINE & SPA","color":"#53B3BE"},{"code":"096","name":"ANIMALERIE","color":"#A084BC"},{"code":"097","name":"JEUX DE PLEIN AIR","color":"#E0A76A"},{"code":"099","name":"ARTICLES SERVICES","color":"#82949A"}]};
const UNASSIGNED_SECTOR={code:'UNASSIGNED',name:'À CLASSER — ANCIENNES RÉFÉRENCES',color:'#93A1A8'};
let sectorOverrides=Object.create(null);
function sectorOverrideKey(rayon,code){return rayon+'::'+code;}
function sectorView(rayon,sector){const o=sectorOverrides[sectorOverrideKey(rayon,sector.code)];return {...sector,displayCode:o?.display_code||sector.code,name:o?.display_name||sector.name,color:o?.color||sector.color,hidden:!!o?.is_hidden};}
function officialSector(rayon,code){const d=(OFFICIAL_SECTORS[rayon]||[]).find(d=>d.code===code);return d?sectorView(rayon,d):null;}
function inferOfficialCode(rayon,family){
 const s=String(family||'');
 if(rayon==='Matériaux'){
  if(s.startsWith('Maçonnerie - '))return '010';
  if(s.startsWith('Panneaux - '))return '019';
  if(s.startsWith('Bois brut - ')||s.startsWith('Bois de charpente - '))return '020';
 }
 if(rayon==='Jardin'){
  if(s.startsWith('Clôtures - '))return '060';
  if(s.startsWith('Terrasses - ')||s.startsWith('Sols extérieurs - '))return '056';
 }
 return '';
}
function productSectorCode(p){return officialSector(p.rayon,p.sousRayonCode)?.code||inferOfficialCode(p.rayon,p.sousRayon)||'';}
function productSectorKey(p){return productSectorCode(p)||'UNASSIGNED';}
function sectorList(rayon,collection=products,includeEmpty=false,includeHidden=false){
 const known=(OFFICIAL_SECTORS[rayon]||[]).map(d=>sectorView(rayon,d)).filter(d=>includeHidden||!d.hidden);
 const departments=known.filter(d=>includeEmpty||collection.some(p=>p.rayon===rayon&&productSectorKey(p)===d.code)).sort((a,b)=>a.displayCode.localeCompare(b.displayCode,'fr',{numeric:true}));
 if(collection.some(p=>p.rayon===rayon&&productSectorKey(p)==='UNASSIGNED'))departments.push(UNASSIGNED_SECTOR);
 return departments;
}

const GROUP_COLORS = {"Matériaux":{"Maçonnerie - Chapeaux de piliers":"#EC7FA1","Maçonnerie - Éléments de piliers":"#F4A261","Maçonnerie - Couvre-murs":"#87BD93","Bois de charpente - Madriers":"#7DA9E6","Bois de charpente - Bastaings":"#B89AE9","Bois de charpente - Chevrons":"#E7CA61","Bois de charpente - Poutres":"#6DC4CA","Bois brut - Liteaux et lattes":"#D898B5","Bois brut - Demi-bastaings":"#A9B965","Bois brut - Lambourdes":"#C68D64","Panneaux - OSB":"#89A9D3"},"Jardin":{"Clôtures - Panneaux et portillons":"#EC7FA1","Clôtures - Poteaux":"#F4A261","Clôtures - Lames, profils et poteaux":"#87BD93","Clôtures - Accessoires et fixations":"#7DA9E6","Clôtures - Entretien":"#B89AE9","Terrasses - Lames et lambourdes":"#E7CA61","Terrasses - Dalles bois et clipsables":"#6DC4CA","Terrasses - Accessoires et pose":"#D898B5","Sols extérieurs - Pavés":"#A9B965","Sols extérieurs - Dalles minérales":"#C68D64","Sols extérieurs - Pas japonais":"#89A9D3","Sols extérieurs - Bordures béton":"#E89C80","Sols extérieurs - Bordures bois, PVC et métal":"#77B89C","Sols extérieurs - Graviers et galets":"#D6B17C","Sols extérieurs - Gazon synthétique":"#A494CF","Sols extérieurs - Aménagement et plots":"#D88AA5","Jardin - Divers":"#8EA4AB"}};
function groupColor(rayon,group){
 const predefined=GROUP_COLORS[rayon]?.[group];if(predefined)return predefined;
 let code=0;for(const c of String(group))code=((code*31)+c.charCodeAt(0))>>>0;
 return ['#EC7FA1','#F4A261','#87BD93','#7DA9E6','#B89AE9','#E7CA61','#6DC4CA','#D898B5'][code%8];
}
function hexBright(s){return s||'#e8eced';}

const $ = id => document.getElementById(id);
let products = loadProducts();
let state = {rayon:'all', group:'', search:'', admin:false, showArchived:false};
let originalEditReference = null;
let toastTimer = null;

function escapeHtml(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function normalize(s){return String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/lit[eé]aux|liteau/g,'lito');}

// Tri unique pour l'affichage, les exports Excel et les PDF : sous-rayon officiel,
// puis nom principal du produit (jamais par numéro de référence).
const PRODUCT_SORT_COLLATOR = new Intl.Collator('fr', {sensitivity:'base',numeric:true,ignorePunctuation:true});
const PRODUCT_SORT_TERMS = [
 ['liteau',/\b(?:liteau|liteaux|lito|litos)\b/],
 ['madrier',/\bmadriers?\b/],
 ['bastaing',/\bbastaings?\b/],
 ['chevron',/\bchevrons?\b/],
 ['lambourde',/\blambourdes?\b/],
 ['lame',/\blames?\b/],
 ['latte',/\blattes?\b/],
 ['poutre',/\bpoutres?\b/],
 ['panneau',/\bpanneau(?:x)?\b/],
 ['poteau',/\bpoteau(?:x)?\b/],
 ['portillon',/\bportillons?\b/],
 ['bordure',/\bbordures?\b/],
 ['dalle',/\bdalles?\b/],
 ['pave',/\bpaves?\b/],
 ['gravier',/\bgraviers?\b/],
 ['galet',/\bgalets?\b/],
 ['gazon',/\bgazons?\b/],
 ['plot',/\bplots?\b/],
 ['traverse',/\btraverses?\b/],
 ['chapeau',/\bchapeaux?\b/],
 ['couvre-mur',/\bcouvre[\s-]?murs?\b/],
 ['osb',/\bosb\b/]
];
const PRODUCT_SORT_PREFIXES = new Set('bois brut brute charpente construction pin sapin epicea traite traitee traites traitees autoclave classe rabote rabotee rabotes rabotees interieur exterieur de du des d le la les un une en pour avec sans jardin cloture terrasse materiaux lot lots pack paquet jeu sachet piece pieces section longueur largeur epaisseur dimension profil produit'.split(' '));
function productAlphabeticKey(p){
 const full=String(p.designation||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
 let primary=null;
 for(const [name,pattern] of PRODUCT_SORT_TERMS){
  const match=pattern.exec(full);
  if(!match)continue;
  const prefix=full.slice(0,match.index).match(/[a-z]+/g)||[];
  if(prefix.every(word=>PRODUCT_SORT_PREFIXES.has(word))&&(!primary||match.index<primary.index))primary={name,index:match.index};
 }
 if(primary)return primary.name+' '+full;
 return full.replace(/^(?:(?:lot|pack|jeu|sachet|boite)\s+(?:de|des|d)?\s*|\d+\s+|(?:un|une|le|la|les|de|du|des)\s+)+/g,'').trim()||full;
}
function compareProductsAlphabetically(a,b){
 return PRODUCT_SORT_COLLATOR.compare(productAlphabeticKey(a),productAlphabeticKey(b))
  ||PRODUCT_SORT_COLLATOR.compare(a.designation,b.designation)
  ||PRODUCT_SORT_COLLATOR.compare(a.reference,b.reference);
}
function sortProductsAlphabetically(items){return items.slice().sort(compareProductsAlphabetically);}

function safeImage(s){s=String(s||'');return /^(?:assets\/[a-z0-9_-]+_(?:photo|croquis|ean)\.(?:webp|png|jpe?g)|data:image\/(?:png|jpeg|webp|svg\+xml);base64,[a-z0-9+/=]+)$/i.test(s)?s:'';}
function cleanItem(p){return {reference:String(p.reference??'').trim(),designation:String(p.designation??'').trim(),ean:String(p.ean??'').trim(),rayon:UNIVERSES.includes(p.rayon)?p.rayon:'Jardin',sousRayon:String(p.sousRayon??'Divers').trim(),sousRayonCode:officialSector(p.rayon,p.sousRayonCode)?p.sousRayonCode:inferOfficialCode(p.rayon,p.sousRayon),photo:safeImage(p.photo),croquis:safeImage(p.croquis),barcode:safeImage(p.barcode),notes:String(p.notes??'').trim(),pageSource:Number(p.pageSource)||null,archived:!!p.archived};}
function loadProducts(){if(window.BOOK_SUPABASE_CONFIG?.url)return INITIAL.map(cleanItem);try{const saved=JSON.parse(localStorage.getItem(STORAGE));if(Array.isArray(saved)&&saved.length)return saved.map(cleanItem);}catch(e){console.warn('Sauvegarde locale indisponible',e)}return INITIAL.map(cleanItem);}
function saveProducts(){if(window.BOOK_SUPABASE_CONFIG?.url)throw Error('Enregistrement local désactivé : utiliser la sauvegarde distante');try{localStorage.setItem(STORAGE,JSON.stringify(products));$('saveStatus').textContent='Enregistré dans ce navigateur';if(typeof triggerBackendSave==='function')triggerBackendSave();return true;}catch(e){console.error(e);toast('Mémoire du navigateur saturée. Exportez une sauvegarde JSON.');return false;}}
function toast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3500);}
function validEan(ean){if(!/^\d{13}$/.test(ean))return false;const d=[...ean].map(Number);const sum=d.slice(0,12).reduce((s,v,i)=>s+v*(i%2?3:1),0);return (10-sum%10)%10===d[12];}
function barcodeDataURL(ean){if(!validEan(ean))return '';
 const A=['0001101','0011001','0010011','0111101','0100011','0110001','0101111','0111011','0110111','0001011'];
 const B=['0100111','0110011','0011011','0100001','0011101','0111001','0000101','0010001','0001001','0010111'];
 const C=['1110010','1100110','1101100','1000010','1011100','1001110','1010000','1000100','1001000','1110100'];
 const PAR=['AAAAAA','AABABB','AABBAB','AABBBA','ABAABB','ABBAAB','ABBBAA','ABABAB','ABABBA','ABBABA'];
 const first=Number(ean[0]);let bits='101';for(let i=1;i<=6;i++)bits+=(PAR[first][i-1]==='A'?A:B)[Number(ean[i])];bits+='01010';for(let i=7;i<13;i++)bits+=C[Number(ean[i])];bits+='101';
 let bars='';let x=12;for(const b of bits){if(b==='1')bars+=`<rect x="${x}" y="4" width="2" height="58"/>`;x+=2;}
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="215" height="85" viewBox="0 0 215 85"><rect width="215" height="85" fill="white"/><g fill="#111">${bars}</g><text x="107" y="78" text-anchor="middle" font-family="Arial" font-size="14" letter-spacing="1">${ean}</text></svg>`;
 return 'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(svg);
}
function imageMarkup(src,description){return src?`<img src="${escapeHtml(src)}" alt="${escapeHtml(description)}" loading="lazy" decoding="async">`:`<div class="media-empty" role="img" aria-label="Illustration indisponible">Photo non disponible</div>`;}

function imageZoomMarkup(p,kind){
 const src=safeImage(p[kind]);
 if(!src)return '<div class="media-empty" role="img" aria-label="'+(kind==='croquis'?'Croquis':'Photo')+' indisponible">'+(kind==='croquis'?'Croquis non disponible':'Photo non disponible')+'</div>';
 const title=kind==='croquis'?'croquis coté':'photo du produit';
 return '<button type="button" class="media-zoom-trigger" data-view-image="'+escapeHtml(p.reference)+'" data-view-kind="'+kind+'" title="Agrandir le '+title+'" aria-label="Agrandir le '+title+' de la référence '+escapeHtml(p.reference)+'"><img src="'+escapeHtml(src)+'" loading="lazy" decoding="async" alt="'+escapeHtml(title+' '+p.designation)+'"><span class="media-zoom-label" aria-hidden="true">⤢ Agrandir</span></button>';
}


function getShown(){
 return products.filter(p=>
  (!p.archived||state.showArchived)
  &&(state.rayon==='all'||p.rayon===state.rayon)
  &&(!state.group||productSectorKey(p)===state.group)
  &&(!state.search||normalize([p.reference,p.designation,p.ean,p.sousRayon,productSectorCode(p),officialSector(p.rayon,productSectorCode(p))?.name||'',officialSector(p.rayon,productSectorCode(p))?.displayCode||'',p.notes].join(' ')).includes(normalize(state.search)))
 );
}

function productMarkup(p){let isArchived=p.archived?' archived':'';let barcode=barcodeDataURL(p.ean);
return `<article class="product-card${isArchived}">
 <div class="product-top"><div class="product-title-line"><div class="reference">RÉF. ${escapeHtml(p.reference)}${p.archived?' · ARCHIVÉE':''}</div>${state.admin?`<button type="button" class="ref-trash" data-archive="${escapeHtml(p.reference)}" title="${p.archived?'Restaurer cette référence':'Retirer du catalogue et des prochains PDF'}" aria-label="${p.archived?'Restaurer':'Supprimer'} la référence ${escapeHtml(p.reference)}">${p.archived?'↶':'🗑'}</button>`:''}</div><h4 class="product-title">${escapeHtml(p.designation)}</h4><div class="catalogue-product-family">${escapeHtml(p.sousRayon)}</div></div>
 <div class="product-media"><figure class="media-box"><figcaption>PHOTO DU PRODUIT</figcaption><div class="image-contain">${imageZoomMarkup(p,'photo')}</div></figure><figure class="media-box"><figcaption>CROQUIS COTÉ</figcaption><div class="image-contain">${imageZoomMarkup(p,'croquis')}</div></figure></div>
 <figure class="barcode-box"><figcaption>EAN-13${!p.ean?' non renseigné':''}</figcaption>${barcode?`<img src="${escapeHtml(barcode)}" loading="lazy" alt="Code-barres ${escapeHtml(p.ean)}">`:`<span class="ean-numeric">EAN à saisir</span>`}</figure>
 ${p.notes?`<div class="product-notes">⚠ ${escapeHtml(p.notes)}</div>`:''}
 ${state.admin?`<div class="admin-actions"><button class="btn btn-simple" data-edit="${escapeHtml(p.reference)}">✎ Modifier</button><button class="btn ${p.archived?'btn-primary':'btn-danger'}" data-archive="${escapeHtml(p.reference)}">${p.archived?'↺ Restaurer':'🗑 Supprimer'}</button></div>`:''}</article>`;
}

const expandedChapters=new Set();
let showHiddenSectors=false;
function catalogSectorId(rayon,code){
 return 'book-sector-'+(rayon==='Jardin'?'jardin':'bati')+'-'+String(code).replace(/[^A-Za-z0-9_-]/g,'-');
}
function buildSidebar(){
 const activeProducts=products.filter(p=>!p.archived);
 const counts={};
 for(const rayon of UNIVERSES)counts[rayon]=activeProducts.filter(p=>p.rayon===rayon).length;
 $('sideTotal').textContent=activeProducts.length;
 document.querySelector('.nav-home').classList.toggle('active',state.rayon==='all'&&!state.group);
 $('sidebarChapters').innerHTML=UNIVERSES.map((rayon,i)=>{
  const departments=sectorList(rayon,activeProducts,true,showHiddenSectors&&state.admin);
  const expanded=expandedChapters.has(rayon);
  const groupId=i?'book-menu-jardin':'book-menu-bati';
  const buttons=departments.map(d=>{
   const n=activeProducts.filter(p=>p.rayon===rayon&&productSectorKey(p)===d.code).length;
   const color=d.color,editable=state.admin&&typeof bookCanEdit==='function'&&bookCanEdit()&&d.code!=='UNASSIGNED';
   const gear=editable?'<button type="button" class="sector-config-btn" data-config-rayon="'+escapeHtml(rayon)+'" data-config-code="'+escapeHtml(d.code)+'" title="Configurer cette sous-famille" aria-label="Modifier le titre, le numéro et la couleur de '+escapeHtml(d.name)+'">⚙</button>':'';
   const trash=editable?'<button type="button" class="sector-remove-btn'+(d.hidden?' restore':'')+'" '+(d.hidden?'data-restore-rayon':'data-delete-rayon')+'="'+escapeHtml(rayon)+'" '+(d.hidden?'data-restore-code':'data-delete-code')+'="'+escapeHtml(d.code)+'" title="'+(d.hidden?'Restaurer cette sous-famille':'Supprimer cette sous-famille après transfert de ses références')+'" aria-label="'+(d.hidden?'Restaurer':'Supprimer')+' '+escapeHtml(d.name)+'">'+(d.hidden?'↶':'🗑')+'</button>':'';
   return '<div class="side-sector-row'+(d.hidden?' side-sector-hidden':'')+'"><button type="button" class="group-btn official-group-btn '+(state.rayon===rayon&&state.group===d.code?'active':'')+'" data-rayon="'+escapeHtml(rayon)+'" data-group="'+escapeHtml(d.code)+'" style="--department-color:'+color+'" aria-label="Voir les produits de '+escapeHtml(d.name)+'"><span class="group-color-dot" style="background:'+color+'"></span><span class="department-nav-name"><b>'+escapeHtml(d.code==='UNASSIGNED'?'?':d.displayCode)+'</b> — '+escapeHtml(d.name)+(d.hidden?' · masqué':'')+'</span><span class="count">'+n+'</span></button>'+gear+trash+'</div>';
  }).join('');
  const chapterTitle=i?'009 — Jardin':'001 — Matériaux / Bâti';
  return '<div class="side-chapter"><button type="button" class="chapter-btn '+(i?'jardin':'')+' '+(state.rayon===rayon?'active':'')+'" data-chapter-rayon="'+escapeHtml(rayon)+'" aria-expanded="'+expanded+'" aria-controls="'+groupId+'" aria-label="'+(expanded?'Replier':'Déplier')+' les sous-rayons '+(i?'Jardin':'Matériaux et Bâti')+'"><span class="chap-name">'+chapterTitle+'</span><span class="count">'+counts[rayon]+'</span><span class="chapter-chevron" aria-hidden="true">⌄</span></button><div class="group-list" id="'+groupId+'"'+(expanded?'':' hidden')+'>'+buttons+'</div></div>';
 }).join('')+(state.admin&&typeof bookCanEdit==='function'&&bookCanEdit()?'<button type="button" class="show-hidden-sector-btn" data-toggle-hidden="true">'+(showHiddenSectors?'Masquer les sous-familles supprimées':'Afficher les sous-familles supprimées')+'</button>':'');
}

function updateSectorPreview(){
 const code=$('sectorCodeInput').value.trim(),color=$('sectorColorInput').value;
 $('sectorConfigPreview').style.setProperty('--sector-preview-color',color);
 $('sectorConfigPreviewCode').textContent=code||'000';
 $('sectorConfigPreviewName').textContent=$('sectorNameInput').value.trim()||'Sans titre';
 $('sectorConfigColorValue').textContent=color.toUpperCase();
}
function openSectorConfig(rayon,code){
 if(!state.admin||typeof bookCanEdit!=='function'||!bookCanEdit())return toast('Accès administrateur requis');
 const original=(OFFICIAL_SECTORS[rayon]||[]).find(d=>d.code===code);if(!original)return;
 const d=officialSector(rayon,code);
 $('sectorConfigTitle').textContent='Configurer · '+d.name;
 $('sectorNameInput').value=d.name;
 $('sectorConfigRayon').value=rayon;
 $('sectorConfigOriginalCode').value=code;
 $('sectorCodeInput').value=d.displayCode;
 window.setSectorColorPicker(d.color);
 updateSectorPreview();$('sectorConfigDialog').showModal();
}
async function submitSectorConfig(event){
 event.preventDefault();
 if(!state.admin||typeof bookCanEdit!=='function'||!bookCanEdit())return toast('Accès administrateur requis');
 const rayon=$('sectorConfigRayon').value,original=$('sectorConfigOriginalCode').value;
 const displayCode=$('sectorCodeInput').value.trim(),color=$('sectorColorInput').value.toUpperCase(),name=$('sectorNameInput').value.trim().replace(/\s+/g,' ');
 if(!/^\d{3}$/.test(displayCode))return toast('Saisissez 3 chiffres (ex. 056).');
 if(!/^#[0-9A-F]{6}$/.test(color))return toast('Couleur invalide.');
 if(name.length<2||name.length>100)return toast('Le titre doit contenir entre 2 et 100 caractères.');
 if(sectorList(rayon,[],true,true).some(d=>d.code!==original&&normalize(d.name)===normalize(name)))return toast('Ce titre est déjà utilisé dans ce rayon.');
 if(sectorList(rayon,[],true).some(d=>d.code!==original&&d.displayCode===displayCode))return toast('Ce numéro est déjà utilisé dans ce rayon.');
 const btn=$('sectorConfigSave');btn.disabled=true;btn.textContent='Enregistrement…';
 try{
  const hidden=!!officialSector(rayon,original)?.hidden;
  await bookSaveSectorSettings({rayon,sector_code:original,display_code:displayCode,color,display_name:name,is_hidden:hidden});
  sectorOverrides[sectorOverrideKey(rayon,original)]={display_code:displayCode,color,display_name:name,is_hidden:hidden};
  $('sectorConfigDialog').close();render();
  const ok=await bookRefresh();toast(ok?'Sous-famille « '+name+' » enregistrée et synchronisée':'Enregistré. Actualisez pour vérifier le catalogue.');
 }catch(e){toast('Impossible d’enregistrer : '+e.message);}
 finally{btn.disabled=false;btn.textContent='Enregistrer les modifications';}
}
async function resetSectorConfig(){
 if(!state.admin||typeof bookCanEdit!=='function'||!bookCanEdit())return;
 const rayon=$('sectorConfigRayon').value,original=$('sectorConfigOriginalCode').value;
 const btn=$('sectorConfigReset');btn.disabled=true;
 try{
  const base=OFFICIAL_SECTORS[rayon].find(s=>s.code===original);
  const isHidden=!!officialSector(rayon,original)?.hidden;
  await bookSaveSectorSettings({rayon,sector_code:original,display_code:base.code,color:base.color,display_name:base.name,is_hidden:isHidden});
  sectorOverrides[sectorOverrideKey(rayon,original)]={display_code:base.code,color:base.color,display_name:base.name,is_hidden:isHidden};
  $('sectorConfigDialog').close();render();
  const ok=await bookRefresh();toast(ok?'Titre, numéro et couleur d’origine rétablis':'Réinitialisé. Actualisez pour vérifier.');
 }catch(e){toast('Impossible de réinitialiser : '+e.message);}
 finally{btn.disabled=false;}
}
function render(){
 buildSidebar();
 const shown=getShown();
 const shownActive=products.filter(p=>!p.archived);
 $('bookBatiCount').textContent=shownActive.filter(p=>p.rayon==='Matériaux').length;
 $('bookJardinCount').textContent=shownActive.filter(p=>p.rayon==='Jardin').length;
 $('bookBatiSectorCount').textContent=sectorList('Matériaux',shownActive,false,true).length;
 $('bookJardinSectorCount').textContent=sectorList('Jardin',shownActive,false,true).length;
 $('heroTotal').textContent=shownActive.length;
 $('hero').hidden=!(state.rayon==='all'&&!state.group&&!state.search);
 $('rayonSelect').value=state.rayon;
 $('resultCount').textContent=shown.length+' produit'+(shown.length>1?'s':'');
 const selectedSector=state.rayon==='all'?null:sectorList(state.rayon,products,true).find(d=>d.code===state.group);
 $('resultTitle').textContent=selectedSector?(selectedSector.code==='UNASSIGNED'?'?':selectedSector.displayCode)+' — '+selectedSector.name:(state.rayon==='all'?'Catalogue complet':state.rayon);
 $('resultSub').textContent=(state.search?'Résultat de recherche : « '+state.search+' »':(selectedSector?state.rayon+' · Sous-rayon officiel':'Parcourir les sous-rayons numérotés'))+' · Produits classés de A à Z';
 $('emptyState').hidden=shown.length>0;
 let out='';
 for(const rayon of UNIVERSES){
  const matching=shown.filter(p=>p.rayon===rayon);if(!matching.length)continue;
  const departments=sectorList(rayon,matching,false);
  const number=rayon==='Matériaux'?'001':'009';
  out+='<section class="chapter-intro '+(rayon==='Jardin'?'jardin':'')+'"><div><div class="chapter-tag">RAYON '+number+'</div><h2>'+escapeHtml(rayon)+'</h2><p>'+matching.length+' références · '+departments.length+' sous-rayon'+(departments.length>1?'s':'')+' représentés</p></div><div class="chapter-index">'+number+'</div></section>';
  for(const d of departments){
   const entries=matching.filter(p=>productSectorKey(p)===d.code);
   if(!entries.length)continue;
   out+='<section id="'+catalogSectorId(rayon,d.code)+'" class="subcategory official-sector" style="--department-color:'+d.color+'"><header class="subcategory-header official-sector-header" style="background:linear-gradient(90deg,'+d.color+'3b,#fff);border-left:8px solid '+d.color+'"><h3><span class="official-number">'+escapeHtml(d.code==='UNASSIGNED'?'?':d.displayCode)+'</span> '+escapeHtml(d.name)+'</h3><span>'+entries.length+' réf.</span></header>';
   out+='<div class="products-grid">'+sortProductsAlphabetically(entries).map(productMarkup).join('')+'</div>';
   out+='</section>';
  }
 }
 $('catalogue').innerHTML=out;
}

function selectFilter(rayon,group=''){
 if(group&&UNIVERSES.includes(rayon))expandedChapters.add(rayon);
 state.rayon=rayon;state.group=group;state.search='';
 $('searchInput').value='';render();
 const target=(group?document.getElementById(catalogSectorId(rayon,group))||document.querySelector('.result-meta'):$('toolSection'));
 if(target)requestAnimationFrame(()=>target.scrollIntoView({behavior:'smooth',block:'start'}));
}
function toggleAdmin(){if(typeof bookCanEdit==='function'&&!bookCanEdit()){toast('Modification réservée aux administrateurs');return;}state.admin=!state.admin;$('app').classList.toggle('admin-on',state.admin);$('editToggle').setAttribute('aria-pressed',String(state.admin));$('editToggle').textContent=state.admin?'✓ Quitter le mode modification':'✎ Mode modification';$('adminPanel').hidden=!state.admin;$('addBtn').hidden=!state.admin;$('addTopBtn').hidden=!state.admin;render();toast(state.admin?'Modification des références activée':'Consultation activée');}

function updateDatalist(rayon,code,preferred=''){
 const sel=$('inputSousRayon');
 let options=MASTER_GROUPS[rayon].filter(g=>inferOfficialCode(rayon,g)===code);
 if(preferred&&!options.includes(preferred))options.push(preferred);
 options.push('Autres références');
 options=[...new Set(options)];
 sel.innerHTML=options.map(g=>'<option value="'+escapeHtml(g)+'">'+escapeHtml(g)+'</option>').join('');
 sel.value=options.includes(preferred)?preferred:options[0];
}
function updateDepartmentOptions(rayon,code='',preferredFamily=''){
 const sel=$('inputDept');
 sel.innerHTML='<option value="">Sélectionner le sous-rayon officiel…</option>'+
   sectorList(rayon,[],true).map(d=>'<option value="'+d.code+'">'+d.displayCode+' — '+escapeHtml(d.name)+'</option>').join('');
 sel.value=officialSector(rayon,code)?code:'';
 updateDatalist(rayon,sel.value,preferredFamily);
}
function showForm(ref=null){
 if(!state.admin||typeof bookCanEdit==='function'&&!bookCanEdit())return toast('Accès administrateur requis');
 originalEditReference=ref;
 const p=ref?products.find(x=>x.reference===ref):null;
 if(ref&&!p){toast('Référence introuvable');return;}
 const form=$('productForm');form.reset();
 $('dialogTitle').textContent=p?'Modifier la référence '+p.reference:'Ajouter une référence';
 for(const field of ['reference','designation','ean','rayon','notes'])
  form.elements[field].value=p?.[field]??(field==='rayon'?(state.rayon==='all'?'Matériaux':state.rayon):'');
 updateDepartmentOptions(form.elements.rayon.value,p?productSectorCode(p):(state.group||''),p?.sousRayon||'');
 if(window.BookSketchEditor)window.BookSketchEditor.open(p);
 $('inputPhotoPreview').hidden=true;$('inputPhotoPreview').removeAttribute('src');
 $('editDialog').showModal();
}

async function asDataUrl(file,isDrawing=false){if(!file)return '';
 if(!file.type.startsWith('image/'))throw new Error('Le fichier doit être une image');
 let image=await createImageBitmap(file);let max=isDrawing?1400:1100;
 let factor=Math.min(1,max/Math.max(image.width,image.height));
 const canvas=document.createElement('canvas');canvas.width=Math.round(image.width*factor);canvas.height=Math.round(image.height*factor);
 const ctx=canvas.getContext('2d',{alpha:false});ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
 if(image.close)image.close();return canvas.toDataURL(isDrawing?'image/png':'image/jpeg',isDrawing?1:.77);
}
async function submitProduct(event){event.preventDefault();if(!state.admin)return;const form=$('productForm');const data=new FormData(form);const saveBtn=$('saveProductBtn');if(saveBtn.disabled)return;saveBtn.disabled=true;saveBtn.textContent='Enregistrement…';try{
 let ref=String(data.get('reference')||'').trim();let des=String(data.get('designation')||'').trim();let ean=String(data.get('ean')||'').trim();let rayon=String(data.get('rayon')||'');let group=String(data.get('sousRayon')||'').trim();let deptCode=String(data.get('deptCode')||'');
 if(!ref||!des||!group||!UNIVERSES.includes(rayon)||!officialSector(rayon,deptCode)){toast('Renseignez la référence, la désignation et le sous-rayon officiel numéroté');return;}
 if(ean&&!validEan(ean)){toast('Code EAN-13 invalide : vérifiez les 13 chiffres et la clé de contrôle');return;}
 if(products.some(p=>p.reference===ref&&p.reference!==originalEditReference)){toast('Cette référence existe déjà');return;}
 let existing=originalEditReference?products.find(p=>p.reference===originalEditReference):null;
 const item={...(existing||{}),reference:ref,designation:des,ean,rayon,sousRayon:group,sousRayonCode:deptCode,notes:String(data.get('notes')||'').trim(),archived:!!existing?.archived,photo:existing?.photo||'',croquis:existing?.croquis||'',barcode:existing?.ean===ean?(existing?.barcode||''):''};
 try{if($('inputPhoto').files[0])item.photo=await asDataUrl($('inputPhoto').files[0]);if(window.BookSketchEditor)item.croquis=await window.BookSketchEditor.resolveCroquis();}catch(e){toast('Impossible de préparer les images : '+e.message);return;}
 try{await bookSaveItem(item,originalEditReference);}catch(err){toast('Erreur : '+err.message);return;}
 if(existing){products[products.indexOf(existing)]=cleanItem(item);}else{products.push(cleanItem(item));}
 $('editDialog').close();
 state.rayon=rayon;state.group=deptCode;state.search='';$('searchInput').value='';
 render();$('toolSection').scrollIntoView({behavior:'smooth',block:'start'});
 const synced=typeof bookRefresh!=='function'||await bookRefresh();
 const confirmed=products.some(p=>p.reference===ref&&!p.archived&&p.rayon===rayon&&p.sousRayon===group&&productSectorCode(p)===deptCode);
 if(!synced)toast('Réf. '+ref+' enregistrée, mais rechargement impossible. Utilisez Actualiser avant le PDF.');
 else if(!confirmed)toast('Réf. '+ref+' absente du catalogue actif après synchronisation : vérifiez son statut.');
 else toast('✓ Réf. '+ref+' '+(existing?'actualisée':'ajoutée')+' dans le sous-rayon '+deptCode+' du book '+rayon+'.');
 }finally{saveBtn.disabled=false;saveBtn.textContent='Enregistrer le produit';}
}
async function setArchive(ref){if(!state.admin)return;const p=products.find(x=>x.reference===ref);if(!p)return;if(!p.archived&&!confirm(`Retirer la référence ${ref} des futurs PDF et exports Excel ? Elle pourra être restaurée.`))return;
 try{await bookSaveItem({...p,archived:!p.archived},ref);p.archived=!p.archived;render();if(typeof bookRefresh==='function')await bookRefresh();toast(p.archived?'Référence retirée des éditions futures (récupérable)':'Référence restaurée dans le catalogue et les prochains PDF');}catch(e){toast('Modification non enregistrée : '+e.message);}
}
function downloadBlob(content,name,mime){const blob=content instanceof Blob?content:new Blob([content],{type:mime||'application/octet-stream'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),8000);}
function exportJSON(){downloadBlob(JSON.stringify({version:1,source:'Book de vente Leroy Merlin Calais',exportedAt:new Date().toISOString(),products},null,2),'Book_de_vente_Calais_SAUVEGARDE.json','application/json');toast('Sauvegarde JSON téléchargée');}
function csvEsc(v){v=String(v??'');return '"'+v.replaceAll('"','""')+'"';}
function crc32(bytes){let c=-1;for(const b of bytes){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^(-1))>>>0;}
function zipStore(files){const enc=new TextEncoder(),local=[],central=[];let offset=0;
 const d16=n=>new Uint8Array([n&255,(n>>>8)&255]),d32=n=>new Uint8Array([n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255]);
 const cat=(...arr)=>{let len=arr.reduce((s,a)=>s+a.length,0),u=new Uint8Array(len),i=0;for(const a of arr){u.set(a,i);i+=a.length;}return u;};
 for(const [path,text] of Object.entries(files)){let fn=enc.encode(path),v=enc.encode(text),crc=crc32(v);let head=cat(d32(0x04034b50),d16(20),d16(0x800),d16(0),d16(0),d16(0),d32(crc),d32(v.length),d32(v.length),d16(fn.length),d16(0),fn,v);local.push(head);
 central.push(cat(d32(0x02014b50),d16(20),d16(20),d16(0x800),d16(0),d16(0),d16(0),d32(crc),d32(v.length),d32(v.length),d16(fn.length),d16(0),d16(0),d16(0),d16(0),d32(0),d32(offset),fn));offset+=head.length;}
 const c=cat(...central);return new Blob([...local,c,cat(d32(0x06054b50),d16(0),d16(0),d16(central.length),d16(central.length),d32(c.length),d32(offset),d16(0))],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
}
function xml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));}
function col(i){let s='';for(let k=i+1;k>0;k=Math.floor((k-1)/26))s=String.fromCharCode(65+(k-1)%26)+s;return s;}
function exportXlsx(){
 const headers=['Rayon','Code sous-rayon','Nomenclature officielle','Famille / détail','Référence LM','Désignation','EAN-13','Notes'];
 const base='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
 const files={
  '[Content_Types].xml':base+'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
  '_rels/.rels':base+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
  'xl/workbook.xml':base+'<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Matériaux" sheetId="1" r:id="rId1"/><sheet name="Jardin" sheetId="2" r:id="rId2"/></sheets></workbook>',
  'xl/_rels/workbook.xml.rels':base+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/></Relationships>'
 };
 for(let i=0;i<UNIVERSES.length;i++){
 const rayon=UNIVERSES[i];const sorted=products.filter(p=>p.rayon===rayon&&!p.archived).sort((a,b)=>PRODUCT_SORT_COLLATOR.compare(productSectorKey(a),productSectorKey(b))||compareProductsAlphabetically(a,b));
 const rows=[headers,...sorted.map(p=>[p.rayon,officialSector(p.rayon,productSectorCode(p))?.displayCode||productSectorCode(p),officialSector(p.rayon,productSectorCode(p))?.name||'À CLASSER',p.sousRayon,p.reference,p.designation,p.ean,p.notes])];
 const rowxml=rows.map((row,r)=>`<row r="${r+1}">${row.map((v,c)=>`<c r="${col(c)}${r+1}" t="inlineStr"><is><t xml:space="preserve">${xml(v)}</t></is></c>`).join('')}</row>`).join('');
 files['xl/worksheets/sheet'+(i+1)+'.xml']=base+'<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:H'+rows.length+'"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols><col min="1" max="1" width="18" customWidth="1"/><col min="2" max="2" width="42" customWidth="1"/><col min="3" max="3" width="18" customWidth="1"/><col min="4" max="4" width="65" customWidth="1"/><col min="5" max="5" width="22" customWidth="1"/><col min="6" max="6" width="65" customWidth="1"/><col min="7" max="7" width="22" customWidth="1"/><col min="8" max="8" width="40" customWidth="1"/></cols><sheetData>'+rowxml+'</sheetData><autoFilter ref="A1:H'+rows.length+'"/></worksheet>';
 }
 downloadBlob(zipStore(files),'Book_de_vente_Calais_Materiaux_Jardin_ACTUALISE.xlsx','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');toast('Excel actualisé exporté : 2 onglets, références actives uniquement');
}


function printCard(p){
 const bar=barcodeDataURL(p.ean),photo=safeImage(p.photo),croquis=safeImage(p.croquis);
 return '<article class="p-product"><div class="p-reference">RÉF. '+escapeHtml(p.reference)+'</div><div class="p-family">'+escapeHtml(p.sousRayon)+'</div><div class="p-name">'+escapeHtml(p.designation)+'</div><div class="p-row"><div class="p-asset">'+(photo?'<img src="'+escapeHtml(photo)+'">':'<span class="p-missing">Photo non disponible</span>')+'</div><div class="p-asset">'+(croquis?'<img src="'+escapeHtml(croquis)+'">':'<span class="p-missing">Croquis non disponible</span>')+'</div><div class="p-asset bar">'+(bar?'<img src="'+escapeHtml(bar)+'">':'<span class="p-missing">EAN non renseigné</span>')+'</div></div>'+(p.notes?'<div class="p-note">⚠ '+escapeHtml(p.notes)+'</div>':'')+'</article>';
}
function printHeader(rayon,page,pageCount){
 return '<div class="p-header"><span>BOOK DE VENTE</span><span>'+escapeHtml(rayon.toUpperCase())+'</span></div><div class="p-footer"><span>LEROY MERLIN CALAIS / GUIDE PRODUITS</span><span>'+page+' / '+pageCount+'</span></div>';
}
function coverGallery(active,sectors){
 const representative=sectors.map(d=>active.find(p=>productSectorKey(p)===d.code&&safeImage(p.photo))).filter(Boolean);
 const positions=[0,Math.floor((representative.length-1)/2),representative.length-1];
 const samples=positions.map(i=>representative[i]).filter((p,i,arr)=>p&&arr.findIndex(other=>other.reference===p.reference)===i);
 return '<div class="cover-gallery">'+samples.map(p=>'<figure class="cover-tile"><img src="'+escapeHtml(safeImage(p.photo))+'" alt=""><figcaption>'+escapeHtml((officialSector(p.rayon,productSectorCode(p))?.displayCode||'?')+' — '+(officialSector(p.rayon,productSectorCode(p))?.name||'À classer'))+'</figcaption></figure>').join('')+'</div>';
}
function makePrintHTML(rayon){
 if(!UNIVERSES.includes(rayon))throw new Error('Choisir Matériaux ou Jardin');
 const active=products.filter(p=>!p.archived&&p.rayon===rayon);
 const sectors=sectorList(rayon,active,false,true);
 const pages=[{kind:'cover'},{kind:'intro'}],toc={};
 for(const d of sectors){
  const entries=sortProductsAlphabetically(active.filter(p=>productSectorKey(p)===d.code));
  toc[d.code]=pages.length+1;
  for(let i=0;i<entries.length;i+=5)pages.push({kind:'products',sector:d,continued:i>0,entries:entries.slice(i,i+5)});
 }
 const label=d=>((d.code==='UNASSIGNED'?'?':d.displayCode)+' — '+d.name);
 const colorBar=d=>'<div class="p-tab" style="--tab-color:'+d.color+'"><span>'+escapeHtml(label(d))+'</span></div>';
 return pages.map((p,i)=>{
  if(p.kind==='cover'){
   // Trames JPEG validées : la page entière reste une image fixe, sauf les
   // deux compteurs qui suivent les références actives du rayon à l'export.
   const isBati=rayon==='Matériaux';
   const imagePath=isBati?'./assets/covers/couverture-bati-calais.jpg':'./assets/covers/couverture-jardin-calais.jpg';
   const imageDescription=isBati?'Couverture Bâti & Matériaux':'Couverture Jardin';
   const referenceCount=active.length;
   const sectorCount=sectors.length;
   const referenceNumberSize=referenceCount>=10000?16:referenceCount>=1000?20:24;
   const referenceLabelSize=referenceCount>=10000?13:referenceCount>=1000?15:17.4;
   return '<div class="print-page p-cover p-cover-photo '+(isBati?'p-cover-photo-bati':'p-cover-photo-jardin')+'">'
    +'<img class="cover-photo-fixed" src="'+imagePath+'" alt="'+imageDescription+' — illustration de Leroy Merlin Calais">'
    +'<div class="cover-photo-counter cover-photo-counter-refs" style="--counter-number-size:'+referenceNumberSize+'pt;--counter-label-size:'+referenceLabelSize+'pt">'
    +'<strong>'+referenceCount+'</strong><span>RÉFÉRENCES</span></div>'
    +'<div class="cover-photo-counter cover-photo-counter-sectors">'
    +'<div class="cover-counter-line"><strong>'+sectorCount+'</strong><span>SOUS-RAYONS</span></div>'
    +'<span class="cover-counter-label">REPRÉSENTÉS</span></div>'
    +'</div>';
  }
  if(p.kind==='intro'){
   return '<div class="print-page p-intro">'+printHeader(rayon,i+1,pages.length)+'<div class="p-label">'+(rayon==='Matériaux'?'001':'009')+' — RAYON</div><h1>'+escapeHtml(rayon.toUpperCase())+'</h1><p>'+active.length+' références / '+sectors.length+' sous-rayons représentés</p><h2 class="p-toc-title">SOMMAIRE · SOUS-RAYONS NUMÉROTÉS & COULEURS</h2><ul class="p-toc">'+sectors.map(d=>'<li style="--tab-color:'+d.color+'"><span class="p-toc-swatch"></span><span class="p-toc-name">'+escapeHtml(label(d))+'</span><strong>p. '+toc[d.code]+'</strong></li>').join('')+'</ul><p class="p-toc-note">Le code et sa couleur sont identiques dans le sommaire et sur le liseré vertical des pages correspondantes.</p></div>';
  }
  const d=p.sector;
  return '<div class="print-page p-content" style="--tab-color:'+d.color+'">'+colorBar(d)+printHeader(rayon,i+1,pages.length)+'<div class="p-category-label '+(p.continued?'continued':'')+'">'+escapeHtml(label(d))+(p.continued?' (suite)':'')+'</div>'+p.entries.map(printCard).join('')+'</div>';
 }).join('');
}


/* Outil complémentaire : reconstitution imprimable des nuanciers du 08/11/2026.
   Sections nominales identiques aux fiches A4 d'origine ; une page par profil.
   Aucune photo ou référence n'est inventée : les visuels/EAN viennent du catalogue. */
const NUANCIER_SECTIONS = [
 {rayon:'Matériaux',kind:'charpente',label:'Bois de charpente',code:'020'},
 {rayon:'Jardin',kind:'terrasses',label:'Terrasses · Lames et lambourdes',code:'056'},
 {rayon:'Jardin',kind:'paves',label:'Pavés',code:'056'},
 {rayon:'Jardin',kind:'dalles',label:'Dalles de terrasse',code:'056'},
 {rayon:'Jardin',kind:'pas-japonais',label:'Pas japonais',code:'056'},
 {rayon:'Jardin',kind:'bordures',label:'Bordures',code:'056'}
];
let selectedNuancier='Matériaux';
function nuancierFor(rayon){
 const base=Array.isArray(window.BOOK_NUANCIER_PROFILES)?window.BOOK_NUANCIER_PROFILES:[];
 const data=window.BookSmartNuancier?.expand(rayon,products,base)||base;
 return data.filter(p=>NUANCIER_SECTIONS.some(s=>s.rayon===rayon&&s.kind===p.kind))
  .sort((a,b)=>{
   const order=NUANCIER_SECTIONS.findIndex(s=>s.kind===a.kind)-NUANCIER_SECTIONS.findIndex(s=>s.kind===b.kind);
   return order||compareProductsAlphabetically({designation:a.name,reference:a.id},{designation:b.name,reference:b.id})
     ||a.w-b.w||a.h-b.h;
  });
}
function nuancierDimentions(p){
 if(p.kind==='paves'||p.kind==='dalles'||p.kind==='pas-japonais')return p.w+' × '+p.h+' mm · ép. '+p.length+' mm';
 if(p.kind==='bordures')return 'H '+p.h+' × ép. '+p.w+' mm · longueur '+p.length+' mm';
 return p.w+' × '+p.h+' mm'+(p.kind==='charpente'&&p.length?' · longueur '+(p.length/1000).toLocaleString('fr-FR')+' m':'');
}
async function showNuancier(rayon){
 // L'ouverture réutilise le catalogue chargé à la connexion.
 // Pas de nouveau téléchargement des photos et des croquis à chaque clic.
 if(!products.length && window.BOOK_SUPABASE_CONFIG?.url && typeof bookRefresh==='function'){
  const ok=await bookRefresh();
  if(!ok)return toast('Nuancier non ouvert : catalogue partagé indisponible.');
 }
 const list=nuancierFor(rayon);if(!list.length)return toast('Les profils du nuancier sont indisponibles.');
 selectedNuancier=rayon;
 $('nuancierDialogTitle').textContent='Nuancier '+(rayon==='Matériaux'?'Bâti':'Jardin');
 $('nuancierDialogSubtitle').textContent=list.length+' profils · Format A4 · Une fiche par gabarit';
 $('nuancierDialogContent').innerHTML=NUANCIER_SECTIONS.filter(g=>g.rayon===rayon).map(group=>{
  const groupItems=list.filter(p=>p.kind===group.kind);
  return '<section class="nuancier-group"><h3>'+escapeHtml(group.label)+' <small>· '+groupItems.length+' profils</small></h3><div class="nuancier-profile-list">'+groupItems.map(p=>{
   const product=p.refs.map(ref=>products.find(item=>item.reference===ref&&!item.archived)).find(Boolean);
   return '<article class="nuancier-list-item"><div class="nuancier-list-photo">'+(product?.photo?imageMarkup(safeImage(product.photo),p.name):'<span>1:1</span>')+'</div><div class="nuancier-list-info"><strong>'+escapeHtml(p.name)+'</strong><span>'+escapeHtml(nuancierDimentions(p))+'</span><small>Réf. '+escapeHtml(p.refs.join(', '))+'</small></div><button type="button" class="btn btn-outline nuancier-one-btn" data-nuancier-one="'+escapeHtml(p.id)+'">Imprimer cette fiche</button></article>';
  }).join('')+'</div></section>';
 }).join('');
 if(!$('nuancierDialog').open)$('nuancierDialog').showModal();
}
async function refreshNuancierOnDemand(){
 const btn=$('nuancierRefresh');
 if(btn.disabled)return;
 btn.disabled=true;btn.textContent='Actualisation…';
 try{
  if(typeof bookRefresh!=='function'||!await bookRefresh())return toast('Actualisation impossible : réessayez plus tard.');
  await showNuancier(selectedNuancier);
  toast('Nuancier actualisé avec les dernières références.');
 }finally{btn.disabled=false;btn.textContent='↻ Actualiser';}
}
function nuancierPrintCard(p,index,count,rayon){
 const info=NUANCIER_SECTIONS.find(s=>s.kind===p.kind);
 const available=p.refs.map(ref=>({ref,product:products.find(item=>item.reference===ref&&!item.archived)}));
 const photo=available.find(x=>x.product?.photo)?.product?.photo||'';
 const detail=available.map(({ref,product})=>{
  const barcode=product?.ean?barcodeDataURL(product.ean):'';
  return '<div class="nuancier-ref"><strong>RÉF. '+escapeHtml(ref)+'</strong>'
    +(barcode?'<img class="nuancier-barcode" alt="EAN '+escapeHtml(product.ean)+'" src="'+escapeHtml(barcode)+'">':(product?.ean?'<span>EAN '+escapeHtml(product.ean)+'</span>':''))
    +'</div>';
 }).join('');
 const isHorizontal=p.kind==='terrasses'||p.kind==='paves'||p.kind==='dalles'||p.kind==='pas-japonais'||(p.kind==='charpente'&&p.w>100);
 const kindText=(p.kind==='paves'||p.kind==='dalles'||p.kind==='pas-japonais')?(p.kind==='pas-japonais'?'ENVELOPPE RECTANGULAIRE NOMINALE + TRANCHE · CONTOUR NON REPRODUIT':'VUE DE DESSUS + VUE DE TRANCHE · COTES NOMINALES'):p.kind==='bordures'?'COUPE NOMINALE · HAUTEUR × ÉPAISSEUR':'COUPE NOMINALE · ÉCHELLE 1:1';
 const panel='<div class="nuancier-print-panel"><div class="nuancier-print-photo">'+(photo?'<img src="'+escapeHtml(safeImage(photo))+'" alt="Photo produit">':'<span>Photo du book indisponible</span>')+'</div><div class="nuancier-refs">'+detail+'</div></div>';
 const isFlat=['paves','dalles','pas-japonais'].includes(p.kind);
 const sidenote=p.kind==='bordures'?'Longueur de la bordure : '+p.length+' mm':'';
 // Le gabarit 1:1 est privilégié. Pour les grandes dalles la réduction est signalée.
 const scale=isFlat?Math.min(1,155/p.w,150/p.h):1;
 const mainW=Math.round(p.w*scale*10)/10, mainH=Math.round(p.h*scale*10)/10;
 const mainTop=isFlat?57:49,mainLeft=isFlat?25:22;
 const edgeTop=Math.min(237,Math.max(176,mainTop+mainH+8));
 const edgeScale=isFlat?Math.min(.4,74/p.w,19/p.length):0;
 const edgeW=Math.round(p.w*edgeScale*10)/10,edgeH=Math.round(p.length*edgeScale*10)/10;
 const secondary=isFlat&&p.length>0?'<div class="nuancier-edge-title" style="top:'+(edgeTop-5)+'mm">VUE DE TRANCHE · ÉPAISSEUR '+escapeHtml(p.length)+' mm · SCHÉMA RÉDUIT</div>'
    +'<div class="nuancier-edge-profile" style="top:'+edgeTop+'mm;width:'+edgeW+'mm;height:'+edgeH+'mm"></div>'
    +'<div class="nuancier-edge-dim" style="top:'+(edgeTop+edgeH+1)+'mm">Longueur '+escapeHtml(p.w)+' mm × épaisseur '+escapeHtml(p.length)+' mm</div>':'';
 const profileStyle='width:'+mainW+'mm;height:'+mainH+'mm;left:'+mainLeft+'mm;top:'+mainTop+'mm';
 const profileScaleNote=isFlat&&scale<1?'<div class="nuancier-scale-warning">Gabarit réduit (×'+scale.toFixed(2)+') · dimensions nominales ci-dessus</div>':'';
 const wideWood=p.kind==='charpente'&&p.w>100;
 const gridStyle=isFlat?'style="--nuancier-details-top:'+Math.max(174,mainTop+mainH+5)+'mm"':wideWood?'style="top:'+Math.max(195,mainTop+mainH+8)+'mm;left:25mm;right:16mm"':'';

 return '<section class="print-page nuancier-print-page nuancier-'+escapeHtml(p.kind)+'">'
  +'<div class="nuancier-print-header"><strong>LEROY MERLIN · CALAIS</strong><span>NUANCIER '+(rayon==='Matériaux'?'BÂTI':'JARDIN')+' · '+(index+1)+'/'+count+'</span></div>'
  +'<div class="nuancier-print-heading"><small>'+escapeHtml(info.label.toUpperCase())+' · SOUS-RAYON '+escapeHtml(info.code)+'</small><h2>'+escapeHtml(p.name)+'</h2><p>'+escapeHtml(nuancierDimentions(p))+' · '+kindText+'</p></div>'
  +'<div class="nuancier-profile-outline" style="'+profileStyle+'" aria-label="Gabarit nominal '+p.w+' sur '+p.h+' millimètres"><span>GABARIT NOMINAL</span></div>'
  +profileScaleNote+secondary
  +(isHorizontal?'<div class="nuancier-print-bottom" '+gridStyle+'>'+panel+'</div>':'<div class="nuancier-print-side">'+panel+'</div>')
  +(sidenote?'<div class="nuancier-print-length">'+escapeHtml(sidenote)+'</div>':'')
  +'<div class="nuancier-print-calibration"><div class="nuancier-50mm"></div><span>50 mm de contrôle</span></div>'
  +'<footer class="nuancier-print-footer">IMPRIMER À 100 % · NE PAS AJUSTER À LA PAGE · Contrôle des cotes sur le produit réel</footer>'
  +'</section>';
}
async function printNuancier(rayon,profileId=''){
 // Réutiliser le catalogue récent : une deuxième impression ne
 // retransfère plus automatiquement les 30 Mo d'images du book.
 const syncAge=typeof bookLastSyncAt==='number'?Date.now()-bookLastSyncAt:Infinity;
 if(window.BOOK_SUPABASE_CONFIG?.url&&typeof bookRefresh==='function'&&syncAge>10*60*1000){
  const synced=await bookRefresh();
  if(!synced)return toast('Impression annulée : catalogue partagé indisponible.');
 }
 const profiles=nuancierFor(rayon).filter(p=>!profileId||p.id===profileId);
 if(!profiles.length)return toast('Profil non disponible.');
 $('nuancierDialog').close();
 const area=$('printArea');
 area.innerHTML=profiles.map((p,i)=>nuancierPrintCard(p,i,profiles.length,rayon)).join('');
 const images=[...area.querySelectorAll('img')];
 try{await Promise.race([Promise.all(images.map(img=>img.decode().catch(()=>{}))),new Promise(resolve=>setTimeout(resolve,12000))]);}catch(e){}
 window.print();
}

async function printBook(rayon){
 if(!UNIVERSES.includes(rayon))return;
 if(window.BOOK_SUPABASE_CONFIG?.url){
  $('saveStatus').textContent='Vérification du catalogue avant PDF…';
  const synced=typeof bookRefresh==='function'&&await bookRefresh();
  if(!synced){toast('PDF non ouvert : impossible de vérifier les dernières références sur le serveur. Réessayez.');return;}
 }
 const total=products.filter(p=>!p.archived&&p.rayon===rayon).length;
 if(!total){toast('Aucune référence active dans le rayon '+rayon+'.');return;}
 const area=$('printArea');area.innerHTML=makePrintHTML(rayon);
 const images=[...area.querySelectorAll('img')];
 try{await Promise.race([Promise.all(images.map(img=>img.decode().catch(()=>{}))),new Promise(resolve=>setTimeout(resolve,12000))]);}catch(e){}
 toast('PDF '+rayon+' prêt : '+total+' références actives, sommaire et intercalaires à jour.');
 window.print();
}
async function importJSON(file){if(!file)return;try{let j=JSON.parse(await file.text());let rows=Array.isArray(j)?j:j.products;
 if(!Array.isArray(rows)||!rows.length||rows.length>5000)throw new Error('Structure invalide');rows=rows.map(cleanItem);
 const refs=new Set();for(let p of rows){if(!p.reference||!p.designation||!UNIVERSES.includes(p.rayon)||!p.sousRayon||refs.has(p.reference)||(p.ean&&!validEan(p.ean)))throw new Error('Références ou EAN invalides');refs.add(p.reference);}
 if(!state.admin)return;
 if(!confirm('Remplacer le catalogue local par les '+rows.length+' références de cette sauvegarde ?'))return;
 products=rows;saveProducts();state.showArchived=false;selectFilter('all');toast(rows.length+' références importées');
 }catch(e){toast('Import impossible : '+e.message)}finally{$('importFile').value='';}}

$('browseBtn').addEventListener('click',()=>$('toolSection').scrollIntoView({behavior:'smooth'}));
$('searchInput').addEventListener('input',e=>{state.search=e.target.value.trim();render();});
$('rayonSelect').addEventListener('change',e=>{state.rayon=e.target.value;state.group='';render();});
$('clearFilters').addEventListener('click',()=>selectFilter('all'));
document.querySelector('.nav-home').addEventListener('click',()=>selectFilter('all'));
$('sidebarChapters').addEventListener('click',e=>{
 const config=e.target.closest('[data-config-rayon][data-config-code]');
 if(config){openSectorConfig(config.dataset.configRayon,config.dataset.configCode);return;}
 const del=e.target.closest('[data-delete-rayon][data-delete-code]');
 if(del){void openSectorDeletion(del.dataset.deleteRayon,del.dataset.deleteCode);return;}
 const restore=e.target.closest('[data-restore-rayon][data-restore-code]');
 if(restore){void restoreHiddenSector(restore.dataset.restoreRayon,restore.dataset.restoreCode);return;}
 if(e.target.closest('[data-toggle-hidden]')){showHiddenSectors=!showHiddenSectors;buildSidebar();return;}
 const chapter=e.target.closest('button[data-chapter-rayon]');
 if(chapter){
  const rayon=chapter.dataset.chapterRayon;
  if(expandedChapters.has(rayon))expandedChapters.delete(rayon);else expandedChapters.add(rayon);
  buildSidebar();
  const refreshed=Array.from($('sidebarChapters').querySelectorAll('[data-chapter-rayon]')).find(b=>b.dataset.chapterRayon===rayon);
  if(refreshed)refreshed.focus({preventScroll:true});
  return;
 }
 const sub=e.target.closest('button[data-rayon][data-group]');
 if(sub)selectFilter(sub.dataset.rayon,sub.dataset.group||'');
});
$('sectorConfigForm').addEventListener('submit',submitSectorConfig);
$('sectorCodeInput').addEventListener('input',updateSectorPreview);
$('sectorNameInput').addEventListener('input',updateSectorPreview);
window.initSectorColorPicker();
$('sectorConfigCancel').addEventListener('click',()=>$('sectorConfigDialog').close());
$('sectorConfigReset').addEventListener('click',resetSectorConfig);
$('editToggle').addEventListener('click',toggleAdmin);
$('addBtn').addEventListener('click',()=>showForm());
$('addTopBtn').addEventListener('click',()=>showForm());
$('inputPhoto').addEventListener('change',()=>{const file=$('inputPhoto').files[0],preview=$('inputPhotoPreview');if(preview.dataset.url){URL.revokeObjectURL(preview.dataset.url);delete preview.dataset.url;}if(file&&file.type.startsWith('image/')){const url=URL.createObjectURL(file);preview.dataset.url=url;preview.src=url;preview.hidden=false;}else{preview.removeAttribute('src');preview.hidden=true;}});
$('catalogue').before($('adminPanel'));

/* Consultation du Book : agrandissement tactile des photos et croquis, sans modification de données. */
const zoomView={scale:1,x:0,y:0,pointers:new Map(),lastTap:0,hadPinch:false};
function zoomDimensions(p){
 const description=String(p.designation||''),notes=String(p.notes||'');
 const source=(description+' · '+notes).replace(/\s+/g,' ');
 const patterns=[
  /\b\d+(?:[.,]\d+)?\s*[x×]\s*\d+(?:[.,]\d+)?(?:\s*[x×]\s*\d+(?:[.,]\d+)?)?\s*(?:mm|cm|ml|m)?\b/gi,
  /(?:\b(?:ép(?:aisseur)?|ep(?:aisseur)?|diam(?:ètre|etre)?|longueur|largeur|hauteur|prof(?:ondeur)?|Ø)\s*[:.]?\s*)\d+(?:[.,]\d+)?\s*(?:mm|cm|m)?\b/gi,
  /\b(?:\d+(?:[.,]\d+)?\s*(?:mm|cm|m|ml|kg|litres?|l|m³|m3))\b/gi
 ];
 const found=[],seen=new Set();
 for(const pattern of patterns){
  for(const match of source.matchAll(pattern)){
   const label=match[0].trim().replace(/\s+/g,' ');
   const key=label.toLowerCase().replace(/\s+/g,'');
   if(label.length>2&&!seen.has(key)){seen.add(key);found.push(label);}
  }
 }
 return found.slice(0,12);
}
function zoomConstrain(){
 const stage=$('imageZoomStage'),img=$('imageZoomImg'),scale=zoomView.scale;
 const w=img.clientWidth,h=img.clientHeight;
 const maxX=Math.max(0,(w*scale-stage.clientWidth)/2);
 const maxY=Math.max(0,(h*scale-stage.clientHeight)/2);
 zoomView.x=Math.max(-maxX,Math.min(maxX,zoomView.x));
 zoomView.y=Math.max(-maxY,Math.min(maxY,zoomView.y));
}
function zoomApply(){
 zoomConstrain();
 $('imageZoomImg').style.transform='translate3d('+zoomView.x+'px,'+zoomView.y+'px,0) scale('+zoomView.scale+')';
 $('imageZoomPercent').textContent=Math.round(zoomView.scale*100)+' %';
 $('imageZoomOut').disabled=zoomView.scale<=1.005;
 $('imageZoomIn').disabled=zoomView.scale>=5.995;
}
function zoomAt(newScale,clientX,clientY){
 const stage=$('imageZoomStage'),r=stage.getBoundingClientRect(),old=zoomView.scale;
 const value=Math.min(6,Math.max(1,newScale));
 const anchorX=Number.isFinite(clientX)?clientX-(r.left+r.width/2):0;
 const anchorY=Number.isFinite(clientY)?clientY-(r.top+r.height/2):0;
 zoomView.x=anchorX-(anchorX-zoomView.x)*value/old;
 zoomView.y=anchorY-(anchorY-zoomView.y)*value/old;
 zoomView.scale=value;
 if(value===1){zoomView.x=0;zoomView.y=0;}
 zoomApply();
}
function zoomReset(){zoomView.scale=1;zoomView.x=0;zoomView.y=0;zoomView.pointers.clear();zoomView.lastTap=0;zoomView.hadPinch=false;zoomApply();}
function showZoomImage(ref,kind){
 const p=products.find(x=>x.reference===ref),src=p&&safeImage(p[kind]);
 if(!p||!src)return;
 const dialog=$('imageZoomDialog'),img=$('imageZoomImg'),croquis=kind==='croquis';
 $('imageZoomKind').textContent=croquis?'CROQUIS COTÉ':'PHOTO DU PRODUIT';
 $('imageZoomTitle').textContent=p.designation;
 $('imageZoomRef').textContent='Réf. '+p.reference+' · '+p.rayon+' · '+(officialSector(p.rayon,productSectorCode(p))?.name||p.sousRayon);
 $('imageZoomEan').textContent=p.ean?'EAN-13 : '+p.ean:'';
 $('imageZoomEan').hidden=!p.ean;
 $('imageZoomNotes').textContent=p.notes?'Notes : '+p.notes:'';
 $('imageZoomNotes').hidden=!p.notes;
 const specs=zoomDimensions(p),specArea=$('imageZoomSpecs');specArea.replaceChildren();
 if(specs.length){
  for(const spec of specs){const el=document.createElement('span');el.className='image-zoom-spec';el.textContent=spec;specArea.append(el);}
  $('imageZoomSpecHeading').textContent='Cotes et formats indiqués';
  $('imageZoomSpecHint').textContent='Données reprises du libellé ou des notes. Vérifiez les cotes sur le produit réel.';
 }else{
  $('imageZoomSpecHeading').textContent='Dimensions';
  $('imageZoomSpecHint').textContent='Aucune dimension chiffrée identifiable dans la fiche. Le croquis peut contenir des annotations supplémentaires.';
 }
 img.alt=(croquis?'Croquis agrandi : ':'Photo agrandie : ')+p.designation;
 img.src=src;
 dialog.showModal();
 zoomReset();
}
const imageZoomDialog=$('imageZoomDialog');
imageZoomDialog.addEventListener('close',()=>{
 $('imageZoomImg').removeAttribute('src');
 zoomView.pointers.clear();
});
$('imageZoomClose').addEventListener('click',()=>imageZoomDialog.close());
imageZoomDialog.addEventListener('click',e=>{if(e.target===imageZoomDialog)imageZoomDialog.close();});
$('imageZoomIn').addEventListener('click',()=>zoomAt(zoomView.scale*1.5));
$('imageZoomOut').addEventListener('click',()=>zoomAt(zoomView.scale/1.5));
$('imageZoomReset').addEventListener('click',zoomReset);
$('imageZoomImg').addEventListener('load',()=>{if(imageZoomDialog.open)zoomApply();});
imageZoomDialog.addEventListener('keydown',e=>{
 if(e.key==='+'||e.key==='='){e.preventDefault();zoomAt(zoomView.scale*1.5);}
 else if(e.key==='-'){e.preventDefault();zoomAt(zoomView.scale/1.5);}
 else if(e.key==='0'){e.preventDefault();zoomReset();}
});
const zoomStage=$('imageZoomStage');
zoomStage.addEventListener('wheel',e=>{
 if(!imageZoomDialog.open)return;
 e.preventDefault();zoomAt(zoomView.scale*(e.deltaY<0?1.22:1/1.22),e.clientX,e.clientY);
},{passive:false});
function zoomPointerMid(){
 const pts=[...zoomView.pointers.values()];
 return {x:(pts[0].x+pts[1].x)/2,y:(pts[0].y+pts[1].y)/2,d:Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y)};
}
let previousPinch=null;
zoomStage.addEventListener('pointerdown',e=>{
 if(e.pointerType==='mouse'&&e.button!==0)return;
 e.preventDefault();
 zoomView.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY});
 try{zoomStage.setPointerCapture(e.pointerId);}catch(_){}
 if(zoomView.pointers.size===2){zoomView.hadPinch=true;previousPinch=zoomPointerMid();}
});
zoomStage.addEventListener('pointermove',e=>{
 const old=zoomView.pointers.get(e.pointerId);if(!old)return;
 const dx=e.clientX-old.x,dy=e.clientY-old.y;
 zoomView.pointers.set(e.pointerId,{...old,x:e.clientX,y:e.clientY});
 if(zoomView.pointers.size===2){
  const now=zoomPointerMid();
  if(previousPinch&&previousPinch.d>5){
   zoomAt(zoomView.scale*now.d/previousPinch.d,previousPinch.x,previousPinch.y);
   zoomView.x+=now.x-previousPinch.x;zoomView.y+=now.y-previousPinch.y;zoomApply();
  }
  previousPinch=now;
 }else if(zoomView.pointers.size===1&&zoomView.scale>1){
  zoomView.x+=dx;zoomView.y+=dy;zoomApply();
 }
});
function zoomPointerEnd(e){
 const p=zoomView.pointers.get(e.pointerId);
 if(!p)return;
 zoomView.pointers.delete(e.pointerId);
 if(zoomView.pointers.size<2)previousPinch=null;
 if(zoomView.pointers.size===0){
  if(e.type==='pointerup'&&e.pointerType==='touch'&&!zoomView.hadPinch&&Math.hypot(e.clientX-p.startX,e.clientY-p.startY)<13){
   const now=Date.now();
   if(now-zoomView.lastTap<330){zoomAt(zoomView.scale>1.3?1:2.4,e.clientX,e.clientY);zoomView.lastTap=0;}
   else zoomView.lastTap=now;
  }
  zoomView.hadPinch=false;
 }
}
zoomStage.addEventListener('pointerup',zoomPointerEnd);
zoomStage.addEventListener('pointercancel',zoomPointerEnd);
zoomStage.addEventListener('lostpointercapture',zoomPointerEnd);
zoomStage.addEventListener('dblclick',e=>zoomAt(zoomView.scale>1.3?1:2.4,e.clientX,e.clientY));
window.addEventListener('resize',()=>{if(imageZoomDialog.open)zoomApply();});

$('catalogue').addEventListener('click',e=>{const view=e.target.closest('[data-view-image]'),edit=e.target.closest('[data-edit]'),archive=e.target.closest('[data-archive]');if(view){showZoomImage(view.dataset.viewImage,view.dataset.viewKind);return;}if(edit)showForm(edit.dataset.edit);else if(archive){setArchive(archive.dataset.archive);}});
$('dialogClose').addEventListener('click',()=>$('editDialog').close());
$('dialogCancel').addEventListener('click',()=>$('editDialog').close());
$('inputRayon').addEventListener('change',e=>{updateDepartmentOptions(e.target.value);if(window.BookSketchEditor)window.BookSketchEditor.refreshGroup();});
$('inputDept').addEventListener('change',e=>{updateDatalist($('inputRayon').value,e.target.value);if(window.BookSketchEditor)window.BookSketchEditor.refreshGroup();});
$('productForm').addEventListener('submit',submitProduct);
$('exportJsonBtn').addEventListener('click',exportJSON);
$('exportExcelBtn').addEventListener('click',exportXlsx);
document.querySelectorAll('[data-nuancier]').forEach(btn=>btn.addEventListener('click',()=>showNuancier(btn.dataset.nuancier)));
$('nuancierClose').addEventListener('click',()=>$('nuancierDialog').close());
$('nuancierRefresh').addEventListener('click',()=>void refreshNuancierOnDemand());
$('nuancierPrintAll').addEventListener('click',()=>void printNuancier(selectedNuancier));
$('nuancierDialogContent').addEventListener('click',e=>{
 const btn=e.target.closest('[data-nuancier-one]');
 if(btn)void printNuancier(selectedNuancier,btn.dataset.nuancierOne);
});
$('printBatiBtn').addEventListener('click',()=>printBook('Matériaux'));
$('printJardinBtn').addEventListener('click',()=>printBook('Jardin'));
$('browseBatiBtn').addEventListener('click',()=>selectFilter('Matériaux'));
$('browseJardinBtn').addEventListener('click',()=>selectFilter('Jardin'));
$('coverPrintBati').addEventListener('click',()=>printBook('Matériaux'));
$('coverPrintJardin').addEventListener('click',()=>printBook('Jardin'));
$('refreshBtn').addEventListener('click',()=>void bookRefresh());
$('showArchivedBtn').addEventListener('click',()=>{state.showArchived=!state.showArchived;$('showArchivedBtn').textContent=state.showArchived?'Masquer les archivées':'Afficher les archivées';render();});
render();