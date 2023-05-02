const routes = require('express').Router();
const userRoutes = require('./user');
const unitRoutes = require('./unit');
const alertRoutes = require('./alert');
const maintenanceRoutes = require('./mtto');
const auth = require('./auth');

routes.use('/user', userRoutes);
routes.use('/unit', unitRoutes);
routes.use('/alert', alertRoutes);
routes.use('/mtto', maintenanceRoutes);
routes.use('/auth', auth);

module.exports = routes;