/* ---------- Catalog comes from the server (config/catalog.json) ---------- */
let CAT,GATES,LLM_TYPES,SIZE,TIERS,SIG,MIXSHIFT,AUTO,SKIPW,EXAMPLES,SAMPLE_PLAN,ENGINE,BASE,PROFILE_FIELDS;
let CUSTOMER=null,CUSTOMERS=[];
// Effective catalog = base catalog + the selected customer's estimator overrides.
function applyCatalog(cust){
  const b=JSON.parse(JSON.stringify(BASE)),o=cust?.rules?.estimatorOverrides||{};
  for(const[t,v]of Object.entries(o.agents||{}))if(b.agents[t])Object.assign(b.agents[t],v);
  for(const[g,v]of Object.entries(o.gates||{}))if(b.gates[g])Object.assign(b.gates[g],v);
  (o.tiers||[]).forEach((v,i)=>{if(b.tiers[i]&&v)Object.assign(b.tiers[i],v)});
  Object.assign(b.sizes,o.sizes||{});
  CAT=b.agents;GATES=b.gates;TIERS=b.tiers;SIZE=b.sizes;
}
async function api(path,opts={}){
  const res=await fetch(path,{...opts,headers:{"content-type":"application/json",...(opts.headers||{})}});
  const body=await res.json().catch(()=>({}));
  if(!res.ok)throw{code:body.code||"http_"+res.status,message:body.message||`Request failed (${res.status}).`};
  return body;
}
/* ---------- Compile plan → graph (deterministic) ---------- */
const clampN=(v,a,b)=>Math.max(a,Math.min(b,v));
function sizeFor(n){return n<=8?"S":n<=20?"M":"L"}
function buildGraph(plan){
  const G=[],gateOf={},reqIds=plan.requirements.map(r=>r.id);
  const rules=(CUSTOMER?.rules?.requiredGates||[]).filter(g=>!g.onlyIfPhi||plan.flags.phi);
  const agent=(id,cat,o={})=>{const c=CAT[cat],sz=o.size||"M",f=o.factor??SIZE[sz]??1;
    return{id,kind:"agent",cat,name:o.name||c.name,role:c.role,does:c.does||"",tools:c.tools||[],phase:c.phase,tier:c.tier,size:sz,factor:f,tok:c.tok*f,hrs:c.hrs*f,risk:o.risk||c.risk,deps:o.deps||[],reqs:o.reqs||[],
      task:o.task||"",sources:o.sources||[],inputs:o.inputs?.length?o.inputs:c.inputs,outputs:o.outputs?.length?o.outputs:c.outputs,checks:o.checks?.length?o.checks:c.checks,done:o.done||c.done,ai:!!o.ai}};
  const gate=(id,def,deps,o={})=>({id,kind:"gate",custom:!!o.custom,name:def.name,after:o.after||"",phase:o.phase||"",reviewer:def.reviewer,mins:o.mins||def.mins,risk:def.risk,deps,sees:def.sees||[],approve:def.approve||"",why:def.why||""});
  const rs=sizeFor(reqIds.length);
  G.push(agent("I1","intent",{size:rs,reqs:reqIds}));
  G.push(gate("GS",GATES.scope,["I1"],{phase:"Intent"}));
  let start=["GS"];
  const sc=rules.filter(g=>g.placement==="after_scope");
  if(sc.length)start=sc.map((g,i)=>{const id="C"+(i+1);G.push(gate(id,g,["GS"],{custom:true,phase:"Intent"}));return id});
  G.push(agent("T1","test_strategy",{size:rs,deps:start,reqs:reqIds}));
  const seen=new Map(),used=new Set();let gi=1,ci=1,buildF=0,big=false;
  plan.nodes.forEach((n,i)=>{
    const id="A"+(i+1);const deps=(n.deps||[]).filter(d=>seen.has(d)).map(d=>seen.get(d));
    deps.forEach(d=>used.add(d));
    const node=agent(id,n.type,{name:n.name,size:n.size,risk:n.risk,deps:deps.length?deps.flatMap(d=>gateOf[d]||[d]):start,reqs:n.reqs,task:n.task,sources:n.sources,inputs:n.inputs,outputs:n.outputs,checks:n.checks,done:n.done,ai:true});
    G.push(node);seen.set(n.id,id);buildF+=node.factor;
    if((n.type==="backend"||n.type==="integration")&&node.factor>=2)big=true;
    const after=[],gk=CAT[n.type].gate;
    if(gk){const gid="G"+(gi++);G.push(gate(gid,GATES[gk],[id],{after:node.name,phase:node.phase}));after.push(gid)}
    rules.filter(g=>g.placement==="after_type"&&g.agentType===n.type).forEach(g=>{const gid="CG"+(ci++);G.push(gate(gid,g,[id],{custom:true,after:node.name,phase:node.phase}));after.push(gid)});
    if(after.length)gateOf[id]=after;
  });
  const sinks=[...seen.values()].filter(id=>!used.has(id)).flatMap(id=>gateOf[id]||[id]);
  G.push(agent("V1","test_runner",{factor:clampN(buildF/4,.5,3.5),size:"auto",deps:["T1",...sinks],reqs:reqIds}));
  const ver=["V2"];G.push(agent("V2","security",{deps:["V1"]}));
  const regs=plan.flags.regulations||[];
  if(plan.flags.phi||regs.length){G.push(agent("V3","compliance",{deps:["V1"],done:`${regs.length?regs.join(", "):"PHI"} controls all have passing evidence.`,reqs:plan.requirements.filter(r=>r.type==="compliance").map(r=>r.id)}));ver.push("V3")}
  if(big){G.push(agent("V4","performance",{deps:["V1"],reqs:plan.requirements.filter(r=>r.type==="non-functional").map(r=>r.id)}));ver.push("V4")}
  G.push(gate("GR",GATES.review,ver,{phase:"Verify",mins:Math.round(30+6*plan.nodes.length)}));
  G.push(agent("S1","release",{deps:["GR"]}));G.push(agent("S2","evidence",{deps:["GR"],reqs:reqIds}));
  let live=["S1","S2"];
  const br=rules.filter(g=>g.placement==="before_release");
  if(br.length)live=br.map((g,i)=>{const id="CR"+(i+1);G.push(gate(id,g,["S1","S2"],{custom:true,phase:"Ship"}));return id});
  G.push(gate("GL",GATES.golive,live,{phase:"Ship"}));
  return G;
}

