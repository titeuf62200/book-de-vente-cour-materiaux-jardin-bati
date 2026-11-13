/* Gestion des sous-familles : suppression réversible et réaffectation sécurisée. */
'use strict';
let deletingSector=null;
let sectorTransferBusy=false;

function sectorProducts(rayon,code){
 return sortProductsAlphabetically(products.filter(p=>p.rayon===rayon&&productSectorKey(p)===code));
}
function renderSectorDeletion(){
 if(!deletingSector)return;
 const {rayon,code}=deletingSector,d=officialSector(rayon,code),items=sectorProducts(rayon,code);
 if(!d)return;
 $('sectorDeleteTitle').textContent='Supprimer · '+d.displayCode+' — '+d.name;
 $('sectorDeleteMessage').textContent=items.length
  ?'Suppression bloquée : '+items.length+' référence(s) encore associée(s), y compris les archivées. Sélectionnez-les et réaffectez-les jusqu’à obtenir zéro.'
  :'Cette sous-famille ne contient plus aucune référence. Vous pouvez la retirer du Book.';
 $('sectorDeleteCount').textContent=items.length+' référence(s) à réaffecter';
 $('sectorDeleteProducts').innerHTML=items.length?items.map(p=>
  '<label class="sector-transfer-item"><input type="checkbox" data-transfer-ref="'+escapeHtml(p.reference)+'" value="'+escapeHtml(p.reference)+'"><span><strong>'+escapeHtml(p.designation)+'</strong><small>Réf. '+escapeHtml(p.reference)+(p.ean?' · EAN '+escapeHtml(p.ean):'')+(p.archived?' · ARCHIVÉE':'')+'</small></span></label>'
 ).join(''):'<p class="sector-transfer-empty">✓ Aucune référence restante.</p>';
 const target=$('sectorTransferDestination'),previous=target.value;
 target.innerHTML='<option value="">Choisir une sous-famille de destination…</option>'+UNIVERSES.map(r=>{
  const choices=sectorList(r,[],true).filter(x=>!(r===rayon&&x.code===code)&&x.code!=='UNASSIGNED');
  return '<optgroup label="'+escapeHtml(r)+'">'+choices.map(x=>'<option value="'+escapeHtml(r+'::'+x.code)+'">'+escapeHtml(x.displayCode+' — '+x.name)+'</option>').join('')+'</optgroup>';
 }).join('');
 target.value=Array.from(target.options).some(o=>o.value===previous)?previous:'';
 $('sectorDeleteConfirm').disabled=items.length>0||sectorTransferBusy;
 $('sectorTransferAll').checked=false;
 $('sectorTransferAll').disabled=!items.length||sectorTransferBusy;
 $('sectorDeleteStatus').textContent='';
 updateSectorTransferSelection();
}
function updateSectorTransferSelection(){
 const checks=Array.from($('sectorDeleteProducts').querySelectorAll('input[data-transfer-ref]'));
 const chosen=checks.filter(c=>c.checked).length;
 $('sectorTransferSelected').textContent=chosen+' sélectionnée(s)';
 $('sectorTransferAll').checked=checks.length>0&&chosen===checks.length;
 $('sectorTransferAll').indeterminate=chosen>0&&chosen<checks.length;
 $('sectorTransferBtn').disabled=!chosen||!$('sectorTransferDestination').value||sectorTransferBusy;
 $('sectorTransferBtn').textContent=chosen?'Transférer '+chosen+' référence(s)':'Transférer la sélection';
}
async function openSectorDeletion(rayon,code){
 if(typeof bookCanEdit!=='function'||!bookCanEdit())return toast('Accès administrateur requis.');
 if(!await bookRefresh())return toast('Impossible de vérifier la liste des produits. Réessayez.');
 const d=officialSector(rayon,code);if(!d||d.hidden)return;
 deletingSector={rayon,code};
 renderSectorDeletion();
 $('sectorDeleteDialog').showModal();
}
async function transferSectorSelection(){
 if(!deletingSector||sectorTransferBusy||!bookCanEdit())return;
 const refs=Array.from($('sectorDeleteProducts').querySelectorAll('input[data-transfer-ref]:checked')).map(x=>x.value);
 const dest=$('sectorTransferDestination').value.split('::');
 const target=dest.length===2?officialSector(dest[0],dest[1]):null;
 if(!refs.length||!target||target.hidden)return;
 const {rayon,code}=deletingSector;
 sectorTransferBusy=true;$('sectorTransferBtn').disabled=true;
 $('sectorDeleteConfirm').disabled=true;
 $('sectorDeleteStatus').textContent='Transfert en cours…';
 try{
  const moved=await bookReassignSectorProducts(rayon,code,dest[0],dest[1],target.name,refs);
  if(!await bookRefresh())throw new Error('Transfert enregistré, mais actualisation impossible. Cliquez sur Actualiser.');
  renderSectorDeletion();
  $('sectorDeleteStatus').textContent='✓ '+moved+' référence(s) transférée(s).';
 }catch(e){
  await bookRefresh();
  renderSectorDeletion();
  $('sectorDeleteStatus').textContent='Transfert non confirmé : '+e.message;
 }finally{
  sectorTransferBusy=false;updateSectorTransferSelection();
  if(deletingSector)$('sectorDeleteConfirm').disabled=sectorProducts(rayon,code).length>0;
 }
}
async function deleteEmptySector(){
 if(!deletingSector||sectorTransferBusy||!bookCanEdit())return;
 const {rayon,code}=deletingSector,d=officialSector(rayon,code);
 if(!d||sectorProducts(rayon,code).length){renderSectorDeletion();return;}
 if(!confirm('Retirer la sous-famille « '+d.name+' » du Book ? Elle pourra être restaurée par un administrateur.'))return;
 sectorTransferBusy=true;$('sectorDeleteConfirm').disabled=true;
 try{
  await bookSetSectorVisibility(rayon,code,true,d);
  if(state.rayon===rayon&&state.group===code)state.group='';
  $('sectorDeleteDialog').close();deletingSector=null;
  if(!await bookRefresh())throw new Error('Sous-famille retirée, mais l’actualisation a échoué.');
  toast('✓ Sous-famille retirée du Book (restauration possible).');
 }catch(e){
  if(deletingSector)$('sectorDeleteStatus').textContent='Suppression refusée : '+e.message;
  toast('Suppression refusée : '+e.message);
  if(deletingSector)await bookRefresh();
 }finally{sectorTransferBusy=false;if(deletingSector)renderSectorDeletion();}
}
async function restoreHiddenSector(rayon,code){
 if(!bookCanEdit())return;
 const d=officialSector(rayon,code);if(!d||!d.hidden)return;
 try{
  await bookSetSectorVisibility(rayon,code,false,d);
  if(!await bookRefresh())throw new Error('Restauration enregistrée, mais actualisation impossible.');
  toast('Sous-famille « '+d.name+' » restaurée.');
 }catch(e){toast('Restauration impossible : '+e.message);}
}
$('sectorDeleteCancel').addEventListener('click',()=>$('sectorDeleteDialog').close());
$('sectorDeleteDialog').addEventListener('close',()=>{deletingSector=null;});
$('sectorDeleteDialog').addEventListener('cancel',event=>{if(sectorTransferBusy)event.preventDefault();});
$('sectorDeleteProducts').addEventListener('change',updateSectorTransferSelection);
$('sectorTransferDestination').addEventListener('change',updateSectorTransferSelection);
$('sectorTransferAll').addEventListener('change',event=>{
 for(const cb of $('sectorDeleteProducts').querySelectorAll('input[data-transfer-ref]'))cb.checked=event.target.checked;
 updateSectorTransferSelection();
});
$('sectorTransferBtn').addEventListener('click',()=>void transferSectorSelection());
$('sectorDeleteConfirm').addEventListener('click',()=>void deleteEmptySector());
