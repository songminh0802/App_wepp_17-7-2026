/**
 * RESCHOOL – CHỢ ĐỒ DÙNG HỌC TẬP TUẦN HOÀN
 * "Trao một món đồ cũ – Mở thêm một cơ hội mới"
 *
 * Code.gs  : lõi (cấu hình, schema, hàm dữ liệu, xác thực vai trò, khởi tạo, trigger)
 * Public.gs: hàm công khai (pub_*) – khách không cần tài khoản
 * Admin.gs : hàm quản trị (adm_*) – mỗi hàm TỰ kiểm tra vai trò ở server
 * Demo.gs  : dữ liệu minh họa (toàn bộ che_do = DEMO)
 *
 * QUY ƯỚC: hàm kết thúc bằng dấu "_" là hàm nội bộ, client KHÔNG gọi được.
 */

var PHIEN_BAN = '1.0.0';
var TEN_DU_AN = 'ReSchool – Chợ đồ dùng học tập tuần hoàn';
var SLOGAN = 'Trao một món đồ cũ – Mở thêm một cơ hội mới';
var TZ = 'Asia/Ho_Chi_Minh';

/** Hàm hỗ trợ ép Google hiện hộp thoại cấp quyền Google Drive nếu bị thiếu */
function capQuyenDrive() {
  var root = DriveApp.getRootFolder();
  console.log('Đã cấp quyền Google Drive thành công! Thư mục gốc: ' + root.getName());
}

/* ===================== SCHEMA (11 sheet) ===================== */
var SCHEMA = {
  // Cấu hình dạng khóa-giá trị. che_do_van_hanh = DEMO | THAT
  CauHinh: ['khoa', 'gia_tri', 'mo_ta'],
  // Tài khoản Google được vào trang quản trị + vai trò
  NguoiDung: ['email', 'ho_ten', 'vai_tro', 'hoat_dong', 'ngay_tao'],
  // Sản phẩm. ton_kho = còn đặt được; dang_giu = đang giữ chỗ; da_ban = đã bán; tong_nhap = ton_kho+dang_giu+da_ban
  SanPham: ['ma', 'ten', 'danh_muc', 'mo_ta', 'tinh_trang', 'loi_ghi_nhan', 'gia_de_xuat', 'gia',
    'ton_kho', 'dang_giu', 'da_ban', 'tong_nhap', 'trang_thai', 'nguon', 'ma_nguon',
    'anh_rieng_id', 'anh_id', 'da_kiem_tra', 'kiem_tra', 'nguoi_kiem_tra', 'ngay_kiem_tra',
    'nguoi_duyet_gia', 'ngay_duyet_gia', 'ly_do', 'ngay_dang', 'luu_tru', 'nguoi_tao', 'ngay_tao', 'che_do'],
  // Yêu cầu tặng đồ (RIÊNG TƯ). Gửi yêu cầu != đã tiếp nhận
  YeuCauTang: ['ma', 'ten_lien_he', 'lien_he', 'loai_hang', 'mo_ta', 'tinh_trang', 'anh_rieng_id',
    'la_hoc_sinh', 'phu_huynh_dong_y', 'tu_nguyen', 'trang_thai', 'ly_do', 'ma_san_pham',
    'nguoi_xu_ly', 'ngay_gui', 'ngay_xu_ly', 'che_do'],
  // Ký gửi (RIÊNG TƯ). Giá thống nhất/thời hạn/hoa hồng chỉ ghi ở bước duyệt (BM03)
  KyGui: ['ma', 'ten_lien_he', 'lien_he', 'mo_ta', 'tinh_trang', 'anh_rieng_id', 'gia_mong_muon',
    'la_hoc_sinh', 'phu_huynh_dong_y', 'trang_thai', 'gia_thong_nhat', 'thoi_han', 'hoa_hong_pct',
    'cach_tra_hang', 'ma_san_pham', 'nguoi_xac_nhan', 'ngay_thoa_thuan', 'ngay_ket_thuc',
    'ly_do_ket_thuc', 'ghi_chu', 'ngay_gui', 'che_do'],
  // Đơn hàng (RIÊNG TƯ). xac_thuc_hash = băm của mã xác thực khách giữ
  DonHang: ['ma_don', 'xac_thuc_hash', 'ten_khach', 'lien_he', 'ghi_chu', 'tong_tien', 'trang_thai',
    'thanh_toan', 'han_giu_cho', 'ly_huy', 'da_ghi_so', 'lich_su', 'nguoi_xu_ly', 'ngay_tao', 'ngay_cap_nhat', 'che_do'],
  ChiTietDon: ['ma_ct', 'ma_don', 'ma_sp', 'ten_sp', 'so_luong', 'don_gia', 'thanh_tien', 'nguon',
    'ma_ky_gui', 'da_hoan_kho', 'che_do'],
  // Sổ thu chi. Bản ghi DA_XAC_NHAN KHÔNG sửa/xóa, chỉ điều chỉnh bằng bản ghi mới (loai=DIEU_CHINH)
  ThuChi: ['ma', 'ngay', 'noi_dung', 'loai', 'so_tien', 'chung_tu', 'chung_tu_hop_le', 'trang_thai',
    'nguoi_nhap', 'nguoi_duyet', 'ngay_duyet', 'ma_don', 'ma_ky_gui', 'dieu_chinh_cho', 'loai_goc',
    'muc_phan_bo', 'ly_do', 'che_do'],
  PhanHoi: ['ma', 'noi_dung', 'diem', 'lien_he', 'trang_thai', 'ngay_gui', 'che_do'],
  // Lưu biểu mẫu BM01..BM05 + PHAN_BO (phê duyệt phân bổ)
  Phieu: ['ma', 'loai', 'tham_chieu', 'du_lieu', 'nguoi_lap', 'ngay_lap', 'che_do'],
  NhatKy: ['thoi_gian', 'email', 'vai_tro', 'hanh_dong', 'doi_tuong', 'chi_tiet', 'che_do']
};

// Cột được định dạng văn bản thuần (giữ số 0 đầu, tránh Sheets tự đổi thành ngày)
var COT_VAN_BAN_ = /^(lien_he|ma|ma_.+|.+_id|ngay.*|han.*|thoi_han|thoi_gian|email|xac_thuc.*|khoa|gia_tri|kiem_tra|lich_su|du_lieu)$/;

var DANH_MUC = [
  { ma: 'SACH', ten: 'Sách và tài liệu', icon: '📚' },
  { ma: 'DUNG_CU', ten: 'Dụng cụ học tập', icon: '✏️' },
  { ma: 'CAP_BA_LO', ten: 'Cặp và ba lô', icon: '🎒' },
  { ma: 'BO_TIET_KIEM', ten: 'Bộ dụng cụ tiết kiệm', icon: '🧰' }
];
var TINH_TRANG = ['Như mới', 'Tốt', 'Khá', 'Cũ nhưng dùng tốt'];
var VAI_TRO = { HOC_SINH: 1, GIAO_VIEN: 2, QUAN_TRI: 3 };

var NHAN_DEMO = {
  diem_nhan: 'Phòng truyền thống của trường (minh họa)',
  thoi_gian_nhan: 'Giờ ra chơi, thứ Tư hằng tuần (minh họa)',
  lien_he: 'Giáo viên phụ trách dự án (liên hệ minh họa)',
  han_giu_cho_gio: '48'
};

/* ===================== WEB APP & API ===================== */
function doGet(e) {
  if (e && e.parameter && e.parameter.api === 'ping') {
    return outJson_({ ok: true, phien_ban: PHIEN_BAN, ten: TEN_DU_AN, thoi_gian: bayGio_() });
  }
  // Tự động chuyển hướng về trang web chính trên Vercel
  var html = '<!DOCTYPE html><html><head><meta charset="utf-8">' +
    '<meta http-equiv="refresh" content="0; url=https://reschool-chododunghoctaptuanhoan.vercel.app/">' +
    '<script>window.location.href="https://reschool-chododunghoctaptuanhoan.vercel.app/";</script>' +
    '<style>body{font-family:system-ui,-apple-system,sans-serif;text-align:center;padding:50px;background:#f8f9fa;color:#333;line-height:1.6} .btn{display:inline-block;padding:12px 24px;background:#2e7d32;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;margin-top:16px}</style>' +
    '</head><body>' +
    '<h2>♻️ ReSchool – Chợ đồ dùng học tập tuần hoàn</h2>' +
    '<p>Đang chuyển hướng tới giao diện website chính...</p>' +
    '<p><a class="btn" href="https://reschool-chododunghoctaptuanhoan.vercel.app/">Bấm vào đây để mở ReSchool</a></p>' +
    '</body></html>';
  return HtmlService.createHtmlOutput(html)
    .setTitle('ReSchool – Chợ đồ dùng học tập tuần hoàn')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  try {
    var raw = (e && e.postData && e.postData.contents) || '{}';
    var req = JSON.parse(raw);
    var fn = String(req.fn || '').trim();
    var args = Array.isArray(req.args) ? req.args : [];
    var auth = req.auth || {};

    // Nhận diện tài khoản Google đăng nhập từ Firebase Auth bên ngoài
    if (auth && auth.email) {
      requestUser_ = timNguoiDung_(auth.email);
    } else {
      requestUser_ = null;
    }

    // Chặn gọi các hàm nội bộ (kết thúc bằng dấu _)
    if (!fn || fn.slice(-1) === '_') {
      return outJson_({ ok: false, loi: 'Hàm không hợp lệ hoặc bị từ chối truy cập.' });
    }

    var targetFn = (typeof globalThis !== 'undefined' && typeof globalThis[fn] === 'function') ? globalThis[fn] :
                   (typeof this !== 'undefined' && this && typeof this[fn] === 'function' ? this[fn] : null);

    if (!targetFn) {
      return outJson_({ ok: false, loi: 'Không tìm thấy hàm: ' + fn });
    }

    var kq = targetFn.apply(null, args);
    return outJson_(kq);
  } catch (err) {
    console.error('Lỗi API doPost:', err);
    return outJson_({ ok: false, loi: 'Lỗi máy chủ: ' + (err.message || String(err)) });
  } finally {
    requestUser_ = null;
  }
}

function outJson_(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function include(ten) {
  return HtmlService.createHtmlOutputFromFile(ten).getContent();
}

/* ===================== TIỆN ÍCH ===================== */
function loi_(m) { var e = new Error(m); e.nghiepVu = true; return e; }

function chay_(f) {
  try { return { ok: true, data: f() }; }
  catch (e) {
    if (e && e.nghiepVu) return { ok: false, loi: e.message };
    console.error((e && e.stack) || e);
    var chiTiet = (e && e.message) ? e.message : String(e);
    return { ok: false, loi: 'Có lỗi hệ thống: ' + chiTiet };
  }
}

function khoa_(f) {
  var l = LockService.getScriptLock();
  if (!l.tryLock(20000)) throw loi_('Hệ thống đang bận, vui lòng thử lại sau ít giây.');
  try { return f(); } finally { l.releaseLock(); }
}

function bayGio_() { return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm:ss'); }
function homNay_() { return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'); }
function congGio_(gio) { return Utilities.formatDate(new Date(Date.now() + gio * 3600000), TZ, 'yyyy-MM-dd HH:mm:ss'); }
function b_(x) { return x === true || String(x).toUpperCase() === 'TRUE'; }
function so_(x) { var n = Number(x); return isNaN(n) ? 0 : n; }
function ngayHopLe_(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s || ''))) return false;
  var d = new Date(s + 'T00:00:00'); return !isNaN(d.getTime()) && Utilities.formatDate(d, TZ, 'yyyy-MM-dd') === s;
}
function sdtHopLe_(s) {
  var t = String(s || '').replace(/[\s.\-]/g, '');
  return /^(\+?84|0)\d{9,10}$/.test(t) || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s || '').trim());
}
function chuoi_(s, min, max, ten) {
  s = String(s == null ? '' : s).trim();
  if (s.length < min) throw loi_(ten + " quá ngắn (tối thiểu " + min + " ký tự).");
  if (s.length > max) throw loi_(ten + ' quá dài (tối đa ' + max + ' ký tự).');
  return s;
}
// Chống chèn công thức vào Sheet
function sach_(k, v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') return JSON.stringify(v);
  if (typeof v === 'string' && k !== 'lien_he' && /^[=+\-@]/.test(v)) return ' ' + v;
  return v;
}
function sha_(s) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8)
    .map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join('');
}
function muoi_() {
  var p = PropertiesService.getScriptProperties();
  var m = p.getProperty('MUOI');
  if (!m) { m = Utilities.getUuid(); p.setProperty('MUOI', m); }
  return m;
}
function bamXacThuc_(maDon, code) { return sha_(muoi_() + '|' + maDon + '|' + String(code).toUpperCase().trim()); }

/* ===================== TRUY CẬP SHEET ===================== */
function ss_() {
  var id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (id) return SpreadsheetApp.openById(id);
  var a = SpreadsheetApp.getActiveSpreadsheet();
  if (!a) throw new Error('Chưa khởi tạo: hãy chạy hàm khoiTao() trong trình soạn thảo Apps Script.');
  return a;
}
function sh_(ten) {
  var s = ss_().getSheetByName(ten);
  if (!s) throw new Error('Thiếu sheet ' + ten + '. Hãy chạy khoiTao().');
  return s;
}
function doc_(ten) {
  var v = sh_(ten).getDataRange().getValues();
  var h = v[0], out = [];
  for (var i = 1; i < v.length; i++) {
    if (v[i].join('') === '') continue;
    var o = { _r: i + 1 };
    for (var j = 0; j < h.length; j++) {
      var x = v[i][j];
      if (x instanceof Date) x = Utilities.formatDate(x, TZ, 'yyyy-MM-dd HH:mm:ss');
      o[h[j]] = x;
    }
    out.push(o);
  }
  return out;
}
function dong_(ten, o) { return SCHEMA[ten].map(function (k) { return sach_(k, o[k]); }); }
function them_(ten, o) {
  var s = sh_(ten), h = SCHEMA[ten];
  s.getRange(s.getLastRow() + 1, 1, 1, h.length).setValues([dong_(ten, o)]);
}
function capNhat_(ten, o) {
  var h = SCHEMA[ten];
  sh_(ten).getRange(o._r, 1, 1, h.length).setValues([dong_(ten, o)]);
}
function tim_(ten, khoa, giaTri) {
  var r = doc_(ten);
  for (var i = 0; i < r.length; i++) if (String(r[i][khoa]) === String(giaTri)) return r[i];
  return null;
}
function sinhMa_(tiento, dai) {
  var p = PropertiesService.getScriptProperties(), k = 'SEQ_' + tiento;
  var n = Number(p.getProperty(k) || 0) + 1;
  p.setProperty(k, String(n));
  return tiento + ('000000' + n).slice(-(dai || 3));
}

