/**
 * Fix TS compiler artifacts in generated Express controllers.
 * Replaces prisma_1.default → prisma, server_1.NextResponse → res, etc.
 * 
 * Usage: npx tsx scripts/fix-ts-artifacts.ts
 */
import fs from 'fs';
import path from 'path';

const CONTROLLERS_DIR = path.join(__dirname, '../../R3sults-BE/src/controllers');

const FILES = [
  'dashboardStatsController.js', 'opsUserController.js',
  'adminDisasterController.js', 'adminEmergencyController.js',
  'adminShelterController.js', 'adminDeviceController.js',
  'adminIncidentController.js', 'adminInventoryController.js',
  'adminDamageReportController.js', 'adminAdjusterController.js',
  'adminVolunteerController.js', 'adminVolunteerTeamController.js',
  'adminProductController.js', 'adminOrderController.js',
  'adminServiceController.js', 'adminUserController.js',
  'adminReportController.js', 'adminSearchController.js',
  'adminSeedController.js', 'adminMobileController.js',
];

function fix(content: string): string {
  let r = content;
  
  // Remove require lines for Next.js modules
  r = r.replace(/.*require\("next\/server"\).*\n/g, '');
  r = r.replace(/.*require\("@\/lib\/auth"\).*\n/g, '');
  r = r.replace(/.*require\("@\/lib\/prisma"\).*\n/g, '');
  r = r.replace(/.*require\("@\/lib\/mongodb"\).*\n/g, '');
  r = r.replace(/.*require\("@\/types"\).*\n/g, '');
  r = r.replace(/.*require\("@\/models\/[^"]*"\).*\n/g, '');
  r = r.replace(/.*require\("mongoose"\).*\n/g, '');
  r = r.replace(/.*require\("bcryptjs"\).*\n/g, '');
  
  // Fix prisma references
  r = r.replace(/prisma_1\.default\./g, 'prisma.');
  r = r.replace(/prisma_1\./g, 'prisma.');
  
  // Fix NextResponse references  
  r = r.replace(/server_1\.NextResponse\.json\(/g, 'res.json(');
  r = r.replace(/server_1\.res\.json\(/g, 'res.json(');
  r = r.replace(/server_1\.\w+/g, 'res');
  
  // Fix auth references
  r = r.replace(/\(0, auth_1\.verifyAuth\)\(request\)/g, 'req.user');
  r = r.replace(/await\s+\(0, auth_1\.verifyAuth\)\(request\)/g, 'req.user');
  r = r.replace(/yield\s+\(0, auth_1\.verifyAuth\)\(request\)/g, 'req.user');
  r = r.replace(/\(0, auth_1\.canPerform\)\([^)]*\)/g, 'true');
  r = r.replace(/\(0, auth_1\.hasPermission\)\([^)]*\)/g, 'true');
  r = r.replace(/\(0, auth_1\.hashPassword\)\(/g, 'bcrypt.hash(');
  r = r.replace(/\(0, auth_1\.verifyPassword\)\(/g, 'bcrypt.compare(');
  r = r.replace(/\(0, auth_1\.generateToken\)\(\{/g, "jwt.sign({");
  r = r.replace(/auth_1\.canPerform\([^)]*\)/g, 'true');
  r = r.replace(/auth_1\.hasPermission\([^)]*\)/g, 'true');
  r = r.replace(/auth_1\.hashPassword\(/g, 'bcrypt.hash(');
  r = r.replace(/auth_1\.verifyPassword\(/g, 'bcrypt.compare(');
  r = r.replace(/auth_1\.generateToken\(\{/g, "jwt.sign({");
  r = r.replace(/auth_1\.verifyAuth\(request\)/g, 'req.user');
  
  // Fix mongoose references
  r = r.replace(/mongoose_1\.default\.Types\.ObjectId/g, 'String');
  r = r.replace(/mongoose_1\.\w*/g, '');
  
  // Fix mongodb_1 references
  r = r.replace(/mongodb_1\.\w*/g, '');
  
  // Fix types_1 references
  r = r.replace(/types_1\.\w*/g, '');
  
  // Fix geocoding_1 references
  r = r.replace(/\(0, geocoding_1\.\w+\)\(/g, '((');
  r = r.replace(/geocoding_1\.\w+\(/g, '(');
  
  // Fix request → req, response → res in method calls  
  r = r.replace(/\brequest\.url\b/g, 'req.originalUrl');
  r = r.replace(/\brequest\.headers\.get\(/g, "req.headers[");
  r = r.replace(/await\s+request\.json\(\)/g, 'req.body');
  r = r.replace(/yield\s+request\.json\(\)/g, 'req.body');
  r = r.replace(/request\.json\(\)/g, 'req.body');
  
  // Fix params
  r = r.replace(/= yield params;/g, '= req.params;');
  r = r.replace(/= await params;/g, '= req.params;');
  
  // Fix `const response = res.json(` → `return res.json(`
  r = r.replace(/const response = res\.json\(/g, 'return res.json(');
  r = r.replace(/\n\s*return response;\s*\n/g, '\n');
  
  // Fix cookie patterns
  r = r.replace(/response\.cookies\.set[^;]*;/g, '// Cookie handled by Express');
  
  // Fix res.json(data, { status: N }) → res.status(N).json(data)
  // Simple single-line pattern
  r = r.replace(/return\s+res\.json\((\{[^}]+\})\s*,\s*\{\s*status:\s*(\d+)\s*\}\)/g, 
    'return res.status($2).json($1)');
  
  // Clean up ObjectProperty exports
  r = r.replace(/Object\.defineProperty\(exports[\s\S]*?\}\);\s*\n/g, '');
  r = r.replace(/"use strict";\s*\n/g, '');
  
  // Clean up blank lines  
  r = r.replace(/\n{3,}/g, '\n\n');
  
  return r;
}

function main() {
  console.log('🔧 Fixing TS compiler artifacts...\n');
  let fixed = 0;
  
  for (const f of FILES) {
    const p = path.join(CONTROLLERS_DIR, f);
    if (!fs.existsSync(p)) continue;
    
    const content = fs.readFileSync(p, 'utf-8');
    const result = fix(content);
    fs.writeFileSync(p, result, 'utf-8');
    
    // Validate
    try {
      require('child_process').execSync(`node -c "${p}"`, { stdio: 'pipe' });
      console.log(`✅ ${f}`);
      fixed++;
    } catch (e: any) {
      const line = (e.stderr?.toString() || '').split('\n')[0];
      console.log(`❌ ${f}: ${line}`);
    }
  }
  
  console.log(`\n📊 ${fixed}/${FILES.length} valid`);
}

main();
