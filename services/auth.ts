
const AUTH_KEY = 'poultry_app_auth';

interface AuthData {
  username: string;
  password: string; // Trong thực tế nên hash password, ở đây lưu plain text cho demo local
}

// Tài khoản mặc định ban đầu
const DEFAULT_AUTH: AuthData = {
  username: 'admin',
  password: '123' 
};

export const initAuth = () => {
  if (!localStorage.getItem(AUTH_KEY)) {
    localStorage.setItem(AUTH_KEY, JSON.stringify(DEFAULT_AUTH));
  }
};

export const login = (username: string, password: string): boolean => {
  initAuth();
  const stored = localStorage.getItem(AUTH_KEY);
  if (stored) {
    const auth: AuthData = JSON.parse(stored);
    return auth.username === username && auth.password === password;
  }
  return false;
};

export const changePassword = (oldPass: string, newPass: string): boolean => {
  const stored = localStorage.getItem(AUTH_KEY);
  if (stored) {
    const auth: AuthData = JSON.parse(stored);
    if (auth.password === oldPass) {
      auth.password = newPass;
      localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
      return true;
    }
  }
  return false;
};

export const isAuthenticated = (): boolean => {
  return localStorage.getItem('poultry_app_is_logged_in') === 'true';
};

export const setSession = (isLoggedIn: boolean) => {
  if (isLoggedIn) {
    localStorage.setItem('poultry_app_is_logged_in', 'true');
  } else {
    localStorage.removeItem('poultry_app_is_logged_in');
  }
};
