const peso = new Intl.NumberFormat("en-PH",{style:"currency",currency:"PHP",maximumFractionDigits:0});
 
const SERVICES = [
  {name:"Wash & Fold",   unit:"8kg",    price:180},
  {name:"Dry Cleaning",  unit:"item",  price:100},
  {name:"Ironing",       unit:"item", price:10},
  {name:"Express Service",unit:"kg",   price:120}
];
 
const SEED = {
  transactions:[],
  inventory:[
    {id:"INV-1",name:"Premium Detergent",category:"Detergent",stock:34,threshold:12,unit:"kg"},
    {id:"INV-2",name:"Softener Bloom",category:"Fabric Conditioner",stock:8,threshold:10,unit:"bottles"},
    {id:"INV-3",name:"Poly Bags",category:"Plastic Packaging",stock:200,threshold:50,unit:"pcs"}
  ]
};
 
function loadState(){
  try{
    const s=localStorage.getItem("bw2");
    return s?JSON.parse(s):JSON.parse(JSON.stringify(SEED));
  }catch{return JSON.parse(JSON.stringify(SEED));}
}
function saveState(){
  localStorage.setItem("bw2",JSON.stringify(state));
}
 
let state=loadState();
let currentUser=null;
const $=id=>document.getElementById(id);
const qs=sel=>document.querySelector(sel);
 
// ─── TOAST ──────────────────────────────────────────────────────────────────
function toast(msg,icon="✅"){
  $("toastMsg").textContent=msg;
  $("toastIcon").textContent=icon;
  $("toast").classList.add("show");
  setTimeout(()=>$("toast").classList.remove("show"),2800);
}
 
// ─── LOGIN ──────────────────────────────────────────────────────────────────
function initBubbles(){
  const wrap=$("loginBubbles");
  for(let i=0;i<12;i++){
    const s=document.createElement("span");
    const size=20+Math.random()*80;
    s.style.cssText=`width:${size}px;height:${size}px;left:${Math.random()*100}%;animation-duration:${8+Math.random()*12}s;animation-delay:${-Math.random()*10}s;`;
    wrap.appendChild(s);
  }
}
 
function setupLogin(){
  initBubbles();
  $("loginBtn").addEventListener("click",doLogin);
  $("passwordInput").addEventListener("keydown",e=>{if(e.key==="Enter")doLogin();});
}
 
function doLogin(){
  const role=$("roleSelect").value;
  const pw=$("passwordInput").value;
  const valid=(role==="admin"&&pw==="admin123")||(role==="cashier"&&pw==="1234");
  if(!valid){
    $("loginError").textContent="❌ Invalid credentials. Please try again.";
    $("passwordInput").focus();
    return;
  }
  currentUser=role;
  $("loginScreen").classList.add("hidden");
  $("appShell").classList.remove("hidden");
  $("loginError").textContent="";
  $("passwordInput").value="";
  $("userName").textContent=role==="admin"?"Admin":"Cashier";
  $("userRole").textContent=role==="admin"?"Administrator":"Cashier";
  $("userAvatar").textContent=role==="admin"?"A":"C";
  updateViewDate();
  renderDashboard();
  toast("Welcome back!","👋");
}
 
$("logoutBtn").addEventListener("click",()=>{
  currentUser=null;
  $("appShell").classList.add("hidden");
  $("loginScreen").classList.remove("hidden");
  $("roleSelect").value="admin";
  toast("Logged out","👋");
});
 
// ─── NAVIGATION ─────────────────────────────────────────────────────────────
const VIEW_TITLES={dashboard:"Dashboard",pos:"Point of Sale",inventory:"Inventory",customers:"Customers",reports:"Reports"};
 
document.querySelectorAll(".nav-link").forEach(btn=>{
  btn.addEventListener("click",()=>{
    document.querySelectorAll(".nav-link").forEach(b=>b.classList.remove("active"));
    document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
    btn.classList.add("active");
    const view=btn.dataset.view;
    document.getElementById(view+"View").classList.add("active");
    $("viewTitle").textContent=VIEW_TITLES[view];
    if(view==="dashboard")renderDashboard();
    if(view==="pos")renderTransactions();
    if(view==="inventory")renderInventory();
    if(view==="customers")renderCustomers();
    if(view==="reports")renderReports();
  });
});
 
function updateViewDate(){
  const now=new Date();
  $("viewDate").textContent=now.toLocaleDateString("en-PH",{weekday:"long",year:"numeric",month:"long",day:"numeric"});
}
 
