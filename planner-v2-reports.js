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
    s.dataset.plannerJspdf='1';
    s.onload=done;
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

  function assumptions(sim){
    const i=sim.inputs;
    return [
      ['Current age',i.age],['Retirement age',i.retire],['Life expectancy',i.life],
      ['Current balance',u.currency(i.bal)],['Monthly savings',u.currency(i.saveMonthly)],
      ['Annual retirement spending',u.currency(i.spendAnnual)],['Social Security',u.currency(i.ssAnnual)],
      ['Pension / guaranteed income',u.currency(i.pensionAnnual)],['Spending flexibility',i.flexPct+'%'],
      ['Account type',i.acctType],['Federal tax',i.taxFedPct+'%'],['State tax',i.taxStatePct+'%'],
      ['Expected return',i.expReturnPct+'%'],['Volatility',i.volPct+'%'],['General inflation',i.genInflPct+'%'],
      ['Healthcare basis',i.healthScope==='individual'?'Individual':'Household'],
      ['Healthcare before 65',u.currency(i.healthPre)+'/yr'],['Healthcare age 65+',u.currency(i.healthPost)+'/yr'],
      ['Healthcare inflation',i.healthInfPct+'%'],['Stress tests',stressText(i)],['Simulations',sim.runs.toLocaleString()]
    ];
  }

  function addReportButtons(){
    const grid=document.getElementById('assumptionGrid');
    if(!grid||document.getElementById('pdfBtn'))return;
    const row=document.createElement('div');
    row.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:.6rem;margin-top:.8rem;grid-column:1/-1';
    row.innerHTML='<button id="pdfBtn" class="run-btn" style="background:#1e40af">Export Simulation PDF</button><button id="fullReportBtn" class="run-btn" style="background:#0f766e">Generate Full Client Report</button>';
    grid.parentElement.appendChild(row);
    document.getElementById('pdfBtn').addEventListener('click',()=>App.reports.exportQuick());
    document.getElementById('fullReportBtn').addEventListener('click',()=>App.reports.exportFull());
  }

  function ensureResult(){const sim=App.state.simResults;if(!sim){alert('Please run a simulation first.');return null;}return sim;}

  App.reports={
    init:addReportButtons,
    exportQuick(){
      const sim=ensureResult();if(!sim)return;
      loadJsPDF(()=>{
        try{
          const {jsPDF}=window.jspdf;const doc=new jsPDF('p','mm','a4');let y=14;
          const last=sim.p50[sim.p50.length-1]||0;
          doc.setFontSize(20);doc.text('Retirement Simulation Summary',105,y,{align:'center'});y+=9;
          doc.setFontSize(9);doc.text('Educational planning tool — not financial, tax, legal, or investment advice.',105,y,{align:'center'});y+=10;
          doc.setFontSize(12);
          const rows=[['Simulations',sim.runs.toLocaleString()],['Success rate',sim.successPct.toFixed(1)+'%'],['Initial portfolio withdrawal rate',sim.initialWithdrawalPct.toFixed(2)+'%'],['Median portfolio at retirement',u.currency(sim.portAtRet)],['Median final balance',u.currency(last)],['Modeled healthcare cost at retirement',u.currency(sim.healthAtRet)],['Median-series decline',sim.worstDrawdownPct.toFixed(1)+'%'],['First failure age',sim.failAge?String(sim.failAge):'None in modeled horizon']];
          rows.forEach(r=>{doc.text(r[0]+': '+r[1],12,y);y+=6;});
          y+=4;doc.setFontSize(13);doc.text('Key Assumptions',12,y);y+=7;doc.setFontSize(9);
          assumptions(sim).forEach(r=>{if(y>280){doc.addPage();y=15;}doc.text(r[0]+': '+r[1],14,y);y+=5;});
          const charts=[App.charts?.chart1,App.charts?.chart2,App.charts?.chart3,App.charts?.chart4];
          charts.forEach(ch=>{if(!ch)return;if(y+72>285){doc.addPage();y=12;}doc.addImage(ch.toBase64Image(),'PNG',10,y,190,70);y+=77;});
          doc.save('Retirement_Simulation_Report.pdf');
        }catch(err){console.error('Quick PDF error',err);alert('PDF export failed. See the browser console for details.');}
      });
    },
    exportFull(){
      const sim=ensureResult();if(!sim)return;
      loadJsPDF(()=>{
        try{
          const {jsPDF}=window.jspdf;const doc=new jsPDF('p','mm','letter');const W=216,H=279,M=16,CW=W-2*M;let y=M,page=1;
          const newPage=()=>{doc.setFontSize(8);doc.setTextColor(120);doc.text('Page '+page,W-M,H-8,{align:'right'});doc.addPage();page++;y=M;doc.setTextColor(0);};
          const title=t=>{if(y>H-28)newPage();doc.setFontSize(17);doc.setFont(undefined,'bold');doc.text(t,M,y);doc.setFont(undefined,'normal');y+=9;};
          const para=t=>{doc.setFontSize(10);const lines=doc.splitTextToSize(t,CW);if(y+lines.length*5>H-16)newPage();doc.text(lines,M,y);y+=lines.length*5+3;};
          const row=(a,b)=>{if(y>H-15)newPage();doc.setFontSize(9);doc.text(String(a),M,y);doc.text(String(b),W-M,y,{align:'right'});y+=5;};
          doc.setFontSize(24);doc.text('Retirement Plan Analysis Report',W/2,38,{align:'center'});doc.setFontSize(11);doc.text('Based on your most recent Monte Carlo simulation',W/2,49,{align:'center'});doc.setFontSize(9);doc.text('Educational use only — not financial, investment, tax, or legal advice.',W/2,60,{align:'center'});
          y=82;para('This report explores how the retirement assumptions you entered perform across many possible future market paths. It is designed to help you compare alternatives and identify assumptions that deserve more attention, not to predict a single future outcome.');
          newPage();title('Executive Summary');const last=sim.p50[sim.p50.length-1]||0;
          para(`The plan remained funded through the modeled lifetime in ${sim.successPct.toFixed(1)}% of ${sim.runs.toLocaleString()} simulated market paths. The median portfolio at retirement was ${u.currency(sim.portAtRet)} and the median ending balance was ${u.currency(last)}.`);
          para(`The modeled first-year portfolio withdrawal requirement was ${sim.initialWithdrawalPct.toFixed(2)}% of the median retirement portfolio after incorporating the entered spending, guaranteed income, and healthcare assumptions. Modeled healthcare cost at retirement was ${u.currency(sim.healthAtRet)}.`);
          title('Input Assumptions');assumptions(sim).forEach(r=>row(r[0],r[1]));
          title('Stress-Test Configuration');para(stressText(sim.inputs));
          title('How to Interpret the Result');
          if(sim.successPct>=90)para('The plan appears resilient under the assumptions entered. A useful next step is to deliberately make one assumption less favorable at a time — such as earlier retirement, higher spending, lower returns, or higher healthcare costs — to understand the margin of safety.');
          else if(sim.successPct>=75)para('The plan works in many simulated outcomes but is sensitive enough that modest changes may materially improve or weaken it. Compare spending, retirement age, savings, healthcare, and return assumptions one at a time.');
          else para('The plan shows a meaningful risk of exhausting the modeled portfolio. Use the planner to test lower spending, increased savings, later retirement, additional guaranteed income, and more conservative healthcare assumptions before relying on the current plan.');
          const charts=[['Portfolio Outcomes by Age',App.charts?.chart1],['Typical Portfolio Path',App.charts?.chart2],['First Failure Age Distribution',App.charts?.chart3],['Portfolio Decline from Prior Median High',App.charts?.chart4]];
          charts.forEach(([name,ch])=>{if(!ch)return;newPage();title(name);doc.addImage(ch.toBase64Image(),'PNG',M,y,CW,82);y+=88;});
          newPage();title('Year-by-Year Projection');const trs=[...document.querySelectorAll('#yearTable tbody tr')];doc.setFontSize(8);trs.forEach(tr=>{if(y>H-14)newPage();const c=[...tr.children].map(x=>x.textContent.trim());doc.text(c.join('   |   '),M,y);y+=4.5;});
          newPage();title('Important Limitations');para('Monte Carlo results depend on the assumptions entered and the simplified modeling rules in this planner. Actual taxes, Social Security rules, Medicare costs, investment behavior, sequence of returns, inflation, healthcare needs, long-term care, and personal circumstances may differ materially. This report is intended to support education and scenario exploration and should not be treated as a recommendation or guarantee.');
          doc.setFontSize(8);doc.setTextColor(120);doc.text('Page '+page,W-M,H-8,{align:'right'});doc.save('Client_Retirement_Report.pdf');
        }catch(err){console.error('Full report error',err);alert('Full report generation failed. See the browser console for details.');}
      });
    }
  };

  window.addEventListener('DOMContentLoaded',addReportButtons);
})();