/* ---------- Sources ---------- */
function srcLabel(id){
  if(id.startsWith("P:")){const f=PROFILE_FIELDS.find(x=>"P:"+x.key===id);return`Profile · ${f?f.label:id.slice(2)}`}
  const d=(PLAN?.customer?.id&&PLAN.customer.id===CUSTOMER?.id)?CUSTOMER.documents.find(x=>x.id===id):null;
  return d?`${id} · ${d.title}`:id;
}
function srcChips(list,empty="Best practice"){return list?.length?`<span class="srcs">${list.map(x=>`<span class="srcchip">${esc(srcLabel(x))}</span>`).join("")}</span>`:(empty?`<span class="srcs"><span class="srcchip bp">${empty}</span></span>`:"")}

/* ---------- Simulation ---------- */
const S={devs:2,auto:"Balanced",mix:"Balanced",seed:7,sel:null,tab:"graph"};
let PLAN=null,GRAPH=[],BY={},KIDS={},CUR=null,LAST=null;
function cfgOf(o){const a=AUTO[o.auto],sh=MIXSHIFT[o.mix];return{a,wait:5/o.devs,tier:n=>TIERS[clampN(n.tier+sh,0,2)],tierIdx:n=>clampN(n.tier+sh,0,2),skipped:n=>n.kind==="gate"&&a.skip.includes(n.risk)}}
function pRework(c){let p=.06;GRAPH.forEach(n=>{if(c.skipped(n))p+=SKIPW[n.risk];if(n.kind==="agent"){const t=c.tierIdx(n);if(t===0)p+=.012;if(t===2)p-=.006}});return clampN(p,.02,.7)}
function rng(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function simulate(o,runs,seed){
  const c=cfgOf(o),r=rng(seed),pr=pRework(c);
  const z=()=>{let u=0,v=0;while(!u)u=r();while(!v)v=r();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)};
  const ln=s=>Math.exp(s*z()-s*s/2);
  const E=[],K=[],C=[],H=[];
  for(let i=0;i<runs;i++){
    const fin={};let tok=0,hum=0,cost=0;
    for(const n of GRAPH){
      const st=n.deps.length?Math.max(...n.deps.map(d=>fin[d]??0)):0;let d=0;
      if(n.kind==="agent"){const T=c.tier(n),s=Math.max(.1,SIG[n.risk]+T.sig);d=n.hrs*T.time*ln(s);const k=n.tok*T.tok*ln(s);tok+=k;cost+=k*T.price;
        if(n.cat==="test_runner"&&r()<pr){d+=n.hrs*T.time*ln(.4);const k2=n.tok*1.1*T.tok*ln(.4);tok+=k2;cost+=k2*T.price;hum+=30}}
      else if(!c.skipped(n)){d=-Math.log(1-r())*c.wait+n.mins/60*c.a.rev;hum+=n.mins*c.a.rev}
      fin[n.id]=st+d;
    }
    E.push(Math.max(...Object.values(fin)));K.push(tok);C.push(cost);H.push(hum);
  }
  return{E,K,C,H,pr};
}
function expected(o){
  const c=cfgOf(o),fin={},pred={},dur={};
  for(const n of GRAPH){let st=0,p=null;n.deps.forEach(d=>{if((fin[d]??0)>=st){st=fin[d]??0;p=d}});
    let a=0,h=0;if(n.kind==="agent")a=n.hrs*c.tier(n).time;else if(!c.skipped(n))h=c.wait+n.mins/60*c.a.rev;
    dur[n.id]={a,h};fin[n.id]=st+a+h;pred[n.id]=p}
  let end=GRAPH.reduce((b,n)=>fin[n.id]>fin[b]?n.id:b,GRAPH[0].id);const path=[];while(end){path.unshift(end);end=pred[end]}
  let a=0,h=0;path.forEach(id=>{a+=dur[id].a;h+=dur[id].h});return{path,a,h};
}
function nodeQ(n,c){const T=c.tier(n),s=Math.max(.1,SIG[n.risk]+T.sig),q5=m=>m*Math.exp(-s*s/2),q9=m=>m*Math.exp(s*1.2816-s*s/2),tk=n.tok*T.tok,hr=n.hrs*T.time;
  return{t5:q5(tk),t9:q9(tk),h5:q5(hr),h9:q9(hr),c5:q5(tk)*T.price,tier:T.name}}
const q=(a,p)=>{const s=[...a].sort((x,y)=>x-y);return s[Math.min(s.length-1,Math.floor(p*s.length))]};
const fH=h=>h<48?`${Math.round(h)} h`:`${(h/24).toFixed(1)} d`;
const fM=m=>{m=Math.round(m);const h=Math.floor(m/60);return h?`${h}h ${String(m%60).padStart(2,"0")}m`:`${m}m`};
const fT=t=>`${t.toFixed(1)}M`;const f$=d=>`$${d<1000?Math.round(d):(d/1000).toFixed(1)+"k"}`;
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const $=id=>document.getElementById(id);

