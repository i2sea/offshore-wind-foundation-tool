/* ================= UI ================= */
const $=id=>document.getElementById(id);
const fx=(v,n=3)=>isFinite(v)?Number(v).toLocaleString("ko-KR",{minimumFractionDigits:n,maximumFractionDigits:n}):"∞";
const dl=v=>`DL(${v>=0?"+":"−"})${fx(Math.abs(v),3)}`;
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
function toast(m){ const t=$("toast"); t.textContent=m; t.hidden=false; clearTimeout(toast._t); toast._t=setTimeout(()=>t.hidden=true,2600); }
const NUM=["Db","tb","Dw","tw","hw","hk","Dt","tkh","cDs","cts","cDw","ctw","cH","ctt","cnr","ctr","Dc","tc","ha","hth","hhn","zc0","ztop","Dp","tp",
  "zf1","zf2","gf","gc","zbDL","sbDL","hwl","msl","gw","tg","f1","fmar","vtip","rpmR","gG","gNu","Uref","zref","Cs","Tavg","Hw","Tw","Uc","Uce","wcf","d0w","ks","kh","kfac",
  "mu","qa","tilt","aeff","fck","fy","cov","kcr","phiF","gH","gE","fsO1","fsS1","fsO2","fsS2","fsO3","fsS3","qf3","dTow","ukc","gmMin","zcut","zbal","Wadd","zadd","padN","padB","padH",
  "mD","mDt","mzA","mzB","mtop","mL","mz1","mz2","mt1","mt2","mt3","mca","mfy","mgM","mgs","mgE","mtTP","mgap","mWsec","mgg","mDrG","mDrL","mScK","mScT","mScS","mmg","mRot","mFSc","mFSu",
  "jWb","jWt","jN","jRat","jTPh","jStub","jDir","jLD","jLt","jBrD","jBrt","jMbD","jMbt","jMg","jfy","jgM","jgE","jWtp","jWsec","jPD","jPt","jPL","jScK","jScT","jScS"];
const SEL=["shp","turb","crest","hydro","sgc","surf","mTP","mInst","mSc","soilPre","jHz","jFlood","jSc","gBase"];
const LS="gbs-tool-v3";
let ST={...DEF}; // 현재 상태 (rings, customT, type 포함)
try{ localStorage.removeItem("gbs-tool-v1"); localStorage.removeItem("gbs-tool-v2"); }catch(e){}

/* 터빈 자료: 기본은 공개 기준 터빈만. 가져온 터빈 파일은 이 브라우저의 터빈 목록(TLIB)에 남겨 설계를 바꿔도 유지 */
const TLIB="gbs-turb-lib";
function libGet(){ try{ return JSON.parse(localStorage.getItem(TLIB)||"[]"); }catch(e){ return []; } }
function libSet(a){ try{ localStorage.setItem(TLIB,JSON.stringify(a)); }catch(e){} }
function mergeT(a,b){ const m=new Map(); [...a,...b].forEach(t=>{ if(t&&t.id) m.set(t.id,JSON.parse(JSON.stringify(t))); }); return [...m.values()]; }
let turbMiss=null;  // 설계에 저장된 터빈이 목록에 없을 때 그 id
function fillTurbSel(){
  const all=[...TURB_PRESETS,...(ST.customT||[])];
  $("turb").innerHTML=all.map(t=>`<option value="${esc(t.id)}">${esc(t.name)}${t.uls?"":" — 하중표 없음"}</option>`).join("");
  if(!all.some(t=>t.id===ST.turb)){ turbMiss=ST.turb; ST.turb=all[0].id; } else if(turbMiss&&ST.turb!==all[0].id) turbMiss=null;
  $("turb").value=ST.turb;
}
function setInputs(o){
  ST={...DEF,...o}; ST.rings=(o.rings||[]).map(r=>({...r})); ST.soil=(o.soil||DEF.soil).map(l=>({...l})); ST.customT=mergeT(libGet(),o.customT||[]); turbMiss=null;
  ST.rb=Object.fromEntries(MEMB.map(m=>[m[0],{...(DEF_RB[m[0]]),...((o.rb||{})[m[0]]||{})}]));
  NUM.forEach(k=>{ if(ST[k]!==undefined) $(k).value=ST[k]; });
  fillTurbSel(); fillSoilSel(); SEL.forEach(k=>{ if(k!=="turb") $(k).value=String(ST[k]); });
  drawRings(); drawRb(); applyType(); syncKh(); syncKs(); drawSoil();
}
function drawRb(){
  const opts=Object.keys(BARS).map(k=>`<option>${k}</option>`).join("");
  $("rbInputs").innerHTML=MEMB.map(([k,mem,face])=>`<div class="rb" data-rb="${k}"><span>${mem} · ${face}</span><select id="rb_${k}_bar" aria-label="${mem} ${face} 규격">${opts}</select><input id="rb_${k}_s" type="number" step="25" min="100" aria-label="${mem} ${face} 간격 (mm)"></div>`).join("");
  MEMB.forEach(([k])=>{ $("rb_"+k+"_bar").value=ST.rb[k].bar; $("rb_"+k+"_s").value=ST.rb[k].s; });
  document.querySelectorAll("[data-rb^='k']").forEach(el=>el.hidden=ST.type==="caisson");
}
function readInputs(){
  NUM.forEach(k=>{ const v=parseFloat($(k).value); ST[k]=isFinite(v)?v:0; });
  ST.sgc=$("sgc").value; ST.surf=$("surf").value; ST.shp=$("shp").value; ST.turb=$("turb").value; ST.crest=+$("crest").value; ST.hydro=+$("hydro").value; ST.mTP=$("mTP").value; ST.mInst=$("mInst").value; ST.mSc=$("mSc").value; ST.soilPre=$("soilPre").value; ST.jHz=$("jHz").value; ST.jFlood=$("jFlood").value; ST.jSc=$("jSc").value; ST.gBase=$("gBase").value;
  ST.rings=ST.rings.map(r=>({D:+r.D||0,t:+r.t||0,h:+r.h||0,z:+r.z||0}));
  MEMB.forEach(([k])=>{ const b=$("rb_"+k+"_bar"); if(b) ST.rb[k]={bar:b.value,s:Math.max(50,parseFloat($("rb_"+k+"_s").value)||200)}; });
  return JSON.parse(JSON.stringify(ST));
}
function persist(){ try{ localStorage.setItem(LS,JSON.stringify(ST)); }catch(e){} }
function applyType(){
  const cat=catOf(ST.type);
  document.querySelectorAll(".wc").forEach(b=>b.setAttribute("aria-pressed",b.dataset.cat===cat?"true":"false"));
  document.querySelectorAll(".wt").forEach(b=>b.setAttribute("aria-pressed",b.dataset.type===ST.type?"true":"false"));
  document.querySelectorAll("[data-cat]:not(.wc),[data-for]").forEach(el=>{ const c=el.dataset.cat, f=el.dataset.for; el.hidden=!!((c&&!c.split(" ").includes(cat))||(f&&!f.split(" ").includes(ST.type))); });
  { const t1=document.querySelector('.tab[data-t="mchk"]'), t2=document.querySelector('.tab[data-t="mpy"]'); if(t1) t1.textContent=cat==="jacket"?"부재 검토":"강관 단면"; if(t2) t2.textContent=cat==="jacket"?"말뚝 · 지반":"말뚝 해석"; }
  document.querySelectorAll("[data-for-tp]").forEach(el=>el.hidden=el.dataset.forTp!==$("mTP").value);
  document.querySelectorAll("[data-for-inst]").forEach(el=>el.hidden=!el.dataset.forInst.split(" ").includes($("mInst").value));
  document.querySelectorAll("[data-for-sc]").forEach(el=>el.hidden=el.dataset.forSc!==$("mSc").value);
  document.querySelectorAll("[data-for-jsc]").forEach(el=>el.hidden=el.dataset.forJsc!==$("jSc").value);
  document.querySelectorAll("[data-shp]").forEach(f=>f.hidden=f.dataset.shp!==$("shp").value);
  document.querySelectorAll("[data-rb^='k']").forEach(el=>el.hidden=ST.type==="caisson");
  const cur=document.querySelector(`.tab[data-t="${curTab}"]`); if(cur&&cur.hidden) selectTab("gen");
}
function drawRings(){
  $("ringBody").innerHTML=ST.rings.map((r,i)=>`<tr>${["D","t","h","z"].map(k=>`<td><input id="rg_${i}_${k}" type="number" step="0.1" value="${r[k]}" aria-label="링 ${i+1} ${k}"></td>`).join("")}<td><button type="button" data-del="${i}" aria-label="링 ${i+1} 삭제">✕</button></td></tr>`).join("")||`<tr><td colspan="5" class="note">없음</td></tr>`;
  $("ringBody").querySelectorAll("input").forEach(el=>el.addEventListener("input",()=>{ const [,i,k]=el.id.split("_"); ST.rings[+i][k]=parseFloat(el.value)||0; run(); }));
  $("ringBody").querySelectorAll("[data-del]").forEach(b=>b.addEventListener("click",()=>{ ST.rings.splice(+b.dataset.del,1); drawRings(); run(); }));
}
$("ringAdd").addEventListener("click",()=>{ ST.rings.push({D:6,t:0.5,h:1,z:1}); drawRings(); run(); });
document.querySelectorAll(".wt").forEach(b=>b.addEventListener("click",()=>{ readInputs(); if(ST.type!==b.dataset.type){ optRun++; $("optPanel").hidden=true; } ST.type=b.dataset.type;
  if(ST.type==="caisson"&&ST.zc0>ST.cH) ST.zc0=ST.cts;
  $("zc0").value=ST.zc0; applyType(); run(); }));
const lastSub={grav:"cone",mono:"mono1",jacket:"jk4"};
document.querySelectorAll(".wc").forEach(b=>b.addEventListener("click",()=>{ const c=b.dataset.cat;
  if(catOf(ST.type)===c) return; readInputs(); lastSub[catOf(ST.type)]=ST.type; ST.type=lastSub[c]; optRun++; $("optPanel").hidden=true;
  if(c!=="grav"&&$("surf").value==="conc"){ $("surf").value="mg"; syncKs(); }
  if(c==="grav"&&$("surf").value==="st"){ $("surf").value="conc"; syncKs(); }
  applyType(); run(); }));
$("btnSampleMono").addEventListener("click",()=>{ const P=readInputs(); setInputs({...P,...MONO_DEF,type:P.type}); run(); toast(`모노파일 기본 제원을 불러왔습니다 (D ${MONO_DEF.mD} m, 테이퍼형 상부 ${MONO_DEF.mDt} m)`); });
function syncKh(){ const g=parseFloat($("sgc").value); $("kh").readOnly=isFinite(g); if(isFinite(g)){ const k=parseFloat($("kfac").value)||0; $("kh").value=+(g*k).toFixed(4); } }
["sgc","kfac"].forEach(id=>$(id).addEventListener("input",syncKh)); $("sgc").addEventListener("change",syncKh);
function syncKs(){ const v=$("surf").value, m={conc:3,mg:20,st:0.05}; $("ks").readOnly=!!m[v]; if(m[v]) $("ks").value=m[v]; }
$("surf").addEventListener("change",syncKs); $("surf").addEventListener("input",syncKs);
let runT=null; function schedRun(){ clearTimeout(runT); runT=setTimeout(run,catOf(ST.type)==="mono"?150:0); }
$("frm").addEventListener("input",e=>{ if(e.target.id.startsWith("rg_")||e.target.id.startsWith("te_")||e.target.id==="soilPre") return; if(e.target.id.startsWith("rb_")) $("rbRes").hidden=true; if(["shp","mTP","mInst","mSc","jSc"].includes(e.target.id)) applyType(); schedRun(); });
$("frm").addEventListener("change",e=>{ if(e.target.id==="soilPre"){ applySoilPre(); return; } if(e.target.tagName==="SELECT"&&!e.target.id.startsWith("te_")){ if(["shp","mTP","mInst","mSc","jSc"].includes(e.target.id)) applyType(); run(); } });

/* ---------- 터빈 편집 ---------- */
let teId=null, teBase=null;
function parseTable(txt){
  const rows=txt.split(/\r?\n/).map(l=>(l.match(/-?\d[\d,]*\.?\d*(?:[eE][-+]?\d+)?/g)||[]).map(s=>parseFloat(s.replace(/,/g,"")))).filter(r=>r.length>=6).map(r=>r.slice(r.length>=8?0:0,6));
  return rows.length?rows:null;
}
function tableText(rows){ return rows?rows.map((r,i)=>LROW[i]+"\t"+r.join("\t")).join("\n"):""; }
function openTE(t,isNew){
  teBase=t;
  teId=isNew?("c"+Date.now().toString(36)):t.id;
  $("te_name").value=isNew?(t?t.name+" (편집본)":"새 터빈"):t.name;
  $("te_MW").value=t?t.MW:10; $("te_hub").value=t?t.hub:120; $("te_rotor").value=t?t.rotor:0; $("te_ifz").value=t?t.ifz:25;
  $("te_rna").value=t?t.rna:0; $("te_tower").value=t?t.tower:0; $("te_W").value=t?t.Wdirect:0; $("te_axis").value=t?t.axis:"z";
  $("te_rmin").value=t?t.rpmMin:0; $("te_rmax").value=t?t.rpmMax:0; $("te_fref").value=t?(t.fref||0):0; $("te_twL").value=t?(t.twL||0):0; $("te_twDb").value=t?(t.twDb||0):0; $("te_twDt").value=t?(t.twDt||0):0;
  $("te_uls").value=t?tableText(t.uls):""; $("te_sls").value=t?tableText(t.sls):"";
  $("teMsg").textContent=""; $("tEdit").hidden=false; $("te_name").focus();
}
$("tNew").addEventListener("click",()=>openTE(null,true));
$("tDup").addEventListener("click",()=>{ const t=turbineOf(readInputs()); const custom=(ST.customT||[]).some(c=>c.id===t.id); openTE(t,!custom); });
$("teCancel").addEventListener("click",()=>{ $("tEdit").hidden=true; });
$("teSave").addEventListener("click",()=>{
  const n=id=>parseFloat($(id).value)||0, uls=parseTable($("te_uls").value), sls=parseTable($("te_sls").value);
  const bad=[]; if(uls&&uls.length!==12) bad.push(`ULS ${uls.length}행`); if(sls&&sls.length!==12) bad.push(`SLS ${sls.length}행`);
  if(bad.length){ $("teMsg").textContent=`하중표는 12행이어야 합니다 (${bad.join(", ")}).`; return; }
  const t={id:teId,name:$("te_name").value.trim()||"사용자 터빈",MW:n("te_MW"),hub:n("te_hub"),rotor:n("te_rotor"),rna:n("te_rna"),tower:n("te_tower"),Wdirect:n("te_W"),ifz:n("te_ifz"),
    rpmMin:n("te_rmin"),rpmMax:n("te_rmax"),fref:n("te_fref"),twL:n("te_twL"),twDb:n("te_twDb"),twDt:n("te_twDt"),axis:$("te_axis").value,src:"사용자 입력",uls,sls};
  if(teBase&&teBase.scaled&&$("te_uls").value===tableText(teBase.uls)&&$("te_sls").value===tableText(teBase.sls)) t.scaled=teBase.scaled;
  ST.customT=(ST.customT||[]).filter(c=>c.id!==teId); ST.customT.push(t); ST.turb=t.id; libSet(mergeT(libGet().filter(c=>c.id!==teId),[t]));
  fillTurbSel(); $("tEdit").hidden=true; run(); toast("터빈을 저장했습니다");
});
$("tDel").addEventListener("click",()=>{ const id=ST.turb; ST.customT=(ST.customT||[]).filter(c=>c.id!==id); libSet(libGet().filter(c=>c.id!==id)); ST.turb=TURB_PRESETS[0].id; fillTurbSel(); run(); toast("이 브라우저의 터빈 목록에서 지웠습니다 (터빈 파일은 그대로)"); });
/* 터빈 파일 (.json): {app:"gbs-tool-turbine", ver:1, turbines:[...]} — 설계 JSON(P.customT), 터빈 하나·배열도 받음 */
function turbOK(t){ return t&&typeof t==="object"&&t.name&&isFinite(t.hub)&&isFinite(t.ifz); }
function cleanT(t){ const n=k=>Number(t[k])||0, tab=a=>Array.isArray(a)&&a.length===12&&a.every(r=>Array.isArray(r)&&r.length>=6)?a.map(r=>r.slice(0,6).map(Number)):null;
  const o={id:String(t.id||("c"+Date.now().toString(36)+Math.random().toString(36).slice(2,5))),name:String(t.name),MW:n("MW"),hub:n("hub"),rotor:n("rotor"),rna:n("rna"),tower:n("tower"),Wdirect:n("Wdirect"),ifz:n("ifz"),
    rpmMin:n("rpmMin"),rpmMax:n("rpmMax"),fref:n("fref"),twL:n("twL"),twDb:n("twDb"),twDt:n("twDt"),axis:t.axis==="x"?"x":"z",src:String(t.src||"터빈 파일"),uls:tab(t.uls),sls:tab(t.sls)};
  if(t.scaled) o.scaled=t.scaled; if(TURB_PRESETS.some(b=>b.id===o.id)) o.id+="_f"; return o; }
