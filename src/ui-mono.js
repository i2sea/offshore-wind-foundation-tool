/* ---------- 모노파일 화면 ---------- */
Object.assign(FIXN,{mTP:["연결 방식",""]});
$("soilOpen").addEventListener("click",()=>{ selectTab("mpy"); $("soilEd").scrollIntoView({behavior:"smooth",block:"start"}); });
const MN=v=>fx(v/1000,1); // kN·m → MN·m
const tyName=t=>({mono1:"단일 직경",monoT:"테이퍼형"}[t]||t);
const instName=k=>({drive:"항타",drill:"드릴드 (천공 후 삽입·그라우트)",ddd:"항타-천공-항타"}[k]||k);
function monoNote(){
  const P=R.P, g=R.g;
  return `말뚝 선단 ${dl(g.yToe)} · 전체 길이 ${fx(P.mtop-g.yToe,2)} m · 상단 직경 Ø${fx(g.Dtop,3)} m · TP Ø${fx(g.DTP,3)} m (${dl(g.yTP0)} ~ ${dl(g.yTP1)})${g.prot?"":` · 세굴 후 해저면 ${dl(R.yML)} (S = ${fx(R.S,2)} m)`}`;
}
function renderMonoTab(t){
  if(t==="gen"){ $("capSec").textContent="입면도"; $("svgSec").innerHTML=primsSVG(monoSecPrims(R),"모노파일 입면도"); $("svgPlan").innerHTML=primsSVG(monoPlanPrims(R),"모노파일 평면도"); }
  else if(t==="m3d") build3D();
  else if(t==="load") $("repLoad").innerHTML=htmlMonoLoad();
  else if(t==="wt") $("repWt").innerHTML=htmlMonoWt();
  else if(t==="qty") $("repQty").innerHTML=htmlMonoQty();
  else if(t==="mchk") $("repMchk").innerHTML=htmlMonoChk();
  else if(t==="mpy"){ if(!$("soilEd").innerHTML) drawSoil(); $("repMpy").innerHTML=htmlMonoPy(); }
  else if(t==="strs") $("repStr").innerHTML=htmlMonoStress();
  else if(t==="calc") $("report").innerHTML=htmlMonoReport();
}
function renderMonoSummary(){
  const W=R.wt, q=R.qty, fq=R.freq, Y=R.py, pr=SOIL_PRESETS.find(p=>p.id===R.P.soilPre), sg=pr?" · 가정 지반":"";
  const k=[
    [`강재 (말뚝+TP)`,`${fx((W.Wp+W.WTP)/G,0)} <small>t</small>`],
    [`해저면 회전각${sg}`,`${fx(Y.rot.th,3)} <small>° / ${Y.rot.lim}°</small>${chip(Y.rot.ok)}`],
    [`근입 (소요 / 입력)`,`${Y.Lreq===null?"—":fx(Y.Lreq,1)} <small>/ ${fx(R.P.mL,1)} m</small>${chip(Y.okEmb)}`],
    ["강관 응력 · 좌굴",`${fx(Y.um,2)} <small>· ${fx(Y.ub,2)}</small>${chip(Y.okU&&Y.um<=1&&Y.ub<=1)}`],
    ["축방향 지지력",`${fx(Y.ax.Q/1000,0)} <small>MN</small>${chip(Y.okAx)}`],
    ["최대 D/t",`${fx(R.sec.DtMax,0)} <small>/ 120</small>${chip(R.sec.DtMax<=120)}`],
    [`1차 고유진동수${R.fq.band&&R.fq.band.r&&R.fq.band.r.est?" · rpm 추정":""}`,R.fq.cal?`${fx(R.fq.lo.f,3)}~${fx(R.fq.hi.f,3)} <small>Hz</small>${chip(R.fq.ok,R.fq.ok===null)}`:`— <small>기준 진동수 없음</small>`],
    ["점용 면적",`${fx(q.Aocc,0)} <small>m²</small>`],
    ["굴착·천공량",`${fx(q.Vexc,0)} <small>m³</small>`],
  ];
  $("summary").innerHTML=k.map(([a,b])=>`<div class="kpi"><span class="k">${a}</span><span class="v">${b}</span></div>`).join("");
}
function P_f(){ return R.P.f1; }

/* 주의별 팁과 자동 수정 */
function monoWarnInfo(w){
  const P=R.P, g=R.g, r1=v=>Math.round(v*100)/100;
  if(w.k==="noTL") return {tip:"하중표가 없으면 터빈의 수평력·모멘트가 빠져 해저면 단면력이 실제보다 작게 나옵니다. 제작사 인터페이스 하중(ULS·SLS 12행)을 넣어야 합니다.",
    fixes:[{label:"하중표가 든 터빈 파일 가져오기",act:()=>$("tImp").click()},{label:"선택 터빈 복제해서 하중표 입력",act:()=>$("tDup").click()}]};
  if(w.k==="ifLow") return {tip:`TP 상단(= 터빈 인터페이스)이 설계 파봉 ${dl(w.crestDL)}에 여유고 1.5 m를 더한 ${dl(w.crestDL+1.5)}보다 낮으면 파도가 타워 하단 플랜지와 작업 플랫폼을 칩니다. 터빈 하중 인터페이스 높이가 맞게 들어갔는지 먼저 확인하세요.`,
    fixes:[{label:"선택 터빈의 인터페이스 높이 확인·수정 (터빈 편집 열기)",act:()=>{ $("tDup").click(); $("te_ifz").focus(); }}]};
  if(w.k==="tpLen"){ const v=r1(R.yIf-3); return {tip:"말뚝 상단은 TP 상단(터빈 인터페이스)보다 충분히 아래여야 TP가 들어갑니다.",fixes:[{label:"수정 (TP 길이 3 m 확보)",patch:{mtop:v}}]}; }
  if(w.k==="tpLow"){ const v=r1(Math.min(R.yIf-2,P.sbDL+2+g.Lov)); return {tip:`그라우트 연결 길이(1.5 × 말뚝 상단 직경 = ${fx(g.Lov,2)} m)만큼 TP가 말뚝을 감싸 내려옵니다. 말뚝 상단이 낮으면 TP 하단이 해저면에 닿습니다. 말뚝 상단을 올리거나 볼트 연결로 바꾸세요.`,
    fixes:[{label:"수정 (TP 하단을 해저면 2 m 위로)",patch:{mtop:v}},{label:"수정 (볼트 연결이면 TP 하단 = 말뚝 상단)",patch:{mTP:"bolt"}}]}; }
  if(w.k==="flgLow"){ const v=r1(Math.min(R.yIf-2,Math.ceil((w.crestDL+1.5)*2)/2)); return {tip:"볼트 연결 플랜지가 파도에 직접 맞는 높이에 있으면 부식·피로에 불리하고 볼트 점검이 어렵습니다. 플랜지를 파봉 위로 올리거나 그라우트 연결로 바꾸세요.",
    fixes:[...(v>P.mtop?[{label:"수정 (플랜지를 파봉 + 1.5 m 위로)",patch:{mtop:v}}]:[]),{label:"수정 (TP가 말뚝을 감싸 플랜지가 TP 상단으로 올라감)",patch:{mTP:"grout"}}]}; }
  if(w.k==="taper") return {tip:"테이퍼 구간은 하단 표고가 상단보다 낮아야 합니다.",fixes:[{label:"수정 (두 값 바꾸기)",patch:{mzA:P.mzB,mzB:P.mzA}}]};
  if(w.k==="taperUp") return {tip:"모노파일 테이퍼는 보통 아래(해저면 쪽, 모멘트 큰 곳)가 넓고 위(TP 쪽)가 좁습니다. 의도한 형상인지 확인하세요.",fixes:[{label:"수정 (상·하부 직경 바꾸기)",patch:{mD:P.mDt,mDt:P.mD}}]};
  if(w.k==="zone") return {tip:"두께 구간은 아래에서 위로 하부 → 중간 → 상부 순서입니다.",fixes:[{label:"수정 (두 경계 바꾸기)",patch:{mz1:P.mz2,mz2:P.mz1}}]};
  if(w.k==="embed"){ const v=r1(R.S+2*P.mD); return {tip:"세굴로 해저면이 내려가면 그만큼 근입이 줄어듭니다. 근입깊이는 p-y 해석(다음 단계)으로 정하지만, 지금은 최소한 세굴 깊이보다 깊어야 합니다.",fixes:[{label:"수정 (세굴 깊이 + 2D, 임시값)",patch:{mL:v}}]}; }
  if(w.k==="Dt"){ const key=["mt1","mt2","mt3"][w.zone], s=R.wt.segs.find(x=>x.nm===["하부","중간 (해저면 부근)","상부"][w.zone]), D=Math.max(s.Da,s.Db), v=Math.ceil(D*1000/120/5)*5;
    return {tip:"직경에 비해 두께가 얇으면 국부좌굴(찌그러짐)과 항타 중 손상 위험이 커집니다. 실무 범위는 대략 D/t 80~120입니다(가정). 쉘 좌굴은 다음 단계에서 DNV-RP-C202로 검토합니다.",fixes:[{label:"수정 (D/t ≤ 120)",patch:{[key]:v}}]}; }
  if(w.k==="sig"){ const i=R.sec.y<P.mz1?0:R.sec.y<P.mz2?1:2, key=["mt1","mt2","mt3"][i]; let t=P[key], ok=null;
    for(let n=0;n<80;n++){ t+=5; const Q=computeMono({...P,[key]:t,fast:1}); if(Q.govLC.ratio<=1){ ok=t; break; } }
    return {tip:"해저면 단면의 축력 + 휨 응력이 설계강도(f<sub>y</sub>/γ<sub>M</sub>)를 넘습니다. 해저면 부근 두께를 키우거나 직경을 키우세요. 실제 최대 모멘트는 해저면 아래에서 생기므로 p-y 해석 후 다시 확인합니다.".replace(/<[^>]+>/g,""),
      fixes:ok?[{label:"수정 (응력비 1 이하)",patch:{[key]:ok}}]:[]}; }
  if(w.k==="emb"&&w.Lreq) return {tip:"근입이 짧으면 말뚝 아래쪽까지 지반이 밀려 회전각이 급히 커집니다. 근입을 늘려도 회전각이 더 줄지 않는 길이(소요 근입)까지 넣는 것이 보통입니다.",fixes:[{label:"수정 (소요 근입)",patch:{mL:w.Lreq}}]};
  if(["emb","rot","pyFail"].includes(w.k)) return {tip:"근입을 늘려도 안 되면 지반이 약하거나 하중에 비해 말뚝 직경이 작은 것입니다. 직경을 키우면 지반 저항(폭)과 휨강성이 함께 커집니다. 지층 값이 가정값이면 지반조사 결과부터 넣으세요.",
    fixes:[{label:"직경·근입을 바꿔 가며 강재가 가장 적은 조합 찾기",act:()=>searchDL()},{label:"지층 표 열기",act:()=>selectTab("mpy")}]};
  if(w.k==="pyY"||w.k==="pyB"){ const Y=R.py, i=Y.chk.reduce((a,c,j)=>R.LC[j].kind!=="SLS"&&Math.max(c.um,c.ub)>Math.max(Y.chk[a].um,Y.chk[a].ub)?j:a,1), x=Math.max(Y.chk[i].xm,Y.chk[i].xb), y=R.yML-x, key=y<P.mz1?"mt1":y<P.mz2?"mt2":"mt3";
    return {tip:`가장 불리한 곳은 해저면 아래 ${fx(x,1)} m (${dl(y)}), ${FIXN[key][0]} 구간입니다. 그 구간 두께를 키우거나 직경을 키우세요.`,
      fixes:[{label:`${FIXN[key][0]}${eul(FIXN[key][0])} 5 mm씩 키워 만족하는 값 찾기`,act:()=>searchFix(P=>({[key]:P[key]+5}),Y=>Y.um<=1&&Y.ub<=1,FIXN[key][0],key,30)}]}; }
  if(w.k==="scaled") return {tip:"로터 직경·허브 높이 비율로 기준 터빈 하중을 키운 값이라 개략 검토용입니다. 터빈 계약 후 제작사 인터페이스 하중(ULS·SLS)을 터빈 편집에 붙여넣으세요.",fixes:[{label:"선택 터빈 복제해서 하중표 입력",act:()=>$("tDup").click()}]};
  if(w.k==="noFref") return {tip:"고유진동수는 타워 강성이 있어야 계산됩니다. 제작사가 준 타워 하단 고정 1차 진동수를 넣으면 타워 강성을 역산합니다.",fixes:[{label:"선택 터빈 복제해서 기준 진동수 입력",act:()=>{ $("tDup").click(); $("te_fref").focus(); }}]};
  if(w.k==="freq") return freqFixInfo();
  if(w.k==="ax") return {tip:"축방향 지지력이 모자라면 근입을 늘리거나(주면마찰 증가) 선단을 단단한 층에 두세요.",fixes:[{label:"근입을 2 m씩 늘려 만족하는 값 찾기",act:()=>searchFix(P=>({mL:P.mL+2}),Y=>Y.okAx,"근입깊이","mL",15)}]};
  return {tip:"",fixes:[]};
}
/* 직경(+0~4 m)·근입(1~2배) 격자 탐색: 회전각·수렴·축방향 지지력 만족, 강관 중량 최소 */
function searchDL(){
  const P0=readInputs(); let best=null; toast("직경과 근입 조합을 찾는 중입니다…");
  setTimeout(()=>{
    for(let dD=0; dD<=4+1e-9; dD+=0.5) for(let f=1; f<=2.001; f+=0.1){ const L=Math.round(P0.mL*f*2)/2;
      const P={...P0,mD:P0.mD+dD,...(P0.type==="monoT"?{mDt:P0.mDt+dD}:{}),mL:L,fast:1}, Rm=computeMono(P), Y=computePile(P,Rm,{quick:1});
      if(Y.rot.ok&&Y.okU&&Y.okAx){ if(!best||Rm.wt.Wp<best.W) best={P,W:Rm.wt.Wp}; break; } }
    if(!best){ toast("직경 +4 m, 근입 2배 안에서는 만족하는 조합이 없습니다. 지층 값을 확인하세요."); return; }
    const P=best.P; delete P.fast; { const Y=computePile(P,computeMono(P)); if(Y.Lreq!==null&&Y.Lreq>P.mL) P.mL=Y.Lreq; }
    best.W=computeMono(P).wt.Wp; setInputs(P); run();
    toast(`수정했습니다: ${[P.mD!==P0.mD?`하부 직경 ${fx(P0.mD,2)} → ${fx(P.mD,2)} m`:"",P.mL!==P0.mL?`근입깊이 ${fx(P0.mL,1)} → ${fx(P.mL,1)} m`:""].filter(Boolean).join(", ")} (강관 ${fx(best.W/G,0)} t)`);
    ["mD","mL"].forEach(k=>{ const el=$(k); el.classList.add("flash"); setTimeout(()=>el.classList.remove("flash"),1200); });
  },30);
}
const eul=w=>{ const c=w.charCodeAt(w.length-1); return c>=0xac00&&c<=0xd7a3&&(c-0xac00)%28?"을":"를"; };
/* 반복 계산으로 자동 수정값 찾기 (누를 때만 계산) */
function searchFix(step,good,name,key,maxN){
  let P=readInputs(), p0=P[key], ok=false;
  for(let i=0;i<maxN;i++){ P={...P,...step(P),fast:1}; const Rm=computeMono(P); if(good(computePile(P,Rm,{quick:1}),P,Rm)){ ok=true; break; } }
  if(!ok){ toast(`${name}${eul(name)} 바꿔서는 만족하는 값을 찾지 못했습니다`); return; }
  delete P.fast; setInputs(P); run(); toast(`수정했습니다: ${name} ${fx(p0,key.startsWith("mt")?0:2)} → ${fx(P[key],key.startsWith("mt")?0:2)}${key.startsWith("mt")?" mm":" m"}`);
  const el=$(key); if(el){ el.classList.add("flash"); setTimeout(()=>el.classList.remove("flash"),1200); }
}

