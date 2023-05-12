// src/routes/userRoutes.js
const express = require('express');
const { register, login, logout, checkIfLoggedIn } = require('../controllers/auth');

const router = express.Router();

router.get('/isloggedin', checkIfLoggedIn);
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);

module.exports = router;