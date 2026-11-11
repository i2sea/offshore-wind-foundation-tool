/*ENGINE START*/
const PI=Math.PI, G=9.81;
/* ---------- 터빈 목록 (기본 제공) ---------- */
/* 기본 제공은 공개 기준 터빈만. 제작사·사업 자료(하중표 포함)는 터빈 파일(.json)로 따로 관리해 "터빈 파일 가져오기"로 불러옴 */
const TURB_PRESETS=[
  {id:"dtu10",name:"DTU 10MW RWT",MW:10,hub:119,rotor:178.3,rna:675,tower:605,Wdirect:0,ifz:10,rpmMin:6.0,rpmMax:9.6,axis:"z",twL:105.63,twDb:8.3,twDt:5.5,
   src:"공개 기준 터빈. RNA = 로터 229 t + 나셀 446 t, 타워 605 t·Ø8.3→5.5 m. Bak 외, The DTU 10-MW Reference Wind Turbine (DTU, 2013). 타워 길이 105.63 m는 육상 타워 115.63 m를 인터페이스 MSL+10 m에 맞춰 줄인 가정값. 하중표 미공개 → 제작사 자료 필요.",uls:null,sls:null},
  {id:"iea15",name:"IEA 15MW RWT",MW:15,hub:150,rotor:240,rna:1017,tower:860,Wdirect:0,ifz:15,rpmMin:5.0,rpmMax:7.56,axis:"z",twL:129.39,twDb:10,twDt:6.5,
   src:"공개 기준 터빈. 타워 860 t, MSL+15 m ~ +144.39 m(129.39 m), Ø10→6.5 m. Gaertner 외, IEA Wind TCP Task 37 15MW Offshore Reference Turbine, NREL/TP-5000-75698 (2020). 하중표 미공개.",uls:null,sls:null},
];
/* 축척 추정 (가정): 기준 터빈 하중표를 로터 직경·레버암·중량비로 옮김 — 수평력 × (D₂/D₁)², 전도모멘트 × (D₂/D₁)² × (허브−인터페이스)₂/(허브−인터페이스)₁, 비틀림 × (D₂/D₁)³, 연직력 × 총중량비 */
function scaleTurb(b,t){ const s=t.rotor/b.rotor, lev=(t.hub-t.ifz)/(b.hub-b.ifz), wv=((t.rna+t.tower)*9.81)/b.Wdirect;
  const f={sF:s*s,sM:s*s*lev,sT:s**3,sV:wv}; const row=r=>[r[0]*f.sT,r[1]*f.sM,r[2]*f.sM,r[3]*f.sV,r[4]*f.sF,r[5]*f.sF].map(v=>Math.round(v*10)/10);
  return {...t,uls:b.uls.map(row),sls:b.sls.map(row),scaled:f}; }
const LROW=["Mx Max","Mx Min","My Max","My Min","Mz Max","Mz Min","Fx Max","Fx Min","Fy Max","Fy Min","Fz Max","Fz Min"];

const DEF={
  type:"cone",
  // 원추형
  // 기본값은 일반 예시 형상·조건(가정)입니다. 현장 자료는 "설계 가져오기"로 불러옵니다.
  Db:30,tb:1.5,Dw:30,tw:0.5,hw:5,hk:15,Dt:7.0,tkh:0.6,
  // 케이슨형
  cDs:36,cts:1.0,cDw:34,ctw:0.5,cH:10,ctt:0.5,cnr:12,ctr:0.3,
  // 기둥(샤프트)
  shp:"circ",Dc:7.0,tc:0.6,ha:4.0,hth:0.40,hhn:0.80,zc0:1.0,ztop:60,Dp:12,tp:0.5,
  rings:[],ringAuto:"1",
  zf1:20,zf2:35,gf:19,gc:24.5,
  // 위치·수위
  zbDL:-30.0,sbDL:-30.0,hwl:2.0,msl:0.5,gw:10.1,tg:0.35,
  // 터빈
  turb:"dtu10",customT:[],f1:0,fmar:0.10,vtip:80,rpmR:0.57,gBase:"spr",gG:500,gNu:0.3,
  // 풍
  Uref:30,zref:10,Tavg:600,Cs:0.6,rhoa:1.225,
  // 파랑·조류
  Hw:12,Tw:14,crest:0,surf:"conc",ks:3,Uc:1.0,Uce:1.0,wcf:0.015,d0w:50,nu:1.19e-6,
  // 지진
  kh:0.077,hydro:1,sgc:"",kfac:0.5,
  // 지반·검토
  mu:0.5,qa:1000,tilt:0.25,
  fsO1:1.2,fsS1:1.2,fsO2:1.2,fsS2:1.2,fsO3:1.1,fsS3:1.0,qf3:1.5,aeff:0.5,
  // 예인·시공
  dTow:15,ukc:1.0,gmMin:0.5,Wadd:0,zadd:0,zcut:0,zbal:0,padN:4,padB:1.5,padH:0.5,
};
const frus=(D,d,h)=>PI*h/12*(D*D+D*d+d*d);
const ann=(D,t)=>PI/4*(D*D-Math.max(0,D-2*t)**2);
function fmt(v){return Number(Math.round(v*1000)/1000).toString();}

/* 육각 샤프트: 면적이 같은 원으로 환산 */
function hexProps(a,t,hn){
  const Ao=3*Math.sqrt(3)/2*a*a, ai=Math.max(0,a-2*t/Math.sqrt(3));
  const Ai=Math.max(0,3*Math.sqrt(3)/2*ai*ai-6*0.5*hn*hn*Math.sin(2*PI/3));
  return {Ao,Ai,ro:Math.sqrt(Ao/PI),ri:Math.sqrt(Ai/PI),flats:Math.sqrt(3)*a,corners:2*a,ai};
}
function shaftR(P){
  if(P.shp==="hex"){ const h=hexProps(P.ha,P.hth,P.hhn); return {ro:h.ro,ri:h.ri,hex:h}; }
  return {ro:P.Dc/2,ri:Math.max(0,P.Dc/2-P.tc),hex:null};
}

/* 보강 링 자동 배치 (가정): 두 곳
   ① 기둥 하단 링: 기둥 내면에 붙여 저판 상면에서 시작. 외경 = 기둥 내경, 두께 = 기둥 벽두께,
      높이 = 1.5 × 기둥 주철근 정착길이(40d) → 0.5 m 단위 올림 (최소 1.0 m)
   ② 벽체 접합부 링: 하부 원통(케이슨 외벽) 내면에 붙여 저판 상면에서 시작. 외경 = 벽체 내경, 두께 = max(0.5, 벽두께),
      높이 = 1.5 × 벽체 연직철근 정착길이(40d) → 0.5 m 단위 올림 (최소 1.0 m, 벽 높이 이하) */
