const tg = window.Telegram?.WebApp;
if (tg) { tg.ready(); tg.expand(); try { tg.setHeaderColor('#090d14'); tg.setBackgroundColor('#090d14'); } catch(e){} }

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const today = new Date();
const dateKey = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const monthKey = dateKey(today).slice(0,7);
const money = n => new Intl.NumberFormat('uk-UA',{maximumFractionDigits:0}).format(Number(n||0));
const state = { goals:[], tasks:[], reports:[], transactions:[], range:'month' };
let modalMode = null, editingId = null;

function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2100)}
function empty(msg){return `<div class="empty">${msg}</div>`}
function id(){return Date.now()+Math.floor(Math.random()*1000)}
function localLoad(){try{const d=JSON.parse(localStorage.getItem('mp_data')||'{}');Object.assign(state,d)}catch(e){}}
function localSave(){
 localStorage.setItem('mp_data',JSON.stringify(state));
 // Sync the four data collections to SQLite when the app is served by the API.
 if(location.protocol.startsWith('http')) {
  ['goals','tasks','reports','transactions'].forEach(section=>{
   api(`/api/data/${section}`,{method:'PUT',body:JSON.stringify({data:state[section]})});
  });
 }
}
async function loadServerData(){
 if(!location.protocol.startsWith('http')) return;
 const result=await api('/api/data');
 if(result?.data){
  for(const section of ['goals','tasks','reports','transactions']){
   if(Array.isArray(result.data[section])) state[section]=result.data[section];
  }
  localStorage.setItem('mp_data',JSON.stringify(state));
 }
}
async function api(path, opts={}) {
  const initData = tg?.initData || '';
  try {
    const r = await fetch(path,{...opts,headers:{'Content-Type':'application/json','X-Telegram-Init-Data':initData,...(opts.headers||{})}});
    if(!r.ok) throw new Error('API unavailable');
    return await r.json();
  } catch(e){ return null; }
}
function dateHuman(d){return new Date(d+'T00:00:00').toLocaleDateString('ru-RU',{day:'numeric',month:'short'})}
function setPage(page){
  $$('.page').forEach(p=>p.classList.toggle('active',p.id===`page-${page}`));
  $$('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.page===page));
  if(page==='stats') renderStats();
  if(page==='money') renderMoney();
  if(page==='goals') renderGoals();
  if(page==='tasks') renderTasks();
  if(page==='report') renderReports();
  window.scrollTo({top:0,behavior:'smooth'});
}
$$('[data-page]').forEach(b=>b.addEventListener('click',()=>setPage(b.dataset.page)));
$$('[data-go]').forEach(b=>b.addEventListener('click',()=>setPage(b.dataset.go)));
$('#quickReport').onclick=()=>setPage('report');
$('#profileBtn').onclick=()=>toast('MY PROGRESS · Личный кабинет');

function monthReports(){return state.reports.filter(x=>x.date?.startsWith(monthKey))}
function totals(){return monthReports().reduce((a,r)=>{a.income+=+r.income||0;a.leads+=+r.leads||0;a.members+=+r.members||0;a.creatives+=+r.creatives||0;a.study+=+r.study||0;return a},{income:0,leads:0,members:0,creatives:0,study:0})}
function goalProgress(g){return Math.max(0,Math.min(100,Math.round((Number(g.current||0)/Math.max(1,Number(g.target||1)))*100)))}
function renderHome(){
 const fmt=today.toLocaleDateString('ru-RU',{weekday:'long',day:'numeric',month:'long'}).toUpperCase();
 $('#todayLabel').textContent=fmt;$('#monthLabel').textContent=today.toLocaleDateString('ru-RU',{month:'long',year:'numeric'}).toUpperCase();
 const active=state.goals.filter(g=>g.active!==false);const avg=active.length?Math.round(active.reduce((s,g)=>s+goalProgress(g),0)/active.length):0;
 $('#overallPercent').textContent=avg;$('#overallBar').style.width=avg+'%';$('#completedGoals').textContent=`${active.filter(g=>goalProgress(g)>=100).length} из ${active.length} целей выполнено`;
 const t=totals();$('#statIncome').innerHTML=`${money(t.income)} <small>₴</small>`;$('#statLeads').textContent=t.leads;$('#statMembers').textContent=t.members;$('#statCreatives').textContent=t.creatives;
 $('#goalPreview').innerHTML=active.length?active.slice(0,3).map(g=>`<div class="goal-row"><div class="goal-row-top"><span>${esc(g.title)}</span><span>${goalProgress(g)}%</span></div><div class="goal-meta">${money(g.current)} / ${money(g.target)} ${esc(g.unit||'')}</div><div class="tiny-track"><div style="width:${goalProgress(g)}%"></div></div></div>`).join(''):empty('Добавь первую цель месяца — и начни отслеживать прогресс.');
 const tasks=state.tasks.filter(t=>t.date===dateKey(today));$('#taskPreview').innerHTML=tasks.length?tasks.slice(0,4).map(taskHTML).join(''):empty('На сегодня задач пока нет. Добавь несколько конкретных действий.');
}
function taskHTML(t){return `<div class="task-row ${t.done?'done':''}" data-task="${t.id}"><button class="task-check" aria-label="Отметить">✓</button><span class="task-name">${esc(t.title)}</span><span class="task-date">${t.done?'ГОТОВО':'СЕГОДНЯ'}</span></div>`}
function bindTaskChecks(container){container.querySelectorAll('[data-task] .task-check').forEach(b=>b.onclick=()=>{const el=b.closest('[data-task]');const t=state.tasks.find(x=>x.id==el.dataset.task);if(t){t.done=!t.done;localSave();renderAll()}})}
function renderGoals(){
 const active=state.goals.filter(g=>g.active!==false),avg=active.length?Math.round(active.reduce((s,g)=>s+goalProgress(g),0)/active.length):0;
 $('#goalCount').textContent=active.length;$('#goalAverage').textContent=avg+'%';
 $('#goalsList').innerHTML=active.length?active.map(g=>`<div class="goal-card"><div class="goal-card-head"><div><div class="goal-card-title">${esc(g.title)}</div><div class="goal-card-sub">План: ${money(g.target)} ${esc(g.unit||'')}</div></div><div class="goal-card-value">${goalProgress(g)}%</div></div><div class="tiny-track"><div style="width:${goalProgress(g)}%"></div></div><div class="goal-card-sub">Текущий результат: ${money(g.current)} ${esc(g.unit||'')}</div><div class="goal-controls"><button class="small-btn" data-increment="${g.id}">＋ Добавить результат</button><button class="small-btn" data-editgoal="${g.id}">Изменить</button><button class="small-btn" data-deletegoal="${g.id}">Удалить</button></div></div>`).join(''):empty('Пока нет целей. Добавь цель с конкретным числом и единицей измерения.');
 $$('[data-increment]').forEach(b=>b.onclick=()=>{const g=state.goals.find(x=>x.id==b.dataset.increment);openModal('Добавить результат','increment',g)});
 $$('[data-editgoal]').forEach(b=>b.onclick=()=>{const g=state.goals.find(x=>x.id==b.dataset.editgoal);openModal('Редактировать цель','goal',g)});
 $$('[data-deletegoal]').forEach(b=>b.onclick=()=>{if(confirm('Удалить эту цель?')){state.goals=state.goals.filter(x=>x.id!=b.dataset.deletegoal);localSave();renderAll()}});
}
function renderTasks(){
 const tasks=state.tasks.filter(t=>t.date===dateKey(today)),done=tasks.filter(t=>t.done).length;
 $('#taskDate').textContent=today.toLocaleDateString('ru-RU',{weekday:'long',day:'numeric',month:'long'});
 $('#taskDoneCount').textContent=done;$('#taskTotalCount').textContent=tasks.length;$('#taskProgressBar').style.width=(tasks.length?done/tasks.length*100:0)+'%';
 $('#tasksList').innerHTML=tasks.length?tasks.map(t=>`${taskHTML(t)}<div class="task-controls" style="text-align:right;margin-top:-5px"><button class="small-btn" data-edittask="${t.id}">Изменить</button> <button class="small-btn" data-deltask="${t.id}">Удалить</button></div>`).join(''):empty('Добавь задачи, которые реально можешь выполнить сегодня.');
 bindTaskChecks($('#tasksList'));$$('[data-edittask]').forEach(b=>b.onclick=()=>{const t=state.tasks.find(x=>x.id==b.dataset.edittask);openModal('Изменить задачу','task',t)});$$('[data-deltask]').forEach(b=>b.onclick=()=>{state.tasks=state.tasks.filter(x=>x.id!=b.dataset.deltask);localSave();renderAll()});
}
function renderStats(){
 const t=totals();$('#chartIncome').textContent=money(t.income)+' ₴';
 const days=state.range==='week'?7:new Date(today.getFullYear(),today.getMonth()+1,0).getDate();
 const start=state.range==='week'?new Date(today.getFullYear(),today.getMonth(),today.getDate()-6):new Date(today.getFullYear(),today.getMonth(),1);
 const arr=[];for(let i=0;i<days;i++){const d=new Date(start);d.setDate(start.getDate()+i);const key=dateKey(d);const r=state.reports.find(x=>x.date===key);arr.push({key,val:+(r?.income||0),label:d.getDate()})}
 const max=Math.max(1,...arr.map(x=>x.val));$('#incomeChart').innerHTML=arr.map((x,i)=>`<div class="bar ${i===arr.length-1?'today':''}" style="height:${Math.max(3,x.val/max*100)}%" title="${x.label}: ${money(x.val)} ₴"></div>`).join('');
 $('#chartLabels').innerHTML=state.range==='week'?arr.filter((x,i)=>i%2===0||i===6).map(x=>`<span>${x.label}</span>`).join(''):`<span>1</span><span>10</span><span>20</span><span>${days}</span>`;
 $('#metricList').innerHTML=[['Лиды',t.leads],['Новые участники',t.members],['Опубликовано креативов',t.creatives],['Дней с выполненной учёбой',t.study],['Заполнено отчётов',monthReports().length]].map(x=>`<div class="metric-row"><span>${x[0]}</span><b>${x[1]}</b></div>`).join('');
 const sums=financeTotals();$('#moneyIncome').textContent=money(sums.income)+' ₴';$('#moneyExpense').textContent=money(sums.expense)+' ₴';$('#moneyBalance').textContent=money(sums.income-sums.expense)+' ₴';
}
$$('[data-range]').forEach(b=>b.onclick=()=>{$$('[data-range]').forEach(x=>x.classList.toggle('selected',x===b));state.range=b.dataset.range;renderStats()});
function financeTotals(){return state.transactions.filter(x=>x.date?.startsWith(monthKey)).reduce((a,x)=>{a[x.kind]+=+x.amount||0;return a},{income:0,expense:0})}
function renderMoney(){
 const s=financeTotals();$('#financeBalance').textContent=money(s.income-s.expense)+' ₴';$('#financeIncome').textContent=money(s.income)+' ₴';$('#financeExpense').textContent=money(s.expense)+' ₴';
 const list=state.transactions.slice().sort((a,b)=>b.date.localeCompare(a.date));$('#transactionsList').innerHTML=list.length?list.map(x=>`<div class="list-card"><div class="list-main"><b>${esc(x.category||'Операция')}</b><span>${dateHuman(x.date)} · ${esc(x.note||'Без комментария')}</span></div><div class="list-amount ${x.kind==='income'?'positive':'negative'}">${x.kind==='income'?'+':'−'}${money(x.amount)} ₴</div></div>`).join(''):empty('Операций пока нет. Добавь первый доход или расход.');
}
function renderReports(){
 const list=state.reports.slice().sort((a,b)=>b.date.localeCompare(a.date));$('#reportsList').innerHTML=list.length?list.slice(0,12).map(r=>`<div class="list-card"><div class="list-main"><b>${dateHuman(r.date)}</b><span>${r.leads||0} лидов · ${r.members||0} участников · ${r.creatives||0} креативов · Учёба: ${r.study?'да':'нет'}</span>${r.note?`<span>${esc(r.note)}</span>`:''}</div><div class="list-amount">${money(r.income)} ₴</div></div>`).join(''):empty('Отчётов ещё нет. Заполни первый отчёт выше.');
}
function openModal(title,mode,data={}){
 modalMode=mode;editingId=data.id??null;$('#modalTitle').textContent=title;
 let fields='';
 if(mode==='goal')fields=`<label>Название цели<input name="title" required maxlength="80" value="${attr(data.title||'')}" placeholder="Например, доход за месяц"></label><div class="form-row"><label>План<input name="target" type="number" min="1" required value="${data.target??''}"></label><label>Единица<input name="unit" value="${attr(data.unit||'грн')}" placeholder="грн, лиды..."></label></div><label>Текущий результат<input name="current" type="number" min="0" value="${data.current??0}"></label>`;
 if(mode==='increment')fields=`<label>Цель: ${esc(data.title||'')}<input name="amount" type="number" min="0.01" step="any" required placeholder="На сколько увеличить?"></label>`;
 if(mode==='task')fields=`<label>Название задачи<input name="title" required maxlength="120" value="${attr(data.title||'')}" placeholder="Например, подготовить креатив"></label>`;
 if(mode==='transaction')fields=`<label>Сумма, ₴<input name="amount" type="number" min="0.01" step="0.01" required placeholder="0"></label><label>Категория<input name="category" required value="${attr(data.category||'')}" placeholder="Работа, питание, транспорт..."></label><label>Комментарий<input name="note" value="${attr(data.note||'')}" placeholder="Необязательно"></label>`;
 $('#modalFields').innerHTML=fields;$('#modal').classList.add('open');
}
function closeModal(){$('#modal').classList.remove('open');modalMode=null;editingId=null}
$('#closeModal').onclick=closeModal;$('#modal').onclick=e=>{if(e.target.id==='modal')closeModal()};
$('#addGoalBtn').onclick=()=>openModal('Новая цель','goal');$('#addTaskBtn').onclick=()=>openModal('Новая задача','task');
$('#addIncomeBtn').onclick=()=>openModal('Добавить доход','transaction',{kind:'income'});$('#addExpenseBtn').onclick=()=>openModal('Добавить расход','transaction',{kind:'expense'});
$('#modalForm').onsubmit=e=>{
 e.preventDefault();const f=Object.fromEntries(new FormData(e.target).entries());
 if(modalMode==='goal'){const obj={id:editingId||id(),title:f.title,target:+f.target,unit:f.unit,current:+f.current||0,active:true};if(editingId)state.goals=state.goals.map(x=>x.id===editingId?obj:x);else state.goals.push(obj)}
 if(modalMode==='increment'){const g=state.goals.find(x=>x.id===editingId);if(g)g.current=(+g.current||0)+(+f.amount||0)}
 if(modalMode==='task'){const obj={id:editingId||id(),title:f.title,date:dateKey(today),done:false};if(editingId)state.tasks=state.tasks.map(x=>x.id===editingId?{...x,...obj}:x);else state.tasks.push(obj)}
 if(modalMode==='transaction')state.transactions.push({id:id(),kind:modalMode==='transaction'?(eventSubmitKind||'income'):'income',amount:+f.amount,category:f.category,note:f.note,date:dateKey(today)});
 localSave();closeModal();renderAll();toast('Сохранено');
};
let eventSubmitKind='income';
$('#addIncomeBtn').onclick=()=>{eventSubmitKind='income';openModal('Добавить доход','transaction')};
$('#addExpenseBtn').onclick=()=>{eventSubmitKind='expense';openModal('Добавить расход','transaction')};
$('#reportForm').onsubmit=e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target).entries());const obj={date:dateKey(today),income:+f.income||0,leads:+f.leads||0,members:+f.members||0,creatives:+f.creatives||0,study:+f.study,note:f.note||''};const i=state.reports.findIndex(x=>x.date===obj.date);if(i>=0)state.reports[i]=obj;else state.reports.push(obj);localSave();renderAll();toast('Отчёт за день сохранён ✓')};
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function attr(s){return esc(s).replace(/`/g,'&#96;')}
function renderAll(){renderHome();renderGoals();renderTasks();renderStats();renderMoney();renderReports();bindTaskChecks($('#taskPreview'))}
localLoad();loadServerData().then(renderAll);
