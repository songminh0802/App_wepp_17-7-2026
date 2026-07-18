import os
import random

# ==========================================
# SCRIPT TỰ ĐỘNG CẬP NHẬT MENU (DASHBOARD)
# ==========================================
# Hướng dẫn sử dụng:
# Khi bạn tạo thêm một thư mục dự án mới, hãy chạy file này bằng lệnh:
# python3 CapNhatHeThong.py (hoặc mở Terminal, gõ python3 rồi kéo file này vào ấn Enter)
# Hệ thống sẽ tự quét, tự thêm nhãn Database và tự tạo Sub-Dashboard nếu cần.

def get_db_types(folder):
    db_types = set()
    for root, dirs, files in os.walk(folder):
        for file in files:
            if file.endswith('.html') or file.endswith('.js'):
                path = os.path.join(root, file)
                try:
                    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read().lower()
                        if 'firebase' in content or 'gstatic.com/firebasejs' in content:
                            db_types.add('firebase')
                        if 'script.google.com' in content or 'google.script.run' in content:
                            db_types.add('googlesheets')
                except: pass
    return list(db_types) if db_types else ['static']

def generate_subdashboard(folder_path):
    subdirs = [d for d in os.listdir(folder_path) if os.path.isdir(os.path.join(folder_path, d)) and not d.startswith('.')]
    if len(subdirs) == 0: return False
    
    subdirs.sort()
    colors = [('from-blue-400','to-cyan-500'), ('from-purple-400','to-pink-500'), ('from-teal-400','to-emerald-500'), ('from-amber-400','to-orange-500')]
    c_from, c_to = random.choice(colors)
    
    html = f"""<!DOCTYPE html>
<html lang="vi"><head><meta charset="UTF-8"><title>{folder_path}</title>
<script src="https://cdn.tailwindcss.com"></script><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet">
<style>
body{{font-family:'Inter',sans-serif;background:linear-gradient(135deg,#0f172a 0%,#1e1b4b 100%);color:white;min-height:100vh;}}
.glass-card{{background:rgba(255,255,255,0.05);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,0.1);transition:all 0.3s;}}
.glass-card:hover{{transform:translateY(-5px);border:1px solid rgba(255,255,255,0.3);box-shadow:0 10px 30px -10px rgba(255,255,255,0.2);}}
</style></head><body class="p-6 md:p-12"><div class="max-w-7xl mx-auto">
<div class="mb-8"><a href="../index.html" class="glass-card px-4 py-2 rounded-lg text-sm text-gray-200 no-underline hover:text-white">⬅️ Quay lại Menu Tổng</a></div>
<header class="mb-12 text-center"><h1 class="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r {c_from} {c_to} mb-4">{folder_path}</h1></header>
<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
"""
    for sub in subdirs:
        html += f'<a href="./{sub}/" class="glass-card rounded-2xl p-6 text-center text-gray-200 hover:text-white no-underline font-semibold">{sub}</a>\n'
    html += '</div></div></body></html>'
    
    with open(os.path.join(folder_path, 'index.html'), 'w', encoding='utf-8') as f:
        f.write(html)
    return True

directories = [d for d in os.listdir('.') if os.path.isdir(d) and not d.startswith('.')]
directories.sort()

app_data = {}
for d in directories:
    app_data[d] = get_db_types(d)
    if not os.path.isfile(os.path.join(d, 'index.html')):
        generate_subdashboard(d)

html_main = """<!DOCTYPE html>
<html lang="vi"><head><meta charset="UTF-8"><title>Workspace Dashboard</title>
<script src="https://cdn.tailwindcss.com"></script><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet">
<style>
body{font-family:'Inter',sans-serif;background:linear-gradient(135deg,#0f172a 0%,#1e1b4b 100%);color:white;min-height:100vh;margin:0;}
.glass-card{background:rgba(255,255,255,0.05);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,0.1);transition:all 0.3s;position:relative;}
.glass-card:hover{transform:translateY(-5px);border-color:rgba(139,92,246,0.5);}
.badge{position:absolute;top:10px;right:10px;font-size:0.65rem;font-weight:600;padding:2px 8px;border-radius:12px;}
.badge-firebase{background:rgba(245,158,11,0.2);color:#fbbf24;}
.badge-sheets{background:rgba(16,185,129,0.2);color:#34d399;}
.badge-static{background:rgba(156,163,175,0.2);color:#9ca3af;}
.badge-multi-2{top:35px;}
.hidden-item{display:none !important;}
.filter-btn.active{background:rgba(139,92,246,0.5);border:1px solid rgba(139,92,246,0.8);}
</style></head><body class="p-6 md:p-12"><div class="max-w-7xl mx-auto">
<header class="mb-10 text-center"><h1 class="text-4xl md:text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500 mb-4">App Workspace</h1></header>
<div class="flex justify-center gap-3 mb-12">
    <button class="filter-btn active glass-card px-5 py-2 rounded-full text-sm" onclick="f('all',this)">🌟 Tất cả</button>
    <button class="filter-btn glass-card px-5 py-2 rounded-full text-sm" onclick="f('firebase',this)">🔥 Firebase</button>
    <button class="filter-btn glass-card px-5 py-2 rounded-full text-sm" onclick="f('googlesheets',this)">🟢 Google Sheets</button>
    <button class="filter-btn glass-card px-5 py-2 rounded-full text-sm" onclick="f('static',this)">⚪ Tĩnh</button>
</div>
<div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4" id="appGrid">
"""

for app, dbs in app_data.items():
    type_classes = " ".join(dbs)
    badges = ""
    bc = 0
    if 'firebase' in dbs:
        badges += f'<div class="badge badge-firebase {"badge-multi-2" if bc>0 else ""}">Firebase</div>'
        bc += 1
    if 'googlesheets' in dbs:
        badges += f'<div class="badge badge-sheets {"badge-multi-2" if bc>0 else ""}">Sheets</div>'
        bc += 1
    if 'static' in dbs:
        badges += '<div class="badge badge-static">Tĩnh</div>'
        
    html_main += f'<a href="./{app}/" class="app-item glass-card rounded-2xl p-6 text-center text-gray-200 hover:text-white no-underline font-semibold" data-types="{type_classes}">{badges}<div class="mt-4 truncate">{app}</div></a>\n'

html_main += """</div></div>
<script>
function f(t, e){
    document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
    e.classList.add('active');
    document.querySelectorAll('.app-item').forEach(i=>{
        if(t==='all' || i.getAttribute('data-types').includes(t)) i.classList.remove('hidden-item');
        else i.classList.add('hidden-item');
    });
}
</script></body></html>"""

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html_main)

print("Hoàn tất! Menu Tổng và các Menu con đã được đồng bộ tự động.")
