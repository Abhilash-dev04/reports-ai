import api from './axiosClient';

const TOKEN_KEY = 'token';
const USER_KEY = 'user';
const isDemoMode = process.env.REACT_APP_DEMO_MODE === 'true';

const getDemoRole = (username) => {
  const normalizedUsername = String(username || '').trim().toLowerCase();

  if (normalizedUsername === 'admin') {
    return 'admin';
  }

  if (normalizedUsername === 'reviewer') {
    return 'reviewer';
  }

  return 'user';
};

const createDemoUser = (username) => {
  const normalizedUsername = String(username || '').trim().toLowerCase();

  return {
    username: normalizedUsername,
    email: `${normalizedUsername}@example.com`,
    role: getDemoRole(normalizedUsername),
    demo: true,
  };
};

export const login = async (credentials) => {
  const username = credentials?.username?.trim();
  const password = credentials?.password?.trim();

  if (!username || !password) {
    throw new Error('Enter a username and password to continue.');
  }

  if (isDemoMode) {
    const demoUser = createDemoUser(username);
    localStorage.setItem(TOKEN_KEY, 'public-demo-token');
    localStorage.setItem(USER_KEY, JSON.stringify(demoUser));
    return { token: 'public-demo-token', ...demoUser };
  }
  const response = await api.post('/api/auth/login', credentials);
  const data = response.data;
  const user = {
    username: data.username,
    email: data.email,
    role: data.role || 'user',
    demo: false,
  };
  localStorage.setItem(TOKEN_KEY, data.token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  return data;
};

export const signup = async (payload) => {
  if (isDemoMode) {
    throw new Error('Account creation is disabled in the public demo. Enter any username and password on the login page.');
  }
  return (await api.post('/api/auth/signup', payload)).data;
};

export const logout = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

export const isAuthenticated = () => {
  const token = localStorage.getItem(TOKEN_KEY);
  return isDemoMode ? token === 'public-demo-token' : Boolean(token);
};

export const getCurrentUser = () => {
  try {
    const storedUser = localStorage.getItem(USER_KEY);
    return storedUser ? JSON.parse(storedUser) : null;
  } catch {
    return null;
  }
};

export const resetPassword = async () => {
  throw new Error(isDemoMode
    ? 'Password reset is not required in the public demo.'
    : 'Password reset is not currently enabled.');
};

const authService = {
  login, signup, logout, isAuthenticated, getCurrentUser, resetPassword,
};
export default authService;
