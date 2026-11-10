/*PILE*/
/* ---------- 지층 · p-y 말뚝 해석 (모노파일) ----------
   깊이는 원지반(해저면) 아래 m. 지층 하단 깊이로 구분, 마지막 층은 아래로 계속된다고 본다. */
const SOIL_TY={sand:"모래",clay:"점토",rock:"암반"};
const SOIL_PRESETS=[
  {id:"mixed",name:"점토 → 모래 → 풍화암 → 연암 (연안 일반, 가정)",layers:[
    {nm:"해성 점토",ty:"clay",bot:6,g:6.5,su1:10,su2:35},
    {nm:"모래 (중간 조밀)",ty:"sand",bot:16,g:9.0,phi:32},
    {nm:"풍화암",ty:"rock",bot:24,g:10.0,qu:2,Em:200,rqd:0},
    {nm:"연암",ty:"rock",bot:60,g:11.0,qu:10,Em:1500,rqd:25}]},
  {id:"sand",name:"모래 지반 (조밀, 가정)",layers:[
    {nm:"모래 (느슨~중간)",ty:"sand",bot:5,g:9.0,phi:30},
    {nm:"모래 (조밀)",ty:"sand",bot:60,g:10.0,phi:36}]},
  {id:"clay",name:"점토 지반 (연약 → 굳은, 가정)",layers:[
    {nm:"연약 점토",ty:"clay",bot:10,g:6.0,su1:5,su2:30},
    {nm:"중간 점토",ty:"clay",bot:25,g:7.0,su1:40,su2:90},
    {nm:"굳은 점토",ty:"clay",bot:60,g:8.0,su1:100,su2:200}]},
  {id:"rock",name:"얕은 암반 (모래 2 m 아래 연암, 가정)",layers:[
    {nm:"모래 피복",ty:"sand",bot:2,g:9.0,phi:32},
    {nm:"풍화암",ty:"rock",bot:6,g:10.0,qu:3,Em:300,rqd:0},
    {nm:"연암",ty:"rock",bot:60,g:11.0,qu:15,Em:2500,rqd:40}]},
];
const PILE_DEF={soilPre:"mixed",soil:SOIL_PRESETS[0].layers.map(l=>({...l})),mRot:0.25,mFSc:2.0,mFSu:1.5};
Object.assign(DEF,PILE_DEF);
const ES=210e6; // 강재 탄성계수 kN/m²

/* 모래 (API RP 2GEO, Reese) — 계수는 φ로 계산 */
function sandCoef(phiDeg){
  const r=Math.PI/180, f=phiDeg*r, a=f/2, b=(45+phiDeg/2)*r, K0=0.4, Ka=Math.tan((45-phiDeg/2)*r)**2;
  const C1=Math.tan(b)**2*Math.tan(a)/Math.tan(b-f)+K0*(Math.tan(f)*Math.sin(b)/(Math.cos(a)*Math.tan(b-f))+Math.tan(b)*(Math.tan(f)*Math.sin(b)-Math.tan(a)));
  const C2=Math.tan(b)/Math.tan(b-f)-Ka;
  const C3=Ka*(Math.tan(b)**8-1)+K0*Math.tan(f)*Math.tan(b)**4;
  const T=[[25,5.4],[30,10.9],[35,22.0],[40,45.0]]; let k; // 초기 지반반력계수 (수중, MN/m³) — API 그림 근사
  if(phiDeg<=T[0][0]) k=T[0][1]; else if(phiDeg>=T[3][0]) k=T[3][1]; else { const i=T.findIndex(t=>t[0]>=phiDeg)-1; k=T[i][1]+(T[i+1][1]-T[i][1])*(phiDeg-T[i][0])/(T[i+1][0]-T[i][0]); }
  return {C1,C2,C3,Ka,K0,k:k*1000};
}
/* 점토 ε50 (Su로 결정, Peck 등 일반값) */
const eps50=su=>su<25?0.02:su<50?0.01:su<100?0.007:su<200?0.005:0.004;
/* 축방향 (API RP 2GEO 모래 표) */
function sandAxial(phi){ return phi<30?{b:0.29,fm:67,Nq:12,qm:2900,cls:"느슨~중간"}:phi<35?{b:0.37,fm:81,Nq:20,qm:4800,cls:"중간 조밀"}:phi<38?{b:0.46,fm:96,Nq:40,qm:9600,cls:"조밀"}:{b:0.56,fm:115,Nq:50,qm:12000,cls:"매우 조밀"}; }

function rockTop(L,tops,i){ while(i>0&&L[i-1].ty==="rock") i--; return tops[i]; }
function layerAt(L,d){ for(const l of L) if(d<l.bot) return l; return L[L.length-1]; }
function suAt(l,d,top){ const h=Math.max(1e-6,l.bot-top); return l.su1+(l.su2-l.su1)*Math.min(1,Math.max(0,(d-top)/h)); }

