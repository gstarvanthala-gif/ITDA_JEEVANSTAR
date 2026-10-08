export const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    const error = new Error('JWT authentication is not configured');
    error.statusCode = 500;
    throw error;
  }

  if (process.env.NODE_ENV === 'production' && Buffer.byteLength(secret, 'utf8') < 32) {
    const error = new Error('JWT authentication is not configured securely');
    error.statusCode = 500;
    throw error;
  }

  return secret;
};