/* ===================== CẤU HÌNH & CHẾ ĐỘ ===================== */
var cfgCache_ = null;
function cfgAll_() {
  if (cfgCache_) return cfgCache_;
  var m = {};
  doc_('CauHinh').forEach(function (r) { m[r.khoa] = String(r.gia_tri === undefined ? '' : r.gia_tri); });
  cfgCache_ = m; return m;
}
function cfgSet_(k, v, moTa) {
  var rows = doc_('CauHinh'), r = null;
  for (var i = 0; i < rows.length; i++) if (rows[i].khoa === k) r = rows[i];
  if (r) { r.gia_tri = v; capNhat_('CauHinh', r); }
  else them_('CauHinh', { khoa: k, gia_tri: v, mo_ta: moTa || '' });
  cfgCache_ = null;
}
function cheDo_() { return cfgAll_().che_do_van_hanh === 'THAT' ? 'THAT' : 'DEMO'; }
function urlGoc_(c) { return c.url_goc || ScriptApp.getService().getUrl(); }
function thongTinNhan_(c, cd) {
  var o = { minh_hoa: cd !== 'THAT' };
  ['diem_nhan', 'thoi_gian_nhan', 'lien_he', 'han_giu_cho_gio'].forEach(function (k) {
    o[k] = cd === 'THAT' ? (c[k] || '') : (c[k] || NHAN_DEMO[k]);
  });
  return o;
}
function hanGiuChoGio_() { return Math.max(1, Math.min(720, so_(thongTinNhan_(cfgAll_(), cheDo_()).han_giu_cho_gio) || 48)); }

/* ===================== XÁC THỰC VAI TRÒ ===================== */
/**
 * Người dùng quản trị hợp lệ khi: có email Google, email người truy cập == người thực thi
 * (nghĩa là bản triển khai "execute as user accessing") và email nằm trong NguoiDung (hoạt động).
 * Bản triển khai công khai (execute as me): người truy cập != người thực thi => luôn là Khách.
 */
var requestUser_ = null;

function timNguoiDung_(email) {
  if (!email) return null;
  email = String(email).trim().toLowerCase();
  var rows = [];
  try { rows = doc_('NguoiDung'); } catch (x) { return null; }
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].email).toLowerCase() === email && b_(rows[i].hoat_dong) && VAI_TRO[rows[i].vai_tro]) {
      return { email: email, ho_ten: rows[i].ho_ten, vai_tro: rows[i].vai_tro };
    }
  }
  // Quản trị viên cấp cao mặc định theo chuẩn web app
  if (email === 'songminh138@gmail.com') {
    return { email: email, ho_ten: 'Quản trị viên (songminh138)', vai_tro: 'QUAN_TRI' };
  }
  return null;
}

function nguoiDung_() {
  if (requestUser_) return requestUser_;
  var a = '', e = '';
  try { a = Session.getActiveUser().getEmail(); e = Session.getEffectiveUser().getEmail(); } catch (x) { return null; }
  if (a && e && a.toLowerCase() === e.toLowerCase()) {
    return timNguoiDung_(a);
  }
  return null;
}
function batBuoc_(toiThieu) {
  var u = nguoiDung_();
  if (!u || VAI_TRO[u.vai_tro] < VAI_TRO[toiThieu]) throw loi_('Bạn không có quyền thực hiện thao tác này (máy chủ từ chối).');
  return u;
}
function nhatKy_(u, hanhDong, doiTuong, chiTiet) {
  them_('NhatKy', {
    thoi_gian: bayGio_(), email: u ? u.email : 'he_thong', vai_tro: u ? u.vai_tro : 'HE_THONG',
    hanh_dong: hanhDong, doi_tuong: doiTuong || '', chi_tiet: typeof chiTiet === 'string' ? chiTiet : JSON.stringify(chiTiet || ''),
    che_do: cheDo_()
  });
}
function xoaCache_() {
  try { CacheService.getScriptCache().removeAll(['sp_DEMO', 'sp_THAT']); } catch (e) { }
}

/* ===================== THƯ MỤC DRIVE ===================== */
function thuMuc_(khoa) {
  var p = PropertiesService.getScriptProperties(), id = p.getProperty(khoa);
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) { } }
  var f = DriveApp.createFolder(khoa === 'FOLDER_CONG_KHAI' ? 'ReSchool_AnhCongKhai' : 'ReSchool_AnhRieng');
  if (khoa === 'FOLDER_CONG_KHAI') {
    try { f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) { console.warn('Không đặt được chia sẻ công khai: ' + e); }
  }
  p.setProperty(khoa, f.getId());
  return f;
}

/* ===================== KHỞI TẠO (chạy 1 lần từ trình soạn thảo) ===================== */
function khoiTao() {
  var p = PropertiesService.getScriptProperties();
  // Đã bỏ chặn batBuoc_('QUAN_TRI') để chủ script luôn chạy được khoiTao()
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    var sid = p.getProperty("SPREADSHEET_ID");
    if (sid) { try { ss = SpreadsheetApp.openById(sid); } catch(e) {} }
  }
  if (!ss) throw new Error("LỖI: Không tìm thấy Google Sheet! Bạn cần mở dự án từ Google Sheet bằng cách: Mở trang tính Google Sheet > Menu Tiện ích mở rộng > Apps Script.");
  p.setProperty('SPREADSHEET_ID', ss.getId());
  muoi_();
  Object.keys(SCHEMA).forEach(function (ten) {
    var s = ss.getSheetByName(ten) || ss.insertSheet(ten);
    var h = SCHEMA[ten];
    if (s.getLastRow() === 0) {
      s.getRange(1, 1, 1, h.length).setValues([h]).setFontWeight('bold').setBackground('#2E7D32').setFontColor('#ffffff');
      s.setFrozenRows(1);
    }
    h.forEach(function (k, i) {
      if (COT_VAN_BAN_.test(k)) s.getRange(2, i + 1, s.getMaxRows() - 1, 1).setNumberFormat('@');
    });
  });
  ['Sheet1', 'Trang tính1'].forEach(function (n) {
    var s = ss.getSheetByName(n);
    if (s && s.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(s);
  });
  var mac = [
    ['che_do_van_hanh', 'DEMO', 'DEMO hoặc THAT. Chỉ đổi bằng chức năng "Bật vận hành" trong trang quản trị'],
    ['so_van_ban', '', 'Số văn bản chấp thuận của nhà trường'],
    ['ngay_van_ban', '', 'Ngày văn bản (yyyy-MM-dd)'],
    ['nguoi_xac_nhan', '', 'Người xác nhận phía nhà trường'],
    ['diem_nhan', '', 'Điểm nhận hàng'],
    ['thoi_gian_nhan', '', 'Thời gian nhận hàng'],
    ['lien_he', '', 'Liên hệ hỗ trợ (hiển thị công khai)'],
    ['han_giu_cho_gio', '', 'Thời hạn giữ chỗ (giờ)'],
    ['url_goc', '', 'URL bản triển khai CÔNG KHAI (dùng cho mã QR)'],
    ['url_quan_tri', '', 'URL bản triển khai QUẢN TRỊ (hiện nút đăng nhập quản trị)'],
    ['tl_ho_tro', '40', 'Tỷ lệ ĐỀ XUẤT hỗ trợ học sinh khó khăn (%)'],
    ['tl_tai_dau_tu', '40', 'Tỷ lệ ĐỀ XUẤT tái đầu tư (%)'],
    ['tl_du_phong', '20', 'Tỷ lệ ĐỀ XUẤT dự phòng (%)'],
    ['so_hs_tham_gia', '', 'Số học sinh tham gia (nhập tay)'],
    ['nhiem_vu_hs', '', 'Nhiệm vụ của học sinh (nhập tay)']
  ];
  var co = cfgAll_();
  mac.forEach(function (r) { if (co[r[0]] === undefined) them_('CauHinh', { khoa: r[0], gia_tri: r[1], mo_ta: r[2] }); });
  cfgCache_ = null;
  var me = Session.getEffectiveUser().getEmail();
  if (me && !tim_('NguoiDung', 'email', me)) {
    them_('NguoiDung', { email: me, ho_ten: 'Quản trị viên (chủ script)', vai_tro: 'QUAN_TRI', hoat_dong: true, ngay_tao: bayGio_() });
  }
  try { thuMuc_('FOLDER_RIENG'); thuMuc_('FOLDER_CONG_KHAI'); } catch (e) { console.warn('Thư mục Drive: ' + e); }
  if (doc_('SanPham').length === 0) seedDemo_();
  console.log('Khởi tạo xong. Tiếp theo: caiTrigger(), rồi triển khai 2 bản (xem HUONGDAN.md).');
}

function caiTrigger() {
  // Đã bỏ chặn batBuoc_('QUAN_TRI') để chủ script luôn chạy được caiTrigger()
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'hetHanGiuCho') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('hetHanGiuCho').timeBased().everyMinutes(15).create();
  console.log('Đã tạo trigger hetHanGiuCho mỗi 15 phút.');
}

/** Đồng bộ quyền: thêm tài khoản NguoiDung làm biên tập viên Sheet + thư mục ảnh; cảnh báo khi sửa tay sổ thu chi. Chủ script chạy. */
function dongBoQuyen() {
  batBuoc_('QUAN_TRI');
  var ss = ss_(), kq = [];
  var ds = doc_('NguoiDung').filter(function (r) { return b_(r.hoat_dong); });
  ds.forEach(function (r) {
    try {
      ss.addEditor(r.email);
      thuMuc_('FOLDER_RIENG').addEditor(r.email);
      thuMuc_('FOLDER_CONG_KHAI').addEditor(r.email);
      kq.push('OK ' + r.email);
    } catch (e) { kq.push('LỖI ' + r.email + ': ' + e.message); }
  });
  ['ThuChi', 'NhatKy', 'DonHang', 'ChiTietDon'].forEach(function (n) {
    try {
      var s = ss.getSheetByName(n);
      var has = s.getProtections(SpreadsheetApp.ProtectionType.SHEET).length > 0;
      if (!has) { var pr = s.protect().setDescription('Chỉ sửa qua ứng dụng'); pr.setWarningOnly(true); }
    } catch (e) { kq.push('Bảo vệ ' + n + ': ' + e.message); }
  });
  try {
    ['CauHinh', 'NguoiDung'].forEach(function (n) {
      var s = ss.getSheetByName(n);
      if (s.getProtections(SpreadsheetApp.ProtectionType.SHEET).length > 0) return;
      var pr = s.protect().setDescription('Chỉ quản trị viên');
      var qt = ds.filter(function (r) { return r.vai_tro === 'QUAN_TRI'; }).map(function (r) { return r.email; });
      pr.addEditors(qt);
      pr.removeEditors(pr.getEditors().map(function (x) { return x.getEmail(); }).filter(function (e) { return qt.indexOf(e) < 0 && e !== Session.getEffectiveUser().getEmail(); }));
    });
  } catch (e) { kq.push('Bảo vệ CauHinh/NguoiDung: ' + e.message); }
  return kq.join('\n');
}

/* ===================== TRIGGER: HỦY GIỮ CHỖ HẾT HẠN ===================== */
function hetHanGiuCho() {
  var n = 0;
  var l = LockService.getScriptLock();
  if (!l.tryLock(25000)) return 'bận';
  try { n = giaiPhongHetHan_(); } finally { l.releaseLock(); }
  if (n > 0) { xoaCache_(); nhatKy_(null, 'HET_HAN_GIU_CHO', '', 'Hủy ' + n + ' đơn hết hạn giữ chỗ'); }
  return n;
}

/** Gọi trong khóa. Hủy đơn chưa thu tiền quá hạn giữ chỗ và hoàn tồn kho. */
function giaiPhongHetHan_() {
  var now = bayGio_(), n = 0;
  doc_('DonHang').forEach(function (d) {
    var dangGiu = ['CHO_XAC_NHAN', 'DA_XAC_NHAN', 'CHO_NHAN'].indexOf(d.trang_thai) >= 0;
    if (dangGiu && d.thanh_toan !== 'DA_THU' && String(d.han_giu_cho) && String(d.han_giu_cho) < now) {
      huyDon_(d, 'Hết hạn giữ chỗ (tự động)', null); n++;
    }
  });
  return n;
}

/** Hủy đơn + hoàn tồn kho (idempotent nhờ da_hoan_kho). Gọi trong khóa. */
function huyDon_(d, lyDo, u) {
  var cts = doc_('ChiTietDon').filter(function (c) { return c.ma_don === d.ma_don && !b_(c.da_hoan_kho); });
  var sps = {}; doc_('SanPham').forEach(function (s) { sps[s.ma] = s; });
  cts.forEach(function (c) {
    var s = sps[c.ma_sp], q = so_(c.so_luong);
    if (s) {
      s.dang_giu = Math.max(0, so_(s.dang_giu) - q);
      s.ton_kho = so_(s.ton_kho) + q;
      tinhTrangBan_(s); capNhat_('SanPham', s);
    }
    c.da_hoan_kho = true; capNhat_('ChiTietDon', c);
  });
  d.trang_thai = 'HUY'; d.ly_huy = lyDo; d.ngay_cap_nhat = bayGio_();
  d.nguoi_xu_ly = u ? u.email : 'he_thong';
  ghiLichSu_(d, 'HUY', lyDo, u);
  capNhat_('DonHang', d);
  xoaCache_();
}
function ghiLichSu_(d, hanhDong, ghiChu, u) {
  var ls = []; try { ls = JSON.parse(d.lich_su || '[]'); } catch (e) { }
  ls.push({ t: bayGio_(), h: hanhDong, g: ghiChu || '', n: u ? u.ho_ten || u.email : 'Hệ thống' });
  d.lich_su = JSON.stringify(ls);
}
// Trạng thái bán tự suy ra từ tồn kho (chỉ áp dụng cho hàng đã công khai)
function tinhTrangBan_(s) {
  if (['SAN_SANG', 'GIU_CHO', 'DA_BAN'].indexOf(s.trang_thai) < 0) return;
  s.trang_thai = so_(s.ton_kho) > 0 ? 'SAN_SANG' : (so_(s.dang_giu) > 0 ? 'GIU_CHO' : (so_(s.da_ban) > 0 ? 'DA_BAN' : 'SAN_SANG'));
}

