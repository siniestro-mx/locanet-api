const routes = require('express').Router();
//const userRoutes = require('./user');
const unitRoutes = require('./unit');
//const alertRoutes = require('./alert');
//const maintenanceRoutes = require('./mtto');
const authRoutes = require('./auth');
const { authorize } = require('../middleware/auth');

routes.get('/', (req, res) => {
    res.status(200).json({
        message: 'api de locanet!'
    });
});

//routes.use('/user', authorize, userRoutes);
routes.use('/api/unit', unitRoutes);
//routes.use('/alert', authorize, alertRoutes);
//routes.use('/mtto', authorize, maintenanceRoutes);
routes.use('/auth', authRoutes);

module.exports = routes;