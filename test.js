import { fetchStockData } from './src/utils/yahooApi.js';

fetchStockData('2330').then(data => {
  console.log('--- YEARLY STATS ---');
  console.table(data.yearlyStats);
  console.log('--- HISTORY EPS ---');
  console.log(data.history.map(h => ({ q: h.quarter, eps: h.eps })));
}).catch(console.error);
