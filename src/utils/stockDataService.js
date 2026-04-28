/**
 * Stock Data Service v3.0 - Multi-Source Engine (FinMind + Yahoo)
 */

const RETRY_LIMIT = 2;
const FETCH_TIMEOUT = 12000;
const MEMORY_CACHE = new Map();
const CACHE_DURATION = 5 * 60 * 1000;

let activeProxyIndex = 0;
const CORS_PROXIES = [
  'https://api.allorigins.win/get?url=',
  'https://corsproxy.io/?url=',
  'https://api.codetabs.com/v1/proxy?quest=',
];

const STOCK_NAME_MAP = {
  '1101.TW': '台泥', '1102.TW': '亞泥', '1216.TW': '統一', '1301.TW': '台塑', '1303.TW': '南亞',
  '2303.TW': '聯電', '2308.TW': '台達電', '2317.TW': '鴻海', '2330.TW': '台積電', '2357.TW': '華碩',
  '2382.TW': '廣達', '2408.TW': '南亞科', '2412.TW': '中華電', '2454.TW': '聯發科', '2603.TW': '長榮',
  '2609.TW': '陽明', '2881.TW': '富邦金', '2882.TW': '國泰金', '2884.TW': '玉山金', '2886.TW': '兆豐金',
  '2891.TW': '中信金', '3008.TW': '大立光', '3711.TW': '日月光投控', '5880.TW': '合庫金', '6505.TW': '台塑化'
};

function parseProxyResponse(data) {
  if (data.contents) {
    return (typeof data.contents === 'string') ? JSON.parse(data.contents) : data.contents;
  }
  return data;
}

async function fetchWithRetry(url, options = {}, retries = RETRY_LIMIT) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  const internalOptions = { ...options, signal: controller.signal };

  const isDev = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV;
  if (isDev) {
    try {
      const response = await fetch(url, internalOptions);
      clearTimeout(timeoutId);
      if (response.ok) return await response.json();
    } catch (err) {
      clearTimeout(timeoutId);
    }
  } else {
    clearTimeout(timeoutId);
  }

  const targetUrl = url.startsWith('http') 
    ? url 
    : url.startsWith('/finmind-api')
      ? 'https://api.finmindtrade.com' + url.replace('/finmind-api', '')
      : 'https://query2.finance.yahoo.com' + url.replace('/yahoo-api', '');

  const proxyIndices = [activeProxyIndex, ...CORS_PROXIES.map((_, i) => i).filter(i => i !== activeProxyIndex)];
  
  for (const i of proxyIndices) {
    try {
      const proxyUrl = `${CORS_PROXIES[i]}${encodeURIComponent(targetUrl)}`;
      const response = await fetch(proxyUrl, { signal: AbortSignal.timeout(FETCH_TIMEOUT) });
      if (!response.ok) throw new Error(`Proxy error ${response.status}`);
      const data = await response.json();
      activeProxyIndex = i;
      return parseProxyResponse(data);
    } catch (err) {
      console.warn(`[DataService] Proxy ${i+1} failed for ${url}`);
    }
  }

  if (retries > 1) return fetchWithRetry(url, options, retries - 1);
  throw new Error('所有數據源連線失敗');
}

const to2 = (val) => typeof val === 'number' ? Number(val.toFixed(2)) : null;

// Technical Indicators Calculation
const calculateMA = (data, p) => data.map((_, i) => i < p-1 ? null : data.slice(i-p+1, i+1).reduce((a, b) => a + (b||0), 0) / p);
export const calculateEMA = (data, p) => {
  const k = 2 / (p + 1);
  let ema = [], curr = null;
  for (let i = 0; i < data.length; i++) {
    const val = data[i];
    if (val == null) { ema.push(null); continue; }
    if (curr === null) {
      const slice = data.slice(Math.max(0, i-p+1), i+1).filter(v => v!=null);
      curr = slice.length > 0 ? slice.reduce((a,b)=>a+b, 0)/slice.length : val;
    } else {
      curr = (val - curr) * k + curr;
    }
    ema.push(curr);
  }
  return ema;
};

