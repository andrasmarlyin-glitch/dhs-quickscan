export const products=[{gtin:'05901234567893',name:'Demo steril kötszer',stock:12},{gtin:'04012345678901',name:'Demo vizsgálókesztyű',stock:30}];
export function parseCode(raw){
 let s=raw.trim().replace(/^\]d2/,''); if(!s)throw Error('Adj meg egy kódot.');
 if(/^\d{13,14}$/.test(s))return {gtin:s.padStart(14,'0'),lot:'',expiry:'',serial:''};
 let out={gtin:'',lot:'',expiry:'',serial:''}; const keys={'01':['gtin',14],'17':['expiry',6],'10':['lot',0],'21':['serial',0]};
 if(s.startsWith('(')){let re=/\((\d{2})\)([^()]*)/g,m,end=0;while((m=re.exec(s))){if(m.index!==end||!keys[m[1]])throw Error('Nem támogatott GS1 mező.');out[keys[m[1]][0]]=m[2];end=re.lastIndex;}if(end!==s.length)throw Error('Hibás GS1 formátum.');}
 else {while(s.length){if(s[0]==='\x1d'){s=s.slice(1);continue;}let k=s.slice(0,2),spec=keys[k];if(!spec)throw Error('Nem támogatott GS1 mező: '+k);s=s.slice(2);if(spec[1]){out[spec[0]]=s.slice(0,spec[1]);s=s.slice(spec[1]);}else{let pos=s.indexOf('\x1d');out[spec[0]]=pos<0?s:s.slice(0,pos);s=pos<0?'':s.slice(pos+1);}}}
 if(!/^\d{14}$/.test(out.gtin))throw Error('A GS1 (01) GTIN 14 számjegy legyen.');
 if(out.lot.length>20||out.serial.length>20)throw Error('A LOT és sorozatszám legfeljebb 20 karakter.');
 if(out.expiry){if(!/^\d{6}$/.test(out.expiry))throw Error('Hibás lejárat: ÉÉHHNN szükséges.');let y=2000+ +out.expiry.slice(0,2),m=+out.expiry.slice(2,4),d=+out.expiry.slice(4);if(m<1||m>12||d>new Date(y,m,0).getDate())throw Error('Érvénytelen lejárati dátum.');}
 return out;
}
export function take(stock,qty){if(!Number.isInteger(qty)||qty<1)throw Error('Pozitív egész mennyiség szükséges.');if(qty>stock)throw Error('Nincs elegendő tesztkészlet.');return stock-qty;}
export function csv(rows){const cell=v=>'"'+String(/^[=+@\-\t\r]/.test(String(v))?'\''+v:v).replaceAll('"','""')+'"';return '\ufeff'+[['Időpont','Esemény','Termék','GTIN','LOT','Lejárat','Sorozatszám','Mennyiség','Saleses','Partner','Megjegyzés'],...rows.map(r=>[r.time,r.event,r.name||'',r.gtin||'',r.lot||'',r.expiry||'',r.serial||'',r.qty||'',r.sales||'',r.partner||'',r.note||''])].map(r=>r.map(cell).join(';')).join('\r\n');}
