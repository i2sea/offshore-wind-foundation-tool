/* ================= 부재설계 (KDS 14 20 강도설계법 + 해양 노출 조건) ================= */
const BARS={H13:{d:12.7,A:126.7,w:0.995},H16:{d:15.9,A:198.6,w:1.56},H19:{d:19.1,A:286.5,w:2.25},H22:{d:22.2,A:387.1,w:3.04},
  H25:{d:25.4,A:506.7,w:3.98},H29:{d:28.6,A:642.4,w:5.04},H32:{d:31.8,A:794.2,w:6.23},H35:{d:34.9,A:956.6,w:7.51}};
const MEMB=[ // 키, 부재, 면·방향, 기본 철근
  ["sT","저판","상면 (경간 중앙 · 뒷굽)","H25",200],
  ["sB","저판","하면 (벽체·기둥 지점부)","H35",200],
  ["wH","하부 벽체","원주 방향 (양면)","H19",100],
  ["wV","하부 벽체","연직 방향 (내측면, 하단 고정부)","H16",100],
  ["kH","원추","원주 방향 (양면)","H19",125],
  ["kM","원추","자오선 방향 (내측면, 하단 연결부)","H16",125],
  ["cL","기둥 하단","축방향 주철근 (내·외 2단)","H25",300],
];
const DEF_RB=Object.fromEntries(MEMB.map(m=>[m[0],{bar:m[3],s:m[4]}]));
const MDEF={fck:45,fy:500,cov:75,phiF:30,gE:1.35,gH:1.6,kcr:210,rb:DEF_RB};
Object.assign(DEF,MDEF);