/* ---------- Layout: layers by longest path, centered on a 2×cols grid ---------- */
const GEL=$("graph");
function layout(){
  const depth={};GRAPH.forEach(n=>depth[n.id]=n.deps.length?1+Math.max(...n.deps.map(d=>depth[d]??0)):0);
  const layers=[];GRAPH.forEach(n=>(layers[depth[n.id]]=layers[depth[n.id]]||[]).push(n));
  const cap=GEL.clientWidth<560?3:4,cols=Math.min(cap,Math.max(...layers.map(l=>l.length)));
  GEL.style.gridTemplateColumns=`repeat(${cols*2},minmax(0,1fr))`;
  const xpos={};let row=1;
  layers.forEach(L=>{
    L.sort((a,b)=>{const bc=n=>n.deps.length?n.deps.reduce((s,d)=>s+(xpos[d]??0),0)/n.deps.length:0;return bc(a)-bc(b)});
    for(let i=0;i<L.length;i+=cols){const chunk=L.slice(i,i+cols),off=cols-chunk.length;
      chunk.forEach((n,j)=>{const el=$("node-"+n.id);el.style.gridRow=row;el.style.gridColumn=`${off+1+2*j} / span 2`;xpos[n.id]=(off+1+2*j)/(cols*2)});row++}
  });
}
function renderGraphShell(){
  GEL.innerHTML=`<svg class="edges" aria-hidden="true"><defs><marker id="mkN" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z"/></marker><marker id="mkC" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z"/></marker></defs><g id="edgeG"></g></svg>`;
  GRAPH.forEach(n=>{const b=document.createElement("button");b.type="button";b.className="node "+n.kind;b.id="node-"+n.id;b.onclick=()=>select(n.id,true);GEL.appendChild(b)});
  layout();
}
function paintNodes(){
  const c=cfgOf(S),crit=CUR.path;
  GRAPH.forEach(n=>{const b=$("node-"+n.id),sk=c.skipped(n);
    b.classList.toggle("skip",sk);b.classList.toggle("crit",crit.includes(n.id));b.classList.toggle("sel",S.sel===n.id);
    const tag=n.kind==="agent"?`${n.phase} · agent`:sk?"Auto-pass":n.custom?"Customer gate":"Human gate";
    const meta=n.kind==="agent"?`${fT(n.tok*c.tier(n).tok)} · ${(n.hrs*c.tier(n).time).toFixed(1)}h`:sk?"evidence only":`${n.reviewer} · ${Math.round(n.mins*c.a.rev)}m`;
    b.innerHTML=`<span class="n-top"><span class="tag">${n.ai?'<b class="ai-dot">◆</b> ':""}${tag}</span><span class="risk r-${n.risk}" title="${n.risk} risk"></span></span><span class="n-name">${esc(n.name)}</span><span class="n-meta">${meta}</span>`;
    b.setAttribute("aria-label",`${n.name}, ${tag}, ${n.risk} risk, ${meta}`);b.title=n.kind==="agent"?(n.task||n.does):`${n.reviewer}: ${n.approve}`});
}
function drawEdges(){
  if(!CUR||S.tab!=="graph")return;const g=$("edgeG");if(!g)return;const crit=CUR.path,c=cfgOf(S);let h="";
  const box=id=>{const e=$("node-"+id);return{x:e.offsetLeft,y:e.offsetTop,w:e.offsetWidth,h:e.offsetHeight}};
  GRAPH.forEach(n=>n.deps.forEach(d=>{const s=box(d),t=box(n.id),ci=crit.indexOf(d),isC=ci>-1&&crit[ci+1]===n.id;
    const off=c.skipped(BY[d])||c.skipped(n);const sx=s.x+s.w/2,sy=s.y+s.h,tx=t.x+t.w/2,ty=t.y-2,dy=ty-sy;
    h+=`<path class="${isC?"crit ":""}${off?"off":""}" d="M${sx},${sy} C${sx},${sy+dy*.55} ${tx},${ty-dy*.55} ${tx},${ty}" marker-end="url(#${isC?"mkC":"mkN"})"/>`}));
  g.innerHTML=h;
}
function hist(E,p50,p90){
  const lo=q(E,.005),hi=Math.max(q(E,.995),lo+1),B=28,bw=(hi-lo)/B,cnt=new Array(B).fill(0);
  E.forEach(e=>{cnt[clampN(Math.floor((e-lo)/bw),0,B-1)]++});
  const mx=Math.max(...cnt),x0=10,x1=330,y0=104,yt=18,X=v=>x0+(v-lo)/(hi-lo)*(x1-x0);let s="";
  cnt.forEach((c,i)=>{const x=x0+i*(x1-x0)/B,w=(x1-x0)/B-1.5,hh=c/mx*(y0-yt),mid=lo+(i+.5)*bw;s+=`<rect class="bar${mid<=p90?" in":""}" x="${x.toFixed(1)}" y="${(y0-hh).toFixed(1)}" width="${w.toFixed(1)}" height="${hh.toFixed(1)}" rx="1"/>`});
  s+=`<line class="base" x1="${x0}" x2="${x1}" y1="${y0}" y2="${y0}"/>`;
  const rg=hi-lo,step=rg>120?40:rg>60?20:rg>25?10:5;for(let v=Math.ceil(lo/step)*step;v<=hi;v+=step)s+=`<text class="ax" x="${X(v).toFixed(1)}" y="118" text-anchor="middle">${v}h</text>`;
  const a50=X(p50),a90=X(p90);
  s+=`<line class="pl" x1="${a50}" x2="${a50}" y1="${yt-6}" y2="${y0}"/><text class="pt" x="${a50-3}" y="${yt-8}" text-anchor="end">P50 ${Math.round(p50)}h</text>`;
  s+=`<line class="pl9" x1="${a90}" x2="${a90}" y1="${yt-6}" y2="${y0}"/><text class="pt9" x="${Math.min(a90+3,290)}" y="${yt-8}">P90 ${Math.round(p90)}h</text>`;
  $("hist").innerHTML=s;
}

/* ---------- Run ---------- */
function run(){
  const R=simulate(S,3000,S.seed),p50=q(R.E,.5),p90=q(R.E,.9);CUR=expected(S);
  const res={p50,p90,k50:q(R.K,.5),c50:q(R.C,.5)};
  $("kT").textContent=fH(p50);$("kT9").innerHTML=`P90 <b>${fH(p90)}</b> · agents run 24×7`;
  $("kK").textContent=fT(res.k50);$("kK9").innerHTML=`P90 <b>${fT(q(R.K,.9))}</b>`;
  $("kC").textContent=f$(res.c50);$("kC9").innerHTML=`P90 <b>${f$(q(R.C,.9))}</b>`;
  const c=cfgOf(S),gates=GRAPH.filter(n=>n.kind==="gate"),active=gates.filter(n=>!c.skipped(n)).length;
  $("kH").textContent=fM(q(R.H,.5));$("kH9").innerHTML=`<b>${active} of ${gates.length}</b> gates human · rework ${Math.round(R.pr*100)}%`;
  hist(R.E,p50,p90);
  const tot=CUR.a+CUR.h||1;$("spA").style.width=(CUR.a/tot*100)+"%";$("spH").style.width=(CUR.h/tot*100)+"%";
  $("spAl").textContent=`Agents working ${Math.round(CUR.a)}h`;$("spHl").textContent=`People: wait + review ${Math.round(CUR.h)}h`;
  $("autoNote").textContent={Guarded:"every gate human",Balanced:"low-risk gates auto-pass",Bold:"only high-risk gates human"}[S.auto];
  $("mixNote").textContent={"Cost-first":"one tier cheaper","Balanced":"catalog tiers","Quality-first":"one tier stronger"}[S.mix];
  let v=`People account for ${Math.round(CUR.h/tot*100)}% of the critical path. `;
  if(S.devs<4){const R2=simulate({...S,devs:S.devs+1},1200,S.seed+1),gain=p50-q(R2.E,.5);v+=gain>1?`A ${["","second","third","fourth"][S.devs]} developer cuts P50 by about ${Math.round(gain)}h.`:`Adding a developer barely moves P50; the agents are the bottleneck.`}
  else v+="Review capacity is maxed; further gains come from splitting the largest build nodes.";
  if(S.auto==="Bold")v+=" Bold autonomy raises the chance of a rework loop at verification.";
  $("verdict").textContent=v;
  paintNodes();requestAnimationFrame(drawEdges);renderDetail();renderBudget();
  return res;
}