$("tImpBtn").addEventListener("click",()=>$("tImp").click());
$("tImp").addEventListener("change",async e=>{
  const files=[...e.target.files]; e.target.value=""; if(!files.length) return; let got=[], bad=0;
  for(const f of files){ try{ const o=JSON.parse(await f.text()); const arr=Array.isArray(o)?o:o.turbines?o.turbines:(o.P&&o.P.customT)?o.P.customT:o.customT?o.customT:[o];
    arr.forEach(t=>{ if(turbOK(t)) got.push(cleanT(t)); else bad++; }); }catch(err){ bad++; } }
  if(!got.length){ toast("터빈 자료를 찾지 못했습니다. 터빈 파일(.json)인지 확인하세요."); return; }
  const had=new Set((ST.customT||[]).map(t=>t.id)), rep=got.filter(t=>had.has(t.id)).length;
  libSet(mergeT(libGet(),got)); ST.customT=mergeT(ST.customT||[],got);
  ST.turb=(turbMiss&&got.some(t=>t.id===turbMiss))?turbMiss:got[0].id; turbMiss=null;
  fillTurbSel(); run();
  toast(`터빈 ${got.length}개를 가져왔습니다${rep?` (같은 이름 ${rep}개는 새 자료로 바꿈)`:""}${bad?` · 읽지 못한 항목 ${bad}개`:""}: ${got.map(t=>t.name).join(", ")}`);
});
const turbFile=a=>JSON.stringify({app:"gbs-tool-turbine",ver:1,saved:new Date().toISOString().slice(0,10),turbines:a},null,1);
const safeNm=s=>String(s).replace(/[\\/:*?"<>|\s]+/g,"_").slice(0,60);
$("tExp").addEventListener("click",()=>{ const t=turbineOf(readInputs()); saveFile(`터빈_${safeNm(t.name)}.json`,turbFile([t])); });
$("tExpAll").addEventListener("click",()=>{ const a=ST.customT||[]; if(!a.length){ toast("가져오거나 추가한 터빈이 없습니다"); return; } saveFile(`터빈목록_${stamp()}.json`,turbFile(a)); });

/* ---------- 탭 ---------- */
let curTab="gen", dirty={};
function selectTab(k){
  document.querySelectorAll(".tab").forEach(x=>x.setAttribute("aria-selected",x.dataset.t===k?"true":"false"));
  document.querySelectorAll(".pane").forEach(p=>p.hidden=p.dataset.p!==k);
  curTab=k; if(R) renderTab(curTab);
}
document.querySelectorAll(".tab").forEach(t=>t.addEventListener("click",()=>selectTab(t.dataset.t)));

/* ---------- 실행 ---------- */
let R=null;
function run(){
  const P=readInputs(); persist();
  const mono=catOf(P.type)==="mono", jack=catOf(P.type)==="jacket";
  if(jack){ R=computeJacket(P); }
  else if(mono){ R=computeMono(P); R.py=computePile(P,R); R.fq=monoFreq(P,R,R.py); R.warns=R.warns.filter(w=>w.k!=="sig").concat(R.py.warns,freqWarns(R)); } else { R=compute(P); R.tow=null; R.M=memberDesign(R,P.rb); const mw=memberWarn(R.M); if(mw) R.warns.push(mw); }
  const t=R.T; $("tDel").hidden=!(ST.customT||[]).some(c=>c.id===t.id);
  $("turbNote").textContent=`${t.MW} MW · 허브 MSL+${t.hub} m · 인터페이스 MSL+${t.ifz} m · 총중량 ${fx(R.Wt,0)} kN · ${t.uls?"하중표 있음":"하중표 없음"}${t.fref>0?` · 기준 진동수 ${t.fref} Hz`:""}${t.twDb>0?` · 타워 ${t.twL||t.hub-t.ifz} m Ø${t.twDb}→${t.twDt}`:""}${t.scaled?" · 하중표는 기준 터빈 축척 추정":""}`;
  if(P.type==="cone"){ const s=Math.sqrt(1+((P.Dw-P.Dt)/2/P.hk)**2); $("tkNote").textContent=`원추 벽 법선두께 = ${fx(P.tkh/s,3)} m (수평 ${P.tkh} ÷ ${fx(s,3)}), 경사 1 : ${fx(P.hk/((P.Dw-P.Dt)/2),3)}`; }
  if(jack){ $("jacketNote").textContent=jacketNote(); $("soilNote").textContent=soilNote(); }
  else if(mono){ $("monoNote").textContent=monoNote(); $("soilNote").textContent=soilNote(); } else $("shpNote").textContent=R.S.hex?`육각: 맞변 ${fx(R.S.hex.flats,2)} m, 꼭짓점 ${fx(R.S.hex.corners,2)} m, 면적이 같은 원 외경 ${fx(2*R.rso,3)} m (부력·파랑에 사용). 높이는 저판 하면 기준.`:"높이는 모두 저판 하면 기준입니다.";
  renderSummary(); renderWarns();
  dirty={gen:1,rbd:1,m3d:1,load:1,stab:1,mem:1,flt:1,wt:1,qty:1,calc:1,cmp:1,mchk:1,mpy:1}; if((mono||jack)&&!$("soilEd").innerHTML) drawSoil();
  renderTab(curTab);
}
function renderTab(t){
  if(!dirty[t]) return; dirty[t]=0;
  if(R.cat==="mono"){ renderMonoTab(t); return; }
  if(R.cat==="jacket"){ renderJacketTab(t); return; }
  if(t==="gen"){ $("capSec").textContent="정면 단면도"; drawSection(); drawPlan(); }
  else if(t==="rbd") drawRebarSheet();
  else if(t==="m3d") build3D();
  else if(t==="load") $("repLoad").innerHTML=htmlLoad();
  else if(t==="stab") $("repStab").innerHTML=htmlStab();
  else if(t==="mem") $("repMem").innerHTML=htmlMember();
  else if(t==="flt"){ if(!R.tow) R.tow=towTable(R.P); $("repFlt").innerHTML=htmlFlt(); }
  else if(t==="wt") $("repWt").innerHTML=htmlWt();
  else if(t==="qty") $("repQty").innerHTML=htmlQty();
  else if(t==="calc"){ if(!R.tow) R.tow=towTable(R.P); $("report").innerHTML=htmlReport(); }
}
const chip=(ok,na)=>ok===null||na?`<span class="chip na">자료 없음</span>`:`<span class="chip ${ok?"ok":"bad"}">${ok?"O.K":"N.G"}</span>`;
const okt=ok=>`<span class="${ok?"ok-t":"bad-t"}">${ok?"O.K":"N.G"}</span>`;
function renderSummary(){
  if(R.cat==="mono"){ renderMonoSummary(); return; }
  if(R.cat==="jacket"){ renderJacketSummary(); return; }
  const f=R.flt, L=R.LC;
  const minO=Math.min(...L.map(l=>l.FSo/l.fs.o)), minS=Math.min(...L.map(l=>l.FSs/l.fs.s));
  const wO=L.reduce((a,b)=>b.FSo/b.fs.o<a.FSo/a.fs.o?b:a), wS=L.reduce((a,b)=>b.FSs/b.fs.s<a.FSs/a.fs.s?b:a);
  const wQ=L.reduce((a,b)=>b.qcheck/b.qa>a.qcheck/a.qa?b:a), eOk=L.every(l=>l.okE);
  const k=[
    [`콘크리트 (${fx(R.Wc/9.81,0)} t)`,`${fx(R.Vc,0)} <small>m³</small>`],
    ["전도 최소 FS",`${fx(wO.FSo,2)} <small>${wO.id}</small>${chip(minO>=1)}`],
    ["활동 최소 FS",`${fx(wS.FSs,2)} <small>${wS.id}</small>${chip(minS>=1)}`],
    ["최대 지반반력",`${fx(wQ.qcheck,0)} <small>/ ${fx(wQ.qa,0)} kN/m²</small>${chip(wQ.okQ)}`],
    ["편심 · 접지",`${eOk?"기준 만족":"기준 초과"}${chip(eOk)}`],
    ["부재설계 · 철근",`${fx(R.M.qty.tot/1000,0)} <small>t</small>${chip(R.M.ok)}`],
    ["예인 흘수",f?`${fx(f.T,2)} <small>m</small>${chip(f.okT)}`:"—"],
    ["부유 GM",f?`${fx(f.GM,2)} <small>m</small>${chip(f.okGM)}`:"—"],
    [`1차 고유진동수${R.freq.r&&R.freq.r.est?" · rpm 추정":""}`,`${fx(R.freq.f,3)} <small>Hz${R.freq.calc&&R.freq.calc.cal?"":" · 입력값"}</small>${chip(R.freq.ok,R.freq.ok===null)}`],
  ];
  $("summary").innerHTML=k.map(([a,b])=>`<div class="kpi"><span class="k">${a}</span><span class="v">${b}</span></div>`).join("");
}
/* 주의 사항별 팁과 자동 수정 */
function bestZcut(P){ // 예인 조건(GM·흘수·넓은 구간 수선·건현)을 만족하는 가장 높은 예인 시 상단 높이
  const lo=Math.ceil(buildParts(P).z2*2)/2;
  const ev=z=>{ const f=compute({...P,zcut:z,fast:1}).flt; return f&&f.okGM&&f.okT&&f.fb>0.5?f:null; };
  const top=Math.floor(P.ztop*2)/2; let f=ev(top); if(f) return {z:top,f};
  if(!(f=ev(lo))) return null; let a=lo, b=top, fa=f;               // a: 만족, b: 불만족
  while(b-a>0.5){ const m=Math.round((a+b))/2; const g=ev(m); if(g){ a=m; fa=g; } else b=m; }
  return {z:a,f:fa}; }
function widenForTow(P){ // 수선이 넓은 구간 안에 들도록 하부 높이를 올림
  const cais=P.type==="caisson", k=cais?"cH":"hw";
  for(let d=1; d<=12; d+=1){ const Q={...P,fast:1}; Q[k]=P[k]+d; Q.zf1=P.zf1+d; if(!cais&&P.zf2) Q.zf2=P.zf2+d;
    if(Q.ztop<=buildParts(Q).z2+2) return null;
    const f=compute(Q).flt; if(f&&f.okGM&&f.okT) return {k,v:Q[k],zf1:Q.zf1,zf2:Q.zf2,f}; }
  return null; }
/* 부재설계 N.G → 주의 문구 (부재·면·항목) */
const OKN={okM:"휨",okV:"전단",okT:"원주 인장",okMin:"최소철근",okCr:"균열(철근 간격)",okS:"최대 간격",okPM:"축력+휨(P-M)",okP:"축력",okVt:"전단(띠철근)"};
function memberWarn(M){ if(M.ok) return null;
  const bad=MEMB.filter(([k])=>M[k]&&!M[k].ok).map(([k,nm,face])=>{ const r=M[k], why=Object.keys(r).filter(x=>/^ok/.test(x)&&x!=="ok"&&r[x]===false).map(x=>OKN[x]||x); return `${nm} ${face.split(" (")[0]}: ${why.join("·")||"N.G"}`; });
  return `부재설계 철근 검토가 만족하지 않습니다 — ${bad.join(" / ")}.`; }
function rbFix(mode){ const P0=readInputs(); if(mode==="freq"){ selectTab("mem"); doRbOpt.after=()=>rbToast(P0); doRbOpt("freq"); return; } doRbOpt(mode); selectTab("mem"); rbToast(P0); }
function rbToast(P0){
  const P1=readInputs(), ch=[["tb","저판 두께"],["tw","하부 원통 벽두께"],["tkh","원추 두께"],["tc","기둥 벽두께"],["cts","하부 슬래브 두께"],["ctw","외벽 두께"],["Dc","기둥 외경"],["ha","육각 샤프트 한 변"],["Db","저판 직경"],["cDs","하부 슬래브 직경"],["fck","f_ck"]].filter(([k])=>P0[k]!==P1[k]).map(([k,n])=>k==="fck"?`${n} ${P0[k]} → ${P1[k]} MPa`:`${n} ${fx(P0[k],2)} → ${fx(P1[k],2)} m`);
  toast(R.M.ok?`부재설계를 만족하도록 고쳤습니다${R.freq&&R.freq.f?` — 고유진동수 ${fx(R.freq.f,3)} Hz ${R.freq.ok?"O.K":"N.G"}`:""}${ch.length?` (${ch.join(", ")})`:""}. 철근 ${fx(R.M.qty.tot/1000,0)} t`:`N.G인 부재가 남았습니다${ch.length?` (${ch.join(", ")})`:""}. 부재설계 탭 안내를 확인하세요.`); }
function warnInfo(w){
  if(/^부재설계 철근 검토가/.test(w)){ 
    return {tip:"철근 직경·간격을 바꾸면 휨·균열·최소철근은 대부분 해결됩니다. 전단이나 축력이 모자라거나 기둥처럼 철근을 최대로 넣어도 휨이 모자라면 부재 두께를 키워야 합니다(저판 전단이 흔함). 두께 상한을 넘으면 기둥 외경이나 저판 직경을 키워야 합니다.",
      fixes:[{label:"부재설계 + 진동수 동시 자동 수정 (권장)",act:()=>rbFix("freq")},{label:"부재설계만 자동 수정 (철근 → 두께 → 외경·직경)",act:()=>rbFix("auto")},{label:"철근 + 두께까지만",act:()=>rbFix("thk")},{label:"철근만 최적 배근",act:()=>rbFix("rb")}]}; }
  if(/^1차 고유진동수 .*Hz가/.test(w)) return freqFixInfo();
  const P=R.P, r1=v=>Math.round(v*100)/100;
  if(/터빈 하중 인터페이스/.test(w)){
    const dH=P.hwl-P.zbDL, crest=dH+P.Hw/2, need=crest+1.5, zdl=R.zIf+P.zbDL;
    if(R.zIf<need) return {tip:`터빈 인터페이스(MSL+${R.T.ifz} m = 저판 하면에서 ${fx(R.zIf,2)} m, ${dl(zdl)})가 설계 파봉(${fx(crest,2)} m, ${dl(crest+P.zbDL)})에 여유고 1.5 m를 더한 ${fx(need,2)} m보다 낮습니다. 이 높이에 구조물 상단을 맞추면 파도가 넘칩니다. 터빈의 하중 인터페이스 높이가 맞게 들어갔는지 먼저 확인하세요.`,
      fixes:[{label:"선택 터빈의 인터페이스 높이 확인·수정 (터빈 편집 열기)",act:()=>{ $("tDup").click(); $("te_ifz").focus(); }}]};
    return {tip:"터빈 하중표의 작용 높이와 기초 꼭대기 높이가 다르면 터빈 모멘트를 옮길 때 팔길이가 달라집니다. 실제 설계에서는 기초 상단이 터빈 인터페이스(타워 하단 플랜지)와 같아야 합니다. 높이는 저판 하면 기준입니다.",
      fixes:[{label:`구조물 상단을 ${fx(R.zIf,2)} m로 (저판 하면 기준, ${dl(zdl)} = MSL+${R.T.ifz} m, 설계 파봉보다 ${fx(R.zIf-crest,1)} m 위)`,patch:{ztop:r1(R.zIf)}}]}; }
  if(/수면이 (원추|기둥)에 걸립니다/.test(w)){ const a=bestZcut(P), b=widenForTow(P), fx_=[];
    if(a) fx_.push({label:`예인 시 상단 높이를 ${fx(a.z,1)} m로 (저판 하면 기준, 나머지는 해상 시공, GM ${fx(a.f.GM,2)} m)`,patch:{zcut:a.z}});
    if(b) fx_.push({label:`${b.k==="hw"?"원통 높이":"케이슨 높이"}를 ${fx(b.v,1)} m로 (GM ${fx(b.f.GM,2)} m)`,patch:{[b.k]:b.v,zf1:b.zf1,...(b.zf2?{zf2:b.zf2}:{})}});
    fx_.push({label:"최적 제원 찾기 열기 (예인 조건 포함, 크기까지 조정)",act:()=>{ openOpt(); $("optTow").checked=true; $("optPanel").scrollIntoView({behavior:"smooth",block:"start"}); }});
    return {tip:"띄워서 예인할 때 수면이 좁은 원추·기둥에 걸리면 수선면이 작아 복원력(BM)이 거의 없어 GM이 기준에 못 미칩니다. 기둥 일부만 올려 가볍게 예인하거나(나머지는 해상에서 시공), 하부를 넓혀 수면이 넓은 구간에 걸리게 하세요. 해상크레인·플로팅도크로 운반한다면 이 경고는 무시해도 됩니다.",fixes:fx_}; }
  if(/축척해 추정한 값/.test(w)) return {tip:"로터 직경·허브 높이 비율로 기준 터빈 하중을 키운 값이라 개략 검토용입니다. 터빈 계약 후 제작사 인터페이스 하중(ULS·SLS)을 터빈 편집에 붙여넣으세요.",fixes:[{label:"선택 터빈 복제해서 하중표 입력",act:()=>$("tDup").click()}]};
  if(/하중표가 없습니다/.test(w)) return {tip:"하중표가 없으면 터빈의 수평력·모멘트가 빠져 안정검토가 실제보다 유리하게 나옵니다. 제작사 인터페이스 하중(ULS·SLS 12행)을 넣어야 합니다.",
    fixes:[{label:"하중표가 든 터빈 파일 가져오기",act:()=>$("tImp").click()},{label:"선택 터빈 복제해서 하중표 입력",act:()=>$("tDup").click()}]};
  if(/원추 상단 외경 .* 기둥 외경/.test(w)) return {tip:"원추 상단과 기둥이 만나는 곳의 바깥지름이 다르면 단차가 생깁니다.",
    fixes:[{label:`원추 상단 외경을 ${fx(2*R.rso,2)} m로 (기둥에 맞춤)`,patch:{Dt:r1(2*R.rso)}},...(P.shp==="circ"?[{label:`기둥 외경을 ${fx(P.Dt,2)} m로 (원추에 맞춤)`,patch:{Dc:P.Dt}}]:[])]};
  if(/원통 외경이 저판 직경보다/.test(w)) return {tip:"저판이 원통보다 작으면 벽체가 저판 밖으로 나갑니다.",fixes:[{label:`저판 직경을 ${fx(P.Dw,2)} m로`,patch:{Db:P.Dw}}]};
  if(/원추 상단 외경이 하단/.test(w)) return {tip:"원추는 위로 갈수록 좁아져야 합니다.",fixes:[{label:`원추 상단 외경을 기둥 외경 ${fx(2*R.rso,2)} m로`,patch:{Dt:r1(2*R.rso)}}]};
  if(/원추 벽두께가 상단 반경/.test(w)) return {tip:"원추 벽이 너무 두꺼워 안쪽 공간이 없어집니다.",fixes:[{label:`원추 벽두께(수평)를 ${fx(P.Dt/4,2)} m로`,patch:{tkh:r1(P.Dt/4)}}]};
  if(/케이슨 외벽 직경이 하부 슬래브/.test(w)) return {tip:"하부 슬래브는 외벽보다 같거나 커야 합니다(바깥 돌출부 = 뒷굽).",fixes:[{label:`하부 슬래브 직경을 ${fx(P.cDw,2)} m로`,patch:{cDs:P.cDw}}]};
  if(/케이슨 높이가 슬래브와 상판/.test(w)) return {tip:"케이슨 높이는 하부 슬래브와 상판 두께를 합한 것보다 커야 격실이 생깁니다.",fixes:[{label:`케이슨 높이를 ${fx(P.cts+P.ctt+3,2)} m로`,patch:{cH:r1(P.cts+P.ctt+3)}}]};
  if(/샤프트가 케이슨 내부보다/.test(w)) return {tip:"샤프트가 케이슨 외벽 안쪽보다 크면 격실이 없어집니다.",fixes:[{label:`외벽 직경을 ${fx(Math.ceil(2*R.rso+2*P.ctw+6),1)} m로`,patch:{cDw:Math.ceil(2*R.rso+2*P.ctw+6),cDs:Math.max(P.cDs,Math.ceil(2*R.rso+2*P.ctw+6))}}]};
  if(/구조물 상단이 하부 구조 상단보다/.test(w)) return {tip:"기둥이 하부 구조 위로 올라와야 터빈을 올릴 수 있습니다.",fixes:[{label:`구조물 상단을 ${fx(Math.max(R.zIf,R.z2+2),2)} m로 (저판 하면 기준, ${dl(Math.max(R.zIf,R.z2+2)+P.zbDL)})`,patch:{ztop:r1(Math.max(R.zIf,R.z2+2))}}]};
  if(/기둥 벽두께가 반경보다/.test(w)) return {tip:"기둥 벽두께는 반경보다 작아야 합니다.",fixes:[{label:"기둥 벽두께를 0.6 m로",patch:P.shp==="hex"?{hth:0.4}:{tc:0.6}}]};
  if(/기둥 내부 채움 높이가/.test(w)) return {tip:"채움은 구조물 상단을 넘을 수 없습니다.",fixes:[{label:`기둥 내부 채움 높이를 ${fx(P.ztop,2)} m로`,patch:{zf2:P.ztop}}]};
  if(/설계조위가 구조물 상단보다/.test(w)) return {tip:"구조물 상단이 설계조위보다 낮으면 물에 잠깁니다.",fixes:[{label:`구조물 상단을 올림 (저판 하면 기준, ${dl(Math.max(R.zIf,P.hwl-P.zbDL+3)+P.zbDL)})`,patch:{ztop:r1(Math.max(R.zIf,P.hwl-P.zbDL+P.Hw/2+1.5))}}]};
  if(/뜨지 않습니다/.test(w)){ const a=bestZcut({...P,zbal:0,Wadd:0}), fx_=[];
    if(P.zbal>0) fx_.push({label:"격실 물 밸러스트 없애기",patch:{zbal:0}}); if(P.Wadd>0) fx_.push({label:"예인 시 추가중량 없애기",patch:{Wadd:0}});
    if(a) fx_.push({label:`예인 시 상단 높이를 ${fx(a.z,1)} m로`,patch:{zcut:a.z,zbal:0,Wadd:0}});
    return {tip:"예인할 때 무게가 외곽 배수량보다 크면 가라앉습니다. 밸러스트·추가중량을 줄이거나 기둥을 낮춰 예인하세요.",fixes:fx_}; }
  if(/건현이 0.5 m 이하/.test(w)){ const a=bestZcut(P);
    return {tip:"물 위로 나온 높이가 작으면 파도에 물이 넘어 들어옵니다.",fixes:a?[{label:`예인 시 상단 높이를 ${fx(a.z,1)} m로 (건현 ${fx(a.f.fb,2)} m)`,patch:{zcut:a.z}}]:[]}; }
  return {tip:"",fixes:[]};
}
let WI=[];
const FIXN={ztop:["구조물 상단 높이","m"],zcut:["예인 시 상단 높이","m"],Dt:["원추 상단 외경","m"],Dc:["기둥 외경","m"],Db:["저판 직경","m"],tkh:["원추 벽두께(수평)","m"],
  cDs:["하부 슬래브 직경","m"],cDw:["외벽 직경","m"],cH:["케이슨 높이","m"],tc:["기둥 벽두께","m"],hth:["육각 벽두께","m"],zf1:["격실 채움 상단","m"],zf2:["기둥 내부 채움 상단","m"],
  zbal:["물 밸러스트 상단","m"],Wadd:["예인 시 추가중량","kN"],hw:["원통 높이","m"],turb:["터빈",""],
  mt1:["하부 두께","mm"],mt2:["중간 두께","mm"],mt3:["상부 두께","mm"],mtop:["말뚝 상단 표고","m"],mzA:["테이퍼 구간 하단","m"],mzB:["테이퍼 구간 상단","m"],mDt:["상부 직경","m"],mL:["근입깊이","m"],mz1:["하부↔중간 경계","m"],mz2:["중간↔상부 경계","m"],mSc:["세굴 대책",""]};
function fixText(f){
  if(!f.patch) return f.label;
  const P=R.P, nv=(k,v)=>k==="turb"?(turbineOf({...P,turb:v}).name):(k==="mSc"||k==="jSc")?(+v===1?"세굴방지공 설치":"없음"):k==="mTP"?(v==="bolt"?"볼트 연결":"그라우트 연결"):/^(mt\d|jLt|jBrt|jMbt|jPt)$/.test(k)?fx(v,0):k==="zcut"&&!(v>0)?`${fx(P.ztop,2)} (전체)`:fx(v,2);
  const ch=Object.entries(f.patch).filter(([k,v])=>FIXN[k]&&P[k]!==v).map(([k,v])=>`${FIXN[k][0]} ${nv(k,P[k])} → ${nv(k,v)}${FIXN[k][1]?" "+FIXN[k][1]:""}`);
  const i=f.label.indexOf(" ("), note=i>=0&&f.label.endsWith(")")?f.label.slice(i+2,-1):"";
  return ch.join(", ")+(note?` (${note})`:"");
}
function renderWarns(){
  WI=(turbMiss?[{w:`설계에 저장된 터빈("${turbMiss}")이 이 브라우저의 터빈 목록에 없어 ${R.T.name}(으)로 계산했습니다. 그 터빈 파일을 가져오면 원래 터빈으로 돌아갑니다.`,tip:"터빈 자료(제원·하중표)는 도구에 들어 있지 않고 터빈 파일(.json)로 따로 관리합니다.",fixes:[{label:"터빈 파일 가져오기",act:()=>$("tImp").click()}]}]:[])
    .concat(R.warns.map(w=>typeof w==="string"?{w,...warnInfo(w)}:{w:w.msg,...(R.cat==="jacket"?jacketWarnInfo(w):monoWarnInfo(w))}));
  $("warns").innerHTML=WI.map((x,i)=>`<div class="warn"><div><b>주의</b> ${esc(x.w)}</div>${x.tip?`<div class="wtip">팁: ${esc(x.tip)}</div>`:""}${x.fixes.length?`<div class="wfix">${x.fixes.map((f,j)=>`<button class="btn small" type="button" data-wf="${i}_${j}">${f.patch?"자동 수정: ":""}${esc(fixText(f))}</button>`).join("")}</div>`:""}</div>`).join("");
  $("warns").querySelectorAll("[data-wf]").forEach(b=>b.addEventListener("click",()=>{
    const [i,j]=b.dataset.wf.split("_").map(Number), f=WI[i].fixes[j];
    if(f.act){ f.act(); return; }
    const msg=fixText(f), P=readInputs(); setInputs({...P,...f.patch}); run(); toast("수정했습니다: "+msg);
    Object.keys(f.patch).forEach(k=>{ const el=$(k); if(el){ el.classList.add("flash"); setTimeout(()=>el.classList.remove("flash"),1200); } });
  }));
}

/* ---------- 도면 (SVG·DXF 공용 원시도형) ---------- */
function wallIn(P,z){ if(P.type==="caisson") return P.cDw/2-P.ctw; const z1=P.tb+P.hw; return z<=z1?P.Dw/2-P.tw:(P.Dw/2+(P.Dt/2-P.Dw/2)*(z-z1)/P.hk-P.tkh); }
/* 보강 링 목록 (유효한 것만, 번호 ①②…) */
function ringList(P){ return (P.rings||[]).filter(r=>r.D>0&&r.t>0&&r.h>0).map((r,i)=>({...r,no:String.fromCharCode(0x2460+Math.min(i,19))})); }
function secPrims(R){
  const P=R.P, o=[], rso=R.rso, rsi=R.rsi, z2=R.z2, wt=R.wideTop;
  const Rmax=Math.max(R.Rbase,P.Dp/2);
  const zHW=P.hwl-P.zbDL, zMS=P.msl-P.zbDL, zLW=-P.zbDL, zSB=P.sbDL-P.zbDL;
  const xL=-Rmax-26, xR=Rmax+22, zT=Math.max(P.ztop,zHW)+6, zB=-Math.max(4,P.tg+3);
  const fs=Math.max(1.4,(zT-zB)/44);
  const both=(pts,L,extra)=>{ o.push({t:"poly",pts,L,...extra}); o.push({t:"poly",pts:pts.map(p=>[-p[0],p[1]]),L,...extra}); };
  // 지반
  const pit=-P.tg, xr=R.Rbase+1;
  if(zSB>pit+1e-6){ const s=zSB-pit; o.push({t:"poly",L:"SOIL",pts:[[xL,zB],[xL,zSB],[-xr-s,zSB],[-xr,pit],[xr,pit],[xr+s,zSB],[xR,zSB],[xR,zB]]}); }
  else o.push({t:"poly",L:"SOIL",pts:[[xL,zB],[xL,zSB],[xR,zSB],[xR,zB]]});
  o.push({t:"poly",L:"WATER",pts:[[xL,Math.max(zSB,pit)],[xL,zHW],[xR,zHW],[xR,Math.max(zSB,pit)]]});
  o.push({t:"poly",L:"GROUT",pts:[[-R.Rbase,pit],[R.Rbase,pit],[R.Rbase,0],[-R.Rbase,0]]});
  const cw=R.S.hex?R.S.hex.flats/2:rso, ci=R.S.hex?R.S.hex.flats/2-P.hth:rsi;
  // 속채움
  const zb0=P.type==="caisson"?P.cts:P.tb, ztopF=Math.min(P.zf1,P.type==="caisson"?P.cH-P.ctt:z2);
  if(ztopF>zb0){ const pts=[[cw,zb0]]; const n=40; for(let i=0;i<=n;i++){ const z=zb0+(ztopF-zb0)*i/n; pts.push([wallIn(P,z),z]); } pts.push([cw,ztopF]); both(pts,"FILL"); }
  if(P.zf2>P.zc0) o.push({t:"poly",L:"FILL",pts:[[-ci,P.zc0],[ci,P.zc0],[ci,Math.min(P.zf2,P.ztop)],[-ci,Math.min(P.zf2,P.ztop)]]});
  // 콘크리트
  if(P.type==="caisson"){
    const Rw=P.cDw/2, Rwi=Rw-P.ctw;
    o.push({t:"poly",L:"CONC",pts:[[-P.cDs/2,0],[P.cDs/2,0],[P.cDs/2,P.cts],[-P.cDs/2,P.cts]]});
    both([[Rwi,P.cts],[Rw,P.cts],[Rw,P.cH],[Rwi,P.cH]],"CONC");
    both([[cw,P.cH-P.ctt],[Rwi,P.cH-P.ctt],[Rwi,P.cH],[cw,P.cH]],"CONC");
    if(P.cnr>0) both([[cw,P.cts],[Rwi,P.cts],[Rwi,P.cH-P.ctt],[cw,P.cH-P.ctt]],"RAD");
  }else{
    const Rw=P.Dw/2, Rt=P.Dt/2, z1=P.tb+P.hw;
    o.push({t:"poly",L:"CONC",pts:[[-P.Db/2,0],[P.Db/2,0],[P.Db/2,P.tb],[-P.Db/2,P.tb]]});
    both([[Rw-P.tw,P.tb],[Rw,P.tb],[Rw,z1],[Rw-P.tw,z1]],"CONC");
    both([[Rw-P.tkh,z1],[Rw,z1],[Rt,z2],[Rt-P.tkh,z2]],"CONC");
  }
  // 기둥: 육각은 맞변 폭으로 표시
  both([[ci,P.zc0],[cw,P.zc0],[cw,P.ztop],[ci,P.ztop]],"CONC");
  if(P.Dp>0&&P.tp>0) both([[cw,P.ztop-P.tp],[Math.max(P.Dp/2,cw),P.ztop-P.tp],[Math.max(P.Dp/2,cw),P.ztop],[cw,P.ztop]],"CONC");
  const RG=ringList(P);
  RG.forEach(r=>{ both([[r.D/2-r.t,r.z],[r.D/2,r.z],[r.D/2,r.z+r.h],[r.D/2-r.t,r.z+r.h]],"CONC");
    o.push({t:"line",L:"DIM",x1:r.D/2,z1:r.z+r.h,x2:r.D/2+1.2,z2:r.z+r.h+1.0});
    o.push({t:"text",L:"DIM",x:r.D/2+1.3,z:r.z+r.h+1.0,h:fs*.72,s:r.no}); });
  if(RG.length){ const zl=zHW+fs*(2.6+1.05*RG.length);  // 설계조위 표기 위 빈 곳
    o.push({t:"text",L:"TXT",x:xL+.3,z:zl,h:fs*.78,s:"보강 링 (외경 × 두께, 높이, 하단 높이)"});
    RG.forEach((r,i)=>o.push({t:"text",L:"DIM",x:xL+.3,z:zl-fs*(1.1+1.05*i),h:fs*.72,num:1,s:`${r.no} Ø${fx(r.D*1000,0)} × ${fx(r.t*1000,0)}, h ${fx(r.h*1000,0)}, z ${fx(r.z*1000,0)}`})); }
  o.push({t:"line",L:"CEN",x1:0,z1:-P.tg-1.5,x2:0,z2:P.ztop+3});
  // 수위
  const wl=(z,lab,dash)=>{ o.push({t:"line",L:"WL",x1:xL,z1:z,x2:-Rmax-1,z2:z,dash}); o.push({t:"tri",L:"WL",x:xL+3,z,s:0.9}); o.push({t:"text",L:"WL",x:xL+.3,z:z+1.3,h:fs*.85,s:lab}); };
  wl(zHW,`설계조위 ${dl(P.hwl)}`,false);
  if(Math.abs(zMS-zHW)>fs*1.6) wl(zMS,`MSL ${dl(P.msl)}`,true);
  if(Math.abs(zLW-zMS)>fs*1.6&&Math.abs(zLW-zHW)>fs*1.6) wl(zLW,`약최저저조위 ${dl(0)}`,true);
  o.push({t:"text",L:"TXT",x:xL+.3,z:zSB-fs*1.4,h:fs*.85,s:`해저면 ${dl(P.sbDL)}`});
  // 표고
  const lev=(z,x)=>{ o.push({t:"line",L:"TXT",x1:x-1-fs*5.2,z1:z,x2:x+.6,z2:z}); o.push({t:"tri",L:"TXT",x,z,s:.6}); o.push({t:"text",L:"TXT",x:x-1,z:z+.35,h:fs*.75,s:dl(z+P.zbDL),anchor:"end",num:1}); };
  lev(0,-R.Rbase-1); lev(wt,-R.Rwide-1); if(P.type==="cone") lev(z2,-P.Dt/2-1); lev(P.ztop,-Math.max(P.Dp/2,cw)-1);
  // 터빈 인터페이스
  o.push({t:"text",L:"MUT",x:Math.max(P.Dp/2,cw)+1,z:R.zIf,h:fs*.7,s:`◀ 터빈 하중 작용 MSL+${R.T.ifz}`});
  // 치수
  const xd=Rmax+3.5, xd2=Rmax+13;
  const vdim=(za,zb,x,key,sh)=>{ if(zb-za<1e-6) return; o.push({t:"line",L:"DIM",x1:x,z1:za,x2:x,z2:zb});
    [za,zb].forEach(z=>{ o.push({t:"line",L:"DIM",x1:x-.5,z1:z-.5,x2:x+.5,z2:z+.5}); o.push({t:"line",L:"DIM",x1:x-1.4,z1:z,x2:x+.8,z2:z}); });
    const zm=(za+zb)/2, s=fx((zb-za)*1000,0);
    if((zb-za)<fs*3.2) o.push({t:"text",L:"DIM",x:x+.7,z:zm-fs*.3-(sh||0),h:fs*.82,s,key,num:1});
    else o.push({t:"text",L:"DIM",x:x-.35,z:zm,h:fs*.82,s,key,rot:90,anchor:"middle",num:1}); };
  if(P.type==="caisson"){ vdim(0,P.cts,xd,"cts",fs*.55); vdim(P.cts,P.cH,xd,"cHrest"); vdim(P.cH,P.ztop,xd,"colAbove"); }
  else { vdim(0,P.tb,xd,"tb",fs*.55); vdim(P.tb,P.tb+P.hw,xd,"hw",-fs*.2); vdim(P.tb+P.hw,z2,xd,"hk"); vdim(z2,P.ztop,xd,"colAbove"); }
  vdim(0,P.ztop,xd2,"ztop");
  const hdim=(r,z,key,above)=>{ o.push({t:"line",L:"DIM",x1:-r,z1:z,x2:r,z2:z}); [-r,r].forEach(x=>o.push({t:"line",L:"DIM",x1:x-.5,z1:z-.5,x2:x+.5,z2:z+.5}));
    o.push({t:"text",L:"DIM",x:0,z:z+(above?.4:-fs*.95),h:fs*.82,s:fx(r*2000,0),key,anchor:"middle",num:1}); };
  hdim(R.Rbase,-P.tg-1.6,P.type==="caisson"?"cDs":"Db",false);
  if(Math.abs(R.Rwide-R.Rbase)>1e-6) hdim(R.Rwide,wt+.6,P.type==="caisson"?"cDw":"Dw",true);
  if(P.type==="cone") hdim(P.Dt/2,z2+2.2,"Dt",true);
  if(P.Dp>0) hdim(Math.max(P.Dp/2,cw),P.ztop+1.4,"Dp",true);
  o.push({t:"text",L:"MUT",x:cw+.6,z:(Math.max(z2,wt)+P.ztop)/2,h:fs*.78,s:P.type==="caisson"?"샤프트":"기둥"});
  return {o,box:[xL,zB,xR,zT],fs};
}
function planPrims(R){
  const P=R.P, o=[], Rmax=Math.max(R.Rbase,P.Dp/2)+5, fs=Rmax/9.5;
  o.push({t:"circle",L:"CONC",x:0,z:0,r:R.Rbase,fill:1});
  if(P.type==="caisson"){ o.push({t:"circle",L:"LINE",x:0,z:0,r:P.cDw/2}); o.push({t:"circle",L:"HID",x:0,z:0,r:P.cDw/2-P.ctw});
    const n=Math.round(P.cnr), Rwi=P.cDw/2-P.ctw, r0=R.S.hex?R.S.hex.flats/2:R.rso; for(let i=0;i<n;i++){ const a=2*PI*i/n+PI/n; const off=P.ctr/2; [-off,off].forEach(dd=>{ const c=Math.cos(a),s=Math.sin(a); o.push({t:"line",L:"HID",x1:r0*c-dd*s,z1:r0*s+dd*c,x2:Rwi*c-dd*s,z2:Rwi*s+dd*c}); }); } }
  else { if(Math.abs(P.Dw-P.Db)>1e-6) o.push({t:"circle",L:"LINE",x:0,z:0,r:P.Dw/2}); o.push({t:"circle",L:"HID",x:0,z:0,r:P.Dw/2-P.tw}); o.push({t:"circle",L:"LINE",x:0,z:0,r:P.Dt/2}); }
  if(R.S.hex){ const a=P.ha, ai=R.S.hex.ai, hx=r=>[0,1,2,3,4,5].map(i=>[r*Math.cos(i*PI/3),r*Math.sin(i*PI/3)]);
    o.push({t:"poly",L:"LINE",pts:hx(a)}); o.push({t:"poly",L:"LINE",pts:hx(ai)}); }
  else { o.push({t:"circle",L:"LINE",x:0,z:0,r:P.Dc/2}); o.push({t:"circle",L:"LINE",x:0,z:0,r:P.Dc/2-P.tc}); }
  if(P.Dp>0) o.push({t:"circle",L:"HID",x:0,z:0,r:P.Dp/2});
  // 보강 링: 저판 위 내부라 숨은선, 번호는 우상 방향
  const RG=ringList(P);
  RG.forEach((r,i)=>{ o.push({t:"circle",L:"HID",x:0,z:0,r:r.D/2}); o.push({t:"circle",L:"HID",x:0,z:0,r:r.D/2-r.t});
    const a=-(62+i*9)*PI/180, rm=r.D/2-r.t/2, px=rm*Math.cos(a), pz=rm*Math.sin(a), tx=R.Rbase*.55+1, tz=-(R.Rbase+1.4+i*fs*1.05);
    o.push({t:"line",L:"DIM",x1:px,z1:pz,x2:tx-.3,z2:tz+fs*.3}); o.push({t:"dot",L:"DIM",x:px,z:pz,r:.18});
    o.push({t:"text",L:"DIM",x:tx,z:tz,h:fs*.72,s:`${r.no} 보강 링 Ø${fx(r.D*1000,0)}`,num:1}); });
  o.push({t:"line",L:"CEN",x1:-Rmax,z1:0,x2:Rmax,z2:0}); o.push({t:"line",L:"CEN",x1:0,z1:-Rmax,x2:0,z2:Rmax});
  const lab=(r,ang,s)=>{ const a=ang*PI/180, x=r*Math.cos(a), z=r*Math.sin(a); o.push({t:"line",L:"DIM",x1:x,z1:z,x2:x+2.2*Math.cos(a),z2:z+2.2*Math.sin(a)});
    o.push({t:"text",L:"DIM",x:x+2.4*Math.cos(a),z:z+2.4*Math.sin(a),h:fs,s,anchor:Math.cos(a)<0?"end":"start",num:1}); };
  lab(R.Rbase,-35,`Ø${fx(2*R.Rbase*1000,0)} ${P.type==="caisson"?"하부 슬래브":"저판"}`);
  if(P.type==="cone") lab(P.Dt/2,40,`Ø${fx(P.Dt*1000,0)} 원추 상단`); else lab(P.cDw/2,40,`Ø${fx(P.cDw*1000,0)} 외벽`);
  if(R.S.hex) lab(P.ha,150,`육각 a=${fx(P.ha*1000,0)}`); else lab(P.Dc/2,150,`Ø${fx(P.Dc*1000,0)} 기둥`);
  if(P.type==="caisson") lab(P.cDw/2-P.ctw,-145,`격벽 ${Math.round(P.cnr)}개`); else lab(P.Dw/2-P.tw,-145,`Ø${fx((P.Dw-2*P.tw)*1000,0)} 원통 내경`);
  return {o,box:[-Rmax-13,-Rmax-2-(RG.length?1.2+RG.length*fs*1.05:0),Rmax+13,Rmax+2],fs};
}
const SV={CONC:`fill="var(--conc)" stroke="var(--conc-line)" stroke-width=".07" stroke-linejoin="round"`,FILL:`fill="var(--fill)"`,WATER:`fill="var(--water)" opacity=".75"`,
  SOIL:`fill="var(--soil)" opacity=".55"`,GROUT:`fill="var(--grout)" stroke="var(--conc-line)" stroke-width=".06"`,RAD:`fill="none" stroke="var(--conc-line)" stroke-width=".06" stroke-dasharray=".6 .35"`,
  LINE:`fill="none" stroke="var(--conc-line)" stroke-width=".08"`,HID:`fill="none" stroke="var(--conc-line)" stroke-width=".06" stroke-dasharray=".7 .35"`,
  SHT:`fill="none" stroke="#222" stroke-width=".1"`,STEEL:`fill="var(--steel)" stroke="var(--conc-line)" stroke-width=".05" stroke-linejoin="round"`,ROCK:`fill="var(--rock)" opacity=".7"`,PLUG:`fill="var(--soil)" opacity=".3"`,SHC:`fill="#f4f6f6" stroke="#999" stroke-width=".05"`};
const SC={RB:"#c23b2e",RBD:"#c23b2e",SHT:"#222",STX:"#222",SDM:"#1d5e88",SMU:"#5b6970",WL:"var(--water-line)",TXT:"var(--ink)",DIM:"var(--dim)",MUT:"var(--muted)",CEN:"var(--muted)",LINE:"var(--conc-line)",HID:"var(--conc-line)",CONC:"var(--conc-line)"};
function primsSVG(pr,label){
  const Y=z=>-z, [x0,z0,x1,z1]=pr.box, out=[];
  pr.o.forEach(p=>{
    if(p.t==="poly") out.push(`<${p.open?"polyline":"polygon"} points="${p.pts.map(q=>`${q[0].toFixed(3)},${Y(q[1]).toFixed(3)}`).join(" ")}" ${p.open?`fill="none" stroke="${SC[p.L]||"#222"}" stroke-width="${p.w||.07}" stroke-linejoin="round"`:(SV[p.L]||SV.LINE)}${p.w&&!p.open?` stroke-width="${p.w}"`:""}/>`);
    else if(p.t==="circle") out.push(`<circle cx="${p.x}" cy="${Y(p.z)}" r="${p.r}" ${p.fill?`fill="var(--${p.fc||"conc"})" opacity="${p.op||.5}"`:'fill="none"'} ${p.fill?"":(SV[p.L]||SV.LINE).replace('fill="none"',"")}/>`);
    else if(p.t==="line") out.push(`<line x1="${p.x1}" y1="${Y(p.z1)}" x2="${p.x2}" y2="${Y(p.z2)}" stroke="${SC[p.L]||"var(--ink)"}" stroke-width="${p.w||(p.L==="DIM"?.06:p.L==="CEN"?.05:.07)}" ${p.L==="CEN"?'stroke-dasharray="1.6 .5 .3 .5"':p.dash||p.L==="HID"?'stroke-dasharray=".8 .4"':""}/>`);
    else if(p.t==="dot") out.push(`<circle cx="${p.x.toFixed(3)}" cy="${Y(p.z).toFixed(3)}" r="${p.r}" fill="${SC[p.L]||"#c23b2e"}"/>`);
    else if(p.t==="tri") out.push(`<path d="M${p.x} ${Y(p.z)} l${-p.s*.7} ${-p.s} h${p.s*1.4}z" fill="${SC[p.L]}"/>`);
    else if(p.t==="text"){ const y=Y(p.z); out.push(`<text x="${p.x}" y="${y}" font-size="${p.h}" fill="${SC[p.L]||"var(--ink)"}" ${p.num?'font-family="var(--f-num)"':""} ${p.anchor?`text-anchor="${p.anchor}"`:""} ${p.rot?`transform="rotate(-90 ${p.x} ${y})"`:""} ${p.key?`data-k="${p.key}" tabindex="0"`:""}>${esc(p.s)}</text>`); }
  });
  return `<svg viewBox="${x0} ${-z1} ${x1-x0} ${z1-z0}" role="img" aria-label="${label}" style="font-family:var(--f-ui)">${pr.bg?`<rect x="${x0}" y="${-z1}" width="${x1-x0}" height="${z1-z0}" fill="#fff"/>`:""}${out.join("")}</svg>`;
}
function drawSection(){
  $("svgSec").innerHTML=primsSVG(secPrims(R),"정면 단면도");
  $("svgSec").querySelectorAll("[data-k]").forEach(el=>{ el.addEventListener("click",ev=>editDim(el)); el.addEventListener("keydown",ev=>{ if(ev.key==="Enter") editDim(el); }); });
}
function drawPlan(){ $("svgPlan").innerHTML=primsSVG(planPrims(R),"평면도"); }
function editDim(el){
  const k=el.dataset.k, ed=$("dimEdit"), wrap=$("secWrap"), rc=el.getBoundingClientRect(), wr=wrap.getBoundingClientRect();
  ed.hidden=false; ed.style.left=(rc.left-wr.left+wrap.scrollLeft-20)+"px"; ed.style.top=(rc.top-wr.top+wrap.scrollTop-6)+"px";
  ed.value=parseFloat(el.textContent.replace(/,/g,""))||0; ed.focus(); ed.select();
  const done=ok=>{ ed.hidden=true; ed.onkeydown=null; ed.onblur=null; if(!ok) return; const v=parseFloat(ed.value)/1000; if(!isFinite(v)||v<=0) return;
    let id=k,val=v; if(k==="colAbove"){ id="ztop"; val=R.z2+v; } else if(k==="cHrest"){ id="cH"; val=R.P.cts+v; }
    $(id).value=+val.toFixed(4); $(id).classList.add("flash"); setTimeout(()=>$(id).classList.remove("flash"),900); run(); };
  ed.onkeydown=e=>{ if(e.key==="Enter"){e.preventDefault();done(true);} if(e.key==="Escape") done(false); };
  ed.onblur=()=>done(true);
}
/* 높이별 분포 그래프 */
function profileSVG(rows,xk,zk,color,xlab,zmax){
  const W=300,H=220,ml=40,mr=10,mt=10,mb=30, xmax=Math.max(...rows.map(r=>r[xk]))*1.08||1, zM=zmax||Math.max(...rows.map(r=>r[zk]));
  const X=v=>ml+(W-ml-mr)*v/xmax, Yp=z=>H-mb-(H-mt-mb)*z/zM;
  const pts=rows.map(r=>`${X(r[xk]).toFixed(1)},${Yp(r[zk]).toFixed(1)}`);
  const ticks=n=>{const s=Math.pow(10,Math.floor(Math.log10(n/4))), m=[1,2,5,10].find(m=>n/(m*s)<=5)*s; const a=[]; for(let v=0;v<=n+1e-9;v+=m) a.push(v); return a;};
  let g=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${xlab} 분포">`;
  ticks(xmax).forEach(v=>g+=`<line x1="${X(v)}" y1="${mt}" x2="${X(v)}" y2="${H-mb}" stroke="var(--line)" stroke-width=".6"/><text x="${X(v)}" y="${H-mb+12}" font-size="9" fill="var(--muted)" text-anchor="middle" font-family="var(--f-num)">${v}</text>`);
  ticks(zM).forEach(v=>g+=`<text x="${ml-4}" y="${Yp(v)+3}" font-size="9" fill="var(--muted)" text-anchor="end" font-family="var(--f-num)">${v}</text>`);
  g+=`<polygon points="${X(0)},${Yp(rows[0][zk])} ${pts.join(" ")} ${X(0)},${Yp(rows[rows.length-1][zk])}" fill="${color}" opacity=".18"/><polyline points="${pts.join(" ")}" fill="none" stroke="${color}" stroke-width="1.6"/>`;
  g+=`<line x1="${ml}" y1="${H-mb}" x2="${W-mr}" y2="${H-mb}" stroke="var(--muted)" stroke-width=".8"/><line x1="${ml}" y1="${mt}" x2="${ml}" y2="${H-mb}" stroke="var(--muted)" stroke-width=".8"/>`;
  g+=`<text x="${(ml+W-mr)/2}" y="${H-4}" font-size="10" fill="var(--ink)" text-anchor="middle">${xlab}</text><text x="10" y="${(mt+H-mb)/2}" font-size="10" fill="var(--ink)" transform="rotate(-90 10 ${(mt+H-mb)/2})" text-anchor="middle">높이 z (m)</text></svg>`;
  return g;
}

/* ---------- 탭 내용 ---------- */
/* 중력식 고유진동수 */
function htmlGravFreq(){
  const P=R.P, fq=R.freq, g=fq.calc, T=R.T;
  if(!g||!g.cal) return `<p class="warn">선택 터빈(${esc(T.name)})에 타워 치수와 기준 고유진동수가 없어 계산하지 못했습니다.${P.f1>0?` 아래 판정은 비교용 입력값 ${P.f1} Hz로 합니다.`:" 터빈 편집에서 타워 길이·직경이나 기준 진동수를 넣어 주세요."}</p>`+(P.f1>0?bandHtml(fq,[["구조물 (입력값)",P.f1]],P,T):"");
  const c=g.cal;
  let h=`<div class="eq">① 타워: ${c.mode==="geom"?`치수로 계산 (길이 ${fx(c.Lt,1)} m, Ø${c.Db} → Ø${c.Dt} m, 등가 두께 ${fx(c.t*1000,1)} mm)`:`기준 진동수 ${T.fref} Hz로 역산 (EI₀ = ${c.EI0.toExponential(3)} kN·m²)`}, RNA ${fx(c.mR,0)} t → 타워만 하단 고정 f = ${fx(c.fchk,4)} Hz
② 기초: 저판 하면 ~ 구조물 상단 ${P.ztop} m를 보 요소 ${g.nE}개로 나눔. 높이마다 콘크리트 단면(겹치는 부재는 합쳐서 한 번만)의 휨강성과 질량
   E<sub>c</sub> = 8500·∛f<sub>cm</sub> = 8500 × ∛${fx(g.fcm,1)} = ${fx(g.Ec/1000,0)} MPa  (f<sub>cm</sub> = f<sub>ck</sub> ${P.fck} + Δf, KDS 14 20 10, 균열 없는 전단면)
   질량: 콘크리트 ${fx(g.Mc,0)} t + 속채움 ${fx(g.Mf,0)} t + 부가질량(배제수, C<sub>a</sub> = 1, 설계조위 아래) ${fx(g.Ma,0)} t, 단면 회전관성 포함
③ 저판 아래 지반: ${g.fixed?"고정 (경암으로 봄)":`원형 기초 탄성 반무한체 (Gazetas), R = ${fx(g.Rb,2)} m, G = ${fx(g.Gs/1000,0)} MPa, ν = ${g.nu}
   수평 K<sub>h</sub> = 8GR/(2 − ν) = ${g.Kh.toExponential(3)} kN/m,  회전 K<sub>r</sub> = 8GR³/{3(1 − ν)} = ${g.Kr.toExponential(3)} kN·m/rad`}</div>
  <div class="tblwrap"><table class="t" style="max-width:720px"><thead><tr><th>구분</th><th>1차 고유진동수 (Hz)</th><th>주기 (s)</th></tr></thead><tbody>
  <tr><td class="l">타워만 (하단 고정)</td><td class="n">${fx(c.fchk,4)}</td><td class="n">${fx(1/c.fchk,2)}</td></tr>
  <tr><td class="l">기초 + 타워, 저판 고정</td><td class="n">${fx(g.fFix,4)}</td><td class="n">${fx(1/g.fFix,2)}</td></tr>
  <tr class="tot"><td class="l">기초 + 타워 + 지반 (설계값)</td><td class="n">${fx(g.f,4)}</td><td class="n">${fx(1/g.f,2)}</td></tr>
  ${P.f1>0?`<tr><td class="l">비교용 입력값</td><td class="n">${fx(P.f1,3)}</td><td class="n">${fx(1/P.f1,2)}</td></tr>`:""}</tbody></table></div>`;
  h+=bandHtml(fq,[["구조물 (계산값)",g.f]],P,T);
  h+=`<p class="note">${c.mode==="geom"?"":`타워 강성은 기준 진동수 ${T.fref} Hz를 "타워 하단 고정" 값으로 보고 역산했습니다. 기준 진동수가 기초까지 포함한 값이면 역산한 타워가 실제보다 무르고 계산값이 낮게 나올 수 있습니다. `}지반 G ${P.gG} MPa는 가정값입니다(풍화암~연암 수준). 지반조사의 전단파 속도 V<sub>s</sub>로 G = ρV<sub>s</sub>²를 구해 넣으세요.</p>`;
  return h; }
/* 진동수 N.G 자동 수정: soft-stiff(낮추기) / stiff-stiff(높이기) 쪽으로 제원 탐색 — 누를 때만 계산 */
function freqState(P){ const cat=catOf(P.type);
  if(cat==="grav"){ const Q=compute({...P,fast:1}); return Q.freq; }
  if(cat==="mono"){ const Q=computeMono({...P,fast:1}), F=monoFreq(P,Q,computePile(P,Q,{quick:1})); return F.cal?{f:F.lo.f,f2:F.hi.f,ok:F.ok,band:F.band}:null; }
  const Q=computeJacket(P); return Q.fq.cal?{f:Q.fq.f,ok:Q.fq.ok,band:Q.fq.band}:null; }
function freqKnobs(P){ const cat=catOf(P.type);
  if(cat==="grav") return P.shp==="hex"?[{key:"ha",nm:"육각 샤프트 한 변",st:0.1,min:3,max:12,u:"m"}]:[{key:"Dc",nm:"기둥 외경",st:0.2,min:3,max:15,u:"m"}];
  if(cat==="mono") return [{key:"mD",nm:"하부 직경",st:0.25,min:4,max:16,u:"m",with:P.type==="monoT"?"mDt":null}];
  return [{key:"jWb",nm:"하단 다리 간격",st:1,min:Math.max(P.jWt,6),max:50,u:"m"},{key:"jLt",nm:"다리 두께",st:5,min:20,max:120,u:"mm"},{key:"jLD",nm:"다리 외경",st:0.05,min:0.6,max:3,u:"m"}]; }
function freqFixInfo(){
  const P=R.P, cat=catOf(P.type), st=cat==="grav"?R.freq:cat==="mono"?{f:R.fq.lo.f,band:R.fq.band}:{f:R.fq.f,band:R.fq.band}, b=st.band||R.freq, f=st.f;
  const cal=cat==="grav"?R.freq.calc.cal:R.fq.cal, ftw=cal?cal.fchk:null, canUp=ftw&&b.sl<ftw*0.98;
  const kn=freqKnobs(P), k=kn[0], low=f<b.lo, more=kn.length>1?` (안 되면 ${kn.slice(1).map(x=>x.nm).join("·")}까지)`:"";
  let tip=low?"진동수가 1P 쪽으로 낮습니다. 기초를 더 강하게 해야 합니다.":"진동수가 3P 대역에 있습니다. 기초를 유연하게 해서 1P·3P 사이(soft-stiff)로 내리거나, 강하게 해서 3P 위(stiff-stiff)로 올려야 합니다.";
  if(!low&&!canUp) tip+=` 다만 타워만의 진동수(${fx(ftw,3)} Hz)가 stiff-stiff 하한(${fx(b.sl,3)} Hz)보다 낮아서 기초를 아무리 강하게 해도 3P 위로는 못 올립니다.`;
  if(b.r&&b.r.est) tip+=" 지금 회전수는 로터 직경으로 추정한 값이라, 제작사 회전수를 받으면 판정이 바뀔 수 있습니다.";
  if(b.lo>=b.hi) tip+=" 추정 회전수로는 1P와 3P 사이 허용 구간 자체가 없습니다.";
  const fixes=[];
  if(cat==="grav"&&b.lo<b.hi) fixes.push({label:"부재설계 + 진동수 동시 자동 수정 (부재설계 N.G가 생기지 않게)",act:()=>rbFix("freq")});
  if(!low&&b.lo<b.hi) fixes.push({label:`${k.nm}${eul(k.nm)} 줄여 soft-stiff 쪽 찾기${more}`,act:()=>freqSearch(k,-1)});
  if(low||canUp) fixes.push({label:`${k.nm}${eul(k.nm)} 키워 ${low?"허용 구간":"stiff-stiff"} 쪽 찾기${more}`,act:()=>freqSearch(k,+1)});
  return {tip,fixes}; }
function freqSearch(k0,dir){
  toast("고유진동수가 허용 구간에 들어가는 값을 찾는 중입니다…");
  setTimeout(()=>{ const P0=readInputs(); let P={...P0}, ok=false;
    const knobs=freqKnobs(P0), ks=[k0,...knobs.filter(k=>k.key!==k0.key)];   // 첫 항목으로 안 되면 다음 항목을 이어서 바꿈
    outer: for(const k of ks){ for(let n=0;n<80;n++){ const v=Math.round((P[k.key]+dir*k.st)*1000)/1000; if(v<k.min||v>k.max) break;
        P={...P,[k.key]:v,...(k.with?{[k.with]:Math.round((P[k.with]+dir*k.st)*1000)/1000}:{})}; const s=freqState(P); if(s&&s.ok){ ok=true; break outer; } } }
    if(!ok){ toast(`${ks.map(k=>k.nm).join("·")}${eul(ks[ks.length-1].nm)} ${dir<0?"줄여서":"키워서"}는 허용 구간을 찾지 못했습니다`); return; }
    const ch=ks.filter(k=>P[k.key]!==P0[k.key]).map(k=>`${k.nm} ${fx(P0[k.key],k.u==="mm"?0:2)} → ${fx(P[k.key],k.u==="mm"?0:2)} ${k.u}`);
    setInputs(P); run(); toast(`수정했습니다: ${ch.join(", ")}. 다른 검토(안정·응력·회전각 등)를 다시 확인하세요.`);
    ks.forEach(k=>{ const el=$(k.key); if(el&&P[k.key]!==P0[k.key]){ el.classList.add("flash"); setTimeout(()=>el.classList.remove("flash"),1200); } }); },30); }
/* 1P·3P 판정 (회전수 출처, 대역, 위치 그림) — 중력식·모노파일 공용 */
function bandHtml(b,fs,P,T){
  if(!b.r) return `<p class="warn">선택 터빈에 회전수와 로터 직경이 모두 없어 1P·3P 판정을 하지 못했습니다. 터빈 편집에서 로터 직경이나 회전수를 넣으세요.</p>`;
  const r=b.r, m=P.fmar, pc=fx(m*100,0);
  let h=`<div class="eq">${r.est?`회전수: 제작사 자료 없음 → 로터 직경과 날개 끝 속도로 추정 (가정)
  최대 n<sub>max</sub> = 60·v<sub>tip</sub>/(πD) = 60 × ${r.vtip} / (π × ${r.D}) = ${fx(r.max,2)} rpm,  최소 n<sub>min</sub> = ${r.ratio} × n<sub>max</sub> = ${fx(r.min,2)} rpm`:`회전수: 터빈 자료 ${fx(r.min,2)} ~ ${fx(r.max,2)} rpm`}
1P = ${fx(b.f1Pmin,3)} ~ ${fx(b.f1P,3)} Hz,  3P = ${fx(b.f3P,3)} ~ ${fx(b.f3Pmax,3)} Hz,  여유 ±${pc} %
soft-stiff 허용 = 1P 최대 × ${fx(1+m,2)} ~ 3P 최소 × ${fx(1-m,2)} = ${fx(b.lo,3)} ~ ${fx(b.hi,3)} Hz${b.valid?"":" (1P와 3P가 겹쳐 이 구간이 없음)"},  stiff-stiff 허용 = 3P 최대 × ${fx(1+m,2)} = ${fx(b.sl,3)} Hz 이상
${fs.map(([n,f])=>{ const z=b.zone(f); return `${n} f = ${fx(f,3)} Hz → ${z.nm} → ${z.ok?"O.K":"N.G"}`; }).join("\n")}</div>`;
  h+=`<div class="sheet" style="max-width:640px;margin:6px 0">${bandSVG(b,fs.map(x=>x[1]),m)}</div>`;
  if(r.est) h+=`<p class="note">날개 끝 속도 ${r.vtip} m/s와 최소/최대 회전수 비 ${r.ratio}는 가정값입니다(해상 터빈 날개 끝 속도는 보통 80~90 m/s, 비 0.57은 NREL 5MW 기준 터빈 6.9/12.1 rpm). 터빈 계약 후 제작사 회전수를 터빈 편집에 넣으면 그 값으로 바뀝니다.</p>`;
  return h; }
function bandSVG(b,fs,m){
  const W=620,H=96,ml=14,mr=14, fmax=Math.max(b.f3Pmax*(1+m)*1.15,...fs.map(f=>f*1.15),0.1), X=f=>ml+(W-ml-mr)*f/fmax;
  let g=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="1P·3P 대역과 구조물 진동수">`;
  const band=(a,c,col,lab)=>{ g+=`<rect x="${X(a*(1-m))}" y="22" width="${X(c*(1+m))-X(a*(1-m))}" height="30" fill="${col}" opacity=".18"/><rect x="${X(a)}" y="22" width="${X(c)-X(a)}" height="30" fill="${col}" opacity=".45"/><text x="${(X(a)+X(c))/2}" y="16" font-size="11" text-anchor="middle" fill="var(--ink)">${lab}</text>`; };
  band(b.f1Pmin,b.f1P,"var(--l-wave)","1P"); band(b.f3P,b.f3Pmax,"var(--l-wind)","3P");
  for(let v=0;v<=fmax+1e-9;v+=0.1) g+=`<line x1="${X(v)}" y1="52" x2="${X(v)}" y2="57" stroke="var(--muted)"/><text x="${X(v)}" y="70" font-size="10" text-anchor="middle" fill="var(--muted)" font-family="var(--f-num)">${v.toFixed(1)}</text>`;
  g+=`<line x1="${ml}" y1="52" x2="${W-mr}" y2="52" stroke="var(--muted)"/>`;
  fs.forEach(f=>{ const z=b.zone(f); g+=`<line x1="${X(f)}" y1="18" x2="${X(f)}" y2="56" stroke="${z&&z.ok?"var(--ok)":"var(--bad)"}" stroke-width="2"/>`; });
  const f0=fs[0], z0=b.zone(f0); g+=`<text x="${X(f0)}" y="88" font-size="11" text-anchor="middle" fill="var(--ink)">구조물 ${fs.length>1?`${fx(Math.min(...fs),3)}~${fx(Math.max(...fs),3)}`:fx(f0,3)} Hz (${z0?z0.nm:""})</text></svg>`;
  return g; }
function htmlLoad(){
  const P=R.P, t=R.T, TL=R.TL, W=R.wind, V=R.wave, C=R.cur, E=R.eq, fq=R.freq;
  let h=`<h3>1. 터빈 하중</h3><p>${esc(t.name)}: ${t.MW} MW, 허브 MSL+${t.hub} m${t.rotor?`, 로터 Ø${t.rotor} m`:""}, 하중 인터페이스 MSL+${t.ifz} m. ${esc(t.src||"")}</p>`;
  h+=`<div class="eq">인터페이스 높이 (저판 하면 기준) z<sub>if</sub> = ${t.ifz} + ${dl(P.msl)} − ${dl(P.zbDL)} = ${fx(R.zIf,3)} m
터빈+타워 총중량 W<sub>t</sub> = ${fx(R.Wt,1)} kN${t.Wdirect>0?" (직접 입력)":` = (${t.rna} + ${t.tower}) t × 9.81`}</div>`;
  if(TL.uls){ h+=`<p>하중표 연직축: ${t.axis}. 연직력 V = −F<sub>${t.axis}</sub> (압축 +), 수평합력 H와 전도모멘트 M은 나머지 두 성분의 벡터합.</p>`;
    ["uls","sls"].forEach(kd=>{ const rows=TL[kd], g=kd==="uls"?TL.gu:TL.gs;
      h+=`<div class="tblwrap"><table class="t"><thead><tr><th>${kd.toUpperCase()}</th><th>Mx</th><th>My</th><th>Mz</th><th>Fx</th><th>Fy</th><th>Fz</th><th>V (kN)</th><th>H (kN)</th><th>M (kN·m)</th></tr></thead><tbody>`;
      rows.forEach(r=>h+=`<tr class="${r===g?"gov":""}"><td>${r.lab}</td>${[r.Mx,r.My,r.Mz,r.Fx,r.Fy,r.Fz].map(v=>`<td class="n">${fx(v,1)}</td>`).join("")}<td class="n">${fx(r.V,0)}</td><td class="n">${fx(r.H,0)}</td><td class="n">${fx(r.M,0)}</td></tr>`);
      h+=`</tbody></table></div><p class="note">노란 행 = 전도모멘트 M 최대 (${kd==="uls"?"폭풍 조합":"상시·지진 조합"}에 사용)</p>`; }); }
  else h+=`<p class="warn">이 터빈은 하중표가 없어 안정검토에 터빈 하중(수평력·모멘트)이 빠집니다. "선택 터빈 복제해서 편집"에서 제작사 하중표를 붙여넣으세요.</p>`;
  h+=`<h3>2. 고유진동수</h3>`+htmlGravFreq();
  h+=`<h3>3. 풍하중 (구조물 노출부, DNV-RP-C205 Frøya)</h3>
  <div class="eq">U(T, z) = U₀ · {1 + C·ln(z/10)} · {1 − 0.41·I<sub>u</sub>(z)·ln(T/T₀)},  C = 5.73×10⁻² √(1 + 0.148 U₀),  I<sub>u</sub> = 0.06 (1 + 0.043 U₀)(z/10)<sup>−0.22</sup>
기준 ${P.zref} m, ${P.Tavg} s 평균 ${P.Uref} m/s → U₀ (10 m, 1시간) = ${fx(W.U0,3)} m/s,  C = ${fx(W.C,4)}
F = C<sub>s</sub> · ½ρ<sub>a</sub>U² · D,  C<sub>s</sub> = ${P.Cs},  ρ<sub>a</sub> = ${P.rhoa} kg/m³.  적용 범위: 설계조위 ~ 구조물 상단 (타워 풍하중은 터빈 하중에 포함)</div>`;
  h+=`<div class="plots"><div class="sheet">${profileSVG(W.rows,"U","h","var(--l-wind)","풍속 U (m/s)")}</div></div>`;
  h+=`<div class="tblwrap"><table class="t"><thead><tr><th>수면 위 높이 (m)</th><th>I<sub>u</sub></th><th>풍속 (m/s)</th><th>풍압 q (kN/m²)</th><th>폭 D (m)</th><th>풍하중 (kN/m)</th></tr></thead><tbody>`;
  W.rows.forEach(r=>h+=`<tr><td class="n">${fx(r.h,1)}</td><td class="n">${fx(r.Iu,4)}</td><td class="n">${fx(r.U,3)}</td><td class="n">${fx(r.q,3)}</td><td class="n">${fx(r.D,2)}</td><td class="n">${fx(r.f,3)}</td></tr>`);
  h+=`<tr class="tot"><td colspan="5" class="l">합계 F<sub>w</sub> / 저판 하면 모멘트 M<sub>w</sub> (작용 높이 ${fx(W.z,2)} m)</td><td class="n">${fx(W.F,1)} kN / ${fx(W.M,0)} kN·m</td></tr></tbody></table></div>`;
  const sn={conc:"콘크리트 표면",mg:"해양생물 부착"}[P.surf]||"직접 입력";
  const Rn0=V.rows.length?V.rows[V.rows.length-1].Rn:0;
  h+=`<h3>4. 항력계수 (DNV-RP-C205, 원형 단면 정상류)</h3>
  <p>항력계수는 단면 형상과 표면 거칠기로 정해집니다. 원형 단면이 초임계 영역(레이놀즈수 Re &gt; 약 5×10⁵)에 있을 때 상대 거칠기 Δ = k/D에 따라 아래 식으로 정합니다.</p>
  <div class="eq">C<sub>D</sub> = 0.65                       (Δ &lt; 10⁻⁴, 매끈한 면)
C<sub>D</sub> = (29 + 4·log₁₀Δ) / 20       (10⁻⁴ ≤ Δ ≤ 10⁻²)
C<sub>D</sub> = 1.05                       (Δ &gt; 10⁻², 거친 면)
표면 상태: ${sn},  거칠기 k = ${P.ks} mm = ${fx(P.ks/1000,4)} m
레이놀즈수 Re = u·D/ν,  ν = ${P.nu.toExponential(2)} m²/s (해수)
해수면 파랑 유속 기준 Re = ${fx(V.rows.length?V.rows[V.rows.length-1].u:0,2)} × ${fx(V.Dsw,2)} / ${P.nu.toExponential(2)} = ${Rn0.toExponential(2)} → ${Rn0>5e5?"초임계 영역, 위 식 적용":"아임계 영역, 위 식 적용 범위 밖 (확인 필요)"}</div>
  <div class="tblwrap"><table class="t"><thead><tr><th>구간 z (m)</th><th>직경 D (m)</th><th>Δ = k/D</th><th>C<sub>D</sub> 산정</th><th>C<sub>D</sub></th></tr></thead><tbody>`;
  R.cdTbl.forEach(r=>{ const one=Math.abs(r.Da-r.Db)<1e-3;
    const sh=(dd,c)=>dd<1e-4?"0.65 (매끈)":dd>1e-2?"1.05 (거침)":`(29 + 4·log₁₀ ${dd.toExponential(2)}) / 20`;
    h+=`<tr><td class="n">${fx(r.z0,2)} ~ ${fx(r.z1,2)}</td><td class="n">${one?fx(r.Da,3):fx(r.Da,2)+" → "+fx(r.Db,2)}</td><td class="n">${one?r.dA.toExponential(2):r.dA.toExponential(2)+" → "+r.dB.toExponential(2)}</td><td class="fm">${one?sh(r.dA):sh(r.dA)+" → "+sh(r.dB)}</td><td class="n">${one?fx(r.cA,3):fx(r.cA,3)+" → "+fx(r.cB,3)}</td></tr>`; });
  h+=`</tbody></table></div><p class="note">높이마다 그 높이의 외곽 직경으로 C<sub>D</sub>를 다시 계산해 파랑 항력과 조류하중에 씁니다.${R.S.hex?" 육각 샤프트는 면적이 같은 원의 직경으로 원형 식을 적용했습니다. 육각 단면은 모서리에서 흐름이 떨어져 원형보다 클 수 있으니 기준 표로 확인하세요.":""} 파랑 항력은 KC 수에 따른 후류 보정 없이 정상류 값을 썼습니다.</p>`;
  h+=`<h3>5. 파랑하중 (MacCamy-Fuchs 회절 관성력 + 항력)</h3>
  <div class="eq">수심 d = ${fx(V.d,3)} m,  H = ${P.Hw} m,  T = ${P.Tw} s,  ω = 2π/T = ${fx(V.w,4)} rad/s
분산식 ω² = g·k·tanh(kd) → k = ${fx(V.k,5)} /m,  파장 L = ${fx(V.L,2)} m,  해수면 D/L = ${fx(V.DL,3)}
C<sub>M</sub> = 4 / {π(ka)² √(J₁′(ka)² + Y₁′(ka)²)}
관성력 dF<sub>I</sub>/dz = ρ·π·a²·C<sub>M</sub>·ω²(H/2)·cosh(kz)/sinh(kd)
항력 dF<sub>D</sub>/dz = ½·ρ·C<sub>D</sub>(z)·2a·u²,  u = ω(H/2)·cosh(kz)/sinh(kd),  C<sub>D</sub>(z)는 4절 값,  해수면 KC = ${fx(V.KC,2)}
F(t) = F<sub>I</sub>·sin ωt + F<sub>D</sub>·cos ωt·|cos ωt| 의 최대값 (위상 0.5° 간격 탐색)</div>`;
  h+=`<div class="plots"><div class="sheet">${profileSVG(V.rows,"fI","z","var(--l-wave)","관성력 dF/dz (kN/m)",V.d)}</div></div>`;
  h+=`<div class="tblwrap"><table class="t"><thead><tr><th>해저 위 z (m)</th><th>수심 (m)</th><th>반경 a (m)</th><th>ka</th><th>C<sub>M</sub></th><th>가속도 (m/s²)</th><th>관성력 (kN/m)</th><th>유속 (m/s)</th><th>C<sub>D</sub></th><th>항력 (kN/m)</th></tr></thead><tbody>`;
  V.rows.forEach(r=>h+=`<tr><td class="n">${fx(r.z,2)}</td><td class="n">${fx(r.dep,2)}</td><td class="n">${fx(r.a,3)}</td><td class="n">${fx(r.ka,3)}</td><td class="n">${fx(r.CM,3)}</td><td class="n">${fx(r.acc,3)}</td><td class="n">${fx(r.fI,1)}</td><td class="n">${fx(r.u,3)}</td><td class="n">${fx(r.Cd,3)}</td><td class="n">${fx(r.fD,1)}</td></tr>`);
  h+=`</tbody></table></div>`;
  h+=`<table class="t" style="max-width:640px;margin-top:8px"><tbody>
  <tr><td class="l">관성력 진폭 F<sub>I</sub> / M<sub>I</sub></td><td class="n">${fx(V.FI,0)} kN</td><td class="n">${fx(V.MI,0)} kN·m</td></tr>
  <tr><td class="l">항력 진폭 F<sub>D</sub> / M<sub>D</sub></td><td class="n">${fx(V.FD,0)} kN</td><td class="n">${fx(V.MD,0)} kN·m</td></tr>
  <tr class="tot"><td class="l">설계 파랑하중 (최대, 작용 높이 ${fx(V.z,2)} m)</td><td class="n">${fx(V.F,0)} kN</td><td class="n">${fx(V.M,0)} kN·m</td></tr></tbody></table>
  <p class="note">적분 상단: ${P.crest?`파봉 z = ${fx(V.zTop,2)} m까지 (해수면 위는 해수면 값 사용)`:"설계조위까지"}. 높이마다 회절 위상차는 무시하고 같은 위상으로 더했습니다(보수적).</p>`;
  h+=`<h3>6. 조류하중 (DNV-RP-C205 유속 분포)</h3>
  <div class="eq">조석류 u<sub>t</sub>(z) = U<sub>t0</sub>·(z/d)<sup>1/7</sup>                     (z: 해저 위 높이, d = ${fx(V.d,3)} m)
바람 해류 u<sub>w</sub>(z) = U<sub>w0</sub>·(d₀ − (d − z))/d₀  (수면에서 d₀ = ${fx(C.d0,1)} m 깊이까지 직선 감소)
U<sub>w0</sub> = ${P.wcf} × U₀ = ${P.wcf} × ${fx(R.wind.U0,3)} = ${fx(C.Uw0,3)} m/s   (U₀: 10 m 높이 1시간 평균 풍속, 3절)
dF/dz = ½·ρ·C<sub>D</sub>(z)·D(z)·(u<sub>t</sub> + u<sub>w</sub>)²,  ρ = ${fx(V.rho,3)} t/m³
상시: U<sub>t0</sub> = ${P.Uc} m/s (대조기 최강), 바람 해류 없음 → F = ${fx(C.n.F,1)} kN, M = ${fx(C.n.M,0)} kN·m (작용 높이 ${fx(C.n.z,2)} m)
극치: U<sub>t0</sub> = ${P.Uce} m/s (50년) + U<sub>w0</sub> ${fx(C.Uw0,3)} m/s → F = ${fx(C.e.F,1)} kN, M = ${fx(C.e.M,0)} kN·m (작용 높이 ${fx(C.e.z,2)} m)</div>
  <div class="tblwrap"><table class="t"><thead><tr><th>해저 위 z (m)</th><th>직경 D (m)</th><th>C<sub>D</sub></th><th>상시 u (m/s)</th><th>상시 (kN/m)</th><th>극치 조석류</th><th>바람 해류</th><th>극치 u (m/s)</th><th>극치 (kN/m)</th></tr></thead><tbody>`;
  C.e.rows.forEach((r,i)=>{ const n=C.n.rows[i]; h+=`<tr><td class="n">${fx(r.z,2)}</td><td class="n">${fx(r.D,2)}</td><td class="n">${fx(r.Cd,3)}</td><td class="n">${fx(n.u,3)}</td><td class="n">${fx(n.f,2)}</td><td class="n">${fx(r.ut,3)}</td><td class="n">${fx(r.uw,3)}</td><td class="n">${fx(r.u,3)}</td><td class="n">${fx(r.f,2)}</td></tr>`; });
  h+=`</tbody></table></div><p class="note">상시 조류는 LC1·LC4, 극치 조류는 폭풍 조합(LC2·LC3)에 씁니다. 유속 기본값은 가정값입니다. 해양조사 결과로 바꾸세요.</p>`;
  h+=`<h3>7. 지진하중 (진도법)</h3><p>${P.sgc?`지반 분류 PGA ${P.sgc}g × 진도 환산계수 ${P.kfac} = k<sub>h</sub> ${P.kh} (지반 분류는 지반조사 결과로 확정).`:`k<sub>h</sub> = ${P.kh} 직접 입력 (지반조사 전 가정값이면 지반 분류 확정 후 바꾸세요).`}</p><div class="tblwrap"><table class="t"><thead><tr><th>구분</th><th>중량 W (kN)</th><th>높이 z (m)</th><th>F = k<sub>h</sub>·W (kN)</th><th>M = F·z (kN·m)</th></tr></thead><tbody>`;
  E.items.forEach(it=>h+=`<tr><td class="l">${it.nm}</td><td class="n">${fx(it.W,0)}</td><td class="n">${fx(it.z,2)}</td><td class="n">${fx(it.F,0)}</td><td class="n">${fx(it.M,0)}</td></tr>`);
  h+=`<tr class="tot"><td class="l" colspan="3">합계 (k<sub>h</sub> = ${P.kh})</td><td class="n">${fx(E.F,0)}</td><td class="n">${fx(E.M,0)}</td></tr></tbody></table></div>
  <p class="note">동수압은 배제수 질량을 부가질량(C<sub>a</sub> = 1)으로 보고 부심 높이에 작용시켰습니다. 응답스펙트럼 해석 결과가 있으면 그 값으로 바꾸세요.</p>`;
  return h;
}
function htmlStab(){
  const P=R.P, L=R.LC, Rb=R.Rbase;
  let h=`<h3>검토 기준</h3><div class="tblwrap"><table class="t"><thead><tr><th>조합</th><th>터빈 하중</th><th>외력</th><th>수위(부력)</th><th>전도 FS</th><th>활동 FS</th><th>지지력</th><th>편심 · 접지</th></tr></thead><tbody>
  <tr><td>LC1 상시</td><td>SLS 최대 M</td><td>상시 조류</td><td>설계조위</td><td class="n">${P.fsO1}</td><td class="n">${P.fsS1}</td><td>q ≤ q<sub>a</sub></td><td>e ≤ D/8 (저판 들림 없음)</td></tr>
  <tr><td>LC2 폭풍</td><td>ULS 최대 M</td><td>풍+파랑+극치 조류</td><td>설계조위</td><td class="n">${P.fsO2}</td><td class="n">${P.fsS2}</td><td>q ≤ q<sub>a</sub></td><td>A′/A ≥ ${P.aeff}</td></tr>
  <tr><td>LC3 폭풍</td><td>ULS 최대 M</td><td>풍+파랑+극치 조류</td><td>약최저저조위</td><td class="n">${P.fsO2}</td><td class="n">${P.fsS2}</td><td>q ≤ q<sub>a</sub></td><td>A′/A ≥ ${P.aeff}</td></tr>
  <tr><td>LC4 지진</td><td>SLS 최대 M</td><td>지진+상시 조류</td><td>설계조위</td><td class="n">${P.fsO3}</td><td class="n">${P.fsS3}</td><td>q ≤ ${P.qf3}·q<sub>a</sub></td><td>A′/A ≥ ${P.aeff}</td></tr>
  </tbody></table></div>
  <div class="eq">전도 FS = V′·R / M,  활동 FS = μ·V′ / H,  편심 e = M / V′  (R = ${fx(Rb,3)} m, A = ${fx(R.inst.Abase,2)} m², μ = ${P.mu}, q<sub>a</sub> = ${P.qa} kN/m²)
e ≤ R/4 (= D/8)이면 저판 전면 접지: q = V′/A ± M/Z,  Z = πR³/4 = ${fx(PI*Rb**3/4,1)} m³
e > R/4이면 유효면적법 (DNV): A′ = 2[R²·acos(e/R) − e√(R²−e²)],  q′ = V′/A′
모든 조합에 시공 허용 기울기 ${P.tilt}°에 의한 추가 모멘트 ΔM = (ΣW·z − U·z<sub>B</sub>)·tan θ 를 더합니다. 풍·파랑·터빈 하중은 같은 방향으로 겹쳐 봅니다.</div>`;
  L.forEach(l=>{
    h+=`<h3>${l.id} ${l.nm}</h3><div class="tblwrap"><table class="t"><thead><tr><th>하중</th><th>V (kN)</th><th>H (kN)</th><th>M (kN·m)</th><th>비고</th></tr></thead><tbody>`;
    l.items.forEach(it=>h+=`<tr><td class="l">${it.nm}</td><td class="n">${fx(it.V,0)}</td><td class="n">${fx(it.H,0)}</td><td class="n">${fx(it.M,0)}</td><td class="l note">${it.note||""}</td></tr>`);
    h+=`<tr class="tot"><td class="l">합계</td><td class="n">${fx(l.V,0)}</td><td class="n">${fx(l.H,0)}</td><td class="n">${fx(l.M,0)}</td><td></td></tr></tbody></table></div>`;
    h+=`<div class="tblwrap"><table class="t" style="margin-top:6px"><thead><tr><th>검토</th><th>계산</th><th>값</th><th>기준</th><th>판정</th></tr></thead><tbody>
    <tr><td>전도</td><td class="fm">${fx(l.V,0)} × ${fx(Rb,3)} / ${fx(l.M,0)}</td><td class="n">${fx(l.FSo,2)}</td><td class="n">≥ ${l.fs.o}</td><td>${okt(l.okO)}</td></tr>
    <tr><td>활동</td><td class="fm">${P.mu} × ${fx(l.V,0)} / ${fx(l.H,0)}</td><td class="n">${fx(l.FSs,2)}</td><td class="n">≥ ${l.fs.s}</td><td>${okt(l.okS)}</td></tr>
    <tr><td>편심</td><td class="fm">e = ${fx(l.M,0)} / ${fx(l.V,0)}</td><td class="n">${fx(l.e,3)} m</td><td class="n">D/8 = ${fx(Rb/4,3)} m</td><td>${l.noGap?"전면 접지":"일부 들림"}</td></tr>
    <tr><td>유효접지율</td><td class="fm">A′ = ${fx(l.Aeff,1)} m²${l.noGap?"":`, b′ = ${fx(l.be,2)} m, l′ = ${fx(l.le,2)} m`}</td><td class="n">${fx(l.ratioA*100,1)} %</td><td class="n">${l.fs.gap?"전면 접지":"≥ "+fx(P.aeff*100,0)+" %"}</td><td>${okt(l.okE)}</td></tr>
    <tr><td>지지력</td><td class="fm">${l.noGap?`q<sub>max</sub> = ${fx(l.V,0)}/${fx(R.inst.Abase,1)} + ${fx(l.M,0)}/${fx(PI*Rb**3/4,1)} (q<sub>min</sub> = ${fx(l.qmin,1)})`:`q′ = ${fx(l.V,0)} / ${fx(l.Aeff,1)}`}</td><td class="n">${fx(l.qcheck,1)} kN/m²</td><td class="n">≤ ${fx(l.qa,0)}</td><td>${okt(l.okQ)}</td></tr>
    </tbody></table></div>`;
  });
  h+=`<h3>결과 요약</h3><div class="tblwrap"><table class="t"><thead><tr><th>조합</th><th>V′ (kN)</th><th>H (kN)</th><th>M (kN·m)</th><th>전도</th><th>활동</th><th>e (m)</th><th>A′/A</th><th>q (kN/m²)</th><th>판정</th></tr></thead><tbody>`;
  L.forEach(l=>h+=`<tr><td>${l.id}</td><td class="n">${fx(l.V,0)}</td><td class="n">${fx(l.H,0)}</td><td class="n">${fx(l.M,0)}</td><td class="n">${fx(l.FSo,2)}</td><td class="n">${fx(l.FSs,2)}</td><td class="n">${fx(l.e,2)}</td><td class="n">${fx(l.ratioA*100,0)} %</td><td class="n">${fx(l.qcheck,0)}</td><td>${okt(l.ok)}</td></tr>`);
  h+=`</tbody></table></div><p class="note">허용응력(안전율) 방식입니다. 터빈 ULS 하중에 제작사 하중계수가 이미 들어 있는지 확인하세요. DNV 부분계수 방식과 부재 단면설계(철근)는 아직 포함하지 않았습니다.</p>`;
  return h;
}
function zoneName(z){ return z==="wide"?(R.P.type==="cone"?"하부 원통 구간":"케이슨 구간"):z==="cone"?"원추 구간":"기둥 구간"; }
function htmlFlt(){
  const P=R.P, f=R.flt;
  if(!f) return `<p class="bad-t">부유 중량이 외곽 배수량보다 커서 부유하지 않습니다.</p>`;
  let h=`<h3>1. 흘수</h3><p>예인 상태: 속채움 없이 z = ${fx(f.zcut,2)} m까지 타설한 콘크리트${f.Vb>0?` + 격실 물 밸러스트(z ${fx(f.zbal,2)} m까지)`:""} + 추가중량. 외곽이 수밀하다고 보고 외곽선 아래 체적으로 배수량을 계산합니다.</p>`;
  h+=`<div class="eq">콘크리트 W<sub>c</sub> = ${fx(f.Vct,3)} × ${P.gc} = ${fx(f.WcT,1)} kN (도심 z = ${fx(f.zcT,3)} m)${f.Vb>0?`
물 밸러스트 W<sub>b</sub> = ${fx(f.Vb,3)} × ${P.gw} = ${fx(f.Wb,1)} kN (도심 z = ${fx(f.zcB,3)} m)`:""}
부유 중량 W = ${fx(f.W,1)} kN (${fx(f.W/9.81,0)} t),  필요 배수량 ∇ = W / γ<sub>w</sub> = ${fx(f.V,3)} m³
흘수 T = ${fx(f.T,3)} m,  건현 = ${fx(f.fb,3)} m</div>`;
  h+=`<table class="t" style="max-width:600px"><tbody>
  <tr><td class="l">수선 위치</td><td class="${f.zone==="wide"?"ok-t":"bad-t"}">${zoneName(f.zone)} (넓은 구간 상단 z = ${fx(f.wideTop,2)} m)</td></tr>
  <tr><td class="l">여유수심 = ${P.dTow} − ${fx(f.T,3)}</td><td class="n">${fx(f.clr,3)} m ${f.okT?"≥":"<"} ${P.ukc} m → ${f.okT?"O.K":"N.G"}</td></tr></tbody></table>`;
  h+=`<h3>2. 초기 복원성 (GM)</h3><div class="eq">KB = ${fx(f.KB,3)} m
수선면 반경 R = ${fx(f.R,3)} m,  I = π·R⁴/4 = ${fx(f.I,1)} m⁴,  BM = I / ∇ = ${fx(f.BM,3)} m
KG = ${fx(f.KG,3)} m
GM₀ = KB + BM − KG = ${fx(f.GM0,3)} m${f.ifs>0?`
자유수면 보정 = Σi / ∇ = ${fx(f.ifs,1)} / ${fx(f.V,1)} = ${fx(f.FSC,3)} m${P.type==="caisson"&&P.cnr>=2?` (격벽 ${Math.round(P.cnr)}개로 나뉜 격실별 합)`:""}`:""}
GM = ${fx(f.GM,3)} m  ${f.okGM?"≥":"<"} ${P.gmMin} m → ${f.okGM?"O.K":"N.G"}</div>`;
  if(f.GM<0) h+=`<p class="warn">GM이 음수라 스스로 떠서 예인할 수 없습니다. 아래 표에서 예인 시 상단 높이를 낮추거나, 하부를 넓혀 수면이 넓은 구간에 걸리게 하거나, 해상크레인·플로팅도크 운송을 검토하세요.</p>`;
  h+=`<h3>3. 예인 시 상단 높이별 흘수 · GM</h3><div class="tblwrap"><table class="t"><thead><tr><th>예인 시 상단 z (m)</th><th>예인 중량 (t)</th><th>흘수 (m)</th><th>수선 위치</th><th>GM (m)</th><th>판정</th></tr></thead><tbody>`;
  (R.tow||[]).forEach(r=>{ const g=r.f; h+=g?`<tr><td class="n">${fx(r.z,2)}</td><td class="n">${fx(g.W/9.81,0)}</td><td class="n">${fx(g.T,2)}</td><td>${zoneName(g.zone)}</td><td class="n">${fx(g.GM,2)}</td><td>${okt(g.okGM&&g.okT)}</td></tr>`:`<tr><td class="n">${fx(r.z,2)}</td><td colspan="5">부유하지 않음</td></tr>`; });
  h+=`</tbody></table></div><p class="note">현재 입력의 밸러스트·추가중량 조건 그대로 상단 높이만 바꾼 결과입니다. 바람 경사 모멘트와 대각 복원성은 예인 계획이 정해지면 추가합니다.</p>`;
  return h;
}
function htmlWt(){
  const P=R.P, I=R.inst;
  let h=`<h3>1. 콘크리트 체적 및 자중</h3><div class="tblwrap"><table class="t"><thead><tr><th>부재</th><th>산식 (m)</th><th>범위 z (m)</th><th>체적 (m³)</th><th>도심 z (m)</th></tr></thead><tbody>`;
  R.parts.forEach(p=>h+=`<tr><td class="l">${p.nm}</td><td class="fm">${p.f}</td><td class="n">${fx(p.z0,2)} ~ ${fx(p.z1,2)}</td><td class="n">${fx(p.V,3)}</td><td class="n">${fx(p.zc,3)}</td></tr>`);
  h+=`<tr class="sub"><td class="l" colspan="3">부재별 합계</td><td class="n">${fx(R.Vgross,3)}</td><td></td></tr>
  <tr><td class="l" colspan="3">겹침 공제 (같은 자리를 두 번 센 부분)</td><td class="n">−${fx(R.overlap,3)}</td><td></td></tr>
  <tr class="tot"><td class="l" colspan="3">콘크리트 순체적 V<sub>c</sub></td><td class="n">${fx(R.Vc,3)}</td><td class="n">${fx(R.zcC,3)}</td></tr></tbody></table></div>
  <div class="eq">W<sub>c</sub> = ${fx(R.Vc,3)} × ${P.gc} = ${fx(R.Wc,1)} kN (${fx(R.Wc/9.81,1)} t)</div>`;
  h+=`<h3>2. 속채움</h3><div class="tblwrap"><table class="t"><thead><tr><th>구분</th><th>내부 공간 (m³)</th><th>채움 체적 (m³)</th><th>단위중량</th><th>중량 (kN)</th></tr></thead><tbody>
  <tr><td class="l">격실 (z ≤ ${fx(P.zf1,2)})</td><td class="n">${fx(R.Cap1,2)}</td><td class="n">${fx(R.Vf1,2)}</td><td class="n">${P.gf}</td><td class="n">${fx(R.Vf1*P.gf,1)}</td></tr>
  <tr><td class="l">기둥 내부 (z ≤ ${fx(P.zf2,2)})</td><td class="n">${fx(R.Cap2,2)}</td><td class="n">${fx(R.Vf2,2)}</td><td class="n">${P.gf}</td><td class="n">${fx(R.Vf2*P.gf,1)}</td></tr>
  <tr class="tot"><td class="l" colspan="2">합계 (도심 z = ${fx(R.zcF,3)} m)</td><td class="n">${fx(R.Vf,2)}</td><td></td><td class="n">${fx(R.Wf,1)}</td></tr></tbody></table></div>`;
  h+=`<h3>3. 설치 후 부력 및 유효중량</h3><div class="eq">잠긴 외곽 체적 V<sub>sub</sub> = ∫₀<sup>d</sup> π·R<sub>외곽</sub>(z)² dz,  부력 U = V<sub>sub</sub> × γ<sub>w</sub></div>
  <div class="tblwrap"><table class="t"><thead><tr><th>구분</th><th>설계조위 ${dl(P.hwl)}</th><th>약최저저조위 DL 0.000</th></tr></thead><tbody>
  <tr><td class="l">수심 d (m)</td><td class="n">${fx(I.dH,3)}</td><td class="n">${fx(I.dL,3)}</td></tr>
  <tr><td class="l">구조물 (콘크리트+속채움) (kN)</td><td class="n">${fx(I.Wfd,1)}</td><td class="n">${fx(I.Wfd,1)}</td></tr>
  <tr><td class="l">터빈+타워 (kN)</td><td class="n">${fx(I.Wt,1)}</td><td class="n">${fx(I.Wt,1)}</td></tr>
  <tr><td class="l">잠긴 체적 (m³) / 부력 중심 (m)</td><td class="n">${fx(I.VsubH,1)} / ${fx(I.zbH,2)}</td><td class="n">${fx(I.VsubL,1)} / ${fx(I.zbL,2)}</td></tr>
  <tr><td class="l">부력 U (kN)</td><td class="n">−${fx(I.UH,1)}</td><td class="n">−${fx(I.UL,1)}</td></tr>
  <tr class="tot"><td class="l">유효중량 (kN)</td><td class="n">${fx(I.WeH,1)}</td><td class="n">${fx(I.WeL,1)}</td></tr>
  <tr><td class="l">평균 지반반력 (자중만, kN/m²)</td><td class="n">${fx(I.qH,1)}</td><td class="n">${fx(I.qL,1)}</td></tr></tbody></table></div>
  <p class="note">속채움은 포화단위중량, 부력은 외곽 전체 체적으로 계산합니다(구조물 안 물까지 포함한 방식). 안정검토의 연직력은 터빈 하중표의 연직력을 쓰므로 이 표의 터빈 중량과 중복하지 않습니다.</p>`;
  return h;
}
function htmlQty(){
  const P=R.P;
  let h=`<h3>구조물 1기당 수량</h3><div class="tblwrap"><table class="t"><thead><tr><th>공종</th><th>규격</th><th>수량</th><th>단위</th><th>산식</th></tr></thead><tbody>`;
  R.parts.forEach(p=>h+=`<tr><td class="l">콘크리트 ${p.nm}</td><td>f<sub>ck</sub> 45 MPa</td><td class="n">${fx(p.V,3)}</td><td>m³</td><td class="fm">${p.f}</td></tr>`);
  h+=`<tr><td class="l">겹침 공제</td><td></td><td class="n">−${fx(R.overlap,3)}</td><td>m³</td><td class="fm">부재 겹침부</td></tr>
  <tr class="sub"><td class="l">콘크리트 소계</td><td></td><td class="n">${fx(R.Vc,3)}</td><td>m³</td><td></td></tr>
  <tr><td class="l">속채움 (격실)</td><td>γ ${P.gf} kN/m³</td><td class="n">${fx(R.Vf1,3)}</td><td>m³</td><td class="fm">내부 공간 적분</td></tr>
  <tr><td class="l">속채움 (기둥 내부)</td><td></td><td class="n">${fx(R.Vf2,3)}</td><td>m³</td><td class="fm">내부 공간 적분</td></tr>
  <tr><td class="l">저판 하부 그라우팅</td><td>두께 ${P.tg} m</td><td class="n">${fx(R.grout,3)}</td><td>m³</td><td class="fm">π × ${fx(R.Rbase,3)}² × ${P.tg}</td></tr>
  <tr><td class="l">거치용 콘크리트 패드</td><td>${P.padB}×${P.padB}×${P.padH} m</td><td class="n">${fx(R.pad,3)}</td><td>m³</td><td class="fm">${P.padN}개 × ${P.padB}² × ${P.padH}</td></tr>
  </tbody></table></div><p class="note">콘크리트 강도 ${P.fck} MPa.</p>`;
  h+=`<h3>철근 (개략)</h3><div class="tblwrap"><table class="t"><thead><tr><th>부위</th><th>수량 (t)</th></tr></thead><tbody>`;
  R.M.qty.rows.forEach(r=>h+=`<tr><td class="l">${r.nm}</td><td class="n">${fx(r.kg/1000,2)}</td></tr>`);
  h+=`<tr class="tot"><td class="l">합계 (콘크리트 1 m³당 ${fx(R.M.qty.perM3,0)} kg)</td><td class="n">${fx(R.M.qty.tot/1000,2)}</td></tr></tbody></table></div>
  <p class="note">부재설계에서 정한 주철근 규격·간격에 배력철근(0.0018bt 이상)을 더한 개략 수량입니다. 정착·이음·할증은 들어 있지 않습니다.</p>`;
  return h;
}
function htmlReport(){
  const P=R.P, t=R.T;
  const tp=P.type==="caisson"?"케이슨형 (평저 원통 케이슨 + "+(R.S.hex?"육각":"원형")+" 샤프트)":"원추형 (저판 + 하부 원통 + 원추 + 원형 기둥)";
  let h=`<h2>1. 설계 개요</h2><p>해상풍력 발전기 중력식 기초(GBS)의 자중·부력, 외력, 안정(전도·활동·지지력·편심) 및 예인 시 부유 안정을 검토한다.</p>
  <table class="t" style="max-width:720px"><tbody>
  <tr><td class="l">형식</td><td class="l">${tp}</td></tr>
  <tr><td class="l">터빈</td><td class="l">${esc(t.name)} (${t.MW} MW, 허브 MSL+${t.hub} m)</td></tr>
  <tr><td class="l">설치 위치</td><td class="l">저판 하면 ${dl(P.zbDL)}, 해저면 ${dl(P.sbDL)}, 설계조위 ${dl(P.hwl)}, MSL ${dl(P.msl)}</td></tr>
  <tr><td class="l">적용 기준</td><td class="l">DNV-RP-C205 (풍속·파랑), DNV-ST-0126 (유효면적), 항만 및 어항 설계기준 (안전율)</td></tr>
  <tr><td class="l">재료</td><td class="l">콘크리트 ${P.gc} kN/m³ (f<sub>ck</sub> 45 MPa), 속채움 ${P.gf} kN/m³, 해수 ${P.gw} kN/m³</td></tr></tbody></table>
  <div class="fig">${primsSVG(secPrims(R),"정면 단면도")}</div><p class="note" style="text-align:center">그림 1. 정면 단면도</p>`;
  h+=`<h2>2. 자중 및 부력</h2>`+htmlWt();
  h+=`<h2>3. 하중</h2>`+htmlLoad();
  h+=`<h2>4. 하중조합 및 안정검토</h2>`+htmlStab();
  h+=`<h2>5. 부재설계</h2>`+htmlMember();
  h+=`<h2>6. 예인 시 부유 안정</h2>`+htmlFlt();
  h+=`<h2>7. 수량</h2>`+htmlQty();
  return h;
}

/* ---------- 다운로드 ---------- */
let DLS=null;
(async()=>{ try{ DLS=await window.claude?.use?.("downloads"); }catch(e){ DLS=null; }
  /* DLS가 없으면(claude.ai 밖) saveFile이 일반 브라우저 다운로드로 받음 */ })();
async function saveFile(name,data){
  if(!DLS){ // claude.ai 밖(사내 PC, 웹 서버)에서는 일반 브라우저 다운로드
    try{ const blob=data instanceof Blob?data:new Blob([data],{type:/\.json$/.test(name)?"application/json":"application/octet-stream"}); const u=URL.createObjectURL(blob), a=document.createElement("a");
      a.href=u; a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(u),4000); toast("파일을 내려받았습니다"); }
    catch(e){ toast("파일을 내려받지 못했습니다"); } return; }
  try{ await DLS.save({filename:name,data}); toast("파일을 저장했습니다"); }
  catch(e){ toast(e&&e.code==="declined"?"저장을 취소했습니다":"파일을 저장하지 못했습니다 ("+(e&&e.code||"오류")+")"); }
}
const stamp=()=>{ const d=new Date(); return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}`; };
const baseName=()=>($("svName").value.trim()||({caisson:"해상풍력기초_중력식_케이슨형",cone:"해상풍력기초_중력식_원추형",mono1:"해상풍력기초_모노파일_단일직경",monoT:"해상풍력기초_모노파일_테이퍼형",jk3:"해상풍력기초_자켓_3각",jk4:"해상풍력기초_자켓_4각"}[R.P.type])).replace(/[\\/:*?"<>|]/g,"_");

/* DOCX */
function xe(s){ return String(s).replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c])); }
function runs(text,opt){ return `<w:r>${opt?`<w:rPr>${opt}</w:rPr>`:""}<w:t xml:space="preserve">${xe(text)}</w:t></w:r>`; }
function para(text,style,ropt){ return `<w:p>${style?`<w:pPr><w:pStyle w:val="${style}"/></w:pPr>`:""}${runs(text,ropt)}</w:p>`; }
function docxBody(el){
  const out=[];
  const walk=node=>{ for(const n of node.children){
    const tg=n.tagName;
    if(tg==="H2") out.push(para(n.textContent,"Heading1"));
    else if(tg==="H3") out.push(para(n.textContent,"Heading2"));
    else if(tg==="P") out.push(para(n.textContent,n.classList.contains("note")?"Note":null));
    else if(n.classList&&n.classList.contains("eq")) n.textContent.split("\n").forEach(l=>out.push(para(l,"Eq")));
    else if(tg==="TABLE") out.push(docxTable(n));
    else if(n.classList&&(n.classList.contains("fig")||n.classList.contains("plots"))) {}
    else if(n.children&&n.children.length) walk(n);
    else if(n.textContent.trim()) out.push(para(n.textContent));
  } };
  walk(el); return out.join("");
}
function docxTable(tb){
  const rows=[...tb.rows]; let maxc=0; rows.forEach(r=>{ let c=0; [...r.cells].forEach(td=>c+=td.colSpan||1); maxc=Math.max(maxc,c); });
  const w=Math.floor(9600/Math.max(1,maxc));
  let x=`<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="0" w:type="auto"/><w:tblBorders>${["top","left","bottom","right","insideH","insideV"].map(b=>`<w:${b} w:val="single" w:sz="4" w:space="0" w:color="999999"/>`).join("")}</w:tblBorders></w:tblPr><w:tblGrid>${Array(maxc).fill(`<w:gridCol w:w="${w}"/>`).join("")}</w:tblGrid>`;
  rows.forEach(r=>{ const head=r.parentElement.tagName==="THEAD"||r.classList.contains("tot");
    x+=`<w:tr>`+[...r.cells].map(td=>{ const sp=td.colSpan||1, num=td.classList.contains("n");
      return `<w:tc><w:tcPr><w:tcW w:w="${w*sp}" w:type="dxa"/>${sp>1?`<w:gridSpan w:val="${sp}"/>`:""}${head?'<w:shd w:val="clear" w:color="auto" w:fill="E8EEF2"/>':""}</w:tcPr><w:p><w:pPr><w:pStyle w:val="Cell"/>${num?'<w:jc w:val="right"/>':""}</w:pPr>${runs(td.textContent.trim(),head?"<w:b/>":"")}</w:p></w:tc>`; }).join("")+`</w:tr>`; });
  return x+`</w:tbl>`+para("","Cell");
}
async function makeDocx(){
  const mono=R.cat==="mono", jack=R.cat==="jacket"; if(!mono&&!jack&&!R.tow) R.tow=towTable(R.P);
  const tmp=document.createElement("div"); tmp.innerHTML=`<h2>해상풍력발전기 기초 구조계산서</h2><p>${esc(baseName())} · ${new Date().toLocaleDateString("ko-KR")}</p>`+(jack?htmlJkReport():mono?htmlMonoReport():htmlReport());
  const body=docxBody(tmp);
  const font=`<w:rFonts w:ascii="Malgun Gothic" w:hAnsi="Malgun Gothic" w:eastAsia="맑은 고딕"/>`;
  const styles=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults><w:rPrDefault><w:rPr>${font}<w:sz w:val="19"/><w:lang w:eastAsia="ko-KR"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="80" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="320" w:after="120"/><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="2" w:color="1D5E88"/></w:pBdr><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:sz w:val="28"/><w:color w:val="1D5E88"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="200" w:after="80"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:sz w:val="22"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Eq"><w:name w:val="Eq"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="0"/><w:ind w:left="240"/><w:shd w:val="clear" w:color="auto" w:fill="F2F5F6"/></w:pPr><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:eastAsia="맑은 고딕"/><w:sz w:val="17"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Note"><w:name w:val="Note"/><w:basedOn w:val="Normal"/><w:rPr><w:color w:val="5B6970"/><w:sz w:val="17"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Cell"><w:name w:val="Cell"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:rPr><w:sz w:val="16"/></w:rPr></w:style>
<w:style w:type="table" w:styleId="TableGrid"><w:name w:val="Table Grid"/><w:tblPr><w:tblCellMar><w:left w:w="60" w:type="dxa"/><w:right w:w="60" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style></w:styles>`;
  const doc=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="567" w:footer="567" w:gutter="0"/></w:sectPr></w:body></w:document>`;
  const z=new JSZip();
  z.file("[Content_Types].xml",`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`);
  z.file("_rels/.rels",`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
  z.file("word/_rels/document.xml.rels",`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
  z.file("word/document.xml",doc); z.file("word/styles.xml",styles);
  return z.generateAsync({type:"blob",mimeType:"application/vnd.openxmlformats-officedocument.wordprocessingml.document"});
}
$("btnDocx").addEventListener("click",async()=>{ try{ const b=await makeDocx(); saveFile(`${baseName()}_구조계산서_${stamp()}.docx`,b); }catch(e){ toast("계산서를 만들지 못했습니다"); console.error(e); } });

/* XLSX */
function makeXlsx(){
  if(!R.tow) R.tow=towTable(R.P);
  const P=R.P, wb=XLSX.utils.book_new(), add=(nm,aoa,w)=>{ const ws=XLSX.utils.aoa_to_sheet(aoa); if(w) ws["!cols"]=w.map(x=>({wch:x})); XLSX.utils.book_append_sheet(wb,ws,nm); };
  const r2=v=>typeof v==="number"&&isFinite(v)?Math.round(v*1000)/1000:v;
  add("요약",[["해상풍력발전기 기초 설계도구 결과",baseName()],["형식",P.type==="caisson"?"케이슨형":"원추형"],["터빈",R.T.name],[],
    ["조합","V' (kN)","H (kN)","M (kN·m)","전도 FS","활동 FS","편심 e (m)","유효접지율","지반반력 (kN/m²)","허용 (kN/m²)","판정"],
    ...R.LC.map(l=>[l.id+" "+l.nm,l.V,l.H,l.M,l.FSo,l.FSs,l.e,l.ratioA,l.qcheck,l.qa,l.ok?"O.K":"N.G"].map(r2)),[],
    ["콘크리트 (m³)",r2(R.Vc)],["콘크리트 (t)",r2(R.Wc/9.81)],["속채움 (m³)",r2(R.Vf)],["예인 흘수 (m)",R.flt?r2(R.flt.T):"-"],["부유 GM (m)",R.flt?r2(R.flt.GM):"-"]],[34,12,12,14,10,10,10,10,14,12,8]);
  add("입력값",[["항목","값"],...Object.keys(P).filter(k=>!["rings","customT"].includes(k)).map(k=>[k,P[k]]),[],["보강 링 D,t,h,z"],...(P.rings||[]).map(r=>[r.D,r.t,r.h,r.z])],[14,14]);
  add("자중",[["부재","산식","z0","z1","체적 (m³)","도심 z (m)"],...R.parts.map(p=>[p.nm,p.f,p.z0,p.z1,r2(p.V),r2(p.zc)]),["겹침 공제","","","",r2(-R.overlap),""],["순체적","","","",r2(R.Vc),r2(R.zcC)],[],
    ["속채움 격실 (m³)",r2(R.Vf1)],["속채움 기둥 내부 (m³)",r2(R.Vf2)],["부력 설계조위 (kN)",r2(R.inst.UH)],["부력 약최저저조위 (kN)",r2(R.inst.UL)]],[22,60,8,8,12,12]);
  if(R.TL.uls) add("터빈하중",[["구분","성분","Mx","My","Mz","Fx","Fy","Fz","V","H","M"],...R.TL.uls.map(r=>["ULS",r.lab,r.Mx,r.My,r.Mz,r.Fx,r.Fy,r.Fz,r2(r.V),r2(r.H),r2(r.M)]),...R.TL.sls.map(r=>["SLS",r.lab,r.Mx,r.My,r.Mz,r.Fx,r.Fy,r.Fz,r2(r.V),r2(r.H),r2(r.M)])]);
  add("풍하중",[["U0 (m/s)",r2(R.wind.U0)],["C",r2(R.wind.C)],[],["수면 위 높이","Iu","풍속","풍압","폭 D","풍하중 (kN/m)"],...R.wind.rows.map(r=>[r.h,r.Iu,r.U,r.q,r.D,r.f].map(r2)),[],["합계 F (kN)",r2(R.wind.F)],["M (kN·m)",r2(R.wind.M)]]);
  add("파랑하중",[["d",r2(R.wave.d)],["k",R.wave.k],["L",r2(R.wave.L)],[],["z","수심","a","ka","CM","가속도","관성력 (kN/m)","유속","CD","항력 (kN/m)"],...R.wave.rows.map(r=>[r.z,r.dep,r.a,r.ka,r.CM,r.acc,r.fI,r.u,r.Cd,r.fD].map(r2)),[],
    ["FI",r2(R.wave.FI)],["MI",r2(R.wave.MI)],["FD",r2(R.wave.FD)],["MD",r2(R.wave.MD)],["설계 F",r2(R.wave.F)],["설계 M",r2(R.wave.M)]]);
  add("항력계수",[["표면 거칠기 k (mm)",P.ks],["식","Δ<1e-4: 0.65 / 1e-4~1e-2: (29+4log10Δ)/20 / >1e-2: 1.05"],[],["z0","z1","D 시작","D 끝","Δ 시작","Δ 끝","CD 시작","CD 끝"],...R.cdTbl.map(r=>[r.z0,r.z1,r.Da,r.Db,r.dA,r.dB,r.cA,r.cB].map(r2))]);
  add("조류하중",[["상시 Ut0",P.Uc],["극치 Ut0",P.Uce],["바람 해류 Uw0",r2(R.cur.Uw0)],["영향 깊이 d0",r2(R.cur.d0)],[],["z","D","CD","상시 u","상시 kN/m","극치 조석류","바람 해류","극치 u","극치 kN/m"],
    ...R.cur.e.rows.map((r,i)=>[r.z,r.D,r.Cd,R.cur.n.rows[i].u,R.cur.n.rows[i].f,r.ut,r.uw,r.u,r.f].map(r2)),[],["상시 F",r2(R.cur.n.F)],["상시 M",r2(R.cur.n.M)],["극치 F",r2(R.cur.e.F)],["극치 M",r2(R.cur.e.M)]]);
  add("하중조합",R.LC.flatMap(l=>[[l.id+" "+l.nm],["하중","V","H","M"],...l.items.map(it=>[it.nm,r2(it.V),r2(it.H),r2(it.M)]),["합계",r2(l.V),r2(l.H),r2(l.M)],[]]),[36,14,14,14]);
  { const M=R.M, row=(k,nm,kind)=>{ const c=M[k]; if(!c) return null; const rb=M.rb[k];
      return kind==="hoop"?[nm,`${rb.bar}@${rb.s}`,"Tu (kN/m)",r2(c.Tu),"ϕTn",r2(c.phiTn),"fs (MPa)",r2(c.fs),"s_max",r2(c.smax),c.ok?"O.K":"N.G"]
       :kind==="col"?[nm,`${rb.bar}@${rb.s} (${c.nb}본)`,"Mu (kN·m)",r2(c.Mu),"ϕMn",r2(c.phiMn),"Pu",r2(c.Pu),"ρ",r2(c.rho),c.ok?"O.K":"N.G"]
       :[nm,`${rb.bar}@${rb.s}`,"Mu (kN·m/m)",r2(c.Mu),"ϕMn",r2(c.phiMn),"Vu",r2(c.Vu),"ϕVc",r2(c.phiVc),c.ok?"O.K":"N.G"]; };
    add("부재설계",[["부재","배근","단면력","값","저항","값","","","",""," 판정"],row("sT","저판 상면"),row("sB","저판 하면"),row("wH","벽체 원주","hoop"),row("wV","벽체 연직"),row("kH","원추 원주","hoop"),row("kM","원추 자오선"),row("cL","기둥 하단","col"),[],
      ["철근재료표"],["번호","부재","위치","규격","간격","개수","길이 (m)","총길이 (m)","단위중량 (kg/m)","중량 (t)"],...M.qty.detail.rows.map(r=>[r.mk,r.nm,r.face,r.bar,r.s,r.n,r2(r.L),r2(r.tot),r.w,r2(r.kg/1000)]),["합계","","","","","","","","",r2(M.qty.tot/1000)]].filter(Boolean),[26,20,14,12,8,12,10,10,8,10,8]); }
  add("예인",[["상단 z","예인 중량 (t)","흘수","수선 위치","GM","판정"],...R.tow.map(r=>r.f?[r.z,r2(r.f.W/9.81),r2(r.f.T),r.f.zone,r2(r.f.GM),r.f.okGM&&r.f.okT?"O.K":"N.G"]:[r.z,"부유하지 않음"])]);
  add("수량",[["공종","수량","단위"],...R.parts.map(p=>[p.nm,r2(p.V),"m³"]),["겹침 공제",r2(-R.overlap),"m³"],["콘크리트 소계",r2(R.Vc),"m³"],["속채움",r2(R.Vf),"m³"],["그라우팅",r2(R.grout),"m³"],["거치 패드",r2(R.pad),"m³"],["철근 (개략)",r2(R.M.qty.tot/1000),"t"]],[30,12,6]);
  return new Blob([XLSX.write(wb,{bookType:"xlsx",type:"array"})],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
}
$("btnXlsx").addEventListener("click",()=>{ try{ saveFile(`${baseName()}_계산표_${stamp()}.xlsx`,R.cat==="jacket"?makeXlsxJacket():R.cat==="mono"?makeXlsxMono():makeXlsx()); }catch(e){ toast("계산표를 만들지 못했습니다"); console.error(e); } });

/* DXF (R12, mm) */
function dxfStr(s){ return String(s).replace(/[^\x20-\x7e]/g,c=>"\\U+"+c.codePointAt(0).toString(16).toUpperCase().padStart(4,"0")); }
const DXL={RB:[1,"REBAR"],RBD:[1,"REBAR"],SHT:[7,"SHEET"],STX:[7,"TEXT"],SDM:[3,"DIM"],SMU:[8,"TEXT"],SHC:[8,"HIDDEN"],CONC:[8,"CONC"],FILL:[42,"FILL"],WATER:[5,"WATER"],SOIL:[34,"SOIL"],GROUT:[9,"GROUT"],STEEL:[4,"STEEL"],ROCK:[33,"ROCK"],PLUG:[34,"SOIL"],RAD:[8,"HIDDEN"],LINE:[7,"OUTLINE"],HID:[8,"HIDDEN"],CEN:[1,"CENTER"],WL:[5,"WATER"],TXT:[7,"TEXT"],DIM:[3,"DIM"],MUT:[8,"TEXT"]};
function primsDXF(prs){
  const k=1000, e=[]; const L=l=>(DXL[l]||[7,"0"])[1];
  prs.forEach(({pr,dx,dy})=>pr.o.forEach(p=>{
    const X=x=>((x+dx)*k).toFixed(1), Yd=z=>((z+dy)*k).toFixed(1);
    if(p.t==="poly"){ e.push(`0\nPOLYLINE\n8\n${L(p.L)}\n66\n1\n70\n${p.open?0:1}\n10\n0\n20\n0\n30\n0`); p.pts.forEach(q=>e.push(`0\nVERTEX\n8\n${L(p.L)}\n10\n${X(q[0])}\n20\n${Yd(q[1])}\n30\n0`)); e.push(`0\nSEQEND\n8\n${L(p.L)}`); }
    else if(p.t==="line") e.push(`0\nLINE\n8\n${L(p.L)}\n10\n${X(p.x1)}\n20\n${Yd(p.z1)}\n30\n0\n11\n${X(p.x2)}\n21\n${Yd(p.z2)}\n31\n0`);
    else if(p.t==="dot") e.push(`0\nCIRCLE\n8\n${L(p.L)}\n10\n${X(p.x)}\n20\n${Yd(p.z)}\n30\n0\n40\n${(p.r*k).toFixed(1)}`);
    else if(p.t==="circle") e.push(`0\nCIRCLE\n8\n${L(p.L)}\n10\n${X(p.x)}\n20\n${Yd(p.z)}\n30\n0\n40\n${(p.r*k).toFixed(1)}`);
    else if(p.t==="tri"){ const pts=[[p.x,p.z],[p.x-p.s*.7,p.z+p.s],[p.x+p.s*.7,p.z+p.s]]; e.push(`0\nSOLID\n8\n${L(p.L)}\n10\n${X(pts[0][0])}\n20\n${Yd(pts[0][1])}\n30\n0\n11\n${X(pts[1][0])}\n21\n${Yd(pts[1][1])}\n31\n0\n12\n${X(pts[2][0])}\n22\n${Yd(pts[2][1])}\n32\n0\n13\n${X(pts[2][0])}\n23\n${Yd(pts[2][1])}\n33\n0`); }
    else if(p.t==="text"){ const h=(p.h*k*.8).toFixed(1), ha=p.anchor==="middle"?1:p.anchor==="end"?2:0;
      e.push(`0\nTEXT\n8\n${L(p.L)}\n10\n${X(p.x)}\n20\n${Yd(p.z)}\n30\n0\n40\n${h}\n1\n${dxfStr(p.s)}${p.rot?"\n50\n90":""}${ha?`\n72\n${ha}\n11\n${X(p.x)}\n21\n${Yd(p.z)}\n31\n0`:""}`); }
  }));
  const layers=[...new Set(Object.values(DXL).map(v=>v[1]))].map(n=>{ const c=Object.values(DXL).find(v=>v[1]===n)[0]; return `0\nLAYER\n2\n${n}\n70\n0\n62\n${c}\n6\n${n==="HIDDEN"?"DASHED":n==="CENTER"?"CENTER":"CONTINUOUS"}`; });
  const lt=[["CONTINUOUS","Solid line",[]],["DASHED","Dashed",[500,-250]],["CENTER","Center",[1600,-400,300,-400]]].map(([n,d,p])=>`0\nLTYPE\n2\n${n}\n70\n0\n3\n${d}\n72\n65\n73\n${p.length}\n40\n${p.reduce((a,b)=>a+Math.abs(b),0)}${p.map(v=>`\n49\n${v}`).join("")}`);
  return `0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1009\n9\n$INSUNITS\n70\n4\n0\nENDSEC\n0\nSECTION\n2\nTABLES\n0\nTABLE\n2\nLTYPE\n70\n${lt.length}\n${lt.join("\n")}\n0\nENDTAB\n0\nTABLE\n2\nLAYER\n70\n${layers.length}\n${layers.join("\n")}\n0\nENDTAB\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n${e.join("\n")}\n0\nENDSEC\n0\nEOF\n`;
}
$("btnDxf").addEventListener("click",async()=>{ try{
  if(R.cat==="mono"){ await dxfMono(); return; }
  if(R.cat==="jacket"){ await dxfJacket(); return; }
  const sp=secPrims(R), pp=planPrims(R), off=sp.box[2]-pp.box[0]+10;
  const all=primsDXF([{pr:sp,dx:0,dy:0},{pr:pp,dx:off,dy:R.P.ztop/2}]);
  const z=new JSZip(); z.file(`${baseName()}_일반도.dxf`,all); z.file(`${baseName()}_단면도.dxf`,primsDXF([{pr:sp,dx:0,dy:0}])); z.file(`${baseName()}_평면도.dxf`,primsDXF([{pr:pp,dx:0,dy:0}]));
  { const sh=sheetPrims(R); z.file(`${baseName()}_배근도_A3.dxf`,primsDXF([{pr:sh,dx:0,dy:0}])); }
  z.file("읽어보기.txt",`단위: mm, 원점 = 기초 중심 · 저판 하면.\r\n레이어: REBAR 철근, SHEET 도면 테두리·표, CONC 콘크리트, FILL 속채움, WATER 해수·수위, SOIL 지반, GROUT 그라우팅, HIDDEN 숨은선(격벽 등), CENTER 중심선, DIM 치수, TEXT 문자.\r\n한글 문자는 \\U+ 형식으로 들어 있어 AutoCAD에서 그대로 보입니다. 글꼴이 깨지면 문자 스타일을 한글 글꼴(맑은 고딕 등)로 바꾸세요.\r\n`);
  saveFile(`${baseName()}_도면_${stamp()}.zip`,await z.generateAsync({type:"blob"}));
}catch(e){ toast("도면을 만들지 못했습니다"); console.error(e); } });

/* ---------- 3D ---------- */
let G3=null;
function build3D(){
  const box=$("view3d");
  if(typeof THREE==="undefined"){ $("note3d").textContent="3D 라이브러리를 불러오지 못했습니다."; return; }
  if(!G3){
    const rnd=new THREE.WebGLRenderer({antialias:true,alpha:true}); rnd.setPixelRatio(Math.min(2,window.devicePixelRatio||1)); rnd.localClippingEnabled=true;
    box.appendChild(rnd.domElement);
    const scene=new THREE.Scene(), cam=new THREE.PerspectiveCamera(40,1,0.5,2000);
    scene.add(new THREE.HemisphereLight(0xffffff,0x667788,0.9)); const dlt=new THREE.DirectionalLight(0xffffff,0.6); dlt.position.set(60,120,80); scene.add(dlt);
    const ctl=new THREE.OrbitControls(cam,rnd.domElement); ctl.enableDamping=true;
    G3={rnd,scene,cam,ctl,grp:null,first:true};
    const size=()=>{ const w=box.clientWidth,h=box.clientHeight; if(!w||!h) return; rnd.setSize(w,h); cam.aspect=w/h; cam.updateProjectionMatrix(); };
    new ResizeObserver(size).observe(box); size();
    const loop=()=>{ requestAnimationFrame(loop); if(!box.offsetParent) return; ctl.update(); rnd.render(scene,cam); }; loop();
    ["cut3d","water3d","fill3d"].forEach(id=>$(id).addEventListener("change",()=>{ dirty.m3d=1; build3D(); }));
  }
  const {scene,cam,ctl}=G3; if(G3.grp){ scene.remove(G3.grp); G3.grp.traverse(o=>{ if(o.geometry) o.geometry.dispose(); }); }
  if(R.cat==="mono"){ build3DMono(); return; }
  if(R.cat==="jacket"){ build3DJacket(); return; }
  const P=R.P, grp=new THREE.Group(); G3.grp=grp; scene.add(grp);
  const cut=$("cut3d").checked, clip=cut?[new THREE.Plane(new THREE.Vector3(0,0,-1),0)]:[];
  const dark=matchMedia("(prefers-color-scheme: dark)").matches&&document.documentElement.dataset.theme!=="light"||document.documentElement.dataset.theme==="dark";
  const mC=new THREE.MeshStandardMaterial({color:dark?0x8a9497:0xbfc6c6,roughness:.85,side:THREE.DoubleSide,clippingPlanes:clip});
  const mF=new THREE.MeshStandardMaterial({color:0xd9bf7f,roughness:1,side:THREE.DoubleSide,clippingPlanes:clip});
  const lathe=(pts,m)=>{ const g=new THREE.LatheGeometry(pts.map(p=>new THREE.Vector2(Math.max(0.0001,p[0]),p[1])),72); grp.add(new THREE.Mesh(g,m)); };
  const ring=(ri,ro,z0,z1,m)=>lathe([[ri,z0],[ro,z0],[ro,z1],[ri,z1],[ri,z0]],m);
  if(P.type==="caisson"){ const Rw=P.cDw/2,Rwi=Rw-P.ctw; ring(0,P.cDs/2,0,P.cts,mC); ring(Rwi,Rw,P.cts,P.cH,mC); ring(R.rso,Rwi,P.cH-P.ctt,P.cH,mC);
    const n=Math.round(P.cnr), L=Rwi-R.rso, hh=P.cH-P.ctt-P.cts; for(let i=0;i<n;i++){ const a=2*PI*i/n+PI/n, g=new THREE.BoxGeometry(L,hh,P.ctr), m=new THREE.Mesh(g,mC); m.position.set((R.rso+L/2)*Math.cos(a),P.cts+hh/2,-(R.rso+L/2)*Math.sin(a)); m.rotation.y=a; grp.add(m); } }
  else { const Rw=P.Dw/2,Rt=P.Dt/2,z1=P.tb+P.hw; ring(0,P.Db/2,0,P.tb,mC); ring(Rw-P.tw,Rw,P.tb,z1,mC); lathe([[Rw-P.tkh,z1],[Rw,z1],[Rt,R.z2],[Rt-P.tkh,R.z2],[Rw-P.tkh,z1]],mC); }
  if(R.S.hex){ const sh=new THREE.Shape(), ho=new THREE.Path(), a=P.ha, ai=R.S.hex.ai;
    for(let i=0;i<6;i++){ const t=i*PI/3; i?sh.lineTo(a*Math.cos(t),a*Math.sin(t)):sh.moveTo(a*Math.cos(t),a*Math.sin(t)); } sh.closePath();
    for(let i=0;i<6;i++){ const t=i*PI/3; i?ho.lineTo(ai*Math.cos(t),ai*Math.sin(t)):ho.moveTo(ai*Math.cos(t),ai*Math.sin(t)); } ho.closePath(); sh.holes.push(ho);
    const g=new THREE.ExtrudeGeometry(sh,{depth:P.ztop-P.zc0,bevelEnabled:false}); g.rotateX(-PI/2); g.translate(0,P.zc0,0); grp.add(new THREE.Mesh(g,mC)); }
  else ring(R.rsi,R.rso,P.zc0,P.ztop,mC);
  if(P.Dp>0&&P.tp>0) ring(R.rso,Math.max(P.Dp/2,R.rso),P.ztop-P.tp,P.ztop,mC);
  (P.rings||[]).forEach(r=>{ if(r.D>0&&r.t>0&&r.h>0) ring(r.D/2-r.t,r.D/2,r.z,r.z+r.h,mC); });
  if($("fill3d").checked){ const zb0=P.type==="caisson"?P.cts:P.tb, zt=Math.min(P.zf1,P.type==="caisson"?P.cH-P.ctt:R.z2);
    if(zt>zb0){ const pts=[[R.rso,zb0]]; for(let i=0;i<=24;i++){ const z=zb0+(zt-zb0)*i/24; pts.push([wallIn(P,z)-0.02,z]); } pts.push([R.rso,zt],[R.rso,zb0]); lathe(pts,mF); }
    if(P.zf2>P.zc0) ring(0,R.rsi-0.02,P.zc0,Math.min(P.zf2,P.ztop),mF); }
  const dH=P.hwl-P.zbDL, Rb=R.Rbase;
  if($("water3d").checked){ const g=new THREE.CircleGeometry(Rb*2.6,64); g.rotateX(-PI/2); g.translate(0,dH,0);
    grp.add(new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:0x3f8fc9,transparent:true,opacity:.28,side:THREE.DoubleSide,depthWrite:false}))); }
  { const g=new THREE.CylinderGeometry(Rb*2.6,Rb*2.6,1,64); g.translate(0,-P.tg-0.5,0); grp.add(new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:0x9c8459,roughness:1}))); }
  const camKey=P.type+"|"+Math.round(P.ztop)+"|"+Math.round(Rb);
  if(G3.camKey!==camKey){ G3.camKey=camKey; const H=P.ztop, dd=Math.max(H*1.25,3.4*Rb); cam.position.set(dd*0.75,H*0.55+dd*0.25,dd*0.95); ctl.target.set(0,H*0.38,0); cam.far=dd*20; cam.updateProjectionMatrix(); }
  $("note3d").textContent=`${P.type==="caisson"?"케이슨형":"원추형"} · 구조물 높이 ${fx(P.ztop,2)} m · 콘크리트 ${fx(R.Vc,0)} m³${cut?" · 앞쪽 절반을 잘라 내부를 보여 줍니다":""}`;
}

