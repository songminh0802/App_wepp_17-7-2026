const SPREADSHEET_ID = '1-ZFPDxbDZE_NbN9iacIObRzJWqnPwu0bNPLOUYlGU-A';

// Chạy hàm này MỘT LẦN để khởi tạo các Sheet và Tiêu đề
function setupDatabase() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  const sheetsConfig = {
    'LopHoc': ['ID', 'TenLop', 'GhiChu'],
    'HocSinh': ['ID', 'HoTen', 'NgaySinh', 'PhuHuynhSDT', 'Lop', 'NgayNhapHoc', 'GhiChu'],
    'LichDay': ['ID', 'Lop', 'MonHoc', 'PhongHoc', 'Thu', 'GioBatDau', 'GioKetThuc', 'LoaiLich', 'NgayBatDau', 'GhiChu'],
    'DiemDanh': ['ID', 'Ngay', 'HocSinhID', 'HoTen', 'Lop', 'TrangThai', 'GhiChu'],
    // BỔ SUNG: Sheet lưu các phiếu thu học phí cho chức năng "Đóng tiền"
    'HocPhi': ['ID', 'HocSinhID', 'HoTen', 'Lop', 'ThangDong', 'SoTien', 'NgayDong', 'PhuongThuc', 'GhiChu']
  };

  for (const [sheetName, headers] of Object.entries(sheetsConfig)) {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#f3f4f6");
    }
  }
}

function doGet(e) {
  const action = e.parameter.action;
  try {
    let data;
    switch (action) {
      case 'getDashboard': data = getDashboardData(); break;
      case 'getClasses': data = getData('LopHoc'); break;
      case 'getStudents': data = getData('HocSinh'); break;
      case 'getSchedules': data = getData('LichDay'); break;
      case 'getAttendance': data = getAttendance(e.parameter.date, e.parameter.lop); break;
      // BỔ SUNG: Lấy danh sách phiếu thu học phí cho chức năng "Đóng tiền"
      case 'getPayments': data = getPayments(); break;
      case 'getSettings': data = getSettings(); break;
      default: return responseJSON({ success: false, message: 'Action not found' });
    }
    return responseJSON({ success: true, data: data });
  } catch (error) {
    return responseJSON({ success: false, message: error.toString() });
  }
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const action = e.parameter.action;
    let result;

    switch (action) {
      case 'saveClass': result = saveClass(payload); break;
      case 'deleteClass': result = deleteData('LopHoc', payload.id); break;
      case 'saveStudent': result = saveStudent(payload); break;
      case 'deleteStudent': result = deleteData('HocSinh', payload.id); break;
      case 'saveSchedule': result = saveSchedule(payload); break;
      case 'deleteSchedule': result = deleteData('LichDay', payload.id); break;
      case 'saveAttendance': result = saveAttendance(payload); break;
      // BỔ SUNG: Ghi nhận / xóa phiếu thu học phí cho chức năng "Đóng tiền"
      case 'savePayment': result = savePayment(payload); break;
      case 'deletePayment': result = deleteData('HocPhi', payload.id); break;
      case 'saveSettings': result = saveSettings(payload); break;
      default: return responseJSON({ success: false, message: 'Action not found' });
    }
    return responseJSON({ success: true, data: result });
  } catch (error) {
    return responseJSON({ success: false, message: error.toString() });
  }
}

// --- HELPER FUNCTIONS ---
function responseJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet(sheetName) {
  return SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(sheetName);
}

function getData(sheetName) {
  const sheet = getSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0];
  const rows = data.slice(1);
  return rows.map(row => {
    let obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index];
    });
    return obj;
  });
}

function deleteData(sheetName, id) {
  const sheet = getSheet(sheetName);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      return true;
    }
  }
  throw new Error('Không tìm thấy ID để xóa');
}

// --- BUSINESS LOGIC ---
function saveClass(payload) {
  const sheet = getSheet('LopHoc');
  if (!payload.ID) payload.ID = 'LH' + Utilities.formatDate(new Date(), "GMT+7", "yyMMddHHmmss") + Math.floor(Math.random() * 1000);
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  // Update
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(payload.ID)) {
      headers.forEach((h, colIndex) => {
        if (payload[h] !== undefined) sheet.getRange(i + 1, colIndex + 1).setValue(payload[h]);
      });
      return payload;
    }
  }
  
  // Insert
  const newRow = headers.map(h => payload[h] !== undefined ? payload[h] : "");
  sheet.appendRow(newRow);
  return payload;
}

function saveStudent(payload) {
  const sheet = getSheet('HocSinh');
  if (!payload.ID) payload.ID = 'HS' + Utilities.formatDate(new Date(), "GMT+7", "yyMMddHHmmss") + Math.floor(Math.random() * 1000);
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  // Update
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(payload.ID)) {
      headers.forEach((h, colIndex) => {
        if (payload[h] !== undefined) sheet.getRange(i + 1, colIndex + 1).setValue(payload[h]);
      });
      return payload;
    }
  }
  
  // Insert
  const newRow = headers.map(h => payload[h] !== undefined ? payload[h] : "");
  sheet.appendRow(newRow);
  return payload;
}

