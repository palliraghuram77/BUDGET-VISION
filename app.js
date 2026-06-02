// ══════════════════════════════════════════════════════
//  BUDGET VISION — App Logic (Google Auth version)
// ══════════════════════════════════════════════════════

const CATEGORIES = [
  { id:'housing',       label:'Rent / Housing',   emoji:'🏠', color:'#1A73E8', bg:'rgba(26,115,232,.12)',  type:'need' },
  { id:'food',          label:'Food & Groceries',  emoji:'🛒', color:'#34A853', bg:'rgba(52,168,83,.12)',   type:'need' },
  { id:'transport',     label:'Transport',          emoji:'🚗', color:'#FBBC04', bg:'rgba(251,188,4,.12)',   type:'need' },
  { id:'health',        label:'Health & Medical',   emoji:'💊', color:'#00897B', bg:'rgba(0,137,123,.12)',   type:'need' },
  { id:'entertainment', label:'Entertainment',      emoji:'🎬', color:'#EA4335', bg:'rgba(234,67,53,.12)',   type:'want' },
  { id:'shopping',      label:'Shopping',           emoji:'🛍️', color:'#9C27B0', bg:'rgba(156,39,176,.12)',  type:'want' },
  { id:'education',     label:'Education',          emoji:'📚', color:'#FF6D00', bg:'rgba(255,109,0,.12)',   type:'need' },
  { id:'other',         label:'Other Expenses',     emoji:'📦', color:'#78909C', bg:'rgba(120,144,156,.12)', type:'want' },
];

const CAT_KEYWORDS = {
  food:['lunch','dinner','breakfast','food','restaurant','cafe','coffee','tea','pizza','burger','swiggy','zomato','blinkit','zepto','snack','meal','eat','grocery','groceries','vegetables','milk','bread','rice','dal','sabzi','chai','biryani','dosa','idli','paratha','maggi','noodles','fruits','juice','ice cream','sweet','mithai','bakery','water bottle'],
  housing:['rent','electricity','electric','power bill','water bill','gas bill','maintenance','wifi','internet','broadband','society','flat','house','home','pg','hostel','cable','dth','insurance'],
  transport:['uber','ola','bus','metro','auto','rickshaw','petrol','fuel','diesel','taxi','cab','train','flight','travel','commute','rapido','bike','toll','parking'],
  health:['medicine','doctor','hospital','medical','pharmacy','gym','yoga','health','clinic','tablet','diagnostic','lab test','blood test','dentist','optician','protein','supplement'],
  entertainment:['movie','netflix','spotify','prime','hotstar','concert','game','gaming','party','outing','fun','park','theatre','cinema','pvr','inox','bowling','club','bar','disney','youtube premium','ott'],
  shopping:['amazon','flipkart','myntra','clothes','shirt','pant','shoes','mall','shopping','purchase','bought','buy','meesho','ajio','nykaa','purse','bag','watch','jewellery','gift','dress','jeans'],
  education:['book','course','fees','school','college','tuition','class','udemy','coursera','study','exam','stationery','pen','notebook','coaching'],
};

let income = 0, expenses = {}, chart = null, dailyLogs = [], selectedCatOverride = null;
CATEGORIES.forEach(c => { expenses[c.id] = 0; });

// ── Format ─────────────────────────────────────────────
function fmt(n){ if(n>=100000) return '₹'+(n/100000).toFixed(1)+'L'; if(n>=1000) return '₹'+(n/1000).toFixed(1)+'K'; return '₹'+Math.round(n).toLocaleString('en-IN'); }
function fmtFull(n){ return '₹'+Math.round(n).toLocaleString('en-IN'); }

// ── Theme ──────────────────────────────────────────────
function setTheme(val){
  document.documentElement.setAttribute('data-theme', val);
  localStorage.setItem('budget_theme', val);
  document.querySelectorAll('.theme-opt').forEach(b => b.classList.toggle('active', b.dataset.val === val));
}
(function initTheme(){ setTheme(localStorage.getItem('budget_theme')||'auto'); })();

