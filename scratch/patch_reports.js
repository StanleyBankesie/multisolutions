const fs = require('fs');
const path = require('path');

const modulesDir = path.join(__dirname, '../client/src/pages/modules');

function processFile(filePath, moduleName) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  const linkRegex = /<Link\s+to=["'][^"']+["']([^>]*)>\s*Return to Menu\s*<\/Link>/gi;
  if (linkRegex.test(content)) {
    content = content.replace(linkRegex, `<Link to="/${moduleName}"$1>Return to Menu</Link>`);
    changed = true;
  }

  const btnRegex = /<button\s+onClick=\{\(\)\s*=>\s*\(?window\.location\.href\s*=\s*["'][^"']+["']\)?\}([^>]*)>\s*Return to Menu\s*<\/button>/gi;
  if (btnRegex.test(content)) {
    content = content.replace(btnRegex, `<Link to="/${moduleName}" className="btn btn-secondary">Return to Menu</Link>`);
    changed = true;
  }

  const liveIndicatorHtml = `<div className="flex items-center gap-3"><div className="flex items-center gap-2" title="Live Auto-Refresh Active"><span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span></span><span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Live</span></div><Link to="/${moduleName}"`;
  
  if (!content.includes('Live Auto-Refresh Active') && content.includes('Return to Menu')) {
      const wrappedLinkRegex = new RegExp(`<Link to="/${moduleName}"`, 'g');
      content = content.replace(wrappedLinkRegex, liveIndicatorHtml);
      content = content.replace(/Return to Menu\s*<\/Link>/gi, `Return to Menu</Link></div>`);
      changed = true;
  }

  if (!content.includes('pollingCounter') && content.includes('useEffect')) {
    const compRegex = /(export\s+default\s+function\s+[A-Za-z0-9_]+\s*\([^\)]*\)\s*\{)/;
    if (compRegex.test(content)) {
      const injection = `
  const [pollingCounter, setPollingCounter] = React.useState(0);
  React.useEffect(() => {
    const __pollId = setInterval(() => setPollingCounter(c => c + 1), 15000);
    return () => clearInterval(__pollId);
  }, []);
`;
      content = content.replace(compRegex, `$1${injection}`);

      let parts = content.split('useEffect');
      for (let i = 1; i < parts.length; i++) {
        let block = parts[i];
        if (block.includes('api.get') || block.includes('run(') || block.includes('load(')) {
          let depMatch = block.match(/\},\s*\[(.*?)\]\s*\)/);
          if (depMatch) {
            let deps = depMatch[1].trim();
            let newDeps = deps ? deps + ', pollingCounter' : 'pollingCounter';
            let replaced = block.replace(depMatch[0], '}, [' + newDeps + '])');
            parts[i] = replaced;
          }
        }
      }
      content = parts.join('useEffect');
      
      if (!content.includes("import React")) {
         content = `import React from 'react';\n` + content;
      }

      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
  }
}

function traverseDir(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      traverseDir(fullPath);
    } else if (stat.isFile() && (file.endsWith('.jsx') || file.endsWith('.js'))) {
      if (fullPath.includes(`${path.sep}reports${path.sep}`)) {
        const match = fullPath.match(/modules[\\\/]([^\\\/]+)[\\\/]reports/);
        if (match) {
          const moduleName = match[1];
          processFile(fullPath, moduleName);
        }
      }
    }
  }
}

traverseDir(modulesDir);
console.log("Done.");
