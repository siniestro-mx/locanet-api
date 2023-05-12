// src/routes/userRoutes.js
const express = require('express');
const { getUnitList } = require('../controllers/unit');

const router = express.Router();

router.get('/list', getUnitList);

module.exports = router;