(function(){
  const App=window.App,u=App.utils;

  function recommendations(s){
    const i=s.inputs,recs=[];
    const add=(key,label,value,direction)=>{if(!recs.some(r=>r.key===key))recs.push({key,label,value,direction});};
    if(s.successPct<75){
      add('spendAnnual','Annual spending',u.currency(i.spendAnnual)+'/yr','Test 5–10% lower');
      if(i.retire>i.age)add('retire','Retirement age',String(i.retire),'Test 1–2 years later');
      if(i.retire>i.age)add('saveMonthly','Monthly savings',u.currency(i.saveMonthly)+'/mo','Test a higher monthly contribution');
      if(recs.length<3)add('healthPost','Healthcare age 65+',u.currency(i.healthPost)+'/yr','Test a more conservative healthcare estimate');
    }else if(s.successPct<90){
      add('spendAnnual','Annual spending',u.currency(i.spendAnnual)+'/yr','Test 5–10% lower');
      if(i.retire>i.age)add('retire','Retirement age',String(i.retire),'Test 1–2 years later');
      add('healthPost','Healthcare age 65+',u.currency(i.healthPost)+'/yr','Test a higher cost or healthcare stress');
      if(i.ssAnnual>0&&recs.length<3)add('ssClaimAge','Social Security claiming age',String(i.ssClaimAge||67),'Compare another SSA claiming-age estimate');
    }else{
      add('spendAnnual','Annual spending',u.currency(i.spendAnnual)+'/yr','Test 5–10% higher to measure margin');
      if(i.retire>i.age)add('retire','Retirement age',String(i.retire),'Test 1 year earlier');
      add('expReturnPct','Expected return',i.expReturnPct+'%','Test 1 percentage point lower');
      if(recs.length<3)add('healthPost','Healthcare age 65+',u.currency(i.healthPost)+'/yr','Test a higher healthcare assumption');
    }
    return recs.slice(0,3);
  }

  App.results={
    getRecommendedAssumptions:recommendations,
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
        const ssText=s.inputs.ssAnnual>0?` Social Security is modeled to begin at age ${s.inputs.ssClaimAge||67}.`:'';
        e.textContent=`Across ${s.runs.toLocaleString()} simulated market paths, the plan remained funded through the modeled lifetime in ${s.successPct.toFixed(1)}% of cases. The median portfolio at retirement is ${u.currency(s.portAtRet)} and the median ending balance is ${u.currency(last)}.${ssText}`;
      }
      this.guidance(s);
      this.assumptions(s);
    },
    guidance(s){
      const el=$('guidanceText');if(!el)return;
      const recs=recommendations(s);let lead='';
      if(s.successPct>=90)lead='The plan appears resilient under the assumptions you entered. Use the highlighted assumptions below to test how much margin the plan has.';
      else if(s.successPct>=75)lead='The plan works in many outcomes, but several assumptions can materially change the result. Start with the highlighted assumptions below.';
      else lead='The plan shows a meaningful risk of running short before the end of the modeled lifetime. Start by testing the highlighted assumptions below.';
      el.innerHTML='<p><strong>'+lead+'</strong></p><ul>'+recs.map(r=>'<li><strong>'+r.label+':</strong> '+r.direction+'.</li>').join('')+'</ul>';
    },
    assumptions(s){
      const i=s.inputs,el=$('assumptionGrid');if(!el)return;
      const scope=i.healthScope==='individual'?'Individual':'Household';
      const shock=i.stressHealthSpike===1?'50% increase beginning at age 80':i.stressHealthSpike===2?'75% increase beginning at age 75':'Off';
      const recs=recommendations(s),recMap=Object.fromEntries(recs.map(r=>[r.key,r]));
      const rows=[
        ['expReturnPct','Return',i.expReturnPct+'%'],['volPct','Volatility',i.volPct+'%'],['genInflPct','General inflation',i.genInflPct+'%'],
        ['healthScope','Healthcare cost basis',scope],['healthPre','Healthcare before 65',u.currency(i.healthPre)+'/yr'],['healthPost','Healthcare age 65+',u.currency(i.healthPost)+'/yr'],['healthInfPct','Healthcare inflation',i.healthInfPct+'%'],['stressHealthSpike','Healthcare stress test',shock],
        ['spendAnnual','Annual spending',u.currency(i.spendAnnual)],['ssAnnual','Social Security estimate (today\'s $)',u.currency(i.ssAnnual)+'/yr'],['ssClaimAge','Social Security claiming age',i.ssClaimAge||67],['pensionAnnual','Pension / guaranteed income',u.currency(i.pensionAnnual)],['retire','Retirement age',i.retire],['saveMonthly','Monthly savings',u.currency(i.saveMonthly)+'/mo'],['simsCount','Simulations',s.runs.toLocaleString()]
      ];
      el.innerHTML=rows.map(r=>{
        const rec=recMap[r[0]];
        const style=rec?'border:2px solid #f59e0b;background:#fffbeb;box-shadow:0 0 0 1px #fde68a inset;':'';
        const badge=rec?'<div style="margin-top:.2rem;font-size:.7rem;font-weight:800;color:#92400e">Recommended next test: '+rec.direction+'</div>':'';
        return '<div style="'+style+'"><strong>'+r[1]+':</strong> '+r[2]+badge+'</div>';
      }).join('');
    }
  };
})();