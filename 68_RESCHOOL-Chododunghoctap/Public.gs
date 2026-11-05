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
  if (!p.anh_token) throw loi_('Vui lòng chụp hoặc tải ảnh món đồ (bắt buộc, tối đa 5 ảnh).');
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
