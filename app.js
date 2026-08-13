(function(){
window.App=window.App||{};
const App=window.App;
App.state=App.state||{};
App.utils=App.utils||{};
const u=App.utils;
window.$=window.$||function(id){return document.getElementById(id);};
u.num=function(v){return Number(String(v??'').replace(/,/g,''))||0;};
u.currency=function(v){return '$'+Math.round(Number(v)||0).toLocaleString();};
u.pct=function(v,d=1){return (Number(v)||0).toFixed(d)+'%';};

function setSection(toggle,open){
 const row=$(toggle.dataset.target),arrow=toggle.querySelector('.arrow');
 if(!row||!arrow)return;
 row.style.display=open?'block':'none';
 arrow.textContent=open?'▼':'►';
 toggle.setAttribute('aria-expanded',String(open));
}

App.sections={
 init(){
  document.querySelectorAll('.section-toggle').forEach(t=>{
   setSection(t,t.dataset.target==='row-basics');
   t.addEventListener('click',()=>{const row=$(t.dataset.target);if(row)setSection(t,row.style.display==='none');});
  });
  const compact=$('compactToggle');
  if(compact)compact.addEventListener('click',()=>{
   const on=!document.body.classList.contains('compact');
   document.body.classList.toggle('compact',on);
   compact.textContent=on?'Compact Mode: ON':'Compact Mode: OFF';
  });
 },
 open(id){const t=document.querySelector('.section-toggle[data-target="'+id+'"]');if(t)setSection(t,true);}
};

App.inputs={
 init(){
  const alloc=$('i_alloc');
  if(alloc)alloc.addEventListener('change',()=>{const p=alloc.value.split(',');if($('i_ret'))$('i_ret').value=p[0];if($('i_vol'))$('i_vol').value=p[1];});
 },
 read(){return {
  age:u.num($('i_age')?.value),retire:u.num($('i_retire')?.value),life:u.num($('i_life')?.value),bal:u.num($('i_bal')?.value),
  saveMonthly:u.num($('i_save')?.value),spendAnnual:u.num($('i_spend')?.value),ssAnnual:u.num($('i_ss')?.value),pensionAnnual:u.num($('i_pension')?.value),flexPct:u.num($('i_flex')?.value),
  taxFedPct:u.num($('i_taxFed')?.value),taxStatePct:u.num($('i_taxState')?.value),acctType:$('i_type')?.value||'roth',
  expReturnPct:u.num($('i_ret')?.value),volPct:u.num($('i_vol')?.value),genInflPct:u.num($('i_inf')?.value),
  healthPre:u.num($('i_healthPre')?.value),healthPost:u.num($('i_healthPost')?.value),healthInfPct:u.num($('i_healthInf')?.value),
  stressSOR:u.num($('i_stressSOR')?.value),stressInf:u.num($('i_stressInf')?.value),stressLowRet:u.num($('i_stressLowRet')?.value),stressIncomeShock:u.num($('i_stressIncomeShock')?.value),stressHealthSpike:u.num($('i_stressHealthSpike')?.value),stressLongLife:u.num($('i_stressLongLife')?.value),
  simsCount:u.num($('runSimCount')?.value)||6000
 };},
 validate(inp){
  const e=[];
  if(inp.age<18||inp.age>100)e.push('Current age must be between 18 and 100.');
  if(inp.retire<inp.age)e.push('Retirement age cannot be earlier than current age.');
  if(inp.life<=inp.retire)e.push('Life expectancy must be greater than retirement age.');
  if(inp.expReturnPct<-20||inp.expReturnPct>20)e.push('Expected return must be between -20% and 20%.');
  if(inp.volPct<0||inp.volPct>40)e.push('Volatility must be between 0% and 40%.');
  return e;
 }
};

App.table={draw(){
 const sim=App.state.simResults;if(!sim)return;
 const body=document.querySelector('#yearTable tbody');if(!body)return;
 body.innerHTML='';let survivors=sim.runs;const startYear=new Date().getFullYear();
 for(let y=0;y<sim.p50.length;y++){
  let success='—';if(y>=sim.accYears){survivors-=sim.fails[y-sim.accYears]||0;success=u.pct(100*survivors/sim.runs);}
  const tr=document.createElement('tr');tr.innerHTML='<td>'+(startYear+y)+'</td><td>'+sim.ages[y]+'</td><td>'+u.currency(sim.p10[y])+'</td><td>'+u.currency(sim.p50[y])+'</td><td>'+u.currency(sim.p90[y])+'</td><td>'+success+'</td>';body.appendChild(tr);
 }
}};

window.addEventListener('DOMContentLoaded',()=>{
 App.sections.init();App.inputs.init();if(App.sim)App.sim.init();if(App.reports)App.reports.init();
});
})();