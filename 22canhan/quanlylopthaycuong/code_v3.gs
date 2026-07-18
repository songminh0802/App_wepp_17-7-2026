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
      case 'setupDailyTrigger': result = setupDailyTrigger(); break;
      case 'testNotification': result = sendDailyScheduleReminder(); break;
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
      const updatedRow = headers.map((h, colIndex) => payload[h] !== undefined ? payload[h] : data[i][colIndex]);
      sheet.getRange(i + 1, 1, 1, headers.length).setValues([updatedRow]);
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
      const updatedRow = headers.map((h, colIndex) => payload[h] !== undefined ? payload[h] : data[i][colIndex]);
      sheet.getRange(i + 1, 1, 1, headers.length).setValues([updatedRow]);
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
  
  const newRows = [];
  let isDataModified = false;
  
  records.forEach(record => {
    let updated = false;
    let oldStatus = '';
    
    // Check if exists
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][1]) === String(record.Ngay) && String(data[i][2]) === String(record.HocSinhID)) {
         oldStatus = String(data[i][headers.indexOf('TrangThai')]);
         data[i][headers.indexOf('TrangThai')] = record.TrangThai;
         data[i][headers.indexOf('GhiChu')] = record.GhiChu;
         updated = true;
         isDataModified = true;
         break;
      }
    }
    
    // Insert new
    if (!updated) {
      const id = 'DD' + Utilities.formatDate(new Date(), "GMT+7", "yyMMddHHmmss") + Math.floor(Math.random()*1000);
      record.ID = id;
      const newRow = headers.map(h => record[h] !== undefined ? record[h] : "");
      newRows.push(newRow);
    }
    
    // BỔ SUNG: Cảnh báo vắng mặt qua Telegram (Nếu cần)
    if (record.TrangThai !== oldStatus && (record.TrangThai === 'Nghỉ không phép' || record.TrangThai === 'Nghỉ có phép' || record.TrangThai === 'Đi muộn')) {
       // Bỏ comment dòng dưới nếu muốn nhận tin nhắn báo HS vắng vào Telegram
       // const msg = `⚠️ Học sinh ${record.HoTen} (${record.Lop}) vắng mặt/đi muộn (${record.TrangThai}) vào ngày ${record.Ngay}. Phụ huynh: ${studentPhones[String(record.HocSinhID)] || 'N/A'}`;
       // sendTelegramMessage(msg); 
    }
  });
  
  // TỐI ƯU HÓA BACKEND: Ghi dữ liệu bằng mảng 2 chiều (setValues) thay vì setValue từng ô
  if (isDataModified && newRows.length === 0) {
    sheet.getRange(1, 1, data.length, headers.length).setValues(data);
  } else if (!isDataModified && newRows.length > 0) {
    sheet.getRange(data.length + 1, 1, newRows.length, headers.length).setValues(newRows);
  } else if (isDataModified && newRows.length > 0) {
    const finalData = data.concat(newRows);
    sheet.getRange(1, 1, finalData.length, headers.length).setValues(finalData);
  }
  
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

// ==========================================
// TÍNH NĂNG NHẮC NHỞ TELEGRAM (CRON JOB)
// ==========================================

function getSettings() {
  const props = PropertiesService.getScriptProperties();
  return {
    platform: props.getProperty('NOTIFY_PLATFORM') || 'telegram',
    telegramToken: props.getProperty('TELEGRAM_TOKEN') || '',
    telegramChatId: props.getProperty('TELEGRAM_CHAT_ID') || ''
  };
}

function saveSettings(payload) {
  const props = PropertiesService.getScriptProperties();
  props.setProperty('NOTIFY_PLATFORM', payload.platform || 'telegram');
  props.setProperty('TELEGRAM_TOKEN', payload.telegramToken || '');
  props.setProperty('TELEGRAM_CHAT_ID', payload.telegramChatId || '');
  return getSettings();
}

function setupDailyTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'sendDailyScheduleReminder') {
      return { success: true, message: 'Đã bật nhắc nhở trước đó rồi. Đừng lo lắng nhé!' };
    }
  }
  ScriptApp.newTrigger('sendDailyScheduleReminder')
           .timeBased()
           .atHour(6) // 6:00 Sáng
           .nearMinute(0)
           .everyDays(1)
           .create();
  return { success: true, message: 'Đã bật nhắc nhở thành công. Hệ thống sẽ tự gửi báo cáo vào 6:00 sáng mai.' };
}

function sendDailyScheduleReminder() {
  const sheet = getSheet('LichDay');
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { success: true, message: 'Không có dữ liệu lịch dạy' };
  
  const headers = data[0];
  const today = new Date();
  const todayDowJS = today.getDay(); // 0 is Sunday
  const todayDow = todayDowJS === 0 ? '0' : (todayDowJS + 1).toString();
  const todayIso = Utilities.formatDate(today, "GMT+7", "yyyy-MM-dd");
  
  let schedulesToday = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const item = {};
    headers.forEach((h, idx) => item[h] = row[idx]);
    
    if (item.LoaiLich === 'Nghỉ dạy') continue;
    
    const isOneTime = (item.LoaiLich && item.LoaiLich !== 'Cố định');
    if (isOneTime) {
      if (item.NgayBatDau === todayIso) schedulesToday.push(item);
    } else {
      if (String(item.Thu) === todayDow) {
        if (!item.NgayBatDau || item.NgayBatDau <= todayIso) {
           schedulesToday.push(item);
        }
      }
    }
  }
  
  if (schedulesToday.length === 0) {
    sendTelegramMessage(`🗓 Chào buổi sáng! Hôm nay (${Utilities.formatDate(today, "GMT+7", "dd/MM/yyyy")}) bạn không có lịch dạy hay hội họp nào. Hãy tận hưởng ngày nghỉ nhé!`);
    return { success: true, message: 'Đã gửi (không có lịch)' };
  }
  
  // Sort by time
  schedulesToday.sort((a,b) => String(a.GioBatDau).localeCompare(String(b.GioBatDau)));
  
  let msg = `🗓 LỊCH TRÌNH HÔM NAY (${Utilities.formatDate(today, "GMT+7", "dd/MM/yyyy")}):\n\n`;
  schedulesToday.forEach(s => {
    msg += `🕒 ${s.GioBatDau} - ${s.GioKetThuc}\n`;
    msg += `📚 Lớp: ${s.Lop} (${s.MonHoc})\n`;
    if (s.PhongHoc) msg += `📍 Phòng: ${s.PhongHoc}\n`;
    msg += `---------------------------\n`;
  });
  
  sendTelegramMessage(msg);
  return { success: true, message: 'Đã gửi lịch thành công' };
}

function sendTelegramMessage(message) {
  const props = PropertiesService.getScriptProperties();
  const token = props.getProperty('TELEGRAM_TOKEN');
  const chatId = props.getProperty('TELEGRAM_CHAT_ID');
  
  if (!token || !chatId) return;
  
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const payload = { chat_id: chatId, text: message };
  
  try {
    UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
  } catch(e) {
    console.error("Telegram Webhook Error: ", e);
  }
}
