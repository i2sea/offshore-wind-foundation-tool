// 계산 엔진 검증: 해석해·손계산과 비교.  실행: node tests/validate.js
// (현장 자료로 기존 계산서 값을 재현하는 검증은 저장소 밖의 비공개 자료 폴더에 따로 있습니다.)
const fs=require("fs"), path=require("path"), vm=require("vm");
const src=["engine.js","member.js","mono.js","pile.js","jacket.js"].map(f=>fs.readFileSync(path.join(__dirname,"..","src",f),"utf8")).join("\n").replace(/^if\(typeof module!=="undefined"\).*$/m,"");
const ctx={Math,console}; vm.createContext(ctx); vm.runInContext(src+"\nthis.E={compute,DEF,mfCM,waveNumber,froyaU0,froya,memberDesign,optimizeAll,optimizeMember,optimizeMemberFreq,computeMono,computePile,pileFE,sandCoef,beamFreq,monoFreq,TURB_PRESETS,computeJacket,frameAssemble,frameSolve,tubCheck,compute};",ctx);
const E=ctx.E; let fail=0;
const near=(name,got,exp,tol)=>{ const ok=Math.abs(got-exp)<=tol; if(!ok) fail++; console.log(`${ok?"OK  ":"FAIL"} ${name}: ${got.toFixed(3)} (기대 ${exp} ± ${tol})`); };
/* 터빈 하중 이동 · 파랑 */
near("작은 ka에서 C_M → 2.0 (Morison 극한)",E.mfCM(0.01).CM,2.0,0.001);
{ const P={...E.DEF,type:"mono1",mTP:"bolt",crest:0}, V=E.computeMono(P).wave, a=(P.mD+0.1)/2, cm=E.mfCM(V.k*a).CM, FIh=1.03*Math.PI*a*a*cm*V.w**2*P.Hw/(2*V.k);
  near("모노파일 관성력 진폭 F_I (볼트 연결·직경 일정, 해석해 ρπa²C_M ω²H/2k, kN)",V.FI,FIh,FIh*0.003); }
{ const T={...E.TURB_PRESETS[0],id:"t1",uls:Array.from({length:12},(_,i)=>[0,1000*(i+1),0,0,0,-500*(i+1)]),sls:null}, P={...E.DEF,type:"mono1",customT:[T],turb:"t1"}, Mo=E.computeMono(P), l=Mo.LC[1], it=l.items[1], g=Mo.TL.gu;
  near("터빈 해저면 모멘트 M + H·(y_if − y_ML)",it.M,g.M+g.H*(Mo.yIf-Mo.yML),1); }
/* p-y 말뚝 해석 */
{ const c=E.sandCoef(35); near("API 모래 C₁ (φ 35°, API 그림 약 2.97)",c.C1,2.97,0.03); near("API 모래 C₂ (φ 35°, 약 3.42)",c.C2,3.42,0.03); }
{ const EI=1e9,k=5e4,H=1000,M=5000,n=200,h=0.5, r=E.pileFE({n,h,EI:Array(n).fill(EI),kp:Array.from({length:n+1},()=>({ty:"lin",k,pu:Infinity})),D:100},H,M), b=Math.pow(k/(4*EI),0.25);
  near("탄성지반 위 긴 보 머리 변위 (Hetényi (2Hβ+2Mβ²)/k, mm)",r.w0*1000,(2*H*b+2*M*b*b)/k*1000,0.005);
  near("탄성지반 위 긴 보 머리 회전각 (Hetényi (2Hβ²+4Mβ³)/k, ×1e6)",-r.th0*1e6,(2*H*b*b+4*M*b**3)/k*1e6,0.5);
  near("해저면 모멘트 = 작용 M",r.Mz[0],M,1); }
