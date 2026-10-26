/* ====== الإعدادات الأساسية ====== */
const CATEGORIES = [
  "تسويقة الأسبوع","سمك ولحمة","مستلزمات البيت","باقات شخصية","باقات العائلة",
  "كهرباء","علاج","ملابس","عناية شخصية","اكل سكن","مواصلات","اشتراكات","خروجات","أقساط"
];
const STORE_KEY = "masrofati-data-v1";
const THEME_KEY = "masrofati-theme";

let data = loadData(); // { transactions: [{id,type,category,desc,amount,date}] }

/* ====== الأدوات ====== */
function loadData(){
  try{ return JSON.parse(localStorage.getItem(STORE_KEY)) || {transactions:[]}; }
  catch{ return {transactions:[]}; }
}
function saveData(){ localStorage.setItem(STORE_KEY, JSON.stringify(data)); }
function fmt(n){ return Number(n).toLocaleString("ar-EG",{maximumFractionDigits:2}) + " ج.م"; }
function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
function currentMonth(){ return new Date().toISOString().slice(0,7); }

/* ====== فلتر الشهر ====== */
const monthFilter = document.getElementById("monthFilter");
monthFilter.value = currentMonth();

/* تعبئة قائمة البنود */
const expCategory = document.getElementById("expCategory");
expCategory.innerHTML = CATEGORIES.map(c=>`<option value="${c}">${c}</option>`).join("");

/* التبويبات */
document.querySelectorAll(".tab-btn").forEach(btn=>{
  btn.addEventListener("click",()=>{
    document.querySelectorAll(".tab-btn").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("expenseForm").classList.toggle("hidden", btn.dataset.tab!=="expense");
    document.getElementById("incomeForm").classList.toggle("hidden", btn.dataset.tab!=="income");
  });
});

/* الوضع الليلي */
const btnTheme = document.getElementById("btnTheme");
if(localStorage.getItem(THEME_KEY)==="dark"){ document.body.classList.add("dark"); btnTheme.textContent="☀️"; }
btnTheme.addEventListener("click",()=>{
  document.body.classList.toggle("dark");
  const dark = document.body.classList.contains("dark");
  btnTheme.textContent = dark ? "☀️" : "🌙";
  localStorage.setItem(THEME_KEY, dark?"dark":"light");
  renderChart();
});

/* التواريخ الافتراضية */
document.getElementById("expDate").value = new Date().toISOString().slice(0,10);
document.getElementById("incDate").value = new Date().toISOString().slice(0,10);

/* ====== الإضافة ====== */
document.getElementById("expenseForm").addEventListener("submit",e=>{
  e.preventDefault();
  data.transactions.push({
    id:uid(), type:"expense",
    category:expCategory.value,
    desc:document.getElementById("expDesc").value.trim(),
    amount:parseFloat(document.getElementById("expAmount").value),
    date:document.getElementById("expDate").value
  });
  document.getElementById("expDesc").value="";
  document.getElementById("expAmount").value="";
  saveData(); renderAll();
});

document.getElementById("incomeForm").addEventListener("submit",e=>{
  e.preventDefault();
  data.transactions.push({
    id:uid(), type:"income",
    category:"دخل",
    desc:document.getElementById("incDesc").value.trim() || "دخل",
    amount:parseFloat(document.getElementById("incAmount").value),
    date:document.getElementById("incDate").value
  });
  document.getElementById("incDesc").value="";
  document.getElementById("incAmount").value="";
  saveData(); renderAll();
});

/* ====== العرض ====== */
function monthTransactions(){
  const m = monthFilter.value;
  return data.transactions.filter(t=>t.date && t.date.startsWith(m));
}

function renderAll(){
  const txs = monthTransactions();
  const income = txs.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0);
  const expense = txs.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0);
  const remaining = income - expense;

  document.getElementById("totalIncome").textContent = fmt(income);
  document.getElementById("totalExpense").textContent = fmt(expense);
  document.getElementById("remaining").textContent = fmt(remaining);

  const hint = document.getElementById("remainingHint");
  if(income===0 && expense===0){ hint.textContent="لا توجد بيانات لهذا الشهر"; }
  else if(remaining<0){ hint.textContent="⚠️ مصروفاتك أكبر من دخلك!"; hint.style.color="var(--expense)"; }
  else if(remaining===0 && income>0){ hint.textContent="💪 ادّخر شيئًا إن استطعت"; hint.style.color="var(--muted)"; }
  else if(income>0){ hint.textContent="وفّرت " + Math.round(remaining/income*100) + "% من دخلك 👏"; hint.style.color="var(--income)"; }
  else { hint.textContent=""; }

  renderCatList(txs);
  renderChart();
  renderLog(txs);
}

