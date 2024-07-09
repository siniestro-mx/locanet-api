// src/routes/overlayRoutes.js
const express = require('express');
const { getListForUser, saveOverlays, deleteOverlays, updateOverlaysVisibility } = require('./overlayController');
const {
  successHandler
} = require('../../../utils/response');

const router = express.Router();

router.get('/listforuser', getListForUser);
router.post('/save', saveOverlays);
router.post('/visibility', updateOverlaysVisibility);
router.put('/update', (req, res, next) => { console.dir(req.body); successHandler(res, 200, 'update overlay', []) });
router.delete('/delete', deleteOverlays);

module.exports = router;