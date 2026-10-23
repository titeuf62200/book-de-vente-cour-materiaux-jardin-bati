/* Authentification + données partagées.
 * Seule une clef publique Supabase est utilisée ici. Les données et les droits sont
 * vérifiés par RLS sur le serveur : aucun catalogue n'est livré dans ce dépôt.
 */
'use strict';
const BOOK_CFG=window.BOOK_SUPABASE_CONFIG||{};
let bookClient=null,bookRole=null,bookEmail='',loadingBook=false;
const OWNER_EMAIL='cedric.led@leroymerlin.fr';
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
 if(!validEan(row.ean))throw new Error('EAN-13 incorrect : les barres doivent correspondre au numéro.');
 const {error}=await bookClient.from('book_catalog_products').upsert(row,{onConflict:'reference'});
 if(error)throw error;
 if(originalRef&&originalRef!==row.reference){
   const {error:removeError}=await bookClient.from('book_catalog_products').delete().eq('reference',originalRef);
   if(removeError)throw new Error('Nouvelle référence enregistrée, mais suppression de l’ancienne impossible : '+removeError.message);
 }
 $('saveStatus').textContent='Catalogue enregistré sur le serveur';
}
async function bookGetRole(){
 const {data:{user},error:userError}=await bookClient.auth.getUser();if(userError)throw userError;if(!user)throw new Error('Session expirée');
 const email=String(user.email||'').toLowerCase();
 const {data,error}=await bookClient.from('book_catalog_members').select('email,role').eq('email',email).maybeSingle();
 if(error)throw error;return {role:data?.role||null,email};
}
async function bookRenderMembers(){
 if(!bookCanEdit())return;
 const {data,error}=await bookClient.from('book_catalog_members').select('email,role').order('email');
 if(error){toast('Impossible de charger les utilisateurs : '+error.message);return;}
 $('memberList').innerHTML=(data||[]).map(p=>`<div class="member-tag"><strong>${escapeHtml(p.email)}</strong><span>${roleLabel(p.role)}</span>${p.email===OWNER_EMAIL?' <span>propriétaire</span>':`<button type="button" data-remove-member="${escapeHtml(p.email)}" aria-label="Révoquer ${escapeHtml(p.email)}">✕ Révoquer</button>`}</div>`).join('');
}
async function bookAuthorizeMember(ev){
 ev.preventDefault();if(!bookCanEdit())return;
 const email=$('newMemberEmail').value.trim().toLowerCase(),role=$('newMemberRole').value;
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return toast('Adresse invalide');
 if(!['admin','lecteur'].includes(role))return;
 if(email===OWNER_EMAIL&&role!=='admin')return toast('Le compte propriétaire reste administrateur');
 const {error}=await bookClient.from('book_catalog_members').upsert({email,role},{onConflict:'email'});
 if(error)return toast('Impossible d’autoriser cet utilisateur : '+error.message);
 $('newMemberEmail').value='';toast('Utilisateur autorisé : '+email+' · '+roleLabel(role));await bookRenderMembers();
}
async function bookRevokeMember(email){
 if(!bookCanEdit()||email===OWNER_EMAIL)return;
 if(!confirm('Retirer l’accès au book de vente pour '+email+' ?'))return;
 const {error}=await bookClient.from('book_catalog_members').delete().eq('email',email);
 if(error)return toast('Révocation impossible : '+error.message);
 toast('Accès retiré à '+email);await bookRenderMembers();
}
let bookSessionUserId='';
async function bookActivate(){
 try{
   const {role,email}=await bookGetRole();
   if(!role){bookShowGate(true);uiAuthStatus('Adresse non autorisée. Un administrateur doit d’abord vous ajouter.',true);return;}
   bookRole=role;bookEmail=email;
   $('authBadge').textContent=email+' · '+roleLabel(role);
   $('editToggle').hidden=!bookCanEdit();
   $('memberTools').hidden=!bookCanEdit();
   state.admin=false;$('app').classList.remove('admin-on');$('adminPanel').hidden=true;$('addBtn').hidden=true;
   bookShowGate(false);await bookRefresh();
   if(bookCanEdit())await bookRenderMembers();
 }catch(e){bookShowGate(true);uiAuthStatus('Impossible d’ouvrir le book : '+e.message,true);}
}
async function bookLogin(ev){
 ev.preventDefault();if(!bookClient)return;
 const email=$('authEmail').value.trim().toLowerCase(),password=$('authPassword').value;
 if(password.length<8)return uiAuthStatus('Minimum 8 caractères pour le mot de passe.',true);
 uiAuthStatus('Vérification du compte…');
 const first=$('authFirstTime').checked;
 try{
  const {data,error}=first?await bookClient.auth.signUp({email,password,options:{emailRedirectTo:location.origin+location.pathname}}):await bookClient.auth.signInWithPassword({email,password});
  if(error)throw error;
  if(first){
   if(data?.session)await bookActivate();
   else uiAuthStatus('Compte créé. Ouvrez votre messagerie pour confirmer votre adresse, puis connectez-vous.');
  }else await bookActivate();
 }catch(e){uiAuthStatus('Connexion refusée : '+e.message,true);}
}
async function bookForgotPassword(){
 if(!bookClient)return;
 const email=$('authEmail').value.trim().toLowerCase();if(!email)return uiAuthStatus('Saisissez d’abord votre adresse e-mail.',true);
 const {error}=await bookClient.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});
 uiAuthStatus(error?'Envoi impossible : '+error.message:'Si l’adresse possède un compte, un lien de réinitialisation vient de lui être envoyé.',!!error);
}
async function bookLogout(){
 await bookClient?.auth.signOut();bookRole=null;bookEmail='';bookSessionUserId='';products=[];state.admin=false;$('adminPanel').hidden=true;$('printArea').innerHTML='';render();bookShowGate(true);uiAuthStatus('Vous êtes déconnecté.');
}
async function bookInit(){
 bookShowGate(true);uiAuthStatus('Connexion au catalogue sécurisé…');
 try{
  if(!BOOK_CFG.url||!BOOK_CFG.publishableKey)throw new Error('Configuration sécurisée manquante');
  if(!window.supabase?.createClient){
   await new Promise((resolve,reject)=>{const js=document.createElement('script');js.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/dist/umd/supabase.min.js';js.onload=resolve;js.onerror=()=>reject(new Error('Service de connexion indisponible'));document.head.append(js);});
  }
  bookClient=window.supabase.createClient(BOOK_CFG.url,BOOK_CFG.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  bookClient.auth.onAuthStateChange((event,session)=>{
   if(event==='SIGNED_OUT'){bookRole=null;products=[];state.admin=false;$('adminPanel').hidden=true;$('printArea').innerHTML='';render();bookShowGate(true);}
   if(event==='PASSWORD_RECOVERY'){setTimeout(()=>{const p=prompt('Définissez votre nouveau mot de passe (8 caractères minimum) :');if(p&&p.length>=8)bookClient.auth.updateUser({password:p}).then(({error})=>uiAuthStatus(error?'Réinitialisation impossible : '+error.message:'Mot de passe mis à jour. Vous pouvez vous connecter.',!!error));},0);}
  });
  const {data:{session},error}=await bookClient.auth.getSession();if(error)throw error;
  if(session)await bookActivate();else uiAuthStatus('Première connexion : cochez la case pour définir votre mot de passe, puis confirmez votre adresse e-mail.');
 }catch(e){uiAuthStatus('Connexion sécurisée indisponible : '+e.message,true);}
}
$('authForm').addEventListener('submit',bookLogin);
$('forgotPassword').addEventListener('click',bookForgotPassword);
$('logoutBtn').addEventListener('click',bookLogout);
$('addMemberForm').addEventListener('submit',bookAuthorizeMember);
$('memberList').addEventListener('click',e=>{const btn=e.target.closest('[data-remove-member]');if(btn)void bookRevokeMember(btn.dataset.removeMember);});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&bookRole)void bookRefresh();});
void bookInit();