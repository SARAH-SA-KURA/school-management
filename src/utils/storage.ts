export const storage = {
  getToken: (): string | null => localStorage.getItem('token'),
  setToken: (token: string): void => localStorage.setItem('token', token),
  removeToken: (): void => localStorage.removeItem('token'),

  getUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },
  setUser: (user: object): void => localStorage.setItem('user', JSON.stringify(user)),
  removeUser: (): void => localStorage.removeItem('user'),

  getAvatar: (): string | null => localStorage.getItem('userAvatar'),
  setAvatar: (base64: string): void => localStorage.setItem('userAvatar', base64),
  removeAvatar: (): void => localStorage.removeItem('userAvatar'),

  clear: (): void => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userAvatar');
  },
};
