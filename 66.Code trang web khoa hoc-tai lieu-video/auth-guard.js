import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBVueYYokJdqm_uCMqBL24d6YCtMTamCM8",
    authDomain: "csdlsongminh.firebaseapp.com",
    databaseURL: "https://csdlsongminh-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "csdlsongminh",
    storageBucket: "csdlsongminh.firebasestorage.app",
    messagingSenderId: "319501136448",
    appId: "1:319501136448:web:1c2a9a1b5582d3a9f725a5",
    measurementId: "G-VPPH1RXD7H"
};

export const ADMIN_EMAILS = ["songminh138@gmail.com"];

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

window.firebaseAuth = auth;
window.firebaseDb = db;
window.ADMIN_EMAILS = ADMIN_EMAILS;

export function checkIsAdmin(emailOrUser) {
    if (!emailOrUser) return false;
    const email = typeof emailOrUser === 'string' ? emailOrUser : (emailOrUser.email || '');
    return ADMIN_EMAILS.includes(email.toLowerCase().trim());
}
window.checkIsAdmin = checkIsAdmin;

export function getSavedAdminUser() {
    const keys = ['edtech_admin_session', 'edtech_user', 'edtech_teacher_session'];
    for (const k of keys) {
        const saved = localStorage.getItem(k);
        if (saved) {
            try {
                const u = JSON.parse(saved);
                if (u && (checkIsAdmin(u.email) || u.role === 'ADMIN')) {
                    // Đồng bộ phiên làm việc sang các key chính
                    localStorage.setItem('edtech_admin_session', JSON.stringify(u));
                    localStorage.setItem('edtech_user', JSON.stringify(u));
                    return u;
                }
            } catch(e) {}
        }
    }
    return null;
}
window.getSavedAdminUser = getSavedAdminUser;

window.logout = function() {
    localStorage.removeItem('edtech_user');
    localStorage.removeItem('edtech_admin_session');
    localStorage.removeItem('edtech_teacher_session');
    signOut(auth).catch(() => {}).finally(() => {
        window.location.reload();
    });
};

window.loginAdminDirect = function(email, name = "Thầy Cường (Admin)") {
    const cleanedEmail = (email || '').toLowerCase().trim();
    if (checkIsAdmin(cleanedEmail)) {
        const adminUser = {
            uid: 'admin_' + Date.now(),
            email: cleanedEmail,
            name: name,
            role: 'ADMIN',
            photoURL: ''
        };
        localStorage.setItem('edtech_user', JSON.stringify(adminUser));
        localStorage.setItem('edtech_admin_session', JSON.stringify(adminUser));
        localStorage.setItem('edtech_teacher_session', JSON.stringify(adminUser));
        window.dispatchEvent(new CustomEvent('auth-admin-changed', { detail: adminUser }));
        return { success: true, user: adminUser };
    } else {
        return { 
            success: false, 
            error: `Email (${email}) không phải là Quản trị viên (songminh138@gmail.com).` 
        };
    }
};

window.loginAdminWithGoogle = async function() {
    try {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        if (checkIsAdmin(user.email)) {
            const adminUser = {
                uid: user.uid,
                email: user.email,
                name: user.displayName || "Thầy Cường (Admin)",
                role: 'ADMIN',
                photoURL: user.photoURL || ''
            };
            localStorage.setItem('edtech_user', JSON.stringify(adminUser));
            localStorage.setItem('edtech_admin_session', JSON.stringify(adminUser));
            localStorage.setItem('edtech_teacher_session', JSON.stringify(adminUser));
            window.dispatchEvent(new CustomEvent('auth-admin-changed', { detail: adminUser }));
            return { success: true, user: adminUser };
        } else {
            return { 
                success: false, 
                error: `Tài khoản (${user.email}) không phải là Quản trị viên (songminh138@gmail.com). Bạn chỉ có quyền truy cập khu vực Học sinh & Giáo viên.` 
            };
        }
    } catch(err) {
        console.warn("Lỗi đăng nhập Google:", err);
        return { 
            success: false, 
            code: err.code,
            error: (err.code === 'auth/unauthorized-domain') 
                ? "Tên miền chưa được xác thực trong Firebase Auth. Thầy vui lòng dùng tính năng xác nhận trực tiếp bằng email bên dưới." 
                : (err.message || "Đăng nhập Google thất bại")
        };
    }
};

onAuthStateChanged(auth, async (user) => {
    if (user && checkIsAdmin(user.email)) {
        const adminUser = {
            uid: user.uid,
            email: user.email,
            name: user.displayName || "Thầy Cường (Admin)",
            role: 'ADMIN',
            photoURL: user.photoURL || ''
        };
        localStorage.setItem('edtech_user', JSON.stringify(adminUser));
        localStorage.setItem('edtech_admin_session', JSON.stringify(adminUser));
        localStorage.setItem('edtech_teacher_session', JSON.stringify(adminUser));
        window.dispatchEvent(new CustomEvent('auth-admin-changed', { detail: adminUser }));
    }
});
