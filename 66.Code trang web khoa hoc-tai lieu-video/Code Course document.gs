/**
 * BACKEND API - GOOGLE APPS SCRIPT
 * Quản lý Backend bằng Spreadsheet
 */

const SHEET_ID = '1hKDlN8EiH1LWRjfqEfWuMrempd51b98YBr903UGcjJc'; // Đổi ID file Sheet của bạn vào đây

// Thiết lập CORS và xử lý Request
function doPost(e) {
  try {
    // Frontend gửi JSON stringified trong body
    let params = JSON.parse(e.postData.contents);
    let action = params.action;
    let payload = params.data;
    let result = {};

    switch(action) {

      case 'getTeacherStats':
        // Gọi API dành riêng cho việc load thống kê (tránh nặng data lúc ban đầu)
        result = {
          progress: getSheetData('StudentProgress'),
          users: getSheetData('Users') // DÒNG NÀY QUYẾT ĐỊNH VIỆC HIỂN THỊ TÊN
        };
        break;
        
      case 'getTeacherData':
        result = {
          documents: getSheetData('Documents'),
          sections: getSheetData('Sections')
        };
        break;
        
      case 'getStudentData':
        let uid = payload.uid;
        // Chỉ lấy Section trạng thái hiện (TRUE)
        let allSections = getSheetData('Sections');
        let visibleSections = allSections.filter(s => s.trang_thai_hien === true || s.trang_thai_hien === 'TRUE');
        
        // Chỉ lấy note của học sinh này
        let allNotes = getSheetData('StudentNotes');
        let userNotes = allNotes.filter(n => n.id_hocsinh === uid);
        // --- THÊM 2 DÒNG NÀY ĐỂ TẢI TIẾN ĐỘ ---
        let allProgress = getSheetData('StudentProgress');
        let userProgress = allProgress.filter(p => p.id_hocsinh === uid);
        
        result = {
          documents: getSheetData('Documents'),
          sections: visibleSections,
          notes: userNotes,
          progress: userProgress // --- TRẢ VỀ THÊM BIẾN NÀY ---
        };
        break;

      case 'saveProgress':
        saveStudentProgress(payload);
        result = { success: true };
        break;

      case 'saveDocument':
        saveRow('Documents', 'id_tailieu', payload);
        result = { success: true };
        break;

      case 'saveSection':
        saveRow('Sections', 'id_phan', payload);
        result = { success: true };
        break;

      case 'saveNote':
        // Payload cần có { id_hocsinh, id_phan, noi_dung_ghichu }
        saveStudentNote(payload);
        result = { success: true };
        break;
      
      case 'deleteSection':
        // payload là một mảng các id_phan cần xóa, ví dụ: ["sec_123", "sec_456"]
        deleteRows('Sections', 'id_phan', payload);
        result = { success: true };
        break;
        
      case 'deleteDocument':
        // payload là id_tailieu
        deleteRows('Documents', 'id_tailieu', [payload]);
        // Xóa luôn các mục lục con thuộc tài liệu này
        deleteRows('Sections', 'id_tailieu', [payload]); 
        result = { success: true };
        break;

      case 'uploadImage':
        result = uploadImageToDrive(payload);
        break;

      case 'saveMultipleSections':
        saveMultipleSections(payload); // Payload là một mảng các Sections
        result = { success: true };
        break;

      case 'syncUser':
        syncUserInfo(payload);
        result = { success: true };
        break;

      
      default:
        result = { error: 'Action not found' };
    }

    return ContentService.createTextOutput(JSON.stringify(result))
                         .setMimeType(ContentService.MimeType.JSON);
                         
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ error: error.toString() }))
                         .setMimeType(ContentService.MimeType.JSON);
  }
}

// Xử lý preflight CORS (OPTIONS) do FETCH POST yêu cầu
function doOptions(e) {
  var headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400"
  };
  return ContentService.createTextOutput("").setHeaders(headers);
}

/**
 * HELPER: Lấy toàn bộ mảng Object từ 1 Sheet
 */