// ─── THEME ──────────────────────────────────────────────────────────────────
$("themeToggle").addEventListener("click",()=>{
  document.body.classList.toggle("dark");
  $("themeToggle").textContent=document.body.classList.contains("dark")?"☀️":"🌙";
});
 
// ─── POS ────────────────────────────────────────────────────────────────────
function setupPOS(){
  const st=$("serviceType");
  st.innerHTML=SERVICES.map(s=>`<option value="${s.name}">${s.name} — ${peso.format(s.price)}/${s.unit}</option>`).join("");
  updateTotal();
  st.addEventListener("change",updateTotal);
  $("serviceQty").addEventListener("input",updateTotal);
  $("saveTxnBtn").addEventListener("click",saveTxn);
}
 
function updateTotal(){
  const svc=SERVICES.find(s=>s.name===$("serviceType").value);
  const qty=Math.max(1,Number($("serviceQty").value)||0);
  $("computedTotal").textContent=svc?peso.format(svc.price*qty):"₱0";
}
 
function saveTxn(){
  const name=$("customerName").value.trim();
  const contact=$("customerContact").value.trim();
  if(!name||!contact){toast("Please fill in customer details","⚠️");return;}
  const svc=SERVICES.find(s=>s.name===$("serviceType").value);
  const qty=Math.max(1,Number($("serviceQty").value));
  const txn={
    id:"BW-"+Date.now(),
    customer:name,contact,
    service:svc.name,qty,
    payment:$("paymentMethod").value,
    status:$("orderStatus").value,
    total:svc.price*qty,
    date:new Date().toISOString()
  };
  state.transactions.unshift(txn);
  saveState();
  renderTransactions();
  renderReceipt(txn);
  $("customerName").value="";
  $("customerContact").value="";
  $("serviceQty").value=1;
  updateTotal();
  toast("Transaction saved!","🧾");
}
 
function statusPill(s){
  const map={Pending:"warn","Washing":"blue","Ready for Pickup":"green","Claimed":"green"};
  return `<span class="pill pill-${map[s]||"blue"}">${s}</span>`;
}
 
function renderTransactions(){
  const tbody=$("transactionsTable");
  if(!tbody)return;
  tbody.innerHTML=state.transactions.length?state.transactions.map(t=>`
    <tr>
      <td><strong>${t.id}</strong></td>
      <td>${t.customer}</td>
      <td>${t.contact}</td>
      <td>${t.service}</td>
      <td>${t.payment}</td>
      <td>${statusPill(t.status)}</td>
      <td><strong>${peso.format(t.total)}</strong></td>
    </tr>`).join(""):`<tr><td colspan="7" style="text-align:center;color:var(--text2);padding:30px;">No transactions yet</td></tr>`;
}
 
function renderReceipt(t){
  const el=$("receiptPreview");
  el.innerHTML=`
    <div class="receipt-shop">
      <h3>🧺 BlueWash Laundry</h3>
      <p>${new Date().toLocaleString("en-PH")}</p>
    </div>
    <div class="receipt-row"><span>Receipt #</span><strong>${t.id}</strong></div>
    <div class="receipt-row"><span>Customer</span><strong>${t.customer}</strong></div>
    <div class="receipt-row"><span>Contact</span><strong>${t.contact}</strong></div>
    <div class="receipt-row"><span>Service</span><strong>${t.service}</strong></div>
    <div class="receipt-row"><span>Qty</span><strong>${t.qty}</strong></div>
    <div class="receipt-row"><span>Payment</span><strong>${t.payment}</strong></div>
    <div class="receipt-row"><span>Status</span><strong>${t.status}</strong></div>
    <div class="receipt-row total"><span>Total</span><strong>${peso.format(t.total)}</strong></div>`;
}
 
$("printReceiptBtn").addEventListener("click",()=>window.print());
 
// ─── INVENTORY ──────────────────────────────────────────────────────────────
function setupInventory(){
  $("saveInvBtn").addEventListener("click",saveInvItem);
  $("resetInventoryForm").addEventListener("click",resetInvForm);
}
 
function resetInvForm(){
  $("inventoryId").value="";
  $("itemName").value="";
  $("itemStock").value="";
  $("itemThreshold").value="";
  $("itemUnit").value="";
  $("invFormTitle").textContent="Add Item";
}
 