function autoRings(P){
  const cais=P.type==="caisson", tb=cais?P.cts:P.tb, S=shaftR(P), rb=P.rb||{};
  const dbOf=b=>(typeof BARS!=="undefined"&&BARS[b])?BARS[b].d/1000:(parseInt(String(b).slice(1))||25)/1000;
  const hOf=(bar,hmax)=>Math.min(hmax,Math.max(1.0,Math.ceil(1.5*40*dbOf(bar)/0.5)*0.5));
  const out=[];
  const zc=Math.max(tb,P.zc0), tcw=S.ro-S.ri;
  if(S.ri>0.5&&tcw>0) out.push({D:+(2*S.ri).toFixed(3),t:+Math.min(tcw,S.ri-0.3).toFixed(3),h:hOf((rb.cL||{}).bar||"H32",Math.max(1,P.ztop-zc-1)),z:+zc.toFixed(3),auto:"기둥 하단"});
  const Rwi=cais?P.cDw/2-P.ctw:P.Dw/2-P.tw, tw=cais?P.ctw:P.tw, hw=cais?P.cH-P.cts-P.ctt:P.hw;
  const tr=Math.max(0.5,tw); if(Rwi-tr>S.ro+0.5) out.push({D:+(2*Rwi).toFixed(3),t:+tr.toFixed(3),h:hOf((rb.wV||{}).bar||"H22",Math.max(1,hw)),z:+tb.toFixed(3),auto:"벽체 접합부"});
  return out;
}
function buildParts(P){
  const S=shaftR(P), rso=S.ro, rsi=S.ri, parts=[];
  let wideTop, z2, Rbase, Rwide;
  if(P.type==="caisson"){
    const Rw=P.cDw/2, Rwi=Rw-P.ctw;
    wideTop=P.cH; z2=P.cH; Rbase=P.cDs/2; Rwide=Rw;
    parts.push({k:"slab",nm:"① 하부 슬래브",z0:0,z1:P.cts,ro:()=>P.cDs/2,ri:()=>0,V:PI/4*P.cDs**2*P.cts,f:`π/4 × ${P.cDs}² × ${P.cts}`});
    parts.push({k:"wall",nm:"② 케이슨 외벽",z0:P.cts,z1:P.cH,ro:()=>Rw,ri:()=>Rwi,V:ann(P.cDw,P.ctw)*(P.cH-P.cts),f:`π/4 × (${P.cDw}² − ${fmt(P.cDw-2*P.ctw)}²) × ${fmt(P.cH-P.cts)}`});
    parts.push({k:"top",nm:"③ 케이슨 상판",z0:P.cH-P.ctt,z1:P.cH,ro:()=>Rwi,ri:()=>rso,V:PI*(Rwi**2-rso**2)*P.ctt,f:`π × (${fmt(Rwi)}² − ${fmt(rso)}²) × ${P.ctt}`});
    if(P.cnr>0&&P.ctr>0){ const h=P.cH-P.ctt-P.cts, L=Rwi-rso, a=P.cnr*P.ctr*L;
      parts.push({k:"rad",nm:"④ 방사형 격벽",z0:P.cts,z1:P.cH-P.ctt,area:a,V:a*h,f:`${P.cnr}개 × ${P.ctr} × ${fmt(L)} × ${fmt(h)}`}); }
  }else{
    const z1=P.tb+P.hw; z2=z1+P.hk; wideTop=z1; Rbase=P.Db/2; Rwide=P.Dw/2;
    const Rw=P.Dw/2, Rt=P.Dt/2;
    parts.push({k:"slab",nm:"① 저판",z0:0,z1:P.tb,ro:()=>P.Db/2,ri:()=>0,V:PI/4*P.Db**2*P.tb,f:`π/4 × ${P.Db}² × ${P.tb}`});
    parts.push({k:"wall",nm:"② 하부 원통",z0:P.tb,z1:z1,ro:()=>Rw,ri:()=>Rw-P.tw,V:ann(P.Dw,P.tw)*P.hw,f:`π/4 × (${P.Dw}² − ${fmt(P.Dw-2*P.tw)}²) × ${P.hw}`});
    parts.push({k:"cone",nm:"③ 원추",z0:z1,z1:z2,ro:z=>Rw+(Rt-Rw)*(z-z1)/P.hk,ri:z=>Rw+(Rt-Rw)*(z-z1)/P.hk-P.tkh,
      V:frus(P.Dw,P.Dt,P.hk)-frus(P.Dw-2*P.tkh,P.Dt-2*P.tkh,P.hk),
      f:`π×${P.hk}/12 × [(${P.Dw}²+${P.Dw}×${P.Dt}+${P.Dt}²) − (${fmt(P.Dw-2*P.tkh)}²+${fmt(P.Dw-2*P.tkh)}×${fmt(P.Dt-2*P.tkh)}+${fmt(P.Dt-2*P.tkh)}²)]`});
  }
  const colNm=P.type==="caisson"?"⑤ 샤프트":"④ 기둥";
  if(S.hex) parts.push({k:"col",nm:colNm+" (육각)",z0:P.zc0,z1:P.ztop,ro:()=>rso,ri:()=>rsi,V:(S.hex.Ao-S.hex.Ai)*(P.ztop-P.zc0),
      f:`(${fmt(S.hex.Ao)} − ${fmt(S.hex.Ai)}) × ${fmt(P.ztop-P.zc0)}  (육각 외곽 − 내부, 모서리 헌치 포함)`});
  else parts.push({k:"col",nm:colNm,z0:P.zc0,z1:P.ztop,ro:()=>rso,ri:()=>rsi,V:ann(P.Dc,P.tc)*(P.ztop-P.zc0),f:`π/4 × (${P.Dc}² − ${fmt(P.Dc-2*P.tc)}²) × ${fmt(P.ztop-P.zc0)}`});
  if(P.Dp>0&&P.tp>0) parts.push({k:"plat",nm:(P.type==="caisson"?"⑥":"⑤")+" 상부 플랫폼",z0:P.ztop-P.tp,z1:P.ztop,ro:()=>Math.max(P.Dp/2,rso),ri:()=>rso,V:Math.max(0,PI*((P.Dp/2)**2-rso**2))*P.tp,f:`π × (${fmt(P.Dp/2)}² − ${fmt(rso)}²) × ${P.tp}`});
  (P.rings||[]).forEach((r,i)=>{ if(!(r.D>0&&r.t>0&&r.h>0)) return;
    parts.push({k:"ring"+i,nm:`보강 링 ${i+1}`,z0:r.z,z1:r.z+r.h,ro:()=>r.D/2,ri:()=>Math.max(0,r.D/2-r.t),V:ann(r.D,r.t)*r.h,f:`π/4 × (${r.D}² − ${fmt(Math.max(0,r.D-2*r.t))}²) × ${r.h}`}); });
  return {parts,z2,wideTop,Rbase,Rwide,S};
}

