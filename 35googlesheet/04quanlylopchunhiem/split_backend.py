import re

with open('code7.gs', 'r', encoding='utf-8') as f:
    content = f.read()

# We need to extract the parts. Let's extract the doGet function from code7.gs and modify it for router.gs
doGet_match = re.search(r'(function doGetOld\(e\).*?\n})', content, re.DOTALL)
doGet_content = doGet_match.group(1).replace('doGetOld', 'doGet')

# Modify doGet to load the right template based on page
router_code = doGet_content.replace(
    """  // Mặc định trả về giao diện HTML
  var template = HtmlService.createTemplateFromFile('index8');""",
    """  // Route dựa trên tham số page
  var page = (e && e.parameter && e.parameter.page) ? e.parameter.page : 'diemanh';
  var template = HtmlService.createTemplateFromFile(page);"""
)

# And replace index3 or whatever it was with page
router_code = re.sub(r"var template = HtmlService\.createTemplateFromFile\('.*?'\);",
    "var page = (e && e.parameter && e.parameter.page) ? e.parameter.page : 'diemanh';\n  var template = HtmlService.createTemplateFromFile(page);", 
    doGet_content)

router_code = router_code.replace("doGetOld", "doGet")
# Wait, code7.gs has it as index8
# We will just write a new router.gs

with open('router.gs', 'w', encoding='utf-8') as f:
    f.write("""function doGet(e) {
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
""")