function saveSchedule(payload) {
  const sheet = getSheet('LichDay');
  if (!payload.ID) payload.ID = 'LD' + Utilities.formatDate(new Date(), "GMT+7", "yyMMddHHmmss") + Math.floor(Math.random() * 1000);
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  const newRow = headers.map(h => payload[h] !== undefined ? payload[h] : "");
  sheet.appendRow(newRow);
  return payload;
}

function saveAttendance(records) {
  const sheet = getSheet('DiemDanh');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  // Lấy danh sách số điện thoại phụ huynh
  const studentSheet = getSheet('HocSinh');
  const studentData = studentSheet.getDataRange().getValues();
  const studentPhones = {};
  for (let i = 1; i < studentData.length; i++) {
     studentPhones[String(studentData[i][0])] = studentData[i][3]; // Col 0: ID, Col 3: SDT
  }
  
  records.forEach(record => {
    let updated = false;
    let oldStatus = '';
    // Check if exists
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][1]) === String(record.Ngay) && String(data[i][2]) === String(record.HocSinhID)) {
         oldStatus = String(data[i][headers.indexOf('TrangThai')]);
         sheet.getRange(i + 1, headers.indexOf('TrangThai') + 1).setValue(record.TrangThai);
         sheet.getRange(i + 1, headers.indexOf('GhiChu') + 1).setValue(record.GhiChu);
         updated = true;
         break;
      }
    }
    
    // Insert new
    if (!updated) {
      const id = 'DD' + Utilities.formatDate(new Date(), "GMT+7", "yyMMddHHmmss") + Math.floor(Math.random()*1000);
      record.ID = id;
      const newRow = headers.map(h => record[h] !== undefined ? record[h] : "");
      sheet.appendRow(newRow);
    }
    
    // TRIGGER ZALO (Gửi nếu vắng mặt hoặc đi muộn và trạng thái có thay đổi)
    if (record.TrangThai !== oldStatus && (record.TrangThai === 'Nghỉ không phép' || record.TrangThai === 'Nghỉ có phép' || record.TrangThai === 'Đi muộn')) {
       const phone = studentPhones[String(record.HocSinhID)];
       if (phone) {
         sendZaloNotification(phone, record.HoTen, record.Ngay, record.TrangThai);
       }
    }
  });
  return true;
}

function getAttendance(date, lop) {
  const data = getData('DiemDanh');
  return data.filter(r => String(r.Ngay) === String(date) && String(r.Lop) === String(lop));
}

function getDashboardData() {
  const hs = getData('HocSinh');
  const ld = getData('LichDay');
  const dd = getData('DiemDanh');
  
  const todayStr = Utilities.formatDate(new Date(), "GMT+7", "yyyy-MM-dd");
  const absentsToday = dd.filter(r => String(r.Ngay) === todayStr && (r.TrangThai === 'Nghỉ có phép' || r.TrangThai === 'Nghỉ không phép')).length;

  return {
    totalStudents: hs.length,
    totalSchedules: ld.length,
    absentsToday: absentsToday,
    attendanceData: dd
  };
}
// ============================================================
// BỔ SUNG MỚI: CHỨC NĂNG "ĐÓNG TIỀN" (QUẢN LÝ HỌC PHÍ)
// Toàn bộ hàm trong khối này chỉ phục vụ tính năng thu học phí mới.
// Không thay đổi bất kỳ hàm/API nào đã có ở trên (LopHoc, HocSinh, LichDay, DiemDanh).
// ============================================================

// Lấy sheet 'HocPhi'; tự động tạo mới kèm tiêu đề nếu chưa tồn tại
// (giúp tính năng hoạt động ngay cả khi chưa chạy lại setupDatabase()).
function getHocPhiSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName('HocPhi');
  if (!sheet) {
    sheet = ss.insertSheet('HocPhi');
    const headers = ['ID', 'HocSinhID', 'HoTen', 'Lop', 'ThangDong', 'SoTien', 'NgayDong', 'PhuongThuc', 'GhiChu'];
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#f3f4f6");
  }
  return sheet;
}

// Lấy toàn bộ danh sách các phiếu thu học phí đã ghi nhận
function getPayments() {
  const sheet = getHocPhiSheet();
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0];
  const rows = data.slice(1);
  return rows.map(row => {
    let obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index];
    });
    return obj;
  });
}

// Ghi nhận (tạo mới) một phiếu thu học phí
function savePayment(payload) {
  const sheet = getHocPhiSheet();
  if (!payload.ID) payload.ID = 'HP' + Utilities.formatDate(new Date(), "GMT+7", "yyMMddHHmmss") + Math.floor(Math.random() * 1000);

  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  const newRow = headers.map(h => payload[h] !== undefined ? payload[h] : "");
  sheet.appendRow(newRow);
  return payload;
}
