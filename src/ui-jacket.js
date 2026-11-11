/* ---------- 자켓 화면 ---------- */
const GRPN={leg:"다리",brace:"X 브레이스",mud:"하단 수평재",hz:"수평재"};
$("btnSampleJk").addEventListener("click",()=>{ const P=readInputs(); setInputs({...P,...JACKET_DEF,type:P.type}); run(); toast("자켓 기본 제원을 불러왔습니다 (4각, 하단 14 m · 상단 9 m, 4칸)"); });
function jacketNote(){ const g=R.g, P=R.P;
  return `${g.nL}각 · 다리 하단 ${dl(g.zb)} ~ 자켓 상단 ${dl(g.zt)} (높이 ${fx(g.H,1)} m), 칸 높이 ${g.hs.map(h=>fx(h,1)).join(" / ")} m · TP ${dl(g.zt)} ~ ${dl(g.yIf)}`; }
function renderJacketTab(t){
  if(t==="gen"){ $("capSec").textContent="입면도"; $("svgSec").innerHTML=primsSVG(jkSecPrims(R),"자켓 입면도"); $("svgPlan").innerHTML=primsSVG(jkPlanPrims(R),"자켓 평면도"); }
  else if(t==="m3d") build3D();
  else if(t==="load") $("repLoad").innerHTML=htmlJkLoad();
  else if(t==="wt") $("repWt").innerHTML=htmlJkWt();
  else if(t==="qty") $("repQty").innerHTML=htmlJkQty();
  else if(t==="mchk") $("repMchk").innerHTML=htmlJkChk();
  else if(t==="mpy"){ if(!$("soilEd").innerHTML) drawSoil(); $("repMpy").innerHTML=htmlJkPile(); }
  else if(t==="strs") $("repStr").innerHTML=htmlJkStress();
  else if(t==="calc") $("report").innerHTML=htmlJkReport();
}
function renderJacketSummary(){
  const q=R.qty, Y=R.pile, F=R.fq, L2=R.LC[1], pr=SOIL_PRESETS.find(p=>p.id===R.P.soilPre);
  const cMax=Math.max(...Y.rows.map(r=>r.comp)), tMax=-Math.min(...Y.rows.map(r=>r.ten));
  const k=[
    ["강재 (자켓+말뚝)",`${fx((q.Wst+q.Wpile)/G,0)} <small>t</small>`],
    ["부재 이용률 최대",`${fx(R.uMax,2)} <small>${GRPN[Object.entries(R.grpMax).reduce((a,b)=>b[1].u>a[1].u?b:a)[0]]}</small>${chip(R.uMax<=1)}`],
    ["해저면 전도모멘트",`${MN(L2.M)} <small>MN·m · LC2</small>`],
    ["말뚝 압축 / 인발",`${fx(cMax/1000,1)} <small>/ ${fx(Math.max(0,tMax)/1000,1)} MN</small>${chip(Y.rows.every(r=>r.okC&&r.okT))}`],
    [`말뚝 수평${pr?" · 가정 지반":""}`,`${fx(Y.lat.w0*1000,1)} <small>mm</small>${chip(Y.lat.ok)}`],
    [`1차 고유진동수${F.band&&F.band.r&&F.band.r.est?" · rpm 추정":""}`,F.cal?`${fx(F.f,3)} <small>Hz</small>${chip(F.ok,F.ok===null)}`:"— <small>타워 자료 없음</small>"],
    ["점용 면적",`${fx(q.Aocc,0)} <small>m²</small>`],
    ["굴착·천공량",`0 <small>m³ (항타)</small>`],
  ];
  $("summary").innerHTML=k.map(([a,b])=>`<div class="kpi"><span class="k">${a}</span><span class="v">${b}</span></div>`).join("");
}
function jacketWarnInfo(w){
  const P=R.P, r1=v=>Math.round(v*100)/100;
  if(["scaled","noTL","noFref"].includes(w.k)) return monoWarnInfo(w);
  if(w.k==="jTop"){ const v=r1(R.yIf-(w.crestDL+1.5)); return {tip:"자켓 상단(TP 하단)이 파봉에 걸리면 TP가 큰 파랑하중을 받습니다. TP 높이를 줄여 자켓 상단을 올리거나, 터빈 인터페이스 높이를 확인하세요.",
    fixes:v>=1?[{label:"수정 (자켓 상단을 파봉 + 1.5 m로)",patch:{jTPh:v}}]:[{label:"선택 터빈의 인터페이스 높이 확인 (터빈 편집)",act:()=>{ $("tDup").click(); $("te_ifz").focus(); }}]}; }
  if(w.k==="jBat") return {tip:"자켓은 보통 아래가 넓습니다(경사 다리).",fixes:[{label:"수정 (상·하단 간격 바꾸기)",patch:{jWb:P.jWt,jWt:P.jWb}}]};
  if(w.k==="jDtB"){ const v=Math.ceil(P.jBrD*1000/60/5)*5; return {tip:"브레이스가 얇으면 접합부 펀칭 전단과 국부좌굴에 불리합니다. D/t 20~60이 보통입니다.",fixes:[{label:"수정 (D/t ≤ 60)",patch:{jBrt:v}}]}; }
  if(w.k==="jDtL"){ const v=Math.ceil(P.jLD*1000/60/5)*5; return {tip:"다리가 얇으면 국부좌굴에 불리합니다.",fixes:[{label:"수정 (D/t ≤ 60)",patch:{jLt:v}}]}; }
  if(w.k==="jMem"){ const key=w.grp==="leg"?"jLt":w.grp==="brace"?"jBrt":"jMbt", nm=FIXN[key]?FIXN[key][0]:key;
    return {tip:"이용률이 큰 부재군의 두께를 키우거나 외경을 키우세요. 다리는 기초 폭(하단 간격)을 넓히면 축력이 줄어듭니다.",
      fixes:[{label:`${nm}${eul(nm)} 5 mm씩 키워 만족하는 값 찾기`,act:()=>jkSearch(P=>({[key]:P[key]+5}),Q=>Q.uMax<=1,nm,key,20)},{label:"하단 다리 간격을 1 m씩 넓혀 찾기",act:()=>jkSearch(P=>({jWb:P.jWb+1}),Q=>Q.uMax<=1,"하단 다리 간격","jWb",12)}]}; }
  if(w.k==="jPc"||w.k==="jPt") return {tip:"말뚝을 더 깊이 넣으면 주면마찰이 늘어 압축·인발 저항이 커집니다. 기초 폭을 넓히면 전도에 따른 말뚝 축력이 줄어듭니다.",
    fixes:[{label:"근입깊이를 2 m씩 늘려 찾기",act:()=>jkSearch(P=>({jPL:P.jPL+2}),Q=>Q.pile.rows.every(r=>r.okC&&r.okT),"말뚝 근입깊이","jPL",20)},{label:"지층 표 열기",act:()=>selectTab("mpy")}]};
  if(w.k==="jScour") return {tip:"세굴방지공이 없으면 다리 하단과 하단 수평재 아래까지 흙이 빠질 수 있습니다. 세굴방지공을 두거나, 다리 하단을 세굴 깊이보다 높게 올리세요.",
    fixes:[{label:"수정 (세굴방지공 설치)",patch:{jSc:"1"}},{label:"수정 (다리 하단을 세굴 깊이 + 0.5 m로)",patch:{jStub:Math.ceil((w.S+0.5)*2)/2}}]};
  if(w.k==="jPl") return {tip:"말뚝 직경을 키우면 수평 저항과 휨강성이 커집니다. 지층이 가정값이면 지반조사 결과부터 넣으세요.",
    fixes:[{label:"말뚝 외경을 0.2 m씩 키워 찾기",act:()=>jkSearch(P=>({jPD:Math.round((P.jPD+0.2)*10)/10}),Q=>Q.pile.lat.ok,"말뚝 외경","jPD",10)}]};
  if(w.k==="jFreq") return freqFixInfo();
  return {tip:"",fixes:[]};
}
function jkSearch(step,good,name,key,maxN){
  let P=readInputs(), p0=P[key], ok=false;
  for(let i=0;i<maxN;i++){ P={...P,...step(P)}; if(good(computeJacket(P))){ ok=true; break; } }
  if(!ok){ toast(`${name}${eul(name)} 바꿔서는 만족하는 값을 찾지 못했습니다`); return; }
  setInputs(P); run(); const u=/^j(Lt|Brt|Mbt|Pt)$/.test(key)?" mm":" m";
  toast(`수정했습니다: ${name} ${fx(p0,u===" mm"?0:2)} → ${fx(P[key],u===" mm"?0:2)}${u}`);
  const el=$(key); if(el){ el.classList.add("flash"); setTimeout(()=>el.classList.remove("flash"),1200); }
}
Object.assign(FIXN,{jSc:["세굴 대책",""],jStub:["해저면 위 다리 하단","m"],jTPh:["TP 높이","m"],jWb:["하단 다리 간격","m"],jWt:["상단 다리 간격","m"],jBrt:["X 브레이스 두께","mm"],jLt:["다리 두께","mm"],jMbt:["수평재 두께","mm"],jPL:["말뚝 근입깊이","m"],jPD:["말뚝 외경","m"]});

