import {createHash,timingSafeEqual} from 'node:crypto';
import {csv,dispatchRows,expiryISO} from '../../core.js';
const FROM='andras.marlyin@gmail.com',TO='mr.marlyin@gmail.com';
const reply=(status,body)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
const digest=value=>createHash('sha256').update(value).digest();
export function validateMailOrder(order){
 if(!order||!/^[-a-zA-Z0-9]{1,80}$/.test(order.id||''))throw Error('Hibás kivitelazonosító.');
 if(!order.sales?.trim()||order.sales.length>80||!order.partner?.trim()||order.partner.length>120)throw Error('Hiányzó név vagy célkórház.');
 if(typeof order.time!=='string'||!Number.isFinite(Date.parse(order.time)))throw Error('Hibás időpont.');
 if(!Array.isArray(order.items)||order.items.length<1||order.items.length>200)throw Error('Hibás tétellista.');
 if(typeof order.note!=='string'||order.note.length>1000)throw Error('Hibás megjegyzés.');
 for(const i of order.items){if(!/^\d{14}$/.test(i.gtin||'')||typeof i.lot!=='string'||!i.lot.trim()||i.lot.length>20||!Number.isSafeInteger(i.qty)||i.qty<1)throw Error('Hibás tétel.');expiryISO(i.expiry);if(typeof i.raw!=='string'||i.raw.length>16000)throw Error('Hibás nyers kód.');}
 return order;
}
export function buildMail(order){
 validateMailOrder(order);
 const subject='DHS raktári kivitel – '+order.sales+' → '+order.partner;
 const body=[`Kivitelazonosító: ${order.id}`,`Időpont: ${order.time}`,`Saleses neve: ${order.sales}`,`Mozgás: DHS raktár → ${order.partner}`,`Megjegyzés: ${order.note||'—'}`,'',...order.items.map((i,n)=>`${n+1}. ${i.name||i.gtin} | ${i.qty} db | GTIN: ${i.gtin} | LOT: ${i.lot} | lejárat: ${expiryISO(i.expiry)} | SN: ${i.serial||'—'}`),'',order.nearApproved?'A közeli lejáratú tételek kivitelét külön jóváhagyták.':''].join('\r\n');
 const boundary='dhs_'+order.id;
 const encodedSubject=Buffer.from(subject).toString('base64');
 const encodePart=value=>Buffer.from(value).toString('base64').match(/.{1,76}/g).join('\r\n');
 return [`From: ${FROM}`,`To: ${TO}`,`Subject: =?UTF-8?B?${encodedSubject}?=`,`Message-ID: <${order.id}@dhs-quickscan.netlify.app>`,'MIME-Version: 1.0',`Content-Type: multipart/mixed; boundary="${boundary}"`,'',`--${boundary}`,'Content-Type: text/plain; charset=UTF-8','Content-Transfer-Encoding: base64','',encodePart(body),`--${boundary}`,'Content-Type: text/csv; charset=UTF-8',`Content-Disposition: attachment; filename="DHS-kivitel-${order.id}.csv"`,'Content-Transfer-Encoding: base64','',encodePart(csv(dispatchRows(order))),`--${boundary}--`,''].join('\r\n');
}
export async function handle(request,env=process.env,fetcher=fetch){
 if(request.method!=='POST')return reply(405,{code:'method'});
 if(!env.DHS_DEVICE_KEY||!env.GMAIL_CLIENT_ID||!env.GMAIL_CLIENT_SECRET||!env.GMAIL_REFRESH_TOKEN)return reply(503,{code:'not_configured',message:'A Gmail-küldés még nincs összekapcsolva.'});
 const key=request.headers.get('Authorization')?.replace(/^Bearer /,'')||'';
 if(!timingSafeEqual(digest(key),digest(env.DHS_DEVICE_KEY)))return reply(401,{code:'unauthorized'});
 if((request.headers.get('Origin')||'')!=='https://dhs-quickscan.netlify.app')return reply(403,{code:'origin'});
 let order;try{const text=await request.text();if(text.length>1000000)return reply(413,{code:'size'});order=validateMailOrder(JSON.parse(text));}catch{return reply(400,{code:'invalid_order'});}
 let token;try{const response=await fetcher('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:env.GMAIL_CLIENT_ID,client_secret:env.GMAIL_CLIENT_SECRET,refresh_token:env.GMAIL_REFRESH_TOKEN,grant_type:'refresh_token'}),signal:AbortSignal.timeout(12000)});if(!response.ok)return reply(502,{code:'gmail_authorization'});token=(await response.json()).access_token;if(!token)return reply(502,{code:'gmail_authorization'});}catch{return reply(502,{code:'before_send_failure'});}
 try{const response=await fetcher('https://gmail.googleapis.com/gmail/v1/users/me/messages/send',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({raw:Buffer.from(buildMail(order)).toString('base64url')}),signal:AbortSignal.timeout(15000)});if(!response.ok)return reply(502,{code:response.status>=500?'send_unknown':'gmail_rejected'});const message=await response.json();if(!message.id)return reply(502,{code:'send_unknown'});return reply(200,{status:'sent',messageId:message.id,from:FROM,to:TO});}catch{return reply(502,{code:'send_unknown'});}
}
export default request=>handle(request);
