(function(){
  const App=window.App,u=App.utils;
  App.results={
    update(){
      const s=App.state.simResults;if(!s)return;
      const last=s.p50[s.p50.length-1]||0;
      if($('resultsCard'))$('resultsCard').style.display='block';
      if($('succ'))$('succ').textContent=u.pct(s.successPct);
      if($('withdrawRate'))$('withdrawRate').textContent=u.pct(s.initialWithdrawalPct,2);
      if($('med'))$('med').textContent=u.currency(last);
      if($('dashBal'))$('dashBal').textContent=u.currency(s.portAtRet);
      if($('dashDD'))$('dashDD').textContent=u.pct(s.worstDrawdownPct);
      if($('dashFail'))$('dashFail').textContent=s.failAge?('Age '+s.failAge):'No failures in tested horizon';
      if($('dashSpend'))$('dashSpend').textContent=u.currency(s.adjFirstYearSpend);
      if($('dashHealth'))$('dashHealth').textContent=u.currency(s.healthAtRet);
      const c=$('succCard');
      if(c){c.classList.remove('success','warn','danger');c.classList.add(s.successPct>=90?'success':s.successPct>=75?'warn':'danger')}
      const e=$('resultsExplanation');
      if(e){
        const ssText=s.inputs.ssAnnual>0
          ? ` Social Security is modeled to begin at age ${s.inputs.ssClaimAge||67}.`
          : '';
        e.textContent=`Across ${s.runs.toLocaleString()} simulated market paths, the plan remained funded through the modeled lifetime in ${s.successPct.toFixed(1)}% of cases. The median portfolio at retirement is ${u.currency(s.portAtRet)} and the median ending balance is ${u.currency(last)}.${ssText}`;
      }
      this.guidance(s);
      this.assumptions(s);
    },
    guidance(s){
      const el=$('guidanceText');if(!el)return;
      const items=[];let lead='';
      if(s.successPct>=90){
        lead='The plan appears resilient under the assumptions you entered.';
        items.push('Test higher spending, earlier retirement, or more conservative returns to understand your margin of safety.','Turn on the healthcare stress test to see how sensitive the plan is to later-life medical costs.','Compare different Social Security claiming ages using the personalized benefit estimates SSA provides for those ages.');
      }else if(s.successPct>=75){
        lead='The plan works in many outcomes, but several assumptions can materially change the result.';
        items.push('Try reducing retirement spending by 5–10%.','Try retiring one or two years later.','Compare lower healthcare costs with a healthcare spike to see how much medical expenses matter.','Test a different Social Security claiming age using the matching SSA benefit estimate.');
      }else{
        lead='The plan shows a meaningful risk of running short before the end of the modeled lifetime.';
        items.push('Reduce planned spending and rerun.','Increase monthly savings while still working.','Test delaying retirement one year at a time.','Review whether healthcare and guaranteed-income assumptions are realistic.','Compare Social Security claiming ages using the matching personalized SSA estimates.');
      }
      el.innerHTML='<p><strong>'+lead+'</strong></p><ul>'+items.map(x=>'<li>'+x+'</li>').join('')+'</ul>';
    },
    assumptions(s){
      const i=s.inputs,el=$('assumptionGrid');if(!el)return;
      const scope=i.healthScope==='individual'?'Individual':'Household';
      const shock=i.stressHealthSpike===1?'50% increase beginning at age 80':i.stressHealthSpike===2?'75% increase beginning at age 75':'Off';
      const rows=[
        ['Return',i.expReturnPct+'%'],['Volatility',i.volPct+'%'],['General inflation',i.genInflPct+'%'],
        ['Healthcare cost basis',scope],['Healthcare before 65',u.currency(i.healthPre)+'/yr'],['Healthcare age 65+',u.currency(i.healthPost)+'/yr'],['Healthcare inflation',i.healthInfPct+'%'],['Healthcare stress test',shock],
        ['Annual spending',u.currency(i.spendAnnual)],['Social Security estimate (today\'s $)',u.currency(i.ssAnnual)+'/yr'],['Social Security claiming age',i.ssClaimAge||67],['Pension / guaranteed income',u.currency(i.pensionAnnual)],['Simulations',s.runs.toLocaleString()]
      ];
      el.innerHTML=rows.map(r=>'<div><strong>'+r[0]+':</strong> '+r[1]+'</div>').join('');
    }
  };
})();