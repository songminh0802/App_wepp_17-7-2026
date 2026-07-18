const SCRIPT_VERSION = '1.0';

// ==========================================
// CẤU HÌNH ID (VUI LÒNG ĐIỀN ID CỦA BẠN VÀO ĐÂY)
// ==========================================
const SHEET_ID = '1psbKvN6RR5Sw2ZDC9PTwfSbqUq2DtU7u0LXJNZUBnZ8'; 
const FOLDER_ID = '1Nd3RopBbIQ-fZEJgckW3IF-XgTP3gKSf'; 
// ==========================================

// Hàm CẤP QUYỀN Google Drive (Chạy 1 lần duy nhất từ Apps Script Editor)
function grantDriveAccess() {
  // Tạo file tạm để buộc Google cấp quyền GHI vào Drive
  const folder = DriveApp.getFolderById(FOLDER_ID);
  const tempFile = folder.createFile('__test_permission__.txt', 'test', MimeType.PLAIN_TEXT);
  tempFile.setTrashed(true); // Xóa ngay vào thùng rác
  SpreadsheetApp.openById(SHEET_ID);
  return "✅ Đã cấp đầy đủ quyền Drive (đọc + ghi) + Sheets!";
}

// Hàm khởi tạo ban đầu, thiết lập CSDL nếu chưa có
function setupDatabase() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const requiredSheets = [
    { name: 'HOC_SINH', headers: ['ID', 'MaHS', 'HoTen', 'NgaySinh', 'GioiTinh', 'SDTPhuHuynh', 'GhiChu', 'TrangThai'] },
    { name: 'DIEM_DANH', headers: ['ID', 'Ngay', 'MaHS', 'TrangThai', 'LyDo'] },
    { name: 'KY_LUAT_KHEN_THUONG', headers: ['ID', 'Ngay', 'MaHS', 'PhanLoai', 'NoiDung', 'HinhThucXuLy'] },
    { name: 'TAI_LIEU_HINH_ANH', headers: ['ID', 'TenTaiLieu', 'Loai', 'LinkDrive', 'NgayTaiLen'] },
    { name: 'QUY_LOP', headers: ['ID', 'Ngay', 'Loai', 'NoiDung', 'SoTien', 'NguoiNopNhan'] }
  ];

  requiredSheets.forEach(sheetInfo => {
    let sheet = ss.getSheetByName(sheetInfo.name);
    if (!sheet) {
      sheet = ss.insertSheet(sheetInfo.name);
      sheet.appendRow(sheetInfo.headers);
      sheet.getRange(1, 1, 1, sheetInfo.headers.length).setFontWeight("bold").setBackground("#f3f4f6");
    }
  });
  return "Đã thiết lập xong các trang tính CSDL. Bạn đã có thể bắt đầu sử dụng App.";
}