// ── Called by firebase-init.js after Google login ──────
window.showAppForUser = function(user) {
  const name  = user.displayName || 'User';
  const email = user.email || '';
  const photo = user.photoURL || null;
  const uid   = user.uid;

  // Hide login, show app
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('main-app').classList.remove('hidden');

  // Set greeting
  const h = new Date().getHours();
  document.getElementById('greeting-time').textContent = h<12?'morning':h<17?'afternoon':'evening';
  document.getElementById('topbar-month').textContent  = new Date().toLocaleDateString('en-IN',{month:'short',year:'numeric'});

  // Set user info
  document.getElementById('topbar-username').textContent      = name.split(' ')[0]; // first name
  document.getElementById('profile-name-display').textContent = name;
  document.getElementById('profile-email-display').textContent = email;

  // Profile photo from Google
  const avatarEl  = document.getElementById('topbar-avatar');
  const profileEl = document.getElementById('profile-photo-display');
  if(photo){
    avatarEl.innerHTML  = `<img src="${photo}" alt="${name}" referrerpolicy="no-referrer" />`;
    profileEl.innerHTML = `<img src="${photo}" alt="${name}" referrerpolicy="no-referrer" />`;
  } else {
    const initials = name.charAt(0).toUpperCase();
    avatarEl.textContent  = initials;
    profileEl.textContent = initials;
  }

  // Load user-specific data using UID as key
  loadUserData(uid);
  buildCategories();
  buildCatChips();
  if(!chart) initChart();
  loadDailyLogs(uid);
  update();
};

// ── User data persistence (per Google UID) ─────────────
function getUserKey(suffix){
  const uid = window.currentUser?.uid || 'guest';
  return `bv_${uid}_${suffix}`;
}

function loadUserData(uid){
  const saved = localStorage.getItem(`bv_${uid}_income`);
  if(saved){ income = parseFloat(saved)||0; document.getElementById('income-input').value = income||''; }
  const savedExp = localStorage.getItem(`bv_${uid}_expenses`);
  if(savedExp){
    const parsed = JSON.parse(savedExp);
    Object.assign(expenses, parsed);
    CATEGORIES.forEach(cat=>{
      const inp = document.getElementById(`inp-${cat.id}`);
      if(inp && expenses[cat.id]) inp.value = expenses[cat.id];
    });
  }
}

function saveUserData(){
  const uid = window.currentUser?.uid || 'guest';
  localStorage.setItem(`bv_${uid}_income`, income);
  localStorage.setItem(`bv_${uid}_expenses`, JSON.stringify(expenses));
}