/* 깊이별 p-y 곡선 정보 (D: 직경, x: 현 해저면 아래 깊이, d0: 원지반 아래 깊이, sv: 유효상재압) */
function pyAt(L,tops,d0,x,D,sv){
  let li=L.findIndex(l=>d0<l.bot); if(li<0) li=L.length-1; const l=L[li], top=tops[li];
  if(l.ty==="lin") return {l,ty:"lin",k:l.k,pu:Infinity,p:y=>l.k*y};
  if(l.ty==="sand"){ const c=sandCoef(l.phi), xs=Math.max(x,0.01), pus=(c.C1*xs+c.C2*D)*l.g*xs, pud=c.C3*D*l.g*xs, pu=Math.min(pus,pud), A=Math.max(0.9,3-0.8*xs/D), kx=c.k*xs;
    return {l,ty:"sand",c,pu:A*pu,pu0:pu,A,kx,p:y=>A*pu*Math.tanh(kx*y/(A*pu))}; }
  if(l.ty==="clay"){ const su=suAt(l,d0,top), e=eps50(su), J=0.5, pu=Math.min(3*su+sv+J*su*x/D,9*su)*D, y50=2.5*e*D;
    return {l,ty:"clay",su,e,J,pu,y50,p:y=>y>=8*y50?pu:0.5*pu*Math.cbrt(y/y50)}; }
  /* 암반 (Reese 1997 연암) */
  const qu=l.qu*1000, Em=l.Em*1000, ar=1-2/3*(l.rqd||0)/100, xr=Math.max(0,d0-rockTop(L,tops,li)), krm=5e-5, yrm=krm*D;
  const pur=xr<=3*D?ar*qu*D*(1+1.4*xr/D):5.2*ar*qu*D, Kir=(xr<=3*D?100+400*xr/(3*D):500)*Em, yA=Math.pow(pur/(2*Math.pow(yrm,0.25)*Kir),4/3);
  return {l,ty:"rock",ar,xr,krm,yrm,pu:pur,Kir,yA,p:y=>y<=yA?Kir*y:Math.min(pur,pur/2*Math.pow(y/yrm,0.25))};
}

/* 대칭 띠행렬 풀이: Ab[i*(bw+1)+(j-i)] = A(i,j), j ≥ i */
function bandSolve(Ab,b,n,bw){
  const w=bw+1;
  for(let k=0;k<n;k++){ const piv=Ab[k*w], m=Math.min(n-1,k+bw);
    for(let i=k+1;i<=m;i++){ const aki=Ab[k*w+(i-k)]; if(!aki) continue; const f=aki/piv;
      for(let j=i;j<=m;j++) Ab[i*w+(j-i)]-=f*Ab[k*w+(j-k)]; b[i]-=f*b[k]; } }
  const x=new Float64Array(n); for(let i=n-1;i>=0;i--){ let s=b[i]; const m=Math.min(n-1,i+bw); for(let j=i+1;j<=m;j++) s-=Ab[i*w+(j-i)]*x[j]; x[i]=s/Ab[i*w]; } return x; }

