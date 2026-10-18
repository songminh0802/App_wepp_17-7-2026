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

const ADMIN_EMAIL = "songminh138@gmail.com";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

window.firebaseAuth = auth;
window.firebaseDb = db;

window.logout = function() {
    localStorage.removeItem('edtech_user');
    localStorage.removeItem('edtech_teacher_session');
    localStorage.removeItem('edtech_student_session');
    signOut(auth).catch(() => {}).finally(() => {
        window.location.reload();
    });
};

function renderLoginOverlay(message = "") {
    let overlay = document.getElementById('auth-guard-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'auth-guard-overlay';
        overlay.className = "fixed inset-0 z-[99999] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4";
        document.body.appendChild(overlay);
    }

    overlay.innerHTML = `
        <div class="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl text-center border border-slate-100 transform transition-all animate-fadeIn">
            <div class="w-20 h-20 mx-auto mb-6 bg-gradient-to-tr from-indigo-500 to-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30 text-white text-3xl">
                <i class="fa-solid fa-user-shield"></i>
            </div>
            <h2 class="text-2xl font-black text-slate-800 mb-2">Đăng Nhập Hệ Thống</h2>
            <p class="text-slate-500 text-sm mb-6">Vui lòng đăng nhập để bắt đầu. Hệ thống sẽ tự động ghi nhớ tài khoản cho những lần sau.</p>
            
            ${message ? `<div class="mb-5 p-3 rounded-xl bg-rose-50 text-rose-600 text-sm font-semibold border border-rose-200">${message}</div>` : ''}

            <button id="btn-google-login" class="w-full py-3.5 px-6 bg-white hover:bg-slate-50 border-2 border-slate-200 rounded-2xl font-bold text-slate-700 shadow-sm hover:shadow transition-all flex items-center justify-center gap-3 active:scale-95 mb-3">
                <svg class="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"/>
                    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.97 0 12s.45 3.84 1.25 5.42l4.03-3.15z"/>
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                </svg>
                <span>Đăng nhập với Google</span>
            </button>

            <button id="btn-quick-login" class="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-2xl transition">
                ⚡ Đăng nhập nhanh bằng tài khoản mặc định
            </button>

            <div class="mt-6 pt-4 border-t border-slate-100 flex justify-between text-xs text-slate-400">
                <a href="index.html" class="hover:text-indigo-600 transition font-medium flex items-center gap-1">
                    <i class="fa-solid fa-arrow-left"></i> Về Trang chủ
                </a>
                <span>CSDL Song Minh</span>
            </div>
        </div>
    `;

    document.getElementById('btn-google-login').onclick = async () => {
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
        } catch (err) {
            console.error("Lỗi đăng nhập Google:", err);
            renderLoginOverlay("Không thể đăng nhập Google. Bạn có thể bấm nút Đăng nhập nhanh bên dưới để vào.");
        }
    };

    document.getElementById('btn-quick-login').onclick = () => {
        const allowedRoles = window.ALLOWED_ROLES || ['STUDENT', 'TEACHER'];
        const isTeacher = allowedRoles.includes('TEACHER') && !allowedRoles.includes('STUDENT');
        const defaultUser = {
            uid: isTeacher ? "teacher_admin_001" : "uid_hs_001",
            email: isTeacher ? "songminh138@gmail.com" : "hocsinh@songminh.edu.vn",
            name: isTeacher ? "Thầy Cường" : "Học sinh",
            role: isTeacher ? "TEACHER" : "STUDENT"
        };
        localStorage.setItem('edtech_user', JSON.stringify(defaultUser));
        if (isTeacher) localStorage.setItem('edtech_teacher_session', JSON.stringify(defaultUser));
        else localStorage.setItem('edtech_student_session', JSON.stringify(defaultUser));
        window.location.reload();
    };
}

function removeLoginOverlay() {
    const overlay = document.getElementById('auth-guard-overlay');
    if (overlay) overlay.remove();
}