// ── Tab Switch ─────────────────────────────────────────
function switchTab(tab){
  document.querySelectorAll('.tab-content').forEach(el=>el.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('tab-'+tab).classList.add('active');
  document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
}

// ── Category Chips (Daily override) ───────────────────
function buildCatChips(){
  document.getElementById('cat-chips').innerHTML = CATEGORIES.map(c=>
    `<button class="cat-chip" data-id="${c.id}" onclick="selectCatOverride('${c.id}')">${c.emoji} ${c.label}</button>`
  ).join('');
}

function selectCatOverride(id){
  selectedCatOverride = selectedCatOverride===id ? null : id;
  document.querySelectorAll('.cat-chip').forEach(b=>b.classList.toggle('selected', b.dataset.id===selectedCatOverride));
  if(selectedCatOverride) updateDetectedBadge(selectedCatOverride);
}

// ── Auto detect category ───────────────────────────────
function detectCategory(text){
  const lower = text.toLowerCase();
  for(const [catId,kws] of Object.entries(CAT_KEYWORDS)){
    if(kws.some(kw=>lower.includes(kw))) return catId;
  }
  return 'other';
}

function extractAmount(text){
  const patterns=[/₹\s*(\d+(?:\.\d+)?)/,/rs\.?\s*(\d+(?:\.\d+)?)/i,/(\d+(?:\.\d+)?)\s*(?:rupees?|rs\.?|₹)/i,/(?:for|paid|spent|costing?|worth|at)\s+(?:₹|rs\.?)?\s*(\d+(?:\.\d+)?)/i,/(\d{2,}(?:\.\d+)?)/];
  for(const p of patterns){ const m=text.match(p); if(m) return parseFloat(m[1]); }
  return 0;
}

function updateDetectedBadge(catId){
  const cat=CATEGORIES.find(c=>c.id===catId);
  const badge=document.getElementById('detected-badge');
  if(!badge||!cat) return;
  badge.textContent=cat.emoji+' '+cat.label;
  badge.style.background=cat.bg;
  badge.style.color=cat.color;
}

// Live detection
const descEl=document.getElementById('daily-desc');
const amountEl=document.getElementById('daily-amount');
if(descEl){
  descEl.addEventListener('input',()=>{
    if(selectedCatOverride) return;
    const catId=detectCategory(descEl.value);
    const amount=extractAmount(descEl.value);
    updateDetectedBadge(catId);
    if(amount>0&&!amountEl.value) amountEl.value=amount;
  });
}

// ── Add Daily Expense ──────────────────────────────────
function addDailyExpense(){
  const desc=document.getElementById('daily-desc').value.trim();
  const amount=parseFloat(document.getElementById('daily-amount').value)||extractAmount(desc);
  if(!desc){ alert('Please describe what you spent on.'); return; }
  if(!amount||amount<=0){ alert('Please enter a valid amount.'); return; }
  const catId=selectedCatOverride||detectCategory(desc);
  const uid=window.currentUser?.uid||'guest';
  const entry={id:Date.now(),desc,amount,catId,timestamp:new Date().toISOString()};
  dailyLogs.unshift(entry);
  saveDailyLogs(uid);
  expenses[catId]=(expenses[catId]||0)+amount;
  const inp=document.getElementById(`inp-${catId}`);
  if(inp) inp.value=expenses[catId];
  saveUserData();
  document.getElementById('daily-desc').value='';
  document.getElementById('daily-amount').value='';
  selectedCatOverride=null;
  document.querySelectorAll('.cat-chip').forEach(b=>b.classList.remove('selected'));
  const badge=document.getElementById('detected-badge');
  badge.textContent='—'; badge.style.background=''; badge.style.color='';
  renderDailyList();
  renderWeekSummary();
  update();
}

function deleteDailyEntry(id){
  const entry=dailyLogs.find(e=>e.id===id); if(!entry) return;
  expenses[entry.catId]=Math.max(0,(expenses[entry.catId]||0)-entry.amount);
  const inp=document.getElementById(`inp-${entry.catId}`);
  if(inp) inp.value=expenses[entry.catId]||'';
  dailyLogs=dailyLogs.filter(e=>e.id!==id);
  const uid=window.currentUser?.uid||'guest';
  saveDailyLogs(uid);
  saveUserData();
  renderDailyList();
  renderWeekSummary();
  update();
}

function saveDailyLogs(uid){ localStorage.setItem(`bv_${uid}_daily`, JSON.stringify(dailyLogs)); }

function loadDailyLogs(uid){
  const saved=localStorage.getItem(`bv_${uid}_daily`);
  if(saved){ dailyLogs=JSON.parse(saved); }
  else { dailyLogs=[]; }
  renderDailyList();
  renderWeekSummary();
}

function renderDailyList(){
  const listEl=document.getElementById('daily-list');
  const totalEl=document.getElementById('daily-total');
  if(!listEl) return;
  const today=new Date().toDateString();
  const todayEntries=dailyLogs.filter(e=>new Date(e.timestamp).toDateString()===today);
  const todayTotal=todayEntries.reduce((s,e)=>s+e.amount,0);
  if(totalEl) totalEl.textContent=fmt(todayTotal)+' today';
  if(todayEntries.length===0){ listEl.innerHTML='<div class="insight-empty">No expenses logged today</div>'; return; }
  listEl.innerHTML=todayEntries.map(e=>{
    const cat=CATEGORIES.find(c=>c.id===e.catId)||CATEGORIES[7];
    const time=new Date(e.timestamp).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'});
    return `<div class="daily-item">
      <div class="daily-item-icon" style="background:${cat.bg}">${cat.emoji}</div>
      <div class="daily-item-body">
        <div class="daily-item-desc">${e.desc}</div>
        <div class="daily-item-meta">
          <span class="daily-item-cat" style="background:${cat.bg};color:${cat.color}">${cat.label}</span>
          <span class="daily-item-time">${time}</span>
        </div>
      </div>
      <div class="daily-item-amount">-${fmtFull(e.amount)}</div>
      <button class="daily-item-delete" onclick="deleteDailyEntry(${e.id})">×</button>
    </div>`;
  }).join('');
}

function renderWeekSummary(){
  const listEl=document.getElementById('week-list');
  const totalEl=document.getElementById('week-total');
  if(!listEl) return;
  const days=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const today=new Date(); const rows=[]; let weekTotal=0;
  for(let i=6;i>=0;i--){
    const d=new Date(today); d.setDate(today.getDate()-i);
    const ds=d.toDateString();
    const name=i===0?'Today':i===1?'Yesterday':days[d.getDay()];
    const amt=dailyLogs.filter(e=>new Date(e.timestamp).toDateString()===ds).reduce((s,e)=>s+e.amount,0);
    weekTotal+=amt;
    if(amt>0) rows.push({name,amt});
  }
  if(totalEl) totalEl.textContent=fmt(weekTotal);
  listEl.innerHTML=rows.length===0
    ?'<div class="insight-empty">No expenses this week</div>'
    :rows.map(r=>`<div class="week-day-row"><span class="week-day-name">${r.name}</span><span class="week-day-amount">${fmtFull(r.amt)}</span></div>`).join('');
}

// ── Build Categories ───────────────────────────────────
function buildCategories(){
  document.getElementById('categories-list').innerHTML=CATEGORIES.map(cat=>`
    <div class="cat-item">
      <div class="cat-icon-wrap" style="background:${cat.bg}">${cat.emoji}</div>
      <div class="cat-body">
        <div class="cat-name">${cat.label}</div>
        <div class="cat-bar-row">
          <div class="cat-bar-bg"><div class="cat-bar-fill" id="bar-${cat.id}" style="background:${cat.color}"></div></div>
          <div class="cat-pct-label" id="pct-${cat.id}">0%</div>
        </div>
      </div>
      <div class="cat-input-wrap">
        <span class="cat-curr">₹</span>
        <input type="number" class="cat-input" id="inp-${cat.id}" placeholder="0" min="0" inputmode="numeric" />
      </div>
    </div>`).join('');
  CATEGORIES.forEach(cat=>{
    document.getElementById(`inp-${cat.id}`).addEventListener('input',e=>{
      expenses[cat.id]=parseFloat(e.target.value)||0;
      saveUserData();
      update();
    });
  });
}

// ── Chart ──────────────────────────────────────────────
function initChart(){
  const ctx=document.getElementById('donut-chart').getContext('2d');
  chart=new Chart(ctx,{
    type:'doughnut',
    data:{labels:CATEGORIES.map(c=>c.label),datasets:[{data:CATEGORIES.map(()=>1),backgroundColor:CATEGORIES.map(c=>c.color+'30'),borderColor:CATEGORIES.map(c=>c.color+'60'),borderWidth:2,hoverOffset:6}]},
    options:{cutout:'74%',responsive:true,animation:{duration:500},plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>` ${ctx.label}: ${fmtFull(ctx.raw)}`},backgroundColor:'rgba(32,33,36,.95)',borderColor:'#3C4043',borderWidth:1,titleColor:'#E8EAED',bodyColor:'#9AA0A6',padding:12,cornerRadius:12}}}
  });
}