/* ===================== ẢNH (kiểm tra ở server) ===================== */
function luuAnh_(p) {
  if (!p || !p.b64) throw loi_('Chưa chọn ảnh.');
  var cho = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
  var mime = String(p.mime || '').toLowerCase();
  if (!cho[mime]) throw loi_('Chỉ nhận ảnh JPG, PNG hoặc WEBP.');
  var bytes;
  try { bytes = Utilities.base64Decode(String(p.b64).replace(/^data:[^,]+,/, '')); } catch (e) { throw loi_('Tệp ảnh không hợp lệ.'); }
  if (!bytes || bytes.length === 0) throw loi_('Tệp ảnh rỗng.');
  if (bytes.length > 2 * 1024 * 1024) throw loi_('Ảnh vượt quá 2 MB.');
  if (bytes.length < 12) throw loi_('Tệp ảnh không hợp lệ.');

  // Kiểm tra magic bytes an toàn trực tiếp trên Byte[] của GAS mà không gọi .map (tránh lỗi 'bytes.map is not a function')
  var b0 = bytes[0] & 255, b1 = bytes[1] & 255, b2 = bytes[2] & 255, b3 = bytes[3] & 255;
  var jpg = b0 === 0xFF && b1 === 0xD8 && b2 === 0xFF;
  var png = b0 === 0x89 && b1 === 0x50 && b2 === 0x4E && b3 === 0x47;
  var webp = (bytes[0] & 255) === 0x52 && (bytes[1] & 255) === 0x49 && (bytes[2] & 255) === 0x46 && (bytes[3] & 255) === 0x46 &&
             (bytes[8] & 255) === 0x57 && (bytes[9] & 255) === 0x45 && (bytes[10] & 255) === 0x42 && (bytes[11] & 255) === 0x50;
  var ok = (mime === 'image/jpeg' && jpg) || (mime === 'image/png' && png) || (mime === 'image/webp' && webp);
  if (!ok) throw loi_('Nội dung tệp không khớp định dạng ảnh.');

  // giới hạn số ảnh/ngày để tránh làm đầy Drive
  var pr = PropertiesService.getScriptProperties(), hn = homNay_(), v = (pr.getProperty('ANH_NGAY') || '').split('|');
  var dem = v[0] === hn ? Number(v[1]) : 0;
  if (dem >= 150) throw loi_('Hôm nay đã đạt giới hạn tải ảnh. Vui lòng thử lại ngày mai.');
  pr.setProperty('ANH_NGAY', hn + '|' + (dem + 1));

  // Utilities.newBlob nhận trực tiếp mảng bytes (Byte[]) từ Utilities.base64Decode
  var blob = Utilities.newBlob(bytes, mime, 'rs_' + Utilities.getUuid().slice(0, 8) + '.' + cho[mime]);
  return thuMuc_('FOLDER_RIENG').createFile(blob).getId();
}
function anhRiengHopLe_(id) {
  if (!id) return '';
  try {
    var f = DriveApp.getFileById(String(id)), rid = thuMuc_('FOLDER_RIENG').getId(), it = f.getParents();
    while (it.hasNext()) if (it.next().getId() === rid) return String(id);
  } catch (e) { }
  throw loi_('Ảnh đính kèm không hợp lệ, vui lòng tải lại.');
}


/* ========================================================================= */
/* ===================== PHẦN 2: HÀM CÔNG KHAI (PUBLIC) ==================== */
/* ========================================================================= */

/**
 * Public.gs – HÀM CÔNG KHAI (khách, không cần tài khoản).
 * Chỉ trả về các cột được phép. Không bao giờ trả liên hệ/đơn/chủ hàng.
 */

function tacDong_(cd) {
  if (cd !== 'THAT') return { co: false };
  var cts = doc_('ChiTietDon').filter(function (c) { return c.che_do === 'THAT'; });
  var hoanTat = {};
  doc_('DonHang').forEach(function (d) { if (d.che_do === 'THAT' && d.trang_thai === 'HOAN_TAT' && d.thanh_toan === 'DA_THU') hoanTat[d.ma_don] = 1; });
  var coChu = 0; cts.forEach(function (c) { if (hoanTat[c.ma_don]) coChu += so_(c.so_luong); });
  var tiepNhan = 0;
  doc_('SanPham').forEach(function (s) { if (s.che_do === 'THAT' && ['CHO_TIEP_NHAN', 'LOAI_BO'].indexOf(s.trang_thai) < 0 && s.trang_thai !== 'KHONG_DAT') tiepNhan += so_(s.tong_nhap); });
  return { co: true, da_co_chu_moi: coChu, da_tiep_nhan: tiepNhan };
}

function pub_khoiTao() {
  return chay_(function () {
    var c = cfgAll_(), cd = cheDo_();
    return {
      che_do: cd, ten: TEN_DU_AN, slogan: SLOGAN, nhan: thongTinNhan_(c, cd), url_goc: urlGoc_(c),
      url_quan_tri: c.url_quan_tri || '', danh_muc: DANH_MUC, tinh_trang: TINH_TRANG, tac_dong: tacDong_(cd),
      phien_ban: PHIEN_BAN
    };
  });
}

function mapKyGui_() {
  var m = {}; doc_('KyGui').forEach(function (k) { m[k.ma] = k; }); return m;
}
function kyGuiConHan_(sp, kgByProduct) {
  if (sp.nguon !== 'KY_GUI') return true;
  var k = kgByProduct[sp.ma];
  return !!(k && k.trang_thai === 'DA_THOA_THUAN' && String(k.thoi_han) >= homNay_());
}
function hienCongKhai_(r, cd) {
  return r.che_do === cd && !b_(r.luu_tru) && b_(r.da_kiem_tra) && !!r.nguoi_duyet_gia &&
    ['SAN_SANG', 'GIU_CHO', 'DA_BAN'].indexOf(r.trang_thai) >= 0;
}
function dangCongKhai_(r, kgByProduct) {
  return {
    ma: r.ma, ten: r.ten, danh_muc: r.danh_muc, mo_ta: r.mo_ta, tinh_trang: r.tinh_trang,
    loi_ghi_nhan: r.loi_ghi_nhan, gia: so_(r.gia), ton_kho: so_(r.ton_kho), trang_thai: r.trang_thai,
    anh_id: r.anh_id || '', ngay_dang: String(r.ngay_dang || ''), nguon: r.nguon, da_kiem_tra: true,
    che_do: r.che_do,
    dat_duoc: r.trang_thai === 'SAN_SANG' && so_(r.ton_kho) > 0 && kyGuiConHan_(r, kgByProduct)
  };
}
function kyGuiTheoSp_() {
  var m = {}; doc_('KyGui').forEach(function (k) { if (k.ma_san_pham) m[k.ma_san_pham] = k; }); return m;
}

function pub_danhSachSanPham() {
  return chay_(function () {
    var cd = cheDo_(), cache = CacheService.getScriptCache(), key = 'sp_' + cd;
    try { var h = cache.get(key); if (h) return JSON.parse(h); } catch (e) { }
    var kg = kyGuiTheoSp_(), out = [];
    doc_('SanPham').forEach(function (r) { if (hienCongKhai_(r, cd)) out.push(dangCongKhai_(r, kg)); });
    try { var s = JSON.stringify(out); if (s.length < 90000) cache.put(key, s, 30); } catch (e) { }
    return out;
  });
}

function pub_chiTietSanPham(ma) {
  return chay_(function () {
    var cd = cheDo_(), r = tim_('SanPham', 'ma', String(ma || '').toUpperCase());
    if (!r || !hienCongKhai_(r, cd)) throw loi_('Không tìm thấy sản phẩm hoặc sản phẩm chưa được đăng.');
    return dangCongKhai_(r, kyGuiTheoSp_());
  });
}

/* ---------- Đặt hàng (giữ chỗ) ---------- */
function pub_datHang(p) {
  return chay_(function () {
    p = p || {};
    var cd = cheDo_(), c = cfgAll_();
    var ten = chuoi_(p.ten, 2, 60, 'Tên người nhận');
    var lh = String(p.lien_he || '').trim();
    if (!sdtHopLe_(lh)) throw loi_('Liên hệ phải là số điện thoại hoặc email hợp lệ.');
    var ghiChu = chuoi_(p.ghi_chu || '', 0, 200, 'Ghi chú');
    if (cd !== 'THAT' && p.xac_nhan_demo !== true) throw loi_('Hãy xác nhận bạn hiểu đây là chế độ demo (không nhập thông tin thật).');
    if (!p.dong_y_chinh_sach) throw loi_('Cần đồng ý chính sách thông tin cá nhân.');
    var items = {};
    (Array.isArray(p.items) ? p.items : []).forEach(function (i) {
      var ma = String(i.ma || '').toUpperCase(), sl = Math.floor(Number(i.sl));
      if (!/^RS\d{3,6}$/.test(ma) || !(sl >= 1)) throw loi_('Giỏ hàng không hợp lệ.');
      items[ma] = (items[ma] || 0) + sl;
    });
    var maList = Object.keys(items);
    if (!maList.length) throw loi_('Giỏ hàng đang trống.');
    if (maList.length > 10) throw loi_('Mỗi đơn tối đa 10 sản phẩm khác nhau.');
    var maXacThuc = Utilities.getUuid().replace(/-/g, '').slice(0, 8).toUpperCase();
    var kq = khoa_(function () {
      giaiPhongHetHan_();
      var sps = {}; doc_('SanPham').forEach(function (s) { sps[s.ma] = s; });
      var kg = kyGuiTheoSp_(), tong = 0, dong = [];
      maList.forEach(function (ma) {
        var s = sps[ma], sl = items[ma];
        if (!s || !hienCongKhai_(s, cd)) throw loi_('Sản phẩm ' + ma + ' không còn được bán.');
        if (s.trang_thai !== 'SAN_SANG' || !kyGuiConHan_(s, kg)) throw loi_('Sản phẩm "' + s.ten + '" hiện không thể đặt (đã giữ chỗ/đã bán).');
        if (sl > 10) throw loi_('Mỗi sản phẩm tối đa 10 món/đơn.');
        if (sl > so_(s.ton_kho)) throw loi_('Sản phẩm "' + s.ten + '" chỉ còn ' + so_(s.ton_kho) + ' món.');
        var tt = so_(s.gia) * sl; tong += tt;
        dong.push({ s: s, sl: sl, tt: tt, kg: s.nguon === 'KY_GUI' && kg[s.ma] ? kg[s.ma].ma : '' });
      });
      // Giữ chỗ trước khi ghi đơn
      dong.forEach(function (d) {
        d.s.ton_kho = so_(d.s.ton_kho) - d.sl; d.s.dang_giu = so_(d.s.dang_giu) + d.sl;
        tinhTrangBan_(d.s); capNhat_('SanPham', d.s);
      });
      var maDon = sinhMa_('DH', 4), han = congGio_(hanGiuChoGio_());
      var don = {
        ma_don: maDon, xac_thuc_hash: bamXacThuc_(maDon, maXacThuc), ten_khach: ten, lien_he: lh, ghi_chu: ghiChu,
        tong_tien: tong, trang_thai: 'CHO_XAC_NHAN', thanh_toan: 'CHUA_THU', han_giu_cho: han, ly_huy: '',
        da_ghi_so: false, lich_su: '', nguoi_xu_ly: '', ngay_tao: bayGio_(), ngay_cap_nhat: bayGio_(), che_do: cd
      };
      ghiLichSu_(don, 'TAO_DON', 'Khách đặt giữ chỗ', null);
      them_('DonHang', don);
      dong.forEach(function (d) {
        them_('ChiTietDon', {
          ma_ct: sinhMa_('CT', 5), ma_don: maDon, ma_sp: d.s.ma, ten_sp: d.s.ten, so_luong: d.sl, don_gia: so_(d.s.gia),
          thanh_tien: d.tt, nguon: d.s.nguon, ma_ky_gui: d.kg, da_hoan_kho: false, che_do: cd
        });
      });
      xoaCache_();
      return { ma_don: maDon, tong: tong, han_giu_cho: han };
    });
    kq.ma_xac_thuc = maXacThuc;
    kq.nhan = thongTinNhan_(c, cd);
    kq.che_do = cd;
    return kq;
  });
}

/* ---------- Tra cứu đơn (cần mã đơn + mã xác thực) ---------- */
function pub_traCuuDon(maDon, ma) {
  return chay_(function () {
    maDon = String(maDon || '').toUpperCase().trim(); ma = String(ma || '').toUpperCase().trim();
    if (!/^DH\d{4,}$/.test(maDon) || ma.length < 6) throw loi_('Mã đơn hoặc mã xác thực không đúng.');
    var cache = CacheService.getScriptCache(), key = 'tc_' + maDon, n = Number(cache.get(key) || 0);
    if (n >= 5) throw loi_('Nhập sai quá nhiều lần. Vui lòng thử lại sau 15 phút.');
    var d = tim_('DonHang', 'ma_don', maDon);
    if (!d || d.xac_thuc_hash !== bamXacThuc_(maDon, ma)) {
      cache.put(key, String(n + 1), 900);
      throw loi_('Mã đơn hoặc mã xác thực không đúng.');
    }
    var cts = doc_('ChiTietDon').filter(function (c) { return c.ma_don === maDon; }).map(function (c) {
      return { ma_sp: c.ma_sp, ten_sp: c.ten_sp, so_luong: so_(c.so_luong), don_gia: so_(c.don_gia), thanh_tien: so_(c.thanh_tien) };
    });
    var ls = []; try { ls = JSON.parse(d.lich_su || '[]'); } catch (e) { }
    ls = ls.map(function (x) { return { t: x.t, h: x.h, g: x.g }; });
    return {
      ma_don: d.ma_don, trang_thai: d.trang_thai, thanh_toan: d.thanh_toan, tong_tien: so_(d.tong_tien),
      han_giu_cho: String(d.han_giu_cho), ngay_tao: String(d.ngay_tao), ly_huy: d.ly_huy, items: cts, lich_su: ls,
      nhan: thongTinNhan_(cfgAll_(), d.che_do), che_do: d.che_do
    };
  });
}

/* ---------- Tải ảnh (tạm vào thư mục riêng) ---------- */
function pub_taiAnh(p) { return chay_(function () { return { token: luuAnh_(p) }; }); }

/* ---------- Biểu mẫu Tặng / Ký gửi / Phản hồi ---------- */
function kiemTraBieuMau_(p, cd) {
  p = p || {};
  var o = {};
  o.ten_lien_he = chuoi_(p.ten_lien_he, 2, 60, 'Họ tên liên hệ');
  o.lien_he = String(p.lien_he || '').trim();
  if (!sdtHopLe_(o.lien_he)) throw loi_('Liên hệ phải là số điện thoại hoặc email hợp lệ.');
  o.mo_ta = chuoi_(p.mo_ta, 10, 1000, 'Mô tả');
  if (TINH_TRANG.indexOf(p.tinh_trang) < 0) throw loi_('Hãy chọn tình trạng.');
  o.tinh_trang = p.tinh_trang;
  o.la_hoc_sinh = p.la_hoc_sinh === true;
  o.phu_huynh_dong_y = p.phu_huynh_dong_y === true;
  if (o.la_hoc_sinh && !o.phu_huynh_dong_y) throw loi_('Người gửi là học sinh cần có xác nhận đồng ý của phụ huynh hoặc người giám hộ.');
  if (p.khong_thuoc_loai_tu_choi !== true) throw loi_('Hãy xác nhận món đồ không thuộc nhóm không nhận.');
  if (!p.dong_y_chinh_sach) throw loi_('Cần đồng ý chính sách thông tin cá nhân.');
  if (cd !== 'THAT' && p.xac_nhan_demo !== true) throw loi_('Hãy xác nhận bạn hiểu đây là chế độ demo (không nhập thông tin thật).');
  if (!p.anh_token) throw loi_('Vui lòng chụp hoặc tải ảnh món đồ (bắt buộc).');
  o.anh_rieng_id = anhRiengHopLe_(p.anh_token);
  return o;
}