function beta1(fck){ return fck<=28?0.85:Math.max(0.65,0.85-0.007*(fck-28)); }
/* 1 m 폭 휨·전단·균열 검토. Mu, Ms: kN·m/m, Vu: kN/m, t: m */
function flexCheck(P,Mu,Ms,Vu,t,rb){
  const b=1000, h=t*1000, B=BARS[rb.bar], d=h-P.cov-B.d/2, As=B.A*1000/rb.s, fck=P.fck, fy=P.fy;
  const a=As*fy/(0.85*fck*b), c=a/beta1(fck), et=0.003*(d-c)/c;
  const phi=et>=0.005?0.85:et<=0.002?0.65:0.65+(et-0.002)*(0.2/0.003);
  const phiMn=phi*As*fy*(d-a/2)/1e6;
  const phiVc=0.75*(1/6)*Math.sqrt(fck)*b*d/1000;
  const AsReq=Mu>0?Mu*1e6/(0.85*fy*0.9*d):0;
  const rmin=Math.max(0.25*Math.sqrt(fck)/fy,1.4/fy), AsMin=Math.min(rmin*b*d,4/3*AsReq);
  const fs=Ms>0?Ms*1e6/(As*0.875*d):0, Cc=P.cov;
  const smax=fs>0?Math.min(375*(P.kcr/fs)-2.5*Cc,300*(P.kcr/fs)):300;
  const r={d,As,a,c,et,phi,phiMn,phiVc,AsMin,fs,smax,Mu,Vu,Ms,t};
  r.okM=phiMn>=Mu; r.okV=phiVc>=Vu; r.okMin=As>=AsMin-1e-6; r.okCr=rb.s<=smax+1e-6; r.okS=rb.s<=Math.min(300,2*h);
  r.tReq=Vu>0?(Vu*1000/(0.75*(1/6)*Math.sqrt(fck)*b)+P.cov+B.d/2)/1000:0;   // 전단철근 없이 필요한 두께 (m)
  r.ok=r.okM&&r.okV&&r.okMin&&r.okCr&&r.okS; return r;
}
/* 원주 인장 (양면 배근). Tu, Ts: kN/m */
function hoopCheck(P,Tu,Ts,t,rb){
  const h=t*1000, B=BARS[rb.bar], As=2*B.A*1000/rb.s, phiTn=0.85*As*P.fy/1000, fs=Ts>0?Ts*1000/As:0;
  const smax=fs>0?Math.min(375*(P.kcr/fs)-2.5*P.cov,300*(P.kcr/fs)):300, AsMin=0.002*1000*h;
  const r={As,phiTn,fs,smax,AsMin,Tu,Ts,t}; r.okT=phiTn>=Tu; r.okCr=rb.s<=smax+1e-6; r.okMin=As>=AsMin; r.okS=rb.s<=Math.min(300,2*h);
  r.ok=r.okT&&r.okCr&&r.okMin&&r.okS; return r;
}
/* 원형 중공 기둥 P-M (변형률 적합, 내·외 2단 철근). 반환 ϕMn at Pu */
function colCheck(P,Pu,Mu,Vu,ro,ri,rb){
  const B=BARS[rb.bar], fck=P.fck*1000, fy=P.fy*1000, Es=2e8, ecu=0.003, b1=beta1(P.fck), cv=P.cov/1000+B.d/2000;
  const r1=ro-cv, r2=ri+cv, n=Math.max(8,Math.ceil(2*PI*r1/(rb.s/1000))), As=B.A/1e6;
  const bars=[]; for(let i=0;i<n;i++){ const t=2*PI*i/n; bars.push(r1*Math.cos(t)); bars.push(r2*Math.cos(t)); }
  const Ast=bars.length*As, Ag=PI*(ro*ro-ri*ri);
  const width=y=>2*(Math.sqrt(Math.max(0,ro*ro-y*y))-(Math.abs(y)<ri?Math.sqrt(ri*ri-y*y):0));
  const pt=c=>{ // c: 압축연단에서 중립축 거리 (y=ro 가 압축연단)
    const a=Math.min(b1*c,2*ro); let Cc=0,Mc=0; const ns=120;
    for(let k=0;k<ns;k++){ const y=ro-a*(k+.5)/ns, dA=width(y)*a/ns; Cc+=0.85*fck*dA; Mc+=0.85*fck*dA*y; }
    let Ps=0,Ms=0,et=0; bars.forEach(y=>{ const e=ecu*(c-(ro-y))/c, sg=Math.max(-fy,Math.min(fy,e*Es)); const inBlock=(ro-y)<a; const f=sg-(inBlock&&sg>0?0.85*fck:0); Ps+=f*As; Ms+=f*As*y; });
    et=ecu*((ro+r1)-c)/c; // 최외단 인장철근
    const phi=et>=0.005?0.85:et<=0.002?0.65:0.65+(et-0.002)*(0.2/0.003);
    const Pn=Cc+Ps, Mn=Mc+Ms; return {Pn,Mn,phi,et,c}; };
  const P0=0.85*fck*(Ag-Ast)+fy*Ast, PnMax=0.80*P0, phiPmax=0.65*PnMax;
  let pts=[]; for(let i=1;i<=240;i++){ const c=2*ro*Math.pow(i/240,1.6)*3; const q=pt(c); pts.push({P:Math.min(q.phi*q.Pn,phiPmax),M:q.phi*q.Mn,et:q.et,c}); }
  const Pt=-0.9*fy*Ast; pts.unshift({P:Pt,M:0,et:1,c:0});
  let phiMn=0; for(let i=0;i<pts.length-1;i++){ const a=pts[i],b=pts[i+1]; if((Pu-a.P)*(Pu-b.P)<=0&&a.P!==b.P){ const f=(Pu-a.P)/(b.P-a.P); phiMn=Math.max(phiMn,a.M+(b.M-a.M)*f); } }
  const t=ro-ri, bw=2*t, dv=0.8*2*ro, Vc=(1/6)*Math.sqrt(P.fck)*1000*bw*dv, phiVc=0.75*Vc;
  const VsReq=Math.max(0,Vu/0.75-Vc), VsMax=(2/3)*Math.sqrt(P.fck)*1000*bw*dv;
  const AvS=VsReq>0?VsReq/(P.fy*1000*dv)*1e6:0;           // 소요 띠철근 mm²/m (두 다리 합)
  const tie=VsReq>0?["H16","H19","H22","H25"].map(b=>({bar:b,s:Math.floor(2*BARS[b].A/AvS*1000/25)*25})).find(x=>x.s>=100)||{bar:"H25",s:Math.floor(2*BARS.H25.A/AvS*1000/25)*25}:null;
  if(tie) tie.s=Math.min(300,tie.s);
  const rho=Ast/Ag;
  const r={n,nb:bars.length,Ast,Ag,rho,phiMn,phiPmax,phiVc,Vc,VsReq,VsMax,AvS,tie,bw,dv,Pu,Mu,Vu,ro,ri,pts};
  r.okM=phiMn>=Mu&&Pu<=phiPmax; r.okV=VsReq<=VsMax&&(!tie||tie.s>=100); r.okMin=rho>=0.005; r.okS=rb.s<=300;
  r.ok=r.okM&&r.okV&&r.okMin&&r.okS; return r;
}

