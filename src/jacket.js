/*JACKET*/
/* ---------- 자켓 (3각·4각, X 브레이스, 항타 말뚝) ----------
   좌표: x·y 수평(m), z = DL 표고(m). 단위 kN, m, t. 계산은 DOM 없이 순수 함수. */
const JACKET_DEF={
  jWb:14.0,jWt:9.0,jN:4,jRat:0.85,jTPh:4.0,jStub:1.0,jHz:"0",
  jLD:1.2,jLt:50,jBrD:0.8,jBrt:20,jMbD:0.8,jMbt:20,jFlood:"1",jMg:50,
  jfy:355,jgM:1.15,jgE:1.35,
  jWtp:3500,jWsec:800,jPD:1.8,jPt:50,jPL:40,jDir:0,jSc:"1",jScK:5,jScT:1.0,jScS:1.3,
};
Object.assign(DEF,JACKET_DEF);
CAT_OF.jk3="jacket"; CAT_OF.jk4="jacket";

/* 형상: 절점·부재 */
function jacketGeom(P){
  const nL=P.type==="jk3"?3:4, T=turbineOf(P), yIf=T.ifz+P.msl, zt=yIf-P.jTPh, zb=P.sbDL+P.jStub, H=Math.max(1,zt-zb);
  const n=Math.max(1,Math.round(P.jN)), r=P.jRat>0?P.jRat:1;
  const hs=[]; { const h1=Math.abs(r-1)<1e-9?H/n:H*(1-r)/(1-Math.pow(r,n)); for(let i=0;i<n;i++) hs.push(h1*Math.pow(r,i)); }
  const lev=[zb]; hs.forEach(h=>lev.push(lev[lev.length-1]+h)); lev[n]=zt;
  const Bz=z=>P.jWb+(P.jWt-P.jWb)*(z-zb)/H;                         // 인접 다리 중심 간격
  const Rz=z=>nL===4?Bz(z)/Math.SQRT2:Bz(z)/Math.sqrt(3);          // 중심~다리
  const ang=k=>nL===4?(45+90*k)*PI/180:(90+120*k)*PI/180;
  const nodes=[], mem=[], legNode=[];
  const add=(x,y,z,tag)=>{ nodes.push({x,y,z,tag}); return nodes.length-1; };
  for(let k=0;k<nL;k++){ legNode.push(lev.map(z=>add(Rz(z)*Math.cos(ang(k)),Rz(z)*Math.sin(ang(k)),z,`L${k+1}`))); }
  const L=(a,b,grp,D,t,K)=>mem.push({a,b,grp,D,t:t/1000,K});
  for(let k=0;k<nL;k++) for(let i=0;i<n;i++) L(legNode[k][i],legNode[k][i+1],"leg",P.jLD,P.jLt,1.0);
  /* X 브레이스: 면마다, 칸마다. 두 대각선 교점을 절점으로 */
  for(let k=0;k<nL;k++){ const k2=(k+1)%nL;
    for(let i=0;i<n;i++){ const A0=nodes[legNode[k][i]], B0=nodes[legNode[k2][i]], A1=nodes[legNode[k][i+1]], B1=nodes[legNode[k2][i+1]];
      // A0→B1 과 B0→A1 교점 (같은 평면): A0 + s(B1−A0) = B0 + u(A1−B0)
      const d1=[B1.x-A0.x,B1.y-A0.y,B1.z-A0.z], d2=[A1.x-B0.x,A1.y-B0.y,A1.z-B0.z], w=[B0.x-A0.x,B0.y-A0.y,B0.z-A0.z];
      const a11=d1[0]*d1[0]+d1[1]*d1[1]+d1[2]*d1[2], a12=-(d1[0]*d2[0]+d1[1]*d2[1]+d1[2]*d2[2]), a22=d2[0]*d2[0]+d2[1]*d2[1]+d2[2]*d2[2];
      const b1=d1[0]*w[0]+d1[1]*w[1]+d1[2]*w[2], b2=-(d2[0]*w[0]+d2[1]*w[1]+d2[2]*w[2]), det=a11*a22-a12*a12, s=(b1*a22-a12*b2)/det;
      const X=add(A0.x+s*d1[0],A0.y+s*d1[1],A0.z+s*d1[2],`X${k+1}-${i+1}`);
      L(legNode[k][i],X,"brace",P.jBrD,P.jBrt,0.8); L(X,legNode[k2][i+1],"brace",P.jBrD,P.jBrt,0.8);
      L(legNode[k2][i],X,"brace",P.jBrD,P.jBrt,0.8); L(X,legNode[k][i+1],"brace",P.jBrD,P.jBrt,0.8); }
    L(legNode[k][0],legNode[k2][0],"mud",P.jMbD,P.jMbt,0.8);
    if(P.jHz==="1") for(let i=1;i<n;i++) L(legNode[k][i],legNode[k2][i],"hz",P.jMbD,P.jMbt,0.8); }
  /* 트랜지션피스: 다리 상단 → 중앙(인터페이스) 강체 연결 */
  const c=add(0,0,yIf,"TP");
  for(let k=0;k<nL;k++) mem.push({a:legNode[k][n],b:c,grp:"rigid",D:P.jLD,t:P.jLt/1000,K:1,rigid:true});
  const sup=legNode.map(l=>l[0]);
  mem.forEach(m=>{ const A=nodes[m.a],B=nodes[m.b]; m.L=Math.hypot(B.x-A.x,B.y-A.y,B.z-A.z); m.e=[(B.x-A.x)/m.L,(B.y-A.y)/m.L,(B.z-A.z)/m.L]; });
  return {nL,T,yIf,zt,zb,H,n,lev,hs,Bz,Rz,ang,nodes,mem,legNode,sup,c};
}