/* ---------- Plan load + diff ---------- */
function loadPlan(plan,opts={}){
  const prev=opts.diff&&LAST?{graph:GRAPH,res:LAST}:null;
  PLAN=plan;GRAPH=buildGraph(plan);BY=Object.fromEntries(GRAPH.map(n=>[n.id,n]));KIDS={};GRAPH.forEach(n=>n.deps.forEach(d=>(KIDS[d]=KIDS[d]||[]).push(n.id)));
  S.sel=(GRAPH.find(n=>n.ai&&n.cat==="backend")||GRAPH.find(n=>n.ai)||GRAPH[0]).id;
  $("title").innerHTML=`${esc(plan.epic.code)} <span>${esc(plan.epic.title)}</span>`;
  $("approach").innerHTML=`<span class="eyebrow">Approach</span><br>${esc(plan.epic.approach||plan.epic.summary)}`;
  const ag=GRAPH.filter(n=>n.kind==="agent").length,gt=GRAPH.length-ag;
  const aiN=plan.nodes.length,gr=plan.nodes.filter(n=>n.sources?.length).length;
  const mism=(plan.customer?.id||null)!==(CUSTOMER?.id||null);
  const ctxChip=plan.customer?`<span class="chip ctx">Grounded in ${esc(plan.customer.name)} · ${gr} of ${aiN} nodes cite it</span>`:`<span class="chip">Best practice only</span>`;
  const warn=mism?`<span class="chip warnc">${CUSTOMER?`Rules from ${esc(CUSTOMER.name)} applied; recompile to ground the plan in its profile`:`Customer rules removed; recompile for a best-practice plan`}</span>`:"";
  $("chips").innerHTML=ctxChip+warn+[`${plan.requirements.length} requirements`,`${plan.questions.length} questions for scope sign-off`,`${ag} agents · ${gt} gates`,plan.flags.phi?"Handles PHI":"No PHI",...plan.flags.regulations].map(t=>`<span class="chip">${esc(t)}</span>`).join("");
  $("cReq").textContent=plan.requirements.length;
  renderGraphShell();
  const res=run();LAST=res;
  renderReqs();renderTests();
  const d=$("diff");
  if(prev){const key=n=>n.kind+":"+n.name,a=new Set(prev.graph.map(key)),b=new Set(GRAPH.map(key));
    const add=[...b].filter(k=>!a.has(k)).length,rem=[...a].filter(k=>!b.has(k)).length;
    const pg=prev.graph.filter(n=>n.kind==="gate").length,ng=GRAPH.filter(n=>n.kind==="gate").length;
    const dd=(x,y,f)=>f(x)===f(y)?`${f(y)} (no change)`:`${f(x)} → ${f(y)} <span class="${y>x?"up":"down"}">${y>x?"▲":"▼"}</span>`;
    d.innerHTML=`<span class="eyebrow">Re-planned</span><span><b>+${add}</b> / <b>−${rem}</b> nodes</span><span>Gates <b>${pg} → ${ng}</b></span><span>P50 <b>${dd(prev.res.p50,res.p50,fH)}</b></span><span>P90 <b>${dd(prev.res.p90,res.p90,fH)}</b></span><span>Cost <b>${dd(prev.res.c50,res.c50,f$)}</b></span>`;
    d.hidden=false}else d.hidden=true;
  try{localStorage.setItem("fp.plan",JSON.stringify(plan))}catch(e){}
}

/* ---------- Tabs ---------- */
function li(a){return`<ul>${a.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`}
function links(ids){ids=ids.filter(i=>BY[i]);return ids.length?`<div class="links">${ids.map(i=>`<button type="button" data-go="${i}">${esc(BY[i].name)}</button>`).join("")}</div>`:`<p>None</p>`}
function wireGo(root){root.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>{setTab("graph");select(b.dataset.go,true)})}
function renderReqs(){
  const V=$("v-reqs"),by={};GRAPH.forEach(n=>{if(n.ai)(n.reqs||[]).forEach(r=>(by[r]=by[r]||[]).push(n.id))});
  const col=a=>a>.35?"var(--risk)":a>.2?"var(--warn)":"var(--ok)";
  let h=`<div class="reqs">${PLAN.requirements.map(r=>`<div class="req"><span class="rid">${esc(r.id)}</span><div class="rt">${esc(r.text)}<small>${esc(r.type)}</small>${PLAN.customer?srcChips(r.sources,""):""}</div>
   <div class="amb"><span>Ambiguity ${r.ambiguity.toFixed(2)}</span><span class="t"><i style="width:${r.ambiguity*100}%;background:${col(r.ambiguity)}"></i></span></div>
   <div class="links">${(by[r.id]||[]).length?(by[r.id]).map(i=>`<button type="button" data-go="${i}">${esc(BY[i].name)}</button>`).join(""):`<span class="src">Covered by platform nodes only</span>`}</div></div>`).join("")}</div>`;
  if(PLAN.questions.length)h+=`<h3 class="sec-h">Questions for scope sign-off</h3><div class="qs">${PLAN.questions.map(x=>`<div class="q"><p>${esc(x.q)}</p><p class="pa"><b>Proposed:</b> ${esc(x.proposed)} ${x.reqs.length?`· ${esc(x.reqs.join(", "))}`:""}</p>${PLAN.customer?srcChips(x.sources,""):""}</div>`).join("")}</div>`;
  V.innerHTML=h;wireGo(V);
}
function renderBudget(){
  const V=$("v-budget"),c=cfgOf(S);let t5=0,t9=0,h5=0,h9=0,c5=0,hm=0;
  const rows=GRAPH.map(n=>{if(n.kind==="agent"){const x=nodeQ(n,c);t5+=x.t5;t9+=x.t9;h5+=x.h5;h9+=x.h9;c5+=x.c5;
    return`<tr><td class="nm"><button class="lnk" type="button" data-go="${n.id}">${esc(n.name)}</button><span class="tk">${esc(n.task||n.does)}</span></td><td>${n.phase}</td><td>${x.tier}</td><td>${n.size==="auto"?"auto":n.size}</td><td class="n">${fT(x.t5)} / ${fT(x.t9)}</td><td class="n">${x.h5.toFixed(1)} / ${x.h9.toFixed(1)}</td><td class="n">${f$(x.c5)}</td></tr>`}
    const sk=c.skipped(n),m=sk?0:Math.round(n.mins*c.a.rev);hm+=m;
    return`<tr class="g"><td class="nm"><button class="lnk" type="button" data-go="${n.id}">${esc(n.name)}</button>${n.custom?'<span class="tk">Customer gate</span>':""}</td><td>${n.phase}</td><td colspan="2">${sk?"Auto-pass":esc(n.reviewer)}</td><td class="n">–</td><td class="n">${m} min</td><td class="n">–</td></tr>`}).join("");
  V.innerHTML=`<div class="tbl-wrap"><table><thead><tr><th>Node</th><th>Phase</th><th>Model tier / reviewer</th><th>Size</th><th class="n">Tokens P50 / P90</th><th class="n">Agent hours P50 / P90</th><th class="n">Cost P50</th></tr></thead><tbody>${rows}
  <tr class="sum"><td>Sum of nodes</td><td></td><td colspan="2">${fM(hm)} human review</td><td class="n">${fT(t5)} / ${fT(t9)}</td><td class="n">${h5.toFixed(0)} / ${h9.toFixed(0)}</td><td class="n">${f$(c5)}</td></tr></tbody></table></div>
  <p class="foot">Per-node ranges come from the catalog baseline × size, adjusted for model tier. Sums ignore parallel work and rework; the simulation above accounts for both.</p>`;
  wireGo(V);
}
function renderTests(){
  const V=$("v-tests");
  let h=`<h3 class="sec-h" style="margin-top:4px">Epic success criteria</h3><ul class="success">${PLAN.success.map(s=>`<li>${esc(s)}</li>`).join("")}</ul><h3 class="sec-h">Tests and closing conditions by node</h3><div class="tgrid">`;
  GRAPH.filter(n=>n.kind==="agent").forEach(n=>{h+=`<div class="tcard"><span class="eyebrow">${n.phase}${n.ai?" · compiler":""}</span><h4>${esc(n.name)}</h4>${li(n.checks)}<div class="done">${esc(n.done)}</div></div>`});
  V.innerHTML=h+"</div>";
}
function setTab(t){S.tab=t;document.querySelectorAll("#tabs button").forEach(b=>b.setAttribute("aria-selected",String(b.dataset.tab===t)));
  ["graph","reqs","budget","tests"].forEach(k=>$("v-"+k).hidden=k!==t);if(t==="graph")requestAnimationFrame(drawEdges)}
