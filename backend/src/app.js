const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { CLIENT_URL, ADMIN_URL, NODE_ENV } = require('./config/env');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(helmet());
app.use(cors({ origin: [CLIENT_URL, ADMIN_URL], credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
if (NODE_ENV === 'development') app.use(morgan('dev'));

app.use('/api/auth',       require('./modules/auth/auth.routes'));
app.use('/api/users',      require('./modules/users/users.routes'));
app.use('/api/events',     require('./modules/events/events.routes'));
app.use('/api/events/:eventId/expenses', require('./modules/expenses/expenses.routes'));
app.use('/api/events/:eventId/vendors',  require('./modules/event-vendors/event-vendors.routes'));
app.use('/api/vendors',    require('./modules/vendors/vendors.routes'));
app.use('/api/favorites',  require('./modules/favorites/favorites.routes'));
app.use('/api/contact',    require('./modules/contact/contact.routes'));
app.use('/api/categories', require('./modules/categories/categories.routes'));
app.use('/api/admin',      require('./modules/admin/admin.routes'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));
app.use(errorHandler);

module.exports = app;
