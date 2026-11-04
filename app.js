import {decodeScan,combineScans,expiryISO,expiryStatus,csv,validateDispatch,dispatchRows} from './core.js';
const $=id=>document.getElementById(id),key='dhs-quickscan-local-v1';
let pendingScan=null,lastCameraRaw='',lastCameraAt=0;
let state={catalog:{},batches:{},logs:[],orders:[],draft:[]},selected=null,controls=null,starting=false,session=0,lastStored=null,storageBroken=false;
try{lastStored=localStorage.getItem(key);const saved=JSON.parse(lastStored);if(saved){if(!Array.isArray(saved.logs))throw Error();state={...state,...saved};}}catch{storageBroken=true;show('A korábbi adatokat nem sikerült betölteni. A mentés zárolva van.');}
function show(t){$('message').textContent=t;}
let scanAudio=null,feedbackTimer=null;
function enableScanAudio(){
 try{const Context=window.AudioContext||window.webkitAudioContext;if(!Context)return;
  scanAudio??=new Context();if(scanAudio.state==='suspended')scanAudio.resume().catch(()=>{});
 }catch{}
}
function scanFeedback(complete){
 const indicator=$('scanFeedback');if(indicator){
  indicator.textContent=complete?'✓ Sikeres beolvasás':'✓ Kód felismerve – további adat szükséges';
  indicator.classList.remove('flash');void indicator.offsetWidth;indicator.classList.add('flash');
  clearTimeout(feedbackTimer);feedbackTimer=setTimeout(()=>indicator.classList.remove('flash'),1100);
 }
 if(navigator.vibrate)try{navigator.vibrate(complete?75:35);}catch{}
 try{if(!scanAudio||scanAudio.state!=='running')return;
  const osc=scanAudio.createOscillator(),gain=scanAudio.createGain(),now=scanAudio.currentTime;
  osc.type='square';osc.frequency.value=complete?1750:1250;
  gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.075,now+.006);
  gain.gain.exponentialRampToValueAtTime(.0001,now+.095);
  osc.connect(gain);gain.connect(scanAudio.destination);osc.start(now);osc.stop(now+.105);
 }catch{}
}
document.addEventListener('pointerdown',enableScanAudio,{passive:true});