document.querySelectorAll("#tabs button").forEach(b=>b.onclick=()=>setTab(b.dataset.tab));

/* ---------- Detail ---------- */
function renderDetail(){
  const n=BY[S.sel];if(!n)return;const c=cfgOf(S),D=$("detail"),sk=c.skipped(n),onC=CUR.path.includes(n.id);
  let h=`<div class="d-head"><div><span class="eyebrow">${n.kind==="agent"?(n.ai?"Agent · chosen by compiler":"Agent · platform standard"):sk?"Gate · auto-pass at this autonomy":n.custom?"Customer gate":"Human gate"}${onC?" · critical path":""}</span><h3>${esc(n.name)}</h3><div class="d-role">${n.kind==="agent"?`${n.role} · ${c.tier(n).name} tier`:`Reviewer: ${n.reviewer}${n.after?` · after ${esc(n.after)}`:""}`}</div></div><button class="d-close" type="button" id="dClose">Close</button></div>`;
  if(n.kind==="agent"){const x=nodeQ(n,c);
    h+=`<p class="task">${esc(n.task||n.does)}</p>
    ${n.ai?`<div class="d-sec"><h4>Grounded in</h4>${PLAN.customer?srcChips(n.sources):srcChips([],"Best practice (no customer selected)")}</div>`:""}
    <div class="d-stats"><div><b>${fT(x.t5)} / ${fT(x.t9)}</b><span>Tokens P50 / P90</span></div><div><b>${x.h5.toFixed(1)}h / ${x.h9.toFixed(1)}h</b><span>Time P50 / P90</span></div><div><b>${f$(x.c5)}</b><span>Cost at P50</span></div></div>
    <p class="src">Estimate: catalog baseline “${esc(CAT[n.cat].name)}” × size ${n.size==="auto"?"auto":n.size} (${n.factor.toFixed(1)}×)</p>
    <div class="d-sec"><h4>What this agent does</h4><p>${esc(n.does)}</p>${n.tools.length?`<p class="src">Tools: ${esc(n.tools.join(" · "))}</p>`:""}</div>
    <div class="d-sec"><h4>Input contract</h4>${li(n.inputs)}</div><div class="d-sec"><h4>Produces</h4>${li(n.outputs)}</div><div class="d-sec"><h4>Tests and validations</h4>${li(n.checks)}</div><div class="d-sec"><h4>Closes when</h4><div class="done">${esc(n.done)}</div></div>
    ${n.reqs?.length?`<div class="d-sec"><h4>Requirements covered</h4><p class="src">${esc(n.reqs.join(" · "))}</p></div>`:""}`}
  else{h+=`<div class="d-stats"><div><b>${sk?"0m":Math.round(n.mins*c.a.rev)+"m"}</b><span>Review time</span></div><div><b>${sk?"0h":c.wait.toFixed(1)+"h"}</b><span>Expected queue</span></div><div><b style="text-transform:capitalize">${n.risk}</b><span>Risk level</span></div></div>
    <div class="d-sec"><h4>Reviewer sees</h4>${li(n.sees)}</div><div class="d-sec"><h4>Approve when</h4><div class="done">${esc(n.approve)}</div></div><div class="d-sec"><h4>Why a gate here</h4><p>${esc(n.why)}</p>${n.custom?`<p class="src">Required by ${esc(CUSTOMER?.name||"customer")} gate rules</p>`:""}</div>
    ${sk?`<div class="d-sec"><p>At ${S.auto} autonomy this gate auto-passes on evidence, adding about ${Math.round(SKIPW[n.risk]*100)} points to rework probability.</p></div>`:""}`}
  h+=`<div class="d-sec"><h4>Needs</h4>${links(n.deps)}</div><div class="d-sec"><h4>Feeds</h4>${links(KIDS[n.id]||[])}</div>`;
  D.innerHTML=h;wireGo(D);const cl=$("dClose");if(cl)cl.onclick=()=>D.classList.remove("open");
}
function select(id,open){S.sel=id;paintNodes();renderDetail();if(open)$("detail").classList.add("open")}

/* ---------- Controls ---------- */
function seg(id,opts,key){const el=$(id);el.innerHTML="";opts.forEach(v=>{const b=document.createElement("button");b.type="button";b.textContent=v;b.id=id+"-"+String(v).replace(/\W/g,"");b.setAttribute("aria-pressed",String(S[key]==v));b.onclick=()=>{S[key]=typeof S[key]==="number"?Number(v):v;seg(id,opts,key);LAST=run()};el.appendChild(b)})}
$("rerun").onclick=()=>{S.seed=(S.seed*48271)%2147483647;LAST=run()};
$("copy").onclick=async()=>{const txt=JSON.stringify(PLAN,null,2);try{await navigator.clipboard.writeText(txt);status("Plan JSON copied.","ok")}catch(e){const ta=$("req");status("Copy was blocked here. The JSON is in the requirement box; select it and copy.","err");ta.value=txt;ta.select()}};

