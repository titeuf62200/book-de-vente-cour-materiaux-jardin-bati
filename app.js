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
function safeImage(s){s=String(s||'');return /^(?:assets\/[a-z0-9_-]+_(?:photo|croquis|ean)\.(?:webp|png|jpe?g)|data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/=]+)$/i.test(s)?s:'';}
function cleanItem(p){return {reference:String(p.reference??'').trim(),designation:String(p.designation??'').trim(),ean:String(p.ean??'').trim(),rayon:UNIVERSES.includes(p.rayon)?p.rayon:'Jardin',sousRayon:String(p.sousRayon??'Divers').trim(),photo:safeImage(p.photo),croquis:safeImage(p.croquis),barcode:safeImage(p.barcode),notes:String(p.notes??'').trim(),pageSource:Number(p.pageSource)||null,archived:!!p.archived};}
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
function getShown(){return products.filter(p=>(!p.archived||state.showArchived)&&(state.rayon==='all'||p.rayon===state.rayon)&&(!state.group||p.sousRayon===state.group)&&(!state.search||normalize([p.reference,p.designation,p.ean,p.sousRayon,p.notes].join(' ')).includes(normalize(state.search))));}
function groupsFor(rayon,collection=products){let map=new Map();for(const p of collection){if(p.rayon!==rayon||(!state.showArchived&&p.archived))continue;if(!map.has(p.sousRayon))map.set(p.sousRayon,0);map.set(p.sousRayon,map.get(p.sousRayon)+1);}return [...map.entries()].sort((a,b)=>MASTER_GROUPS[rayon].indexOf(a[0])-MASTER_GROUPS[rayon].indexOf(b[0]));}
function productMarkup(p){let isArchived=p.archived?' archived':'';let barcode=barcodeDataURL(p.ean);
return `<article class="product-card${isArchived}">
 <div class="product-top"><div class="reference">RÉF. ${escapeHtml(p.reference)}${p.archived?' · ARCHIVÉE':''}</div><h4 class="product-title">${escapeHtml(p.designation)}</h4></div>
 <div class="product-media"><figure class="media-box"><figcaption>PHOTO DU PRODUIT</figcaption><div class="image-contain">${imageMarkup(p.photo,p.designation)}</div></figure><figure class="media-box"><figcaption>CROQUIS COTÉ</figcaption><div class="image-contain">${imageMarkup(p.croquis,'Croquis coté '+p.designation)}</div></figure></div>
 <figure class="barcode-box"><figcaption>EAN-13${!p.ean?' non renseigné':''}</figcaption>${barcode?`<img src="${escapeHtml(barcode)}" loading="lazy" alt="Code-barres ${escapeHtml(p.ean)}">`:`<span class="ean-numeric">EAN à saisir</span>`}</figure>
 ${p.notes?`<div class="product-notes">⚠ ${escapeHtml(p.notes)}</div>`:''}
 ${state.admin?`<div class="admin-actions"><button class="btn btn-simple" data-edit="${escapeHtml(p.reference)}">✎ Modifier</button><button class="btn ${p.archived?'btn-primary':'btn-danger'}" data-archive="${escapeHtml(p.reference)}">${p.archived?'↺ Restaurer':'🗑 Supprimer'}</button></div>`:''}</article>`;
}
function buildSidebar(){const counts={};for(const rayon of UNIVERSES)counts[rayon]=products.filter(p=>p.rayon===rayon&&!p.archived).length;
 $('sideTotal').textContent=products.filter(p=>!p.archived).length;
 const all=state.rayon==='all'&&!state.group;
 document.querySelector('.nav-home').classList.toggle('active',all);
 $('sidebarChapters').innerHTML=UNIVERSES.map((rayon,i)=>{
 const gr=groupsFor(rayon);return `<div class="side-chapter"><button class="chapter-btn ${i?'jardin':''} ${state.rayon===rayon&&!state.group?'active':''}" data-rayon="${rayon}"><span class="chap-name">${i?'09':'01'} — ${escapeHtml(rayon)}</span><span class="count">${counts[rayon]}</span></button><div class="group-list">${gr.map(([name,n])=>`<button class="group-btn ${state.rayon===rayon&&state.group===name?'active':''}" data-rayon="${rayon}" data-group="${escapeHtml(name)}"><span class="group-color-dot" style="background:${groupColor(rayon,name)}"></span><span>${escapeHtml(name)}</span><span class="count">${n}</span></button>`).join('')}</div></div>`;
 }).join('');
}
function render(){buildSidebar();const shown=getShown();const shownActive=products.filter(p=>!p.archived);$('bookBatiCount').textContent=shownActive.filter(p=>p.rayon==='Matériaux').length;$('bookJardinCount').textContent=shownActive.filter(p=>p.rayon==='Jardin').length;$('heroTotal').textContent=shownActive.length;
 $('hero').hidden=!(state.rayon==='all'&&!state.group&&!state.search);
 $('rayonSelect').value=state.rayon;
 $('resultCount').textContent=shown.length+' produit'+(shown.length>1?'s':'');
 $('resultTitle').textContent=state.group|| (state.rayon==='all'?'Catalogue complet':state.rayon);
 $('resultSub').textContent=state.search?`Résultat de recherche : « ${state.search} »` : (state.group?state.rayon+' · Sous-rayon': 'Parcourir les sous-rayons');
 $('emptyState').hidden=shown.length>0;
 let out='';for(const rayon of UNIVERSES){const matching=shown.filter(p=>p.rayon===rayon);if(!matching.length)continue;
 const gr=groupsFor(rayon,matching);const number=rayon==='Matériaux'?'01':'09';
 out+=`<section class="chapter-intro ${rayon==='Jardin'?'jardin':''}"><div><div class="chapter-tag">UNIVERS ${number}</div><h2>${escapeHtml(rayon)}</h2><p>${matching.length} références · ${gr.length} sous-rayon${gr.length>1?'s':''}</p></div><div class="chapter-index">${number}</div></section>`;
 for(const [g,n] of gr){const gp=matching.filter(p=>p.sousRayon===g);out+=`<section class="subcategory"><header class="subcategory-header" style="--group-color:${groupColor(rayon,g)};border-left:8px solid ${groupColor(rayon,g)}"><h3>${escapeHtml(g)}</h3><span>${gp.length} réf.</span></header><div class="products-grid">${gp.map(productMarkup).join('')}</div></section>`;}
 }
 $('catalogue').innerHTML=out;renderManageTable();
}
function renderManageTable(){
 const panel=$('managerListing');if(!panel)return;panel.hidden=!state.admin;if(!state.admin)return;
 const matched=getShown();
 panel.innerHTML=`<div class="manager-heading"><strong>Gestion des références</strong><span>${matched.length} lignes · cliquer sur le crayon ou la poubelle</span></div>
 <div class="manager-scroll"><table><thead><tr><th>Référence</th><th>Désignation</th><th>Rayon</th><th>Sous-rayon</th><th>EAN</th><th>Actions</th></tr></thead><tbody>${matched.map(p=>`<tr class="${p.archived?'manager-archived':''}"><td>${escapeHtml(p.reference)}</td><td>${escapeHtml(p.designation)}</td><td>${escapeHtml(p.rayon)}</td><td><span class="group-color-dot" style="background:${groupColor(p.rayon,p.sousRayon)}"></span>${escapeHtml(p.sousRayon)}</td><td>${escapeHtml(p.ean)}</td><td><button class="btn btn-simple" data-edit="${escapeHtml(p.reference)}" aria-label="Modifier ${escapeHtml(p.reference)}">✎</button> <button class="btn btn-danger" data-archive="${escapeHtml(p.reference)}" aria-label="${p.archived?'Restaurer':'Supprimer'} ${escapeHtml(p.reference)}">${p.archived?'↺':'🗑'}</button></td></tr>`).join('')}</tbody></table></div>`;
}
function selectFilter(rayon,group=''){state.rayon=rayon;state.group=group;state.search='';$('searchInput').value='';render();$('toolSection').scrollIntoView({behavior:'smooth',block:'start'});}
function toggleAdmin(){if(typeof bookRemoteEnabled!=='undefined'&&bookRemoteEnabled&&bookRole!=='admin'){toast('Modification réservée aux administrateurs');return;}state.admin=!state.admin;$('app').classList.toggle('admin-on',state.admin);$('editToggle').setAttribute('aria-pressed',state.admin);$('editToggle').textContent=state.admin?'✓ Quitter le mode contributeur':'✎ Mode contributeur';$('adminPanel').hidden=!state.admin;$('addBtn').hidden=!state.admin;render();toast(state.admin?'Mode administrateur activé':'Mode consultation activé');}
function updateDatalist(rayon){const sel=$('inputSousRayon');const current=sel.value;sel.innerHTML=MASTER_GROUPS[rayon].map(k=>`<option value="${escapeHtml(k)}">${escapeHtml(k)}</option>`).join('');if(MASTER_GROUPS[rayon].includes(current))sel.value=current;}
function showForm(ref=null){originalEditReference=ref;const p=ref?products.find(x=>x.reference===ref):null;
 if(ref&&!p){toast('Référence introuvable');return;}
 const form=$('productForm');form.reset();$('dialogTitle').textContent=p?'Modifier la référence '+p.reference:'Ajouter une référence';
 for(const field of ['reference','designation','ean','rayon','sousRayon','notes'])form.elements[field].value=p?.[field]??(field==='rayon'?(state.rayon==='all'?'Matériaux':state.rayon):'');
 updateDatalist(form.elements.rayon.value);if(p&&MASTER_GROUPS[p.rayon].includes(p.sousRayon))form.elements.sousRayon.value=p.sousRayon;$('editDialog').showModal();
}
async function asDataUrl(file,isDrawing=false){if(!file)return '';
 if(!file.type.startsWith('image/'))throw new Error('Le fichier doit être une image');
 let image=await createImageBitmap(file);let max=isDrawing?1400:1100;
 let factor=Math.min(1,max/Math.max(image.width,image.height));
 const canvas=document.createElement('canvas');canvas.width=Math.round(image.width*factor);canvas.height=Math.round(image.height*factor);
 const ctx=canvas.getContext('2d',{alpha:false});ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
 if(image.close)image.close();return canvas.toDataURL(isDrawing?'image/png':'image/jpeg',isDrawing?1:.77);
}
async function submitProduct(event){event.preventDefault();if(!state.admin)return;const form=$('productForm');const data=new FormData(form);
 let ref=String(data.get('reference')||'').trim();let des=String(data.get('designation')||'').trim();let ean=String(data.get('ean')||'').trim();let rayon=String(data.get('rayon')||'');let group=String(data.get('sousRayon')||'').trim();
 if(!ref||!des||!group||!UNIVERSES.includes(rayon)){toast('Renseignez les champs obligatoires');return;}
 if(ean&&!validEan(ean)){toast('Code EAN-13 invalide : vérifiez les 13 chiffres et la clé de contrôle');return;}
 if(products.some(p=>p.reference===ref&&p.reference!==originalEditReference)){toast('Cette référence existe déjà');return;}
 let existing=originalEditReference?products.find(p=>p.reference===originalEditReference):null;
 const item={...(existing||{}),reference:ref,designation:des,ean,rayon,sousRayon:group,notes:String(data.get('notes')||'').trim(),archived:!!existing?.archived,photo:existing?.photo||'',croquis:existing?.croquis||'',barcode:existing?.ean===ean?(existing?.barcode||''):''};
 try{if($('inputPhoto').files[0])item.photo=await asDataUrl($('inputPhoto').files[0]);if($('inputCroquis').files[0])item.croquis=await asDataUrl($('inputCroquis').files[0],true);}catch(e){toast('Impossible de lire cette image');return;}
 try{await bookSaveItem(item,originalEditReference);}catch(err){toast('Erreur : '+err.message);return;}
 if(existing){products[products.indexOf(existing)]=cleanItem(item);}else{products.push(cleanItem(item));}
 $('editDialog').close();render();toast(existing?'Référence mise à jour et synchronisée':'Nouvelle référence ajoutée et synchronisée');
}
async function setArchive(ref){if(!state.admin)return;const p=products.find(x=>x.reference===ref);if(!p)return;if(!p.archived&&!confirm(`Retirer la référence ${ref} des futurs PDF et exports Excel ? Elle pourra être restaurée.`))return;
 try{await bookSaveItem({...p,archived:!p.archived},ref);p.archived=!p.archived;render();toast(p.archived?'Référence retirée des éditions futures (récupérable)':'Référence restaurée');}catch(e){toast('Modification non enregistrée : '+e.message);}
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
 const headers=['Rayon','Sous-rayon / famille','Référence LM','Désignation','EAN-13','Notes'];
 const base='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
 const files={
  '[Content_Types].xml':base+'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
  '_rels/.rels':base+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
  'xl/workbook.xml':base+'<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Matériaux" sheetId="1" r:id="rId1"/><sheet name="Jardin" sheetId="2" r:id="rId2"/></sheets></workbook>',
  'xl/_rels/workbook.xml.rels':base+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/></Relationships>'
 };
 for(let i=0;i<UNIVERSES.length;i++){
 const rayon=UNIVERSES[i];const sorted=products.filter(p=>p.rayon===rayon&&!p.archived).sort((a,b)=>MASTER_GROUPS[rayon].indexOf(a.sousRayon)-MASTER_GROUPS[rayon].indexOf(b.sousRayon));
 const rows=[headers,...sorted.map(p=>[p.rayon,p.sousRayon,p.reference,p.designation,p.ean,p.notes])];
 const rowxml=rows.map((row,r)=>`<row r="${r+1}">${row.map((v,c)=>`<c r="${col(c)}${r+1}" t="inlineStr"><is><t xml:space="preserve">${xml(v)}</t></is></c>`).join('')}</row>`).join('');
 files['xl/worksheets/sheet'+(i+1)+'.xml']=base+'<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:F'+rows.length+'"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols><col min="1" max="1" width="18" customWidth="1"/><col min="2" max="2" width="42" customWidth="1"/><col min="3" max="3" width="18" customWidth="1"/><col min="4" max="4" width="65" customWidth="1"/><col min="5" max="5" width="22" customWidth="1"/><col min="6" max="6" width="40" customWidth="1"/></cols><sheetData>'+rowxml+'</sheetData><autoFilter ref="A1:F'+rows.length+'"/></worksheet>';
 }
 downloadBlob(zipStore(files),'Book_de_vente_Calais_Materiaux_Jardin_ACTUALISE.xlsx','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');toast('Excel actualisé exporté : 2 onglets, références actives uniquement');
}