/* ---------- 도면 ---------- */
function jkProj(R){ const b=(R.P.jDir||0)*PI/180, ux=Math.cos(b), uy=Math.sin(b); return n=>n.x*ux+n.y*uy; } // 파랑 방향으로 본 입면 (가로 = 파랑 방향)
function jkSecPrims(R){
  const P=R.P, g=R.g, o=[], X=n=>{ const b=(P.jDir||0)*PI/180; return -n.x*Math.sin(b)+n.y*Math.cos(b); }; // 파랑 방향에 직각인 면을 정면으로
  const Rb=g.Rz(g.zb)+P.jPD, xL=-Rb-30, xR=Rb+34, zT=g.yIf+12, zB=P.sbDL-P.jPL-4, fs=Math.max(1.4,(zT-zB)/48), sb=P.sbDL;
  o.push({t:"poly",L:"WATER",pts:[[xL,sb],[xL,P.hwl],[xR,P.hwl],[xR,sb]]});
  o.push({t:"poly",L:"SOIL",pts:[[xL,zB],[xL,sb],[xR,sb],[xR,zB]]});
  /* 말뚝 (점선) */
  g.sup.forEach(s=>{ const n=g.nodes[s], x=X(n), r=P.jPD/2; o.push({t:"line",L:"HID",x1:x-r,z1:n.z,x2:x-r,z2:sb-P.jPL}); o.push({t:"line",L:"HID",x1:x+r,z1:n.z,x2:x+r,z2:sb-P.jPL}); o.push({t:"line",L:"HID",x1:x-r,z1:sb-P.jPL,x2:x+r,z2:sb-P.jPL}); });
  /* 세굴방지공 / 세굴 구멍 (다리마다) */
  g.sup.forEach(s=>{ const x=X(g.nodes[s]), r0=P.jPD/2;
    if(R.qty.prot){ const Ro=R.qty.Dsc/2, T=P.jScT; [1,-1].forEach(sg=>o.push({t:"poly",L:"ROCK",pts:[[x+sg*r0,sb],[x+sg*Ro,sb],[x+sg*(Ro-1.5*T),sb+T],[x+sg*r0,sb+T]]})); }
    else { const S=R.pile.S, w=1.73*S; o.push({t:"poly",L:"WATER",pts:[[x-r0-w,sb],[x-r0,sb-S],[x+r0,sb-S],[x+r0+w,sb]]}); } });
  /* 부재: 강관 외곽 (뒤쪽부터) */
  const depth=n=>{ const b=(P.jDir||0)*PI/180; return n.x*Math.cos(b)+n.y*Math.sin(b); };
  const ms=g.mem.filter(m=>!m.rigid).slice().sort((a,b)=>(depth(g.nodes[b.a])+depth(g.nodes[b.b]))-(depth(g.nodes[a.a])+depth(g.nodes[a.b])));
  ms.forEach(m=>{ const A=g.nodes[m.a],B=g.nodes[m.b], ax=X(A),az=A.z,bx=X(B),bz=B.z, L=Math.hypot(bx-ax,bz-az); if(L<1e-6) return; const nx=-(bz-az)/L*m.D/2, nz=(bx-ax)/L*m.D/2;
    o.push({t:"poly",L:"STEEL",pts:[[ax+nx,az+nz],[bx+nx,bz+nz],[bx-nx,bz-nz],[ax-nx,az-nz]]}); });
  /* TP */
  { const tx=g.legNode.map(l=>X(g.nodes[l[g.n]])), a=Math.min(...tx)-P.jLD, b=Math.max(...tx)+P.jLD; // TP: 다리 상단을 덮는 폭 (3각은 중심에 대해 비대칭)
    o.push({t:"poly",L:"STEEL",pts:[[a,g.zt],[b,g.zt],[b,g.yIf],[a,g.yIf]]}); o.push({t:"text",L:"MUT",x:(a+b)/2,z:(g.zt+g.yIf)/2-fs*0.3,h:fs*0.8,s:"TP",anchor:"middle"}); }
  { const a=Math.max(2.5,P.jLD*2); o.push({t:"line",L:"HID",x1:-a,z1:g.yIf,x2:-a*0.85,z2:zT-1}); o.push({t:"line",L:"HID",x1:a,z1:g.yIf,x2:a*0.85,z2:zT-1}); o.push({t:"text",L:"MUT",x:0,z:zT-2.4,h:fs*0.8,s:"타워 (터빈 하중에 포함)",anchor:"middle"}); }
  o.push({t:"line",L:"CEN",x1:0,z1:zB+1,x2:0,z2:zT-0.5});
  /* 수위 */
  const wls=[[P.hwl,`설계조위 ${dl(P.hwl)}`],...(Math.abs(P.msl-P.hwl)>0.05?[[P.msl,`MSL ${dl(P.msl)}`]]:[])];
  o.push({t:"line",L:"WL",x1:Rb+1,z1:R.crestDL,x2:xR-1,z2:R.crestDL,dash:1}); o.push({t:"text",L:"WL",x:Rb+6.5,z:R.crestDL+fs*0.35,h:fs*0.8,s:`설계 파봉 ${dl(R.crestDL)}`});
  { let last=R.crestDL; wls.forEach(([y,t])=>{ o.push({t:"line",L:"WL",x1:Rb+1,z1:y,x2:xR-1,z2:y}); o.push({t:"tri",L:"WL",x:Rb+4.5,z:y,s:fs*0.6}); const ty=Math.min(y+fs*0.35,last-fs*1.05); o.push({t:"text",L:"WL",x:Rb+6.5,z:ty,h:fs*0.8,s:t}); last=ty; }); }
  /* 왼쪽 표고 */
  const lab=[[g.yIf,`인터페이스 ${dl(g.yIf)}`],[g.zt,`자켓 상단 ${dl(g.zt)}`],...g.lev.slice(1,-1).map((z,i)=>[z,`${i+2}단 ${dl(z)}`]),[g.zb,`다리 하단 ${dl(g.zb)}`],[sb,`원지반 ${dl(sb)}`],...(R.qty.prot?[]:[[sb-R.pile.S,`세굴면 ${dl(sb-R.pile.S)}`]]),[sb-P.jPL,`말뚝 선단 ${dl(sb-P.jPL)}`]];
  lab.sort((a,b)=>b[0]-a[0]); let last=1e9; lab.forEach(([y,s])=>{ const yy=Math.min(y,last-fs*1.15); o.push({t:"line",L:"DIM",x1:-Rb,z1:y,x2:xL+1,z2:yy}); o.push({t:"text",L:"DIM",x:xL+1,z:yy+fs*0.25,h:fs*0.72,s,num:1}); last=yy; });
  /* 폭 치수 */
  const xs=g.sup.map(s=>X(g.nodes[s])), x0=Math.min(...xs), x1=Math.max(...xs);
  o.push({t:"line",L:"DIM",x1:x0,z1:sb-2.2,x2:x1,z2:sb-2.2}); o.push({t:"text",L:"DIM",x:(x0+x1)/2,z:sb-2.0,h:fs*0.75,s:`${fx((x1-x0)*1000,0)}${g.nL===3?" (투영 폭)":""}`,anchor:"middle",num:1});
  o.push({t:"text",L:"MUT",x:0,z:sb-2.2-fs*1.4,h:fs*0.7,s:`다리 Ø${fx(P.jLD*1000,0)}×${P.jLt}, 브레이스 Ø${fx(P.jBrD*1000,0)}×${P.jBrt}, 말뚝 Ø${fx(P.jPD*1000,0)}×${P.jPt}`,anchor:"middle"});
  return {o,box:[xL,zB,xR,zT],fs};
}
function jkPlanPrims(R){
  const P=R.P, g=R.g, o=[], nL=g.nL, Rb=g.Rz(g.zb), Rt=g.Rz(g.zt), Rm=Rb+Math.max(P.jPD,R.qty.prot?R.qty.Dsc/2:P.jPD/2+1.73*R.pile.S)+4, fs=Rm/12;
  const pos=(r,k)=>[r*Math.cos(g.ang(k)),r*Math.sin(g.ang(k))];
  o.push({t:"poly",L:"LINE",pts:[...Array(nL)].map((_,k)=>pos(Rb,k)),closed:1});
  o.push({t:"poly",L:"HID",pts:[...Array(nL)].map((_,k)=>pos(Rt,k)),closed:1});
  for(let k=0;k<nL;k++){ const [x,z]=pos(Rb,k), [xt,zt]=pos(Rt,k);
    if(R.qty.prot) o.push({t:"circle",L:"ROCK",x,z,r:R.qty.Dsc/2,fill:1,fc:"rock",op:.45}); else o.push({t:"circle",L:"HID",x,z,r:P.jPD/2+1.73*R.pile.S});
    o.push({t:"circle",L:"LINE",x,z,r:P.jPD/2,fill:1,fc:"steel",op:.6}); o.push({t:"circle",L:"LINE",x,z,r:P.jLD/2}); o.push({t:"circle",L:"HID",x:xt,z:zt,r:P.jLD/2}); o.push({t:"line",L:"HID",x1:x,z1:z,x2:xt,z2:zt}); }
  o.push({t:"poly",L:"LINE",pts:[...Array(nL)].map((_,k)=>pos(Rt+P.jLD,k)),closed:1}); // TP 윤곽 (다리 배치와 같은 다각형)
  o.push({t:"line",L:"CEN",x1:-Rm,z1:0,x2:Rm,z2:0}); o.push({t:"line",L:"CEN",x1:0,z1:-Rm,x2:0,z2:Rm});
  const b=(P.jDir||0)*PI/180; o.push({t:"line",L:"WL",x1:-Rm*0.95,z1:-Rm*0.9,x2:-Rm*0.95+5*Math.cos(b),z2:-Rm*0.9+5*Math.sin(b),w:.15}); o.push({t:"text",L:"WL",x:-Rm*0.95,z:-Rm*0.9-fs*1.4,h:fs*0.8,s:`파랑 ${P.jDir||0}°`});
  const [ax,az]=pos(Rb,0), [bx,bz]=pos(Rb,1), mb=[(ax+bx)/2,(az+bz)/2], nb=Math.hypot(...mb)||1;
  o.push({t:"text",L:"DIM",x:mb[0]*(1+fs*1.6/nb),z:mb[1]*(1+fs*1.6/nb)-fs*0.3,h:fs*0.8,s:`하단 ${fx(P.jWb*1000,0)}`,anchor:"middle",num:1});
  const k2=nL===4?2:1, [cx,cz]=pos(Rt,k2), [dx2,dz2]=pos(Rt,(k2+1)%nL), mt=[(cx+dx2)/2,(cz+dz2)/2], nt=Math.hypot(...mt)||1;
  o.push({t:"text",L:"DIM",x:mt[0]*(1-fs*1.4/nt),z:mt[1]*(1-fs*1.4/nt)-fs*0.3,h:fs*0.8,s:`상단 ${fx(P.jWt*1000,0)}`,anchor:"middle",num:1});
  o.push({t:"text",L:"DIM",x:ax+P.jPD,z:az-P.jPD,h:fs*0.75,s:`말뚝 Ø${fx(P.jPD*1000,0)}`,num:1});
  { const rr=R.qty.prot?R.qty.Dsc/2:P.jPD/2+1.73*R.pile.S, f=1+(rr+fs*1.2)/Rb; o.push({t:"text",L:"MUT",x:ax*f,z:az*f,h:fs*0.7,s:R.qty.prot?`세굴방지공 Ø${fx(R.qty.Dsc,1)} m`:`세굴 구멍 (S ${fx(R.pile.S,2)} m)`,anchor:"middle"}); }
  return {o,box:[-Rm-6,-Rm-2,Rm+6,Rm+2],fs};
}
async function dxfJacket(){
  const sp=jkSecPrims(R), pp=jkPlanPrims(R), off=sp.box[2]-pp.box[0]+10, z=new JSZip();
  z.file(`${baseName()}_일반도.dxf`,primsDXF([{pr:sp,dx:0,dy:0},{pr:pp,dx:off,dy:(R.yIf+R.P.sbDL)/2}]));
  z.file(`${baseName()}_입면도.dxf`,primsDXF([{pr:sp,dx:0,dy:0}])); z.file(`${baseName()}_평면도.dxf`,primsDXF([{pr:pp,dx:0,dy:0}]));
  z.file("읽어보기.txt",`단위: mm. 입면도는 파랑 방향(${R.P.jDir||0}°)에 직각인 면을 정면으로 본 그림, 세로 좌표 = DL 표고. 평면도 원점 = 자켓 중심.\r\n레이어: STEEL 강관·TP, WATER 수위, SOIL 지반, HIDDEN 말뚝·상단 윤곽, CENTER 중심선, DIM 치수·표고, TEXT 문자.\r\n`);
  saveFile(`${baseName()}_도면_${stamp()}.zip`,await z.generateAsync({type:"blob"}));
}
function build3DJacket(){
  const {scene,cam,ctl}=G3, P=R.P, g=R.g, grp=new THREE.Group(); G3.grp=grp; scene.add(grp);
  const cut=$("cut3d").checked, clip=cut?[new THREE.Plane(new THREE.Vector3(0,0,-1),0)]:[];
  const mS=new THREE.MeshStandardMaterial({color:0x9fb4c2,metalness:.35,roughness:.55,side:THREE.DoubleSide,clippingPlanes:clip});
  const mL=new THREE.MeshStandardMaterial({color:0xe2c044,metalness:.25,roughness:.6,side:THREE.DoubleSide,clippingPlanes:clip});
  const V=(n)=>new THREE.Vector3(n.x,n.z,-n.y);
  const tube=(A,B,D,m)=>{ const a=V(A), b=V(B), L=a.distanceTo(b); if(L<1e-6) return; const c=new THREE.CylinderGeometry(D/2,D/2,L,24,1,true), me=new THREE.Mesh(c,m);
    me.position.copy(a.clone().add(b).multiplyScalar(0.5)); me.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.clone().sub(a).normalize()); grp.add(me); };
  g.mem.forEach(m=>{ if(m.rigid) return; tube(g.nodes[m.a],g.nodes[m.b],m.D,m.grp==="leg"?mL:mS); });
  g.sup.forEach(s=>{ const n=g.nodes[s]; tube(n,{x:n.x,y:n.y,z:P.sbDL-P.jPL},P.jPD,new THREE.MeshStandardMaterial({color:0x7d8a94,transparent:true,opacity:.6,side:THREE.DoubleSide})); });
  { const Rt=g.Rz(g.zt)+P.jLD, sh=new THREE.Shape(); for(let k=0;k<g.nL;k++){ const x=Rt*Math.cos(g.ang(k)), y=Rt*Math.sin(g.ang(k)); k?sh.lineTo(x,y):sh.moveTo(x,y); } sh.closePath();
    const ex=new THREE.ExtrudeGeometry(sh,{depth:g.yIf-g.zt,bevelEnabled:false}); ex.rotateX(-PI/2); ex.translate(0,g.zt,0);
    grp.add(new THREE.Mesh(ex,new THREE.MeshStandardMaterial({color:0xe2c044,roughness:.6,side:THREE.DoubleSide,clippingPlanes:clip}))); }
  { const a=Math.max(2.5,P.jLD*2), c=new THREE.CylinderGeometry(a*0.8,a,16,32,1,true); c.translate(0,g.yIf+8,0); grp.add(new THREE.Mesh(c,new THREE.MeshStandardMaterial({color:0xf2f2f2,transparent:true,opacity:.45,side:THREE.DoubleSide}))); }
  if(R.qty.prot) g.sup.forEach(s=>{ const n=g.nodes[s], r0=P.jPD/2, Ro=R.qty.Dsc/2, T=P.jScT, pts=[[r0,0],[Ro,0],[Ro-1.5*T,T],[r0,T],[r0,0]].map(p=>new THREE.Vector2(p[0],p[1]));
    const lg=new THREE.LatheGeometry(pts,48); lg.translate(n.x,P.sbDL,-n.y); grp.add(new THREE.Mesh(lg,new THREE.MeshStandardMaterial({color:0x8c8478,roughness:1,side:THREE.DoubleSide,clippingPlanes:clip}))); });
  const Rb=g.Rz(g.zb)+10;
  if($("water3d").checked){ const gg=new THREE.CircleGeometry(Rb*1.6,64); gg.rotateX(-PI/2); gg.translate(0,P.hwl,0); grp.add(new THREE.Mesh(gg,new THREE.MeshStandardMaterial({color:0x3f8fc9,transparent:true,opacity:.28,side:THREE.DoubleSide,depthWrite:false}))); }
  { const d=new THREE.CircleGeometry(Rb*1.6,64); d.rotateX(-PI/2); d.translate(0,P.sbDL,0); grp.add(new THREE.Mesh(d,new THREE.MeshStandardMaterial({color:0x9c8459,transparent:true,opacity:.35,side:THREE.DoubleSide,depthWrite:false}))); }
  const key="jk|"+g.nL+"|"+Math.round(g.yIf)+"|"+Math.round(P.sbDL-P.jPL);
  if(G3.camKey!==key){ G3.camKey=key; const z0=P.sbDL-P.jPL, H=g.yIf+16-z0, dd=H*1.25; cam.position.set(dd*0.75,z0+H*0.6,dd*0.85); ctl.target.set(0,z0+H*0.5,0); cam.far=dd*20; cam.updateProjectionMatrix(); }
  $("note3d").textContent=`자켓 ${g.nL}각 · 부재 ${g.mem.filter(m=>!m.rigid).length}개 · 강재 ${fx(R.qty.Wst/G,0)} t + 말뚝 ${fx(R.qty.Wpile/G,0)} t · 노란색 다리·TP, 회색 말뚝${cut?" · 앞쪽 절반을 잘라 보여 줍니다":""}`;
}