/* 해저면에 H, M을 받는 말뚝 비선형 해석 (해저면 아래 부분, 할선 반복) */
function pileFE(sp,H,M,opt){
  const {n,h,EI,kp}=sp, N=2*(n+1);
  const steps=opt&&opt.steps||8, bw=3, W=bw+1, K0=new Float64Array(N*W);
  for(let e=0;e<n;e++){ const k=EI[e]/h**3, K=[[12,6*h,-12,6*h],[6*h,4*h*h,-6*h,2*h*h],[-12,-6*h,12,-6*h],[6*h,2*h*h,-6*h,4*h*h]], d=[2*e,2*e+1,2*e+2,2*e+3];
    for(let a=0;a<4;a++) for(let c=a;c<4;c++) K0[d[a]*W+(d[c]-d[a])]+=k*K[a][c]; }
  const tr=i=>(i===0||i===n)?h/2:h;
  const pf=(c,y)=>c.ty==="lin"?c.k*y:Math.sign(y)*c.p(Math.abs(y));
  const kt=(c,y)=>{ if(c.ty==="lin") return c.k; const a=Math.abs(y), d=Math.max(1e-7,1e-4*a), lo=Math.max(0,a-d); let k=(c.p(a+d)-c.p(lo))/(a+d-lo); const k0=c.p(1e-5)/1e-5; return Math.max(Math.min(k,k0),k0*1e-6); };
  const mulK=u=>{ const r=new Float64Array(N); for(let i=0;i<N;i++){ r[i]+=K0[i*W]*u[i]; for(let j=1;j<=bw&&i+j<N;j++){ const a=K0[i*W+j]; r[i]+=a*u[i+j]; r[i+j]+=a*u[i]; } } return r; };
  const resid=(u,F)=>{ const r=mulK(u); for(let i=0;i<=n;i++) r[2*i]+=pf(kp[i],u[2*i])*tr(i); let nr=0; for(let i=0;i<N;i++){ r[i]=F[i]-r[i]; nr=Math.max(nr,Math.abs(r[i])); } return {r,nr}; };
  let u=new Float64Array(N), ok=true;
  const Fm=Math.max(Math.abs(H),Math.abs(M)/Math.max(1,sp.Le||n*h),1);
  const newton=(u0,lam)=>{ const F=new Float64Array(N); F[0]=H*lam; F[1]=-M*lam; let u=u0, R0=resid(u,F);
    for(let it=0;it<40;it++){
      const A=Float64Array.from(K0); for(let i=0;i<=n;i++) A[2*i*W]+=kt(kp[i],u[2*i])*tr(i);
      const du=bandSolve(A,Float64Array.from(R0.r),N,bw); let ls=1, un, R1;
      for(let k=0;k<12;k++){ un=u.map((v,i)=>v+ls*du[i]); R1=resid(un,F); if(R1.nr<R0.nr||R1.nr<1e-6*Fm) break; ls/=2; }
      let dmax=0, umax=0; for(let i=0;i<N;i+=2){ dmax=Math.max(dmax,Math.abs(un[i]-u[i])); umax=Math.max(umax,Math.abs(un[i])); }
      u=un; R0=R1; if(!isFinite(u[0])) return null; if(R0.nr<1e-5*Fm&&dmax<=1e-8+1e-6*umax) return u; }
    return R0.nr<1e-3*Fm?u:null; };
  let lam=0, dl=1/steps;
  while(lam<1-1e-12){ const tgt=Math.min(1,lam+dl), un=newton(u,tgt);
    if(un&&Math.abs(un[0])<=sp.D/10){ u=un; lam=tgt; dl=Math.min(dl*1.5,1/steps); }
    else if(un){ u=un; ok=false; break; }
    else { dl/=2; if(dl<1/512){ ok=false; break; } } }
  sp.u=u;
  const w=[], th=[], Mx=[], Vx=[], p=[], pu=[], mob=[]; sp.u=null;
  for(let i=0;i<=n;i++){ w.push(u[2*i]); th.push(u[2*i+1]); const c=kp[i], yy=Math.abs(u[2*i]); const pi=c.ty==="lin"?c.k*u[2*i]:Math.sign(u[2*i])*c.p(yy); p.push(pi); pu.push(c.pu); mob.push(isFinite(c.pu)&&c.pu>0?Math.abs(pi)/c.pu:0); }
  for(let e=0;e<n;e++){ const k=EI[e]/h**3, d=[u[2*e],u[2*e+1],u[2*e+2],u[2*e+3]];
    const mi=k*(6*h*d[0]+4*h*h*d[1]-6*h*d[2]+2*h*h*d[3]); Mx.push(-mi); Vx.push(k*(12*d[0]+6*h*d[1]-12*d[2]+6*h*d[3]));
    if(e===n-1){ const mj=k*(6*h*d[0]+2*h*h*d[1]-6*h*d[2]+4*h*h*d[3]); Mx.push(mj); Vx.push(0); } }
  let iM=0; Mx.forEach((m,i)=>{ if(Math.abs(m)>Math.abs(Mx[iM])) iM=i; });
  return {ok,w,th,Mz:Mx,Vz:Vx,p,pu,mob,iM,Mmax:Math.abs(Mx[iM]),xM:iM*h,w0:w[0],th0:th[0],wT:w[n],x:Array.from({length:n+1},(_,i)=>i*h)};
}

/* 해석 모델 만들기 */
function pileModel(P,R,Lemb,hmin){
  const g=R.g, L=P.soil&&P.soil.length?P.soil:SOIL_PRESETS[0].layers, tops=L.map((l,i)=>i?L[i-1].bot:0);
  const yML=R.yML, yToe=Lemb!=null?P.sbDL-Lemb:g.yToe, Le=Math.max(1,yML-yToe), n=Math.max(16,Math.min(120,Math.round(Le/(hmin||0.5)))), h=Le/n;
  const EI=[], kp=[]; let sv=0;
  for(let e=0;e<n;e++){ const y=yML-(e+0.5)*h, D=g.Dp(y), t=g.tAt(y), Di=D-2*t; EI.push(ES*PI/64*(D**4-Di**4)); }
  for(let i=0;i<=n;i++){ const x=i*h, y=yML-x, d0=P.sbDL-y, D=g.Dp(y);
    if(i>0){ const dm=P.sbDL-(y+h/2); sv+=layerAt(L,Math.max(0,dm)).g*h; }
    kp.push(pyAt(L,tops,Math.max(0,d0),x,D,sv)); kp[i].sv=sv; kp[i].d0=d0; kp[i].D=D; }
  return {n,h,EI,kp,Le,yToe,yML,D:g.Dp(yML),L,tops};
}

