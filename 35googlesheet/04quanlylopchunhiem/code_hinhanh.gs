// === BACKEND TAB HÌNH ẢNH / TÀI LIỆU ===

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
