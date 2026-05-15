import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, ReferenceLine,
  ComposedChart, Line, Bar, Cell, BarChart, Brush
} from 'recharts';
import { 
  Search, TrendingUp, TrendingDown, Shield, HelpCircle, Activity, BrainCircuit, 
  Calculator, Settings2, RefreshCw, Globe, Waves, Trash2, LineChart as LineChartIcon,
  ChevronRight, AlertTriangle, Target
} from 'lucide-react';
import { calculateValuation } from '../utils/valuation';
import { 
  fetchStockData, calculateKD, calculateMACD
} from '../utils/stockDataService';
import { motion, AnimatePresence } from 'framer-motion';

// =============================================
// I18n Dictionary
// =============================================

const translations = {
  zh: {
    syncing: "正在同步全球市場狀態...",
    connected: "實時雲端連線已啟動",
    hub: "AI 驅動量化中心",
    placeholder: "輸入股票代碼...",
    analyze: "即刻分析",
    recent: "最近查詢",
    loading_title: "數據讀取中...",
    loading_sub: "正在執行並行快取機制",
    error_title: "連線中斷或查無此股",
    error_retry: "嘗試手動修復連線",
    idle_title: "等待輸入...",
    idle_sub: "請在上方輸入想查詢的股票代碼",
    target_analysis: "標的分析",
    etf: "(ETF)",
    price_change: "成交價 / 漲跌",
    bvps: "股票淨值",
    day_range: "今日最高 / 最低",
    month_range: "當月最高 / 最低",
    volume: "今日成交量",
    unit_share: "股",
    buy: "宜買進",
    sell: "宜賣出",
    hold: "觀望",
    golden: "KD 黃金交叉",
    death: "KD 死亡交叉",
    up: "KD 向上",
    down: "KD 向下",
    flat: "KD 持平",
    intraday: "今日即時走勢 (1分)",
    open: "今日開盤",
    vwap: "均價(VWAP)",
    simple_avg: "算術均價",
    last_close: "昨收",
    no_data: "今日暫無交易數據",
    stats_title: "年度統計與合理價 (5年)",
    eps_track: "長期 EPS 成長追蹤",
    quarter_eps: "單季 EPS",
    accumulated_eps: "年度累計",
    river_title: "趨勢河圖 (12季)",
    intrinsic_value: "內在價值趨勢",
    mode_btn: "模型",
    PE: "本益比 (PE)",
    PB: "股價淨值比 (PB)",
    DCF: "現金流折現 (DCF)",
    year: "年度",
    high: "最高",
    low: "最低",
    total_eps: "總盈餘",
    book_value: "每股淨值",
    fair_price: "合理價 (估)",
    render_error: "系統渲染錯誤",
    reload: "重新載入",
    unknown_error: "未知錯誤",
    strategy_analysis: "三合一估值與進場策略分析",
    price_range: "價格區間",
    dcf_signal: "DCF 信號",
    yield_signal: "預估殖利率",
    pb_signal: "PB 評價",
    rating: "綜合評價",
    strategy_action: "實戰建議",
    entry_strategy: "進場策略 (分批佈局)",
    exit_strategy: "出場邏輯 (停利參考)",
    strong_buy: "強烈買進",
    buy_signal: "分批買進",
    hold_signal: "中性持有",
    conservative: "保守減碼",
    avoid: "避開風險",
    batch_1: "第一批買進位階",
    batch_2: "第二批加碼位階",
    batch_3: "底部重倉位階",
    exit_logic: "開始減碼區間",
    overheated: "市場過熱/全部出場",
    below: "以下",
    above: "以上"
  },
  en: {
    syncing: "Syncing global markets...",
    connected: "Cloud connection active",
    hub: "AI-Driven Quantitative Hub",
    placeholder: "Enter symbol...",
    analyze: "Analyze",
    recent: "Recent",
    loading_title: "Fetching Data...",
    loading_sub: "Running parallel analysis engines",
    error_title: "Connection Lost or Symbol Not Found",
    error_retry: "Attempt Manual Repair",
    idle_title: "WAITING FOR INPUT...",
    idle_sub: "Please enter a stock symbol above",
    target_analysis: "Target Analysis",
    etf: "(ETF)",
    price_change: "Price / Change",
    bvps: "Book Value",
    day_range: "Day High / Low",
    month_range: "Month High / Low",
    volume: "Volume",
    unit_share: "sh",
    buy: "Good to Buy",
    sell: "Good to Sell",
    hold: "Wait & See",
    golden: "KD Golden Cross",
    death: "KD Death Cross",
    up: "KD Trending Up",
    down: "KD Trending Down",
    flat: "KD Flat",
    intraday: "Intraday Trend (1m)",
    open: "Open",
    vwap: "VWAP",
    simple_avg: "Avg Price",
    last_close: "Prev Close",
    no_data: "No Trading Data Available",
    stats_title: "Yearly Stats & Fair Price (5Y)",
    eps_track: "Long-term EPS Track",
    quarter_eps: "Quarterly EPS",
    accumulated_eps: "Yearly Accumulated",
    river_title: "12-Quarter Trend River",
    intrinsic_value: "Intrinsic Value Trend",
    mode_btn: "Mode",
    PE: "Price-to-Earnings (PE)",
    PB: "Price-to-Book (PB)",
    DCF: "Discounted Cash Flow (DCF)",
    year: "Year",
    high: "High",
    low: "Low",
    total_eps: "Total EPS",
    book_value: "Book Value",
    fair_price: "Fair Price (Est)",
    render_error: "Render Error",
    reload: "Reload",
    unknown_error: "Unknown Error",
    strategy_analysis: "3-in-1 Strategy Analysis",
    price_range: "Price Range",
    dcf_signal: "DCF Signal",
    yield_signal: "Est. Yield",
    pb_signal: "PB Level",
    rating: "Rating",
    strategy_action: "Action Strategy",
    entry_strategy: "Entry Strategy (Batching)",
    exit_strategy: "Exit Logic (Profit taking)",
    strong_buy: "Strong Buy",
    buy_signal: "Batch Buy",
    hold_signal: "Hold",
    conservative: "Reduce",
    avoid: "Avoid/Sell",
    batch_1: "1st Batch Entry",
    batch_2: "2nd Batch Entry",
    batch_3: "Bottom Loading",
    exit_logic: "Start Reducing",
    overheated: "Overheated/Full Exit",
    below: "Below",
    above: "Above"
  }
};


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
      <span className={`text-xs font-black ${diff >= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
        {diff >= 0 ? '+' : ''}{diff.toFixed(2)}%
      </span>
    </div>
  );
};

const StrategyTable = ({ stockInfo, valuation, t }) => {
  if (!stockInfo || !valuation) return null;

  const peFair  = valuation.pe?.fair  || 0;
  const pbFair  = valuation.pb?.fair  || 0;
  const dcfFair = valuation.dcf?.fair || 0;
  const currentPrice = stockInfo.currentPrice;

  // ── 三合一合理價：綜合模型估值與年度歷史規律 ────────────────────────────
  // 加入年度歷史合理價 (當年度的高低價中點)，這能反映市場對目前業績與題材的實際評價
  const yearlyFair = stockInfo.yearlyStats?.[0]?.historicalFairPrice || 0;
  
  // 原有的模型估值群組 (PE/PB/DCF)
  const validFairs = [peFair, pbFair, dcfFair].filter(v => v > 0).sort((a, b) => a - b);
  
  // 取模型中位數
  let modelMedian = currentPrice;
  if (validFairs.length === 3) {
    modelMedian = validFairs[1];
  } else if (validFairs.length > 0) {
    modelMedian = validFairs.reduce((a, b) => a + b, 0) / validFairs.length;
  }

  // 綜合判斷：如果年度歷史合理價顯著高於模型（代表強勁市場動能或未來溢價），
  // 則錨點應該向市場現實靠攏，而非死守落後的歷史 TTM 模型。
  let fairAnchor = modelMedian;
  if (yearlyFair > 0) {
    // 如果年度合理價與模型有差異，採加權平均 (平衡模型與歷史規律)
    if (yearlyFair > modelMedian * 1.15) {
      fairAnchor = (modelMedian * 0.3) + (yearlyFair * 0.7); // 更向年度規律靠攏
    } else {
      fairAnchor = (modelMedian + yearlyFair) / 2;
    }
  }
  
  // ── 動態調整：如果現價遠高於錨點且模型中位數也較高，則適度拉升錨點，避免進場策略過於保守 ──
  if (currentPrice > fairAnchor * 1.1 && modelMedian > fairAnchor) {
    fairAnchor = (fairAnchor * 0.7) + (Math.min(currentPrice, modelMedian) * 0.3);
  }

  // 防呆：錨點不應偏離現價過於離譜 (至少要有現價的 75%)
  fairAnchor = Math.max(fairAnchor, currentPrice * 0.75);

  // ── PB 區間：依實際 avg / min / max 動態計算，避免硬編碼 ──
  const pbAvg = valuation.pb?.avg || 1.0;
  const pbMin = valuation.pb?.min || pbAvg * 0.7;
  const pbMax = valuation.pb?.max || pbAvg * 1.3;
  // 每個價格區間對應的 PB 值 = 區間中間價 ÷ BVPS
  const bvps = (pbFair > 0 && pbAvg > 0) ? (pbFair / pbAvg) : 0;
  const calcPB = (price) => (bvps > 0 ? price / bvps : null);
  const fmtPB  = (lo, hi) => {
    if (!bvps) return '--';
    return `${calcPB(lo).toFixed(2)}~${calcPB(hi).toFixed(2)}`;
  };
  const fmtPBAbove = (price) => (!bvps ? '--' : `>${calcPB(price).toFixed(2)}`);
  const fmtPBBelow = (price) => (!bvps ? '--' : `<${calcPB(price).toFixed(2)}`);

  // ── DCF 信號：顯示各區間中間價相對 DCF 合理價的偏離度 ──
  const dcfSignal = (midPrice) => {
    if (!dcfFair || dcfFair <= 0) return '--';
    const diff = ((midPrice - dcfFair) / dcfFair) * 100;
    if (diff > 20)  return `DCF +${diff.toFixed(0)}% 高估`;
    if (diff > 5)   return `DCF +${diff.toFixed(0)}%`;
    if (diff > -5)  return `DCF ≈ 合理`;
    if (diff > -20) return `DCF ${diff.toFixed(0)}%`;
    return `DCF ${diff.toFixed(0)}% 低估`;
  };

  // ── 估計股利 ──
  const yahooDiv = stockInfo.summary?.summaryDetail?.dividendRate?.raw ||
                   stockInfo.summary?.summaryDetail?.trailingAnnualDividendRate?.raw || 0;
  const avgEps3Y = (stockInfo.yearlyStats?.slice(0, 3).reduce((acc, y) => acc + (y.totalEps || 0), 0) /
                   Math.max(stockInfo.yearlyStats?.slice(0, 3).length, 1)) || 0;
  const estDividend = Math.max(yahooDiv || (avgEps3Y * 0.7) || 0, 0);

  // ── 各區間定義（以 fairAnchor 為軸心） ──
  const z5lo = fairAnchor * 1.25;                      // 避開風險：> 125%
  const z4lo = fairAnchor * 1.08; const z4hi = z5lo;  // 保守減碼：108%~125% (原 110%)
  const z3lo = fairAnchor * 0.97; const z3hi = z4lo;  // 中性持有：97%~108% (原 95%~110%)
  const z2lo = fairAnchor * 0.82; const z2hi = z3lo;  // 分批買進：82%~97% (原 80%~95%)
  const z1hi = z2lo;                                   // 強烈買進：< 82% (原 80%)

  const levels = [
    {
      id: 5,
      label: t('avoid'),
      price: `>${z5lo.toFixed(1)}`,
      dcf: dcfSignal(z5lo * 1.05),
      yield: (estDividend > 0 ? (estDividend / z5lo * 100).toFixed(1) + '%' : '--'),
      pb: fmtPBAbove(z5lo),
      rating: '⭐',
      color: 'text-slate-500',
      bg: 'hover:bg-slate-500/10'
    },
    {
      id: 4,
      label: t('conservative'),
      price: `${z4lo.toFixed(1)}~${z4hi.toFixed(1)}`,
      dcf: dcfSignal((z4lo + z4hi) / 2),
      yield: (estDividend > 0 ? (estDividend / ((z4lo + z4hi) / 2) * 100).toFixed(1) + '%' : '--'),
      pb: fmtPB(z4lo, z4hi),
      rating: '⭐⭐',
      color: 'text-amber-400',
      bg: 'hover:bg-amber-400/10'
    },
    {
      id: 3,
      label: t('hold_signal'),
      price: `${z3lo.toFixed(1)}~${z3hi.toFixed(1)}`,
      dcf: dcfSignal(fairAnchor),
      yield: (estDividend > 0 ? (estDividend / fairAnchor * 100).toFixed(1) + '%' : '--'),
      pb: fmtPB(z3lo, z3hi),
      rating: '⭐⭐⭐',
      color: 'text-emerald-400',
      bg: 'hover:bg-emerald-400/10'
    },
    {
      id: 2,
      label: t('buy_signal'),
      price: `${z2lo.toFixed(1)}~${z2hi.toFixed(1)}`,
      dcf: dcfSignal((z2lo + z2hi) / 2),
      yield: (estDividend > 0 ? (estDividend / ((z2lo + z2hi) / 2) * 100).toFixed(1) + '%' : '--'),
      pb: fmtPB(z2lo, z2hi),
      rating: '⭐⭐⭐⭐',
      color: 'text-blue-400',
      bg: 'hover:bg-blue-400/10'
    },
    {
      id: 1,
      label: t('strong_buy'),
      price: `<${z1hi.toFixed(1)}`,
      dcf: dcfSignal(z1hi * 0.9),
      yield: (estDividend > 0 ? `>${(estDividend / z1hi * 100).toFixed(1)}%` : '--'),
      pb: fmtPBBelow(z1hi),
      rating: '⭐⭐⭐⭐⭐',
      color: 'text-rose-400',
      bg: 'hover:bg-rose-400/10'
    }
  ];

  return (
    <GlassCard className="p-8 mt-8 border-l-[6px] border-l-blue-500 bg-white/[0.01]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/[0.05] rounded-xl">
            <Target size={18} className="text-blue-400" />
          </div>
          <h3 className="text-xl font-black italic tracking-tighter text-slate-300">{t('strategy_analysis')}</h3>
        </div>
        {estDividend > 0 && (
          <div className="flex items-center gap-2 px-3 py-1 bg-teal-500/10 border border-teal-500/20 rounded-lg">
            <span className="text-[10px] font-black text-teal-500 uppercase tracking-widest">Est. Dividend:</span>
            <span className="text-xs font-bold text-teal-400">${estDividend.toFixed(2)}</span>
          </div>
        )}
      </div>
      {/* ── 三合一合理價摘要 ── */}
      <div className="flex flex-wrap items-center gap-3 mb-6 pb-6 border-b border-white/5">
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">合理價錨點</span>
        {peFair > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-violet-500/10 border border-violet-500/20 rounded-lg">
            <span className="text-[10px] font-black text-violet-400 uppercase">PE</span>
            <span className="text-xs font-bold text-violet-300">${peFair.toFixed(2)}</span>
          </div>
        )}
        {pbFair > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-sky-500/10 border border-sky-500/20 rounded-lg">
            <span className="text-[10px] font-black text-sky-400 uppercase">PB</span>
            <span className="text-xs font-bold text-sky-300">${pbFair.toFixed(2)}</span>
          </div>
        )}
        {dcfFair > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
            <span className="text-[10px] font-black text-emerald-400 uppercase">DCF</span>
            <span className="text-xs font-bold text-emerald-300">${dcfFair.toFixed(2)}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <span className="text-[10px] font-black text-amber-400 uppercase">⌀ 均值</span>
          <span className="text-xs font-bold text-amber-300">${fairAnchor.toFixed(2)}</span>
        </div>
        {currentPrice > 0 && (
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border ${
            currentPrice <= fairAnchor * 0.97 ? 'bg-emerald-500/10 border-emerald-500/20' :
            currentPrice >= fairAnchor * 1.08 ? 'bg-rose-500/10 border-rose-500/20' :
            'bg-slate-500/10 border-slate-500/20'
          }`}>
            <span className={`text-[10px] font-black uppercase ${
              currentPrice <= fairAnchor * 0.97 ? 'text-emerald-400' :
              currentPrice >= fairAnchor * 1.08 ? 'text-rose-400' : 'text-slate-400'
            }`}>現價</span>
            <span className={`text-xs font-bold ${
              currentPrice <= fairAnchor * 0.97 ? 'text-emerald-300' :
              currentPrice >= fairAnchor * 1.08 ? 'text-rose-300' : 'text-slate-300'
            }`}>${currentPrice.toFixed(2)}</span>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="border-b border-white/10 text-slate-500 text-[10px] uppercase tracking-widest font-black">
              <th className="pb-4 pl-4">{t('price_range')}</th>
              <th className="pb-4">{t('DCF')}</th>
              <th className="pb-4">{t('yield_signal')}</th>
              <th className="pb-4">{t('PB')}</th>
              <th className="pb-4">{t('rating')}</th>
              <th className="pb-4">{t('strategy_action')}</th>
            </tr>
          </thead>
          <tbody className="text-sm font-bold">
            {levels.map((lvl) => (
              <tr key={lvl.id} className={`border-b border-white/5 transition-colors ${lvl.bg}`}>
                <td className="py-4 pl-4 text-slate-300">${lvl.price}</td>
                <td className="py-4 text-slate-400">{lvl.dcf}</td>
                <td className="py-4 text-teal-400">{lvl.yield}</td>
                <td className="py-4 text-slate-400">{lvl.pb}</td>
                <td className="py-4 tracking-tighter">{lvl.rating}</td>
                <td className={`py-4 font-black ${lvl.color}`}>{lvl.label}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 pt-8 border-t border-white/5">
        <div>
          <div className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-4">{t('entry_strategy')}</div>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-xs">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-slate-400">{t('batch_1')}：</span>
              <span className="text-emerald-400 font-bold">${(fairAnchor * 0.97).toFixed(1)} {t('below')}</span>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-slate-400">{t('batch_2')}：</span>
              <span className="text-emerald-400 font-bold">${(fairAnchor * 0.88).toFixed(1)} {t('below')}</span>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-slate-400">{t('batch_3')}：</span>
              <span className="text-rose-400 font-black tracking-widest animate-pulse">${(fairAnchor * 0.80).toFixed(1)} {t('below')}</span>
            </div>
          </div>
        </div>
        <div>
          <div className="text-[10px] font-black uppercase tracking-widest text-rose-500 mb-4">{t('exit_strategy')}</div>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-xs">
              <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              <span className="text-slate-400">{t('exit_logic')}：</span>
              <span className="text-rose-400 font-bold">${(fairAnchor * 1.08).toFixed(1)} ~ ${(fairAnchor * 1.25).toFixed(1)}</span>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              <span className="text-slate-400">{t('overheated')}：</span>
              <span className="text-rose-600 font-black tracking-widest">${(fairAnchor * 1.35).toFixed(1)} {t('above')}</span>
            </div>
          </div>
        </div>
      </div>
    </GlassCard>
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
      const currentLang = localStorage.getItem('stock_vision_lang') || 'zh';
      const trans = translations[currentLang] || translations.zh;
      return (
        <div className="min-h-screen bg-[#020617] text-white flex items-center justify-center p-8">
          <div className="text-center space-y-6">
            <AlertTriangle size={60} className="mx-auto text-rose-500" />
            <h2 className="text-3xl font-black">{trans.render_error}</h2>
            <p className="text-slate-400 max-w-md mx-auto">{this.state.error?.message || trans.unknown_error}</p>
            <button onClick={() => window.location.reload()} className="px-8 py-4 bg-violet-600 rounded-2xl font-black">
              {trans.reload}
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
  const [lang, setLang] = useState(() => localStorage.getItem('stock_vision_lang') || 'zh');

  // Translation helper
  const t = useCallback((key) => translations[lang][key] || key, [lang]);

  // Sync lang to localStorage
  useEffect(() => {
    localStorage.setItem('stock_vision_lang', lang);
  }, [lang]);


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
      const val = calculateValuation(result.history, assumptions, result.medianPE);
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
        return [{ symbol: result.symbol, name: result.name }, ...filtered].slice(0, 20);
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
        valSignal = { type: 'buy', text: t('buy') };
      } else if (stockInfo.currentPrice > highestPrice1Y && highestPrice1Y !== -Infinity) {
        valSignal = { type: 'sell', text: t('sell') };
      } else {
        valSignal = { type: 'hold', text: t('hold') };
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
          kdSignal = { type: 'golden', text: t('golden') };
          foundCross = true;
          break;
        } else if (prev.kdK > prev.kdD && curr.kdK < curr.kdD) {
          kdSignal = { type: 'death', text: t('death') };
          foundCross = true;
          break;
        }
      }

      if (!foundCross) {
        const latest = computedKline[lastIndex];
        const prevLatest = computedKline[lastIndex - 1];
        if (latest.kdK > prevLatest.kdK) {
          kdSignal = { type: 'up', text: t('up') };
        } else if (latest.kdK < prevLatest.kdK) {
          kdSignal = { type: 'down', text: t('down') };
        } else {
          kdSignal = { type: 'flat', text: t('flat') };
        }
      }
    }

    return { valSignal, kdSignal, highestPrice1Y };
  }, [stockInfo, computedKline, valuationData, t]);

  // 3. Opening Premium Rate Analysis
  const premiumInfo = useMemo(() => {
    if (!stockInfo || !stockInfo.realtime) return null;
    
    // 取得開盤價 (優先使用即時開盤，若為 0 則使用現價作為保險)
    const open = stockInfo.realtime.open || stockInfo.currentPrice;
    // 取得昨日收盤價 (優先使用 API 欄位，若無則透過現價與漲跌反推)
    const prevClose = stockInfo.realtime.prevClose || (stockInfo.currentPrice - (stockInfo.realtime.change || 0));
    
    if (!prevClose || !open) return null;

    const rate = ((open - prevClose) / prevClose) * 100;
    
    let interpretation = "";
    let sentiment = "";
    let colorClass = "";

    if (rate >= 0) {
      colorClass = "text-rose-400"; // 正值統一為紅色系
      if (rate >= 7) {
        interpretation = "過熱可能";
        sentiment = "情緒極度樂觀";
      } else if (rate >= 5) {
        interpretation = "非常強勢";
        sentiment = "市場進入亢奮區";
      } else if (rate >= 3) {
        interpretation = "強勢";
        sentiment = "多方情緒明顯升溫";
      } else if (rate >= 1) {
        interpretation = "偏強";
        sentiment = "市場開始追價";
      } else {
        interpretation = "普通偏強";
        sentiment = "市場氣氛穩定";
      }
    } else {
      colorClass = "text-emerald-400"; // 負值統一為綠色系
      if (rate <= -7) {
        interpretation = "極端恐慌";
        sentiment = "情緒失控";
      } else if (rate <= -5) {
        interpretation = "很弱";
        sentiment = "利空衝擊";
      } else if (rate <= -3) {
        interpretation = "弱勢";
        sentiment = "恐慌開始";
      } else if (rate <= -1) {
        interpretation = "偏弱";
        sentiment = "賣壓增加";
      } else {
        interpretation = "普通偏弱";
        sentiment = "觀望";
      }
    }

    return { rate, interpretation, sentiment, colorClass };
  }, [stockInfo]);

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
            {loading ? t('syncing') : t('connected')}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
            className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 text-[10px] font-black uppercase tracking-widest transition-all"
          >
            <Globe size={12} />
            {lang === 'zh' ? 'English' : '繁體中文'}
          </button>
          <button onClick={() => window.location.reload()} className="hover:text-violet-400 transition-colors">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
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
            placeholder={t('placeholder')}
            className="w-full h-20 pl-10 pr-24 bg-white/[0.03] border border-white/10 rounded-[30px] font-black text-xl focus:border-violet-500 outline-none transition-all shadow-xl"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
          />
          <button type="submit" className="absolute right-3 top-3 h-14 px-8 bg-violet-600 hover:bg-violet-500 rounded-2xl font-black shadow-lg shadow-violet-600/30 transition-transform active:scale-95">
            {t('analyze')}
          </button>
        </form>

        {/* Search History Row */}
        {searchHistory.length > 0 && (
          <div className="lg:col-span-3 flex flex-wrap gap-2 mt-4 px-2">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest self-center mr-2">{t('recent')}:</span>
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
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-[#020617] text-slate-300 text-[11px] font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-20 border border-violet-500/30 shadow-xl shadow-violet-900/20">
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
              <p className="text-2xl font-black italic tracking-tighter">{t('loading_title')}</p>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{t('loading_sub')}</p>
            </div>
          </motion.div>
        )}

        {viewKey === 'error' && (
          <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <GlassCard className="p-20 text-center border-rose-500/20">
              <AlertTriangle size={60} className="mx-auto text-rose-500 mb-8" />
              <h2 className="text-3xl font-black mb-4">{t('error_title')}</h2>
              <p className="text-slate-400 max-w-lg mx-auto mb-10 font-bold">{error}</p>
              <button onClick={handleSearch} className="px-12 py-5 bg-violet-600 rounded-3xl font-black shadow-xl shadow-violet-600/20">{t('error_retry')}</button>
            </GlassCard>
          </motion.div>
        )}

        {viewKey === 'idle' && (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-[50vh] flex flex-col items-center justify-center gap-6">
            <div className="p-8 bg-white/[0.02] rounded-full border border-white/5">
              <Search size={60} className="text-slate-600" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-3xl font-black italic tracking-tighter text-slate-500 uppercase">{t('idle_title')}</p>
              <p className="text-slate-600 text-xs font-black uppercase tracking-widest">{t('idle_sub')}</p>
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
                      {t('target_analysis')} {stockInfo.isETF && t('etf')}
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
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{t('price_change')}</span>
                    <div className="flex items-baseline gap-3">
                      <span className="text-5xl font-black tracking-tighter text-white">${stockInfo.currentPrice.toFixed(2)}</span>
                      <div className={`flex items-center gap-1 font-black text-2xl ${stockInfo.realtime.change >= 0 ? 'text-rose-500' : 'text-emerald-400'}`}>
                        {stockInfo.realtime.change >= 0 ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                        {stockInfo.realtime.change >= 0 ? '+' : ''}{stockInfo.realtime.change.toFixed(2)} ({stockInfo.realtime.changePercent.toFixed(2)}%)
                      </div>
                    </div>

                    {/* 3rd Row: Combined BVPS and Premium Analysis */}
                    <div className="flex items-center flex-wrap gap-x-4 gap-y-2 mt-2 pt-2 border-t border-white/5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('bvps')}:</span>
                        <span className="text-xl font-black text-slate-200">${stockInfo.bvps?.toFixed(2) || '--'}</span>
                      </div>
                      
                      {premiumInfo && (
                        <>
                          <div className="w-px h-4 bg-white/10 mx-1" />
                          <div className={`flex items-center gap-3 font-black text-xl ${premiumInfo.colorClass}`}>
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">開盤議價:</span>
                            <span>{premiumInfo.rate >= 0 ? '+' : ''}{premiumInfo.rate.toFixed(1)}%</span>
                            <span className="opacity-60">|</span>
                            <span>{premiumInfo.interpretation}</span>
                            {premiumInfo.sentiment && (
                              <>
                                <span className="opacity-60">|</span>
                                <span className="text-lg opacity-80">{premiumInfo.sentiment}</span>
                              </>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="h-10 w-[1px] bg-white/10 hidden md:block" />

                  <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-slate-500 uppercase">{t('day_range')}</span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-lg font-black text-rose-500">${stockInfo.realtime.dayHigh.toFixed(2)}</span>
                        <span className="text-sm font-bold text-slate-600">/</span>
                        <span className="text-lg font-black text-emerald-500">${stockInfo.realtime.dayLow.toFixed(2)}</span>
                      </div>
                      <span className="text-sm font-bold text-slate-400 mt-0.5">
                        中間價: <span className="text-amber-400 font-black text-base">${((stockInfo.realtime.dayHigh + stockInfo.realtime.dayLow) / 2).toFixed(2)}</span>
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-slate-500 uppercase">{t('month_range')}</span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-lg font-black text-rose-400/80">${stockInfo.monthStats?.high?.toFixed(2) || '--'}</span>
                        <span className="text-sm font-bold text-slate-600">/</span>
                        <span className="text-lg font-black text-emerald-400/80">${stockInfo.monthStats?.low?.toFixed(2) || '--'}</span>
                      </div>
                      {stockInfo.monthStats?.high && stockInfo.monthStats?.low && (
                        <span className="text-sm font-bold text-slate-400 mt-0.5">
                          中間價: <span className="text-amber-400/80 font-black text-base">${((stockInfo.monthStats.high + stockInfo.monthStats.low) / 2).toFixed(2)}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="h-10 w-[1px] bg-white/10 hidden md:block" />

                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{t('volume')}</span>
                    <span className="text-lg font-black text-violet-400">
                      {stockInfo.realtime.volume?.toLocaleString()} 
                      <span className="ml-1 text-[10px] opacity-60">{t('unit_share')}</span>
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
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="p-3 bg-white/[0.05] rounded-[20px]">
                        <Activity className="text-blue-400" size={20} />
                      </div>
                      <h3 className="text-xl font-black tracking-tight italic">{t('intraday')}</h3>
                      <div className="bg-amber-500/10 text-amber-500/70 border border-amber-500/20 px-2 py-0.5 rounded text-[9px] font-black tracking-wider uppercase ml-2 flex items-center gap-1">
                        <AlertTriangle size={10} />
                        Yahoo API 延遲 20 分鐘
                      </div>
                    </div>
                    <div className="text-[10px] font-black text-slate-500 uppercase flex gap-6">
                      <span>{t('open')}: <span className="text-white">{openPrice > 0 ? `$${openPrice.toFixed(2)}` : '--'}</span></span>
                      {hasData && (
                        <>
                          <span>{t('vwap')}: <span className="text-amber-400">${intradayData[intradayData.length - 1].avg.toFixed(2)}</span></span>
                          <span>{t('simple_avg')}: <span className="text-slate-400">${intradayData[intradayData.length - 1].simpleAvg.toFixed(2)}</span></span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="w-full h-[250px] flex items-center justify-center relative">
                    {!hasData ? (
                      <div className="flex flex-col items-center gap-3 text-slate-500 animate-pulse">
                        <AlertTriangle size={48} className="opacity-20" />
                        <span className="text-sm font-bold tracking-widest uppercase opacity-40">{t('no_data')}</span>
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
                          label={{ value: `${t('last_close')} ${prevClose.toFixed(2)}`, position: 'insideLeft', fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} 
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
                                t('price_change').split('/')[0]
                              ];
                            }
                            if (name === 'avg') {
                              return [
                                <span className="text-amber-400">${val.toFixed(2)}</span>,
                                t('vwap')
                              ];
                            }
                            if (name === 'simpleAvg') {
                              return [
                                <span className="text-slate-400">${val.toFixed(2)}</span>,
                                t('simple_avg')
                              ];
                            }
                            if (name === 'volume') {
                              return [
                                <span className="text-slate-300">{val.toLocaleString()} <small className="opacity-50">{t('unit_share')}</small></span>,
                                t('volume')
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

          {/* Strategic Analysis Table */}
          {stockInfo?.valuation && (
            <StrategyTable 
              stockInfo={stockInfo} 
              valuation={stockInfo.valuation} 
              t={t} 
            />
          )}

          {/* 5-Year ROE Chart */}
          {valuationData && stockInfo.yearlyStats && (
            <GlassCard className="p-8 border-l-[6px] border-l-orange-500 bg-white/[0.01] mt-8 mb-8">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2 bg-white/[0.05] rounded-xl">
                  <TrendingUp size={18} className="text-orange-400" />
                </div>
                <h3 className="text-xl font-black italic tracking-tighter text-slate-300">5年 ROE 趨勢</h3>
              </div>
              <div className="w-full h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stockInfo.yearlyStats.slice(0, 5).map(y => ({ year: y.year, eps: y.totalEps, roe: y.bvps > 0 ? parseFloat(((y.totalEps / y.bvps) * 100).toFixed(2)) : 0 })).reverse()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#475569' }} tickLine={false} axisLine={false} />
                    <YAxis type="number" tick={{ fontSize: 10, fill: '#475569' }} tickLine={false} axisLine={false} width={45} tickFormatter={(val) => `${val}%`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#020617', border: '1px solid #ffffff10', borderRadius: '12px' }} 
                      itemStyle={{ fontSize: '11px', fontWeight: 900 }} 
                      cursor={{fill: '#ffffff05'}}
                      formatter={(value, name, props) => {
                        return [
                          <div className="flex flex-col gap-1">
                            <span className="text-orange-400">ROE: {value}%</span>
                            <span className="text-slate-400 text-[10px] font-medium">EPS: {props.payload.eps?.toFixed(2)}</span>
                          </div>,
                          ''
                        ];
                      }}
                    />
                    <Bar dataKey="roe" name="ROE" radius={[4, 4, 0, 0]}>
                      {stockInfo.yearlyStats.slice(0, 5).map(y => ({ year: y.year, eps: y.totalEps, roe: y.bvps > 0 ? parseFloat(((y.totalEps / y.bvps) * 100).toFixed(2)) : 0 })).reverse().map((entry, index) => (
                        <Cell key={`roe-${index}`} fill={entry.roe > 15 ? '#f97316' : entry.roe > 0 ? '#fbbf24' : '#64748b'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>
          )}

            {/* Annual Stats Table */}
            {valuationData && (
              <GlassCard className="p-8 border-l-[6px] border-l-rose-500 bg-white/[0.01]">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-2 bg-white/[0.05] rounded-xl">
                    <Calculator size={18} className="text-rose-400" />
                  </div>
                  <h3 className="text-xl font-black italic tracking-tighter text-slate-300">{t('stats_title')}</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead>
                      <tr className="border-b border-white/10 text-slate-500 text-[10px] uppercase tracking-widest font-black">
                        <th className="pb-4 pl-4">{t('year')}</th>
                        <th className="pb-4">{t('high')}</th>
                        <th className="pb-4">{t('low')}</th>
                        <th className="pb-4">{t('total_eps')}</th>
                        <th className="pb-4">{t('book_value')}</th>
                        <th className="pb-4">{t('fair_price')}</th>
                        <th className="pb-4">評價與股利</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm font-bold">
                       {(() => {
                         const yahooDiv = stockInfo.summary?.summaryDetail?.dividendRate?.raw || 
                                          stockInfo.summary?.summaryDetail?.trailingAnnualDividendRate?.raw || 
                                          stockInfo.summary?.defaultKeyStatistics?.dividendRate?.raw || 0;
                         const finalDiv = stockInfo.avgDividend5Y > 0 ? stockInfo.avgDividend5Y : yahooDiv;
                         
                         return stockInfo.yearlyStats?.map((y, idx) => {
                           const displayFairPrice = y.historicalFairPrice || 0;
                           return (
                             <tr key={`yr-${y.year}`} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                               <td className="py-4 pl-4 text-violet-400">{y.year}</td>
                               <td className="py-4 text-rose-400">${y.high?.toFixed(2) || '-'}</td>
                               <td className="py-4 text-emerald-400">${y.low?.toFixed(2) || '-'}</td>
                               <td className={`py-4 ${y.totalEps >= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{y.totalEps?.toFixed(2) || '-'}</td>
                               <td className="py-4 text-slate-400">${y.bvps?.toFixed(2) || '-'}</td>
                               <td className="py-4 text-blue-400 bg-blue-500/10 rounded-r-lg px-3 font-black">${displayFairPrice > 0 ? displayFairPrice.toFixed(2) : '-'}</td>
                               <td className="py-4 px-4 border-l border-white/5">
                                 <div className="flex flex-col gap-1">
                                   {(() => {
                                     const isCurrentYear = idx === 0;
                                     const effectiveEps = (isCurrentYear && stockInfo.epsTTM > y.totalEps) ? stockInfo.epsTTM : y.totalEps;
                                     const pe = effectiveEps > 0 ? (y.close / effectiveEps) : null;
                                     
                                     let status = '--';
                                     let statusColor = 'text-slate-500';
                                     if (pe !== null) {
                                       if (pe > 20) { status = '昂貴價'; statusColor = 'text-rose-400'; }
                                       else if (pe >= 15) { status = '合理價'; statusColor = 'text-amber-400'; }
                                       else { status = '便宜價'; statusColor = 'text-emerald-400'; }
                                     } else if (effectiveEps <= 0) {
                                       status = '虧損中';
                                       statusColor = 'text-slate-500';
                                     }
                                     return <span className={`text-[10px] font-black ${statusColor}`}>{status} {pe ? `(PE:${pe.toFixed(1)})` : ''}</span>;
                                   })()}
                                   <span className="text-[10px] text-teal-400 font-bold">5Y⌀ Div: ${finalDiv > 0 ? finalDiv.toFixed(2) : '--'}</span>
                                 </div>
                               </td>
                             </tr>
                           );
                         });
                       })()}
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
                  <h3 className="text-xl font-black italic tracking-tighter text-slate-300">{t('eps_track')}</h3>
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
                                <span className="text-teal-400">{t('quarter_eps')}: {value?.toFixed(2)}</span>
                                <span className="text-slate-500 text-[10px] font-medium italic">{t('accumulated_eps')}: {props.payload.yearlyEps?.toFixed(2)}</span>
                              </div>,
                              ''
                            ];
                          }
                          return [value, name];
                        }}
                      />
                      <Bar dataKey="eps" name="單季EPS">
                        {(stockInfo.history || []).map((entry, index) => (
                           <Cell key={`eps-${index}`} fill={(entry.eps || 0) > 0 ? '#f43f5e' : '#0d9488'} />
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
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="p-3 bg-white/[0.05] rounded-[20px]">
                      <Activity className="text-emerald-400" size={20} />
                    </div>
                    <h3 className="text-xl font-black tracking-tight italic">{mode === 'DCF' ? t('intrinsic_value') : `${t(mode)} ${t('river_title')}`}</h3>
                  </div>
                  <div className="flex flex-wrap gap-2 bg-white/[0.03] p-1.5 rounded-2xl border border-white/5">
                    {['PE', 'PB', 'DCF'].map(m => (
                      <button 
                        key={m} 
                        onClick={() => setMode(m)}
                        className={`px-6 py-2.5 rounded-xl font-black text-xs transition-all ${mode === m ? 'bg-violet-600 shadow-lg shadow-violet-600/30' : 'text-slate-500 hover:text-white'}`}
                      >
                        {t(m)}
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
                        label={{ value: mode === 'DCF' ? `${t('fair_price')} ($)` : mode, angle: -90, position: 'insideLeft', fill: '#8b5cf6', fontSize: 10, fontWeight: 'bold' }}
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
                        label={{ value: `${t('price_change').split('/')[0]} ($)`, angle: 90, position: 'insideRight', fill: '#ffffff', fontSize: 10, fontWeight: 'bold' }}
                      />

                      <Tooltip 
                        contentStyle={{ backgroundColor: '#020617', border: '1px solid #ffffff10', borderRadius: '20px' }}
                        itemStyle={{ fontSize: '12px', padding: 0 }}
                        formatter={(val, name) => {
                          if (name === 'price') return [`$${val.toFixed(2)}`, t('price_change').split('/')[0].trim()];
                          if (name === 'pe') return [`${val.toFixed(2)}x`, `${t('PE')} (PE)`];
                          if (name === 'pb') return [`${val.toFixed(2)}x`, `${t('PB')} (PB)`];
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
                            name={t('DCF') + " Fair Value"}
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
                            name={t('price_change').split('/')[0].trim()}
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
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-10">
                <div className="flex flex-wrap items-center gap-3">
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
                    
                    let msg = "Bearish"; let colorClass = "text-emerald-400"; let dotColor = "#10b981";
                    if (k1.dif > k1.dem && k2.dif <= k2.dem) { msg = "Golden Cross"; colorClass = "text-rose-400"; dotColor = "#f43f5e"; }
                    else if (k1.dif < k1.dem && k2.dif >= k2.dem) { msg = "Death Cross"; colorClass = "text-emerald-400"; dotColor = "#10b981"; }
                    else if (k1.dif > k1.dem) { msg = "Bullish Track"; colorClass = "text-rose-400/80"; dotColor = "#f43f5e"; }

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
                    
                    let msg = `Weak (${rsi})`; let colorClass = "text-emerald-400/80"; let dotColor = "#10b981";
                    if (rsi >= 70) { msg = `Overbought (${rsi})`; colorClass = "text-rose-400"; dotColor = "#f43f5e"; }
                    else if (rsi <= 30) { msg = `Oversold (${rsi})`; colorClass = "text-emerald-400"; dotColor = "#10b981"; }
                    else if (rsi > 50) { msg = `Strong (${rsi})`; colorClass = "text-rose-400/80"; dotColor = "#f43f5e"; }

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
