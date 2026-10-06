export const getDefaultRoute = (role) => {
  if (role === 'advisor') return '/advisor';
  if (role === 'admin') return '/admin';
  return '/investor';
};
