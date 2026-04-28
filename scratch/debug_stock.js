
import axios from 'axios';

async function debugData(symbol) {
  try {
    const res = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1m&range=1d`);
    console.log("Result for " + symbol + ":");
    console.log("Timestamps length:", res.data?.chart?.result?.[0]?.timestamp?.length || 0);
    console.log("Meta:", JSON.stringify(res.data?.chart?.result?.[0]?.meta, null, 2));
  } catch (e) {
    console.error("Error fetching data:", e.message);
  }
}

debugData('3390.TW');
