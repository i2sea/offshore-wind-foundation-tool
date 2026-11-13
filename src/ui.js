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
const SEL=["ringAuto","shp","turb","crest","hydro","sgc","surf","mTP","mInst","mSc","soilPre","jHz","jFlood","jSc","gBase"];
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
  ST={...DEF,...o}; if(o.ringAuto==null&&(o.rings||[]).length) ST.ringAuto="0"; ST.rings=(o.rings||[]).map(r=>({...r})); ST.soil=(o.soil||DEF.soil).map(l=>({...l})); ST.customT=mergeT(libGet(),o.customT||[]); turbMiss=null;
  ST.rb=Object.fromEntries(MEMB.map(m=>[m[0],{...(DEF_RB[m[0]]),...((o.rb||{})[m[0]]||{})}]));
  NUM.forEach(k=>{ if(ST[k]!==undefined) $(k).value=ST[k]; });
  fillTurbSel(); fillSoilSel(); SEL.forEach(k=>{ if(k!=="turb") $(k).value=String(ST[k]); }); $("waveSrc").value=ST.waveSrc||""; wvNote();
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
  ST.waveSrc=$("waveSrc").value.trim();
  ST.rings=ST.rings.map(r=>({D:+r.D||0,t:+r.t||0,h:+r.h||0,z:+r.z||0}));
  MEMB.forEach(([k])=>{ const b=$("rb_"+k+"_bar"); if(b) ST.rb[k]={bar:b.value,s:Math.max(50,parseFloat($("rb_"+k+"_s").value)||200)}; });
  return JSON.parse(JSON.stringify(ST));
}
function persist(){ try{ localStorage.setItem(LS,JSON.stringify(ST)); }catch(e){} }
/* 설계파 파일 (관측 대시보드 "설계파 산정 보고서" 결과, app "design-wave") */
/* 설계파 파일에서 채운 칸 표시: 파일 값 그대로면 파란 칸, 손으로 바꿨으면 주황 칸 */
function wvMark(){ const W=ST.waveRef, src=W?ST.waveSrc:null; [["Hw",W&&W.Hmax],["Tw",W&&W.T],["waveSrc",null]].forEach(([k,v])=>{ const el=$(k); if(!el) return;
    const same=!W?false:k==="waveSrc"?el.value.trim()!==""&&el.value.trim()===(ST.waveSrcFile||""):Math.abs(parseFloat(el.value)-v)<0.005;
    el.classList.toggle("fromFile",!!W&&same); el.classList.toggle("fileDiff",!!W&&!same); el.title=W?(same?"설계파 파일에서 가져온 값":"설계파 파일 값과 다름"):""; }); }
["Hw","Tw","waveSrc"].forEach(k=>$(k).addEventListener("input",wvMark));
function wvNote(){ const W=ST.waveRef; $("wvNote").textContent=W?`연결됨: ${W.title||"설계파 파일"}${W.reportNo?" ("+W.reportNo+")":""} · H ${W.Hmax} m, T ${W.T} s${W.depth?`, 수심 ${W.depth} m`:""}`:"설계파 파일 없음 (직접 입력)"; $("wvClr").hidden=!W; wvMark(); }
function wvParse(o){ if(!o||o.app!=="design-wave") throw new Error("설계파 파일(app: design-wave)이 아닙니다");
  const D=o.design||o, n=v=>{ const x=parseFloat(v); return isFinite(x)?x:0; };
  let Hmax=n(D.Hmax), note=""; const Hs=n(D.Hs); if(!(Hmax>0)&&Hs>0){ Hmax=+(1.8*Hs).toFixed(3); note="파일에 Hmax가 없어 1.8 × H1/3로 환산(가정)"; }
  const T=n(D.Tmax)||n(D.T13)||n(D.T); if(!(Hmax>0&&T>0)) throw new Error("파일에 설계파고·주기가 없습니다");
  const st=o.site||{};
  return {title:String(o.title||"설계파 산정 보고서").slice(0,120),reportNo:String(o.reportNo||"").slice(0,60),site:String(st.name||"").slice(0,80),depth:n(st.depth||D.depth),
    rp:n(o.returnPeriod||D.returnPeriod),dir:String(D.dir||"").slice(0,20),Hs,Hmax:+Hmax.toFixed(3),T:+T.toFixed(2),Hb:n(D.Hb),crest:n(D.crest),method:String(o.method||D.method||"").slice(0,200),saved:String(o.saved||"").slice(0,10),note}; }
$("wvImp").addEventListener("change",async e=>{ const f=e.target.files[0]; e.target.value=""; if(!f) return;
  try{ const W=wvParse(JSON.parse(await f.text())); const P=readInputs();
    const src=`${W.title}${W.reportNo?` (${W.reportNo})`:""}${W.site?` — ${W.site}`:""}${W.rp?`, 재현기간 ${W.rp}년`:""}${W.method?`, ${W.method}`:""} (첨부)`;
    setInputs({...P,Hw:W.Hmax,Tw:W.T,waveRef:W,waveSrc:src,waveSrcFile:src}); igShow($("Hw")); run(); toast(`설계파를 가져왔습니다: H ${W.Hmax} m, T ${W.T} s${W.note?" — "+W.note:""}`);
    ["Hw","Tw","waveSrc"].forEach(k=>{ $(k).classList.add("flash"); setTimeout(()=>$(k).classList.remove("flash"),1200); });
  }catch(err){ toast("가져오지 못했습니다: "+err.message); } });
$("wvClr").addEventListener("click",()=>{ const P=readInputs(); setInputs({...P,waveRef:null}); run(); toast("설계파 파일 연결을 해제했습니다 (값은 그대로)"); });
function waveSrcHtml(P){ if(!P.waveSrc&&!P.waveRef) return ""; const W=P.waveRef;
  return `<p>설계파는 ${P.waveSrc?esc(P.waveSrc):"설계파 파일"}에서 정한 값을 쓴다${W?` — 유의파고 H<sub>1/3</sub> ${W.Hs?fx(W.Hs,2)+" m":"–"}, 최대파고 H<sub>max</sub> ${fx(W.Hmax,2)} m, 주기 ${fx(W.T,2)} s${W.depth?`, 산정 수심 ${fx(W.depth,2)} m`:""}${W.Hb?`, 쇄파 한계 ${fx(W.Hb,2)} m`:""}${W.crest?`, 파봉고(정수면 위) ${fx(W.crest,2)} m`:""}${W.dir?`, 파향 ${esc(W.dir)}`:""}${W.note?` (${esc(W.note)})`:""}`:""}. 산정 과정은 첨부 보고서 참조.</p>`; }
/* 입력 묶음 탭: 형상 / 수위·풍·파랑 / 터빈 / 지반·기준 / 부재·시공 / 전체 */
let IG=(()=>{ try{ return localStorage.getItem("gbs-ig")||"shape"; }catch(e){ return "shape"; } })();
function igApply(){ const fs=[...document.querySelectorAll("#frm fieldset[data-g]")];
  document.querySelectorAll(".igt").forEach(b=>{ const g=b.dataset.g; b.hidden=g!=="all"&&!fs.some(f=>f.dataset.g===g&&!f.hidden); });
  const cur=document.querySelector(`.igt[data-g="${IG}"]`); if(!cur||cur.hidden) IG="shape";
  document.querySelectorAll(".igt").forEach(b=>b.setAttribute("aria-selected",b.dataset.g===IG?"true":"false"));
  fs.forEach(f=>f.classList.toggle("gOff",IG!=="all"&&f.dataset.g!==IG)); }
function igSet(g){ IG=g; try{ localStorage.setItem("gbs-ig",g); }catch(e){} igApply(); }
function igShow(el){ const f=el&&el.closest&&el.closest("fieldset[data-g]"); if(f&&IG!=="all"&&f.dataset.g!==IG) igSet(f.dataset.g); }
document.querySelectorAll(".igt").forEach(b=>b.addEventListener("click",()=>igSet(b.dataset.g)));
function applyType(){
  const cat=catOf(ST.type);
  document.querySelectorAll(".wc").forEach(b=>b.setAttribute("aria-pressed",b.dataset.cat===cat?"true":"false"));
  document.querySelectorAll(".wt").forEach(b=>b.setAttribute("aria-pressed",b.dataset.type===ST.type?"true":"false"));
  document.querySelectorAll("[data-cat]:not(.wc),[data-for]").forEach(el=>{ const c=el.dataset.cat, f=el.dataset.for; el.hidden=!!((c&&!c.split(" ").includes(cat))||(f&&!f.split(" ").includes(ST.type))); });
  { const t1=document.querySelector('.tab[data-t="mchk"]'), t2=document.querySelector('.tab[data-t="mpy"]'); if(t1) t1.textContent=cat==="jacket"?"부재 검토":"강관 단면"; if(t2) t2.textContent=cat==="jacket"?"말뚝 · 지반":"말뚝 해석"; }
  document.querySelectorAll("[data-for-tp]").forEach(el=>el.hidden=el.dataset.forTp!==$("mTP").value);
  document.querySelectorAll("[data-for-inst]").forEach(el=>el.hidden=!el.dataset.forInst.split(" ").includes($("mInst").value));
  document.querySelectorAll("[data-for-sc]").forEach(el=>el.hidden=el.dataset.forSc!==$("mSc").value);
  igApply();
  document.querySelectorAll("[data-for-jsc]").forEach(el=>el.hidden=el.dataset.forJsc!==$("jSc").value);
  document.querySelectorAll("[data-shp]").forEach(f=>f.hidden=f.dataset.shp!==$("shp").value);
  document.querySelectorAll("[data-rb^='k']").forEach(el=>el.hidden=ST.type==="caisson");
  const cur=document.querySelector(`.tab[data-t="${curTab}"]`); if(cur&&cur.hidden) selectTab("gen");
}
function drawRings(){
  const auto=ST.ringAuto==="1"; $("ringAdd").hidden=auto;
  if(auto){ const rg=(R&&R.P&&R.P.ringAuto==="1"&&R.P.rings)||autoRings(readInputs());
    $("ringBody").innerHTML=rg.map(r=>`<tr>${["D","t","h","z"].map(k=>`<td class="n" style="padding:4px 6px">${fx(r[k],2)}</td>`).join("")}<td style="font-size:11px;color:var(--muted);white-space:nowrap">${r.auto}</td></tr>`).join("")||`<tr><td colspan="5" class="hint">자동 배치할 자리가 없습니다</td></tr>`;
    $("ringNote").innerHTML="자동 배치(가정): 기둥 하단 링 = 기둥 내경 · 기둥 벽두께, 벽체 접합부 링 = 벽체 내경 · max(0.5, 벽두께) — 둘 다 저판 상면에서 시작. 케이슨은 상판·기둥 접합부 링(기둥 외면에 붙여 상판 하면에 매닮, 두께 max(0.5, 상판 두께), 높이 ≤ 격실 높이/3) 추가. 높이 = 1.5 × 정착길이 40d(기둥 주철근·벽체 연직철근) → 0.5 m 올림(최소 1.0 m). 직접 고치려면 \"직접 입력\"으로 바꾸세요(지금 값이 옮겨집니다)."; return; }
  $("ringNote").textContent="직접 입력: 외경·두께·높이·하단 높이(z, 저판 하면 기준). 아래(저판·다른 링)나 옆(기둥·벽체 면)에 닿아야 연결철근이 들어갑니다.";
  $("ringBody").innerHTML=ST.rings.map((r,i)=>`<tr>${["D","t","h","z"].map(k=>`<td><input id="rg_${i}_${k}" type="number" step="0.1" value="${r[k]}" aria-label="링 ${i+1} ${k}"></td>`).join("")}<td><button type="button" data-del="${i}" aria-label="링 ${i+1} 삭제">✕</button></td></tr>`).join("")||`<tr><td colspan="5" class="note">없음</td></tr>`;
  $("ringBody").querySelectorAll("input").forEach(el=>el.addEventListener("input",()=>{ const [,i,k]=el.id.split("_"); ST.rings[+i][k]=parseFloat(el.value)||0; run(); }));
  $("ringBody").querySelectorAll("[data-del]").forEach(b=>b.addEventListener("click",()=>{ ST.rings.splice(+b.dataset.del,1); drawRings(); run(); }));
}
$("ringAuto").addEventListener("change",()=>{ ST.ringAuto=$("ringAuto").value;
  if(ST.ringAuto==="0"&&R&&R.P&&R.P.rings) ST.rings=R.P.rings.map(({D,t,h,z})=>({D,t,h,z}));
  drawRings(); run(); });
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
  $("teMsg").textContent=""; $("tEdit").hidden=false; igShow($("tEdit")); $("te_name").focus();
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
  if(teBase) Object.keys(teBase).forEach(k=>{ if(!(k in t)&&!["scaled","ifzNote"].includes(k)) t[k]=JSON.parse(JSON.stringify(teBase[k])); }); // 출력곡선(power) 등 발전량 계산 도구 칸 유지
  ST.customT=(ST.customT||[]).filter(c=>c.id!==teId); ST.customT.push(t); ST.turb=t.id; libSet(mergeT(libGet().filter(c=>c.id!==teId),[t]));
  fillTurbSel(); $("tEdit").hidden=true; run(); toast("터빈을 저장했습니다");
});
$("tDel").addEventListener("click",()=>{ const id=ST.turb; ST.customT=(ST.customT||[]).filter(c=>c.id!==id); libSet(libGet().filter(c=>c.id!==id)); ST.turb=TURB_PRESETS[0].id; fillTurbSel(); run(); toast("이 브라우저의 터빈 목록에서 지웠습니다 (터빈 파일은 그대로)"); });
/* 터빈 파일 (.json): {app:"gbs-tool-turbine", ver:1, turbines:[...]} — 설계 JSON(P.customT), 터빈 하나·배열도 받음 */
function turbOK(t){ return t&&typeof t==="object"&&t.name&&isFinite(t.hub)&&isFinite(t.ifz); }
function cleanT(t){ const n=k=>Number(t[k])||0, tab=a=>Array.isArray(a)&&a.length===12&&a.every(r=>Array.isArray(r)&&r.length>=6)?a.map(r=>r.slice(0,6).map(Number)):null;
  const o={id:String(t.id||("c"+Date.now().toString(36)+Math.random().toString(36).slice(2,5))),name:String(t.name),MW:n("MW"),hub:n("hub"),rotor:n("rotor"),rna:n("rna"),tower:n("tower"),Wdirect:n("Wdirect"),ifz:n("ifz"),
    rpmMin:n("rpmMin"),rpmMax:n("rpmMax"),fref:n("fref"),twL:n("twL"),twDb:n("twDb"),twDt:n("twDt"),axis:t.axis==="x"?"x":"z",src:String(t.src||"터빈 파일"),uls:tab(t.uls),sls:tab(t.sls)};
  if(t.scaled) o.scaled=t.scaled; if(TURB_PRESETS.some(b=>b.id===o.id)) o.id+="_f";
  Object.keys(t).forEach(k=>{ if(!(k in o)&&k!=="scaled") o[k]=JSON.parse(JSON.stringify(t[k])); }); // 이 도구가 쓰지 않는 칸(발전량 계산 도구의 power·ifzNote 등)은 그대로 보관해 내보낼 때 같이 넘김
  return o; }
/* 같은 터빈 찾기: id(기본 터빈과 겹쳐 _f가 붙은 것 포함) → 이름. 들어온 자료에 하중표·중량이 없으면 있던 값 유지 (발전량 계산 도구에서 만든 파일은 하중표가 없음) */
function absorbT(list,t){ const i0=list.findIndex(x=>x.id===t.id||x.id===t.id+"_f"||x.id+"_f"===t.id), i=i0>=0?i0:list.findIndex(x=>x.name===t.name); if(i<0) return {t,rep:false};
  const old=list[i], o={...t,id:old.id}; if(!o.uls&&old.uls){ o.uls=old.uls; if(old.scaled) o.scaled=old.scaled; } if(!o.sls&&old.sls) o.sls=old.sls;
  ["rna","tower","Wdirect","rpmMin","rpmMax","fref","twL","twDb","twDt"].forEach(k=>{ if(!(o[k]>0)&&old[k]>0) o[k]=old[k]; });
  if(o.ifzNote&&isFinite(old.ifz)&&old.ifz>0&&!old.ifzNote){ o.ifz=old.ifz; delete o.ifzNote; } if(!o.power&&old.power) o.power=old.power; return {t:o,rep:true}; }