/* ---------- 3D 골조 강성행렬 (6자유도/절점) ---------- */
function tubeProps(D,t){ const Di=D-2*t; return {A:PI/4*(D*D-Di*Di),I:PI/64*(D**4-Di**4),Di}; }
function elemK(m,nodes){
  const E=ES, Gm=E/2.6, L=m.L, p=tubeProps(m.D,m.t), f=m.rigid?1e3:1, A=p.A*f, I=p.I*f, J=2*I;
  const k=Array.from({length:12},()=>new Float64Array(12)), s=(i,j,v)=>{ k[i][j]+=v; if(i!==j) k[j][i]+=v; };
  const ea=E*A/L, gj=Gm*J/L, a=12*E*I/L**3, b=6*E*I/L**2, c=4*E*I/L, d=2*E*I/L;
  s(0,0,ea); s(0,6,-ea); s(6,6,ea); s(3,3,gj); s(3,9,-gj); s(9,9,gj);
  // xy 평면 (v, θz): 1,5,7,11
  s(1,1,a); s(1,5,b); s(1,7,-a); s(1,11,b); s(5,5,c); s(5,7,-b); s(5,11,d); s(7,7,a); s(7,11,-b); s(11,11,c);
  // xz 평면 (w, θy): 2,4,8,10
  s(2,2,a); s(2,4,-b); s(2,8,-a); s(2,10,-b); s(4,4,c); s(4,8,b); s(4,10,d); s(8,8,a); s(8,10,b); s(10,10,c);
  const ex=m.e, ref=Math.abs(ex[2])>0.95?[1,0,0]:[0,0,1];
  let ey=[ref[1]*ex[2]-ref[2]*ex[1],ref[2]*ex[0]-ref[0]*ex[2],ref[0]*ex[1]-ref[1]*ex[0]]; const ny=Math.hypot(...ey); ey=ey.map(v=>v/ny);
  const ez=[ex[1]*ey[2]-ex[2]*ey[1],ex[2]*ey[0]-ex[0]*ey[2],ex[0]*ey[1]-ex[1]*ey[0]];
  const R3=[ex,ey,ez];
  return {k,R3,p,A,I};
}
function toGlobal(kl,R3){ // K = Tᵀ k T, T = blockdiag(R3 ×4)
  const K=Array.from({length:12},()=>new Float64Array(12));
  for(let bi=0;bi<4;bi++) for(let bj=0;bj<4;bj++){
    for(let i=0;i<3;i++) for(let j=0;j<3;j++){ let s=0;
      for(let p=0;p<3;p++) for(let q=0;q<3;q++) s+=R3[p][i]*kl[bi*3+p][bj*3+q]*R3[q][j];
      K[bi*3+i][bj*3+j]=s; } }
  return K;
}
/* 밀집 행렬 LU (부분 피벗) */
function luDecomp(A,n){ const P=new Int32Array(n); for(let i=0;i<n;i++) P[i]=i;
  for(let k=0;k<n;k++){ let p=k, mx=Math.abs(A[k][k]); for(let i=k+1;i<n;i++){ const v=Math.abs(A[i][k]); if(v>mx){mx=v;p=i;} }
    if(p!==k){ const t=A[k]; A[k]=A[p]; A[p]=t; const q=P[k]; P[k]=P[p]; P[p]=q; }
    const piv=A[k][k]; if(!piv) continue; const Ak=A[k];
    for(let i=k+1;i<n;i++){ const Ai=A[i], f=Ai[k]/piv; if(!f) continue; Ai[k]=f; for(let j=k+1;j<n;j++) Ai[j]-=f*Ak[j]; } }
  return {A,P,n}; }
function luSolve(lu,b){ const {A,P,n}=lu, y=new Float64Array(n);
  for(let i=0;i<n;i++){ let s=b[P[i]]; for(let j=0;j<i;j++) s-=A[i][j]*y[j]; y[i]=s; }
  for(let i=n-1;i>=0;i--){ let s=y[i]; for(let j=i+1;j<n;j++) s-=A[i][j]*y[j]; y[i]=s/A[i][i]; } return y; }

