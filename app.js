const apiOrigin="https://zubarev-reklama.kr1zof.chatgpt.site";

const main=document.querySelector("#main"), dialog=document.querySelector("#offer-dialog"), form=document.querySelector("#offer-form");
const zone="Europe/Moscow";
const ymd = new Intl.DateTimeFormat("en-CA",{timeZone:zone,year:"numeric",month:"2-digit",day:"2-digit"});
const fmt = (v,options) => new Intl.DateTimeFormat("ru-RU",{timeZone:zone,...options}).format(new Date(v));
const day = v => ymd.format(new Date(v));
const time = v => fmt(v,{hour:"2-digit",minute:"2-digit",hourCycle:"h23"});
const dateLabel = v => fmt(v,{day:"numeric",month:"long",weekday:"long"});
const full = v => fmt(v,{day:"numeric",month:"short"})+" · "+time(v);
const today=()=>day(Date.now());
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
const label = s => ({free:"Свободно",busy:"Занято",queued:"Передаётся в Telegram",scheduled:"Запланировано",sending:"Передаётся в Telegram",published:"Опубликовано",failed:"Ошибка",cancelled:"Отменено",review:"Требуется проверка"}[s]||s);
const kinds={photo:"Фото",video:"Видео",animation:"GIF",document:"Файл",audio:"Аудио"};
const capital=s=>s.charAt(0).toUpperCase()+s.slice(1);
const map=new Map();
let events=[], channel="", selected=today(), month=selected.slice(0,7), offerAt=null, tab="plan", activeDraft="", data, toastTimer;
const showToast=text=>{
  const toast=document.querySelector("#toast");toast.textContent=text;toast.hidden=false;
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>{toast.hidden=true},4000);
};
async function api(path,body){
  const headers={};
  if(body!==undefined) headers["Content-Type"]="application/json";
  const token=sessionStorage.getItem("owner_token");
  if(token&&path.startsWith("/api/owner/")) headers.Authorization="Bearer "+token;
  if(token&&path==="/api/session") headers.Authorization="Bearer "+token;
  const res=await fetch(apiOrigin+path,{method:body===undefined?"GET":"POST",headers,body:body===undefined?undefined:JSON.stringify(body)});
  const payload=await res.json().catch(()=>({}));
  if(!res.ok) throw Error(payload.error||"Не удалось связаться с сайтом");
  return payload;
}
function options(current=""){
  return [...map.values()].map(c=>'<option value="'+esc(c.id)+'" '+(current===c.id?"selected":"")+'>'+esc(c.name)+'</option>').join("");
}
const short=id=>map.get(id)?.short||"";
const channelName=id=>map.get(id)?.name||"";
function monthStep(n) {
  const [y,m]=month.split("-").map(Number);
  return new Date(Date.UTC(y,m-1+n,1,12)).toISOString().slice(0,7);
}
function publicView(){
  const now=new Date().toISOString(), visible=events.filter(e=>!channel||e.channel===channel);
  const next=visible.find(e=>e.state==="free"&&e.at>now);
  const [year,m]=month.split("-").map(Number), first=new Date(Date.UTC(year,m-1,1));
  const offset=(first.getUTCDay()+6)%7, count=new Date(Date.UTC(year,m,0)).getUTCDate();
  const monthTitle=capital(fmt(first,{month:"long",year:"numeric"}).replace(" г.",""));
  const cells=[];
  for(let i=0;i<Math.ceil((offset+count)/7)*7;i++){
    const d=i-offset+1;
    if(d<1||d>count){cells.push('<span class="day blank"></span>');continue}
    const value=month+"-"+String(d).padStart(2,"0"), isPast=value<today();
    const ev=visible.filter(e=>day(e.at)===value&&e.at>now);
    const tags=ev.slice(0,2).map(e=>'<span class="event '+e.state+'">'+time(e.at)+' <span class="channel-small">'+esc(short(e.channel))+'</span></span>').join("");
    cells.push('<button class="day '+(value===selected?"selected ":"")+(value===today()?"current ":"")+(isPast?"past":"")+'" data-day="'+value+'" aria-label="'+esc(dateLabel(value+"T12:00:00Z")+(ev.length?", слотов "+ev.length:""))+'" aria-pressed="'+(value===selected)+'" '+(isPast?"disabled":"")+'><span class="num">'+d+'</span>'+tags+(ev.length>2?'<span class="more">+'+(ev.length-2)+'</span>':"")+'</button>');
  }
  const times=visible.filter(e=>day(e.at)===selected&&e.at>now);
  const listed=times.map(e=>{
    const content='<span><strong>'+time(e.at)+'</strong> · '+esc(short(e.channel))+'</span><small>'+label(e.state)+(e.state==="free"?" ↗":"")+'</small>';
    return e.state==="free"?'<button class="time-row free" data-offer="'+e.at+'" data-channel="'+e.channel+'">'+content+'</button>':'<div class="time-row">'+content+'</div>';
  }).join("");
  const soon=next?esc(full(next.at)):"Даты по запросу";
  const channelTabs=[{id:"",short:"Оба канала"},...map.values()].map(c=>'<button class="chip" data-filter="'+c.id+'" aria-pressed="'+(channel===c.id)+'">'+esc(c.short)+'</button>').join("");
  main.innerHTML=
    '<section class="hero"><div class="wrap hero-in"><div><h1>Рекламные размещения</h1><p class="intro">Выбери канал и дату или предложи своё время.</p></div><aside class="hero-aside"><span class="label">Ближайший слот</span><strong>'+soon+'</strong><span class="muted">'+(next?esc(channelName(next.channel)):"Напиши, какой день тебе удобен")+'</span><br><a href="https://t.me/kr1zzzzz" target="_blank" rel="noopener">Написать в Telegram ↗</a></aside></div></section>'+
    '<section class="wrap calendar-area"><div class="calendar-layout"><div class="card"><div class="calendar-head"><div><h2>'+esc(monthTitle)+'</h2></div><div class="controls"><button class="icon" data-shift="-1" aria-label="Предыдущий месяц" '+(month<=today().slice(0,7)?"disabled":"")+'>‹</button><button class="today" data-today>Сегодня</button><button class="icon" data-shift="1" aria-label="Следующий месяц" '+(month>=day(Date.now()+180*86400000).slice(0,7)?"disabled":"")+'>›</button></div></div><div class="channel-tabs">'+channelTabs+'</div><div class="week">'+["Пн","Вт","Ср","Чт","Пт","Сб","Вс"].map(d=>'<span>'+d+'</span>').join("")+'</div><div class="days">'+cells.join("")+'</div><div class="legend"><span><i class="dot free"></i>Свободно</span><span><i class="dot busy"></i>Занято</span><span><i class="dot"></i>Без отметки · по запросу</span></div></div>'+
    '<aside class="card side"><h2>'+esc(capital(dateLabel(selected+"T12:00:00Z")))+'</h2><div class="side-times">'+(listed||'<p class="muted">На этот день нет отмеченных слотов. Можно предложить удобное время.</p>')+'</div><button class="btn" data-offer="">Предложить размещение <span>↗</span></button><hr><a class="contact" href="https://t.me/kr1zzzzz" target="_blank" rel="noopener">Спросить в Telegram ↗</a></aside></div></section>';
}
function openOffer(at,id){
  offerAt=at||null;
  form.elements.channel.innerHTML=options(id||channel);
  form.querySelector(".feedback").textContent="";
  document.querySelector("#offer-date").textContent=(at?capital(dateLabel(at))+", "+time(at):capital(dateLabel(selected+"T12:00:00Z"))+" · время по согласованию")+" (МСК)";
  dialog.showModal();
}
dialog.querySelector(".close").addEventListener("click",()=>dialog.close());
form.addEventListener("submit",async event=>{
  event.preventDefault();
  const submit=form.querySelector('[type="submit"]'), feedback=form.querySelector(".feedback");
  const v=Object.fromEntries(new FormData(form));
  if(!offerAt) v.message="Желаемая дата: "+selected+" (МСК)\n\n"+v.message;
  v.at=offerAt;
  submit.disabled=true;
  try {await api("/api/offer",v);form.reset();dialog.close();showToast("Заявка отправлена. Ответ придёт на указанный контакт.");}
  catch(e){feedback.textContent=e.message;}
  finally{submit.disabled=false;}
});
function toUtc(value){return new Date(value+":00+03:00").toISOString();}
function futureInput(){
  const t=Date.now()+3600000;
  return day(t)+"T"+time(t);
}
function adminFormFields(){return '<div class="fields"><label>Канал<select name="channel">'+options()+'</select></label><label>Дата и время (МСК)<input type="datetime-local" name="at" required value="'+futureInput()+'"></label></div>';}
const button = (text,action,id) => '<button class="chip" data-action="'+action+'" data-id="'+esc(id)+'">'+esc(text)+'</button>';
function formattedPreview(draft){
  const text=draft.text||"";
  const custom=(draft.entities||[]).filter(e=>e.type==="custom_emoji").length;
  const marks={bold:"b",italic:"i",underline:"u",strikethrough:"s",code:"code",pre:"code",spoiler:"mark"};
  const starts=new Map(),ends=new Map();
  for(const e of draft.entities||[]){
    const tag=marks[e.type];
    if(!tag) continue;
    const stop=e.offset+e.length;
    if(!starts.has(e.offset))starts.set(e.offset,[]);
    if(!ends.has(stop))ends.set(stop,[]);
    starts.get(e.offset).push({tag,stop});ends.get(stop).push({tag,start:e.offset});
  }
  let result="";
  for(let i=0;i<=text.length;i++){
    for(const x of (ends.get(i)||[]).sort((a,b)=>b.start-a.start)) result+="</"+x.tag+">";
    for(const x of (starts.get(i)||[]).sort((a,b)=>b.stop-a.stop)) result+="<"+x.tag+">";
    if(i<text.length) result+=esc(text[i]);
  }
  const count=(draft.buttons||[]).flat().length;
  return (draft.media?'<p class="media">◈ '+kinds[draft.media.type]+' прикреплено из Telegram</p>':"")+
    (text?'<div class="preview">'+result+'</div>':"")+
    (custom||count?'<p class="muted">'+(custom?"Премиум-эмодзи: "+custom:"")+(custom&&count?" · ":"")+(count?"Кнопки: "+count:"")+'</p>':"");
}
function reportStats(report){
  const labels={views:"Просмотры",forwards:"Пересылки",reactions_total:"Реакции",comments:"Комментарии"};
  const counters=Object.entries(labels).map(([key,name])=>'<div><dt>'+name+'</dt><dd>'+
    (report.stats[key]===null?"—":new Intl.NumberFormat("ru-RU").format(report.stats[key]))+'</dd></div>').join("");
  const phase=report.stage==="before_delete"?"Замер перед удалением":"Последний сохранённый замер";
  const details=report.captured_at?phase+" · "+full(report.captured_at):"Сохранённого замера нет";
  const minutes=report.published_at?Math.max(0,Math.floor((new Date(report.deleted_at)-new Date(report.published_at))/60000)):null;
  const duration=minutes===null?"":" · "+Math.floor(minutes/60)+" ч "+minutes%60+" мин в канале";
  return '<dl class="metrics">'+counters+'</dl><small>'+esc(details+duration)+'</small>'+
    (report.error?'<small>'+esc(report.error)+'</small>':"");
}
function adminView(){
  const reports=data.reports||[];
  const names={plan:"Расписание",drafts:"Черновики",inbox:"Заявки",reports:"Статистика"};
  const tabs=Object.entries(names).map(([id,name])=>'<button data-tab="'+id+'" aria-pressed="'+(tab===id)+'">'+name+(id==="inbox"&&data.offers.some(v=>v.state==="new")?" · "+data.offers.filter(v=>v.state==="new").length:"")+'</button>').join("");
  const sync=data.sync&&Date.now()-data.sync<120000?"Бот на связи":"Бот сейчас не на связи";
  let body;
  if(tab==="plan"){
    const draftOptions=data.drafts.map(d=>'<option value="'+esc(d.id)+'" '+(activeDraft===d.id?"selected":"")+'>'+esc(d.payload.text?.slice(0,68)||kinds[d.payload.media?.type]||"Медиа")+'</option>').join("");
    const slots=data.slots.map(s=>'<li><div><strong>'+esc(full(s.at))+'</strong><small>'+esc(short(s.channel))+' · '+label(s.state)+'</small></div>'+button("Убрать","slot/remove",s.id)+'</li>').join("");
    const jobs=data.jobs.map(j=>{
      const report=reports.find(r=>r.job===j.id);
      return '<li><div><strong>'+esc(full(j.at))+'</strong><small>'+esc(short(j.channel))+' · '+
        esc(report?"Пост удалён":label(j.state))+'</small>'+(j.error?'<small>'+esc(j.error)+'</small>':"")+
        (report?'<details><summary class="muted">Статистика размещения</summary>'+reportStats(report)+'</details>':"")+'</div>'+
        (j.state==="queued"?button("Отменить","job/cancel",j.id):"")+'</li>';
    }).join("");
    body='<div class="admin-grid"><section class="card panel"><h2>Поставить пост в план</h2><p class="muted">Выбери черновик и время. Бот заберёт пост и поставит его в своё расписание.</p><form data-api="job"><label>Черновик<select name="draft" required><option value="">Выбрать…</option>'+draftOptions+'</select></label>'+adminFormFields()+'<label>Удалить после<select name="hours"><option value="24">24 часа</option><option value="12">12 часов</option><option value="48">48 часов</option><option value="72">72 часа</option><option value="168">7 дней</option><option value="0">Не удалять</option></select></label><button class="btn dark" '+(!draftOptions?"disabled":"")+'>Запланировать</button></form><ul class="panel-list">'+jobs+'</ul></section>'+
    '<section class="card panel"><h2>Слот в календаре</h2><p class="muted">Отметь, когда готов принять рекламу или когда время уже забронировано.</p><form data-api="slot">'+adminFormFields()+'<label>Статус<select name="state"><option value="free">Свободно</option><option value="busy">Занято</option></select></label><button class="btn dark">Добавить слот</button></form><ul class="panel-list">'+slots+'</ul></section></div>';
  }else if(tab==="drafts"){
    const list=data.drafts.map(d=>'<li><div><strong>'+esc(d.payload.text?.split("\n")[0].slice(0,80)||kinds[d.payload.media?.type]||"Черновик")+'</strong><small>'+esc(full(d.updated))+(d.id.startsWith("bot-")?" · Telegram · "+esc(short(d.payload.channel)):"")+'</small><details><summary class="muted">Посмотреть</summary>'+formattedPreview(d.payload)+'</details></div><div>'+button("В план","draft-plan",d.id) +(d.id.startsWith("bot-")?"":" "+button("Убрать","draft/remove",d.id))+'</div></li>').join("");
    body='<div class="admin-grid"><section class="card panel"><h2>Новый черновик</h2><p class="muted">Черновики из бота появляются здесь автоматически. Можно также вставить текст или переслать готовое сообщение с вложением.</p><a class="btn light" href="https://t.me/'+esc(data.bot)+'?start=site_import" target="_blank" rel="noopener">Перенести из Telegram ↗</a><form data-api="draft"><label>Текст поста<textarea name="text" rows="9" required maxlength="4096" placeholder="Вставь или напиши текст"></textarea></label><button class="btn dark">Сохранить черновик</button></form></section><section class="card panel"><h2>Черновики</h2><ul class="panel-list">'+(list||'<li class="muted">Пока пусто.</li>')+'</ul></section></div>';
  }else if(tab==="reports"){
    const list=reports.map(r=>'<li><div><strong>'+esc(r.title||"Пост #"+r.id)+'</strong><small>'+esc(short(r.channel))+
      ' · Удалён '+esc(full(r.deleted_at))+'</small>'+reportStats(r)+'</div></li>').join("");
    body='<section class="card panel"><h2>Статистика удалённых постов</h2><p class="muted">Отчёты появляются здесь после удаления постов ботом.</p><ul class="panel-list">'+
      (list||'<li class="muted">Пока нет отчётов.</li>')+'</ul></section>';
  }else{
    const list=data.offers.map(o=>'<li><div><strong>'+esc(o.name)+' · '+esc(short(o.channel))+'</strong><small>'+esc(o.contact)+(o.at?" · "+esc(full(o.at)):"")+'</small><p class="message">'+esc(o.message)+'</p><small>Получено '+esc(full(o.created))+'</small></div><div><span class="pill '+(o.state==="new"?"new":"")+'">'+(o.state==="new"?"Новая":"Прочитана")+'</span><br>'+button(o.state==="new"?"Прочитано":"В новые","offer-"+(o.state==="new"?"read":"new"),o.id)+'</div></li>').join("");
    body='<section class="card panel"><h2>Заявки на рекламу</h2><ul class="panel-list">'+(list||'<li class="muted">Новых заявок пока нет.</li>')+'</ul></section>';
  }
  main.innerHTML='<section class="wrap admin"><div class="admin-head"><div><h1>План размещений</h1><p class="muted">'+sync+' · время по Москве</p></div><div class="controls"><button class="btn light" data-refresh>Обновить</button><button class="chip" data-logout>Выйти</button></div></div><div class="tabs">'+tabs+'</div>'+body+'</section>';
}
async function loadAdmin(){
  data=await api("/api/owner/data");
  adminView();
}
function pastedContent(html,plain){
  const doc=new DOMParser().parseFromString(html,"text/html");
  const types={B:"bold",STRONG:"bold",I:"italic",EM:"italic",U:"underline",S:"strikethrough",DEL:"strikethrough",CODE:"code",PRE:"pre",BLOCKQUOTE:"blockquote",A:"text_link"};
  let text="";
  const entities=[];
  function walk(node){
    if(node.nodeType===3){text+=node.nodeValue;return;}
    const tag=node.nodeName;
    if(["SCRIPT","STYLE","META","IMG"].includes(tag))return;
    if(tag==="BR"){text+="\n";return;}
    const start=text.length;
    for(const child of node.childNodes)walk(child);
    const type=types[tag], url=type==="text_link"?node.getAttribute("href"):null;
    if(type&&text.length>start&&(type!=="text_link"||/^(https?:|tg:)/i.test(url||""))) entities.push({type,offset:start,length:text.length-start,...(url?{url}:{})});
    if(["P","DIV","LI","BLOCKQUOTE","PRE"].includes(tag)&&text.length&&!text.endsWith("\n")) text+="\n";
  }
  walk(doc.body);
  text=text.trimEnd();
  return text.trim()?{text,entities:entities.filter(e=>e.offset+e.length<=text.length)}:{text:plain,entities:[]};
}
let pasted=null;
main.addEventListener("paste",e=>{
  if(e.target.name!=="text" || e.target.value || !e.clipboardData?.getData("text/html"))return;
  const v=pastedContent(e.clipboardData.getData("text/html"),e.clipboardData.getData("text/plain"));
  if(v.text.length<=4096&&v.entities.length){
    e.preventDefault();e.target.value=v.text;pasted=v;
  }
});
main.addEventListener("click",async e=>{
  const b=e.target.closest("button");if(!b)return;
  const d=b.dataset;
  if(d.filter!==undefined){channel=d.filter;publicView();}
  if(d.day){selected=d.day;publicView();}
  if(d.shift){month=monthStep(Number(d.shift));selected=month===today().slice(0,7)?today():month+"-01";publicView();}
  if(d.today!==undefined){selected=today();month=selected.slice(0,7);publicView();}
  if(d.offer!==undefined)openOffer(d.offer,d.channel);
  if(d.tab){tab=d.tab;adminView();}
  if(d.logout!==undefined){
    try {await api("/api/owner/logout",{});} catch {}
    sessionStorage.removeItem("owner_token");
    location.reload();return;
  }
  if(d.refresh!==undefined){b.disabled=true;try{await loadAdmin();}catch(e){showToast(e.message);b.disabled=false;}}
  if(d.action==="draft-plan"){activeDraft=d.id;tab="plan";adminView();return;}
  if(d.action){
    b.disabled=true;
    const offer=d.action.startsWith("offer-");
    try{await api("/api/owner/"+(offer?"offer":d.action),{id:d.id,...(offer?{state:d.action.slice(6)}:{})});await loadAdmin();}
    catch(e){showToast(e.message);b.disabled=false;}
  }
});
main.addEventListener("submit",async e=>{
  const route=e.target.dataset.api;if(!route)return;
  e.preventDefault();
  const v=Object.fromEntries(new FormData(e.target));
  if(v.at)v.at=toUtc(v.at);
  if(v.hours)v.hours=Number(v.hours);
  if(route==="draft"&&pasted?.text===v.text)v.entities=pasted.entities;
  const b=e.target.querySelector("button");b.disabled=true;
  try{await api("/api/owner/"+route,v);showToast(route==="job"?"Пост добавлен в очередь":"Сохранено");pasted=null;await loadAdmin();}
  catch(e){showToast(e.message);b.disabled=false;}
});
async function start(){
  const fragment=new URLSearchParams(location.hash.slice(1));
  if(fragment.has("owner")){
    sessionStorage.setItem("owner_claim",fragment.get("owner"));
    history.replaceState(null,"",location.pathname+location.search);
  }
  const result=await api("/api/calendar");
  result.channels.forEach(c=>map.set(c.id,c));events=result.events;
  if(!new URLSearchParams(location.search).has("panel")){publicView();return;}
  const session=await api("/api/session");
  if(session.owner){await loadAdmin();return;}
  const box=html=>{main.innerHTML='<section class="wrap admin"><div class="card panel auth"><h1>Вход владельца</h1>'+html+'</div></section>'};
  box('<p class="muted">Отправь боту <b>/site</b> и вставь одноразовый код. Он действует 10 минут.</p><a class="btn light" href="https://t.me/postymoji_bot?start=site_owner" target="_blank" rel="noopener">Получить код в Telegram ↗</a><form data-claim><label>Код из Telegram<input name="code" required autocomplete="off" value="'+esc(sessionStorage.getItem("owner_claim")||"")+'"></label><button class="btn dark">Войти в панель</button></form>');
  main.querySelector("[data-claim]").addEventListener("submit",async e=>{
    e.preventDefault();const b=e.target.querySelector("button");b.disabled=true;
    try{
      const {token}=await api("/api/owner/claim",Object.fromEntries(new FormData(e.target)));
      sessionStorage.setItem("owner_token",token);
      sessionStorage.removeItem("owner_claim");
      await loadAdmin();
    } catch(e){showToast(e.message);b.disabled=false;}
  });
}
start().catch(e=>{main.innerHTML='<section class="wrap initial"><p>'+esc(e.message)+'</p><a class="btn light" href="">Обновить страницу</a></section>';});
