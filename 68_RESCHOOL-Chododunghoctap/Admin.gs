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
    var ids = String(id || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean);
    if (ids.length === 0) throw loi_('Không tìm thấy ảnh.');
    var res = [];
    for (var i = 0; i < ids.length; i++) {
      try {
        var f = DriveApp.getFileById(ids[i]), b = f.getBlob();
        res.push('data:' + b.getContentType() + ';base64,' + Utilities.base64Encode(b.getBytes()));
      } catch (e) {
        console.warn('Lỗi đọc ảnh ' + ids[i] + ': ' + e);
      }
    }
    if (res.length === 0) throw loi_('Không thể mở tệp ảnh từ Drive.');
    return res;
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
        s.anh_id = '';
        if (NHOM_BAN.indexOf(s.trang_thai) >= 0) congKhaiAnh_(s);
      } else if (moi || (!s.anh_rieng_id && !s.anh_id)) {
        throw loi_('Vui lòng tải ảnh cho sản phẩm (bắt buộc, tối đa 5 ảnh).');
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
    var rawIds = String(s.anh_rieng_id).split(',').map(function (x) { return x.trim(); }).filter(Boolean);
    var pubIds = [];
    var fPublic = thuMuc_('FOLDER_CONG_KHAI');
    for (var i = 0; i < rawIds.length; i++) {
      try {
        var f = DriveApp.getFileById(rawIds[i]);
        var c = f.makeCopy('sp_' + s.ma + '_' + (i + 1) + '_' + f.getName(), fPublic);
        try { c.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) { }
        pubIds.push(c.getId());
      } catch (errOne) {
        console.warn('Không sao chép được ảnh ' + rawIds[i] + ': ' + errOne);
      }
    }
    if (pubIds.length > 0) {
      s.anh_id = pubIds.join(',');
    }
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
          var gia;
          if (s.nguon === 'KY_GUI') {
            var kgs = doc_('KyGui').filter(function (k) { return k.ma_san_pham === s.ma || (s.ma_nguon && k.ma === s.ma_nguon); })[0];
            if (!kgs || kgs.trang_thai !== 'DA_THOA_THUAN') throw loi_('Hàng ký gửi chưa có thỏa thuận (BM03) nên chưa được đăng bán.');
            if (String(kgs.thoi_han) < homNay_()) throw loi_('Thỏa thuận ký gửi đã hết hạn.');
            var gKg = (d && Number(d.gia) > 0) ? Number(d.gia) : (kgs.gia_thong_nhat || s.gia_de_xuat);
            gia = soNguyen_(gKg, 1000, 100000000, 'Giá thống nhất ký gửi');
          } else {
            gia = soNguyen_(d.gia, 1000, 100000000, 'Giá duyệt');
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
