import {test} from 'node:test';import assert from 'node:assert/strict';import{parseCode,take,csv,validateWithdrawal as checkedWithdrawal,expiryStatus,expiryISO,decodeScan,batchId,validateBatch,validateDispatch,dispatchRows}from'./core.js';
test('GS1 zárójeles és FNC1 kód',()=>{const a=parseCode('(01)05901234567893(17)291231(10)DEMO(21)ABC');assert.deepEqual(a,{gtin:'05901234567893',expiry:'291231',lot:'DEMO',serial:'ABC'});assert.deepEqual(parseCode(']d201059012345678931729123110DEMO\x1d21ABC'),a);});
test('EAN normalizálás',()=>assert.equal(parseCode('4012345678901').gtin,'04012345678901'));
test('hibás GS1 és dátum elutasítása',()=>{for(const s of ['','hello','(01)123','(01)05901234567893(17)291332','(01)05901234567893(17)290230','(01)05901234567893(99)X'])assert.throws(()=>parseCode(s));});
test('GS1 hónap vége 00',()=>assert.equal(parseCode('(01)05901234567893(17)290200').expiry,'290200'));
test('készlet és mennyiség védelme',()=>{assert.equal(take(12,2),10);for(const n of [0,-1,1.2,13,NaN])assert.throws(()=>take(12,n));});
test('CSV BOM, idézőjelek, képletinjekció',()=>{let c=csv([{event:'=1+1',note:'a;"b\nc'}]);assert.ok(c.startsWith('\ufeff'));assert.ok(c.includes('"\'=1+1"'));assert.ok(c.includes('"a;""b\nc"'));});

test('GTIN ellenőrzőszám és ismételt mező',()=>{assert.throws(()=>parseCode('4012345678902'));assert.throws(()=>parseCode('(01)05901234567893(17)291231(17)301231'));assert.throws(()=>parseCode('(01)05901234567893(10)'));});
test('lejárt, mai, hiányzó lejárat és LOT',()=>{const now=new Date('2026-10-24T10:00:00Z'),item={lot:'DEMO',expiry:'261024'};assert.equal(validateWithdrawal(item,12,1,now),11);assert.throws(()=>validateWithdrawal({...item,expiry:'261023'},12,1,now));assert.throws(()=>validateWithdrawal({...item,expiry:''},12,1,now));assert.throws(()=>validateWithdrawal({...item,lot:''},12,1,now));assert.throws(()=>validateWithdrawal(item,undefined,1,now));assert.equal(expiryISO('280200'),'2028-02-29');});
test('budapesti napváltás',()=>{assert.throws(()=>validateWithdrawal({lot:'A',expiry:'261024'},12,1,new Date('2026-10-24T22:30:00Z')));});

 test('katalógusfüggetlen GS1 gyártás és belső adat',()=>{
 const a=parseCode('(01)05901234567893(17)291231(10)FIKTIV(11)260101');
 assert.equal(a.production,'260101');assert.equal(a.lot,'FIKTIV');
 const b=parseCode('01059012345678931729123110FIKTIV\x1d91001');
 assert.equal(b.internal91,'001');assert.equal(b.lot,'FIKTIV');
 assert.throws(()=>parseCode('(01)05901234567893(11)261332'));
 assert.throws(()=>parseCode('(01)05901234567893(91)'));
 });

function validateWithdrawal(item,stock,qty,now){return checkedWithdrawal(item,stock,qty,now,{general:true,nearExpiry:true});}
test('90 napos küszöb és lejárat napja',()=>{
 const now=new Date('2026-10-28T12:00:00Z');
 assert.equal(expiryStatus('261027',now).status,'expired');
 assert.deepEqual(expiryStatus('261028',now),{expiry:'2026-10-28',days:0,status:'near'});
 assert.equal(expiryStatus('270125',now).days,89);
 assert.equal(expiryStatus('270126',now).days,90);
 assert.equal(expiryStatus('270126',now).status,'near');
 assert.equal(expiryStatus('270127',now).status,'valid');
});
test('külön jóváhagyás kötelező; lejárt akkor sem kiadható',()=>{
 const now=new Date('2026-10-28T12:00:00Z'),item={lot:'DEMO',expiry:'270126'};
 assert.throws(()=>checkedWithdrawal(item,12,1,now,{general:true}),/külön megerősítés/);
 assert.equal(checkedWithdrawal(item,12,1,now,{general:true,nearExpiry:true}),11);
 assert.throws(()=>checkedWithdrawal(item,12,1,now,{nearExpiry:true}),/Erősítsd/);
 assert.throws(()=>checkedWithdrawal({...item,expiry:'261027'},12,1,now,{general:true,nearExpiry:true}),/TILTVA/);
 assert.equal(checkedWithdrawal({...item,expiry:'270127'},12,1,now,{general:true}),11);
});
test('kiadáskor új nap és óraátállítás is számít',()=>{
 const item={lot:'DEMO',expiry:'261028'},ok={general:true,nearExpiry:true};
 assert.equal(checkedWithdrawal(item,12,1,new Date('2026-10-28T22:59:00Z'),ok),11);
 assert.throws(()=>checkedWithdrawal(item,12,1,new Date('2026-10-28T23:00:00Z'),ok),/TILTVA/);
 assert.equal(expiryStatus('261026',new Date('2026-10-24T10:00:00Z')).days,2);
 assert.equal(expiryStatus('280200',new Date('2028-02-28T10:00:00Z')).days,1);
 assert.throws(()=>expiryStatus('261332'));
});

