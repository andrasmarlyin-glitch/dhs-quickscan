import {decodeScan,validateBatch,batchId,validateWithdrawal,expiryISO,expiryStatus,csv} from './core.js';
const $=id=>document.getElementById(id),key='dhs-quickscan-local-v1';
let storageBroken=false,lastStored=null;let state={catalog:{},batches:{},logs:[]},selected=null,controls=null,starting=false,session=0;
try{lastStored=localStorage.getItem(key);const saved=JSON.parse(lastStored);if(saved){if(!saved.catalog||!saved.batches||!Array.isArray(saved.logs))throw Error('Hibás mentés');state=saved;}}catch{storageBroken=true;show('A helyi adatokat nem sikerült betölteni. Ne rögzíts új műveletet, amíg a korábbi mentést nem ellenőrizted.');}
function show(t){$('message').textContent=t;}
function save(next){try{if(storageBroken)throw Error('Hibás korábbi mentés');if(localStorage.getItem(key)!==lastStored){show('Egy másik ablak módosította az adatokat. Töltsd újra az alkalmazást a folytatáshoz.');return false;}const stored=JSON.stringify(next);localStorage.setItem(key,stored);lastStored=stored;state=next;render();return true;}catch{show('Nem sikerült menteni. A művelet nem lett rögzítve. Ellenőrizd a telefon tárhelyét.');return false;}}
function render(){
 $('count').textContent=state.logs.length;$('entries').replaceChildren();
 if(!state.logs.length)$('entries').textContent='Még nincs beolvasás. Indítsd el a kamerát vagy válassz képet.';
 for(const r of state.logs){const el=document.createElement('div');el.className='entry';const title=document.createElement('b');title.textContent=r.event;const time=document.createElement('small');time.textContent=new Date(r.time).toLocaleString('hu-HU');const p=document.createElement('p');p.textContent=[r.name,Number.isInteger(r.qty)?`${r.qty} db`:'',r.sales,r.partner,r.gtin,r.lot,r.expiry?expiryISO(r.expiry):'',r.note,r.parseError].filter(Boolean).join(' · ');el.append(time,document.createElement('br'),title,p);if(r.raw){const raw=document.createElement('pre');raw.textContent=r.raw;el.append(raw);}$('entries').append(el);}
 $('inventoryEntries').replaceChildren();
 if(!Object.keys(state.batches).length)$('inventoryEntries').textContent='Nincs rögzített tétel. Beolvasás után add meg a tényleges készletet.';
 for(const b of Object.values(state.batches)){const el=document.createElement('div'),info=expiryStatus(b.expiry);el.className='entry';const title=document.createElement('b');title.textContent=b.name;const p=document.createElement('p');p.textContent=`${b.stock} db · LOT: ${b.lot} · ${info.expiry} · ${info.status==='expired'?'LEJÁRT':info.status==='near'?`KÖZELI LEJÁRAT (${info.days} nap)`:`${info.days} nap`} · GTIN: ${b.gtin}`;el.append(title,p);$('inventoryEntries').append(el);}
}
function currentItem(){
 const date=$('manualExpiry').value;
 if(!/^20\d{2}-\d{2}-\d{2}$/.test(date))throw Error('Adj meg egy 2000–2099 közötti lejárati dátumot.');
 return {...selected,name:$('itemName').value.trim(),lot:$('manualLot').value.trim(),expiry:date.slice(2).replaceAll('-','')};
}
function identify(raw,source){try{
 const code=decodeScan(raw);selected={...code,source};$('result').hidden=false;$('withdraw').reset();
 $('fields').replaceChildren();
 for(const [label,value] of Object.entries({'GTIN':code.gtin||'—','LOT':code.lot||'—','Lejárat':code.expiry?expiryISO(code.expiry):'—','Gyártás':code.production?expiryISO(code.production):'—','Sorozatszám':code.serial||'—','Belső adat (91)':code.internal91||'—','Nyers kód':raw})){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;$('fields').append(dt,dd);}
 $('productName').textContent=code.gtin?(state.catalog[code.gtin]?.name||'Új termék – add meg a nevét'):'Beolvasott QR- / vonalkód';
 $('itemName').value=state.catalog[code.gtin]?.name||'';$('manualLot').value=code.lot;$('manualLot').readOnly=!!code.lot;
 $('manualExpiry').value=code.expiry?expiryISO(code.expiry):'';$('manualExpiry').readOnly=!!code.expiry;
 $('stockInput').value='';$('stockConfirm').checked=false;$('productSetup').hidden=!code.parsed;$('withdraw').hidden=!code.parsed;
 if(code.parsed)updateExpiry();else{$('expiryStatus').className='expiry warning';$('expiryStatus').textContent='A kód nyers tartalma elmenthető, de nem igazolt termékazonosító / GS1 adat. Lejárat és készlet nem állapítható meg belőle; kiadás nem engedélyezett. '+code.parseError;}
 const record={...code,source,name:state.catalog[code.gtin]?.name||'',time:new Date().toISOString(),event:code.parsed?'Beolvasás':'Beolvasás – nyers kód'};
 show(save({...state,logs:[record,...state.logs]})?'Beolvasás elmentve a telefonon.':'A beolvasás látható, de nem sikerült menteni.');
 $('result').scrollIntoView({behavior:'smooth',block:'start'});
 }catch(e){selected=null;$('result').hidden=true;show(e.message);}}
