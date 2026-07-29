const fs = require('fs');
const path = require('path');

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  let inTry = false;
  let hasRelease = false;
  let connectionVar = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('pool.getConnection()') || line.includes('query.pool.getConnection()') || line.includes('query("getConnection")')) {
      // Find what variable it was assigned to
      const match = line.match(/(?:const|let|var)\s+(\w+)\s*=\s*await/);
      if (match) {
        connectionVar = match[1];
      } else if (line.match(/(\w+)\s*=\s*await/)) {
        connectionVar = line.match(/(\w+)\s*=\s*await/)[1];
      } else {
        connectionVar = 'conn';
      }

      // Check next few lines for try block or if it's already in one
      let foundRelease = false;
      let openBrackets = 0;
      for (let j = i; j < lines.length; j++) {
        openBrackets += (lines[j].match(/\{/g) || []).length;
        openBrackets -= (lines[j].match(/\}/g) || []).length;
        if (lines[j].includes(`${connectionVar}.release()`) || lines[j].includes(`releaseConnection(`) || lines[j].includes(`${connectionVar}?.release()`)) {
          foundRelease = true;
          break;
        }
        if (j > i + 150 && !foundRelease) { // Look ahead up to 150 lines
          break;
        }
      }
      if (!foundRelease) {
        console.log(`Possible leak in ${filePath} at line ${i + 1}`);
      }
    }
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.js')) {
      checkFile(fullPath);
    }
  }
}

walkDir(path.join(__dirname, '../server/controllers'));
walkDir(path.join(__dirname, '../server/services'));
walkDir(path.join(__dirname, '../server/routes'));
