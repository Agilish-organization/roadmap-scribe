require('dotenv').config();
const express = require('express');

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(express.static('public'));

const generateRouter = require('./routes/generate');
app.use('/api', generateRouter);

// Only listen when run directly (not when required by tests)
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Roadmap Scribe MVP running on :${PORT}`);
  });
}

module.exports = app;