function updateExpiry(){
 if(!selected?.parsed)return;
 let info,item,batch;try{item=currentItem();info=expiryStatus(item.expiry);batch=state.batches[batchId(item)];}catch{}
 const near=info?.status==='near';$('nearWarning').hidden=!near;$('nearConfirm').required=near;if(!near)$('nearConfirm').checked=false;
 const missingLot=!$('manualLot').value.trim();
 $('issueButton').disabled=!info||info.status==='expired'||missingLot||!batch||batch.stock<1||batch.name!==$('itemName').value.trim();
 $('stockStatus').textContent=batch?`Rögzített készlet ennél a LOT-nál és lejáratnál: ${batch.stock} db`:'Ennek a tételnek még nincs rögzített készlete.';
 $('expiryStatus').className='expiry '+(!info||info.status==='expired'?'danger':near?'warning':'');
 $('expiryStatus').textContent=!info?'Hiányzó vagy hibás lejárat · A kiadás tiltva.':info.status==='expired'?`LEJÁRT · ${info.expiry} · A kiadás tiltva.`:near?`KÖZELI LEJÁRAT · ${info.expiry} · ${info.days} nap van hátra. Külön megerősítés szükséges.`:`Érvényes lejárat · ${info.expiry} · ${info.days} nap van hátra.`;
 if(missingLot)$('expiryStatus').textContent+=' A LOT megadása kötelező.';
}
for(const id of ['manualExpiry','manualLot','itemName'])$(id).oninput=()=>{$('nearConfirm').checked=false;$('stockConfirm').checked=false;updateExpiry();};
for(const id of ['partner','sales','qty'])$(id).oninput=()=>{$('nearConfirm').checked=false;};
$('stockInput').oninput=()=>{$('stockConfirm').checked=false;};
window.addEventListener('focus',()=>{updateExpiry();render();});setInterval(updateExpiry,30000);
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
$('register').onclick=()=>{if(!selected?.parsed)return;try{
 const item=currentItem(),stock=Number($('stockInput').value);
 if($('stockInput').value==='')throw Error('Add meg a tényleges készletet.');
 const id=validateBatch(item,stock),previous=state.batches[id]?.stock??null;
 if(!$('stockConfirm').checked)throw Error('Erősítsd meg a termékadatokat és a tényleges készletet.');
 const record={...item,time:new Date().toISOString(),event:previous===null?'Tétel rögzítése':'Készlet helyesbítése',qty:stock,note:`Korábbi készlet: ${previous??'nem rögzített'}; új készlet: ${stock}`};
 if(save({...state,catalog:{...state.catalog,[item.gtin]:{name:item.name}},batches:{...state.batches,[id]:{...item,stock}},logs:[record,...state.logs]})){
 $('stockConfirm').checked=false;updateExpiry();show('Tétel és tényleges készlet elmentve a telefonon.');
 }
 }catch(e){show(e.message);}};
