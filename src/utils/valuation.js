/**
 * Valuation Logic v2.1.0
 * Principles based on RD & Growth Analysis
 */

export const calculateValuation = (data, assumptions = { growthRate: 0.05, discountRate: 0.1, terminalGrowth: 0.02 }) => {
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
  const currentTTMEPS = epsList.slice(-4).reduce((a, b) => a + b, 0);

  // Per-point TTM EPS for river chart visualization
  const peData = data.map((d, i) => {
    const ttmEps = epsList.slice(Math.max(0, i - 3), i + 1).reduce((a, b) => a + b, 0);
    return { ttmEps };
  });

  // Placeholder stats - will be populated by final calibrated values from the river loop
  let finalPe = {};
  let finalPb = {};
  let finalDcf = {};

  // 1. P/E Calibration (Consensus-based)
  const yearlyMidPEs = [];
  const years = [...new Set(data.map(d => d.quarter?.split('-')[0]).filter(Boolean))];
  years.forEach(yr => {
    const yrData = data.filter(d => d.quarter?.startsWith(yr));
    if (yrData.length === 0) return;
    const yrHigh = Math.max(...yrData.map(d => d.high || d.price));
    const yrLow = Math.min(...yrData.map(d => d.low || d.price));
    const yrEps = yrData.reduce((acc, d) => acc + (d.eps || 0), 0);
    if (yrEps > 0.1) yearlyMidPEs.push(((yrHigh + yrLow) / 2) / yrEps);
  });
  const validPE = yearlyMidPEs.sort((a, b) => a - b);
  let avgPE = validPE.length > 0 ? validPE[Math.floor(validPE.length / 2)] : 15;
  if (avgPE > 25) avgPE = 20 + (avgPE - 20) * 0.3;
  const minPE = avgPE * 0.7;
  const maxPE = avgPE * 1.3;

  // 2. P/B Calibration (Asset-based)
  const currentBVPS = data[data.length - 1].bvps || 20;
  const validPB = data
    .map(d => (d.bvps > 0) ? d.price / d.bvps : null)
    .filter(pb => pb !== null && pb > 0 && pb < 10)
    .sort((a, b) => a - b);
  const avgPB = validPB.length > 5 ? validPB.reduce((a, b) => a + b, 0) / validPB.length : 1.2;
  const minPB = validPB.length > 5 ? validPB[Math.floor(validPB.length * 0.2)] : 0.8;
  const maxPB = validPB.length > 5 ? validPB[Math.floor(validPB.length * 0.8)] : 2.0;

  // Append river data to historical points
  const riverData = data.map((d, i) => {
    const ttmEps = peData[i].ttmEps;
    const currentPe = (ttmEps > 0) ? (d.price / ttmEps) : null;
    const currentPb = (d.bvps > 0) ? (d.price / d.bvps) : null;

    // Calibration Logic (Reality Clamping): 
    // 1. If EPS is zero/negative -> use Midpoint
    // 2. If Calculation > Yearly High -> Cap at High (to avoid inflated targets)
    // 3. Otherwise -> use Calculation
    const rawFair = ttmEps * avgPE;
    const yrMid = (d.yearlyHigh + d.yearlyLow) / 2;
    let smoothFair = rawFair;
    if (ttmEps <= 0) smoothFair = yrMid;
    else if (rawFair > d.yearlyHigh) smoothFair = d.yearlyHigh;

    // 3. Dynamic DCF for every point in history (Resilient Model)
    // Normalization: If TTM EPS is negative, assume a recovery baseline 
    // to avoid negative valuations and provide a more realistic "Intrinsic Value"
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

    // Safety Floor: In extreme cases, a company's intrinsic value 
    // should not be below its Book Value (Asset-based support)
    pointDCF = Math.max(pointDCF, d.bvps || 0);

    return {
      ...d,
      pe: currentPe ? parseFloat(currentPe.toFixed(2)) : null,
      pb: currentPb ? parseFloat(currentPb.toFixed(2)) : null,
      peCheap: parseFloat((smoothFair * 0.7).toFixed(2)),
      peFair: parseFloat(smoothFair.toFixed(2)),
      peExpensive: parseFloat((smoothFair * 1.3).toFixed(2)),
      pbCheap: parseFloat(((d.bvps || 20) * minPB).toFixed(2)),
      pbFair: parseFloat(((d.bvps || 20) * avgPB).toFixed(2)),
      pbExpensive: parseFloat(((d.bvps || 20) * maxPB).toFixed(2)),
      dcfCheap: parseFloat((pointDCF * 0.8).toFixed(2)),
      dcfFair: parseFloat((pointDCF).toFixed(2)),
      dcfExpensive: parseFloat((pointDCF * 1.2).toFixed(2)), 
      price: parseFloat(d.price.toFixed(2)) 
    };
  });

  const currentVal = riverData[riverData.length - 1];
  finalPe = { fair: currentVal.peFair, cheap: currentVal.peCheap, expensive: currentVal.peExpensive, avg: avgPE, min: minPE, max: maxPE };
  finalPb = { fair: currentVal.pbFair, cheap: currentVal.pbCheap, expensive: currentVal.pbExpensive, avg: avgPB, min: minPB, max: maxPB };
  finalDcf = { value: currentVal.dcfFair, fair: currentVal.dcfFair, cheap: currentVal.dcfCheap, expensive: currentVal.dcfExpensive };

  return {
    currentPrice,
    pe: finalPe,
    pb: finalPb,
    dcf: finalDcf,
    riverData,
    // Status helper
    getStatus: (mode) => {
      const target = mode === 'PE' ? finalPe : (mode === 'PB' ? finalPb : finalDcf);
      if (currentPrice <= target.cheap) return 'CHEAP';
      if (currentPrice <= target.fair) return 'FAIR';
      if (currentPrice >= target.expensive) return 'EXPENSIVE';
      return 'NORMAL';
    }
  };
};
