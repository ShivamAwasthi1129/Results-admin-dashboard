/**
 * Convert Next.js API routes to Express controllers + routes.
 * 
 * Strategy: For each route group, we read the Next.js route.ts files,
 * extract the handler logic, and generate Express controller functions + route definitions.
 * 
 * Usage: npx tsx scripts/generate-express-controllers.ts
 */
import fs from 'fs';
import path from 'path';

const ADMIN_DASH_API = path.join(__dirname, '../src/app/api');
const EXPRESS_ROOT = path.join(__dirname, '../../R3sults-BE/src');
const CONTROLLERS_DIR = path.join(EXPRESS_ROOT, 'controllers');
const ROUTES_DIR = path.join(EXPRESS_ROOT, 'routes');

// ── Route group definitions ──
// Each group maps Next.js API folders → one Express controller + route file
const GROUPS = [
  {
    name: 'adminAuth',
    folders: ['auth/login', 'auth/me', 'auth/logout'],
    mountPath: '/api/admin-auth',
    description: 'Admin dashboard authentication (OpsUser login/me/logout)',
  },
  {
    name: 'dashboardStats',
    folders: ['dashboard/stats'],
    mountPath: '/api/admin/dashboard',
    description: 'Dashboard statistics',
  },
  {
    name: 'opsUser',
    folders: ['ops-users', 'ops-users/me', 'ops-users/change-password', 'ops-users/seed'],
    mountPath: '/api/admin/ops-users',
    description: 'OpsUser management',
  },
  {
    name: 'adminDisaster',
    folders: ['disasters', 'disasters/[id]', 'disasters/[id]/assign-volunteer'],
    mountPath: '/api/admin/disasters',
    description: 'Disaster management',
  },
  {
    name: 'adminEmergency',
    folders: ['emergencies'],
    mountPath: '/api/admin/emergencies',
    description: 'Emergency management',
  },
  {
    name: 'adminShelter',
    folders: ['shelters', 'shelters/seed', 'shelters/init', 'shelters/auto-seed'],
    mountPath: '/api/admin/shelters',
    description: 'Shelter management',
  },
  {
    name: 'adminDevice',
    folders: ['devices', 'devices/seed'],
    mountPath: '/api/admin/devices',
    description: 'Device management',
  },
  {
    name: 'adminIncident',
    folders: ['incidents', 'incidents/seed'],
    mountPath: '/api/admin/incidents',
    description: 'Incident management',
  },
  {
    name: 'adminInventory',
    folders: [
      'inventory/items', 'inventory/items/[id]',
      'inventory/locations', 'inventory/locations/[id]',
      'inventory/stock', 'inventory/stock/[id]',
      'inventory/stock/[id]/dispatch', 'inventory/stock/[id]/reserve', 'inventory/stock/[id]/restock',
      'inventory/seed',
    ],
    mountPath: '/api/admin/inventory',
    description: 'Inventory management',
  },
  {
    name: 'adminDamageReport',
    folders: ['damage-reports', 'damage-reports/[id]', 'damage-reports/seed'],
    mountPath: '/api/admin/damage-reports',
    description: 'Damage report management',
  },
  {
    name: 'adminAdjuster',
    folders: ['adjusters', 'adjusters/[id]', 'adjusters/seed'],
    mountPath: '/api/admin/adjusters',
    description: 'Adjuster management',
  },
  {
    name: 'adminVolunteer',
    folders: ['volunteers', 'volunteers/[id]/assign-disaster', 'volunteers/getVolunteerById', 'volunteers/seed', 'volunteers/mobile-login'],
    mountPath: '/api/admin/volunteers',
    description: 'Volunteer management',
  },
  {
    name: 'adminVolunteerTeam',
    folders: ['volunteer-teams'],
    mountPath: '/api/admin/volunteer-teams',
    description: 'Volunteer team management',
  },
  {
    name: 'adminProduct',
    folders: ['products', 'products/[id]'],
    mountPath: '/api/admin/products',
    description: 'Product management',
  },
  {
    name: 'adminOrder',
    folders: ['orders', 'orders/[id]'],
    mountPath: '/api/admin/orders',
    description: 'Order management',
  },
  {
    name: 'adminService',
    folders: ['services', 'category-documents'],
    mountPath: '/api/admin/services',
    description: 'Service provider + category document management',
  },
  {
    name: 'adminUser',
    folders: ['users', 'users/[id]'],
    mountPath: '/api/admin/users',
    description: 'Admin user management',
  },
  {
    name: 'adminReport',
    folders: ['reports'],
    mountPath: '/api/admin/reports',
    description: 'Report generation',
  },
  {
    name: 'adminSearch',
    folders: ['search'],
    mountPath: '/api/admin/search',
    description: 'Admin search',
  },
  {
    name: 'adminSeed',
    folders: ['seed'],
    mountPath: '/api/admin/seed',
    description: 'Database seeding',
  },
  {
    name: 'adminMobile',
    folders: ['mobile/alerts', 'mobile/tasks', 'mobile/tasks/[disasterId]', 'mobile/tasks/accept', 'mobile/tasks/decline'],
    mountPath: '/api/admin/mobile',
    description: 'Mobile volunteer endpoints',
  },
];