/* 부재 단면력 */
function memberForces(R){
  const P=R.P, gw=P.gw, nu=0.2;
  const z2=R.z2, cais=P.type==="caisson";
  const tb=cais?P.cts:P.tb, Rw=cais?P.cDw/2:P.Dw/2, tw=cais?P.ctw:P.tw, Rwi=Rw-tw, wallTop=cais?P.cH-P.ctt:P.tb+P.hw;
  const rco=R.S.hex?R.S.hex.flats/2:R.rso;
  // 1) 저판: 지반반력 최대 조합
  const gov=R.LC.reduce((a,b)=>b.qcheck>a.qcheck?b:a);
  const qSoil=gov.qcheck;
  const hFill=Math.max(0,Math.min(P.zf1,cais?P.cH-P.ctt:z2)-tb);
  const wDead=Math.max(0,P.gc-gw)*tb+Math.max(0,P.gf-gw)*hFill;
  const qu=1.2*qSoil-0.9*wDead, qs=qSoil-wDead;
  const Lr=Rwi-rco, n=cais?Math.round(P.cnr):0, La=n>=2?2*PI*Rwi/n:Infinity, L=Math.min(Lr,La);
  const heel=Math.max(0,(cais?P.cDs:P.Db)/2-Rw);
  const qh=1.2*qSoil-0.9*Math.max(0,P.gc-gw)*tb, qhs=qSoil-Math.max(0,P.gc-gw)*tb;
  const slab={gov:gov.id,qSoil,hFill,wDead,qu,qs,Lr,La,L,heel,
    Msup:qu*L*L/12, Mmid:qu*L*L/24, Mheel:qh*heel*heel/2, V:Math.max(qu*L/2,qh*heel), Mss:qs*L*L/12, Mms:Math.max(qs*L*L/24,qhs*heel*heel/2), t:tb};
  // 2) 하부 벽체: 속채움 정지토압 (수중단위중량), 원주 인장 + 하단 연직 휨
  const K0=1-Math.sin(P.phiF*PI/180), gsub=Math.max(0,P.gf-gw);
  const p0s=K0*gsub*hFill, p0=P.gH*p0s, rm=Rw-tw/2;
  const bW=Math.pow(3*(1-nu*nu)/(rm*rm*tw*tw),0.25);
  const wall={K0,gsub,h:hFill,p0,p0s,r:rm,t:tw,beta:bW,Tu:p0*rm,Ts:p0s*rm,Mu:p0/(2*bW*bW),Ms:p0s/(2*bW*bW)};
  // 3) 원추 (원추형만): 하단(z1) 기준
  let cone=null;
  if(!cais){ const z1=P.tb+P.hw, s=(P.Dw-P.Dt)/2/P.hk, tn=P.tkh/Math.sqrt(1+s*s), hc=Math.max(0,Math.min(P.zf1,z2)-z1), ps=K0*gsub*hc, pu=P.gH*ps, rc=P.Dw/2-P.tkh/2;
    const bK=Math.pow(3*(1-nu*nu)/(rc*rc*tn*tn),0.25), cosA=1/Math.sqrt(1+s*s);
    cone={tn,h:hc,p0:pu,p0s:ps,r:rc,beta:bK,ang:Math.atan(s)*180/PI,Tu:pu*rc/cosA,Ts:ps*rc/cosA,Mu:pu/(2*bK*bK),Ms:ps/(2*bK*bK)}; }
  // 4) 기둥 하단 (하부 구조 상단 z2)
  const cs=R.colSec, g=R.TL.gu, zs=cs.z;
  const Mt=g?g.M+g.H*(R.zIf-zs):0, Ht=g?g.H:0, Vt=g?g.V:R.Wt;
  const colA=PI*(R.rso**2-R.rsi**2), Wabove=P.gc*(colA*(P.ztop-zs)+Math.max(0,PI*((P.Dp/2)**2-R.rso**2))*P.tp);
  const dH=P.hwl-P.zbDL, Uab=gw*PI*R.rso**2*Math.max(0,Math.min(dH,P.ztop)-zs);
  const Menv=cs.wM+cs.vM+cs.cM, Henv=cs.wF+cs.vF+cs.cF;
  const col={z:zs,Mt,Ht,Vt,Wabove,Uab,Menv,Henv,Mu:Mt+P.gE*Menv,Vu:Ht+P.gE*Henv,Pu:Vt+0.9*(Wabove-Uab),ro:R.rso,ri:R.rsi,cs};
  return {slab,wall,cone,col};
}
function memberDesign(R,rb){
  const P=R.P, F=memberForces(R), rbs=rb||P.rb||DEF_RB, out={F,rb:rbs,items:[]};
  const S=F.slab, W=F.wall, K=F.cone, C=F.col;
  out.sT=flexCheck(P,Math.max(S.Mmid,S.Mheel),S.Mms,S.V,S.t,rbs.sT);
  out.sB=flexCheck(P,S.Msup,S.Mss,S.V,S.t,rbs.sB);
  out.wH=hoopCheck(P,W.Tu,W.Ts,W.t,rbs.wH);
  out.wV=flexCheck(P,W.Mu,W.Ms,W.p0*1/(2*W.beta),W.t,rbs.wV);
  if(K){ out.kH=hoopCheck(P,K.Tu,K.Ts,K.tn,rbs.kH); out.kM=flexCheck(P,K.Mu,K.Ms,K.p0/(2*K.beta),K.tn,rbs.kM); }
  out.cL=colCheck(P,C.Pu,C.Mu,C.Vu,C.ro,C.ri,rbs.cL);
  out.ok=["sT","sB","wH","wV","kH","kM","cL"].every(k=>!out[k]||out[k].ok);
  out.qty=rebarQty(R,out);
  return out;
}
/* 배력철근: 0.0018bt 를 양면에 나눠, H16 기준 간격 (≤ 300) */
function distRB(t){ const req=0.0018*t*1e6/2; for(const bar of ["H13","H16","H19","H22"]){ const s=Math.min(300,Math.floor(BARS[bar].A*1000/req/25)*25); if(s>=125) return {bar,s}; } return {bar:"H22",s:125}; }
/* 철근 상세 (배근도·재료표 공용): 번호, 위치, 규격, 간격, 개수, 길이 */
function rebarDetail(R,M){
  const P=R.P, cais=P.type==="caisson", rb=M.rb, out=[];
  const B=k=>BARS[rb[k].bar], cv=P.cov/1000, la=db=>Math.ceil(40*db/1000*10)/10; // 정착길이 약 40d (m)
  const tb=cais?P.cts:P.tb, Rb=R.Rbase, Rw=cais?P.cDw/2:P.Dw/2, tw=cais?P.ctw:P.tw, Rwi=Rw-tw;
  const add=(mk,nm,face,r,n,L,shape)=>{ const w=BARS[r.bar].w; out.push({mk,nm,face,bar:r.bar,s:r.s,n:Math.ceil(n),L,tot:Math.ceil(n)*L,w,kg:Math.ceil(n)*L*w,shape}); };
  // 저판: 직교 2방향 그물, 원형 면적
  const Dslab=2*Rb, Aslab=PI*Rb*Rb, Lavg=Aslab/Dslab, dS=distRB(tb);
  const sT=rb.sT, sB=rb.sB;
  add("S1","저판","상면 주철근 (X·Y 2방향)",sT,2*(Dslab/(sT.s/1000)+1),Lavg,"I");
  add("S2","저판","하면 주철근 (X·Y 2방향)",sB,2*(Dslab/(sB.s/1000)+1),Lavg,"I");
  const tieN=(Aslab/(0.6*0.6));
  add("S3","저판","상·하면 연결철근 (0.6 m 격자)",{bar:"H13",s:600},tieN,tb-2*cv+0.3,"C");
  // 하부 벽체
  const hw=cais?P.cH-P.cts:P.hw, rmI=Rwi+cv, rmO=Rw-cv, dW=distRB(tw);
  add("W1","하부 벽체","원주 방향 (내·외면)",rb.wH,2*(hw/(rb.wH.s/1000)+1),PI*(rmI+rmO)+2*la(B("wH").d),"O");
  add("W2","하부 벽체","연직 내측 주철근",rb.wV,2*PI*rmI/(rb.wV.s/1000),hw+tb-cv+la(B("wV").d),"L");
  add("W3","하부 벽체","연직 외측 배력철근",dW,2*PI*rmO/(dW.s/1000),hw+tb-cv+la(BARS[dW.bar].d),"L");
  if(!cais){
    const sl=(P.Dw-P.Dt)/2/P.hk, slant=P.hk*Math.sqrt(1+sl*sl), tn=P.tkh/Math.sqrt(1+sl*sl), rAvg=(P.Dw+P.Dt)/4-P.tkh/2, dK=distRB(tn);
    add("K1","원추","원주 방향 (내·외면)",rb.kH,2*(slant/(rb.kH.s/1000)+1),2*PI*rAvg+la(B("kH").d),"O");
    add("K2","원추","자오선 내측 주철근",rb.kM,2*PI*(Rw-P.tkh+cv)/(rb.kM.s/1000)*0.75,slant+2*la(B("kM").d),"I");
    add("K3","원추","자오선 외측 배력철근",dK,2*PI*(Rw-cv)/(dK.s/1000)*0.75,slant+2*la(BARS[dK.bar].d),"I");
  } else {
    const n=Math.round(P.cnr), Lr=Rwi-R.rso, hr=P.cH-P.ctt-P.cts, dR=distRB(P.ctr), dT=distRB(P.ctt);
    if(n>0){ add("R1","방사형 격벽","수평 배력 (양면)",dR,n*2*(hr/(dR.s/1000)+1),Lr+2*la(BARS[dR.bar].d),"I");
      add("R2","방사형 격벽","연직 배력 (양면)",dR,n*2*(Lr/(dR.s/1000)+1),hr+2*la(BARS[dR.bar].d),"I"); }
    const At=PI*(Rwi**2-R.rso**2);
    add("T1","케이슨 상판","상·하면 (X·Y 2방향)",dT,4*(2*Rwi/(dT.s/1000)),At/(2*Rwi),"I");
  }
  // 보강 링: 강도 부재로 보지 않고 최소철근(배력) + 닿는 부재와 연결철근
  //   G·1 원주 (내·외면), G·2 연직 (내·외면, 아래 부재에 정착 la), G·3 옆 부재 연결철근 (수평, 0.3 m 격자, 양쪽 정착 la)
  ringSupport(P,R).forEach(g=>{ const k=g.i+1, d=distRB(g.t), Ld=la(BARS[d.bar].d), rmI=g.ri+cv, rmO=g.ro-cv, nm=`보강 링 ${k}`;
    add(`G${k}1`,nm,"원주 방향 (내·외면)",d,2*(g.h/(d.s/1000)+1),PI*(rmI+rmO)+2*Ld,"O");
    add(`G${k}2`,nm,g.below.length?`연직 (내·외면, ${g.below.map(b=>b.nm).join("·")}에 정착)`:"연직 (내·외면)",d,2*PI*(rmI+rmO)/(d.s/1000),g.h-2*cv+(g.below.length?Ld:0)+0.2,"L");
    g.side.forEach(sd=>{ const n=(2*PI*sd.r/0.3)*(sd.h/0.3); add(`G${k}3`,nm,`연결철근 — ${sd.nm} (수평, 0.3 m 격자)`,{bar:d.bar,s:300},n,2*Ld,"I"); });
  });
  // 기둥
  const Lc=P.ztop-P.zc0, c=M.cL, tie=c.tie||distRB(R.rso-R.rsi);
  add("C1","기둥","축방향 주철근 (내·외 2단)",rb.cL,c.nb,Lc+tb-cv+la(B("cL").d)-0.1,"L");
  add("C2","기둥",c.tie?"띠철근 (전단 보강, 내·외면)":"원주 배력철근 (내·외면)",tie,2*(Lc/(tie.s/1000)+1),PI*(R.rso+R.rsi)+2*la(BARS[tie.bar].d),"O");
  return {rows:out,dists:{slab:dS,wall:dW},tie};
}
function rebarQty(R,M){
  const D=rebarDetail(R,M), rows=D.rows.map(r=>({nm:`${r.mk} ${r.nm} ${r.face}`,kg:r.kg}));
  const tot=rows.reduce((a,b)=>a+b.kg,0);
  return {rows,tot,perM3:tot/R.Vc,detail:D};
}
/* 기둥 축방향 철근 간격 후보 (내·외 2단, 순간격 = 간격 − 직경 ≥ 65 mm) */
const COL_SP=[100,125,150,175,200,250,300];
/* 최적 배근: 부재 면마다 검토를 만족하는 가장 가벼운 규격·간격 */
function optimizeRebar(R){
  const P=R.P, F=memberForces(R), best={}, SP=[100,125,150,175,200,250,300], BL=Object.keys(BARS).filter(k=>k!=="H13");
  const pick=(k,fn)=>{ let b=null; BL.forEach(bar=>SP.forEach(s=>{ const rb={bar,s}, r=fn(rb); if(r.ok){ const wt=BARS[bar].w*1000/s; if(!b||wt<b.wt-1e-9) b={rb,wt}; } })); best[k]=b?b.rb:{bar:"H35",s:100}; return !!b; };
  const fail=[];
  if(!pick("sT",rb=>flexCheck(P,Math.max(F.slab.Mmid,F.slab.Mheel),F.slab.Mms,F.slab.V,F.slab.t,rb))) fail.push("저판 상면");
  if(!pick("sB",rb=>flexCheck(P,F.slab.Msup,F.slab.Mss,F.slab.V,F.slab.t,rb))) fail.push("저판 하면");
  if(!pick("wH",rb=>hoopCheck(P,F.wall.Tu,F.wall.Ts,F.wall.t,rb))) fail.push("벽체 원주");
  if(!pick("wV",rb=>flexCheck(P,F.wall.Mu,F.wall.Ms,F.wall.p0/(2*F.wall.beta),F.wall.t,rb))) fail.push("벽체 연직");
  if(F.cone){ if(!pick("kH",rb=>hoopCheck(P,F.cone.Tu,F.cone.Ts,F.cone.tn,rb))) fail.push("원추 원주");
    if(!pick("kM",rb=>flexCheck(P,F.cone.Mu,F.cone.Ms,F.cone.p0/(2*F.cone.beta),F.cone.tn,rb))) fail.push("원추 자오선"); }
  else { best.kH=(P.rb||DEF_RB).kH; best.kM=(P.rb||DEF_RB).kM; }
  { let b=null; ["H25","H29","H32","H35"].forEach(bar=>COL_SP.forEach(s=>{ const r=colCheck(P,F.col.Pu,F.col.Mu,F.col.Vu,F.col.ro,F.col.ri,{bar,s}); if(r.ok){ const wt=r.Ast; if(!b||wt<b.wt) b={rb:{bar,s},wt}; } }));
    best.cL=b?b.rb:{bar:"H35",s:100}; if(!b) fail.push("기둥 하단"); }
  return {rb:best,fail};
}
/* 최적 제원: 직경·하부 높이 격자 탐색 (콘크리트 최소) */
function sizeCandidates(P0){
  const cais=P0.type==="caisson";
  const Dk=cais?"cDw":"Dw", Hk=cais?"cH":"hw";
  const heel=cais?Math.max(0,(P0.cDs-P0.cDw)/2):Math.max(0,(P0.Db-P0.Dw)/2);
  const D0=P0[Dk];
  const Dmin=Math.max(cais?2*shaftR(P0).ro+6:P0.Dt+4,Math.floor(D0*0.6)), Dmax=Math.ceil(Math.max(D0*1.8,D0+12));
  const Hmin=cais?Math.max(P0.cts+P0.ctt+2,4):2, Hmax=cais?Math.max(P0.cH+8,16):Math.max(P0.hw+8,14);
  const apply=(D,H)=>{ const P={...P0,fast:1}; P[Dk]=D; P[Hk]=H; if(cais){ P.cDs=D+2*heel; P.zf1=Math.min(P0.zf1-(P0.cH-H),H-P.ctt); if(P.zc0>H) P.zc0=P.cts; }
    else { P.Db=D+2*heel; const dz=H-P0.hw; P.zf1=P0.zf1+dz; if(P.zf2) P.zf2=P0.zf2+dz; P.rings=(P0.rings||[]).map(r=>({...r,D:Math.min(r.D,D-2*P.tw-0.2)})); }
    return P; };
  return {Dk,Hk,heel,Dmin,Dmax,Hmin,Hmax,apply};
}
function evalSize(P,opt){
  const r=compute(P), f=r.flt;
  const okStab=r.LC.every(l=>l.ok), okTow=!opt.tow||(f&&f.okGM&&f.okT&&f.zone==="wide");
  const chk=[]; r.LC.forEach(l=>{ chk.push({n:`${l.id} 전도`,v:l.FSo,c:l.fs.o,r:l.FSo/l.fs.o}); chk.push({n:`${l.id} 활동`,v:l.FSs,c:l.fs.s,r:l.FSs/l.fs.s});
    chk.push({n:`${l.id} 지지력`,v:l.qcheck,c:l.qa,r:l.qa/l.qcheck,inv:1});
    if(l.fs.gap) chk.push({n:`${l.id} 편심`,v:l.e,c:r.Rbase/4,r:l.e>0?(r.Rbase/4)/l.e:9,inv:1}); else chk.push({n:`${l.id} 유효접지율`,v:l.ratioA,c:P.aeff,r:l.ratioA/P.aeff}); });
  if(opt.tow){ if(!f) chk.push({n:"예인 (부유하지 않음)",v:0,c:1,r:0}); else { chk.push({n:"예인 GM",v:f.GM,c:P.gmMin,r:f.GM>=P.gmMin?1+f.GM/10:Math.min(0.99,Math.max(0,f.GM/P.gmMin))});
    chk.push({n:"예인 흘수",v:f.T,c:P.dTow-P.ukc,r:(P.dTow-P.ukc)/f.T,inv:1}); } }
  const fails=chk.filter(c=>c.r<1-1e-9).sort((a,b)=>a.r-b.r);
  const minFS=Math.min(...chk.filter(c=>!c.n.startsWith("예인")).map(c=>c.r));
  return {ok:okStab&&okTow,okStab,okTow,Vc:r.Vc,minFS,fails,gf:P.gf,T:f?f.T:NaN,GM:f?f.GM:NaN,LC:r.LC.map(l=>({id:l.id,ok:l.ok,FSo:l.FSo,FSs:l.FSs,ratioA:l.ratioA,q:l.qcheck}))};
}