function getSheetData(sheetName) {
  let sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(sheetName);
  if (!sheet) return [];
  let data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  let headers = data.shift();
  return data.map(row => {
    let obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}

/**
 * HELPER: Lưu/Cập nhật dữ liệu vào Sheet
 * Kiểm tra primaryKey, nếu có thì Update, chưa có thì Insert
 */
function saveRow(sheetName, primaryKeyField, dataObj) {
  let sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(sheetName);
  let data = sheet.getDataRange().getValues();
  let headers = data[0];
  
  let primaryKeyIdx = headers.indexOf(primaryKeyField);
  let rowIndex = -1;
  
  // Tìm xem row đã tồn tại chưa
  for (let i = 1; i < data.length; i++) {
    if (data[i][primaryKeyIdx] == dataObj[primaryKeyField]) {
      rowIndex = i + 1; // +1 vì mảng index từ 0, sheet từ 1
      break;
    }
  }

  // Chuẩn bị mảng row data để ghi theo đúng thứ tự cột
  let rowToWrite = headers.map(h => dataObj[h] !== undefined ? dataObj[h] : "");

  if (rowIndex > -1) {
    // Update
    sheet.getRange(rowIndex, 1, 1, rowToWrite.length).setValues([rowToWrite]);
  } else {
    // Insert
    sheet.appendRow(rowToWrite);
  }
}

/**
 * HELPER: Lưu Ghi Chú Học Sinh
 * Key phức hợp: id_hocsinh + id_phan
 */
function saveStudentNote(dataObj) {
  let sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('StudentNotes');
  let data = sheet.getDataRange().getValues();
  let headers = data[0];
  
  let idxHS = headers.indexOf('id_hocsinh');
  let idxPhan = headers.indexOf('id_phan');
  let rowIndex = -1;
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][idxHS] == dataObj.id_hocsinh && data[i][idxPhan] == dataObj.id_phan) {
      rowIndex = i + 1;
      break;
    }
  }
  
  let rowToWrite = headers.map(h => dataObj[h] !== undefined ? dataObj[h] : "");
  if (rowIndex > -1) {
    sheet.getRange(rowIndex, 1, 1, rowToWrite.length).setValues([rowToWrite]);
  } else {
    sheet.appendRow(rowToWrite);
  }
}


/**
 * HELPER: Xóa nhiều dòng cùng lúc dựa trên một mảng các giá trị Key
 */
function deleteRows(sheetName, keyField, valuesToDelete) {
  let sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(sheetName);
  if (!sheet) return;
  
  let data = sheet.getDataRange().getValues();
  let headers = data[0];
  let keyIdx = headers.indexOf(keyField);
  
  // Quan trọng: Phải xóa từ dưới lên trên (để index các dòng không bị nhảy khi đang xóa)
  for (let i = data.length - 1; i > 0; i--) {
    if (valuesToDelete.includes(data[i][keyIdx])) {
      sheet.deleteRow(i + 1); // +1 vì mảng index từ 0, sheet row index từ 1
    }
  }
}


/**
 * HELPER: Lưu tiến độ học sinh (Gộp chung vào 1 ô JSON theo từng Tài liệu)
 */
function saveStudentProgress(dataObj) {
  let sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('StudentProgress');
  if(!sheet) return;
  let data = sheet.getDataRange().getValues();
  let headers = data[0];
  
  let idxHS = headers.indexOf('id_hocsinh');
  let idxTL = headers.indexOf('id_tailieu');
  let idxPhanJSON = headers.indexOf('danh_sach_phan_json');
  
  let rowIndex = -1;
  let currentProgressArray = [];
  
  // Tìm xem Học sinh này đã có dòng lưu tiến độ của Tài liệu này chưa
  for (let i = 1; i < data.length; i++) {
    if (data[i][idxHS] == dataObj.id_hocsinh && data[i][idxTL] == dataObj.id_tailieu) {
      rowIndex = i + 1; // +1 vì index mảng bắt đầu từ 0
      try {
        // Giải mã JSON hiện tại trong ô thành mảng
        currentProgressArray = JSON.parse(data[i][idxPhanJSON] || "[]");
      } catch(e) {
        currentProgressArray = [];
      }
      break;
    }
  }
  
  // Nếu ID phần này chưa có trong mảng thì mới thêm vào
  if (!currentProgressArray.includes(dataObj.id_phan)) {
    currentProgressArray.push(dataObj.id_phan);
  } else {
    return; // Đã học rồi thì không làm gì cả để tránh ghi đè thừa thãi
  }
  
  // Đóng gói mảng trở lại thành chuỗi JSON
  let jsonString = JSON.stringify(currentProgressArray);
  
  if (rowIndex > -1) {
    // Nếu dòng đã tồn tại -> Chỉ cập nhật lại ô chứa JSON
    sheet.getRange(rowIndex, idxPhanJSON + 1).setValue(jsonString);
  } else {
    // Nếu chưa có dòng nào -> Insert dòng mới hoàn toàn
    let rowToWrite = headers.map(h => {
      if (h === 'id_hocsinh') return dataObj.id_hocsinh;
      if (h === 'id_tailieu') return dataObj.id_tailieu;
      if (h === 'danh_sach_phan_json') return jsonString;
      return "";
    });
    sheet.appendRow(rowToWrite);
  }
}