function doGet(e) {
  // Nếu có tham số action, trả về dữ liệu JSON (dành cho việc gọi API từ bên ngoài)
  if (e && e.parameter && e.parameter.action) {
    let result = null;
    if (e.parameter.action === 'getStudents') {
      result = getStudents();
    } else if (e.parameter.action === 'getDashboardStats') {
      result = getDashboardStats();
    } else if (e.parameter.action === 'getDisciplines') {
      result = getDisciplines();
    } else if (e.parameter.action === 'getDocuments') {
      result = getDocuments();
      } else if (e.parameter.action === 'addStudent') {
      try {
        const data = JSON.parse(e.parameter.data);
        result = addStudent(data);
      } catch(err) {
        result = {success: false, message: err.toString()};
      }
    } else if (e.parameter.action === 'editStudent') {
      try {
        const data = JSON.parse(e.parameter.data);
        result = editStudent(data);
      } catch(err) {
        result = {success: false, message: err.toString()};
      }
    } else if (e.parameter.action === 'deleteStudent') {
      try {
        result = deleteStudent(e.parameter.maHs);
      } catch(err) {
        result = {success: false, message: err.toString()};
      }
    } else if (e.parameter.action === 'addDiscipline') {
      try {
        const data = JSON.parse(e.parameter.data);
        result = addDiscipline(data);
      } catch(err) {
        result = {success: false, message: err.toString()};
      }
    } else if (e.parameter.action === 'saveAttendance') {
      try {
        const data = JSON.parse(e.parameter.data);
        result = saveAttendance(data);
      } catch(err) {
        result = {success: false, message: err.toString()};
      }
    } else if (e.parameter.action === 'uploadDocument') {
      try {
        const data = JSON.parse(e.parameter.data);
        result = uploadDocument(data);
      } catch(err) {
        result = {success: false, message: err.toString()};
      }
    }

    // Nếu là yêu cầu JSONP
    if (e.parameter.callback) {
      return ContentService.createTextOutput(e.parameter.callback + '(' + JSON.stringify(result) + ')')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    } else {
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  // Mặc định trả về giao diện HTML
  var template = HtmlService.createTemplateFromFile('index3');
  return template.evaluate()
    .setTitle('Quản Lý Lớp Chủ Nhiệm')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  let result = {success: false, message: 'Invalid action'};
  
  if (e) {
    try {
      // Data might be in e.postData.contents (text/plain) or in e.parameter.data (form-urlencoded)
      const dataStr = (e.parameter && e.parameter.data) ? e.parameter.data : (e.postData ? e.postData.contents : '{}');
      const data = JSON.parse(dataStr);
      
      const action = (e.parameter && e.parameter.action) ? e.parameter.action : data.action;
      
      if (action === 'addStudent') {
        result = addStudent(data);
      } else if (action === 'uploadDocument') {
        result = uploadDocument(data);
      } else if (action === 'addDiscipline') {
        result = addDiscipline(data);
      } else if (action === 'saveAttendance') {
        result = saveAttendance(data);
      } else {
        result = {success: false, message: 'Unknown action: ' + action};
      }
    } catch (err) {
      result = {success: false, message: err.toString()};
    }
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// Hàm format ngày có thứ
function formatDateWithDay(dateParam) {
  if (!dateParam) return '';
  let d = dateParam instanceof Date ? dateParam : new Date(dateParam);
  if (isNaN(d.getTime())) return String(dateParam);
  
  const days = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  const dayName = days[d.getDay()];
  const dd = ('0' + d.getDate()).slice(-2);
  const mm = ('0' + (d.getMonth() + 1)).slice(-2);
  const yyyy = d.getFullYear();
  return `${dayName}, ${dd}/${mm}/${yyyy}`;
}

// API - Lấy thống kê Dashboard
function getDashboardStats() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  
  // Sĩ số
  const sheetHS = ss.getSheetByName('HOC_SINH');
  const siSo = sheetHS ? Math.max(0, sheetHS.getLastRow() - 1) : 0;
  
  // Ngày hôm nay (format dd/MM/yyyy để so sánh)
  const today = new Date();
  const todayStr = ('0' + today.getDate()).slice(-2) + '/' + ('0' + (today.getMonth()+1)).slice(-2) + '/' + today.getFullYear();
  
  // Vắng hôm nay
  let vangHomNay = 0;
  const sheetDD = ss.getSheetByName('DIEM_DANH');
  if (sheetDD && sheetDD.getLastRow() > 1) {
    const dataDD = sheetDD.getRange(2, 2, sheetDD.getLastRow() - 1, 3).getValues(); // Lấy cột Ngay(2), MaHS(3), TrangThai(4)
    vangHomNay = dataDD.filter(row => {
      let dateStr = row[0] instanceof Date ? 
        ('0' + row[0].getDate()).slice(-2) + '/' + ('0' + (row[0].getMonth()+1)).slice(-2) + '/' + row[0].getFullYear() 
        : String(row[0]);
      return dateStr === todayStr && String(row[2]).toLowerCase().includes('vắng');
    }).length;
  }
  
  // Vi phạm mới hôm nay và Hoạt động gần đây
  let viPhamMoi = 0;
  let allActivities = [];
  
  const sheetKL = ss.getSheetByName('KY_LUAT_KHEN_THUONG');
  if (sheetKL && sheetKL.getLastRow() > 1) {
    const dataKLFull = sheetKL.getRange(2, 1, sheetKL.getLastRow() - 1, sheetKL.getLastColumn()).getValues();
    // Headers: ['ID', 'Ngay', 'MaHS', 'PhanLoai', 'NoiDung', 'HinhThucXuLy']
    dataKLFull.forEach(row => {
      let dateObj = row[1] instanceof Date ? row[1] : new Date(row[1]);
      let dateStr = row[1] instanceof Date ? 
        ('0' + row[1].getDate()).slice(-2) + '/' + ('0' + (row[1].getMonth()+1)).slice(-2) + '/' + row[1].getFullYear() 
        : String(row[1]);
        
      if (dateStr === todayStr && String(row[3]).toLowerCase().includes('vi phạm')) {
        viPhamMoi++;
      }
      
      allActivities.push({
         Ngay: formatDateWithDay(dateObj),
         timestamp: dateObj.getTime() || 0,
         MaHS: row[2],
         PhanLoai: row[3],
         NoiDung: row[4]
      });
    });
  }

  if (sheetDD && sheetDD.getLastRow() > 1) {
    const dataDDFull = sheetDD.getRange(2, 1, sheetDD.getLastRow() - 1, sheetDD.getLastColumn()).getValues();
    // Headers: ['ID', 'Ngay', 'MaHS', 'TrangThai', 'LyDo']
    dataDDFull.forEach(row => {
      let dateObj = row[1] instanceof Date ? row[1] : new Date(row[1]);
        
      allActivities.push({
         Ngay: formatDateWithDay(dateObj),
         timestamp: dateObj.getTime() || 0,
         MaHS: row[2],
         PhanLoai: 'Điểm danh',
         NoiDung: row[3] + (row[4] ? ` (${row[4]})` : '')
      });
    });
  }

  // Sort by timestamp descending and take top 10
  allActivities.sort((a, b) => b.timestamp - a.timestamp);
  const recentActivities = allActivities.slice(0, 10);
  
  // Quỹ lớp
  let quyLop = 0;
  const sheetQuy = ss.getSheetByName('QUY_LOP');
  if (sheetQuy && sheetQuy.getLastRow() > 1) {
    const dataQuy = sheetQuy.getRange(2, 3, sheetQuy.getLastRow() - 1, 3).getValues(); // Lấy cột Loai(3), NoiDung(4), SoTien(5)
    dataQuy.forEach(row => {
      const loai = String(row[0]).toLowerCase();
      const tien = Number(row[2]) || 0;
      if (loai === 'thu' || loai === '') {
        quyLop += tien;
      } else if (loai === 'chi') {
        quyLop -= tien;
      }
    });
  }
  
  return {
    siSo: siSo,
    vangHomNay: vangHomNay,
    viPhamMoi: viPhamMoi,
    quyLop: quyLop,
    recentActivities: recentActivities
  };
}

// API -// LẤY DANH SÁCH HỌC SINH
function getStudents() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName('HOC_SINH');
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  const headers = data[0];
  let result = [];
  for (let i = 1; i < data.length; i++) {
    let row = data[i];
    let obj = {};
    for (let j = 0; j < headers.length; j++) {
      let val = row[j];
      if (val instanceof Date) {
        let d = val.getDate();
        let m = val.getMonth() + 1;
        let y = val.getFullYear();
        val = (d < 10 ? '0'+d : d) + '/' + (m < 10 ? '0'+m : m) + '/' + y;
      }
      obj[headers[j]] = val;
    }
    result.push(obj);
  }
  return result;
}

// THÊM HỌC SINH
function addStudent(data) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName('HOC_SINH');
  
  const id = Utilities.getUuid();
  const row = [
    id,
    data.MaHS || '',
    data.HoTen || '',
    data.NgaySinh || '',
    data.GioiTinh || '',
    data.SDTPhuHuynh || '',
    data.GhiChu || '',
    'Đang học'
  ];
  sheet.appendRow(row);
  return { success: true, message: 'Đã thêm học sinh thành công!' };
}

// SỬA HỌC SINH
function editStudent(data) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName('HOC_SINH');
  const allData = sheet.getDataRange().getValues();
  
  for (let i = 1; i < allData.length; i++) {
    if (allData[i][1] == data.MaHS) { // Cột 1 là MaHS
      // Cập nhật thông tin: HoTen, NgaySinh, GioiTinh, SDTPhuHuynh, GhiChu, TrangThai
      sheet.getRange(i + 1, 3).setValue(data.HoTen || '');
      sheet.getRange(i + 1, 4).setValue(data.NgaySinh || '');
      sheet.getRange(i + 1, 5).setValue(data.GioiTinh || '');
      sheet.getRange(i + 1, 6).setValue(data.SDTPhuHuynh || '');
      sheet.getRange(i + 1, 7).setValue(data.GhiChu || '');
      if (data.TrangThai) sheet.getRange(i + 1, 8).setValue(data.TrangThai);
      return { success: true, message: 'Đã cập nhật thông tin học sinh!' };
    }
  }
  return { success: false, message: 'Không tìm thấy học sinh để cập nhật!' };
}