/* 보강 링이 기대는 부재 찾기 (형상만 봄, 오차 0.05 m)
   아래: 저판(하부 슬래브) 상면 또는 다른 링 상면과 반경 방향으로 겹침
   옆: 기둥 내·외면, 하부 벽체 내면과 같은 반경이고 높이가 겹침 */
function ringSupport(P,R){
  const cais=P.type==="caisson", tb=cais?P.cts:P.tb, eps=0.05, S=R&&R.S?R.S:shaftR(P);
  const Rwi=cais?P.cDw/2-P.ctw:P.Dw/2-P.tw, zw0=tb, zw1=cais?P.cH:P.tb+P.hw;
  const rg=(P.rings||[]).map((r,i)=>({...r,i})).filter(r=>r.D>0&&r.t>0&&r.h>0);
  return rg.map(r=>{ const ro=r.D/2, ri=ro-r.t, z0=r.z, z1=r.z+r.h, below=[], side=[];
    const ov=(a0,a1,b0,b1)=>Math.min(a1,b1)-Math.max(a0,b0);
    if(Math.abs(z0-tb)<eps||z0<tb) below.push({nm:cais?"하부 슬래브":"저판",w:r.t,a0:0,a1:1e9});
    rg.forEach(q=>{ if(q.i!==r.i&&Math.abs(q.z+q.h-z0)<eps){ const w=ov(ri,ro,q.D/2-q.t,q.D/2); if(w>eps) below.push({nm:`보강 링 ${q.i+1}`,w,a0:q.D/2-q.t,a1:q.D/2}); } });
    const hc=ov(z0,z1,P.zc0,P.ztop); if(hc>eps){ if(Math.abs(ro-S.ri)<eps) side.push({nm:"기둥 내면",r:ro,h:hc}); if(Math.abs(ri-S.ro)<eps) side.push({nm:"기둥 외면",r:ri,h:hc}); }
    const hw=ov(z0,z1,zw0,zw1); if(hw>eps&&Math.abs(ro-Rwi)<eps) side.push({nm:cais?"외벽 내면":"원통 내면",r:ro,h:hw});
    const wb=below.reduce((a,b)=>Math.max(a,b.w),0);
    return {...r,ro,ri,below,side,wb,float:!below.length&&!side.length,part:below.length&&wb<r.t-eps&&!side.length}; });
}

/* ---------- Bessel (Numerical Recipes) ---------- */
function J0(x){const ax=Math.abs(x);if(ax<8){const y=x*x;return (57568490574.0+y*(-13362590354.0+y*(651619640.7+y*(-11214424.18+y*(77392.33017+y*(-184.9052456))))))/(57568490411.0+y*(1029532985.0+y*(9494680.718+y*(59272.64853+y*(267.8532712+y)))));}
  const z=8/ax,y=z*z,xx=ax-0.785398164;return Math.sqrt(0.636619772/ax)*(Math.cos(xx)*(1+y*(-0.1098628627e-2+y*(0.2734510407e-4+y*(-0.2073370639e-5+y*0.2093887211e-6))))-z*Math.sin(xx)*(-0.1562499995e-1+y*(0.1430488765e-3+y*(-0.6911147651e-5+y*(0.7621095161e-6-y*0.934935152e-7)))));}
function J1(x){const ax=Math.abs(x);if(ax<8){const y=x*x;return x*(72362614232.0+y*(-7895059235.0+y*(242396853.1+y*(-2972611.439+y*(15704.48260+y*(-30.16036606))))))/(144725228442.0+y*(2300535178.0+y*(18583304.74+y*(99447.43394+y*(376.9991397+y)))));}
  const z=8/ax,y=z*z,xx=ax-2.356194491;const a=Math.sqrt(0.636619772/ax)*(Math.cos(xx)*(1+y*(0.183105e-2+y*(-0.3516396496e-4+y*(0.2457520174e-5+y*(-0.240337019e-6)))))-z*Math.sin(xx)*(0.04687499995+y*(-0.2002690873e-3+y*(0.8449199096e-5+y*(-0.88228987e-6+y*0.105787412e-6)))));return x<0?-a:a;}
function Y0(x){if(x<8){const y=x*x;return (-2957821389.0+y*(7062834065.0+y*(-512359803.6+y*(10879881.29+y*(-86327.92757+y*228.4622733)))))/(40076544269.0+y*(745249964.8+y*(7189466.438+y*(47447.26470+y*(226.1030244+y)))))+0.636619772*J0(x)*Math.log(x);}
  const z=8/x,y=z*z,xx=x-0.785398164;return Math.sqrt(0.636619772/x)*(Math.sin(xx)*(1+y*(-0.1098628627e-2+y*(0.2734510407e-4+y*(-0.2073370639e-5+y*0.2093887211e-6))))+z*Math.cos(xx)*(-0.1562499995e-1+y*(0.1430488765e-3+y*(-0.6911147651e-5+y*(0.7621095161e-6-y*0.934935152e-7)))));}
function Y1(x){if(x<8){const y=x*x;return x*(-0.4900604943e13+y*(0.1275274390e13+y*(-0.5153438139e11+y*(0.7349264551e9+y*(-0.4237922726e7+y*0.8511937935e4)))))/(0.2499580570e14+y*(0.4244419664e12+y*(0.3733650367e10+y*(0.2245904002e8+y*(0.1020426050e6+y*(0.3549632885e3+y))))))+0.636619772*(J1(x)*Math.log(x)-1/x);}
  const z=8/x,y=z*z,xx=x-2.356194491;return Math.sqrt(0.636619772/x)*(Math.sin(xx)*(1+y*(0.183105e-2+y*(-0.3516396496e-4+y*(0.2457520174e-5+y*(-0.240337019e-6)))))+z*Math.cos(xx)*(0.04687499995+y*(-0.2002690873e-3+y*(0.8449199096e-5+y*(-0.88228987e-6+y*0.105787412e-6)))));}
/* DNV-RP-C205 정상류 항력계수 (원형, 초임계 영역): 상대 거칠기 Δ = k/D */
function cdsOf(D,ksMM){ const dlt=Math.max(1e-9,(ksMM/1000)/Math.max(D,1e-6)); let cd;
  if(dlt<1e-4) cd=0.65; else if(dlt<1e-2) cd=(29+4*Math.log10(dlt))/20; else cd=1.05; return {cd,dlt}; }