function saveInvItem(){
  const name=$("itemName").value.trim();
  const stock=Number($("itemStock").value);
  const threshold=Number($("itemThreshold").value);
  const unit=$("itemUnit").value.trim();
  if(!name||!unit||isNaN(stock)||isNaN(threshold)){toast("Fill all inventory fields","⚠️");return;}
  const existing=$("inventoryId").value;
  if(existing){
    const idx=state.inventory.findIndex(i=>i.id===existing);
    if(idx>=0)state.inventory[idx]={...state.inventory[idx],name,category:$("itemCategory").value,stock,threshold,unit};
  }else{
    state.inventory.push({id:"INV-"+Date.now(),name,category:$("itemCategory").value,stock,threshold,unit});
  }
  saveState();renderInventory();resetInvForm();
  toast("Inventory saved!","📦");
}
 
function renderInventory(){
  const wrap=$("inventoryCards");
  if(!wrap)return;
  wrap.innerHTML=state.inventory.map(item=>{
    const pct=Math.min(100,Math.round((item.stock/Math.max(1,item.threshold*2))*100));
    const cls=item.stock<=0?"low":item.stock<item.threshold?"warn":"good";
    return `<div class="inv-card" onclick="editInv('${item.id}')">
      <div class="inv-card-header">
        <div><div class="inv-name">${item.name}</div><div class="inv-cat">${item.category}</div></div>
        <div class="inv-stock"><strong>${item.stock}</strong><span>${item.unit}</span></div>
      </div>
      <div class="inv-bar"><div class="inv-bar-fill ${cls}" style="width:${pct}%"></div></div>
      <div class="inv-meta">
        <span>Threshold: ${item.threshold} ${item.unit}</span>
        <span class="pill pill-${cls==="good"?"green":cls==="warn"?"warn":"red"}">${cls==="good"?"In Stock":cls==="warn"?"Low Stock":"Out"}</span>
      </div>
    </div>`;
  }).join("")||`<div style="color:var(--text2);padding:20px;">No inventory items yet.</div>`;
}
 
window.editInv=function(id){
  const item=state.inventory.find(i=>i.id===id);
  if(!item)return;
  $("inventoryId").value=item.id;
  $("itemName").value=item.name;
  $("itemCategory").value=item.category;
  $("itemStock").value=item.stock;
  $("itemThreshold").value=item.threshold;
  $("itemUnit").value=item.unit;
  $("invFormTitle").textContent="Edit Item";
};
 
// ─── CUSTOMERS ──────────────────────────────────────────────────────────────
function renderCustomers(filter=""){
  const grid=$("customerList");
  if(!grid)return;
  const map={};
  state.transactions.forEach(t=>{
    if(!map[t.contact])map[t.contact]={name:t.customer,contact:t.contact,count:0,total:0};
    map[t.contact].count++;map[t.contact].total+=t.total;
  });
  let custs=Object.values(map);
  if(filter)custs=custs.filter(c=>c.name.toLowerCase().includes(filter.toLowerCase())||c.contact.includes(filter));
  grid.innerHTML=custs.length?custs.map(c=>`
    <div class="cust-card">
      <div class="cust-avatar">${c.name[0].toUpperCase()}</div>
      <div class="cust-name">${c.name}</div>
      <div class="cust-contact">📞 ${c.contact}</div>
      <div class="cust-stats">
        <div class="cust-stat"><strong>${c.count}</strong><span>Orders</span></div>
        <div class="cust-stat"><strong>${peso.format(c.total)}</strong><span>Spent</span></div>
      </div>
    </div>`).join(""):`<div style="color:var(--text2);grid-column:1/-1;padding:20px;">No customers found.</div>`;
  $("totalCustomers").textContent=Object.keys(map).length;
}
 
$("customerSearch").addEventListener("input",e=>renderCustomers(e.target.value));
 