function save(next){try{if(storageBroken)throw Error();if(localStorage.getItem(key)!==lastStored){show('Másik ablak módosította az adatokat. Töltsd újra az appot.');return false;}const data=JSON.stringify(next);localStorage.setItem(key,data);lastStored=data;state=next;render();return true;}catch{show('Nem sikerült menteni. A művelet nem lett rögzítve.');return false;}}
function text(tag,value){const el=document.createElement(tag);el.textContent=value;return el;}
function itemDescription(i){return [i.name||i.gtin,`${i.qty} db`,'LOT: '+i.lot,'Lejárat: '+expiryISO(i.expiry),i.serial?'SN: '+i.serial:''].filter(Boolean).join(' · ');}
let mailBusy=false;
function render(){
 $('count').textContent=state.orders.length;$('cartCount').textContent=state.draft.reduce((n,i)=>n+i.qty,0);$('cartEntries').replaceChildren();
 if(!state.draft.length)$('cartEntries').append(text('p','Még nincs hozzáadott termék. Olvasd be a kivinni kívánt termékeket.'));
 state.draft.forEach((i,index)=>{const row=text('div','');row.className='entry';row.append(text('p',itemDescription(i)));const info=expiryStatus(i.expiry);if(info.status!=='valid'){const warning=text('p',info.status==='expired'?'LEJÁRT – nem vihető ki':`KÖZELI LEJÁRAT – ${info.days} nap`);warning.className='expiry '+(info.status==='expired'?'danger':'warning');row.append(warning);}const remove=text('button','Eltávolítás');remove.type='button';remove.onclick=()=>{if(save({...state,draft:state.draft.filter((_,n)=>n!==index)})){$('nearConfirm').checked=false;$('confirm').checked=false;}};row.append(remove);$('cartEntries').append(row);});
 $('entries').replaceChildren();if(!state.orders.length)$('entries').append(text('p','Még nincs véglegesített kivitel.'));
 for(const order of state.orders){const row=text('div','');row.className='entry';row.append(text('h3',`${order.sales} → ${order.partner}`),text('p',`${new Date(order.time).toLocaleString('hu-HU')} · ${order.id}`),text('p',order.note||''));for(const i of order.items)row.append(text('p',itemDescription(i)));const exportButton=text('button','Kivitel CSV letöltése');exportButton.onclick=()=>exportOrder(order);const shareButton=text('button','Megosztás / e-mail');shareButton.onclick=()=>shareOrder(order);row.append(exportButton,shareButton);const mailStatus=text('p',emailLabel(order));row.append(mailStatus);if(['pending','error'].includes(order.email?.status)){const retry=text('button','E-mail küldés újrapróbálása');retry.onclick=()=>sendOrderMail(order.id);row.append(retry);}$('entries').append(row);}
 if(state.logs.length){const details=document.createElement('details');details.append(text('summary','Beolvasási és korábbi napló ('+state.logs.length+')'));for(const r of state.logs){const row=text('div','');row.className='entry';row.append(text('p',[r.time,r.event,r.name,r.sales,r.partner,r.note].filter(Boolean).join(' · ')),text('pre',r.raw||r.gtin||''));details.append(row);}$('entries').append(details);}
 updateCart();
}
function exportOrder(order){download(new Blob([csv(dispatchRows(order))],{type:'text/csv;charset=utf-8'}),'DHS-kivitel-'+order.id+'.csv');}
async function shareOrder(order){const file=new File([csv(dispatchRows(order))],'DHS-kivitel-'+order.id+'.csv',{type:'text/csv'});try{if(navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:'DHS raktári kivitel',text:`${order.sales} → ${order.partner} · ${order.id}`});}else{exportOrder(order);show('CSV letöltve. A Fájlok / Megosztás menüből e-mailhez csatolhatod.');}}catch(e){if(e.name!=='AbortError')show('Megosztás nem sikerült. Használd a CSV letöltése gombot.');}}
function currentItem(){const date=$('manualExpiry').value;if(!/^20\d{2}-\d{2}-\d{2}$/.test(date))throw Error('Add meg a csomagoláson szereplő lejáratot.');return {...selected,name:$('itemName').value.trim(),lot:$('manualLot').value.trim(),expiry:date.slice(2).replaceAll('-',''),qty:Number($('qty').value)};}
function identify(raw,source){if(/^DHS-MAIL-PAIR:[a-f0-9]{64}$/.test(raw)){selected=null;$('code').value='';if(window.confirm('Párosítod ezt a telefont a DHS automatikus e-mail-küldéséhez?'))pairDevice(raw.slice(14));return;}try{const code=decodeScan(raw);
 if(code.parsed){try{pendingScan=combineScans(pendingScan,code);}catch(e){show(e.message+' Indíts új beolvasást a Következő beolvasás gombbal.');return false;}}
 selected={...(code.parsed?pendingScan:code),source};$('result').hidden=false;$('fields').replaceChildren();for(const [label,value] of Object.entries({'GTIN':selected.gtin||'—','LOT':selected.lot||'—','Lejárat':selected.expiry?expiryISO(selected.expiry):'—','Sorozatszám':selected.serial||'—','Nyers kód':selected.raw})){$('fields').append(text('dt',label),text('dd',value));}$('productName').textContent=state.catalog[selected.gtin]?.name||'Beolvasott termék';$('itemName').value=state.catalog[selected.gtin]?.name||'';$('manualLot').value=selected.lot;$('manualLot').readOnly=!!selected.lot;$('manualExpiry').value=selected.expiry?expiryISO(selected.expiry):'';$('manualExpiry').readOnly=!!selected.expiry;$('qty').value=1;$('qty').readOnly=!!selected.serial;$('productSetup').hidden=!selected.parsed;updateExpiry();scanFeedback(!!(selected.gtin&&selected.lot&&selected.expiry));save({...state,logs:[{...code,source,time:new Date().toISOString(),event:'Beolvasás'},...state.logs]});if(source!=='kamera'||(selected.gtin&&selected.lot&&selected.expiry))$('result').scrollIntoView({behavior:'smooth',block:'start'});}catch(e){selected=null;show(e.message);return false;}return !!selected?.parsed;}