/* ---------- 도면 ---------- */
function monoProfile(g,P,y0,y1,inner){ // 한쪽 벽 윤곽: 바깥 위로, 안쪽 아래로
  const bp=[y0,y1,P.mz1,P.mz2,...(g.taper?[P.mzA,P.mzB]:[])].filter(v=>v>=y0&&v<=y1).sort((a,b)=>a-b);
  const ys=[]; bp.forEach(v=>{ if(v>y0) ys.push(v-1e-4); ys.push(v); if(v<y1) ys.push(v+1e-4); });
  const u=[...new Set(ys.map(v=>+v.toFixed(5)))].sort((a,b)=>a-b);
  const out=u.map(y=>[g.Dp(y)/2,y]), inn=u.slice().reverse().map(y=>[g.Dp(y)/2-g.tAt(y),y]);
  return inner?inn:out.concat(inn);
}
function monoSecPrims(R){
  const P=R.P, g=R.g, o=[], q=R.qty;
  const Rsc=g.prot?q.Dsc/2:q.Dsb0/2+1.73*R.S+1, Rw=Math.max(Rsc,g.DTP/2)+4;
  const xL=-Rw-30, xR=Rw+34, zT=R.yIf+6, zB=g.yToe-5;
  const fs=Math.max(1.4,(zT-zB)/46);
  const both=(pts,L,ex)=>{ o.push({t:"poly",pts,L,...ex}); o.push({t:"poly",pts:pts.map(p=>[-p[0],p[1]]),L,...ex}); };
  const sb=P.sbDL, r0=q.Dsb0/2;
  // 지반 (세굴 구멍 포함)
  o.push({t:"poly",L:"WATER",pts:[[xL,g.prot?sb:R.yML],[xL,P.hwl],[xR,P.hwl],[xR,g.prot?sb:R.yML]]});
  if(!g.prot&&R.S>0){ const s=1.73*R.S; o.push({t:"poly",L:"SOIL",pts:[[xL,zB],[xL,sb],[-r0-s,sb],[-r0,R.yML],[r0,R.yML],[r0+s,sb],[xR,sb],[xR,zB]]}); }
  else o.push({t:"poly",L:"SOIL",pts:[[xL,zB],[xL,sb],[xR,sb],[xR,zB]]});
  if(g.prot){ const T=P.mScT, Ro=q.Dsc/2; both([[r0,sb],[Ro,sb],[Ro-1.5*T,sb+T],[r0,sb+T]],"ROCK"); }
  // 말뚝 벽 (안쪽 지반·해수는 그대로 보임)
  both(monoProfile(g,P,g.yToe,P.mtop),"STEEL");
  // TP · 그라우트
  if(g.grout){ const a=g.Dtop/2+P.mgap; both([[a,g.yTP0],[a+g.tTP,g.yTP0],[a+g.tTP,g.yTP1],[a,g.yTP1]],"STEEL"); both([[g.Dtop/2,g.yTP0],[a,g.yTP0],[a,P.mtop],[g.Dtop/2,P.mtop]],"GROUT");
    o.push({t:"line",L:"LINE",x1:-a-g.tTP,z1:g.yTP1,x2:a+g.tTP,z2:g.yTP1}); }
  else { const a=g.Dtop/2; both([[a-g.tTP,P.mtop],[a,P.mtop],[a,g.yTP1],[a-g.tTP,g.yTP1]],"STEEL");
    o.push({t:"line",L:"LINE",x1:-a-0.4,z1:P.mtop,x2:a+0.4,z2:P.mtop,w:.2}); o.push({t:"line",L:"LINE",x1:-a,z1:g.yTP1,x2:a,z2:g.yTP1}); }
  // 타워 하단 (참고)
  { const a=g.DTP/2*0.85; o.push({t:"line",L:"HID",x1:-a,z1:R.yIf,x2:-a*0.9,z2:zT-1}); o.push({t:"line",L:"HID",x1:a,z1:R.yIf,x2:a*0.9,z2:zT-1}); o.push({t:"text",L:"MUT",x:0,z:zT-2.2,h:fs*0.8,s:"타워 (터빈 하중에 포함)",anchor:"middle"}); }
  o.push({t:"line",L:"CEN",x1:0,z1:zB+1,x2:0,z2:zT-0.5});
  // 수위 (글자는 겹치지 않게 아래로 밀어 씀)
  const wls=[[P.hwl,`설계조위 ${dl(P.hwl)}`],...(Math.abs(P.msl-P.hwl)>0.05?[[P.msl,`MSL ${dl(P.msl)}`]]:[]),...(Math.abs(P.hwl)>0.05&&Math.abs(P.msl)>0.05?[[0,"약최저저조위 DL 0.000"]]:[])];
  o.push({t:"line",L:"WL",x1:Rw+1,z1:R.crestDL,x2:xR-1,z2:R.crestDL,dash:1}); o.push({t:"text",L:"WL",x:Rw+6.5,z:R.crestDL+fs*0.35,h:fs*0.8,s:`설계 파봉 ${dl(R.crestDL)}`});
  { let lastW=R.crestDL; wls.forEach(([y,t])=>{ o.push({t:"line",L:"WL",x1:Rw+1,z1:y,x2:xR-1,z2:y}); o.push({t:"tri",L:"WL",x:Rw+4.5,z:y,s:fs*0.6});
    const ty=Math.min(y+fs*0.35,lastW-fs*1.05); o.push({t:"text",L:"WL",x:Rw+6.5,z:ty,h:fs*0.8,s:t}); lastW=ty; }); }
  // 왼쪽 표고
  const lv=(y,s,x)=>{ const xx=-(x||0)-0.3; o.push({t:"line",L:"DIM",x1:xx,z1:y,x2:xL+1,z2:y}); o.push({t:"text",L:"DIM",x:xL+1,z:y+fs*0.25,h:fs*0.72,s,num:1}); };
  const lab=[[R.yIf,`TP 상단 = 인터페이스 ${dl(R.yIf)}`,g.DTP/2],[P.mtop,`말뚝 상단 ${dl(P.mtop)}`,g.Dtop/2+(g.grout?P.mgap+g.tTP:0)],...(g.grout?[[g.yTP0,`TP 하단 ${dl(g.yTP0)}`,g.DTP/2]]:[]),
    [sb,`원지반 ${dl(sb)}`,Rsc],...(!g.prot&&R.S>0?[[R.yML,`세굴 후 ${dl(R.yML)}`,r0]]:[]),[g.yToe,`말뚝 선단 ${dl(g.yToe)}`,g.Dp(g.yToe)/2]];
  lab.sort((a,b)=>b[0]-a[0]); let last=1e9; lab.forEach(([y,s,x])=>{ const yy=Math.min(y,last-fs*1.15); lv(yy,s,x); if(Math.abs(yy-y)>1e-6) o.push({t:"line",L:"DIM",x1:-x-0.3,z1:y,x2:-x-0.3,z2:yy,w:.04}); last=yy; });
  // 두께 구간 (오른쪽)
  R.wt.segs.forEach(s=>{ const ym=(s.y0+s.y1)/2, x=Math.max(g.Dp(ym)/2,(ym>=g.yTP0?g.DTP/2:0))+1.2;
    o.push({t:"line",L:"DIM",x1:x,z1:s.y0,x2:x,z2:s.y1}); o.push({t:"line",L:"DIM",x1:x-0.6,z1:s.y0,x2:x+0.6,z2:s.y0}); o.push({t:"line",L:"DIM",x1:x-0.6,z1:s.y1,x2:x+0.6,z2:s.y1});
    o.push({t:"text",L:"DIM",x:x+0.8,z:ym,h:fs*0.75,s:`t ${s.t} (L ${fx(s.L,1)})`,num:1}); });
  // 직경
  const dD=(y,D,s)=>o.push({t:"text",L:"DIM",x:0,z:y,h:fs*0.75,s:`${s}Ø${fx(D*1000,0)}`,anchor:"middle",num:1});
  dD(g.yToe+2,g.Dp(g.yToe),""); if(g.taper) dD(P.mzB+2,P.mDt,""); dD(R.yIf-2.2,g.DTP,"TP ");
  if(g.grout) o.push({t:"text",L:"MUT",x:0,z:g.yTP0+g.Lov/2,h:fs*0.7,s:`그라우트 연결 ${fx(g.Lov,2)} m`,anchor:"middle"});
  if(g.prot) o.push({t:"text",L:"MUT",x:-q.Dsc/2+1,z:sb+P.mScT+fs*0.4,h:fs*0.7,s:`세굴방지공 Ø${fx(q.Dsc,1)} m, t ${P.mScT} m`});
  return {o,box:[xL,zB,xR,zT],fs};
}
function monoPlanPrims(R){
  const P=R.P, g=R.g, q=R.qty, o=[], Rm=(g.prot?q.Dsc/2:q.Dsb0/2+1.73*R.S)+4, fs=Rm/15;
  if(g.prot) o.push({t:"circle",L:"ROCK",x:0,z:0,r:q.Dsc/2,fill:1,fc:"rock",op:.45});
  else if(R.S>0) o.push({t:"circle",L:"HID",x:0,z:0,r:q.Dsb0/2+1.73*R.S});
  o.push({t:"circle",L:"LINE",x:0,z:0,r:g.DTP/2,fill:1,fc:"steel",op:.6});
  o.push({t:"circle",L:"LINE",x:0,z:0,r:g.DTP/2});
  if(g.grout){ o.push({t:"circle",L:"LINE",x:0,z:0,r:g.DTP/2-g.tTP}); o.push({t:"circle",L:"HID",x:0,z:0,r:g.Dtop/2}); }
  else o.push({t:"circle",L:"LINE",x:0,z:0,r:g.Dtop/2-g.tTP});
  if(Math.abs(q.Dsb0-g.DTP)>0.05) o.push({t:"circle",L:"HID",x:0,z:0,r:q.Dsb0/2});
  o.push({t:"line",L:"CEN",x1:-Rm,z1:0,x2:Rm,z2:0}); o.push({t:"line",L:"CEN",x1:0,z1:-Rm,x2:0,z2:Rm});
  const lab=(r,ang,s)=>{ const a=ang*PI/180, x=r*Math.cos(a), z=r*Math.sin(a); o.push({t:"line",L:"DIM",x1:x,z1:z,x2:x+2.2*Math.cos(a),z2:z+2.2*Math.sin(a)});
    o.push({t:"text",L:"DIM",x:x+2.4*Math.cos(a),z:z+2.4*Math.sin(a),h:fs,s,anchor:Math.cos(a)<0?"end":"start",num:1}); };
  lab(g.DTP/2,40,`Ø${fx(g.DTP*1000,0)} TP`);
  lab(q.Dsb0/2,150,`Ø${fx(q.Dsb0*1000,0)} 말뚝 (해저면)`);
  if(g.prot) lab(q.Dsc/2,-35,`Ø${fx(q.Dsc*1000,0)} 세굴방지공`); else if(R.S>0) lab(q.Dsb0/2+1.73*R.S,-35,`세굴 구멍 (S ${fx(R.S,1)} m)`);
  return {o,box:[-Rm-Rm*0.45,-Rm-2,Rm+Rm*0.45,Rm+2],fs};
}
async function dxfMono(){
  const sp=monoSecPrims(R), pp=monoPlanPrims(R), off=sp.box[2]-pp.box[0]+10;
  const z=new JSZip();
  z.file(`${baseName()}_일반도.dxf`,primsDXF([{pr:sp,dx:0,dy:0},{pr:pp,dx:off,dy:(R.yIf+R.g.yToe)/2}]));
  z.file(`${baseName()}_입면도.dxf`,primsDXF([{pr:sp,dx:0,dy:0}])); z.file(`${baseName()}_평면도.dxf`,primsDXF([{pr:pp,dx:0,dy:0}]));
  z.file("읽어보기.txt",`단위: mm. 입면도 원점 = 말뚝 중심 · DL 0.000 (세로 좌표 = DL 표고). 평면도 원점 = 말뚝 중심.\r\n레이어: STEEL 강관·TP, GROUT 그라우트, ROCK 세굴방지공, WATER 해수·수위, SOIL 지반, HIDDEN 숨은선, CENTER 중심선, DIM 치수·표고, TEXT 문자.\r\n강관 두께는 실제 치수로 그렸습니다(축척에 따라 얇게 보임).\r\n`);
  saveFile(`${baseName()}_도면_${stamp()}.zip`,await z.generateAsync({type:"blob"}));
}
function build3DMono(){
  const {scene,cam,ctl}=G3, P=R.P, g=R.g, q=R.qty, grp=new THREE.Group(); G3.grp=grp; scene.add(grp);
  const cut=$("cut3d").checked, clip=cut?[new THREE.Plane(new THREE.Vector3(0,0,-1),0)]:[];
  const dark=matchMedia("(prefers-color-scheme: dark)").matches&&document.documentElement.dataset.theme!=="light"||document.documentElement.dataset.theme==="dark";
  const mS=new THREE.MeshStandardMaterial({color:dark?0x7d93a3:0x9fb4c2,metalness:.35,roughness:.55,side:THREE.DoubleSide,clippingPlanes:clip});
  const mT=new THREE.MeshStandardMaterial({color:0xe2c044,metalness:.2,roughness:.6,side:THREE.DoubleSide,clippingPlanes:clip});
  const mG=new THREE.MeshStandardMaterial({color:0x9aa3a6,roughness:.9,side:THREE.DoubleSide,clippingPlanes:clip});
  const mR=new THREE.MeshStandardMaterial({color:0x8c8478,roughness:1,side:THREE.DoubleSide,clippingPlanes:clip});
  const lathe=(pts,m)=>{ const gg=new THREE.LatheGeometry(pts.map(p=>new THREE.Vector2(Math.max(0.0001,p[0]),p[1])),96); grp.add(new THREE.Mesh(gg,m)); };
  const ring=(ri,ro,z0,z1,m)=>lathe([[ri,z0],[ro,z0],[ro,z1],[ri,z1],[ri,z0]],m);
  const pr=monoProfile(g,P,g.yToe,P.mtop); lathe([...pr,pr[0]],mS);
  if(g.grout){ const a=g.Dtop/2+P.mgap; ring(a,a+g.tTP,g.yTP0,g.yTP1,mT); ring(g.Dtop/2,a,g.yTP0,P.mtop,mG); }
  else ring(g.Dtop/2-g.tTP,g.Dtop/2,P.mtop,g.yTP1,mT);
  { const a=g.DTP/2*0.85; lathe([[a,R.yIf],[a*0.8,R.yIf+14],[a*0.8-0.05,R.yIf+14],[a-0.05,R.yIf]],new THREE.MeshStandardMaterial({color:0xf2f2f2,transparent:true,opacity:.45,side:THREE.DoubleSide,clippingPlanes:clip})); }
  if(g.prot){ const T=P.mScT; lathe([[q.Dsb0/2,P.sbDL],[q.Dsc/2,P.sbDL],[q.Dsc/2-1.5*T,P.sbDL+T],[q.Dsb0/2,P.sbDL+T],[q.Dsb0/2,P.sbDL]],mR); }
  const Rb=Math.max(q.Dsc/2,20);
  if($("water3d").checked){ const gg=new THREE.CircleGeometry(Rb*1.6,64); gg.rotateX(-PI/2); gg.translate(0,P.hwl,0);
    grp.add(new THREE.Mesh(gg,new THREE.MeshStandardMaterial({color:0x3f8fc9,transparent:true,opacity:.28,side:THREE.DoubleSide,depthWrite:false}))); }
  { const top=g.prot?P.sbDL:R.yML, gg=new THREE.CylinderGeometry(Rb*1.6,Rb*1.6,top-g.yToe+3,64,1,true); gg.translate(0,(top+g.yToe-3)/2,0);
    grp.add(new THREE.Mesh(gg,new THREE.MeshStandardMaterial({color:0x9c8459,roughness:1,transparent:true,opacity:.18,side:THREE.DoubleSide,depthWrite:false})));
    const d=new THREE.CircleGeometry(Rb*1.6,64); d.rotateX(-PI/2); d.translate(0,P.sbDL,0); grp.add(new THREE.Mesh(d,new THREE.MeshStandardMaterial({color:0x9c8459,transparent:true,opacity:.35,side:THREE.DoubleSide,depthWrite:false}))); }
  const camKey="mono|"+Math.round(R.yIf)+"|"+Math.round(g.yToe);
  if(G3.camKey!==camKey){ G3.camKey=camKey; const H=R.yIf+14-g.yToe, dd=H*1.55; cam.position.set(dd*0.7,g.yToe+H*0.6+dd*0.15,dd*0.9); ctl.target.set(0,g.yToe+H*0.45,0); cam.far=dd*20; cam.updateProjectionMatrix(); }
  $("note3d").textContent=`모노파일 ${tyName(P.type)} · 말뚝 길이 ${fx(P.mtop-g.yToe,1)} m · 강재 ${fx((R.wt.Wp+R.wt.WTP)/G,0)} t · 노란색 TP, 흰색 타워 하단(참고)${cut?" · 앞쪽 절반을 잘라 보여 줍니다":""}`;
}

