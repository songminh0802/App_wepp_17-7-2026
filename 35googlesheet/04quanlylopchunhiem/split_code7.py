import re

with open('code7.gs', 'r', encoding='utf-8') as f:
    content = f.read()

# We want to extract getDocuments and uploadDocument
# We can find them using regex
# getDocuments
match_getDoc = re.search(r'(function getDocuments\(\) \{.*?\n\}(?=\nfunction|$))', content, re.DOTALL)
# uploadDocument
match_uploadDoc = re.search(r'(function uploadDocument\(data\) \{.*?\n\}(?=\nfunction|$))', content, re.DOTALL)

hinhanh_content = ""
if match_getDoc:
    hinhanh_content += match_getDoc.group(1) + "\n\n"
    content = content.replace(match_getDoc.group(1), "")

if match_uploadDoc:
    hinhanh_content += match_uploadDoc.group(1) + "\n\n"
    content = content.replace(match_uploadDoc.group(1), "")

# We also should extract doGetOld and doPost to remove them since router.gs handles it
match_doGet = re.search(r'(function doGetOld\(e\) \{.*?\n\}(?=\nfunction|$))', content, re.DOTALL)
if match_doGet:
    content = content.replace(match_doGet.group(1), "")

match_doPost = re.search(r'(function doPost\(e\) \{.*?\n\}(?=\nfunction|$))', content, re.DOTALL)
if match_doPost:
    content = content.replace(match_doPost.group(1), "")

# The rest goes to code_diemanh.gs
with open('code_diemanh.gs', 'w', encoding='utf-8') as f:
    f.write(content.strip() + "\n")

with open('code_hinhanh.gs', 'w', encoding='utf-8') as f:
    f.write("// === BACKEND TAB HÌNH ẢNH / TÀI LIỆU ===\n\n" + hinhanh_content.strip() + "\n")

