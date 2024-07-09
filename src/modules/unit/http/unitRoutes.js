// src/routes/unit.js
const express = require('express');
const { getUnitList } = require('./unitControllers');

const router = express.Router();

router.get('/list', getUnitList);

module.exports = router;