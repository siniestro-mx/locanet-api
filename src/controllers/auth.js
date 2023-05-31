const {
  successHandler
} = require('../utils/response');
const {
  createUser,
  findUserByUsername
} = require('../database/user');
const {
  generateAccessToken,
  verifyToken
} = require('../utils/auth');

async function checkIfLoggedIn(req, res, next) {
  try {
    /*const cookie = req.get('cookie');
    const token = cookie ? cookie.split('__Host-locanet=')[1] : null;

    if (!token) {
      const error = new Error(`El usuario no ha iniciado sesión`, {
        cause: {
          type: 'Authentication',
          err: null,
          name: 'need.login'
        }
      });

      error.statusCode = 401;
      return next(error);
    }

    await verifyToken(token);*/
    const user = await findUserByUsername('siniestro@siniestro.dev');

    if (!user) {
      return next(new Error('Usuario no encontrado', {
        cause: {
          type: 'Authentication',
          err: null,
          name: 'user.notfound'
        }
      }));
    }

    const userObject = user.toObject();

    userObject.permissions = Object.fromEntries(userObject.permissions);

    delete userObject.password;
    delete userObject.__v;
    delete userObject._id;

    successHandler(res, 200, 'Usuario autenticado', userObject);
  } catch (err) {
    next(err);
  }
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
    const user = await findUserByUsername(req.body.username);
    if (!user) {
      return next(new Error('Usuario no encontrado', {
        cause: {
          type: 'Authentication',
          err: null,
          name: 'user.notfound'
        }
      }));
    }

    const validPassword = await user.comparePassword(req.body.password);
    if (!validPassword) {
      return next(new Error('Contraseña incorrecta', {
        cause: {
          type: 'Authentication',
          err: null,
          name: 'login.password'
        }
      }));
    }

    const userObject = user.toObject();

    userObject.permissions = Object.fromEntries(userObject.permissions);

    delete userObject.password;
    delete userObject.__v;
    delete userObject._id;

    const token = await generateAccessToken(user);

    res.cookie('__Host-locanet', token, {
      domain: '.locanet.mx',
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60 * 1000,
    });
    successHandler(res, 200, 'Inicio de sesión exitoso', userObject);
  } catch (error) {
    error.statusCode = 401;
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

module.exports = {
  checkIfLoggedIn,
  register,
  login,
  logout
};