function doGet(e) {
  // Bắt các request API
  if (e && e.parameter && e.parameter.action) {
    let result = null;
    let action = e.parameter.action;
    
    try {
      if (action === 'getStudents') result = getStudents();
      else if (action === 'getDashboardStats') result = getDashboardStats();
      else if (action === 'getDisciplines') result = getDisciplines();
      else if (action === 'getDocuments') result = getDocuments();
      else if (action === 'getAttendanceHistory') result = getAttendanceHistory();
      else if (action === 'addStudent') result = addStudent(JSON.parse(e.parameter.data));
      else if (action === 'editStudent') result = editStudent(JSON.parse(e.parameter.data));
      else if (action === 'deleteStudent') result = deleteStudent(e.parameter.maHs);
      else if (action === 'addDiscipline') result = addDiscipline(JSON.parse(e.parameter.data));
      else if (action === 'saveAttendance') result = saveAttendance(JSON.parse(e.parameter.data));
      else if (action === 'uploadDocument') result = uploadDocument(JSON.parse(e.parameter.data));
    } catch(err) {
      result = {success: false, message: err.toString()};
    }
    
    if (e.parameter.callback) {
      return ContentService.createTextOutput(e.parameter.callback + '(' + JSON.stringify(result) + ')')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    } else {
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  // Điều hướng (Routing) UI
  var page = (e && e.parameter && e.parameter.page) ? e.parameter.page : 'diemanh';
  var template = HtmlService.createTemplateFromFile(page);
  
  return template.evaluate()
    .setTitle('Quản Lý Lớp Chủ Nhiệm')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// Hàm include cho các phần dùng chung nếu cần
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