/* ---------- 설계 저장 ---------- */
let DB=null, UID=null, svCol=null;
const LSD="gbs-designs-v1";
function lsList(){ try{ return JSON.parse(localStorage.getItem(LSD)||"[]"); }catch(e){ return []; } }
function lsPut(a){ try{ localStorage.setItem(LSD,JSON.stringify(a)); return true; }catch(e){ return false; } }
async function svRefresh(){
  let items=[];
  if(svCol){ try{ const q=await svCol.orderBy("savedAt","desc").limit(200).get(); items=q.docs.map(d=>({id:d.id,...d.data()})); }catch(e){ $("svList").innerHTML=`<p class="note">저장 목록을 읽지 못했습니다.</p>`; return; } }
  else items=lsList().sort((a,b)=>b.savedAt-a.savedAt);
  $("svList").innerHTML=items.length?items.map(it=>`<div class="sv-row"><div><b>${esc(it.name)}</b><small>${new Date(it.savedAt).toLocaleString("ko-KR")}</small></div><div class="sv-btns"><button class="btn small" data-load="${esc(it.id)}">열기</button><button class="btn small" data-del="${esc(it.id)}">삭제</button></div></div>`).join("")
    :`<p class="note">저장된 설계가 없습니다. 이름을 넣고 저장하세요.${svCol?"":" (이 브라우저에만 저장)"}</p>`;
  $("svList").querySelectorAll("[data-load]").forEach(b=>b.addEventListener("click",()=>{ const it=items.find(x=>x.id===b.dataset.load); try{ const o=JSON.parse(it.P); setInputs(o); $("svName").value=it.name; run(); toast(`"${it.name}"을 열었습니다`); }catch(e){ toast("설계를 열지 못했습니다"); } }));
  $("svList").querySelectorAll("[data-del]").forEach(b=>{ let armed=false; b.addEventListener("click",async()=>{ if(!armed){ armed=true; b.textContent="확인"; b.classList.add("danger"); setTimeout(()=>{armed=false;b.textContent="삭제";b.classList.remove("danger");},3000); return; }
    if(svCol){ try{ await svCol.doc(b.dataset.del).delete(); }catch(e){ toast("삭제하지 못했습니다"); } } else lsPut(lsList().filter(x=>x.id!==b.dataset.del)); svRefresh(); }); });
}
$("svBtn").addEventListener("click",async()=>{
  const name=$("svName").value.trim(); if(!name){ $("svName").focus(); toast("설계 이름을 넣으세요"); return; }
  const P=readInputs(), id=name.replace(/[^\w가-힣-]+/g,"_").slice(0,80)||("d"+Date.now()), doc={name,savedAt:Date.now(),P:JSON.stringify(P)};
  if(svCol){ try{ await svCol.doc(id).set(doc); }catch(e){ toast("저장하지 못했습니다 ("+(e&&e.code||"오류")+")"); return; } }
  else { const a=lsList().filter(x=>x.id!==id); a.push({id,...doc}); if(!lsPut(a)){ toast("저장하지 못했습니다"); return; } }
  toast(`"${name}"을 저장했습니다`); svRefresh();
});
$("svExport").addEventListener("click",()=>saveFile(`${baseName()}_${stamp()}.json`,JSON.stringify({app:"gbs-tool",ver:3,name:$("svName").value.trim(),P:readInputs()},null,1)));
$("svImport").addEventListener("change",async e=>{ const f=e.target.files[0]; if(!f) return; try{ const o=JSON.parse(await f.text()); setInputs(o.P||o); if(o.name) $("svName").value=o.name; run(); toast("설계를 가져왔습니다"); }catch(err){ toast("JSON 파일을 읽지 못했습니다"); } e.target.value=""; });
(async()=>{
  let to=setTimeout(()=>{ if(!svCol) svRefresh(); },10000);
  try{ DB=await window.claude?.use?.("db"); const U=await window.claude?.use?.("user"); if(DB&&U){ UID=await U.id(); if(UID) svCol=DB.collection("data/users/"+UID); } }catch(e){ svCol=null; }
  clearTimeout(to); svRefresh();
})();



