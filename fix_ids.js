const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('/Users/ayushmac/CodeProjects/R3sults/Results-admin-dashboard/src', function(filePath) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Simple regex to find variable._id and replace with (variable.id || variable._id)
    // We try to match alphanumeric names, possibly with optional chaining like user?._id
    // But avoid replacing if it's already like user.id || user._id.
    
    let newContent = content.replace(/([a-zA-Z0-9_]+(\?)?)\._id/g, (match, prefix) => {
      // If it's already inside a fallback like `v.id || v._id`, let's leave it alone or it might become `v.id || (v.id || v._id)`
      // Let's just blindly replace it to `(prefix.id || prefix._id)`. But wait, in TS template literals `${user._id}` -> `${(user.id || user._id)}` works perfectly.
      // But if it's `id: device.id || device._id` it would become `id: device.id || (device.id || device._id)`. This is harmless, just a bit redundant.
      return `(${prefix}.id || ${prefix}._id)`;
    });

    // Also fix cases like rowKey="_id" to rowKey={(r) => r.id || r._id}
    newContent = newContent.replace(/rowKey="_id"/g, 'rowKey={(r: any) => r.id || r._id || ""}');

    if (content !== newContent) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`Updated: ${filePath}`);
    }
  }
});
