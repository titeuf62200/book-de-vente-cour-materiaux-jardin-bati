/* Authentification + données partagées.
 * Seule une clef publique Supabase est utilisée ici. Les données et les droits sont
 * vérifiés par RLS sur le serveur : aucun catalogue n'est livré dans ce dépôt.
 */
'use strict';
const BOOK_CFG=window.BOOK_SUPABASE_CONFIG||{};
let bookClient=null,bookRole=null,bookEmail='',loadingBook=false;
const OWNER_EMAIL='cedric.ledez@leroymerlin.fr';
const BOOK_ADMIN_EMAILS=new Set(['cedric.ledez@leroymerlin.fr','sylvie.ribery@leroymerlin.fr']);
let bookRecovery=false;
let bookAuthMode='signup';
const roleLabel=r=>r==='admin'?'Administrateur':'Consultation';
function uiAuthStatus(message,error=false){const el=$('authMessage');el.textContent=message;el.classList.toggle('auth-error',error);}
function bookShowGate(on){$('authGate').hidden=!on;document.body.classList.toggle('login-locked',on);$('logoutBtn').hidden=on;}
function bookCanEdit(){return !!bookClient&&bookRole==='admin'&&BOOK_ADMIN_EMAILS.has(bookEmail);}
function toRemote(p){return {reference:String(p.reference),designation:String(p.designation),ean:String(p.ean),rayon:p.rayon,sous_rayon:p.sousRayon,sous_rayon_code:p.sousRayonCode||null,photo:p.photo||'',croquis:p.croquis||'',notes:p.notes||'',page_source:p.pageSource||null,archived:!!p.archived};}
function fromRemote(p){return cleanItem({...p,sousRayon:p.sous_rayon,sousRayonCode:p.sous_rayon_code,pageSource:p.page_source});}
// Le catalogue est chargé en 2 temps : références, familles et compteurs
// immédiatement ; les images volumineuses sont récupérées à la demande.
// Une session fermée ou renouvelée ne conserve aucune donnée métier en cache.
let bookRefreshTask=null;
let bookLastSyncAt=0;
let bookMediaEpoch=0;
let bookMediaLoaded=new Set();
let bookMediaPending=new Map();
let bookMediaQueues=[Promise.resolve(),Promise.resolve(),Promise.resolve()];
let bookMediaQueueCursor=0;
let bookMediaObserver=null;
let bookCatalogReady=false;

function bookResetMedia(){
 bookMediaEpoch++;
 bookMediaLoaded=new Set();
 bookMediaPending=new Map();
 bookMediaQueues=[Promise.resolve(),Promise.resolve(),Promise.resolve()];
 if(bookMediaObserver)bookMediaObserver.disconnect();
}
function bookPatchLoadedMedia(refs){
 const selected=new Set(refs.map(String));
 // Modifier uniquement les visuels, sans reconstruire 600 cartes ni déplacer le défilement.
 document.querySelectorAll('.product-card[data-catalog-ref]').forEach(card=>{
  const ref=card.dataset.catalogRef;
  if(!selected.has(ref))return;
  const p=products.find(x=>x.reference===ref);
  if(!p)return;
  for(const kind of ['photo','croquis']){
   const target=card.querySelector('[data-catalog-media="'+kind+'"]');
   if(target)target.innerHTML=imageZoomMarkup(p,kind);
  }
 });
 document.querySelectorAll('.nuancier-list-item[data-nuancier-refs]').forEach(item=>{
  const refs=(item.dataset.nuancierRefs||'').split(',');
  if(!refs.some(ref=>selected.has(ref)))return;
  const p=refs.map(ref=>products.find(x=>x.reference===ref&&!x.archived)).find(p=>p?.photo);
  const target=item.querySelector('.nuancier-list-photo');
  if(target&&p)target.innerHTML=imageMarkup(safeImage(p.photo),p.designation);
 });
}

