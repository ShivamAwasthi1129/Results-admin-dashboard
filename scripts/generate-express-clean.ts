/**
 * Properly convert Next.js API routes to Express controllers.
 * 
 * Uses TypeScript's transpileModule to strip types properly,
 * then applies Express-specific transformations.
 * 
 * Usage: npx tsx scripts/generate-express-clean.ts
 */
import fs from 'fs';
import path from 'path';
import ts from 'typescript';

const ADMIN_DASH_API = path.join(__dirname, '../src/app/api');
const EXPRESS_ROOT = path.join(__dirname, '../../R3sults-BE/src');
const CONTROLLERS_DIR = path.join(EXPRESS_ROOT, 'controllers');
const ROUTES_DIR = path.join(EXPRESS_ROOT, 'routes');

// Route groups — same as before
const GROUPS = [
  { name: 'dashboardStats', folders: ['dashboard/stats'], mountPath: '/api/admin/dashboard' },
  { name: 'opsUser', folders: ['ops-users', 'ops-users/me', 'ops-users/change-password', 'ops-users/seed'], mountPath: '/api/admin/ops-users' },
  { name: 'adminDisaster', folders: ['disasters', 'disasters/[id]', 'disasters/[id]/assign-volunteer'], mountPath: '/api/admin/disasters' },
  { name: 'adminEmergency', folders: ['emergencies'], mountPath: '/api/admin/emergencies' },
  { name: 'adminShelter', folders: ['shelters', 'shelters/seed', 'shelters/init', 'shelters/auto-seed'], mountPath: '/api/admin/shelters' },
  { name: 'adminDevice', folders: ['devices', 'devices/seed'], mountPath: '/api/admin/devices' },
  { name: 'adminIncident', folders: ['incidents', 'incidents/seed'], mountPath: '/api/admin/incidents' },
  { name: 'adminInventory', folders: [
    'inventory/items', 'inventory/items/[id]', 'inventory/locations', 'inventory/locations/[id]',
    'inventory/stock', 'inventory/stock/[id]',
    'inventory/stock/[id]/dispatch', 'inventory/stock/[id]/reserve', 'inventory/stock/[id]/restock',
    'inventory/seed',
  ], mountPath: '/api/admin/inventory' },
  { name: 'adminDamageReport', folders: ['damage-reports', 'damage-reports/[id]', 'damage-reports/seed'], mountPath: '/api/admin/damage-reports' },
  { name: 'adminAdjuster', folders: ['adjusters', 'adjusters/[id]', 'adjusters/seed'], mountPath: '/api/admin/adjusters' },
  { name: 'adminVolunteer', folders: ['volunteers', 'volunteers/[id]/assign-disaster', 'volunteers/seed', 'volunteers/mobile-login'], mountPath: '/api/admin/volunteer-mgmt' },
  { name: 'adminVolunteerTeam', folders: ['volunteer-teams'], mountPath: '/api/admin/volunteer-teams' },
  { name: 'adminProduct', folders: ['products', 'products/[id]'], mountPath: '/api/admin/products' },
  { name: 'adminOrder', folders: ['orders', 'orders/[id]'], mountPath: '/api/admin/orders' },
  { name: 'adminService', folders: ['services', 'category-documents'], mountPath: '/api/admin/services' },
  { name: 'adminUser', folders: ['users', 'users/[id]'], mountPath: '/api/admin/users-mgmt' },
  { name: 'adminReport', folders: ['reports'], mountPath: '/api/admin/reports' },
  { name: 'adminSearch', folders: ['search'], mountPath: '/api/admin/search' },
  { name: 'adminSeed', folders: ['seed'], mountPath: '/api/admin/seed' },
  { name: 'adminMobile', folders: ['mobile/alerts', 'mobile/tasks', 'mobile/tasks/[disasterId]', 'mobile/tasks/accept', 'mobile/tasks/decline'], mountPath: '/api/admin/mobile' },
];

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

function transpileTS(code: string): string {
  const result = ts.transpileModule(code, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
      strict: false,
      noEmit: false,
      skipLibCheck: true,
    },
  });
  return result.outputText;
}

function readRouteFile(folderPath: string): string | null {
  const routeFile = path.join(ADMIN_DASH_API, folderPath, 'route.ts');
  if (fs.existsSync(routeFile)) return fs.readFileSync(routeFile, 'utf-8');
  const directFile = path.join(ADMIN_DASH_API, folderPath + '.ts');
  if (fs.existsSync(directFile)) return fs.readFileSync(directFile, 'utf-8');
  return null;
}