function printCard(p){let bar=barcodeDataURL(p.ean);let photo=safeImage(p.photo),croquis=safeImage(p.croquis);
return `<article class="p-product"><div class="p-reference">RÉF. ${escapeHtml(p.reference)}</div><div class="p-name">${escapeHtml(p.designation)}</div><div class="p-row"><div class="p-asset">${photo?`<img src="${escapeHtml(photo)}">`:'<span class="p-missing">Photo non disponible</span>'}</div><div class="p-asset">${croquis?`<img src="${escapeHtml(croquis)}">`:'<span class="p-missing">Croquis non disponible</span>'}</div><div class="p-asset bar">${bar?`<img src="${escapeHtml(bar)}">`:'<span class="p-missing">EAN non renseigné</span>'}</div></div>${p.notes?`<div class="p-note">⚠ ${escapeHtml(p.notes)}</div>`:''}</article>`;
}
function printHeader(rayon,page,pageCount){return `<div class="p-header"><span>BOOK DE VENTE</span><span>${escapeHtml(rayon.toUpperCase())}</span></div><div class="p-footer"><span>LEROY MERLIN CALAIS / GUIDE PRODUITS</span><span>${page} / ${pageCount}</span></div>`;}
function coverGallery(active, groups){
 const representatives=groups.map(g=>active.find(p=>p.sousRayon===g&&safeImage(p.photo))).filter(Boolean);
 const positions=[0,Math.floor((representatives.length-1)/2),representatives.length-1];
 const samples=positions.map(i=>representatives[i]).filter((p,i,arr)=>p&&arr.findIndex(other=>other.reference===p.reference)===i);
 return '<div class="cover-gallery">'+samples.map(p=>'<figure class="cover-tile"><img src="'+escapeHtml(safeImage(p.photo))+'" alt=""><figcaption>'+escapeHtml(p.sousRayon)+'</figcaption></figure>').join('')+'</div>';
}
function makePrintHTML(rayon){
 if(!UNIVERSES.includes(rayon))throw new Error('Choisir Matériaux ou Jardin');
 const active=products.filter(p=>!p.archived&&p.rayon===rayon);
 const groups=MASTER_GROUPS[rayon].filter(g=>active.some(p=>p.sousRayon===g));
 const pages=[{kind:'cover',rayon},{kind:'intro',rayon}];
 const toc={};
 for(const g of groups){
   const entries=active.filter(p=>p.sousRayon===g);toc[g]=pages.length+1;
   for(let i=0;i<entries.length;i+=3)pages.push({kind:'products',rayon,g,continued:i>0,entries:entries.slice(i,i+3)});
 }
 const colorBar=g=>`<div class="p-tab" style="--tab-color:${hexBright(groupColor(rayon,g))}"><span>${escapeHtml(g)}</span></div>`;
 return pages.map((p,i)=>{
   if(p.kind==='cover'){
     const nm=rayon==='Matériaux'?'BÂTI & MATÉRIAUX':'JARDIN';
     
     return `<div class="print-page p-cover ${rayon==='Matériaux'?'p-cover-bati':'p-cover-jardin'}"><div class="cover-micro">LEROY MERLIN CALAIS · BOOK DE VENTE</div><h1>${nm}</h1><p>Guide caisse · Photos produits · Croquis cotés · Codes-barres EAN-13</p>${coverGallery(active,groups)}<div class="p-bottom">${active.length} RÉFÉRENCES<br>${groups.length} sous-rayons</div><small>Photos des références du book : illustrations des produits, pas du magasin.</small></div>`;
   }
   if(p.kind==='intro')return `<div class="print-page p-intro">${printHeader(rayon,i+1,pages.length)}<div class="p-label">${rayon==='Matériaux'?'01':'09'} — RAYON</div><h1>${escapeHtml(rayon.toUpperCase())}</h1><p>${active.length} références / ${groups.length} sous-rayons</p><h2 class="p-toc-title">SOMMAIRE · COULEURS D'INTERCALAIRES</h2><ul class="p-toc">${groups.map(g=>`<li style="--tab-color:${groupColor(rayon,g)}"><span class="p-toc-swatch"></span><span class="p-toc-name">${escapeHtml(g)}</span><strong>p. ${toc[g]}</strong></li>`).join('')}</ul><p class="p-toc-note">Retrouvez la même couleur sur le liseré vertical droit de toutes les pages du sous-rayon.</p></div>`;
   const color=groupColor(rayon,p.g);
   return `<div class="print-page p-content" style="--tab-color:${color}">${colorBar(p.g)}${printHeader(rayon,i+1,pages.length)}<div class="p-category-label ${p.continued?'continued':''}">${escapeHtml(p.g)}${p.continued?' (suite)':''}</div>${p.entries.map(printCard).join('')}</div>`;
 }).join('');
}

