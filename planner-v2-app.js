(function(){
  window.App=window.App||{};
  const App=window.App;
  App.state=App.state||{};
  App.utils=App.utils||{};
  const u=App.utils;

  window.$=window.$||function(id){return document.getElementById(id)};
  u.num=v=>Number(String(v??'').replace(/,/g,''))||0;
  u.currency=v=>'$'+Math.round(Number(v)||0).toLocaleString();
  u.pct=(v,d=1)=>(Number(v)||0).toFixed(d)+'%';

  function setSection(t,open){
    const r=$(t.dataset.target),a=t.querySelector('.arrow');
    if(!r||!a)return;
    r.style.display=open?'block':'none';
    a.textContent=open?'▼':'►';
    t.setAttribute('aria-expanded',String(open));
  }

  App.sections={
    init(){
      document.querySelectorAll('.section-toggle').forEach(t=>{
        setSection(t,t.dataset.target==='row-basics');
        t.addEventListener('click',()=>{
          const r=$(t.dataset.target);
          if(r)setSection(t,r.style.display==='none');
        });
      });
      const c=$('compactToggle');
      if(c)c.addEventListener('click',()=>{
        const on=!document.body.classList.contains('compact');
        document.body.classList.toggle('compact',on);
        c.textContent=on?'Compact Mode: ON':'Compact Mode: OFF';
      });
    },
    open(id){
      const t=document.querySelector('.section-toggle[data-target="'+id+'"]');
      if(t)setSection(t,true);
    }
  };

  function enhanceSocialSecurityInputs(){
    const ss=$('i_ss');
    if(!ss||$('i_ssClaimAge'))return;

    const ssRow=ss.closest('.input-row');
    if(!ssRow)return;

    const label=ssRow.querySelector('label');
    const tip=ssRow.querySelector('.tip');
    if(label)label.textContent='Estimated Social Security at Claiming Age ($/yr)';
    if(tip)tip.setAttribute('data-tip','Use your personalized Social Security retirement estimate for the age you expect to claim. Enter the annual amount in today\'s dollars; if SSA shows a monthly amount, multiply by 12.');

    const claimRow=document.createElement('div');
    claimRow.className='input-row';
    claimRow.innerHTML='<span class="tip" data-tip="The age you expect Social Security retirement benefits to begin. Retirement and Social Security claiming ages do not have to be the same. Standard retirement benefits can generally start from age 62 through age 70.">ⓘ</span><label for="i_ssClaimAge">Social Security Claiming Age</label><input id="i_ssClaimAge" type="number" min="62" max="70" step="1" value="67">';
    ssRow.insertAdjacentElement('afterend',claimRow);

    const grid=ssRow.closest('.input-grid');
    if(grid&&!$('ssEstimateHelp')){
      const note=document.createElement('div');
      note.id='ssEstimateHelp';
      note.className='health-note';
      note.style.gridColumn='1 / -1';
      note.innerHTML='<strong>How to estimate Social Security:</strong> Use your personalized estimate from the official <a href="https://www.ssa.gov/prepare/get-benefits-estimate" target="_blank" rel="noopener noreferrer">Social Security Administration benefit estimator</a>. Choose the age you expect benefits to begin, use the estimate shown in <strong>today\'s dollars</strong>, and enter the annual amount above. If the estimate is monthly, multiply it by 12. The planner applies no Social Security income before the claiming age and models 2% annual benefit growth thereafter.';
      grid.insertAdjacentElement('afterend',note);
    }
  }

  App.inputs={
    init(){
      enhanceSocialSecurityInputs();
      const a=$('i_alloc');
      if(a)a.addEventListener('change',()=>{
        const p=a.value.split(',');
        if($('i_ret'))$('i_ret').value=p[0];
        if($('i_vol'))$('i_vol').value=p[1];
      });
    },
    read(){
      return{
        age:u.num($('i_age')?.value),
        retire:u.num($('i_retire')?.value),
        life:u.num($('i_life')?.value),
        bal:u.num($('i_bal')?.value),
        saveMonthly:u.num($('i_save')?.value),
        spendAnnual:u.num($('i_spend')?.value),
        ssAnnual:u.num($('i_ss')?.value),
        ssClaimAge:u.num($('i_ssClaimAge')?.value)||67,
        pensionAnnual:u.num($('i_pension')?.value),
        flexPct:u.num($('i_flex')?.value),
        taxFedPct:u.num($('i_taxFed')?.value),
        taxStatePct:u.num($('i_taxState')?.value),
        acctType:$('i_type')?.value||'roth',
        expReturnPct:u.num($('i_ret')?.value),
        volPct:u.num($('i_vol')?.value),
        genInflPct:u.num($('i_inf')?.value),
        healthScope:$('i_healthScope')?.value||'household',
        healthPre:u.num($('i_healthPre')?.value),
        healthPost:u.num($('i_healthPost')?.value),
        healthInfPct:u.num($('i_healthInf')?.value),
        stressSOR:u.num($('i_stressSOR')?.value),
        stressInf:u.num($('i_stressInf')?.value),
        stressLowRet:u.num($('i_stressLowRet')?.value),
        stressIncomeShock:u.num($('i_stressIncomeShock')?.value),
        stressHealthSpike:u.num($('i_stressHealthSpike')?.value),
        stressLongLife:u.num($('i_stressLongLife')?.value),
        simsCount:u.num($('runSimCount')?.value)||6000
      };
    },
    validate(i){
      const e=[];
      if(i.age<18||i.age>100)e.push('Current age must be between 18 and 100.');
      if(i.retire<i.age)e.push('Retirement age cannot be earlier than current age.');
      if(i.life<=i.retire)e.push('Life expectancy must be greater than retirement age.');
      if(i.ssAnnual>0&&(i.ssClaimAge<62||i.ssClaimAge>70))e.push('Social Security claiming age must be between 62 and 70.');
      if(i.expReturnPct<-20||i.expReturnPct>20)e.push('Expected return must be between -20% and 20%.');
      if(i.volPct<0||i.volPct>40)e.push('Volatility must be between 0% and 40%.');
      return e;
    }
  };

  App.table={
    draw(){
      const s=App.state.simResults;
      if(!s)return;
      const b=document.querySelector('#yearTable tbody');
      if(!b)return;
      b.innerHTML='';
      let surv=s.runs;
      const sy=new Date().getFullYear();
      for(let y=0;y<s.p50.length;y++){
        let success='—';
        if(y>=s.accYears){
          surv-=s.fails[y-s.accYears]||0;
          success=u.pct(100*surv/s.runs);
        }
        const tr=document.createElement('tr');
        tr.innerHTML='<td>'+(sy+y)+'</td><td>'+s.ages[y]+'</td><td>'+u.currency(s.p10[y])+'</td><td>'+u.currency(s.p50[y])+'</td><td>'+u.currency(s.p90[y])+'</td><td>'+success+'</td>';
        b.appendChild(tr);
      }
    }
  };

  window.addEventListener('DOMContentLoaded',()=>{
    App.sections.init();
    App.inputs.init();
    if(App.sim)App.sim.init();
    if(!document.querySelector('script[data-planner-reports]')){
      const s=document.createElement('script');
      s.src='planner-v2-reports.js';
      s.dataset.plannerReports='1';
      document.body.appendChild(s);
    }
  });
})();