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
    signOut(auth).then(() => {
        window.location.reload();
    }).catch(err => {
        console.error("Lỗi đăng xuất:", err);
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
            <p class="text-slate-500 text-sm mb-6">Vui lòng đăng nhập bằng tài khoản Google để tiếp tục sử dụng hệ thống.</p>
            
            ${message ? `<div class="mb-5 p-3 rounded-xl bg-rose-50 text-rose-600 text-sm font-semibold border border-rose-200">${message}</div>` : ''}

            <button id="btn-google-login" class="w-full py-3.5 px-6 bg-white hover:bg-slate-50 border-2 border-slate-200 rounded-2xl font-bold text-slate-700 shadow-sm hover:shadow transition-all flex items-center justify-center gap-3 active:scale-95">
                <svg class="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"/>
                    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.97 0 12s.45 3.84 1.25 5.42l4.03-3.15z"/>
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                </svg>
                <span>Đăng nhập với Google</span>
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
            renderLoginOverlay("Không thể đăng nhập. Vui lòng thử lại!");
        }
    };
}

function removeLoginOverlay() {
    const overlay = document.getElementById('auth-guard-overlay');
    if (overlay) overlay.remove();
}

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        // Chưa đăng nhập
        const protectedEl = document.getElementById('protected-content');
        if (protectedEl) protectedEl.classList.add('hidden');
        renderLoginOverlay();
        return;
    }

    // Đã đăng nhập
    window.CURRENT_USER_UID = user.uid;
    window.CURRENT_USER_EMAIL = user.email;

    const displayName = user.displayName || user.email.split('@')[0];
    const nameEl = document.getElementById('user-name-display') || document.getElementById('teacher-name') || document.getElementById('student-name');
    if (nameEl) nameEl.innerText = displayName;

    // Kiểm tra quyền
    const allowedRoles = window.ALLOWED_ROLES || ['STUDENT', 'TEACHER'];
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

    // Quyền hợp lệ -> Mở khóa giao diện
    removeLoginOverlay();
    const protectedEl = document.getElementById('protected-content');
    if (protectedEl) protectedEl.classList.remove('hidden');

    // Kích hoạt sự kiện auth-success cho các trang
    window.dispatchEvent(new CustomEvent('auth-success', { detail: user }));
});