/* ---------- Compiler (server API) ---------- */
const reqEl=$("req");
function status(t,cls=""){const s=$("status");s.textContent=t;s.className="status "+cls}
let ctl=null,tick=null,CURRENT_ID=null;
async function compileNow(){
  const text=reqEl.value.trim();
  if(text.length<60){status("Add more detail: who needs what, which systems it touches, and any rules or deadlines.","err");reqEl.focus();return}
  ctl=new AbortController();$("compile").disabled=true;$("stop").hidden=false;
  const t0=Date.now();const upd=()=>status(`Compiling with ${ENGINE.provider}${CUSTOMER?` using ${CUSTOMER.name} context`:""}… ${Math.round((Date.now()-t0)/1000)}s`);upd();tick=setInterval(upd,1000);
  try{
    const {plan,meta}=await api("/api/compile",{method:"POST",body:JSON.stringify({requirement:text,customerId:CUSTOMER?.id||null}),signal:ctl.signal});
    CURRENT_ID=null;loadPlan(plan,{diff:true});
    const u=meta.usage?.input?` · ${(meta.usage.input+meta.usage.output).toLocaleString()} tokens used`:"";
    status(`Compiled in ${Math.round(meta.ms/1000)}s by ${meta.provider} (${meta.model})${u}. Save it to share with your team.`,"ok");
  }catch(e){if(e?.name==="AbortError")status("Stopped. The previous plan is still shown.");else status(e.message||"Compiling failed. Try again.","err")}
  finally{clearInterval(tick);$("stop").hidden=true;$("compile").disabled=false}
}
async function refreshLibrary(selectId){
  try{const list=await api("/api/plans");const sel=$("saved");
    sel.innerHTML=`<option value="">Saved plans (${list.length})…</option>`+list.map(p=>`<option value="${p.id}">${esc(p.code)} · ${esc(p.title)}${p.customer?` · ${esc(p.customer)}`:""} · ${new Date(p.savedAt).toLocaleDateString()}</option>`).join("");
    sel.value=selectId||"";$("del").hidden=!selectId}catch(e){}
}
$("save").onclick=async()=>{try{const rec=await api("/api/plans",{method:"POST",body:JSON.stringify({plan:PLAN,id:CURRENT_ID,provider:ENGINE.provider})});CURRENT_ID=rec.id;await refreshLibrary(rec.id);status(`Saved ${PLAN.epic.code} to the plan library.`,"ok")}catch(e){status(e.message,"err")}};
$("saved").onchange=async e=>{const id=e.target.value;if(!id){$("del").hidden=true;return}
  try{const rec=await api("/api/plans/"+id);CURRENT_ID=rec.id;reqEl.value=rec.plan.brief||"";
    const cid=rec.plan.customer?.id||"",exists=!cid||CUSTOMERS.some(x=>x.id===cid);
    if(exists)await setCustomer(cid,{rebuild:false});
    loadPlan(rec.plan,{diff:true});$("del").hidden=false;
    status(exists?`Opened ${rec.plan.epic.code}, saved ${new Date(rec.savedAt).toLocaleString()}.`:`Opened ${rec.plan.epic.code}. Its customer "${rec.plan.customer.name}" no longer exists, so its rules are not applied.`,exists?"":"err")}catch(err){status(err.message,"err")}};
$("del").onclick=async()=>{const id=$("saved").value;if(!id)return;
  if($("del").dataset.armed!=="1"){$("del").dataset.armed="1";$("del").textContent="Confirm delete";setTimeout(()=>{$("del").dataset.armed="";$("del").textContent="Delete"},4000);return}
  await api("/api/plans/"+id,{method:"DELETE"}).catch(()=>{});$("del").dataset.armed="";$("del").textContent="Delete";CURRENT_ID=null;await refreshLibrary();status("Deleted from the plan library.")};
$("compile").onclick=compileNow;$("stop").onclick=()=>ctl?.abort();
$("pPA").onclick=()=>{reqEl.value=EXAMPLES.sample;CURRENT_ID=null;loadPlan(SAMPLE_PLAN,{diff:true});status("Loaded the sample plan.")};
$("pIDR").onclick=()=>{reqEl.value=EXAMPLES.idr;status("Requirement loaded. Select Compile plan to generate its graph.");reqEl.focus()};
$("pClear").onclick=()=>{reqEl.value="";reqEl.focus();status("Write a requirement, then compile.")};
reqEl.addEventListener("input",()=>{try{localStorage.setItem("fp.req",reqEl.value)}catch(e){}});

/* ---------- Customer context: selector ---------- */
async function refreshCustomers(){
  try{CUSTOMERS=await api("/api/customers")}catch(e){CUSTOMERS=[]}
  const sel=$("cust");sel.innerHTML=`<option value="">None (best practice only)</option>`+CUSTOMERS.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join("");
  sel.value=CUSTOMER?.id||"";
}
async function setCustomer(id,{rebuild=true}={}){
  if(id){try{CUSTOMER=await api("/api/customers/"+encodeURIComponent(id))}catch(e){status(e.message,"err");CUSTOMER=null}}else CUSTOMER=null;
  $("cust").value=CUSTOMER?.id||"";applyCatalog(CUSTOMER);
  $("custEdit").disabled=!CUSTOMER;
  $("custInfo").textContent=CUSTOMER?`${CUSTOMER.documents.length} docs · ${CUSTOMER.rules.requiredGates.length} gate rules${CUSTOMER.reviewedAt?` · reviewed ${CUSTOMER.reviewedAt}`:""}`:"Plans follow general best practice.";
  try{localStorage.setItem("fp.cust",CUSTOMER?.id||"")}catch(e){}
  if(rebuild&&PLAN)loadPlan(PLAN,{diff:true});
}
$("cust").onchange=async e=>{await setCustomer(e.target.value);status(CUSTOMER?`Using ${CUSTOMER.name}. Its gate rules and estimator changes are applied now; compile to ground the plan in its profile and documents.`:"No customer selected. Plans follow general best practice.")};

