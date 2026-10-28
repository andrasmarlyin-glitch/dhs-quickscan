export const products=[{gtin:'05901234567893',name:'Demo steril kötszer',stock:12},{gtin:'04012345678901',name:'Demo vizsgálókesztyű',stock:30}];
export function parseCode(raw){
 let s=raw.trim().replace(/^\](?:d2|C1|Q3)/,''); if(!s)throw Error('Adj meg egy kódot.');
 if(/^\d{8}$|^\d{12,14}$/.test(s)){validateGTIN(s);return {gtin:s.padStart(14,'0'),lot:'',expiry:'',serial:''};}
 let out={gtin:'',lot:'',expiry:'',serial:''}; const keys={'01':['gtin',14],'17':['expiry',6],'10':['lot',0],'21':['serial',0],'11':['production',6],'91':['internal91',0]};
 if(s.startsWith('(')){let re=/\((\d{2})\)([^()]*)/g,m,end=0;while((m=re.exec(s))){if(m.index!==end||!keys[m[1]])throw Error('Nem támogatott GS1 mező.');if(out[keys[m[1]][0]])throw Error('Ismétlődő GS1 mező.');if(!m[2])throw Error('Üres GS1 mező.');if(keys[m[1]][1]&&m[2].length!==keys[m[1]][1])throw Error('Hibás GS1 mezőhossz.');out[keys[m[1]][0]]=m[2];end=re.lastIndex;}if(end!==s.length)throw Error('Hibás GS1 formátum.');}
 else {while(s.length){if(s[0]==='\x1d'){s=s.slice(1);continue;}let k=s.slice(0,2),spec=keys[k];if(!spec)throw Error('Nem támogatott GS1 mező: '+k);s=s.slice(2);if(out[spec[0]])throw Error('Ismétlődő GS1 mező.');if(spec[1]){out[spec[0]]=s.slice(0,spec[1]);s=s.slice(spec[1]);}else{let pos=s.indexOf('\x1d');out[spec[0]]=pos<0?s:s.slice(0,pos);s=pos<0?'':s.slice(pos+1);}}}
 if(!/^\d{14}$/.test(out.gtin))throw Error('A GS1 (01) GTIN 14 számjegy legyen.');
 validateGTIN(out.gtin);
 if(out.production)expiryISO(out.production);
 if(out.internal91&&out.internal91.length>90)throw Error('A belső mező túl hosszú.');
 if(out.lot.length>20||out.serial.length>20)throw Error('A LOT és sorozatszám legfeljebb 20 karakter.');
 if(out.expiry){if(!/^\d{6}$/.test(out.expiry))throw Error('Hibás lejárat: ÉÉHHNN szükséges.');let y=2000+ +out.expiry.slice(0,2),m=+out.expiry.slice(2,4),d=+out.expiry.slice(4);if(m<1||m>12||d>new Date(y,m,0).getDate())throw Error('Érvénytelen lejárati dátum.');}
 return out;
}
export function take(stock,qty){if(!Number.isSafeInteger(stock)||stock<0)throw Error('Hibás helyi tesztkészlet.');if(!Number.isSafeInteger(qty)||qty<1)throw Error('Pozitív egész mennyiség szükséges.');if(qty>stock)throw Error('Nincs elegendő tesztkészlet.');return stock-qty;}
export function csv(rows){const cell=v=>'"'+String(/^[=+@\-\t\r]/.test(String(v))?'\''+v:v).replaceAll('"','""')+'"';return '\ufeff'+[['Időpont','Esemény','Termék','GTIN','LOT','Lejárat','Sorozatszám','Mennyiség','Saleses','Partner','Megjegyzés'],...rows.map(r=>[r.time,r.event,r.name||'',r.gtin||'',r.lot||'',r.expiry||'',r.serial||'',r.qty||'',r.sales||'',r.partner||'',r.note||''])].map(r=>r.map(cell).join(';')).join('\r\n');}

export function validateGTIN(value){
 if(!/^(?:\d{8}|\d{12,14})$/.test(value))throw Error('A GTIN 8, 12, 13 vagy 14 számjegy legyen.');
 const digits=[...value.slice(0,-1)].reverse();
 const check=(10-digits.reduce((sum,n,i)=>sum+Number(n)*(i%2===0?3:1),0)%10)%10;
 if(check!==Number(value.at(-1)))throw Error('Hibás GTIN ellenőrzőszám.');
}
export function expiryISO(value){
 if(!/^\d{6}$/.test(value))throw Error('A lejárat megadása kötelező (ÉÉHHNN).');
 const year=2000+Number(value.slice(0,2)),month=Number(value.slice(2,4));
 const max=new Date(Date.UTC(year,month,0)).getUTCDate(),day=Number(value.slice(4))||max;
 if(month<1||month>12||day<1||day>max)throw Error('Érvénytelen lejárati dátum.');
 return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}
export const NEAR_EXPIRY_DAYS=90;
export function expiryStatus(value,now=new Date()){
 const expiry=expiryISO(value);
 const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Budapest',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 const days=Math.round((Date.parse(expiry+'T00:00:00Z')-Date.parse(today+'T00:00:00Z'))/86400000);
 return {expiry,days,status:days<0?'expired':days<=NEAR_EXPIRY_DAYS?'near':'valid'};
}
export function validateWithdrawal(item,stock,qty,now=new Date(),confirmation={}){
 if(!item.lot?.trim())throw Error('A LOT megadása kötelező.');
 const info=expiryStatus(item.expiry,now);
 if(info.status==='expired')throw Error('Lejárt termék: a kiadás TILTVA.');
 if(confirmation.general!==true)throw Error('Erősítsd meg a kivételt.');
 if(info.status==='near'&&confirmation.nearExpiry!==true)throw Error('90 napon belüli lejárat: külön megerősítés szükséges.');
 return take(stock,qty);
}
