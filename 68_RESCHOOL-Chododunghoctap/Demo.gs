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