/* ---------- 탭 내용 ---------- */
function turbTablesHtml(TL,t){
  let h=`<p>하중표 연직축: ${t.axis}. 연직력 V = −F<sub>${t.axis}</sub> (압축 +), 수평합력 H와 전도모멘트 M은 나머지 두 성분의 벡터합.</p>`;
  ["uls","sls"].forEach(kd=>{ const rows=TL[kd], gv=kd==="uls"?TL.gu:TL.gs;
    h+=`<div class="tblwrap"><table class="t"><thead><tr><th>${kd.toUpperCase()}</th><th>Mx</th><th>My</th><th>Mz</th><th>Fx</th><th>Fy</th><th>Fz</th><th>V (kN)</th><th>H (kN)</th><th>M (kN·m)</th></tr></thead><tbody>`;
    rows.forEach(r=>h+=`<tr class="${r===gv?"gov":""}"><td>${r.lab}</td>${[r.Mx,r.My,r.Mz,r.Fx,r.Fy,r.Fz].map(v=>`<td class="n">${fx(v,1)}</td>`).join("")}<td class="n">${fx(r.V,0)}</td><td class="n">${fx(r.H,0)}</td><td class="n">${fx(r.M,0)}</td></tr>`);
    h+=`</tbody></table></div><p class="note">노란 행 = 전도모멘트 M 최대 (${kd==="uls"?"폭풍 조합":"상시·지진 조합"}에 사용)</p>`; });
  return h;
}
function htmlMonoLoad(){
  const P=R.P, t=R.T, TL=R.TL, W=R.wind, V=R.wave, C=R.cur, E=R.eq, fq=R.freq, g=R.g;
  let h=`<h3>1. 터빈 하중</h3><p>${esc(t.name)}: ${t.MW} MW, 허브 MSL+${t.hub} m${t.rotor?`, 로터 Ø${t.rotor} m`:""}, 하중 인터페이스 MSL+${t.ifz} m. ${esc(t.src||"")}</p>
  <div class="eq">인터페이스 표고 y<sub>if</sub> = ${t.ifz} + ${dl(P.msl)} = ${dl(R.yIf)}  (TP 상단)
해저면 (단면력 기준) y<sub>ML</sub> = ${dl(P.sbDL)}${g.prot?" (세굴방지공 설치, 세굴 없음)":` − 세굴 S ${fx(R.S,3)} = ${dl(R.yML)}`}
터빈 하중 팔길이 = y<sub>if</sub> − y<sub>ML</sub> = ${fx(R.armIf,3)} m,  해저면 모멘트 = M + H × ${fx(R.armIf,3)}
터빈+타워 총중량 W<sub>t</sub> = ${fx(R.Wt,1)} kN</div>`;
  h+=TL.uls?turbTablesHtml(TL,t):`<p class="warn">이 터빈은 하중표가 없어 터빈 수평력·모멘트가 빠집니다. "선택 터빈 복제해서 편집"에서 제작사 하중표를 붙여넣으세요.</p>`;
  h+=`<h3>2. 고유진동수</h3><p>${R.fq.cal?`타워·기초·지반을 함께 넣은 보 모델로 계산한 1차 고유진동수는 ${fx(R.fq.lo.f,3)} ~ ${fx(R.fq.hi.f,3)} Hz입니다. 계산 과정은 말뚝 해석 탭 7절에 있습니다.`:"선택 터빈에 기준 고유진동수가 없어 계산하지 않았습니다. 터빈 편집에서 넣으세요."}</p>`;
  h+=`<h3>3. 풍하중 (물 위 TP·말뚝, DNV-RP-C205 Frøya)</h3>
  <div class="eq">기준 ${P.zref} m, ${P.Tavg} s 평균 ${P.Uref} m/s → U₀ (10 m, 1시간) = ${fx(W.U0,3)} m/s,  C = ${fx(W.C,4)}
F = C<sub>s</sub> · ½ρ<sub>a</sub>U² · D,  C<sub>s</sub> = ${P.Cs}.  적용 범위: 설계조위 ~ TP 상단 (타워 풍하중은 터빈 하중에 포함)
합계 F<sub>w</sub> = ${fx(W.F,1)} kN,  해저면 모멘트 M<sub>w</sub> = ${fx(W.M,0)} kN·m (팔길이 ${fx(W.arm,2)} m)</div>`;
  h+=`<div class="tblwrap"><table class="t"><thead><tr><th>수면 위 높이 (m)</th><th>표고</th><th>I<sub>u</sub></th><th>풍속 (m/s)</th><th>풍압 q (kN/m²)</th><th>폭 D (m)</th><th>풍하중 (kN/m)</th></tr></thead><tbody>`;
  W.rows.forEach(r=>h+=`<tr><td class="n">${fx(r.h,1)}</td><td class="n">${dl(r.y)}</td><td class="n">${fx(r.Iu,4)}</td><td class="n">${fx(r.U,3)}</td><td class="n">${fx(r.q,3)}</td><td class="n">${fx(r.D,3)}</td><td class="n">${fx(r.f,3)}</td></tr>`);
  h+=`</tbody></table></div>`;
  const sn={conc:"콘크리트 표면",mg:"해양생물 부착",st:"강재 표면"}[P.surf]||"직접 입력";
  h+=`<h3>4. 항력계수 (DNV-RP-C205, 원형 단면)</h3>
  <div class="eq">C<sub>D</sub> = 0.65 (Δ &lt; 10⁻⁴),  (29 + 4·log₁₀Δ)/20 (10⁻⁴ ≤ Δ ≤ 10⁻²),  1.05 (Δ &gt; 10⁻²),  Δ = k/D
표면 상태: ${sn}, 거칠기 k = ${P.ks} mm,  해양생물 두께 ${P.mmg} mm (MSL+2 m = ${dl(P.msl+2)} 아래, 직경에 2 × ${P.mmg} mm 더함)</div>
  <div class="tblwrap"><table class="t"><thead><tr><th>구간 (DL)</th><th>직경 D (m, 해양생물 포함)</th><th>Δ = k/D</th><th>C<sub>D</sub></th></tr></thead><tbody>`;
  R.cdTbl.forEach(r=>{ const one=Math.abs(r.Da-r.Db)<1e-3;
    h+=`<tr><td class="n">${dl(r.y0)} ~ ${dl(r.y1)}</td><td class="n">${one?fx(r.Da,3):fx(r.Da,3)+" → "+fx(r.Db,3)}</td><td class="n">${one?r.dA.toExponential(2):r.dA.toExponential(2)+" → "+r.dB.toExponential(2)}</td><td class="n">${one?fx(r.cdA,3):fx(r.cdA,3)+" → "+fx(r.cdB,3)}</td></tr>`; });
  h+=`</tbody></table></div>`;
  h+=`<h3>5. 파랑하중</h3>
  ${waveSrcHtml(P)}<div class="eq">수심 d = 설계조위 − 원지반 = ${fx(V.d,3)} m,  H = ${P.Hw} m,  T = ${P.Tw} s,  ω = ${fx(V.w,4)} rad/s
분산식 ω² = g·k·tanh(kd) → k = ${fx(V.k,5)} /m,  파장 L = ${fx(V.L,2)} m
해수면 직경 D = ${fx(V.Dsw,3)} m → D/L = ${fx(V.DL,3)} ${V.diff?"&gt; 0.2 → 회절 영역 (MacCamy-Fuchs 관성력)":"≤ 0.2 → 회절 영향 작음 (Morison 영역). MacCamy-Fuchs 식은 ka가 작으면 C<sub>M</sub> → 2.0으로 Morison 식과 같아지므로 같은 식으로 계산"}
C<sub>M</sub> = 4 / {π(ka)² √(J₁′(ka)² + Y₁′(ka)²)},  a = D(z)/2
관성력 dF<sub>I</sub>/dz = ρ·π·a²·C<sub>M</sub>·ω²(H/2)·cosh(kz)/sinh(kd),   항력 dF<sub>D</sub>/dz = ½·ρ·C<sub>D</sub>·D·u²
해수면 KC = u·T/D = ${fx(V.KC,2)},  F(t) = F<sub>I</sub>·sin ωt + F<sub>D</sub>·cos ωt·|cos ωt| 최대 (위상 0.5° 간격)
모멘트 기준: 해저면 ${dl(R.yML)}</div>`;
  h+=`<div class="plots"><div class="sheet">${profileSVG(V.rows,"fI","z","var(--l-wave)","관성력 dF/dz (kN/m)",V.d)}</div></div>`;
  h+=`<div class="tblwrap"><table class="t"><thead><tr><th>해저 위 z (m)</th><th>D (m)</th><th>ka</th><th>C<sub>M</sub></th><th>가속도 (m/s²)</th><th>관성력 (kN/m)</th><th>유속 (m/s)</th><th>C<sub>D</sub></th><th>항력 (kN/m)</th></tr></thead><tbody>`;
  V.rows.forEach(r=>h+=`<tr><td class="n">${fx(r.z,2)}</td><td class="n">${fx(r.D,3)}</td><td class="n">${fx(r.ka,4)}</td><td class="n">${fx(r.CM,3)}</td><td class="n">${fx(r.acc,3)}</td><td class="n">${fx(r.fI,1)}</td><td class="n">${fx(r.u,3)}</td><td class="n">${fx(r.Cd,3)}</td><td class="n">${fx(r.fD,1)}</td></tr>`);
  h+=`</tbody></table></div><table class="t" style="max-width:640px;margin-top:8px"><tbody>
  <tr><td class="l">관성력 진폭 F<sub>I</sub> / M<sub>I</sub></td><td class="n">${fx(V.FI,0)} kN</td><td class="n">${fx(V.MI,0)} kN·m</td></tr>
  <tr><td class="l">항력 진폭 F<sub>D</sub> / M<sub>D</sub></td><td class="n">${fx(V.FD,0)} kN</td><td class="n">${fx(V.MD,0)} kN·m</td></tr>
  <tr class="tot"><td class="l">설계 파랑하중 (팔길이 ${fx(V.arm,2)} m)</td><td class="n">${fx(V.F,0)} kN</td><td class="n">${fx(V.M,0)} kN·m</td></tr></tbody></table>
  <p class="note">적분 상단: ${P.crest?`파봉 ${dl(V.yTop)}까지`:"설계조위까지"}. 선형파 이론, 높이별 위상차 무시(보수적).</p>`;
  h+=`<h3>6. 조류하중</h3><div class="eq">u(z) = U<sub>t0</sub>·(z/d)<sup>1/7</sup> + U<sub>w0</sub>·(d₀ − (d − z))/d₀,  U<sub>w0</sub> = ${P.wcf} × ${fx(W.U0,3)} = ${fx(C.Uw0,3)} m/s,  d₀ = ${fx(C.d0,1)} m
상시: U<sub>t0</sub> = ${P.Uc} m/s → F = ${fx(C.n.F,1)} kN, M = ${fx(C.n.M,0)} kN·m
극치: U<sub>t0</sub> = ${P.Uce} m/s + 바람 해류 → F = ${fx(C.e.F,1)} kN, M = ${fx(C.e.M,0)} kN·m</div>
  <div class="tblwrap"><table class="t"><thead><tr><th>해저 위 z (m)</th><th>D (m)</th><th>C<sub>D</sub></th><th>상시 u</th><th>상시 (kN/m)</th><th>극치 u</th><th>극치 (kN/m)</th></tr></thead><tbody>`;
  C.e.rows.forEach((r,i)=>{ const n=C.n.rows[i]; h+=`<tr><td class="n">${fx(r.z,2)}</td><td class="n">${fx(r.D,3)}</td><td class="n">${fx(r.Cd,3)}</td><td class="n">${fx(n.u,3)}</td><td class="n">${fx(n.f,2)}</td><td class="n">${fx(r.u,3)}</td><td class="n">${fx(r.f,2)}</td></tr>`; });
  h+=`</tbody></table></div><p class="note">조류 유속 ${P.Uc}·${P.Uce} m/s는 가정값입니다. 해양조사 결과로 바꾸세요.</p>`;
  h+=`<h3>7. 지진 (수평 관성력, 해저면 기준)</h3><div class="eq">F = k<sub>h</sub> × W,  k<sub>h</sub> = ${P.kh}${P.sgc?` (= PGA ${P.sgc}g × ${P.kfac})`:" (직접 입력, 가정값)"},  M = F × (y − y<sub>ML</sub>)</div>
  <div class="tblwrap"><table class="t"><thead><tr><th>구분</th><th>W (kN)</th><th>작용 표고</th><th>팔길이 (m)</th><th>F (kN)</th><th>M (kN·m)</th></tr></thead><tbody>`;
  E.items.forEach(it=>h+=`<tr><td class="l">${it.nm}</td><td class="n">${fx(it.W,0)}</td><td class="n">${dl(it.y)}</td><td class="n">${fx(it.arm,2)}</td><td class="n">${fx(it.F,1)}</td><td class="n">${fx(it.M,0)}</td></tr>`);
  h+=`<tr class="tot"><td class="l" colspan="4">합계</td><td class="n">${fx(E.F,1)}</td><td class="n">${fx(E.M,0)}</td></tr></tbody></table></div>
  <p class="note">말뚝 안 해수는 말뚝과 함께 움직이는 질량으로, 동수압은 바깥 배제수 질량을 부가질량으로 넣었습니다(간이법). 응답스펙트럼 해석은 진동수 산정 후 다음 단계에서 합니다.</p>`;
  h+=`<h3>8. 하중조합 · 해저면 단면력</h3>`+htmlMonoLC();
  return h;
}
function htmlMonoLC(){
  let h=`<div class="tblwrap"><table class="t"><thead><tr><th>조합</th><th>하중</th><th>계수</th><th>V (kN)</th><th>H (kN)</th><th>M (kN·m)</th></tr></thead><tbody>`;
  R.LC.forEach(l=>{ l.items.forEach((it,i)=>h+=`<tr>${i?"":`<td class="l" rowspan="${l.items.length+1}">${l.id}<br><small>${l.nm}</small></td>`}<td class="l">${it.nm}${it.note?` <small>(${it.note})</small>`:""}</td><td class="n">${fx(it.g,2)}</td><td class="n">${fx(it.V,0)}</td><td class="n">${fx(it.H,0)}</td><td class="n">${fx(it.M,0)}</td></tr>`);
    h+=`<tr class="tot"><td class="l" colspan="2">합계 (계수 곱함)</td><td class="n">${fx(l.V,0)}</td><td class="n">${fx(l.H,0)}</td><td class="n">${fx(l.M,0)}</td></tr>`; });
  h+=`</tbody></table></div><p class="note">터빈 ULS 하중은 제작사 하중계수가 들어 있다고 보고 1.0을 곱하고, 폭풍 조합의 풍·파랑·조류에만 환경하중 계수 ${R.P.mgE}를 곱했습니다. 상시 조합(SLS)은 다음 단계의 해저면 회전각 검토에 씁니다.</p>`;
  return h;
}
function htmlMonoWt(){
  const P=R.P, g=R.g, W=R.wt;
  let h=`<h3>1. 강관 말뚝 (두께 구간별)</h3><div class="eq">단면적 A = π·t·(D − t),  중량 = ∫ A(y) dy × γ<sub>s</sub>,  γ<sub>s</sub> = ${P.mgs} kN/m³</div>
  <div class="tblwrap"><table class="t"><thead><tr><th>구간</th><th>표고</th><th>길이 (m)</th><th>직경 (m)</th><th>두께 (mm)</th><th>중량 (kN)</th><th>중량 (t)</th></tr></thead><tbody>`;
  W.segs.forEach(s=>h+=`<tr><td class="l">${s.nm}</td><td class="n">${dl(s.y0)} ~ ${dl(s.y1)}</td><td class="n">${fx(s.L,2)}</td><td class="n">${Math.abs(s.Da-s.Db)<1e-3?fx(s.Da,3):fx(s.Da,3)+" → "+fx(s.Db,3)}</td><td class="n">${s.t}</td><td class="n">${fx(s.W,0)}</td><td class="n">${fx(s.W/G,1)}</td></tr>`);
  h+=`<tr class="tot"><td class="l" colspan="5">말뚝 합계 (길이 ${fx(P.mtop-g.yToe,2)} m)</td><td class="n">${fx(W.Wp,0)}</td><td class="n">${fx(W.Wp/G,1)}</td></tr></tbody></table></div>`;
  h+=`<h3>2. 트랜지션피스 · 그라우트 · 2차 부재</h3><div class="eq">TP: ${g.grout?`그라우트 연결, 외경 D<sub>TP</sub> = ${fx(g.Dtop,3)} + 2 × (${P.mgap} + ${fx(g.tTP,3)}) = ${fx(g.DTP,3)} m
연결 길이 L<sub>g</sub> = 1.5 × D<sub>top</sub> = 1.5 × ${fx(g.Dtop,3)} = ${fx(g.Lov,3)} m (가정 기준),  TP 범위 ${dl(g.yTP0)} ~ ${dl(g.yTP1)}`:`볼트(플랜지) 연결, 외경 = 말뚝 상단 ${fx(g.Dtop,3)} m,  TP 범위 ${dl(g.yTP0)} ~ ${dl(g.yTP1)}`}
W<sub>TP</sub> = π × ${fx(g.tTP,3)} × (${fx(g.DTP,3)} − ${fx(g.tTP,3)}) × ${fx(g.yTP1-g.yTP0,3)} × ${P.mgs} = ${fx(W.WTP,0)} kN (${fx(W.WTP/G,1)} t)${g.grout?`
그라우트 V<sub>g</sub> = π/4 × {(${fx(g.Dtop,3)} + 2×${P.mgap})² − ${fx(g.Dtop,3)}²} × ${fx(g.Lov,3)} = ${fx(W.Vg,2)} m³ → ${fx(W.Wg,0)} kN`:""}
2차 부재 (플랫폼·접안시설·J-튜브 등) = ${fx(W.Wsec,0)} kN (가정값)</div>`;
  h+=`<h3>3. 해저면 연직력</h3><div class="tblwrap"><table class="t"><thead><tr><th>구분</th><th>중량 (kN)</th><th>작용 표고</th></tr></thead><tbody>
  <tr><td class="l">강관 (해저면 ${dl(R.yML)} 위)</td><td class="n">${fx(W.Wpa,0)}</td><td class="n">${dl(W.yPa)}</td></tr>
  <tr><td class="l">트랜지션피스</td><td class="n">${fx(W.WTP,0)}</td><td class="n">${dl(W.yTPc)}</td></tr>
  <tr><td class="l">그라우트</td><td class="n">${fx(W.Wg,0)}</td><td class="n">${g.grout?dl(W.yGc):"—"}</td></tr>
  <tr><td class="l">2차 부재</td><td class="n">${fx(W.Wsec,0)}</td><td class="n">${dl(R.yIf)}</td></tr>
  <tr class="sub"><td class="l">기초 구조 소계</td><td class="n">${fx(W.Wtot,0)}</td><td></td></tr>
  <tr><td class="l">부력 (잠긴 강재·그라우트, 설계조위)</td><td class="n">−${fx(W.U,0)}</td><td></td></tr>
  <tr><td class="l">터빈+타워</td><td class="n">${fx(W.Wt,0)}</td><td class="n">${dl(W.yt)}</td></tr>
  <tr class="tot"><td class="l">해저면 연직력 (자중)</td><td class="n">${fx(W.Wtot-W.U+W.Wt,0)}</td><td></td></tr></tbody></table></div>
  <p class="note">말뚝 안 해수는 자유롭게 드나들어 연직력에 넣지 않습니다(지진 질량에는 넣음). 하중조합의 터빈 연직력은 하중표 값을 씁니다.</p>`;
  return h;
}
function htmlMonoChk(){
  const P=R.P, S=R.sec;
  let h=`<h3>1. 두께 구간 · D/t</h3><div class="tblwrap"><table class="t"><thead><tr><th>구간</th><th>표고</th><th>최대 직경 (m)</th><th>두께 (mm)</th><th>D/t</th><th>판정 (≤ 120)</th></tr></thead><tbody>`;
  R.wt.segs.forEach(s=>h+=`<tr><td class="l">${s.nm}</td><td class="n">${dl(s.y0)} ~ ${dl(s.y1)}</td><td class="n">${fx(Math.max(s.Da,s.Db),3)}</td><td class="n">${s.t}</td><td class="n">${fx(s.DtMax,1)}</td><td>${okt(s.DtMax<=120)}</td></tr>`);
  h+=`</tbody></table></div><p class="note">D/t 120은 대구경 모노파일 실무 범위의 상한(가정)입니다. 쉘 국부좌굴 강도는 다음 단계에서 DNV-RP-C202로 계산합니다.</p>`;
  h+=`<h3>2. 해저면 단면 응력 (예비, 탄성)</h3><div class="eq">단면 위치 ${dl(S.y)},  D = ${fx(S.D,3)} m,  t = ${fx(S.tn*1000,0)} − 부식 여유 ${P.mca} = ${fx(S.tc*1000,1)} mm
A = π/4·(D² − D<sub>i</sub>²) = ${fx(S.A,4)} m²,  I = π/64·(D⁴ − D<sub>i</sub>⁴) = ${fx(S.I,4)} m⁴,  Z = 2I/D = ${fx(S.Z,4)} m³
σ = V/A + M/Z,  설계강도 f<sub>d</sub> = f<sub>y</sub>/γ<sub>M</sub> = ${P.mfy} / ${P.mgM} = ${fx(S.fd,1)} MPa</div>
  <div class="tblwrap"><table class="t"><thead><tr><th>조합</th><th>V (kN)</th><th>M (kN·m)</th><th>σ<sub>N</sub> (MPa)</th><th>σ<sub>M</sub> (MPa)</th><th>σ (MPa)</th><th>응력비</th><th>판정</th></tr></thead><tbody>`;
  R.LC.forEach(l=>h+=`<tr class="${l===R.govLC?"gov":""}"><td class="l">${l.id} ${l.nm}</td><td class="n">${fx(l.V,0)}</td><td class="n">${fx(l.M,0)}</td><td class="n">${fx(l.sigN,1)}</td><td class="n">${fx(l.sigM,1)}</td><td class="n">${fx(l.sig,1)}</td><td class="n">${l.ratio===null?"—":fx(l.ratio,3)}</td><td>${l.ratio===null?'<span class="note">회전각 검토용</span>':okt(l.ok)}</td></tr>`);
  h+=`</tbody></table></div><p class="note">말뚝의 최대 모멘트는 해저면 아래에서 생기고 해저면 값보다 큽니다. 깊이별 검토는 아래 3절(p-y 해석 결과)입니다.</p>`;
  const Y=R.py;
  h+=`<h3>3. 깊이별 응력 · 쉘 좌굴 (p-y 해석 모멘트, DNV-RP-C202)</h3><div class="eq">σ<sub>a</sub> = V/A,  σ<sub>m</sub> = M(x)/Z  (부식 여유 ${P.mca} mm 공제),  응력비 = (σ<sub>a</sub> + σ<sub>m</sub>) / (f<sub>y</sub>/γ<sub>M</sub>)
좌굴: f<sub>E</sub> = C·π²E/{12(1−ν²)}·(t/l)²,  C = √{1 + (ρξ)²},  ξ = 0.702Z,  Z = l²/(rt)·√(1−ν²),  ρ<sub>축</sub> = 0.5(1 + r/150t)<sup>−0.5</sup>,  ρ<sub>휨</sub> = 0.5(1 + r/300t)<sup>−0.5</sup>
λ̄² = f<sub>y</sub>/σ<sub>j</sub>·(σ<sub>a</sub>/f<sub>Ea</sub> + σ<sub>m</sub>/f<sub>Em</sub>),  f<sub>ks</sub> = f<sub>y</sub>/√(1 + λ̄⁴),  γ<sub>M</sub> = 1.15 (λ̄ &lt; 0.5), 0.85 + 0.6λ̄ (≤ 1.0), 1.45,  이용률 = σ<sub>j</sub> / (f<sub>ks</sub>/γ<sub>M</sub>)</div>`;
  Y.chk.forEach((c,j)=>{ const r=Y.res[j]; if(r.kind==="SLS") return; const b=c.bk;
    if(b) h+=`<div class="eq">${r.id} 좌굴 최대 위치 해저면 아래 ${fx(b.x,1)} m: D ${fx(b.D,3)} m, t ${fx(b.tc*1000,1)} mm, r/t ${fx(b.r/b.tc,1)},  f<sub>Ea</sub> ${fx(b.fEa,0)}, f<sub>Em</sub> ${fx(b.fEm,0)} MPa
σ<sub>a</sub> ${fx(b.sa,1)} + σ<sub>m</sub> ${fx(b.sm,1)} = ${fx(b.sj,1)} MPa,  λ̄ ${fx(b.lam,3)},  f<sub>ks</sub> ${fx(b.fks,1)} MPa,  γ<sub>M</sub> ${fx(b.gM,3)} → 이용률 ${fx(b.u,3)} ${b.u<=1?"O.K":"N.G"}</div>`; });
  const r2=Y.res[1], c2=Y.chk[1];
  h+=`<div class="tblwrap"><table class="t"><thead><tr><th>해저면 아래 (m)</th><th>D (m)</th><th>t (mm)</th><th>M (kN·m)</th><th>σ<sub>a</sub></th><th>σ<sub>m</sub></th><th>응력비</th><th>좌굴 이용률</th></tr></thead><tbody>`;
  c2.rows.filter((x,i)=>i%2===0).forEach(x=>h+=`<tr><td class="n">${fx(x.x,1)}</td><td class="n">${fx(x.D,3)}</td><td class="n">${fx(x.tc*1000,1)}</td><td class="n">${fx(x.M,0)}</td><td class="n">${fx(x.sa,1)}</td><td class="n">${fx(x.sm,1)}</td><td class="n">${fx(x.uy,3)}</td><td class="n">${fx(x.ub,3)}</td></tr>`);
  h+=`</tbody></table></div><p class="note">표는 ${r2.id} ${r2.nm} 결과입니다. 최대 응력비 ${fx(Y.um,3)}, 최대 좌굴 이용률 ${fx(Y.ub,3)} (폭풍·지진 중 큰 값). 해저면 위 구간은 2절 해저면 값이 가장 큽니다.</p>`;
  return h;
}
/* ---------- 지층 표 ---------- */
const SOILCOL=[["nm","층 이름","t"],["ty","종류","s"],["bot","하단 깊이 (m)","n"],["g","γ′ (kN/m³)","n"],["phi","φ (°)","n","sand"],["su1","Su 상단 (kPa)","n","clay"],["su2","Su 하단 (kPa)","n","clay"],["qu","q_u (MPa)","n","rock"],["Em","E_m (MPa)","n","rock"],["rqd","RQD (%)","n","rock"]];
function fillSoilSel(){ $("soilPre").innerHTML=SOIL_PRESETS.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join("")+`<option value="user">직접 입력 · 지반조사 결과</option>`; }
function applySoilPre(){ const id=$("soilPre").value, pr=SOIL_PRESETS.find(p=>p.id===id);
  if(pr){ ST.soil=pr.layers.map(l=>({...l})); ST.soilPre=id; drawSoil(); run(); toast(`가정 지반을 불러왔습니다: ${pr.name}`); } else { ST.soilPre="user"; run(); } }