function pub_guiTang(p) {
  return chay_(function () {
    var cd = cheDo_(), o = kiemTraBieuMau_(p, cd);
    if (p.tu_nguyen !== true) throw loi_('Hãy xác nhận việc tặng là hoàn toàn tự nguyện.');
    var danhMuc = DANH_MUC.map(function (x) { return x.ma; });
    if (danhMuc.indexOf(p.loai_hang) < 0) throw loi_('Hãy chọn loại hàng.');
    return khoa_(function () {
      var ma = sinhMa_('YT', 3);
      them_('YeuCauTang', {
        ma: ma, ten_lien_he: o.ten_lien_he, lien_he: o.lien_he, loai_hang: p.loai_hang, mo_ta: o.mo_ta, tinh_trang: o.tinh_tinh || o.tinh_trang,
        anh_rieng_id: o.anh_rieng_id, la_hoc_sinh: o.la_hoc_sinh, phu_huynh_dong_y: o.phu_huynh_dong_y, tu_nguyen: true,
        trang_thai: 'MOI', ly_do: '', ma_san_pham: '', nguoi_xu_ly: '', ngay_gui: bayGio_(), ngay_xu_ly: '', che_do: cd
      });
      return { ma: ma, che_do: cd };
    });
  });
}

function pub_guiKyGui(p) {
  return chay_(function () {
    var cd = cheDo_(), o = kiemTraBieuMau_(p, cd);
    var gia = Math.floor(Number(p.gia_mong_muon));
    if (!(gia > 0) || gia > 100000000) throw loi_('Giá mong muốn không hợp lệ.');
    return khoa_(function () {
      var ma = sinhMa_('KG', 3);
      them_('KyGui', {
        ma: ma, ten_lien_he: o.ten_lien_he, lien_he: o.lien_he, mo_ta: o.mo_ta, tinh_trang: o.tinh_trang,
        anh_rieng_id: o.anh_rieng_id, gia_mong_muon: gia, la_hoc_sinh: o.la_hoc_sinh, phu_huynh_dong_y: o.phu_huynh_dong_y,
        trang_thai: 'MOI', gia_thong_nhat: '', thoi_han: '', hoa_hong_pct: '', cach_tra_hang: '', ma_san_pham: '',
        nguoi_xac_nhan: '', ngay_thoa_thuan: '', ngay_ket_thuc: '', ly_do_ket_thuc: '', ghi_chu: '', ngay_gui: bayGio_(), che_do: cd
      });
      return { ma: ma, che_do: cd };
    });
  });
}

function pub_guiPhanHoi(p) {
  return chay_(function () {
    p = p || {}; var cd = cheDo_();
    var nd = chuoi_(p.noi_dung, 5, 1000, 'Nội dung phản hồi');
    var diem = p.diem ? Math.floor(Number(p.diem)) : '';
    if (diem !== '' && !(diem >= 1 && diem <= 5)) throw loi_('Điểm đánh giá từ 1 đến 5.');
    var lh = String(p.lien_he || '').trim();
    if (lh && !sdtHopLe_(lh)) throw loi_('Liên hệ không hợp lệ (có thể để trống).');
    if (cd !== 'THAT' && p.xac_nhan_demo !== true) throw loi_('Hãy xác nhận bạn hiểu đây là chế độ demo.');
    return khoa_(function () {
      var ma = sinhMa_('PH', 4);
      them_('PhanHoi', { ma: ma, noi_dung: nd, diem: diem, lien_he: lh, trang_thai: 'MOI', ngay_gui: bayGio_(), che_do: cd });
      return { ma: ma, che_do: cd };
    });
  });
}


/* ========================================================================= */
/* ===================== PHẦN 3: HÀM QUẢN TRỊ (ADMIN) ====================== */
/* ========================================================================= */

/**
 * Admin.gs – HÀM QUẢN TRỊ (adm_*). MỖI hàm tự gọi batBuoc_(vai_tro_tối_thiểu) ở server.
 * Khách (bản công khai) gọi vào đây đều bị từ chối vì nguoiDung_() trả null.
 */

var NHOM_BAN = ['SAN_SANG', 'GIU_CHO', 'DA_BAN'];
var MUC_PHAN_BO = ['HO_TRO', 'TAI_DAU_TU', 'DU_PHONG'];
var CHECKLIST = ['ve_sinh', 'hu_hong', 'an_toan', 'noi_dung', 'ban_quyen'];

function sachR_(o) { var r = {}; Object.keys(o).forEach(function (k) { if (k !== '_r') r[k] = o[k]; }); return r; }
function locCheDo_(loc) {
  var c = loc && loc.che_do;
  return (c === 'DEMO' || c === 'THAT' || c === 'TAT_CA') ? c : cheDo_();
}
function khop_(r, cd) { return cd === 'TAT_CA' || r.che_do === cd; }
function che_(lh) { var s = String(lh || ''); return s.length <= 3 ? '***' : '***' + s.slice(-3); }
function soNguyen_(x, min, max, ten) {
  var n = Math.floor(Number(x));
  if (isNaN(n) || n < min || n > max) throw loi_(ten + ' phải là số nguyên từ ' + min + ' đến ' + max + '.');
  return n;
}
function batTuChoi_(lyDo) { return chuoi_(lyDo, 5, 300, 'Lý do'); }

/* ===================== PHIÊN & TỔNG QUAN ===================== */
function adm_toi() {
  return chay_(function () {
    var u = nguoiDung_();
    if (!u) return { dang_nhap: false };
    return { dang_nhap: true, email: u.email, ho_ten: u.ho_ten, vai_tro: u.vai_tro, che_do: cheDo_() };
  });
}

function adm_tongQuan() {
  return chay_(function () {
    batBuoc_('HOC_SINH');
    var cd = cheDo_(), dem = function (arr, f) { return arr.filter(function (r) { return r.che_do === cd && f(r); }).length; };
    var sp = doc_('SanPham'), dh = doc_('DonHang');
    return {
      che_do: cd,
      cho_tiep_nhan: dem(sp, function (r) { return r.trang_thai === 'CHO_TIEP_NHAN'; }),
      cho_kiem_tra: dem(sp, function (r) { return r.trang_thai === 'CHO_KIEM_TRA'; }),
      cho_duyet_gia: dem(sp, function (r) { return r.trang_thai === 'CHO_DUYET_GIA'; }),
      dang_ban: dem(sp, function (r) { return NHOM_BAN.indexOf(r.trang_thai) >= 0 && !b_(r.luu_tru); }),
      don_cho_xac_nhan: dem(dh, function (r) { return r.trang_thai === 'CHO_XAC_NHAN'; }),
      don_dang_xu_ly: dem(dh, function (r) { return ['DA_XAC_NHAN', 'CHO_NHAN'].indexOf(r.trang_thai) >= 0; }),
      yc_tang_moi: dem(doc_('YeuCauTang'), function (r) { return r.trang_thai === 'MOI'; }),
      kg_moi: dem(doc_('KyGui'), function (r) { return r.trang_thai === 'MOI'; }),
      thu_chi_cho_duyet: dem(doc_('ThuChi'), function (r) { return r.trang_thai === 'CHO_DUYET'; })
    };
  });
}

/* ===================== ẢNH RIÊNG ===================== */
function adm_taiAnh(p) { return chay_(function () { batBuoc_('HOC_SINH'); return { token: luuAnh_(p) }; }); }
function adm_layAnhRieng(id) {
  return chay_(function () {
    batBuoc_('HOC_SINH');
    anhRiengHopLe_(id);
    var f = DriveApp.getFileById(String(id)), b = f.getBlob();
    return 'data:' + b.getContentType() + ';base64,' + Utilities.base64Encode(b.getBytes());
  });
}

/* ===================== SẢN PHẨM ===================== */
function adm_dsSanPham(loc) {
  return chay_(function () {
    batBuoc_('HOC_SINH');
    var cd = locCheDo_(loc);
    return doc_('SanPham').filter(function (r) { return khop_(r, cd); }).map(sachR_);
  });
}

function adm_luuSanPham(p) {
  return chay_(function () {
    var u = batBuoc_('HOC_SINH'); p = p || {};
    return khoa_(function () {
      var s = null, moi = !p.ma;
      if (!moi) {
        s = tim_('SanPham', 'ma', p.ma);
        if (!s) throw loi_('Không tìm thấy sản phẩm.');
        if (NHOM_BAN.indexOf(s.trang_thai) >= 0 && VAI_TRO[u.vai_tro] < VAI_TRO.GIAO_VIEN) throw loi_('Sản phẩm đã đăng bán: chỉ giáo viên được sửa.');
        if (['TRA_LAI', 'LOAI_BO'].indexOf(s.trang_thai) >= 0) throw loi_('Sản phẩm đã trả lại/loại bỏ, không sửa được.');
      } else {
        s = {
          ma: sinhMa_('RS', 3), gia: '', ton_kho: 0, dang_giu: 0, da_ban: 0, trang_thai: 'CHO_TIEP_NHAN', da_kiem_tra: false,
          kiem_tra: '', luu_tru: false, nguoi_tao: u.email, ngay_tao: bayGio_(), che_do: cheDo_(), nguon: 'TANG', ma_nguon: ''
        };
      }
      s.ten = chuoi_(p.ten, 2, 100, 'Tên sản phẩm');
      if (DANH_MUC.map(function (x) { return x.ma; }).indexOf(p.danh_muc) < 0) throw loi_('Hãy chọn danh mục.');
      s.danh_muc = p.danh_muc;
      s.mo_ta = chuoi_(p.mo_ta, 0, 1000, 'Mô tả');
      if (TINH_TRANG.indexOf(p.tinh_trang) < 0) throw loi_('Hãy chọn tình trạng.');
      s.tinh_trang = p.tinh_trang;
      s.loi_ghi_nhan = chuoi_(p.loi_ghi_nhan || '', 0, 300, 'Lỗi đã ghi nhận');
      s.gia_de_xuat = p.gia_de_xuat === '' || p.gia_de_xuat == null ? '' : soNguyen_(p.gia_de_xuat, 0, 100000000, 'Giá đề xuất');
      var truocBan = NHOM_BAN.indexOf(s.trang_thai) < 0;
      if (truocBan) s.tong_nhap = soNguyen_(p.tong_nhap || 1, 1, 100, 'Số lượng');
      if (moi) {
        s.nguon = p.nguon === 'KY_GUI' ? 'KY_GUI' : 'TANG';
        if (s.nguon === 'KY_GUI') {
          var kg = tim_('KyGui', 'ma', p.ma_nguon);
          if (!kg || kg.ma_san_pham) throw loi_('Sản phẩm ký gửi cần mã ký gửi (KGxxx) chưa gắn sản phẩm nào.');
          s.ma_nguon = kg.ma; kg.ma_san_pham = s.ma; capNhat_('KyGui', kg);
        } else s.ma_nguon = String(p.ma_nguon || '').slice(0, 20);
      }
      if (p.anh_token) {
        s.anh_rieng_id = anhRiengHopLe_(p.anh_token);
      } else if (moi || (!s.anh_rieng_id && !s.anh_id)) {
        throw loi_('Vui lòng tải ảnh cho sản phẩm (bắt buộc).');
      }
      if (moi) them_('SanPham', s); else capNhat_('SanPham', s);
      xoaCache_();
      nhatKy_(u, moi ? 'THEM_SAN_PHAM' : 'SUA_SAN_PHAM', s.ma, s.ten);
      return { ma: s.ma };
    });
  });
}

function congKhaiAnh_(s) {
  if (s.anh_id || !s.anh_rieng_id) return;
  try {
    var f = DriveApp.getFileById(String(s.anh_rieng_id));
    var c = f.makeCopy('sp_' + s.ma + '_' + f.getName(), thuMuc_('FOLDER_CONG_KHAI'));
    try { c.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) { }
    s.anh_id = c.getId();
  } catch (e) { console.warn('Không công khai được ảnh ' + s.ma + ': ' + e); }
}

function luuPhieu_(loai, ref, du, u) {
  them_('Phieu', { ma: sinhMa_('PH' + loai.slice(2), 4), loai: loai, tham_chieu: ref, du_lieu: du, nguoi_lap: u.email, ngay_lap: bayGio_(), che_do: cheDo_() });
}

function adm_hanhDongSanPham(ma, hanhDong, d) {
  return chay_(function () {
    d = d || {};
    var toiThieu = (hanhDong === 'luu_kiem_tra') ? 'HOC_SINH' : 'GIAO_VIEN';
    var u = batBuoc_(toiThieu);
    return khoa_(function () {
      var s = tim_('SanPham', 'ma', ma);
      if (!s) throw loi_('Không tìm thấy sản phẩm.');
      switch (hanhDong) {
        case 'tiep_nhan':
          if (s.trang_thai !== 'CHO_TIEP_NHAN') throw loi_('Sản phẩm không ở trạng thái chờ tiếp nhận.');
          s.trang_thai = 'CHO_KIEM_TRA'; break;
        case 'luu_kiem_tra':
          if (s.trang_thai !== 'CHO_KIEM_TRA') throw loi_('Sản phẩm không ở bước kiểm tra.');
          var cl = {};
          CHECKLIST.forEach(function (k) {
            if (['DAT', 'KHONG_DAT'].indexOf(d[k]) < 0) throw loi_('Cần chọn Đạt/Không đạt cho mục: ' + k);
            cl[k] = d[k];
          });
          cl.ghi_chu = chuoi_(d.ghi_chu || '', 0, 300, 'Ghi chú');
          s.kiem_tra = JSON.stringify(cl); s.nguoi_kiem_tra = u.email; s.ngay_kiem_tra = bayGio_(); break;
        case 'duyet_kiem_tra':
          if (s.trang_thai !== 'CHO_KIEM_TRA') throw loi_('Sản phẩm không ở bước kiểm tra.');
          var kt = null; try { kt = JSON.parse(s.kiem_tra); } catch (e) { }
          if (!kt) throw loi_('Chưa có phiếu kiểm tra (BM04). Hãy lưu checklist trước.');
          var tatCaDat = CHECKLIST.every(function (k) { return kt[k] === 'DAT'; });
          if (d.ket_qua === 'DAT') {
            if (!tatCaDat) throw loi_('Checklist còn mục KHÔNG ĐẠT nên không thể duyệt Đạt.');
            s.trang_thai = 'CHO_DUYET_GIA'; s.da_kiem_tra = true;
          } else if (d.ket_qua === 'KHONG_DAT') {
            s.ly_do = batTuChoi_(d.ly_do); s.trang_thai = 'KHONG_DAT'; s.da_kiem_tra = false;
          } else throw loi_('Kết quả không hợp lệ.');
          luuPhieu_('BM04', s.ma, { checklist: kt, ket_qua: d.ket_qua, ly_do: d.ly_do || '', nguoi_duyet: u.email }, u);
          break;
        case 'kiem_tra_lai':
          if (s.trang_thai !== 'KHONG_DAT') throw loi_('Chỉ áp dụng cho hàng không đạt.');
          s.trang_thai = 'CHO_KIEM_TRA'; s.da_kiem_tra = false; break;
        case 'duyet_gia':
          if (['CHO_DUYET_GIA', 'SAN_SANG', 'GIU_CHO'].indexOf(s.trang_thai) < 0) throw loi_('Sản phẩm không ở bước duyệt giá.');
          if (!b_(s.da_kiem_tra)) throw loi_('Chưa đạt kiểm tra nên không thể duyệt giá.');
          var gia = soNguyen_(d.gia, 1000, 100000000, 'Giá duyệt');
          if (s.nguon === 'KY_GUI') {
            var kgs = doc_('KyGui').filter(function (k) { return k.ma_san_pham === s.ma; })[0];
            if (!kgs || kgs.trang_thai !== 'DA_THOA_THUAN') throw loi_('Hàng ký gửi chưa có thỏa thuận (BM03) nên chưa được đăng bán.');
            if (String(kgs.thoi_han) < homNay_()) throw loi_('Thỏa thuận ký gửi đã hết hạn.');
            gia = so_(kgs.gia_thong_nhat);
          }
          var dau = s.trang_thai === 'CHO_DUYET_GIA';
          s.gia = gia; s.nguoi_duyet_gia = u.email; s.ngay_duyet_gia = bayGio_();
          if (dau) {
            s.ton_kho = so_(s.tong_nhap); s.dang_giu = 0; s.da_ban = 0; s.ngay_dang = bayGio_();
            s.trang_thai = 'SAN_SANG'; congKhaiAnh_(s);
          }
          break;
        case 'tra_lai': case 'loai_bo':
          s.ly_do = batTuChoi_(d.ly_do);
          if (so_(s.dang_giu) > 0) throw loi_('Còn đơn đang giữ chỗ sản phẩm này. Hãy xử lý đơn trước.');
          s.ton_kho = 0; s.trang_thai = hanhDong === 'tra_lai' ? 'TRA_LAI' : 'LOAI_BO'; break;
        case 'luu_tru':
          if (so_(s.dang_giu) > 0 && d.bat !== false) throw loi_('Còn đơn đang giữ chỗ nên chưa lưu trữ được.');
          s.luu_tru = d.bat !== false; break;
        default: throw loi_('Hành động không hợp lệ.');
      }
      capNhat_('SanPham', s); xoaCache_();
      nhatKy_(u, 'SP_' + hanhDong.toUpperCase(), s.ma, d.ly_do || d.ket_qua || d.gia || '');
      return sachR_(s);
    });
  });
}

