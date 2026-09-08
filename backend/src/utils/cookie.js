// src/utils/cookie.js
// Cookie options in one place — keeps the controller code clean.

/**
 * Options for httpOnly cookies.
 * secure:true in production so cookies are only sent over HTTPS.
 * sameSite:'strict' prevents CSRF in most cases.
 */
const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
});

// Access token cookie — short lived (15 min)
const accessTokenCookieOptions = () => ({
  ...cookieOptions(),
  maxAge: 15 * 60 * 1000, // 15 minutes in ms
});

// Refresh token cookie — long lived (7 days)
const refreshTokenCookieOptions = () => ({
  ...cookieOptions(),
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
});

module.exports = {
  accessTokenCookieOptions,
  refreshTokenCookieOptions,
};