/* ---------- 배근도 (A3 시트) ---------- */
const SCALES=[50,75,100,125,150,200,250,300,400,500];
function mapPrims(o,f,dx,dz){ return o.map(p=>{ const q={...p};
  if(p.pts) q.pts=p.pts.map(([x,z])=>[x*f+dx,z*f+dz]);
  if("x" in p){ q.x=p.x*f+dx; q.z=p.z*f+dz; } if("x1" in p){ q.x1=p.x1*f+dx; q.z1=p.z1*f+dz; q.x2=p.x2*f+dx; q.z2=p.z2*f+dz; }
  if(p.t==="circle") q.r=p.r*f; if(p.t==="dot") q.r=p.r; if(p.t==="tri") q.s=p.s; return q; }); }
/* 하부 구조 배근 상세 (우측 반단면, 실제 크기 m). th: 글자 높이(m) */
function rbDetail(R,th){
  const P=R.P, M=R.M, D=M.qty.detail, rb=M.rb, cais=P.type==="caisson", o=[], lab=[];
  const cv=P.cov/1000, db=b=>BARS[b].d/1000, dr=th*0.16;
  const tb=cais?P.cts:P.tb, Rb=R.Rbase, Rw=cais?P.cDw/2:P.Dw/2, tw=cais?P.ctw:P.tw, Rwi=Rw-tw, z1=cais?P.cH:P.tb+P.hw, z2=R.z2;
  const cw=R.S.hex?R.S.hex.flats/2:R.rso, ci=R.S.hex?R.S.hex.flats/2-P.hth:R.rsi;
  const zv=Math.max(z2,z1)+Math.max(4,(cw-ci)*4);           // 표시 상단 (기둥은 끊어서 표시)
  const C=pts=>o.push({t:"poly",L:"CONC",pts,w:th*.05});
  // 콘크리트 외곽
  C([[0,0],[Rb,0],[Rb,tb],[0,tb]]);
  C([[Rwi,tb],[Rw,tb],[Rw,z1],[Rwi,z1]]);
  if(!cais) C([[Rw-P.tkh,z1],[Rw,z1],[P.Dt/2,z2],[P.Dt/2-P.tkh,z2]]);
  else C([[cw,P.cH-P.ctt],[Rwi,P.cH-P.ctt],[Rwi,P.cH],[cw,P.cH]]);
  C([[ci,P.zc0],[cw,P.zc0],[cw,zv],[ci,zv]]);
  // 기둥 상단 끊음 표시
  const bz=zv, bk=(cw-ci); o.push({t:"poly",open:1,L:"SHT",w:th*.05,pts:[[ci-bk*.3,bz],[ci+bk*.3,bz],[ci+bk*.45,bz+bk*.25],[ci+bk*.55,bz-bk*.25],[ci+bk*.7,bz],[cw+bk*.3,bz]]});
  const line=(x1,z1_,x2,z2_)=>o.push({t:"line",L:"RB",x1,z1:z1_,x2,z2:z2_,w:th*.09});
  const dots=(x0,zA,x1,zB,s)=>{ const L=Math.hypot(x1-x0,zB-zA), n=Math.max(1,Math.floor(L/s)); for(let i=0;i<=n;i++){ const f=i/n; o.push({t:"dot",L:"RBD",x:x0+(x1-x0)*f,z:zA+(zB-zA)*f,r:dr}); } };
  const tag=(x,z,txt)=>lab.push({x,z,txt});
  // 저판: X방향 주철근(선) + Y방향(점)
  const dT=db(rb.sT.bar), dB=db(rb.sB.bar);
  const zt=tb-cv-dT/2, zb=cv+dB/2, xe=Rb-cv-Math.max(dT,dB)/2;
  line(0,zt,xe,zt); line(xe,zt,xe,zt-Math.min(0.5,tb*0.45)); dots(0,zt-dT,xe-dT,zt-dT,rb.sT.s/1000);
  line(0,zb,xe,zb); line(xe,zb,xe,zb+Math.min(0.5,tb*0.45)); dots(0,zb+dB,xe-dB,zb+dB,rb.sB.s/1000);
  tag(xe*0.55,zt,`S1 ${rb.sT.bar}@${rb.sT.s} (상면, 2방향)`); tag(xe*0.4,zb,`S2 ${rb.sB.bar}@${rb.sB.s} (하면, 2방향)`);
  for(let x=0.3;x<xe;x+=0.6) o.push({t:"line",L:"RB",x1:x,z1:zb,x2:x,z2:zt,w:th*.04});
  tag(xe*0.25,(zt+zb)/2,"S3 H13@600×600 (연결철근)");
  // 하부 벽체: 원주(점, 바깥쪽) + 연직(선, 안쪽)
  const dH=db(rb.wH.bar), dV=db(rb.wV.bar), dW=D.dists.wall;
  const xiH=Rwi+cv+dH/2, xoH=Rw-cv-dH/2, xiV=Rwi+cv+dH+dV/2, xoV=Rw-cv-dH-db(dW.bar)/2;
  dots(xiH,tb+0.1,xiH,z1-0.05,rb.wH.s/1000); dots(xoH,tb+0.1,xoH,z1-0.05,rb.wH.s/1000);
  line(xiV,zb+dB,xiV,z1+(cais?-cv:0.6)); line(xiV,zb+dB,xiV-0.6,zb+dB);
  line(xoV,zb+dB,xoV,z1-cv); line(xoV,zb+dB,xoV-0.6,zb+dB);
  tag(xoH,(tb+z1)/2,`W1 ${rb.wH.bar}@${rb.wH.s} (원주, 양면)`); tag(xiV,tb+(z1-tb)*0.3,`W2 ${rb.wV.bar}@${rb.wV.s} (연직 내측)`); tag(xoV,tb+(z1-tb)*0.75,`W3 ${dW.bar}@${dW.s} (연직 외측)`);
  if(!cais){
    // 원추: 법선 방향으로 피복만큼 띄운 선
    const ax=P.Dt/2-Rw, az=z2-z1, L=Math.hypot(ax,az), ux=ax/L, uz=az/L, nx=uz, nz=-ux; // 바깥 법선 (x+, z−)
    const off=(x,z,dd)=>[x+nx*dd,z+nz*dd];
    const dKH=db(rb.kH.bar), dKM=db(rb.kM.bar), Ki=D.rows.find(r=>r.mk==="K3");
    const tn=P.tkh/Math.sqrt(1+(ax/az)**2);
    const iA=off(Rw-P.tkh,z1,(cv+dKH/2)*1), iB=off(P.Dt/2-P.tkh,z2,(cv+dKH/2));
    const oA=off(Rw,z1,-(cv+dKH/2)), oB=off(P.Dt/2,z2,-(cv+dKH/2));
    dots(iA[0],iA[1],iB[0],iB[1],rb.kH.s/1000); dots(oA[0],oA[1],oB[0],oB[1],rb.kH.s/1000);
    const iA2=off(Rw-P.tkh,z1,cv+dKH+dKM/2), iB2=off(P.Dt/2-P.tkh,z2,cv+dKH+dKM/2), oA2=off(Rw,z1,-(cv+dKH+dKM/2)), oB2=off(P.Dt/2,z2,-(cv+dKH+dKM/2));
    line(iA2[0]-ux*0.6,iA2[1]-uz*0.6,iB2[0]+ux*0.6,iB2[1]+uz*0.6); line(oA2[0]-ux*0.4,oA2[1]-uz*0.4,oB2[0],oB2[1]);
    tag((oA[0]+oB[0])/2,(oA[1]+oB[1])/2,`K1 ${rb.kH.bar}@${rb.kH.s} (원주, 양면)`);
    tag(iA2[0]+(iB2[0]-iA2[0])*0.35,iA2[1]+(iB2[1]-iA2[1])*0.35,`K2 ${rb.kM.bar}@${rb.kM.s} (자오선 내측)`);
    tag(oA2[0]+(oB2[0]-oA2[0])*0.7,oA2[1]+(oB2[1]-oA2[1])*0.7,`K3 ${Ki.bar}@${Ki.s} (자오선 외측)`);
  } else {
    const T1=D.rows.find(r=>r.mk==="T1"), dt=db(T1.bar), zt1=P.cH-cv-dt/2, zb1=P.cH-P.ctt+cv+dt/2;
    line(cw+cv,zt1,Rwi+tw-cv,zt1); line(cw+cv,zb1,Rwi-cv,zb1); dots(cw+cv,zt1-dt,Rwi-cv,zt1-dt,T1.s/1000); dots(cw+cv,zb1+dt,Rwi-cv,zb1+dt,T1.s/1000);
    tag((cw+Rwi)/2,zt1,`T1 ${T1.bar}@${T1.s} (상판, 양면 2방향)`);
    const R1=D.rows.find(r=>r.mk==="R1"); if(R1){ o.push({t:"poly",L:"HID",pts:[[cw,tb],[Rwi,tb],[Rwi,P.cH-P.ctt],[cw,P.cH-P.ctt]]}); tag((cw+Rwi)/2,(tb+P.cH-P.ctt)/2,`R1·R2 ${R1.bar}@${R1.s} (방사형 격벽, 숨은선)`); }
  }
  // 기둥: 띠철근(점, 바깥) + 축방향 2단(선)
  const C1=rb.cL, C2=D.tie, dL=db(C1.bar), dTi=db(C2.bar);
  const xo=cw-cv-dTi/2, xi=ci+cv+dTi/2, xoL=cw-cv-dTi-dL/2, xiL=ci+cv+dTi+dL/2, zc0=P.zc0;
  dots(xo,zc0+0.15,xo,zv-0.2,C2.s/1000); dots(xi,zc0+0.15,xi,zv-0.2,C2.s/1000);
  line(xoL,zb+dB,xoL,zv); line(xoL,zb+dB,xoL+0.8,zb+dB); line(xiL,zb+dB,xiL,zv); line(xiL,zb+dB,xiL-0.8,zb+dB);
  tag(xoL,zv-(zv-Math.max(z1,z2))*0.35,`C1 ${C1.bar}@${C1.s} (축방향, 내·외 2단, ${M.cL.nb}본)`); tag(xo,zv-(zv-Math.max(z1,z2))*0.75,`C2 ${C2.bar}@${C2.s} (${M.cL.tie?"띠철근":"원주 배력"}, 양면)`);
  // 치수 (두께)
  const dimT=(x1,z,x2,txt)=>{ o.push({t:"line",L:"SDM",x1,z1:z,x2,z2:z,w:th*.04}); o.push({t:"text",L:"SDM",x:(x1+x2)/2,z:z+th*.3,h:th*.8,s:txt,anchor:"middle",num:1}); };
  const dimV=(x,z1_,z2_,txt)=>{ o.push({t:"line",L:"SDM",x1:x,z1:z1_,x2:x,z2:z2_,w:th*.04}); [z1_,z2_].forEach(z=>o.push({t:"line",L:"SDM",x1:x-th*.4,z1:z,x2:x+th*.4,z2:z,w:th*.04})); o.push({t:"text",L:"SDM",x:x-th*.3,z:(z1_+z2_)/2,h:th*.8,s:txt,anchor:"middle",rot:90,num:1}); };
  dimV(-th*2.2,0,tb,fx(tb*1000,0)); dimT(Rwi,z1+th*1.4,Rw,fx(tw*1000,0)); dimT(ci,zv+th*1.6,cw,fx((cw-ci)*1000,0));
  o.push({t:"line",L:"CEN",x1:0,z1:-0.8,x2:0,z2:zv+1});
  o.push({t:"text",L:"SMU",x:0.2,z:-th*2.2,h:th*.8,s:`순피복 ${P.cov} mm (해양 노출), 정착길이 40d, 원주 철근은 이음 위치를 엇갈리게 배치`});
  // 인출선 + 철근 번호 (오른쪽 열에 정렬)
  const xl=Rb+th*2, minGap=th*1.5; lab.sort((a,b)=>b.z-a.z); let last=Infinity;
  lab.forEach(l=>{ let zt_=Math.min(l.z,last-minGap); last=zt_; o.push({t:"dot",L:"RBD",x:l.x,z:l.z,r:dr*1.6}); o.push({t:"poly",open:1,L:"SDM",w:th*.04,pts:[[l.x,l.z],[xl-th*0.6,zt_],[xl,zt_]]}); o.push({t:"text",L:"STX",x:xl+th*.3,z:zt_-th*.35,h:th,s:l.txt}); });
  return {o,w:xl+th*22,h:zv+th*2,z0:-th*3,x0:-th*4};
}
/* 기둥 단면 배근도 (실제 크기 m) */
function rbColumn(R,th){
  const P=R.P, M=R.M, D=M.qty.detail, rb=M.rb, o=[], cv=P.cov/1000, dL=BARS[rb.cL.bar].d/1000, dT=BARS[D.tie.bar].d/1000, dr=th*0.16;
  if(R.S.hex){ const hx=r=>[0,1,2,3,4,5].map(i=>[r*Math.cos(i*PI/3+PI/6),r*Math.sin(i*PI/3+PI/6)]); o.push({t:"poly",L:"CONC",pts:hx(P.ha),w:th*.05}); o.push({t:"poly",L:"SHC",pts:hx(R.S.hex.ai),w:th*.05}); }
  else { o.push({t:"circle",L:"LINE",x:0,z:0,r:R.rso}); o.push({t:"circle",L:"LINE",x:0,z:0,r:R.rsi}); }
  const ro=(R.S.hex?R.S.hex.flats/2:R.rso), ri=(R.S.hex?R.S.hex.flats/2-P.hth:R.rsi);
  const r1=ro-cv-dT-dL/2, r2=ri+cv+dT+dL/2, n=Math.max(8,Math.ceil(2*PI*(R.rso-cv-dL/2)/(rb.cL.s/1000)));
  for(let i=0;i<n;i++){ const a=2*PI*i/n; o.push({t:"dot",L:"RBD",x:r1*Math.cos(a),z:r1*Math.sin(a),r:Math.max(dr,dL/2)}); o.push({t:"dot",L:"RBD",x:r2*Math.cos(a),z:r2*Math.sin(a),r:Math.max(dr,dL/2)}); }
  o.push({t:"circle",L:"RB",x:0,z:0,r:ro-cv-dT/2}); o.push({t:"circle",L:"RB",x:0,z:0,r:ri+cv+dT/2});
  o.push({t:"line",L:"CEN",x1:-ro*1.15,z1:0,x2:ro*1.15,z2:0}); o.push({t:"line",L:"CEN",x1:0,z1:-ro*1.15,x2:0,z2:ro*1.15});
  const lb=(x,z,txt,ang)=>{ const a=ang*PI/180, x2=ro*1.25*Math.cos(a), z2=ro*1.25*Math.sin(a); o.push({t:"poly",open:1,L:"SDM",w:th*.04,pts:[[x,z],[x2,z2],[x2+(Math.cos(a)>0?th*2:-th*2),z2]]}); o.push({t:"text",L:"STX",x:x2+(Math.cos(a)>0?th*2.3:-th*2.3),z:z2-th*.35,h:th,s:txt,anchor:Math.cos(a)>0?"start":"end"}); };
  lb(r1*Math.cos(PI/5),r1*Math.sin(PI/5),`C1 ${rb.cL.bar} 외측 ${n}본`,40); lb(r2*Math.cos(-PI/5),r2*Math.sin(-PI/5),`C1 ${rb.cL.bar} 내측 ${n}본`,-35);
  lb(-(ro-cv-dT/2)*Math.cos(PI/4),(ro-cv-dT/2)*Math.sin(PI/4),`C2 ${D.tie.bar}@${D.tie.s}`,140);
  o.push({t:"text",L:"SDM",x:0,z:-ro*1.32,h:th*.8,s:R.S.hex?`육각 맞변 ${fx(R.S.hex.flats*1000,0)}, 벽두께 ${fx(P.hth*1000,0)}`:`Ø${fx(R.rso*2000,0)}, 벽두께 ${fx((R.rso-R.rsi)*1000,0)}`,anchor:"middle",num:1});
  return {o,r:ro*1.32+th*14};
}
/* 철근재료표 (시트 좌표 m 단위로 그림, k: 종이 1 mm = k m) */
function rbTable(R,k,x0,ztop,wmm){
  const rows=R.M.qty.detail.rows, o=[], cols=[["번호",10],["부재 · 위치",50],["규격",13],["간격",12],["개수",15],["길이(m)",16],["총길이(m)",18],["중량(t)",wmm-134]];
  const rh=5.2*k, th=2.3*k; let z=ztop;
  const xs=[]; let x=x0; cols.forEach(c=>{ xs.push(x); x+=c[1]*k; }); const xe=x;
  const hline=zz=>o.push({t:"line",L:"SHT",x1:x0,z1:zz,x2:xe,z2:zz,w:k*.18});
  o.push({t:"text",L:"STX",x:x0,z:z+1.5*k,h:3.2*k,s:"철근재료표"}); hline(z);
  const row=(vals,bold)=>{ vals.forEach((v,i)=>o.push({t:"text",L:"STX",x:i===1?xs[i]+1.2*k:(i>=4?xs[i]+cols[i][1]*k-1.2*k:xs[i]+cols[i][1]*k/2),z:z-rh+1.6*k,h:th,s:String(v),anchor:i===1?"start":i>=4?"end":"middle",num:i!==1})); z-=rh; hline(z); };
  row(cols.map(c=>c[0]));
  rows.forEach(r=>row([r.mk,`${r.nm} ${r.face}`.slice(0,24),r.bar,r.s,fx(r.n,0),fx(r.L,2),fx(r.tot,0),fx(r.kg/1000,2)]));
  const tot=rows.reduce((a,b)=>a+b.kg,0); row(["","합계 (이음·할증 제외)","","","","","",fx(tot/1000,2)]);
  xs.concat([xe]).forEach(xx=>o.push({t:"line",L:"SHT",x1:xx,z1:ztop,x2:xx,z2:z,w:k*.18}));
  return {o,zEnd:z};
}
function sheetPrims(R){
  const P=R.P; // A3 420×297 mm
  // 축척: 상세도가 230×255 mm 안에 들어가는 가장 큰 표준 축척
  let sc=SCALES[SCALES.length-1];
  for(const s of SCALES){ const k=s/1000, d=rbDetail(R,2.6*k); if((d.w-d.x0)/k<=232&&(d.h-d.z0)/k<=243){ sc=s; break; } }
  const k=sc/1000, th=2.6*k, d=rbDetail(R,th);
  let scC=SCALES[0]; for(const s of SCALES){ const c=rbColumn(R,2.6*s/1000); if(2*c.r/(s/1000)<=150){ scC=s; break; } }
  const c=rbColumn(R,2.6*scC/1000), f=scC?sc/scC:1;
  const o=[], W=420*k, H=297*k;
  o.push({t:"poly",L:"SHT",pts:[[0,0],[W,0],[W,H],[0,H]],w:k*.2}); o.push({t:"poly",L:"SHT",pts:[[10*k,10*k],[W-10*k,10*k],[W-10*k,H-10*k],[10*k,H-10*k]],w:k*.5});
  // 상세도
  const dx=15*k-d.x0, dz=H-22*k-d.h;
  o.push(...mapPrims(d.o,1,dx,dz));
  o.push({t:"text",L:"STX",x:15*k,z:H-14*k+0*k,h:3.4*k,s:`하부 구조 배근 상세 (우측 반단면)   S = 1 : ${sc}`});
  // 기둥 단면 (오른쪽 위)
  const cx=330*k, cz=H-15*k-c.r*f-6*k;
  o.push(...mapPrims(c.o,f,cx,cz).map(p=>({...p,h:p.h?p.h*f:p.h,w:p.w?p.w*f:p.w,r:p.t==="dot"?p.r*f:p.r})));
  o.push({t:"text",L:"STX",x:252*k,z:H-14*k,h:3.4*k,s:`기둥 단면 배근도   S = 1 : ${scC}`});
  // 재료표
  const tb=rbTable(R,k,252*k,cz-c.r*f-12*k,158);
  o.push(...tb.o);
  // 표제란
  const tx=250*k, ty=12*k, tw=158*k, thh=34*k;
  o.push({t:"poly",L:"SHT",pts:[[tx,ty],[tx+tw,ty],[tx+tw,ty+thh],[tx,ty+thh]],w:k*.4});
  [ty+12*k,ty+23*k].forEach(z=>o.push({t:"line",L:"SHT",x1:tx,z1:z,x2:tx+tw,z2:z,w:k*.2}));
  o.push({t:"line",L:"SHT",x1:tx+40*k,z1:ty,x2:tx+40*k,z2:ty+thh,w:k*.2});
  const T=(x,z,s,h)=>o.push({t:"text",L:"STX",x,z,h:(h||2.6)*k,s});
  T(tx+2*k,ty+27*k,"공사명"); T(tx+42*k,ty+27*k,"해상풍력발전기 기초 — 중력식 "+(P.type==="caisson"?"케이슨형":"원추형"),3);
  T(tx+2*k,ty+16*k,"도면명"); T(tx+42*k,ty+16*k,"해상풍력발전기 기초 배근도 (중력식)",3.6);
  T(tx+2*k,ty+5*k,"축척"); T(tx+42*k,ty+5*k,`1 : ${sc} (상세), 1 : ${scC} (기둥 단면)    ${new Date().toLocaleDateString("ko-KR")}    ${baseName()}`,2.4);
  T(15*k,13*k,`f_ck ${P.fck} MPa, 철근 SD${P.fy}, 순피복 ${P.cov} mm. 철근 규격·간격은 부재설계 탭의 검토 결과입니다.`,2.2);
  return {o,box:[0,0,W,H],sc,scC,bg:1};
}
function drawRebarSheet(){
  const pr=sheetPrims(R);
  $("svgRb").innerHTML=primsSVG(pr,"배근도");
  $("rbNote").textContent=`A3 도면, 상세 1:${pr.sc}, 기둥 단면 1:${pr.scC}. 철근 ${fx(R.M.qty.tot/1000,1)} t`;
}