// HTTP methods in Next.js API routes
const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

function readRouteFile(folderPath: string): string | null {
  const routeFile = path.join(ADMIN_DASH_API, folderPath, 'route.ts');
  if (!fs.existsSync(routeFile)) {
    // Check if it's a direct .ts file (like getVolunteerById.ts)
    const directFile = path.join(ADMIN_DASH_API, folderPath + '.ts');
    if (fs.existsSync(directFile)) {
      return fs.readFileSync(directFile, 'utf-8');
    }
    return null;
  }
  return fs.readFileSync(routeFile, 'utf-8');
}

function nextjsToExpressHandler(content: string, method: string): string | null {
  // Find the exported function for this method
  const pattern = new RegExp(
    `export\\s+async\\s+function\\s+${method}\\s*\\([\\s\\S]*?\\)\\s*\\{`,
    'g'
  );
  const match = pattern.exec(content);
  if (!match) return null;
  
  // Extract the function body by counting braces
  let braceCount = 1;
  let idx = match.index + match[0].length;
  const startIdx = idx;
  while (braceCount > 0 && idx < content.length) {
    if (content[idx] === '{') braceCount++;
    if (content[idx] === '}') braceCount--;
    idx++;
  }
  
  let body = content.substring(startIdx, idx - 1);
  
  // Convert NextRequest/NextResponse patterns to Express
  body = convertBodyToExpress(body);
  
  return body;
}