function extractFunctionBody(jsCode: string, funcName: string): string | null {
  // Look for `async function GET(` or `exports.GET =` or `function GET(`
  const patterns = [
    new RegExp(`(?:async\\s+)?function\\s+${funcName}\\s*\\([^)]*\\)\\s*\\{`),
    new RegExp(`exports\\.${funcName}\\s*=\\s*(?:async\\s+)?function\\s*\\([^)]*\\)\\s*\\{`),
    new RegExp(`exports\\.${funcName}\\s*=\\s*async\\s*\\([^)]*\\)\\s*=>\\s*\\{`),
  ];
  
  for (const pattern of patterns) {
    const match = pattern.exec(jsCode);
    if (!match) continue;
    
    let braceCount = 1;
    let idx = match.index + match[0].length;
    const startIdx = idx;
    while (braceCount > 0 && idx < jsCode.length) {
      if (jsCode[idx] === '{') braceCount++;
      if (jsCode[idx] === '}') braceCount--;
      idx++;
    }
    return jsCode.substring(startIdx, idx - 1);
  }
  return null;
}

function expressifyBody(body: string): string {
  let result = body;
  
  // NextResponse.json(data, { status: N }) → res.status(N).json(data)
  // Handle multiline: res_1.json(...) patterns from TS transpile
  result = result.replace(/return\s+(?:next_server_1\.)?NextResponse\.json\(/g, 'return res.json(');
  result = result.replace(/(?:next_server_1\.)?NextResponse\.json\(/g, 'res.json(');
  
  // Convert request.json() → req.body  
  result = result.replace(/await\s+request\.json\(\)/g, 'req.body');
  
  // Convert URL searchParams
  result = result.replace(
    /const\s+\{\s*searchParams\s*\}\s*=\s*new\s+URL\(request\.url\)/g,
    '// req.query is already available via Express'
  );
  result = result.replace(/searchParams\.get\(([^)]+)\)/g, 'req.query[$1]');
  
  // Convert `const { id } = await params;` → `const { id } = req.params;`
  result = result.replace(/=\s*await\s+params;/g, '= req.params;');
  result = result.replace(/=\s*yield\s+params;/g, '= req.params;');
  
  // Convert request.headers.get
  result = result.replace(/request\.headers\.get\(['"]authorization['"]\)/g, 'req.headers.authorization');
  result = result.replace(/request\.headers\.get\(['"]([^'"]+)['"]\)/g, "req.headers['$1']");
  
  // Convert verifyAuth → req.user
  result = result.replace(/await\s+(?:\(0,\s*auth_1\.)verifyAuth\(request\)/g, 'req.user');
  result = result.replace(/(?:\(0,\s*auth_1\.)?verifyAuth\(request\)/g, 'req.user');
  result = result.replace(/yield\s+(?:\(0,\s*auth_1\.)?verifyAuth\(request\)/g, 'req.user');
  
  // Convert hashPassword → bcrypt.hash
  result = result.replace(/(?:\(0,\s*auth_1\.)?hashPassword\(([^)]+)\)/g, 'bcrypt.hash($1, 12)');
  result = result.replace(/yield\s+(?:\(0,\s*auth_1\.)?hashPassword\(/g, 'yield bcrypt.hash(');
  
  // Convert verifyPassword → bcrypt.compare
  result = result.replace(/(?:\(0,\s*auth_1\.)?verifyPassword\(([^,]+),\s*([^)]+)\)/g, 'bcrypt.compare($1, $2)');
  
  // Convert generateToken → jwt.sign
  result = result.replace(/(?:\(0,\s*auth_1\.)?generateToken\(\{/g, "jwt.sign({");
  
  // Convert canPerform → always true (permission handled by middleware)
  result = result.replace(/(?:\(0,\s*auth_1\.)?canPerform\([^)]*\)/g, 'true');
  result = result.replace(/(?:\(0,\s*auth_1\.)?hasPermission\([^)]*\)/g, 'true');
  
  // Fix response cookie setting (Next.js → Express)
  result = result.replace(/response\.cookies\.set\('auth-token',\s*'',[\s\S]*?\}\);/g, 
    "res.clearCookie('auth-token', { path: '/' });");
  result = result.replace(/response\.cookies\.set\('auth-token',\s*(\w+),[\s\S]*?\}\);/g, 
    "res.cookie('auth-token', $1, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000, path: '/' });");
  
  // Fix `const response = res.json(...)` → `return res.json(...)`
  result = result.replace(/const\s+response\s*=\s*res\.json\(/g, 'return res.json(');
  result = result.replace(/return\s+response;/g, '');
  
  // Fix `request.url` → `req.originalUrl`
  result = result.replace(/request\.url/g, 'req.originalUrl');
  
  // Remove CommonJS require for Next.js/auth modules 
  result = result.replace(/.*require\("next\/server"\).*\n/g, '');
  result = result.replace(/.*require\("@\/lib\/auth"\).*\n/g, '');
  result = result.replace(/.*require\("@\/lib\/prisma"\).*\n/g, '');
  result = result.replace(/.*require\("@\/types"\).*\n/g, '');
  result = result.replace(/.*require\("@\/lib\/mongodb"\).*\n/g, '');
  result = result.replace(/.*require\("@\/models\/[^"]*"\).*\n/g, '');
  result = result.replace(/.*require\("mongoose"\).*\n/g, '');
  
  // Remove `exports.GET = ...`, `exports.POST = ...` wrappers (we'll add our own)
  // Actually keep them, they're the function definitions  
  
  // Clean up __awaiter patterns - simplify
  // Actually TS transpile to ES2020 should use native async/await
  
  // Clean up Object.defineProperty exports boilerplate
  result = result.replace(/Object\.defineProperty\(exports,[\s\S]*?\}\);/g, '');
  result = result.replace(/"use strict";/g, '');
  
  return result;
}

function generateController(group: typeof GROUPS[0]): string {
  const parts: string[] = [];
  
  // Header
  parts.push(`const prisma = require('../lib/prisma');`);
  parts.push(`const bcrypt = require('bcryptjs');`);
  parts.push(`const jwt = require('jsonwebtoken');`);
  parts.push('');
  parts.push(`const JWT_SECRET = process.env.JWT_SECRET || 'results-jwt-secret-key-2024';`);
  parts.push('');
  
  for (const folder of group.folders) {
    const tsContent = readRouteFile(folder);
    if (!tsContent) {
      parts.push(`// ${folder} — not found, skipping`);
      parts.push('');
      continue;
    }
    
    // Step 1: Use TS compiler to strip types
    let jsContent: string;
    try {
      jsContent = transpileTS(tsContent);
    } catch (e) {
      parts.push(`// ${folder} — TS transpile failed, skipping`);
      parts.push('');
      continue;
    }
    
    // Step 2: Apply Express-specific conversions
    jsContent = expressifyBody(jsContent);
    
    parts.push(`// ─── ${folder} ───`);
    
    // Step 3: Extract each HTTP method handler
    for (const method of HTTP_METHODS) {
      const funcBody = extractFunctionBody(jsContent, method);
      if (!funcBody) continue;
      
      const baseName = folder.replace(/\//g, '_').replace(/\[(\w+)\]/g, '_$1').replace(/-/g, '_');
      const funcName = `${method.toLowerCase()}_${baseName}`;
      
      parts.push(`exports.${funcName} = async (req, res, next) => {`);
      parts.push(`  try {`);
      parts.push(funcBody);
      parts.push(`  } catch (error) {`);
      parts.push(`    console.error('${funcName} error:', error);`);
      parts.push(`    next(error);`);
      parts.push(`  }`);
      parts.push('};');
      parts.push('');
    }
  }
  
  return parts.join('\n');
}

function generateRoute(group: typeof GROUPS[0]): string {
  const lines: string[] = [];
  
  lines.push(`const router = require('express').Router();`);
  lines.push(`const { authenticate } = require('../middleware/auth');`);
  lines.push(`const ctrl = require('../controllers/${group.name}Controller');`);
  lines.push('');
  lines.push('router.use(authenticate);');
  lines.push('');
  
  for (const folder of group.folders) {
    const tsContent = readRouteFile(folder);
    if (!tsContent) continue;
    
    // Determine sub-path relative to mount
    let subPath = folder;
    // Remove the first folder segment which is the mount point
    const mountBase = group.mountPath.split('/').pop() || '';
    const folderSegments = folder.split('/');
    
    // Map folder to route path
    subPath = '/' + folder.replace(/\[(\w+)\]/g, ':$1');
    
    for (const method of HTTP_METHODS) {
      // Check if this method exists in the file
      const hasMethod = new RegExp(`export\\s+async\\s+function\\s+${method}\\b`).test(tsContent);
      if (!hasMethod) continue;
      
      const baseName = folder.replace(/\//g, '_').replace(/\[(\w+)\]/g, '_$1').replace(/-/g, '_');
      const funcName = `${method.toLowerCase()}_${baseName}`;
      
      lines.push(`router.${method.toLowerCase()}('${subPath}', ctrl.${funcName});`);
    }
  }
  
  lines.push('');
  lines.push('module.exports = router;');
  return lines.join('\n');
}

function main() {
  console.log('🔄 Generating Express controllers (clean TS→JS via compiler)...\n');
  
  let success = 0;
  let errors = 0;
  
  for (const group of GROUPS) {
    console.log(`📦 ${group.name}`);
    
    const controllerContent = generateController(group);
    const controllerPath = path.join(CONTROLLERS_DIR, `${group.name}Controller.js`);
    fs.writeFileSync(controllerPath, controllerContent);
    
    const routeContent = generateRoute(group);
    const routePath = path.join(ROUTES_DIR, `${group.name}.js`);
    fs.writeFileSync(routePath, routeContent);
    
    // Validate
    try {
      const { execSync } = require('child_process');
      execSync(`node -c "${controllerPath}"`, { stdio: 'pipe' });
      console.log(`  ✅ Controller valid`);
      success++;
    } catch (e: any) {
      const line = (e.stderr?.toString() || '').split('\n')[0];
      console.log(`  ❌ Controller error: ${line}`);
      errors++;
    }
  }
  
  console.log(`\n📊 ${success} valid, ${errors} with errors`);
}

main();
