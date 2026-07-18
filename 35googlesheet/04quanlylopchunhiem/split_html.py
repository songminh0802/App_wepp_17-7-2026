import re

with open('index8.html', 'r', encoding='utf-8') as f:
    content = f.read()

# For diemanh.html
# We want to remove the Documents Tab (lines from <!-- Documents Tab --> to its closing div before <!-- Add/Edit Student Modal -->)
doc_tab_regex = r'(\s*<!-- Documents Tab -->.*?(?=\s*<!-- Add/Edit Student Modal -->))'
diemanh_content = re.sub(doc_tab_regex, '', content, flags=re.DOTALL)

# Also remove Document Upload Modal
doc_modal_regex = r'(\s*<!-- Document Upload Modal -->.*?(?=\s*<!-- Attendance History Modal -->))'
diemanh_content = re.sub(doc_modal_regex, '', diemanh_content, flags=re.DOTALL)

# In diemanh.html, the Sidebar and Bottom Nav links for Documents should be updated to a full URL route
# Find: <a href="#" onclick="switchTab('documents')" class="nav-item flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-gray-50" data-tab="documents">
# Replace with: <a href="<?= ScriptApp.getService().getUrl() ?>?page=hinhanh" class="nav-item flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-gray-50">
diemanh_content = re.sub(
    r'<a href="#" onclick="switchTab\(\'documents\'\)".*?class="(.*?)".*?>',
    r'<a href="<?= ScriptApp.getService().getUrl() ?>?page=hinhanh" class="\1">',
    diemanh_content
)

# And inside the Javascript, we should remove the logic related to documents
# (Actually, we can leave the JS in there, since it's just unused functions and variables, but to be clean we could trim it)
# Let's just save diemanh.html
with open('diemanh.html', 'w', encoding='utf-8') as f:
    f.write(diemanh_content)


# For hinhanh.html
# We want to keep ONLY Documents Tab. We remove Tabs 1-4.
# Dashboard Tab to Discipline Tab ends before Documents Tab
tabs_regex = r'(\s*<!-- Dashboard Tab -->.*?(?=\s*<!-- Documents Tab -->))'
hinhanh_content = re.sub(tabs_regex, '', content, flags=re.DOTALL)

# Remove other modals
modal1_regex = r'(\s*<!-- Add/Edit Student Modal -->.*?(?=\s*<!-- Document Upload Modal -->))'
hinhanh_content = re.sub(modal1_regex, '', hinhanh_content, flags=re.DOTALL)

modal2_regex = r'(\s*<!-- Attendance History Modal -->.*?(?=\s*<!-- Bottom Navigation \(Mobile\) -->))'
hinhanh_content = re.sub(modal2_regex, '', hinhanh_content, flags=re.DOTALL)

# We need to make Documents Tab active by default
hinhanh_content = hinhanh_content.replace('<div id="tab-documents" class="tab-content">', '<div id="tab-documents" class="tab-content active">')

# Update Sidebar and Bottom Nav links in hinhanh.html to point back to diemanh
# We can just change all switchTab(...) except documents to point to URL
def replace_nav(match):
    tab_name = match.group(1)
    classes = match.group(2)
    # Remove 'active' class from Dashboard, etc.
    classes = classes.replace('active', '').strip()
    return f'<a href="<?= ScriptApp.getService().getUrl() ?>" class="{classes}">'

hinhanh_content = re.sub(
    r'<a href="#" onclick="switchTab\(\'(dashboard|students|attendance|discipline)\'\)".*?class="(.*?)".*?>',
    replace_nav,
    hinhanh_content
)

# Documents tab in the nav should be active
hinhanh_content = re.sub(
    r'<a href="#" onclick="switchTab\(\'documents\'\)".*?class="(.*?)".*?>',
    lambda m: f'<a href="#" class="{m.group(1)} active">',
    hinhanh_content
)

with open('hinhanh.html', 'w', encoding='utf-8') as f:
    f.write(hinhanh_content)

print("Split UI successfully")