export const calculateMACD = (closes, fast = 12, slow = 26, signal = 9) => {
  const emaFast = calculateEMA(closes, fast);
  const emaSlow = calculateEMA(closes, slow);
  const dif = closes.map((v, i) => (emaFast[i] != null && emaSlow[i] != null) ? emaFast[i] - emaSlow[i] : null);
  const dem = calculateEMA(dif, signal);
  const osc = dif.map((v, i) => (v != null && dem[i] != null) ? (v - dem[i]) * 2 : null);
  return { dif, dem, osc };
};

export const calculateRSI = (data, p = 14) => {
  let rsi = [], avgG = null, avgL = null;
  for (let i = 0; i < data.length; i++) {
    if (i === 0 || data[i] == null || data[i-1] == null) { rsi.push(null); continue; }
    const chg = data[i] - data[i-1];
    const g = chg > 0 ? chg : 0, l = chg < 0 ? -chg : 0;
    if (avgG === null) { avgG = g; avgL = l; } 
    else { avgG = (avgG * (p - 1) + g) / p; avgL = (avgL * (p - 1) + l) / p; }
    let rs = avgL === 0 ? 100 : avgG / avgL;
    rsi.push(avgL === 0 ? 100 : 100 - (100 / (1 + rs)));
  }
  return rsi;
};

export const calculateKD = (highs, lows, closes, p = 9) => {
  let k = [], d = [], pk = 50, pd = 50;
  for (let i = 0; i < closes.length; i++) {
    if (i < p-1 || closes[i] == null) { k.push(null); d.push(null); continue; }
    let mx = Math.max(...highs.slice(i-p+1, i+1)), mn = Math.min(...lows.slice(i-p+1, i+1));
    let rsv = mx > mn ? ((closes[i] - mn) / (mx - mn)) * 100 : pk;
    pk = (2/3) * pk + (1/3) * rsv;
    pd = (2/3) * pd + (1/3) * pk;
    k.push(pk); d.push(pd);
  }
  return { k, d };
};