/* ===================== TẶNG & KÝ GỬI ===================== */
function adm_dsYeuCau(loc) {
  return chay_(function () {
    var u = batBuoc_('HOC_SINH'), cd = locCheDo_(loc), gv = VAI_TRO[u.vai_tro] >= VAI_TRO.GIAO_VIEN;
    var tang = doc_('YeuCauTang').filter(function (r) { return khop_(r, cd); }).map(function (r) {
      r = sachR_(r); if (!gv) { r.lien_he = che_(r.lien_he); } return r;
    });
    var kg = gv ? doc_('KyGui').filter(function (r) { return khop_(r, cd); }).map(sachR_) : [];
    var tc = doc_('ThuChi');
    kg.forEach(function (k) { Object.assign(k, tienKyGui_(k.ma, tc)); });
    return { tang: tang, ky_gui: kg };
  });
}

function hieuLuc_(r) { return r.loai === 'DIEU_CHINH' ? r.loai_goc : r.loai; }
function tienKyGui_(maKg, tc) {
  var t = { thu_ho: 0, phi: 0, da_tra: 0 };
  tc.forEach(function (r) {
    if (r.ma_ky_gui !== maKg || r.trang_thai !== 'DA_XAC_NHAN') return;
    var l = hieuLuc_(r), n = so_(r.so_tien);
    if (l === 'THU_HO') t.thu_ho += n; else if (l === 'PHI_KY_GUI') t.phi += n; else if (l === 'TRA_CHU_HANG') t.da_tra += n;
  });
  t.phai_tra = t.thu_ho - t.phi - t.da_tra;
  return t;
}

function adm_xuLyYeuCauTang(ma, hanhDong, d) {
  return chay_(function () {
    var u = batBuoc_('GIAO_VIEN'); d = d || {};
    return khoa_(function () {
      var y = tim_('YeuCauTang', 'ma', ma);
      if (!y) throw loi_('Không tìm thấy yêu cầu.');
      if (y.trang_thai !== 'MOI') throw loi_('Yêu cầu đã được xử lý.');
      if (hanhDong === 'tu_choi') { y.ly_do = batTuChoi_(d.ly_do); y.trang_thai = 'TU_CHOI'; }
      else if (hanhDong === 'tiep_nhan') {
        if (b_(y.la_hoc_sinh) && !b_(y.phu_huynh_dong_y)) throw loi_('Thiếu xác nhận phụ huynh.');
        var sp = {
          ma: sinhMa_('RS', 3), ten: chuoi_(d.ten, 2, 100, 'Tên sản phẩm'), danh_muc: y.loai_hang, mo_ta: y.mo_ta, tinh_trang: y.tinh_trang,
          loi_ghi_nhan: '', gia_de_xuat: '', gia: '', ton_kho: 0, dang_giu: 0, da_ban: 0, tong_nhap: soNguyen_(d.so_luong || 1, 1, 100, 'Số lượng'),
          trang_thai: 'CHO_KIEM_TRA', nguon: 'TANG', ma_nguon: y.ma, anh_rieng_id: y.anh_rieng_id, anh_id: '', da_kiem_tra: false,
          kiem_tra: '', luu_tru: false, nguoi_tao: u.email, ngay_tao: bayGio_(), che_do: y.che_do
        };
        them_('SanPham', sp);
        y.trang_thai = 'DA_TIEP_NHAN'; y.ma_san_pham = sp.ma;
        luuPhieu_('BM02', y.ma, { yeu_cau: y.ma, san_pham: sp.ma, ten: sp.ten, so_luong: sp.tong_nhap, nguoi_tiep_nhan: u.email }, u);
      } else throw loi_('Hành động không hợp lệ.');
      y.nguoi_xu_ly = u.email; y.ngay_xu_ly = bayGio_(); capNhat_('YeuCauTang', y);
      nhatKy_(u, 'YC_TANG_' + hanhDong.toUpperCase(), y.ma, d.ly_do || '');
      return { ma_san_pham: y.ma_san_pham };
    });
  });
}

function adm_xuLyKyGui(ma, hanhDong, d) {
  return chay_(function () {
    var u = batBuoc_('GIAO_VIEN'); d = d || {};
    return khoa_(function () {
      var k = tim_('KyGui', 'ma', ma);
      if (!k) throw loi_('Không tìm thấy ký gửi.');
      var sp = k.ma_san_pham ? tim_('SanPham', 'ma', k.ma_san_pham) : null;
      if (hanhDong === 'tu_choi') {
        if (k.trang_thai !== 'MOI') throw loi_('Yêu cầu đã xử lý.');
        k.ly_do_ket_thuc = batTuChoi_(d.ly_do); k.trang_thai = 'TU_CHOI';
      } else if (hanhDong === 'tiep_nhan') {
        if (k.trang_thai !== 'MOI') throw loi_('Yêu cầu đã xử lý.');
        if (b_(k.la_hoc_sinh) && !b_(k.phu_huynh_dong_y)) throw loi_('Thiếu xác nhận phụ huynh.');
        var moi = {
          ma: sinhMa_('RS', 3), ten: chuoi_(d.ten, 2, 100, 'Tên sản phẩm'), danh_muc: DANH_MUC.map(function (x) { return x.ma; }).indexOf(d.danh_muc) >= 0 ? d.danh_muc : 'SACH',
          mo_ta: k.mo_ta, tinh_trang: k.tinh_trang, loi_ghi_nhan: '', gia_de_xuat: so_(k.gia_mong_muon), gia: '', ton_kho: 0, dang_giu: 0, da_ban: 0,
          tong_nhap: soNguyen_(d.so_luong || 1, 1, 100, 'Số lượng'), trang_thai: 'CHO_KIEM_TRA', nguon: 'KY_GUI', ma_nguon: k.ma,
          anh_rieng_id: k.anh_rieng_id, anh_id: '', da_kiem_tra: false, kiem_tra: '', luu_tru: false, nguoi_tao: u.email, ngay_tao: bayGio_(), che_do: k.che_do
        };
        them_('SanPham', moi); k.ma_san_pham = moi.ma; k.trang_thai = 'DA_TIEP_NHAN';
      } else if (hanhDong === 'thoa_thuan') {
        if (['DA_TIEP_NHAN', 'DA_THOA_THUAN'].indexOf(k.trang_thai) < 0) throw loi_('Cần tiếp nhận trước khi ghi thỏa thuận.');
        if (sp && NHOM_BAN.indexOf(sp.trang_thai) >= 0 && so_(sp.da_ban) + so_(sp.dang_giu) > 0) throw loi_('Hàng đã phát sinh bán/giữ chỗ, không đổi thỏa thuận.');
        k.gia_thong_nhat = soNguyen_(d.gia_thong_nhat, 1000, 100000000, 'Giá thống nhất');
        if (!ngayHopLe_(d.thoi_han) || d.thoi_han < homNay_()) throw loi_('Thời hạn ký gửi phải là ngày hợp lệ, không ở quá khứ.');
        k.thoi_han = d.thoi_han;
        k.hoa_hong_pct = (d.hoa_hong_pct === '' || d.hoa_hong_pct == null) ? '' : soNguyen_(d.hoa_hong_pct, 0, 100, 'Hoa hồng (%)');
        k.cach_tra_hang = chuoi_(d.cach_tra_hang, 5, 300, 'Cách trả hàng chưa bán');
        k.nguoi_xac_nhan = u.email; k.ngay_thoa_thuan = bayGio_(); k.trang_thai = 'DA_THOA_THUAN';
        k.ghi_chu = chuoi_(d.ghi_chu || '', 0, 300, 'Ghi chú');
        if (sp && NHOM_BAN.indexOf(sp.trang_thai) >= 0) { sp.gia = k.gia_thong_nhat; capNhat_('SanPham', sp); xoaCache_(); }
        luuPhieu_('BM03', k.ma, { ky_gui: k.ma, gia: k.gia_thong_nhat, thoi_han: k.thoi_han, hoa_hong_pct: k.hoa_hong_pct, cach_tra_hang: k.cach_tra_hang, nguoi_xac_nhan: u.email }, u);
      } else if (hanhDong === 'ket_thuc') {
        if (['DA_TIEP_NHAN', 'DA_THOA_THUAN', 'HET_HAN'].indexOf(k.trang_thai) < 0) throw loi_('Ký gửi không ở trạng thái có thể kết thúc.');
        if (sp) {
          if (so_(sp.dang_giu) > 0) throw loi_('Còn đơn đang giữ chỗ hàng ký gửi này.');
          sp.ly_do = 'Kết thúc ký gửi: ' + chuoi_(d.ly_do, 3, 200, 'Lý do'); sp.ton_kho = 0;
          if (NHOM_BAN.indexOf(sp.trang_thai) >= 0 || ['CHO_KIEM_TRA', 'CHO_DUYET_GIA', 'CHO_TIEP_NHAN'].indexOf(sp.trang_thai) >= 0) sp.trang_thai = so_(sp.da_ban) > 0 ? 'DA_BAN' : 'TRA_LAI';
          capNhat_('SanPham', sp); xoaCache_();
        }
        k.ngay_ket_thuc = bayGio_(); k.ly_do_ket_thuc = String(d.ly_do || ''); k.trang_thai = 'KET_THUC';
      } else throw loi_('Hành động không hợp lệ.');
      capNhat_('KyGui', k);
      nhatKy_(u, 'KY_GUI_' + hanhDong.toUpperCase(), k.ma, d.ly_do || '');
      return sachR_(k);
    });
  });
}

function adm_traChuHang(maKg, soTien, chungTu) {
  return chay_(function () {
    var u = batBuoc_('GIAO_VIEN');
    return khoa_(function () {
      var k = tim_('KyGui', 'ma', maKg);
      if (!k) throw loi_('Không tìm thấy ký gửi.');
      var n = soNguyen_(soTien, 1, 1000000000, 'Số tiền');
      var t = tienKyGui_(k.ma, doc_('ThuChi'));
      if (n > t.phai_tra) throw loi_('Số tiền vượt khoản phải trả chủ hàng (' + t.phai_tra + ' đ).');
      var ma = sinhMa_('TC', 4);
      them_('ThuChi', {
        ma: ma, ngay: homNay_(), noi_dung: 'Trả tiền ký gửi ' + k.ma, loai: 'TRA_CHU_HANG', so_tien: n,
        chung_tu: chuoi_(chungTu, 3, 300, 'Chứng từ'), chung_tu_hop_le: true, trang_thai: 'DA_XAC_NHAN', nguoi_nhap: u.email,
        nguoi_duyet: u.email, ngay_duyet: bayGio_(), ma_don: '', ma_ky_gui: k.ma, dieu_chinh_cho: '', loai_goc: '', muc_phan_bo: '', ly_do: '', che_do: k.che_do
      });
      nhatKy_(u, 'TRA_CHU_HANG', ma, k.ma + ' ' + n);
      return { ma: ma };
    });
  });
}

/* ===================== ĐƠN HÀNG ===================== */
function adm_dsDonHang(loc) {
  return chay_(function () {
    var u = batBuoc_('HOC_SINH'), cd = locCheDo_(loc), gv = VAI_TRO[u.vai_tro] >= VAI_TRO.GIAO_VIEN;
    var cts = doc_('ChiTietDon');
    return doc_('DonHang').filter(function (r) { return khop_(r, cd); }).map(function (r) {
      var o = sachR_(r); delete o.xac_thuc_hash;
      if (!gv) o.lien_he = che_(o.lien_he);
      o.so_mon = cts.filter(function (c) { return c.ma_don === r.ma_don; }).reduce(function (a, c) { return a + so_(c.so_luong); }, 0);
      return o;
    }).reverse();
  });
}

function adm_chiTietDon(maDon) {
  return chay_(function () {
    var u = batBuoc_('HOC_SINH'), gv = VAI_TRO[u.vai_tro] >= VAI_TRO.GIAO_VIEN;
    var d = tim_('DonHang', 'ma_don', maDon);
    if (!d) throw loi_('Không tìm thấy đơn.');
    var o = sachR_(d); delete o.xac_thuc_hash;
    if (!gv) o.lien_he = che_(o.lien_he);
    o.items = doc_('ChiTietDon').filter(function (c) { return c.ma_don === d.ma_don; }).map(sachR_);
    try { o.lich_su = JSON.parse(d.lich_su || '[]'); } catch (e) { o.lich_su = []; }
    return o;
  });
}