$("tImpBtn").addEventListener("click",()=>$("tImp").click());
$("tImp").addEventListener("change",async e=>{
  const files=[...e.target.files]; e.target.value=""; if(!files.length) return; let got=[], bad=0;
  for(const f of files){ try{ const o=JSON.parse(await f.text()); const arr=Array.isArray(o)?o:o.turbines?o.turbines:(o.P&&o.P.customT)?o.P.customT:o.customT?o.customT:[o];
    arr.forEach(t=>{ if(turbOK(t)) got.push(cleanT(t)); else bad++; }); }catch(err){ bad++; } }
  if(!got.length){ toast("터빈 자료를 찾지 못했습니다. 터빈 파일(.json)인지 확인하세요."); return; }
  const pool=mergeT(libGet(),ST.customT||[]); let rep=0; got=got.map(t=>{ const r=absorbT(pool,t); if(r.rep) rep++; return r.t; });
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
  else if(mono){ R=computeMono(P); R.py=computePile(P,R); R.fq=monoFreq(P,R,R.py); R.warns=R.warns.filter(w=>w.k!=="sig").concat(R.py.warns,freqWarns(R)); } else { R=compute(P); R.tow=null; R.M=memberDesign(R,P.rb); const mw=memberWarn(R.M); if(mw) R.warns.push(mw); if(ST.ringAuto==="1") drawRings(); }
  const t=R.T; $("tDel").hidden=!(ST.customT||[]).some(c=>c.id===t.id);
  $("turbNote").textContent=`${t.MW} MW · 허브 MSL+${t.hub} m · 인터페이스 MSL+${t.ifz} m · 총중량 ${fx(R.Wt,0)} kN · ${t.uls?"하중표 있음":"하중표 없음"}${t.fref>0?` · 기준 진동수 ${t.fref} Hz`:""}${t.twDb>0?` · 타워 ${t.twL||t.hub-t.ifz} m Ø${t.twDb}→${t.twDt}`:""}${t.scaled?" · 하중표는 기준 터빈 축척 추정":""}${t.power&&Array.isArray(t.power.curve)&&t.power.curve.length?` · 출력곡선 ${t.power.curve.length}점${t.power.estimated?"(추정)":""} 보관(발전량 계산 도구용, 이 도구 계산에는 안 씀)`:""}`;
  if(P.type==="cone"){ const s=Math.sqrt(1+((P.Dw-P.Dt)/2/P.hk)**2); $("tkNote").textContent=`원추 벽 법선두께 = ${fx(P.tkh/s,3)} m (수평 ${P.tkh} ÷ ${fx(s,3)}), 경사 1 : ${fx(P.hk/((P.Dw-P.Dt)/2),3)}`; }
  if(jack){ $("jacketNote").textContent=jacketNote(); $("soilNote").textContent=soilNote(); }
  else if(mono){ $("monoNote").textContent=monoNote(); $("soilNote").textContent=soilNote(); } else $("shpNote").textContent=R.S.hex?`육각: 맞변 ${fx(R.S.hex.flats,2)} m, 꼭짓점 ${fx(R.S.hex.corners,2)} m, 면적이 같은 원 외경 ${fx(2*R.rso,3)} m (부력·파랑에 사용). 높이는 저판 하면 기준.`:"높이는 모두 저판 하면 기준입니다.";
  renderSummary(); renderWarns();
  dirty={gen:1,rbd:1,m3d:1,load:1,stab:1,mem:1,flt:1,wt:1,qty:1,strs:1,calc:1,mchk:1,mpy:1}; if((mono||jack)&&!$("soilEd").innerHTML) drawSoil();
  renderTab(curTab);
}
function renderTab(t){
  if(!dirty[t]) return; dirty[t]=0;
  if(R.cat==="mono"){ renderMonoTab(t); return; }
  if(R.cat==="jacket"){ renderJacketTab(t); return; }
  if(t==="gen"){ $("capSec").textContent="정면 단면도"; drawSection(); drawPlan(); drawGenSheet(); drawDetailSheets("gen"); }
  else if(t==="rbd"){ drawRebarSheet(); drawDetailSheets("rb"); }
  else if(t==="m3d") build3D();
  else if(t==="load") $("repLoad").innerHTML=htmlLoad();
  else if(t==="stab") $("repStab").innerHTML=htmlStab();
  else if(t==="mem") $("repMem").innerHTML=htmlMember();
  else if(t==="flt"){ if(!R.tow) R.tow=towTable(R.P); $("repFlt").innerHTML=htmlFlt(); }
  else if(t==="wt") $("repWt").innerHTML=htmlWt();
  else if(t==="qty") $("repQty").innerHTML=htmlQty();
  else if(t==="strs") $("repStr").innerHTML=htmlStress();
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
  if(/RNA·타워 중량이 없습니다/.test(w)) return {tip:"발전량 계산 도구는 출력곡선만 다뤄서, 그쪽에서 만든 터빈 파일에는 RNA·타워 중량과 하중표가 비어 있습니다. 같은 이름의 터빈이 이 도구에 이미 있으면 가져올 때 중량·하중표를 그대로 둡니다.",fixes:[{label:"선택 터빈 복제해서 중량 입력",act:()=>$("tDup").click()},{label:"중량·하중표가 든 터빈 파일 가져오기",act:()=>$("tImp").click()}]};
  if(/인터페이스 높이 .* 가정값입니다/.test(w)) return {tip:"발전량 계산 도구에서 내보낸 터빈 파일은 인터페이스 높이를 몰라 15 m로 넣습니다. 제작사 자료의 타워 하단 플랜지 높이로 고치세요."};
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
    { const k0=Object.keys(f.patch).find(k=>$(k)); if(k0) igShow($(k0)); }
    Object.keys(f.patch).forEach(k=>{ const el=$(k); if(el){ el.classList.add("flash"); setTimeout(()=>el.classList.remove("flash"),1200); } });
  }));
}

/* ---------- 도면 (SVG·DXF 공용 원시도형) ---------- */
function wallIn(P,z){ if(P.type==="caisson") return P.cDw/2-P.ctw; const z1=P.tb+P.hw; return z<=z1?P.Dw/2-P.tw:(P.Dw/2+(P.Dt/2-P.Dw/2)*(z-z1)/P.hk-P.tkh); }
/* 보강 링 목록 (유효한 것만, 번호 ①②…) */
function ringList(P){ return (P.rings||[]).filter(r=>r.D>0&&r.t>0&&r.h>0).map((r,i)=>({...r,no:String.fromCharCode(0x2460+Math.min(i,19))})); }
/* 설계파 표시(정면도 오른쪽): 파형 스케치(2차 성분으로 파봉 뾰족), 파봉·파곡 선, 파고 치수, 제원. zHW = 그림 좌표의 설계조위, off = 표고(DL) − 그림 좌표 */
function waveDraw(o,P,xa,xb,zHW,off,fs,crestLine){ const H=P.Hw; if(!(H>0)||!(xb-xa>6)) return;
  const W=P.waveRef, ec=H/2, zc=zHW+ec, zt=zHW-(H-ec), a=H/2, b=Math.min(H*0.08,ec*0.3), n=60, Lw=(xb-xa)/1.25, pts=[];
  for(let i=0;i<=n;i++){ const x=xa+(xb-xa)*i/n, th=2*Math.PI*(x-xa-Lw*0.35)/Lw; pts.push([x,zHW+a*Math.cos(th)+b*Math.cos(2*th)]); }
  // 파형이 정확히 파봉·파곡에 닿도록 맞춤
  const mx=Math.max(...pts.map(p=>p[1])), mn=Math.min(...pts.map(p=>p[1])); pts.forEach(p=>{ p[1]=zt+(p[1]-mn)*(zc-zt)/(mx-mn); });
  o.push({t:"poly",open:1,L:"WL",pts,w:.18});
  const xc=xa+Lw*0.35;
  if(crestLine!==false) o.push({t:"line",L:"WL",x1:xa,z1:zc,x2:xb,z2:zc,dash:1});
  o.push({t:"line",L:"WL",x1:xa,z1:zt,x2:xb,z2:zt,dash:1});
  if(crestLine!==false) o.push({t:"text",L:"WL",x:xb,z:zc+fs*0.35,h:fs*.75,s:`파봉 ${dl(zc+off)}`,anchor:"end"});
  o.push({t:"text",L:"WL",x:xb,z:zt-fs*1.05,h:fs*.75,s:`파곡 ${dl(zt+off)}`,anchor:"end"});
  const xd=xc; o.push({t:"line",L:"DIM",x1:xd,z1:zt,x2:xd,z2:zc}); [zc,zt].forEach(z=>o.push({t:"line",L:"DIM",x1:xd-fs*.35,z1:z-fs*.35,x2:xd+fs*.35,z2:z+fs*.35}));
  const lab=[`설계파 H = ${fx(H,2)} m, T = ${fx(P.Tw,1)} s`]; if(W) lab.push(`${W.title||"설계파 산정 보고서"}${W.reportNo?` (${W.reportNo})`:""} 첨부`);
  if(W&&W.crest>0&&Math.abs(W.crest-ec)>0.05) lab.push(`보고서 파봉고 정수면 +${fx(W.crest,2)} m (계산은 H/2)`);
  lab.forEach((t,i)=>o.push({t:"text",L:"DIM",x:xb,z:zc+fs*(1.5+1.05*(lab.length-1-i)),h:fs*.75,s:t,anchor:"end"})); }
function secPrims(R){
  const P=R.P, o=[], rso=R.rso, rsi=R.rsi, z2=R.z2, wt=R.wideTop;
  const Rmax=Math.max(R.Rbase,P.Dp/2);
  const zHW=P.hwl-P.zbDL, zMS=P.msl-P.zbDL, zLW=-P.zbDL, zSB=P.sbDL-P.zbDL;
  const xL=-Rmax-26, xR=Rmax+(P.Hw>0?40:22), zT=Math.max(P.ztop,zHW)+6, zB=-Math.max(4,P.tg+3);  // 오른쪽에 설계파 그림 자리
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
    const hung=P.type==="caisson"&&r.z+r.h>=P.cH-P.ctt-0.05&&r.z>P.cts+0.05;  // 상판에 매단 링: 위는 상판·치수가 있으므로 번호를 링 아래로
    const z0=hung?r.z:r.z+r.h, zl=hung?r.z-1.0-fs*.5:r.z+r.h+1.0;
    const outer=r.D/2>=(P.type==="caisson"?P.cDw/2-P.ctw:P.Dw/2-P.tw)-0.05, xa=outer?r.D/2-r.t:r.D/2, sg=outer?-1:1;  // 외벽에 붙은 링은 오른쪽 치수선과 겹치지 않게 안쪽으로 인출
    if(outer&&!hung){ const zm=r.z+r.h/2; o.push({t:"line",L:"DIM",x1:xa,z1:zm,x2:xa-1.6,z2:zm}); o.push({t:"text",L:"DIM",x:xa-1.7,z:zm-fs*.25,h:fs*.72,s:`${r.no} 상세 ${String.fromCharCode(65+RG.indexOf(r))}`,anchor:"end"}); return; }
    o.push({t:"line",L:"DIM",x1:xa,z1:z0,x2:xa+sg*1.2,z2:hung?r.z-1.0:zl});
    o.push({t:"text",L:"DIM",x:xa+sg*1.3,z:zl,h:fs*.72,s:`${r.no} 상세 ${String.fromCharCode(65+RG.indexOf(r))}`,...(outer?{anchor:"end"}:{})}); });
  if(RG.length){ const zl=zHW+fs*(2.6+1.05*RG.length);  // 설계조위 표기 위 빈 곳
    o.push({t:"text",L:"TXT",x:xL+.3,z:zl,h:fs*.78,s:"보강 링 (외경 × 두께, 높이, 하단 높이)"});
    RG.forEach((r,i)=>o.push({t:"text",L:"DIM",x:xL+.3,z:zl-fs*(1.1+1.05*i),h:fs*.72,num:1,s:`${r.no} Ø${fx(r.D*1000,0)} × ${fx(r.t*1000,0)}, h ${fx(r.h*1000,0)}, z ${fx(r.z*1000,0)}`})); }
  o.push({t:"line",L:"CEN",x1:0,z1:-P.tg-1.5,x2:0,z2:P.ztop+3});
  // 수위
  const wl=(z,lab,dash)=>{ o.push({t:"line",L:"WL",x1:xL,z1:z,x2:-Rmax-1,z2:z,dash}); o.push({t:"tri",L:"WL",x:xL+3,z,s:0.9}); o.push({t:"text",L:"WL",x:xL+.3,z:z+1.3,h:fs*.85,s:lab}); };
  wl(zHW,`설계조위 ${dl(P.hwl)}`,false);
  waveDraw(o,P,Rmax+16,xR-1,zHW,P.zbDL,fs);
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
  if(Math.abs(R.Rwide-R.Rbase)>1e-6) hdim(R.Rwide,wt+Math.max(.6,fs*.9),P.type==="caisson"?"cDw":"Dw",true);
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
const SV={CONC:`fill="var(--conc)" stroke="var(--conc-line)" stroke-width=".07" stroke-linejoin="round"`,CFIL:`fill="var(--conc)" stroke="var(--conc)" stroke-width=".02"`,FILL:`fill="var(--fill)"`,WATER:`fill="var(--water)" opacity=".75"`,
  SOIL:`fill="var(--soil)" opacity=".55"`,GROUT:`fill="var(--grout)" stroke="var(--conc-line)" stroke-width=".06"`,RAD:`fill="none" stroke="var(--conc-line)" stroke-width=".06" stroke-dasharray=".6 .35"`,
  LINE:`fill="none" stroke="var(--conc-line)" stroke-width=".08"`,HID:`fill="none" stroke="var(--conc-line)" stroke-width=".06" stroke-dasharray=".7 .35"`,
  SHT:`fill="none" stroke="#222" stroke-width=".1"`,STEEL:`fill="var(--steel)" stroke="var(--conc-line)" stroke-width=".05" stroke-linejoin="round"`,ROCK:`fill="var(--rock)" opacity=".7"`,PLUG:`fill="var(--soil)" opacity=".3"`,SHC:`fill="#f4f6f6" stroke="#999" stroke-width=".05"`};
const SC={RB:"#c23b2e",RBD:"#c23b2e",SHT:"#222",STX:"#222",SDM:"#1d5e88",SMU:"#5b6970",WL:"var(--water-line)",TXT:"var(--ink)",DIM:"var(--dim)",MUT:"var(--muted)",CEN:"var(--muted)",LINE:"var(--conc-line)",HID:"var(--conc-line)",CONC:"var(--conc-line)"};
/* 흑백 도면용 (일반도 A3): 채움 없이 검은 선·글자 */
const K="#222", SVM={CONC:`fill="#fff" stroke="${K}" stroke-width=".07" stroke-linejoin="round"`,CFIL:`fill="#e6e6e6" stroke="#e6e6e6" stroke-width=".02"`,GROUT:`fill="#fff" stroke="${K}" stroke-width=".06"`,RAD:`fill="none" stroke="${K}" stroke-width=".06" stroke-dasharray=".6 .35"`,
  LINE:`fill="none" stroke="${K}" stroke-width=".08"`,HID:`fill="none" stroke="${K}" stroke-width=".06" stroke-dasharray=".7 .35"`,SHT:`fill="none" stroke="${K}" stroke-width=".1"`};