function updateExpiry(){if(!selected)return;let info;try{info=expiryStatus(currentItem().expiry);}catch{}$('addItem').disabled=!selected.parsed||!selected.gtin||!info||info.status==='expired'||!$('manualLot').value.trim();$('expiryStatus').className='expiry '+(!info||info.status==='expired'?'danger':info.status==='near'?'warning':'');$('expiryStatus').textContent=selected.parsed&&!selected.gtin?'LOT és lejárat felismerve. Olvasd be a GTIN vonalkódot is.':!selected.parsed?'A nyers kód elmentve; nem értelmezhető termékkódként. Kivitelhez ellenőrzött termékadat szükséges.':!info?'Hiányzó vagy hibás lejárat – egészítsd ki a csomagolásról.':info.status==='expired'?'LEJÁRT – kivitel tiltva.':info.status==='near'?`KÖZELI LEJÁRAT – ${info.days} nap. Véglegesítéskor külön jóváhagyás kell.`:`Érvényes lejárat: ${info.expiry}`;}
function updateCart(){let near=false,blocked=!state.draft.length;for(const item of state.draft){try{const info=expiryStatus(item.expiry);near||=info.status==='near';blocked||=info.status==='expired';}catch{blocked=true;}}$('nearWarning').hidden=!near;$('nearConfirm').required=near;$('issueButton').disabled=blocked;}
function addSelected(){if(!selected?.parsed||!selected.gtin)throw Error('A kivitelhez GTIN is szükséges. Olvasd be a másik kódot.');const item=currentItem();validateDispatch([item],'ellenőrzés','ellenőrzés',new Date(),{general:true,nearExpiry:true});const draft=state.draft.map(i=>({...i}));if(item.serial&&draft.some(i=>i.gtin===item.gtin&&i.serial===item.serial))throw Error('Ez a sorozatszámos termék már a kivitelben van.');const same=draft.find(i=>!i.serial&&!item.serial&&i.raw===item.raw&&i.gtin===item.gtin&&i.lot===item.lot&&i.expiry===item.expiry&&i.name===item.name);if(same)same.qty+=item.qty;else draft.push(item);const catalog=item.name?{...state.catalog,[item.gtin]:{name:item.name}}:state.catalog;if(save({...state,catalog,draft})){pendingScan=null;$('nearConfirm').checked=false;$('confirm').checked=false;selected=null;$('result').hidden=true;show(`Hozzáadva. A kivitelben ${draft.reduce((n,i)=>n+i.qty,0)} db termék van. Olvasd be a következőt, vagy nyisd meg a Kivitel oldalt.`);$('start').scrollIntoView({behavior:'smooth'});}}
$('addItem').onclick=()=>{try{addSelected();}catch(e){show(e.message);}};
for(const id of ['manualExpiry','manualLot','qty'])$(id).oninput=updateExpiry;
for(const id of ['sales','partner']){$(id).oninput=()=>{$('nearConfirm').checked=false;$('confirm').checked=false;};$(id).onchange=$(id).oninput;}
$('withdraw').onsubmit=e=>{e.preventDefault();try{const now=new Date(),sales=$('sales').value,partner=$('partner').value.trim(),result=validateDispatch(state.draft,sales,partner,now,{general:$('confirm').checked,nearExpiry:$('nearConfirm').checked});const order={id:crypto.randomUUID(),time:now.toISOString(),sales,partner,note:$('note').value.trim(),nearApproved:result.near,email:{status:'pending'},items:state.draft.map(i=>({...i}))};if(save({...state,orders:[order,...state.orders],draft:[]})){$('withdraw').reset();selected=null;$('result').hidden=true;openTab('log');show(`Kivitel rögzítve: ${result.total} db · ${sales} → ${partner}. Az e-mail küldése külön állapotjelzést kap.`);sendOrderMail(order.id);}}catch(e){updateCart();show(e.message);}};
$('nextScan').onclick=()=>{pendingScan=null;selected=null;$('result').hidden=true;$('code').value='';$('start').scrollIntoView({behavior:'smooth'});};
window.addEventListener('focus',()=>{updateExpiry();updateCart();});setInterval(()=>{updateExpiry();updateCart();},30000);
async function readImageCodes(url){
 const reader=new ZXingBrowser.BrowserMultiFormatReader(new Map([[3,true],[8,true]]));
 const image=new Image();image.src=url;await image.decode();
 const w=image.naturalWidth,h=image.naturalHeight;
 const found=new Map();
 async function scan(x,y,cw,ch){
  const canvas=document.createElement('canvas');
  const scale=Math.min(1,1600/Math.max(cw,ch));
  canvas.width=Math.max(1,Math.round(cw*scale));canvas.height=Math.max(1,Math.round(ch*scale));
  canvas.getContext('2d').drawImage(image,x,y,cw,ch,0,0,canvas.width,canvas.height);
  try{const result=await reader.decodeFromImageUrl(canvas.toDataURL('image/png'));const raw=result.getText();if(raw)found.set(raw,raw);}catch{}
 }
 await scan(0,0,w,h);
 // GS1 labels frequently contain two stacked barcodes. Scan overlapping horizontal
 // bands separately, so a decoder that returns only one result cannot hide the other.
 for(const [top,height] of [[0,.52],[.35,.5],[.48,.52],[0,.7],[.3,.7]]){
  await scan(0,Math.floor(h*top),w,Math.min(h-Math.floor(h*top),Math.ceil(h*height)));
 }
 if(!found.size){
  const side=Math.min(w,h);
  for(let i=0;i<=8&&!found.size;i++){
   const x=w>h?(w-side)*i/8:0,y=h>w?(h-side)*i/8:0;
   await scan(x,y,side,side);
  }
 }
 if(!found.size)throw Error('Nem olvasható képkód.');
 return [...found.values()];
}
let imageSession=0;
$('imageFile').onchange=async e=>{
 const file=e.target.files?.[0];if(!file)return;
 stop();const token=++imageSession;
 if(file.size>25*1024*1024){show('Legfeljebb 25 MB méretű képet válassz.');e.target.value='';return;}
 if(!window.ZXingBrowser){show('A kódolvasó nem töltődött be.');e.target.value='';return;}
 const url=URL.createObjectURL(file);show('Kód keresése a képen…');
 try{const codes=await readImageCodes(url);if(token!==imageSession)return;for(const raw of codes){if(token!==imageSession)return;$('code').value=raw;identify(raw,'kép');}}
 catch{if(token===imageSession)show('Nem sikerült kódot olvasni ebből a képből. Vágd körbe a kódot kis fehér szegéllyel, válassz élesebb JPG/PNG képet, vagy használd a kézi bevitelt.');}
 finally{URL.revokeObjectURL(url);e.target.value='';}
};
$('manual').onsubmit=e=>{e.preventDefault();imageSession++;identify($('code').value,'kézi bevitel');};
function stop(){session++;lastCameraRaw='';lastCameraAt=0;if(controls)controls.stop();controls=null;const stream=$('video').srcObject;if(stream)stream.getTracks().forEach(t=>t.stop());$('video').srcObject=null;$('start').disabled=false;$('stop').disabled=true;$('cameraHint').hidden=false;$('cameraStatus').textContent='A kamera leállítva.';}
$('stop').onclick=stop;
$('start').onclick=async()=>{imageSession++;if(starting||controls)return;if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia){show('A kamerához HTTPS és támogatott böngésző szükséges. Használd a kézi bevitelt.');return;}if(!window.ZXingBrowser){show('A kameraolvasó nem töltődött be. Töltsd újra az oldalt, vagy használd a kézi bevitelt.');return;}starting=true;const current=++session;$('start').disabled=true;$('stop').disabled=false;$('cameraStatus').textContent='Kamera indítása…';try{const reader=new ZXingBrowser.BrowserMultiFormatReader(new Map([[3,true],[8,true]]));const c=await reader.decodeFromConstraints({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}}},$('video'),(result)=>{if(result&&session===current){const raw=result.getText(),now=Date.now();if(raw===lastCameraRaw&&now-lastCameraAt<1800)return;lastCameraRaw=raw;lastCameraAt=now;$('code').value=raw;const ok=identify(raw,'kamera');if(ok&&selected?.gtin&&selected.lot&&selected.expiry){stop();try{addSelected();}catch(e){show(e.message);}}else if(ok){$('cameraStatus').textContent='Részadat felismerve. Olvasd be a másik vonalkódot is.';}}});if(session!==current)c.stop();else{controls=c;$('cameraHint').hidden=true;$('cameraStatus').textContent='Kamera aktív. Tartsd a kódot élesen a kép közepén.';}}catch(e){stop();show(e.name==='NotAllowedError'?'A kameraengedély nincs megadva. Engedélyezd a böngésző beállításaiban, vagy írj be kódot.':'Nem sikerült elindítani a kamerát. Zárd be a kamerát használó más appokat, vagy használd a kézi bevitelt.');}finally{starting=false;}};
window.addEventListener('pagehide',stop);document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>openTab(b.dataset.tab));
function openTab(tab){stop();document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));for(const id of ['scan','cart','log','help'])$(id).hidden=id!==tab;updateCart();}
$('export').onclick=()=>{download(new Blob([csv((state.orders||[]).flatMap(dispatchRows))],{type:'text/csv;charset=utf-8'}),'DHS-kivitelek.csv');};
$('backup').onclick=()=>{download(new Blob([JSON.stringify({format:'DHS-QuickScan',version:2,exportedAt:new Date().toISOString(),...state},null,2)],{type:'application/json'}),'DHS-teljes-mentes.json');};
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
function connection(){$('connection').textContent=navigator.onLine?'● Online':'○ Offline';}window.addEventListener('online',connection);window.addEventListener('offline',connection);connection();render();
if('serviceWorker'in navigator){navigator.serviceWorker.register('./sw.js').then(async()=>{await navigator.serviceWorker.ready;$('offlineReady').textContent='Offline használatra kész';}).catch(()=>{$('offlineReady').textContent='Offline gyorsítótár nem érhető el';});}else $('offlineReady').textContent='Offline mód nem támogatott';

