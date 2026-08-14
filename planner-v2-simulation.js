(function () {
  const App = window.App;

  function workerFactory() {
    const workerCode = `
      function randN() {
        let a = 0, b = 0;
        while (a === 0) a = Math.random();
        while (b === 0) b = Math.random();
        return Math.sqrt(-2 * Math.log(a)) * Math.cos(2 * Math.PI * b);
      }

      function percentile(sorted, p) {
        if (!sorted.length) return 0;
        const idx = Math.min(
          sorted.length - 1,
          Math.max(0, Math.floor((sorted.length - 1) * p))
        );
        return sorted[idx] || 0;
      }

      self.onmessage = function (event) {
        try {
          const i = event.data;

          const life = i.life + (i.stressLongLife === 1 ? 5 : (i.stressLongLife === 2 ? 10 : 0));
          const age = i.age;
          const retire = i.retire;
          const bal0 = i.bal;
          const accYears = Math.max(0, retire - age);
          const decYears = Math.max(0, life - retire);
          const totalYears = accYears + decYears;

          if (totalYears <= 0) {
            self.postMessage({ type: 'error', message: 'Life expectancy must be greater than retirement age.' });
            return;
          }

          const runs = Math.max(500, Math.min(50000, i.simsCount || 6000));
          const hist = Array.from({ length: totalYears }, function () { return []; });
          const fails = Array(decYears).fill(0);
          const ages = Array.from({ length: totalYears }, function (_, x) { return age + x; });

          const saveAnnual = i.saveMonthly * 12;
          const baseReturn = i.expReturnPct / 100;
          const volatility = i.volPct / 100;
          const flexibility = i.flexPct / 100;
          const taxRate = i.acctType === 'traditional'
            ? Math.min(0.8, (i.taxFedPct + i.taxStatePct) / 100)
            : 0;

          const inflation = i.stressInf === 1
            ? 0.04
            : (i.stressInf === 2 ? 0.06 : i.genInflPct / 100);

          const healthInflation = i.healthInfPct / 100;
          const ssFactor = i.stressIncomeShock === 1
            ? 0.90
            : (i.stressIncomeShock === 2 ? 0.80 : 1.00);

          for (let n = 0; n < runs; n++) {
            let bal = bal0;
            let peak = bal;
            let failed = false;

            for (let y = 0; y < accYears; y++) {
              const r = baseReturn + volatility * randN();
              bal = Math.max(0, bal * (1 + r) + saveAnnual);
              peak = Math.max(peak, bal);
              hist[y].push(bal);
            }

            for (let y = 0; y < decYears; y++) {
              const t = accYears + y;
              const ageNow = age + t;
              const earlyRetirementYears = y < 10;

              let r = baseReturn + volatility * randN();
              if (earlyRetirementYears && i.stressLowRet === 1) r -= 0.02;
              if (earlyRetirementYears && i.stressLowRet === 2) r -= 0.04;
              if (earlyRetirementYears && i.stressSOR === 1) r -= 0.02;
              if (earlyRetirementYears && i.stressSOR === 2) r -= 0.035;

              let healthcare = (ageNow < 65 ? i.healthPre : i.healthPost) *
                Math.pow(1 + healthInflation, t);

              if (i.stressHealthSpike === 1 && ageNow >= 80) healthcare *= 1.50;
              if (i.stressHealthSpike === 2 && ageNow >= 75) healthcare *= 1.75;

              const guaranteedIncome =
                (i.ssAnnual * ssFactor + i.pensionAnnual) * Math.pow(1.02, t);

              let portfolioNeed =
                i.spendAnnual * Math.pow(1 + inflation, t) + healthcare - guaranteedIncome;

              if (portfolioNeed < 0) portfolioNeed = 0;
              if (taxRate > 0) portfolioNeed /= (1 - taxRate);

              if (flexibility > 0 && bal < peak * (1 - flexibility)) {
                portfolioNeed *= (1 - flexibility);
              }

              bal = Math.max(0, bal * (1 + r) - portfolioNeed);
              peak = Math.max(peak, bal);
              hist[t].push(bal);

              if (!failed && bal <= 0) {
                fails[y]++;
                failed = true;
              }
            }

            if (n % 250 === 0) {
              self.postMessage({
                type: 'progress',
                value: Math.round((n / runs) * 100)
              });
            }
          }

          const p10 = [], p25 = [], p50 = [], p75 = [], p90 = [];
          for (let y = 0; y < totalYears; y++) {
            const sorted = hist[y].slice().sort(function (a, b) { return a - b; });
            p10[y] = percentile(sorted, 0.10);
            p25[y] = percentile(sorted, 0.25);
            p50[y] = percentile(sorted, 0.50);
            p75[y] = percentile(sorted, 0.75);
            p90[y] = percentile(sorted, 0.90);
          }

          const totalFails = fails.reduce(function (a, b) { return a + b; }, 0);
          const successPct = ((runs - totalFails) / runs) * 100;
          const portAtRet = accYears > 0 ? (p50[accYears - 1] || 0) : bal0;

          const healthAtRet =
            (retire < 65 ? i.healthPre : i.healthPost) * Math.pow(1 + healthInflation, accYears);

          const incomeAtRet =
            (i.ssAnnual * ssFactor + i.pensionAnnual) * Math.pow(1.02, accYears);

          const spendingAtRet = i.spendAnnual * Math.pow(1 + inflation, accYears);
          const firstPortfolioNeed = Math.max(0, spendingAtRet + healthAtRet - incomeAtRet);
          const initialWithdrawalPct = portAtRet > 0
            ? (firstPortfolioNeed / portAtRet) * 100
            : 0;

          let peakMedian = p50[0] || 0;
          let worstDD = 0;
          for (let x = 1; x < p50.length; x++) {
            peakMedian = Math.max(peakMedian, p50[x]);
            if (peakMedian > 0) {
              worstDD = Math.min(worstDD, ((p50[x] - peakMedian) / peakMedian) * 100);
            }
          }

          const failIndex = fails.findIndex(function (v) { return v > 0; });
          const failAge = failIndex < 0 ? null : retire + failIndex;

          self.postMessage({
            type: 'result',
            data: {
              inputs: i,
              runs: runs,
              ages: ages,
              accYears: accYears,
              decYears: decYears,
              p10: p10,
              p25: p25,
              p50: p50,
              p75: p75,
              p90: p90,
              fails: fails,
              successPct: successPct,
              portAtRet: portAtRet,
              initialWithdrawalPct: initialWithdrawalPct,
              worstDrawdownPct: worstDD,
              failAge: failAge,
              adjFirstYearSpend: spendingAtRet,
              healthAtRet: healthAtRet
            }
          });
        } catch (err) {
          self.postMessage({
            type: 'error',
            message: err && err.message ? err.message : String(err)
          });
        }
      };
    `;

    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    const worker = new Worker(url);
    worker._blobUrl = url;
    return worker;
  }

  App.sim = {
    worker: null,

    init() {
      const btn = $('runBtn');
      if (btn) btn.addEventListener('click', () => this.run());
    },

    resetUi(message) {
      const btn = $('runBtn');
      const status = $('simStatus');
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Run Monte Carlo Simulation';
      }
      if (status && message) status.textContent = message;
    },

    stopWorker() {
      if (!this.worker) return;
      const url = this.worker._blobUrl;
      this.worker.terminate();
      if (url) URL.revokeObjectURL(url);
      this.worker = null;
    },

    run() {
      const inputs = App.inputs.read();
      const errors = App.inputs.validate(inputs);

      if (errors.length) {
        alert(errors.join('\n'));
        return;
      }

      this.stopWorker();

      const btn = $('runBtn');
      const status = $('simStatus');
      const progress = $('simProgress');
      const fill = $('simProgressFill');

      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Running simulations…';
      }
      if (status) {
        status.textContent = 'Testing ' + inputs.simsCount.toLocaleString() + ' possible retirement paths…';
      }
      if (progress) progress.style.display = 'block';
      if (fill) fill.style.width = '2%';

      try {
        this.worker = workerFactory();
      } catch (err) {
        console.error('Worker creation error:', err);
        this.resetUi('Could not start the simulation engine in this browser.');
        return;
      }

      this.worker.onmessage = (event) => {
        const msg = event.data || {};

        if (msg.type === 'progress') {
          if (fill) fill.style.width = Math.max(2, msg.value || 0) + '%';
          return;
        }

        if (msg.type === 'error') {
          console.error('Simulation worker error:', msg.message);
          this.resetUi('Simulation error: ' + msg.message);
          this.stopWorker();
          return;
        }

        if (msg.type === 'result') {
          App.state.simResults = msg.data;
          if (fill) fill.style.width = '100%';
          if (status) {
            status.textContent = 'Simulation complete. Change any input and run again to compare another option.';
          }
          if (btn) {
            btn.disabled = false;
            btn.textContent = 'Run Monte Carlo Simulation';
          }

          App.results.update();
          App.charts.draw();
          App.table.draw();
          App.sections.open('row-dash');
          this.stopWorker();
        }
      };

      this.worker.onerror = (event) => {
        console.error('Worker runtime error:', event);
        const detail = event && event.message ? event.message : 'Unknown worker error';
        this.resetUi('Simulation engine error: ' + detail);
        this.stopWorker();
      };

      this.worker.postMessage(inputs);
    }
  };
})();