function soilNote(){ const pr=SOIL_PRESETS.find(p=>p.id===ST.soilPre);
  return pr?`지금 지층은 가정값입니다 (${pr.name}). 지반조사가 나오면 "지층 표 열기"에서 고치거나 엑셀 표를 붙여넣으세요. 고치면 '직접 입력'으로 바뀝니다.`:`직접 입력한 지층 ${ST.soil.length}개 층으로 해석합니다.`; }
function drawSoil(){
  const el=$("soilEd"); if(!el) return;
  const L=ST.soil||[], pr=SOIL_PRESETS.find(p=>p.id===ST.soilPre);
  let h=`<h3>지층 (깊이는 원지반 아래 m, 마지막 층은 아래로 계속)</h3>
  <p class="${pr?"warn":"note"}" style="margin:0 0 8px">${pr?`가정 지반: ${esc(pr.name)} — 지반조사 전 임시값입니다.`:"직접 입력 · 지반조사 결과 (지반 파일 가져오기 포함)"}</p>
  <div class="tblwrap"><table class="soil"><thead><tr>${SOILCOL.map(c=>`<th>${c[1]}</th>`).join("")}<th></th></tr></thead><tbody>`;
  L.forEach((l,i)=>{ h+=`<tr>`+SOILCOL.map(([k,,t,only])=>{ const id=`sl_${i}_${k}`;
      if(t==="s") return `<td><select id="${id}" aria-label="${i+1}층 종류">${Object.entries(SOIL_TY).map(([v,n])=>`<option value="${v}"${l.ty===v?" selected":""}>${n}</option>`).join("")}</select></td>`;
      if(t==="t") return `<td><input class="nm" id="${id}" type="text" value="${esc(l.nm||"")}" aria-label="${i+1}층 이름"></td>`;
      return `<td><input id="${id}" type="number" step="any" value="${l[k]??""}" ${only&&only!==l.ty?"disabled":""} aria-label="${i+1}층 ${k}"></td>`; }).join("")+`<td><button type="button" data-sdel="${i}" aria-label="${i+1}층 삭제">✕</button></td></tr>`; });
  h+=`</tbody></table></div><div class="dl" style="margin:8px 0"><button class="btn small" type="button" id="soilAdd">층 추가</button><button class="btn small" type="button" id="soilImpBtn">지반 파일 가져오기</button><button class="btn small" type="button" id="soilExp">지반 파일로 저장</button><input type="file" id="soilImp" accept=".json,application/json" hidden><button class="btn small" type="button" id="soilPasteBtn">엑셀 표 붙여넣기</button></div>
  <div class="soilpaste" id="soilPaste" hidden><p class="note">엑셀에서 10열(층 이름, 종류, 하단 깊이, γ′, φ, Su 상단, Su 하단, q_u, E_m, RQD)을 복사해 붙여넣으세요. 종류는 모래·점토·암반(또는 sand·clay·rock). 해당 없는 칸은 비워 둡니다.</p>
  <textarea id="soilTxt" spellcheck="false" placeholder="해성 점토	점토	6	6.5		10	35"></textarea><div class="dl" style="margin-top:6px"><button class="btn primary small" type="button" id="soilApply">표로 바꾸기</button><span class="note" id="soilMsg"></span></div></div>`;
  el.innerHTML=h;
  el.querySelectorAll("input,select").forEach(inp=>{ if(!inp.id.startsWith("sl_")) return; inp.addEventListener(inp.tagName==="SELECT"?"change":"input",()=>{
    const [,i,k]=inp.id.split("_"); const l=ST.soil[+i]; l[k]=k==="nm"?inp.value:k==="ty"?inp.value:(inp.value===""?undefined:parseFloat(inp.value));
    if(k==="ty"){ if(l.ty==="sand"&&!(l.phi>0)) l.phi=30; if(l.ty==="clay"&&!(l.su1>0)){ l.su1=20; l.su2=40; } if(l.ty==="rock"&&!(l.qu>0)){ l.qu=5; l.Em=500; l.rqd=0; } drawSoil(); }
    soilUser(); schedRun(); }); });
  el.querySelectorAll("[data-sdel]").forEach(b=>b.addEventListener("click",()=>{ if(ST.soil.length<=1){ toast("지층은 하나 이상 있어야 합니다"); return; } ST.soil.splice(+b.dataset.sdel,1); soilUser(); drawSoil(); run(); }));
  $("soilAdd").onclick=()=>{ const last=ST.soil[ST.soil.length-1]; ST.soil.push({...last,nm:"새 층",bot:(last?last.bot:0)+10}); soilUser(); drawSoil(); run(); };
  /* 지반 파일 (.json): {app:"gbs-tool-soil", ver:1, name, layers:[...]} — 현장 지반자료는 도구에 넣지 않고 파일로 관리 */
  $("soilImpBtn").onclick=()=>$("soilImp").click();
  $("soilImp").onchange=async e=>{ const f=e.target.files[0]; e.target.value=""; if(!f) return;
    try{ const o=JSON.parse(await f.text()), L=o.layers||(o.P&&o.P.soil)||o.soil||(Array.isArray(o)?o:null);
      const out=(L||[]).filter(l=>l&&SOIL_TY[l.ty]&&Number(l.bot)>0).map(l=>({nm:String(l.nm||SOIL_TY[l.ty]),ty:l.ty,bot:+l.bot,g:+l.g||(l.ty==="clay"?7:l.ty==="sand"?9:11),phi:l.phi!=null?+l.phi:undefined,su1:l.su1!=null?+l.su1:undefined,su2:l.su2!=null?+l.su2:undefined,qu:l.qu!=null?+l.qu:undefined,Em:l.Em!=null?+l.Em:undefined,rqd:l.rqd!=null?+l.rqd:0})).sort((a,b)=>a.bot-b.bot);
      if(!out.length){ toast("지층 자료를 찾지 못했습니다. 지반 파일(.json)인지 확인하세요."); return; }
      ST.soil=out; soilUser(); drawSoil(); run(); toast(`지반 파일을 가져왔습니다${o.name?`: ${o.name}`:""} (${out.length}개 층)`); }
    catch(err){ toast("지반 파일을 읽지 못했습니다"); } };
  $("soilExp").onclick=()=>saveFile(`지반_${stamp()}.json`,JSON.stringify({app:"gbs-tool-soil",ver:1,name:$("svName").value.trim()||"지층",layers:ST.soil},null,1));
  $("soilPasteBtn").onclick=()=>{ $("soilPaste").hidden=!$("soilPaste").hidden; if(!$("soilPaste").hidden){ $("soilTxt").value=ST.soil.map(l=>[l.nm,SOIL_TY[l.ty],l.bot,l.g,l.phi??"",l.su1??"",l.su2??"",l.qu??"",l.Em??"",l.rqd??""].join("\t")).join("\n"); $("soilTxt").focus(); } };
  $("soilApply").onclick=()=>{ const rows=$("soilTxt").value.split(/\r?\n/).map(r=>r.split("\t")).filter(r=>r.join("").trim()), out=[];
    const tyOf=v=>{ v=String(v||"").trim().toLowerCase(); return /모래|사질|sand/.test(v)?"sand":/점토|점성|실트|clay|silt/.test(v)?"clay":/암|rock/.test(v)?"rock":null; };
    for(const r of rows){ const ty=tyOf(r[1]), n=j=>{ const v=parseFloat(String(r[j]??"").replace(/,/g,"")); return isFinite(v)?v:undefined; };
      if(!ty||!(n(2)>0)){ continue; } out.push({nm:(r[0]||"").trim()||SOIL_TY[ty],ty,bot:n(2),g:n(3)??(ty==="clay"?7:ty==="sand"?9:11),phi:n(4),su1:n(5),su2:n(6)??n(5),qu:n(7),Em:n(8),rqd:n(9)??0}); }
    if(!out.length){ $("soilMsg").textContent="읽은 층이 없습니다. 종류와 하단 깊이 열을 확인하세요."; return; }
    out.sort((a,b)=>a.bot-b.bot); const bad=out.filter(l=>(l.ty==="sand"&&!(l.phi>0))||(l.ty==="clay"&&!(l.su1>0))||(l.ty==="rock"&&!(l.qu>0&&l.Em>0)));
    ST.soil=out; soilUser(); drawSoil(); run(); toast(`지층 ${out.length}개 층을 넣었습니다${bad.length?` (강도 값이 빈 층 ${bad.length}개 확인 필요)`:""}`); };
}
function soilUser(){ if(ST.soilPre!=="user"){ ST.soilPre="user"; $("soilPre").value="user"; } }