// Récupération des images en groupes limités à 30 références, avec au plus
// 3 requêtes simultanées ; doublons évités entre l'écran, le zoom et le PDF.
async function bookEnsureMedia(refs){
 if(!bookClient||!bookRole)throw Error('Catalogue non connecté.');
 const wanted=[...new Set((refs||[]).map(String).filter(Boolean))];
 const requestedEpoch=bookMediaEpoch;
 const jobs=new Set(),fresh=[];
 for(const ref of wanted){
  if(bookMediaLoaded.has(ref))continue;
  if(bookMediaPending.has(ref))jobs.add(bookMediaPending.get(ref));
  else fresh.push(ref);
 }
 for(let i=0;i<fresh.length;i+=30){
  const batch=fresh.slice(i,i+30),epoch=bookMediaEpoch;
  const index=bookMediaQueueCursor++%bookMediaQueues.length;
  const task=bookMediaQueues[index].then(async()=>{
   if(epoch!==bookMediaEpoch)return;
   const {data,error}=await bookClient.from('book_catalog_products')
    .select('reference,photo,croquis').in('reference',batch);
   if(error)throw error;
   if(epoch!==bookMediaEpoch)return;
   const found=new Map((data||[]).map(p=>[String(p.reference),p]));
   for(const ref of batch){
    if(!found.has(ref))throw Error('Visuels introuvables pour la réf. '+ref);
    const target=products.find(p=>p.reference===ref),row=found.get(ref);
    if(target&&row){
     target.photo=safeImage(row.photo);
     target.croquis=safeImage(row.croquis);
     bookMediaLoaded.add(ref);
    }
   }
   bookPatchLoadedMedia(batch);
  });
  bookMediaQueues[index]=task.catch(()=>{});
  for(const ref of batch)bookMediaPending.set(ref,task);
  jobs.add(task);
  void task.finally(()=>{for(const ref of batch)if(bookMediaPending.get(ref)===task)bookMediaPending.delete(ref);}).catch(()=>{});
 }
 await Promise.all([...jobs]);
 if(requestedEpoch!==bookMediaEpoch)throw Error('Le catalogue a été actualisé pendant le chargement des visuels. Réessayez.');
 if(wanted.some(ref=>products.some(p=>p.reference===ref)&&!bookMediaLoaded.has(ref)))
  throw Error('Certaines images ne sont pas accessibles ; opération interrompue.');
 return true;
}
function bookWatchMedia(){
 if(bookMediaObserver)bookMediaObserver.disconnect();
 const cards=[...document.querySelectorAll('.product-card[data-catalog-ref]')];
 if(!cards.length||!bookClient||!bookRole)return;
 if(typeof IntersectionObserver==='undefined'){
  void bookEnsureMedia(cards.slice(0,20).map(el=>el.dataset.catalogRef)).catch(()=>{});
  return;
 }
 bookMediaObserver=new IntersectionObserver(entries=>{
  const refs=[];
  for(const entry of entries){
   if(!entry.isIntersecting)continue;
   bookMediaObserver.unobserve(entry.target);
   const ref=entry.target.dataset.catalogRef;
   if(ref&&!bookMediaLoaded.has(ref))refs.push(ref);
  }
  if(refs.length)void bookEnsureMedia(refs).catch(err=>console.warn('Photo ou croquis indisponible :',err.message));
 },{rootMargin:'350px 0px'});
 for(const el of cards)if(!bookMediaLoaded.has(el.dataset.catalogRef))bookMediaObserver.observe(el);
}
async function bookRefresh(){
 if(!bookClient||!bookRole)return false;
 if(bookRefreshTask)return bookRefreshTask;
 bookRefreshTask=(async()=>{
  loadingBook=true;
  $('saveStatus').textContent='Chargement rapide des familles et références…';
  try{
   // Ne plus transférer les ~31 Mo de photos/croquis lors de la connexion.
   // Les deux lectures de données légères sont parallèles.
   const [catalog,sections]=await Promise.all([
    bookClient.from('book_catalog_products')
     .select('reference,designation,ean,rayon,sous_rayon,sous_rayon_code,notes,page_source,archived')
     .order('rayon').order('sous_rayon').order('reference'),
    bookClient.from('book_catalog_sections')
     .select('rayon,sector_code,display_code,color,display_name,is_hidden')
   ]);
   if(catalog.error)throw catalog.error;
   if(sections.error)throw sections.error;
   const loaded=(catalog.data||[]).map(fromRemote);
   const settings=sections.data||[];
   // N'afficher les nouvelles familles qu'après succès des deux requêtes.
   bookResetMedia();
   sectorOverrides=Object.create(null);
   for(const section of settings)sectorOverrides[sectorOverrideKey(section.rayon,section.sector_code)]=section;
   products=loaded;
   bookCatalogReady=true;
   bookLastSyncAt=Date.now();
   render();
   document.querySelectorAll('[data-nuancier]').forEach(btn=>{
    const counter=btn.querySelector('.nuancier-nav-count');
    if(counter&&typeof nuancierFor==='function')counter.textContent=nuancierFor(btn.dataset.nuancier).length;
   });
   const count=products.filter(p=>!p.archived).length;
   $('saveStatus').textContent=count+' références synchronisées · visuels à la demande';
   return true;
  }catch(error){
   $('saveStatus').textContent='Catalogue indisponible — réessayer';
   if(!bookCatalogReady)render(); // « … » plutôt qu’un faux zéro si le serveur ne répond pas.
   toast(bookAuthErrorMessage(error));
   return false;
  }finally{loadingBook=false;}
 })();
 try{return await bookRefreshTask;}finally{bookRefreshTask=null;}
}
async function bookSaveSectorSettings(row){
 if(!bookCanEdit())throw new Error('Configuration réservée aux administrateurs.');
 const {data,error}=await bookClient.from('book_catalog_sections')
   .upsert(row,{onConflict:'rayon,sector_code'})
   .select('rayon,sector_code,display_code,color,display_name,is_hidden').single();
 if(error)throw error;
 if(!data||data.display_code!==row.display_code||data.color!==row.color||data.display_name!==row.display_name||data.is_hidden!==row.is_hidden)throw new Error('La configuration n’a pas été confirmée.');
}
async function bookDeleteSectorSettings(rayon,code){
 if(!bookCanEdit())throw new Error('Configuration réservée aux administrateurs.');
 const {error}=await bookClient.from('book_catalog_sections')
   .delete().eq('rayon',rayon).eq('sector_code',code);
 if(error)throw error;
}
async function bookSetSectorVisibility(rayon,code,hidden,d){
 if(!bookCanEdit())throw new Error('Action réservée aux administrateurs.');
 const {data,error}=await bookClient.rpc('book_catalog_set_section_visibility',{
  p_rayon:rayon,p_sector_code:code,p_hidden:hidden,
  p_display_code:d.displayCode,p_color:d.color,p_display_name:d.name
 });
 if(error)throw error;
 if(data!==true)throw new Error('Le changement de visibilité n’a pas été confirmé.');
}
async function bookReassignSectorProducts(sourceRayon,sourceCode,destRayon,destCode,destName,refs){
 if(!bookCanEdit())throw new Error('Transfert réservé aux administrateurs.');
 const {data,error}=await bookClient.rpc('book_catalog_reassign_products',{
  p_source_rayon:sourceRayon,p_source_code:sourceCode,
  p_destination_rayon:destRayon,p_destination_code:destCode,
  p_destination_name:destName,p_refs:refs
 });
 if(error)throw error;
 if(Number(data)!==refs.length)throw new Error('Le nombre de références transférées est incorrect.');
 return Number(data);
}
async function bookSaveItem(item,originalRef=null){
 if(!bookCanEdit())throw new Error('Seuls les administrateurs peuvent modifier le catalogue.');
 if(!bookCatalogReady)throw new Error('Le catalogue n’a pas été chargé : actualisez avant de modifier une référence.');
 // Sécurité : ne jamais remplacer un média existant par une valeur vide
 // simplement parce que la fiche n'avait pas encore été téléchargée.
 const sourceRef=String(originalRef||item.reference);
 if(products.some(p=>p.reference===sourceRef)&&!bookMediaLoaded.has(sourceRef))
  throw new Error('Visuels originaux non chargés : réouvrez la fiche avant d’enregistrer.');
 const row=toRemote(item);
 if(row.ean&&!validEan(row.ean))throw new Error('EAN-13 incorrect : les barres doivent correspondre au numéro.');
 const {data:saved,error}=await bookClient.from('book_catalog_products')
   .upsert(row,{onConflict:'reference'})
   .select('reference,rayon,sous_rayon,sous_rayon_code,archived').single();
  if(error)throw error;
  if(!saved||saved.reference!==row.reference||saved.rayon!==row.rayon||saved.sous_rayon!==row.sous_rayon||saved.sous_rayon_code!==row.sous_rayon_code||saved.archived!==row.archived)
   throw new Error('La référence n’a pas pu être confirmée sur le serveur. Réactualisez le catalogue.');
 if(originalRef&&originalRef!==row.reference){
   const {error:removeError}=await bookClient.from('book_catalog_products').delete().eq('reference',originalRef);
   if(removeError)throw new Error('Nouvelle référence enregistrée, mais suppression de l’ancienne impossible : '+removeError.message);
 }
 $('saveStatus').textContent='Catalogue enregistré sur le serveur';
}
async function bookGetRole(){
 const {data:{user},error:userError}=await bookClient.auth.getUser();
 if(userError)throw userError;
 if(!user)throw new Error('Session expirée');
 const email=String(user.email||'').trim().toLowerCase();
 if(!email.endsWith('@leroymerlin.fr'))throw new Error('Accès réservé aux adresses professionnelles @leroymerlin.fr.');
 if(!user.email_confirmed_at)return {role:null,email};
 // Un profil non administrateur se déclare lecteur une fois l’adresse confirmée.
 // Cette fonction ne peut jamais créer un compte administrateur.
 const {error:registerError}=await bookClient.rpc('book_catalog_register_reader');
 if(registerError)throw registerError;
 const {data:role,error}=await bookClient.rpc('book_catalog_role');
 if(error)throw error;
 if(!['admin','lecteur'].includes(role))return {role:null,email};
 if(role==='admin'&&!BOOK_ADMIN_EMAILS.has(email))throw new Error('Rôle administrateur incohérent, accès bloqué.');
 return {role,email};
}
let bookSessionUserId='';
async function bookActivate(){
 try{
   const {role,email}=await bookGetRole();
   if(!['admin','lecteur'].includes(role)){
    bookRole=null;bookShowGate(true);
    uiAuthStatus('Confirmez votre adresse e-mail pour activer votre compte.',true);return;
   }
   bookRole=role;bookEmail=email;
   $('authBadge').textContent=email+' · '+roleLabel(role);
   $('editToggle').hidden=!bookCanEdit();
   state.admin=bookCanEdit();$('app').classList.toggle('admin-on',state.admin);$('adminPanel').hidden=!state.admin;$('addBtn').hidden=!state.admin;$('addTopBtn').hidden=!state.admin;
   $('editToggle').setAttribute('aria-pressed',String(state.admin));
   $('editToggle').textContent=state.admin?'✓ Quitter le mode modification':'✎ Mode modification';
   // Ne découvrir l'accueil qu'une fois les familles et compteurs prêts :
   // évite l'affichage trompeur de « 0 référence » pendant la connexion.
   const ready=await bookRefresh();
   bookShowGate(false);
   if(!ready)$('saveStatus').textContent='Catalogue indisponible — utiliser Actualiser';
 }catch(e){
  bookRole=null;bookShowGate(true);
  const message=String(e?.message||'');
  if(/user[_ ]not[_ ]found|user from sub claim|user.*does not exist|session expired|invalid refresh token|refresh token not found|jwt expired/i.test(String(e?.code||'')+' '+message)){
   try{await bookClient.auth.signOut({scope:'local'});}catch(_error){}
   bookSwitchAuthMode('signup');
   uiAuthStatus('Votre ancienne session n’est plus valable. Créez vos nouveaux identifiants pour accéder au Book de vente.');
  }else uiAuthStatus('Impossible d’ouvrir le book : '+bookAuthErrorMessage(e),true);
 }
}
/* Comptes utilisateurs gérés par Supabase Auth.
 * Les mots de passe ne sont jamais enregistrés dans GitHub ou les tables publiques.
 * L'accès en lecture/édition est imposé par book_catalog_role() et les politiques RLS.
 */