// ẨN / XÓA HỌC SINH (SOFT DELETE)
function deleteStudent(maHs) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName('HOC_SINH');
  const allData = sheet.getDataRange().getValues();
  
  for (let i = 1; i < allData.length; i++) {
    if (allData[i][1] == maHs) {
      // Đánh dấu TrangThai là "Đã nghỉ"
      sheet.getRange(i + 1, 8).setValue('Đã nghỉ');
      return { success: true, message: 'Đã ẩn (lưu trữ) học sinh thành công!' };
    }
  }
  return { success: false, message: 'Không tìm thấy học sinh!' };
}

// API - Thêm Vi phạm / Khen thưởng
function addDiscipline(data) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName('KY_LUAT_KHEN_THUONG');
    if (!sheet) throw new Error("Không tìm thấy trang tính KY_LUAT_KHEN_THUONG");
    
    const newId = new Date().getTime().toString();
    const dateStr = data.Ngay || (new Date().toLocaleDateString('vi-VN'));
    
    // ['ID', 'Ngay', 'MaHS', 'PhanLoai', 'NoiDung', 'HinhThucXuLy']
    const newRow = [
      newId,
      dateStr,
      data.MaHS || '',
      data.PhanLoai || '',
      data.NoiDung || '',
      data.HinhThucXuLy || ''
    ];
    
    sheet.appendRow(newRow);
    return { success: true, message: "Thêm thành công!", data: newRow };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