/* 깊이별 그래프 (위 = 해저면) */
function depthSVG(series,Le,xlab,unit){
  const W=300,H=260,ml=40,mr=12,mt=12,mb=34;
  let lo=0,hi=0; series.forEach(s=>s.v.forEach(v=>{ if(v<lo) lo=v; if(v>hi) hi=v; })); if(hi===lo) hi=lo+1; const pad=(hi-lo)*0.06; lo-=lo<0?pad:0; hi+=pad;
  const X=v=>ml+(W-ml-mr)*(v-lo)/(hi-lo), Y=x=>mt+(H-mt-mb)*x/Le;
  const tk=(a,b)=>{ const n=b-a, s=Math.pow(10,Math.floor(Math.log10(n/4))), m=[1,2,5,10].find(m=>n/(m*s)<=5)*s, r=[]; for(let v=Math.ceil(a/m)*m; v<=b+1e-9; v+=m) r.push(+v.toPrecision(6)); return r; };
  let g=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${xlab} 깊이 분포">`;
  tk(lo,hi).forEach(v=>g+=`<line x1="${X(v)}" y1="${mt}" x2="${X(v)}" y2="${H-mb}" stroke="var(--line)" stroke-width="${v===0?1:.6}"/><text x="${X(v)}" y="${H-mb+12}" font-size="9" fill="var(--muted)" text-anchor="middle" font-family="var(--f-num)">${v}</text>`);
  tk(0,Le).forEach(v=>g+=`<text x="${ml-4}" y="${Y(v)+3}" font-size="9" fill="var(--muted)" text-anchor="end" font-family="var(--f-num)">${v}</text>`);
  series.forEach(s=>{ g+=`<polyline points="${s.v.map((v,i)=>`${X(v).toFixed(1)},${Y(s.x[i]).toFixed(1)}`).join(" ")}" fill="none" stroke="${s.c}" stroke-width="1.6" ${s.dash?'stroke-dasharray="4 3"':""}/>`; });
  g+=`<line x1="${ml}" y1="${mt}" x2="${W-mr}" y2="${mt}" stroke="var(--muted)" stroke-width=".8"/><text x="${(ml+W-mr)/2}" y="${H-6}" font-size="10" fill="var(--ink)" text-anchor="middle">${xlab}${unit?` (${unit})`:""}</text>`;
  g+=`<text x="10" y="${(mt+H-mb)/2}" font-size="10" fill="var(--ink)" transform="rotate(-90 10 ${(mt+H-mb)/2})" text-anchor="middle">해저면 아래 깊이 (m)</text></svg>`;
  return g;
}
function freqWarns(R){ const F=R.fq, T=R.T, w=[];
  if(!F.cal) w.push({k:"noFref",msg:`선택 터빈(${T.name})에 타워 치수와 기준 고유진동수가 없어 구조물 고유진동수를 계산하지 못했습니다.`});
  else if(F.ok===false){ const z=[F.zL,F.zH].find(z=>!z.ok); w.push({k:"freq",msg:`1차 고유진동수 ${F.lo.f.toFixed(3)}~${F.hi.f.toFixed(3)} Hz가 ${z.nm}에 있습니다 (soft-stiff 허용 ${F.band.lo.toFixed(3)}~${F.band.hi.toFixed(3)} Hz, stiff-stiff ${F.band.sl.toFixed(3)} Hz 이상${F.band.r.est?", 회전수는 추정값":""}).`}); }
  return w; }
