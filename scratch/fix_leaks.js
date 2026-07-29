const fs = require('fs');

const leaks = [
  { file: 'server/controllers/finance.controller.js', line: 2113, var: 'conn' },
  { file: 'server/controllers/finance.controller.js', line: 2767, var: 'conn' },
  { file: 'server/controllers/hr.controller.js', line: 724, var: 'conn' },
  { file: 'server/controllers/purchase.controller.js', line: 2203, var: 'conn' },
  { file: 'server/controllers/purchase.controller.js', line: 2482, var: 'conn' },
  { file: 'server/controllers/transport.controller.js', line: 1122, var: 'conn' },
  { file: 'server/routes/inventory.routes.js', line: 8672, var: 'conn' },
  { file: 'server/routes/pos.routes.js', line: 2664, var: 'conn' },
  { file: 'server/routes/pos.routes.js', line: 2839, var: 'conn' },
  { file: 'server/routes/pos.routes.js', line: 3368, var: 'conn' },
  { file: 'server/routes/pos.routes.js', line: 3817, var: 'conn' },
  { file: 'server/routes/purchase.routes.js', line: 2477, var: 'conn' },
  { file: 'server/routes/purchase.routes.js', line: 5066, var: 'conn' },
  { file: 'server/routes/purchase.routes.js', line: 6270, var: 'conn' },
  { file: 'server/routes/purchase.routes.js', line: 7733, var: 'conn' },
  { file: 'server/routes/purchase.routes.js', line: 8330, var: 'conn' },
  { file: 'server/routes/purchase.routes.js', line: 9986, var: 'conn' },
  { file: 'server/routes/purchase.routes.js', line: 10207, var: 'conn' },
  { file: 'server/routes/purchase.routes.js', line: 11182, var: 'conn' },
  { file: 'server/routes/sales.route.js', line: 4935, var: 'conn' },
  { file: 'server/routes/sales.route.js', line: 5193, var: 'conn' },
  { file: 'server/routes/sales.route.js', line: 5389, var: 'conn' },
  { file: 'server/routes/sales.route.js', line: 8613, var: 'conn' },
  { file: 'server/routes/srv_invoices.route.js', line: 4700, var: 'conn' },
  { file: 'server/routes/srv_invoices.route.js', line: 4925, var: 'conn' },
  { file: 'server/routes/srv_invoices.route.js', line: 8160, var: 'conn' }
];

const filesToFix = {};
leaks.forEach(leak => {
  if (!filesToFix[leak.file]) {
    filesToFix[leak.file] = [];
  }
  filesToFix[leak.file].push(leak);
});

for (const [file, fileLeaks] of Object.entries(filesToFix)) {
  const content = fs.readFileSync(file, 'utf8');
  let lines = content.split('\n');
  
  // Sort descending so line numbers don't shift!
  fileLeaks.sort((a, b) => b.line - a.line);
  
  for (const leak of fileLeaks) {
    let startLine = leak.line - 1; // 0-indexed
    
    // Find where the try block starts
    let tryLine = startLine;
    let foundTry = false;
    for (let i = startLine; i <= startLine + 10; i++) {
       if (lines[i] && lines[i].includes('try {')) {
           tryLine = i;
           foundTry = true;
           break;
       }
    }
    for (let i = startLine; i >= startLine - 10; i--) {
       if (!foundTry && lines[i] && lines[i].includes('try {')) {
           tryLine = i;
           foundTry = true;
           break;
       }
    }
    
    if (!foundTry) {
       console.log(`Could not find try block for ${file} at line ${startLine}`);
       continue;
    }

    // Now find the end of the try/catch block
    let openBraces = 0;
    let catchEndLine = -1;
    let insideCatch = false;
    let catchOpenBraces = 0;

    for (let i = tryLine; i < lines.length; i++) {
       const line = lines[i];
       openBraces += (line.match(/\{/g) || []).length;
       openBraces -= (line.match(/\}/g) || []).length;
       
       if (!insideCatch && line.includes('catch ') || line.includes('catch(') || line.includes('catch {')) {
           insideCatch = true;
       }

       if (insideCatch) {
          if (line.includes('{')) {
              catchOpenBraces += (line.match(/\{/g) || []).length;
          }
          if (line.includes('}')) {
              catchOpenBraces -= (line.match(/\}/g) || []).length;
          }
          if (catchOpenBraces <= 0 && line.includes('}')) {
             catchEndLine = i;
             break;
          }
       }
    }

    if (catchEndLine !== -1) {
       const indentMatch = lines[catchEndLine].match(/^\s*/);
       const indent = indentMatch ? indentMatch[0] : '  ';
       lines.splice(catchEndLine + 1, 0, `${indent}finally {`);
       lines.splice(catchEndLine + 2, 0, `${indent}  if (${leak.var}) ${leak.var}.release();`);
       lines.splice(catchEndLine + 3, 0, `${indent}}`);
       console.log(`Fixed leak in ${file} around line ${startLine + 1}`);
    } else {
       console.log(`Could not find catch end for ${file} at line ${startLine + 1}`);
    }
  }

  fs.writeFileSync(file, lines.join('\n'));
}