function ghiSoDon_(d, cts, u) {
  var kgs = {}; doc_('KyGui').forEach(function (k) { kgs[k.ma] = k; });
  var moi = function (loai, noiDung, soTien, maKg) {
    them_('ThuChi', {
      ma: sinhMa_('TC', 4), ngay: homNay_(), noi_dung: noiDung, loai: loai, so_tien: soTien, chung_tu: 'Đơn ' + d.ma_don,
      chung_tu_hop_le: true, trang_thai: 'DA_XAC_NHAN', nguoi_nhap: u.email, nguoi_duyet: u.email, ngay_duyet: bayGio_(),
      ma_don: d.ma_don, ma_ky_gui: maKg || '', dieu_chinh_cho: '', loai_goc: '', muc_phan_bo: '', ly_do: '', che_do: d.che_do
    });
  };
  cts.forEach(function (c) {
    var tt = so_(c.thanh_tien);
    if (c.nguon === 'KY_GUI' && c.ma_ky_gui) {
      moi('THU_HO', 'Tiền thu hộ hàng ký gửi ' + c.ma_sp + ' (đơn ' + d.ma_don + ')', tt, c.ma_ky_gui);
      var k = kgs[c.ma_ky_gui], pct = k && k.hoa_hong_pct !== '' ? so_(k.hoa_hong_pct) : 0, phi = Math.round(tt * pct / 100);
      if (phi > 0) moi('PHI_KY_GUI', 'Phí ký gửi ' + c.ma_sp + ' (' + pct + '%)', phi, c.ma_ky_gui);
    } else {
      moi('DOANH_THU_TANG', 'Doanh thu hàng tặng ' + c.ma_sp + ' (đơn ' + d.ma_don + ')', tt, '');
    }
  });
}

function adm_xuLyDon(maDon, hanhDong, d) {
  return chay_(function () {
    var u = batBuoc_('GIAO_VIEN'); d = d || {};
    return khoa_(function () {
      var o = tim_('DonHang', 'ma_don', maDon);
      if (!o) throw loi_('Không tìm thấy đơn.');
      var cuoi = ['HOAN_TAT', 'HUY'].indexOf(o.trang_thai) >= 0;
      if (cuoi) throw loi_('Đơn đã kết thúc, không thay đổi được.');
      switch (hanhDong) {
        case 'xac_nhan':
          if (o.trang_thai !== 'CHO_XAC_NHAN') throw loi_('Đơn không ở trạng thái chờ xác nhận.');
          o.trang_thai = 'DA_XAC_NHAN'; break;
        case 'cho_nhan':
          if (o.trang_thai !== 'DA_XAC_NHAN') throw loi_('Cần xác nhận đơn trước.');
          o.trang_thai = 'CHO_NHAN'; break;
        case 'thu_tien':
          if (['DA_XAC_NHAN', 'CHO_NHAN'].indexOf(o.trang_thai) < 0) throw loi_('Chỉ xác nhận thanh toán khi đơn đã được xác nhận.');
          if (o.thanh_toan === 'DA_THU') throw loi_('Đơn đã thu tiền.');
          o.thanh_toan = 'DA_THU'; break;
        case 'hoan_tat':
          if (['DA_XAC_NHAN', 'CHO_NHAN'].indexOf(o.trang_thai) < 0) throw loi_('Đơn chưa được xác nhận.');
          if (o.thanh_toan !== 'DA_THU') throw loi_('Cần xác nhận đã thu tiền trước khi hoàn tất.');
          var cts = doc_('ChiTietDon').filter(function (c) { return c.ma_don === o.ma_don; });
          var sps = {}; doc_('SanPham').forEach(function (s) { sps[s.ma] = s; });
          cts.forEach(function (c) {
            var s = sps[c.ma_sp], q = so_(c.so_luong);
            if (!s || so_(s.dang_giu) < q) throw loi_('Tồn kho giữ chỗ của ' + c.ma_sp + ' không khớp. Hãy chạy đối chiếu.');
          });
          cts.forEach(function (c) {
            var s = sps[c.ma_sp], q = so_(c.so_luong);
            s.dang_giu = so_(s.dang_giu) - q; s.da_ban = so_(s.da_ban) + q; tinhTrangBan_(s); capNhat_('SanPham', s);
          });
          if (!b_(o.da_ghi_so)) { ghiSoDon_(o, cts, u); o.da_ghi_so = true; }
          o.trang_thai = 'HOAN_TAT'; break;
        case 'gia_han':
          o.han_giu_cho = congGio_(soNguyen_(d.gio, 1, 168, 'Số giờ gia hạn')); break;
        case 'huy':
          if (o.thanh_toan === 'DA_THU') throw loi_('Đơn đã thu tiền, không hủy được. Dùng điều chỉnh sổ thu chi.');
          huyDon_(o, batTuChoi_(d.ly_do), u);
          nhatKy_(u, 'DON_HUY', o.ma_don, d.ly_do);
          return { ok: 1 };
        default: throw loi_('Hành động không hợp lệ.');
      }
      o.ngay_cap_nhat = bayGio_(); o.nguoi_xu_ly = u.email;
      ghiLichSu_(o, hanhDong.toUpperCase(), d.ly_do || '', u);
      capNhat_('DonHang', o); xoaCache_();
      nhatKy_(u, 'DON_' + hanhDong.toUpperCase(), o.ma_don, '');
      return { ok: 1 };
    });
  });
}

/* ===================== THU CHI ===================== */
function adm_dsThuChi(loc) {
  return chay_(function () {
    batBuoc_('HOC_SINH');
    var cd = locCheDo_(loc);
    return doc_('ThuChi').filter(function (r) { return khop_(r, cd); }).map(sachR_).reverse();
  });
}

function adm_nhapThuChi(p) {
  return chay_(function () {
    var u = batBuoc_('HOC_SINH'); p = p || {};
    if (p.loai !== 'CHI_PHI') throw loi_('Thu từ đơn hàng do hệ thống tự ghi. Thủ công chỉ nhập khoản CHI PHÍ.');
    var ngay = p.ngay || homNay_();
    if (!ngayHopLe_(ngay)) throw loi_('Ngày không hợp lệ.');
    return khoa_(function () {
      var ma = sinhMa_('TC', 4);
      them_('ThuChi', {
        ma: ma, ngay: ngay, noi_dung: chuoi_(p.noi_dung, 3, 200, 'Nội dung'), loai: 'CHI_PHI', so_tien: soNguyen_(p.so_tien, 1, 1000000000, 'Số tiền'),
        chung_tu: chuoi_(p.chung_tu || '', 0, 300, 'Chứng từ'), chung_tu_hop_le: false, trang_thai: 'CHO_DUYET', nguoi_nhap: u.email,
        nguoi_duyet: '', ngay_duyet: '', ma_don: '', ma_ky_gui: '', dieu_chinh_cho: '', loai_goc: '', muc_phan_bo: '', ly_do: '', che_do: cheDo_()
      });
      nhatKy_(u, 'NHAP_CHI_PHI', ma, p.so_tien);
      return { ma: ma };
    });
  });
}

function adm_duyetThuChi(ma, quyetDinh, d) {
  return chay_(function () {
    var u = batBuoc_('GIAO_VIEN'); d = d || {};
    return khoa_(function () {
      var r = tim_('ThuChi', 'ma', ma);
      if (!r) throw loi_('Không tìm thấy khoản.');
      if (r.trang_thai !== 'CHO_DUYET') throw loi_('Khoản này đã được duyệt/từ chối, không thể sửa.');
      if (quyetDinh === 'XAC_NHAN') {
        var hopLe = d.chung_tu_hop_le === true;
        if (hopLe && !String(r.chung_tu).trim()) throw loi_('Khoản chưa ghi chứng từ nên không thể xác nhận là hợp lệ.');
        r.chung_tu_hop_le = hopLe; r.trang_thai = 'DA_XAC_NHAN';
      } else if (quyetDinh === 'TU_CHOI') { r.ly_do = batTuChoi_(d.ly_do); r.trang_thai = 'TU_CHOI'; }
      else throw loi_('Quyết định không hợp lệ.');
      r.nguoi_duyet = u.email; r.ngay_duyet = bayGio_(); capNhat_('ThuChi', r);
      nhatKy_(u, 'DUYET_THU_CHI_' + quyetDinh, r.ma, r.so_tien);
      return { ok: 1 };
    });
  });
}

function adm_dieuChinhThuChi(p) {
  return chay_(function () {
    var u = batBuoc_('GIAO_VIEN'); p = p || {};
    return khoa_(function () {
      var g = tim_('ThuChi', 'ma', p.ma_goc);
      if (!g || g.trang_thai !== 'DA_XAC_NHAN' || g.loai === 'DIEU_CHINH') throw loi_('Chỉ điều chỉnh được bản ghi gốc đã xác nhận.');
      var n = Math.round(Number(p.so_tien));
      if (!n || isNaN(n) || Math.abs(n) > 1000000000) throw loi_('Số tiền điều chỉnh khác 0 (âm để giảm, dương để tăng).');
      var ma = sinhMa_('TC', 4);
      them_('ThuChi', {
        ma: ma, ngay: homNay_(), noi_dung: 'Điều chỉnh ' + g.ma + ': ' + chuoi_(p.noi_dung || 'Điều chỉnh', 3, 200, 'Nội dung'), loai: 'DIEU_CHINH', so_tien: n,
        chung_tu: chuoi_(p.chung_tu || '', 0, 300, 'Chứng từ'), chung_tu_hop_le: b_(g.chung_tu_hop_le), trang_thai: 'DA_XAC_NHAN', nguoi_nhap: u.email,
        nguoi_duyet: u.email, ngay_duyet: bayGio_(), ma_don: g.ma_don, ma_ky_gui: g.ma_ky_gui, dieu_chinh_cho: g.ma, loai_goc: g.loai,
        muc_phan_bo: g.muc_phan_bo, ly_do: batTuChoi_(p.ly_do), che_do: g.che_do
      });
      nhatKy_(u, 'DIEU_CHINH_THU_CHI', ma, g.ma + ' ' + n);
      return { ma: ma };
    });
  });
}

/** Tính tài chính từ sổ (chỉ bản ghi DA_XAC_NHAN của chế độ cd). */
function tinhTaiChinh_(cd) {
  var t = { DOANH_THU_TANG: 0, PHI_KY_GUI: 0, THU_HO: 0, TRA_CHU_HANG: 0, CHI_PHI_HOP_LE: 0, CHI_PHI_KHONG_HOP_LE: 0, CHI_PHAN_BO: 0, phan_bo: { HO_TRO: 0, TAI_DAU_TU: 0, DU_PHONG: 0 } };
  doc_('ThuChi').forEach(function (r) {
    if (r.che_do !== cd || r.trang_thai !== 'DA_XAC_NHAN') return;
    var l = hieuLuc_(r), n = so_(r.so_tien);
    if (l === 'CHI_PHI') { if (b_(r.chung_tu_hop_le)) t.CHI_PHI_HOP_LE += n; else t.CHI_PHI_KHONG_HOP_LE += n; }
    else if (l === 'CHI_PHAN_BO') { t.CHI_PHAN_BO += n; if (t.phan_bo[r.muc_phan_bo] !== undefined) t.phan_bo[r.muc_phan_bo] += n; }
    else if (t[l] !== undefined) t[l] += n;
  });
  t.doanh_thu_du_an = t.DOANH_THU_TANG + t.PHI_KY_GUI;
  t.loi_nhuan = t.doanh_thu_du_an - t.CHI_PHI_HOP_LE;
  t.nghia_vu_ky_gui = t.THU_HO - t.PHI_KY_GUI - t.TRA_CHU_HANG;
  t.tien_mat_du_kien = t.DOANH_THU_TANG + t.THU_HO - t.CHI_PHI_HOP_LE - t.CHI_PHI_KHONG_HOP_LE - t.TRA_CHU_HANG - t.CHI_PHAN_BO;
  return t;
}
function phanBoDaDuyet_(cd) {
  var tong = { HO_TRO: 0, TAI_DAU_TU: 0, DU_PHONG: 0, tong: 0 }, ds = [];
  doc_('Phieu').forEach(function (r) {
    if (r.loai !== 'PHAN_BO' || r.che_do !== cd) return;
    var d = {}; try { d = JSON.parse(r.du_lieu); } catch (e) { return; }
    MUC_PHAN_BO.forEach(function (m) { tong[m] += so_(d[m]); tong.tong += so_(d[m]); });
    ds.push({ ma: r.ma, ngay_lap: String(r.ngay_lap), nguoi_lap: r.nguoi_lap, du_lieu: d });
  });
  return { tong: tong, ds: ds };
}

function adm_pheDuyetPhanBo(p) {
  return chay_(function () {
    var u = batBuoc_('GIAO_VIEN'); p = p || {};
    if (cheDo_() !== 'THAT') throw loi_('Chỉ ghi nhận phê duyệt phân bổ khi đã vận hành thật và có lợi nhuận thực tế.');
    return khoa_(function () {
      var t = tinhTaiChinh_('THAT'), da = phanBoDaDuyet_('THAT');
      var con = t.loi_nhuan - da.tong.tong;
      if (!(con > 0)) throw loi_('Không có lợi nhuận thực tế còn lại để phân bổ.');
      var d = { so_van_ban: chuoi_(p.so_van_ban, 3, 100, 'Số văn bản phê duyệt'), nguoi_phe_duyet: chuoi_(p.nguoi_phe_duyet, 3, 100, 'Người phê duyệt') };
      if (!ngayHopLe_(p.ngay)) throw loi_('Ngày phê duyệt không hợp lệ.');
      d.ngay = p.ngay;
      var s = 0;
      MUC_PHAN_BO.forEach(function (m) { d[m] = soNguyen_(p[m] || 0, 0, 1000000000, 'Số tiền ' + m); s += d[m]; });
      if (s <= 0 || s > con) throw loi_('Tổng phân bổ phải > 0 và không vượt lợi nhuận còn lại (' + con + ' đ).');
      d.loi_nhuan_tai_thoi_diem = t.loi_nhuan;
      luuPhieu_('PHAN_BO', 'THAT', d, u);
      nhatKy_(u, 'PHE_DUYET_PHAN_BO', '', d);
      return { ok: 1 };
    });
  });
}

/** Ghi khoản chi đã thực hiện từ quỹ phân bổ (chỉ trong hạn mức đã phê duyệt). */
function adm_ghiChiPhanBo(p) {
  return chay_(function () {
    var u = batBuoc_('GIAO_VIEN'); p = p || {};
    if (cheDo_() !== 'THAT') throw loi_('Chỉ áp dụng ở chế độ vận hành thật.');
    if (MUC_PHAN_BO.indexOf(p.muc) < 0) throw loi_('Mục phân bổ không hợp lệ.');
    return khoa_(function () {
      var n = soNguyen_(p.so_tien, 1, 1000000000, 'Số tiền');
      var t = tinhTaiChinh_('THAT'), da = phanBoDaDuyet_('THAT');
      if (t.phan_bo[p.muc] + n > da.tong[p.muc]) throw loi_('Vượt hạn mức đã được phê duyệt cho mục này.');
      var ma = sinhMa_('TC', 4);
      them_('ThuChi', {
        ma: ma, ngay: homNay_(), noi_dung: chuoi_(p.noi_dung, 3, 200, 'Nội dung (không ghi danh tính người nhận)'), loai: 'CHI_PHAN_BO', so_tien: n,
        chung_tu: chuoi_(p.chung_tu, 3, 300, 'Chứng từ'), chung_tu_hop_le: true, trang_thai: 'DA_XAC_NHAN', nguoi_nhap: u.email, nguoi_duyet: u.email,
        ngay_duyet: bayGio_(), ma_don: '', ma_ky_gui: '', dieu_chinh_cho: '', loai_goc: '', muc_phan_bo: p.muc, ly_do: '', che_do: 'THAT'
      });
      nhatKy_(u, 'CHI_PHAN_BO', ma, p.muc + ' ' + n);
      return { ma: ma };
    });
  });
}