function frameAssemble(g){
  const nn=g.nodes.length, N=6*nn, K=Array.from({length:N},()=>new Float64Array(N));
  g.mem.forEach(m=>{ const el=elemK(m,g.nodes); m.el=el; const Kg=toGlobal(el.k,el.R3), d=[...Array(6)].map((_,i)=>6*m.a+i).concat([...Array(6)].map((_,i)=>6*m.b+i));
    for(let i=0;i<12;i++) for(let j=0;j<12;j++) K[d[i]][d[j]]+=Kg[i][j]; });
  const fixed=new Set(); g.sup.forEach(s=>{ for(let i=0;i<6;i++) fixed.add(6*s+i); });
  const free=[...Array(N).keys()].filter(i=>!fixed.has(i)), map=new Int32Array(N).fill(-1); free.forEach((d,i)=>map[d]=i);
  const Kf=free.map(i=>Float64Array.from(free.map(j=>K[i][j])));
  return {K,N,free,map,lu:luDecomp(Kf,free.length)};
}
function frameSolve(g,fa,F){
  const u=new Float64Array(fa.N), uf=luSolve(fa.lu,Float64Array.from(fa.free.map(i=>F[i])));
  fa.free.forEach((d,i)=>u[d]=uf[i]);
  /* 반력 = K u − F (지점) */
  const reac=g.sup.map(s=>{ const r=[]; for(let i=0;i<6;i++){ const d=6*s+i; let v=-F[d]; for(let j=0;j<fa.N;j++) v+=fa.K[d][j]*u[j]; r.push(v); } return r; });
  /* 부재 단부력 (국부 좌표): f = k·T·u */
  const mf=g.mem.map(m=>{ const d=[...Array(6)].map((_,i)=>6*m.a+i).concat([...Array(6)].map((_,i)=>6*m.b+i)), ug=d.map(i=>u[i]), R3=m.el.R3, ul=new Float64Array(12);
    for(let b=0;b<4;b++) for(let p=0;p<3;p++){ let s=0; for(let q=0;q<3;q++) s+=R3[p][q]*ug[b*3+q]; ul[b*3+p]=s; }
    const f=new Float64Array(12); for(let i=0;i<12;i++){ let s=0; for(let j=0;j<12;j++) s+=m.el.k[i][j]*ul[j]; f[i]=s; }
    return {N:-f[0],N2:f[6],Ma:Math.hypot(f[4],f[5]),Mb:Math.hypot(f[10],f[11]),V:Math.hypot(f[1],f[2]),T:Math.abs(f[3])}; });
  return {u,reac,mf};
}

