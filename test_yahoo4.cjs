const https = require('https');

https.get('https://query2.finance.yahoo.com/v8/finance/chart/6016.TWO?interval=1m&range=1d', {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      const result = parsed.chart.result[0];
      console.log("Has Timestamp:", !!result.timestamp, result.timestamp?.length);
      console.log("Has Close:", !!result.indicators?.quote?.[0]?.close, result.indicators?.quote?.[0]?.close?.length);
      console.log("First 3 close:", result.indicators?.quote?.[0]?.close?.slice(0, 3));
    } catch(e) {
      console.log("Parse Error:", e.message);
    }
  });
}).on('error', err => {
  console.log("Error:", err.message);
});