function bookSwitchAuthMode(mode){
 if(bookRecovery)return;
 bookAuthMode=mode==='signup'?'signup':'login';
 const signup=bookAuthMode==='signup';
 $('authTitle').textContent=signup?'Créer mes identifiants':'Connexion au book de vente';
 $('authSignupFields').hidden=!signup;
 $('authConfirmPassword').required=signup;
 $('authPassword').setAttribute('autocomplete',signup?'new-password':'current-password');
 $('authLoginBtn').textContent=signup?'Créer mon profil':'Se connecter';
 $('authSwitchMode').textContent=signup?'Déjà inscrit ? Se connecter':'Créer un profil';
 $('authIntro').textContent=signup?
   'Utilisez votre adresse professionnelle @leroymerlin.fr. Cédric et Sylvie sont coordinateurs ; tous les autres collaborateurs ont un accès en lecture seule, avec recherche EAN et photo.':
   'Connectez-vous avec votre adresse professionnelle et votre mot de passe.';
 uiAuthStatus(signup?'Un e-mail de confirmation peut être nécessaire pour activer votre profil.':'');
}
function bookAuthErrorMessage(error){
 const message=String(error?.message||error||'Erreur inconnue');
 const code=String(error?.code||'');
 // En cas de 522/525 ou de « Failed to fetch », l'authentification n'a pas
 // forcément pu atteindre le serveur. Ne jamais suggérer une erreur de mot de passe.
 if(/failed to fetch|fetch failed|networkerror|network request failed|connection (terminated|timed? ?out)|timeout|timed out|\\b(?:502|503|504|520|522|524|525)\\b/i.test(code+' '+message))
  return 'Le serveur du Book de vente est momentanément inaccessible. Il ne s’agit pas d’un refus de votre mot de passe. Vous pouvez réessayer avec « Se connecter » quand le service répond à nouveau. Si le problème persiste, les responsables doivent vérifier le projet Supabase.';
 if(/over_email_send_rate_limit|email rate limit exceeded|email rate limit/i.test(code+' '+message))
  return 'Envoi des e-mails temporairement bloqué : le quota de messages de Supabase est atteint (2 e-mails par heure avec le service intégré). Aucune demande n’a pu être envoyée. Évitez de renouveler les essais immédiatement. Pour une solution durable, il faut configurer un service SMTP dédié dans Supabase.';
 if(/email address not authorized|email not authorized/i.test(code+' '+message))
  return 'L’adresse n’est pas autorisée par le service d’envoi d’e-mails intégré. Il faut configurer un service SMTP dédié dans Supabase pour envoyer les confirmations aux collaborateurs.';
 if(/user already registered|already registered|already exists/i.test(code+' '+message))
  return 'Un profil existe déjà pour cette adresse. Utilisez « Se connecter » ou « Mot de passe oublié ? » pour choisir un nouveau mot de passe.';
 if(/invalid login credentials|invalid credentials/i.test(code+' '+message))
  return 'Adresse ou mot de passe incorrect. Si le profil existe déjà, choisissez « Mot de passe oublié ? ».';
 if(/email not confirmed/i.test(code+' '+message))
  return 'Votre adresse doit être confirmée via l’e-mail reçu avant la connexion.';
 if(/for security purposes|too many requests|rate limit/i.test(code+' '+message))
  return 'Trop de demandes rapprochées. N’effectuez pas de nouvel essai immédiatement.';
 return message;
}
async function bookLogin(ev){
 ev.preventDefault();
 if(!bookClient)return uiAuthStatus('Service de connexion indisponible.',true);
 const email=$('authEmail').value.trim().toLowerCase();
 const password=$('authPassword').value;
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return uiAuthStatus('Adresse e-mail incorrecte.',true);
 if(!email.endsWith('@leroymerlin.fr'))return uiAuthStatus('Utilisez une adresse professionnelle @leroymerlin.fr.',true);
 if(password.length<8)return uiAuthStatus('Le mot de passe doit contenir au moins 8 caractères.',true);
 if(bookAuthMode==='signup'){
  const check=$('authConfirmPassword').value;
  if(check!==password)return uiAuthStatus('Les deux mots de passe ne correspondent pas.',true);
 }
 const btn=$('authLoginBtn');if(btn.disabled)return;
 btn.disabled=true;btn.textContent=bookAuthMode==='signup'?'Création du profil…':'Connexion…';
 try{
  if(bookAuthMode==='signup'){
   const {data,error}=await bookClient.auth.signUp({
    email,password,options:{emailRedirectTo:location.origin+location.pathname}
   });
   if(error)throw error;
   if(data?.session){await bookActivate();}
   else uiAuthStatus('Profil en cours de création. Consultez votre messagerie et confirmez votre adresse ; vous pourrez ensuite vous connecter. '+(BOOK_ADMIN_EMAILS.has(email)?'Droits administrateur après confirmation.':'Accès lecture seule après confirmation.'));
  }else{
   const {error}=await bookClient.auth.signInWithPassword({email,password});
   if(error)throw error;
   await bookActivate();
  }
 }catch(error){
  uiAuthStatus('Impossible de '+(bookAuthMode==='signup'?'créer le compte':'se connecter')+' : '+bookAuthErrorMessage(error),true);
 }finally{btn.disabled=false;btn.textContent=bookAuthMode==='signup'?'Créer mon profil':'Se connecter';}
}
async function bookForgotPassword(){
 if(!bookClient)return uiAuthStatus('Service de connexion indisponible.',true);
 const email=$('authEmail').value.trim().toLowerCase();
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return uiAuthStatus('Indiquez votre adresse e-mail.',true);
 if(!email.endsWith('@leroymerlin.fr'))return uiAuthStatus('Utilisez une adresse professionnelle @leroymerlin.fr.',true);
 const button=$('authForgotBtn');button.disabled=true;
 try{
  const {error}=await bookClient.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});
  if(error)throw error;
  uiAuthStatus('Si cette adresse est enregistrée, un e-mail pour définir un nouveau mot de passe a été envoyé.');
 }catch(e){uiAuthStatus('Réinitialisation impossible : '+bookAuthErrorMessage(e),true);}
 finally{button.disabled=false;}
}
function bookShowRecovery(){
 bookRecovery=true;
 bookShowGate(true);
 $('authForm').hidden=true;
 $('authSwitchMode').hidden=true;
 $('authForgotBtn').hidden=true;
 $('authRecoveryForm').hidden=false;
 $('authIntro').textContent='Définissez votre nouveau mot de passe.';
 uiAuthStatus('Choisissez un nouveau mot de passe de 8 caractères minimum.');
}
async function bookCompleteRecovery(ev){
 ev.preventDefault();
 if(!bookClient)return;
 const p=$('newAuthPassword').value;
 if(p.length<8)return uiAuthStatus('Le mot de passe doit contenir au moins 8 caractères.',true);
 if(p!==$('newAuthPasswordConfirm').value)return uiAuthStatus('Les mots de passe ne correspondent pas.',true);
 const btn=$('authRecoveryBtn');btn.disabled=true;
 try{
  const {error}=await bookClient.auth.updateUser({password:p});
  if(error)throw error;
  bookRecovery=false;
  await bookClient.auth.signOut();
  $('authRecoveryForm').hidden=true;
  $('authForm').hidden=false;
  $('authSwitchMode').hidden=false;
  $('authForgotBtn').hidden=false;
  $('authPassword').value='';
  $('newAuthPassword').value='';
  $('newAuthPasswordConfirm').value='';
  bookSwitchAuthMode('login');
  uiAuthStatus('Mot de passe enregistré. Connectez-vous avec votre nouveau mot de passe.');
 }catch(e){uiAuthStatus('Mot de passe non modifié : '+e.message,true);}
 finally{btn.disabled=false;}
}
async function bookLogout(){
 await bookClient?.auth.signOut();bookResetMedia();bookCatalogReady=false;bookLastSyncAt=0;bookRole=null;bookEmail='';bookSessionUserId='';products=[];state.admin=false;$('adminPanel').hidden=true;$('addBtn').hidden=true;$('addTopBtn').hidden=true;$('printArea').innerHTML='';render();bookShowGate(true);uiAuthStatus('Vous êtes déconnecté.');
}
async function bookInit(){
 bookRecovery=location.hash.includes('type=recovery');
 bookShowGate(true);uiAuthStatus('Connexion au catalogue sécurisé…');
 try{
  if(!BOOK_CFG.url||!BOOK_CFG.publishableKey)throw new Error('Configuration sécurisée manquante');
  if(!window.supabase?.createClient){
   await new Promise((resolve,reject)=>{const js=document.createElement('script');js.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/dist/umd/supabase.min.js';js.onload=resolve;js.onerror=()=>reject(new Error('Service de connexion indisponible'));document.head.append(js);});
  }
  bookClient=window.supabase.createClient(BOOK_CFG.url,BOOK_CFG.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  bookClient.auth.onAuthStateChange((event,session)=>{
   if(event==='PASSWORD_RECOVERY')setTimeout(bookShowRecovery,0);
   if(event==='SIGNED_IN'&&!bookRecovery)setTimeout(()=>{if(!bookRecovery&&!bookRole)void bookActivate();},0);
   if(event==='SIGNED_OUT'){bookResetMedia();bookCatalogReady=false;bookLastSyncAt=0;bookRole=null;products=[];sectorOverrides=Object.create(null);state.admin=false;$('adminPanel').hidden=true;$('addBtn').hidden=true;$('addTopBtn').hidden=true;$('printArea').innerHTML='';render();bookShowGate(true);}
  });
  const {data:{session},error}=await bookClient.auth.getSession();
  if(error){
   try{await bookClient.auth.signOut({scope:'local'});}catch(_error){}
   bookSwitchAuthMode('signup');
   uiAuthStatus('Votre ancienne session a expiré. Créez vos nouveaux identifiants.');
   return;
  }
  if(bookRecovery)bookShowRecovery();
  else if(session)await bookActivate();
  else bookSwitchAuthMode('signup');
 }catch(e){uiAuthStatus('Connexion sécurisée indisponible : '+bookAuthErrorMessage(e),true);}
}
$('authForm').addEventListener('submit',bookLogin);
$('authSwitchMode').addEventListener('click',()=>bookSwitchAuthMode(bookAuthMode==='login'?'signup':'login'));
$('authForgotBtn').addEventListener('click',bookForgotPassword);
$('authRecoveryForm').addEventListener('submit',bookCompleteRecovery);
$('logoutBtn').addEventListener('click',bookLogout);
// Au retour sur l'onglet, ne relancer le transfert de ~31 Mo que si
// une synchronisation précédente date de plus de 10 minutes.
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&bookRole&&Date.now()-bookLastSyncAt>600000)void bookRefresh();});
void bookInit();