test('saját GTIN és GS1 katalógus nélkül feldolgozható',()=>{
 const scan=decodeScan('(01)04260279096722(17)291231(10)SAJAT');
 assert.equal(scan.parsed,true);assert.equal(scan.gtin,'04260279096722');
 const item={...scan,name:'Saját termék'};
 const id=validateBatch(item,5);assert.equal(id,batchId(item));
 assert.notEqual(id,batchId({...item,lot:'MASIK'}));
 assert.notEqual(id,batchId({...item,expiry:'301231'}));
 assert.equal(checkedWithdrawal(item,5,2,new Date('2026-10-28T12:00:00Z'),{general:true}),3);
});
test('QR, URL és hibás GS1 megőrzése engedélyezett kiadás nélkül',()=>{
 for(const raw of ['https://example.com/product/42','SAJAT-KOD-ABC','<img src=x onerror=alert(1)>','(01)04260279096722(17)261332(10)A','4012345678902']){
  const scan=decodeScan(raw);assert.equal(scan.raw,raw);assert.equal(scan.parsed,false);assert.equal(scan.gtin,'');assert.ok(scan.parseError);
 }
 assert.throws(()=>decodeScan(' '));assert.throws(()=>decodeScan('X'.repeat(16001)));
});
test('tényleges készlethez név, LOT, dátum és egész mennyiség kell',()=>{
 const item={gtin:'04260279096722',name:'Termék',lot:'A',expiry:'291231'};
 for(const qty of [-1,1.5,NaN,Infinity])assert.throws(()=>validateBatch(item,qty));
 assert.throws(()=>validateBatch({...item,name:''},1));
 assert.throws(()=>validateBatch({...item,lot:''},1));
 assert.throws(()=>validateBatch({...item,expiry:'261332'},1));
 assert.doesNotThrow(()=>validateBatch(item,0));
});
test('CSV a nyers QR-t is megőrzi és védi a képletként értelmezést',()=>{
 const text=csv([{event:'Beolvasás',raw:'=1+1',source:'kép',parseError:'Nem GS1'}]);
 assert.ok(text.includes('Nyers kód'));assert.ok(text.includes('"\'=1+1"'));assert.ok(text.includes('Nem GS1'));
});

test('közös kivitel készletfelvitel nélkül',()=>{
 const item={...decodeScan('(01)04260279096722(17)291231(10)A'),qty:1};
 const result=validateDispatch(Array.from({length:5},()=>({...item})),'Kiss Pista','Honvédkórház',new Date('2026-10-28T12:00:00Z'),{general:true});
 assert.equal(result.total,5);assert.equal(result.near,false);
 const order={id:'K1',time:'2026-10-28T12:00:00Z',sales:'Kiss Pista',partner:'Honvédkórház',note:'beavatkozáshoz',items:[item]};
 const rows=dispatchRows(order);assert.equal(rows[0].sales,'Kiss Pista');assert.equal(rows[0].partner,'Honvédkórház');assert.ok(rows[0].note.includes('K1'));assert.ok(rows[0].note.includes('beavatkozáshoz'));
});
test('kivitel véglegesítésekor minden tétel újra ellenőrzött',()=>{
 const item={...decodeScan('(01)04260279096722(17)270126(10)A'),qty:1},now=new Date('2026-10-28T12:00:00Z');
 assert.throws(()=>validateDispatch([item],'Pista','Kórház',now,{general:true}),/külön megerősítés/);
 assert.equal(validateDispatch([item],'Pista','Kórház',now,{general:true,nearExpiry:true}).near,true);
 assert.throws(()=>validateDispatch([{...item,expiry:'261027'}],'Pista','Kórház',now,{general:true,nearExpiry:true}),/TILTVA/);
 assert.throws(()=>validateDispatch([],'Pista','Kórház',now,{general:true}));
 assert.throws(()=>validateDispatch([item],'','Kórház',now,{general:true}));
 assert.throws(()=>validateDispatch([{...item,lot:''}],'Pista','Kórház',now,{general:true}));
 assert.throws(()=>validateDispatch([{...item,parsed:false}],'Pista','Kórház',now,{general:true}));
});
test('sorozatszámos termék duplázása és többszörös darabszáma tiltott',()=>{
 const item={...decodeScan('(01)04260279096722(17)291231(10)A(21)SN1'),qty:1},now=new Date('2026-10-28T12:00:00Z');
 assert.throws(()=>validateDispatch([item,item],'Pista','Kórház',now,{general:true}),/sorozatszám/);
 assert.throws(()=>validateDispatch([{...item,qty:2}],'Pista','Kórház',now,{general:true}),/sorozatszám/);
});
