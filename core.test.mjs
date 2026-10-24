import {test} from 'node:test';import assert from 'node:assert/strict';import{parseCode,take,csv,validateWithdrawal,expiryISO}from'./core.js';
test('GS1 zárójeles és FNC1 kód',()=>{const a=parseCode('(01)05901234567893(17)291231(10)DEMO(21)ABC');assert.deepEqual(a,{gtin:'05901234567893',expiry:'291231',lot:'DEMO',serial:'ABC'});assert.deepEqual(parseCode(']d201059012345678931729123110DEMO\x1d21ABC'),a);});
test('EAN normalizálás',()=>assert.equal(parseCode('4012345678901').gtin,'04012345678901'));
test('hibás GS1 és dátum elutasítása',()=>{for(const s of ['','hello','(01)123','(01)05901234567893(17)291332','(01)05901234567893(17)290230','(01)05901234567893(99)X'])assert.throws(()=>parseCode(s));});
test('GS1 hónap vége 00',()=>assert.equal(parseCode('(01)05901234567893(17)290200').expiry,'290200'));
test('készlet és mennyiség védelme',()=>{assert.equal(take(12,2),10);for(const n of [0,-1,1.2,13,NaN])assert.throws(()=>take(12,n));});
test('CSV BOM, idézőjelek, képletinjekció',()=>{let c=csv([{event:'=1+1',note:'a;"b\nc'}]);assert.ok(c.startsWith('\ufeff'));assert.ok(c.includes('"\'=1+1"'));assert.ok(c.includes('"a;""b\nc"'));});

test('GTIN ellenőrzőszám és ismételt mező',()=>{assert.throws(()=>parseCode('4012345678902'));assert.throws(()=>parseCode('(01)05901234567893(17)291231(17)301231'));assert.throws(()=>parseCode('(01)05901234567893(10)'));});
test('lejárt, mai, hiányzó lejárat és LOT',()=>{const now=new Date('2026-10-24T10:00:00Z'),item={lot:'DEMO',expiry:'261024'};assert.equal(validateWithdrawal(item,12,1,now),11);assert.throws(()=>validateWithdrawal({...item,expiry:'261023'},12,1,now));assert.throws(()=>validateWithdrawal({...item,expiry:''},12,1,now));assert.throws(()=>validateWithdrawal({...item,lot:''},12,1,now));assert.throws(()=>validateWithdrawal(item,undefined,1,now));assert.equal(expiryISO('280200'),'2028-02-29');});
test('budapesti napváltás',()=>{assert.throws(()=>validateWithdrawal({lot:'A',expiry:'261024'},12,1,new Date('2026-10-24T22:30:00Z')));});