// ─── DASHBOARD ──────────────────────────────────────────────────────────────
function renderDashboard(){
  const today=new Date().toDateString();
  const todayTxns=state.transactions.filter(t=>new Date(t.date).toDateString()===today);
  const dailyTotal=todayTxns.reduce((s,t)=>s+t.total,0);
  $("dailySales").textContent=peso.format(dailyTotal);
 
  const custMap={};
  state.transactions.forEach(t=>custMap[t.contact]=true);
  $("totalCustomers").textContent=Object.keys(custMap).length;
 
  const active=state.transactions.filter(t=>t.status==="Pending"||t.status==="Washing").length;
  $("activeOrders").textContent=active;
 
  const low=state.inventory.filter(i=>i.stock<i.threshold).length;
  $("inventoryHealth").textContent=low?"Low Stock":"Good";
  $("inventoryHealthText").textContent=low?`${low} item${low>1?"s":""} below threshold`:"All items stocked";
 
  // weekly chart
  const days=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const now=new Date();
  const weekData=Array(7).fill(0);
  state.transactions.forEach(t=>{
    const d=new Date(t.date);
    const diff=Math.floor((now-d)/(1000*60*60*24));
    if(diff<7)weekData[6-diff]+=t.total;
  });
  const max=Math.max(...weekData,1);
  $("weeklyChart").innerHTML=weekData.map((v,i)=>{
    const pct=Math.round((v/max)*100);
    const dayLabel=days[(now.getDay()-6+i+7)%7];
    return `<div class="bar-item">
      <div class="bar-val">${v>0?peso.format(v):""}</div>
      <div class="bar" style="height:${pct}%"></div>
      <div class="bar-label">${dayLabel}</div>
    </div>`;
  }).join("");
 
  // service breakdown
  const svcMap={};
  state.transactions.forEach(t=>{svcMap[t.service]=(svcMap[t.service]||0)+1;});
  const sbEl=$("serviceBreakdown");
  if(sbEl){
    const total=state.transactions.length||1;
    sbEl.innerHTML=Object.entries(svcMap).length?Object.entries(svcMap).map(([svc,cnt])=>`
      <div style="margin-bottom:14px;">
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px;">
          <span>${svc}</span><strong>${cnt}</strong>
        </div>
        <div style="height:8px;background:var(--border);border-radius:99px;overflow:hidden;">
          <div style="height:100%;width:${Math.round(cnt/total*100)}%;background:linear-gradient(90deg,var(--brand),var(--accent));border-radius:99px;"></div>
        </div>
      </div>`).join(""):`<p style="color:var(--text2);font-size:14px;padding:20px 0;">No transactions yet.</p>`;
  }
 
  // recent transactions
  const tbody=$("recentTransactions");
  if(tbody){
    tbody.innerHTML=state.transactions.slice(0,5).map(t=>`
      <tr>
        <td><strong>${t.id}</strong></td>
        <td>${t.customer}</td>
        <td>${t.service}</td>
        <td>${statusPill(t.status)}</td>
        <td><strong>${peso.format(t.total)}</strong></td>
      </tr>`).join("")||`<tr><td colspan="5" style="text-align:center;color:var(--text2);padding:24px;">No transactions yet</td></tr>`;
  }
}
 
// ─── REPORTS ────────────────────────────────────────────────────────────────
function renderReports(){
  const today=new Date();
  const todayStr=today.toDateString();
  const mo=today.getMonth();const yr=today.getFullYear();
 
  const daily=state.transactions.filter(t=>new Date(t.date).toDateString()===todayStr);
  const monthly=state.transactions.filter(t=>{const d=new Date(t.date);return d.getMonth()===mo&&d.getFullYear()===yr;});
 
  const fmt=(label,val)=>`<div class="report-stat"><span class="report-stat-label">${label}</span><span class="report-stat-val">${val}</span></div>`;
 
  $("dailyReport").innerHTML=
    fmt("Transactions",daily.length)+
    fmt("Revenue",peso.format(daily.reduce((s,t)=>s+t.total,0)))+
    fmt("Avg. Order",peso.format(daily.length?Math.round(daily.reduce((s,t)=>s+t.total,0)/daily.length):0));
 
  $("monthlyReport").innerHTML=
    fmt("Transactions",monthly.length)+
    fmt("Revenue",peso.format(monthly.reduce((s,t)=>s+t.total,0)))+
    fmt("Avg. Order",peso.format(monthly.length?Math.round(monthly.reduce((s,t)=>s+t.total,0)/monthly.length):0));
 
  const low=state.inventory.filter(i=>i.stock<i.threshold);
  $("inventoryReport").innerHTML=
    fmt("Total Items",state.inventory.length)+
    fmt("Low Stock",low.length)+
    fmt("Items OK",state.inventory.length-low.length);
 
  $("printReportBtn").onclick=()=>window.print();
}
 
// ─── INIT ────────────────────────────────────────────────────────────────────
setupLogin();
setupPOS();
setupInventory();
updateViewDate();
