//src/middleware/auth.js
const { findUserByUsername } = require('../modules/user/userDb');

async function authorize(req, res, next) {
  const cookie = req.get('cookie');
  let token = cookie ? cookie.split('__Host-locanet=')[1] : null; // Get token from cookie if any;
  const path = req.originalUrl.split('?')[0]; // Remove query params from path if any;

  /** si no hay token en las cookies, checar en el header Bearer */
  if (!token) {
    const authHeader = req.get('Authorization');
    if (authHeader) {
      token = authHeader.split('Bearer ')[1];
    }
  }

  if (!token) {
    return next(new Error(`El usuario no ha iniciado sesión`, {
      cause: {
        type: 'Authentication',
        err: null,
        name: 'need.login'
      }
    }));
  }

  try {
    //descomentar cuando ya se vaya a usar en produccion
    //const result = await verifyToken(token);
    //const user = await findUserByUsername(result.payload.sub);
    const user = await findUserByUsername(token);

    if (user) {
      console.log(`usuario encontrado -> ${user.username}`);
      const userObject = user.toObject();

      userObject.permissions = Object.fromEntries(userObject.permissions);

      delete userObject.password;
      delete userObject.__v;
      delete userObject._id;

      req.user = userObject;
    }
  } catch (err) {
    return next(err);
  }

  let valid_role = false;

  if (req.user) {
    valid_role = validatePath(path, req.user.role);
  }


  if (valid_role) return next();

  next(new Error(`El usuario no esta autorizado para accesar la ruta ${path}`, {
    cause: {
      type: 'Scope'
    },
    name: 'missing.role'
  }));
}

async function authorizeWs(socket, next) {
  try {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error(`El usuario no ha iniciado sesión`));
    }

    //const result = await verifyToken(token);
    //const user = await findUserByUsername(result.payload.sub);
    let user = await findUserByUsername(token);

    if (!user) {
      return next(new Error(`El usuario no ha iniciado sesión`));
    }

    user = user.toJSON();

    delete user.password;
    delete user._id;
    delete user.__v;

    socket.user = user;

    next();

  } catch (err) {
    next(new Error(`Authentication error: ${err.message}`));
  }
}

function validateEvent([event, ...args], socket, next) {
  const valid_role = validateWebsocketEvent(event, socket.user.role);

  if (!valid_role) {
    return next(new Error(`El usuario no está autorizado para emitir el evento ${event}`));
  }

  next();
}

function validatePath(path, role) {
  const paths = {
    'admin': [],
    'user': [],
    'superuser': [],
    'guest': []
  }

  console.log(`usuario con rol -> ${role} intentando accesar a -> ${path}`);

  if (role === 'admin') return true;

  if (paths[role].includes(path)) return true;

  return false
}

function validateWebsocketEvent(event, role) {
  const events = {
    'admin': [],
    'user': [],
    'superuser': [],
    'guest': []
  }

  console.log(`usuario con rol -> ${role} intentando emitir evento -> ${event}`);

  if (role === 'admin') return true;

  if (events[role].includes(event)) return true;

  return false
}

module.exports = {
  authorize,
  authorizeWs,
  validateEvent
};