const https = require('https');

const data = JSON.stringify({
  student_id: '6b4ef654-24c2-43ea-bc08-6fce54dc6ea7',
  payment_id: '8aeea9f6-2a44-41b2-9e60-408599c77136',
  amount: 650,
  payment_method: 'Cash',
  payment_date: '2026-09-09',
  notes: ''
});

const options = {
  hostname: 'apna-tuiton-ichhapore.vercel.app',
  port: 443,
  path: '/api/fees/record-payment',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, res => {
  console.log(`statusCode: ${res.statusCode}`);
  let responseBody = '';
  res.on('data', d => {
    responseBody += d;
  });
  res.on('end', () => {
    console.log('Response:', responseBody);
  });
});

req.on('error', error => {
  console.error(error);
});

req.write(data);
req.end();
