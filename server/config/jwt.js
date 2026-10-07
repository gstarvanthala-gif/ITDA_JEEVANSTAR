export const getJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    const error = new Error('JWT authentication is not configured');
    error.statusCode = 500;
    throw error;
  }

  return process.env.JWT_SECRET;
};