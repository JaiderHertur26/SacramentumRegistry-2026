
import { ROLE_TYPES } from '@/config/supabaseConfig';

/**
 * Validates user credentials against the local storage 'users' collection.
 */
export const validateUserCredentials = (username, password) => {
    if (!username || !password) return null;
    try {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        return users.find(u => {
            const uName = (u.username || u.name || '').toLowerCase().trim();
            return uName === username.toLowerCase().trim() && u.password === password;
        }) || null;
    } catch (e) {
        console.error("Auth validation error:", e);
        return null;
    }
};

/**
 * Initializes the default admin user if it doesn't exist.
 */
export const initializeAdminUser = () => {
    try {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const hasAdmin = users.some(u => {
            const role = typeof u.role === 'object' ? (u.role.name || u.role.role) : u.role;
            return role === ROLE_TYPES.ADMIN_GENERAL;
        });

        if (!hasAdmin) {
            users.push({
                id: '1',
                username: 'Hertur26',
                email: 'admin@eclesia.org',
                password: '1052042443-Ht',
                role: ROLE_TYPES.ADMIN_GENERAL,
                createdAt: new Date().toISOString()
            });
            localStorage.setItem('users', JSON.stringify(users));
        }
    } catch (e) {}
};