/* إجمالي كل بند */
function renderCatList(txs){
  const totals = {};
  txs.filter(t=>t.type==="expense").forEach(t=>{ totals[t.category]=(totals[t.category]||0)+t.amount; });
  const max = Math.max(1,...Object.values(totals));
  const wrap = document.getElementById("catList");
  const entries = Object.entries(totals).sort((a,b)=>b[1]-a[1]);
  if(!entries.length){ wrap.innerHTML='<p style="color:var(--muted)">لا توجد مصروفات بعد 🎉</p>'; return; }
  wrap.innerHTML = entries.map(([cat,val])=>`
    <div class="cat-item">
      <span class="name">${cat}</span>
      <div class="bar" style="width:${Math.max(4,val/max*100)}%"></div>
      <span class="val">${fmt(val)}</span>
    </div>`).join("");
}

/* المخطط */
let chart;
function renderChart(){
  const txs = monthTransactions();
  const totals = {};
  txs.filter(t=>t.type==="expense").forEach(t=>{ totals[t.category]=(totals[t.category]||0)+t.amount; });
  const dark = document.body.classList.contains("dark");
  const ctx = document.getElementById("chart").getContext("2d");
  if(chart) chart.destroy();
  chart = new Chart(ctx,{
    type:"doughnut",
    data:{
      labels:Object.keys(totals),
      datasets:[{ data:Object.values(totals),
        backgroundColor:["#2563eb","#dc2626","#059669","#d97706","#7c3aed","#0891b2","#db2777","#65a30d","#9333ea","#ea580c","#0d9488","#e11d48","#4f46e5","#ca8a04"],
        borderWidth:2, borderColor: dark ? "#1e293b" : "#ffffff" }]
    },
    options:{
      plugins:{
        legend:{ position:"left", labels:{ color: dark?"#f1f5f9":"#1f2937", boxWidth:14, font:{size:12} } },
        tooltip:{ callbacks:{ label:(c)=>` ${c.label}: ${fmt(c.raw)}` } }
      },
      cutout:"55%"
    }
  });
}

/* السجل */
function renderLog(txs){
  const q = document.getElementById("search").value.trim();
  const body = document.getElementById("logBody");
  let rows = [...txs].sort((a,b)=>b.date.localeCompare(a.date));
  if(q) rows = rows.filter(t=>(t.category+t.desc).includes(q));
  if(!rows.length){
    body.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:24px">لا توجد عمليات 📝</td></tr>';
    return;
  }
  body.innerHTML = rows.map(t=>`
    <tr>
      <td><span class="tag ${t.type}">${t.type==="income"?"دخل":"مصروف"}</span></td>
      <td>${t.type==="income" ? t.desc : t.category}</td>
      <td style="color:var(--muted)">${t.type==="income" ? "—" : (t.desc||"—")}</td>
      <td class="${t.type==="income"?"amount-in":"amount-out"}">${t.type==="income"?"+":"−"} ${fmt(t.amount)}</td>
      <td>${t.date}</td>
      <td><button class="del-btn" onclick="delTx('${t.id}')" title="حذف">🗑️</button></td>
    </tr>`).join("");
}

window.delTx = function(id){
  if(!confirm("متأكد من حذف العملية؟")) return;
  data.transactions = data.transactions.filter(t=>t.id!==id);
  saveData(); renderAll();
};

document.getElementById("search").addEventListener("input",()=>renderLog(monthTransactions()));
monthFilter.addEventListener("change",renderAll);

/* تصدير CSV (يفتح في Excel) */
document.getElementById("btnExport").addEventListener("click",()=>{
  const txs = monthTransactions();
  if(!txs.length){ alert("لا توجد بيانات للتصدير"); return; }
  const header = "النوع,البند/المصدر,التفاصيل,المبلغ,التاريخ";
  const lines = [...txs].sort((a,b)=>a.date.localeCompare(b.date)).map(t=>
    [t.type==="income"?"دخل":"مصروف", t.type==="income"?t.desc:t.category,
     `"${(t.desc||"").replace(/"/g,'""')}"`, t.amount, t.date].join(","));
  const csv = "\uFEFF" + header + "\n" + lines.join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
  a.download = `مصروفات-${monthFilter.value}.csv`;
  a.click();
});

document.getElementById("btnPrint").addEventListener("click",()=>window.print());

document.getElementById("btnClear").addEventListener("click",()=>{
  if(!confirm("سيتم مسح كل عمليات هذا الشهر. متأكد؟")) return;
  const m = monthFilter.value;
  data.transactions = data.transactions.filter(t=>!(t.date && t.date.startsWith(m)));
  saveData(); renderAll();
});

renderAll();