/* ---------- 하중 ---------- */
function jacketLoads(P,g){
  const rho=P.gw/G, d=P.hwl-P.sbDL, WN=waveNumber(P.Tw,d), w=WN.w, k=WN.k, bt=(P.jDir||0)*PI/180, dir=[Math.cos(bt),Math.sin(bt),0];
  const mg=P.jMg/1000, N6=6*g.nodes.length;
  const U0=froyaU0(P.Uref,P.zref,P.Tavg), Uw0=P.wcf*U0, d0=Math.min(P.d0w,d);
  const ucur=(z,Ut,Uw)=>{ const zz=Math.max(0,z-P.sbDL); return Ut*Math.pow(Math.max(zz,1e-3)/d,1/7)+Uw*Math.max(0,(d0-(d-zz))/d0); };
  /* 부재를 1 m 내외 조각으로 */
  const segs=[]; g.mem.forEach((m,mi)=>{ if(m.rigid) return; const A=g.nodes[m.a], ns=Math.max(1,Math.ceil(m.L/1.0));
    for(let s=0;s<ns;s++){ const f=(s+0.5)/ns; segs.push({mi,f,x:A.x+m.e[0]*m.L*f,y:A.y+m.e[1]*m.L*f,z:A.z+m.e[2]*m.L*f,ds:m.L/ns,e:m.e,D:m.D}); } });
  const nrm=(v,e)=>{ const c=v[0]*e[0]+v[1]*e[1]+v[2]*e[2]; return [v[0]-c*e[0],v[1]-c*e[1],v[2]-c*e[2]]; };
  const lump=(F,sg,f)=>{ const m=g.mem[sg.mi]; for(let i=0;i<3;i++){ F[6*m.a+i]+=f[i]*(1-sg.f); F[6*m.b+i]+=f[i]*sg.f; } };
  const otm=(F)=>{ let Fh=0,Mo=0; for(let n=0;n<g.nodes.length;n++){ const nd=g.nodes[n], fx=F[6*n],fy=F[6*n+1],fz=F[6*n+2], fd=fx*dir[0]+fy*dir[1], s=nd.x*dir[0]+nd.y*dir[1];
      Fh+=fd; Mo+=fd*(nd.z-P.sbDL)-fz*s; } return {H:Fh,M:Mo}; };
  /* 파랑 + 조류 (극치), 위상 탐색 */
  const sub=segs.filter(s=>s.z<P.hwl);
  sub.forEach(s=>{ const Dh=s.D+2*mg; s.Dh=Dh; s.cd=cdsOf(Dh,P.ks).cd; s.cm=mfCM(k*Dh/2).CM; });
  const waveAt=(ph,Ut,Uw)=>{ const F=new Float64Array(N6);
    sub.forEach(s=>{ const zz=s.z-P.sbDL, X=s.x*dir[0]+s.y*dir[1], th=k*X-ph, ch=Math.cosh(k*zz)/Math.sinh(k*d), sh=Math.sinh(k*zz)/Math.sinh(k*d), A=w*P.Hw/2;
      const uh=A*ch*Math.cos(th)+ucur(s.z,Ut,Uw), ww=A*sh*Math.sin(th), ah=w*A*ch*Math.sin(th), aw=-w*A*sh*Math.cos(th);
      const v=nrm([uh*dir[0],uh*dir[1],ww],s.e), a=nrm([ah*dir[0],ah*dir[1],aw],s.e), vn=Math.hypot(...v);
      const ci=rho*s.cm*PI/4*s.Dh*s.Dh*s.ds, cdr=0.5*rho*s.cd*s.Dh*vn*s.ds;
      lump(F,s,[ci*a[0]+cdr*v[0],ci*a[1]+cdr*v[1],ci*a[2]+cdr*v[2]]); });
    return F; };
  let best=null; for(let j=0;j<72;j++){ const ph=j/72*2*PI, F=waveAt(ph,P.Uce,Uw0), o=otm(F); if(!best||o.M>best.M) best={ph,F,...o}; }
  for(let it=0;it<2;it++){ const st=(it?0.5:2.5)*PI/180; [-1,1].forEach(sg=>{ const ph=best.ph+sg*st, F=waveAt(ph,P.Uce,Uw0), o=otm(F); if(o.M>best.M) best={ph,F,...o}; }); }
  const wave={...best,k,w,L:WN.L,d,phDeg:(best.ph*180/PI+360)%360};
  /* 파랑 없이 조류만 (상시·극치) */
  const curOnly=(Ut,Uw)=>{ const F=new Float64Array(N6);
    sub.forEach(s=>{ const u=ucur(s.z,Ut,Uw), v=nrm([u*dir[0],u*dir[1],0],s.e), vn=Math.hypot(...v); lump(F,s,v.map(c=>0.5*rho*s.cd*s.Dh*vn*c*s.ds)); }); return {F,...otm(F)}; };
  const curN=curOnly(P.Uc,0);
  /* 풍하중: 물 위 부재 + TP 면 */
  const Fw=new Float64Array(N6);
  segs.filter(s=>s.z>=P.hwl).forEach(s=>{ const h=Math.max(1,s.z-P.hwl), u=froya(U0,h,P.Tavg).U, q=0.5*P.rhoa*u*u/1000, v=nrm(dir,s.e); lump(Fw,s,v.map(c=>P.Cs*q*s.D*c*s.ds)); });
  { const hc=Math.max(1,(g.zt+g.yIf)/2-P.hwl), u=froya(U0,hc,P.Tavg).U, q=0.5*P.rhoa*u*u/1000, px=g.legNode.map(l=>{ const n=g.nodes[l[g.n]]; return -n.x*dir[1]+n.y*dir[0]; }), Bw=Math.max(...px)-Math.min(...px)+2*P.jLD, Ft=P.Cs*q*Bw*P.jTPh; for(let i=0;i<2;i++) Fw[6*g.c+i]+=Ft*dir[i]; }
  const wind={F:Fw,...otm(Fw),U0,Bw:(()=>{ const px=g.legNode.map(l=>{ const n=g.nodes[l[g.n]]; return -n.x*dir[1]+n.y*dir[0]; }); return Math.max(...px)-Math.min(...px)+2*P.jLD; })()};
  /* 자중 · 부력 (연직) */
  const Fg=new Float64Array(N6); let Wst=0,Ub=0,Wmg=0,Win=0; const grpW={};
  g.mem.forEach(m=>{ if(m.rigid) return; const p=tubeProps(m.D,m.t), W=p.A*m.L*P.mgs; Wst+=W; grpW[m.grp]=(grpW[m.grp]||0)+W;
    const A=g.nodes[m.a],B=g.nodes[m.b], zlo=Math.min(A.z,B.z), zhi=Math.max(A.z,B.z), fs=zhi<=P.hwl?1:zlo>=P.hwl?0:(P.hwl-zlo)/(zhi-zlo);
    const flooded=m.grp==="leg"&&P.jFlood==="1", Vb=(flooded?p.A:PI/4*m.D*m.D)*m.L*fs, Ubm=Vb*P.gw, Vmg=PI/4*((m.D+2*mg)**2-m.D**2)*m.L*fs, Wm=Vmg*(13.0-P.gw);
    if(flooded) Win+=PI/4*p.Di*p.Di*m.L*fs*P.gw;
    Ub+=Ubm; Wmg+=Wm; const net=W-Ubm+Wm; Fg[6*m.a+2]-=net/2; Fg[6*m.b+2]-=net/2; });
  Fg[6*g.c+2]-=P.jWtp+P.jWsec;
  const dead={F:Fg,Wst,Ub,Wmg,Win,grpW,Wtp:P.jWtp,Wsec:P.jWsec};
  /* 지진 (수평, kh × 질량), 부가질량 포함 */
  const Fe=new Float64Array(N6);
  g.mem.forEach(m=>{ if(m.rigid) return; const p=tubeProps(m.D,m.t), A=g.nodes[m.a],B=g.nodes[m.b], zlo=Math.min(A.z,B.z), zhi=Math.max(A.z,B.z), fs=zhi<=P.hwl?1:zlo>=P.hwl?0:(P.hwl-zlo)/(zhi-zlo);
    const W=p.A*m.L*P.mgs+(m.grp==="leg"&&P.jFlood==="1"?PI/4*p.Di*p.Di*m.L*fs*P.gw:0)+(P.hydro?PI/4*m.D*m.D*m.L*fs*P.gw:0), f=P.kh*W/2;
    for(let i=0;i<2;i++){ Fe[6*m.a+i]+=f*dir[i]; Fe[6*m.b+i]+=f*dir[i]; } });
  return {dir,wave,curN,wind,dead,Fe,segs,U0,Uw0,rho,d};
}