/* 최적 배근 + 필요하면 두께 조정 (저판 전단, 벽체·원추) */
/* 두께 자동 조정 상한 (실무 범위, 넘으면 제원 변경 필요로 알림) */
const THK_MAX={tb:3.0,cts:3.0,tw:1.0,ctw:1.0,tkh:1.0};
function optimizeAll(P0,adjust,noCol){
  let P={...P0}; const log=[], lim=[];
  const done=(R,o)=>({P:{...P,rb:o.rb},fail:o.fail,log,lim});
  for(let it=0; it<40; it++){
    const R=compute(P), o=optimizeRebar(R);
    if(!adjust||!o.fail.length) return done(R,o);
    const m=memberDesign(R,o.rb); let ch=false;
    const up=(k,v,nm,mx)=>{ const nv=Math.min(mx,Math.ceil(v*20)/20); if(nv>P[k]+1e-9){ const i=log.findIndex(l=>l.k===k); if(i<0) log.push({k,nm,a:P0[k],b:nv}); else log[i].b=nv; P[k]=nv; ch=true; }
      else if(!lim.some(l=>l.k===k)) lim.push({k,nm,mx}); };
    const cais=P.type==="caisson";
    if(!m.sT.ok||!m.sB.ok){ const k=cais?"cts":"tb"; up(k,Math.max(m.sT.tReq,m.sB.tReq,P[k]+0.1),cais?"하부 슬래브 두께":"저판 두께",THK_MAX[k]); }
    if(!m.wH.ok||!m.wV.ok){ const k=cais?"ctw":"tw"; up(k,P[k]+0.1,cais?"외벽 두께":"원통 벽두께",THK_MAX[k]); }
    if(m.kH&&(!m.kH.ok||!m.kM.ok)) up("tkh",P.tkh+0.1,"원추 벽두께",THK_MAX.tkh);
    if(!m.cL.ok&&!noCol) up("tc",P.tc+0.1,"기둥 벽두께",Math.floor(0.4*P.Dc/2*20)/20);
    if(!ch||(noCol&&o.fail.every(f=>f==="기둥 하단"))) return done(R,o);
  }
  const R=compute(P), o=optimizeRebar(R); return done(R,o);
}
/* 부재설계 자동 수정: 철근 → 두께(상한 THK_MAX) → 그래도 N.G면 제원
   기둥 하단 N.G → 기둥 외경 Dc + 0.2 m (원추형은 원추 상단 외경 Dt도 같이, 육각 샤프트는 한 변 + 0.1 m)
   저판 N.G → 저판 직경 + 1.0 m (원통·외벽 직경도 같은 양만큼, 저판과의 차이 유지)
   상한: Dc ≤ 15 m, 저판 직경 ≤ 60 m (가정) */