/* ---------- Customer context: editor ---------- */
const PLACE={after_scope:"After scope sign-off",after_type:"After an agent type",before_release:"Before go-live"};
let ED=null,EDTAB="profile";
const dlg=$("ced");
function blankCustomer(){return{id:null,name:"",owner:"",reviewedAt:new Date().toISOString().slice(0,10),profile:Object.fromEntries(PROFILE_FIELDS.map(f=>[f.key,""])),documents:[],rules:{requiredGates:[],estimatorOverrides:{}}}}
function openEditor(c){ED=JSON.parse(JSON.stringify(c));ED._ov=JSON.stringify(ED.rules.estimatorOverrides||{},null,2);EDTAB="profile";renderEditor();edMsg("");if(!dlg.open)dlg.showModal()}
function edMsg(t,cls=""){const m=$("cedMsg");m.textContent=t;m.className="status "+cls}
function collect(){
  if(!ED)return;const f=$("cedBody");
  const v=sel=>f.querySelector(sel);
  if(EDTAB==="profile"){ED.name=v("#ce-name").value;ED.owner=v("#ce-owner").value;ED.reviewedAt=v("#ce-rev").value;PROFILE_FIELDS.forEach(p=>ED.profile[p.key]=v("#ce-p-"+p.key).value)}
  if(EDTAB==="docs")ED.documents=[...f.querySelectorAll(".doc")].map(d=>({title:d.querySelector("input").value,content:d.querySelector("textarea").value}));
  if(EDTAB==="gates")ED.rules.requiredGates=[...f.querySelectorAll(".grule")].map((g,i)=>{const q=k=>g.querySelector(`[data-k="${k}"]`);
    return{id:ED.rules.requiredGates[i]?.id||"",name:q("name").value,reviewer:q("reviewer").value,mins:Number(q("mins").value),risk:q("risk").value,placement:q("placement").value,agentType:q("agentType").value,onlyIfPhi:q("onlyIfPhi").checked,
      sees:q("sees").value.split("\n").map(x=>x.trim()).filter(Boolean),approve:q("approve").value,why:q("why").value}});
  if(EDTAB==="est")ED._ov=v("#ce-ov").value;
}
function field(id,label,val,hint,area){return`<div class="fld"><label for="${id}">${esc(label)}</label>${hint?`<small>${esc(hint)}</small>`:""}${area?`<textarea id="${id}" rows="${area}">${esc(val)}</textarea>`:`<input id="${id}" value="${esc(val)}">`}</div>`}
function renderEditor(){
  $("cedTitle").textContent=ED.id?`Edit ${ED.name||"customer"}`:"New customer";
  $("cedDel").hidden=!ED.id;
  document.querySelectorAll("#cedTabs button").forEach(b=>b.setAttribute("aria-selected",String(b.dataset.t===EDTAB)));
  const B=$("cedBody");let h="";
  if(EDTAB==="profile"){
    h=`<p class="hint">A short, factual profile. The compiler prefers these facts over general best practice and cites them as “Profile · …”.</p>
    <div class="row3">${field("ce-name","Customer name",ED.name)}${field("ce-owner","Profile owner",ED.owner)}<div class="fld"><label for="ce-rev">Last reviewed</label><input id="ce-rev" type="date" value="${esc(ED.reviewedAt)}"></div></div>
    ${PROFILE_FIELDS.map(p=>field("ce-p-"+p.key,p.label,ED.profile[p.key]||"",p.hint,3)).join("")}`}
  if(EDTAB==="docs"){
    const tot=ED.documents.reduce((s,d)=>s+(d.content||"").length,0);
    h=`<p class="hint">Reference material such as RFP extracts, ADRs, integration standards or API notes, as plain text. Each is cited as DOC-n in the order shown. Keep PHI out. <b>${tot.toLocaleString()}</b> of 200,000 characters used.</p>
    <div class="doclist">${ED.documents.map((d,i)=>`<div class="doc"><div class="doc-h"><span class="eyebrow">DOC-${i+1}</span><input aria-label="Document ${i+1} title" value="${esc(d.title)}" placeholder="Title"><button type="button" class="btn sm" data-rm="${i}">Remove</button></div><textarea rows="6" aria-label="Document ${i+1} text">${esc(d.content)}</textarea><small>${(d.content||"").length.toLocaleString()} characters</small></div>`).join("")||`<p class="empty">No documents yet. Add one or import text files.</p>`}</div>
    <div class="actions"><button type="button" class="btn" id="docAdd">Add document</button><label class="btn" for="docFile">Import text files</label><input id="docFile" type="file" multiple accept=".txt,.md,.csv,.json,.yaml,.yml,.xml,.html,.htm,.sql,.feature" hidden></div>`}
  if(EDTAB==="gates"){
    const types=LLM_TYPES.map(t=>`<option value="${t}">${esc(BASE.agents[t].name)} (${t})</option>`).join("");
    h=`<p class="hint">Gates this customer always requires. The platform inserts them by rule, so they never depend on the model remembering.</p>
    <div class="glist">${ED.rules.requiredGates.map((g,i)=>`<div class="grule">
      <div class="row3"><div class="fld"><label>Gate name</label><input data-k="name" value="${esc(g.name)}"></div><div class="fld"><label>Reviewer</label><input data-k="reviewer" value="${esc(g.reviewer)}"></div><div class="fld"><label>Review minutes</label><input data-k="mins" type="number" min="5" max="480" value="${esc(g.mins)}"></div></div>
      <div class="row3"><div class="fld"><label>Placement</label><select data-k="placement">${Object.entries(PLACE).map(([k,l])=>`<option value="${k}"${g.placement===k?" selected":""}>${l}</option>`).join("")}</select></div>
        <div class="fld"><label>Agent type to follow</label><select data-k="agentType"${g.placement==="after_type"?"":" disabled"}><option value="">—</option>${types.replace(`value="${g.agentType}"`,`value="${g.agentType}" selected`)}</select></div>
        <div class="fld"><label>Risk</label><select data-k="risk">${["low","med","high"].map(r=>`<option${g.risk===r?" selected":""}>${r}</option>`).join("")}</select></div></div>
      <label class="chk"><input type="checkbox" data-k="onlyIfPhi"${g.onlyIfPhi?" checked":""}> Only when the plan handles PHI</label>
      <div class="fld"><label>Reviewer sees (one per line)</label><textarea data-k="sees" rows="2">${esc((g.sees||[]).join("\n"))}</textarea></div>
      <div class="row2f"><div class="fld"><label>Approve when</label><input data-k="approve" value="${esc(g.approve)}"></div><div class="fld"><label>Why this gate</label><input data-k="why" value="${esc(g.why)}"></div></div>
      <button type="button" class="btn sm" data-rmg="${i}">Remove gate</button></div>`).join("")||`<p class="empty">No customer gates. Platform gates still apply.</p>`}</div>
    <button type="button" class="btn" id="gAdd">Add gate rule</button>`}
  if(EDTAB==="est"){
    const rows=Object.entries(BASE.agents).map(([k,a])=>`<tr><td>${k}</td><td class="n">${a.tok}</td><td class="n">${a.hrs}</td><td class="n">${a.tier}</td><td>${a.risk}</td></tr>`).join("");
    h=`<p class="hint">Tune the estimator for this customer with their own actuals or rates. Only the fields shown are allowed; everything else comes from the base catalog.</p>
    <div class="fld"><label for="ce-ov">Overrides (JSON)</label><textarea id="ce-ov" rows="10" spellcheck="false" class="code">${esc(ED._ov)}</textarea>
    <small>Allowed: <code>agents.&lt;type&gt;.{tok, hrs, tier, risk}</code>, <code>gates.&lt;key&gt;.{mins, reviewer}</code>, <code>tiers[0-2].price</code> ($/M tokens), <code>sizes.{S,M,L,XL}</code>. Gate keys: ${Object.keys(BASE.gates).join(", ")}.</small></div>
    <details><summary>Base catalog values (size M)</summary><div class="tbl-wrap"><table class="mini"><thead><tr><th>Agent type</th><th class="n">Tokens (M)</th><th class="n">Hours</th><th class="n">Tier</th><th>Risk</th></tr></thead><tbody>${rows}</tbody></table></div>
    <p class="src">Tier prices: ${BASE.tiers.map((t,i)=>`${i} ${t.name} $${t.price}/M`).join(" · ")}</p></details>`}
  B.innerHTML=h;wireEditor();
}
function wireEditor(){
  const B=$("cedBody");
  B.querySelectorAll("[data-rm]").forEach(b=>b.onclick=()=>{collect();ED.documents.splice(+b.dataset.rm,1);renderEditor()});
  B.querySelectorAll("[data-rmg]").forEach(b=>b.onclick=()=>{collect();ED.rules.requiredGates.splice(+b.dataset.rmg,1);renderEditor()});
  B.querySelectorAll('[data-k="placement"]').forEach(s=>s.onchange=()=>{const t=s.closest(".grule").querySelector('[data-k="agentType"]');t.disabled=s.value!=="after_type";if(t.disabled)t.value=""});
  B.querySelectorAll(".doc textarea").forEach(t=>t.oninput=()=>{t.nextElementSibling.textContent=`${t.value.length.toLocaleString()} characters`});
  const da=$("docAdd");if(da)da.onclick=()=>{collect();ED.documents.push({title:"",content:""});renderEditor()};
  const df=$("docFile");if(df)df.onchange=async()=>{collect();for(const f of df.files){if(f.size>2e6){edMsg(`${f.name} is over 2 MB; paste the relevant part instead.`,"err");continue}ED.documents.push({title:f.name,content:await f.text()})}renderEditor()};
  const ga=$("gAdd");if(ga)ga.onclick=()=>{collect();ED.rules.requiredGates.push({name:"",reviewer:"",mins:30,risk:"high",placement:"before_release",agentType:"",onlyIfPhi:false,sees:[],approve:"",why:""});renderEditor()};
}
document.querySelectorAll("#cedTabs button").forEach(b=>b.onclick=()=>{collect();EDTAB=b.dataset.t;renderEditor()});
$("cedClose").onclick=$("cedCancel").onclick=()=>dlg.close();
$("cedSave").onclick=async()=>{
  collect();let ov;
  try{ov=ED._ov.trim()?JSON.parse(ED._ov):{}}catch(e){EDTAB="est";renderEditor();edMsg("Estimator overrides are not valid JSON. Check commas and quotes.","err");return}
  const body={...ED,rules:{...ED.rules,estimatorOverrides:ov}};delete body._ov;
  $("cedSave").disabled=true;edMsg("Saving…");
  try{
    const saved=await api(ED.id?"/api/customers/"+encodeURIComponent(ED.id):"/api/customers",{method:ED.id?"PUT":"POST",body:JSON.stringify(body)});
    dlg.close();await refreshCustomers();await setCustomer(saved.id);
    status(`Saved ${saved.name}. Gate rules and estimator changes are applied now; compile to ground the plan in the updated profile and documents.`,"ok");
  }catch(e){edMsg(e.message,"err")}finally{$("cedSave").disabled=false}
};
$("cedDel").onclick=async()=>{
  const b=$("cedDel");if(b.dataset.armed!=="1"){b.dataset.armed="1";b.textContent="Confirm delete";setTimeout(()=>{b.dataset.armed="";b.textContent="Delete customer"},4000);return}
  b.dataset.armed="";b.textContent="Delete customer";
  await api("/api/customers/"+encodeURIComponent(ED.id),{method:"DELETE"}).catch(()=>{});
  const was=ED.name;dlg.close();await refreshCustomers();if(CUSTOMER?.id===ED.id)await setCustomer("");status(`Deleted ${was}.`);
};
$("custEdit").onclick=()=>CUSTOMER&&openEditor(CUSTOMER);
$("custNew").onclick=()=>openEditor(blankCustomer());