/* ---------- 부재설계 탭 ---------- */
function pmSVG(c){
  const W=300,H=230,ml=46,mr=10,mt=10,mb=32, pts=c.pts.filter(p=>p.P>=-1e9);
  const Mx=Math.max(...pts.map(p=>p.M),c.Mu)*1.1, Pmin=Math.min(...pts.map(p=>p.P),c.Pu), Pmax=Math.max(...pts.map(p=>p.P),c.Pu)*1.05;
  const X=m=>ml+(W-ml-mr)*m/Mx, Y=p=>H-mb-(H-mt-mb)*(p-Pmin)/(Pmax-Pmin);
  let g=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="P-M 상관도"><line x1="${ml}" y1="${Y(0)}" x2="${W-mr}" y2="${Y(0)}" stroke="var(--line)"/>`;
  g+=`<polyline points="${pts.map(p=>`${X(p.M).toFixed(1)},${Y(p.P).toFixed(1)}`).join(" ")}" fill="none" stroke="var(--accent)" stroke-width="1.6"/>`;
  g+=`<circle cx="${X(c.Mu)}" cy="${Y(c.Pu)}" r="4" fill="${c.okM?"var(--ok)":"var(--bad)"}"/><text x="${X(c.Mu)+6}" y="${Y(c.Pu)-6}" font-size="10" fill="var(--ink)">(M<tspan font-size="7">u</tspan>, P<tspan font-size="7">u</tspan>)</text>`;
  g+=`<line x1="${ml}" y1="${mt}" x2="${ml}" y2="${H-mb}" stroke="var(--muted)"/><line x1="${ml}" y1="${H-mb}" x2="${W-mr}" y2="${H-mb}" stroke="var(--muted)"/>`;
  g+=`<text x="${(ml+W)/2}" y="${H-6}" font-size="10" fill="var(--ink)" text-anchor="middle">ϕMn (×10³ kN·m), 최대 ${fx(Mx/1.1/1000,0)}</text><text x="12" y="${(mt+H-mb)/2}" font-size="10" fill="var(--ink)" transform="rotate(-90 12 ${(mt+H-mb)/2})" text-anchor="middle">ϕPn (kN)</text></svg>`;
  return g;
}
function flexRows(c,rb,label){ const sh=c.okV?"":` (전단철근 없이 필요한 두께 ${fx(c.tReq,2)} m)`;
  return `<div class="tblwrap"><table class="t"><thead><tr><th colspan="5">${label} — ${rb.bar} @ ${rb.s} (A<sub>s</sub> = ${fx(c.As,0)} mm²/m, 두께 ${fx(c.t,2)} m, d = ${fx(c.d,0)} mm)</th></tr><tr><th>검토</th><th>계산</th><th>값</th><th>기준</th><th>판정</th></tr></thead><tbody>
  <tr><td>휨</td><td class="fm">a = ${fx(c.a,1)} mm, ε<sub>t</sub> = ${fx(c.et,4)}, ϕ = ${fx(c.phi,3)}, ϕM<sub>n</sub> = ϕ·A<sub>s</sub>·f<sub>y</sub>·(d − a/2)</td><td class="n">${fx(c.phiMn,1)}</td><td class="n">≥ M<sub>u</sub> ${fx(c.Mu,1)}</td><td>${okt(c.okM)}</td></tr>
  <tr><td>전단</td><td class="fm">ϕV<sub>c</sub> = 0.75 × (1/6)√f<sub>ck</sub> × b × d</td><td class="n">${fx(c.phiVc,1)}</td><td class="n">≥ V<sub>u</sub> ${fx(c.Vu,1)}</td><td>${okt(c.okV)}${sh}</td></tr>
  <tr><td>최소철근</td><td class="fm">max(0.25√f<sub>ck</sub>/f<sub>y</sub>, 1.4/f<sub>y</sub>)·b·d 또는 4/3 소요량</td><td class="n">${fx(c.As,0)}</td><td class="n">≥ ${fx(c.AsMin,0)}</td><td>${okt(c.okMin)}</td></tr>
  <tr><td>균열</td><td class="fm">f<sub>s</sub> = M<sub>s</sub>/(A<sub>s</sub>·0.875d) = ${fx(c.fs,0)} MPa, s ≤ min(375κ/f<sub>s</sub> − 2.5C<sub>c</sub>, 300κ/f<sub>s</sub>)</td><td class="n">${rb.s}</td><td class="n">≤ ${fx(Math.min(c.smax,300),0)}</td><td>${okt(c.okCr&&c.okS)}</td></tr>
  </tbody></table></div>`; }
function hoopRows(c,rb,label){
  return `<div class="tblwrap"><table class="t"><thead><tr><th colspan="5">${label} — ${rb.bar} @ ${rb.s} 양면 (A<sub>s</sub> = ${fx(c.As,0)} mm²/m)</th></tr><tr><th>검토</th><th>계산</th><th>값</th><th>기준</th><th>판정</th></tr></thead><tbody>
  <tr><td>원주 인장</td><td class="fm">ϕT<sub>n</sub> = 0.85 × A<sub>s</sub> × f<sub>y</sub></td><td class="n">${fx(c.phiTn,1)}</td><td class="n">≥ T<sub>u</sub> ${fx(c.Tu,1)}</td><td>${okt(c.okT)}</td></tr>
  <tr><td>균열</td><td class="fm">f<sub>s</sub> = T<sub>s</sub>/A<sub>s</sub> = ${fx(c.fs,0)} MPa</td><td class="n">${rb.s}</td><td class="n">≤ ${fx(Math.min(c.smax,300),0)}</td><td>${okt(c.okCr&&c.okS)}</td></tr>
  <tr><td>최소철근</td><td class="fm">0.002 × b × t</td><td class="n">${fx(c.As,0)}</td><td class="n">≥ ${fx(c.AsMin,0)}</td><td>${okt(c.okMin)}</td></tr>
  </tbody></table></div>`; }
function htmlMember(){
  const P=R.P, M=R.M, F=M.F, S=F.slab, W=F.wall, K=F.cone, C=F.col, c=M.cL, rb=M.rb;
  let h=`<h3>설계 조건</h3><div class="eq">KDS 14 20 강도설계법,  f<sub>ck</sub> = ${P.fck} MPa,  f<sub>y</sub> = ${P.fy} MPa,  순피복 ${P.cov} mm (해양 노출),  균열 κ<sub>cr</sub> = ${P.kcr}
하중계수: 토압 ${P.gH},  풍·파랑·조류 ${P.gE},  터빈 ULS 1.0 (제작사 하중계수 포함 가정),  저판 반력 1.2 × 지반반력 − 0.9 × 자중</div>`;
  if(!M.ok) h+=`<p class="warn">N.G 부재가 있습니다. 왼쪽 "최적 배근 자동 계산"을 누르면 철근을 다시 고르고, 철근으로 안 되는 부재는 두께를 키웁니다.</p>`;
  h+=`<h3>1. 저판</h3><div class="eq">지배 조합 ${S.gov}: 지반반력 q = ${fx(S.qSoil,1)} kN/m²
저판 위 유효 자중 w = (γ<sub>c</sub> − γ<sub>w</sub>)·t + (γ<sub>f</sub> − γ<sub>w</sub>)·h<sub>f</sub> = (${P.gc} − ${P.gw})×${fx(S.t,2)} + (${P.gf} − ${P.gw})×${fx(S.hFill,2)} = ${fx(S.wDead,1)} kN/m²
설계 순반력 q<sub>u</sub> = 1.2 × ${fx(S.qSoil,1)} − 0.9 × ${fx(S.wDead,1)} = ${fx(S.qu,1)} kN/m²  (사용 ${fx(S.qs,1)})
경간 L = ${isFinite(S.La)?`min(반경 방향 ${fx(S.Lr,2)}, 격벽 간격 ${fx(S.La,2)})`:`벽 안쪽 ~ 기둥 바깥 ${fx(S.Lr,2)}`} = ${fx(S.L,2)} m, 양단 고정 1방향 슬래브로 근사
지점 M = q<sub>u</sub>L²/12 = ${fx(S.Msup,1)},  중앙 M = q<sub>u</sub>L²/24 = ${fx(S.Mmid,1)} kN·m/m${S.heel>0?`,  뒷굽(${fx(S.heel,2)} m) M = q·c²/2 = ${fx(S.Mheel,1)}`:""},  V = ${fx(S.V,1)} kN/m</div>`;
  h+=flexRows(M.sT,rb.sT,"상면 (경간 중앙"+(S.heel>0?" · 뒷굽":"")+")")+flexRows(M.sB,rb.sB,"하면 (벽체·기둥 지점부)");
  h+=`<h3>2. 하부 벽체 (${P.type==="caisson"?"케이슨 외벽":"원통"})</h3><div class="eq">속채움 정지토압 계수 K₀ = 1 − sin ${P.phiF}° = ${fx(W.K0,3)},  수중단위중량 γ′ = ${P.gf} − ${P.gw} = ${fx(W.gsub,2)} kN/m³
하단 수평압 p = K₀·γ′·h = ${fx(W.K0,3)} × ${fx(W.gsub,2)} × ${fx(W.h,2)} = ${fx(W.p0s,2)} kN/m² (계수 ${P.gH} → ${fx(W.p0,2)})
원주 인장 T = p·r = ${fx(W.p0,2)} × ${fx(W.r,3)} = ${fx(W.Tu,1)} kN/m  (사용 ${fx(W.Ts,1)})
하단 고정 연직 휨 M = p/(2β²),  β = [3(1−ν²)/(r²t²)]<sup>1/4</sup> = ${fx(W.beta,4)} → M = ${fx(W.Mu,1)} kN·m/m</div>`;
  if(W.p0<=0) h+=`<p class="note">속채움이 물(γ ≤ γ<sub>w</sub>)이라 안팎 수압이 같아 벽체 원주 인장이 생기지 않습니다. 최소철근으로 배근합니다.</p>`;
  h+=hoopRows(M.wH,rb.wH,"원주 방향")+flexRows(M.wV,rb.wV,"연직 방향 (내측면)");
  if(K){ h+=`<h3>3. 원추</h3><div class="eq">경사각 ${fx(K.ang,1)}°, 법선두께 t = ${fx(K.tn,3)} m, 하단 반경 r = ${fx(K.r,3)} m
하단 수평압 p = K₀·γ′·h = ${fx(W.K0,3)} × ${fx(W.gsub,2)} × ${fx(K.h,2)} = ${fx(K.p0s,2)} kN/m² (계수 ${P.gH} → ${fx(K.p0,2)})
원주 인장 T = p·r / cos α = ${fx(K.Tu,1)} kN/m,  자오선 휨 M = p/(2β²) = ${fx(K.Mu,1)} kN·m/m (β = ${fx(K.beta,4)})</div>`;
    h+=hoopRows(M.kH,rb.kH,"원주 방향")+flexRows(M.kM,rb.kM,"자오선 방향 (내측면)"); }
  h+=`<h3>${K?4:3}. 기둥 하단 (z = ${fx(C.z,2)} m, 하부 구조 상단)</h3><div class="eq">터빈 (ULS 최대 M 행): M = ${fx(R.TL.gu?R.TL.gu.M:0,0)} + H × (z<sub>if</sub> − z) = ${fx(C.Mt,0)} kN·m,  H = ${fx(C.Ht,0)} kN,  V = ${fx(C.Vt,0)} kN
단면 위 풍·파랑·조류: H = ${fx(C.cs.wF,0)} + ${fx(C.cs.vF,0)} + ${fx(C.cs.cF,0)} = ${fx(C.Henv,0)} kN,  M = ${fx(C.cs.wM,0)} + ${fx(C.cs.vM,0)} + ${fx(C.cs.cM,0)} = ${fx(C.Menv,0)} kN·m
M<sub>u</sub> = ${fx(C.Mt,0)} + ${P.gE} × ${fx(C.Menv,0)} = ${fx(C.Mu,0)} kN·m,  V<sub>u</sub> = ${fx(C.Vu,0)} kN
P<sub>u</sub> = V<sub>터빈</sub> + 0.9 × (기둥 자중 ${fx(C.Wabove,0)} − 부력 ${fx(C.Uab,0)}) = ${fx(C.Pu,0)} kN
단면: 외반경 ${fx(C.ro,3)} m, 내반경 ${fx(C.ri,3)} m${R.S.hex?" (육각 → 면적이 같은 원)":""}, ${rb.cL.bar} @ ${rb.cL.s} 내·외 2단 = ${c.nb}본, ρ = ${fx(c.rho*100,2)} %</div>`;
  h+=`<div class="plots"><div class="sheet">${pmSVG(c)}</div></div>`;
  h+=`<div class="tblwrap"><table class="t"><thead><tr><th>검토</th><th>계산</th><th>값</th><th>기준</th><th>판정</th></tr></thead><tbody>
  <tr><td>P-M</td><td class="fm">변형률 적합(ε<sub>cu</sub> 0.003), P<sub>u</sub> = ${fx(c.Pu,0)} kN에서 ϕM<sub>n</sub></td><td class="n">${fx(c.phiMn,0)}</td><td class="n">≥ M<sub>u</sub> ${fx(c.Mu,0)}</td><td>${okt(c.okM)}</td></tr>
  <tr><td>전단</td><td class="fm">ϕV<sub>c</sub> = 0.75 × (1/6)√f<sub>ck</sub> × 2t × 0.8D = ${fx(c.phiVc,0)}${c.VsReq>0?`; 부족분 V<sub>s</sub> = ${fx(c.VsReq,0)} kN → 띠철근 ${c.tie.bar} @ ${c.tie.s} (2다리)`:""}</td><td class="n">${fx(c.phiVc+(c.VsReq>0?0.75*c.VsReq:0),0)}</td><td class="n">≥ V<sub>u</sub> ${fx(c.Vu,0)}</td><td>${okt(c.okV)}</td></tr>
  <tr><td>최소철근비</td><td class="fm">ρ = A<sub>st</sub>/A<sub>g</sub></td><td class="n">${fx(c.rho*100,2)} %</td><td class="n">≥ 0.5 %</td><td>${okt(c.okMin)}</td></tr>
  </tbody></table></div>
  <p class="note">피로(터빈 반복하중에 의한 철근 응력 진폭), 프리스트레스, 터빈 앵커 연결부 상세는 포함하지 않았습니다. 벽체·원추는 속채움 토압만 고려했고 파랑 국부압은 빠져 있습니다.</p>`;
  h+=`<h3>철근재료표</h3><div class="tblwrap"><table class="t"><thead><tr><th>번호</th><th>부재 · 위치</th><th>규격</th><th>간격 (mm)</th><th>개수</th><th>길이 (m)</th><th>총길이 (m)</th><th>중량 (t)</th></tr></thead><tbody>${M.qty.detail.rows.map(r=>`<tr><td>${r.mk}</td><td class="l">${r.nm} ${r.face}</td><td>${r.bar}</td><td class="n">${r.s}</td><td class="n">${fx(r.n,0)}</td><td class="n">${fx(r.L,2)}</td><td class="n">${fx(r.tot,0)}</td><td class="n">${fx(r.kg/1000,2)}</td></tr>`).join("")}<tr class="tot"><td colspan="7" class="l">합계 (콘크리트 1 m³당 ${fx(M.qty.perM3,0)} kg, 이음·할증 제외)</td><td class="n">${fx(M.qty.tot/1000,2)}</td></tr></tbody></table></div>
  <p class="note">저판은 원형 면적에 X·Y 직교 그물로, 원주 철근은 한 바퀴 길이로 셌습니다. 이음 길이와 할증은 들어 있지 않습니다. 원추 자오선 철근은 위로 갈수록 둘레가 줄어 개수를 0.75배로 셌습니다.</p>`;
  return h;
}
$("btnRbF").addEventListener("click",()=>doRbOpt("freq"));
$("btnRbA").addEventListener("click",()=>doRbOpt("auto"));
$("btnRbT").addEventListener("click",()=>doRbOpt("thk"));
$("btnRb").addEventListener("click",()=>doRbOpt("rb"));
function doRbOpt(mode){
  $("rbAdj").checked=mode!=="rb";
  if(mode==="freq"&&!doRbOpt.busy){ doRbOpt.busy=1; $("rbRes").innerHTML="기둥 강도와 진동수를 함께 만족하는 조합을 찾는 중입니다… (수 초 걸릴 수 있습니다)"; $("rbRes").hidden=false; ["btnRbF","btnRbA","btnRbT","btnRb"].forEach(id=>$(id).disabled=true);
    return setTimeout(()=>{ try{ doRbOpt("freq"); } finally{ doRbOpt.busy=0; ["btnRbF","btnRbA","btnRbT","btnRb"].forEach(id=>$(id).disabled=false); if(doRbOpt.after){ const f=doRbOpt.after; doRbOpt.after=null; f(); } } },30); }
  const P=readInputs(), f0=R&&R.freq&&R.freq.f, res=mode==="freq"?optimizeMemberFreq(P):mode==="auto"?optimizeMember(P):optimizeAll(P,mode==="thk");
  setInputs({...res.P}); run();
  const msg=[`부재별로 휨·전단·균열·최소철근을 만족하는 가장 가벼운 철근을 골랐습니다. 철근 ${fx(R.M.qty.tot/1000,0)} t.`];
  if(res.log.length) msg.push("두께·재료 조정: "+res.log.map(l=>l.k==="fck"?`콘크리트 f<sub>ck</sub> ${l.a} → ${l.b} MPa`:`${l.nm} ${fx(l.a,2)} → ${fx(l.b,2)} m`).join(", "));
  if(res.dims&&res.dims.length){ msg.push("제원 조정: "+res.dims.map(l=>`${l.nm} ${fx(l.a,2)} → ${fx(l.b,2)} m`).join(", "));
    const f1=R.freq&&R.freq.f; if(f0&&f1&&mode!=="freq") msg.push(`고유진동수 ${fx(f0,3)} → ${fx(f1,3)} Hz${R.freq.ok===false?" — <b>진동수 범위를 벗어났습니다.</b> 주의 사항의 진동수 자동 수정은 기둥 외경을 줄이므로 부재설계와 맞서니, 하중·형식을 함께 검토하세요.":""}`); }
  if(mode==="freq"){ const f1=R.freq&&R.freq.f;
    if(f1) msg.push(`고유진동수 ${f0?fx(f0,3)+" → ":""}${fx(f1,3)} Hz ${R.freq.ok?"— 허용 구간 안":"— <b>허용 구간 밖</b>"}${res.lo?` (soft-stiff ${fx(res.lo,3)}~${fx(res.hi,3)} Hz, 회전수 추정값 기준)`:""}. 기둥 철근 ${R.P.rb.cL.bar}@${R.P.rb.cL.s}.`);
    (res.note||[]).forEach(n=>msg.push("<b>"+n+"</b>")); }
  if(res.fail.length){
    if(mode==="rb") msg.push(`<b>철근만으로 만족하지 못한 부재:</b> ${res.fail.join(", ")}. "부재설계 자동 수정"을 누르세요.`);
    else if(mode==="thk") msg.push(`<b>두께를 상한까지 키워도 N.G:</b> ${res.fail.join(", ")}. 상한 ${res.lim.map(l=>`${l.nm} ${fx(l.mx,2)} m`).join(", ")}. "부재설계 자동 수정"을 누르면 외경·직경까지 키웁니다.`);
    else msg.push(`<b>외경·직경을 상한(기둥 ${DIM_MAX.Dc} m, 저판 ${DIM_MAX.base} m)까지 키워도 N.G:</b> ${res.fail.join(", ")}. 하중과 기초 형식을 다시 검토하세요.`);
  }
  $("rbRes").innerHTML=msg.join("<br>"); $("rbRes").hidden=false;
}

/* ---------- 최적 제원 ---------- */
let optRun=0;
function openOpt(){
  const P=readInputs(), C=sizeCandidates(P), cais=P.type==="caisson";
  const dn=cais?"케이슨 외벽 직경":"원통 외경(= 저판 직경)", hn=cais?"케이슨 높이":"원통 높이";
  $("optPanel").hidden=false;
  $("optPanel").innerHTML=`<div class="row"><b>${cais?"케이슨형":"원추형"} 최적 제원 찾기</b><span class="note">${dn} ${C.Dmin}~${C.Dmax} m, ${hn} ${fx(C.Hmin,1)}~${fx(C.Hmax,1)} m 범위에서 모든 안정검토를 만족하고 콘크리트가 가장 적은 조합을 찾습니다. 나머지 치수는 그대로 둡니다.</span></div>
  <div class="row"><label class="note" style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="optTow" ${R.flt&&R.flt.okGM?"checked":""}> 자체 부유 예인 조건 포함 (GM·흘수·수선이 넓은 구간)</label>
  <label class="note" style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="optSand" ${P.gf<15?"checked":""}> 모래 속채움(19 kN/m³)도 검토 (지금 ${P.gf} kN/m³)</label>
  <button class="btn primary small" id="optGo" type="button">탐색 시작</button><button class="btn small" id="optClose" type="button">닫기</button><span class="note" id="optProg"></span></div><div id="optOut"></div>`;
  $("optClose").onclick=()=>{ optRun++; $("optPanel").hidden=true; };
  $("optGo").onclick=()=>runOpt(P,C,$("optTow").checked,$("optSand").checked);
}
async function runOpt(P,C,tow,sand){
  const gfs=sand&&P.gf<19?[P.gf,19]:[P.gf];
  const ap=(D,H,gf)=>{ const q=C.apply(D,H); q.gf=gf; return q; };
  const id=++optRun, grid=[]; gfs.forEach(gf=>{ for(let D=C.Dmin;D<=C.Dmax+1e-9;D+=1) for(let H=C.Hmin;H<=C.Hmax+1e-9;H+=1) grid.push([D,H,gf]); });
  const res=[]; const tick=()=>new Promise(r=>setTimeout(r,0));
  for(let i=0;i<grid.length;i++){ if(id!==optRun) return; const [D,H,gf]=grid[i]; res.push({D,H,...evalSize(ap(D,H,gf),{tow})});
    if(i%25===0){ $("optProg").textContent=`1차 탐색 ${i}/${grid.length}`; await tick(); } }
  let ok=res.filter(r=>r.ok).sort((a,b)=>a.Vc-b.Vc);
  if(ok.length){ const b=ok[0], fine=[]; for(let D=b.D-1;D<=b.D+1+1e-9;D+=0.25) for(let H=b.H-1;H<=b.H+1+1e-9;H+=0.25) if(D>=C.Dmin-1e-9&&H>=C.Hmin-1e-9) fine.push([D,H,b.gf]);
    for(let i=0;i<fine.length;i++){ if(id!==optRun) return; const [D,H,gf]=fine[i]; res.push({D,H,...evalSize(ap(D,H,gf),{tow})}); if(i%25===0){ $("optProg").textContent=`정밀 탐색 ${i}/${fine.length}`; await tick(); } }
    ok=res.filter(r=>r.ok).sort((a,b)=>a.Vc-b.Vc); }
  $("optProg").textContent=`${res.length}개 조합 검토 완료`;
  const cur=evalSize({...P,fast:1},{tow}), cais=P.type==="caisson";
  if(!ok.length){
    const near=res.slice().sort((a,b)=>(b.fails.length?b.fails[0].r:9)-(a.fails.length?a.fails[0].r:9))[0];
    const fl=near.fails.slice(0,4).map(c=>`${c.n} ${fx(c.v,2)} (기준 ${c.inv?"≤":"≥"} ${fx(c.c,2)})`).join(", ");
    const why=[]; const all=res.flatMap(r=>r.fails.map(f=>f.n.replace(/^LC\d /,""))); const cnt={}; all.forEach(n=>cnt[n]=(cnt[n]||0)+1);
    const top=Object.entries(cnt).sort((a,b)=>b[1]-a[1])[0];
    if(top&&/활동/.test(top[0])) why.push(P.gf<=P.gw+0.5?"속채움이 물이라 유효중량이 작아 활동이 부족합니다. 모래 속채움을 검토하거나 마찰계수·파랑 조건을 확인하세요.":"활동이 부족합니다. 속채움 단위중량, 마찰계수, 파랑·터빈 하중을 확인하세요.");
    if(top&&/예인/.test(top[0])) why.push("예인 조건(GM·흘수)을 만족하는 크기가 없습니다. 예인 조건을 빼거나 예인 시 상단 높이를 낮춰 보세요.");
    if(!R.TL.gu) why.push("선택한 터빈에 하중표가 없어 실제보다 유리하게 계산되고 있습니다.");
    $("optOut").innerHTML=`<p class="warn">이 범위(${res.length}개 조합)에서 모든 조건을 만족하는 조합이 없습니다.<br>가장 가까운 조합: ${C.Dk==="cDw"?"외벽 직경":"원통 외경"} ${fx(near.D,2)} m, ${C.Hk==="cH"?"케이슨 높이":"원통 높이"} ${fx(near.H,2)} m${gfs.length>1?`, 속채움 ${near.gf} kN/m³`:""} → 부족: ${fl}<br>가장 자주 걸린 검토: ${top?top[0]:"-"}. ${why.join(" ")}</p>`; return; }
  const picks=[ok[0]]; for(const r of ok){ if(picks.length>=4) break; if(picks.every(p=>Math.abs(p.D-r.D)>=1.5||Math.abs(p.H-r.H)>=1.5||p.gf!==r.gf)) picks.push(r); }
  const dn=cais?"외벽 직경":"원통 외경", hn=cais?"케이슨 높이":"원통 높이", Dk=C.Dk;
  let h=`<div class="tblwrap"><table class="t"><thead><tr><th></th><th>${dn} (m)</th><th>${hn} (m)</th><th>콘크리트 (m³)</th>${gfs.length>1?"<th>속채움 (kN/m³)</th>":""}<th>최소 여유 (기준 대비)</th><th>흘수 (m)</th><th>GM (m)</th><th></th></tr></thead><tbody>
  <tr><td>현재</td><td class="n">${fx(P[Dk],2)}</td><td class="n">${fx(P[C.Hk],2)}</td><td class="n">${fx(cur.Vc,0)}</td>${gfs.length>1?`<td class="n">${P.gf}</td>`:""}<td class="n">${fx(cur.minFS,2)}</td><td class="n">${fx(cur.T,2)}</td><td class="n">${fx(cur.GM,2)}</td><td>${cur.ok?okt(true):okt(false)}</td></tr>`;
  picks.forEach((r,i)=>h+=`<tr class="${i?"":"gov"}"><td>${i?"후보 "+(i+1):"최적"}</td><td class="n">${fx(r.D,2)}</td><td class="n">${fx(r.H,2)}</td><td class="n">${fx(r.Vc,0)} (${r.Vc<cur.Vc?"−":"+"}${fx(Math.abs(r.Vc-cur.Vc)/cur.Vc*100,0)} %)</td>${gfs.length>1?`<td class="n">${r.gf}</td>`:""}<td class="n">${fx(r.minFS,2)}</td><td class="n">${fx(r.T,2)}</td><td class="n">${fx(r.GM,2)}</td><td><button class="btn small" data-ap="${i}" type="button">적용</button></td></tr>`);
  h+=`</tbody></table></div><p class="note">최소 여유 1.00은 가장 불리한 검토가 기준값과 같다는 뜻입니다. 적용 후 "최적 배근 자동 계산"으로 철근과 부재 두께를 맞추세요. 콘크리트량은 탐색용 간이 계산(0.02 m 간격)이라 적용 후 값과 조금 다를 수 있습니다.</p>`;
  $("optOut").innerHTML=h;
  $("optOut").querySelectorAll("[data-ap]").forEach(b=>b.onclick=()=>{ const r=picks[+b.dataset.ap], np=ap(r.D,r.H,r.gf); delete np.fast; setInputs(np); run(); toast(`${dn} ${fx(r.D,2)} m, ${hn} ${fx(r.H,2)} m${r.gf!==P.gf?`, 속채움 ${r.gf} kN/m³`:""}를 적용했습니다`); });
}
document.querySelectorAll("[data-opt]").forEach(b=>b.addEventListener("click",()=>{
  const t=b.dataset.opt;
  if(ST.type!==t){ readInputs(); ST.type=t; if(t==="caisson"&&ST.zc0>ST.cH) ST.zc0=ST.cts; if(t==="cone"&&ST.zc0<ST.tb) ST.zc0=ST.tb; $("zc0").value=ST.zc0; applyType(); run(); toast(`${t==="cone"?"원추형":"케이슨형"}으로 바꿨습니다`); }
  openOpt(); $("optPanel").scrollIntoView({behavior:"smooth",block:"start"});
}));

$("rbZoom").addEventListener("click",()=>{ const w=$("rbWrap"); w.classList.toggle("zoom"); $("rbZoom").textContent=w.classList.contains("zoom")?"맞춰 보기":"크게 보기"; });