/* ===================== ĐỐI CHIẾU & BÁO CÁO ===================== */
function adm_doiChieu(p) {
  return chay_(function () {
    batBuoc_('GIAO_VIEN'); p = p || {};
    var cd = (p.che_do === 'DEMO' || p.che_do === 'THAT') ? p.che_do : cheDo_();
    var tc = doc_('ThuChi').filter(function (r) { return r.che_do === cd; });
    var dh = doc_('DonHang').filter(function (r) { return r.che_do === cd; });
    var cts = doc_('ChiTietDon').filter(function (r) { return r.che_do === cd; });
    var sp = doc_('SanPham').filter(function (r) { return r.che_do === cd; });
    var loiDon = [], loiKho = [], loiTien = [];
    var now = bayGio_();
    dh.forEach(function (d) {
      var ct = cts.filter(function (c) { return c.ma_don === d.ma_don; });
      var tong = ct.reduce(function (a, c) { return a + so_(c.thanh_tien); }, 0);
      if (tong !== so_(d.tong_tien)) loiDon.push(d.ma_don + ': tổng tiền đơn (' + d.tong_tien + ') ≠ tổng chi tiết (' + tong + ').');
      if (d.trang_thai === 'HOAN_TAT') {
        if (d.thanh_toan !== 'DA_THU') loiDon.push(d.ma_don + ': hoàn tất nhưng chưa ghi thu tiền.');
        if (!b_(d.da_ghi_so)) loiDon.push(d.ma_don + ': hoàn tất nhưng chưa ghi sổ thu chi.');
        var thu = 0;
        tc.forEach(function (r) {
          if (r.ma_don === d.ma_don && r.trang_thai === 'DA_XAC_NHAN') { var l = hieuLuc_(r); if (l === 'DOANH_THU_TANG' || l === 'THU_HO') thu += so_(r.so_tien); }
        });
        if (thu !== so_(d.tong_tien)) loiTien.push(d.ma_don + ': sổ thu (' + thu + ') ≠ giá trị đơn (' + d.tong_tien + ').');
      }
      if (d.trang_thai === 'HUY') ct.forEach(function (c) { if (!b_(c.da_hoan_kho)) loiKho.push(d.ma_don + ': đơn hủy nhưng ' + c.ma_sp + ' chưa hoàn kho.'); });
      if (['CHO_XAC_NHAN', 'DA_XAC_NHAN', 'CHO_NHAN'].indexOf(d.trang_thai) >= 0 && String(d.han_giu_cho) < now) loiDon.push(d.ma_don + ': quá hạn giữ chỗ nhưng chưa bị hủy (kiểm tra trigger).');
    });
    sp.forEach(function (s) {
      if (NHOM_BAN.indexOf(s.trang_thai) < 0 && so_(s.dang_giu) + so_(s.da_ban) + so_(s.ton_kho) === 0) return;
      var giu = 0, ban = 0;
      cts.forEach(function (c) {
        if (c.ma_sp !== s.ma || b_(c.da_hoan_kho)) return;
        var d = dh.filter(function (x) { return x.ma_don === c.ma_don; })[0];
        if (!d) return;
        if (d.trang_thai === 'HOAN_TAT') ban += so_(c.so_luong); else if (d.trang_thai !== 'HUY') giu += so_(c.so_luong);
      });
      if (NHOM_BAN.indexOf(s.trang_thai) >= 0 || so_(s.tong_nhap) > 0) {
        if (so_(s.ton_kho) + so_(s.dang_giu) + so_(s.da_ban) !== so_(s.tong_nhap) && NHOM_BAN.indexOf(s.trang_thai) >= 0)
          loiKho.push(s.ma + ': tồn+giữ+bán (' + (so_(s.ton_kho) + so_(s.dang_giu) + so_(s.da_ban)) + ') ≠ tổng nhập (' + s.tong_nhap + ').');
        if (giu !== so_(s.dang_giu)) loiKho.push(s.ma + ': đang giữ ' + s.dang_giu + ' ≠ theo đơn ' + giu + '.');
        if (ban !== so_(s.da_ban)) loiKho.push(s.ma + ': đã bán ' + s.da_ban + ' ≠ theo đơn hoàn tất ' + ban + '.');
      }
    });
    var t = tinhTaiChinh_(cd), kq = { che_do: cd, tai_chinh: t, loi_don: loiDon, loi_kho: loiKho, loi_tien: loiTien };
    if (p.tien_mat_thuc_te !== undefined && p.tien_mat_thuc_te !== '') {
      kq.tien_mat_thuc_te = Number(p.tien_mat_thuc_te); kq.chenh_lech = kq.tien_mat_thuc_te - t.tien_mat_du_kien;
    }
    kq.khop = !loiDon.length && !loiKho.length && !loiTien.length && (kq.chenh_lech === undefined || kq.chenh_lech === 0);
    return kq;
  });
}

/** Báo cáo: CHỈ đọc bản ghi che_do = THAT. */
function adm_baoCao() {
  return chay_(function () {
    batBuoc_('HOC_SINH');
    var cd = 'THAT', c = cfgAll_();
    var sp = doc_('SanPham').filter(function (r) { return r.che_do === cd; });
    var dh = doc_('DonHang').filter(function (r) { return r.che_do === cd; });
    var yc = doc_('YeuCauTang').filter(function (r) { return r.che_do === cd; });
    var kg = doc_('KyGui').filter(function (r) { return r.che_do === cd; });
    var ph = doc_('PhanHoi').filter(function (r) { return r.che_do === cd; });
    var bm1 = doc_('Phieu').filter(function (r) { return r.che_do === cd && r.loai === 'BM01'; }).length;
    var tong = function (arr, f) { return arr.reduce(function (a, r) { return a + f(r); }, 0); };
    var t = tinhTaiChinh_(cd), da = phanBoDaDuyet_(cd);
    var theoTT = {}; dh.forEach(function (d) { theoTT[d.trang_thai] = (theoTT[d.trang_thai] || 0) + 1; });
    var diemArr = ph.filter(function (r) { return r.diem !== ''; }).map(function (r) { return so_(r.diem); });
    var kq = {
      co_du_lieu: !!(sp.length || dh.length || yc.length || kg.length || ph.length),
      hang: {
        tiep_nhan: tong(sp.filter(function (r) { return ['CHO_TIEP_NHAN'].indexOf(r.trang_thai) < 0; }), function (r) { return so_(r.tong_nhap); }),
        con_ton: tong(sp.filter(function (r) { return ['SAN_SANG', 'GIU_CHO'].indexOf(r.trang_thai) >= 0; }), function (r) { return so_(r.ton_kho) + so_(r.dang_giu); }),
        da_ban: tong(sp, function (r) { return so_(r.da_ban); }),
        tu_choi_tra_lai: sp.filter(function (r) { return ['KHONG_DAT', 'TRA_LAI', 'LOAI_BO'].indexOf(r.trang_thai) >= 0; }).length + yc.filter(function (r) { return r.trang_thai === 'TU_CHOI'; }).length + kg.filter(function (r) { return r.trang_thai === 'TU_CHOI'; }).length
      },
      don: { tong: dh.length, theo_trang_thai: theoTT, tien_thuc_thu: t.DOANH_THU_TANG + t.THU_HO },
      tai_chinh: {
        chi_phi_hop_le: t.CHI_PHI_HOP_LE, chi_phi_khong_hop_le: t.CHI_PHI_KHONG_HOP_LE, doanh_thu_du_an: t.doanh_thu_du_an,
        doanh_thu_hang_tang: t.DOANH_THU_TANG, phi_ky_gui: t.PHI_KY_GUI, nghia_vu_ky_gui: t.nghia_vu_ky_gui, tien_thu_ho: t.THU_HO, da_tra_chu_hang: t.TRA_CHU_HANG,
        loi_nhuan: t.loi_nhuan
      },
      phan_bo: { da_phe_duyet: da, da_chi: t.phan_bo, loi_nhuan_con_lai: t.loi_nhuan - da.tong.tong },
      hs: { so_hs: c.so_hs_tham_gia || '', nhiem_vu: c.nhiem_vu_hs || '' },
      phan_hoi: { so_luong: ph.length, diem_tb: diemArr.length ? Math.round(diemArr.reduce(function (a, b) { return a + b; }, 0) / diemArr.length * 10) / 10 : null, so_co_diem: diemArr.length },
      khao_sat_bm01: bm1
    };
    var ln = kq.phan_bo.loi_nhuan_con_lai;
    if (t.loi_nhuan > 0) {
      var tl = { HO_TRO: so_(c.tl_ho_tro), TAI_DAU_TU: so_(c.tl_tai_dau_tu), DU_PHONG: so_(c.tl_du_phong) };
      kq.phan_bo.de_xuat = { ty_le: tl, so_tien: { HO_TRO: Math.round(t.loi_nhuan * tl.HO_TRO / 100), TAI_DAU_TU: Math.round(t.loi_nhuan * tl.TAI_DAU_TU / 100), DU_PHONG: Math.round(t.loi_nhuan * tl.DU_PHONG / 100) } };
    }
    return kq;
  });
}

function adm_luuNhapTay(p) {
  return chay_(function () {
    var u = batBuoc_('GIAO_VIEN'); p = p || {};
    return khoa_(function () {
      cfgSet_('so_hs_tham_gia', p.so_hs === '' ? '' : String(soNguyen_(p.so_hs, 0, 500, 'Số học sinh')));
      cfgSet_('nhiem_vu_hs', chuoi_(p.nhiem_vu || '', 0, 500, 'Nhiệm vụ'));
      nhatKy_(u, 'NHAP_TAY_HS', '', '');
      return { ok: 1 };
    });
  });
}

/* ===================== BIỂU MẪU & PHẢN HỒI ===================== */
function adm_luuPhieu(p) {
  return chay_(function () {
    p = p || {};
    var loai = String(p.loai || '');
    if (['BM01', 'BM02', 'BM03', 'BM04', 'BM05'].indexOf(loai) < 0) throw loi_('Loại biểu mẫu không hợp lệ.');
    var u = batBuoc_(loai === 'BM01' ? 'HOC_SINH' : 'GIAO_VIEN');
    var du = JSON.stringify(p.du_lieu || {});
    if (du.length > 40000) throw loi_('Dữ liệu biểu mẫu quá lớn.');
    return khoa_(function () {
      luuPhieu_(loai, String(p.tham_chieu || '').slice(0, 30), JSON.parse(du), u);
      nhatKy_(u, 'LUU_' + loai, p.tham_chieu || '', '');
      return { ok: 1 };
    });
  });
}
function adm_dsPhieu(loai, loc) {
  return chay_(function () {
    batBuoc_('HOC_SINH'); var cd = locCheDo_(loc);
    return doc_('Phieu').filter(function (r) { return khop_(r, cd) && (!loai || r.loai === loai); }).map(sachR_).reverse().slice(0, 200);
  });
}
function adm_dsPhanHoi(loc) {
  return chay_(function () {
    batBuoc_('GIAO_VIEN'); var cd = locCheDo_(loc);
    return doc_('PhanHoi').filter(function (r) { return khop_(r, cd); }).map(sachR_).reverse();
  });
}
function adm_docPhanHoi(ma) {
  return chay_(function () {
    var u = batBuoc_('GIAO_VIEN');
    return khoa_(function () {
      var r = tim_('PhanHoi', 'ma', ma); if (!r) throw loi_('Không tìm thấy.');
      r.trang_thai = 'DA_DOC'; capNhat_('PhanHoi', r); nhatKy_(u, 'DOC_PHAN_HOI', ma, ''); return { ok: 1 };
    });
  });
}
function adm_nhatKy() {
  return chay_(function () {
    batBuoc_('GIAO_VIEN');
    return doc_('NhatKy').map(sachR_).reverse().slice(0, 300);
  });
}

/* ===================== CẤU HÌNH, VẬN HÀNH, NGƯỜI DÙNG ===================== */
var KHOA_VAN_HANH = ['so_van_ban', 'ngay_van_ban', 'nguoi_xac_nhan', 'diem_nhan', 'thoi_gian_nhan', 'lien_he', 'han_giu_cho_gio'];
var NHAN_VAN_HANH = {
  so_van_ban: 'Số văn bản chấp thuận', ngay_van_ban: 'Ngày văn bản', nguoi_xac_nhan: 'Người xác nhận', diem_nhan: 'Điểm nhận hàng',
  thoi_gian_nhan: 'Thời gian nhận', lien_he: 'Liên hệ', han_giu_cho_gio: 'Thời hạn giữ chỗ (giờ)'
};
function kiemTraVanHanh_(v) {
  var thieu = [];
  KHOA_VAN_HANH.forEach(function (k) {
    var x = String(v[k] == null ? '' : v[k]).trim();
    if (!x || /minh\s*họa/i.test(x)) thieu.push(NHAN_VAN_HANH[k]);
  });
  if (!thieu.length) {
    if (!ngayHopLe_(v.ngay_van_ban) || v.ngay_van_ban > homNay_()) thieu.push('Ngày văn bản (yyyy-MM-dd, không ở tương lai)');
    var h = Number(v.han_giu_cho_gio);
    if (!(h >= 1 && h <= 720) || Math.floor(h) !== h) thieu.push('Thời hạn giữ chỗ (số giờ nguyên 1–720)');
  }
  return thieu;
}

function adm_layCauHinh() {
  return chay_(function () { batBuoc_('QUAN_TRI'); return cfgAll_(); });
}

function adm_luuCauHinh(p) {
  return chay_(function () {
    var u = batBuoc_('QUAN_TRI'); p = p || {};
    var cho = KHOA_VAN_HANH.concat(['url_goc', 'url_quan_tri', 'tl_ho_tro', 'tl_tai_dau_tu', 'tl_du_phong']);
    return khoa_(function () {
      var m = Object.assign({}, cfgAll_());
      cho.forEach(function (k) { if (p[k] !== undefined) m[k] = String(p[k]).trim().slice(0, 300); });
      ['url_goc', 'url_quan_tri'].forEach(function (k) { if (m[k] && !/^https:\/\/[^\s]+$/.test(m[k])) throw loi_('URL phải bắt đầu bằng https://'); });
      var tl = so_(m.tl_ho_tro) + so_(m.tl_tai_dau_tu) + so_(m.tl_du_phong);
      if (tl !== 100) throw loi_('Tổng ba tỷ lệ đề xuất phải bằng 100%.');
      if (cheDo_() === 'THAT') { var th = kiemTraVanHanh_(m); if (th.length) throw loi_('Đang vận hành thật, không được để thiếu/sai: ' + th.join(', ')); }
      cho.forEach(function (k) { if (p[k] !== undefined) cfgSet_(k, m[k]); });
      nhatKy_(u, 'LUU_CAU_HINH', '', Object.keys(p).join(','));
      xoaCache_();
      return cfgAll_();
    });
  });
}

