/*MONO*/
/* ---------- 모노파일 (강관 말뚝 + 트랜지션피스) ----------
   높이는 모두 DL 표고(m). 계산은 DOM 없이 순수 함수. */
const MONO_DEF={
  mD:10.0,mDt:8.0,mzA:-25,mzB:-5,      // 하부 직경, 상부 직경(테이퍼형), 테이퍼 구간 하단·상단 표고
  mtop:8.0,mL:30,                      // 말뚝 상단 표고, 근입깊이(원지반 아래)
  mz1:-50,mz2:-20,mt1:95,mt2:110,mt3:95, // 두께 구간 경계 표고, 구간별 두께(mm)
  mca:2,mfy:355,mgM:1.1,mgs:77.0,mgE:1.35,mmg:50,
  mTP:"grout",mtTP:80,mgap:0.10,mWsec:1500,mgg:23.0,
  mInst:"drive",mDrG:0.15,mDrL:15,
  mSc:"1",mScK:5,mScT:1.5,mScS:1.3,
};
Object.assign(DEF,MONO_DEF);
const CAT_OF={cone:"grav",caisson:"grav",mono1:"mono",monoT:"mono"};
const catOf=t=>CAT_OF[t]||"grav";
const SAMPLE_MONO={type:"monoT",mD:11,mDt:8,mzA:-25,mzB:-5};

function monoGeom(P){
  const taper=P.type==="monoT";
  const Dp=y=>!taper?P.mD:(y<=P.mzA?P.mD:y>=P.mzB?P.mDt:P.mD+(P.mDt-P.mD)*(y-P.mzA)/Math.max(1e-6,P.mzB-P.mzA));
  const tAt=y=>(y<P.mz1?P.mt1:y<P.mz2?P.mt2:P.mt3)/1000;
  const T=turbineOf(P), yIf=T.ifz+P.msl;
  const yToe=P.sbDL-P.mL, Dtop=Dp(P.mtop), grout=P.mTP!=="bolt";
  const Lov=grout?1.5*Dtop:0, tTP=P.mtTP/1000;
  const DTP=grout?Dtop+2*(P.mgap+tTP):Dtop;
  const yTP0=P.mtop-Lov, yTP1=yIf;
  const Dout=y=>(y>=yTP0&&y<=yTP1)?DTP:Dp(y);
  const prot=+P.mSc===1, S=prot?0:P.mScS*Dp(P.sbDL), yML=P.sbDL-S;
  return {taper,Dp,tAt,T,yIf,yToe,Dtop,grout,Lov,tTP,DTP,yTP0,yTP1,Dout,prot,S,yML};
}

