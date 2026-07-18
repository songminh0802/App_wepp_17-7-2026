/**
 * =========================================================================
 * THƯ VIỆN SỐ - GOOGLE APPS SCRIPT BACKEND
 * Phiên bản: 3.0 (Cập nhật: Phân trang Backend + Gộp API Init)
 * =========================================================================
 * CẤU HÌNH HỆ THỐNG
 * Hãy thay thế ID thực tế của bạn vào đây
 */
const CONFIG = {
  SPREADSHEET_ID: "1AyRlVc9nNeCrc3WXxEdJocYOebBB9k2yk1l6MIxQTZ4",
  ROOT_FOLDER_ID: "1RWuw0bELOtiDW1XZ9jEpLVp3XHdc17vo",
  SHEET_NAME: "data",
  ADMIN_PASSWORD: "0788095095"
};

function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('Kho Đề Kiểm Tra')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;
    let result = {};

    switch (action) {
      case 'getData':
        // Cập nhật: Truyền toàn bộ payload để lấy pageToken
        result = getData(payload);
        break;
      case 'getInitialData':
        // MỚI: Gộp API lúc khởi động
        result = getInitialData();
        break;
      case 'getSubfolders':
        result = { success: true, data: getSubfolders(payload.folderId) };
        break;
      case 'searchFiles':
        result = searchFiles(payload.query);
        break;
      case 'createFolder':
        result = createFolder(payload.parentId, payload.folderName);
        break;
      case 'renameFolder':
        result = renameFolder(payload.folderId, payload.newName, payload.adminPassword);
        break;
      case 'deleteFolder':
        result = deleteFolder(payload.folderId, payload.adminPassword);
        break;
      case 'renameFile':
        result = renameFile(payload.fileId, payload.newName, payload.adminPassword);
        break;
      case 'deleteFile':
        result = deleteFile(payload.fileId, payload.adminPassword);
        break;
      case 'incrementDownload':
        incrementDownload(payload.fileId);
        result = { success: true };
        break;
      case 'initiateUpload':
        result = initiateUpload(payload.data);
        break;
      case 'appendChunk':
        result = appendChunk(payload.fileId, payload.base64Data);
        break;
      case 'saveFileMetadata':
        result = saveFileMetadata(payload.fileId, payload.meta);
        break;
      case 'handleUpload':
        result = handleUpload(payload.data);
        break;
      default:
        result = { success: false, error: 'Action not found: ' + action };
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// =========================================================================
// PHẦN 1: ĐỌC DỮ LIỆU
// =========================================================================

function getData(payload) {
  try {
    // payload có thể là object {folderId, pageToken} hoặc string (chuẩn cũ)
    const folderId = typeof payload === 'string' ? payload : payload.folderId;
    const pageToken = typeof payload === 'object' ? payload.pageToken : null;

    const rootId = CONFIG.ROOT_FOLDER_ID;
    const targetId = folderId || rootId;
    const folder = DriveApp.getFolderById(targetId);

    let breadcrumbs = [];
    let folders = [];

    // Chỉ load breadcrumbs và folder tree nếu đây là lần quét đầu tiên (không có pageToken)
    if (!pageToken) {
      let current = folder;
      while (current.getId() !== rootId) {
        breadcrumbs.unshift({ id: current.getId(), name: current.getName() });
        let parents = current.getParents();
        if (parents.hasNext()) {
          current = parents.next();
        } else {
          break;
        }
      }
      breadcrumbs.unshift({ id: rootId, name: "Thư Viện Số" });

      const folderIter = folder.getFolders();
      while (folderIter.hasNext()) {
        const f = folderIter.next();
        folders.push({ id: f.getId(), name: f.getName() });
      }
      folders.sort((a, b) => a.name.localeCompare(b.name));
    }

    const metadataMap = getMetadataMap();
    let files = [];
    let nextPageToken = null;

    if (targetId === rootId && !pageToken) {
      files = getRecentFiles(20, metadataMap);
    } else if (targetId !== rootId) {
      let fileIter;
      if (pageToken) {
        // Tiếp tục vòng lặp từ mã đánh dấu
        fileIter = DriveApp.continueFileIterator(pageToken);
      } else {
        fileIter = folder.getFiles();
      }
      
      // ✅ PHÂN TRANG BACKEND: Chỉ lấy đúng 30 file rồi dừng lại!
      let count = 0;
      while (fileIter.hasNext() && count < 30) {
        const f = fileIter.next();
        files.push(formatFileObject(f, metadataMap, folder.getName()));
        count++;
      }
      
      // Nếu còn file, tạo mã đánh dấu cho lần tải tiếp theo
      if (fileIter.hasNext()) {
        nextPageToken = fileIter.getContinuationToken();
      }
    }

    return {
      success: true,
      data: { 
        currentFolderId: targetId, 
        breadcrumbs: breadcrumbs, 
        folders: folders, 
        files: files,
        nextPageToken: nextPageToken // Thêm token trả về cho Web
      }
    };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// --- HÀM GỘP ĐỂ TỐI ƯU TỐC ĐỘ KHỞI ĐỘNG ---
function getInitialData() {
  try {
    const cache = CacheService.getScriptCache();
    
    // 1. Folders
    let foldersResponse;
    const cachedFolders = cache.get('root_folders_v14');
    if (cachedFolders) {
      foldersResponse = JSON.parse(cachedFolders);
    } else {
      foldersResponse = getSubfolders(CONFIG.ROOT_FOLDER_ID);
      try { cache.put('root_folders_v14', JSON.stringify(foldersResponse), 300); } catch(e) {}
    }
    
    // 2. Recent Files
    let libraryResponse;
    const cachedLibrary = cache.get('recent_library_v14');
    if (cachedLibrary) {
      libraryResponse = JSON.parse(cachedLibrary);
    } else {
      libraryResponse = getData({folderId: null, pageToken: null}); 
      if (libraryResponse.success) {
         try { cache.put('recent_library_v14', JSON.stringify(libraryResponse), 300); } catch(e) {}
      }
    }
    
    return {
      success: true,
      data: {
        folders: foldersResponse,
        library: libraryResponse.success ? libraryResponse.data : null
      }
    };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

function getRecentFiles(limit, metadataMap) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  const data = sheet.getDataRange().getValues();
  const rows = data.slice(1);

  rows.sort((a, b) => {
    const timeA = a[10] ? new Date(a[10]).getTime() : 0;
    const timeB = b[10] ? new Date(b[10]).getTime() : 0;
    return timeB - timeA;
  });

  const results = [];
  let count = 0;
  for (const row of rows) {
    if (count >= limit) break;
    try {
      const f = DriveApp.getFileById(row[0]);
      if (f.isTrashed()) continue;
      const parents = f.getParents();
      const folderName = parents.hasNext() ? parents.next().getName() : "Không xác định";
      results.push(formatFileObject(f, metadataMap, folderName));
      count++;
    } catch (e) { continue; }
  }
  return results;
}

function clearCache() {
  try {
    const cache = CacheService.getScriptCache();
    cache.remove('root_folders_v14');
    cache.remove('recent_library_v14');
  } catch(e) {}
}

function removeVietnameseTones(str) {
  if(!str) return "";
  str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
  str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
  str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
  str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
  str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
  str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
  str = str.replace(/đ/g, "d");
  str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
  str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
  str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
  str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
  str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
  str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
  str = str.replace(/Đ/g, "D");
  return str.toLowerCase();
}

function searchFiles(query) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
    if (!sheet) throw new Error("Không tìm thấy trang tính '" + CONFIG.SHEET_NAME + "'. Vui lòng kiểm tra lại tên Sheet.");
    const data = sheet.getDataRange().getValues();
    const results = [];
    const lowerQuery = removeVietnameseTones(query);

    // Xây dựng metadataMap một lần duy nhất từ data để tăng tốc độ
    const metadataMap = {};
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      metadataMap[row[0]] = {
        uploader:    row[2],
        likes:       parseInt(row[4]) || 0,
        dislikes:    parseInt(row[5]) || 0,
        downloads:   parseInt(row[6]) || 0,
        displayName: row[7] || "",
        fileType:    row[8] || "",
        desc:        row[9] || ""
      };
    }

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const name        = row[1] ? removeVietnameseTones(row[1].toString()) : "";
      const displayName = row[7] ? removeVietnameseTones(row[7].toString()) : "";
      const desc        = row[9] ? removeVietnameseTones(row[9].toString()) : "";

      if (name.includes(lowerQuery) || displayName.includes(lowerQuery) || desc.includes(lowerQuery)) {
        try {
          const f = DriveApp.getFileById(row[0]);
          if (f.isTrashed()) continue;
          const parents = f.getParents();
          const folderName = parents.hasNext() ? parents.next().getName() : "";
          results.push(formatFileObject(f, metadataMap, folderName));
        } catch (e) { continue; }
        if (results.length >= 20) break;
      }
    }
    return { success: true, files: results };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// =========================================================================
// PHẦN 2: QUẢN LÝ THƯ MỤC
// =========================================================================

function createFolder(parentId, folderName) {
  try {
    const parent = DriveApp.getFolderById(parentId || CONFIG.ROOT_FOLDER_ID);
    const newFolder = parent.createFolder(folderName);
    clearCache();
    return { success: true, id: newFolder.getId(), name: newFolder.getName() };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

function renameFolder(folderId, newName, adminPassword) {
  try {
    if (adminPassword !== CONFIG.ADMIN_PASSWORD) return { success: false, error: "Sai mật khẩu quản trị!" };
    if (!folderId) return { success: false, error: "Thiếu folderId" };
    if (!newName || newName.trim() === "") return { success: false, error: "Tên mới không được để trống" };
    if (folderId === CONFIG.ROOT_FOLDER_ID) return { success: false, error: "Không thể đổi tên thư mục gốc" };

    const folder = DriveApp.getFolderById(folderId);
    folder.setName(newName.trim());
    clearCache();
    return { success: true, id: folderId, name: newName.trim() };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

function deleteFolder(folderId, adminPassword) {
  try {
    if (adminPassword !== CONFIG.ADMIN_PASSWORD) return { success: false, error: "Sai mật khẩu quản trị!" };
    if (!folderId) return { success: false, error: "Thiếu folderId" };
    if (folderId === CONFIG.ROOT_FOLDER_ID) return { success: false, error: "Không thể xóa thư mục gốc" };

    const folder = DriveApp.getFolderById(folderId);
    _deleteMetadataForFolder(folder);
    folder.setTrashed(true);

    return { success: true };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

function _deleteMetadataForFolder(folder) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);

    const fileIds = [];
    _collectFileIds(folder, fileIds);
    if (fileIds.length === 0) return;

    const data = sheet.getDataRange().getValues();
    const rowsToDelete = [];
    for (let i = 1; i < data.length; i++) {
      if (fileIds.includes(data[i][0])) rowsToDelete.push(i + 1);
    }
    for (let i = rowsToDelete.length - 1; i >= 0; i--) {
      sheet.deleteRow(rowsToDelete[i]);
    }
  } catch (e) {
    console.error("_deleteMetadataForFolder:", e.toString());
  }
}

function _collectFileIds(folder, idList) {
  const fileIter = folder.getFiles();
  while (fileIter.hasNext()) idList.push(fileIter.next().getId());
  const subIter = folder.getFolders();
  while (subIter.hasNext()) _collectFileIds(subIter.next(), idList);
}

function renameFile(fileId, newName, adminPassword) {
  try {
    if (adminPassword !== CONFIG.ADMIN_PASSWORD) return { success: false, error: "Sai mật khẩu quản trị!" };
    if (!fileId) return { success: false, error: "Thiếu fileId" };
    if (!newName || newName.trim() === "") return { success: false, error: "Tên mới không được để trống" };

    const file = DriveApp.getFileById(fileId);
    file.setName(newName.trim());
    _updateMetadataForFile(fileId, { displayName: newName.trim() });
    
    clearCache();
    return { success: true, id: fileId, name: newName.trim() };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

function deleteFile(fileId, adminPassword) {
  try {
    if (adminPassword !== CONFIG.ADMIN_PASSWORD) return { success: false, error: "Sai mật khẩu quản trị!" };
    if (!fileId) return { success: false, error: "Thiếu fileId" };

    const file = DriveApp.getFileById(fileId);
    file.setTrashed(true);
    _deleteMetadataForFile(fileId);
    clearCache();
    return { success: true };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

function _updateMetadataForFile(fileId, updates) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
    if (!sheet) return;
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === fileId) {
        if (updates.displayName !== undefined) {
          sheet.getRange(i + 1, 8).setValue(updates.displayName); // Cột 8 (H) là displayName
        }
        break;
      }
    }
  } catch (e) { console.error("_updateMetadataForFile:", e); }
}

function _deleteMetadataForFile(fileId) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
    if (!sheet) return;
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === fileId) {
        sheet.deleteRow(i + 1);
        break;
      }
    }
  } catch (e) { console.error("_deleteMetadataForFile:", e); }
}

// =========================================================================
// PHẦN 3: UPLOAD FILE
// =========================================================================

function handleUpload(data) {
  try {
    const parentFolder = DriveApp.getFolderById(data.folderId || CONFIG.ROOT_FOLDER_ID);
    const blob = Utilities.newBlob(Utilities.base64Decode(data.fileData), data.mimeType, data.fileName);
    const file = parentFolder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEET_NAME);
    if (!sheet) throw new Error("Không tìm thấy trang tính '" + CONFIG.SHEET_NAME + "'.");
    sheet.appendRow([
      file.getId(), data.fileName, data.uploaderName, data.uploaderEmail,
      0, 0, 0,
      data.displayName, data.fileType, data.description, new Date()
    ]);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

function initiateUpload(data) {
  try {
    const parentFolder = DriveApp.getFolderById(data.folderId || CONFIG.ROOT_FOLDER_ID);
    const blob = Utilities.newBlob(Utilities.base64Decode(data.fileData), data.mimeType, data.fileName);
    const file = parentFolder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return { success: true, fileId: file.getId() };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

function appendChunk(fileId, base64Data) {
  try {
    const file = DriveApp.getFileById(fileId);
    const newBytes = Utilities.base64Decode(base64Data);
    const combinedBlob = Utilities.newBlob(
      [...file.getBlob().getBytes(), ...newBytes],
      file.getMimeType(), file.getName()
    );
    file.setContent(combinedBlob);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

function saveFileMetadata(fileId, meta) {
  try {
    const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEET_NAME);
    if (!sheet) throw new Error("Không tìm thấy trang tính '" + CONFIG.SHEET_NAME + "'.");
    sheet.appendRow([
      fileId, meta.fileName, meta.uploaderName, meta.uploaderEmail,
      0, 0, 0,
      meta.displayName, meta.fileType, meta.description, new Date()
    ]);
    return { success: true, id: fileId };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// =========================================================================
// PHẦN 4: VOTE / DOWNLOAD / LEADERBOARD
// =========================================================================


function incrementDownload(fileId) {
  const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) throw new Error("Không tìm thấy trang tính '" + CONFIG.SHEET_NAME + "'.");
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == fileId) {
      sheet.getRange(i + 1, 7).setValue(data[i][6] + 1);
      return;
    }
  }
}

function getLeaderboard() {
  try {
    const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEET_NAME);
    if (!sheet) throw new Error("Không tìm thấy trang tính '" + CONFIG.SHEET_NAME + "'.");
    const data = sheet.getDataRange().getValues();
    const userMap = {};

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[0]) continue;
      const name = row[2] ? row[2].toString().trim() : "Ẩn danh";
      if (!userMap[name]) userMap[name] = { name, totalFiles: 0, likes: 0, dislikes: 0, downloads: 0 };
      userMap[name].totalFiles  += 1;
      userMap[name].likes       += (parseInt(row[4]) || 0);
      userMap[name].dislikes    += (parseInt(row[5]) || 0);
      userMap[name].downloads   += (parseInt(row[6]) || 0);
    }

    let users = Object.values(userMap);
    users.sort((a, b) => {
      const sA = a.totalFiles * 10 + a.likes * 3 + a.downloads;
      const sB = b.totalFiles * 10 + b.likes * 3 + b.downloads;
      return sB - sA;
    });
    return { success: true, data: users };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// =========================================================================
// PHẦN 5: HELPER FUNCTIONS
// =========================================================================

function formatFileObject(f, metadataMap, folderName) {
  const id = f.getId();
  const name = f.getName();
  const meta = metadataMap[id] || {
    uploader: 'Admin', likes: 0, dislikes: 0, downloads: 0,
    displayName: name, fileType: 'Tài liệu', desc: ''
  };
  return {
    id,
    name: name,
    displayName: meta.displayName || name,
    fileType:    meta.fileType,
    description: meta.desc,
    mimeType:    f.getMimeType(),
    size:        (f.getSize() / 1024 / 1024).toFixed(2) + " MB",
    downloadUrl: `https://drive.google.com/uc?export=download&id=${id}`,
    viewUrl:     f.getUrl(),
    uploader:    meta.uploader,
    downloads:   meta.downloads,
    folderName:  folderName || ""
  };
}

function getMetadataMap() {
  const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) throw new Error("Không tìm thấy trang tính '" + CONFIG.SHEET_NAME + "'.");
  const data = sheet.getDataRange().getValues();
  const map = {};
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    map[row[0]] = {
      uploader:    row[2],
      downloads:   parseInt(row[6]) || 0,
      displayName: row[7] || "",
      fileType:    row[8] || "",
      desc:        row[9] || ""
    };
  }
  return map;
}

function getSubfolders(folderId) {
  try {
    const parent = DriveApp.getFolderById(folderId || CONFIG.ROOT_FOLDER_ID);
    const subs = parent.getFolders();
    const list = [];
    while (subs.hasNext()) {
      const s = subs.next();
      list.push({ id: s.getId(), name: s.getName(), hasSubfolders: s.getFolders().hasNext() });
    }
    list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  } catch (e) {
    return [];
  }
}