/* 축방향 지지력 (API RP 2GEO, 개단 강관 — 관내 마찰과 폐색 중 작은 값) */
function axialCap(P,R,sp){
  const {n,h,kp}=sp; let Qo=0,Qi=0; const rows=[];
  for(let i=0;i<n;i++){ const c=kp[i], c2=kp[i+1], l=c.l, D=(c.D+c2.D)/2, t=R.g.tAt(sp.yML-(i+0.5)*h), Di=D-2*t, sv=(c.sv+c2.sv)/2; let f=0, meth="";
    if(l.ty==="sand"){ const a=sandAxial(l.phi); f=Math.min(a.b*sv,a.fm); meth=`β ${a.b}·σ′v ≤ ${a.fm}`; }
    else if(l.ty==="clay"){ const su=c.su, psi=su/Math.max(sv,1e-6), al=Math.min(1,psi<=1?0.5/Math.sqrt(psi):0.5/Math.pow(psi,0.25)); f=al*su; meth=`α ${al.toFixed(2)}·Su`; }
    else if(l.ty==="rock"){ f=Math.min(0.2*Math.sqrt(l.qu)*1000,1000); meth=`0.2√q_u (MPa)`; }
    Qo+=f*PI*D*h; Qi+=f*PI*Di*h; rows.push({x:(i+0.5)*h,nm:l.nm,f,meth}); }
  const c=kp[n], l=c.l, D=c.D, t=R.g.tAt(sp.yToe), Di=D-2*t; let q=0, qm="";
  if(l.ty==="sand"){ const a=sandAxial(l.phi); q=Math.min(a.Nq*c.sv,a.qm); qm=`N_q ${a.Nq}·σ′v ≤ ${a.qm/1000} MPa`; }
  else if(l.ty==="clay"){ q=9*c.su; qm="9·Su"; } else { q=Math.min(2.5*l.qu*1000,30000); qm="2.5·q_u (가정)"; }
  const Aan=PI/4*(D*D-Di*Di), Apl=PI/4*Di*Di, Qun=Qo+Qi+q*Aan, Qpl=Qo+q*(Aan+Apl), Q=Math.min(Qun,Qpl);
  return {Qo,Qi,q,qm,Aan,Apl,Qun,Qpl,Q,mode:Qun<Qpl?"비폐색 (관내 마찰)":"폐색",rows,toeLayer:l.nm};
}

/* 쉘 좌굴 (DNV-RP-C202 3.4, 보강재 없는 원통, 축압축 + 휨) */
function shellBuck(D,t,fy,sa,sm){
  const E=210000, nu=0.3, r=(D-t)/2, l=20, Z=l*l/(r*t)*Math.sqrt(1-nu*nu), xi=0.702*Z;
  const fE=rho=>Math.sqrt(1+(rho*xi)**2)*PI*PI*E/(12*(1-nu*nu))*(t/l)**2;
  const ra=0.5/Math.sqrt(1+r/(150*t)), rm=0.5/Math.sqrt(1+r/(300*t)), fEa=fE(ra), fEm=fE(rm);
  const sj=sa+sm, lam=Math.sqrt(fy/Math.max(sj,1e-9)*(sa/fEa+sm/fEm)), fks=fy/Math.sqrt(1+lam**4), gM=lam<0.5?1.15:lam<=1?0.85+0.6*lam:1.45, fksd=fks/gM;
  return {r,Z,ra,rm,fEa,fEm,sj,lam,fks,gM,fksd,u:sj/fksd};
}

