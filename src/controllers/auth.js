const { successHandler } = require('../utils/response');
const { createUser, findUserByEmail } = require('../database/user');
const { generateAccessToken, verifyToken } = require('../utils/auth');

async function validate(req, res, next) {
  const cookie = req.get('cookie');
  const token = cookie ? cookie.split('__Host-locanet=')[1] : null; // Get token from cookie if any;
  const path = req.originalUrl.split('?')[0];  // Remove query params from path if any;

  if (!token) {
    return next(new Error(`El usuario no ha iniciado sesión`, { cause: { type: 'Authentication', err: null, name: 'need.login' } }));
  }

  try {
    const result = await verifyToken(token);
    const user = await findUserByEmail(result.payload.sub);

  } catch (err) {
    return next(err);
  }

  const valid_role = validatePath(path, req.user.role);

  if (valid_role) next();

  next(new Error(`El usuario no esta autorizado para accesar la ruta ${path}`, { cause: { type: 'Scope' }, name: 'missing.role' }));
}

async function register(req, res, next) {
  try {
    const user = await createUser(req.body);
    const token = await generateAccessToken(user);

    res.cookie('__Host-locanet', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/',
    });
    
    successHandler(res, 201, 'Usuario registrado exitosamente', user);
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const user = await findUserByEmail(req.body.email);
    if (!user) {
      throw new Error('Usuario no encontrado', { cause: { type: 'Authentication', err: null, name: 'login.user' } });
    }

    const validPassword = await user.comparePassword(req.body.password);
    if (!validPassword) {
      throw new Error('Contraseña incorrecta', { cause: { type: 'Authentication', err: null, name: 'login.password' } });
    }

    const token = await generateAccessToken(user);
    res.cookie('__Host-locanet', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/',
    });
    successHandler(res, 200, 'Inicio de sesión exitoso', user);
  } catch (error) {
    next(error);
  }
}
async function logout(req, res, next) {
  try {
    res.clearCookie('__Host-locanet', {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/',
    });
    successHandler(res, 200, 'Cierre de sesión exitoso');
  } catch (error) {
    next(error);
  }
}

function validatePath(path, role) {
  const paths = {
    'admin': [],
    'user': [],
    'superuser': [],
    'guest': []
  }

  console.log(`usuario con rol -> ${role} intentando accesar a -> ${path}`);

  return true;

  if (paths[role].includes(path)) return true;

  return false
}

module.exports = {
  validate,
  register,
  login,
  logout
};
