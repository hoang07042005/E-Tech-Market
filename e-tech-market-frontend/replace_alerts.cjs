const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

const filesToProcess = [];
walkDir('d:/E-Tech-Market/e-tech-market-frontend/src', function(filePath) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('alert(')) {
      filesToProcess.push(filePath);
    }
  }
});

filesToProcess.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // Add import if not exists
  if (!content.includes(`import { toast } from '@/utils/toast'`)) {
    // find last import
    const importRegex = /^import .* from .*$/gm;
    let match;
    let lastImportIndex = 0;
    while ((match = importRegex.exec(content)) !== null) {
      lastImportIndex = match.index + match[0].length;
    }
    if (lastImportIndex > 0) {
      content = content.slice(0, lastImportIndex) + '\nimport { toast } from \'@/utils/toast\';' + content.slice(lastImportIndex);
    } else {
      content = 'import { toast } from \'@/utils/toast\';\n' + content;
    }
  }
  
  // Replace alert( with appropriate toast
  // We'll use a regex that matches alert(...)
  content = content.replace(/alert\((.*?)\)/g, (match, args) => {
    const lowerArgs = args.toLowerCase();
    if (lowerArgs.includes('thành công') || lowerArgs.includes('đã lưu') || lowerArgs.includes('đã sao chép')) {
      return `toast.success(${args})`;
    } else if (lowerArgs.includes('lỗi') || lowerArgs.includes('err') || lowerArgs.includes('thất bại') || lowerArgs.includes('vui lòng') || lowerArgs.includes('không thể') || lowerArgs.includes('trống')) {
      return `toast.error(${args})`;
    } else {
      // Default to error since most alerts in admin are errors (validation, API failure)
      return `toast.error(${args})`;
    }
  });

  fs.writeFileSync(file, content);
  console.log('Processed:', file);
});
console.log('Done replacing alerts!');