/* 전체 말뚝 해석 */
function computePile(P,R,opt){
  const sp=pileModel(P,R), g=R.g, warns=[];
  const res=R.LC.map(l=>({id:l.id,nm:l.nm,kind:l.kind,H:l.H,M:l.M,V:l.V,...pileFE(pileModel(P,R),l.H,l.M)}));
  const s1=res[0], s2=res[1];
  /* 깊이별 응력·좌굴 (부식 여유 공제) */
  const chk=res.map(r=>{ let um=0,ub=0,xm=0,xb=0,bk=null; const rows=[];
    r.Mz.forEach((m,i)=>{ const x=i*sp.h, y=sp.yML-x, D=g.Dp(y), tc=Math.max(0.001,g.tAt(y)-P.mca/1000), Di=D-2*tc, A=PI/4*(D*D-Di*Di), Z=PI/32*(D**4-Di**4)/D;
      const sa=Math.max(0,r.V)/A/1000, sm=Math.abs(m)/Z/1000, b=shellBuck(D,tc,P.mfy,sa,sm), uy=(sa+sm)/(P.mfy/P.mgM);
      if(uy>um){um=uy;xm=x;} if(b.u>ub){ub=b.u;xb=x;bk={...b,D,tc,sa,sm,x};} if(i%2===0) rows.push({x,D,tc,M:m,sa,sm,uy,ub:b.u}); });
    return {um,xm,ub,xb,bk,rows}; });
  /* 근입깊이: 고정 격자(D/2 간격, 6D까지)에서 상시 회전각·폭풍 수렴 → 소요 근입 = 긴 말뚝(6D) 회전각의 5 % 안 + 허용값 이하 + 폭풍 수렴 */
  const sens=[]; let Lreq=null, Linf=null;
  if(opt&&opt.quick) Lreq=P.mL; else {
    const D=g.Dp(P.sbDL), Lmin=Math.max(R.S+2,D), Lmax=Math.max(6*D,P.mL*1.2);
    const ev=Lx=>{ const hs=Math.max(0.5,(Lx+P.sbDL-R.yML)/40), a=pileFE(pileModel(P,R,Lx,hs),s1.H,s1.M,{steps:3}), b=pileFE(pileModel(P,R,Lx,hs),s2.H,s2.M,{steps:5});
      return {L:Math.round(Lx*10)/10,th:a.ok?Math.abs(a.th0)*180/PI:null,w:a.w0,ok:a.ok&&b.ok,thU:b.ok?Math.abs(b.th0)*180/PI:null,wT:a.wT}; };
    const grid=[]; for(let Lx=Lmin; Lx<Lmax-1e-6; Lx+=D/2) grid.push(Lx); grid.push(Lmax); if(!grid.some(x=>Math.abs(x-P.mL)<0.05)) grid.push(P.mL); grid.sort((a,b)=>a-b);
    grid.forEach(Lx=>sens.push(ev(Lx)));
    const inf=sens[sens.length-1]; Linf=inf.L;
    if(inf.ok){ const good=s=>s.ok&&s.th!==null&&s.th<=1.05*inf.th&&s.th<=P.mRot;
      const j=sens.findIndex(good);
      if(j>=0){ let hi=sens[j].L, lo=j>0?sens[j-1].L:hi;
        for(let k=0;k<5&&hi-lo>0.25;k++){ const m=(lo+hi)/2; if(good(ev(m))) hi=m; else lo=m; }
        Lreq=Math.ceil(hi*2)/2; } } }
  const ax=axialCap(P,R,sp);
  const Vs=res[0].V, Vu=res[1].V;
  const rot={th:Math.abs(s1.th0)*180/PI,lim:P.mRot}; rot.ok=rot.th<=rot.lim&&s1.ok;
  const out={sp,res,chk,sens,Lreq,Linf,ax,Vs,Vu,rot,warns};
  out.okAx=ax.Q/P.mFSc>=Vs&&ax.Q/P.mFSu>=Vu;
  out.okEmb=Lreq!==null&&Lreq<=P.mL+1e-6;
  out.okU=res.every(r=>r.ok);
  out.um=Math.max(...chk.filter((c,i)=>res[i].kind!=="SLS").map(c=>c.um)); out.ub=Math.max(...chk.filter((c,i)=>res[i].kind!=="SLS").map(c=>c.ub));
  if(!out.okU) warns.push({k:"pyFail",msg:`${res.filter(r=>!r.ok).map(r=>r.id).join(", ")} 하중에서 지반 저항이 부족해 말뚝 해석이 수렴하지 않습니다(해저면 변위가 직경의 10 %를 넘거나 반복 계산이 수렴하지 않음).`});
  if(!rot.ok&&s1.ok) warns.push({k:"rot",msg:`상시(LC1) 해저면 회전각 ${rot.th.toFixed(3)}°가 허용 ${rot.lim}°를 넘습니다.`});
  if(Lreq===null||Lreq>P.mL+1e-6) warns.push({k:"emb",msg:Lreq===null?`근입깊이를 ${fmt(Linf||0)} m까지 늘려도 회전각 기준을 만족하지 못하거나 폭풍 하중에서 수렴하지 않습니다.`:`근입깊이 ${P.mL} m가 소요 근입 ${Lreq} m보다 짧습니다.`,Lreq});
  if(out.um>1) warns.push({k:"pyY",msg:`말뚝 단면 응력비 ${out.um.toFixed(2)}로 1을 넘습니다 (p-y 깊이별 모멘트).`});
  if(out.ub>1) warns.push({k:"pyB",msg:`쉘 좌굴 이용률 ${out.ub.toFixed(2)}로 1을 넘습니다 (DNV-RP-C202).`});
  if(!out.okAx) warns.push({k:"ax",msg:`축방향 지지력 ${Math.round(ax.Q)} kN이 부족합니다 (상시 ${Math.round(Vs)} × ${P.mFSc}, 폭풍 ${Math.round(Vu)} × ${P.mFSu}).`});
  return out;
}