function mfCM(ka){ const j1p=J0(ka)-J1(ka)/ka, y1p=Y0(ka)-Y1(ka)/ka; return {CM:4/(PI*ka*ka)/Math.sqrt(j1p*j1p+y1p*y1p),j1p,y1p}; }
function waveNumber(T,d){ const w=2*PI/T; let k=w*w/G; for(let i=0;i<200;i++){ const f=G*k*Math.tanh(k*d)-w*w, df=G*Math.tanh(k*d)+G*k*d/Math.cosh(k*d)**2; const dk=f/df; k-=dk; if(Math.abs(dk)<1e-12) break; } return {w,k,L:2*PI/k}; }
function froya(U0,z,T){ const C=0.0573*Math.sqrt(1+0.148*U0), Iu=0.06*(1+0.043*U0)*Math.pow(z/10,-0.22); return {U:U0*(1+C*Math.log(z/10))*(1-0.41*Iu*Math.log(T/3600)),C,Iu}; }
function froyaU0(Uref,zref,T){ let U0=Uref; for(let i=0;i<100;i++){ const u=froya(U0,zref,T).U; const n=U0*Uref/u; if(Math.abs(n-U0)<1e-10){U0=n;break;} U0=n; } return U0; }

function turbineOf(P){
  const all=[...TURB_PRESETS,...(P.customT||[])];
  return all.find(t=>t.id===P.turb)||all[0];
}
function turbLoads(t){
  const prep=rows=>{ if(!rows||rows.length<12||rows.some(r=>!r||r.length<6||r.some(v=>!isFinite(v)))) return null;
    return rows.map((r,i)=>{ const [Mx,My,Mz,Fx,Fy,Fz]=r; const ax=t.axis==="x";
      return {lab:LROW[i],Mx,My,Mz,Fx,Fy,Fz,V:-(ax?Fx:Fz),H:ax?Math.hypot(Fy,Fz):Math.hypot(Fx,Fy),M:ax?Math.hypot(My,Mz):Math.hypot(Mx,My),T:ax?Mx:Mz}; }); };
  const u=prep(t.uls), s=prep(t.sls);
  const gov=rows=>rows?rows.reduce((a,b)=>b.M>a.M?b:a):null;
  return {uls:u,sls:s,gu:gov(u),gs:gov(s)};
}
/* 회전수: 터빈 자료가 있으면 그 값, 없으면 로터 직경과 날개 끝 속도로 추정 (가정) */
function rpmOf(T,P){ if(T.rpmMax>0&&T.rpmMin>0) return {min:T.rpmMin,max:T.rpmMax,est:false};
  if(T.rotor>0&&P.vtip>0){ const max=60*P.vtip/(PI*T.rotor); return {max,min:max*(P.rpmR||0.57),est:true,vtip:P.vtip,ratio:P.rpmR||0.57,D:T.rotor}; } return null; }
/* 1P·3P 대역: 연성-강성(soft-stiff) 허용범위와 진동수 위치 */
function freqBand(T,P){ const r=rpmOf(T,P), m=P.fmar; if(!r) return {r:null,f1P:null,f3P:null,lo:null,hi:null,zone:()=>null};
  const f1P=r.max/60, f1Pmin=r.min/60, f3P=3*r.min/60, f3Pmax=3*r.max/60, lo=f1P*(1+m), hi=f3P*(1-m), sl=f3Pmax*(1+m);
  const zone=f=>!(f>0)?null:f<f1Pmin*(1-m)?{nm:"soft-soft (1P 아래)",ok:false}:f<lo?{nm:"1P 대역 (공진 위험)",ok:false}:f<=hi?{nm:"soft-stiff (1P·3P 사이)",ok:true}:f<sl?{nm:"3P 대역 (공진 위험)",ok:false}:{nm:"stiff-stiff (3P 위)",ok:true};
  return {r,f1P,f1Pmin,f3P,f3Pmax,lo,hi,sl,valid:lo<hi,zone}; }
function turbWeight(t){ return t.Wdirect>0?t.Wdirect:((t.rna||0)+(t.tower||0))*G; }

