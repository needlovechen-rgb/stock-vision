/**
 * Valuation Logic v2.2.0
 * Principles based on RD & Growth Analysis
 *
 * IMPORTANT: `externalMedianPE` should be passed from stockDataService.medianPE
 * It is calculated using annual high/low midpoints ÷ annual EPS — the correct method.
 * The internal fallback PE calculation is kept as a safety net only.
 */

export const calculateValuation = (
  data,
  assumptions = { growthRate: 0.05, discountRate: 0.1, terminalGrowth: 0.02 },
  externalMedianPE = null   // ← from stockDataService.medianPE (authoritative)
) => {
  if (!data || data.length === 0) return null;

  // Detect if it's an ETF or no-growth asset (all eps are 0)
  const isNoEps = data.every(d => (d.eps || 0) === 0);

  const currentPrice = data[data.length - 1].price;
  
  if (isNoEps) {
    return {
      currentPrice,
      isETF: true,
      pe: null, pb: null, dcf: null,
      riverData: data.map(d => ({ ...d, price: parseFloat(d.price.toFixed(2)) })),
      getStatus: () => 'NORMAL'
    };
  }

  const epsList = data.map(d => d.eps || 0);

  // Per-point TTM EPS for river chart visualization
  const peData = data.map((d, i) => {
    const ttmEps = epsList.slice(Math.max(0, i - 3), i + 1).reduce((a, b) => a + b, 0);
    return { ttmEps };
  });

  // ── 1. P/E Calibration ──────────────────────────────────────────────────────
  // Priority: use externally computed medianPE (from stockDataService, uses annual
  // high/low midpoint ÷ annual EPS — the CORRECT approach).
  // Fallback: try to derive from history points that DO have yearlyHigh/yearlyLow.
  let avgPE;

  if (externalMedianPE && externalMedianPE > 0) {
    // Use the authoritative value from stockDataService
    avgPE = externalMedianPE;
  } else {
    // Internal fallback: only works if history points have yearlyHigh / yearlyLow
    const yearlyMidPEs = [];
    const years = [...new Set(data.map(d => d.quarter?.split('-')[0]).filter(Boolean))];
    years.forEach(yr => {
      const yrData = data.filter(d => d.quarter?.startsWith(yr));
      if (yrData.length === 0) return;
      // Use yearlyHigh/yearlyLow injected by stockDataService (preferred)
      // Fall back to per-point price only as last resort
      const yrHigh = yrData[0].yearlyHigh || Math.max(...yrData.map(d => d.price));
      const yrLow  = yrData[0].yearlyLow  || Math.min(...yrData.map(d => d.price));
      const yrEps  = yrData.reduce((acc, d) => acc + (d.eps || 0), 0);
      if (yrEps > 0.1) yearlyMidPEs.push(((yrHigh + yrLow) / 2) / yrEps);
    });
    const validPE = yearlyMidPEs.sort((a, b) => a - b);
    avgPE = validPE.length > 0 ? validPE[Math.floor(validPE.length / 2)] : 15;
  }

  // Mild compression for very high PE stocks (e.g. growth stocks with PE > 30)
  if (avgPE > 30) avgPE = 30 + (avgPE - 30) * 0.4;
  const minPE = avgPE * 0.7;
  const maxPE = avgPE * 1.3;

  // ── 2. P/B Calibration (Asset-based) ──────────────────────────────────────
  const currentBVPS = data[data.length - 1].bvps || 20;
  const validPB = data
    .map(d => (d.bvps > 0) ? d.price / d.bvps : null)
    .filter(pb => pb !== null && pb > 0 && pb < 10)
    .sort((a, b) => a - b);
  const avgPB = validPB.length > 5 ? validPB.reduce((a, b) => a + b, 0) / validPB.length : 1.2;
  const minPB = validPB.length > 5 ? validPB[Math.floor(validPB.length * 0.2)] : 0.8;
  const maxPB = validPB.length > 5 ? validPB[Math.floor(validPB.length * 0.8)] : 2.0;

  // ── 3. River Data (per-quarter) ────────────────────────────────────────────
  const riverData = data.map((d, i) => {
    const ttmEps = peData[i].ttmEps;
    const currentPe = (ttmEps > 0) ? (d.price / ttmEps) : null;
    const currentPb = (d.bvps > 0) ? (d.price / d.bvps) : null;

    // PE fair value using the calibrated avgPE
    // Reality Clamping: cap at yearlyHigh to avoid inflated targets
    const rawFair = ttmEps * avgPE;
    const yHigh = d.yearlyHigh || d.price * 1.3;
    const yLow  = d.yearlyLow  || d.price * 0.7;
    const yrMid = (yHigh + yLow) / 2;
    let smoothFair = rawFair;
    
    if (ttmEps <= 0) {
      smoothFair = yrMid;
    } else {
      // 向上夾斷 (避免過高估值)
      if (rawFair > yHigh) smoothFair = yHigh;
      // 向下夾斷 (價值下限保護：不應低於年度低價的 85%)
      else if (rawFair < yLow * 0.85) smoothFair = (rawFair + yLow) / 2;
    }

    // DCF: Dynamic per-point (Resilient Model)
    let baseEps = ttmEps;
    if (baseEps <= 0) {
      const historicalPositives = peData.slice(0, i + 1).map(p => p.ttmEps).filter(e => e > 0);
      if (historicalPositives.length > 0) {
        historicalPositives.sort((a, b) => a - b);
        baseEps = historicalPositives[Math.floor(historicalPositives.length / 2)] * 0.5;
      } else {
        baseEps = (d.bvps || 20) * 0.05; // 5% ROE Floor
      }
    }

    const pointFCF = baseEps * 0.8;
    let pointDCF = 0;
    let pFCF = pointFCF;
    for (let j = 1; j <= 5; j++) {
      pFCF *= (1 + assumptions.growthRate);
      pointDCF += pFCF / Math.pow(1 + assumptions.discountRate, j);
    }
    const pTerm = (pFCF * (1 + assumptions.terminalGrowth)) / (Math.max(0.01, assumptions.discountRate - assumptions.terminalGrowth));
    pointDCF += pTerm / Math.pow(1 + assumptions.discountRate, 5);

    // Safety Floor: intrinsic value should not be below Book Value
    pointDCF = Math.max(pointDCF, d.bvps || 0);

    return {
      ...d,
      pe: currentPe ? parseFloat(currentPe.toFixed(2)) : null,
      pb: currentPb ? parseFloat(currentPb.toFixed(2)) : null,
      peCheap:     parseFloat((smoothFair * 0.85).toFixed(2)),
      peFair:      parseFloat(smoothFair.toFixed(2)),
      peExpensive: parseFloat((smoothFair * 1.15).toFixed(2)),
      pbCheap:     parseFloat(((d.bvps || 20) * minPB).toFixed(2)),
      pbFair:      parseFloat(((d.bvps || 20) * avgPB).toFixed(2)),
      pbExpensive: parseFloat(((d.bvps || 20) * maxPB).toFixed(2)),
      dcfCheap:    parseFloat((pointDCF * 0.8).toFixed(2)),
      dcfFair:     parseFloat((pointDCF).toFixed(2)),
      dcfExpensive:parseFloat((pointDCF * 1.2).toFixed(2)),
      price:       parseFloat(d.price.toFixed(2))
    };
  });

  const currentVal = riverData[riverData.length - 1];
  const finalPe  = { fair: currentVal.peFair,  cheap: currentVal.peCheap,  expensive: currentVal.peExpensive,  avg: avgPE, min: minPE, max: maxPE };
  const finalPb  = { fair: currentVal.pbFair,  cheap: currentVal.pbCheap,  expensive: currentVal.pbExpensive,  avg: avgPB, min: minPB, max: maxPB };
  const finalDcf = { value: currentVal.dcfFair, fair: currentVal.dcfFair, cheap: currentVal.dcfCheap, expensive: currentVal.dcfExpensive };

  return {
    currentPrice,
    pe: finalPe,
    pb: finalPb,
    dcf: finalDcf,
    riverData,
    avgPE,  // expose for debugging
    getStatus: (mode) => {
      const target = mode === 'PE' ? finalPe : (mode === 'PB' ? finalPb : finalDcf);
      if (currentPrice <= target.cheap) return 'CHEAP';
      if (currentPrice <= target.fair)  return 'FAIR';
      if (currentPrice >= target.expensive) return 'EXPENSIVE';
      return 'NORMAL';
    }
  };
};