async function printBook(rayon){
 toast('Préparation du PDF '+rayon+' et de ses intercalaires…');
 const area=$('printArea');area.innerHTML=makePrintHTML(rayon);
 const images=[...area.querySelectorAll('img')];
 try{await Promise.race([Promise.all(images.map(img=>img.decode().catch(()=>{}))),new Promise(resolve=>setTimeout(resolve,12000))]);}catch(e){}
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
$('sidebarChapters').addEventListener('click',e=>{const b=e.target.closest('button[data-rayon]');if(b)selectFilter(b.dataset.rayon,b.dataset.group||'');});
$('editToggle').addEventListener('click',toggleAdmin);
$('addBtn').addEventListener('click',()=>showForm());
$('managerListing').before($('adminPanel'));
$('managerListing').addEventListener('click',e=>{const edit=e.target.closest('[data-edit]'),archive=e.target.closest('[data-archive]');if(edit)showForm(edit.dataset.edit);else if(archive)setArchive(archive.dataset.archive);});
$('catalogue').addEventListener('click',e=>{const edit=e.target.closest('[data-edit]'),archive=e.target.closest('[data-archive]');if(edit)showForm(edit.dataset.edit);else if(archive){setArchive(archive.dataset.archive);}});
$('dialogClose').addEventListener('click',()=>$('editDialog').close());
$('dialogCancel').addEventListener('click',()=>$('editDialog').close());
$('inputRayon').addEventListener('change',e=>{updateDatalist(e.target.value);$('inputSousRayon').value='';});
$('productForm').addEventListener('submit',submitProduct);
$('exportJsonBtn').addEventListener('click',exportJSON);
$('exportExcelBtn').addEventListener('click',exportXlsx);
$('printBatiBtn').addEventListener('click',()=>printBook('Matériaux'));
$('printJardinBtn').addEventListener('click',()=>printBook('Jardin'));
$('browseBatiBtn').addEventListener('click',()=>selectFilter('Matériaux'));
$('browseJardinBtn').addEventListener('click',()=>selectFilter('Jardin'));
$('coverPrintBati').addEventListener('click',()=>printBook('Matériaux'));
$('coverPrintJardin').addEventListener('click',()=>printBook('Jardin'));
$('refreshBtn').addEventListener('click',()=>void bookRefresh());
$('showArchivedBtn').addEventListener('click',()=>{state.showArchived=!state.showArchived;$('showArchivedBtn').textContent=state.showArchived?'Masquer les archivées':'Afficher les archivées';render();});
render();