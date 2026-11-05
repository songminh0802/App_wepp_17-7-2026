# HƯỚNG DẪN CÀI ĐẶT VÀ VẬN HÀNH HỆ THỐNG RESCHOOL
**Dự án:** RESCHOOL – Chợ đồ dùng học tập tuần hoàn  
**Slogan:** *“Trao một món đồ cũ – Mở thêm một cơ hội mới”*  
**Nền tảng:** Google Sheets + Google Apps Script (HtmlService) + Google Drive (Miễn phí 100%)

---

## I. CẤU TRÚC DỮ LIỆU (11 BẢNG GOOGLE SHEETS)

Khi chạy hàm `khoiTao()`, hệ thống sẽ tự động tạo đủ 11 sheet, gắn tiêu đề cột in đậm màu xanh lá và định dạng chuỗi văn bản cho các cột mã/SĐT. Dưới đây là giải thích từng sheet:

| Sheet | Mục đích & Giải thích | Danh sách các cột (Header) |
|---|---|---|
| **`CauHinh`** | Lưu các tham số hệ thống dạng khóa – giá trị (chế độ DEMO/THAT, điểm nhận, liên hệ, thời hạn giữ chỗ, tỷ lệ đề xuất phân bổ...). | `khoa`, `gia_tri`, `mo_ta` |
| **`NguoiDung`** | Quản lý danh sách tài khoản Google nội bộ được phép truy cập trang quản trị và phân quyền (HOC_SINH, GIAO_VIEN, QUAN_TRI). | `email`, `ho_ten`, `vai_tro`, `hoat_dong`, `ngay_tao` |
| **`SanPham`** | Danh mục hàng hóa. Theo dõi số lượng: tồn kho (`ton_kho`), đang giữ chỗ (`dang_giu`), đã bán (`da_ban`), tổng nhập (`tong_nhap`). Trạng thái quy trình từ chờ tiếp nhận đến hoàn tất. | `ma`, `ten`, `danh_muc`, `mo_ta`, `tinh_trang`, `loi_ghi_nhan`, `gia_de_xuat`, `gia`, `ton_kho`, `dang_giu`, `da_ban`, `tong_nhap`, `trang_thai`, `nguon`, `ma_nguon`, `anh_rieng_id`, `anh_id`, `da_kiem_tra`, `kiem_tra`, `nguoi_kiem_tra`, `ngay_kiem_tra`, `nguoi_duyet_gia`, `ngay_duyet_gia`, `ly_do`, `ngay_dang`, `luu_tru`, `nguoi_tao`, `ngay_tao`, `che_do` |
| **`YeuCauTang`** | Lưu đơn đăng ký tặng đồ từ khách (khu vực bảo mật riêng tư). Gửi yêu cầu ≠ đã tiếp nhận. | `ma`, `ten_lien_he`, `lien_he`, `loai_hang`, `mo_ta`, `tinh_trang`, `anh_rieng_id`, `la_hoc_sinh`, `phu_huynh_dong_y`, `tu_nguyen`, `trang_thai`, `ly_do`, `ma_san_pham`, `nguoi_xu_ly`, `ngay_gui`, `ngay_xu_ly`, `che_do` |
| **`KyGui`** | Quản lý hồ sơ ký gửi (khu vực bảo mật riêng tư). Lưu thỏa thuận BM03, giá thống nhất, thời hạn, hoa hồng, theo dõi tiền thu hộ và nghĩa vụ phải trả cho chủ hàng. | `ma`, `ten_lien_he`, `lien_he`, `mo_ta`, `tinh_trang`, `anh_rieng_id`, `gia_mong_muon`, `la_hoc_sinh`, `phu_huynh_dong_y`, `trang_thai`, `gia_thong_nhat`, `thoi_han`, `hoa_hong_pct`, `cach_tra_hang`, `ma_san_pham`, `nguoi_xac_nhan`, `ngay_thoa_thuan`, `ngay_ket_thuc`, `ly_do_ket_thuc`, `ghi_chu`, `ngay_gui`, `che_do` |
| **`DonHang`** | Lưu thông tin đơn đặt giữ chỗ (bảo mật riêng tư). Chứa `xac_thuc_hash` (mã băm SHA-256 kèm salt bí mật) để khách tra cứu an toàn mà không lộ thông tin người khác. | `ma_don`, `xac_thuc_hash`, `ten_khach`, `lien_he`, `ghi_chu`, `tong_tien`, `trang_thai`, `thanh_toan`, `han_giu_cho`, `ly_huy`, `da_ghi_so`, `lich_su`, `nguoi_xu_ly`, `ngay_tao`, `ngay_cap_nhat`, `che_do` |
| **`ChiTietDon`** | Danh sách từng món hàng trong mỗi đơn. Có cờ `da_hoan_kho` để đảm bảo hoàn trả kho an toàn (idempotent) khi hủy đơn hoặc hết hạn giữ chỗ. | `ma_ct`, `ma_don`, `ma_sp`, `ten_sp`, `so_luong`, `don_gia`, `thanh_tien`, `nguon`, `ma_ky_gui`, `da_hoan_kho`, `che_do` |
| **`ThuChi`** | Sổ quỹ thu chi tài chính. Các bản ghi `DA_XAC_NHAN` tuyệt đối **không sửa / không xóa**, chỉ điều chỉnh bằng dòng mới ghi rõ lý do. | `ma`, `ngay`, `noi_dung`, `loai`, `so_tien`, `chung_tu`, `chung_tu_hop_le`, `trang_thai`, `nguoi_nhap`, `nguoi_duyet`, `ngay_duyet`, `ma_don`, `ma_ky_gui`, `dieu_chinh_cho`, `loai_goc`, `muc_phan_bo`, `ly_do`, `che_do` |
| **`PhanHoi`** | Tiếp nhận ý kiến đóng góp, đánh giá từ khách hàng (BM06). | `ma`, `noi_dung`, `diem`, `lien_he`, `trang_thai`, `ngay_gui`, `che_do` |
| **`Phieu`** | Lưu trữ hồ sơ các biểu mẫu (BM01 khảo sát, BM02 tiếp nhận, BM03 ký gửi, BM04 kiểm tra, BM05 đối chiếu, PHAN_BO phê duyệt trích quỹ). | `ma`, `loai`, `tham_chieu`, `du_lieu`, `nguoi_lap`, `ngay_lap`, `che_do` |
| **`NhatKy`** | Ghi nhận toàn bộ thao tác quản trị (audit log) với thời gian, người thực hiện, hành động và đối tượng để đối soát an toàn. | `thoi_gian`, `email`, `vai_tro`, `hanh_dong`, `doi_tuong`, `chi_tiet`, `che_do` |