export async function fetchStockData(symbol) {
  const cleanSymbol = symbol.toUpperCase().trim();
  // Strictly 4-6 digits or Taiwan ETF format (digits + suffix L/R/B/A)
  const isTaiwan = /^(\d{4,6}[A-Z]?)$/.test(cleanSymbol) || cleanSymbol.endsWith('.TW') || cleanSymbol.endsWith('.TWO');
  const yahooSymbol = (isTaiwan && !cleanSymbol.includes('.')) ? cleanSymbol + '.TW' : cleanSymbol;
  const stockId = isTaiwan ? yahooSymbol.split('.')[0] : null;

  if (MEMORY_CACHE.has(yahooSymbol)) {
    const cached = MEMORY_CACHE.get(yahooSymbol);
    if (Date.now() - cached.timestamp < CACHE_DURATION) return cached.data;
  }

  console.log(`[DataService] Fetching ${yahooSymbol} (TWSE Mode: ${isTaiwan})`);

  try {
    const today = new Date();
    const fiveYearsAgo = new Date(today);
    fiveYearsAgo.setFullYear(today.getFullYear() - 5);

    const priceStartDate = fiveYearsAgo.toISOString().split('T')[0];
    const financialStartDate = fiveYearsAgo.toISOString().split('T')[0];

    // Parallel Requests Plan
    const requests = [
      // 1. Yahoo Price (Backup & Fast Summary)
      fetchWithRetry(`/yahoo-api/v10/finance/quoteSummary/${yahooSymbol}?modules=defaultKeyStatistics,financialData,summaryDetail,price`).catch(() => ({})),
      // 2. FinMind Historical Price (Primary for K-Line)
      stockId ? fetchWithRetry(`/finmind-api/api/v4/data?dataset=TaiwanStockPrice&data_id=${stockId}&start_date=${priceStartDate}`).catch(() => null) : Promise.resolve(null),
      // 3. FinMind Financial Statements (EPS, Income)
      stockId ? fetchWithRetry(`/finmind-api/api/v4/data?dataset=TaiwanStockFinancialStatements&data_id=${stockId}&start_date=${financialStartDate}`).catch(() => null) : Promise.resolve(null),
      // 4. FinMind Stock Info (Primary for Name)
      stockId ? fetchWithRetry(`/finmind-api/api/v4/data?dataset=TaiwanStockInfo&data_id=${stockId}`).catch(() => null) : Promise.resolve(null),
      // 5. Yahoo Real-time Chart (Most reliable for current price)
      fetchWithRetry(`/yahoo-api/v8/finance/chart/${yahooSymbol}?interval=1m&range=1d`).catch(() => ({})),
      // 6. FinMind Balance Sheet (For exact Book Value Per Share calculation: Equity / Shares)
      stockId ? fetchWithRetry(`/finmind-api/api/v4/data?dataset=TaiwanStockBalanceSheet&data_id=${stockId}&start_date=${financialStartDate}`).catch(() => null) : Promise.resolve(null)
    ];

    const [yahooSummary, fmPrice, fmFinancials, fmInfo, yahooRTChart, fmBalanceSheet] = await Promise.all(requests);

    // Process Name Resolution
    let resolvedName = STOCK_NAME_MAP[yahooSymbol] || null;
    
    // 1. Try FinMind Info (Best for Chinese Names)
    if (fmInfo && fmInfo.data && fmInfo.data[0]) {
      resolvedName = fmInfo.data[0].stock_name;
    }

    // 2. Fallback to Yahoo Metadata
    const summary = yahooSummary.quoteSummary?.result?.[0] || {};
    const yahooPrice = summary.price || {};
    const yahooStats = summary.defaultKeyStatistics || {};
    const yahooFin = summary.financialData || {};
    
    // Real-time metrics from Chart Metadata (Priority)
    const rtMeta = yahooRTChart?.chart?.result?.[0]?.meta || {};
    
    const rt = {
      change: rtMeta.regularMarketChange || yahooPrice.regularMarketChange?.raw || 0,
      changePercent: rtMeta.regularMarketChangePercent || yahooPrice.regularMarketChangePercent?.raw || 0,
      dayHigh: rtMeta.regularMarketDayHigh || yahooPrice.regularMarketDayHigh?.raw || 0,
      dayLow: rtMeta.regularMarketDayLow || yahooPrice.regularMarketDayLow?.raw || 0,
      volume: rtMeta.regularMarketVolume || yahooPrice.regularMarketVolume?.raw || 0,
      time: rtMeta.regularMarketTime || yahooPrice.regularMarketTime || Math.floor(Date.now() / 1000),
      prevClose: rtMeta.chartPreviousClose || rtMeta.previousClose || yahooPrice.regularMarketPreviousClose?.raw || 0
    };
    
    const stockName = resolvedName || rtMeta.longName || yahooPrice.longName || yahooPrice.shortName || yahooSymbol.replace('.TW', '');
    let currentPrice = to2(rtMeta.regularMarketPrice || yahooFin.currentPrice?.raw || yahooPrice.regularMarketPrice?.raw || 0);
    const epsTTM = to2(yahooStats.trailingEps?.raw || 0);
    // Reverse engineer current BVPS if Yahoo hides bookValue but provides PriceToBook
    const currentPbRatio = yahooStats.priceToBook?.raw;
    const computedYahooBvps = currentPbRatio && currentPrice ? (currentPrice / currentPbRatio) : null;
    // Prioritize computed BVPS because Yahoo's raw bookValue is often wrong for Taiwan stocks
    const bvps = to2(computedYahooBvps || yahooStats.bookValue?.raw); 
    const isETF = summary.price?.quoteType === 'ETF' || (fmInfo?.data?.[0]?.industry_category === 'ETF');

    // Process FinMind Financials
    const epsMap = {};
    const bvpsMap = {}; // Store historical BVPS by year
    let latestBVPSFromFM = null;
    if (fmFinancials && fmFinancials.data) {
      fmFinancials.data.forEach(item => {
        const parts = item.date.split('-');
        const year = parts[0];
        const month = parseInt(parts[1]);
        const q = Math.ceil(month / 3);

        if (item.type === 'EPS') {
          epsMap[`${year}-Q${q}`] = item.value;
        }
      });
    }

    // Process FinMind Balance Sheet (The Most Accurate Method: Equity ÷ Shares)
    if (fmBalanceSheet && fmBalanceSheet.data) {
      const bsMap = {}; // Group by Quarter
      fmBalanceSheet.data.forEach(item => {
        const parts = item.date.split('-');
        const year = parts[0];
        const month = parseInt(parts[1]);
        const q = Math.ceil(month / 3);
        const key = `${year}-Q${q}`;

        if (!bsMap[key]) bsMap[key] = { equity: null, shareCapital: null };

        // Match common Taiwanese accounting types for Total Equity (股東權益)
        // Prioritize EquityAttributableToOwnersOfParent for exact BVPS
        if (item.type === 'EquityAttributableToOwnersOfParent') {
          bsMap[key].equity = item.value;
        } else if (item.type === 'TotalEquity' && bsMap[key].equity === null) {
          bsMap[key].equity = item.value;
        }
        // Match common Taiwanese accounting types for Share Capital (普通股股本)
        else if (item.type === 'OrdinaryShare') {
          bsMap[key].shareCapital = item.value;
        } else if (item.type === 'ShareCapital' && bsMap[key].shareCapital === null) {
          bsMap[key].shareCapital = item.value;
        }
        
        // Safety bypass if FinMind explicitly outputs the final NAV ratio
        if (item.type === 'NAV' || item.type.includes('每股淨值')) {
          bvpsMap[year] = item.value;
          latestBVPSFromFM = item.value;
        }
      });

      // Calculate the exact BVPS from Balance Sheet fundamentals
      Object.keys(bsMap).sort().forEach(key => {
        const year = key.split('-')[0];
        const d = bsMap[key];
        // Taiwanese Par Value is usually 10 TWD per share -> shares_outstanding = share_capital ÷ 10
        if (d.equity && d.shareCapital && d.shareCapital !== 0) {
           const sharesOutstanding = d.shareCapital / 10;
           const exactBVPS = d.equity / sharesOutstanding;
           bvpsMap[year] = exactBVPS;
           latestBVPSFromFM = exactBVPS;
        }
      });
    }

    // Process K-Line (Primary: FinMind, Fallback: Yahoo could be added if needed)
    let klineRaw = [];
    if (fmPrice && fmPrice.data && Array.isArray(fmPrice.data)) {
      klineRaw = fmPrice.data.map(d => ({
        date: d.date,
        open: d.open,
        high: d.max,
        low: d.min,
        close: d.close,
        volume: Number(d.Trading_Volume || d.volume || d.trading_volume || 0)
      }));
    } else {
      // Fallback to Yahoo Chart if FinMind fails
      const yahooChart = await fetchWithRetry(`/yahoo-api/v8/finance/chart/${yahooSymbol}?interval=1d&range=2y`).catch(() => ({}));
      const res = yahooChart.chart?.result?.[0] || {};
      const ts = res.timestamp || [];
      const q = res.indicators?.quote?.[0] || {};
      klineRaw = ts.map((t, i) => ({
        date: new Date(t * 1000).toISOString().split('T')[0],
        open: q.open?.[i],
        high: q.high?.[i],
        low: q.low?.[i],
        close: q.close?.[i],
        volume: q.volume?.[i]
      })).filter(d => d.close != null);
    }

    // Patch today's data from Yahoo if missing from FinMind (Market is open or just closed)
    // Use Taiwan time for comparison
    const nowTW = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Taipei"}));
    const todayStr = nowTW.toISOString().split('T')[0];
    
    if (klineRaw.length > 0 && klineRaw[klineRaw.length - 1].date < todayStr && currentPrice > 0) {
      klineRaw.push({
        date: todayStr,
        open: rtMeta.regularMarketOpen || yahooPrice.regularMarketOpen?.raw || currentPrice,
        high: rt.dayHigh || currentPrice,
        low: rt.dayLow || currentPrice,
        close: currentPrice,
        volume: rt.volume || 0
      });
    }

    // Ensure currentPrice is not zero if possible
    if (currentPrice === 0 && klineRaw.length > 0) {
      currentPrice = klineRaw[klineRaw.length - 1].close;
    }

    // Calculate Indicators
    const closePrices = klineRaw.map(d => d.close);
    const highPrices = klineRaw.map(d => d.high);
    const lowPrices = klineRaw.map(d => d.low);

    const ma5 = calculateMA(closePrices, 5);
    const ma20 = calculateMA(closePrices, 20);
    const ma60 = calculateMA(closePrices, 60);

    // Indicators are now calculated in component for reactivity

    // RSI & KD
    const rsi14 = calculateRSI(closePrices, 14);
    const kdData = calculateKD(highPrices, lowPrices, closePrices, 9);

    const kline = klineRaw.map((d, i) => ({
      ...d,
      open: to2(d.open), high: to2(d.high), low: to2(d.low), close: to2(d.close),
      ma5: to2(ma5[i]), ma20: to2(ma20[i]), ma60: to2(ma60[i]),
      rsi: to2(rsi14[i]),
      isUp: d.close >= d.open
    }));

    // Aggregate History (Quarterly)
    const historyMap = {};
    kline.forEach(d => {
      const date = new Date(d.date);
      const qStr = `${date.getFullYear()}-Q${Math.ceil((date.getMonth() + 1) / 3)}`;
      if (!historyMap[qStr] || d.date > historyMap[qStr].date) {
        historyMap[qStr] = { quarter: qStr, price: d.close, date: d.date };
      }
    });
    let finalBVPS = bvps || latestBVPSFromFM;
    if (!finalBVPS) {
      finalBVPS = isETF ? currentPrice : 0; // Fallback to current price for ETFs, avoid arbitrary 22
    }

    const historyData = Object.values(historyMap).sort((a,b) => a.date.localeCompare(b.date)).map(h => {
      const qEps = epsMap[h.quarter] !== undefined ? to2(epsMap[h.quarter]) : (isETF ? 0 : to2(epsTTM / 4));
      const yearStr = h.quarter.substring(0, 4);
      let hBvps = bvpsMap[yearStr];
      if (!hBvps) hBvps = isETF ? h.price : finalBVPS;
      return {
        quarter: h.quarter,
        price: to2(h.price),
        eps: qEps,
        bvps: to2(hBvps)
      };
    });

    // Yearly Stats Calculation with Refined Calibration (Reality Clamping)
    const yearlyStatsMap = {};
    const monthData = [];
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    klineRaw.forEach(d => {
      if (!d || !d.date) return;
      const date = new Date(d.date);
      const year = date.getFullYear().toString();
      
      // Collect current month data
      if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
        monthData.push(d);
      }

      if (!yearlyStatsMap[year]) {
        yearlyStatsMap[year] = { year, high: d.high, low: d.low, close: d.close, count: 0 };
      }
      yearlyStatsMap[year].high = Math.max(yearlyStatsMap[year].high, d.high);
      yearlyStatsMap[year].low = Math.min(yearlyStatsMap[year].low, d.low);
      yearlyStatsMap[year].close = d.close;
    });

    const monthStats = {
      high: monthData.length > 0 ? Math.max(...monthData.map(m => m.high)) : currentPrice,
      low: monthData.length > 0 ? Math.min(...monthData.map(m => m.low)) : currentPrice
    };

    const yearlyStats = Object.values(yearlyStatsMap).sort((a, b) => b.year - a.year);
    
    // Calculate Multi-Year Implied PE/PB Multipliers based on Midpoints
    const multipliers = [];
    yearlyStats.forEach(y => {
      const yearStr = y.year;
      const annualEps = (epsMap[`${yearStr}-Q1`] || 0) + (epsMap[`${yearStr}-Q2`] || 0) + (epsMap[`${yearStr}-Q3`] || 0) + (epsMap[`${yearStr}-Q4`] || 0);
      y.totalEps = annualEps;
      
      const midPrice = (y.high + y.low) / 2;
      if (annualEps > 0.1) {
        multipliers.push(midPrice / annualEps);
      }
    });

    // Determine the 'Historical Consensus' Multiplier (Median of Midpoints)
    const sortedMults = multipliers.sort((a, b) => a - b);
    const medianPE = sortedMults.length > 0 ? sortedMults[Math.floor(sortedMults.length / 2)] : 15;

    // Apply the consensus multiplier with REALITY CLAMPING
    yearlyStats.forEach(y => {
      const midPoint = (y.high + y.low) / 2;
      const rawFair = (to2(y.totalEps) * medianPE);

      // Historical BVPS Calculation: Find closest report for this year
      const yearStr = y.year;
      y.bvps = to2(bvpsMap[yearStr]);
      if (!y.bvps) y.bvps = isETF ? to2(y.close) : to2(finalBVPS);

      // Reality Clamping logic:
      if (y.totalEps <= 0) {
        y.historicalFairPrice = midPoint;
      } else if (rawFair > y.high) {
        y.historicalFairPrice = y.high; // Cap at the high
      } else {
        y.historicalFairPrice = rawFair;
      }
    });

    // Final history with annual data injected
    const history = historyData.map(h => {
      const yearStr = h.quarter.substring(0, 4);
      const yrStat = yearlyStatsMap[yearStr];
      const annualEps = yrStat?.totalEps || 0;
      
      // Apply the same clamping logic to the history river chart
      let yrFair = annualEps * medianPE;
      if (annualEps <= 0) yrFair = (yrStat?.high + yrStat?.low) / 2 || h.price;
      else if (yrStat && yrFair > yrStat.high) yrFair = yrStat.high;

      return {
        ...h,
        yearlyEps: to2(annualEps),
        yearlyHigh: yrStat?.high || h.price,
        yearlyLow: yrStat?.low || h.price,
        yearlyFair: to2(yrFair)
      };
    });

    // Format yearlyStats for result
    const formattedYearlyStats = yearlyStats.map(y => ({
      ...y,
      high: to2(y.high), 
      low: to2(y.low), 
      close: to2(y.close), 
      totalEps: to2(y.totalEps), 
      historicalFairPrice: to2(y.historicalFairPrice),
      bvps: y.bvps || to2(finalBVPS)
    }));

    // Process Intraday Data
    let intraday = [];
    const rtRes = yahooRTChart?.chart?.result?.[0];
    if (rtRes) {
      const timestamps = rtRes.timestamp || [];
      const c = rtRes.indicators?.quote?.[0]?.close || [];
      const v = rtRes.indicators?.quote?.[0]?.volume || [];
      
      let cumulativeValue = 0;
      let cumulativeVolume = 0;
      let cumulativePrice = 0;
      let count = 0;
      
      intraday = timestamps.map((t, i) => {
        if (c[i] == null) return null;
        const p = c[i];
        const v_i = v[i] || 0;
        
        cumulativeValue += p * v_i;
        cumulativeVolume += v_i;
        cumulativePrice += p;
        count++;

        const openPrice = rtRes.meta?.regularMarketOpen || p;
        const avg = cumulativeVolume > 0 ? (cumulativeValue / cumulativeVolume) : p;
        const simpleAvg = cumulativePrice / count;
        
        const date = new Date(t * 1000);
        return {
          time: date.toLocaleTimeString('zh-TW', { timeZone: 'Asia/Taipei', hour: '2-digit', minute: '2-digit', hour12: false }),
          price: to2(p),
          avg: to2(avg),
          simpleAvg: to2(simpleAvg),
          volume: v_i,
          isUp: p >= openPrice
        };
      }).filter(d => d !== null);
    }

    const result = {
      symbol: yahooSymbol.toUpperCase(),
      name: stockName,
      currentPrice,
      isETF,
      epsTTM,
      bvps: finalBVPS,
      monthStats,
      realtime: rt,
      history,
      yearlyStats: formattedYearlyStats,
      intraday,
      summary,
      kline,
      medianPE
    };

    MEMORY_CACHE.set(yahooSymbol, { timestamp: Date.now(), data: result });
    return result;

  } catch (error) {
    console.error('Stock data fetch failed:', error);
    throw error;
  }
};