function updateChart(total){
  const vals=CATEGORIES.map(c=>expenses[c.id]||0);
  const has=vals.some(v=>v>0);
  chart.data.datasets[0].data=has?vals:CATEGORIES.map(()=>1);
  chart.data.datasets[0].backgroundColor=has?CATEGORIES.map(c=>c.color+'CC'):CATEGORIES.map(c=>c.color+'18');
  chart.data.datasets[0].borderColor=has?CATEGORIES.map(c=>c.color):CATEGORIES.map(()=>'#3C4043');
  chart.update('active');
  const pct=income>0?Math.round((total/income)*100):0;
  document.getElementById('chart-pct').textContent=pct+'%';
  document.getElementById('total-badge').textContent=fmt(total)+' total';
  document.getElementById('chart-legend').innerHTML=CATEGORIES.filter(c=>expenses[c.id]>0).sort((a,b)=>expenses[b.id]-expenses[a.id]).slice(0,5).map(c=>{
    const p=total>0?((expenses[c.id]/total)*100).toFixed(0):0;
    return `<div class="legend-row"><div class="legend-dot" style="background:${c.color}"></div><div class="legend-name">${c.label}</div><div class="legend-amount">${fmt(expenses[c.id])}</div><div class="legend-pct">${p}%</div></div>`;
  }).join('');
}

function updateHero(total){
  const rem=income-total, sr=income>0?Math.max((rem/income)*100,0):0;
  document.getElementById('hs-spent').textContent=fmt(total);
  document.getElementById('hs-left').textContent=fmt(Math.max(rem,0));
  document.getElementById('hs-rate').textContent=sr.toFixed(0)+'%';
}

function updateBars(){
  CATEGORIES.forEach(cat=>{
    const pct=income>0?Math.min(((expenses[cat.id]||0)/income)*100,100):0;
    document.getElementById(`bar-${cat.id}`).style.width=pct+'%';
    document.getElementById(`pct-${cat.id}`).textContent=pct.toFixed(0)+'%';
  });
}

