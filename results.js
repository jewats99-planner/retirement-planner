(function(){
const App=window.App,u=App.utils;
App.results={update(){
 const sim=App.state.simResults;if(!sim)return;
 const last=sim.p50[sim.p50.length-1]||0;
 if($('resultsCard'))$('resultsCard').style.display='block';
 if($('succ'))$('succ').textContent=u.pct(sim.successPct);
 if($('withdrawRate'))$('withdrawRate').textContent=u.pct(sim.initialWithdrawalPct,2);
 if($('med'))$('med').textContent=u.currency(last);
 if($('dashBal'))$('dashBal').textContent=u.currency(sim.portAtRet);
 if($('dashDD'))$('dashDD').textContent=u.pct(sim.worstDrawdownPct);
 if($('dashFail'))$('dashFail').textContent=sim.failAge?('Age '+sim.failAge):'No failures in tested horizon';
 if($('dashSpend'))$('dashSpend').textContent=u.currency(sim.adjFirstYearSpend);
 const card=$('succCard');if(card){card.classList.remove('success','warn','danger');card.classList.add(sim.successPct>=90?'success':sim.successPct>=75?'warn':'danger');}
 const expl=$('resultsExplanation');if(expl)expl.textContent=`Across ${sim.runs.toLocaleString()} simulated market paths, the plan remained funded through the modeled lifetime in ${sim.successPct.toFixed(1)}% of cases. The median portfolio at retirement is ${u.currency(sim.portAtRet)} and the median ending balance is ${u.currency(last)}.`;
 this.guidance(sim);this.assumptions(sim);
},
guidance(sim){
 const box=$('guidanceText');if(!box)return;const s=sim.successPct,items=[];let lead='';
 if(s>=90){lead='The plan appears resilient under the assumptions you entered.';items.push('Test a higher spending level, earlier retirement age, or more conservative returns to understand your margin of safety.');}
 else if(s>=75){lead='The plan is workable in many outcomes, but changes in assumptions can materially affect it.';items.push('Try reducing retirement spending by 5–10%.','Try retiring one or two years later.','Run the stress tests to see which risks matter most.');}
 else{lead='The plan shows a meaningful risk of running short before the end of the modeled lifetime.';items.push('Reduce planned spending and rerun.','Increase monthly savings while still working.','Test delaying retirement one year at a time.','Review whether guaranteed income assumptions are realistic.');}
 box.innerHTML='<p><strong>'+lead+'</strong></p><ul>'+items.map(x=>'<li>'+x+'</li>').join('')+'</ul>';
},
assumptions(sim){const i=sim.inputs,el=$('assumptionGrid');if(!el)return;const rows=[['Return',i.expReturnPct+'%'],['Volatility',i.volPct+'%'],['Inflation',i.genInflPct+'%'],['Healthcare inflation',i.healthInfPct+'%'],['Annual spending',u.currency(i.spendAnnual)],['Social Security',u.currency(i.ssAnnual)],['Pension/guaranteed income',u.currency(i.pensionAnnual)],['Simulations',sim.runs.toLocaleString()]];el.innerHTML=rows.map(r=>'<div><strong>'+r[0]+':</strong> '+r[1]+'</div>').join('');}
};
})();