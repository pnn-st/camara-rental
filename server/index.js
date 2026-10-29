const express = require('express');
const cors = require('cors');
require('dotenv').config();

const equipmentRouter = require('./routes/equipment');
const customersRouter = require('./routes/customers');
const categoriesRouter = require('./routes/categories');
const staffRouter = require('./routes/staff');
const insuranceRouter = require('./routes/insurance');
const rentalsRouter = require('./routes/rentals');
const returnsRouter = require('./routes/returns');
const dashboardRouter = require('./routes/dashboard');

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Resource routes
app.use('/api/equipment', equipmentRouter);
app.use('/api/customers', customersRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/staff', staffRouter);
app.use('/api/insurance', insuranceRouter);
app.use('/api/rentals', rentalsRouter);
app.use('/api/returns', returnsRouter);
app.use('/api/dashboard', dashboardRouter);

// 404 Not Found handler
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