/* ---------- Boot ---------- */
(async function boot(){
  try{
    const [cfg,sample]=await Promise.all([api("/api/config"),fetch("sample-plan.json").then(r=>r.json())]);
    const c=cfg.catalog;BASE=c;PROFILE_FIELDS=c.profileFields;applyCatalog(null);LLM_TYPES=c.compilerTypes;SIG=c.riskSigma;MIXSHIFT=c.routingShift;AUTO=c.autonomy;SKIPW=c.skippedGateReworkWeight;EXAMPLES=c.examples;
    SAMPLE_PLAN=sample;ENGINE=cfg.compiler;$("engine").textContent=`Compiler: ${ENGINE.provider}${ENGINE.model&&ENGINE.model!=="none"?" · "+ENGINE.model:""}`;
  }catch(e){status("Could not reach the Flight Plan server. Check that it is running.","err");$("compile").disabled=true;return}
  seg("segDevs",[1,2,3,4],"devs");seg("segAuto",["Guarded","Balanced","Bold"],"auto");seg("segMix",["Cost-first","Balanced","Quality-first"],"mix");
  let plan=SAMPLE_PLAN,req=EXAMPLES.sample;
  try{const p=JSON.parse(localStorage.getItem("fp.plan")||"null");if(p&&Array.isArray(p.nodes)&&Array.isArray(p.requirements)&&p.epic)plan=p;const r=localStorage.getItem("fp.req");if(r)req=r}catch(e){}
  await refreshCustomers();
  let cid=null;try{cid=localStorage.getItem("fp.cust")}catch(e){}
  if(cid&&CUSTOMERS.some(x=>x.id===cid))await setCustomer(cid,{rebuild:false});
  reqEl.value=req;loadPlan(plan);
  status(plan===SAMPLE_PLAN?"Showing the sample plan. Edit the requirement and compile to generate your own.":"Showing your last plan.");
  refreshLibrary();
  let lastCap=GEL.clientWidth<560;new ResizeObserver(()=>{const cap=GEL.clientWidth<560;if(cap!==lastCap){lastCap=cap;layout()}drawEdges()}).observe(GEL);
  if(document.fonts)document.fonts.ready.then(drawEdges);
})();
