import { Request, Response } from 'express';

// A self-contained public booking page served at GET /book?service=<id-or-slug>.
// Clients can book without an account — it calls the same-origin /v1/public API.
const PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Book your appointment</title>
<style>
  :root{--ink:#1B1B16;--gold:#C9A227;--line:#E7E3D8;--muted:#6B6B62;--surface:#FBF9F3}
  *{box-sizing:border-box}body{margin:0;background:var(--surface);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;line-height:1.5}
  .wrap{max-width:440px;margin:0 auto;padding:24px 18px 60px}
  .brand{font-weight:800;letter-spacing:.14em;color:var(--gold);font-size:15px;margin-bottom:18px}
  .card{background:#fff;border:1px solid var(--line);border-radius:16px;padding:20px;box-shadow:0 8px 24px -18px rgba(27,27,22,.3)}
  h1{font-size:22px;margin:0 0 4px}.sub{color:var(--muted);font-size:14px;margin:0 0 16px}
  label{font-size:12px;font-weight:600;color:var(--muted);display:block;margin:12px 0 4px}
  input{width:100%;padding:11px;border:1px solid var(--line);border-radius:10px;font-size:15px;background:#fff}
  input:focus{outline:none;border-color:var(--gold);box-shadow:0 0 0 3px rgba(201,162,39,.15)}
  .addon{display:flex;align-items:center;justify-content:space-between;border:1px solid var(--line);border-radius:10px;padding:10px 12px;margin-top:8px;cursor:pointer}
  .addon.on{border-color:var(--gold);background:rgba(201,162,39,.08)}
  .addon .meta{font-size:12px;color:var(--muted)}
  .total{display:flex;justify-content:space-between;font-weight:700;margin-top:16px;padding-top:12px;border-top:1px solid var(--line)}
  button{width:100%;margin-top:18px;padding:13px;border:0;border-radius:12px;background:var(--gold);color:#1B1B16;font-weight:700;font-size:15px;cursor:pointer}
  button:disabled{opacity:.5}
  .ok{text-align:center;padding:24px}.ok .big{font-size:44px}
  .err{background:#FDECEC;color:#B4231F;border-radius:10px;padding:10px;font-size:13px;margin-top:12px}
  .muted{color:var(--muted);font-size:12px}
</style></head><body>
<div class="wrap">
  <div class="brand">TEDDY</div>
  <div class="card" id="card"><p class="sub">Loading…</p></div>
</div>
<script src="/book.js"></script></body></html>`;

// The page script lives at its own same-origin URL so the strict CSP
// (script-src 'self') allows it — inline scripts are blocked by policy.
const SCRIPT = `
const API=location.origin+'/v1/public';
const params=new URLSearchParams(location.search);
const svcId=params.get('service');
let svc=null, selected={};
const money=n=>'$'+Number(n).toFixed(2);
const card=document.getElementById('card');

async function load(){
  if(!svcId){card.innerHTML='<p class="sub">No service specified.</p>';return;}
  try{
    const r=await fetch(API+'/services/'+encodeURIComponent(svcId));
    const j=await r.json();
    if(!r.ok) throw new Error(j.error?.message||'Not found');
    svc=j.data; render();
  }catch(e){card.innerHTML='<p class="sub">This booking link is unavailable.</p>';}
}
function total(){let t=svc.price;svc.addOns.forEach(a=>{if(selected[a.id])t+=a.price});return t;}
function render(){
  card.innerHTML=\`
    <h1>\${svc.name}</h1>
    <p class="sub">\${svc.vendorName}\${svc.city?' · '+svc.city:''} · \${svc.durationMin} min</p>
    <label>Your name</label><input id="name" placeholder="Full name">
    <label>Email</label><input id="email" type="email" placeholder="you@email.com">
    <label>Phone (optional)</label><input id="phone" placeholder="Mobile">
    <label>Date & time</label><input id="when" type="datetime-local">
    \${svc.addOns.length?'<label>Add-ons</label><div id="addons"></div>':''}
    <div class="total"><span>Total</span><span id="total">\${money(svc.price)}</span></div>
    <button id="go">Request Booking</button>
    <p class="muted" style="margin-top:10px;text-align:center">No account needed — we'll email your confirmation.</p>
    <div id="msg"></div>\`;
  const ad=document.getElementById('addons');
  if(ad){svc.addOns.forEach(a=>{
    const el=document.createElement('div');el.className='addon';
    el.innerHTML=\`<div><div>\${a.name}</div><div class="meta">+\${money(a.price)} · +\${a.durationMin} min</div></div><div>+</div>\`;
    el.onclick=()=>{selected[a.id]=!selected[a.id];el.classList.toggle('on',selected[a.id]);el.lastElementChild.textContent=selected[a.id]?'✓':'+';document.getElementById('total').textContent=money(total());};
    ad.appendChild(el);
  });}
  document.getElementById('go').onclick=submit;
}
async function submit(){
  const btn=document.getElementById('go'),msg=document.getElementById('msg');
  const name=document.getElementById('name').value.trim();
  const email=document.getElementById('email').value.trim();
  const when=document.getElementById('when').value;
  msg.innerHTML='';
  if(!name||!email||!when){msg.innerHTML='<div class="err">Please fill in your name, email and a date/time.</div>';return;}
  btn.disabled=true;btn.textContent='Booking…';
  const addOns=svc.addOns.filter(a=>selected[a.id]).map(a=>({id:a.id,name:a.name,price:a.price,durationMin:a.durationMin}));
  try{
    const r=await fetch(API+'/bookings',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({serviceId:svc.id,vendorId:svc.vendorId,startsAt:new Date(when).toISOString(),guestName:name,guestEmail:email,guestPhone:document.getElementById('phone').value.trim(),addOns})});
    const j=await r.json();
    if(!r.ok) throw new Error(j.error?.message||'Could not book');
    card.innerHTML='<div class="ok"><div class="big">✅</div><h1>You\\'re booked!</h1><p class="sub">We\\'ve sent a confirmation to '+email+'. See you at '+svc.vendorName+'.</p></div>';
  }catch(e){msg.innerHTML='<div class="err">'+(e.message||'Something went wrong')+'</div>';btn.disabled=false;btn.textContent='Request Booking';}
}
load();
`;

export function bookingPageHandler(_req: Request, res: Response) {
  res.type('html').send(PAGE);
}

export function bookingScriptHandler(_req: Request, res: Response) {
  res.type('application/javascript').send(SCRIPT);
}