function emailLabel(order){const status=order.email?.status;return status==='sent'?'E-mail elküldve: mr.marlyin@gmail.com':status==='sending'?'E-mail küldése folyamatban…':status==='unknown'?'E-mail: a küldés eredménye ellenőrizendő. Az automatikus újraküldés szünetel a duplázás elkerülésére.':status==='error'?'E-mail nem ment el. Kézzel újrapróbálható.':status==='pending'?'E-mail küldésre vár (internet és Gmail-összekapcsolás szükséges).':'Korábbi kivitel: automatikus e-mail nem lett kérve.';}
function updateEmail(id,email){return save({...state,orders:state.orders.map(order=>order.id===id?{...order,email}:order)});}
async function sendOrderMail(id){
 if(mailBusy||!navigator.onLine)return;
 const deviceKey=localStorage.getItem('dhs-mail-device-key');if(!deviceKey){$('emailSetupStatus').textContent='A küldés még nincs bekapcsolva. Szerveroldali Gmail-engedélyezés és a telefon párosítása szükséges.';return;}
 const order=state.orders.find(o=>o.id===id);if(!order||!['pending','error'].includes(order.email?.status))return;
 mailBusy=true;
 if(!updateEmail(id,{status:'sending'})){mailBusy=false;return;}
 try{
  const response=await fetch('/.netlify/functions/send-dispatch',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+deviceKey},body:JSON.stringify(order),signal:AbortSignal.timeout(35000)});
  let result;try{result=await response.json();}catch{result={code:'send_unknown'};}
  if(response.ok&&result.status==='sent')updateEmail(id,{status:'sent',messageId:result.messageId,time:new Date().toISOString()});
  else if(['not_configured','unauthorized','origin','invalid_order','size','gmail_authorization','before_send_failure','gmail_rejected'].includes(result.code)){
   updateEmail(id,{status:'error',code:result.code});if(result.code==='not_configured')$('emailSetupStatus').textContent='A szerver Gmail-összekapcsolása még nincs beállítva.';
  }else updateEmail(id,{status:'unknown'});
 }catch{updateEmail(id,{status:'unknown'});}finally{mailBusy=false;}
}
async function sendPendingMail(){for(const order of state.orders.filter(o=>o.email?.status==='pending'))await sendOrderMail(order.id);}
function pairDevice(value){if(value.length<32){show('A szerverhez tartozó, legalább 32 karakteres párosítási kód szükséges.');return;}try{localStorage.setItem('dhs-mail-device-key',value);$('mailDeviceKey').value='';$('emailSetupStatus').textContent='Telefon párosítva; a függő küldéseket ellenőrizzük.';show('Telefon párosítva. Az új kivitelek adatait automatikusan elküldjük e-mailben.');sendPendingMail();}catch{show('A párosítás nem menthető ezen az eszközön.');}}
$('pairMail').onclick=()=>pairDevice($('mailDeviceKey').value.trim());
if(localStorage.getItem('dhs-mail-device-key'))$('emailSetupStatus').textContent='Ez az eszköz párosítva van az automatikus e-mail-küldéshez.';
window.addEventListener('online',sendPendingMail);
sendPendingMail();
