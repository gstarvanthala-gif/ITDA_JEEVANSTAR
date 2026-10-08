const DEVELOPMENT_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173'];

export const createCorsOptions = (env = process.env) => {
  const configuredOrigins = typeof env.CORS_ALLOWED_ORIGINS === 'string'
    ? env.CORS_ALLOWED_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean)
    : [];

  if (configuredOrigins.includes('*')) {
    throw new Error('CORS_ALLOWED_ORIGINS must list explicit origins; wildcard origins are not allowed');
  }

  const allowedOrigins = configuredOrigins.length > 0
    ? configuredOrigins
    : env.NODE_ENV === 'production' ? [] : DEVELOPMENT_ORIGINS;

  return {
    credentials: false,
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      const error = new Error('Origin not allowed by CORS');
      error.statusCode = 403;
      callback(error);
    },
  };
};