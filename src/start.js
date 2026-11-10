/* ---------- 시작 ---------- */
(function(){ let s=null; try{ s=JSON.parse(localStorage.getItem(LS)||"null"); }catch(e){} setInputs(s&&typeof s==="object"?s:DEF); run(); })();