/* ---------- 고유진동수 (보 모델 + 지반 스프링, 역반복법) ----------
   요소 {L, EI (kN·m²), m (t/m)}, 절점 집중질량 (t), 절점 수평 스프링 (kN/m). 단위: kN, m, t, s */
function beamFreq(els,lump,spr,fixBase,rspr,rlump){
  const n=els.length, N=2*(n+1), bw=3, W=bw+1, K=new Float64Array(N*W), Mb=new Float64Array(N*W);
  els.forEach((e,i)=>{ const L=e.L, k=e.EI/L**3, c=e.m*L/420, d=[2*i,2*i+1,2*i+2,2*i+3];
    const Ke=[[12,6*L,-12,6*L],[6*L,4*L*L,-6*L,2*L*L],[-12,-6*L,12,-6*L],[6*L,2*L*L,-6*L,4*L*L]];
    const Me=[[156,22*L,54,-13*L],[22*L,4*L*L,13*L,-3*L*L],[54,13*L,156,-22*L],[-13*L,-3*L*L,-22*L,4*L*L]];
    for(let a=0;a<4;a++) for(let b=a;b<4;b++){ K[d[a]*W+d[b]-d[a]]+=k*Ke[a][b]; Mb[d[a]*W+d[b]-d[a]]+=c*Me[a][b]; } });
  (lump||[]).forEach(([i,m])=>{ Mb[2*i*W]+=m; });
  (spr||[]).forEach(([i,k])=>{ K[2*i*W]+=k; });
  (rspr||[]).forEach(([i,k])=>{ K[(2*i+1)*W]+=k; });
  (rlump||[]).forEach(([i,j])=>{ Mb[(2*i+1)*W]+=j; });
  if(fixBase){ K[0]+=1e14; K[W]+=1e14; }
  const mulM=x=>{ const r=new Float64Array(N); for(let i=0;i<N;i++){ r[i]+=Mb[i*W]*x[i]; for(let j=1;j<=bw&&i+j<N;j++){ const a=Mb[i*W+j]; r[i]+=a*x[i+j]; r[i+j]+=a*x[i]; } } return r; };
  let x=new Float64Array(N); for(let i=0;i<N;i+=2) x[i]=(i/N)**2+1e-3; let lam=0;
  for(let it=0;it<80;it++){ const y=bandSolve(Float64Array.from(K),mulM(x),N,bw); const My=mulM(y); let yMy=0,xMy=0; for(let i=0;i<N;i++){ yMy+=y[i]*My[i]; xMy+=x[i]*My[i]; }
    const nl=xMy/yMy, s=1/Math.sqrt(yMy); x=y.map(v=>v*s); if(it>3&&Math.abs(nl-lam)<1e-10*nl){ lam=nl; break; } lam=nl; }
  return {f:Math.sqrt(lam)/(2*PI),mode:Array.from({length:n+1},(_,i)=>x[2*i])};
}
/* 타워: 인터페이스 ~ 허브, 직경이 위로 0.6배까지 줄어드는 강관(가정). EI ∝ D³, 질량 ∝ D */
function towerEls(T,P,EI0,nE){
  const yIf=T.ifz+P.msl, Lt=Math.max(1,T.hub-T.ifz), W=turbWeight(T)/G;
  const split=T.rna>0&&T.tower>0, mR=split?T.rna:0.4*W, mT=split?T.tower:0.6*W, r=0.6;
  const sh=s=>1-(1-r)*s, avg=(1+r)/2, m0=mT/(Lt*avg), els=[];
  for(let i=0;i<nE;i++){ const s=(i+0.5)/nE; els.push({L:Lt/nE,EI:EI0*sh(s)**3,m:m0*sh(s)}); }
  return {els,mR,mT,Lt,yIf,split,r};
}
/* 타워 치수(길이·하단/상단 직경)가 있으면 질량으로 등가 두께를 구해 EI를 직접 계산 */
function towerGeom(T,P,nE){
  const yIf=T.ifz+P.msl, Lt=T.twL>0?T.twL:Math.max(1,T.hub-T.ifz), Db=T.twDb, Dt=T.twDt>0?T.twDt:Db*0.6, mT=T.tower, mR=T.rna, shell=0.9;
  const Dav=(Db+Dt)/2, t=T.twt>0?T.twt/1000:shell*mT/(P.mgs/G*PI*Dav*Lt), els=[];
  for(let i=0;i<nE;i++){ const s=(i+0.5)/nE, D=Db+(Dt-Db)*s; els.push({L:Lt/nE,EI:ES*PI/64*(D**4-(D-2*t)**4),m:mT/Lt*D/Dav}); }
  const hub=T.hub-T.ifz-Lt; // 타워 꼭대기 ~ 허브 중심 (강체로 보고 RNA를 타워 꼭대기에)
  return {els,mR,mT,Lt,yIf,split:true,r:Dt/Db,t,shell,Db,Dt,EI0:els[0].EI,gap:hub};
}
function calibTower(T,P){
  if(T.twDb>0&&T.rna>0&&T.tower>0){ const nE=20, tw=towerGeom(T,P,nE); return {mode:"geom",...tw,fchk:beamFreq(tw.els,[[nE,tw.mR]],[],true).f}; }
  if(!(T.fref>0)) return null;
  let EI0=1e8; const nE=20;
  for(let k=0;k<6;k++){ const tw=towerEls(T,P,EI0,nE), f=beamFreq(tw.els,[[nE,tw.mR]],[],true).f; EI0*=(T.fref/f)**2; }
  const tw=towerEls(T,P,EI0,nE); return {mode:"calib",EI0,...tw,fchk:beamFreq(tw.els,[[nE,tw.mR]],[],true).f};
}
/* 모노파일 전체 모델: 선단 ~ 해저면(지반 스프링) ~ 인터페이스(말뚝·TP·물) ~ 허브(타워·RNA) */
function monoFreq(P,R,PY){
  const T=R.T, cal=calibTower(T,P); if(!cal) return {cal:null};
  const g=R.g, sp=PY.sp, rw=P.gw/G, els=[], lump=[];
  const area=(D,t)=>PI*t*(D-t), Iof=(D,t)=>PI/64*(D**4-(D-2*t)**4);
  /* 해저면 아래: sp 절점 (선단 → 해저면 순서로 뒤집음) */
  const nb=sp.n; for(let e=nb-1;e>=0;e--){ const y=sp.yML-(e+0.5)*sp.h, D=g.Dp(y), t=g.tAt(y), Di=D-2*t, gs=layerAt(sp.L,Math.max(0,P.sbDL-y)).g+P.gw;
    els.push({L:sp.h,EI:ES*Iof(D,t),m:area(D,t)*P.mgs/G+PI/4*Di*Di*gs/G}); }
  const iML=nb;
  /* 해저면 위: 약 1 m 요소 */
  const nA=Math.max(8,Math.round((R.yIf-sp.yML)/1)), hA=(R.yIf-sp.yML)/nA, mg=P.mmg/1000;
  for(let e=0;e<nA;e++){ const y=sp.yML+(e+0.5)*hA, D=g.Dp(y), t=g.tAt(y), Di=D-2*t; let EI=0, m=0, Dout=D;
    const inPile=y<=P.mtop, inTP=y>=g.yTP0&&y<=g.yTP1;
    if(inPile){ EI+=ES*Iof(D,t); m+=area(D,t)*P.mgs/G; }
    if(inTP){ const Dt=g.DTP; EI+=ES*Iof(Dt,g.tTP); m+=area(Dt,g.tTP)*P.mgs/G; Dout=Dt; if(g.grout&&y<=P.mtop) m+=PI/4*((g.Dtop+2*P.mgap)**2-g.Dtop**2)*P.mgg/G; }
    if(!inPile&&!inTP){ EI=ES*Iof(g.Dtop,g.tTP); m=area(g.Dtop,g.tTP)*P.mgs/G; }
    if(y<P.hwl){ const di=inPile?Di:(g.Dtop-2*g.tTP); m+=PI/4*di*di*rw+PI/4*(Dout+(y<=P.msl+2?2*mg:0))**2*rw; }
    els.push({L:hA,EI,m}); }
  const iIf=els.length; lump.push([iIf,P.mWsec/G]);
  cal.els.forEach(e=>els.push({...e})); lump.push([els.length,cal.mR]);
  /* 지반 스프링: 상시(LC1) 할선 강성 / 그 변위의 1/10에서 할선 강성 (초기 강성 근사) */
  const r1=PY.res[0], small=!r1.ok, springs=fac=>{ const s=[]; for(let i=0;i<=nb;i++){ const c=sp.kp[i], y=small?(fac<1?1e-5:1e-4)*sp.D:Math.max(Math.abs(r1.w[i])*fac,1e-5*sp.D), k=c.ty==="lin"?c.k:c.p(y)/y, tr=(i===0||i===nb)?sp.h/2:sp.h; s.push([iML-i,k*tr]); } return s; };
  const lo=beamFreq(els,lump,springs(1),false), hi=beamFreq(els,lump,springs(0.1),false), fix=beamFreq(els.slice(iML),lump.map(([i,m])=>[i-iML,m]),[],true);
  const band=freqBand(T,P), zL=band.zone(lo.f), zH=band.zone(hi.f), ok=zL&&zH?zL.ok&&zH.ok:null;
  const yN=[g.yToe]; els.forEach(e=>yN.push(yN[yN.length-1]+e.L));
  return {cal,lo,hi,fix,band,zL,zH,ok,small,iML,iIf,nEl:els.length,els,lump,yN,yHub:R.yIf+cal.Lt};
}

