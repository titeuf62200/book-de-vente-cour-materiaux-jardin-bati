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
let bookAuthMode='login';
const roleLabel=r=>r==='admin'?'Administrateur':'Consultation';
function uiAuthStatus(message,error=false){const el=$('authMessage');el.textContent=message;el.classList.toggle('auth-error',error);}
function bookShowGate(on){$('authGate').hidden=!on;document.body.classList.toggle('login-locked',on);$('logoutBtn').hidden=on;}
function bookCanEdit(){return !!bookClient&&bookRole==='admin';}
function toRemote(p){return {reference:String(p.reference),designation:String(p.designation),ean:String(p.ean),rayon:p.rayon,sous_rayon:p.sousRayon,photo:p.photo||'',croquis:p.croquis||'',notes:p.notes||'',page_source:p.pageSource||null,archived:!!p.archived};}
function fromRemote(p){return cleanItem({...p,sousRayon:p.sous_rayon,pageSource:p.page_source});}
async function bookRefresh(){
 if(!bookClient||!bookRole||loadingBook)return;
 loadingBook=true;$('saveStatus').textContent='Actualisation du catalogue…';
 try{
  // Les photos ne sont renvoyées qu'aux utilisateurs autorisés (politiques RLS).
  const {data,error}=await bookClient.from('book_catalog_products').select('reference,designation,ean,rayon,sous_rayon,photo,croquis,notes,page_source,archived').order('rayon').order('sous_rayon').order('reference');
  if(error)throw error;
  products=(data||[]).map(fromRemote);render();$('saveStatus').textContent=products.filter(p=>!p.archived).length+' références synchronisées';
 }catch(error){$('saveStatus').textContent='Erreur de chargement';toast('Impossible de charger le catalogue : '+error.message);}
 finally{loadingBook=false;}
}
async function bookSaveItem(item,originalRef=null){
 if(!bookCanEdit())throw new Error('Seuls les administrateurs peuvent modifier le catalogue.');
 const row=toRemote(item);
 if(row.ean&&!validEan(row.ean))throw new Error('EAN-13 incorrect : les barres doivent correspondre au numéro.');
 const {error}=await bookClient.from('book_catalog_products').upsert(row,{onConflict:'reference'});
 if(error)throw error;
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
   bookShowGate(false);await bookRefresh();
 }catch(e){bookShowGate(true);uiAuthStatus('Impossible d’ouvrir le book : '+e.message,true);}
}
/* Comptes utilisateurs gérés par Supabase Auth.
 * Les mots de passe ne sont jamais enregistrés dans GitHub ou les tables publiques.
 * L'accès en lecture/édition est imposé par book_catalog_role() et les politiques RLS.
 */
function bookSwitchAuthMode(mode){
 if(bookRecovery)return;
 bookAuthMode=mode==='signup'?'signup':'login';
 const signup=bookAuthMode==='signup';
 $('authSignupFields').hidden=!signup;
 $('authConfirmPassword').required=signup;
 $('authLoginBtn').textContent=signup?'Créer mon profil':'Se connecter';
 $('authSwitchMode').textContent=signup?'Déjà inscrit ? Se connecter':'Créer un profil';
 $('authIntro').textContent=signup?
   'Créez votre profil Book de vente avec un mot de passe. Les deux adresses administratrices définies auront le droit de modifier le catalogue. Les autres profils seront en lecture seule.':
   'Connectez-vous avec votre adresse professionnelle et votre mot de passe.';
 uiAuthStatus(signup?'Un e-mail de confirmation peut être nécessaire pour activer votre profil.':'');
}
function bookAuthErrorMessage(error){
 const message=String(error?.message||error||'Erreur inconnue');
 const code=String(error?.code||'');
 if(/over_email_send_rate_limit|email rate limit exceeded|email rate limit/i.test(code+' '+message))
  return 'Envoi des e-mails temporairement bloqué : le quota de messages de Supabase est atteint (2 e-mails par heure avec le service intégré). Aucune demande n’a pu être envoyée. Évitez de renouveler les essais immédiatement. Pour une solution durable, il faut configurer un service SMTP dédié dans Supabase.';
 if(/email address not authorized|email not authorized/i.test(code+' '+message))
  return 'L’adresse n’est pas autorisée par le service d’envoi d’e-mails intégré. Il faut configurer un service SMTP dédié dans Supabase pour envoyer les confirmations aux collaborateurs.';
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
 await bookClient?.auth.signOut();bookRole=null;bookEmail='';bookSessionUserId='';products=[];state.admin=false;$('adminPanel').hidden=true;$('addBtn').hidden=true;$('addTopBtn').hidden=true;$('printArea').innerHTML='';render();bookShowGate(true);uiAuthStatus('Vous êtes déconnecté.');
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
   if(event==='SIGNED_OUT'){bookRole=null;products=[];state.admin=false;$('adminPanel').hidden=true;$('addBtn').hidden=true;$('addTopBtn').hidden=true;$('printArea').innerHTML='';render();bookShowGate(true);}
  });
  const {data:{session},error}=await bookClient.auth.getSession();if(error)throw error;
  if(bookRecovery)bookShowRecovery();
  else if(session)await bookActivate();
  else bookSwitchAuthMode('login');
 }catch(e){uiAuthStatus('Connexion sécurisée indisponible : '+e.message,true);}
}
$('authForm').addEventListener('submit',bookLogin);
$('authSwitchMode').addEventListener('click',()=>bookSwitchAuthMode(bookAuthMode==='login'?'signup':'login'));
$('authForgotBtn').addEventListener('click',bookForgotPassword);
$('authRecoveryForm').addEventListener('submit',bookCompleteRecovery);
$('logoutBtn').addEventListener('click',bookLogout);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&bookRole)void bookRefresh();});
void bookInit();