---

## II. HƯỚNG DẪN CÀI ĐẶT TỪNG BƯỚC

### Bước 1: Tạo Google Spreadsheet mới
1. Mở [Google Drive](https://drive.google.com/), tạo một Google Spreadsheet mới.
2. Đặt tên file: **ReSchool – Cơ sở dữ liệu**.

### Bước 2: Dán mã nguồn vào Apps Script
1. Trên Spreadsheet vừa tạo, vào menu **Tiện ích mở rộng (Extensions)** > **Apps Script**.
2. Đổi tên dự án Apps Script thành: **ReSchool App**.
3. Bật hiển thị tệp kê khai `appsscript.json`:
   - Bấm biểu tượng ⚙️ (Cài đặt dự án / Project Settings) ở thanh bên trái.
   - Tích chọn: **"Hiển thị tệp kê khai appsscript.json trong trình chỉnh sửa"**.
4. Tạo/sao chép đúng các tệp với tên chính xác:
   - `appsscript.json`: Dán nội dung từ file `appsscript.json`.
   - `Code.gs`: Dán nội dung từ file `Code.gs`.
   - `Public.gs`: Dán nội dung từ file `Public.gs`.
   - `Admin.gs`: Dán nội dung từ file `Admin.gs`.
   - `Demo.gs`: Dán nội dung từ file `Demo.gs`.
   - `Index.html`: Tạo tệp HTML mới, đặt tên `Index`, dán nội dung `Index.html`.
   - `Style.html`: Tạo tệp HTML mới, đặt tên `Style`, dán nội dung `Style.html`.
   - `Client.html`: Tạo tệp HTML mới, đặt tên `Client`, dán nội dung `Client.html`.
   - `ClientAdmin.html`: Tạo tệp HTML mới, đặt tên `ClientAdmin`, dán nội dung `ClientAdmin.html`.
5. Bấm biểu tượng Lưu (Ctrl+S hoặc Cmd+S).

### Bước 3: Chạy hàm Khởi tạo (`khoiTao`)
1. Tại thanh công cụ của Apps Script, chọn hàm **`khoiTao`** và bấm nút **Chạy (Run)**.
2. Google sẽ hiện hộp thoại yêu cầu cấp quyền:
   - Chọn tài khoản Google của bạn.
   - Bấm **Nâng cao (Advanced)** > **Đi tới ReSchool App (không an toàn)**.
   - Bấm **Cho phép (Allow)**.
3. Khi hàm chạy xong:
   - Hệ thống tự động tạo 11 Sheet với đầy đủ tiêu đề và định dạng chuẩn.
   - Tự động nạp bộ dữ liệu mẫu ban đầu (tất cả có nhãn `che_do = DEMO`).
   - Tự động thêm tài khoản email của bạn vào sheet `NguoiDung` với vai trò `QUAN_TRI`.
   - Tự động tạo 2 thư mục Drive lưu ảnh: `ReSchool_AnhCongKhai` và `ReSchool_AnhRieng`.

### Bước 4: Cài đặt Trigger tự động hủy giữ chỗ (`caiTrigger`)
1. Trên thanh công cụ Apps Script, chọn hàm **`caiTrigger`** và bấm **Chạy (Run)**.
2. Trigger Time-driven sẽ được kích hoạt mỗi 15 phút một lần để tự động quét giải phóng các đơn hàng quá hạn giữ chỗ mà chưa thanh toán, tự động hoàn trả số lượng vào tồn kho (`ton_kho`).

### Bước 5: Triển khai 2 bản Web App (Bắt buộc theo kiến trúc bảo mật)

Ứng dụng ReSchool vận hành với **hai bản triển khai cùng chung mã nguồn**:

#### A. Triển khai Bản CÔNG KHAI (Dành cho học sinh, khách mua hàng, tặng đồ):
1. Bấm **Triển khai (Deploy)** > **Quản lý bản triển khai (Manage deployments)** > **Bản triển khai mới (New deployment)**.
2. Chọn loại: **Ứng dụng web (Web app)**.
3. Cấu hình:
   - **Mô tả:** `ReSchool - Cong khai`
   - **Thực thi dưới dạng (Execute as):** **Tôi (địa chỉ email của bạn)** *(User deploying / Me)*
   - **Ai có quyền truy cập (Who has access):** **Bất kỳ ai (Anyone)**
4. Bấm **Triển khai (Deploy)**.
5. Sao chép đường dẫn **URL ứng dụng web** (đây là `URL_CONG_KHAI`).

#### B. Triển khai Bản QUẢN TRỊ (Dành cho thành viên nhóm, giáo viên, admin):
1. Bấm lại **Triển khai mới (New deployment)**.
2. Cấu hình:
   - **Mô tả:** `ReSchool - Quan tri noi bo`
   - **Thực thi dưới dạng (Execute as):** **Người truy cập ứng dụng web** *(User accessing the web app)*
   - **Ai có quyền truy cập (Who has access):** **Bất kỳ ai có Tài khoản Google** *(Anyone with Google account)*
3. Bấm **Triển khai (Deploy)**.
4. Sao chép đường dẫn **URL ứng dụng web** này (đây là `URL_QUAN_TRI`).

### Bước 6: Cấu hình liên kết và Đồng bộ quyền
1. Mở Sheet `CauHinh`:
   - Cột `khoa` = `url_goc`: Điền giá trị ô `gia_tri` là `URL_CONG_KHAI` (dùng để sinh mã QR trỏ chuẩn xác).
   - Cột `khoa` = `url_quan_tri`: Điền `URL_QUAN_TRI` (để khách có quyền quản trị bấm nút đăng nhập).
2. Thêm email giáo viên và các học sinh thành viên vào Sheet `NguoiDung`:
   - Điền đúng email Gmail, họ tên, vai trò: `HOC_SINH` hoặc `GIAO_VIEN`.
3. Mở lại trình soạn thảo Apps Script, chọn hàm **`dongBoQuyen`** và bấm **Chạy**:
   - Hàm này sẽ cấp quyền biên tập Google Sheet và thư mục Drive chứa ảnh cho các thành viên trong `NguoiDung`.
   - Thiết lập bảo vệ (Sheet Protection) cảnh báo không sửa tay vào sổ `ThuChi`, `DonHang`, `ChiTietDon`.

---

## III. NGUYÊN TẮC VẬN HÀNH & PHÂN QUYỀN

### 1. Phân cấp vai trò trên hệ thống
* **Khách hàng (Công khai):**
  - Không cần đăng nhập tài khoản.
  - Xem sản phẩm đã kiểm duyệt, đặt giữ chỗ tại điểm nhận.
  - Gửi biểu mẫu tặng đồ, đăng ký ký gửi, gửi góp ý, tra cứu đơn bằng mã đơn + mã xác thực.
  - Tuyệt đối không thể truy cập các hàm và dữ liệu riêng tư phía server.
* **Thành viên học sinh (`HOC_SINH`):**
  - Đăng nhập bằng Google Account tại URL Quản trị.
  - Nhập liệu thông tin sản phẩm, chụp ảnh, chuẩn bị phiếu kiểm tra (BM04).
  - Đề xuất chi phí phục vụ hoạt động (kèm chứng từ).
  - Không được duyệt giá, không được duyệt kiểm tra, không được duyệt tài chính hay xác nhận thu tiền.
  - Thông tin liên hệ của khách tặng/ký gửi/người mua được ẩn/che bớt để bảo vệ dữ liệu.
* **Giáo viên giám sát (`GIAO_VIEN`):**
  - Phê duyệt kết quả kiểm tra chất lượng (BM04: Đạt/Không đạt).
  - Phê duyệt giá bán công khai.
  - Xác nhận thỏa thuận ký gửi (BM03).
  - Xác nhận đơn hàng, xác nhận nhận tiền mặt và hoàn tất đơn hàng.
  - Duyệt chi phí hợp lệ, thực hiện đối chiếu tiền – kho – đơn hàng (BM05).
  - Ghi nhận chi và trả tiền cho chủ hàng ký gửi.
* **Quản trị viên (`QUAN_TRI`):**
  - Quản trị danh sách người dùng, kích hoạt / khóa tài khoản.
  - Điều chỉnh thông số hệ thống và thực hiện thao tác **Bật chế độ vận hành THẬT**.

### 2. Quy trình kiểm soát từ DEMO sang THẬT
- Mặc định sau khi khởi tạo, hệ thống ở **CHẾ ĐỘ DEMO**. Mọi đơn hàng, yêu cầu đều gắn cờ `DEMO`.
- Nút bật vận hành thật chỉ cho phép bật khi quản trị viên nhập **đầy đủ 7 thông tin hợp lệ** (không được chứa chữ "minh họa"):
  1. Số văn bản chấp thuận của nhà trường
  2. Ngày văn bản (đúng định dạng, không ở tương lai)
  3. Người xác nhận phía nhà trường
  4. Điểm nhận hàng thực tế
  5. Thời gian nhận hàng cụ thể
  6. Số điện thoại/kênh liên hệ hỗ trợ chính thức
  7. Thời hạn giữ chỗ (từ 1 đến 720 giờ)
- Trước khi bật thật, quản trị viên có thể bấm nút **"Xóa dữ liệu DEMO"** trong tab Hệ thống (yêu cầu gõ xác nhận `XOA DEMO`) để làm sạch các bản ghi thử nghiệm.
- **Báo cáo và sổ quỹ thực tế:** CHỈ đọc dữ liệu `che_do = THAT`. Toàn bộ dữ liệu DEMO không bao giờ xuất hiện trong báo cáo chính thức.

---

## IV. BẢNG TỔNG KẾT TÍNH NĂNG & GIỚI HẠN KỸ THUẬT

### 1. Các hạng mục đã hoàn thành đầy đủ
- [x] Kiến trúc 2 bản triển khai phân tách bảo mật công khai & nội bộ.
- [x] Độc lập dữ liệu DEMO và THẬT, khóa điều kiện chuyển chế độ chặt chẽ.
- [x] Phòng chống xung đột đặt hàng (Race Condition) bằng `LockService`.
- [x] Tự động hủy giữ chỗ quá hạn và phục hồi tồn kho bằng Time-driven trigger.
- [x] Mã hóa băm SHA-256 + Salt bí mật cho mã tra cứu đơn hàng của khách.
- [x] Form tặng đồ và ký gửi có kiểm soát học sinh (bắt buộc phụ huynh đồng ý) và cam kết không nhận đồ cấm.
- [x] Tách bạch 100% dòng tiền hàng ký gửi khỏi doanh thu dự án (tiền bán chỉ là thu hộ, chỉ phí hoa hồng đã thu mới tính vào doanh thu).
- [x] Sổ thu chi bất biến (Immutability): không sửa/xóa bản ghi đã duyệt, chỉ cho phép tạo dòng điều chỉnh đối ứng có lý do.
- [x] Đề xuất trích lập quỹ (40% hỗ trợ, 40% tái đầu tư, 20% dự phòng) chỉ gợi ý khi lợi nhuận > 0 và cần phê duyệt chính thức mới giải ngân.
- [x] Hệ thống in ấn tiêu chuẩn cho các biểu mẫu BM02, BM03, BM04, BM05.
- [x] Bộ lọc, tìm kiếm không dấu Tiếng Việt, hiển thị mã QR động CDN phía client.

### 2. Giới hạn kỹ thuật của nền tảng Google Apps Script (Cần lưu ý)
1. **Hạn mức thời gian chạy (Execution Timeout):** Mỗi lần gọi hàm GAS tối đa 6 phút. Hệ thống đã tối ưu xử lý theo batch và mảng 2 chiều để mỗi thao tác chỉ mất 0.5 – 1.5 giây.
2. **Dung lượng ảnh tải lên:** Giới hạn 2 MB/ảnh và tối đa 150 ảnh/ngày để bảo đảm bộ nhớ tạm (Blob memory) của GAS không bị tràn và Drive không bị đầy đột ngột.
3. **Độ trễ phản hồi:** Do chạy trên máy chủ dùng chung của Google, lượt truy cập đầu tiên sau khi không dùng có thể mất 2–3 giây để "khởi động ấm" (cold start).
4. **Không hỗ trợ WebSockets:** Trạng thái đơn và tồn kho được cập nhật tức thời ở server mỗi khi có giao dịch và kiểm tra khóa tại thời điểm bấm đặt.

### 3. Các tính năng chưa làm ở phiên bản này (Theo yêu cầu)
- Bộ dụng cụ liên kết tồn kho động với từng món thành phần riêng lẻ (hiện tại tính như 1 combo độc lập).
- Tự động so sánh giá thị trường của sản phẩm mới cùng loại.
- Gửi email tự động qua GmailApp (tránh vượt hạn ngạch gửi 100 email/ngày của tài khoản giáo viên miễn phí).