/* ---------- 중력식 고유진동수: 콘크리트 기초(높이별 단면) + 타워 + RNA, 저판 아래 지반 스프링 ----------
   z = 저판 하면 기준 높이(m). 콘크리트 E_c = 8500·∛f_cm (KDS 14 20 10), f_cm = f_ck + Δf */
function gravFreq(P,G0){
  const T=G0.T, cal=calibTower(T,P); if(!cal) return {cal:null};
  const fck=P.fck||45, df=fck<=40?4:fck>=60?6:4+(fck-40)/10, fcm=fck+df, Ec=8500*Math.cbrt(fcm)*1000;
  const top=P.ztop, nE=Math.max(24,Math.round(top/1.0)), h=top/nE, dH=P.hwl-P.zbDL, rw=P.gw/G, els=[], rl=[], zf1=Math.min(P.zf1,G0.z2), rsi=G0.rsi;
  let Mc=0,Mf=0,Ma=0;
  for(let e=0;e<nE;e++){ const z=(e+0.5)*h, iv=[]; let ra=0, re=0;
    G0.parts.forEach(p=>{ if(z>=p.z0&&z<p.z1){ if(p.area){ ra+=p.area; return; } const ro=p.ro(z), ri=Math.max(0,p.ri(z)); if(ro>ri){ iv.push([ri,ro]); if(ro>re) re=ro; } } });
    iv.sort((a,b)=>a[0]-b[0]); const mg=[]; iv.forEach(s=>{ if(mg.length&&s[0]<=mg[mg.length-1][1]+1e-12) mg[mg.length-1][1]=Math.max(mg[mg.length-1][1],s[1]); else mg.push([s[0],s[1]]); });
    let A=0,I=0,J=0; mg.forEach(([a,b])=>{ A+=PI*(b*b-a*a); I+=PI/4*(b**4-a**4); J+=PI*(b*b-a*a)*(b*b+a*a)/4; });
    /* 빈 공간: 기둥 밖(g1)은 zf1까지, 기둥 안(g2)은 zf2까지 속채움 */
    let st=0,g1=0,g2=0,j1=0,j2=0; const colOn=z>=P.zc0&&z<P.ztop;
    mg.forEach(s=>{ if(s[0]>st+1e-12){ const a=PI*(s[0]**2-st**2), jj=a*(s[0]**2+st**2)/4; if(colOn&&s[0]<=rsi+1e-9){ g2+=a; j2+=jj; } else { g1+=a; j1+=jj; } } st=Math.max(st,s[1]); });
    const raE=Math.min(ra,g1); A+=raE; g1-=raE;
    let mc=A*P.gc/G, mf=0, jf=0;
    if(z<=zf1){ mf+=g1*P.gf/G; jf+=j1*P.gf/G; } if(z<=P.zf2){ mf+=g2*P.gf/G; jf+=j2*P.gf/G; }
    const ma=z<dH?PI*re*re*rw:0;  // 부가질량 (배제수, C_a = 1)
    Mc+=mc*h; Mf+=mf*h; Ma+=ma*h;
    els.push({L:h,EI:Ec*I,m:mc+mf+ma}); const jr=(J*P.gc/G+jf)*h/2; rl.push([e,jr],[e+1,jr]); }
  const iTop=els.length; cal.els.forEach(x=>els.push({...x})); const lump=[[els.length,cal.mR]];
  /* 저판 아래 지반: 원형 기초 탄성 반무한체 (Gazetas) */
  const Rb=G0.Rbase, Gs=(P.gG||0)*1000, nu=P.gNu||0.3, Kh=8*Gs*Rb/(2-nu), Kr=8*Gs*Rb**3/(3*(1-nu));
  const fixed=P.gBase==="fix"||!(Gs>0);
  const r=beamFreq(els,lump,fixed?[]:[[0,Kh]],fixed,fixed?[]:[[0,Kr]],rl);
  const rFix=fixed?r:beamFreq(els,lump,[],true,[],rl);
  const yN=[0]; els.forEach(x=>yN.push(yN[yN.length-1]+x.L));
  const band=freqBand(T,P), zn=band.zone(r.f);
  return {cal,f:r.f,fFix:rFix.f,mode:r.mode,yN,iTop,Ec,fcm,Kh,Kr,Rb,Gs,nu,fixed,band,z:zn,ok:zn?zn.ok:null,Mc,Mf,Ma,nE,ref:P.f1};
}
