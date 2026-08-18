(function(){
  const App=window.App;
  if(!App)return;
  const u=App.utils;

  function loadJsPDF(done){
    if(window.jspdf&&window.jspdf.jsPDF){done();return;}
    const existing=document.querySelector('script[data-planner-jspdf]');
    if(existing){existing.addEventListener('load',done,{once:true});return;}
    const s=document.createElement('script');
    s.src='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    s.dataset.plannerJspdf='1';s.onload=done;
    s.onerror=()=>alert('The PDF library could not be loaded. Check your internet connection and try again.');
    document.head.appendChild(s);
  }

  function stressText(i){
    const parts=[];
    if(i.stressSOR===1)parts.push('Mild bad-first-10-years stress');
    if(i.stressSOR===2)parts.push('Severe bad-first-10-years stress');
    if(i.stressInf===1)parts.push('4% inflation stress');
    if(i.stressInf===2)parts.push('6% inflation stress');
    if(i.stressLowRet===1)parts.push('Low-return decade: -2 percentage points');
    if(i.stressLowRet===2)parts.push('Low-return decade: -4 percentage points');
    if(i.stressIncomeShock===1)parts.push('Social Security reduced 10%');
    if(i.stressIncomeShock===2)parts.push('Social Security reduced 20%');
    if(i.stressHealthSpike===1)parts.push('Healthcare +50% from age 80');
    if(i.stressHealthSpike===2)parts.push('Healthcare +75% from age 75');
    if(i.stressLongLife===1)parts.push('Longevity +5 years');
    if(i.stressLongLife===2)parts.push('Longevity +10 years');
    return parts.length?parts.join('; '):'None';
  }

  function assumptions(sim){const i=sim.inputs;return [
    ['Current age',i.age],['Retirement age',i.retire],['Life expectancy',i.life],
    ['Current balance',u.currency(i.bal)],['Monthly savings',u.currency(i.saveMonthly)],
    ['Annual retirement spending',u.currency(i.spendAnnual)],['Social Security estimate (today\'s dollars)',u.currency(i.ssAnnual)+'/yr'],
    ['Social Security claiming age',i.ssClaimAge||67],['Pension / guaranteed income',u.currency(i.pensionAnnual)],
    ['Spending flexibility',i.flexPct+'%'],['Account type',i.acctType],['Federal tax',i.taxFedPct+'%'],['State tax',i.taxStatePct+'%'],
    ['Expected return',i.expReturnPct+'%'],['Volatility',i.volPct+'%'],['General inflation',i.genInflPct+'%'],
    ['Healthcare basis',i.healthScope==='individual'?'Individual':'Household'],['Healthcare before 65',u.currency(i.healthPre)+'/yr'],
    ['Healthcare age 65+',u.currency(i.healthPost)+'/yr'],['Healthcare inflation',i.healthInfPct+'%'],['Stress tests',stressText(i)],
    ['Monte Carlo simulations',sim.runs.toLocaleString()]
  ];}

  function dashboard(sim){const last=sim.p50[sim.p50.length-1]||0;return [
    {label:'Success Rate',value:sim.successPct.toFixed(1)+'%',caption:'Percent of simulations funded through the modeled lifetime',primary:true,type:'success'},
    {label:'Initial Portfolio Withdrawal Rate',value:sim.initialWithdrawalPct.toFixed(2)+'%',caption:'First retirement-year portfolio need after modeled income and healthcare',primary:true},
    {label:'Median Final Balance',value:u.currency(last),caption:'Middle ending balance across all simulated outcomes',primary:true},
    {label:'Median Portfolio at Retirement',value:u.currency(sim.portAtRet)},
    {label:'Median-Series Decline',value:sim.worstDrawdownPct.toFixed(1)+'%'},
    {label:'First Failure Age',value:sim.failAge?'Age '+sim.failAge:'No failures in tested horizon'},
    {label:'Inflation-Adjusted Spending at Retirement',value:u.currency(sim.adjFirstYearSpend)},
    {label:'Modeled Healthcare Cost at Retirement',value:u.currency(sim.healthAtRet)}
  ];}

  const medianExplanation='The median represents the middle result among all simulated outcomes: half of the results are higher and half are lower. Unlike an average, a median is less affected by a small number of unusually high or low outcomes. In these charts, median values provide a useful view of a typical simulated path, while the surrounding ranges show how widely actual outcomes could vary.';

  function interpretationText(sim){
    if(sim.successPct>=90)return 'Under the assumptions entered, the scenario appears resilient across most simulated paths. The next useful step is to test the margin of safety by changing one assumption at a time — for example, earlier retirement, higher spending, lower returns, a different Social Security claiming age, or higher healthcare costs.';
    if(sim.successPct>=75)return 'The scenario remains funded in many simulated paths, but the result is sensitive enough that modest changes may matter. Compare spending, retirement age, savings, Social Security timing, healthcare, and investment assumptions individually to see which choices have the greatest effect.';
    return 'The scenario shows a meaningful risk of exhausting the modeled portfolio before the end of the planning horizon. Use the planner to explore combinations of lower spending, additional savings, later retirement, different Social Security timing, additional guaranteed income, and more conservative cost assumptions.';
  }

  function addReportButtons(){const grid=document.getElementById('assumptionGrid');if(!grid||document.getElementById('pdfBtn'))return;const row=document.createElement('div');row.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:.6rem;margin-top:.8rem;grid-column:1/-1';row.innerHTML='<button id="pdfBtn" class="run-btn" style="background:#1e40af">Export Simulation PDF</button><button id="fullReportBtn" class="run-btn" style="background:#0f766e">Generate Full Client Report</button>';grid.parentElement.appendChild(row);document.getElementById('pdfBtn').addEventListener('click',()=>App.reports.exportQuick());document.getElementById('fullReportBtn').addEventListener('click',()=>App.reports.exportFull());}
  function ensureResult(){const sim=App.state.simResults;if(!sim){alert('Please run a simulation first.');return null;}return sim;}

  function makeWriter(doc,opts={}){
    const W=opts.W||216,H=opts.H||279,M=opts.M||16,CW=W-2*M;let y=M,page=1;
    const footer=()=>{doc.setFontSize(7.5);doc.setTextColor(105);doc.text('Retirement Projection Summary',M,H-8);doc.text('For educational purposes only — not financial advice.',W/2,H-8,{align:'center'});doc.text('Page '+page,W-M,H-8,{align:'right'});doc.setTextColor(0);};
    const newPage=()=>{footer();doc.addPage();page++;y=M;};
    const need=h=>{if(y+h>H-16)newPage();};
    const heading=(t,size=16)=>{need(13);doc.setFontSize(size);doc.setFont(undefined,'bold');doc.setTextColor(30,64,175);doc.text(t,M,y);doc.setDrawColor(203,213,225);doc.line(M,y+2,W-M,y+2);doc.setFont(undefined,'normal');doc.setTextColor(0);y+=10;};
    const subheading=t=>{need(10);doc.setFontSize(11);doc.setFont(undefined,'bold');doc.setTextColor(51,65,85);doc.text(t,M,y);doc.setFont(undefined,'normal');doc.setTextColor(0);y+=7;};
    const para=t=>{doc.setFontSize(9.5);const lines=doc.splitTextToSize(t,CW);need(lines.length*4.7+4);doc.text(lines,M,y);y+=lines.length*4.7+4;};
    const rows=arr=>{doc.setFontSize(9);arr.forEach((r,idx)=>{need(6);if(idx%2===0){doc.setFillColor(248,250,252);doc.rect(M,y-4,CW,5.5,'F');}doc.setFont(undefined,'bold');doc.text(String(r[0]),M+2,y);doc.setFont(undefined,'normal');doc.text(String(r[1]),W-M-2,y,{align:'right'});y+=5.8;});y+=2;};

    const metricCard=(item,x,top,w,h,primary)=>{
      let fill=[248,250,252],border=[226,232,240],value=[15,23,42];
      if(item.type==='success'){
        if(parseFloat(item.value)>=90){fill=[240,253,244];border=[187,247,208];value=[21,128,61];}
        else if(parseFloat(item.value)>=75){fill=[255,251,235];border=[253,230,138];value=[180,83,9];}
        else {fill=[254,242,242];border=[254,202,202];value=[185,28,28];}
      }
      doc.setFillColor(...fill);doc.setDrawColor(...border);doc.roundedRect(x,top,w,h,2.2,2.2,'FD');
      doc.setFontSize(primary?7.2:7.4);doc.setTextColor(71,85,105);doc.text(item.label,x+3,top+5,{maxWidth:w-6});
      doc.setFontSize(primary?12.5:10.5);doc.setFont(undefined,'bold');doc.setTextColor(...value);doc.text(item.value,x+3,top+(primary?12.5:12));doc.setFont(undefined,'normal');
      if(item.caption){doc.setFontSize(6.7);doc.setTextColor(100,116,139);const lines=doc.splitTextToSize(item.caption,w-6);doc.text(lines,x+3,top+17);}
      doc.setTextColor(0);
    };

    const dashboardBox=sim=>{
      subheading('Results Dashboard');
      para('These measures mirror the web results dashboard and summarize the simulation at a glance. Read them together rather than treating any single value as a prediction.');
      const data=dashboard(sim),primary=data.filter(d=>d.primary),secondary=data.filter(d=>!d.primary);
      need(34);const gap=3,cardW=(CW-gap*2)/3,top=y;
      primary.forEach((item,j)=>metricCard(item,M+j*(cardW+gap),top,cardW,29,true));y+=33;
      for(let x=0;x<secondary.length;x+=3){need(20);const pair=secondary.slice(x,x+3),rowW=(CW-gap*(pair.length-1))/pair.length;pair.forEach((item,j)=>metricCard(item,M+j*(rowW+gap),y,rowW,17,false));y+=21;}
      y+=1;
    };

    const chart=(name,ch,explain)=>{if(!ch)return;newPage();heading(name);if(explain)para(explain);need(88);doc.addImage(ch.toBase64Image(),'PNG',M,y,CW,82);y+=88;};
    return {W,H,M,CW,get y(){return y;},set y(v){y=v;},newPage,heading,subheading,para,rows,dashboardBox,chart,footer,need};
  }

  App.reports={init:addReportButtons,
    exportQuick(){const sim=ensureResult();if(!sim)return;loadJsPDF(()=>{try{
      const {jsPDF}=window.jspdf,doc=new jsPDF('p','mm','letter'),w=makeWriter(doc);const last=sim.p50[sim.p50.length-1]||0;
      doc.setFontSize(22);doc.setFont(undefined,'bold');doc.setTextColor(30,64,175);doc.text('Retirement Projection Summary',w.W/2,30,{align:'center'});doc.setFont(undefined,'normal');doc.setTextColor(0);doc.setFontSize(10);doc.text('Monte Carlo scenario analysis',w.W/2,39,{align:'center'});doc.setFontSize(8.5);doc.text('Educational planning tool — not financial, tax, legal, or investment advice.',w.W/2,48,{align:'center'});w.y=63;
      w.heading('Input Summary');w.para('The assumptions below define this scenario. The results dashboard is included here so the inputs and their modeled outcome can be reviewed together.');w.rows(assumptions(sim));w.dashboardBox(sim);
      w.heading('Interpretation & Next Steps');w.para(interpretationText(sim));w.para(`Across ${sim.runs.toLocaleString()} simulated market paths, the plan remained funded through the modeled lifetime in ${sim.successPct.toFixed(1)}% of cases. The median portfolio at retirement is ${u.currency(sim.portAtRet)} and the median ending balance is ${u.currency(last)}. Use these results to compare scenarios rather than as a forecast of one expected future.`);w.subheading('Stress-Test Configuration');w.para(stressText(sim.inputs));
      w.newPage();w.heading('Charts');w.para(medianExplanation);const charts=[['Portfolio Outcomes by Age',App.charts?.chart1],['Typical Portfolio Path',App.charts?.chart2],['First Failure Age Distribution',App.charts?.chart3],['Portfolio Decline from Prior Median High',App.charts?.chart4]];charts.forEach(([n,ch])=>{if(!ch)return;w.subheading(n);w.need(72);doc.addImage(ch.toBase64Image(),'PNG',w.M,w.y,w.CW,68);w.y+=75;});
      w.footer();doc.save('Retirement_Simulation_Report.pdf');
    }catch(err){console.error('Quick PDF error',err);alert('PDF export failed. See the browser console for details.');}});},

    exportFull(){const sim=ensureResult();if(!sim)return;loadJsPDF(()=>{try{
      const {jsPDF}=window.jspdf,doc=new jsPDF('p','mm','letter'),w=makeWriter(doc);const last=sim.p50[sim.p50.length-1]||0;
      doc.setFontSize(25);doc.setFont(undefined,'bold');doc.setTextColor(30,64,175);doc.text('Retirement Plan Analysis Report',w.W/2,39,{align:'center'});doc.setFont(undefined,'normal');doc.setTextColor(0);doc.setFontSize(11);doc.text('Retirement Projection Summary',w.W/2,50,{align:'center'});doc.setFontSize(9);doc.text('Based on the most recent Monte Carlo simulation',w.W/2,59,{align:'center'});doc.text('For educational purposes only — not financial advice.',w.W/2,68,{align:'center'});w.y=88;w.para('This report is designed to help you understand how the assumptions entered into the planner perform across many possible future market paths. It is a scenario-analysis document, not a prediction. Its value is in showing trade-offs, areas of sensitivity, and questions worth exploring before retirement decisions become difficult to change.');
      w.newPage();w.heading('Executive Summary');w.para(`The plan remained funded through the modeled lifetime in ${sim.successPct.toFixed(1)}% of ${sim.runs.toLocaleString()} simulated market paths. The median portfolio at retirement was ${u.currency(sim.portAtRet)}, and the median ending balance was ${u.currency(last)}.`);w.para(`The modeled first-year portfolio withdrawal requirement was ${sim.initialWithdrawalPct.toFixed(2)}% of the median retirement portfolio after incorporating spending, guaranteed income, healthcare, and the simplified tax assumptions entered in the planner.`);if(sim.inputs.ssAnnual>0)w.para(`Social Security was modeled to begin at age ${sim.inputs.ssClaimAge||67}, using the annual benefit estimate entered in today's dollars. No Social Security income was applied before that age; the model then applies 2% annual benefit growth.`);
      w.heading('Input Summary');w.para('The following assumptions define this scenario. Changing even one of them can materially change the result, which is why the planner is most useful when comparing several reasonable alternatives. The dashboard immediately below mirrors the web results page so the assumptions and outcome can be reviewed together.');w.rows(assumptions(sim));w.dashboardBox(sim);
      w.heading('Interpretation & Next Steps');w.para(interpretationText(sim));w.subheading('Stress-Test Configuration');w.para(stressText(sim.inputs));
      w.newPage();w.heading('Charts');w.para(medianExplanation);w.para('The charts that follow should be read as a range of possible simulated outcomes. They are most useful for understanding uncertainty, downside exposure, and how the portfolio may behave over time—not for selecting one line as the future that will occur.');
      w.chart('Portfolio Outcomes by Age',App.charts?.chart1,'This chart shows the spread of simulated portfolio values over time. The median traces the middle simulated outcome, while the surrounding ranges illustrate how much results may differ as market sequences change.');
      w.chart('Typical Portfolio Path',App.charts?.chart2,'This chart focuses on the median simulated portfolio path. It is useful for seeing the general shape of the scenario over time, but it should always be considered alongside the wider outcome ranges and the success rate.');
      w.chart('First Failure Age Distribution',App.charts?.chart3,'When simulations run out of portfolio assets, this chart shows the ages at which those first failures occur. A concentration of failures at younger ages can identify a period where the scenario is particularly vulnerable.');
      w.chart('Portfolio Decline from Prior Median High',App.charts?.chart4,'This chart illustrates declines in the median series from its prior high. It helps put potential drawdowns into context and shows why the timing of poor returns can matter during retirement.');
      w.newPage();w.heading('Appendix A — Year-by-Year Projection');w.para('The year-by-year table provides the detailed values behind the charts. The 10th, median, and 90th percentile columns show a lower, middle, and higher simulated portfolio outcome for each modeled year.');const trs=[...document.querySelectorAll('#yearTable tbody tr')];doc.setFontSize(7.5);trs.forEach(tr=>{w.need(5);const c=[...tr.children].map(x=>x.textContent.trim());doc.text(c.join('   |   '),w.M,w.y);w.y+=4.3;});
      w.newPage();w.heading('Appendix B — Understanding the Simulation');w.para('Monte Carlo simulation does not predict the market. It repeats the retirement calculation many times using different randomly generated sequences of investment returns based on the return and volatility assumptions entered. The success rate is the percentage of those simulated paths in which the modeled portfolio remained funded through the selected lifetime.');w.para(medianExplanation);w.para('Percentile ranges are included because retirement outcomes are uncertain. A 10th-percentile value is not a guaranteed worst case, and a 90th-percentile value is not a promised best case. They are reference points within the simulated distribution that help show the range produced by the assumptions.');
      w.heading('Appendix C — Important Limitations');w.para('Results depend on the assumptions entered and the simplified modeling rules in this planner. Social Security estimates can change with future earnings, claiming age, law, and inflation. Actual taxes, Medicare costs, investment returns, sequence of returns, inflation, healthcare needs, long-term care, spending behavior, and personal circumstances may differ materially. The model does not replace individualized financial, tax, legal, insurance, or medical advice.');w.para('Use this report to compare scenarios and identify decisions or assumptions that deserve further investigation. Do not treat any single success rate, median value, percentile, or chart as a forecast or guarantee.');
      w.footer();doc.save('Client_Retirement_Report.pdf');
    }catch(err){console.error('Full report error',err);alert('Full report generation failed. See the browser console for details.');}});}
  };
  window.addEventListener('DOMContentLoaded',addReportButtons);
})();