const DIM_MAX={Dc:15,base:60};
function optimizeMember(P0,noCol){
  let P={...P0}; const dims=[]; let r=optimizeAll(P,true,noCol);
  const bump=(k,d,nm)=>{ const i=dims.findIndex(x=>x.k===k); const nv=Math.round((P[k]+d)*100)/100; if(i<0) dims.push({k,nm,a:P0[k],b:nv}); else dims[i].b=nv; P[k]=nv; };
  for(let it=0; it<80 && r.fail.some(f=>!noCol||f!=="기둥 하단"); it++){
    const cais=P.type==="caisson"; let ch=false;
    if(r.fail.includes("기둥 하단")&&!noCol){
      if(P.shp==="hex"){ if(P.ha+0.1<=DIM_MAX.Dc/2+1e-9){ bump("ha",0.1,"육각 샤프트 한 변"); ch=true; } }
      else if(P.Dc+0.2<=DIM_MAX.Dc+1e-9){ const tied=!cais&&Math.abs(P.Dt-P.Dc)<0.05; bump("Dc",0.2,"기둥 외경"); if(tied) bump("Dt",0.2,"원추 상단 외경"); ch=true; } }
    if(r.fail.some(f=>f.startsWith("저판"))){ const kb=cais?"cDs":"Db", kw=cais?"cDw":"Dw";
      if(P[kb]+1<=DIM_MAX.base+1e-9){ bump(kb,1,cais?"하부 슬래브 직경":"저판 직경"); bump(kw,1,cais?"케이슨 외벽 직경":"원통 외경"); ch=true; } }
    if(!ch) break;
    // 두께는 원래 값에서 다시 시작해 필요한 만큼만 키움
    ["tb","cts","tw","ctw","tkh","tc"].forEach(k=>P[k]=P0[k]);
    r=optimizeAll(P,true,noCol);
  }
  return {...r,dims};
}