function modeSVG(F){
  const W=300,H=300,ml=40,mr=12,mt=10,mb=30, y0=F.yN[0], y1=F.yN[F.yN.length-1];
  const nrm=m=>{ const a=Math.max(...m.map(Math.abs))||1, s=m[m.length-1]<0?-1:1; return m.map(v=>s*v/a); };
  const X=v=>ml+(W-ml-mr)*(v+0.1)/1.2, Y=y=>mt+(H-mt-mb)*(y1-y)/(y1-y0);
  let g=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="1차 모드 형상">`;
  [[R.P.hwl,"설계조위","var(--water-line)"],[R.yML,"해저면","var(--soil)"],[R.yIf,"인터페이스","var(--muted)"]].forEach(([y,s,c])=>g+=`<line x1="${ml}" y1="${Y(y)}" x2="${W-mr}" y2="${Y(y)}" stroke="${c}" stroke-width=".8" stroke-dasharray="3 2"/><text x="${W-mr}" y="${Y(y)-3}" font-size="9" fill="var(--muted)" text-anchor="end">${s}</text>`);
  g+=`<line x1="${X(0)}" y1="${mt}" x2="${X(0)}" y2="${H-mb}" stroke="var(--line)"/>`;
  [[F.lo.mode,"var(--l-wave)"],[F.hi.mode,"var(--l-wind)"]].forEach(([m,c])=>{ const v=nrm(m); g+=`<polyline points="${v.map((x,i)=>`${X(x).toFixed(1)},${Y(F.yN[i]).toFixed(1)}`).join(" ")}" fill="none" stroke="${c}" stroke-width="1.6"/>`; });
  for(let y=Math.ceil(y0/20)*20;y<=y1;y+=20) g+=`<text x="${ml-4}" y="${Y(y)+3}" font-size="9" fill="var(--muted)" text-anchor="end" font-family="var(--f-num)">${y}</text>`;
  g+=`<text x="${(ml+W-mr)/2}" y="${H-8}" font-size="10" fill="var(--ink)" text-anchor="middle">1차 모드 (허브 = 1)</text><text x="10" y="${(mt+H-mb)/2}" font-size="10" fill="var(--ink)" transform="rotate(-90 10 ${(mt+H-mb)/2})" text-anchor="middle">DL 표고 (m)</text></svg>`;
  return g; }
function htmlMonoFreq(){
  const P=R.P, F=R.fq, T=R.T;
  let h=`<h3>7. 고유진동수 (타워 · 기초 · 지반 보 모델)</h3>`;
  if(!F.cal) return h+`<p class="warn">선택 터빈(${esc(T.name)})에 타워 치수와 기준 고유진동수가 없습니다. 터빈 편집에 타워 길이·직경과 RNA·타워 중량을 넣거나, "기준 고유진동수"에 타워 하단 고정 조건의 1차 진동수를 넣으면 계산합니다.</p>`;
  const c=F.cal, b=F.band;
  if(c.mode==="geom") h+=`<div class="eq">① 타워 강성 (치수로 계산): 길이 ${fx(c.Lt,1)} m, 직경 Ø${c.Db} → Ø${c.Dt} m 직선 변화
   등가 두께 t = ${c.shell} × 타워 질량 / (ρ<sub>s</sub>·π·D<sub>평균</sub>·L) = ${c.shell} × ${fx(c.mT,0)} / (${fx(P.mgs/G,3)} × π × ${fx((c.Db+c.Dt)/2,3)} × ${fx(c.Lt,1)}) = ${fx(c.t*1000,1)} mm  (플랜지·내부 설비를 10 %로 보고 뺌, 가정)
   EI(s) = E·π/64·{D(s)⁴ − (D(s) − 2t)⁴},  하단 EI = ${c.EI0.toExponential(3)} kN·m²,  RNA ${fx(c.mR,0)} t를 타워 꼭대기에 집중
   → 타워만 (하단 고정) f = ${fx(c.fchk,4)} Hz`;
  else h+=`<div class="eq">① 타워 강성 역산: ${esc(T.name)} 기준 고유진동수 f<sub>ref</sub> = ${T.fref} Hz를 타워 하단(인터페이스 ${dl(c.yIf)}) 고정 조건의 값으로 보고 타워 휨강성을 맞춤
   타워 길이 = 허브 ${T.hub} − 인터페이스 ${T.ifz} = ${fx(c.Lt,1)} m,  직경이 위로 ${c.r}배까지 줄어드는 강관(가정): EI(s) = EI₀·(1 − ${fx(1-c.r,1)}s)³, 질량 ∝ (1 − ${fx(1-c.r,1)}s)
   질량: RNA ${fx(c.mR,1)} t (허브 집중), 타워 ${fx(c.mT,1)} t${c.split?" (터빈 입력값)":` (총중량 ${fx(turbWeight(T)/G,1)} t를 RNA 40 % · 타워 60 %로 나눔, 가정)`}
   → EI₀ = ${c.EI0.toExponential(3)} kN·m²  (검산 f = ${fx(c.fchk,4)} Hz)`;
  h+=`
② 전체 모델: 말뚝 선단 ${dl(R.g.yToe)} ~ 허브 ${dl(F.yHub)}, 보 요소 ${F.nEl}개, 일관 질량행렬, 역반복법
   해저면 아래: 강관 + 관내 토사 질량, 절점마다 수평 지반 스프링 (말뚝 해석 탭 1절 p-y 곡선의 할선 강성)
   해저면 ~ 인터페이스: 강관·TP·그라우트, 물속은 관내 해수 + 부가질량 (배제수, C<sub>a</sub> = 1, 해양생물 두께 포함), 인터페이스에 2차 부재 ${fx(P.mWsec/G,1)} t
   지반 강성 두 경우: ${F.small?"상시(LC1) 해석이 수렴하지 않아 작은 변위(직경의 10⁻⁴·10⁻⁵)의 할선 강성으로 계산 — 실제보다 높게 나옴":"상시(LC1) 변위에서의 할선 강성 = 하한,  그 변위의 1/10에서의 할선 강성 = 상한 (초기 강성 근사)"}</div>
  <div class="tblwrap"><table class="t" style="max-width:720px"><thead><tr><th>구분</th><th>1차 고유진동수 (Hz)</th><th>주기 (s)</th></tr></thead><tbody>
  <tr><td class="l">타워만 (하단 고정${c.mode==="geom"?"":", 역산 기준"})</td><td class="n">${fx(c.fchk,4)}</td><td class="n">${fx(1/c.fchk,2)}</td></tr>
  <tr><td class="l">말뚝 해저면 고정 (지반 무한 강성)</td><td class="n">${fx(F.fix.f,4)}</td><td class="n">${fx(1/F.fix.f,2)}</td></tr>
  <tr class="tot"><td class="l">지반 스프링 — 상한 (초기 강성)</td><td class="n">${fx(F.hi.f,4)}</td><td class="n">${fx(1/F.hi.f,2)}</td></tr>
  <tr class="tot"><td class="l">지반 스프링 — 하한 (상시 할선 강성)</td><td class="n">${fx(F.lo.f,4)}</td><td class="n">${fx(1/F.lo.f,2)}</td></tr></tbody></table></div>`;
  h+=`<div class="plots"><div class="sheet">${modeSVG(F)}</div></div><div class="legend"><span><i style="background:var(--l-wave)"></i>하한</span><span><i style="background:var(--l-wind)"></i>상한</span></div>`;
  h+=bandHtml(b,[["지반 하한",F.lo.f],["지반 상한",F.hi.f]],P,T);
  if(c.mode!=="geom") h+=`<p class="note">기준 진동수 ${T.fref} Hz를 타워 하단 고정 값으로 보고 타워 강성을 역산했습니다. 기준 진동수가 기초까지 포함한 값이면 역산한 타워 강성은 실제보다 약간 작고, 모노파일 진동수도 약간 낮게 나옵니다. 타워 제원(높이별 직경·두께)이나 제작사 진동수가 오면 바꾸세요.</p>`;
  return h;
}
const LCC=["var(--l-wind)","var(--l-wave)","var(--dim)"];
function htmlMonoPy(){
  const P=R.P, Y=R.py, sp=Y.sp, L=sp.L, pr=SOIL_PRESETS.find(p=>p.id===P.soilPre);
  let h=`<h3>1. 지층별 계수 (입력 강도로 계산)</h3>`;
  if(pr) h+=`<p class="warn">가정 지반(${esc(pr.name)})으로 해석한 결과입니다. 현장 지반조사 결과로 바꾸기 전에는 참고값입니다.</p>`;
  h+=`<div class="tblwrap"><table class="t"><thead><tr><th>층</th><th>깊이 (m)</th><th>종류</th><th>입력</th><th>p-y 계수 (계산)</th><th>축방향 계수</th></tr></thead><tbody>`;
  L.forEach((l,i)=>{ const top=sp.tops[i]; let inp="",co="",axc="";
    if(l.ty==="sand"){ const c=sandCoef(l.phi), a=sandAxial(l.phi); inp=`φ ${l.phi}°, γ′ ${l.g}`; co=`C₁ ${fx(c.C1,3)}, C₂ ${fx(c.C2,3)}, C₃ ${fx(c.C3,2)}, k ${fx(c.k/1000,1)} MN/m³`; axc=`${a.cls}: β ${a.b}, f<sub>max</sub> ${a.fm} kPa, N<sub>q</sub> ${a.Nq}`; }
    else if(l.ty==="clay"){ inp=`Su ${l.su1} → ${l.su2} kPa, γ′ ${l.g}`; co=`ε₅₀ ${eps50(l.su1)} → ${eps50(l.su2)}, J 0.5`; axc="α = 0.5ψ<sup>−0.5</sup> (ψ ≤ 1), 0.5ψ<sup>−0.25</sup>, 선단 9Su"; }
    else if(l.ty==="rock"){ inp=`q<sub>u</sub> ${l.qu} MPa, E<sub>m</sub> ${l.Em} MPa, RQD ${l.rqd||0}%`; co=`α<sub>r</sub> = 1 − ⅔·RQD/100 = ${fx(1-2/3*(l.rqd||0)/100,3)}, k<sub>rm</sub> 5×10⁻⁵`; axc=`f = 0.2√q<sub>u</sub> = ${fx(0.2*Math.sqrt(l.qu)*1000,0)} kPa (가정), 선단 2.5q<sub>u</sub>`; }
    h+=`<tr><td class="l">${esc(l.nm||"")}</td><td class="n">${fx(top,1)} ~ ${i===L.length-1?"":fx(l.bot,1)}</td><td>${SOIL_TY[l.ty]||l.ty}</td><td class="l">${inp}</td><td class="fm">${co}</td><td class="fm">${axc}</td></tr>`; });
  h+=`</tbody></table></div>`;
  h+=`<div class="eq">모래 (API RP 2GEO): p<sub>u</sub> = min{(C₁x + C₂D)γ′x, C₃Dγ′x},  p = A·p<sub>u</sub>·tanh(k·x·y / A·p<sub>u</sub>),  A = max(0.9, 3 − 0.8x/D)
  C₁ = tan²β·tanα/tan(β−φ) + K₀{tanφ·sinβ/(cosα·tan(β−φ)) + tanβ(tanφ·sinβ − tanα)},  C₂ = tanβ/tan(β−φ) − K<sub>a</sub>,  C₃ = K<sub>a</sub>(tan⁸β − 1) + K₀·tanφ·tan⁴β  (α = φ/2, β = 45° + φ/2, K₀ = 0.4)
점토 (API, Matlock): p<sub>u</sub> = min{3Su + γ′x + J·Su·x/D, 9Su}·D,  p = 0.5p<sub>u</sub>(y/y₅₀)<sup>1/3</sup> (y ≤ 8y₅₀),  y₅₀ = 2.5ε₅₀D
암반 (Reese 연암): p<sub>ur</sub> = α<sub>r</sub>q<sub>u</sub>D(1 + 1.4x<sub>r</sub>/D) (x<sub>r</sub> ≤ 3D), 5.2α<sub>r</sub>q<sub>u</sub>D (그 아래),  K<sub>ir</sub> = (100 + 400x<sub>r</sub>/3D)E<sub>m</sub> ≤ 500E<sub>m</sub>,  p = p<sub>ur</sub>/2·(y/y<sub>rm</sub>)<sup>1/4</sup>,  y<sub>rm</sub> = k<sub>rm</sub>D
x: 해저면(세굴 후 ${dl(R.yML)}) 아래 깊이,  x<sub>r</sub>: 암반 상면 아래 깊이</div>
  <p class="note">API·Reese 곡선은 직경 2 m 안팎의 말뚝 시험으로 만든 식이라 직경 ${fx(sp.D,1)} m 모노파일에서는 초기 강성을 작게 보는 경향이 있습니다(변위·회전은 크게, 고유진동수는 낮게 나옴). 실시설계에서는 PISA 방식이나 3차원 해석으로 확인합니다.</p>`;
  h+=`<h3>2. 해석 모델</h3><div class="eq">해저면 아래 ${fx(sp.Le,2)} m를 보 요소 ${sp.n}개(Δx = ${fx(sp.h,3)} m)로 나누고 절점마다 비선형 지반 스프링, 뉴턴-랩슨 반복 (하중 증분 8단계, 수렴 안 하면 증분을 나눔)
EI: E = 210 GPa, 높이별 단면 (공칭 두께),  하중: 해저면에 H, M (하중 탭 8절 하중조합 합계)</div>`;
  h+=`<h3>3. 해석 결과</h3><div class="tblwrap"><table class="t"><thead><tr><th>조합</th><th>H (kN)</th><th>M (kN·m)</th><th>해저면 변위 (mm)</th><th>해저면 회전각 (°)</th><th>선단 변위 (mm)</th><th>최대 모멘트 (kN·m)</th><th>위치 (해저면 아래 m)</th><th>지반 저항 동원율 최대</th><th>수렴</th></tr></thead><tbody>`;
  Y.res.forEach(r=>h+=`<tr><td class="l">${r.id} ${r.nm}</td><td class="n">${fx(r.H,0)}</td><td class="n">${fx(r.M,0)}</td><td class="n">${fx(r.w0*1000,1)}</td><td class="n">${fx(Math.abs(r.th0)*180/PI,4)}</td><td class="n">${fx(r.wT*1000,2)}</td><td class="n">${fx(r.Mmax,0)}</td><td class="n">${fx(r.xM,1)}</td><td class="n">${fx(Math.max(...r.mob),2)}</td><td>${okt(r.ok)}</td></tr>`);
  h+=`</tbody></table></div>`;
  const ser=(k,f)=>Y.res.map((r,i)=>({x:r.x,v:r[k].map(f||(v=>v)),c:LCC[i],dash:i===2}));
  h+=`<div class="legend">${Y.res.map((r,i)=>`<span><i style="background:${LCC[i]}"></i>${r.id} ${r.nm}</span>`).join("")}</div>
  <div class="plots"><div class="sheet">${depthSVG(ser("w",v=>v*1000),sp.Le,"변위","mm")}</div><div class="sheet">${depthSVG(ser("Mz",v=>v/1000),sp.Le,"휨모멘트","MN·m")}</div><div class="sheet">${depthSVG(ser("p"),sp.Le,"지반반력 p","kN/m")}</div></div>`;
  const rt=Y.rot;
  h+=`<h3>4. 해저면 회전각</h3><div class="eq">상시(LC1) 해저면 회전각 θ = ${fx(rt.th,4)}° ${rt.ok?"≤":"&gt;"} 허용 ${rt.lim}° → ${rt.ok?"O.K":"N.G"}</div>
  <p class="note">수렴 판정: 해저면 변위가 직경의 10 %를 넘으면 지반 저항 부족(N.G)으로 봅니다. 허용 회전각 ${rt.lim}°는 가정값입니다(설치 후 영구 기울기 0.25°, 시공 오차 포함 0.5°가 흔히 쓰이는 값). 터빈 제작사·발주처 요구값으로 바꾸세요. 반복하중에 의한 누적 회전은 별도 검토 대상입니다.</p>`;
  h+=`<h3>5. 근입깊이</h3><div class="eq">근입을 바꿔 가며 상시 회전각과 폭풍 수렴 여부를 계산.  소요 근입 = 상시 회전각이 긴 말뚝(6D = ${fx(Y.Linf||0,1)} m)의 값과 5 % 안으로 같아지고, 허용값 이하이며, 폭풍 하중에서 수렴하는 가장 짧은 근입 (격자 D/2 + 이분법, 0.5 m 올림)
소요 근입 ${Y.Lreq===null?"— (범위 안에서 찾지 못함)":fx(Y.Lreq,1)+" m"}  vs  입력 ${P.mL} m → ${Y.okEmb?"O.K":"N.G"}</div>
  <div class="tblwrap"><table class="t" style="max-width:640px"><thead><tr><th>근입 (m)</th><th>상시 회전각 (°)</th><th>상시 선단 변위 (mm)</th><th>폭풍 회전각 (°)</th><th>판정</th></tr></thead><tbody>`;
  Y.sens.forEach(s=>h+=`<tr class="${Math.abs(s.L-P.mL)<0.05?"gov":""}"><td class="n">${fx(s.L,1)}</td><td class="n">${s.th===null?"수렴 안 함":fx(s.th,4)}</td><td class="n">${s.th===null?"—":fx(s.wT*1000,2)}</td><td class="n">${s.thU===null?"수렴 안 함":fx(s.thU,4)}</td><td>${s.ok?okt(s.th<=P.mRot):okt(false)}</td></tr>`);
  h+=`</tbody></table></div>`;
  const A=Y.ax;
  h+=`<h3>6. 축방향 지지력 (API RP 2GEO, 개단 강관)</h3><div class="eq">외주면 마찰 Q<sub>so</sub> = Σ f·πD·Δx = ${fx(A.Qo,0)} kN,  관내 마찰 Q<sub>si</sub> = ${fx(A.Qi,0)} kN
선단 지지 q = ${A.qm} = ${fx(A.q,0)} kN/m² (선단 지층: ${esc(A.toeLayer)}),  강관 단면 ${fx(A.Aan,3)} m², 관내 ${fx(A.Apl,2)} m²
비폐색 Q = Q<sub>so</sub> + Q<sub>si</sub> + q·A<sub>강관</sub> = ${fx(A.Qun,0)} kN,  폐색 Q = Q<sub>so</sub> + q·(A<sub>강관</sub> + A<sub>관내</sub>) = ${fx(A.Qpl,0)} kN  → Q = ${fx(A.Q,0)} kN (${A.mode})
상시 ${fx(Y.Vs,0)} kN ≤ Q/${P.mFSc} = ${fx(A.Q/P.mFSc,0)} kN,  폭풍 ${fx(Y.Vu,0)} kN ≤ Q/${P.mFSu} = ${fx(A.Q/P.mFSu,0)} kN → ${Y.okAx?"O.K":"N.G"}</div>
  <p class="note">암반 주면마찰 0.2√q<sub>u</sub>와 선단 2.5q<sub>u</sub>는 가정값입니다. 드릴드 소켓의 그라우트 부착, 인발은 다음에 추가합니다.</p>`;
  h+=htmlMonoFreq();
  return h;
}
function htmlMonoQty(){
  const P=R.P, g=R.g, W=R.wt, q=R.qty;
  let h=`<h3>구조물 1기당 수량</h3><div class="tblwrap"><table class="t"><thead><tr><th>공종</th><th>규격</th><th>수량</th><th>단위</th><th>산식</th></tr></thead><tbody>`;
  W.segs.forEach(s=>h+=`<tr><td class="l">강관 말뚝 ${s.nm}</td><td>t ${s.t} mm</td><td class="n">${fx(s.W/G,2)}</td><td>t</td><td class="fm">π·t·(D−t)·L·γ<sub>s</sub>/g, L ${fx(s.L,2)} m</td></tr>`);
  h+=`<tr class="sub"><td class="l">강관 말뚝 소계</td><td>f<sub>y</sub> ${P.mfy} MPa</td><td class="n">${fx(W.Wp/G,2)}</td><td>t</td><td></td></tr>
  <tr><td class="l">트랜지션피스</td><td>t ${P.mtTP} mm</td><td class="n">${fx(W.WTP/G,2)}</td><td>t</td><td class="fm">Ø${fx(g.DTP,3)} × ${fx(g.yTP1-g.yTP0,2)} m</td></tr>
  <tr><td class="l">2차 부재 (가정)</td><td></td><td class="n">${fx(W.Wsec/G,2)}</td><td>t</td><td class="fm">입력값</td></tr>
  ${g.grout?`<tr><td class="l">TP 연결 그라우트</td><td>간격 ${P.mgap} m</td><td class="n">${fx(W.Vg,2)}</td><td>m³</td><td class="fm">π/4·{(D+2g)²−D²}·${fx(g.Lov,2)}</td></tr>`:""}
  ${q.Ldr>0?`<tr><td class="l">천공 구간 그라우트 (말뚝 바깥)</td><td>천공경 Ø${fx(q.Dd,2)}</td><td class="n">${fx(q.Vann,2)}</td><td>m³</td><td class="fm">π/4·(${fx(q.Dd,2)}² − ${fx(P.mD,2)}²) × ${fx(q.Ldr,2)}</td></tr>`:""}
  ${g.prot?`<tr><td class="l">세굴방지공 (사석)</td><td>Ø${fx(q.Dsc,1)} m, t ${P.mScT} m</td><td class="n">${fx(q.Vsc,1)}</td><td>m³</td><td class="fm">π/4·(${fx(q.Dsc,2)}² − ${fx(q.Dsb0,2)}²) × ${P.mScT}</td></tr>`:""}
  <tr><td class="l">외면 방식 면적 (해저면 위)</td><td></td><td class="n">${fx(q.Apaint,1)}</td><td>m²</td><td class="fm">∫ π·D dy, ${dl(R.yML)} ~ ${dl(R.yIf)}</td></tr>
  </tbody></table></div>`;
  h+=`<h3>해역이용협의 산출</h3><div class="tblwrap"><table class="t"><thead><tr><th>항목</th><th>수량</th><th>단위</th><th>산식</th></tr></thead><tbody>
  <tr><td class="l">말뚝 단면적 (해저면)</td><td class="n">${fx(q.Asb,2)}</td><td>m²</td><td class="fm">π/4 × ${fx(q.Dsb0,3)}²</td></tr>
  <tr class="tot"><td class="l">점용 면적 ${g.prot?"(세굴방지공 포함)":"(말뚝 단면)"}</td><td class="n">${fx(q.Aocc,2)}</td><td>m²</td><td class="fm">π/4 × ${fx(g.prot?q.Dsc:q.Dsb0,3)}²</td></tr>
  <tr><td class="l">설치 방식</td><td class="l" colspan="3">${instName(P.mInst)}</td></tr>
  <tr><td class="l">굴착·천공 길이</td><td class="n">${fx(q.Ldr,2)}</td><td>m</td><td class="fm">${P.mInst==="drive"?"항타 (천공 없음)":P.mInst==="drill"?"근입깊이 전체":"천공 구간 입력값"}</td></tr>
  <tr class="tot"><td class="l">굴착·천공량</td><td class="n">${fx(q.Vexc,2)}</td><td>m³</td><td class="fm">π/4 × ${fx(q.Dd,3)}² × ${fx(q.Ldr,2)}  (천공경 = D + 2 × ${P.mDrG})</td></tr>
  <tr><td class="l">말뚝 안 토사 (항타 구간, 존치)</td><td class="n">${fx(q.Vplug,1)}</td><td>m³</td><td class="fm">π/4 × D<sub>i</sub>² × ${fx(P.mL-q.Ldr,2)}</td></tr>
  ${g.prot?`<tr><td class="l">세굴방지공 포설 면적</td><td class="n">${fx(q.Asc,1)}</td><td>m²</td><td class="fm">π/4·(${fx(q.Dsc,2)}² − ${fx(q.Dsb0,2)}²)</td></tr>`:""}
  </tbody></table></div><p class="note">굴착량은 천공 원통 체적(π/4·천공경²·천공 길이)입니다. 이전 해역이용협의 산출서의 방식(여굴·준설 포함 여부)과 다르면 알려 주세요. 세굴방지공 외경 ${P.mScK}D, 두께 ${P.mScT} m와 천공 여유 ${P.mDrG} m는 가정값입니다.</p>`;
  return h;
}
function htmlMonoReport(){
  const P=R.P, t=R.T, g=R.g;
  let h=`<h2>1. 설계 개요</h2><p>해상풍력 발전기 모노파일 기초의 중량, 외력(터빈·풍·파랑·조류·지진), 해저면 단면력과 강관 단면(예비)을 검토하고 수량과 해역이용협의 산출량을 정리한다.</p>
  <table class="t" style="max-width:720px"><tbody>
  <tr><td class="l">형식</td><td class="l">모노파일 ${tyName(P.type)} (${g.taper?`Ø${P.mD} → Ø${P.mDt} m, 테이퍼 ${dl(P.mzA)} ~ ${dl(P.mzB)}`:`Ø${P.mD} m`}) + 트랜지션피스 (${g.grout?"그라우트":"볼트"} 연결)</td></tr>
  <tr><td class="l">터빈</td><td class="l">${esc(t.name)} (${t.MW} MW, 허브 MSL+${t.hub} m, 인터페이스 ${dl(R.yIf)})</td></tr>
  <tr><td class="l">설치 위치</td><td class="l">원지반 ${dl(P.sbDL)}, 설계조위 ${dl(P.hwl)}, MSL ${dl(P.msl)}, 말뚝 선단 ${dl(g.yToe)} (근입 ${P.mL} m), ${instName(P.mInst)}</td></tr>
  <tr><td class="l">세굴</td><td class="l">${g.prot?`세굴방지공 Ø${fx(R.qty.Dsc,1)} m × ${P.mScT} m (세굴 없음)`:`세굴방지공 없음, 세굴 깊이 S = ${P.mScS}D = ${fx(R.S,2)} m`}</td></tr>
  <tr><td class="l">적용 기준</td><td class="l">DNV-RP-C205 (풍속·파랑·조류·항력계수), DNV-ST-0126 (모노파일 일반), 강재 f<sub>y</sub> ${P.mfy} MPa, γ<sub>M</sub> ${P.mgM}</td></tr></tbody></table>
  <div class="fig">${primsSVG(monoSecPrims(R),"모노파일 입면도")}</div><p class="note" style="text-align:center">그림 1. 입면도</p>`;
  h+=`<h2>2. 중량</h2>`+htmlMonoWt();
  h+=`<h2>3. 하중</h2>`+htmlMonoLoad();
  h+=`<h2>4. 강관 단면 검토</h2>`+htmlMonoChk();
  h+=`<h2>5. 말뚝 해석 (지반 스프링 위 보)</h2>`+htmlMonoPy();
  h+=`<h2>6. 수량</h2>`+htmlMonoQty();
  h+=`<h2>7. 남은 검토 항목</h2><p>드릴드 소켓 그라우트 부착·인발, 반복하중 누적 회전, 피로·항타 관입성, 최적화는 다음에 검토한다.</p>`;
  return h;
}
function makeXlsxMono(){
  const P=R.P, g=R.g, W=R.wt, q=R.qty, wb=XLSX.utils.book_new(), add=(nm,aoa,w)=>{ const ws=XLSX.utils.aoa_to_sheet(aoa); if(w) ws["!cols"]=w.map(x=>({wch:x})); XLSX.utils.book_append_sheet(wb,ws,nm); };
  const r2=v=>typeof v==="number"&&isFinite(v)?Math.round(v*1000)/1000:v;
  add("요약",[["해상풍력발전기 기초 설계도구 결과",baseName()],["형식","모노파일 "+tyName(P.type)],["터빈",R.T.name],["인터페이스 (DL)",r2(R.yIf)],["해저면 (세굴 후, DL)",r2(R.yML)],[],
    ["조합","V (kN)","H (kN)","M (kN·m)","σ (MPa)","응력비"],...R.LC.map(l=>[l.id+" "+l.nm,l.V,l.H,l.M,l.sig,l.ratio===null?"-":l.ratio].map(r2)),[],
    ["강관 말뚝 (t)",r2(W.Wp/G)],["TP (t)",r2(W.WTP/G)],["2차 부재 (t)",r2(W.Wsec/G)],["그라우트 (m³)",r2(W.Vg)],["최대 D/t",r2(R.sec.DtMax)],["점용 면적 (m²)",r2(q.Aocc)],["굴착·천공량 (m³)",r2(q.Vexc)]],[30,14,14,14,10,10]);
  add("입력값",[["항목","값"],...Object.keys(P).filter(k=>!["rings","customT","rb"].includes(k)).map(k=>[k,P[k]])],[14,14]);
  add("강관",[["구간","하단 DL","상단 DL","길이","D 하단","D 상단","t (mm)","D/t","중량 (kN)","중량 (t)"],...W.segs.map(s=>[s.nm,s.y0,s.y1,s.L,s.Da,s.Db,s.t,s.DtMax,s.W,s.W/G].map(r2)),[],
    ["TP 외경",r2(g.DTP)],["TP 하단 DL",r2(g.yTP0)],["TP 상단 DL",r2(g.yTP1)],["TP 중량 (kN)",r2(W.WTP)],["그라우트 (m³)",r2(W.Vg)],["부력 (kN)",r2(W.U)]],[20,10,10,10,10,10,8,8,12,10]);
  if(R.TL.uls) add("터빈하중",[["구분","성분","Mx","My","Mz","Fx","Fy","Fz","V","H","M"],...R.TL.uls.map(r=>["ULS",r.lab,r.Mx,r.My,r.Mz,r.Fx,r.Fy,r.Fz,r2(r.V),r2(r.H),r2(r.M)]),...R.TL.sls.map(r=>["SLS",r.lab,r.Mx,r.My,r.Mz,r.Fx,r.Fy,r.Fz,r2(r.V),r2(r.H),r2(r.M)])]);
  add("풍하중",[["U0",r2(R.wind.U0)],[],["수면 위 높이","DL","Iu","풍속","풍압","D","kN/m"],...R.wind.rows.map(r=>[r.h,r.y,r.Iu,r.U,r.q,r.D,r.f].map(r2)),[],["F (kN)",r2(R.wind.F)],["해저면 M (kN·m)",r2(R.wind.M)]]);
  add("파랑하중",[["d",r2(R.wave.d)],["k",R.wave.k],["L",r2(R.wave.L)],["D/L",r2(R.wave.DL)],[],["해저 위 z","D","ka","CM","가속도","관성력 (kN/m)","유속","CD","항력 (kN/m)"],...R.wave.rows.map(r=>[r.z,r.D,r.ka,r.CM,r.acc,r.fI,r.u,r.Cd,r.fD].map(r2)),[],
    ["FI",r2(R.wave.FI)],["MI",r2(R.wave.MI)],["FD",r2(R.wave.FD)],["MD",r2(R.wave.MD)],["설계 F",r2(R.wave.F)],["설계 M",r2(R.wave.M)]]);
  add("항력계수",[["k (mm)",P.ks],["해양생물 (mm)",P.mmg],[],["하단 DL","상단 DL","D 시작","D 끝","Δ 시작","Δ 끝","CD 시작","CD 끝"],...R.cdTbl.map(r=>[r.y0,r.y1,r.Da,r.Db,r.dA,r.dB,r.cdA,r.cdB].map(r2))]);
  add("조류하중",[["해저 위 z","D","CD","상시 u","상시 kN/m","극치 u","극치 kN/m"],...R.cur.e.rows.map((r,i)=>[r.z,r.D,r.Cd,R.cur.n.rows[i].u,R.cur.n.rows[i].f,r.u,r.f].map(r2)),[],["상시 F",r2(R.cur.n.F)],["상시 M",r2(R.cur.n.M)],["극치 F",r2(R.cur.e.F)],["극치 M",r2(R.cur.e.M)]]);
  add("지진",[["kh",P.kh],[],["구분","W","DL","팔길이","F","M"],...R.eq.items.map(it=>[it.nm,it.W,it.y,it.arm,it.F,it.M].map(r2)),["합계","","","",r2(R.eq.F),r2(R.eq.M)]],[28,12,10,10,12,14]);
  add("하중조합",R.LC.flatMap(l=>[[l.id+" "+l.nm],["하중","계수","V","H","M"],...l.items.map(it=>[it.nm,it.g,r2(it.V),r2(it.H),r2(it.M)]),["합계 (계수 곱함)","",r2(l.V),r2(l.H),r2(l.M)],[]]),[36,8,14,14,14]);
  { const Y=R.py; add("지층",[["가정 여부",SOIL_PRESETS.find(p=>p.id===P.soilPre)?"가정 지반 ("+SOIL_PRESETS.find(p=>p.id===P.soilPre).name+")":"직접 입력"],[],["층 이름","종류","하단 깊이","γ′","φ","Su 상단","Su 하단","q_u (MPa)","E_m (MPa)","RQD"],...P.soil.map(l=>[l.nm,SOIL_TY[l.ty],l.bot,l.g,l.phi??"",l.su1??"",l.su2??"",l.qu??"",l.Em??"",l.rqd??""])],[18,8,10,8,8,10,10,10,10,8]);
    add("말뚝해석",[["조합","H","M","해저면 변위 (mm)","회전각 (°)","선단 변위 (mm)","최대 M","위치 (m)","수렴"],...Y.res.map(r=>[r.id+" "+r.nm,r.H,r.M,r.w0*1000,Math.abs(r.th0)*180/PI,r.wT*1000,r.Mmax,r.xM,r.ok?"O.K":"N.G"].map(r2)),[],
      ["해저면 아래 x (m)",...Y.res.flatMap(r=>[r.id+" 변위 (mm)",r.id+" M (kN·m)",r.id+" p (kN/m)"])],...Y.res[0].x.map((x,i)=>[r2(x),...Y.res.flatMap(r=>[r2(r.w[i]*1000),r2(r.Mz[i]),r2(r.p[i])])])],[16,12,14,14,12,14,14,10,8]);
    add("근입깊이",[["소요 근입 (m)",Y.Lreq===null?"-":Y.Lreq],["입력 근입 (m)",P.mL],[],["근입 (m)","상시 회전각 (°)","폭풍 회전각 (°)","판정"],...Y.sens.map(x=>[x.L,x.th===null?"수렴 안 함":r2(x.th),x.thU===null?"수렴 안 함":r2(x.thU),x.ok&&x.th<=P.mRot?"O.K":"N.G"])]);
    if(R.fq.cal){ const F=R.fq; add("고유진동수",[["기준 고유진동수 (Hz, 타워 하단 고정)",R.T.fref],["타워 EI₀ (kN·m²)",F.cal.EI0],["RNA (t)",r2(F.cal.mR)],["타워 (t)",r2(F.cal.mT)],[],["타워만 (고정)",r2(F.cal.fchk)],["해저면 고정",r2(F.fix.f)],["지반 상한",r2(F.hi.f)],["지반 하한",r2(F.lo.f)],["1P·3P 허용 하한",F.band.lo?r2(F.band.lo):"-"],["1P·3P 허용 상한",F.band.hi?r2(F.band.hi):"-"],["판정",F.ok===null?"rpm 자료 없음":F.ok?"O.K":"N.G"]],[34,16]); }
    add("축방향",[["외주면 마찰 (kN)",r2(Y.ax.Qo)],["관내 마찰 (kN)",r2(Y.ax.Qi)],["선단 q (kN/m²)",r2(Y.ax.q)],["비폐색 Q",r2(Y.ax.Qun)],["폐색 Q",r2(Y.ax.Qpl)],["Q",r2(Y.ax.Q)],["상시 V",r2(Y.Vs)],["폭풍 V",r2(Y.Vu)]]); }
  add("수량",[["공종","수량","단위"],...W.segs.map(s=>["강관 "+s.nm,r2(s.W/G),"t"]),["강관 소계",r2(W.Wp/G),"t"],["트랜지션피스",r2(W.WTP/G),"t"],["2차 부재",r2(W.Wsec/G),"t"],["TP 그라우트",r2(W.Vg),"m³"],["천공 구간 그라우트",r2(q.Vann),"m³"],
    ["세굴방지공",r2(q.Vsc),"m³"],["외면 방식 면적",r2(q.Apaint),"m²"],[],["해역이용협의"],["점용 면적",r2(q.Aocc),"m²"],["굴착·천공 길이",r2(q.Ldr),"m"],["굴착·천공량",r2(q.Vexc),"m³"],["말뚝 안 토사 (존치)",r2(q.Vplug),"m³"]],[28,12,6]);
  return new Blob([XLSX.write(wb,{bookType:"xlsx",type:"array"})],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
}

/* ---------- 응력분포도 (모노파일): 말뚝 끝 ~ 인터페이스 높이별 단면력·응력 ---------- */
function htmlMonoStress(){
  const P=R.P, g=R.g, C=R.colD, Y=R.py, ids=R.LC.map(l=>l.id), nm=Object.fromEntries(R.LC.map(l=>[l.id,l.nm])), fd=R.sec.fd;
  const secAt=yy=>{ const D=g.Dp(Math.min(yy,P.mtop)), t=Math.max(0.001,g.tAt(yy)-P.mca/1000), Di=D-2*t; return {A:PI/4*(D*D-Di*Di),Z:PI/32*(D**4-Di**4)/D,D,t}; };
  // 해저면 아래: p-y 결과 (말뚝 머리 = 해저면(세굴면), 축력은 해저면 값 그대로 — 주면마찰 감소 무시, 보수적)
  const all={}; ids.forEach((id,i)=>{ const r=Y.res[i], c=C.lc[id], sg=Math.sign(r.Mz[0]||1)===Math.sign(c.M[0]||1)?1:-1;
    const zb=r.x.map(x=>R.yML-x).reverse(), Mb=r.Mz.map(v=>v*sg).reverse(), Vb=r.Vz.map(v=>v*sg).reverse(), Nb=zb.map(()=>c.N[0]);
    const z=[...zb,...C.z], M=[...Mb,...c.M], V=[...Vb,...c.V], N=[...Nb,...c.N], sc=z.map((zz,j)=>{ const q=secAt(zz); return (N[j]/q.A+Math.abs(M[j])/q.Z)/1000; });
    all[id]={z,M,V,N,sc}; });
  const marks=[[P.hwl,"설계조위","var(--water-line)"],[R.yML,R.prot?"해저면":"세굴면","var(--soil-line,#8a6d3b)"],[g.yTP0,"TP 하단","var(--muted)"]];
  if(!R.prot) marks.push([P.sbDL,"원지반","var(--muted)"]);
  [[P.mz1,"두께 변화"],[P.mz2,"두께 변화"]].forEach(([zz,l])=>{ if(zz>g.yToe&&zz<R.yIf) marks.push([zz,l,"var(--dim)"]); });
  const ser=k=>ids.map(id=>({id,v:all[id][k],z:all[id].z}));
  const leg=`<div class="legend" style="margin:4px 0 0">${ids.map(id=>`<span><i style="background:${LCS[id][0]}"></i>${id} ${nm[id]}</span>`).join("")}</div>`;
  let h=`<h2>1. 말뚝 높이별 단면력·응력 (말뚝 끝 ~ 인터페이스)</h2>
  <p class="note">해저면 위는 단면마다 그 위쪽 하중을 모았습니다: N = 터빈 연직 + 강관·TP·그라우트·2차 부재 자중 − 잠긴 강재 부력, H·M = 터빈 + 풍하중 + 파랑(단면마다 최대 위상) + 조류 + 지진 관성력(분포). 해저면 아래는 말뚝 해석(p-y) 결과이고, 축력은 해저면 값을 그대로 썼습니다(주면마찰 감소 무시, 보수적). σ = N/A + |M|/Z, 단면은 말뚝 강관만(부식 여유 ${P.mca} mm 공제)이며 TP 겹침 구간도 말뚝만으로 봤습니다(보수적). 폭풍(LC2)은 환경하중 계수 ${P.mgE} 포함.</p>${leg}
  <div class="plots"><div class="sheet">${heightSVG(ser("N"),C.z,"축력 N","kN",marks,true,0)}</div><div class="sheet">${heightSVG(ser("V"),C.z,"전단력 V","kN",marks,true,0)}</div>
  <div class="sheet">${heightSVG(ser("M").map(s=>({...s,v:s.v.map(v=>v/1000)})),C.z,"휨모멘트 M","MN·m",marks,true,0)}</div>
  <div class="sheet">${heightSVG(ser("sc"),C.z,"최대 응력 σ","MPa",marks,true,0,[[fd,`f<tspan font-size="7" dy="2">d</tspan><tspan dy="-2"> ${fx(fd,0)}</tspan>`,"#c23b2e"]])}</div></div>`;
  // 주요 단면 표
  const rowAt=(lab,zz)=>{ const tds=ids.map(id=>{ const a=all[id]; let j=0,bd=1e9; a.z.forEach((v,i)=>{ const d=Math.abs(v-zz); if(d<bd){bd=d;j=i;} }); return {M:a.M[j],sc:a.sc[j]}; }); const q=secAt(zz);
    return `<tr><td class="l">${lab}</td><td class="n">${dlS(zz)}</td><td class="n">Ø${fx(q.D*1000,0)} × ${fx(g.tAt(zz)*1000,0)}</td>${tds.map(t=>`<td class="n">${fx(t.M,0)}</td><td class="n">${fx(t.sc,1)}</td>`).join("")}<td class="n">${fx(Math.max(...tds.map(t=>t.sc))/fd,2)}</td></tr>`; };
  const rows=[["TP 하단",g.yTP0],[R.prot?"해저면":"세굴면",R.yML]]; [P.mz2,P.mz1].forEach(zz=>{ if(zz>g.yToe&&zz<g.yTP0) rows.push([`두께 변화 (${fx(zz,1)})`,zz]); });
  { const r=Y.res.reduce((a,b)=>b.Mmax>a.Mmax?b:a); rows.push([`해저면 아래 최대 모멘트 (${r.id})`,R.yML-r.xM]); }
  rows.sort((a,b)=>b[1]-a[1]);
  h+=`<div class="tblwrap"><table class="t"><thead><tr><th rowspan="2">단면</th><th rowspan="2">표고</th><th rowspan="2">강관 (mm)</th>${ids.map(id=>`<th colspan="2">${id}</th>`).join("")}<th rowspan="2">σ<sub>max</sub>/f<sub>d</sub></th></tr><tr>${ids.map(()=>"<th>M (kN·m)</th><th>σ (MPa)</th>").join("")}</tr></thead><tbody>${rows.map(([l,zz])=>rowAt(l,zz)).join("")}</tbody></table></div>
  <p class="note">f<sub>d</sub> = f<sub>y</sub>/γ<sub>M</sub> = ${P.mfy}/${P.mgM} = ${fx(fd,0)} MPa. 국부좌굴(DNV-RP-C202)을 포함한 단면 검토는 강관 검토 탭에 있습니다.</p>`;
  return h;
}
