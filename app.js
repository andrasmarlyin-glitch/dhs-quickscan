import {products,parseCode,validateWithdrawal,expiryISO,expiryStatus,csv} from './core.js';
const $=id=>document.getElementById(id),key='warehouse-sandbox-02';let state={stock:Object.fromEntries(products.map(p=>[p.gtin,p.stock])),logs:[]},selected=null,controls=null,starting=false,session=0;
try{const saved=JSON.parse(localStorage.getItem(key));if(saved&&saved.stock&&Array.isArray(saved.logs))state=saved;}catch{show('A korábbi helyi adatok nem olvashatók. Új tesztmunkamenet indult.');}
function show(t){$('message').textContent=t;}
function save(next){try{localStorage.setItem(key,JSON.stringify(next));state=next;render();return true;}catch{show('Nem sikerült helyben menteni. A művelet nem lett rögzítve. Ellenőrizd a tárhelyet / privát böngészést.');return false;}}
function log(event,data={}){return save({...state,logs:[{time:new Date().toISOString(),event,...data},...state.logs]});}
function render(){ $('count').textContent=state.logs.length; $('entries').replaceChildren();if(!state.logs.length)$('entries').textContent='Még nincs tesztesemény. Olvass be egy tesztkódot!';for(const r of state.logs){const el=document.createElement('div');el.className='entry';const title=document.createElement('b');title.textContent=r.event;const time=document.createElement('small');time.textContent=new Date(r.time).toLocaleString('hu-HU');const p=document.createElement('p');p.textContent=[r.name,r.qty?`${r.qty} db`:'',r.sales,r.partner,r.gtin,r.lot,r.expiry?expiryISO(r.expiry):'',r.note].filter(Boolean).join(' · ');el.append(time,document.createElement('br'),title,p);$('entries').append(el);}}
function identify(raw,source){try{const code=parseCode(raw),p=products.find(p=>p.gtin===code.gtin);if(!p){selected=null;$('result').hidden=false;$('withdraw').hidden=true;$('productName').textContent='Beolvasott kód – nincs a helyi katalógusban';$('fields').replaceChildren();for(const [label,value] of Object.entries({'GTIN':code.gtin,'LOT':code.lot||'—','Lejárat':code.expiry?expiryISO(code.expiry):'—','Gyártás':code.production?expiryISO(code.production):'—','Sorozatszám':code.serial||'—','Belső adat (91)':code.internal91||'—'})){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;$('fields').append(dt,dd);}const unknownInfo=code.expiry?expiryStatus(code.expiry):null;$('expiryStatus').className='expiry '+(!unknownInfo||unknownInfo.status==='expired'?'danger':unknownInfo.status==='near'?'warning':'');$('expiryStatus').textContent=(unknownInfo?.status==='expired'?'LEJÁRT · ':unknownInfo?.status==='near'?`KÖZELI LEJÁRAT · ${unknownInfo.days} nap van hátra. `:!unknownInfo?'Hiányzó lejárat · ':'')+'Csak kódolvasás. A terméknév és a készlet nincs ellenőrizve; raktári kivétel nem végezhető.';show('Kód beolvasva. Az adatok nem kerültek a tesztnaplóba.');return;}$('withdraw').hidden=false;selected={...p,...code};$('productName').textContent=p.name;$('fields').replaceChildren();for(const [label,value] of Object.entries({'GTIN':code.gtin,'LOT':code.lot||'—','Lejárat':code.expiry||'—','Sorozatszám':code.serial||'—','Tesztkészlet':state.stock[p.gtin]+' db'})){let dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;$('fields').append(dt,dd);}$('result').hidden=false;$('confirm').checked=false;$('nearConfirm').checked=false;$('manualLot').value=code.lot;$('manualLot').readOnly=!!code.lot;$('manualExpiry').value=code.expiry?expiryISO(code.expiry):'';$('manualExpiry').readOnly=!!code.expiry;$('manualFields').hidden=!!(code.lot&&code.expiry);updateExpiry();log('Azonosítás – '+source,selected);show('Teszttermék azonosítva. Ellenőrizd a lejárati jelzést.');}catch(e){selected=null;$('result').hidden=true;show(e.message);}}
function effectiveExpiry(){return selected?.expiry||$('manualExpiry').value.slice(2).replaceAll('-','');}
function updateExpiry(){
 if(!selected)return;
 let info;try{info=expiryStatus(effectiveExpiry());}catch{}
 const near=info?.status==='near';
 $('nearWarning').hidden=!near;$('nearConfirm').required=near;
 if(!near)$('nearConfirm').checked=false;
 const missingLot=!(selected.lot||$('manualLot').value.trim());
 $('issueButton').disabled=!info||info.status==='expired'||missingLot;
 $('expiryStatus').className='expiry '+(!info||info.status==='expired'?'danger':near?'warning':'');
 $('expiryStatus').textContent=!info?'Hiányzó vagy hibás lejárat · A kiadás tiltva.':info.status==='expired'?`LEJÁRT · ${info.expiry} · A kiadás tiltva.`:near?`KÖZELI LEJÁRAT · ${info.expiry} · ${info.days} nap van hátra. Külön megerősítés szükséges.`:`Érvényes lejárat · ${info.expiry} · ${info.days} nap van hátra.`;
 if(missingLot)$('expiryStatus').textContent+=' A LOT megadása kötelező.';
}
for(const id of ['manualExpiry','manualLot'])$(id).oninput=()=>{$('nearConfirm').checked=false;updateExpiry();};
$('partner').oninput=()=>{$('nearConfirm').checked=false;};
for(const id of ['sales','qty'])$(id).oninput=()=>{$('nearConfirm').checked=false;};
window.addEventListener('focus',updateExpiry);
setInterval(updateExpiry,30000);
async function readImageCode(url){
 const reader=new ZXingBrowser.BrowserMultiFormatReader(new Map([[3,true],[8,true]]));
 try{return await reader.decodeFromImageUrl(url);}catch{}
 const image=new Image();image.src=url;await image.decode();
 const w=image.naturalWidth,h=image.naturalHeight,side=Math.min(w,h);
 for(let i=0;i<=8;i++){
  const x=w>h?(w-side)*i/8:0,y=h>w?(h-side)*i/8:0;
  const canvas=document.createElement('canvas');canvas.width=canvas.height=Math.min(side,1200);
  canvas.getContext('2d').drawImage(image,x,y,side,side,0,0,canvas.width,canvas.height);
  try{return await reader.decodeFromImageUrl(canvas.toDataURL('image/png'));}catch{}
 }
 throw Error('Nem olvasható képkód.');
}
let imageSession=0;
$('imageFile').onchange=async e=>{
 const file=e.target.files?.[0];if(!file)return;
 stop();const token=++imageSession;$('result').hidden=true;selected=null;
 if(file.size>25*1024*1024){show('Legfeljebb 25 MB méretű képet válassz.');e.target.value='';return;}
 if(!window.ZXingBrowser){show('A kódolvasó nem töltődött be.');e.target.value='';return;}
 const url=URL.createObjectURL(file);show('Kód keresése a képen…');
 try{const result=await readImageCode(url);if(token!==imageSession)return;$('code').value=result.getText();identify(result.getText(),'kép');}
 catch{if(token===imageSession)show('Nem sikerült kódot olvasni ebből a képből. Vágd körbe a kódot kis fehér szegéllyel, válassz élesebb JPG/PNG képet, vagy használd a kézi bevitelt.');}
 finally{URL.revokeObjectURL(url);e.target.value='';}
};
$('manual').onsubmit=e=>{e.preventDefault();imageSession++;identify($('code').value,'kézi bevitel');};
$('sample').onclick=()=>{$('code').value='(01)05901234567893(17)291231(10)DEMO-LOT-01(21)TESZT0001';identify($('code').value,'tesztgomb');};
$('sampleExpired').onclick=()=>{identify('(01)05901234567893(17)200101(10)LEJART-TESZT','lejárt tesztgomb');};
$('sample2').onclick=()=>{$('code').value='4012345678901';identify($('code').value,'tesztgomb');};
$('withdraw').onsubmit=e=>{e.preventDefault();if(!selected)return;try{const qty=Number($('qty').value),sales=$('sales').value.trim(),partner=$('partner').value.trim();if(!sales||!partner)throw Error('A saleses és a partner megadása kötelező.');const item={...selected};if(!item.lot)item.lot=$('manualLot').value.trim();if(!item.expiry){const date=$('manualExpiry').value;if(!/^20\d{2}-\d{2}-\d{2}$/.test(date))throw Error('Adj meg egy 2000–2099 közötti lejárati dátumot.');item.expiry=date.slice(2).replaceAll('-','');}const now=new Date(),info=expiryStatus(item.expiry,now);const stock=validateWithdrawal(item,state.stock[item.gtin],qty,now,{general:$('confirm').checked,nearExpiry:$('nearConfirm').checked});const record={time:new Date().toISOString(),event:'Saleses tesztkivétel',...item,qty,sales,partner,note:[$('note').value.trim(),info.status==='near'?`Közeli lejárat jóváhagyva: ${info.days} nap; csomagolás ellenőrizve; kiadó: ${sales}; kórház / partner: ${partner}`:''].filter(Boolean).join(' · ')};const notification={time:record.time,event:'Szimulált értesítés',note:`${sales}: ${qty} db kivétele rögzítve. E-mail nem került elküldésre.`};if(save({stock:{...state.stock,[selected.gtin]:stock},logs:[notification,record,...state.logs]})){$('result').hidden=true;selected=null;$('withdraw').reset();show('✓ Tesztkivétel elmentve ezen a készüléken. Szimulált értesítés elkészült; e-mail nem ment ki.');}}catch(e){updateExpiry();show(e.message);}};
function stop(){session++;if(controls)controls.stop();controls=null;const stream=$('video').srcObject;if(stream)stream.getTracks().forEach(t=>t.stop());$('video').srcObject=null;$('start').disabled=false;$('stop').disabled=true;$('cameraHint').hidden=false;$('cameraStatus').textContent='A kamera leállítva.';}
$('stop').onclick=stop;
$('start').onclick=async()=>{imageSession++;if(starting||controls)return;if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia){show('A kamerához HTTPS és támogatott böngésző szükséges. Használd a kézi bevitelt.');return;}if(!window.ZXingBrowser){show('A kameraolvasó nem töltődött be. Töltsd újra az oldalt, vagy használd a kézi bevitelt.');return;}starting=true;const current=++session;$('start').disabled=true;$('stop').disabled=false;$('cameraStatus').textContent='Kamera indítása…';try{const reader=new ZXingBrowser.BrowserMultiFormatReader(new Map([[3,true],[8,true]]));const c=await reader.decodeFromConstraints({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}}},$('video'),(result)=>{if(result&&session===current){$('code').value=result.getText();identify(result.getText(),'kamera');stop();}});if(session!==current)c.stop();else{controls=c;$('cameraHint').hidden=true;$('cameraStatus').textContent='Kamera aktív. Tartsd a kódot élesen a kép közepén.';}}catch(e){stop();show(e.name==='NotAllowedError'?'A kameraengedély nincs megadva. Engedélyezd a böngésző beállításaiban, vagy írj be kódot.':'Nem sikerült elindítani a kamerát. Zárd be a kamerát használó más appokat, vagy használd a kézi bevitelt.');}finally{starting=false;}};
window.addEventListener('pagehide',stop);document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{stop();document.querySelectorAll('[data-tab]').forEach(n=>n.classList.toggle('active',n===b));for(const id of ['scan','log','help'])$(id).hidden=id!==b.dataset.tab;});
$('export').onclick=()=>{const blob=new Blob([csv(state.logs)],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='Warehouse-Sandbox-tesztnaplo.csv';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);show('A CSV export elkészült. iPhone-on a megnyíló fájl a Megosztás menüből menthető.');};
$('reset').onclick=()=>{if(window.confirm('Visszaállítod a demót? A helyi tesztnapló törlődik és a tesztkészlet alaphelyzetbe kerül.')){if(save({stock:Object.fromEntries(products.map(p=>[p.gtin,p.stock])),logs:[]})){selected=null;$('result').hidden=true;show('A demó visszaállítva.');}}};
function connection(){$('connection').textContent=navigator.onLine?'● Online':'○ Offline';}window.addEventListener('online',connection);window.addEventListener('offline',connection);connection();render();
if('serviceWorker'in navigator){navigator.serviceWorker.register('./sw.js').then(async()=>{await navigator.serviceWorker.ready;$('offlineReady').textContent='Offline használatra kész';}).catch(()=>{$('offlineReady').textContent='Offline gyorsítótár nem érhető el';});}else $('offlineReady').textContent='Offline mód nem támogatott';
