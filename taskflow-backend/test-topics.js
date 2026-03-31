const http = require('http');
const jwt = require('jsonwebtoken');
const token = jwt.sign({ id: '123', role: 'student' }, "amapsecretkey123");
const req = http.request({ hostname: '127.0.0.1', port: 5003, path: '/api/topics/arrays/notes', headers: {'Authorization': `Bearer ${token}`} }, res => {
  res.on('data', d => process.stdout.write(d));
});
req.end();