function convertBodyToExpress(body: string): string {
  let result = body;
  
  // Convert NextResponse.json(..., { status: N }) → res.status(N).json(...)
  result = result.replace(
    /return\s+NextResponse\.json\(\s*(\{[\s\S]*?\})\s*,\s*\{\s*status:\s*(\d+)\s*\}\s*\)/g,
    'return res.status($2).json($1)'
  );
  
  // Convert NextResponse.json(data) → res.json(data)
  result = result.replace(
    /return\s+NextResponse\.json\((\{[\s\S]*?\})\)/g,
    'return res.json($1)'
  );
  
  // Convert simple NextResponse.json
  result = result.replace(/NextResponse\.json/g, 'res.json');
  
  // Convert request.json() → req.body (no await needed)
  result = result.replace(/await\s+request\.json\(\)/g, 'req.body');
  result = result.replace(/request\.json\(\)/g, 'req.body');
  
  // Convert URL searchParams
  result = result.replace(
    /const\s*\{\s*searchParams\s*\}\s*=\s*new\s+URL\(request\.url\)/g,
    'const searchParams = req.query'
  );
  result = result.replace(/searchParams\.get\((['"][^'"]+['"])\)/g, 'req.query[$1]');
  
  // Convert await params for dynamic routes
  result = result.replace(
    /const\s*\{\s*(\w+)\s*\}\s*=\s*await\s+params;/g,
    'const { $1 } = req.params;'
  );
  
  // Convert request.headers.get('authorization')
  result = result.replace(/request\.headers\.get\(['"]authorization['"]\)/g, "req.headers.authorization");
  result = result.replace(/request\.headers\.get\(['"]([^'"]+)['"]\)/g, "req.headers['$1']");
  
  // Convert verifyAuth(request) → req.user (handled by middleware)
  result = result.replace(
    /const\s+(\w+)\s*=\s*await\s+verifyAuth\(request\);/g,
    'const $1 = req.user; // Set by auth middleware'
  );
  result = result.replace(
    /await\s+verifyAuth\(request\)/g,
    'req.user'
  );
  
  // Remove auth checks that are now handled by middleware
  // (keep them for now, they're extra safety)
  
  // Convert request.url → req.originalUrl
  result = result.replace(/request\.url/g, 'req.originalUrl');
  
  // Convert request.cookies
  result = result.replace(/request\.cookies/g, 'req.cookies');
  
  // Convert imports to requires (handled separately)
  
  return result;
}

function extractExpressRoute(folder: string): string {
  // Convert [id] → :id, [disasterId] → :disasterId
  return folder
    .replace(/\[(\w+)\]/g, ':$1')
    .replace(/^\//, '');
}

function generateController(group: typeof GROUPS[0]): string {
  const lines: string[] = [];
  
  lines.push(`const prisma = require('../lib/prisma');`);
  lines.push(`const bcrypt = require('bcryptjs');`);
  lines.push(`const jwt = require('jsonwebtoken');`);
  lines.push('');
  lines.push(`const JWT_SECRET = process.env.JWT_SECRET || 'results-jwt-secret-key-2024';`);
  lines.push('');
  
  for (const folder of group.folders) {
    const content = readRouteFile(folder);
    if (!content) {
      lines.push(`// ${folder} — file not found, skipping`);
      lines.push('');
      continue;
    }
    
    lines.push(`// ─── ${folder} ───`);
    
    for (const method of HTTP_METHODS) {
      const handlerBody = nextjsToExpressHandler(content, method);
      if (!handlerBody) continue;
      
      // Generate function name from folder + method
      const folderParts = folder.split('/').filter(p => !p.startsWith('['));
      const baseName = folderParts.join('_').replace(/-/g, '_');
      const funcName = `${method.toLowerCase()}_${baseName}`;
      
      lines.push(`exports.${funcName} = async (req, res, next) => {`);
      lines.push(handlerBody);
      lines.push('};');
      lines.push('');
    }
  }
  
  return lines.join('\n');
}

function generateRoute(group: typeof GROUPS[0]): string {
  const lines: string[] = [];
  
  lines.push(`const router = require('express').Router();`);
  lines.push(`const { authenticate, requireRole } = require('../middleware/auth');`);
  lines.push(`const ctrl = require('../controllers/${group.name}Controller');`);
  lines.push('');
  
  // Add auth middleware
  if (!group.name.includes('Auth') && group.name !== 'adminMobile') {
    lines.push('router.use(authenticate);');
    lines.push('');
  }
  
  for (const folder of group.folders) {
    const content = readRouteFile(folder);
    if (!content) continue;
    
    // Determine route path relative to mount point
    const mountParts = group.mountPath.replace('/api/', '').split('/');
    let routePath = '/' + folder;
    
    // Make path relative to mount
    const folderParts = folder.split('/');
    const mainFolder = mountParts[mountParts.length - 1];
    
    // Figure out the sub-path
    let subPath = folder;
    for (const mp of mountParts) {
      subPath = subPath.replace(new RegExp(`^${mp.replace('admin/', '').replace('admin-', '')}/?`), '');
    }
    
    // Convert dynamic segments
    subPath = subPath.replace(/\[(\w+)\]/g, ':$1');
    if (!subPath.startsWith('/')) subPath = '/' + subPath;
    if (subPath === '/') subPath = '/';
    
    for (const method of HTTP_METHODS) {
      const handlerBody = nextjsToExpressHandler(content, method);
      if (!handlerBody) continue;
      
      const folderParts2 = folder.split('/').filter(p => !p.startsWith('['));
      const baseName = folderParts2.join('_').replace(/-/g, '_');
      const funcName = `${method.toLowerCase()}_${baseName}`;
      
      const httpMethod = method.toLowerCase();
      lines.push(`router.${httpMethod}('${subPath}', ctrl.${funcName});`);
    }
  }
  
  lines.push('');
  lines.push('module.exports = router;');
  
  return lines.join('\n');
}

function main() {
  console.log('🔄 Generating Express controllers and routes from Next.js API routes...\n');
  
  let controllerCount = 0;
  let routeCount = 0;
  
  for (const group of GROUPS) {
    console.log(`📦 ${group.name}: ${group.description}`);
    
    // Generate controller
    const controllerContent = generateController(group);
    const controllerPath = path.join(CONTROLLERS_DIR, `${group.name}Controller.js`);
    fs.writeFileSync(controllerPath, controllerContent, 'utf-8');
    console.log(`  ✅ Controller: ${group.name}Controller.js`);
    controllerCount++;
    
    // Generate route
    const routeContent = generateRoute(group);
    const routePath = path.join(ROUTES_DIR, `${group.name}.js`);
    fs.writeFileSync(routePath, routeContent, 'utf-8');
    console.log(`  ✅ Route: ${group.name}.js`);
    routeCount++;
  }
  
  console.log(`\n📊 Generated ${controllerCount} controllers and ${routeCount} route files`);
  
  // Generate the index.js route registration lines
  console.log('\n📋 Add these lines to src/index.js:\n');
  for (const group of GROUPS) {
    console.log(`app.use('${group.mountPath}', require('./routes/${group.name}'));`);
  }
}

main();
