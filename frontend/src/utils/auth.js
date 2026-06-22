export const isAuthenticated = () => !!localStorage.getItem('token');
export const getToken = () => localStorage.getItem('token');
export const logout = () => { localStorage.removeItem('token'); localStorage.removeItem('user'); window.location.href='/'; };