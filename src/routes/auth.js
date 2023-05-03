// src/routes/userRoutes.js
const express = require('express');
const { register, login, logout, validate } = require('../controllers/auth');

const router = express.Router();

router.get('/validate', validate);
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);

module.exports = router;