const SCM=new Proxy({},{get:()=>K});
function primsSVG(pr,label){
  const Y=z=>-z, [x0,z0,x1,z1]=pr.box, out=[], sv=pr.mono?SVM:SV, sc=pr.mono?SCM:SC;
  pr.o.forEach(p=>{
    if(p.t==="poly") out.push(`<${p.open?"polyline":"polygon"} points="${p.pts.map(q=>`${q[0].toFixed(3)},${Y(q[1]).toFixed(3)}`).join(" ")}" ${p.open?`fill="none" stroke="${sc[p.L]||"#222"}" stroke-width="${p.w||.07}" stroke-linejoin="round"`:(sv[p.L]||sv.LINE)}${p.w&&!p.open?` stroke-width="${p.w}"`:""}/>`);
    else if(p.t==="circle") out.push(`<circle cx="${p.x}" cy="${Y(p.z)}" r="${p.r}" ${p.fill?(pr.mono?`fill="none" stroke="${K}" stroke-width=".08"`:`fill="var(--${p.fc||"conc"})" opacity="${p.op||.5}"`):'fill="none"'} ${p.fill?"":(sv[p.L]||sv.LINE).replace('fill="none"',"")}/>`);
    else if(p.t==="line") out.push(`<line x1="${p.x1}" y1="${Y(p.z1)}" x2="${p.x2}" y2="${Y(p.z2)}" stroke="${sc[p.L]||"var(--ink)"}" stroke-width="${p.w||(p.L==="DIM"?.06:p.L==="CEN"?.05:.07)}" ${p.L==="CEN"?'stroke-dasharray="1.6 .5 .3 .5"':p.dash||p.L==="HID"?'stroke-dasharray=".8 .4"':""}/>`);
    else if(p.t==="dot") out.push(`<circle cx="${p.x.toFixed(3)}" cy="${Y(p.z).toFixed(3)}" r="${p.r}" fill="${sc[p.L]||"#c23b2e"}"/>`);
    else if(p.t==="tri") out.push(`<path d="M${p.x} ${Y(p.z)} l${-p.s*.7} ${-p.s} h${p.s*1.4}z" fill="${sc[p.L]}"/>`);
    else if(p.t==="text"){ const y=Y(p.z); out.push(`<text x="${p.x}" y="${y}" font-size="${p.h}" fill="${sc[p.L]||"var(--ink)"}" ${p.num?'font-family="var(--f-num)"':""} ${p.anchor?`text-anchor="${p.anchor}"`:""} ${p.rot?`transform="rotate(-90 ${p.x} ${y})"`:""} ${p.key?`data-k="${p.key}" tabindex="0"`:""}>${esc(p.s)}</text>`); }
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
  h+=`<h3>5. 파랑하중 (MacCamy-Fuchs 회절 관성력 + 항력)</h3>${waveSrcHtml(P)}
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
/* ---------- 응력분포도 (중력식) ---------- */
const LCS={LC1:["var(--l-cur)",""],LC2:["var(--l-wave)",""],LC3:["var(--l-wind)","5 3"],LC4:["#c2552e",""]};
const niceTk=(a,b,n=5)=>{ const d=b-a||1, s=Math.pow(10,Math.floor(Math.log10(d/n))), m=[1,2,5,10].find(m=>d/(m*s)<=n)*s, r=[]; for(let v=Math.ceil(a/m)*m; v<=b+1e-9; v+=m) r.push(+v.toPrecision(6)); return r; };
/* 높이(표고)에 따른 분포 그래프: series [{id,v:[...] }], z 배열(저판 하면 기준) → 표고 DL로 표시 */
function heightSVG(series,z,xlab,unit,marks,zero,yOff,refs){
  const W=300,H=320,ml=46,mr=12,mt=12,mb=34, P=R.P, off=yOff!=null?yOff:P.zbDL, y=zz=>zz+off, zs=series.flatMap(s=>s.z||z), y0=y(Math.min(...zs)), y1=y(Math.max(...zs));
  let lo=Infinity,hi=-Infinity; series.forEach(s=>s.v.forEach(v=>{ lo=Math.min(lo,v); hi=Math.max(hi,v); })); (refs||[]).forEach(([v])=>{ lo=Math.min(lo,v); hi=Math.max(hi,v); }); if(zero!==false){ lo=Math.min(lo,0); hi=Math.max(hi,0); } if(hi-lo<1e-9) hi=lo+1; const pd=(hi-lo)*0.06; lo-=pd; hi+=pd;
  const X=v=>ml+(W-ml-mr)*(v-lo)/(hi-lo), Y=v=>mt+(H-mt-mb)*(y1-v)/(y1-y0);
  let g=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${xlab} 높이 분포">`;
  niceTk(lo,hi,4).forEach(v=>g+=`<line x1="${X(v)}" y1="${mt}" x2="${X(v)}" y2="${H-mb}" stroke="var(--line)" stroke-width="${v===0?1.1:.5}"/><text x="${X(v)}" y="${H-mb+12}" font-size="9" fill="var(--muted)" text-anchor="middle" font-family="var(--f-num)">${fx(v,Math.abs(hi-lo)<20?1:0)}</text>`);
  niceTk(y0,y1,6).forEach(v=>g+=`<text x="${ml-4}" y="${Y(v)+3}" font-size="9" fill="var(--muted)" text-anchor="end" font-family="var(--f-num)">${v}</text>`);
  (marks||[]).forEach(([zz,lab,c])=>{ const yy=y(zz); if(yy<y0||yy>y1) return; g+=`<line x1="${ml}" y1="${Y(yy)}" x2="${W-mr}" y2="${Y(yy)}" stroke="${c}" stroke-width=".8" stroke-dasharray="3 2"/><text x="${W-mr-2}" y="${Y(yy)-3}" font-size="8.5" fill="${c}" text-anchor="end">${lab}</text>`; });
  (refs||[]).forEach(([v,lab,c])=>{ g+=`<line x1="${X(v)}" y1="${mt}" x2="${X(v)}" y2="${H-mb}" stroke="${c}" stroke-width=".9" stroke-dasharray="5 3"/><text x="${X(v)+(v>=0?-3:3)}" y="${mt+9}" font-size="8.5" fill="${c}" text-anchor="${v>=0?"end":"start"}">${lab}</text>`; });
  series.forEach(s=>{ const [c,d]=s.c?[s.c,s.dash||""]:(LCS[s.id]||["var(--ink)",""]), zz=s.z||z; g+=`<polyline points="${s.v.map((v,i)=>`${X(v).toFixed(1)},${Y(y(zz[i])).toFixed(1)}`).join(" ")}" fill="none" stroke="${c}" stroke-width="1.6" ${d?`stroke-dasharray="${d}"`:""}/>`; });
  g+=`<text x="${(ml+W-mr)/2}" y="${H-6}" font-size="10" fill="var(--ink)" text-anchor="middle">${xlab}${unit?` (${unit})`:""}</text>`;
  g+=`<text x="11" y="${(mt+H-mb)/2}" font-size="10" fill="var(--ink)" transform="rotate(-90 11 ${(mt+H-mb)/2})" text-anchor="middle">표고 (DL, m)</text></svg>`;
  return g;
}
/* 지반반력 분포 (저판 하면 단면, 압축 측 오른쪽) */
function pressSVG(l){
  const W=300,H=170,ml=20,mr=20, Rb=R.Rbase, X=x=>ml+(W-ml-mr)*(x+Rb)/(2*Rb), qs=Math.max(l.noGap?l.qmax:l.qeff,l.qa)*1.1, Yb=46, S=v=>Yb+ (H-Yb-30)*v/qs;
  const [c]=LCS[l.id]||["var(--ink)"];
  let g=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${l.id} 지반반력 분포">`;
  g+=`<rect x="${X(-Rb)}" y="${Yb-14}" width="${X(Rb)-X(-Rb)}" height="14" fill="var(--conc)" stroke="var(--conc-line)" stroke-width=".8"/>`;
  g+=`<text x="${W/2}" y="${Yb-20}" font-size="9" fill="var(--muted)" text-anchor="middle">저판 Ø${fx(2*Rb*1000,0)} · e = ${fx(l.e,2)} m ${l.noGap?"(핵 안, 전면 접지)":"(핵 밖, 유효 면적)"}</text>`;
  if(l.noGap){ g+=`<polygon points="${X(-Rb)},${Yb} ${X(Rb)},${Yb} ${X(Rb)},${S(l.qmax)} ${X(-Rb)},${S(Math.max(0,l.qmin))}" fill="${c}" fill-opacity=".18" stroke="${c}" stroke-width="1.4"/>`;
    g+=`<text x="${X(Rb)-2}" y="${S(l.qmax)+11}" font-size="9.5" fill="var(--ink)" text-anchor="end" font-family="var(--f-num)">q<tspan font-size="7" dy="2">max</tspan><tspan dy="-2"> ${fx(l.qmax,0)}</tspan></text><text x="${X(-Rb)+2}" y="${S(Math.max(0,l.qmin))+11}" font-size="9.5" fill="var(--ink)" font-family="var(--f-num)">q<tspan font-size="7" dy="2">min</tspan><tspan dy="-2"> ${fx(l.qmin,0)}</tspan></text>`; }
  else if(l.Aeff>0){ const x0=Rb-l.be; g+=`<polygon points="${X(x0)},${Yb} ${X(Rb)},${Yb} ${X(Rb)},${S(l.qeff)} ${X(x0)},${S(l.qeff)}" fill="${c}" fill-opacity=".18" stroke="${c}" stroke-width="1.4"/>`;
    g+=`<line x1="${X(x0)}" y1="${Yb}" x2="${X(Rb)}" y2="${S(Math.max(0,l.qmax))}" stroke="${c}" stroke-width=".8" stroke-dasharray="3 2"/>`;
    g+=`<text x="${X(Rb)-2}" y="${S(l.qeff)+11}" font-size="9.5" fill="var(--ink)" text-anchor="end" font-family="var(--f-num)">q<tspan font-size="7" dy="2">eff</tspan><tspan dy="-2"> ${fx(l.qeff,0)}</tspan></text><text x="${(X(x0)+X(Rb))/2}" y="${Yb+10}" font-size="8.5" fill="var(--muted)" text-anchor="middle">유효 폭 b' ${fx(l.be,2)} m</text>`; }
  g+=`<line x1="${X(-Rb)}" y1="${S(l.qa)}" x2="${X(Rb)}" y2="${S(l.qa)}" stroke="#c23b2e" stroke-width=".9" stroke-dasharray="5 3"/><text x="${X(-Rb)+2}" y="${S(l.qa)-3}" font-size="8.5" fill="#c23b2e" font-family="var(--f-num)">허용 q<tspan font-size="7" dy="2">a</tspan><tspan dy="-2"> ${fx(l.qa,0)}</tspan></text>`;
  return g+`<text x="${W/2}" y="${H-6}" font-size="9" fill="var(--muted)" text-anchor="middle">단위 kPa · 실선 = 검토에 쓴 분포${l.noGap?"":", 점선 = 선형 분포(참고)"}</text></svg>`;
}
/* 보 모멘트 분포 (x: 0~L, 값 배열) */
function beamSVG(xs,ms,xlab,lab,marks,ends){
  const W=300,H=190,ml=46,mr=12,mt=14,mb=44; let lo=Math.min(0,...ms),hi=Math.max(0,...ms); const pd=(hi-lo)*0.08||1; lo-=pd; hi+=pd;
  const L=xs[xs.length-1], X=x=>ml+(W-ml-mr)*x/L, Y=v=>mt+(H-mt-mb)*(hi-v)/(hi-lo);
  let g=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${lab}">`;
  niceTk(lo,hi,4).forEach(v=>g+=`<line x1="${ml}" y1="${Y(v)}" x2="${W-mr}" y2="${Y(v)}" stroke="var(--line)" stroke-width="${v===0?1.1:.5}"/><text x="${ml-4}" y="${Y(v)+3}" font-size="9" fill="var(--muted)" text-anchor="end" font-family="var(--f-num)">${fx(v,0)}</text>`);
  niceTk(0,L,5).forEach(v=>g+=`<text x="${X(v)}" y="${H-mb+12}" font-size="9" fill="var(--muted)" text-anchor="middle" font-family="var(--f-num)">${v}</text>`);
  g+=`<polygon points="${X(0)},${Y(0)} ${xs.map((x,i)=>`${X(x).toFixed(1)},${Y(ms[i]).toFixed(1)}`).join(" ")} ${X(L)},${Y(0)}" fill="var(--l-wave)" fill-opacity=".15" stroke="var(--l-wave)" stroke-width="1.5"/>`;
  (marks||[]).forEach(([x,v,t])=>g+=`<circle cx="${X(x)}" cy="${Y(v)}" r="2.2" fill="var(--ink)"/><text x="${Math.min(X(x)+4,W-mr-60)}" y="${Y(v)+(v>=0?-4:11)}" font-size="9" fill="var(--ink)" font-family="var(--f-num)">${t}</text>`);
  if(ends) g+=`<text x="${X(0)}" y="${H-mb+22}" font-size="8.5" fill="var(--accent,#1f7fb8)" text-anchor="start">◀ ${ends[0]}</text><text x="${X(L)}" y="${H-mb+22}" font-size="8.5" fill="var(--accent,#1f7fb8)" text-anchor="end">${ends[1]} ▶</text>`;
  return g+`<text x="${(ml+W-mr)/2}" y="${H-4}" font-size="10" fill="var(--ink)" text-anchor="middle">${xlab}</text><text x="11" y="${(mt+H-mb)/2}" font-size="10" fill="var(--ink)" transform="rotate(-90 11 ${(mt+H-mb)/2})" text-anchor="middle">M (kN·m/m)</text></svg>`;
}
/* 위치 안내 그림: 오른쪽 반단면에 해당 부재를 칠하고 x 방향 화살표 (kind: slab | wall | cone | plan) */
function keySVG(kind){
  const P=R.P, cais=P.type==="caisson", Rb=R.Rbase, S=R.S, ro=S.hex?S.hex.flats/2:R.rso, ri=S.hex?S.hex.flats/2-P.hth:R.rsi, A="var(--l-wave)";
  const tb=cais?P.cts:P.tb, Rw=cais?P.cDw/2:P.Dw/2, tw=cais?P.ctw:P.tw, Rwi=Rw-tw, z1=cais?P.cH:P.tb+P.hw, z2=R.z2;
  if(kind==="plan"){ const n=Math.round(P.cnr), W=300,H=150, sc=(H-24)/(2*Rw), cx=W/2, cy=H/2, X=x=>cx+x*sc, Y=y=>cy-y*sc, ph=PI/n;
    let g=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="저판 경간 위치 (평면)"><circle cx="${cx}" cy="${cy}" r="${Rw*sc}" fill="none" stroke="var(--muted)"/><circle cx="${cx}" cy="${cy}" r="${Rwi*sc}" fill="none" stroke="var(--muted)" stroke-width=".6"/><circle cx="${cx}" cy="${cy}" r="${ro*sc}" fill="none" stroke="var(--muted)"/>`;
    for(let i=0;i<n;i++){ const a=2*PI*i/n+ph; g+=`<line x1="${X(ro*Math.cos(a))}" y1="${Y(ro*Math.sin(a))}" x2="${X(Rwi*Math.cos(a))}" y2="${Y(Rwi*Math.sin(a))}" stroke="var(--muted)" stroke-width="${P.ctr*sc}"/>`; }
    const a0=-ph, a1=ph, arc=(r,a,b)=>`M${X(r*Math.cos(a))} ${Y(r*Math.sin(a))} A${r*sc} ${r*sc} 0 0 0 ${X(r*Math.cos(b))} ${Y(r*Math.sin(b))}`;
    g+=`<path d="${arc(Rwi,a0,a1)} L${X(ro*Math.cos(a1))} ${Y(ro*Math.sin(a1))} A${ro*sc} ${ro*sc} 0 0 1 ${X(ro*Math.cos(a0))} ${Y(ro*Math.sin(a0))} Z" fill="${A}" fill-opacity=".3" stroke="${A}"/>`;
    const r2=Rwi-0.8; g+=`<path d="${arc(r2,a0,a1)}" fill="none" stroke="${A}" stroke-width="1.6" marker-end="url(#ah)"/><defs><marker id="ah" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L6 3L0 6z" fill="${A}"/></marker></defs>`;
    g+=`<text x="${X(Rwi)+6}" y="${cy+3}" font-size="9" fill="var(--ink)">격벽 사이 (외벽 쪽)</text><text x="6" y="${H-6}" font-size="9" fill="var(--muted)">평면 · 칠한 칸 = 저판 한 칸, 화살표 = x 방향</text></svg>`;
    return g; }
  const zTop=kind==="cone"?z2+2:Math.max(z1+1.5,tb+Rb*0.32), W=300, H=140, sc=Math.min((W-150*(kind==="cone"?1:0)-20)/Rb,(H-34)/zTop), X=x=>10+x*sc, Y=z=>H-8-z*sc;
  const poly=(pts,hl)=>`<polygon points="${pts.map(([x,z])=>`${X(x).toFixed(1)},${Y(z).toFixed(1)}`).join(" ")}" fill="${hl?A:"var(--conc)"}" fill-opacity="${hl?.55:.6}" stroke="${hl?A:"var(--conc-line)"}" stroke-width="${hl?1.4:.7}"/>`;
  const cid="kc"+(keySVG.n=(keySVG.n||0)+1), cy0=14;
  let g=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${kind} 위치"><defs><marker id="ah2" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L6 3L0 6z" fill="${A}"/></marker><clipPath id="${cid}"><rect x="2" y="${cy0}" width="${W-4}" height="${H-cy0-2}"/></clipPath></defs><rect x="2" y="${cy0}" width="${W-4}" height="${H-cy0-2}" fill="none" stroke="var(--line)" stroke-width=".8"/><g clip-path="url(#${cid})">`;
  const slabHL=kind==="slab";
  g+=poly([[0,0],[Rb,0],[Rb,tb],[0,tb]],false);
  if(slabHL) g+=poly([[ro,0],[Rwi,0],[Rwi,tb],[ro,tb]],true);
  g+=poly([[Rwi,tb],[Rw,tb],[Rw,z1],[Rwi,z1]],kind==="wall");
  if(!cais) g+=poly([[Rw-P.tkh,z1],[Rw,z1],[P.Dt/2,z2],[P.Dt/2-P.tkh,z2]],kind==="cone"); else g+=poly([[ro,P.cH-P.ctt],[Rwi,P.cH-P.ctt],[Rwi,P.cH],[ro,P.cH]],false);
  g+=poly([[ri,P.zc0],[ro,P.zc0],[ro,zTop],[ri,zTop]],false);
  g+=`<line x1="${X(0)}" y1="${Y(-0.5)}" x2="${X(0)}" y2="${Y(zTop)}" stroke="var(--muted)" stroke-dasharray="4 2 1 2" stroke-width=".7"/>`;
  const arr=(x1,z1_,x2,z2_)=>`<line x1="${X(x1)}" y1="${Y(z1_)}" x2="${X(x2)}" y2="${Y(z2_)}" stroke="${A}" stroke-width="1.6" marker-end="url(#ah2)"/>`;
  const za=tb+8/sc;
  if(kind==="slab"){ g+=arr(ro,za,Rwi,za); g+=`<text x="${X(ro)+2}" y="${Y(za)-16}" font-size="8.5" fill="var(--ink)">x = 0 (기둥 외면) →</text><text x="${X(Rwi)-2}" y="${Y(za)-5}" font-size="8.5" fill="var(--ink)" text-anchor="end">x = L (벽체 내면)</text>`; }
  if(kind==="wall"){ const xx=Rwi-8/sc, zw=cais?P.cH-P.ctt:z1; g+=arr(xx,tb,xx,zw); g+=`<text x="${X(xx)-5}" y="${Y(tb)-4}" font-size="8.5" fill="var(--ink)" text-anchor="end">x = 0 (저판 상면)</text><text x="${X(xx)-5}" y="${Y(zw)+11}" font-size="8.5" fill="var(--ink)" text-anchor="end">x = ${fx(zw-tb,2)} m (${cais?"상판 하면":"벽 상단"})</text>`; }
  if(kind==="cone"){ const dxn=-8/sc; g+=arr(Rw-P.tkh+dxn,z1,P.Dt/2-P.tkh+dxn,z2); g+=`<text x="${X(Rw)+4}" y="${Y(z1)+3}" font-size="8.5" fill="var(--ink)">x = 0 (원추 하단)</text><text x="${X(P.Dt/2)+6}" y="${Y(z2)+3}" font-size="8.5" fill="var(--ink)">x = 끝 (원추 상단)</text>`; }
  // 위쪽을 끊어 그렸으면 끊음 표시
  const zCut=zTop-0.3; if(kind!=="cone"||P.ztop>zTop){ const yy=Y(zCut), xa=X(ri)-6, xb=X(ro)+6, m=(xa+xb)/2; g+=`<polyline points="${xa},${yy} ${m-3},${yy} ${m-1},${yy-4} ${m+1},${yy+4} ${m+3},${yy} ${xb},${yy}" fill="none" stroke="var(--ink)" stroke-width=".8"/>`; }
  return g+`</g><text x="${W-4}" y="10" font-size="8.5" fill="var(--muted)" text-anchor="end">오른쪽 반단면 · 칠한 부재, 화살표 = x 방향</text></svg>`;
}
function htmlStress(){
  const P=R.P, C=R.colD, ids=["LC1","LC2","LC3","LC4"], F=memberForces(R), nm=Object.fromEntries(R.LC.map(l=>[l.id,l.nm]));
  const leg=`<div class="legend" style="margin:4px 0 0">${ids.map(id=>`<span><i style="background:${LCS[id][0]}"></i>${id} ${nm[id]}</span>`).join("")}</div>`;
  const marks=[[P.hwl-P.zbDL,"설계조위","var(--water-line)"],[R.zIf,"터빈 인터페이스","var(--muted)"]];
  const ser=k=>ids.map(id=>({id,v:C.lc[id][k]}));
  const at=(arr,i)=>arr[i];
  let h=`<h2>1. 기둥 높이별 단면력·응력 (사용하중)</h2>
  <p class="note">기둥 ${C.hex?"(육각 → 같은 면적의 등가 원형)":""} 외경 ${fx(2*C.ro,3)} m · 내경 ${fx(2*C.ri,3)} m, A = π/4(D² − d²) = ${fx(C.Ac,3)} m², Z = π(D⁴ − d⁴)/(32D) = ${fx(C.Zc,3)} m³.
  단면 위쪽 하중만 모음: N = 터빈 연직 + 기둥·플랫폼 자중(수중부 수중단위중량), H·M = 터빈 + 풍하중 + 파랑(단면마다 최대 위상) + 조류 + 지진 관성력. σ = N/A ± M/Z (압축 +). 기둥 속채움은 내부 바닥으로 전달된다고 보고 뺐습니다.</p>${leg}
  <div class="plots"><div class="sheet">${heightSVG(ser("N"),C.z,"축력 N","kN",marks)}</div><div class="sheet">${heightSVG(ser("V"),C.z,"전단력 V","kN",marks)}</div><div class="sheet">${heightSVG(ser("M").map(s=>({...s,v:s.v.map(v=>v/1000)})),C.z,"휨모멘트 M","MN·m",marks)}</div>
  <div class="sheet">${heightSVG(ids.flatMap(id=>[{id,v:C.lc[id].sc},{id,v:C.lc[id].st}]),C.z,"연단 응력 σ (압축 +)","MPa",marks)}</div></div>`;
  h+=`<div class="tblwrap"><table class="t"><thead><tr><th>하중조합</th><th>단면 (기둥 하단)</th><th>N (kN)</th><th>V (kN)</th><th>M (kN·m)</th><th>σ 압축측 (MPa)</th><th>σ 인장측 (MPa)</th></tr></thead><tbody>${ids.map(id=>{ const l=C.lc[id]; return `<tr><td class="l">${id} ${nm[id]}</td><td class="n">${dl(C.z[0]+P.zbDL)}</td><td class="n">${fx(l.N[0],0)}</td><td class="n">${fx(l.V[0],0)}</td><td class="n">${fx(l.M[0],0)}</td><td class="n">${fx(l.sc[0],2)}</td><td class="n">${fx(l.st[0],2)}${l.st[0]<0?" (인장)":""}</td></tr>`; }).join("")}</tbody></table></div>
  <p class="note">인장측 응력이 음(−)이면 콘크리트 단면에 인장이 생깁니다. 기둥 축방향 철근 검토(계수하중)는 부재설계 탭에 있습니다.</p>`;
  h+=`<h2>2. 지반반력 분포 (저판 하면)</h2><p class="note">e = M/V. e ≤ R/4(핵 안)이면 q = V/A ± M/Z 사다리꼴, 핵 밖이면 들림이 생겨 유효 면적 A' 위 균등 q<sub>eff</sub> = V/A' (DNV-ST-0126)로 검토합니다. 빨간 점선은 허용지지력(가정값).</p>
  <div class="plots">${R.LC.map(l=>`<div class="sheet"><div class="cap">${l.id} ${l.nm}</div>${pressSVG(l)}</div>`).join("")}</div>`;
  // 저판: 1방향 양단고정 (지점 −qL²/12, 중앙 qL²/24), 뒷굽 캔틸레버
  const sl=F.slab, nx=40, xs=[...Array(nx+1)].map((_,i)=>sl.L*i/nx), cais=P.type==="caisson", byRad=!(sl.La<sl.Lr);
  const msl=xs.map(x=>sl.qu*(6*sl.L*x-6*x*x-sl.L*sl.L)/12);
  h+=`<h2>3. 하부 부재 휨모멘트 분포 (계수하중)</h2><p class="note">각 그래프 위 그림의 칠한 부재가 그 그래프의 위치이고, 화살표가 가로축(x) 방향입니다. 저판은 양 끝 고정 보, 벽체·원추는 하단 고정 원통 쉘의 경계 휨(근사, 가정)으로 봤습니다. 값은 부재설계 탭과 같습니다.</p><div class="plots">
  <div class="sheet"><div class="cap">저판 — 경간 L = ${cais?`min(반경 방향 ${fx(sl.Lr,2)}, 격벽 간격 ${fx(sl.La,2)}) = `:""}${fx(sl.L,2)} m${cais?(byRad?" (반경 방향 지배)":" (격벽 간격 지배)"):""}, q<sub>u</sub> = ${fx(sl.qu,1)} kPa (${sl.gov})</div>
  ${keySVG(byRad?"slab":"plan")}
  ${beamSVG(xs,msl,byRad?"기둥 외면에서 반경 방향 거리 (m)":"격벽 면에서 원주 방향 거리 (m, 외벽 쪽)","저판 휨모멘트",[[0,-sl.Msup,`지점 −${fx(sl.Msup,0)}`],[sl.L/2,sl.Mmid,`중앙 +${fx(sl.Mmid,0)}`]],byRad?["기둥 외면",cais?"외벽 내면":"원통 내면"]:["격벽","격벽"])}</div>`;
  const wallH=cais?P.cH-P.cts-P.ctt:P.hw, sl2=(P.Dw-P.Dt)/2/P.hk, coneL=cais?0:P.hk*Math.sqrt(1+sl2*sl2);
  const shell=(o,t,kind,Lm,xlab,ends)=>{ if(!o) return ""; const xs2=[...Array(41)].map((_,i)=>Lm*i/40), m2=xs2.map(x=>o.Mu*Math.exp(-o.beta*x)*(Math.cos(o.beta*x)-Math.sin(o.beta*x)));
    return `<div class="sheet"><div class="cap">${t} — 길이 ${fx(Lm,2)} m, β = ${fx(o.beta,3)} 1/m, M<sub>u</sub> = ${fx(o.Mu,0)} kN·m/m</div>${keySVG(kind)}${beamSVG(xs2,m2,xlab,t+" 휨모멘트",[[0,o.Mu,`하단 ${fx(o.Mu,0)}`]],ends)}</div>`; };
  h+=shell(F.wall,cais?"외벽 (연직 방향)":"하부 원통 벽 (연직 방향)","wall",wallH,"저판 상면에서 높이 (m)",["저판 상면",cais?"외벽 상단(상판)":"원통 상단(원추 시작)"])
    +shell(F.cone,"원추 벽 (경사 방향)","cone",coneL,"원추 하단에서 경사 길이 (m)",["원추 하단","원추 상단(기둥)"])+`</div>
  <p class="note">벽체 경계 휨: M(x) = M<sub>u</sub>·e<sup>−βx</sup>(cos βx − sin βx), β = ⁴√(3(1−ν²)/(r²t²)). 하단(저판·원통과 만나는 곳)에서 가장 크고 π/β(= ${fx(PI/F.wall.beta,1)} m) 안에서 거의 사라집니다. 가로축은 실제 부재 길이까지만 그렸습니다.</p>`;
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
  prs.forEach(({pr,dx,dy})=>pr.o.forEach(p=>{ if(p.L==="CFIL") return; // 채움 띠는 DXF에 넣지 않음
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
  { const gs=genSheetPrims(R); z.file(`${baseName()}_일반도_A3.dxf`,primsDXF([{pr:gs,dx:0,dy:0}])); }
  { const g0=genSheetPrims(R), b=detailSheetPrims(R,true); if(g0.dLeft){ const a=detailSheetPrims(R,false,g0.dN-g0.dLeft); z.file(`${baseName()}_상세도_A3.dxf`,primsDXF([{pr:a,dx:0,dy:0}])); } z.file(`${baseName()}_배근상세도_A3.dxf`,primsDXF([{pr:b,dx:0,dy:0}])); }
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
  // 보강 링: 외곽 + 원주(점, 내·외면) + 연직(선, 아래 부재에 정착) + 옆 부재 연결철근(수평 짧은 선)
  const RGs=ringSupport(P,R);
  RGs.forEach(g=>{ const k=g.i+1, r1=D.rows.find(r=>r.mk===`G${k}1`); if(!r1) return; const d=db(r1.bar), sp=r1.s/1000, la=Math.ceil(40*d*10)/10;
    C([[g.ri,g.z],[g.ro,g.z],[g.ro,g.z+g.h],[g.ri,g.z+g.h]]);
    const xi=g.ri+cv+d/2, xo=g.ro-cv-d/2, za=g.z+cv, zb2=g.z+g.h-cv;
    if(xo>xi){ dots(xi+d,za,xi+d,zb2,sp); dots(xo-d,za,xo-d,zb2,sp);
      // 저판까지 곧게 닿는 면: 저판 하부철근 위까지 내려 갈고리
      const zBot=cv+2*db(rb.sB.bar);
      const up=(g.above||[]).length>0, zUp=P.cH-cv-2*db(distRB(P.ctt).bar);
      [[xi,-1],[xo,1]].forEach(([x,sg])=>{ if(ringToSlab(RGs,g,x,cv)){ line(x,zBot,x,zb2); line(x,zBot,x+sg*Math.min(la,0.6),zBot); } else if(up){ line(x,za,x,zUp); line(x,zUp,x+ringUpHook(g,sg)*Math.min(la,0.6),zUp); } else line(x,za,x,zb2); }); }
    g.side.forEach(sd=>{ const w=ringDowel(g,sd,la,cv), hk=Math.min(0.25,g.h/4); for(const z of ringDowelZ(g,cv,d)){ const xa=sd.r-sd.dir*w.eR, xb=sd.r+sd.dir*w.eM; line(xa,z,xb,z);
        const hz=z-hk>=g.z+cv?z-hk:z+hk; if(w.eR<la-1e-6) line(xa,z,xa,hz); if(w.eM<la-1e-6) line(xb,z,xb,hz); } });  // 두께가 모자란 쪽 끝은 갈고리
    tag(xo,g.z+g.h*0.6,`G${k} 보강 링 ${k} ${r1.bar}@${r1.s}${g.side.length?" + 연결철근":""}`); });
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
function rbTable(R,k,x0,ztop,wmm,zmin){
  const rows=R.M.qty.detail.rows, o=[], cols=[["번호",10],["부재 · 위치",50],["규격",13],["간격",12],["개수",15],["길이(m)",16],["총길이(m)",18],["중량(t)",wmm-134]];
  // 행이 많으면(보강 링 등) 표제란 위까지 들어가게 행 높이·글자 줄임
  const fit=zmin!=null?(ztop-zmin)/(rows.length+2):5.2*k, rh=Math.max(3.0*k,Math.min(5.2*k,fit)), th=Math.min(2.3*k,rh*0.45); let z=ztop;
  const xs=[]; let x=x0; cols.forEach(c=>{ xs.push(x); x+=c[1]*k; }); const xe=x;
  const hline=zz=>o.push({t:"line",L:"SHT",x1:x0,z1:zz,x2:xe,z2:zz,w:k*.18});
  o.push({t:"text",L:"STX",x:x0,z:z+1.5*k,h:3.2*k,s:"철근재료표"}); hline(z);
  const row=(vals,bold)=>{ vals.forEach((v,i)=>o.push({t:"text",L:"STX",x:i===1?xs[i]+1.2*k:(i>=4?xs[i]+cols[i][1]*k-1.2*k:xs[i]+cols[i][1]*k/2),z:z-rh+(rh-th)/2+th*0.15,h:th,s:String(v),anchor:i===1?"start":i>=4?"end":"middle",num:i!==1})); z-=rh; hline(z); };
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
  // 철근재료표는 배근 상세도(2번장)에 둠. 이 자리에 설계 조건표·주기
  { const M=R.M, cais=P.type==="caisson", x0=252*k, cw=[34*k,122*k], rh=5.2*k; let z=cz-c.r*f-1*k;
    const hl=zz=>o.push({t:"line",L:"SHT",x1:x0,z1:zz,x2:x0+cw[0]+cw[1],z2:zz,w:k*.18});
    o.push({t:"text",L:"STX",x:x0,z:z+1.5*k,h:3.2*k,s:"설계 조건"}); const zt=z; hl(z);
    const cond=[["설계 기준","KDS 14 20 (콘크리트구조 강도설계법)"],["콘크리트",`f_ck = ${P.fck} MPa`],["철근",`SD${P.fy} (f_y = ${P.fy} MPa), 이형철근`],["피복",`순피복 ${P.cov} mm (해양 노출)`],
      ["정착·이음","정착길이 40d, 겹침이음 40d (가정)"],["철근량",`${fx(M.qty.tot/1000,1)} t (${fx(M.qty.perM3,0)} kg/m³, 이음·할증 제외)`]];
    cond.forEach(r=>{ o.push({t:"text",L:"STX",x:x0+cw[0]/2,z:z-rh+1.6*k,h:2.3*k,s:r[0],anchor:"middle"}); o.push({t:"text",L:"STX",x:x0+cw[0]+1.5*k,z:z-rh+1.6*k,h:2.3*k,s:r[1]}); z-=rh; hl(z); });
    [0,cw[0],cw[0]+cw[1]].forEach(xx=>o.push({t:"line",L:"SHT",x1:x0+xx,z1:zt,x2:x0+xx,z2:z,w:k*.18}));
    z-=8*k; o.push({t:"text",L:"STX",x:x0,z,h:3.2*k,s:"주기"}); z-=5*k;
    const notes=["치수 단위는 mm이며, 높이는 저판 하면 기준이다.","철근 규격·간격은 부재설계 탭의 검토 결과이며, 철근 번호는 배근 상세도의 철근재료표와 같다.",
      "피복은 철근 표면까지의 순피복이다.","원주 방향 철근의 이음 위치는 서로 엇갈리게 배치한다.",
      `보강 링 배근 상세${cais&&P.cnr>=2?", 격벽 접합부 배근 상세":""}, 철근 가공도, 철근재료표는 배근 상세도를 참조한다.`,
      ...(cais&&P.cnr>=2?["방사형 격벽 철근(R1·R2)은 하부 슬래브·상판·기둥·외벽에 정착한다."]:[]),
      "정착·이음 길이는 예비값(가정)이며 실시설계에서 KDS 14 20 52에 따라 확인한다."];
    notes.forEach((s2,i)=>{ wrapTxt(s2,2.3*k,150*k).forEach((ln,j)=>{ if(!j) o.push({t:"text",L:"STX",x:x0,z,h:2.3*k,s:`${i+1}.`}); o.push({t:"text",L:"STX",x:x0+5*k,z,h:2.3*k,s:ln}); z-=3.7*k; }); });
  }
  // 표제란
  const tx=250*k, ty=12*k, tw=158*k, thh=34*k;
  o.push({t:"poly",L:"SHT",pts:[[tx,ty],[tx+tw,ty],[tx+tw,ty+thh],[tx,ty+thh]],w:k*.4});
  [ty+12*k,ty+23*k].forEach(z=>o.push({t:"line",L:"SHT",x1:tx,z1:z,x2:tx+tw,z2:z,w:k*.2}));
  o.push({t:"line",L:"SHT",x1:tx+40*k,z1:ty,x2:tx+40*k,z2:ty+thh,w:k*.2});
  const T=(x,z,s,h)=>o.push({t:"text",L:"STX",x,z,h:(h||2.6)*k,s});
  T(tx+2*k,ty+27*k,"공사명"); T(tx+42*k,ty+27*k,"해상풍력발전기 기초 — 중력식 "+(P.type==="caisson"?"케이슨형":"원추형"),3);
  T(tx+2*k,ty+16*k,"도면명"); T(tx+42*k,ty+16*k,"해상풍력발전기 기초 배근도 (중력식)",3.6);
  T(tx+2*k,ty+5*k,"축척"); T(tx+42*k,ty+5*k,`1 : ${sc} (상세), 1 : ${scC} (기둥 단면)${P.type==="caisson"&&P.cnr>=2?`, 1 : ${sc} (단면 A-A)`:""}    ${new Date().toLocaleDateString("ko-KR")}    ${baseName()}`,2.4);
  // 케이슨: 방사형 격벽 단면 A-A 배근을 상세도 아래 왼쪽 빈 곳에
  let aa=0; if(P.type==="caisson"&&P.cnr>=2){ const top=(d.z0+dz)/k-8, bot=20; if(top-bot>=45){ // 단면 A-A를 위 배근 상세와 같은 x 좌표로
      const bgA=d.o.filter(p=>p.t==="poly"&&p.L==="CONC"), kA=sc/1000, cA=wallSecCell(R,2.4*kA,true,bgA), sx=(dx+cA.box[0])/k-2; // 같은 축척, 같은 x 좌표 → 기둥 외면·외벽 내면·슬래브 끝이 위 상세와 일직선
      aa=placeCell(o,th2=>wallSecCell(R,th2,true,bgA),sx,top,240-sx,top-bot,k,2.4,3,sc); } }
  return {o,box:[0,0,W,H],sc,scC,bg:1,aa};
}
/* ---------- 일반도 A3 (단면도 + 평면도 + 주기 + 표제란) ---------- */
/* 글자 줄바꿈: 한글은 글자 높이, 영문·숫자는 0.55배 폭으로 보고 maxW(m)에 맞춤 */
function wrapTxt(s,h,maxW){ const out=[]; let line="", w=0;
  const cw=c=>/[ᄀ-ᇿ　-鿿가-힯①-⓿]/.test(c)?h*0.95:h*0.55;
  for(const word of String(s).split(/(\s+)/)){ const ww=[...word].reduce((a,c)=>a+cw(c),0);
    if(w+ww>maxW&&line.trim()){ out.push(line.trimEnd()); line=word.trimStart(); w=[...line].reduce((a,c)=>a+cw(c),0); } else { line+=word; w+=ww; } }
  if(line.trim()) out.push(line.trimEnd()); return out; }
function genNotes(R){
  const P=R.P, T=R.T, cais=P.type==="caisson", L=R.LC, M=R.M, ok=x=>x?"O.K":"N.G";
  const minO=Math.min(...L.map(l=>l.FSo/l.fs.o)), minS=Math.min(...L.map(l=>l.FSs/l.fs.s)), wQ=L.reduce((a,b)=>b.qcheck/b.qa>a.qcheck/a.qa?b:a);
  const rg=ringList(P);
  const notes=[
    `치수 단위는 mm, 표고는 DL(약최저저조위 기준, m)이며 구조물 높이는 저판 하면 기준이다.`,
    `콘크리트 fck = ${P.fck} MPa(해양 노출), 철근 SD${P.fy}, 순피복 ${P.cov} mm. 철근 상세는 배근도를 따른다.`,
    `속채움(단위중량 ${P.gf} kN/m³)은 ${cais?"격실":"원통·원추 내부"} 상단 높이 ${fx(P.zf1,1)} m, 기둥 내부 ${fx(P.zf2,1)} m까지 채운다.`,
    `저판 하부 그라우팅 두께 ${fx(P.tg*1000,0)} mm. 허용지지력 ${fx(P.qa,0)} kPa는 가정값이며 지반조사 결과로 확인한다.`,
    rg.length?`보강 링 ${rg.length}개(${P.ringAuto==="1"?`자동 배치: 기둥 하단·벽체 접합부${cais?"·상판 접합부":""}`:"직접 입력"})는 강도 부재가 아니며 최소철근과 연결철근으로 저판·기둥·벽체에 일체화한다.`:`보강 링 없음.`,
    `터빈 ${T.name}: 하중 작용점(인터페이스) MSL+${T.ifz} m, 하중표 ${T.uls?(T.scaled?"축척 추정값(제작사 하중으로 교체 필요)":"제작사 값"):"없음(자중만 반영)"}.`,
    `상부 플랫폼·접안시설·J-tube·부속 강재는 이 도면에 표시하지 않는다.`,
  ];
  const cond=[
    `설계조위 ${dl(P.hwl)}, MSL ${dl(P.msl)}, 해저면 ${dl(P.sbDL)}, 저판 하면 ${dl(P.zbDL)}`,
    `설계파 H = ${fx(P.Hw,2)} m, T = ${fx(P.Tw,1)} s · 기준 풍속 ${fx(P.Uref,2)} m/s(${P.zref} m) · 조류 ${fx(P.Uc,2)} / ${fx(P.Uce,2)} m/s · 수평진도 kh = ${fx(P.kh,3)}`,
  ];
  const res=[
    `안정: 전도 ${ok(minO>=1)}(최소 여유 ${fx(minO,2)}), 활동 ${ok(minS>=1)}(${fx(minS,2)}), 지지력 ${ok(wQ.okQ)}(${wQ.id} ${fx(wQ.qcheck,0)} / ${fx(wQ.qa,0)} kPa), 유효 접지 ${ok(L.every(l=>l.okE))}`,
    `부재설계: ${M.ok?"O.K":"N.G — 부재설계 탭 확인"} · 고유진동수 ${R.freq&&R.freq.f?`${fx(R.freq.f,3)} Hz ${R.freq.ok===false?"N.G":"O.K"}`:"계산 안 함"}`,
  ];
  const qty=[["콘크리트",`${fx(R.Vc,1)} m³`,`${fx(R.Wc,0)} kN`],["속채움",`${fx(R.Vf,1)} m³`,`${fx(R.Wf,0)} kN`],["철근",`${fx(M.qty.tot/1000,1)} t`,`${fx(M.qty.perM3,0)} kg/m³`]];
  return {notes,cond,res,qty};
}
function genSheetPrims(R){
  const P=R.P;
  const sp=secPrims(R), [sx0,sz0,sx1,sz1]=sp.box;
  let sc=SCALES[SCALES.length-1]; for(const s of SCALES){ const k=s/1000; if((sx1-sx0)/k<=232&&(sz1-sz0)/k<=262){ sc=s; break; } }
  const k=sc/1000, W=420*k, H=297*k, o=[];
  o.push({t:"poly",L:"SHT",pts:[[0,0],[W,0],[W,H],[0,H]],w:k*.2}); o.push({t:"poly",L:"SHT",pts:[[10*k,10*k],[W-10*k,10*k],[W-10*k,H-10*k],[10*k,H-10*k]],w:k*.5});
  // 정면 단면도 (왼쪽)
  const dx=14*k-sx0, dz=H-22*k-sz1;
  const mono=sp.o.filter(p=>!(p.t==="poly"&&(p.L==="WATER"||p.L==="FILL"))).map(p=>p.t==="poly"&&p.L==="SOIL"?{t:"poly",open:1,L:"SHT",pts:p.pts.slice(1,-1),w:.12}:p);
  o.push(...mapPrims(mono,1,dx,dz));
  o.push({t:"text",L:"STX",x:14*k,z:H-15*k,h:3.4*k,s:`정면 단면도   S = 1 : ${sc}`});
  // 평면도 (오른쪽 위)
  const pp=planPrims(R), [px0,pz0,px1,pz1]=pp.box;
  let scP=SCALES[SCALES.length-1]; for(const s of SCALES){ if((px1-px0)/(s/1000)<=150&&(pz1-pz0)/(s/1000)<=92){ scP=s; break; } }
  const f=sc/scP, pcx=252*k-px0*f+ (150*k-(px1-px0)*f)/2, pcz=H-22*k-pz1*f;
  o.push(...mapPrims(pp.o,f,pcx,pcz).map(p=>({...p,h:p.h?p.h*f:p.h,w:p.w?p.w*f:p.w,r:p.t==="dot"?p.r*f:p.r})));
  o.push({t:"text",L:"STX",x:252*k,z:H-15*k,h:3.4*k,s:`평면도   S = 1 : ${scP}`});
  // 주기·설계 조건·검토 결과·수량
  const N=genNotes(R), x0=252*k, wmax=156*k; let z=pcz+pz0*f-6*k;
  const head=s=>{ o.push({t:"text",L:"STX",x:x0,z,h:3.0*k,s}); z-=5.0*k; };
  const para=(s,num)=>{ const h=2.3*k, lines=wrapTxt(s,h,wmax-(num?6*k:0)); lines.forEach((ln,i)=>{ if(i===0&&num) o.push({t:"text",L:"STX",x:x0,z,h,s:num}); o.push({t:"text",L:"STX",x:x0+(num?6*k:0),z,h,s:ln}); z-=3.7*k; }); z-=0.6*k; };
  head("주기"); N.notes.forEach((s,i)=>para(s,`${i+1}.`));
  z-=1.5*k; head("설계 조건"); N.cond.forEach(s=>para(s,"·"));
  z-=1.5*k; head("검토 결과 요약"); N.res.forEach(s=>para(s,"·"));
  // 수량표
  z-=1.0*k; const rh=5*k, cw=[40,58,58].map(v=>v*k); const tz0=z+rh*0.2;
  const hl=zz=>o.push({t:"line",L:"SHT",x1:x0,z1:zz,x2:x0+cw[0]+cw[1]+cw[2],z2:zz,w:k*.18});
  o.push({t:"text",L:"STX",x:x0,z:z+1.2*k,h:3.0*k,s:"주요 수량 (1기)"}); z-=1.5*k; const zt=z; hl(z);
  [["구분","수량","중량·단위량"],...N.qty].forEach(r=>{ let xx=x0; r.forEach((v,i)=>{ o.push({t:"text",L:"STX",x:xx+cw[i]/2,z:z-rh+1.5*k,h:2.3*k,s:v,anchor:"middle",num:i>0}); xx+=cw[i]; }); z-=rh; hl(z); });
  { let xx=x0; [0,...cw].forEach(c=>{ xx+=c; o.push({t:"line",L:"SHT",x1:xx,z1:zt,x2:xx,z2:z,w:k*.18}); }); }
  // 표제란
  const tx=250*k, ty=12*k, tw=158*k, thh=34*k;
  o.push({t:"poly",L:"SHT",pts:[[tx,ty],[tx+tw,ty],[tx+tw,ty+thh],[tx,ty+thh]],w:k*.4});
  [ty+12*k,ty+23*k].forEach(zz=>o.push({t:"line",L:"SHT",x1:tx,z1:zz,x2:tx+tw,z2:zz,w:k*.2}));
  o.push({t:"line",L:"SHT",x1:tx+40*k,z1:ty,x2:tx+40*k,z2:ty+thh,w:k*.2});
  const T=(x,zz,s,h)=>o.push({t:"text",L:"STX",x,z:zz,h:(h||2.6)*k,s});
  T(tx+2*k,ty+27*k,"공사명"); T(tx+42*k,ty+27*k,"해상풍력발전기 기초 — 중력식 "+(P.type==="caisson"?"케이슨형":"원추형"),3);
  T(tx+2*k,ty+16*k,"도면명"); T(tx+42*k,ty+16*k,"해상풍력발전기 기초 일반도 (중력식)",3.6);
  T(tx+2*k,ty+5*k,"축척"); T(tx+42*k,ty+5*k,`1 : ${sc} (단면도), 1 : ${scP} (평면도)    ${new Date().toLocaleDateString("ko-KR")}    ${baseName()}`,2.4);
  const over=z<ty+thh+3*k;
  // 빈 곳에 상세(보강 링·격벽) 넣기: A = 단면도 아래 왼쪽, B = 수량표 아래 오른쪽(표제란 위)
  const mks=detailMakers(R,false), secBot=(sz0+dz)/k, notesBot=z/k, regs=[];
  { const h=secBot-8-16; if(h>=40) regs.push({x:14,top:secBot-8,w:232,h}); }
  { const h=notesBot-6-(12+34+4); if(h>=40) regs.push({x:252,top:notesBot-6,w:156,h}); }
  let left=[...mks], dsc=[];
  regs.forEach(rg=>{ if(!left.length) return; const n=Math.min(left.length,Math.max(1,Math.floor(rg.w/40)));
    const asp=left.slice(0,n).map(m=>{ const c=m(0.5), [a,b,c2,d]=c.box; return Math.max(0.5,Math.min(2.5,(c2-a)/Math.max(0.1,d-b))); }), sa=asp.reduce((x,y)=>x+y,0);
    let x=rg.x; for(let i=0;i<n&&left.length;i++){ const cw=rg.w*asp[i]/sa; const sc2=placeCell(o,left[0],x,rg.top,cw-3,rg.h,k,2.0,2); if(sc2){ dsc.push(sc2); left.shift(); } else break; x+=cw; } });
  return {o,box:[0,0,W,H],sc,scP,bg:1,over,mono:1,dLeft:left.length,dN:mks.length};
}
function drawGenSheet(){ const pr=genSheetPrims(R); $("svgGen").innerHTML=primsSVG(pr,"일반도"); $("genNote").textContent=`A3 도면, 단면도 1:${pr.sc}, 평면도 1:${pr.scP}${pr.dN?` · 상세 ${pr.dN-pr.dLeft}/${pr.dN}개 포함`:""}${pr.dLeft?" (자리가 없어 나머지는 아래 상세도에)":""}${pr.over?" · 주기가 길어 표제란과 겹칩니다":""}`;
  $("genDBox").hidden=!pr.dLeft; }
/* ---------- 상세도 (보강 링 · 방사형 격벽): 일반 상세 / 배근 상세 A3 ---------- */
const DSCALES=[20,25,30,40,50,60,75,100,125,150,200,250,300,400,500];
/* 국부 창(x0~x1, z0~z1) 안에 들어오는 사각형만 잘라서 그림 */
function clipRect(o,x0,x1,z0,z1,ax0,ax1,az0,az1,L){ const a=Math.max(x0,ax0), b=Math.min(x1,ax1), c=Math.max(z0,az0), d=Math.min(z1,az1); if(b-a>1e-6&&d-c>1e-6) o.push({t:"poly",L:L||"CONC",pts:[[a,c],[b,c],[b,d],[a,d]]}); }
function dimH(o,xa,xb,z,th,txt){ o.push({t:"line",L:"DIM",x1:xa,z1:z,x2:xb,z2:z}); [xa,xb].forEach(x=>{ o.push({t:"line",L:"DIM",x1:x-th*.35,z1:z-th*.35,x2:x+th*.35,z2:z+th*.35}); }); o.push({t:"text",L:"DIM",x:(xa+xb)/2,z:z+th*.35,h:th,s:txt,anchor:"middle",num:1}); }
function dimV(o,za,zb,x,th,txt){ o.push({t:"line",L:"DIM",x1:x,z1:za,x2:x,z2:zb}); [za,zb].forEach(z=>{ o.push({t:"line",L:"DIM",x1:x-th*.35,z1:z-th*.35,x2:x+th*.35,z2:z+th*.35}); }); o.push({t:"text",L:"DIM",x:x-th*.3,z:(za+zb)/2,h:th,s:txt,rot:90,anchor:"middle",num:1}); }
const mm=v=>fx(v*1000,0);
/* 보강 링 상세 (반경 x, 높이 z, 저판 하면 기준) */
function ringCell(R,g,th,rebar){
  const P=R.P, cais=P.type==="caisson", tb=cais?P.cts:P.tb, S=R.S, cro=S.hex?S.hex.flats/2:R.rso, cri=S.hex?cro-P.hth:R.rsi;
  const Rw=cais?P.cDw/2:P.Dw/2, tw=cais?P.ctw:P.tw, Rwi=Rw-tw, zw1=cais?P.cH:P.tb+P.hw, up=(g.above||[]).length>0;
  const cv0=P.cov/1000, RG0=ringSupport(P,R), toSlab=ringToSlab(RG0,g,g.ri+cv0,cv0)||ringToSlab(RG0,g,g.ro-cv0,cv0);
  const pad=Math.max(1.0,g.t*1.5), x0=Math.max(0,g.ri-pad), x1=g.ro+pad, z0=(g.z<=tb+0.05||toSlab)?0:g.z-pad, z1=up?P.cH:g.z+g.h+pad, o=[];
  clipRect(o,x0,x1,z0,z1,0,R.Rbase,0,tb);
  clipRect(o,x0,x1,z0,z1,cri,cro,P.zc0,P.ztop);
  clipRect(o,x0,x1,z0,z1,Rwi,Rw,tb,zw1);
  if(cais) clipRect(o,x0,x1,z0,z1,cro,Rwi,P.cH-P.ctt,P.cH);
  ringSupport(P,R).forEach(q=>{ if(q.i!==g.i) clipRect(o,x0,x1,z0,z1,q.ri,q.ro,q.z,q.z+q.h); });
  o.push({t:"poly",L:"CONC",pts:[[g.ri,g.z],[g.ro,g.z],[g.ro,g.z+g.h],[g.ri,g.z+g.h]],w:th*.12});
  // 창 테두리 (끊음)
  o.push({t:"poly",L:"HID",pts:[[x0,z0],[x1,z0],[x1,z1],[x0,z1]]});
  // 치수: 링 두께·높이·하단 높이, 저판 두께, 옆 부재 두께
  const det=String.fromCharCode(65+g.i), sideM=g.side[0];
  const zDw=up?g.z-th*1.6:g.z+g.h+th*1.6;   // 상판에 매단 링은 폭 치수를 링 아래에
  dimH(o,g.ri,g.ro,zDw,th,mm(g.t));
  if(sideM){ const a=sideM.dir>0?sideM.r:sideM.r-sideM.tm, b2=a+sideM.tm; if(a>=x0-1e-6&&b2<=x1+1e-6) dimH(o,a,b2,zDw,th,mm(sideM.tm)); }
  dimV(o,g.z,g.z+g.h,x1+th*1.4,th,mm(g.h));
  if(g.z-tb>0.05&&z0<=tb+1e-6) dimV(o,tb,g.z,x1+th*1.4,th,mm(g.z-tb));
  if(z0<=1e-6) dimV(o,0,tb,x1+th*1.4,th,mm(tb));
  if(up) dimV(o,P.cH-P.ctt,P.cH,x1+th*1.4,th,mm(P.ctt));
  o.push({t:"text",L:"TXT",x:(g.ri+g.ro)/2,z:g.z+g.h/2,h:th*.9,s:g.no,anchor:"middle"});
  const lab=[`외경 Ø${mm(g.D)}, 두께 ${mm(g.t)}, 높이 ${mm(g.h)}`,`하단 z ${mm(g.z)} (저판 상면 ${g.z-tb>0.005?"+"+mm(g.z-tb):"위"})`,
    `${g.below.length?"아래 "+g.below.map(b=>b.nm).join("·"):""}${g.side.length?(g.below.length?" · ":"")+"옆 "+g.side.map(sd=>sd.nm).join("·"):""}${(g.above||[]).length?" · 위 상판":""}`];
  let xR=x1+th*2.4;
  if(rebar){ const D=R.M.qty.detail, cv=P.cov/1000, r1=D.rows.find(r=>r.mk===`G${g.i+1}1`); if(r1){ const d=BARS[r1.bar].d/1000, sp=r1.s/1000, la=Math.ceil(40*d*10)/10, rb=R.M.rb;
      const xi=g.ri+cv+d/2, xo=g.ro-cv-d/2, za=g.z+cv, zb2=g.z+g.h-cv, zBot=cv+2*BARS[rb.sB.bar].d/1000, zUp=P.cH-cv-2*BARS[distRB(P.ctt).bar].d/1000, RGs=ringSupport(P,R);
      const ln=(a,b,c,d2)=>o.push({t:"line",L:"RB",x1:a,z1:b,x2:c,z2:d2,w:th*.16});
      for(let z=za;z<=zb2+1e-6;z+=sp){ o.push({t:"dot",L:"RBD",x:xi+d,z,r:th*.22}); o.push({t:"dot",L:"RBD",x:xo-d,z,r:th*.22}); }
      const vb=[];
      [[xi,-1],[xo,1]].forEach(([x,sg])=>{ if(ringToSlab(RGs,g,x,cv)){ ln(x,zBot,x,zb2); ln(x,zBot,x+sg*la,zBot); vb.push({x,sg,kind:"down"}); } else if(up){ const hs=ringUpHook(g,sg); ln(x,za,x,zUp); ln(x,zUp,x+hs*la,zUp); vb.push({x,sg:hs,kind:"up"}); } else { ln(x,za,x,zb2); vb.push({x,sg,kind:"free"}); } });
      let dz0=null;
      g.side.forEach(sd=>{ const w=ringDowel(g,sd,la,cv), hk=Math.min(0.25,g.h/4), zz=ringDowelZ(g,cv,d); zz.forEach(z=>{ const xa=sd.r-sd.dir*w.eR, xb=sd.r+sd.dir*w.eM; ln(xa,z,xb,z);
          const hz=z-hk>=g.z+cv?z-hk:z+hk; if(w.eR<la-1e-6) ln(xa,z,xa,hz); if(w.eM<la-1e-6) ln(xb,z,xb,hz); });
        const zt=zz[zz.length-1], xa=sd.r-sd.dir*w.eR, xb=sd.r+sd.dir*w.eM;   // 맨 위 연결철근 위에 묻힘 길이
        dimH(o,Math.min(xa,sd.r),Math.max(xa,sd.r),zt+th*0.9,th*.85,mm(w.eR)); dimH(o,Math.min(xb,sd.r),Math.max(xb,sd.r),zt+th*0.9,th*.85,mm(w.eM));
        if(zz.length>1) dimV(o,zz[zz.length-2],zt,sd.r+sd.dir*(w.eM+th*0.9),th*.8,mm(zt-zz[zz.length-2]));
        dz0={x:(xa+xb)/2,z:zz[Math.floor(zz.length/2)]}; });
      // 피복 (위·옆)
      dimV(o,zb2,g.z+g.h,g.ri-th*1.0,th*.8,mm(cv)); dimH(o,g.ri,xi,g.z+g.h*0.35,th*.8,mm(xi-g.ri));
      // 연직철근 정착·갈고리
      vb.forEach(v=>{ if(v.kind==="down"){ if(g.z-zBot>0.05) dimV(o,zBot,g.z,v.x+v.sg*th*0.9,th*.8,mm(g.z-zBot)); dimH(o,Math.min(v.x,v.x+v.sg*la),Math.max(v.x,v.x+v.sg*la),zBot-th*1.2,th*.8,mm(la)); }
        else if(v.kind==="up"){ dimH(o,Math.min(v.x,v.x+v.sg*la),Math.max(v.x,v.x+v.sg*la),P.cH+th*0.9,th*.8,mm(la)); } });
      // 철근 기호 꼬리표 (오른쪽)
      const tags=[]; tags.push({mk:`G${g.i+1}1`,x:xo-d,z:za+sp*Math.max(0,Math.floor((zb2-za)/sp/2))});
      tags.push({mk:`G${g.i+1}2`,x:vb[1]?vb[1].x:xo,z:g.z+g.h*0.25}); if(dz0) tags.push({mk:`G${g.i+1}3`,...dz0});
      tags.sort((a,b)=>b.z-a.z).forEach((t,i)=>{ const tx=x1+th*3.6, tz=g.z+g.h-(i+0.5)*Math.max(th*2.2,g.h/3.2); o.push({t:"line",L:"DIM",x1:t.x,z1:t.z,x2:tx-th*0.4,z2:tz}); o.push({t:"circle",L:"DIM",x:tx+th*0.9,z:tz,r:th*1.0}); o.push({t:"text",L:"DIM",x:tx+th*0.9,z:tz-th*0.32,h:th*.7,s:t.mk,anchor:"middle"}); });
      xR=x1+th*5.6;
      lab.length=0; D.rows.filter(r=>r.mk.startsWith(`G${g.i+1}`)).forEach(r=>lab.push(`${r.mk} ${r.bar}@${r.s} ${r.face}`)); } }
  return {o,box:[x0,z0-(rebar?th*2.5:0),xR,z1+th*4],lab,title:`상세 ${det} — 보강 링 ${g.no}${rebar?" 배근":""}${g.auto?` (${g.auto})`:""}`};
}
/* 방사형 격벽 접합부 배근 상세 (배근 상세도): kind = col(기둥, 평면) / wall(외벽, 평면) / slab(하부 슬래브·상판, 격벽 직각 단면) */
function wallJointCell(R,th,kind,det){
  const P=R.P, D=R.M.qty.detail, r1=D.rows.find(r=>r.mk==="R1"), r2=D.rows.find(r=>r.mk==="R2"), o=[], cv=P.cov/1000, rb=R.M.rb;
  const d=BARS[r1.bar].d/1000, sp1=r1.s/1000, sp2=r2.s/1000, la=Math.ceil(40*d*10)/10, hk=Math.max(0.15,Math.ceil(12*d*20)/20), tw=P.ctr, tc=R.rso-R.rsi;
  const ln=(a,b,c,d2)=>o.push({t:"line",L:"RB",x1:a,z1:b,x2:c,z2:d2,w:th*.16}), dot=(x,z)=>o.push({t:"dot",L:"RBD",x,z,r:th*.22});
  const ol=pts=>o.push({t:"poly",open:1,L:"SHT",pts:[...pts,pts[0]],w:th*.09}), brk=(xa,za,xb,zb)=>{ const mx=(xa+xb)/2, mz=(za+zb)/2, e=th*.5, vx=xb-xa, vz=zb-za, L=Math.hypot(vx,vz), nx=-vz/L*e, nz=vx/L*e;
    o.push({t:"poly",open:1,L:"SHT",w:th*.06,pts:[[xa-vx*.08,za-vz*.08],[mx-vx*.06,mz-vz*.06],[mx+nx,mz+nz],[mx-nx,mz-nz],[mx+vx*.06,mz+vz*.06],[xb+vx*.08,zb+vz*.08]]}); };
  const tags=[], lab=[`R1 ${r1.bar}@${r1.s} 수평 배력 (양면)`,`R2 ${r2.bar}@${r2.s} 연직 배력 (양면)`];
  const fy=tw/2-cv-d/2, fy2=tw/2-cv-d*1.5;   // 면에서 R1 중심, R2 중심 (R1 바깥)
  let box, title;
  if(kind==="col"||kind==="wall"){ // 평면: x = 반경 방향(접합 면 x=0), z = 격벽 두께 방향
    const isC=kind==="col", tm=isC?tc:P.ctw, sg=isC?-1:1, Lw=2.2, Hm=Math.max(1.6,tw*2.5), e=Math.min(la,tm-cv), hook=e<la-1e-6;
    const mx0=sg<0?-tm:0, mx1=sg<0?0:tm, wx0=sg<0?0:-Lw, wx1=sg<0?Lw:0;
    o.push({t:"poly",L:"CONC",pts:[[wx0,-tw/2],[wx1,-tw/2],[wx1,tw/2],[wx0,tw/2]],w:th*.05});
    ol([[mx0,-Hm],[mx1,-Hm],[mx1,Hm],[mx0,Hm]]);
    brk(mx0,Hm,mx1,Hm); brk(mx0,-Hm,mx1,-Hm); brk(sg<0?wx1:wx0,-tw/2,sg<0?wx1:wx0,tw/2);
    const xc=sg*e, xf=sg<0?wx1:wx0;
    [-1,1].forEach(f=>{ ln(xf,f*fy,xc,f*fy); if(hook) ln(xc,f*fy,xc,f*(fy+hk)); });
    for(let x=sg<0?cv:-cv;Math.abs(x)<=Lw-0.05;x+=-sg*sp2){ dot(x,fy2); dot(x,-fy2); }
    // 치수
    dimH(o,mx0,mx1,Hm+th*1.2,th,mm(tm)); dimV(o,-tw/2,tw/2,xf-sg*th*1.6,th,mm(tw));
    dimH(o,Math.min(0,xc),Math.max(0,xc),fy+th*0.9,th*.8,mm(e)); if(hook) dimV(o,fy,fy+hk,xc+sg*th*0.9,th*.8,mm(hk));
    dimV(o,fy+d/2,tw/2,(sg<0?0.35:-0.35),th*.75,mm(cv));
    const xa=sg<0?cv:-cv; dimH(o,Math.min(xa,xa-sg*sp2),Math.max(xa,xa-sg*sp2),-tw/2-th*1.0,th*.8,mm(sp2));
    o.push({t:"text",L:"TXT",x:(mx0+mx1)/2,z:-Hm*0.55,h:th*.85,s:isC?"기둥":"외벽",anchor:"middle"}); o.push({t:"text",L:"TXT",x:(wx0+wx1)/2,z:-tw/2-th*2.6,h:th*.85,s:"격벽",anchor:"middle"});
    tags.push({mk:"R1",x:-sg*0.6*Lw,z:fy}); tags.push({mk:"R2",x:sg>0?-(cv+sp2*2):cv+sp2*2,z:-fy2});
    lab.push(`R1 ${isC?"기둥":"외벽"} 안 정착 ${mm(e)} (40d = ${mm(la)}${hook?`, 두께 부족 → 끝 90° 갈고리 ${mm(hk)} (12d 이상)`:""})`);
    const xs=[mx0,mx1,wx0,wx1]; box=[Math.min(...xs)-th*2.2,-Hm-th*1.5,Math.max(...xs)+th*(sg<0?6.5:2.5),Hm+th*2.6];
    title=`상세 ${det} — 격벽·${isC?"기둥":"외벽"} 접합부 (평면)`;
  } else { // 격벽 직각 단면: x = 두께 방향, z = 높이(하부 슬래브 상면 0), 가운데 생략
    const h=P.cH-P.ctt-P.cts, show=1.4, gap=0.8, cmp=h>2*show+gap+0.2, Z=z=>!cmp||z<=show?z:z-(h-2*show-gap), hT=Z(h), Wm=Math.max(1.6,tw*2.6);
    const dS=BARS[rb.sB.bar].d/1000, dT=BARS[distRB(P.ctt).bar].d/1000, eb=Math.min(la,P.cts-cv-2*dS), et=Math.min(la,P.ctt-cv-2*dT), hb=eb<la-1e-6, ht=et<la-1e-6;
    o.push({t:"poly",L:"CONC",pts:[[-tw/2,0],[tw/2,0],[tw/2,Z(show)],[-tw/2,Z(show)]],w:th*.05});
    if(cmp) o.push({t:"poly",L:"CONC",pts:[[-tw/2,Z(h-show)],[tw/2,Z(h-show)],[tw/2,hT],[-tw/2,hT]],w:th*.05});
    ol([[-Wm,-P.cts],[Wm,-P.cts],[Wm,0],[-Wm,0]]); ol([[-Wm,hT],[Wm,hT],[Wm,hT+P.ctt],[-Wm,hT+P.ctt]]);
    [[-P.cts,0],[hT,hT+P.ctt]].forEach(([a,b])=>{ brk(-Wm,a,-Wm,b); brk(Wm,a,Wm,b); });
    if(cmp){ brk(-tw/2,Z(show),tw/2,Z(show)); brk(-tw/2,Z(h-show),tw/2,Z(h-show)); }
    [-1,1].forEach(f=>{ const x=f*fy; ln(x,-eb,x,Z(show)); if(hb) ln(x,-eb,x+f*hk,-eb); if(cmp){ ln(x,Z(h-show),x,hT+et); } else ln(x,Z(show),x,hT+et); if(ht) ln(x,hT+et,x+f*hk,hT+et); });
    for(let z=cv;z<=h-cv+1e-6;z+=sp1){ if(cmp&&z>show-0.05&&z<h-show+0.05) continue; dot(fy2,Z(z)); dot(-fy2,Z(z)); }
    dimV(o,-P.cts,0,Wm+th*1.4,th,mm(P.cts)); dimV(o,hT,hT+P.ctt,Wm+th*1.4,th,mm(P.ctt)); dimV(o,0,hT,Wm+th*1.4,th,mm(h)+(cmp?" (중간 생략)":""));
    dimH(o,-tw/2,tw/2,hT+P.ctt+th*1.2,th,mm(tw));
    dimV(o,-eb,0,-fy-th*1.0,th*.8,mm(eb)); dimV(o,hT,hT+et,-fy-th*1.0,th*.8,mm(et));
    if(hb) dimH(o,fy,fy+hk,-eb-th*1.0,th*.8,mm(hk)); if(ht) dimH(o,fy,fy+hk,hT+et+th*0.5,th*.8,mm(hk));
    dimV(o,cv,cv+sp1,-tw/2-th*1.0,th*.8,mm(sp1)); dimH(o,-tw/2,-tw/2+cv,Z(show)*0.6,th*.75,mm(cv));
    o.push({t:"text",L:"TXT",x:-Wm*0.62,z:-P.cts*0.6,h:th*.85,s:"하부 슬래브",anchor:"middle"}); o.push({t:"text",L:"TXT",x:-Wm*0.62,z:hT+P.ctt*0.3,h:th*.85,s:"상판",anchor:"middle"});
    tags.push({mk:"R2",x:fy,z:Z(show)*0.7}); tags.push({mk:"R1",x:fy2,z:Z(cv+sp1*Math.max(1,Math.floor((show-cv)/sp1)))});
    lab.push(`R2 하부 슬래브 정착 ${mm(eb)}${hb?` + 갈고리 ${mm(hk)}`:""}, 상판 정착 ${mm(et)}${ht?` + 갈고리 ${mm(hk)}`:""} (40d = ${mm(la)}, 슬래브 철근 안쪽까지)`);
    box=[-Wm-th*1.5,-P.cts-th*1.6,Wm+th*6.5,hT+P.ctt+th*2.8]; title=`상세 ${det} — 격벽·슬래브 접합부 (직각 단면)`;
  }
  // 철근 번호 원표시 (오른쪽)
  const tx=box[2]-th*2.4; tags.sort((a,b)=>b.z-a.z).forEach((t,i)=>{ const tz=box[3]-th*3.5-i*th*2.6; o.push({t:"line",L:"DIM",x1:t.x,z1:t.z,x2:tx-th*0.1,z2:tz,w:th*.04}); o.push({t:"dot",L:"DIM",x:t.x,z:t.z,r:th*.18}); o.push({t:"circle",L:"DIM",x:tx+th*0.9,z:tz,r:th*1.0}); o.push({t:"text",L:"DIM",x:tx+th*0.9,z:tz-th*0.32,h:th*.7,s:t.mk,anchor:"middle"}); });
  return {o,box,lab,title};
}
/* 방사형 격벽 평면 (케이슨): 격벽 두 개 사이 한 칸 */
function wallPlanCell(R,th){
  const P=R.P, n=Math.round(P.cnr), ph=PI/n, cro=R.S.hex?R.S.hex.flats/2:R.rso, Rw=P.cDw/2, Rwi=Rw-P.ctw, o=[], a0=-1.5*ph, a1=1.5*ph;
  const arc=(r,L)=>{ const pts=[]; for(let i=0;i<=40;i++){ const a=a0+(a1-a0)*i/40; pts.push([r*Math.cos(a),r*Math.sin(a)]); } o.push({t:"poly",open:1,L:L||"LINE",pts,w:th*.12}); };
  arc(cro); arc(cro-(R.rso-R.rsi),"HID"); arc(Rwi); arc(Rw);
  [-ph,ph].forEach(a=>{ const c=Math.cos(a),sn=Math.sin(a),nx=-sn*P.ctr/2,nz=c*P.ctr/2; o.push({t:"poly",L:"CONC",pts:[[cro*c+nx,cro*sn+nz],[Rwi*c+nx,Rwi*sn+nz],[Rwi*c-nx,Rwi*sn-nz],[cro*c-nx,cro*sn-nz]]}); });
  const Lr=Rwi-cro, La=2*PI*Rwi/n;
  o.push({t:"text",L:"DIM",x:cro+th,z:th*0.4,h:th,s:`θ = 360°/${n} = ${fx(360/n,1)}°`,num:1});
  o.push({t:"text",L:"DIM",x:(cro+Rwi)/2*Math.cos(ph),z:(cro+Rwi)/2*Math.sin(ph)+th*1.2,h:th,s:`격벽 두께 ${mm(P.ctr)}`,anchor:"middle",num:1});
  const ys=[a0,a1].map(a=>Rw*Math.sin(a)); 
    { const a=ph, c=Math.cos(a), sn=Math.sin(a), e=th*1.6; o.push({t:"line",L:"CEN",x1:(cro-e)*c,z1:(cro-e)*sn,x2:(Rw+e)*c,z2:(Rw+e)*sn}); [[cro-e*1.6,"A"],[Rw+e*1.6,"A"]].forEach(([r,t])=>o.push({t:"text",L:"TXT",x:r*c,z:r*sn-th*.35,h:th,s:t,anchor:"middle"})); }
  const det=String.fromCharCode(65+ringList(P).length);
  return {o,box:[cro*Math.cos(a1)-th*3,Math.min(...ys)-th*2,Rw+th*3,Math.max(...ys)+th*2],lab:[`방사형 격벽 ${n}개, 두께 ${mm(P.ctr)}, 격실 길이 ${mm(Lr)}, 외벽 쪽 간격 ${mm(La)} · 격벽을 따라 자른 단면이 A-A`],title:`상세 ${det} — 방사형 격벽 평면`};
}
/* 방사형 격벽 단면 (격벽을 따라 자른 A-A) */
/* 다각형을 사각형(x0..x1, z0..z1)으로 자름 (Sutherland–Hodgman) */
function clipPoly(pts,x0,x1,z0,z1){ let out=pts; const edge=(inside,cut)=>{ const res=[]; for(let i=0;i<out.length;i++){ const A=out[i], B=out[(i+1)%out.length], ia=inside(A), ib=inside(B); if(ia) res.push(A); if(ia!==ib) res.push(cut(A,B)); } out=res; };
  const cx=(A,B,x)=>[x,A[1]+(B[1]-A[1])*(x-A[0])/(B[0]-A[0])], cz=(A,B,z)=>[A[0]+(B[0]-A[0])*(z-A[1])/(B[1]-A[1]),z];
  edge(q=>q[0]>=x0,(A,B)=>cx(A,B,x0)); if(out.length) edge(q=>q[0]<=x1,(A,B)=>cx(A,B,x1)); if(out.length) edge(q=>q[1]>=z0,(A,B)=>cz(A,B,z0)); if(out.length) edge(q=>q[1]<=z1,(A,B)=>cz(A,B,z1)); return out; }
function wallSecCell(R,th,rebar,bg){
  const P=R.P, cro=R.S.hex?R.S.hex.flats/2:R.rso, cri=R.S.hex?cro-P.hth:R.rsi, Rw=P.cDw/2, Rwi=Rw-P.ctw, o=[], x0=rebar?0:Math.max(0,cri-0.8), x1=Math.max(Rw+0.8,R.Rbase), z0=0, z1=P.cH+0.8; // 오른쪽은 하부 슬래브 끝까지
  if(!bg) { clipRect(o,x0,x1,z0,z1,0,R.Rbase,0,P.cts); clipRect(o,x0,x1,z0,z1,cri,cro,P.zc0,P.ztop); clipRect(o,x0,x1,z0,z1,Rwi,Rw,P.cts,P.cH); clipRect(o,x0,x1,z0,z1,cro,Rwi,P.cH-P.ctt,P.cH); }
  if(!bg) o.push({t:"poly",L:"CONC",pts:[[cro,P.cts],[Rwi,P.cts],[Rwi,P.cH-P.ctt],[cro,P.cH-P.ctt]],w:th*.12});
  else { // 격벽만 채움, 보강 링과 겹치는 부분은 공제(높이 구간으로 나눠 링 폭을 뺀 띠로 채움)
    const h0=P.cts, h1=P.cH-P.ctt, rg=(P.rings||[]).filter(r=>r.D>0&&r.t>0&&r.h>0), zs=[...new Set([h0,h1,...rg.flatMap(r=>[r.z,r.z+r.h]).filter(z=>z>h0&&z<h1)])].sort((a,b)=>a-b);
    for(let i=0;i<zs.length-1;i++){ const za=zs[i], zb=zs[i+1], zm=(za+zb)/2; let segs=[[cro,Rwi]];
      rg.filter(r=>zm>r.z&&zm<r.z+r.h).forEach(r=>{ const a=r.D/2-r.t, b=r.D/2; segs=segs.flatMap(([u,v])=>b<=u||a>=v?[[u,v]]:[[u,a],[b,v]].filter(([p,q])=>q-p>1e-6)); });
      segs.forEach(([u,v])=>o.push({t:"poly",L:"CFIL",pts:[[u,za],[v,za],[v,zb],[u,zb]]})); } }
  if(!bg) o.push({t:"poly",L:"HID",pts:[[x0,z0],[x1,z0],[x1,z1],[x0,z1]]});
  else { // 위 배근 상세처럼: 테두리 없이, 중심선과 기둥 상단 끊음 표시
    o.push({t:"line",L:"CEN",x1:0,z1:-0.6,x2:0,z2:z1+0.6});
    const bk=cro-cri; o.push({t:"poly",open:1,L:"SHT",w:.05,pts:[[cri-bk*.3,z1],[cri+bk*.3,z1],[cri+bk*.45,z1+bk*.25],[cri+bk*.55,z1-bk*.25],[cri+bk*.7,z1],[cro+bk*.3,z1]]}); }
  if(x0>1e-6){ const e=Math.min(0.25,P.cts*0.25), zm=P.cts/2, bl=[[x0,-e],[x0,zm-e],[x0-e,zm-e*0.3],[x0+e,zm+e*0.3],[x0,zm+e],[x0,P.cts+e]]; // 파단선(왼쪽은 잘라서 그림)
    for(let i=1;i<bl.length;i++) o.push({t:"line",L:"CONC",x1:bl[i-1][0],z1:bl[i-1][1],x2:bl[i][0],z2:bl[i][1],w:th*.08}); }
  dimH(o,cro,Rwi,-th*1.8,th,mm(Rwi-cro)); dimV(o,P.cts,P.cH-P.ctt,x1+th*1.4,th,mm(P.cH-P.ctt-P.cts)); dimV(o,0,P.cts,x1+th*1.4,th,mm(P.cts)); dimV(o,P.cH-P.ctt,P.cH,x1+th*1.4,th,mm(P.ctt));
  o.push({t:"text",L:"TXT",x:(cro+Rwi)/2,z:(P.cts+P.cH-P.ctt)/2,h:th,s:"격벽",anchor:"middle"});
  let lab=[`높이 ${mm(P.cH-P.ctt-P.cts)} (하부 슬래브 위 ~ 상판 아래)`,`길이 ${mm(Rwi-cro)} (기둥 외면 ~ 외벽 내면)`];
  if(rebar){ const D=R.M.qty.detail, r1=D.rows.find(r=>r.mk==="R1"); if(r1){ const cv=P.cov/1000, d=BARS[r1.bar].d/1000, sp=r1.s/1000, la=Math.ceil(40*d*10)/10;
      const ln=(a,b,c,d2)=>o.push({t:"line",L:"RB",x1:a,z1:b,x2:c,z2:d2,w:th*.14});
      for(let z=P.cts+cv;z<=P.cH-P.ctt-cv+1e-6;z+=sp) ln(cro-Math.min(la,cro-cri-cv),z,Rwi+Math.min(la,P.ctw-cv),z);
      for(let x=cro+cv;x<=Rwi-cv+1e-6;x+=sp) ln(x,P.cts-Math.min(la,P.cts-cv),x,P.cH-P.ctt+Math.min(la,P.ctt-cv));
      // 철근 번호(원표시): R1 수평, R2 연직 — 오른쪽 치수선 밖으로 인출
      { const zs=[], xs=[]; for(let z=P.cts+cv;z<=P.cH-P.ctt-cv+1e-6;z+=sp) zs.push(z); for(let x=cro+cv;x<=Rwi-cv+1e-6;x+=sp) xs.push(x);
        const h=P.cH-P.ctt-P.cts, tx=x1+th*4.2, tg=[{mk:"R1",x:cro+(Rwi-cro)*0.62,z:zs[Math.floor(zs.length*0.7)]||P.cts+h*0.7,tz:P.cts+h*0.62},{mk:"R2",x:xs[Math.floor(xs.length*0.88)]||Rwi-0.5,z:P.cts+h*0.3,tz:P.cts+h*0.38}];
        tg.forEach(t=>{ o.push({t:"line",L:"DIM",x1:t.x,z1:t.z,x2:tx-th*0.1,z2:t.tz,w:th*.04}); o.push({t:"dot",L:"DIM",x:t.x,z:t.z,r:th*.18}); o.push({t:"circle",L:"DIM",x:tx+th*0.9,z:t.tz,r:th*1.0,w:th*.05}); o.push({t:"text",L:"DIM",x:tx+th*0.9,z:t.tz-th*0.32,h:th*.7,s:t.mk,anchor:"middle"}); }); }
      lab=D.rows.filter(r=>/^R/.test(r.mk)).map(r=>`${r.mk} ${r.bar}@${r.s} ${r.face}`).concat([`정착: 하부 슬래브·상판·기둥·외벽에 40d(부재 두께 이내)`]); } }
  if(bg){ const ol=[]; bg.forEach(p=>{ const q=clipPoly(p.pts,x0,x1,z0,z1); if(q.length<3) return; const cut=q.findIndex((v,j)=>Math.abs(v[1]-z1)<1e-9&&Math.abs(q[(j+1)%q.length][1]-z1)<1e-9); const W=.07; if(cut<0) ol.push({t:"poly",open:1,L:"SHT",pts:[...q,q[0]],w:W}); else ol.push({t:"poly",open:1,L:"SHT",pts:[...q.slice(cut+1),...q.slice(0,cut+1)],w:W}); }); o.unshift(...ol.slice(0,0)); const iF=o.reduce((m,p,i)=>p.t==="poly"&&p.L==="CFIL"?i:m,-1); o.splice(iF+1,0,...ol); } // 배근도: 위 상세와 같은 단면 외곽선(채움 없음)을 격벽 채움 위에, 철근은 그 위에
  return {o,box:[x0,-th*3,x1+th*(rebar?6.5:2.4),z1],lab,title:`단면 A-A — 방사형 격벽${rebar?" 배근":""}`};
}
/* 상세 그림 한 칸 배치: 칸(sx, sz 위끝, sw×sh, 종이 mm) 안에 맞는 가장 큰 축척으로. 넣었으면 축척, 못 넣으면 0 */
function placeCell(o,mk,sx,sz,sw,sh,sheetK,tmm,maxLab,fixSc){
  const fit=cl=>Math.min(cl.lab.length,maxLab);
  let sc=0, cell=null; if(fixSc){ sc=fixSc; cell=mk(tmm*fixSc/1000); } else for(const s2 of DSCALES){ const k=s2/1000, cl=mk(tmm*k), [a,b,c2,d]=cl.box; if((c2-a)/k<=sw-4&&(d-b)/k<=sh-8-fit(cl)*tmm*1.6-tmm*3.2){ sc=s2; cell=cl; break; } }
  if(!cell) return 0;
  const k=sc/1000, f=sheetK/k, [a]=cell.box, dx=sx*sheetK-a*f+2*sheetK, dz=(sz-tmm*3.9)*sheetK-cell.box[3]*f;
  o.push(...mapPrims(cell.o,f,dx,dz).map(p=>({...p,h:p.h?p.h*f:p.h,w:p.w?p.w*f:p.w,r:p.t==="dot"?p.r*f:p.r})));
  (()=>{ const h=tmm*1.2*sheetK, mw=(sw-2)*sheetK, L=wrapTxt(cell.title,h,mw), tail=`S = 1 : ${sc}`, last=L[L.length-1]; if(wrapTxt(`${last}  ${tail}`,h,mw).length===1) L[L.length-1]=`${last}  ${tail}`; else L.push(tail); return L; })().slice(0,3).forEach((ln,i)=>o.push({t:"text",L:"STX",x:sx*sheetK,z:(sz-tmm*0.9-i*tmm*1.5)*sheetK,h:tmm*1.2*sheetK,s:ln}));
  let zl=(cell.box[1]*f+dz)-tmm*1.8*sheetK; cell.lab.slice(0,maxLab).forEach(t=>{ wrapTxt(t,tmm*sheetK,(sw-4)*sheetK).forEach(ln=>{ o.push({t:"text",L:"STX",x:sx*sheetK+1*sheetK,z:zl,h:tmm*sheetK,s:ln}); zl-=tmm*1.55*sheetK; }); });
  return sc;
}
function detailMakers(R,rebar){ const P=R.P, cais=P.type==="caisson", rg=ringSupport(P,R).map(g=>({...g,no:String.fromCharCode(0x2460+Math.min(g.i,19))}));
  const m=rg.map(g=>th=>ringCell(R,g,th,rebar)); if(cais&&P.cnr>=2&&!rebar){ m.push(th=>wallPlanCell(R,th)); m.push(th=>wallSecCell(R,th,false)); }
  if(cais&&P.cnr>=2&&rebar&&R.M.qty.detail.rows.some(r=>r.mk==="R1")){ const b=rg.length+1; ["col","wall","slab"].forEach((kd,j)=>m.push(th=>wallJointCell(R,th,kd,String.fromCharCode(65+b+j)))); } return m; }
/* 철근 가공도 한 칸 (종이 mm 기준, 모양은 축척 없이 그림) */
function bbsCell(o,r,x,z,w,h,K){ const T=(xx,zz,t,hh,an)=>o.push({t:"text",L:"STX",x:xx*K,z:zz*K,h:(hh||2)*K,s:t,anchor:an,num:1}), RB=(a,b,c,d)=>o.push({t:"line",L:"RB",x1:a*K,z1:b*K,x2:c*K,z2:d*K,w:.35*K});
  const sg=r.seg||{type:r.shape==="O"?"O":"I",a:r.L}, m=v=>fx(v*1000,0);
  o.push({t:"poly",L:"SHT",pts:[[x*K,z*K],[(x+w)*K,z*K],[(x+w)*K,(z+h)*K],[x*K,(z+h)*K]],w:.15*K});
  T(x+1.5,z+h-3.6,`${r.mk}  ${r.bar}  ${r.face.replace(/\s*\(.*$/,"")}`,2.1);
  const cx=x+w/2, cz=z+h/2-2.5;
  if(sg.type==="O"){ o.push({t:"circle",L:"RB",x:cx*K,z:cz*K,r:6*K,w:.35*K}); T(cx,cz-1,`Ø${m(sg.D)}`,2,"middle"); T(cx+8,cz+3,`겹침 ${m(sg.lap)}`,1.8); }
  else if(sg.type==="L"){ const vx=cx-8, top=cz+7, bot=cz-6; if(sg.up){ RB(vx,bot,vx,top); RB(vx,top,vx+9,top); T(vx-1,(top+bot)/2,m(sg.a),2,"end"); T(vx+4.5,top+1,m(sg.b),1.9,"middle"); }
    else { RB(vx,top,vx,bot); RB(vx,bot,vx+9,bot); T(vx-1,(top+bot)/2,m(sg.a),2,"end"); T(vx+4.5,bot-3,m(sg.b),1.9,"middle"); } }
  else if(sg.type==="D"){ const xa=cx-14, xb=cx+14, zz=cz+2; RB(xa,zz,xb,zz); if(sg.hR) RB(xa,zz,xa,zz-4); if(sg.hM) RB(xb,zz,xb,zz-4);
    const xm=xa+(xb-xa)*sg.eR/sg.a; o.push({t:"line",L:"DIM",x1:xm*K,z1:(zz+2)*K,x2:xm*K,z2:(zz-2)*K}); T((xa+xm)/2,zz+1,m(sg.eR),1.8,"middle"); T((xm+xb)/2,zz+1,m(sg.eM),1.8,"middle"); if(sg.hR||sg.hM) T(cx,zz-6,`갈고리 ${m(sg.hk)}`,1.7,"middle"); }
  else { RB(cx-14,cz+1,cx+14,cz+1); T(cx,cz+2.2,m(sg.a),2,"middle"); }
  T(x+1.5,z+1.6,`L = ${m(r.L)}  ·  ${fx(r.n,0)}개  ·  ${fx(r.kg/1000,2)} t`,1.9);
}
function bbsBlock(o,R,x,ztop,w,h,K){ const rows=R.M.qty.detail.rows.filter(r=>/^G\d|^R\d/.test(r.mk));
  o.push({t:"text",L:"STX",x:x*K,z:(ztop-1)*K,h:3*K,s:"철근 가공도 (보강 링·방사형 격벽)  — 모양은 축척 없음, 치수 mm"});
  if(!rows.length) return; const cols=Math.max(1,Math.floor(w/56)), cw=w/cols, rh=Math.min(28,(h-6)/Math.ceil(rows.length/cols));
  rows.forEach((r,i)=>{ const c=i%cols, rr=Math.floor(i/cols); bbsCell(o,r,x+c*cw,ztop-6-(rr+1)*rh,cw-1.5,rh-1.5,K); });
}
function detailSheetPrims(R,rebar,skip){
  const P=R.P, cais=P.type==="caisson", makers=detailMakers(R,rebar).slice(skip||0);
  const Wp=420, Hp=297, o=[], cols=rebar?Math.min(6,Math.max(3,makers.length)):3, rows=Math.max(1,Math.ceil(makers.length/cols)), sw=(Wp-28)/cols;
  const nB=rebar?R.M.qty.detail.rows.filter(r=>/^G\d|^R\d/.test(r.mk)).length:0, bbsH=rebar?Math.min(150,8+Math.ceil(nB/4)*28):0, sh=rebar?(makers.length?95:0):(Hp-22-52)/Math.min(2,rows)-4;
  // 도면 좌표는 종이 mm(×0.001 m)로 두고 상세마다 축척을 따로 씀
  const sheetK=0.4; const W=Wp*sheetK, H=Hp*sheetK;  // 종이 1 mm = 0.4 (선 굵기 기본값이 1:400 도면과 같게)
  o.push({t:"poly",L:"SHT",pts:[[0,0],[W,0],[W,H],[0,H]],w:.2*sheetK}); o.push({t:"poly",L:"SHT",pts:[[10*sheetK,10*sheetK],[W-10*sheetK,10*sheetK],[W-10*sheetK,H-10*sheetK],[10*sheetK,H-10*sheetK]],w:.5*sheetK});
  const scs=[];
  makers.slice(0,6).forEach((mk,i)=>{ const c=i%cols, r=Math.floor(i/cols), sc2=placeCell(o,mk,14+c*sw,Hp-16-r*(sh+4),sw-4,sh,sheetK,2.2,4,rebar?80:0); if(sc2) scs.push(sc2); });
  if(!makers.length) o.push({t:"text",L:"STX",x:20*sheetK,z:(Hp-24)*sheetK,h:4*sheetK,s:rebar?"보강 링이 없어 링 배근 상세가 없습니다.":"보강 링·격벽이 없어 상세가 없습니다."});
  if(rebar){ const used=makers.length?Math.min(2,rows)*(sh+4):14, top=Math.min(Hp-16-used-4, 12+bbsH); if(nB) bbsBlock(o,R,14,top,232,top-20,sheetK);
    const tb=rbTable(R,sheetK,252*sheetK,(Hp-16-used-8)*sheetK,158,(12+34+4)*sheetK); o.push(...tb.o); }
  // 표제란
  const tx=250*sheetK, ty=12*sheetK, tw=158*sheetK, thh=34*sheetK;
  o.push({t:"poly",L:"SHT",pts:[[tx,ty],[tx+tw,ty],[tx+tw,ty+thh],[tx,ty+thh]],w:.4*sheetK});
  [ty+12*sheetK,ty+23*sheetK].forEach(zz=>o.push({t:"line",L:"SHT",x1:tx,z1:zz,x2:tx+tw,z2:zz,w:.2*sheetK}));
  o.push({t:"line",L:"SHT",x1:tx+40*sheetK,z1:ty,x2:tx+40*sheetK,z2:ty+thh,w:.2*sheetK});
  const T=(x,zz,s2,h)=>o.push({t:"text",L:"STX",x,z:zz,h:(h||2.6)*sheetK,s:s2});
  T(tx+2*sheetK,ty+27*sheetK,"공사명"); T(tx+42*sheetK,ty+27*sheetK,"해상풍력발전기 기초 — 중력식 "+(cais?"케이슨형":"원추형"),3);
  T(tx+2*sheetK,ty+16*sheetK,"도면명"); T(tx+42*sheetK,ty+16*sheetK,`해상풍력발전기 기초 ${rebar?"배근 상세도":"상세도"} (보강 링${cais?"·격벽":""})`,3.4);
  T(tx+2*sheetK,ty+5*sheetK,"축척"); T(tx+42*sheetK,ty+5*sheetK,`상세별 표기 (1 : ${[...new Set(scs)].join(", 1 : ")})    ${new Date().toLocaleDateString("ko-KR")}    ${baseName()}`,2.4);
  T(14*sheetK,14*sheetK,rebar?"치수 mm. 철근 규격·간격·수량은 이 도면의 철근재료표 참조. 보강 링 연직철근은 저판 하부철근(또는 상판 상부철근)까지 이어 갈고리로 건다.":"치수 mm, 높이는 저판 하면 기준. 보강 링 위치·크기는 가정값(자동 배치 또는 직접 입력).",2.2);
  return {o,box:[0,0,W,H],bg:1,mono:rebar?0:1,sc:scs[0]||0,n:makers.length};
}
function drawDetailSheets(which){
  if(which!=="rb"&&!$("genDBox").hidden){ const g0=genSheetPrims(R), a=detailSheetPrims(R,false,g0.dN-g0.dLeft); $("svgGenD").innerHTML=primsSVG(a,"상세도"); $("genDNote").textContent=`A3 상세도 ${a.n}개`; }
  if(which!=="gen"){ const b=detailSheetPrims(R,true); $("svgRbD").innerHTML=primsSVG(b,"배근 상세도"); $("rbDNote").textContent=`A3 배근 상세도 ${b.n}개`; }
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

[["genDZoom","genDWrap"],["rbDZoom","rbDWrap"]].forEach(([b,w])=>$(b).addEventListener("click",()=>{ const e=$(w); e.classList.toggle("zoom"); $(b).textContent=e.classList.contains("zoom")?"맞춰 보기":"크게 보기"; }));
$("genZoom").addEventListener("click",()=>{ const w=$("genWrap"); w.classList.toggle("zoom"); $("genZoom").textContent=w.classList.contains("zoom")?"맞춰 보기":"크게 보기"; });
$("rbZoom").addEventListener("click",()=>{ const w=$("rbWrap"); w.classList.toggle("zoom"); $("rbZoom").textContent=w.classList.contains("zoom")?"맞춰 보기":"크게 보기"; });
