// src/routes/overlayRoutes.js
const express = require('express');
const { getListForUser, saveOverlays, updateOverlaysVisibility } = require('../controllers/overlay');

const router = express.Router();

router.get('/listforuser', getListForUser);
router.post('/save', saveOverlays);
router.post('/visibility', updateOverlaysVisibility);

module.exports = router;