/* ---------- 계산 ---------- */
function compute(P){
  if(P.ringAuto==="1"&&P.type!=="mono1"&&P.type!=="monoT") P={...P,rings:autoRings(P)};
  const warns=[];
  const {parts,z2,wideTop,Rbase,Rwide,S}=buildParts(P);
  const rso=S.ro, rsi=S.ri;
  if(P.type==="cone"){
    if(P.Dw>P.Db+1e-9) warns.push("원통 외경이 저판 직경보다 큽니다.");
    if(P.Dt>P.Dw) warns.push("원추 상단 외경이 하단(원통 외경)보다 큽니다.");
    ringSupport(P,{S}).forEach(g=>{ if(g.float) warns.push(`보강 링 ${g.i+1}(z ${fmt(g.z)} m)이 아래·옆으로 닿는 부재가 없어 공중에 떠 있습니다. 하단 높이나 외경을 저판·다른 링·기둥·벽체에 맞추세요.`);
      else if(g.part) warns.push(`보강 링 ${g.i+1}이 아래 부재에 두께 ${fmt(g.t)} m 중 ${fmt(g.wb)} m만 얹혀 있습니다. 내민 부분은 연결철근으로만 버팁니다.`); });
    if(Math.abs(P.Dt-2*rso)>0.05) warns.push(`원추 상단 외경 ${P.Dt} m와 기둥 외경 ${fmt(2*rso)} m가 다릅니다. 연결부를 확인하세요.`);
    if(P.tkh*2>=P.Dt) warns.push("원추 벽두께가 상단 반경보다 큽니다.");
  }else{
    if(P.cDw>P.cDs+1e-9) warns.push("케이슨 외벽 직경이 하부 슬래브보다 큽니다.");
    if(P.cH<=P.cts+P.ctt) warns.push("케이슨 높이가 슬래브와 상판 두께 합보다 작습니다.");
    if(2*rso>=P.cDw-2*P.ctw) warns.push("샤프트가 케이슨 내부보다 큽니다.");
  }
  if(P.ztop<=z2) warns.push("구조물 상단이 하부 구조 상단보다 낮습니다.");
  if(rsi<=0) warns.push("기둥 벽두께가 반경보다 큽니다.");
  if(P.zf2>P.ztop) warns.push("기둥 내부 채움 높이가 구조물 상단보다 높습니다.");

  const zmax=Math.max(P.ztop,...parts.map(p=>p.z1));
  const dz=P.fast?0.02:0.005, N=Math.ceil(zmax/dz);
  const pv=parts.map(()=>({V:0,M:0}));
  const zcut=Math.min(P.zcut>0?P.zcut:P.ztop,P.ztop), zf1=Math.min(P.zf1,z2), zbal=Math.min(Math.max(0,P.zbal),z2);
  let Vc=0,Mc=0,Vf1=0,Mf1=0,Vf2=0,Mf2=0,Cap1=0,Cap2=0,Vct=0,Mct=0,Vb=0,Mb=0;
  const cumE=new Float64Array(N+1), cumEM=new Float64Array(N+1), Re=new Float64Array(N);
  for(let i=0;i<N;i++){
    const z=(i+.5)*dz, iv=[]; let re=0, ra=0;
    parts.forEach((p,j)=>{ if(z>=p.z0&&z<p.z1){
      if(p.area){ ra+=p.area; pv[j].V+=p.area*dz; pv[j].M+=p.area*dz*z; return; }
      const ro=p.ro(z), ri=Math.max(0,p.ri(z)); if(ro>ri){ iv.push([ri,ro]); const a=PI*(ro*ro-ri*ri)*dz; pv[j].V+=a; pv[j].M+=a*z; if(ro>re) re=ro; } } });
    iv.sort((a,b)=>a[0]-b[0]);
    const mg=[]; iv.forEach(s=>{ if(mg.length&&s[0]<=mg[mg.length-1][1]+1e-12) mg[mg.length-1][1]=Math.max(mg[mg.length-1][1],s[1]); else mg.push([s[0],s[1]]); });
    let ac=0; mg.forEach(s=>ac+=PI*(s[1]**2-s[0]**2));
    // 빈 공간
    let st=0, g1=0, g2=0; const colOn=z>=P.zc0&&z<P.ztop;
    mg.forEach(s=>{ if(s[0]>st+1e-12){ const a=PI*(s[0]**2-st**2); if(colOn&&s[0]<=rsi+1e-9) g2+=a; else g1+=a; } st=Math.max(st,s[1]); });
    const raE=Math.min(ra,g1); ac+=raE; g1-=raE;
    Vc+=ac*dz; Mc+=ac*dz*z; if(z<zcut){Vct+=ac*dz;Mct+=ac*dz*z;}
    Cap1+=g1*dz; Cap2+=g2*dz;
    if(z<=zf1){Vf1+=g1*dz;Mf1+=g1*dz*z;}
    if(z<=P.zf2){Vf2+=g2*dz;Mf2+=g2*dz*z;}
    if(z<=zbal){Vb+=g1*dz;Mb+=g1*dz*z;}
    Re[i]=re; const ae=PI*re*re*dz; cumE[i+1]=cumE[i]+ae; cumEM[i+1]=cumEM[i]+ae*z;
  }
  const envAt=h=>{ if(h<=0) return {V:0,M:0}; const x=Math.min(h,N*dz)/dz, i=Math.floor(x), f=x-i;
    return {V:cumE[i]+(i<N?(cumE[i+1]-cumE[i])*f:0), M:cumEM[i]+(i<N?(cumEM[i+1]-cumEM[i])*f:0)}; };
  const reAt=h=>Re[Math.min(N-1,Math.max(0,Math.floor(h/dz)))];

  const Vgross=parts.reduce((a,p)=>a+p.V,0);
  const partRows=parts.map((p,j)=>({k:p.k,nm:p.nm,f:p.f,V:p.V,zc:pv[j].V>0?pv[j].M/pv[j].V:0,z0:p.z0,z1:p.z1}));
  const zcC=Mc/Vc, Wc=Vc*P.gc;
  const Vf=Vf1+Vf2, Wf=Vf*P.gf, zcF=Vf>0?(Mf1+Mf2)/Vf:0;

  /* 터빈 */
  const T=turbineOf(P), TL=turbLoads(T), Wt=turbWeight(T);
  const zIf=T.ifz+P.msl-P.zbDL;      // 인터페이스 높이 (저판 하면 기준)
  const zHubB=T.hub+P.msl-P.zbDL;
  let zt; if(T.rna>0&&T.tower>0) zt=(T.rna*zHubB+T.tower*(zIf+zHubB)/2)/(T.rna+T.tower); else zt=(zIf+zHubB)/2;
  if(Math.abs(zIf-P.ztop)>0.5) warns.push(`터빈 하중 인터페이스(MSL+${T.ifz} m → 저판 하면에서 ${zIf.toFixed(2)} m)가 구조물 상단(${P.ztop} m)과 다릅니다. 터빈 하중은 인터페이스 높이 기준으로 옮깁니다.`);
  const gfq=typeof gravFreq==="function"?gravFreq(P,{T,parts,z2,rsi,Rbase}):{cal:null};
  const freq={...freqBand(T,P),f:gfq.cal?gfq.f:P.f1,calc:gfq,ref:P.f1}; { const z=freq.zone(freq.f); freq.z=z; freq.ok=z?z.ok:null; }
  if(gfq.cal&&freq.ok===false) warns.push(`1차 고유진동수 ${freq.f.toFixed(3)} Hz가 ${freq.z.nm}에 있습니다${freq.r&&freq.r.est?" (회전수는 추정값)":""}.`);
  if(T.scaled) warns.push(`선택한 터빈(${T.name})의 하중표는 ${T.scaled.base||"기준 터빈"} 하중을 축척해 추정한 값입니다 (수평력 ×${T.scaled.sF.toFixed(2)}, 모멘트 ×${T.scaled.sM.toFixed(2)}).`);
  if(!TL.gu) warns.push(`선택한 터빈(${T.name})에 하중표가 없습니다. 터빈 하중 없이 안정검토합니다. 제작사 하중표를 넣으세요.`);

  /* 설치 상태 */
  const dH=P.hwl-P.zbDL, dL=0-P.zbDL;
  const eH=envAt(dH), eL=envAt(dL);
  const UH=eH.V*P.gw, UL=eL.V*P.gw;
  const Wfd=Wc+Wf;
  const Abase=PI*Rbase*Rbase;
  const inst={dH,dL,VsubH:eH.V,VsubL:eL.V,UH,UL,zbH:eH.V>0?eH.M/eH.V:0,zbL:eL.V>0?eL.M/eL.V:0,Wfd,Wt,Wtot:Wfd+Wt,WeH:Wfd+Wt-UH,WeL:Wfd+Wt-UL,Abase};
  inst.qH=inst.WeH/Abase; inst.qL=inst.WeL/Abase;
  if(dH>zmax) warns.push("설계조위가 구조물 상단보다 높습니다.");

  /* 풍하중 (구조물 노출부, Frøya) */
  const U0=froyaU0(P.Uref,P.zref,P.Tavg), fr=froya(U0,10,P.Tavg);
  const windRows=[], windArr=[]; let Fw=0,Mw=0;
  { const zs=dH, ze=P.ztop, step=0.05;
    for(let z=zs+step/2; z<ze; z+=step){ const h=Math.max(1,z-dH), u=froya(U0,h,P.Tavg).U, q=0.5*P.rhoa*u*u/1000, D=2*reAt(z), f=P.Cs*q*D; Fw+=f*step; Mw+=f*step*z; windArr.push([z,f*step]); }
    for(let h=1; h<=ze-zs+1e-9; h+=(h<10?1:2)){ const z=zs+h, f0=froya(U0,h,P.Tavg); const q=0.5*P.rhoa*f0.U**2/1000, D=2*reAt(Math.min(z,ze-1e-6)); windRows.push({h,z,Iu:f0.Iu,U:f0.U,q,D,f:P.Cs*q*D}); }
  }
  const wind={U0,C:fr.C,F:Fw,M:Mw,z:Fw>0?Mw/Fw:0,rows:windRows};

  /* 파랑하중 (MacCamy-Fuchs 관성 + 항력) */
  const rho=P.gw/G, d=dH, WN=waveNumber(P.Tw,d), w=WN.w, k=WN.k;
  const zTopW=P.crest?Math.min(P.ztop,d+P.Hw/2):d;
  const step=0.05, zs=[]; for(let z=step/2; z<zTopW; z+=step) zs.push(z);
  const fI=[],fD=[]; const waveRows=[];
  zs.forEach(z=>{ const a=reAt(z), zz=Math.min(z,d), acc=w*w*P.Hw/2*Math.cosh(k*zz)/Math.sinh(k*d), u=w*P.Hw/2*Math.cosh(k*zz)/Math.sinh(k*d);
    const cm=mfCM(k*a).CM; fI.push(rho*PI*a*a*cm*acc); fD.push(0.5*rho*cdsOf(2*a,P.ks).cd*2*a*u*u); });
  let FI=0,MI=0,best={F:0,M:0,thF:0,thM:0};
  zs.forEach((z,i)=>{FI+=fI[i]*step;MI+=fI[i]*step*z;});
  let FDm=0,MDm=0; zs.forEach((z,i)=>{FDm+=fD[i]*step;MDm+=fD[i]*step*z;});
  for(let j=0;j<720;j++){ const th=j/720*2*PI, s=Math.sin(th), c=Math.cos(th)*Math.abs(Math.cos(th));
    const F=FI*s+FDm*c, M=MI*s+MDm*c; if(F>best.F){best.F=F;best.thF=th;} if(M>best.M){best.M=M;best.thM=th;} }
  for(let zr=0; zr<=Math.floor(d); zr+=(zr<2?1:2)){ const z=Math.max(0.0001,zr), a=reAt(Math.max(z-1e-6,0.001)), r=mfCM(k*a), acc=w*w*P.Hw/2*Math.cosh(k*z)/Math.sinh(k*d), u=w*P.Hw/2*Math.cosh(k*z)/Math.sinh(k*d);
    const cq=cdsOf(2*a,P.ks); waveRows.push({z,dep:z-d,a,ka:k*a,CM:r.CM,acc,fI:rho*PI*a*a*r.CM*acc,u,Cd:cq.cd,dlt:cq.dlt,Rn:u*2*a/P.nu,fD:0.5*rho*cq.cd*2*a*u*u}); }
  { const z=d, a=reAt(z-1e-6), r=mfCM(k*a), acc=w*w*P.Hw/2*Math.cosh(k*z)/Math.sinh(k*d), u=w*P.Hw/2*Math.cosh(k*z)/Math.sinh(k*d);
    const cq=cdsOf(2*a,P.ks); if(!waveRows.length||Math.abs(waveRows[waveRows.length-1].z-d)>1e-6) waveRows.push({z,dep:0,a,ka:k*a,CM:r.CM,acc,fI:rho*PI*a*a*r.CM*acc,u,Cd:cq.cd,dlt:cq.dlt,Rn:u*2*a/P.nu,fD:0.5*rho*cq.cd*2*a*u*u}); }
  const Dsw=2*reAt(d-1e-6);
  const wave={rho,d,w,k,L:WN.L,FI,MI,FD:FDm,MD:MDm,F:best.F,M:best.M,z:best.F>0?best.M/best.F:0,thF:best.thF,thM:best.thM,rows:waveRows,zTop:zTopW,Dsw,KC:(w*P.Hw/2*Math.cosh(k*d)/Math.sinh(k*d))*P.Tw/Math.max(Dsw,0.01),DL:Dsw/WN.L};

  /* 조류 (1/7 승 분포) */
  /* 조류: 조석류 1/7승 + 바람에 의한 해류(직선, 깊이 d0) — DNV-RP-C205 */
  const Uw0=P.wcf*U0, d0=Math.min(P.d0w,d);
  const curCase=(Ut,Uw)=>{ let F=0,M=0; const rows=[], arr=[];
    zs.filter(z=>z<d).forEach(z=>{ const a=reAt(z), ut=Ut*Math.pow(z/d,1/7), uw=Uw*Math.max(0,(d0-(d-z))/d0), u=ut+uw, cq=cdsOf(2*a,P.ks), f=0.5*rho*cq.cd*2*a*u*u; F+=f*step; M+=f*step*z; arr.push([z,f*step]); });
    for(let zr=0; zr<=Math.floor(d); zr+=(zr<2?1:2)){ const z=Math.max(0.01,zr), a=reAt(z), ut=Ut*Math.pow(z/d,1/7), uw=Uw*Math.max(0,(d0-(d-z))/d0), u=ut+uw, cq=cdsOf(2*a,P.ks);
      rows.push({z,dep:z-d,D:2*a,ut,uw,u,dlt:cq.dlt,Cd:cq.cd,Rn:u*2*a/P.nu,f:0.5*rho*cq.cd*2*a*u*u}); }
    { const z=d-1e-6, a=reAt(z), cq=cdsOf(2*a,P.ks), u=Ut+Uw; rows.push({z:d,dep:0,D:2*a,ut:Ut,uw:Uw,u,dlt:cq.dlt,Cd:cq.cd,Rn:u*2*a/P.nu,f:0.5*rho*cq.cd*2*a*u*u}); }
    return {F,M,z:F>0?M/F:0,rows,Ut,Uw,arr}; };
  const curN=curCase(P.Uc,0), curE=curCase(P.Uce,Uw0);
  const cur={n:curN,e:curE,Uw0,d0,F:curE.F,M:curE.M};
  /* 기둥 하단 단면(하부 구조 상단)에 작용하는 외력: 단면 위쪽 하중만, 단면 기준 모멘트 */
  const secAt=zc=>{ let wF=0,wM=0; windArr.forEach(([z,f])=>{ if(z>zc){ wF+=f; wM+=f*(z-zc); } });
    let fi=0,mi=0,fd=0,md=0; zs.forEach((z,i)=>{ if(z>zc){ fi+=fI[i]*step; mi+=fI[i]*step*(z-zc); fd+=fD[i]*step; md+=fD[i]*step*(z-zc); } });
    let bM=0,bF=0; for(let j=0;j<720;j++){ const th=j/720*2*PI, sn=Math.sin(th), c=Math.cos(th)*Math.abs(Math.cos(th)); const M=mi*sn+md*c; if(M>bM){bM=M;bF=fi*sn+fd*c;} }
    let cF=0,cM=0; curE.arr.forEach(([z,f])=>{ if(z>zc){ cF+=f; cM+=f*(z-zc); } });
    return {z:zc,wF,wM,vF:bF,vM:bM,cF,cM}; };
  const colSec=secAt(z2);
  /* 높이 구간별 항력계수 표: 직경 일정 구간 / 변하는 구간으로 묶음 */
  const cdTbl=[]; { let g=null, prev=null;
    for(let z=step/2; z<d; z+=step){ const D=2*reAt(z), varying=prev!==null&&Math.abs(D-prev)>1e-4;
      if(!g||(g.vary!==varying&&!(g.n===1))){ g={z0:z-step/2,z1:z+step/2,Da:D,Db:D,vary:varying,n:1}; cdTbl.push(g); }
      else { g.z1=z+step/2; g.Db=D; g.n++; if(g.n===2) g.vary=varying; }
      prev=D; }
    cdTbl.forEach(r=>{ r.z1=Math.min(r.z1,d); const a=cdsOf(r.Da,P.ks), b=cdsOf(r.Db,P.ks); r.dA=a.dlt; r.dB=b.dlt; r.cA=a.cd; r.cB=b.cd; }); }

  /* 지진 (수평 관성력 + 동수압 부가질량) */
  const eqItems=[{nm:"콘크리트",W:Wc,z:zcC},{nm:"속채움",W:Wf,z:zcF},{nm:"터빈+타워",W:Wt,z:zt}];
  if(P.hydro) eqItems.push({nm:"동수압 (부가질량 = 배제수)",W:UH,z:inst.zbH});
  let Fe=0,Me=0; eqItems.forEach(it=>{it.F=P.kh*it.W; it.M=it.F*it.z; Fe+=it.F; Me+=it.M;});
  const eq={items:eqItems,F:Fe,M:Me};

  /* 시공 오차 기울기 */
  const tn=Math.tan(P.tilt*PI/180);
  const tiltM=(Ub,zb)=>Math.max(0,(Wc*zcC+Wf*zcF+Wt*zt-Ub*zb)*tn);

  /* 하중조합 · 안정검토 */
  const R=Rbase, A=Abase, Z=PI*R**3/4;
  const tgu=TL.gu, tgs=TL.gs;
  const tl=g=>g?{V:g.V,H:g.H,M:g.M,lab:g.lab}:{V:Wt,H:0,M:0,lab:"하중표 없음 (자중만)"};
  const mk=(id,nm,water,tg,parts,fs)=>{
    const U=water==="L"?UL:UH, zb=water==="L"?inst.zbL:inst.zbH;
    const t=tl(tg);
    const items=[];
    items.push({nm:"구조물 자중 (콘크리트+속채움)",V:Wfd,H:0,M:0});
    items.push({nm:`터빈 (${t.lab})`,V:t.V,H:t.H,M:t.M+t.H*zIf,note:`M + H × ${zIf.toFixed(2)}`});
    items.push({nm:`부력 (${water==="L"?"약최저저조위":"설계조위"})`,V:-U,H:0,M:0});
    if(parts.wind) items.push({nm:"풍하중 (구조물)",V:0,H:wind.F,M:wind.M});
    if(parts.wave) items.push({nm:"파랑하중",V:0,H:wave.F,M:wave.M});
    if(parts.cur){ const c=parts.cur==="e"?curE:curN; items.push({nm:parts.cur==="e"?"조류하중 (극치 + 바람 해류)":"조류하중 (상시)",V:0,H:c.F,M:c.M}); }
    if(parts.eq) items.push({nm:"지진 관성력",V:0,H:eq.F,M:eq.M});
    const dM=tiltM(U,zb); items.push({nm:`시공 기울기 ${P.tilt}°`,V:0,H:0,M:dM});
    const V=items.reduce((a,b)=>a+b.V,0), H=items.reduce((a,b)=>a+b.H,0), M=items.reduce((a,b)=>a+b.M,0);
    const e=V>0?M/V:Infinity;
    const FSo=M>0?V*R/M:Infinity, FSs=H>0?P.mu*V/H:Infinity;
    let Aeff=0,be=0,le=0; if(e<R){ Aeff=2*(R*R*Math.acos(e/R)-e*Math.sqrt(R*R-e*e)); be=2*(R-e); le=2*R*Math.sqrt(1-(1-be/(2*R))**2); }
    const noGap=e<=R/4+1e-9;
    const qmax=V/A+M/Z, qmin=V/A-M/Z, qeff=Aeff>0?V/Aeff:Infinity;
    const qcheck=noGap?qmax:qeff, qa=P.qa*(fs.qf||1);
    const r={id,nm,water,items,V,H,M,e,FSo,FSs,Aeff,be,le,noGap,qmax,qmin,qeff,qcheck,qa,fs,ratioA:Aeff/A};
    r.okO=FSo>=fs.o; r.okS=FSs>=fs.s; r.okQ=qcheck<=qa; r.okE=fs.gap?noGap:(r.ratioA>=P.aeff);
    r.ok=r.okO&&r.okS&&r.okQ&&r.okE&&V>0;
    return r;
  };
  const LC=[
    mk("LC1","상시 (운전, 설계조위)","H",tgs,{cur:"n"},{o:P.fsO1,s:P.fsS1,qf:1,gap:true}),
    mk("LC2","폭풍 (극한, 설계조위)","H",tgu,{wind:1,wave:1,cur:"e"},{o:P.fsO2,s:P.fsS2,qf:1,gap:false}),
    mk("LC3","폭풍 (극한, 약최저저조위)","L",tgu,{wind:1,wave:1,cur:"e"},{o:P.fsO2,s:P.fsS2,qf:1,gap:false}),
    mk("LC4","지진 (운전, 설계조위)","H",tgs,{cur:"n",eq:1},{o:P.fsO3,s:P.fsS3,qf:P.qf3,gap:false}),
  ];

  /* 기둥 높이별 단면력·응력 (응력분포도): 단면 z 위쪽 하중만, 단면 기준 모멘트
     N = 터빈 연직 + 기둥·플랫폼 자중(수중부는 수중단위중량), H·M = 터빈 + 풍·파랑(단면별 최대 위상)·조류·지진
     σ = N/A ± M/Z (압축 +), 기둥 속채움 하중은 내부 바닥으로 전달된다고 보고 제외 */
  const colD=(()=>{ const zb=Math.max(z2,P.zc0), zt0=P.ztop, n=60, Ac=PI*(rso*rso-rsi*rsi), Ic=PI/4*(rso**4-rsi**4), Zc=Ic/rso;
    const Aplat=P.Dp>0&&P.tp>0?Math.max(0,PI*((P.Dp/2)**2-rso**2))*P.tp:0, Wpl=Aplat*P.gc, zPl=zt0-P.tp/2;
    const zsec=[]; for(let i=0;i<=n;i++) zsec.push(zb+(zt0-zb)*i/n);
    const defs=[["LC1","H",tgs,{cur:"n"}],["LC2","H",tgu,{wind:1,wave:1,cur:"e"}],["LC3","L",tgu,{wind:1,wave:1,cur:"e"}],["LC4","H",tgs,{cur:"n",eq:1}]];
    const lc={};
    defs.forEach(([id,wl,tg,pt])=>{ const t=tl(tg), dW=wl==="L"?dL:dH, N=[],V=[],M=[],sc=[],st=[];
      zsec.forEach(zc=>{ // 기둥 자중 (단면 위)
        const top=zt0, sub=Math.max(0,Math.min(dW,top)-zc), dry=Math.max(0,top-Math.max(zc,dW));
        const Wcol=Ac*(dry*P.gc+Math.max(0,sub)*(P.gc-P.gw));
        let n_=t.V+Wcol+Wpl, h=t.H, m=t.M+t.H*(zIf-zc);
        if(pt.wind) windArr.forEach(([z,f])=>{ if(z>zc){ h+=f; m+=f*(z-zc); } });
        if(pt.wave){ let fi=0,mi=0,fd=0,md=0; zs.forEach((z,i)=>{ if(z>zc){ fi+=fI[i]*step; mi+=fI[i]*step*(z-zc); fd+=fD[i]*step; md+=fD[i]*step*(z-zc); } });
          let bM=0,bF=0; for(let j=0;j<360;j++){ const th=j/360*2*PI, sn=Math.sin(th), c=Math.cos(th)*Math.abs(Math.cos(th)); const mm=mi*sn+md*c; if(mm>bM){bM=mm;bF=fi*sn+fd*c;} } h+=bF; m+=bM; }
        if(pt.cur){ const c=pt.cur==="e"?curE:curN; c.arr.forEach(([z,f])=>{ if(z>zc){ h+=f; m+=f*(z-zc); } }); }
        if(pt.eq){ const k=P.kh, Wc_=Ac*(top-zc)*P.gc; h+=k*(Wt+Wc_+Wpl); m+=k*(Wt*Math.max(0,zt-zc)+Wc_*(top-zc)/2+Wpl*(zPl-zc)); }
        N.push(n_); V.push(h); M.push(m); sc.push((n_/Ac+m/Zc)/1000); st.push((n_/Ac-m/Zc)/1000); });
      lc[id]={N,V,M,sc,st}; });
    return {z:zsec,lc,Ac,Zc,ro:rso,ri:rsi,hex:!!S.hex}; })();

  /* 부유 상태 */
  const WcT=Vct*P.gc, zcT=Vct>0?Mct/Vct:0, Wb=Vb*P.gw, zcB=Vb>0?Mb/Vb:0;
  const Wfl=WcT+Wb+P.Wadd, KG=(WcT*zcT+Wb*zcB+P.Wadd*P.zadd)/Wfl, Vneed=Wfl/P.gw;
  let ifs=0,rfo=0,rfi=0;
  if(zbal>(P.type==="caisson"?P.cts:P.tb)){
    if(P.type==="caisson") rfo=P.cDw/2-P.ctw; else { const z1=P.tb+P.hw; rfo=zbal<=z1?P.Dw/2-P.tw:(P.Dw/2+(P.Dt/2-P.Dw/2)*(zbal-z1)/P.hk-P.tkh); }
    rfi=(zbal>=P.zc0&&zbal<P.ztop)?rso:0;
    const n=P.type==="caisson"?Math.max(0,Math.round(P.cnr)):0;
    if(n<2) ifs=PI/4*(rfo**4-rfi**4);
    else { // 격벽으로 나뉜 n개 격실, 각 격실 자기 도심축 기준 합
      const ph=2*PI/n, nr=60, na=60; let tot=0;
      for(let s=0;s<n;s++){ let A0=0,Ay=0,Iyy=0; for(let i=0;i<nr;i++){ const r=rfi+(rfo-rfi)*(i+.5)/nr, dr=(rfo-rfi)/nr; for(let j=0;j<na;j++){ const t=s*ph+ph*(j+.5)/na, dA=r*dr*ph/na, y=r*Math.sin(t); A0+=dA; Ay+=dA*y; Iyy+=dA*y*y; } }
        tot+=Iyy-Ay*Ay/A0; }
      ifs=tot; }
  }
  let flt=null;
  if(Vneed>envAt(zcut).V) warns.push("부유 중량이 예인 상태 외곽 배수량보다 커서 뜨지 않습니다.");
  else{
    let lo=0,hi=zcut; for(let i=0;i<60;i++){const m=(lo+hi)/2; if(envAt(m).V<Vneed) lo=m; else hi=m;}
    const T2=(lo+hi)/2, e=envAt(T2), KB=e.M/e.V, Rw=reAt(T2-1e-6), I=PI*Rw**4/4, BM=I/e.V, GM0=KB+BM-KG, FSC=ifs/e.V, GM=GM0-FSC;
    const zone=T2<=wideTop+1e-9?"wide":(P.type==="cone"&&T2<=z2?"cone":"col");
    flt={T:T2,V:e.V,KB,R:Rw,I,BM,KG,GM0,FSC,ifs,rfo,rfi,GM,fb:zcut-T2,W:Wfl,WcT,zcT,Vct,Wb,Vb,zcB,zcut,zbal,clr:P.dTow-T2,okT:(P.dTow-T2)>=P.ukc,okGM:GM>=P.gmMin,zone,wideTop};
    if(zone!=="wide"&&GM<P.gmMin) warns.push(`예인 흘수 ${T2.toFixed(2)} m가 ${P.type==="cone"?"하부 원통":"케이슨"} 상단(${wideTop.toFixed(2)} m)보다 높아 수면이 ${zone==="cone"?"원추":"기둥"}에 걸립니다. 수선면이 작아 복원력(BM)이 작습니다.`);
    if(flt.fb<=0.5) warns.push("예인 상태 건현이 0.5 m 이하입니다.");
  }
  const grout=Abase*P.tg, pad=P.padN*P.padB**2*P.padH;
  return {P,parts:partRows,z2,wideTop,Rbase,Rwide,S,rso,rsi,zmax,Vgross,Vc,overlap:Vgross-Vc,zcC,Wc,Vf1,Vf2,Vf,Wf,zcF,Cap1,Cap2,
    inst,T,TL,Wt,zIf,zt,freq,wind,wave,cur,cdTbl,colSec,colD,eq,LC,flt,grout,pad,warns,Re,dz,N,envAt,reAt};
}
/* 예인 높이별 흘수·GM 표 */
function towTable(P){
  const out=[], base=buildParts(P).z2, top=P.ztop;
  const hs=[]; for(let z=Math.ceil(base); z<top; z+=4) hs.push(z); hs.push(top);
  hs.forEach(z=>{ const r=compute({...P,zcut:z}); out.push({z,f:r.flt}); });
  return out;
}
/*MEMBER*/
/*ENGINE END*/
if(typeof module!=="undefined") module.exports={cdsOf,compute,DEF,towTable,mfCM,waveNumber,froya,froyaU0,TURB_PRESETS,turbLoads,hexProps};
