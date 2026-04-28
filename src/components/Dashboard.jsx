import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, ReferenceLine,
  ComposedChart, Line, Bar, Cell, BarChart, Brush
} from 'recharts';
import { 
  Search, TrendingUp, TrendingDown, Shield, HelpCircle, Activity, BrainCircuit, 
  Calculator, Settings2, RefreshCw, Globe, Waves, Trash2, LineChart as LineChartIcon,
  ChevronRight, AlertTriangle
} from 'lucide-react';
import { calculateValuation } from '../utils/valuation';
import { 
  fetchStockData, calculateKD, calculateMACD
} from '../utils/stockDataService';
import { motion, AnimatePresence } from 'framer-motion';

// =============================================
// Sub-Components (MUST be defined before Dashboard)
// =============================================

const GlassCard = ({ children, className = "", hover = false }) => (
  <motion.div 
    whileHover={hover ? { y: -5, borderColor: 'rgba(139, 92, 246, 0.3)' } : {}}
    className={`bg-white/[0.02] backdrop-blur-3xl border border-white/5 rounded-[32px] overflow-hidden ${className}`}
  >
    {children}
  </motion.div>
);

const Badge = ({ children, color = "violet" }) => {
  const colors = {
    violet: "bg-violet-600/20 text-violet-400 border-violet-500/20",
    emerald: "bg-emerald-500/20 text-emerald-400 border-emerald-500/20",
    rose: "bg-rose-500/20 text-rose-400 border-rose-500/20",
    blue: "bg-blue-500/20 text-blue-400 border-blue-500/20",
  };
  return (
    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${colors[color] || colors.violet}`}>
      {children}
    </span>
  );
};

const InfoWidget = ({ title, value, icon, color = "white" }) => (
  <GlassCard hover className="p-8 group relative overflow-hidden">
    <div className="absolute top-0 right-0 p-8 opacity-[0.05] group-hover:rotate-12 group-hover:scale-125 transition-transform">
      {React.cloneElement(icon, { size: 60 })}
    </div>
    <div className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-3">{title}</div>
    <div className="text-4xl font-black tracking-tighter" style={{ color }}>{value}</div>
  </GlassCard>
);

const IndicatorRow = ({ label, val, current, color }) => {
  if (val == null || current == null) return null;
  const diff = ((current - val) / val) * 100;
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-[11px] font-bold text-slate-400">{label}</span>
      </div>
      <span className={`text-xs font-black ${diff >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
        {diff >= 0 ? '+' : ''}{diff.toFixed(2)}%
      </span>
    </div>
  );
};

// =============================================
// Error Boundary
// =============================================
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#020617] text-white flex items-center justify-center p-8">
          <div className="text-center space-y-6">
            <AlertTriangle size={60} className="mx-auto text-rose-500" />
            <h2 className="text-3xl font-black">系統渲染錯誤</h2>
            <p className="text-slate-400 max-w-md mx-auto">{this.state.error?.message || '未知錯誤'}</p>
            <button onClick={() => window.location.reload()} className="px-8 py-4 bg-violet-600 rounded-2xl font-black">
              重新載入
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// =============================================
// Main Dashboard Component
// =============================================

const Dashboard = () => {
  const [symbol, setSymbol] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stockInfo, setStockInfo] = useState(null);
  const [mode, setMode] = useState('PB');
  const [version] = useState('v2.2.0');
  const [assumptions] = useState({ growthRate: 0.05, discountRate: 0.1, terminalGrowth: 0.02 });
  const [hoverPoint, setHoverPoint] = useState(null);
  const [kdPeriod, setKdPeriod] = useState(9);
  const [macdConfig, setMacdConfig] = useState({ fast: 12, slow: 26, signal: 9 });
  const [searchHistory, setSearchHistory] = useState(() => {
    const saved = localStorage.getItem('stock_search_history');
    return saved ? JSON.parse(saved) : [];
  });

  // Sync history to localStorage
  useEffect(() => {
    localStorage.setItem('stock_search_history', JSON.stringify(searchHistory));
  }, [searchHistory]);

  const handleHover = useCallback((e) => {
    if (e && e.activePayload && e.activePayload[0]) {
      setHoverPoint(e.activePayload[0].payload);
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoverPoint(null);
  }, []);

  const handleSearch = useCallback(async (e) => {
    if (e) e.preventDefault();
    const searchSym = symbol.trim();
    if (!searchSym) return;

    setLoading(true);
    setError(null);
    setStockInfo(null);

    try {
      const result = await fetchStockData(searchSym);
      if (!result || !result.history || result.history.length === 0) {
        throw new Error('查無歷史交易數據，請確認代號是否正確。');
      }
      const val = calculateValuation(result.history, assumptions);
      // Ensure we have something to show
      if (!val && !result.isETF) {
         throw new Error('該股票數據結構異常，無法進行估值分析。');
      }
      setStockInfo({ ...result, valuation: val });
      
      // Update history only on success
      setSearchHistory(prev => {
        const filtered = prev.filter(h => {
          const s = typeof h === 'string' ? h : h.symbol;
          return s !== result.symbol && s !== searchSym; // ensure no duplicates of typed or resolved symbol
        });
        return [{ symbol: result.symbol, name: result.name }, ...filtered].slice(0, 14);
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [symbol, assumptions]);

  const valuationData = useMemo(() => {
    if (!stockInfo?.valuation) return null;
    const v = stockInfo.valuation;
    return mode === 'PE' ? v.pe : (mode === 'PB' ? v.pb : v.dcf);
  }, [stockInfo, mode]);

  const currentStatus = useMemo(() => {
    return stockInfo?.valuation?.getStatus ? stockInfo.valuation.getStatus(mode) : 'NORMAL';
  }, [stockInfo, mode]);

  // Derived indicator data for KD
  const computedKline = useMemo(() => {
    if (!stockInfo?.kline) return null;
    const highs = stockInfo.kline.map(d => d.high);
    const lows = stockInfo.kline.map(d => d.low);
    const closes = stockInfo.kline.map(d => d.close);
    const kd = calculateKD(highs, lows, closes, kdPeriod);
    const macd = calculateMACD(closes, macdConfig.fast, macdConfig.slow, macdConfig.signal);
    
    return stockInfo.kline.map((d, i) => ({
      ...d,
      kdK: kd.k[i],
      kdD: kd.d[i],
      dif: macd.dif[i],
      dem: macd.dem[i],
      osc: macd.osc[i]
    }));
  }, [stockInfo, kdPeriod, macdConfig]);

  const activeHoverPoint = useMemo(() => {
    if (!hoverPoint || !computedKline) return null;
    return computedKline.find(k => k.date === hoverPoint.date);
  }, [hoverPoint, computedKline]);

  // Valuation Signal & KD Signal Analysis
  const analysisSignals = useMemo(() => {
    if (!stockInfo || !computedKline || computedKline.length === 0) return null;

    // 1. Valuation Signal
    let valSignal = null;
    let highestPrice1Y = -Infinity;
    
    // Calculate last 1 year high
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    stockInfo.kline.forEach(k => {
      const kDate = new Date(k.date);
      if (kDate >= oneYearAgo) {
        if (k.high > highestPrice1Y) {
          highestPrice1Y = k.high;
        }
      }
    });

    if (highestPrice1Y === -Infinity && stockInfo.yearlyStats && stockInfo.yearlyStats.length > 0) {
      highestPrice1Y = stockInfo.yearlyStats[0].high;
    }

    if (stockInfo.currentPrice && valuationData?.fair) {
      if (stockInfo.currentPrice <= valuationData.fair) {
        valSignal = { type: 'buy', text: '宜買進' };
      } else if (stockInfo.currentPrice > highestPrice1Y && highestPrice1Y !== -Infinity) {
        valSignal = { type: 'sell', text: '宜賣出' };
      } else {
        valSignal = { type: 'hold', text: '觀望' };
      }
    }

    // 2. KD Signal
    let kdSignal = null;
    if (computedKline.length >= 4) {
      const lastIndex = computedKline.length - 1;
      let foundCross = false;

      // Loop from latest day backwards to 3 days ago
      for (let i = lastIndex; i >= lastIndex - 2 && i > 0; i--) {
        const curr = computedKline[i];
        const prev = computedKline[i - 1];
        
        if (prev.kdK < prev.kdD && curr.kdK > curr.kdD) {
          kdSignal = { type: 'golden', text: 'KD黃金交叉' };
          foundCross = true;
          break;
        } else if (prev.kdK > prev.kdD && curr.kdK < curr.kdD) {
          kdSignal = { type: 'death', text: 'KD死亡交叉' };
          foundCross = true;
          break;
        }
      }

      if (!foundCross) {
        const latest = computedKline[lastIndex];
        const prevLatest = computedKline[lastIndex - 1];
        if (latest.kdK > prevLatest.kdK) {
          kdSignal = { type: 'up', text: 'KD向上' };
        } else if (latest.kdK < prevLatest.kdK) {
          kdSignal = { type: 'down', text: 'KD向下' };
        } else {
          kdSignal = { type: 'flat', text: 'KD持平' };
        }
      }
    }

    return { valSignal, kdSignal, highestPrice1Y };
  }, [stockInfo, computedKline, valuationData]);

  // ---- Determine which view to render ----
  let viewKey = 'idle';
  if (loading) viewKey = 'loading';
  else if (error) viewKey = 'error';
  else if (stockInfo && (valuationData || stockInfo.isETF || stockInfo.valuation?.isETF)) viewKey = 'data';

  return (
    <div className="max-w-[1600px] mx-auto p-4 md:p-8 md:pl-24 space-y-8 min-h-screen bg-[#020617] text-white selection:bg-violet-500/30">
      
      {/* Top Bar */}
      <div className="flex justify-between items-center opacity-80">
        <div className="flex items-center gap-4">
          <Badge color={loading ? "emerald" : "violet"}>{version}</Badge>
          <div className="flex items-center gap-2 text-slate-500 text-[10px] font-black uppercase tracking-widest">
            <Globe size={12} className={loading ? "animate-spin" : ""} />
            {loading ? "正在同步全球市場狀態..." : "實時雲端連線已啟動"}
          </div>
        </div>
        <button onClick={() => window.location.reload()} className="hover:text-violet-400 transition-colors">
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Header Section */}
      <header className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center bg-white/[0.01] p-10 rounded-[48px] border border-white/5 shadow-inner">
        <div className="lg:col-span-2 flex items-center gap-8">
          <div className="p-5 bg-gradient-to-br from-violet-600 to-indigo-800 rounded-[32px] shadow-2xl shadow-violet-600/20">
            <TrendingUp size={40} />
          </div>
          <div>
            <h1 className="text-6xl font-black bg-gradient-to-r from-white via-white/90 to-white/50 bg-clip-text text-transparent tracking-tighter">
              Stock Vision
            </h1>
            <p className="text-slate-500 text-xs font-black uppercase tracking-[0.5em] mt-2 ml-1">AI-Driven Quantitative Hub</p>
          </div>
        </div>

        <form onSubmit={handleSearch} className="relative">
          <input 
            type="text" 
            placeholder="輸入股票代碼..." 
            className="w-full h-20 pl-10 pr-24 bg-white/[0.03] border border-white/10 rounded-[30px] font-black text-xl focus:border-violet-500 outline-none transition-all shadow-xl"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
          />
          <button type="submit" className="absolute right-3 top-3 h-14 px-8 bg-violet-600 hover:bg-violet-500 rounded-2xl font-black shadow-lg shadow-violet-600/30 transition-transform active:scale-95">
            即刻分析
          </button>
        </form>

        {/* Search History Row */}
        {searchHistory.length > 0 && (
          <div className="lg:col-span-3 flex flex-wrap gap-2 mt-4 px-2">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest self-center mr-2">最近查詢:</span>
            {searchHistory.map((h) => {
              const sym = typeof h === 'string' ? h : h.symbol;
              const name = typeof h === 'string' ? '' : h.name;
              return (
              <div key={sym} className="relative group">
                <button
                  onClick={() => setSymbol(sym)}
                  onDoubleClick={() => {
                    setSymbol(sym);
                    setTimeout(() => handleSearch(null, sym), 0);
                  }}
                  className="px-4 py-1.5 bg-white/5 hover:bg-violet-600/20 border border-white/5 hover:border-violet-500/30 rounded-full text-[11px] font-bold text-slate-400 hover:text-violet-300 transition-all active:scale-95"
                >
                  {sym}
                </button>
                {name && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-[#020617] text-slate-300 text-[11px] font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 border border-violet-500/30 shadow-xl shadow-violet-900/20">
                    {name}
                  </div>
                )}
              </div>
            )})}
            <button 
              onClick={() => setSearchHistory([])}
              className="px-2 py-1.5 text-slate-600 hover:text-rose-400 text-[10px] uppercase font-black transition-colors"
            >
              <Trash2 size={12} />
            </button>
          </div>
        )}
      </header>

      {/* Content Area - Conditional Rendering with keys */}
      <AnimatePresence mode="wait">
        {viewKey === 'loading' && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-[60vh] flex flex-col items-center justify-center gap-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full border-t-2 border-violet-500 animate-spin" />
              <Activity className="absolute inset-0 m-auto text-violet-400 animate-pulse" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-2xl font-black italic tracking-tighter">上網讀取中...</p>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">數據分析中，正在執行並行快取機制</p>
            </div>
          </motion.div>
        )}

        {viewKey === 'error' && (
          <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <GlassCard className="p-20 text-center border-rose-500/20">
              <AlertTriangle size={60} className="mx-auto text-rose-500 mb-8" />
              <h2 className="text-3xl font-black mb-4">連線中斷或查無此股</h2>
              <p className="text-slate-400 max-w-lg mx-auto mb-10 font-bold">{error}</p>
              <button onClick={handleSearch} className="px-12 py-5 bg-violet-600 rounded-3xl font-black shadow-xl shadow-violet-600/20">嘗試手動修復連線</button>
            </GlassCard>
          </motion.div>
        )}

        {viewKey === 'idle' && (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-[50vh] flex flex-col items-center justify-center gap-6">
            <div className="p-8 bg-white/[0.02] rounded-full border border-white/5">
              <Search size={60} className="text-slate-600" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-3xl font-black italic tracking-tighter text-slate-500">WAITING FOR INPUT...</p>
              <p className="text-slate-600 text-xs font-black uppercase tracking-widest">請在上方輸入想查詢的股票代碼</p>
            </div>
          </motion.div>
        )}

        {viewKey === 'data' && (
          <motion.div key="data" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-12 pb-20">
            
            {/* Profile Card */}
            <GlassCard className="p-8 border-l-[16px] border-l-violet-600 bg-gradient-to-r from-violet-600/10 to-transparent">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-10 border-b border-white/5 px-4 md:px-0">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-violet-500/10 text-violet-400 text-[10px] font-black tracking-[0.2em] rounded-full border border-violet-500/20 uppercase">
                      Target Analysis {stockInfo.isETF && "(ETF)"}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <h2 className="text-6xl font-black tracking-tighter">{stockInfo.name}</h2>
                    {analysisSignals && (
                      <div className="flex flex-col gap-2 ml-2">
                        {analysisSignals.valSignal && (
                          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-lg ${
                            analysisSignals.valSignal.type === 'buy' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-emerald-500/10' :
                            analysisSignals.valSignal.type === 'sell' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30 shadow-rose-500/10' :
                            'bg-amber-500/20 text-amber-400 border-amber-500/30 shadow-amber-500/10'
                          }`}>
                            {analysisSignals.valSignal.type === 'buy' ? <TrendingUp size={12} /> :
                             analysisSignals.valSignal.type === 'sell' ? <TrendingDown size={12} /> : <Activity size={12} />}
                            {analysisSignals.valSignal.text}
                          </div>
                        )}
                        {analysisSignals.kdSignal && (
                          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-lg ${
                            analysisSignals.kdSignal.type === 'golden' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30 shadow-amber-500/10 animate-pulse' :
                            analysisSignals.kdSignal.type === 'death' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30 shadow-rose-500/10 animate-pulse' :
                            analysisSignals.kdSignal.type === 'up' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                            analysisSignals.kdSignal.type === 'down' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                            'bg-slate-500/10 text-slate-400 border-slate-500/20'
                          }`}>
                            {analysisSignals.kdSignal.type === 'golden' ? <TrendingUp size={12} /> :
                             analysisSignals.kdSignal.type === 'death' ? <TrendingDown size={12} /> : 
                             analysisSignals.kdSignal.type === 'up' ? <TrendingUp size={12} /> :
                             analysisSignals.kdSignal.type === 'down' ? <TrendingDown size={12} /> : <Activity size={12} />}
                            {analysisSignals.kdSignal.text}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="px-8 py-3 bg-white/5 rounded-3xl border border-white/10 font-mono text-3xl text-slate-400">
                  {stockInfo.symbol}
                </div>
              </div>

              {/* Real-time Ticker Row */}
              {stockInfo.realtime && (
                <div className="flex flex-wrap items-center gap-x-12 gap-y-6 pt-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">成交價 / 漲跌</span>
                    <div className="flex items-baseline gap-3">
                      <span className="text-5xl font-black tracking-tighter text-white">${stockInfo.currentPrice.toFixed(2)}</span>
                      <div className={`flex items-center gap-1 font-black text-lg ${stockInfo.realtime.change >= 0 ? 'text-rose-500' : 'text-emerald-400'}`}>
                        {stockInfo.realtime.change >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                        {stockInfo.realtime.change >= 0 ? '+' : ''}{stockInfo.realtime.change.toFixed(2)} ({stockInfo.realtime.changePercent.toFixed(2)}%)
                      </div>
                    </div>
                    {/* New: Book Value Per Share (BVPS) */}
                    <div className="flex items-center gap-2 mt-1 opacity-70">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">股票淨值:</span>
                      <span className="text-lg font-black text-slate-300">${stockInfo.bvps?.toFixed(2) || '--'}</span>
                    </div>
                  </div>

                  <div className="h-10 w-[1px] bg-white/10 hidden md:block" />

                  <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-slate-500 uppercase">今日最高 / 最低</span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-lg font-black text-rose-500">${stockInfo.realtime.dayHigh.toFixed(2)}</span>
                        <span className="text-sm font-bold text-slate-600">/</span>
                        <span className="text-lg font-black text-emerald-500">${stockInfo.realtime.dayLow.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-slate-500 uppercase">當月最高 / 最低</span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-lg font-black text-rose-400/80">${stockInfo.monthStats?.high?.toFixed(2) || '--'}</span>
                        <span className="text-sm font-bold text-slate-600">/</span>
                        <span className="text-lg font-black text-emerald-400/80">${stockInfo.monthStats?.low?.toFixed(2) || '--'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="h-10 w-[1px] bg-white/10 hidden md:block" />

                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">今日成交量</span>
                    <span className="text-lg font-black text-violet-400">
                      {stockInfo.realtime.volume?.toLocaleString()} 
                      <span className="ml-1 text-[10px] opacity-60">股</span>
                    </span>
                  </div>

                  <div className="ml-auto hidden xl:flex flex-col items-end">
                    <span className="text-[11px] font-bold text-slate-500">
                      {new Date(stockInfo.realtime.time * 1000).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false })}
                    </span>
                  </div>
                </div>
              )}
            </GlassCard>

            {/* Intraday Chart Section - Always show container if stock exists to avoid "missing" feeling */}
            {stockInfo && (() => {
              const intradayData = stockInfo.intraday || [];
              const hasData = intradayData.length > 0;
              const prevClose = stockInfo.realtime?.prevClose || (hasData ? intradayData[0].price : 0);
              const openPrice = stockInfo.realtime?.open || (hasData ? intradayData[0].price : 0);
              const prices = hasData ? intradayData.map(d => d.price) : [openPrice];
              const maxP = Math.max(...prices, openPrice, prevClose);
              const minP = Math.min(...prices, openPrice, prevClose);
              const off = !hasData || maxP === minP ? 0 : (maxP - openPrice) / (maxP - minP);

              // Calculate Y-axis domains for 8-part division (Top 5: Price, Middle 1: Buffer, Bottom 2: Volume)
              const priceRange = maxP - minP;
              const unit = priceRange / 5;
              const domainMax = maxP + (unit * 0.1); 
              const domainMin = domainMax - (unit * 8.1); 

              return (
                <GlassCard className="p-8 flex flex-col border-t-[6px] border-t-blue-500/30 bg-blue-500/[0.01]">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-white/[0.05] rounded-[20px]">
                        <Activity className="text-blue-400" size={20} />
                      </div>
                      <h3 className="text-xl font-black tracking-tight italic">Today's Intraday Trend (1m)</h3>
                    </div>
                    <div className="text-[10px] font-black text-slate-500 uppercase flex gap-6">
                      <span>今日開盤: <span className="text-white">{openPrice > 0 ? `$${openPrice.toFixed(2)}` : '--'}</span></span>
                      {hasData && (
                        <>
                          <span>均價(VWAP): <span className="text-amber-400">${intradayData[intradayData.length - 1].avg.toFixed(2)}</span></span>
                          <span>算術均價: <span className="text-slate-400">${intradayData[intradayData.length - 1].simpleAvg.toFixed(2)}</span></span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="w-full h-[250px] flex items-center justify-center relative">
                    {!hasData ? (
                      <div className="flex flex-col items-center gap-3 text-slate-500 animate-pulse">
                        <AlertTriangle size={48} className="opacity-20" />
                        <span className="text-sm font-bold tracking-widest uppercase opacity-40">Today No Trading Data Available</span>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={intradayData}>
                        <defs>
                          <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                            <stop offset={off} stopColor="#f43f5e" stopOpacity={0.2} />
                            <stop offset={off} stopColor="#10b981" stopOpacity={0.2} />
                          </linearGradient>
                          <linearGradient id="strokePrice" x1="0" y1="0" x2="0" y2="1">
                            <stop offset={off} stopColor="#f43f5e" stopOpacity={1} />
                            <stop offset={off} stopColor="#10b981" stopOpacity={1} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <ReferenceLine y={openPrice} stroke="#ffffff" strokeDasharray="3 3" strokeOpacity={0.3} label={{ position: 'left', value: 'OPEN', fill: '#ffffff', fontSize: 8, opacity: 0.5 }} />
                        <XAxis 
                          dataKey="time" 
                          tick={{ fontSize: 10, fill: '#475569' }} 
                          tickLine={false} 
                          axisLine={false}
                          minTickGap={60}
                        />
                        <YAxis 
                          domain={[domainMin, domainMax]} 
                          tick={{ fontSize: 10, fill: '#475569' }} 
                          width={45} 
                          tickLine={false} 
                          axisLine={false} 
                          tickFormatter={(val) => val.toFixed(2)}
                          tickCount={9}
                        />
                        <YAxis 
                          yAxisId="volume"
                          hide
                          domain={[0, (dataMax) => dataMax * 4]}
                        />
                        <ReferenceLine 
                          y={prevClose} 
                          stroke="#64748b" 
                          strokeDasharray="5 5" 
                          label={{ value: `昨收 ${prevClose.toFixed(2)}`, position: 'insideLeft', fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} 
                        />
                        <ReferenceLine 
                          y={openPrice} 
                          stroke="#475569" 
                          strokeDasharray="3 3" 
                          label={{ value: `OPEN ${openPrice.toFixed(2)}`, position: 'insideLeft', fill: '#475569', fontSize: 10, fontWeight: 'bold' }} 
                        />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#020617', border: '1px solid #ffffff10', borderRadius: '15px' }}
                          itemStyle={{ fontSize: '12px' }}
                          formatter={(val, name) => {
                            if (name === 'price') {
                              const isUp = val >= openPrice;
                              return [
                                <span style={{ color: isUp ? '#f43f5e' : '#10b981' }}>${val.toFixed(2)}</span>,
                                '成交價'
                              ];
                            }
                            if (name === 'avg') {
                              return [
                                <span className="text-amber-400">${val.toFixed(2)}</span>,
                                '平均成本(VWAP)'
                              ];
                            }
                            if (name === 'simpleAvg') {
                              return [
                                <span className="text-slate-400">${val.toFixed(2)}</span>,
                                '交易均價'
                              ];
                            }
                            if (name === 'volume') {
                              return [
                                <span className="text-slate-300">{val.toLocaleString()} <small className="opacity-50">股</small></span>,
                                '成交量'
                              ];
                            }
                            return [val, name];
                          }}
                        />
                        <Bar 
                          dataKey="volume" 
                          yAxisId="volume" 
                          fillOpacity={0.4}
                        >
                          {intradayData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.isUp ? '#f43f5e' : '#10b981'} />
                          ))}
                        </Bar>
                        <Line 
                          type="monotone" 
                          dataKey="price" 
                          stroke="url(#strokePrice)" 
                          strokeWidth={2} 
                          animationDuration={1000}
                          dot={false}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="avg" 
                          stroke="#fbbf24" 
                          strokeWidth={2.5} 
                          dot={false} 
                          animationDuration={1000}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="simpleAvg" 
                          stroke="#cbd5e1" 
                          strokeWidth={1.5} 
                          strokeDasharray="4 4"
                          dot={false} 
                          animationDuration={1000}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </GlassCard>
            );
          })()}



            {/* Annual Stats Table */}
            {valuationData && (
              <GlassCard className="p-8 border-l-[6px] border-l-rose-500 bg-white/[0.01]">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2 bg-white/[0.05] rounded-xl">
                    <Calculator size={18} className="text-rose-400" />
                  </div>
                  <h3 className="text-xl font-black italic tracking-tighter text-slate-300">年度統計與合理價 (5-Year Stats)</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead>
                      <tr className="border-b border-white/10 text-slate-500 text-[10px] uppercase tracking-widest font-black">
                        <th className="pb-4 pl-4">Year</th>
                        <th className="pb-4">High</th>
                        <th className="pb-4">Low</th>
                        <th className="pb-4">Total EPS</th>
                        <th className="pb-4">Book Value</th>
                        <th className="pb-4">Fair Price (Est)</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm font-bold">
                      {(stockInfo.yearlyStats || []).map((y, idx) => {
                         // Use pre-calculated historical fair price from service calibration
                         const displayFairPrice = y.historicalFairPrice || 0;
                         
                         return (
                           <tr key={`yr-${y.year}`} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                             <td className="py-4 pl-4 text-violet-400">{y.year}</td>
                             <td className="py-4 text-emerald-400">${y.high?.toFixed(2) || '-'}</td>
                             <td className="py-4 text-rose-400">${y.low?.toFixed(2) || '-'}</td>
                             <td className="py-4 text-teal-400">{y.totalEps?.toFixed(2) || '-'}</td>
                             <td className="py-4 text-slate-400">${y.bvps?.toFixed(2) || '-'}</td>
                             <td className="py-4 text-blue-400 bg-blue-500/10 rounded-r-lg px-3 font-black">${displayFairPrice > 0 ? displayFairPrice.toFixed(2) : '-'}</td>
                           </tr>
                         );
                      })}
                    </tbody>
                  </table>
                </div>
              </GlassCard>
            )}

            {/* EPS Bar Chart - Only show if valuation data exists */}
            {valuationData && (
              <GlassCard className="p-8 border-l-[6px] border-l-teal-500 bg-white/[0.01]">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2 bg-white/[0.05] rounded-xl">
                    <Activity size={18} className="text-teal-400" />
                  </div>
                  <h3 className="text-xl font-black italic tracking-tighter text-slate-300">長期 EPS 成長追蹤</h3>
                </div>
                <div className="w-full h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stockInfo.history}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="quarter" tick={{ fontSize: 10, fill: '#475569' }} tickLine={false} axisLine={false} />
                      <YAxis type="number" tick={{ fontSize: 10, fill: '#475569' }} tickLine={false} axisLine={false} width={35} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#020617', border: '1px solid #ffffff10', borderRadius: '12px' }} 
                        itemStyle={{ fontSize: '11px', fontWeight: 900 }} 
                        cursor={{fill: '#ffffff05'}}
                        formatter={(value, name, props) => {
                          if (name === '單季EPS') {
                            return [
                              <div className="flex flex-col gap-1">
                                <span className="text-teal-400">當季 EPS: {value?.toFixed(2)}</span>
                                <span className="text-slate-500 text-[10px] font-medium italic">年度累計: {props.payload.yearlyEps?.toFixed(2)}</span>
                              </div>,
                              ''
                            ];
                          }
                          return [value, name];
                        }}
                      />
                      <Bar dataKey="eps" name="單季EPS">
                        {(stockInfo.history || []).map((entry, index) => (
                           <Cell key={`eps-${index}`} fill={(entry.eps || 0) > 0 ? '#0d9488' : '#f43f5e'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>
            )}

            {/* River Section - Only show if not ETF and has valuation data */}
            {valuationData ? (
              <GlassCard className="p-8 flex flex-col border-t-[6px] border-t-emerald-500/30">
                <div className="flex items-center justify-between mb-10">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-white/[0.05] rounded-[20px]">
                      <Activity className="text-emerald-400" size={20} />
                    </div>
                    <h3 className="text-xl font-black tracking-tight italic">{mode} {mode === 'DCF' ? 'Intrinsic Value' : '12-Quarter Trend River'}</h3>
                  </div>
                  <div className="flex gap-2 bg-white/[0.03] p-1.5 rounded-2xl border border-white/5">
                    {['PE', 'PB', 'DCF'].map(m => (
                      <button 
                        key={m} 
                        onClick={() => setMode(m)}
                        className={`px-6 py-2.5 rounded-xl font-black text-xs transition-all ${mode === m ? 'bg-violet-600 shadow-lg shadow-violet-600/30' : 'text-slate-500 hover:text-white'}`}
                      >
                        {m} 模型
                      </button>
                    ))}
                  </div>
                </div>

                <div className="w-full h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={stockInfo.valuation?.riverData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="quarter" tick={{ fontSize: 10, fill: '#475569' }} tickLine={false} axisLine={false} />
                      
                      {/* Left Axis for Ratio (PE/PB) */}
                      <YAxis 
                        tick={{ fontSize: 10, fill: '#8b5cf6' }} 
                        width={30} 
                        tickLine={false} 
                        axisLine={false} 
                        label={{ value: mode === 'DCF' ? 'Value ($)' : mode, angle: -90, position: 'insideLeft', fill: '#8b5cf6', fontSize: 10, fontWeight: 'bold' }}
                      />
                      
                      {/* Right Axis for Price ($) */}
                      <YAxis 
                        yAxisId="price" 
                        orientation="right"
                        domain={['auto', 'auto']} 
                        tick={{ fontSize: 10, fill: '#ffffff' }} 
                        width={45} 
                        tickLine={false} 
                        axisLine={false} 
                        label={{ value: 'Price ($)', angle: 90, position: 'insideRight', fill: '#ffffff', fontSize: 10, fontWeight: 'bold' }}
                      />

                      <Tooltip 
                        contentStyle={{ backgroundColor: '#020617', border: '1px solid #ffffff10', borderRadius: '20px' }}
                        itemStyle={{ fontSize: '12px', padding: 0 }}
                        formatter={(val, name) => {
                          if (name === 'price') return [`$${val.toFixed(2)}`, '股價'];
                          if (name === 'pe') return [`${val.toFixed(2)}x`, '當前本益比(PE)'];
                          if (name === 'pb') return [`${val.toFixed(2)}x`, '當前股價淨值比(PB)'];
                          return [val, name];
                        }}
                      />

                      {mode === 'DCF' && (
                        <defs>
                          <linearGradient id="colorDcf" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                          </linearGradient>
                        </defs>
                      )}

                      {mode !== 'DCF' ? (
                        <>
                          <Bar 
                            dataKey={mode.toLowerCase()} 
                            fill={mode === 'PE' ? '#8b5cf6' : '#0ea5e9'} 
                            fillOpacity={0.4}
                            radius={[6, 6, 0, 0]}
                            barSize={32}
                          />
                          <Line 
                            yAxisId="price" 
                            type="monotone" 
                            dataKey="price" 
                            stroke="#ffffff" 
                            strokeWidth={3} 
                            dot={{ r: 4, fill: '#ffffff', strokeWidth: 2 }} 
                          />
                          <Line yAxisId="price" type="monotone" dataKey={mode.toLowerCase() + 'Fair'} stroke="#fbbf24" strokeDasharray="5 5" strokeOpacity={0.3} dot={false} />
                        </>
                      ) : (
                        <>
                          <Bar 
                            dataKey="dcfFair" 
                            fill="url(#colorDcf)" 
                            radius={[6, 6, 0, 0]}
                            barSize={40}
                            name="DCF 合理價值"
                          />
                          {/* Reference bands as subtle dotted lines */}
                          <Line yAxisId="price" type="monotone" dataKey="dcfExpensive" stroke="#f43f5e" strokeDasharray="3 3" strokeOpacity={0.4} dot={false} />
                          <Line yAxisId="price" type="monotone" dataKey="dcfCheap" stroke="#10b981" strokeDasharray="3 3" strokeOpacity={0.4} dot={false} />
                          <Line 
                            yAxisId="price" 
                            type="monotone" 
                            dataKey="price" 
                            stroke="#ffffff" 
                            strokeWidth={3} 
                            dot={{ r: 5, fill: '#ffffff', strokeWidth: 2 }} 
                            name="目前價格"
                          />
                        </>
                      )}
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>
            ) : (
              <GlassCard className="p-12 flex flex-col items-center justify-center border-t-[6px] border-t-violet-400/30 bg-violet-500/[0.02]">
                <Activity size={40} className="text-violet-400 mb-6 opacity-50" />
                <h3 className="text-2xl font-black italic tracking-tighter mb-2">ETF 技術分析模式</h3>
                <p className="text-slate-500 text-sm font-bold text-center max-w-md">
                  由於 ETF 無單獨盈餘數據，系統自動切換至技術指標分析模式。請參考下方的 K 線圖與 KD、RSI 等動能指標進行決策。
                </p>
              </GlassCard>
            )}

            {/* Info Widgets */}
            {valuationData && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <InfoWidget title="Current Price" value={`$${stockInfo.currentPrice?.toFixed(2) || 'N/A'}`} icon={<Activity />} />
                <InfoWidget title={`${mode} Safety Edge`} value={`$${valuationData.cheap?.toFixed(2) || 'N/A'}`} icon={<Shield />} color="#10b981" />
                <InfoWidget title="Growth Potential" value={`$${(valuationData.expensive || valuationData.fair * 1.5)?.toFixed(2) || 'N/A'}`} icon={<TrendingUp />} color="#f43f5e" />
              </div>
            )}




            {/* K-Line Section */}
            <GlassCard className="p-8 flex flex-col border-t-[6px] border-t-violet-600/30">
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/[0.05] rounded-[20px]">
                    <LineChartIcon className="text-violet-400" size={20} />
                  </div>
                  <h3 className="text-xl font-black tracking-tight italic">2-Year K-Line & Indicators</h3>
                </div>
              </div>

              <div className="text-[10px] font-bold px-10 mb-2 flex gap-6">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="text-slate-400">MA5:</span>
                  <span className="text-white font-black">{activeHoverPoint?.ma5?.toFixed(2) || (computedKline && computedKline[computedKline.length-1].ma5?.toFixed(2)) || '--'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-slate-400">MA20:</span>
                  <span className="text-white font-black">{activeHoverPoint?.ma20?.toFixed(2) || (computedKline && computedKline[computedKline.length-1].ma20?.toFixed(2)) || '--'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-pink-500" />
                  <span className="text-slate-400">MA60:</span>
                  <span className="text-white font-black">{activeHoverPoint?.ma60?.toFixed(2) || (computedKline && computedKline[computedKline.length-1].ma60?.toFixed(2)) || '--'}</span>
                </div>
              </div>

              {/* Price Chart */}
              <div className="w-full h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart 
                    data={computedKline} 
                    syncId="techChart" 
                    onMouseMove={handleHover} 
                    onMouseLeave={handleMouseLeave}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="date" hide />
                    <YAxis 
                      type="number" 
                      yAxisId="price"
                      domain={['auto', 'auto']} 
                      tick={{ fontSize: 10, fill: '#475569' }} 
                      width={60} 
                      tickLine={false} 
                      axisLine={false} 
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#020617', border: '1px solid #ffffff10', borderRadius: '20px' }}
                      itemStyle={{ fontSize: '12px', padding: 0 }}
                      formatter={(val) => typeof val === 'number' ? val.toFixed(2) : val}
                    />
                    <Bar yAxisId="price" dataKey="close" barSize={4}>
                      {(computedKline || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.isUp ? '#ef4444' : '#22c55e'} opacity={0.6 + (index / (computedKline?.length || 1)) * 0.4} />
                      ))}
                    </Bar>
                    <Line yAxisId="price" type="monotone" dataKey="ma5" stroke="#fbbf24" strokeWidth={2.5} dot={false} connectNulls />
                    <Line yAxisId="price" type="monotone" dataKey="ma20" stroke="#3b82f6" strokeWidth={2.5} dot={false} connectNulls />
                    <Line yAxisId="price" type="monotone" dataKey="ma60" stroke="#ec4899" strokeWidth={2.5} dot={false} connectNulls />
                    <Brush dataKey="date" height={30} stroke="#8b5cf6" fill="#020617" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* MACD Chart */}
              <div className="w-full h-[120px] mt-2 border-t border-white/5 pt-2">
                <div className="text-[9px] font-bold text-slate-500 mb-1 px-10 flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <span>MACD ({macdConfig.fast}, {macdConfig.slow}, {macdConfig.signal})</span>
                    <div className="flex gap-1">
                      {[
                        {f: 5, s: 13, sig: 6},
                        {f: 12, s: 26, sig: 9},
                        {f: 20, s: 50, sig: 9}
                      ].map(p => (
                        <button 
                          key={`${p.f}-${p.s}`} 
                          onClick={() => setMacdConfig({ fast: p.f, slow: p.s, signal: p.sig })}
                          className={`px-2 py-0.5 rounded text-[8px] transition ${macdConfig.fast === p.f ? 'bg-violet-600 text-white' : 'bg-white/5 text-slate-500 hover:bg-white/10'}`}
                        >
                          ({p.f},{p.s},{p.sig})
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart 
                    data={computedKline} 
                    syncId="techChart" 
                    onMouseMove={handleHover} 
                    onMouseLeave={handleMouseLeave}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="date" hide />
                    <YAxis type="number" domain={['auto', 'auto']} tick={{ fontSize: 10, fill: '#475569' }} width={60} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#020617', border: '1px solid #ffffff10', borderRadius: '12px' }} itemStyle={{ fontSize: '12px', padding: 0 }} />
                    <Bar dataKey="osc" barSize={3}>
                      {(computedKline || []).map((entry, index) => (
                        <Cell key={`macd-${index}`} fill={(entry.osc || 0) >= 0 ? '#ef4444' : '#22c55e'} opacity={0.8} />
                      ))}
                    </Bar>
                    <Line type="monotone" dataKey="dif" stroke="#3b82f6" strokeWidth={1.2} dot={false} />
                    <Line type="monotone" dataKey="dem" stroke="#f59e0b" strokeWidth={1.2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* RSI Chart */}
              <div className="w-full h-[120px] mt-2 border-t border-white/5 pt-2">
                <div className="text-[9px] font-bold text-slate-500 mb-1 px-10">RSI (14)</div>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart 
                    data={computedKline} 
                    syncId="techChart" 
                    onMouseMove={handleHover} 
                    onMouseLeave={handleMouseLeave}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="date" hide />
                    <YAxis type="number" domain={[0, 100]} ticks={[30, 70]} tick={{ fontSize: 10, fill: '#475569' }} width={60} tickLine={false} axisLine={false} />
                    <ReferenceLine y={70} stroke="#f43f5e" strokeDasharray="3 3" strokeOpacity={0.5} />
                    <ReferenceLine y={30} stroke="#10b981" strokeDasharray="3 3" strokeOpacity={0.5} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#020617', border: '1px solid #ffffff10', borderRadius: '12px' }} 
                      itemStyle={{ fontSize: '12px', padding: 0 }}
                      formatter={(val) => typeof val === 'number' ? val.toFixed(2) : val}
                    />
                    <Line type="monotone" dataKey="rsi" stroke="#ec4899" strokeWidth={1.5} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* KD Chart */}
              <div className="w-full h-[120px] mt-2 border-t border-white/5 pt-2">
                <div className="text-[9px] font-bold text-slate-500 mb-1 px-10 flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <span>KD ({kdPeriod}, 3, 3)</span>
                    <div className="flex gap-1">
                      {[5, 9, 14].map(p => (
                        <button 
                          key={p} 
                          onClick={() => setKdPeriod(p)}
                          className={`px-2 py-0.5 rounded text-[8px] transition ${kdPeriod === p ? 'bg-violet-600 text-white' : 'bg-white/5 text-slate-500 hover:bg-white/10'}`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart 
                    data={computedKline} 
                    syncId="techChart" 
                    onMouseMove={handleHover} 
                    onMouseLeave={handleMouseLeave}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="date" hide />
                    <YAxis type="number" domain={[0, 100]} ticks={[20, 80]} tick={{ fontSize: 10, fill: '#475569' }} width={60} tickLine={false} axisLine={false} />
                    <ReferenceLine y={80} stroke="#ef4444" strokeDasharray="3 3" strokeOpacity={0.5} />
                    <ReferenceLine y={20} stroke="#22c55e" strokeDasharray="3 3" strokeOpacity={0.5} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#020617', border: '1px solid #ffffff10', borderRadius: '12px' }} 
                      itemStyle={{ fontSize: '12px', padding: 0 }}
                      formatter={(val) => typeof val === 'number' ? val.toFixed(2) : val}
                    />
                    <Line type="monotone" dataKey="kdK" name="K" stroke="#eab308" strokeWidth={1.5} dot={false} />
                    <Line type="monotone" dataKey="kdD" name="D" stroke="#3b82f6" strokeWidth={1.5} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Volume Chart */}
              <div className="w-full h-[120px] mt-2 border-t border-white/5 pt-2">
                <div className="text-[9px] font-bold text-slate-500 mb-1 px-10 flex justify-between items-center">
                  <span>成交量 (Volume) {hoverPoint ? <span className="text-slate-400 font-normal">| {hoverPoint.date}</span> : ''}</span>
                  <span className="text-violet-400 font-black tracking-tight text-[11px]">
                    {hoverPoint ? 'POINT: ' : 'LATEST: '} 
                    {(hoverPoint?.volume ?? computedKline?.[computedKline.length - 1]?.volume)?.toLocaleString()}
                  </span>
                </div>
                <div className="w-full h-[150px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart 
                      data={computedKline} 
                      syncId="techChart" 
                      onMouseMove={handleHover} 
                      onMouseLeave={handleMouseLeave}
                      margin={{ top: 10, right: 30, left: 0, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#475569' }} tickLine={false} axisLine={false} />
                      <YAxis 
                        type="number" 
                        tick={{ fontSize: 10, fill: '#475569' }} 
                        width={60} 
                        tickLine={false} 
                        axisLine={false} 
                        tickFormatter={(val) => {
                          if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M';
                          if (val >= 1000) return (val / 1000).toFixed(0) + 'K';
                          return val;
                        }}
                      />
                      <YAxis 
                        yAxisId="price" 
                        orientation="right" 
                        domain={['auto', 'auto']} 
                        hide 
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#020617', border: '1px solid #ffffff10', borderRadius: '12px' }} 
                        itemStyle={{ fontSize: '12px', padding: 0 }}
                        formatter={(val, name) => [name === '成交量' ? val?.toLocaleString() : val.toFixed(2), name]}
                      />
                      <Bar dataKey="volume" name="成交量" isAnimationActive={false}>
                        {(computedKline || []).map((entry, index) => (
                          <Cell key={`vol-${index}`} fill={entry.isUp ? '#f43f5e' : '#10b981'} opacity={0.5} />
                        ))}
                      </Bar>
                      <Line 
                        yAxisId="price" 
                        type="monotone" 
                        dataKey="close" 
                        name="收盤價" 
                        stroke="#ffffff" 
                        strokeWidth={1.5} 
                        dot={false} 
                        opacity={0.8}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* AI Tech Diagnosis */}
              <div className="mt-8 p-6 bg-white/[0.03] rounded-[32px] border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <BrainCircuit size={14} className="text-violet-500" /> AI Tech Diagnosis
                </h4>
                <div className="flex flex-col md:flex-row md:items-center gap-6 flex-wrap">
                  <IndicatorRow label="MA5 (Short)" val={activeHoverPoint ? activeHoverPoint.ma5 : computedKline?.[computedKline.length - 1]?.ma5} current={activeHoverPoint ? activeHoverPoint.close : stockInfo.currentPrice} color="#92400e" />
                  <IndicatorRow label="MA20 (Mid)" val={activeHoverPoint ? activeHoverPoint.ma20 : computedKline?.[computedKline.length - 1]?.ma20} current={activeHoverPoint ? activeHoverPoint.close : stockInfo.currentPrice} color="#3b82f6" />
                  <IndicatorRow label="MA60 (Quarter)" val={activeHoverPoint ? activeHoverPoint.ma60 : computedKline?.[computedKline.length - 1]?.ma60} current={activeHoverPoint ? activeHoverPoint.close : stockInfo.currentPrice} color="#eab308" />
                  
                  {/* Volume Summary */}
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                    <span className="text-[11px] font-bold text-slate-400">VOL</span>
                    <span className="text-xs font-black text-violet-300">
                      {(activeHoverPoint?.volume ?? computedKline?.[computedKline.length - 1]?.volume)?.toLocaleString()}
                    </span>
                  </div>

                  {/* MACD Diagnosis */}
                  {(() => {
                    const klineArr = computedKline || [];
                    const k1 = activeHoverPoint || klineArr[klineArr.length - 1];
                    const idx = activeHoverPoint ? klineArr.findIndex(k => k.date === activeHoverPoint.date) : klineArr.length - 1;
                    const k2 = klineArr[idx - 1] || k1;
                    if (!k1?.dif || !k2?.dif) return null;
                    
                    let msg = "Bearish"; let colorClass = "text-rose-400"; let dotColor = "#f43f5e";
                    if (k1.dif > k1.dem && k2.dif <= k2.dem) { msg = "Golden Cross"; colorClass = "text-emerald-400"; dotColor = "#10b981"; }
                    else if (k1.dif < k1.dem && k2.dif >= k2.dem) { msg = "Death Cross"; colorClass = "text-rose-400"; dotColor = "#f43f5e"; }
                    else if (k1.dif > k1.dem) { msg = "Bullish Track"; colorClass = "text-emerald-400/80"; dotColor = "#34d399"; }

                    return (
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dotColor }} />
                        <span className="text-[11px] font-bold text-slate-400">MACD</span>
                        <span className={`text-xs w-24 font-black ${colorClass}`}>{msg}</span>
                      </div>
                    );
                  })()}

                  {/* RSI Diagnosis */}
                  {(() => {
                    const klineArr = computedKline || [];
                    const p = activeHoverPoint || klineArr[klineArr.length - 1];
                    const rsi = p?.rsi;
                    if (rsi == null) return null;
                    
                    let msg = `Weak (${rsi})`; let colorClass = "text-rose-400/80"; let dotColor = "#f43f5e";
                    if (rsi >= 70) { msg = `Overbought (${rsi})`; colorClass = "text-rose-400"; dotColor = "#f43f5e"; }
                    else if (rsi <= 30) { msg = `Oversold (${rsi})`; colorClass = "text-emerald-400"; dotColor = "#10b981"; }
                    else if (rsi > 50) { msg = `Strong (${rsi})`; colorClass = "text-emerald-400/80"; dotColor = "#34d399"; }

                    return (
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dotColor }} />
                        <span className="text-[11px] font-bold text-slate-400">RSI</span>
                        <span className={`text-xs w-28 font-black ${colorClass}`}>{msg}</span>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </GlassCard>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Wrap in ErrorBoundary
const DashboardWithErrorBoundary = () => (
  <ErrorBoundary>
    <Dashboard />
  </ErrorBoundary>
);

export default DashboardWithErrorBoundary;
