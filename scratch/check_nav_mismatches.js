const fs = require('fs');
const path = require('path');
const { MODULES_REGISTRY } = require('../client/src/data/modulesRegistry.js');

function checkMismatches() {
  const modulesDir = path.join(__dirname, '../client/src/pages/modules');
  const modules = fs.readdirSync(modulesDir);
  
  let totalItems = 0;
  let unresolvedPaths = [];

  modules.forEach(mk => {
    if (mk === 'dashboard' || mk === 'auth' || !MODULES_REGISTRY[mk]) return;
    
    const homeFile = path.join(modulesDir, mk, mk.charAt(0).toUpperCase() + mk.slice(1).replace(/-([a-z])/g, (g) => g[1].toUpperCase()) + 'Home.jsx');
    if (!fs.existsSync(homeFile)) return;
    
    const content = fs.readFileSync(homeFile, 'utf8');
    
    const pathRegex = /name:\s*['"]([^'"]+)['"][\s\S]*?path:\s*['"](\/[^'"]+)['"]/g;
    let match;
    const items = [];
    while ((match = pathRegex.exec(content)) !== null) {
      items.push({ title: match[1], path: match[2] });
    }
    
    const moduleInfo = MODULES_REGISTRY[mk];
    const features = moduleInfo.features || [];

    items.forEach(item => {
       const p = item.path;
       const title = item.title;
       
       if (p === `/${mk}` || p.endsWith('/dashboard') || p.includes('/new') || p.includes('/:id')) return;
       totalItems++;
       
       const searchTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '');

       const featureMatch = features.find(f => {
         const fLabel = f.label.toLowerCase().replace(/[^a-z0-9]/g, '');
         if (f.label === title || f.name === title) return true;
         if (fLabel.length > 4 && searchTitle.length > 4 && (searchTitle.includes(fLabel) || fLabel.includes(searchTitle))) return true;
         return false;
       });
       
       if (featureMatch) return;

       const parts = p.split('/').filter(Boolean);
       const pathKey = parts[parts.length - 1];
       const pathFeatureMatch = features.find(f => f.key === pathKey);
       
       if (pathFeatureMatch) return;
       
       // Fallback logic for reports
       if (p.includes('/reports')) {
          if (features.find(f => f.key === 'reports')) return;
          if (features.find(f => f.key === 'project-reports')) return;
          if (features.find(f => f.key === 'production-reports')) return;
       }
       
       // Known mappings
       if (mk === 'pos' && p.includes('/customers')) {
          if (features.find(f => f.key === 'sales-customers' || f.key === 'customers')) return;
       }

       unresolvedPaths.push({ mk, title, path: p });
    });
  });

  console.log(`Total items checked: ${totalItems}`);
  console.log(`Items without match: ${unresolvedPaths.length}`);
  unresolvedPaths.forEach(i => console.log(`  ${i.mk}: ${i.title} (${i.path})`));
}

checkMismatches();
