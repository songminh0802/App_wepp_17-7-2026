const SHEET_ID = '1Dc7dFtLIaF6gAcvwvPspSP1nh3rz60pp769d0qePGpk'; // Đổi ID file Sheet của bạn vào đây

function doPost(e) {
  try {
    let params = JSON.parse(e.postData.contents);
    let action = params.action;
    let payload = params.data;
    let result = {};

    switch(action) {
      case 'getTeacherStats':
        result = {
          progress: getSheetData('StudentProgress'),
          users: getSheetData('Users')
        };
        break;
        
      case 'getTeacherData':
        result = {
          courses: getSheetData('Courses'),
          videos: getSheetData('Videos')
        };
        break;
        
      case 'getStudentData':
        let uid = payload.uid;
        let allVideos = getSheetData('Videos');
        let visibleVideos = allVideos.filter(s => s.trang_thai_hien === true || s.trang_thai_hien === 'TRUE');
        
        let allNotes = getSheetData('StudentNotes');
        let userNotes = allNotes.filter(n => n.id_hocsinh === uid);
        
        let allProgress = getSheetData('StudentProgress');
        let userProgress = allProgress.filter(p => p.id_hocsinh === uid);
        
        result = {
          courses: getSheetData('Courses'),
          videos: visibleVideos,
          notes: userNotes,
          progress: userProgress 
        };
        break;

      case 'saveProgress':
        saveStudentProgress(payload);
        result = { success: true };
        break;

      case 'saveCourse':
        saveRow('Courses', 'id_course', payload);
        result = { success: true };
        break;

      case 'saveVideo':
        saveRow('Videos', 'id_video', payload);
        result = { success: true };
        break;

      case 'saveNote':
        saveStudentNote(payload);
        result = { success: true };
        break;
      
      case 'deleteVideo':
        deleteRows('Videos', 'id_video', payload);
        result = { success: true };
        break;
        
      case 'deleteCourse':
        deleteRows('Courses', 'id_course', [payload]);
        deleteRows('Videos', 'id_course', [payload]);
        result = { success: true };
        break;

      case 'saveMultipleVideos':
        saveMultipleVideos(payload);
        result = { success: true };
        break;

      case 'syncUser':
        syncUserInfo(payload);
        result = { success: true };
        break;

      default:
        result = { error: 'Action not found' };
    }
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ error: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doOptions(e) {
  var headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, GET, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Max-Age": "86400" };
  return ContentService.createTextOutput("").setHeaders(headers);
}

// CÁC HÀM HELPER GIỮ NGUYÊN LOGIC CỦA BẠN
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

function saveRow(sheetName, primaryKeyField, dataObj) {
  let sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(sheetName);
  let data = sheet.getDataRange().getValues();
  let headers = data[0];
  let primaryKeyIdx = headers.indexOf(primaryKeyField);
  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][primaryKeyIdx] == dataObj[primaryKeyField]) { rowIndex = i + 1; break; }
  }
  let rowToWrite = headers.map(h => dataObj[h] !== undefined ? dataObj[h] : "");
  if (rowIndex > -1) sheet.getRange(rowIndex, 1, 1, rowToWrite.length).setValues([rowToWrite]);
  else sheet.appendRow(rowToWrite);
}

function saveStudentNote(dataObj) {
  let sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('StudentNotes');
  let data = sheet.getDataRange().getValues();
  let headers = data[0];
  let idxHS = headers.indexOf('id_hocsinh'), idxPhan = headers.indexOf('id_video');
  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][idxHS] == dataObj.id_hocsinh && data[i][idxPhan] == dataObj.id_video) { rowIndex = i + 1; break; }
  }
  let rowToWrite = headers.map(h => dataObj[h] !== undefined ? dataObj[h] : "");
  if (rowIndex > -1) sheet.getRange(rowIndex, 1, 1, rowToWrite.length).setValues([rowToWrite]);
  else sheet.appendRow(rowToWrite);
}

function deleteRows(sheetName, keyField, valuesToDelete) {
  let sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(sheetName);
  if (!sheet) return;
  let data = sheet.getDataRange().getValues();
  let headers = data[0];
  let keyIdx = headers.indexOf(keyField);
  for (let i = data.length - 1; i > 0; i--) {
    if (valuesToDelete.includes(data[i][keyIdx])) sheet.deleteRow(i + 1);
  }
}

function saveStudentProgress(dataObj) {
  let sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('StudentProgress');
  if(!sheet) return;
  let data = sheet.getDataRange().getValues();
  let headers = data[0];
  let idxHS = headers.indexOf('id_hocsinh'), idxTL = headers.indexOf('id_course'), idxPhanJSON = headers.indexOf('danh_sach_video_json');
  let rowIndex = -1, currentProgressArray = [];
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][idxHS] == dataObj.id_hocsinh && data[i][idxTL] == dataObj.id_course) {
      rowIndex = i + 1;
      try { currentProgressArray = JSON.parse(data[i][idxPhanJSON] || "[]"); } catch(e) { currentProgressArray = []; }
      break;
    }
  }
  
  if (!currentProgressArray.includes(dataObj.id_video)) currentProgressArray.push(dataObj.id_video);
  else return; 
  
  let jsonString = JSON.stringify(currentProgressArray);
  if (rowIndex > -1) sheet.getRange(rowIndex, idxPhanJSON + 1).setValue(jsonString);
  else {
    let rowToWrite = headers.map(h => {
      if (h === 'id_hocsinh') return dataObj.id_hocsinh;
      if (h === 'id_course') return dataObj.id_course;
      if (h === 'danh_sach_video_json') return jsonString;
      return "";
    });
    sheet.appendRow(rowToWrite);
  }
}

function saveMultipleVideos(sectionsArray) {
  let sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Videos');
  let data = sheet.getDataRange().getValues();
  let headers = data[0], idIdx = headers.indexOf('id_video');
  sectionsArray.forEach(secObj => {
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) { if (data[i][idIdx] == secObj.id_video) { rowIndex = i + 1; break; } }
    let rowToWrite = headers.map(h => secObj[h] !== undefined ? secObj[h] : "");
    if (rowIndex > -1) sheet.getRange(rowIndex, 1, 1, rowToWrite.length).setValues([rowToWrite]);
    else sheet.appendRow(rowToWrite);
  });
}

function syncUserInfo(dataObj) {
  let sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Users');
  if(!sheet) return;
  let data = sheet.getDataRange().getValues();
  let headers = data[0], idxUid = headers.indexOf('uid'), rowIndex = -1;
  for (let i = 1; i < data.length; i++) { if (data[i][idxUid] == dataObj.uid) { rowIndex = i + 1; break; } }
  let rowToWrite = headers.map(h => dataObj[h] !== undefined ? dataObj[h] : "");
  if (rowIndex > -1) sheet.getRange(rowIndex, 1, 1, rowToWrite.length).setValues([rowToWrite]);
  else sheet.appendRow(rowToWrite);
}