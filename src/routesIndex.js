const routes = require('express').Router();
const authRoutes = require('./modules/auth/http/authRoutes');
const unitRoutes = require('./modules/unit/http/unitRoutes');
const overlayRoutes = require('./modules/overlay/http/overlayRoutes');
const { authorize } = require('./middleware/auth');

routes.get('/', (req, res) => {
  res.status(200).json({
    message: 'api de locanet!'
  });
});

routes.use('/auth', authRoutes);
routes.use('/api/unit', authorize, unitRoutes);
routes.use('/api/overlay', authorize, overlayRoutes);

module.exports = routes;