function updateInsights(total){
  const listEl=document.getElementById('insights-list');
  if(income===0){ listEl.innerHTML='<div class="insight-empty">Add income and expenses to see insights</div>'; document.getElementById('insight-count').textContent='0'; return; }
  const rem=income-total, sr=(rem/income)*100, ins=[];
  if(rem<0) ins.push({t:'danger',i:'🚨',m:`Overspending by ${fmtFull(Math.abs(rem))}!`});
  if(sr>=30) ins.push({t:'success',i:'🌟',m:`Saving ${sr.toFixed(0)}% — outstanding!`});
  else if(sr>=20) ins.push({t:'success',i:'✅',m:`On track! Saving ${sr.toFixed(0)}%.`});
  else if(sr>0) ins.push({t:'warning',i:'💡',m:`Only ${sr.toFixed(0)}% saved. Aim for 20%.`});
  const hp=income>0&&expenses.housing?(expenses.housing/income)*100:0;
  if(hp>40) ins.push({t:'warning',i:'🏠',m:`Rent is ${hp.toFixed(0)}% of income. Keep under 30%.`});
  const ep=income>0&&expenses.entertainment?(expenses.entertainment/income)*100:0;
  if(ep>15) ins.push({t:'warning',i:'🎬',m:`Entertainment at ${ep.toFixed(0)}% is high.`});
  if(dailyLogs.length>0) ins.push({t:'info',i:'📝',m:`${dailyLogs.length} daily expense${dailyLogs.length>1?'s':''} logged.`});
  if(ins.length===0&&total>0) ins.push({t:'success',i:'🎯',m:'Great balance! Keep tracking monthly.'});
  document.getElementById('insight-count').textContent=ins.length;
  const cls={success:'ins-success',warning:'ins-warning',danger:'ins-danger',info:'ins-info'};
  listEl.innerHTML=ins.map(i=>`<div class="insight-item ${cls[i.t]}"><span class="insight-icon">${i.i}</span><span>${i.m}</span></div>`).join('');
}

function updateRule(total){
  const needs=['housing','food','transport','health','education'].reduce((s,id)=>s+(expenses[id]||0),0);
  const wants=['entertainment','shopping','other'].reduce((s,id)=>s+(expenses[id]||0),0);
  const savings=Math.max(income-total,0);
  const np=income>0?(needs/income)*100:0, wp=income>0?(wants/income)*100:0, sp=income>0?(savings/income)*100:0;
  document.getElementById('rule-status').textContent=income>0?((np<=52&&wp<=32&&sp>=18)?'✅ On track':'⚠️ Needs work'):'—';
  const rows=[{label:'Needs',tag:'Housing, Food, Transport…',target:50,pct:np,color:'#1A73E8'},{label:'Wants',tag:'Entertainment, Shopping…',target:30,pct:wp,color:'#9C27B0'},{label:'Savings',tag:'What you keep',target:20,pct:sp,color:'#34A853'}];
  document.getElementById('rule-rows').innerHTML=rows.map(r=>{
    const over=r.label!=='Savings'&&r.pct>r.target, fill=over?'#EA4335':r.color;
    return `<div class="rule-row"><div class="rule-row-header"><div class="rule-row-label">${r.label}<span class="rule-type-tag">${r.tag}</span></div><div class="rule-row-nums"><span style="color:${fill}">${r.pct.toFixed(0)}%</span> / ${r.target}%</div></div><div class="rule-bar-bg"><div class="rule-bar-fill" style="width:${Math.min(r.pct,100)}%;background:${fill}"></div><div class="rule-marker-line" style="left:${r.target}%"></div></div></div>`;
  }).join('');
}

function updateProfileStats(total){
  const rem=income-total;
  if(document.getElementById('ps-income')){
    document.getElementById('ps-income').textContent=fmtFull(income);
    document.getElementById('ps-spent').textContent=fmtFull(total);
    document.getElementById('ps-saved').textContent=fmtFull(Math.max(rem,0));
    document.getElementById('ps-daily-count').textContent=dailyLogs.length;
  }
}

function update(){
  const total=CATEGORIES.reduce((s,c)=>s+(expenses[c.id]||0),0);
  updateHero(total); updateChart(total); updateBars();
  updateInsights(total); updateRule(total); updateProfileStats(total);
}

document.getElementById('income-input').addEventListener('input',e=>{
  income=parseFloat(e.target.value)||0;
  saveUserData();
  update();
});

if('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js'));