/**
 * Tính năng 1: LƯU HÀNG LOẠT (Mở/Tắt nhiều phần cùng lúc)
 */
function saveMultipleSections(sectionsArray) {
  let sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Sections');
  let data = sheet.getDataRange().getValues();
  let headers = data[0];
  let idIdx = headers.indexOf('id_phan');
  
  // Duyệt qua từng section để Update dòng tương ứng
  sectionsArray.forEach(secObj => {
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][idIdx] == secObj.id_phan) {
        rowIndex = i + 1;
        break;
      }
    }
    let rowToWrite = headers.map(h => secObj[h] !== undefined ? secObj[h] : "");
    if (rowIndex > -1) {
      sheet.getRange(rowIndex, 1, 1, rowToWrite.length).setValues([rowToWrite]);
    } else {
      sheet.appendRow(rowToWrite);
    }
  });
}

/**
 * Tính năng 2: LƯU ẢNH LÊN GOOGLE DRIVE
 */
function uploadImageToDrive(data) {
  let folderName = "ImagesDocument";
  let folder;
  
  // Tìm xem thư mục ImagesDocument đã có chưa
  let folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) {
    folder = folders.next();
  } else {
    // Nếu chưa có thư mục, tự động tạo thư mục nằm cùng cấp với file Google Sheet
    let sheetFileId = SpreadsheetApp.getActiveSpreadsheet().getId();
    let parents = DriveApp.getFileById(sheetFileId).getParents();
    if (parents.hasNext()) {
        folder = parents.next().createFolder(folderName);
    } else {
        folder = DriveApp.createFolder(folderName);
    }
  }
  
  // Giải mã Base64 thành File Blob và lưu vào thư mục
  let blob = Utilities.newBlob(Utilities.base64Decode(data.base64Data), data.mimeType, data.filename);
  let file = folder.createFile(blob);
  
  // Quan Trọng: Chia sẻ file quyền "Bất kỳ ai có liên kết đều có thể xem" thì người khác mới thấy được ảnh
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  
  // Sử dụng định dạng link lh3.googleusercontent.com để vượt qua chính sách chặn nhúng ảnh của Google
  return { url: "https://lh3.googleusercontent.com/d/" + file.getId() };
}

/**
 * HELPER: Cập nhật Danh bạ người dùng (Upsert)
 */
function syncUserInfo(dataObj) {
  let sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Users');
  if(!sheet) return;
  let data = sheet.getDataRange().getValues();
  let headers = data[0];
  let idxUid = headers.indexOf('uid');
  
  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][idxUid] == dataObj.uid) {
      rowIndex = i + 1;
      break;
    }
  }
  
  let rowToWrite = headers.map(h => dataObj[h] !== undefined ? dataObj[h] : "");
  if (rowIndex > -1) {
    // Đã có UID -> Cập nhật tên/email mới nhất
    sheet.getRange(rowIndex, 1, 1, rowToWrite.length).setValues([rowToWrite]);
  } else {
    // Chưa có -> Thêm mới
    sheet.appendRow(rowToWrite);
  }
}