$('withdraw').onsubmit=e=>{e.preventDefault();if(!selected?.parsed)return;try{
 const item=currentItem(),qty=Number($('qty').value),sales=$('sales').value.trim(),partner=$('partner').value.trim();
 if(!sales||!partner)throw Error('A kiadó és a kórház / partner megadása kötelező.');
 const id=batchId(item),batch=state.batches[id];
 if(!batch||batch.name!==item.name)throw Error('Előbb rögzítsd / ellenőrizd ennek a tételnek a tényleges készletét.');
 const now=new Date(),info=expiryStatus(item.expiry,now);
 const stock=validateWithdrawal(item,batch.stock,qty,now,{general:$('confirm').checked,nearExpiry:$('nearConfirm').checked});
 const record={...item,time:now.toISOString(),event:'Kiadás',qty,sales,partner,note:[$('note').value.trim(),`Készlet: ${batch.stock} → ${stock}`,info.status==='near'?`Közeli lejárat jóváhagyva: ${info.days} nap; csomagolás ellenőrizve`:''].filter(Boolean).join(' · ')};
 if(save({...state,batches:{...state.batches,[id]:{...batch,stock}},logs:[record,...state.logs]})){
 $('confirm').checked=false;$('nearConfirm').checked=false;$('stockInput').value=stock;updateExpiry();show('Kiadás rögzítve a telefonon.');
 }
 }catch(e){updateExpiry();show(e.message);}};
$('nextScan').onclick=()=>{selected=null;$('result').hidden=true;$('code').value='';$('code').focus();$('scan').scrollIntoView({behavior:'smooth'});};
function stop(){session++;if(controls)controls.stop();controls=null;const stream=$('video').srcObject;if(stream)stream.getTracks().forEach(t=>t.stop());$('video').srcObject=null;$('start').disabled=false;$('stop').disabled=true;$('cameraHint').hidden=false;$('cameraStatus').textContent='A kamera leállítva.';}
$('stop').onclick=stop;
$('start').onclick=async()=>{imageSession++;if(starting||controls)return;if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia){show('A kamerához HTTPS és támogatott böngésző szükséges. Használd a kézi bevitelt.');return;}if(!window.ZXingBrowser){show('A kameraolvasó nem töltődött be. Töltsd újra az oldalt, vagy használd a kézi bevitelt.');return;}starting=true;const current=++session;$('start').disabled=true;$('stop').disabled=false;$('cameraStatus').textContent='Kamera indítása…';try{const reader=new ZXingBrowser.BrowserMultiFormatReader(new Map([[3,true],[8,true]]));const c=await reader.decodeFromConstraints({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}}},$('video'),(result)=>{if(result&&session===current){$('code').value=result.getText();identify(result.getText(),'kamera');stop();}});if(session!==current)c.stop();else{controls=c;$('cameraHint').hidden=true;$('cameraStatus').textContent='Kamera aktív. Tartsd a kódot élesen a kép közepén.';}}catch(e){stop();show(e.name==='NotAllowedError'?'A kameraengedély nincs megadva. Engedélyezd a böngésző beállításaiban, vagy írj be kódot.':'Nem sikerült elindítani a kamerát. Zárd be a kamerát használó más appokat, vagy használd a kézi bevitelt.');}finally{starting=false;}};
window.addEventListener('pagehide',stop);document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{stop();document.querySelectorAll('[data-tab]').forEach(n=>n.classList.toggle('active',n===b));for(const id of ['scan','inventory','log','help'])$(id).hidden=id!==b.dataset.tab;});
$('export').onclick=()=>{const blob=new Blob([csv(state.logs)],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='DHS-QuickScan-naplo.csv';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);show('A CSV export elkészült. iPhone-on a megnyíló fájl a Megosztás menüből menthető.');};
$('backup').onclick=()=>{const blob=new Blob([JSON.stringify({format:'DHS-QuickScan',version:1,exportedAt:new Date().toISOString(),...state},null,2)],{type:'application/json'});download(blob,'DHS-QuickScan-mentes-'+new Date().toISOString().slice(0,10)+'.json');show('Teljes mentés letöltése elindítva. Mentsd a Fájlok közé.');};
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
function connection(){$('connection').textContent=navigator.onLine?'● Online':'○ Offline';}window.addEventListener('online',connection);window.addEventListener('offline',connection);connection();render();
if('serviceWorker'in navigator){navigator.serviceWorker.register('./sw.js').then(async()=>{await navigator.serviceWorker.ready;$('offlineReady').textContent='Offline használatra kész';}).catch(()=>{$('offlineReady').textContent='Offline gyorsítótár nem érhető el';});}else $('offlineReady').textContent='Offline mód nem támogatott';
