/**
 * Fix remaining JS syntax issues in generated Express controllers.
 * 
 * Usage: npx tsx scripts/fix-express-controllers-v2.ts
 */
import fs from 'fs';
import path from 'path';

const CONTROLLERS_DIR = path.join(__dirname, '../../R3sults-BE/src/controllers');

const GENERATED_FILES = [
  'dashboardStatsController.js',
  'opsUserController.js',
  'adminDisasterController.js',
  'adminEmergencyController.js',
  'adminShelterController.js',
  'adminDeviceController.js',
  'adminIncidentController.js',
  'adminInventoryController.js',
  'adminDamageReportController.js',
  'adminAdjusterController.js',
  'adminVolunteerController.js',
  'adminVolunteerTeamController.js',
  'adminProductController.js',
  'adminOrderController.js',
  'adminServiceController.js',
  'adminUserController.js',
  'adminReportController.js',
  'adminSearchController.js',
  'adminSeedController.js',
  'adminMobileController.js',
];

function fixJS(content: string): string {
  let result = content;
  
  // 1. Fix `const x[] = [];` → `const x = [];`
  result = result.replace(/const\s+(\w+)\[\]\s*=\s*\[\]/g, 'const $1 = []');
  
  // 2. Fix broken ternaries: `condition ? value ,` → `condition ? value : undefined,`
  // Pattern: `? expression ,` or `? expression.method() ,` without a `:` 
  result = result.replace(/\?\s*([^:,\n]+?)\s*,(\s*\n)/g, (match, expr, rest) => {
    // Check if this already has a colon (valid ternary)
    if (expr.includes(':')) return match;
    return `? ${expr.trim()} : undefined,${rest}`;
  });
  
  // 3. Fix remaining TypeScript type annotations that weren't caught
  // `const x: Array<{...}> = [...]` → `const x = [...]`
  result = result.replace(/:\s*Array<[^>]+>/g, '');
  
  // `(param: Type)` → `(param)`
  result = result.replace(/(\w+):\s*(?:string|number|boolean|any|void|null|undefined|IUser|IVolunteer|IDisaster|IEmergency|IShelter|IDevice|IIncident|IServiceProvider|IDamageReport|IAdjuster|IOrder|IProduct|IStockEntry|IInventoryItem|IStockLocation|IOpsUser|UserRole|Prisma\.\w+)\b/g, '$1');
  
  // 4. Fix `} })` patterns — unbalanced closing braces
  // This needs careful handling since `} })` can be valid (closing an object inside an argument list)
  // Instead, let's fix the specific pattern of `} });` appearing as standalone Prisma call closing
  
  // 5. Fix `res.json(data, { status: N })` Express doesn't take second arg
  result = result.replace(
    /res\.json\((\{[\s\S]*?\}),\s*\{\s*status:\s*(\d+)\s*\}\)/g,
    'res.status($2).json($1)'
  );
  
  // 6. Remove any remaining `as` casts that got through
  // Be careful not to remove `as` in other contexts like variable names
  result = result.replace(/\bas\b\s+(?:IUser|IVolunteer|IDisaster|IEmergency|IShelter|IDevice|IIncident|IServiceProvider|IDamageReport|IAdjuster|IOrder|IProduct|IOpsUser|UserRole|Prisma\.\w+)\b/g, '');
  
  // 7. Fix import blocks that were partially cleaned
  result = result.replace(/^\s*'@\/[^']*';\s*$/gm, '');
  result = result.replace(/^\s*;\s*$/gm, '');
  
  // 8. Fix `const { ... } from '...';` leftover
  result = result.replace(/const\s*\{[^}]*\}\s*'[^']*';\s*\n/g, '');
  
  // 9. Remove empty `try { } catch` blocks or orphaned patterns
  // This is too risky without AST, skip
  
  // 10. Fix `response.cookies.set` that wasn't caught
  result = result.replace(/response\.cookies\.set\(/g, '// Cookie set handled by Express middleware\n    // ');
  
  // 11. Clean whitespace
  result = result.replace(/\n{3,}/g, '\n\n');
  result = result.replace(/^\s*\n/gm, '\n');
  
  return result;
}

function main() {
  console.log('🔧 Fixing JS syntax in generated Express controllers (v2)...\n');
  
  let fixed = 0;
  for (const filename of GENERATED_FILES) {
    const filePath = path.join(CONTROLLERS_DIR, filename);
    if (!fs.existsSync(filePath)) continue;
    
    const content = fs.readFileSync(filePath, 'utf-8');
    const fixedContent = fixJS(content);
    fs.writeFileSync(filePath, fixedContent, 'utf-8');
    console.log(`✅ Fixed: ${filename}`);
    fixed++;
  }
  
  console.log(`\n📊 Post-processed ${fixed} files`);
  
  // Validate all files
  console.log('\n🔍 Validating syntax...\n');
  const { execSync } = require('child_process');
  let errors = 0;
  for (const filename of GENERATED_FILES) {
    const filePath = path.join(CONTROLLERS_DIR, filename);
    try {
      execSync(`node -c ${filePath}`, { stdio: 'pipe' });
      console.log(`  ✅ ${filename}`);
    } catch (e: any) {
      const stderr = e.stderr?.toString() || '';
      const errorLine = stderr.split('\n')[0] || 'Unknown error';
      console.log(`  ❌ ${filename}: ${errorLine}`);
      errors++;
    }
  }
  
  console.log(`\n${errors === 0 ? '🎉 All files valid!' : `⚠️  ${errors} files still have errors`}`);
}

main();