/* ---------- 탭 내용 ---------- */
function htmlJkLoad(){
  const P=R.P, g=R.g, t=R.T, TL=R.TL, ld=R.ld, W=ld.wave;
  let h=`<h3>1. 터빈 하중</h3><p>${esc(t.name)}: ${t.MW} MW, 허브 MSL+${t.hub} m${t.rotor?`, 로터 Ø${t.rotor} m`:""}, 인터페이스 MSL+${t.ifz} m. ${esc(t.src||"")}</p>
  <div class="eq">인터페이스 표고 = ${dl(g.yIf)} (TP 중앙 절점에 작용),  하중 방향 = 파랑 방향 ${P.jDir||0}°
해저면 모멘트 = M + H × (${dl(g.yIf)} − ${dl(P.sbDL)}) = M + H × ${fx(R.arm,2)}</div>`;
  h+=TL.uls?turbTablesHtml(TL,t):`<p class="warn">이 터빈은 하중표가 없어 터빈 수평력·모멘트가 빠집니다.</p>`;
  h+=`<h3>2. 고유진동수</h3>`+htmlJkFreq();
  h+=`<h3>3. 파랑 + 극치 조류 (부재별 Morison)</h3>
  <div class="eq">수심 d = ${fx(W.d,3)} m, H = ${P.Hw} m, T = ${P.Tw} s → k = ${fx(W.k,5)} /m, 파장 L = ${fx(W.L,2)} m (선형파)
부재를 약 1 m 조각으로 나누고 조각마다 부재 축에 직각인 성분만 사용:
  f = ρ·C<sub>M</sub>·πD²/4·a<sub>n</sub> + ½ρ·C<sub>D</sub>·D·|v<sub>n</sub>|·v<sub>n</sub>,  v = 파랑 입자속도(수평·연직) + 조류(극치 ${P.Uce} m/s + 바람 해류 ${fx(ld.Uw0,3)} m/s)
  D = 외경 + 2 × 해양생물 ${P.jMg} mm,  C<sub>M</sub> = MacCamy-Fuchs(ka) ≈ 2.0 (가는 부재),  C<sub>D</sub> = 표면 거칠기 k = ${P.ks} mm와 D로 계산 (하중 탭 항력계수 식과 같음)
위상 0~360° (5° 간격 + 정밀 탐색) 중 해저면 전도모멘트가 최대인 위상 = ${fx(W.phDeg,1)}°
→ 밑면 전단력 ${fx(W.H,0)} kN, 해저면 전도모멘트 ${fx(W.M,0)} kN·m (계수 전)</div>`;
  h+=`<h3>4. 상시 조류</h3><div class="eq">조류만 (${P.Uc} m/s, 1/7승 분포), 항력만 → 밑면 전단력 ${fx(ld.curN.H,1)} kN, 전도모멘트 ${fx(ld.curN.M,0)} kN·m</div>`;
  h+=`<h3>5. 풍하중</h3><div class="eq">물 위 부재: q·C<sub>s</sub>·D (부재 직각 성분), TP 면: C<sub>s</sub> × q × 수풍 폭 ${fx(R.ld.wind.Bw,2)} m (다리 상단을 바람 직각 방향으로 투영한 폭 + 다리 외경 2개) × TP 높이 ${P.jTPh} m
U₀ = ${fx(ld.U0,3)} m/s → 밑면 전단력 ${fx(ld.wind.H,1)} kN, 전도모멘트 ${fx(ld.wind.M,0)} kN·m</div>`;
  h+=`<h3>6. 지진</h3><div class="eq">F = k<sub>h</sub> × W, k<sub>h</sub> = ${P.kh}: 부재 강재 + 침수 다리 안 해수${P.hydro?" + 부가질량(배제수)":""}는 부재 양 끝 절점에, TP·2차 부재는 인터페이스에, 터빈은 (인터페이스 + 허브)/2 높이에</div>`;
  h+=`<h3>7. 하중조합 · 해저면 합력</h3>`+htmlJkLC();
  return h;
}
function htmlJkLC(){
  let h=`<div class="tblwrap"><table class="t"><thead><tr><th>조합</th><th>하중</th><th>계수</th><th>V (kN)</th><th>H (kN)</th><th>M (kN·m)</th></tr></thead><tbody>`;
  R.LC.forEach(l=>{ l.items.forEach((it,i)=>h+=`<tr>${i?"":`<td class="l" rowspan="${l.items.length+1}">${l.id}<br><small>${l.nm}</small></td>`}<td class="l">${it.nm}</td><td class="n">${fx(it.g,2)}</td><td class="n">${fx(it.V,0)}</td><td class="n">${fx(it.H,0)}</td><td class="n">${fx(it.M,0)}</td></tr>`);
    h+=`<tr class="tot"><td class="l" colspan="2">합계 (계수 곱함)</td><td class="n">${fx(l.V,0)}</td><td class="n">${fx(l.H,0)}</td><td class="n">${fx(l.M,0)}</td></tr>`; });
  h+=`</tbody></table></div><h3>다리 하단 반력 (말뚝 머리)</h3><div class="tblwrap"><table class="t"><thead><tr><th>조합</th>${R.g.sup.map((_,k)=>`<th>다리 ${k+1} 연직 (kN, 압축 +)</th>`).join("")}<th>연직 합계</th><th>수평 최대 (kN)</th></tr></thead><tbody>`;
  R.LC.forEach(l=>h+=`<tr><td class="l">${l.id}</td>${l.R.map(r=>`<td class="n">${fx(r.Vc,0)}</td>`).join("")}<td class="n">${fx(l.sumV,0)}</td><td class="n">${fx(Math.max(...l.R.map(r=>r.H)),0)}</td></tr>`);
  h+=`</tbody></table></div><p class="note">다리 하단은 고정단으로 보고 골조해석했습니다(말뚝 유연성 미반영). 연직 합계가 조합 V와 같으면 평형이 맞는 것입니다.</p>`;
  return h;
}
function htmlJkFreq(){
  const F=R.fq, P=R.P, T=R.T; if(!F.cal) return `<p class="warn">선택 터빈에 타워 치수와 기준 고유진동수가 없어 계산하지 않았습니다.</p>`;
  const c=F.cal;
  let h=`<div class="eq">타워: ${c.mode==="geom"?`치수로 계산 (길이 ${fx(c.Lt,1)} m, Ø${c.Db} → Ø${c.Dt} m, 등가 두께 ${fx(c.t*1000,1)} mm)`:`기준 진동수 ${T.fref} Hz로 역산 (EI₀ = ${c.EI0.toExponential(3)} kN·m²)`}, 타워만 하단 고정 f = ${fx(c.fchk,4)} Hz
전체 모델: 자켓 골조(다리 하단 고정) + TP·2차 부재 + 타워 보 요소 + RNA ${fx(c.mR,0)} t, 질량은 절점 집중(강재, 침수 다리 안 해수, 부가질량, 해양생물)
역반복법 → 1차 고유진동수 f = ${fx(F.f,4)} Hz (주기 ${fx(1/F.f,2)} s), 총 질량 ${fx(F.mTot,0)} t</div>`;
  h+=bandHtml(F.band,[["구조물",F.f]],P,T);
  h+=`<p class="note">말뚝과 지반의 유연성을 넣지 않아(다리 하단 고정) 실제보다 조금 높게 나옵니다.</p>`;
  return h;
}
function htmlJkWt(){
  const P=R.P, q=R.qty, d=R.ld.dead;
  let h=`<h3>자켓 중량 · 부력</h3><div class="tblwrap"><table class="t"><thead><tr><th>구분</th><th>중량 (kN)</th><th>중량 (t)</th></tr></thead><tbody>`;
  Object.entries(q.grpW).forEach(([k,v])=>h+=`<tr><td class="l">${GRPN[k]||k} (${R.g.mem.filter(m=>m.grp===k).length}개)</td><td class="n">${fx(v,0)}</td><td class="n">${fx(v/G,1)}</td></tr>`);
  h+=`<tr class="sub"><td class="l">자켓 강재 소계</td><td class="n">${fx(q.Wst,0)}</td><td class="n">${fx(q.Wst/G,1)}</td></tr>
  <tr><td class="l">트랜지션피스 (가정)</td><td class="n">${fx(P.jWtp,0)}</td><td class="n">${fx(P.jWtp/G,1)}</td></tr>
  <tr><td class="l">2차 부재 (가정)</td><td class="n">${fx(P.jWsec,0)}</td><td class="n">${fx(P.jWsec/G,1)}</td></tr>
  <tr><td class="l">해양생물 수중중량 (밀도 1,325 kg/m³)</td><td class="n">${fx(d.Wmg,0)}</td><td class="n">${fx(d.Wmg/G,1)}</td></tr>
  <tr><td class="l">부력 (${P.jFlood==="1"?"침수 다리는 강재 체적만, 브레이스는 외경 체적":"다리·브레이스 외경 체적"})</td><td class="n">−${fx(d.Ub,0)}</td><td class="n">−${fx(d.Ub/G,1)}</td></tr>
  <tr><td class="l">터빈+타워</td><td class="n">${fx(R.Wt,0)}</td><td class="n">${fx(R.Wt/G,1)}</td></tr>
  <tr class="tot"><td class="l">말뚝 머리 연직력 합계 (자중)</td><td class="n">${fx(q.Wst+P.jWtp+P.jWsec+d.Wmg-d.Ub+R.Wt,0)}</td><td></td></tr>
  <tr><td class="l">말뚝 ${R.g.nL}본 (Ø${P.jPD} × ${P.jPt} mm × ${fx(P.jPL+P.jStub,1)} m)</td><td class="n">${fx(q.Wpile,0)}</td><td class="n">${fx(q.Wpile/G,1)}</td></tr></tbody></table></div>`;
  return h;
}
function htmlJkChk(){
  const P=R.P;
  let h=`<h3>1. 검토 방법 (NORSOK N-004 관형 부재)</h3><div class="eq">국부좌굴: f<sub>cle</sub> = 2·C<sub>x</sub>·E·t/D (C<sub>x</sub> 0.3),  f<sub>yc</sub> = f<sub>y</sub> (f<sub>y</sub>/f<sub>cle</sub> ≤ 0.170) 또는 (1.047 − 0.274 f<sub>y</sub>/f<sub>cle</sub>)·f<sub>y</sub>
기둥 좌굴: f<sub>E</sub> = π²E/(kl/i)²,  λ̄ = √(f<sub>yc</sub>/f<sub>E</sub>),  f<sub>c</sub> = (1 − 0.28λ̄²)f<sub>yc</sub> (λ̄ ≤ 1.34) 또는 0.9f<sub>yc</sub>/λ̄²
휨강도: f<sub>m</sub> = (Z/W)·f<sub>y</sub> × {1 (f<sub>y</sub>D/Et ≤ 0.0517), 1.13 − 2.58f<sub>y</sub>D/Et (≤ 0.1034), 0.94 − 0.76f<sub>y</sub>D/Et}
압축 + 휨: σ<sub>c</sub>/f<sub>cd</sub> + C<sub>m</sub>σ<sub>m</sub>/{(1 − σ<sub>c</sub>/f<sub>Ed</sub>)f<sub>md</sub>} ≤ 1 (C<sub>m</sub> 0.85),  σ<sub>c</sub>/f<sub>cld</sub> + σ<sub>m</sub>/f<sub>md</sub> ≤ 1
인장 + 휨: (σ<sub>t</sub>/f<sub>td</sub>)<sup>1.75</sup> + σ<sub>m</sub>/f<sub>md</sub> ≤ 1,  설계강도 = 특성값/γ<sub>M</sub> (${P.jgM})
유효길이 계수 k: 다리 1.0 (칸 높이), X 브레이스 0.8 (교차점까지), 수평재 0.8,  하중조합: 폭풍(LC2)·지진(LC3)</div>`;
  h+=`<h3>2. 부재군별 최대</h3><div class="tblwrap"><table class="t"><thead><tr><th>부재군</th><th>D × t</th><th>D/t</th><th>kl/i</th><th>조합</th><th>N (kN)</th><th>M (kN·m)</th><th>σ<sub>a</sub></th><th>σ<sub>m</sub></th><th>f<sub>c</sub></th><th>f<sub>m</sub></th><th>검토</th><th>이용률</th><th>판정</th></tr></thead><tbody>`;
  Object.entries(R.grpMax).forEach(([k,c])=>h+=`<tr><td class="l">${GRPN[k]||k}</td><td class="n">Ø${fx(c.D*1000,0)} × ${fx(c.t*1000,0)}</td><td class="n">${fx(c.Dt,1)}</td><td class="n">${fx(c.kl_r,1)}</td><td>${c.lc}</td><td class="n">${fx(c.N,0)}</td><td class="n">${fx(c.M,0)}</td><td class="n">${fx(c.sa,1)}</td><td class="n">${fx(c.sm,1)}</td><td class="n">${fx(c.fc,1)}</td><td class="n">${fx(c.fm,1)}</td><td class="l">${c.mode}</td><td class="n">${fx(c.u,3)}</td><td>${okt(c.u<=1)}</td></tr>`);
  h+=`</tbody></table></div><h3>3. 전체 부재</h3><div class="tblwrap"><table class="t"><thead><tr><th>번호</th><th>부재군</th><th>절점</th><th>길이 (m)</th><th>조합</th><th>N (kN, 인장 +)</th><th>M (kN·m)</th><th>이용률</th></tr></thead><tbody>`;
  R.chk.slice().sort((a,b)=>b.u-a.u).forEach(c=>h+=`<tr class="${c.u>1?"gov":""}"><td class="n">${c.mi+1}</td><td>${GRPN[c.grp]||c.grp}</td><td class="l">${R.g.nodes[c.a].tag} → ${R.g.nodes[c.b].tag}</td><td class="n">${fx(c.L,2)}</td><td>${c.lc}</td><td class="n">${fx(c.N,0)}</td><td class="n">${fx(c.M,0)}</td><td class="n">${fx(c.u,3)}</td></tr>`);
  h+=`</tbody></table></div><p class="note">접합부(K·X·T) 펀칭 전단, 피로는 다음 단계에서 검토합니다.</p>`;
  return h;
}
function htmlJkPile(){
  const P=R.P, Y=R.pile, A=Y.ax, sp=Y.sp, pr=SOIL_PRESETS.find(p=>p.id===P.soilPre);
  let h=`<h3>1. 말뚝 머리 하중 (다리 하단 반력)</h3>`;
  if(pr) h+=`<p class="warn">가정 지반(${esc(pr.name)})으로 계산한 결과입니다.</p>`;
  h+=`<div class="tblwrap"><table class="t"><thead><tr><th>조합</th><th>최대 압축 (kN)</th><th>최대 인발 (kN)</th><th>수평 (kN)</th><th>모멘트 (kN·m)</th><th>압축 이용률</th><th>인발 이용률</th><th>판정</th></tr></thead><tbody>`;
  Y.rows.forEach(r=>h+=`<tr><td class="l">${r.id} ${r.nm}</td><td class="n">${fx(r.comp,0)}</td><td class="n">${r.ten<0?fx(-r.ten,0):"—"}</td><td class="n">${fx(r.H,0)}</td><td class="n">${fx(r.M,0)}</td><td class="n">${fx(r.uC,3)}</td><td class="n">${fx(r.uT,3)}</td><td>${okt(r.okC&&r.okT)}</td></tr>`);
  h+=`</tbody></table></div>`;
  h+=`<h3>2. 축방향 지지력 (API RP 2GEO, 개단 강관 Ø${P.jPD} m × ${P.jPt} mm, 근입 ${P.jPL} m)</h3><div class="eq">외주면 마찰 ${fx(A.Qo,0)} kN, 관내 마찰 ${fx(A.Qi,0)} kN, 선단 q = ${A.qm} = ${fx(A.q,0)} kN/m² (선단 지층: ${esc(A.toeLayer)})
압축 Q = min(비폐색 ${fx(A.Qun,0)}, 폐색 ${fx(A.Qpl,0)}) = ${fx(A.Q,0)} kN (${A.mode}),  안전율 상시 ${P.mFSc} · 폭풍·지진 ${P.mFSu}
인발 Q<sub>t</sub> = 외주면 마찰 + 말뚝 수중 자중 ${fx(Y.Wp,0)} = ${fx(Y.Qt,0)} kN (관내 토사 무시)</div>`;
  const L=Y.lat;
  h+=`<h3>3. 수평 (p-y, 가장 큰 수평력 ${Y.gov.id})</h3><div class="eq">세굴: ${Y.prot?`세굴방지공 설치 (다리마다 Ø${fx(R.qty.Dsc,1)} m × ${P.jScT} m) → 세굴 없음`:`세굴방지공 없음 → 세굴 깊이 S = ${P.jScS} × ${P.jPD} = ${fx(Y.S,2)} m, 지반 저항은 세굴면 ${dl(P.sbDL-Y.S)} 아래부터`}
말뚝 머리(${Y.prot?"해저면":"세굴면"}): H = ${fx(Y.gov.H,0)} kN, M = ${fx(Y.gov.M,0)} + H × (다리 하단 높이 ${P.jStub}${Y.prot?"":` + 세굴 ${fx(Y.S,2)}`}) = ${fx(Y.gov.M+Y.gov.H*Y.arm,0)} kN·m
→ 말뚝 머리 변위 ${fx(L.w0*1000,1)} mm, 회전각 ${fx(Math.abs(L.th0)*180/PI,4)}°, 최대 모멘트 ${fx(L.Mmax,0)} kN·m (${Y.prot?"해저면":"세굴면"} 아래 ${fx(L.xM,1)} m), ${L.ok?"수렴 O.K":"수렴 안 함 N.G"}</div>
  <div class="plots"><div class="sheet">${depthSVG([{x:L.x,v:L.w.map(v=>v*1000),c:LCC[1]}],sp.Le,"변위","mm")}</div><div class="sheet">${depthSVG([{x:L.x,v:L.Mz,c:LCC[1]}],sp.Le,"휨모멘트","kN·m")}</div><div class="sheet">${depthSVG([{x:L.x,v:L.p,c:LCC[1]}],sp.Le,"지반반력 p","kN/m")}</div></div>
  <p class="note">p-y 곡선과 축방향 계수는 모노파일과 같은 식입니다(지층 표 아래 계수표 참고). 말뚝 그룹 효과는 다리 간격이 말뚝 직경의 8배 이상이라 무시했습니다.</p>`;
  return h;
}
function htmlJkQty(){
  const P=R.P, q=R.qty, g=R.g;
  let h=`<h3>구조물 1기당 수량</h3><div class="tblwrap"><table class="t"><thead><tr><th>공종</th><th>규격</th><th>수량</th><th>단위</th></tr></thead><tbody>`;
  Object.entries(q.grpW).forEach(([k,v])=>{ const ms=g.mem.filter(m=>m.grp===k); h+=`<tr><td class="l">강관 ${GRPN[k]||k}</td><td>Ø${fx(ms[0].D*1000,0)} × ${fx(ms[0].t*1000,0)}, 총길이 ${fx(ms.reduce((a,m)=>a+m.L,0),1)} m</td><td class="n">${fx(v/G,2)}</td><td>t</td></tr>`; });
  h+=`<tr class="sub"><td class="l">자켓 강재 소계</td><td>f<sub>y</sub> ${P.jfy} MPa</td><td class="n">${fx(q.Wst/G,2)}</td><td>t</td></tr>
  <tr><td class="l">트랜지션피스 (가정)</td><td></td><td class="n">${fx(P.jWtp/G,2)}</td><td>t</td></tr>
  <tr><td class="l">2차 부재 (가정)</td><td></td><td class="n">${fx(P.jWsec/G,2)}</td><td>t</td></tr>
  <tr><td class="l">말뚝 (${g.nL}본)</td><td>Ø${fx(P.jPD*1000,0)} × ${P.jPt}, L ${fx(P.jPL+P.jStub,1)} m</td><td class="n">${fx(q.Wpile/G,2)}</td><td>t</td></tr>
  ${q.prot?`<tr><td class="l">세굴방지공 (사석, ${g.nL}곳)</td><td>Ø${fx(q.Dsc,1)} m, t ${P.jScT} m</td><td class="n">${fx(q.Vsc,1)}</td><td>m³</td></tr>`:""}</tbody></table></div>
  <h3>해역이용협의 산출</h3><div class="tblwrap"><table class="t"><thead><tr><th>항목</th><th>수량</th><th>단위</th><th>산식</th></tr></thead><tbody>
  <tr><td class="l">말뚝 단면적 합계</td><td class="n">${fx(q.Asb,2)}</td><td>m²</td><td class="fm">${g.nL} × π/4 × ${P.jPD}²</td></tr>
  <tr class="tot"><td class="l">점용 면적 (${q.prot?"세굴방지공 바깥":"다리 바깥 1 m 여유"} 다각형)</td><td class="n">${fx(q.Aocc,1)}</td><td>m²</td><td class="fm">중심~다리 ${fx(q.Rb,2)} + ${q.prot?`보호공 반경 ${fx(q.Dsc/2,2)}`:`말뚝 반경 ${P.jPD/2} + 1 m`}</td></tr>
  ${q.prot?`<tr><td class="l">세굴방지공 포설 면적 (${R.g.nL}곳)</td><td class="n">${fx(q.Asc,1)}</td><td>m²</td><td class="fm">${R.g.nL} × π/4·(${fx(q.Dsc,2)}² − ${P.jPD}²)</td></tr>`:""}
  <tr><td class="l">굴착·천공량</td><td class="n">0</td><td>m³</td><td class="fm">항타 말뚝</td></tr></tbody></table></div>
  <p class="note">${q.prot?`세굴방지공 외경 ${P.jScK}D·두께 ${P.jScT} m는 가정값입니다.`:`세굴방지공이 없으면 점용 면적은 말뚝 반경 + 1 m 여유(가정)로 잡습니다.`}</p>`;
  return h;
}
function htmlJkReport(){
  const P=R.P, t=R.T, g=R.g;
  let h=`<h2>1. 설계 개요</h2><p>해상풍력 발전기 자켓 기초(${g.nL}각, X 브레이스)를 3D 골조로 해석해 부재와 말뚝을 검토하고 수량을 정리한다.</p>
  <table class="t" style="max-width:720px"><tbody>
  <tr><td class="l">형식</td><td class="l">자켓 ${g.nL}각, ${g.n}칸, 하단 간격 ${P.jWb} m · 상단 ${P.jWt} m, 다리 Ø${P.jLD}×${P.jLt}, 브레이스 Ø${P.jBrD}×${P.jBrt}</td></tr>
  <tr><td class="l">터빈</td><td class="l">${esc(t.name)} (${t.MW} MW, 인터페이스 ${dl(g.yIf)})</td></tr>
  <tr><td class="l">설치 위치</td><td class="l">원지반 ${dl(P.sbDL)}, 설계조위 ${dl(P.hwl)}, 말뚝 Ø${P.jPD}×${P.jPt} mm, 근입 ${P.jPL} m (다리당 1본)</td></tr>
  <tr><td class="l">적용 기준</td><td class="l">DNV-RP-C205 (파랑·풍·조류), NORSOK N-004 (관형 부재), API RP 2GEO (말뚝), 강재 f<sub>y</sub> ${P.jfy} MPa</td></tr></tbody></table>
  <div class="fig">${primsSVG(jkSecPrims(R),"자켓 입면도")}</div><p class="note" style="text-align:center">그림 1. 입면도</p>`;
  h+=`<h2>2. 중량</h2>`+htmlJkWt();
  h+=`<h2>3. 하중</h2>`+htmlJkLoad();
  h+=`<h2>4. 부재 검토</h2>`+htmlJkChk();
  h+=`<h2>5. 말뚝</h2>`+htmlJkPile();
  h+=`<h2>6. 수량</h2>`+htmlJkQty();
  h+=`<h2>7. 남은 검토 항목</h2><p>접합부(K·X·T) 펀칭 전단, 말뚝-지반 유연성을 넣은 골조해석, 석션버킷, 피로, 최적화는 다음 단계에서 검토한다.</p>`;
  return h;
}
function makeXlsxJacket(){
  const P=R.P, g=R.g, q=R.qty, wb=XLSX.utils.book_new(), add=(nm,aoa,w)=>{ const ws=XLSX.utils.aoa_to_sheet(aoa); if(w) ws["!cols"]=w.map(x=>({wch:x})); XLSX.utils.book_append_sheet(wb,ws,nm); };
  const r2=v=>typeof v==="number"&&isFinite(v)?Math.round(v*1000)/1000:v;
  add("요약",[["해상풍력발전기 기초 설계도구 결과",baseName()],["형식",`자켓 ${g.nL}각`],["터빈",R.T.name],[],["조합","V (kN)","H (kN)","M (kN·m)"],...R.LC.map(l=>[l.id+" "+l.nm,r2(l.V),r2(l.H),r2(l.M)]),[],
    ["부재 이용률 최대",r2(R.uMax)],["자켓 강재 (t)",r2(q.Wst/G)],["말뚝 (t)",r2(q.Wpile/G)],["고유진동수 (Hz)",R.fq.cal?r2(R.fq.f):"-"],["점용 면적 (m²)",r2(q.Aocc)]],[28,14,14,14]);
  add("입력값",[["항목","값"],...Object.keys(P).filter(k=>!["rings","customT","rb","soil"].includes(k)).map(k=>[k,P[k]])],[14,14]);
  add("절점",[["번호","이름","x","y","z (DL)"],...g.nodes.map((n,i)=>[i+1,n.tag,r2(n.x),r2(n.y),r2(n.z)])]);
  add("부재검토",[["번호","부재군","시점","종점","D","t (mm)","길이","조합","N (kN)","M (kN·m)","σa","σm","fc","fm","이용률","검토"],...R.chk.map(c=>[c.mi+1,GRPN[c.grp]||c.grp,g.nodes[c.a].tag,g.nodes[c.b].tag,c.D,r2(c.t*1000),r2(c.L),c.lc,r2(c.N),r2(c.M),r2(c.sa),r2(c.sm),r2(c.fc),r2(c.fm),r2(c.u),c.mode])]);
  add("하중조합",R.LC.flatMap(l=>[[l.id+" "+l.nm],["하중","계수","V","H","M"],...l.items.map(it=>[it.nm,it.g,r2(it.V),r2(it.H),r2(it.M)]),["합계","",r2(l.V),r2(l.H),r2(l.M)],["다리 반력 (압축 +)",...l.R.map(r=>r2(r.Vc))],[]]),[34,8,14,14,14]);
  add("말뚝",[["조합","최대 압축","최대 인발","수평","모멘트"],...R.pile.rows.map(r=>[r.id,r2(r.comp),r2(r.ten),r2(r.H),r2(r.M)]),[],["압축 Q (kN)",r2(R.pile.ax.Q)],["인발 Qt (kN)",r2(R.pile.Qt)],["수평 해저면 변위 (mm)",r2(R.pile.lat.w0*1000)]]);
  add("수량",[["공종","수량","단위"],...Object.entries(q.grpW).map(([k,v])=>["강관 "+(GRPN[k]||k),r2(v/G),"t"]),["자켓 강재 소계",r2(q.Wst/G),"t"],["TP",r2(P.jWtp/G),"t"],["2차 부재",r2(P.jWsec/G),"t"],["말뚝",r2(q.Wpile/G),"t"],["세굴방지공",r2(q.Vsc),"m³"],[],["점용 면적",r2(q.Aocc),"m²"],["굴착·천공량",0,"m³"]],[24,12,6]);
  return new Blob([XLSX.write(wb,{bookType:"xlsx",type:"array"})],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
}

/* ---------- 응력분포도 (자켓): 부재 이용률 분포, 다리 높이별 축력·휨모멘트, 브레이스 축력, 말뚝 ---------- */
const UCAT=[[0.5,"#2f8f6b","≤ 0.5"],[0.8,"#b8a200","0.5 ~ 0.8"],[1.0,"#d9822b","0.8 ~ 1.0"],[1e9,"#c23b2e","> 1.0 (N.G)"]];
const ucol=u=>UCAT.find(c=>u<=c[0])[1];
function jkUtilSVG(view){
  const g=R.g, W=330,H=360, ax=view==="x"?"x":"y", ns=g.nodes, xs=ns.map(n=>n[ax]), zs=ns.map(n=>n.z), x0=Math.min(...xs), x1=Math.max(...xs), z0=Math.min(...zs), z1=Math.max(...zs);
  const sc=Math.min((W-40)/(x1-x0||1),(H-40)/(z1-z0||1)), X=v=>W/2+(v-(x0+x1)/2)*sc, Y=v=>H-20-(v-z0)*sc;
  const um=new Map(R.chk.map(c=>[c.mi,c]));
  const ord=g.mem.map((m,i)=>({m,i,d:view==="x"?(ns[m.a].y+ns[m.b].y):(ns[m.a].x+ns[m.b].x)})).sort((a,b)=>a.d-b.d);  // 뒤쪽 먼저
  let s=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="부재 이용률 (${view==="x"?"정면":"측면"})">`;
  s+=`<line x1="10" y1="${Y(R.P.sbDL)}" x2="${W-10}" y2="${Y(R.P.sbDL)}" stroke="var(--soil-line,#8a6d3b)" stroke-width="1"/><line x1="10" y1="${Y(R.P.hwl)}" x2="${W-10}" y2="${Y(R.P.hwl)}" stroke="var(--water-line)" stroke-width=".8" stroke-dasharray="4 3"/>`;
  ord.forEach(({m,i})=>{ const A=ns[m.a],B=ns[m.b], c=um.get(i);
    if(m.rigid) s+=`<line x1="${X(A[ax])}" y1="${Y(A.z)}" x2="${X(B[ax])}" y2="${Y(B.z)}" stroke="var(--muted)" stroke-width="1" stroke-dasharray="3 2"/>`;
    else s+=`<line x1="${X(A[ax])}" y1="${Y(A.z)}" x2="${X(B[ax])}" y2="${Y(B.z)}" stroke="${c?ucol(c.u):"var(--muted)"}" stroke-width="${Math.max(1.6,m.D*sc*0.55)}" stroke-linecap="round"><title>${c?`${({leg:"다리",brace:"X 브레이스",mud:"하단 수평재",hz:"수평재"})[m.grp]||m.grp} ${ns[m.a].tag}→${ns[m.b].tag} 이용률 ${isFinite(c.u)?c.u.toFixed(2):"∞"} (${c.lc})`:""}</title></line>`; });
  const w=R.chk.reduce((a,b)=>b.u>a.u?b:a), A=ns[w.a],B=ns[w.b], mx=(X(A[ax])+X(B[ax]))/2, my=(Y(A.z)+Y(B.z))/2;
  s+=`<circle cx="${mx}" cy="${my}" r="6" fill="none" stroke="var(--ink)" stroke-width="1.2"/><text x="${mx+8}" y="${my-6}" font-size="9.5" fill="var(--ink)" font-family="var(--f-num)">최대 ${isFinite(w.u)?w.u.toFixed(2):"∞"}</text>`;
  return s+`<text x="${W/2}" y="${H-5}" font-size="9.5" fill="var(--muted)" text-anchor="middle">${view==="x"?"정면 (x–z)":"측면 (y–z)"} · 앞쪽 부재가 위에 그려짐</text></svg>`;
}
function htmlJkStress(){
  const P=R.P, g=R.g, lcs=R.LC.filter(l=>l.kind!=="SLS"), nm=Object.fromEntries(R.LC.map(l=>[l.id,l.nm]));
  let h=`<h2>1. 부재 이용률 분포 (NORSOK N-004, 폭풍·지진 중 큰 값)</h2>
  <div class="legend" style="margin:4px 0 0">${UCAT.map(c=>`<span><i style="background:${c[1]}"></i>${c[2]}</span>`).join("")}<span><i style="background:var(--muted)"></i>TP 강체 연결</span></div>
  <div class="plots"><div class="sheet">${jkUtilSVG("x")}</div><div class="sheet">${jkUtilSVG("y")}</div></div>
  <p class="note">선 굵기는 부재 직경에 비례합니다. 부재에 마우스를 올리면 이용률과 지배 조합이 보입니다. 접합부 펀칭 전단·피로는 포함하지 않았습니다.</p>`;
  // 다리 높이별
  const LEGC=["#1f7fb8","#c2552e","#2f8f6b","#7b4fb0"];
  const legSeries=(l,key)=>{ const out=[]; for(let k=0;k<g.nL;k++){ const z=[],v=[]; for(let i=0;i<g.n;i++){ const a=g.legNode[k][i], b=g.legNode[k][i+1], mi=g.mem.findIndex(m=>m.a===a&&m.b===b&&m.grp==="leg"), f=l.mf[mi];
        z.push(g.nodes[a].z,g.nodes[b].z); if(key==="N") v.push(f.N,f.N); else v.push(f.Ma,f.Mb); }
      out.push({c:LEGC[k],v,z}); } return out; };
  const gov=lcs.reduce((a,b)=>Math.max(...b.R.map(r=>Math.abs(r.Vc)))>Math.max(...a.R.map(r=>Math.abs(r.Vc)))?b:a,lcs[0]);
  const marks=[[P.hwl,"설계조위","var(--water-line)"],[P.sbDL,"해저면","var(--soil-line,#8a6d3b)"]];
  h+=`<h2>2. 다리 높이별 축력·휨모멘트 (${gov.id} ${nm[gov.id]})</h2>
  <div class="legend" style="margin:4px 0 0">${[...Array(g.nL)].map((_,k)=>`<span><i style="background:${LEGC[k]}"></i>다리 L${k+1}</span>`).join("")}</div>
  <div class="plots"><div class="sheet">${heightSVG(legSeries(gov,"N"),[0],"축력 N (인장 +)","kN",marks,true,0)}</div><div class="sheet">${heightSVG(legSeries(gov,"M"),[0],"휨모멘트 M","kN·m",marks,true,0)}</div></div>
  <p class="note">지배 조합은 다리 반력이 가장 큰 조합입니다. 축력은 칸(부재)마다 일정하게, 휨모멘트는 부재 양 끝 값을 이어 그렸습니다. 값이 같은 다리는 선이 겹쳐 하나로 보입니다(하중 방향에 대칭인 다리).</p>`;
  // 브레이스 칸별
  h+=`<h2>3. X 브레이스 칸별 최대 축력</h2><div class="tblwrap"><table class="t"><thead><tr><th>칸</th><th>표고</th>${lcs.map(l=>`<th>${l.id} 압축 최대 (kN)</th><th>${l.id} 인장 최대 (kN)</th>`).join("")}<th>이용률 최대</th></tr></thead><tbody>`;
  for(let i=0;i<g.n;i++){ const z0=g.lev[i], z1=g.lev[i+1], mis=g.mem.map((m,mi)=>({m,mi})).filter(({m})=>m.grp==="brace"&&Math.min(g.nodes[m.a].z,g.nodes[m.b].z)>=z0-1e-6&&Math.max(g.nodes[m.a].z,g.nodes[m.b].z)<=z1+1e-6);
    const um=Math.max(...mis.map(({mi})=>{ const c=R.chk.find(c=>c.mi===mi); return c?c.u:0; }));
    h+=`<tr><td class="n">${i+1}</td><td class="n">${dlS(z0)} ~ ${dlS(z1)}</td>${lcs.map(l=>{ const Ns=mis.map(({mi})=>l.mf[mi].N); return `<td class="n">${fx(Math.min(0,...Ns),0)}</td><td class="n">${fx(Math.max(0,...Ns),0)}</td>`; }).join("")}<td class="n" style="color:${ucol(um)}">${isFinite(um)?um.toFixed(2):"∞"}</td></tr>`; }
  h+=`</tbody></table></div>`;
  // 말뚝
  const Y=R.pile, L=Y.lat, sp=Y.sp;
  h+=`<h2>4. 말뚝 깊이별 분포 (${Y.gov.id}, 말뚝 머리 = ${Y.prot?"해저면":"세굴면"})</h2>
  <div class="plots"><div class="sheet">${depthSVG([{x:L.x,v:L.w.map(v=>v*1000),c:LCC[1]}],sp.Le,"변위","mm")}</div><div class="sheet">${depthSVG([{x:L.x,v:L.Mz,c:LCC[1]}],sp.Le,"휨모멘트","kN·m")}</div><div class="sheet">${depthSVG([{x:L.x,v:L.p,c:LCC[1]}],sp.Le,"지반반력 p","kN/m")}</div></div>`;
  return h;
}
