const https = require('https');

https.get('https://query2.finance.yahoo.com/v10/finance/quoteSummary/6016.TWO?modules=price', {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log("Status:", res.statusCode);
    console.log("Data:", data.substring(0, 500));
  });
}).on('error', err => {
  console.log("Error:", err.message);
});
