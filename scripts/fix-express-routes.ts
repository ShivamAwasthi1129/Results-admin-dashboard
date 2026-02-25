/**
 * Fix Express route files so sub-paths are relative to their mount point.
 * 
 * Problem: routes have paths like `/disasters` but are mounted at `/api/admin/disasters`,
 * resulting in `/api/admin/disasters/disasters` (doubled).
 * 
 * Fix: Strip the base folder prefix from each route path.
 * 
 * Usage: npx tsx scripts/fix-express-routes.ts
 */
import fs from 'fs';
import path from 'path';

const ROUTES_DIR = path.join(__dirname, '../../R3sults-BE/src/routes');

// Mount path → base folder to strip from sub-paths
const ROUTE_FIXES: Record<string, { file: string; baseFolders: string[] }> = {
  'dashboardStats': { file: 'dashboardStats.js', baseFolders: ['dashboard'] },
  'opsUser': { file: 'opsUser.js', baseFolders: ['ops-users'] },
  'adminDisaster': { file: 'adminDisaster.js', baseFolders: ['disasters'] },
  'adminEmergency': { file: 'adminEmergency.js', baseFolders: ['emergencies'] },
  'adminShelter': { file: 'adminShelter.js', baseFolders: ['shelters'] },
  'adminDevice': { file: 'adminDevice.js', baseFolders: ['devices'] },
  'adminIncident': { file: 'adminIncident.js', baseFolders: ['incidents'] },
  'adminInventory': { file: 'adminInventory.js', baseFolders: ['inventory'] },
  'adminDamageReport': { file: 'adminDamageReport.js', baseFolders: ['damage-reports'] },
  'adminAdjuster': { file: 'adminAdjuster.js', baseFolders: ['adjusters'] },
  'adminVolunteer': { file: 'adminVolunteer.js', baseFolders: ['volunteers'] },
  'adminVolunteerTeam': { file: 'adminVolunteerTeam.js', baseFolders: ['volunteer-teams'] },
  'adminProduct': { file: 'adminProduct.js', baseFolders: ['products'] },
  'adminOrder': { file: 'adminOrder.js', baseFolders: ['orders'] },
  'adminService': { file: 'adminService.js', baseFolders: ['services'] },
  'adminUser': { file: 'adminUser.js', baseFolders: ['users'] },
  'adminReport': { file: 'adminReport.js', baseFolders: ['reports'] },
  'adminSearch': { file: 'adminSearch.js', baseFolders: ['search'] },
  'adminSeed': { file: 'adminSeed.js', baseFolders: ['seed'] },
  'adminMobile': { file: 'adminMobile.js', baseFolders: ['mobile'] },
};

function fixRouteFile(name: string, config: { file: string; baseFolders: string[] }) {
  const filePath = path.join(ROUTES_DIR, config.file);
  if (!fs.existsSync(filePath)) return false;
  
  let content = fs.readFileSync(filePath, 'utf-8');
  
  for (const baseFolder of config.baseFolders) {
    // Replace route paths that start with the base folder
    // e.g., `('/disasters',` → `('/',`
    // e.g., `('/disasters/:id',` → `('/:id',`
    // e.g., `('/dashboard/stats',` → `('/stats',`
    const regex = new RegExp(`'\\/${baseFolder}(/[^']*)?'`, 'g');
    content = content.replace(regex, (match, rest) => {
      if (!rest || rest === '') return "'/'";
      return `'${rest}'`;
    });
  }
  
  fs.writeFileSync(filePath, content, 'utf-8');
  return true;
}

function main() {
  console.log('🔧 Fixing Express route sub-paths...\n');
  
  for (const [name, config] of Object.entries(ROUTE_FIXES)) {
    const fixed = fixRouteFile(name, config);
    if (fixed) {
      console.log(`✅ ${config.file}`);
    } else {
      console.log(`⚠️  ${config.file} — not found`);
    }
  }
  
  console.log('\nDone!');
}

main();