/* ---------- 부재 검토 (NORSOK N-004, 관형 부재) ---------- */
function tubCheck(D,t,fy,gM,N,M,Lk){
  const E=210000, p=tubeProps(D,t), W=p.I/(D/2), Zp=(D**3-(D-2*t)**3)/6, i=Math.sqrt(p.I/p.A);
  const fcle=2*0.3*E*t/D, fyc=fy/fcle<=0.170?fy:(1.047-0.274*fy/fcle)*fy;
  const fE=PI*PI*E/(Lk/i)**2, lam=Math.sqrt(fyc/fE), fc=lam<=1.34?(1-0.28*lam*lam)*fyc:0.9/(lam*lam)*fyc;
  const q=fy*D/(E*t), fm=(q<=0.0517?1:q<=0.1034?1.13-2.58*q:0.94-0.76*q)*Zp/W*fy;
  const sa=N/p.A/1000, sm=M/W/1000; let u, mode;
  if(sa<0){ const sc=-sa, u1=sc/(fc/gM)+0.85*sm/((1-sc/(fE/gM))*fm/gM), u2=sc/(fyc/gM)+sm/(fm/gM); u=Math.max(u1,u2); mode=u1>=u2?"압축 + 휨 (좌굴)":"압축 + 휨 (국부)"; if(sc>=fE/gM) u=Infinity; }
  else { u=Math.pow(sa/(fy/gM),1.75)+sm/(fm/gM); mode="인장 + 휨"; }
  return {A:p.A,W,Zp,i,fcle,fyc,fE,lam,fc,fm,sa,sm,u,mode,Dt:D/t,kl_r:Lk/i};
}

/* ---------- 고유진동수 (골조 + 타워 + RNA, 집중질량, 역반복법) ---------- */
function jacketFreq(P,g,ld){
  const T=g.T, cal=calibTower(T,P); if(!cal) return {cal:null};
  const nodes=g.nodes.map(n=>({...n})), mem=g.mem.map(m=>({...m}));
  const mass=new Float64Array(nodes.length+cal.els.length+1), mg=P.jMg/1000, rw=P.gw/G;
  mem.forEach(m=>{ if(m.rigid) return; const p=tubeProps(m.D,m.t), A=nodes[m.a],B=nodes[m.b], zlo=Math.min(A.z,B.z), zhi=Math.max(A.z,B.z), fs=zhi<=P.hwl?1:zlo>=P.hwl?0:(P.hwl-zlo)/(zhi-zlo);
    const ms=p.A*m.L*P.mgs/G+(m.grp==="leg"&&P.jFlood==="1"?PI/4*p.Di*p.Di*m.L*fs*rw:0)+PI/4*(m.D+2*mg)**2*m.L*fs*rw+PI/4*((m.D+2*mg)**2-m.D**2)*m.L*fs*1.325;
    mass[m.a]+=ms/2; mass[m.b]+=ms/2; });
  mass[g.c]+=(P.jWtp+P.jWsec)/G;
  /* 타워: 중앙 절점에서 위로 */
  let prev=g.c, z=g.yIf; cal.els.forEach((e,i)=>{ z+=e.L; nodes.push({x:0,y:0,z,tag:"T"}); const id=nodes.length-1;
    mem.push({a:prev,b:id,grp:"tower",D:1,t:0.1,K:1,L:e.L,e:[0,0,1],EIt:e.EI}); mass[prev]+=e.m*e.L/2; mass[id]+=e.m*e.L/2; prev=id; });
  mass[prev]+=cal.mR;
  const g2={...g,nodes,mem};
  /* 타워 요소는 EI를 직접 넣음 */
  const fa=(()=>{ const nn=nodes.length, N=6*nn, K=Array.from({length:N},()=>new Float64Array(N));
    mem.forEach(m=>{ if(!m.L){ const A=nodes[m.a],B=nodes[m.b]; m.L=Math.hypot(B.x-A.x,B.y-A.y,B.z-A.z); m.e=[(B.x-A.x)/m.L,(B.y-A.y)/m.L,(B.z-A.z)/m.L]; }
      let el; if(m.grp==="tower"){ const I=m.EIt/ES, A=I*100; el=elemK({...m,D:1,t:0.1},nodes); const E=ES,Gm=E/2.6,L=m.L,k=el.k; for(const r of k) r.fill(0);
        const s=(i,j,v)=>{ k[i][j]+=v; if(i!==j) k[j][i]+=v; }, ea=E*A/L, gj=Gm*2*I/L, a=12*E*I/L**3, b=6*E*I/L**2, c=4*E*I/L, dd=2*E*I/L;
        s(0,0,ea); s(0,6,-ea); s(6,6,ea); s(3,3,gj); s(3,9,-gj); s(9,9,gj);
        s(1,1,a); s(1,5,b); s(1,7,-a); s(1,11,b); s(5,5,c); s(5,7,-b); s(5,11,dd); s(7,7,a); s(7,11,-b); s(11,11,c);
        s(2,2,a); s(2,4,-b); s(2,8,-a); s(2,10,-b); s(4,4,c); s(4,8,b); s(4,10,dd); s(8,8,a); s(8,10,b); s(10,10,c); }
      else el=elemK(m,nodes);
      const Kg=toGlobal(el.k,el.R3), d=[...Array(6)].map((_,i)=>6*m.a+i).concat([...Array(6)].map((_,i)=>6*m.b+i));
      for(let i=0;i<12;i++) for(let j=0;j<12;j++) K[d[i]][d[j]]+=Kg[i][j]; });
    const fixed=new Set(); g.sup.forEach(s=>{ for(let i=0;i<6;i++) fixed.add(6*s+i); });
    const free=[...Array(N).keys()].filter(i=>!fixed.has(i));
    return {N,free,lu:luDecomp(free.map(i=>Float64Array.from(free.map(j=>K[i][j]))),free.length)}; })();
  const Mv=fa.free.map(d=>d%6<3?mass[Math.floor(d/6)]:0);
  const dirv=ld.dir; let x=Float64Array.from(fa.free.map(d=>{ const n=Math.floor(d/6), c=d%6; return c<2?(nodes[n].z-g.zb)*dirv[c]:0; })), lam=0;
  for(let it=0;it<200;it++){ const y=luSolve(fa.lu,Float64Array.from(x.map((v,i)=>v*Mv[i]))); let yMy=0,xMy=0; for(let i=0;i<y.length;i++){ yMy+=y[i]*y[i]*Mv[i]; xMy+=x[i]*y[i]*Mv[i]; }
    const nl=xMy/yMy, s=1/Math.sqrt(yMy); x=y.map(v=>v*s); if(it>5&&Math.abs(nl-lam)<1e-10*nl){ lam=nl; break; } lam=nl; }
  const f=Math.sqrt(lam)/(2*PI), band=freqBand(T,P), zn=band.zone(f);
  return {cal,f,band,z:zn,ok:zn?zn.ok:null,mTot:mass.reduce((a,b)=>a+b,0)};
}