/* 고유진동수 */
{ const L=50,EI=1e8,m=2,n=40; near("균일 외팔보 1차 진동수 (1.875²/2πL²·√(EI/m), Hz)",E.beamFreq(Array.from({length:n},()=>({L:L/n,EI,m})),[],[],true).f,1.875104**2/(2*Math.PI*L*L)*Math.sqrt(EI/m),1e-3);
  near("끝단 질량 외팔보 (√(3EI/L³M)/2π, Hz)",E.beamFreq(Array.from({length:n},()=>({L:L/n,EI,m:1e-6})),[[n,100]],[],true).f,Math.sqrt(3*EI/L**3/100)/(2*Math.PI),1e-3);
  const P={...E.DEF,type:"mono1"}, Rm=E.computeMono(P), F=E.monoFreq(P,Rm,E.computePile(P,Rm,{quick:1}));
  near("DTU 10MW 타워 등가 두께 0.9×605/(7.85π·6.9·105.63) (mm)",F.cal.t*1000,0.9*605/(77/9.81*Math.PI*6.9*105.63)*1000,0.05);
  const ord=F.lo.f<=F.hi.f+1e-9&&F.hi.f<=F.fix.f+1e-9&&F.fix.f<=F.cal.fchk+1e-9; console.log(`${ord?"OK  ":"FAIL"} 모노파일 진동수 순서 하한 ${F.lo.f.toFixed(3)} ≤ 상한 ${F.hi.f.toFixed(3)} ≤ 해저면 고정 ${F.fix.f.toFixed(3)} ≤ 타워만 ${F.cal.fchk.toFixed(3)}`); if(!ord) fail++; }
{ const L=60,M=500,Kr=5e8, r=E.beamFreq(Array.from({length:30},()=>({L:L/30,EI:1e15,m:1e-6})),[[30,M]],[[0,1e13]],false,[[0,Kr]],[]);
  near("강체 막대 + 회전 스프링 √(K_r/ML²)/2π (Hz)",r.f,Math.sqrt(Kr/(M*L*L))/(2*Math.PI),1e-4); }
{ const Q=E.compute({...E.DEF}), g=Q.freq.calc;
  const ord=g.f<=g.fFix+1e-9&&g.fFix<=g.cal.fchk+1e-9; console.log(`${ord?"OK  ":"FAIL"} 중력식 진동수 순서 지반 ${g.f.toFixed(3)} ≤ 저판 고정 ${g.fFix.toFixed(3)} ≤ 타워만 ${g.cal.fchk.toFixed(3)}`); if(!ord) fail++;
  near("콘크리트 E_c = 8500·∛(45+4.5) (MPa)",g.Ec/1000,8500*Math.cbrt(49.5),0.5); }
/* 자켓: 3D 골조 */
{ const g={nodes:[{x:0,y:0,z:0},{x:0,y:0,z:10}],mem:[{a:0,b:1,D:1,t:0.05,grp:"leg"}],sup:[0]}; g.mem.forEach(m=>{m.L=10;m.e=[0,0,1];});
  const fa=E.frameAssemble(g), F=new Float64Array(12); F[6]=100; F[8]=-50; const s2=E.frameSolve(g,fa,F), I=Math.PI/64*(1-0.9**4), A=Math.PI/4*(1-0.81);
  near("3D 골조 외팔보 끝단 변위 PL³/3EI (mm)",s2.u[6]*1000,100*1000/(3*210e6*I)*1000,1e-6);
  near("3D 골조 외팔보 축변위 PL/EA (mm)",-s2.u[8]*1000,50*10/(210e6*A)*1000,1e-6);
  near("3D 골조 고정단 모멘트 PL (kN·m)",s2.mf[0].Ma,1000,1e-6); }
{ const c=E.tubCheck(1,0.02,355,1.15,-5000,0,1e-3); near("NORSOK 짧은 압축재 (λ≈0): 이용률 = σc/(fyc/γM)",c.u,5000/c.A/1000/(c.fyc/1.15),1e-6); }
for(const ty of ["jk4","jk3"]){ const J=E.computeJacket({...E.DEF,type:ty}); J.LC.forEach(l=>near(`자켓 ${ty} ${l.id} 반력 연직 합계 = 하중 V (kN)`,l.sumV,l.V,Math.max(1,Math.abs(l.V)*0.005))); }
/* 부재설계 + 진동수 동시 자동 수정 (기본 예시) */
{ const o=E.optimizeMemberFreq({...E.DEF}), Rq=E.compute(o.P), M=E.memberDesign(Rq,o.P.rb), ok=M.ok&&Rq.freq.ok!==false; console.log(`${ok?"OK  ":"FAIL"} 기본 예시 부재설계+진동수 동시 수정: 부재 ${M.ok?"O.K":"N.G"}, f ${Rq.freq.f.toFixed(3)} Hz`); if(!ok) fail++; }
console.log(fail?`\n${fail}개 실패`:"\n모두 통과"); process.exit(fail?1:0);