onAuthStateChanged(auth, async (user) => {
    const allowedRoles = window.ALLOWED_ROLES || ['STUDENT', 'TEACHER'];

    if (!user) {
        // Kiểm tra xem đã từng lưu phiên đăng nhập trong localStorage chưa
        const savedUserStr = localStorage.getItem('edtech_user') || 
            (allowedRoles.includes('TEACHER') && !allowedRoles.includes('STUDENT') 
                ? localStorage.getItem('edtech_teacher_session') 
                : localStorage.getItem('edtech_student_session'));

        if (savedUserStr) {
            try {
                const savedUser = JSON.parse(savedUserStr);
                const userRole = savedUser.role || (allowedRoles.includes('TEACHER') ? 'TEACHER' : 'STUDENT');
                const isAdmin = (savedUser.email === ADMIN_EMAIL);
                const hasPermission = isAdmin || allowedRoles.includes(userRole);

                if (hasPermission) {
                    window.CURRENT_USER_UID = savedUser.uid || 'uid_' + Date.now();
                    window.CURRENT_USER_EMAIL = savedUser.email || 'user@songminh.edu.vn';
                    const displayName = savedUser.name || (savedUser.email ? savedUser.email.split('@')[0] : 'Người dùng');
                    const nameEl = document.getElementById('user-name-display') || document.getElementById('teacher-name') || document.getElementById('student-name');
                    if (nameEl) nameEl.innerText = displayName;

                    removeLoginOverlay();
                    const protectedEl = document.getElementById('protected-content');
                    if (protectedEl) protectedEl.classList.remove('hidden');

                    window.dispatchEvent(new CustomEvent('auth-success', { detail: savedUser }));
                    return;
                }
            } catch(e) {
                console.warn("Parse saved user error:", e);
            }
        }

        // Chưa đăng nhập và không có session lưu
        const protectedEl = document.getElementById('protected-content');
        if (protectedEl) protectedEl.classList.add('hidden');
        renderLoginOverlay();
        return;
    }

    // Đã đăng nhập Google
    window.CURRENT_USER_UID = user.uid;
    window.CURRENT_USER_EMAIL = user.email;

    const displayName = user.displayName || user.email.split('@')[0];
    const nameEl = document.getElementById('user-name-display') || document.getElementById('teacher-name') || document.getElementById('student-name');
    if (nameEl) nameEl.innerText = displayName;

    // Kiểm tra quyền
    const isAdmin = (user.email === ADMIN_EMAIL);
    let userRole = isAdmin ? 'TEACHER' : 'STUDENT';

    try {
        const userRef = doc(db, "users_khoahoc", user.uid);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists() && docSnap.data().role) {
            userRole = docSnap.data().role.toUpperCase();
        } else {
            await setDoc(userRef, {
                uid: user.uid,
                email: user.email,
                name: displayName,
                role: isAdmin ? 'TEACHER' : 'STUDENT',
                updatedAt: new Date().toISOString()
            }, { merge: true });
        }
    } catch (e) {
        console.warn("Lưu Firestore thất bại, fallback quyền mặc định:", e);
    }

    if (isAdmin) userRole = 'TEACHER';

    const hasPermission = isAdmin || allowedRoles.includes(userRole);

    if (!hasPermission) {
        renderLoginOverlay(`Tài khoản (${user.email}) có vai trò [${userRole}], không thuộc quyền truy cập trang này. Vui lòng đăng nhập tài khoản khác.`);
        return;
    }

    // Lưu phiên đăng nhập vĩnh viễn vào localStorage
    const sessionObj = { uid: user.uid, email: user.email, name: displayName, role: userRole };
    localStorage.setItem('edtech_user', JSON.stringify(sessionObj));
    if (userRole === 'TEACHER') {
        localStorage.setItem('edtech_teacher_session', JSON.stringify(sessionObj));
    }
    localStorage.setItem('edtech_student_session', JSON.stringify(sessionObj));

    // Quyền hợp lệ -> Mở khóa giao diện
    removeLoginOverlay();
    const protectedEl = document.getElementById('protected-content');
    if (protectedEl) protectedEl.classList.remove('hidden');

    // Kích hoạt sự kiện auth-success cho các trang
    window.dispatchEvent(new CustomEvent('auth-success', { detail: user }));
});
