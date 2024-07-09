// src/modules/auth/http/authRoutes.js
const express = require('express');
const { register, login, logout, checkIfLoggedIn } = require('./authController');

const router = express.Router();

router.get('/isloggedin', checkIfLoggedIn);
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);

module.exports = router;