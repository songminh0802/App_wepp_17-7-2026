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
    return outJson_({ ok: true, phien_ban: PHIEN_BAN, ten: TEN_DU_AN });
  }
  var sp = (e && e.parameter && e.parameter.sp) || '';
  if (!/^RS\d{3,6}$/.test(sp)) sp = '';
  var init = JSON.stringify({ sp: sp }).replace(/</g, '\\u003c');
  var t = HtmlService.createTemplateFromFile('Index');
  t.initJson = init;
  return t.evaluate()
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

    // Chặn gọi các hàm nội bộ (kết thúc bằng dấu _)
    if (!fn || fn.slice(-1) === '_') {
      return outJson_({ ok: false, loi: 'Hàm không hợp lệ hoặc bị từ chối truy cập.' });
    }

    if (typeof this[fn] !== 'function') {
      return outJson_({ ok: false, loi: 'Không tìm thấy hàm: ' + fn });
    }

    var kq = this[fn].apply(null, args);
    return outJson_(kq);
  } catch (err) {
    console.error('Lỗi API doPost:', err);
    return outJson_({ ok: false, loi: 'Lỗi máy chủ: ' + (err.message || String(err)) });
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
    return { ok: false, loi: 'Có lỗi hệ thống nên thao tác CHƯA hoàn tất. Vui lòng thử lại; nếu vẫn lỗi hãy báo giáo viên phụ trách.' };
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
function nguoiDung_() {
  var a = '', e = '';
  try { a = Session.getActiveUser().getEmail(); e = Session.getEffectiveUser().getEmail(); } catch (x) { return null; }
  if (!a || !e || a.toLowerCase() !== e.toLowerCase()) return null;
  var rows;
  try { rows = doc_('NguoiDung'); } catch (x) { return null; }
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].email).toLowerCase() === a.toLowerCase() && b_(rows[i].hoat_dong) && VAI_TRO[rows[i].vai_tro]) {
      return { email: a, ho_ten: rows[i].ho_ten, vai_tro: rows[i].vai_tro };
    }
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
  if (p.getProperty('SPREADSHEET_ID')) batBuoc_('QUAN_TRI'); // đã khởi tạo: chỉ quản trị viên được chạy lại
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Hãy mở script từ Google Sheet (Tiện ích mở rộng > Apps Script).');
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
  if (PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID')) batBuoc_('QUAN_TRI');
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
  if (bytes.length > 2 * 1024 * 1024) throw loi_('Ảnh vượt quá 2 MB.');
  if (bytes.length < 12) throw loi_('Tệp ảnh không hợp lệ.');
  var u8 = bytes.map(function (x) { return x & 255; });
  var jpg = u8[0] === 0xFF && u8[1] === 0xD8 && u8[2] === 0xFF;
  var png = u8[0] === 0x89 && u8[1] === 0x50 && u8[2] === 0x4E && u8[3] === 0x47;
  var webp = u8[0] === 0x52 && u8[1] === 0x49 && u8[2] === 0x46 && u8[3] === 0x46 && u8[8] === 0x57 && u8[9] === 0x45 && u8[10] === 0x42 && u8[11] === 0x50;
  var ok = (mime === 'image/jpeg' && jpg) || (mime === 'image/png' && png) || (mime === 'image/webp' && webp);
  if (!ok) throw loi_('Nội dung tệp không khớp định dạng ảnh.');
  // giới hạn số ảnh/ngày để tránh làm đầy Drive
  var pr = PropertiesService.getScriptProperties(), hn = homNay_(), v = (pr.getProperty('ANH_NGAY') || '').split('|');
  var dem = v[0] === hn ? Number(v[1]) : 0;
  if (dem >= 150) throw loi_('Hôm nay đã đạt giới hạn tải ảnh. Vui lòng thử lại ngày mai.');
  pr.setProperty('ANH_NGAY', hn + '|' + (dem + 1));
  var blob = Utilities.newBlob(u8.map(function (x) { return x > 127 ? x - 256 : x; }), mime, 'rs_' + Utilities.getUuid().slice(0, 8) + '.' + cho[mime]);
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