function adm_batVanHanh(p) {
  return chay_(function () {
    var u = batBuoc_('QUAN_TRI'); p = p || {};
    if (p.xac_nhan !== true) throw loi_('Cần tích xác nhận trước khi bật vận hành.');
    var m = {}; KHOA_VAN_HANH.forEach(function (k) { m[k] = p[k]; });
    var thieu = kiemTraVanHanh_(m);
    if (thieu.length) throw loi_('Chưa thể bật vận hành. Thiếu/sai: ' + thieu.join('; '));
    return khoa_(function () {
      KHOA_VAN_HANH.forEach(function (k) { cfgSet_(k, String(m[k]).trim()); });
      cfgSet_('che_do_van_hanh', 'THAT'); cfgSet_('ngay_bat_van_hanh', bayGio_()); cfgSet_('nguoi_bat_van_hanh', u.email);
      xoaCache_(); nhatKy_(u, 'BAT_VAN_HANH', '', m);
      return { che_do: 'THAT' };
    });
  });
}

function adm_tatVanHanh() {
  return chay_(function () {
    var u = batBuoc_('QUAN_TRI');
    return khoa_(function () {
      var dang = doc_('DonHang').filter(function (d) { return d.che_do === 'THAT' && ['CHO_XAC_NHAN', 'DA_XAC_NHAN', 'CHO_NHAN'].indexOf(d.trang_thai) >= 0; });
      if (dang.length) throw loi_('Còn ' + dang.length + ' đơn THẬT đang xử lý. Hãy hoàn tất/hủy trước khi quay lại DEMO.');
      cfgSet_('che_do_van_hanh', 'DEMO'); xoaCache_(); nhatKy_(u, 'TAT_VAN_HANH', '', '');
      return { che_do: 'DEMO' };
    });
  });
}

function adm_dsNguoiDung() {
  return chay_(function () { batBuoc_('QUAN_TRI'); return doc_('NguoiDung').map(sachR_); });
}

function adm_luuNguoiDung(p) {
  return chay_(function () {
    var u = batBuoc_('QUAN_TRI'); p = p || {};
    var email = String(p.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw loi_('Email không hợp lệ.');
    if (!VAI_TRO[p.vai_tro]) throw loi_('Vai trò không hợp lệ.');
    return khoa_(function () {
      var ds = doc_('NguoiDung'), r = null;
      ds.forEach(function (x) { if (String(x.email).toLowerCase() === email) r = x; });
      var hoatDong = p.hoat_dong !== false;
      var conQT = ds.filter(function (x) { return x !== r && x.vai_tro === 'QUAN_TRI' && b_(x.hoat_dong); }).length;
      if (!(p.vai_tro === 'QUAN_TRI' && hoatDong) && conQT === 0) throw loi_('Phải còn ít nhất một quản trị viên đang hoạt động.');
      if (r) { r.ho_ten = chuoi_(p.ho_ten, 2, 60, 'Họ tên'); r.vai_tro = p.vai_tro; r.hoat_dong = hoatDong; capNhat_('NguoiDung', r); }
      else them_('NguoiDung', { email: email, ho_ten: chuoi_(p.ho_ten, 2, 60, 'Họ tên'), vai_tro: p.vai_tro, hoat_dong: hoatDong, ngay_tao: bayGio_() });
      nhatKy_(u, 'LUU_NGUOI_DUNG', email, p.vai_tro + (hoatDong ? '' : ' (khóa)'));
      return { ok: 1 };
    });
  });
}

function adm_dongBoQuyen() {
  return chay_(function () { return dongBoQuyen(); });
}

/** Xóa toàn bộ bản ghi DEMO (không đụng THAT). Bắt buộc gõ đúng cụm xác nhận. */
function adm_xoaDuLieuDemo(p) {
  return chay_(function () {
    var u = batBuoc_('QUAN_TRI'); p = p || {};
    if (p.xac_nhan !== 'XOA DEMO') throw loi_('Gõ đúng "XOA DEMO" để xác nhận.');
    return khoa_(function () {
      var n = 0;
      ['SanPham', 'YeuCauTang', 'KyGui', 'DonHang', 'ChiTietDon', 'ThuChi', 'PhanHoi', 'Phieu'].forEach(function (ten) {
        var s = sh_(ten), h = SCHEMA[ten], rows = doc_(ten), giu = rows.filter(function (r) { return r.che_do !== 'DEMO'; });
        n += rows.length - giu.length;
        if (rows.length === giu.length) return;
        s.getRange(2, 1, Math.max(1, s.getMaxRows() - 1), h.length).clearContent();
        if (giu.length) s.getRange(2, 1, giu.length, h.length).setValues(giu.map(function (r) { return dong_(ten, r); }));
      });
      xoaCache_(); nhatKy_(u, 'XOA_DU_LIEU_DEMO', '', n + ' bản ghi');
      return { da_xoa: n };
    });
  });
}


/* ========================================================================= */
/* ===================== PHẦN 4: DỮ LIỆU MINH HỌA (DEMO) ==================== */
/* ========================================================================= */

/**
 * Demo.gs – DỮ LIỆU MINH HỌA. Mọi bản ghi che_do = DEMO. Giá chỉ để minh họa, không có ảnh thật
 * (giao diện hiển thị biểu tượng thay thế). Không tạo doanh thu hay thành tích thật.
 */
function seedDemo_() {
  var now = bayGio_(), gv = 'demo@minh-hoa';
  var kt = JSON.stringify({ ve_sinh: 'DAT', hu_hong: 'DAT', an_toan: 'DAT', noi_dung: 'DAT', ban_quyen: 'DAT', ghi_chu: 'Dữ liệu minh họa' });
  function sp(ma, ten, dm, ts, loi, gia, tong, nguon, tt, extra) {
    var o = {
      ma: ma, ten: ten + ' (minh họa)', danh_muc: dm, mo_ta: 'Sản phẩm minh họa cho bản demo, không phải hàng thật.', tinh_trang: ts, loi_ghi_nhan: loi,
      gia_de_xuat: gia, gia: gia, ton_kho: tong, dang_giu: 0, da_ban: 0, tong_nhap: tong, trang_thai: tt, nguon: nguon, ma_nguon: '',
      anh_rieng_id: '', anh_id: '', da_kiem_tra: true, kiem_tra: kt, nguoi_kiem_tra: gv, ngay_kiem_tra: now, nguoi_duyet_gia: gv,
      ngay_duyet_gia: now, ly_do: '', ngay_dang: now, luu_tru: false, nguoi_tao: gv, ngay_tao: now, che_do: 'DEMO'
    };
    Object.keys(extra || {}).forEach(function (k) { o[k] = extra[k]; });
    them_('SanPham', o); return o;
  }
  sinhMaDatLai_();
  var a1 = sp(sinhMa_('RS', 3), 'Sách tham khảo Toán 8', 'SACH', 'Tốt', 'Có vài chỗ gạch chì', 35000, 1, 'TANG', 'SAN_SANG');
  sp(sinhMa_('RS', 3), 'Truyện thiếu nhi phù hợp lứa tuổi', 'SACH', 'Khá', 'Gáy sách hơi cũ', 20000, 2, 'TANG', 'SAN_SANG');
  var tuDien = sp(sinhMa_('RS', 3), 'Từ điển Anh–Việt bỏ túi (ký gửi)', 'SACH', 'Tốt', '', 30000, 1, 'KY_GUI', 'SAN_SANG', { ma_nguon: 'KG001' });
  var hop = sp(sinhMa_('RS', 3), 'Hộp bút vải', 'DUNG_CU', 'Như mới', '', 15000, 3, 'TANG', 'SAN_SANG');
  sp(sinhMa_('RS', 3), 'Thước kẻ và compa', 'DUNG_CU', 'Tốt', 'Thước có vết xước nhỏ', 12000, 2, 'TANG', 'SAN_SANG');
  sp(sinhMa_('RS', 3), 'Bộ dụng cụ mỹ thuật (màu nước, cọ)', 'DUNG_CU', 'Khá', 'Thiếu 1 màu', 40000, 1, 'TANG', 'SAN_SANG');
  var balo = sp(sinhMa_('RS', 3), 'Ba lô học sinh màu xanh', 'CAP_BA_LO', 'Tốt', 'Khóa kéo hơi chặt', 90000, 1, 'TANG', 'SAN_SANG');
  var cap = sp(sinhMa_('RS', 3), 'Cặp chéo vải', 'CAP_BA_LO', 'Khá', 'Quai có vết sờn nhẹ', 50000, 1, 'TANG', 'SAN_SANG');
  sp(sinhMa_('RS', 3), 'Bộ dụng cụ tiết kiệm (bút, thước, tập)', 'BO_TIET_KIEM', 'Tốt', 'Bộ gộp để minh họa; chưa liên kết tồn kho thành phần', 45000, 1, 'TANG', 'SAN_SANG');
  // hàng chưa duyệt: KHÔNG hiển thị công khai
  sp(sinhMa_('RS', 3), 'Sách ôn tập chờ kiểm tra', 'SACH', 'Khá', '', '', 1, 'TANG', 'CHO_KIEM_TRA', { gia: '', ton_kho: 0, da_kiem_tra: false, kiem_tra: '', nguoi_duyet_gia: '', ngay_dang: '' });
  sp(sinhMa_('RS', 3), 'Hộp màu chờ duyệt giá', 'DUNG_CU', 'Tốt', '', 25000, 1, 'TANG', 'CHO_DUYET_GIA', { gia: '', ton_kho: 0, nguoi_duyet_gia: '', ngay_dang: '' });

  // Ký gửi mẫu (đã thỏa thuận, KHÔNG có hoa hồng)
  them_('KyGui', {
    ma: sinhMa_('KG', 3), ten_lien_he: 'Người ký gửi minh họa', lien_he: '0900000000', mo_ta: 'Từ điển Anh–Việt (minh họa)', tinh_trang: 'Tốt',
    anh_rieng_id: '', gia_mong_muon: 30000, la_hoc_sinh: false, phu_huynh_dong_y: false, trang_thai: 'DA_THOA_THUAN', gia_thong_nhat: 30000,
    thoi_han: Utilities.formatDate(new Date(Date.now() + 90 * 86400000), TZ, 'yyyy-MM-dd'), hoa_hong_pct: '',
    cach_tra_hang: 'Nhận lại trực tiếp tại điểm nhận (minh họa)', ma_san_pham: tuDien.ma, nguoi_xac_nhan: gv, ngay_thoa_thuan: now,
    ngay_ket_thuc: '', ly_do_ket_thuc: '', ghi_chu: 'Dữ liệu minh họa', ngay_gui: now, che_do: 'DEMO'
  });
  them_('YeuCauTang', {
    ma: sinhMa_('YT', 3), ten_lien_he: 'Người tặng minh họa', lien_he: '0900000001', loai_hang: 'SACH', mo_ta: 'Một số sách cũ muốn tặng (minh họa)',
    tinh_trang: 'Khá', anh_rieng_id: '', la_hoc_sinh: false, phu_huynh_dong_y: false, tu_nguyen: true, trang_thai: 'MOI', ly_do: '',
    ma_san_pham: '', nguoi_xu_ly: '', ngay_gui: now, ngay_xu_ly: '', che_do: 'DEMO'
  });

  // Đơn mẫu (mã xác thực minh họa: DEMO01)
  var han = congGio_(48);
  function don(ma, ten, tt, thanhToan, tong, soTien) {
    var d = {
      ma_don: ma, xac_thuc_hash: bamXacThuc_(ma, 'DEMO01'), ten_khach: ten, lien_he: '0900000002', ghi_chu: 'Đơn minh họa', tong_tien: tong,
      trang_thai: tt, thanh_toan: thanhToan, han_giu_cho: han, ly_huy: '', da_ghi_so: tt === 'HOAN_TAT', lich_su: '', nguoi_xu_ly: gv,
      ngay_tao: now, ngay_cap_nhat: now, che_do: 'DEMO'
    };
    ghiLichSu_(d, 'TAO_DON', 'Đơn minh họa', null); them_('DonHang', d);
  }
  function ct(maDon, s, sl) {
    them_('ChiTietDon', { ma_ct: sinhMa_('CT', 5), ma_don: maDon, ma_sp: s.ma, ten_sp: s.ten, so_luong: sl, don_gia: s.gia, thanh_tien: s.gia * sl, nguon: s.nguon, ma_ky_gui: '', da_hoan_kho: false, che_do: 'DEMO' });
  }
  var d1 = sinhMa_('DH', 4), d2 = sinhMa_('DH', 4), d3 = sinhMa_('DH', 4);
  don(d1, 'Khách minh họa A', 'CHO_XAC_NHAN', 'CHUA_THU', balo.gia); ct(d1, balo, 1);
  don(d2, 'Khách minh họa B', 'DA_XAC_NHAN', 'CHUA_THU', hop.gia); ct(d2, hop, 1);
  don(d3, 'Khách minh họa C', 'HOAN_TAT', 'DA_THU', cap.gia); ct(d3, cap, 1);
  // cập nhật tồn kho theo đơn
  var cs = {}; doc_('SanPham').forEach(function (s) { cs[s.ma] = s; });
  var b = cs[balo.ma]; b.ton_kho = 0; b.dang_giu = 1; tinhTrangBan_(b); capNhat_('SanPham', b);
  var h = cs[hop.ma]; h.ton_kho = 2; h.dang_giu = 1; tinhTrangBan_(h); capNhat_('SanPham', h);
  var c = cs[cap.ma]; c.ton_kho = 0; c.da_ban = 1; tinhTrangBan_(c); capNhat_('SanPham', c);
  // sổ thu chi DEMO (không bao giờ vào báo cáo thật)
  them_('ThuChi', {
    ma: sinhMa_('TC', 4), ngay: homNay_(), noi_dung: 'Doanh thu hàng tặng ' + cap.ma + ' (đơn ' + d3 + ') – minh họa', loai: 'DOANH_THU_TANG', so_tien: cap.gia,
    chung_tu: 'Đơn ' + d3, chung_tu_hop_le: true, trang_thai: 'DA_XAC_NHAN', nguoi_nhap: gv, nguoi_duyet: gv, ngay_duyet: now, ma_don: d3, ma_ky_gui: '',
    dieu_chinh_cho: '', loai_goc: '', muc_phan_bo: '', ly_do: '', che_do: 'DEMO'
  });
  xoaCache_();
}

// Đặt lại bộ đếm mã để dữ liệu mẫu luôn bắt đầu từ RS001, KG001, YT001, DH0001
function sinhMaDatLai_() {
  var p = PropertiesService.getScriptProperties();
  ['RS', 'KG', 'YT', 'DH', 'CT', 'TC'].forEach(function (k) { p.deleteProperty('SEQ_' + k); });
}
