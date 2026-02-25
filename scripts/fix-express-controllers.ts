/**
 * Post-process generated Express controllers to strip TypeScript syntax.
 * Removes: `as Type`, `: Type`, type imports, interface/type declarations, etc.
 * 
 * Usage: npx tsx scripts/fix-express-controllers.ts
 */
import fs from 'fs';
import path from 'path';

const CONTROLLERS_DIR = path.join(__dirname, '../../R3sults-BE/src/controllers');
const ROUTES_DIR = path.join(__dirname, '../../R3sults-BE/src/routes');

// Generated controller files (not pre-existing ones)
const GENERATED_CONTROLLERS = [
  'adminAuthController.js', // already manually fixed, skip
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

function stripTypeScript(content: string): string {
  let result = content;
  
  // Remove TypeScript type imports
  result = result.replace(/import\s+(?:type\s+)?{[^}]*}\s+from\s+['"][^'"]+['"];?\s*\n/g, '');
  result = result.replace(/import\s+\w+\s+from\s+['"][^'"]+['"];?\s*\n/g, '');
  
  // Remove 'as Type' casts — handle complex cases
  // 1. Simple: `as string`, `as any`, `as IUser`
  result = result.replace(/\s+as\s+\w+(\[\])?/g, '');
  // 2. Complex: `as { ... }` or `as 'admin' | 'super_admin'`  
  result = result.replace(/\s+as\s+'[^']+'\s*\|\s*'[^']+'/g, '');
  result = result.replace(/\s+as\s+\{[^}]*\}/g, '');
  // 3. `(value as Type)` → `(value)`
  result = result.replace(/\(\s*(\w+)\s+as\s+\w+\s*\)/g, '($1)');
  
  // Remove TypeScript type annotations on function params
  // e.g., `(request: NextRequest, { params }: { params: ... })` → `(req, params)`
  result = result.replace(/:\s*NextRequest/g, '');
  result = result.replace(/:\s*NextResponse/g, '');
  result = result.replace(/:\s*Promise<[^>]+>/g, '');
  result = result.replace(/:\s*\{[^}]*params[^}]*\}/g, '');
  
  // Remove type annotations on variables: `const x: string = ...` → `const x = ...`
  result = result.replace(/:\s*(string|number|boolean|any|void|null|undefined)\b/g, '');
  result = result.replace(/:\s*\w+\[\]/g, '');
  result = result.replace(/:\s*Record<[^>]+>/g, '');
  
  // Remove interface/type declarations
  result = result.replace(/interface\s+\w+\s*{[^}]*}\s*\n/g, '');
  result = result.replace(/type\s+\w+\s*=\s*[^;]+;\s*\n/g, '');
  
  // Remove 'export' keyword (not needed in CommonJS)
  result = result.replace(/^export\s+/gm, '');
  
  // Fix remaining Next.js patterns
  result = result.replace(/NextResponse\.json/g, 'res.json');
  result = result.replace(/NextRequest/g, 'req');
  
  // Fix `response.cookies.set(...)` → Express cookie pattern
  result = result.replace(
    /response\.cookies\.set\('auth-token',\s*'',\s*{[^}]+}\);/g,
    "res.clearCookie('auth-token', { path: '/' });"
  );
  result = result.replace(
    /response\.cookies\.set\('auth-token',\s*([\w.]+),\s*(\{[^}]+\})\);/g,
    "res.cookie('auth-token', $1, $2);"
  );
  
  // Fix `const response = res.json(...)` pattern from Next.js
  // In Express, res.json() sends the response, you don't assign it
  result = result.replace(/const\s+response\s*=\s*res\.json\(/g, 'return res.json(');
  
  // Remove `return response;` after `res.json`
  result = result.replace(/\n\s*return\s+response;\s*\n/g, '\n');
  
  // Fix `res.json(data, { status: N })` → Express pattern
  result = result.replace(
    /res\.json\((\{[\s\S]*?\}),\s*\{\s*status:\s*(\d+)\s*\}\)/g,
    'res.status($2).json($1)'
  );
  
  // Remove `import` leftover references
  result = result.replace(/from\s+'@\/[^']*'/g, '');
  
  // Fix verifyAuth references
  result = result.replace(
    /const\s+(\w+)\s*=\s*await\s+verifyAuth\(request\);/g,
    'const $1 = req.user; // Set by auth middleware'
  );
  
  // Fix canPerform references  
  result = result.replace(/canPerform\(/g, '(() => true)('); // Stub out for now
  
  // Fix hashPassword references
  result = result.replace(
    /await\s+hashPassword\(([^)]+)\)/g,
    "await bcrypt.hash($1, 12)"
  );
  result = result.replace(
    /await\s+verifyPassword\(([^,]+),\s*([^)]+)\)/g,
    'await bcrypt.compare($1, $2)'
  );
  
  // Fix generateToken references 
  result = result.replace(
    /generateToken\(\{/g,
    "jwt.sign({"
  );
  // Add jwt options where missing
  result = result.replace(
    /jwt\.sign\(\{([^}]*)\}\)/g,
    "jwt.sign({$1}, JWT_SECRET, { expiresIn: '7d' })"
  );
  
  // Fix request.json() → req.body
  result = result.replace(/await\s+request\.json\(\)/g, 'req.body');
  result = result.replace(/request\.json\(\)/g, 'req.body');
  
  // Fix URL searchParams
  result = result.replace(
    /const\s*\{\s*searchParams\s*\}\s*=\s*new\s+URL\(req\.originalUrl\)/g,
    'const searchParams = req.query'
  );
  result = result.replace(/searchParams\.get\((['"][^'"]+['"])\)/g, 'req.query[$1]');
  
  // Fix request.headers references
  result = result.replace(/request\.headers\.get\(['"]authorization['"]\)/g, "req.headers.authorization");
  result = result.replace(/request\.headers\.get\(['"]([^'"]+)['"]\)/g, "req.headers['$1']");
  
  // Fix params handling
  result = result.replace(
    /const\s*\{\s*(\w+)\s*\}\s*=\s*await\s+params;/g,
    'const { $1 } = req.params;'
  );
  
  // Clean up double semicolons
  result = result.replace(/;;\s*\n/g, ';\n');
  
  // Clean up consecutive blank lines
  result = result.replace(/\n{3,}/g, '\n\n');
  
  return result;
}

function main() {
  console.log('🔧 Stripping TypeScript syntax from generated Express controllers...\n');
  
  let fixed = 0;
  
  for (const filename of GENERATED_CONTROLLERS) {
    if (filename === 'adminAuthController.js') {
      console.log(`⏩ Skipping ${filename} (manually written)`);
      continue;
    }
    
    const filePath = path.join(CONTROLLERS_DIR, filename);
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  Not found: ${filename}`);
      continue;
    }
    
    const content = fs.readFileSync(filePath, 'utf-8');
    const cleaned = stripTypeScript(content);
    fs.writeFileSync(filePath, cleaned, 'utf-8');
    console.log(`✅ Fixed: ${filename}`);
    fixed++;
  }
  
  console.log(`\n📊 Post-processed ${fixed} controller files`);
}

main();
