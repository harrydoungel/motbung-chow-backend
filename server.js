const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Your auth routes
app.post('/api/auth/login', (req, res) => {
  res.json({
    success: true,
    token: 'temp-token-' + Date.now(),
    user: { phone: req.body.phone }
  });
});

app.get('/api/auth/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));