/* 부재설계 + 고유진동수 동시 자동 수정 (중력식)
   ① 저판·벽체·원추: 철근 → 두께 → 저판 직경 (기둥은 손대지 않음, 진동수 영향 작음)
   ② 기둥 하단: 강성을 덜 키우는 순서로 찾음 — 철근(H35@100까지) → 콘크리트 강도 → 벽두께 → 외경
      (f_ck, 벽두께)마다 기둥 강도를 만족하는 최소 외경과 진동수 허용 구간(soft-stiff)에 드는 외경 범위를
      이분법으로 구해, 겹치는 범위에서 지금 외경에 가장 가까운 값을 고름. 처음 찾은 조합을 씀 */
const FCK_UP=[45,50,55,60], TC_MIN=0.4;   // 기둥 벽두께 하한 0.4 m (가정)
function optimizeMemberFreq(P0){
  const hex=P0.shp==="hex", kD=hex?"ha":"Dc", st=hex?0.1:0.2, dmin=hex?1.5:3, dmax=hex?DIM_MAX.Dc/2:DIM_MAX.Dc;
  const tied=P0.type!=="caisson"&&!hex&&Math.abs(P0.Dt-P0.Dc)<0.05;
  const setD=(P,d)=>{ const Q={...P,[kD]:d}; if(tied) Q.Dt=d; return Q; };
  const colOK=Q=>{ const R=compute({...Q,fast:1}), C=memberForces(R).col; return colCheck(Q,C.Pu,C.Mu,C.Vu,C.ro,C.ri,{bar:"H35",s:COL_SP[0]}).ok; };
  const frq=Q=>compute({...Q,fast:1}).freq;
  // ① 기둥 외 부재
  const a=optimizeMember(P0,true); let P={...a.P}; const dims=[...a.dims], log=[...a.log];
  const F0=frq(P), note=[];
  if(F0&&!(F0.calc&&F0.calc.cal)){ const r=optimizeMember(P0); return {...r,freqOK:false,lo:F0.lo,hi:F0.hi,note:["이 터빈은 타워 제원(길이·직경)과 기준 진동수가 없어 고유진동수를 계산하지 못하고 입력한 비교값을 그대로 씁니다. 기초를 바꿔도 진동수가 변하지 않으니, 터빈 편집에서 타워 길이·하단·상단 직경이나 기준 진동수를 넣어 주세요. 부재설계만 맞췄습니다."]}; }
  if(!F0||!F0.f||!F0.valid||!(F0.lo<F0.hi)){ const r=optimizeMember(P0); return {...r,freqOK:null,note:["진동수 허용 구간을 정할 수 없어 부재설계만 맞췄습니다."]}; }
  const lo=F0.lo, hi=F0.hi, d0=P[kD], mg=Math.min(0.003,(hi-lo)/10), lo2=lo+mg, hi2=hi-mg;   // 경계에 딱 붙지 않게 여유
  const snap=v=>+(Math.round(v/st)*st).toFixed(2);
  // 단조 함수 경계 찾기: pred(d)가 d 증가에 따라 false→true 로 바뀌는 첫 d
  const firstTrue=(pred,a,b)=>{ if(pred(a)) return a; if(!pred(b)) return null; while(b-a>st+1e-9){ const m=snap((a+b)/2); if(m<=a||m>=b) break; if(pred(m)) b=m; else a=m; } return b; };
  const fck0=P.fck, tc0=P.tc, fcks=[fck0,...FCK_UP.filter(v=>v>fck0)];
  let pick=null;
  for(const fck of fcks){
    // 벽두께 후보: 지금 값 → 0.1 m씩 키움(≤ 1.5 m) → 그래도 없으면 지금 값보다 얇게(≥ 0.4 m, 앞선 수정으로 두꺼워진 경우)
    const tcs=[]; for(let t=tc0; t<=Math.max(tc0,1.5)+1e-9; t=Math.round((t+0.1)*100)/100) tcs.push(t);
    for(let t=Math.round((tc0-0.1)*100)/100; t>=TC_MIN-1e-9; t=Math.round((t-0.1)*100)/100) tcs.push(t);
    for(const tc of tcs){ if(pick) break;
      const base={...P,fck,tc}, okT=d=>tc<=Math.max(tc0,0.4*(hex?d*Math.sqrt(3)/2:d/2))+1e-9&&tc<(hex?d*Math.sqrt(3)/2:d/2)-0.3;
      const Dcol=firstTrue(d=>okT(d)&&colOK(setD(base,d)),dmin,dmax); if(Dcol==null) continue;
      const Dlo=firstTrue(d=>frq(setD(base,d)).f>=lo2,dmin,dmax), DhiX=firstTrue(d=>frq(setD(base,d)).f>hi2,dmin,dmax);
      const L=Math.max(Dcol,Dlo==null?dmax+1:Dlo), U=DhiX==null?dmax:snap(DhiX-st);
      if(L>U+1e-9) continue;
      let d=Math.min(U,Math.max(L,snap(d0))); const Q=setD(base,d), fq=frq(Q);
      if(!(fq.f>=lo2&&fq.f<=hi2)||!colOK(Q)) continue;
      pick={Q,fck,tc,d,f:fq.f};
    }
    if(pick) break;
  }
  if(!pick){ const r=optimizeMember(P0); return {...r,freqOK:false,lo,hi,note:[`f_ck ${fcks[fcks.length-1]} MPa, 기둥 벽두께 ${fx2(TC_MIN)}~${fx2(Math.max(tc0,1.5))} m, 철근 H35@${COL_SP[0]}까지 써도 기둥 강도와 진동수 허용 구간(${fx3(lo)}~${fx3(hi)} Hz)을 함께 만족하는 외경이 없습니다. 부재설계만 맞췄습니다.`]}; }
  // ② 결과 정리 후 기둥 외 부재 다시 확인
  let Q=pick.Q; const r2=optimizeAll(Q,true,true); Q={...r2.P};
  const add=(k,nm,b)=>{ if(Math.abs(P0[k]-b)<1e-9) return; const L2=(k==="fck"?log:dims); const i=L2.findIndex(x=>x.k===k); if(i<0) L2.push({k,nm,a:P0[k],b,u:k==="fck"?"MPa":"m"}); else L2[i].b=b; };
  add(kD,hex?"육각 샤프트 한 변":"기둥 외경",pick.d); if(tied) add("Dt","원추 상단 외경",pick.d);
  add("tc","기둥 벽두께",pick.tc); add("fck","콘크리트 f_ck",pick.fck);
  r2.log.forEach(l=>{ const i=log.findIndex(x=>x.k===l.k); if(i<0) log.push({...l,a:P0[l.k]}); else log[i].b=l.b; });
  const fF=frq(Q).f;
  return {P:Q,fail:r2.fail,log,dims,lim:r2.lim,freqOK:fF>=lo&&fF<=hi,lo,hi,f:fF,note};
}
function fx2(v){ return (Math.round(v*100)/100).toFixed(2); }
function fx3(v){ return (Math.round(v*1000)/1000).toFixed(3); }