/* ---------- 전체 계산 ---------- */
function computeJacket(P){
  const g=jacketGeom(P), T=g.T, TL=turbLoads(T), Wt=turbWeight(T), warns=[];
  const ld=jacketLoads(P,g), fa=frameAssemble(g), N6=6*g.nodes.length, dir=ld.dir;
  const tlF=(gv)=>{ const F=new Float64Array(N6); if(!gv){ F[6*g.c+2]-=Wt; return {F,lab:"하중표 없음 (자중만)",H:0,M:0,V:Wt}; }
    F[6*g.c]+=gv.H*dir[0]; F[6*g.c+1]+=gv.H*dir[1]; F[6*g.c+2]-=gv.V; F[6*g.c+3]+=-gv.M*dir[1]; F[6*g.c+4]+=gv.M*dir[0]; return {F,lab:gv.lab,H:gv.H,M:gv.M,V:gv.V}; };
  const dz=ld.dead, tu=tlF(TL.gu), ts=tlF(TL.gs), arm=g.yIf-P.sbDL;
  const deadV=dz.Wst-dz.Ub+dz.Wmg+P.jWtp+P.jWsec;
  const eqO=(()=>{ let Fh=0,Mo=0; for(let n=0;n<g.nodes.length;n++){ const fd=ld.Fe[6*n]*dir[0]+ld.Fe[6*n+1]*dir[1]; Fh+=fd; Mo+=fd*(g.nodes[n].z-P.sbDL); } return {F:Fh,M:Mo}; })();
  /* 지진: TP·터빈 질량 추가 */
  const Fe=Float64Array.from(ld.Fe); { const We=P.jWtp+P.jWsec+Wt, f=P.kh*We; Fe[6*g.c]+=f*dir[0]; Fe[6*g.c+1]+=f*dir[1]; const zt=(T.hub+P.msl+g.yIf)/2; Fe[6*g.c+3]+=-P.kh*Wt*(zt-g.yIf)*dir[1]; Fe[6*g.c+4]+=P.kh*Wt*(zt-g.yIf)*dir[0]; }
  const eqT={F:eqO.F+P.kh*(P.jWtp+P.jWsec+Wt),M:eqO.M+P.kh*(P.jWtp+P.jWsec)*arm+P.kh*Wt*((T.hub+P.msl+g.yIf)/2-P.sbDL)};
  const it=(nm,F,g,H,M,V)=>({nm,F,g,H:H*g,M:M*g,V:V*g});
  const dI=()=>it("자중·부력 (강재·TP·2차 부재·해양생물)",dz.F,1,0,0,deadV);
  const tI=t=>it(`터빈 (${t.lab})`,t.F,1,t.H,t.M+t.H*arm,t.V);
  const combo=(id,nm,kind,items)=>{ const F=new Float64Array(N6); items.forEach(x=>{ for(let i=0;i<N6;i++) F[i]+=x.F[i]*x.g; });
    const sol=frameSolve(g,fa,F); const l={id,nm,kind,items,...sol};
    l.H=items.reduce((a,b)=>a+b.H,0); l.M=items.reduce((a,b)=>a+b.M,0); l.V=items.reduce((a,b)=>a+b.V,0);
    l.R=l.reac.map(r=>({Vc:r[2],H:Math.hypot(r[0],r[1]),M:Math.hypot(r[3],r[4])})); l.sumV=l.reac.reduce((a,r)=>a+r[2],0); return l; };
  const LC=[
    combo("LC1","상시 (운전, SLS)","SLS",[dI(),tI(ts),it("조류 (상시)",ld.curN.F,1,ld.curN.H,ld.curN.M,0)]),
    combo("LC2","폭풍 (극한, ULS)","ULS",[dI(),tI(tu),it("파랑 + 극치 조류",ld.wave.F,P.jgE,ld.wave.H,ld.wave.M,0),it("풍하중 (부재·TP)",ld.wind.F,P.jgE,ld.wind.H,ld.wind.M,0)]),
    combo("LC3","지진 (운전)","EQ",[dI(),tI(ts),it("조류 (상시)",ld.curN.F,1,ld.curN.H,ld.curN.M,0),it("지진 관성력",Fe,1,eqT.F,eqT.M,0)]),
  ];
  /* 부재 검토 (ULS·지진) */
  const chk=g.mem.map((m,mi)=>{ if(m.rigid) return null; let worst=null;
    LC.forEach(l=>{ if(l.kind==="SLS") return; const f=l.mf[mi], N=Math.abs(f.N)>Math.abs(f.N2)?f.N:f.N2, M=Math.max(f.Ma,f.Mb), c=tubCheck(m.D,m.t,P.jfy,P.jgM,N,M,m.K*m.L);
      if(!worst||c.u>worst.u) worst={...c,lc:l.id,N,M}; });
    return {mi,grp:m.grp,a:m.a,b:m.b,D:m.D,t:m.t,L:m.L,K:m.K,...worst}; }).filter(Boolean);
  const grpMax={}; chk.forEach(c=>{ if(!grpMax[c.grp]||c.u>grpMax[c.grp].u) grpMax[c.grp]=c; });
  const uMax=Math.max(...chk.map(c=>c.u));
  /* 말뚝 (다리당 1본, 연직) */
  const pile=jacketPiles(P,g,LC);
  const fq=jacketFreq(P,g,ld);
  /* 중량·수량 */
  const Wpile=P.jPD>0?tubeProps(P.jPD,P.jPt/1000).A*(P.jPL+P.jStub)*P.mgs*g.nL:0;
  const qty={grpW:dz.grpW,Wst:dz.Wst,Wtp:P.jWtp,Wsec:P.jWsec,Wpile,
    foot:g.nL===4?P.jWb*P.jWb:Math.sqrt(3)/4*P.jWb*P.jWb, Rb:g.Rz(g.zb), Asb:g.nL*PI/4*P.jPD*P.jPD};
  /* 세굴방지공 (다리마다 원형 사석) */
  const prot=P.jSc!=="0", Dsc=prot?P.jScK*P.jPD:0;
  qty.prot=prot; qty.Dsc=Dsc; qty.Asc1=prot?PI/4*(Dsc*Dsc-P.jPD*P.jPD):0; qty.Asc=qty.Asc1*g.nL; qty.Vsc=qty.Asc*(prot?P.jScT:0);
  qty.marg=prot?Math.max(1.0,Dsc/2):P.jPD/2+1.0;   // 점용 면적 여유: 보호공 반경 또는 말뚝 반경 + 1 m
  qty.Aocc=(()=>{ const R=g.Rz(g.zb)+qty.marg; return g.nL===4?2*R*R:3*Math.sqrt(3)/4*R*R; })(); // 다리 바깥 여유 다각형
  /* 주의 */
  const crestDL=P.hwl+P.Hw/2;
  if(T.scaled) warns.push({k:"scaled",msg:`선택한 터빈(${T.name})의 하중표는 ${T.scaled.base||"기준 터빈"} 하중을 축척해 추정한 값입니다 (수평력 ×${T.scaled.sF.toFixed(2)}, 모멘트 ×${T.scaled.sM.toFixed(2)}).`});
  if(!TL.gu) warns.push({k:"noTL",msg:`선택한 터빈(${T.name})에 하중표가 없습니다. 터빈 하중 없이 계산합니다.`});
  if(g.zt<crestDL+1.5) warns.push({k:"jTop",msg:`자켓 상단(TP 하단) ${dlS(g.zt)}이 설계 파봉 ${dlS(crestDL)} + 1.5 m보다 낮아 TP가 파도를 맞습니다.`,crestDL});
  if(P.jWt>P.jWb) warns.push({k:"jBat",msg:`자켓 상단 다리 간격(${P.jWt} m)이 하단(${P.jWb} m)보다 넓습니다.`});
  if(uMax>1) { const w=chk.reduce((a,b)=>b.u>a.u?b:a); warns.push({k:"jMem",msg:`부재 검토 이용률 최대 ${isFinite(w.u)?w.u.toFixed(2):"∞ (오일러 좌굴 하중 초과)"} (${({leg:"다리",brace:"X 브레이스",mud:"하단 수평재",hz:"수평재"})[w.grp]}, ${w.lc}, ${w.mode})로 1을 넘습니다.`,grp:w.grp}); }
  const dtB=P.jBrD*1000/P.jBrt, dtL=P.jLD*1000/P.jLt;
  if(dtB>60) warns.push({k:"jDtB",msg:`브레이스 D/t = ${dtB.toFixed(0)}로 60을 넘습니다 (접합부·국부좌굴에 불리).`});
  if(dtL>60) warns.push({k:"jDtL",msg:`다리 D/t = ${dtL.toFixed(0)}로 60을 넘습니다.`});
  pile.warns.forEach(w=>warns.push(w));
  if(fq.cal&&fq.ok===false) warns.push({k:"jFreq",msg:`1차 고유진동수 ${fq.f.toFixed(3)} Hz가 ${fq.z.nm}에 있습니다${fq.band.r.est?" (회전수는 추정값)":""}.`});
  if(!fq.cal) warns.push({k:"noFref",msg:`선택 터빈(${T.name})에 타워 치수와 기준 고유진동수가 없어 구조물 고유진동수를 계산하지 못했습니다.`});
  return {P,cat:"jacket",g,T,TL,Wt,yIf:g.yIf,ld,LC,chk,grpMax,uMax,pile,fq,qty,warns,crestDL,arm};
}

