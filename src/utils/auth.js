// src/utils/auth.js
const config = require('../../config/config');

async function generateAccessToken(user) {
  const { SignJWT } = require('jose')
  const private_key = await getPrivateKey()

  // Create a signed JWT
  const jwt = await new SignJWT({
    scope: user.role
  })
    .setSubject(user.username)
    .setIssuedAt()
    .setIssuer(config.LOCANET_HOST)
    .setAudience(config.LOCANET_HOST)
    .setExpirationTime('24hr')
    .setProtectedHeader({
      alg: 'EdDSA',
      typ: "jwt"
    })
    .sign(private_key)

  return jwt
}

async function getPrivateKey() {
  const { importJWK } = require('jose')
  const private_key_base64 = config.LOCANET_SIGNIN_PRIVATE_KEY
  const public_key_base64 = config.LOCANET_SIGNIN_PUBLIC_KEY
  const jwk = {
    "kty": "OKP",
    "alg": "EdDSA",
    "crv": "Ed25519",
    "d": private_key_base64,
    "x": public_key_base64
  }

  const private_key = await importJWK(jwk, 'EdDSA').catch(err => {
    console.dir(err)
    throw new Error(`Error al cargar la llave privada para jwt`, { cause: { type: 'Authentication', err: err, name: 'private.key.load' } })
  })

  return private_key
}

async function verifyToken(token) {
  const { jwtVerify } = require('jose');

  try {
    const public_key = await getPublicKey();

    const result = await jwtVerify(token, public_key, {
      algorithms: ['EdDSA'],
      issuer: config.LOCANET_HOST,
      audience: config.LOCANET_HOST,
      typ: 'jwt',
    });

    return result;
  } catch (err) {
    throw new Error('Error al intentar verificar el token', { cause: { type: 'Authentication', err: err, name: 'verify.user' } });
  }
}

async function getPublicKey() {
  const { importJWK } = require('jose');
  const public_key_base64 = config.LOCANET_SIGNIN_PUBLIC_KEY;
  const jwk = {
    "kty": "OKP",
    "alg": "EdDSA",
    "crv": "Ed25519",
    "x": public_key_base64
  };

  const public_key = await importJWK(jwk, 'EdDSA').catch(err => {
    throw new Error(`Error al cargar la llave pública para jwt`, { cause: { type: 'Authentication', err: err, name: 'public.key.load' } });
  })

  return public_key;
}

module.exports = {
  verifyToken,
  generateAccessToken,
};
