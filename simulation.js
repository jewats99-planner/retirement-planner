(function(){
const App=window.App;
function workerFactory(){
 const code=`
 function randN(){let a=0,b=0;while(a===0)a=Math.random();while(b===0)b=Math.random();return Math.sqrt(-2*Math.log(a))*Math.cos(2*Math.PI*b)}
 function pct(sorted,p){return sorted[Math.min(sorted.length-1,Math.max(0,Math.floor((sorted.length-1)*p)))]||0}
 self.onmessage=e=>{
  const inp=e.data;
  let life=inp.life+(inp.stressLongLife===1?5:inp.stressLongLife===2?10:0);
  const age=inp.age,retire=inp.retire,bal0=inp.bal,acc=Math.max(0,retire-age),dec=Math.max(0,life-retire),total=acc+dec;
  const runs=Math.max(500,Math.min(50000,inp.simsCount||6000));
  const hist=Array.from({length:total},()=>[]),fails=Array(dec).fill(0),ages=Array.from({length:total},(_,i)=>age+i);
  const saveAnnual=inp.saveMonthly*12,baseR=inp.expReturnPct/100,vol=inp.volPct/100,flex=inp.flexPct/100;
  const tax=(inp.acctType==='traditional')?Math.min(.8,(inp.taxFedPct+inp.taxStatePct)/100):0;
  const infl=(inp.stressInf===1?0.04:inp.stressInf===2?0.06:inp.genInflPct/100),hInfl=inp.healthInfPct/100;
  const ssShock=inp.stressIncomeShock===1?.9:inp.stressIncomeShock===2?.8:1;
  for(let i=0;i<runs;i++){
   let bal=bal0,peak=bal,failed=false;
   for(let y=0;y<acc;y++){const r=baseR+vol*randN();bal=Math.max(0,bal*(1+r)+saveAnnual);peak=Math.max(peak,bal);hist[y].push(bal)}
   for(let y=0;y<dec;y++){
    const t=acc+y,ageNow=age+t,early=y<10;
    let r=baseR+vol*randN();
    if(early&&inp.stressLowRet===1)r-=.02;if(early&&inp.stressLowRet===2)r-=.04;
    if(early&&inp.stressSOR===1)r-=.02;if(early&&inp.stressSOR===2)r-=.035;
    let health=(ageNow<65?inp.healthPre:inp.healthPost)*Math.pow(1+hInfl,t);
    if(inp.stressHealthSpike===1&&ageNow>=80)health*=1.5;if(inp.stressHealthSpike===2&&ageNow>=75)health*=1.75;
    const income=(inp.ssAnnual*ssShock+inp.pensionAnnual)*Math.pow(1+.02,t);
    let need=inp.spendAnnual*Math.pow(1+infl,t)+health-income;if(need<0)need=0;
    if(tax>0)need/=1-tax;
    if(flex>0&&bal<peak*(1-flex))need*=1-flex;
    bal=Math.max(0,bal*(1+r)-need);peak=Math.max(peak,bal);hist[t].push(bal);
    if(!failed&&bal<=0){fails[y]++;failed=true}
   }
   if(i%250===0)self.postMessage({type:'progress',value:Math.round(i/runs*100)})
  }
  const p10=[],p25=[],p50=[],p75=[],p90=[];
  for(let y=0;y<total;y++){const s=hist[y].sort((a,b)=>a-b);p10[y]=pct(s,.10);p25[y]=pct(s,.25);p50[y]=pct(s,.50);p75[y]=pct(s,.75);p90[y]=pct(s,.90)}
  const totalFails=fails.reduce((a,b)=>a+b,0),successPct=(runs-totalFails)/runs*100,portAtRet=acc>0?p50[acc-1]:bal0;
  const firstPortfolioNeed=Math.max(0,inp.spendAnnual+(retire<65?inp.healthPre:inp.healthPost)-inp.ssAnnual*ssShock-inp.pensionAnnual);
  const initialWithdrawalPct=portAtRet>0?firstPortfolioNeed/portAtRet*100:0;
  let peakMed=p50[0]||0,worstDD=0;for(let i=1;i<p50.length;i++){peakMed=Math.max(peakMed,p50[i]);if(peakMed>0)worstDD=Math.min(worstDD,(p50[i]-peakMed)/peakMed*100)}
  const fi=fails.findIndex(v=>v>0),failAge=fi<0?null:retire+fi;
  self.postMessage({type:'result',data:{inputs:inp,runs,ages,accYears:acc,decYears:dec,p10,p25,p50,p75,p90,fails,successPct,portAtRet,initialWithdrawalPct,worstDrawdownPct:worstDD,failAge,adjFirstYearSpend:inp.spendAnnual*Math.pow(1+infl,acc)}})
 }`;
 return new Worker(URL.createObjectURL(new Blob([code],{type:'application/javascript'})));
}
App.sim={worker:null,
 init(){const b=$('runBtn');if(b)b.addEventListener('click',()=>this.run());},
 run(){
  const inp=App.inputs.read(),errors=App.inputs.validate(inp);if(errors.length){alert(errors.join('\n'));return}
  if(this.worker)this.worker.terminate();
  const btn=$('runBtn'),status=$('simStatus'),bar=$('simProgress'),fill=$('simProgressFill');
  if(btn){btn.disabled=true;btn.textContent='Running simulations…'}if(status)status.textContent='Testing '+inp.simsCount.toLocaleString()+' possible retirement paths…';if(bar)bar.style.display='block';if(fill)fill.style.width='2%';
  try{this.worker=workerFactory()}catch(err){alert('Your browser could not start the background simulation worker.');if(btn){btn.disabled=false;btn.textContent='Run Monte Carlo Simulation'}return}
  this.worker.onmessage=e=>{
   if(e.data.type==='progress'){if(fill)fill.style.width=Math.max(2,e.data.value)+'%';return}
   if(e.data.type==='result'){
    App.state.simResults=e.data.data;if(fill)fill.style.width='100%';if(status)status.textContent='Simulation complete. Change any input and run again to test another option.';
    if(btn){btn.disabled=false;btn.textContent='Run Monte Carlo Simulation'}
    App.results.update();App.charts.draw();App.table.draw();App.sections.open('row-dash');this.worker.terminate();this.worker=null;
   }
  };
  this.worker.onerror=err=>{console.error(err);if(btn){btn.disabled=false;btn.textContent='Run Monte Carlo Simulation'}if(status)status.textContent='Simulation error. Please review your inputs and try again.';};
  this.worker.postMessage(inp);
 }
};
})();