/* 말뚝: 다리별 최대 압축·인발·수평, 축방향 지지력, p-y */
function jacketPiles(P,g,LC){
  const D=P.jPD, t=P.jPt/1000, warns=[];
  const prot=P.jSc!=="0", S=prot?0:P.jScS*D;   // 세굴: 보호공 있으면 0, 없으면 S = (S/D) × 말뚝 직경
  const Rg={g:{Dp:()=>D,tAt:()=>t,yToe:P.sbDL-P.jPL},yML:P.sbDL-S,S};
  const sp=pileModel(P,Rg), ax=axialCap(P,Rg,sp);
  const Wp=tubeProps(D,t).A*(P.jPL+P.jStub)*(P.mgs-P.gw);
  const Qt=ax.Qo+Wp; // 인발: 외주면 마찰 + 말뚝 수중 자중 (관내 토사 무시)
  const rows=LC.map(l=>{ const comp=Math.max(...l.R.map(r=>r.Vc)), ten=Math.min(...l.R.map(r=>r.Vc)), H=Math.max(...l.R.map(r=>r.H)), M=Math.max(...l.R.map(r=>r.M)); return {id:l.id,nm:l.nm,kind:l.kind,comp,ten,H,M}; });
  const fs=k=>k==="SLS"?P.mFSc:P.mFSu;
  rows.forEach(r=>{ r.okC=r.comp<=ax.Q/fs(r.kind); r.okT=r.ten>=0||-r.ten<=Qt/fs(r.kind); r.uC=r.comp/(ax.Q/fs(r.kind)); r.uT=r.ten<0?-r.ten/(Qt/fs(r.kind)):0; });
  /* 수평: 가장 큰 H·M (해저면 위 stub 만큼 모멘트 추가) */
  const gov=rows.reduce((a,b)=>b.H>a.H?b:a), lat=pileFE(pileModel(P,Rg),gov.H,gov.M+gov.H*(P.jStub+S));
  const ok=rows.every(r=>r.okC&&r.okT)&&lat.ok;
  if(!rows.every(r=>r.okC)) warns.push({k:"jPc",msg:`말뚝 압축 지지력이 부족합니다 (최대 ${Math.round(Math.max(...rows.map(r=>r.comp)))} kN, Q = ${Math.round(ax.Q)} kN).`});
  if(!rows.every(r=>r.okT)) warns.push({k:"jPt",msg:`말뚝 인발 저항이 부족합니다 (최대 인발 ${Math.round(-Math.min(...rows.map(r=>r.ten)))} kN, 저항 ${Math.round(Qt)} kN).`});
  if(!lat.ok) warns.push({k:"jPl",msg:`말뚝 수평 해석이 수렴하지 않습니다 (지반 저항 부족).`});
  if(!prot&&S>P.jStub) warns.push({k:"jScour",msg:`세굴 깊이 ${S.toFixed(2)} m가 해저면 위 다리 하단 높이 ${P.jStub} m보다 깊어, 다리 하단·하단 수평재 아래 지반이 세굴됩니다.`,S});
  return {D,t,sp,ax,Qt,Wp,rows,lat,gov,ok,warns,prot,S,arm:P.jStub+S};
}