// API - Lấy danh sách Vi phạm / Khen thưởng
function getDisciplines() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName('KY_LUAT_KHEN_THUONG');
  if(!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0];
  const disciplines = data.slice(1).map(row => {
    let obj = {};
    headers.forEach((h, i) => {
      // Định dạng ngày tháng nếu là Date
      if (h === 'Ngay') {
         obj[h] = formatDateWithDay(row[i]);
      } else if (row[i] instanceof Date) {
         obj[h] = formatDateWithDay(row[i]);
      } else {
         obj[h] = row[i];
      }
    });
    return obj;
  });
  // Đảo ngược mảng để cái mới nhất lên đầu
  return disciplines.reverse();
}

// API - Lưu điểm danh
function saveAttendance(data) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName('DIEM_DANH');
    if (!sheet) throw new Error("Không tìm thấy trang tính DIEM_DANH");
    
    // Nếu data rỗng -> không có ai vắng
    if (!data || data.length === 0) {
      return { success: true, message: "Tất cả học sinh đều có mặt!" };
    }
    
    // Headers: ['ID', 'Ngay', 'MaHS', 'TrangThai', 'LyDo']
    data.forEach(item => {
      const newId = new Date().getTime().toString() + Math.floor(Math.random()*1000);
      sheet.appendRow([
        newId,
        item.Ngay, // HTML5 date format (YYYY-MM-DD)
        item.MaHS,
        'Vắng mặt',
        ''
      ]);
    });
    
    return { success: true, message: `Đã lưu điểm danh (${data.length} vắng)` };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}

// API - Lấy danh sách tài liệu
function getDocuments() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName('TAI_LIEU_HINH_ANH');
  if(!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0];
  const docs = data.slice(1).map(row => {
    let obj = {};
    headers.forEach((h, i) => {
      if (h === 'NgayTaiLen') {
         obj[h] = formatDateWithDay(row[i]);
      } else if (row[i] instanceof Date) {
         obj[h] = formatDateWithDay(row[i]);
      } else {
         obj[h] = row[i];
      }
    });
    return obj;
  });
  return docs.reverse(); // Mới nhất lên đầu
}

// API - Tải lên tài liệu
function uploadDocument(data) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName('TAI_LIEU_HINH_ANH');
    if (!sheet) throw new Error("Không tìm thấy trang tính TAI_LIEU_HINH_ANH");
    
    let fileUrl = data.LinkDrive || "";
    
    // Nếu có file đính kèm (base64)
    if (data.base64 && FOLDER_ID) {
      const folder = DriveApp.getFolderById(FOLDER_ID);
      const decodedData = Utilities.base64Decode(data.base64);
      const blob = Utilities.newBlob(decodedData, data.mimeType, data.fileName);
      const file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      fileUrl = file.getUrl();
    }
    
    // Tạo ID mới
    const newId = new Date().getTime().toString();
    
    // Headers: ['ID', 'TenTaiLieu', 'Loai', 'LinkDrive', 'NgayTaiLen']
    const newRow = [
      newId,
      data.TenTaiLieu || 'Không tên',
      data.Loai || 'Khác',
      fileUrl,
      new Date()
    ];
    
    sheet.appendRow(newRow);
    
    return { success: true, message: "Tải lên tài liệu thành công!", data: newRow };
  } catch (error) {
    return { success: false, message: error.toString() };
  }
}
