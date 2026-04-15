const app = require('./app');
const { PORT } = require('./config/env');

app.listen(PORT, () => {
  console.log('\n🚀 EventGo API running on http://localhost:' + PORT);
  console.log('   Environment: ' + (process.env.NODE_ENV || 'development') + '\n');
});
