<?php
// api.php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *"); // Cho phép gọi từ frontend

// Nạp cấu hình
$config = require 'config.php';

$action = $_GET['action'] ?? '';
$cloudName = $config['cloud_name'];
$apiKey = $config['api_key'];
$apiSecret = $config['api_secret'];

// Thư mục gốc bắt buộc (Mặc định là PROJECT nếu chưa có trong config.php)
$rootFolder = $config['root_folder'] ?? 'PROJECT';

// Hàm gọi API Cloudinary (Sử dụng CURL)
function callCloudinary($url, $method = 'GET', $data = null, $apiKey, $apiSecret) {
    $ch = curl_init();
    
    // Cấu hình Basic Auth
    $headers = [
        'Authorization: Basic ' . base64_encode("$apiKey:$apiSecret")
    ];

    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

    if ($method === 'POST') {
        curl_setopt($ch, CURLOPT_POST, true);
        if ($data) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
        }
    } else if ($method === 'DELETE') {
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "DELETE");
    }

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    
    if (curl_errno($ch)) {
        return json_encode(['error' => curl_error($ch)]);
    }
    
    curl_close($ch);
    return $response;
}

// Xử lý các hành động
switch ($action) {
    // 1. Lấy danh sách thư mục
    case 'get_folders':
        // Chỉ lấy các thư mục con nằm trong thư mục gốc
        $url = "https://api.cloudinary.com/v1_1/$cloudName/folders/" . rawurlencode($rootFolder);
        echo callCloudinary($url, 'GET', null, $apiKey, $apiSecret);
        break;

    // 2. Tạo thư mục mới
    case 'create_folder':
        $folderName = $_GET['folder'] ?? '';
        if (!$folderName) {
            echo json_encode(['error' => 'Thiếu tên thư mục']);
            exit;
        }
        
        // Đảm bảo tạo thư mục luôn nằm bên trong thư mục gốc
        $folderName = ltrim($folderName, '/');
        if ($folderName !== $rootFolder && strpos($folderName, $rootFolder . '/') !== 0) {
            $fullPath = $rootFolder . '/' . $folderName;
        } else {
            $fullPath = $folderName;
        }
        
        $url = "https://api.cloudinary.com/v1_1/$cloudName/folders/" . rawurlencode($fullPath);
        echo callCloudinary($url, 'POST', null, $apiKey, $apiSecret);
        break;

    // 3. Lấy danh sách file trong thư mục
    case 'get_files':
        $prefix = $_GET['prefix'] ?? ''; // Tên thư mục
        
        // Bắt buộc tiền tố truy vấn phải nằm trong thư mục gốc
        if ($prefix !== $rootFolder && strpos($prefix, $rootFolder . '/') !== 0) {
            $prefix = $prefix ? $rootFolder . '/' . ltrim($prefix, '/') : $rootFolder;
        }
        
        $url = "https://api.cloudinary.com/v1_1/$cloudName/resources/image/upload";
        if ($prefix) {
            $url .= "?prefix=" . urlencode($prefix) . "&max_results=500";
        }
        echo callCloudinary($url, 'GET', null, $apiKey, $apiSecret);
        break;
        
    // 4. Tạo chữ ký bảo mật để Upload (Để upload trực tiếp từ Client -> Cloudinary cho nhanh)
    case 'sign_upload':
        $timestamp = time();
        $folder = $_GET['folder'] ?? '';
        $publicId = $_GET['public_id'] ?? ''; // <--- Thêm dòng này lấy tên file tùy chỉnh

        // Bắt buộc folder upload lên phải nằm trong thư mục gốc
        if ($folder !== $rootFolder && strpos($folder, $rootFolder . '/') !== 0) {
            $folder = $folder ? $rootFolder . '/' . ltrim($folder, '/') : $rootFolder;
        }

        // Tạo mảng các tham số cần ký
        $params = [
            'folder' => $folder,
            'asset_folder' => $folder, // <-- THÊM DÒNG NÀY ĐỂ ÉP HIỂN THỊ ĐÚNG THƯ MỤC
            'timestamp' => $timestamp,
            'upload_preset' => $config['upload_preset']
        ];

        // Nếu có public_id (tên file mới) thì thêm vào mảng
        if ($publicId) {
            $params['public_id'] = $publicId;
        }

        // QUAN TRỌNG: Cloudinary bắt buộc sắp xếp tham số theo bảng chữ cái (a-z)
        ksort($params);

        // Tạo chuỗi để ký (nối key=value&key=value...)
        $str_to_sign = "";
        foreach ($params as $k => $v) {
            $str_to_sign .= "$k=$v&";
        }
        $str_to_sign = rtrim($str_to_sign, "&"); // Xóa dấu & thừa ở cuối

        // Tạo chữ ký
        $signature = sha1($str_to_sign . $apiSecret);

        echo json_encode([
            'signature' => $signature,
            'timestamp' => $timestamp,
            'api_key' => $apiKey,
            'cloud_name' => $cloudName,
            'upload_preset' => $config['upload_preset']
        ]);
        break;
        
    // 5. Xóa file
    case 'delete_file':
        $publicId = $_GET['public_id'] ?? '';
        if (!$publicId) {
            echo json_encode(['error' => 'Thiếu public_id']);
            exit;
        }
        
        // Bảo mật: Từ chối xóa nếu file không nằm trong thư mục gốc
        if (strpos($publicId, $rootFolder . '/') !== 0) {
            echo json_encode(['error' => 'Không có quyền xóa file ngoài thư mục dự án']);
            exit;
        }

        // Gọi API xóa resource
        // Lưu ý: api xóa nhận tham số public_ids[]
        $url = "https://api.cloudinary.com/v1_1/$cloudName/resources/image/upload?public_ids[]=" . urlencode($publicId);
        echo callCloudinary($url, 'DELETE', null, $apiKey, $apiSecret);
        break;

    // 6. Xóa thư mục
    case 'delete_folder':
        $folderName = $_GET['folder'] ?? '';
        if (!$folderName) {
            echo json_encode(['error' => 'Thiếu tên thư mục']);
            exit;
        }
        
        // Bảo mật: Từ chối xóa nếu thư mục không nằm trong thư mục gốc, và không cho phép xóa chính thư mục gốc
        if (strpos($folderName, $rootFolder . '/') !== 0) {
            echo json_encode(['error' => 'Không có quyền xóa thư mục ngoài dự án']);
            exit;
        }

        // Gọi API xóa folder
        $url = "https://api.cloudinary.com/v1_1/$cloudName/folders/" . rawurlencode($folderName);
        echo callCloudinary($url, 'DELETE', null, $apiKey, $apiSecret);
        break;
    default:
        echo json_encode(['error' => 'Action không hợp lệ']);
        break;
}
?>