function computeMono(P){
  const g=monoGeom(P), {Dp,tAt,T,yIf,yToe,Dtop,grout,Lov,tTP,DTP,yTP0,yTP1,Dout,prot,S,yML}=g;
  const warns=[], dy=P.fast?0.1:0.05, gs=P.mgs, gw=P.gw, rho=gw/G;
  const ringA=(D,t)=>PI*t*(D-t);

  /* 강관 중량 (두께 구간별) */
  const zb=[[-1e9,P.mz1,P.mt1,"하부"],[P.mz1,P.mz2,P.mt2,"중간 (해저면 부근)"],[P.mz2,1e9,P.mt3,"상부"]];
  const segs=[]; let Wp=0,Mp=0,Wpa=0,Mpa=0,Vsub=0,Msub=0,Vin=0,Min=0,Vdis=0,Mdis=0;
  zb.forEach(([lo,hi,tm,nm])=>{ const y0=Math.max(yToe,lo), y1=Math.min(P.mtop,hi); if(y1<=y0) return;
    let W=0,M=0,Da=Dp(y0),Db=Dp(y1),Am=0;
    for(let y=y0+dy/2; y<y1; y+=dy){ const h=Math.min(dy,y1-(y-dy/2)), D=Dp(y), t=tm/1000, a=ringA(D,t)*h; W+=a*gs; M+=a*gs*y; Am+=PI*D*h; }
    segs.push({nm,y0,y1,t:tm,Da,Db,L:y1-y0,W,y:W>0?M/W:0,DtMax:Math.max(Da,Db)*1000/tm,As:Am}); Wp+=W; Mp+=M; });
  for(let y=Math.max(yToe,yML)+dy/2; y<P.mtop; y+=dy){ const D=Dp(y), t=tAt(y), a=ringA(D,t)*dy; Wpa+=a*gs; Mpa+=a*gs*y;
    if(y<P.hwl){ Vsub+=a; Msub+=a*y; const di=D-2*t, ai=PI/4*di*di*dy; Vin+=ai; Min+=ai*y; } }
  /* 해저면~설계조위 외곽 배제 체적 (동수압 부가질량) */
  for(let y=yML+dy/2; y<P.hwl; y+=dy){ const D=Dout(y), a=PI/4*D*D*dy; Vdis+=a; Mdis+=a*y; }
  /* 트랜지션피스 · 그라우트 · 2차 부재 */
  const VTP=ringA(DTP,tTP)*(yTP1-yTP0), WTP=VTP*gs, yTPc=(yTP0+yTP1)/2;
  const Vg=grout?PI/4*((Dtop+2*P.mgap)**2-Dtop**2)*Lov:0, Wg=Vg*P.mgg, yGc=(yTP0+P.mtop)/2;
  const Wsec=P.mWsec;
  const subLen=(a,b)=>Math.max(0,Math.min(b,P.hwl)-Math.max(a,yML));
  const VTPs=ringA(DTP,tTP)*subLen(yTP0,yTP1), Vgs=grout?PI/4*((Dtop+2*P.mgap)**2-Dtop**2)*subLen(yTP0,P.mtop):0;
  const U=(Vsub+VTPs+Vgs)*gw;
  const Wt=turbWeight(T), TL=turbLoads(T);
  const yHub=T.hub+P.msl; let yt; if(T.rna>0&&T.tower>0) yt=(T.rna*yHub+T.tower*(yIf+yHub)/2)/(T.rna+T.tower); else yt=(yIf+yHub)/2;
  const wt={segs,Wp,yP:Wp>0?Mp/Wp:0,Wpa,yPa:Wpa>0?Mpa/Wpa:0,VTP,WTP,yTPc,Vg,Wg,yGc,Wsec,U,Vsub,Vin,yIn:Vin>0?Min/Vin:0,Vdis,yDis:Vdis>0?Mdis/Vdis:0,
    Wtot:Wpa+WTP+Wg+Wsec,Wt,yt};

  /* 풍하중 (물 위 TP·말뚝, Frøya) */
  const U0=froyaU0(P.Uref,P.zref,P.Tavg), fr=froya(U0,10,P.Tavg);
  let Fw=0,Mw=0; const windRows=[], windArr=[];
  for(let y=P.hwl+dy/2; y<yIf; y+=dy){ const h=Math.max(1,y-P.hwl), u=froya(U0,h,P.Tavg).U, q=0.5*P.rhoa*u*u/1000, f=P.Cs*q*Dout(y); Fw+=f*dy; Mw+=f*dy*(y-yML); windArr.push([y,f*dy]); }
  for(let h=1; h<=yIf-P.hwl+1e-9; h+=(h<10?1:2)){ const y=P.hwl+h, f0=froya(U0,h,P.Tavg), q=0.5*P.rhoa*f0.U**2/1000, D=Dout(Math.min(y,yIf-1e-6)); windRows.push({h,y,Iu:f0.Iu,U:f0.U,q,D,f:P.Cs*q*D}); }
  const wind={U0,C:fr.C,F:Fw,M:Mw,arm:Fw>0?Mw/Fw:0,rows:windRows,arr:windArr};

  /* 파랑하중: 높이별 직경으로 MacCamy-Fuchs 관성 + 항력, 해양생물 두께 포함 */
  const mg=P.mmg/1000, yMG=P.msl+2;
  const Dh=y=>Dout(y)+(y<=yMG?2*mg:0);
  const d=P.hwl-P.sbDL, WN=waveNumber(P.Tw,d), w=WN.w, k=WN.k;
  const yWtop=P.crest?Math.min(yIf,P.hwl+P.Hw/2):P.hwl;
  const kin=z=>{ const zz=Math.min(z,d); return {acc:w*w*P.Hw/2*Math.cosh(k*zz)/Math.sinh(k*d),u:w*P.Hw/2*Math.cosh(k*zz)/Math.sinh(k*d)}; };
  const ys=[]; for(let y=P.sbDL+dy/2; y<yWtop; y+=dy) ys.push(y);
  const fI=[],fD=[];
  ys.forEach(y=>{ const D=Dh(y), a=D/2, q=kin(y-P.sbDL); fI.push(rho*PI*a*a*mfCM(k*a).CM*q.acc); fD.push(0.5*rho*cdsOf(D,P.ks).cd*D*q.u*q.u); });
  let FI=0,MI=0,FDm=0,MDm=0; ys.forEach((y,i)=>{ FI+=fI[i]*dy; MI+=fI[i]*dy*(y-yML); FDm+=fD[i]*dy; MDm+=fD[i]*dy*(y-yML); });
  let best={F:0,M:0,thF:0,thM:0};
  for(let j=0;j<720;j++){ const th=j/720*2*PI, s=Math.sin(th), c=Math.cos(th)*Math.abs(Math.cos(th));
    const F=FI*s+FDm*c, M=MI*s+MDm*c; if(F>best.F){best.F=F;best.thF=th;} if(M>best.M){best.M=M;best.thM=th;} }
  const waveRows=[]; { const pts=[]; for(let zr=0; zr<d; zr+=(zr<2?1:2)) pts.push(zr); pts.push(d);
    pts.forEach(zr=>{ const z=Math.max(0.0001,zr), y=P.sbDL+z, D=Dh(Math.min(y,P.hwl-1e-6)), a=D/2, r=mfCM(k*a), q=kin(z), cq=cdsOf(D,P.ks);
      waveRows.push({z,y,D,ka:k*a,CM:r.CM,acc:q.acc,fI:rho*PI*a*a*r.CM*q.acc,u:q.u,Cd:cq.cd,dlt:cq.dlt,Rn:q.u*D/P.nu,fD:0.5*rho*cq.cd*D*q.u*q.u}); }); }
  const Dsw=Dh(P.hwl-1e-6), Dsb=Dh(P.sbDL+1e-6), DLr=Dsw/WN.L, uS=kin(d).u;
  const wave={rho,d,w,k,L:WN.L,FI,MI,FD:FDm,MD:MDm,F:best.F,M:best.M,arm:best.F>0?best.M/best.F:0,thF:best.thF,thM:best.thM,rows:waveRows,yTop:yWtop,
    Dsw,Dsb,DL:DLr,diff:DLr>0.2,KC:uS*P.Tw/Math.max(Dsw,0.01),dist:ys.map((y,i)=>[y,fI[i],fD[i]])};

  /* 조류: 조석류 1/7승 + 바람 해류 */
  const Uw0=P.wcf*U0, d0=Math.min(P.d0w,d);
  const curCase=(Ut,Uw)=>{ let F=0,M=0; const rows=[], arr=[];
    ys.filter(y=>y<P.hwl).forEach(y=>{ const z=y-P.sbDL, D=Dh(y), ut=Ut*Math.pow(z/d,1/7), uw=Uw*Math.max(0,(d0-(d-z))/d0), u=ut+uw, f=0.5*rho*cdsOf(D,P.ks).cd*D*u*u; F+=f*dy; M+=f*dy*(y-yML); arr.push([y,f*dy]); });
    const pts=[]; for(let zr=0; zr<d; zr+=(zr<2?1:2)) pts.push(Math.max(0.01,zr)); pts.push(d);
    pts.forEach(z=>{ const y=P.sbDL+z, D=Dh(Math.min(y,P.hwl-1e-6)), ut=Ut*Math.pow(z/d,1/7), uw=Uw*Math.max(0,(d0-(d-z))/d0), u=ut+uw, cq=cdsOf(D,P.ks);
      rows.push({z,y,D,ut,uw,u,dlt:cq.dlt,Cd:cq.cd,Rn:u*D/P.nu,f:0.5*rho*cq.cd*D*u*u}); });
    return {F,M,arm:F>0?M/F:0,rows,Ut,Uw,arr}; };
  const curN=curCase(P.Uc,0), curE=curCase(P.Uce,Uw0);
  const cur={n:curN,e:curE,Uw0,d0};

  /* 항력계수 표 (서로 다른 직경별) */
  const cdTbl=[]; { const seen=new Map(); ys.forEach(y=>{ const D=Math.round(Dh(y)*1000)/1000; if(!seen.has(D)) seen.set(D,{D,y0:y-dy/2,y1:y+dy/2}); else seen.get(D).y1=y+dy/2; });
    [...seen.values()].forEach(r=>{ const c=cdsOf(r.D,P.ks); cdTbl.push({...r,dlt:c.dlt,cd:c.cd}); });
    const grp=[]; cdTbl.forEach(r=>{ const l=grp[grp.length-1]; if(l&&Math.abs(l.cdB-r.cd)<5e-4&&Math.abs(r.y0-l.y1)<dy*1.5){ l.y1=r.y1; l.Db=r.D; l.cdB=r.cd; l.dB=r.dlt; } else grp.push({y0:r.y0,y1:r.y1,Da:r.D,Db:r.D,cdA:r.cd,cdB:r.cd,dA:r.dlt,dB:r.dlt}); });
    cdTbl.length=0; grp.forEach(r=>cdTbl.push(r)); }

  /* 고유진동수 허용범위 */
  const freq={...freqBand(T,P),f:P.f1}; { const z=freq.zone(P.f1); freq.z=z; freq.ok=z?z.ok:null; }

  /* 지진 (해저면 기준) */
  const Win=Vin*gw;
  const eqItems=[{nm:"강관 (해저면 위)",W:Wpa,y:wt.yPa},{nm:"트랜지션피스",W:WTP,y:yTPc},{nm:"그라우트",W:Wg,y:yGc},{nm:"2차 부재 (플랫폼 등)",W:Wsec,y:yIf},{nm:"터빈+타워",W:Wt,y:yt},{nm:"말뚝 안 해수",W:Win,y:wt.yIn}];
  if(P.hydro) eqItems.push({nm:"동수압 (부가질량 = 배제수)",W:Vdis*gw,y:wt.yDis});
  let Fe=0,Me=0; eqItems.forEach(it=>{ it.F=P.kh*it.W; it.arm=it.y-yML; it.M=it.F*it.arm; Fe+=it.F; Me+=it.M; });
  const eq={items:eqItems,F:Fe,M:Me};

  /* 하중조합 (해저면 단면력) */
  const armIf=yIf-yML;
  const tl=gv=>gv?{V:gv.V,H:gv.H,M:gv.M,lab:gv.lab}:{V:Wt,H:0,M:0,lab:"하중표 없음 (자중만)"};
  const mk=(id,nm,tg,parts,gE,kind)=>{ const t=tl(tg), items=[];
    items.push({nm:"강관·TP·그라우트·2차 부재 (해저면 위)",g:1,V:wt.Wtot,H:0,M:0});
    items.push({nm:`터빈 (${t.lab})`,g:1,V:t.V,H:t.H,M:t.M+t.H*armIf,note:`M + H × ${armIf.toFixed(2)}`});
    items.push({nm:"부력 (설계조위)",g:1,V:-U,H:0,M:0});
    if(parts.wind) items.push({nm:"풍하중 (TP·말뚝)",g:gE,V:0,H:wind.F,M:wind.M});
    if(parts.wave) items.push({nm:"파랑하중",g:gE,V:0,H:wave.F,M:wave.M});
    if(parts.cur){ const c=parts.cur==="e"?curE:curN; items.push({nm:parts.cur==="e"?"조류하중 (극치 + 바람 해류)":"조류하중 (상시)",g:gE,V:0,H:c.F,M:c.M}); }
    if(parts.eq) items.push({nm:"지진 관성력",g:1,V:0,H:eq.F,M:eq.M});
    const V=items.reduce((a,b)=>a+b.V*b.g,0), H=items.reduce((a,b)=>a+b.H*b.g,0), M=items.reduce((a,b)=>a+b.M*b.g,0);
    return {id,nm,kind,items,V,H,M}; };
  const LC=[
    mk("LC1","상시 (운전, SLS)",TL.gs,{cur:"n"},1,"SLS"),
    mk("LC2","폭풍 (극한, ULS)",TL.gu,{wind:1,wave:1,cur:"e"},P.mgE,"ULS"),
    mk("LC3","지진 (운전)",TL.gs,{cur:"n",eq:1},1,"EQ"),
  ];

  /* 높이별 단면력·응력 (응력분포도): 해저면 ~ 인터페이스, 단면 y 위쪽 하중만
     N = 터빈 연직 + 강관·TP·그라우트·2차 부재 자중 − 잠긴 강재 부력, H·M = 터빈 + 풍·파랑(단면별 최대 위상)·조류·지진(분포 관성력)
     σ = N/A + M/Z, 단면은 말뚝 강관만(부식 여유 공제). TP 겹침 구간은 말뚝 단면만으로 계산(보수적) */
  const colD=(()=>{ const n=80, yb=yML, ytop=yIf, zsec=[]; for(let i=0;i<=n;i++) zsec.push(yb+(ytop-yb)*i/n);
    const wTP=WTP/Math.max(1e-6,yTP1-yTP0), wG=Wg/Math.max(1e-6,P.mtop-yTP0), sl=[];
    for(let y=yb+dy/2; y<ytop; y+=dy){ const D=Dp(y), t=tAt(y), a=ringA(D,t); let w=y<P.mtop?a*gs:0, b=0;
      if(y>=yTP0&&y<=yTP1) w+=wTP; if(grout&&y>=yTP0&&y<=P.mtop) w+=wG;
      if(y<P.hwl){ b=(y<P.mtop?a:0)+((y>=yTP0&&y<=yTP1)?ringA(DTP,tTP):0)+((grout&&y>=yTP0&&y<=P.mtop)?PI/4*((Dtop+2*P.mgap)**2-Dtop**2):0); b*=gw; }
      const win=y<P.hwl&&y<P.mtop?PI/4*(D-2*t)**2*gw:0, wdis=P.hydro&&y<P.hwl?PI/4*Dout(y)**2*gw:0;
      sl.push([y,w*dy,b*dy,(w+win+wdis)*dy]); }
    const defs=[["LC1",TL.gs,{cur:"n"},1],["LC2",TL.gu,{wind:1,wave:1,cur:"e"},P.mgE],["LC3",TL.gs,{cur:"n",eq:1},1]], lc={};
    defs.forEach(([id,tg,pt,gE])=>{ const t=tl(tg), N=[],V=[],M=[],sc=[],st=[];
      zsec.forEach(yc=>{ let n_=t.V, h=t.H, m=t.M+t.H*(yIf-yc);
        sl.forEach(([y,w,b])=>{ if(y>yc) n_+=w-b; }); if(yIf>yc) n_+=Wsec;
        if(pt.wind) windArr.forEach(([y,f])=>{ if(y>yc){ h+=gE*f; m+=gE*f*(y-yc); } });
        if(pt.wave){ let fi=0,mi=0,fd=0,md=0; ys.forEach((y,i)=>{ if(y>yc){ fi+=fI[i]*dy; mi+=fI[i]*dy*(y-yc); fd+=fD[i]*dy; md+=fD[i]*dy*(y-yc); } });
          let bM=0,bF=0; for(let j=0;j<360;j++){ const th=j/360*2*PI, sn=Math.sin(th), c=Math.cos(th)*Math.abs(Math.cos(th)), mm=mi*sn+md*c; if(mm>bM){bM=mm;bF=fi*sn+fd*c;} } h+=gE*bF; m+=gE*bM; }
        if(pt.cur){ const c=pt.cur==="e"?curE:curN; c.arr.forEach(([y,f])=>{ if(y>yc){ h+=gE*f; m+=gE*f*(y-yc); } }); }
        if(pt.eq){ const k=P.kh; sl.forEach(([y,,,we])=>{ if(y>yc){ h+=k*we; m+=k*we*(y-yc); } }); if(yIf>yc){ h+=k*Wsec; m+=k*Wsec*(yIf-yc); } if(yt>yc){ h+=k*Wt; m+=k*Wt*(yt-yc); } }
        const D=Dp(Math.min(yc,P.mtop)), tcr=Math.max(0.001,tAt(yc)-P.mca/1000), Di=D-2*tcr, A_=PI/4*(D*D-Di*Di), Z_=PI/32*(D**4-Di**4)/D;
        N.push(n_); V.push(h); M.push(m); sc.push((n_/A_+m/Z_)/1000); st.push((n_/A_-m/Z_)/1000); });
      lc[id]={N,V,M,sc,st}; });
    return {z:zsec,lc}; })();

  /* 해저면 단면 (예비 응력, 부식 여유 공제) */
  const Dm=Dp(yML), tn=tAt(yML), tc=Math.max(0.001,tn-P.mca/1000);
  const Di=Dm-2*tc, A=PI/4*(Dm*Dm-Di*Di), I=PI/64*(Dm**4-Di**4), Z=2*I/Dm;
  const fd=P.mfy/P.mgM;
  LC.forEach(l=>{ l.sig=(l.V/A+l.M/Z)/1000; l.sigN=l.V/A/1000; l.sigM=l.M/Z/1000; l.ratio=l.kind==="SLS"?null:l.sig/fd; l.ok=l.ratio===null?null:l.ratio<=1; });
  const sec={y:yML,D:Dm,tn,tc,A,I,Z,fd,DtMax:Math.max(...segs.map(s=>s.DtMax))};
  const govLC=LC.filter(l=>l.ratio!==null).reduce((a,b)=>b.ratio>a.ratio?b:a);

  /* 수량 · 해역이용협의 산출 */
  const Dsb0=Dp(P.sbDL);
  const Ldr=P.mInst==="drill"?P.mL:P.mInst==="ddd"?Math.min(P.mDrL,P.mL):0, Dd=P.mD+2*P.mDrG;
  const Vexc=PI/4*Dd*Dd*Ldr, Vann=PI/4*(Dd*Dd-P.mD*P.mD)*Ldr;
  const Dsc=P.mScK*Dsb0, Asc=prot?PI/4*(Dsc*Dsc-Dsb0*Dsb0):0, Vsc=Asc*P.mScT;
  const Aocc=prot?PI/4*Dsc*Dsc:PI/4*Dsb0*Dsb0;
  const tToe=(yToe<P.mz1?P.mt1:yToe<P.mz2?P.mt2:P.mt3)/1000, Vplug=PI/4*(P.mD-2*tToe)**2*Math.max(0,P.mL-Ldr);
  let Apaint=0; for(let y=yML+dy/2; y<yIf; y+=dy) Apaint+=PI*Dout(y)*dy;
  const qty={Ldr,Dd,Vexc,Vann,Dsc,Asc,Vsc,Aocc,Vplug,Apaint,Dsb0,Asb:PI/4*Dsb0*Dsb0};

  /* 주의 */
  const crestDL=P.hwl+P.Hw/2;
  if(T.scaled) warns.push({k:"scaled",msg:`선택한 터빈(${T.name})의 하중표는 ${T.scaled.base||"기준 터빈"} 하중을 축척해 추정한 값입니다 (수평력 ×${T.scaled.sF.toFixed(2)}, 모멘트 ×${T.scaled.sM.toFixed(2)}).`});
  if(!TL.gu) warns.push({k:"noTL",msg:`선택한 터빈(${T.name})에 하중표가 없습니다. 터빈 하중 없이 계산합니다. 제작사 하중표를 넣으세요.`});
  if(yIf<crestDL+1.5) warns.push({k:"ifLow",msg:`터빈 인터페이스 ${dlS(yIf)}가 설계 파봉 ${dlS(crestDL)} + 여유고 1.5 m보다 낮습니다.`,crestDL});
  if(yIf<=P.mtop+1) warns.push({k:"tpLen",msg:`말뚝 상단 ${dlS(P.mtop)}이 터빈 인터페이스 ${dlS(yIf)}보다 높거나 1 m 안쪽입니다. 트랜지션피스가 들어갈 자리가 없습니다.`});
  if(grout&&yTP0<=P.sbDL+1) warns.push({k:"tpLow",msg:`그라우트 연결 트랜지션피스 하단 ${dlS(yTP0)}이 해저면 가까이(1 m 이내)까지 내려갑니다.`});
  if(!grout&&P.mtop<crestDL+1.5) warns.push({k:"flgLow",msg:`볼트 연결 플랜지(말뚝 상단 ${dlS(P.mtop)})가 설계 파봉 ${dlS(crestDL)} + 1.5 m보다 낮아 비말대에 있습니다.`,crestDL});
  if(g.taper&&P.mzA>=P.mzB) warns.push({k:"taper",msg:`테이퍼 구간 하단(${dlS(P.mzA)})이 상단(${dlS(P.mzB)})보다 높거나 같습니다.`});
  if(g.taper&&P.mDt>P.mD) warns.push({k:"taperUp",msg:`테이퍼형 상부 직경(${P.mDt} m)이 하부 직경(${P.mD} m)보다 큽니다.`});
  if(P.mz1>=P.mz2) warns.push({k:"zone",msg:`두께 구간 경계가 거꾸로입니다(하부 경계 ${dlS(P.mz1)} ≥ 상부 경계 ${dlS(P.mz2)}).`});
  if(yToe>=yML-1) warns.push({k:"embed",msg:`말뚝 선단 ${dlS(yToe)}이 세굴 후 해저면 ${dlS(yML)}보다 1 m 이상 깊지 않습니다.`});
  segs.forEach((s,i)=>{ if(s.DtMax>120) warns.push({k:"Dt",zone:i,msg:`${s.nm} 구간 D/t = ${s.DtMax.toFixed(0)}로 120을 넘습니다 (국부좌굴 우려).`}); });
  if(govLC.ratio>1) warns.push({k:"sig",msg:`해저면 단면 응력비 ${govLC.ratio.toFixed(2)} (${govLC.id})로 1을 넘습니다.`});

  return {P,cat:"mono",g,T,TL,Wt,yIf,yt,yML,S,prot,wt,wind,wave,cur,cdTbl,freq,eq,LC,sec,govLC,qty,warns,dy,armIf,crestDL,colD};
}
function dlS(v){ return `DL(${v>=0?"+":"−"})${Math.abs(v).toFixed(3)}`; }
