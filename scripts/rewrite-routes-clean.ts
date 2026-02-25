/**
 * Comprehensive rewrite of all route files that have broken Prisma syntax.
 * This script reverts files to their git state, then performs clean conversions.
 * 
 * Usage: npx tsx scripts/rewrite-routes-clean.ts
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ROOT = path.join(__dirname, '..');
const API_DIR = path.join(ROOT, 'src/app/api');

// Get list of all route files
function findAllRouteFiles(dir: string): string[] {
  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findAllRouteFiles(fullPath));
    } else if (entry.name.endsWith('.ts')) {
      files.push(fullPath);
    }
  }
  return files;
}

// Revert file to git state using git show
function revertFile(filePath: string): string | null {
  const relativePath = path.relative(ROOT, filePath);
  try {
    return execSync(`git show HEAD:${relativePath}`, { cwd: ROOT, encoding: 'utf-8' });
  } catch {
    return null; // New file, not in git
  }
}

// Model mapping
const MODELS: Record<string, string> = {
  'OpsUser': 'opsUser',
  'User': 'adminUser',
  'Volunteer': 'adminVolunteer',
  'VolunteerTeam': 'adminVolunteerTeam',
  'ServiceProvider': 'adminServiceProvider',
  'Disaster': 'adminDisaster',
  'Emergency': 'adminEmergency',
  'Shelter': 'adminShelter',
  'Device': 'adminDevice',
  'Incident': 'adminIncident',
  'InventoryItem': 'adminInventoryItem',
  'StockLocation': 'adminStockLocation',
  'StockEntry': 'adminStockEntry',
  'Product': 'adminProduct',
  'DamageReport': 'adminDamageReport',
  'Adjuster': 'adminAdjuster',
  'Order': 'adminOrder',
  'CategoryDocumentRequirement': 'adminCategoryDocReq',
};

function cleanConvert(content: string): string {
  let c = content;
  
  // Only process files that use MongoDB
  if (!c.includes('connectDB') && !c.includes('@/models/') && !c.includes('mongoose')) {
    return c;
  }

  // Step 1: Replace imports
  // Remove connectDB import
  c = c.replace(/import\s+connectDB\s+from\s+['"]@\/lib\/mongodb['"];?\s*\n/g, '');
  
  // Remove all model imports (default and named)
  c = c.replace(/import\s+\w+\s+from\s+['"]@\/models\/\w+['"];?\s*\n/g, '');
  c = c.replace(/import\s+(?:type\s+)?\{[^}]*\}\s+from\s+['"]@\/models\/\w+['"];?\s*\n/g, '');
  
  // Remove mongoose imports
  c = c.replace(/import\s+mongoose[^;]*;\s*\n/g, '');
  c = c.replace(/import\s+\{[^}]*\}\s+from\s+['"]mongoose['"];?\s*\n/g, '');
  
  // Remove void Model; lines
  c = c.replace(/void\s+\w+;\s*\n/g, '');

  // Add prisma import if not present
  if (!c.includes("from '@/lib/prisma'") && !c.includes('from "@/lib/prisma"')) {
    const lastImportMatch = [...c.matchAll(/^import\s+.*$/gm)];
    if (lastImportMatch.length > 0) {
      const lastImport = lastImportMatch[lastImportMatch.length - 1];
      const insertPos = (lastImport.index || 0) + lastImport[0].length;
      c = c.slice(0, insertPos) + "\nimport prisma from '@/lib/prisma';" + c.slice(insertPos);
    } else {
      c = "import prisma from '@/lib/prisma';\n" + c;
    }
  }

  // Step 2: Remove await connectDB()
  c = c.replace(/\s*await\s+connectDB\(\);?\s*\n/g, '\n');
  
  // Step 3: Convert model operations using function-based approach
  for (const [mongoModel, prismaModel] of Object.entries(MODELS)) {
    // === findById(id) ===
    c = c.replace(
      new RegExp(`await\\s+${mongoModel}\\.findById\\(([^)]+)\\)`, 'g'),
      `await prisma.${prismaModel}.findUnique({ where: { id: $1 } })`
    );
    c = c.replace(
      new RegExp(`${mongoModel}\\.findById\\(([^)]+)\\)`, 'g'),
      `prisma.${prismaModel}.findUnique({ where: { id: $1 } })`
    );
    
    // === findByIdAndDelete(id) ===
    c = c.replace(
      new RegExp(`await\\s+${mongoModel}\\.findByIdAndDelete\\(([^)]+)\\)`, 'g'),
      `await prisma.${prismaModel}.delete({ where: { id: $1 } })`
    );
    c = c.replace(
      new RegExp(`${mongoModel}\\.findByIdAndDelete\\(([^)]+)\\)`, 'g'),
      `prisma.${prismaModel}.delete({ where: { id: $1 } })`
    );

    // === findByIdAndUpdate(id, data, opts) ===
    // Pattern: Model.findByIdAndUpdate(id, data) or Model.findByIdAndUpdate(id, data, { new: true })
    c = c.replace(
      new RegExp(`await\\s+${mongoModel}\\.findByIdAndUpdate\\(\\s*([^,]+),\\s*([^,)]+)(?:,\\s*\\{[^}]*\\})?\\s*\\)`, 'g'),
      `await prisma.${prismaModel}.update({ where: { id: $1 }, data: $2 })`
    );
    c = c.replace(
      new RegExp(`${mongoModel}\\.findByIdAndUpdate\\(\\s*([^,]+),\\s*([^,)]+)(?:,\\s*\\{[^}]*\\})?\\s*\\)`, 'g'),
      `prisma.${prismaModel}.update({ where: { id: $1 }, data: $2 })`
    );

    // === findOne({ ... }) ===
    // Multi-line findOne with object
    c = c.replace(
      new RegExp(`await\\s+${mongoModel}\\.findOne\\((\\{[^}]*\\})\\)`, 'g'),
      `await prisma.${prismaModel}.findFirst({ where: $1 })`
    );
    c = c.replace(
      new RegExp(`${mongoModel}\\.findOne\\((\\{[^}]*\\})\\)`, 'g'),
      `prisma.${prismaModel}.findFirst({ where: $1 })`
    );

    // === find({}) - no filter ===
    c = c.replace(
      new RegExp(`await\\s+${mongoModel}\\.find\\(\\{\\}\\)`, 'g'),
      `await prisma.${prismaModel}.findMany()`
    );
    c = c.replace(
      new RegExp(`${mongoModel}\\.find\\(\\{\\}\\)`, 'g'),
      `prisma.${prismaModel}.findMany()`
    );

    // === find(query).sort().skip().limit() ===
    // Convert chained pattern into single prisma call
    c = c.replace(
      new RegExp(`await\\s+${mongoModel}\\.find\\((\\w+)\\)\\s*\\.sort\\(\\{[^}]*\\}\\)\\s*\\.skip\\((\\w+)\\)\\s*\\.limit\\((\\w+)\\)`, 'g'),
      `await prisma.${prismaModel}.findMany({ where: $1, orderBy: { createdAt: 'desc' }, skip: $2, take: $3 })`
    );
    c = c.replace(
      new RegExp(`${mongoModel}\\.find\\((\\w+)\\)\\s*\\.sort\\(\\{[^}]*\\}\\)\\s*\\.skip\\((\\w+)\\)\\s*\\.limit\\((\\w+)\\)`, 'g'),
      `prisma.${prismaModel}.findMany({ where: $1, orderBy: { createdAt: 'desc' }, skip: $2, take: $3 })`
    );

    // === find(query) - with filter ===
    c = c.replace(
      new RegExp(`await\\s+${mongoModel}\\.find\\((\\{[^}]*\\})\\)`, 'g'),
      `await prisma.${prismaModel}.findMany({ where: $1 })`
    );
    c = c.replace(
      new RegExp(`await\\s+${mongoModel}\\.find\\((\\w+)\\)`, 'g'),
      `await prisma.${prismaModel}.findMany({ where: $1 })`
    );
    c = c.replace(
      new RegExp(`${mongoModel}\\.find\\((\\{[^}]*\\})\\)`, 'g'),
      `prisma.${prismaModel}.findMany({ where: $1 })`
    );
    c = c.replace(
      new RegExp(`${mongoModel}\\.find\\((\\w+)\\)`, 'g'),
      `prisma.${prismaModel}.findMany({ where: $1 })`
    );

    // === countDocuments() ===
    c = c.replace(
      new RegExp(`await\\s+${mongoModel}\\.countDocuments\\(\\)`, 'g'),
      `await prisma.${prismaModel}.count()`
    );
    c = c.replace(
      new RegExp(`await\\s+${mongoModel}\\.countDocuments\\((\\{[^}]*\\})\\)`, 'g'),
      `await prisma.${prismaModel}.count({ where: $1 })`
    );
    c = c.replace(
      new RegExp(`${mongoModel}\\.countDocuments\\(\\)`, 'g'),
      `prisma.${prismaModel}.count()`
    );
    c = c.replace(
      new RegExp(`${mongoModel}\\.countDocuments\\((\\{[^}]*\\})\\)`, 'g'),
      `prisma.${prismaModel}.count({ where: $1 })`
    );

    // === create(data) ===
    c = c.replace(
      new RegExp(`await\\s+${mongoModel}\\.create\\((\\{[\\s\\S]*?\\n\\s*\\})\\)`, 'g'),
      `await prisma.${prismaModel}.create({ data: $1 })`
    );
    c = c.replace(
      new RegExp(`await\\s+${mongoModel}\\.create\\((\\w+)\\)`, 'g'),
      `await prisma.${prismaModel}.create({ data: $1 })`
    );
    c = c.replace(
      new RegExp(`${mongoModel}\\.create\\((\\w+)\\)`, 'g'),
      `prisma.${prismaModel}.create({ data: $1 })`
    );

    // === deleteMany(query) ===
    c = c.replace(
      new RegExp(`await\\s+${mongoModel}\\.deleteMany\\((\\{[^}]*\\})\\)`, 'g'),
      `await prisma.${prismaModel}.deleteMany({ where: $1 })`
    );
    c = c.replace(
      new RegExp(`await\\s+${mongoModel}\\.deleteMany\\(\\{\\}\\)`, 'g'),
      `await prisma.${prismaModel}.deleteMany({})`
    );
    c = c.replace(
      new RegExp(`${mongoModel}\\.deleteMany\\((\\{[^}]*\\})\\)`, 'g'),
      `prisma.${prismaModel}.deleteMany({ where: $1 })`
    );
    c = c.replace(
      new RegExp(`${mongoModel}\\.deleteMany\\(\\{\\}\\)`, 'g'),
      `prisma.${prismaModel}.deleteMany({})`
    );

    // === insertMany(data) ===
    c = c.replace(
      new RegExp(`await\\s+${mongoModel}\\.insertMany\\((\\w+)\\)`, 'g'),
      `await prisma.${prismaModel}.createMany({ data: $1 })`
    );
    c = c.replace(
      new RegExp(`${mongoModel}\\.insertMany\\((\\w+)\\)`, 'g'),
      `prisma.${prismaModel}.createMany({ data: $1 })`
    );

    // === new Model(data) ===
    c = c.replace(
      new RegExp(`new\\s+${mongoModel}\\(`, 'g'),
      '('
    );

    // === aggregate ===
    c = c.replace(
      new RegExp(`await\\s+${mongoModel}\\.aggregate\\(`, 'g'),
      `await prisma.${prismaModel}.findMany({ where: `
    );
    c = c.replace(
      new RegExp(`${mongoModel}\\.aggregate\\(`, 'g'),
      `prisma.${prismaModel}.findMany({ where: `
    );
  }

  // Step 4: Remove chained methods
  c = c.replace(/\.select\([^)]*\)/g, '');
  c = c.replace(/\s*\.populate\([^)]*\)/g, '');
  // Multi-line populate
  c = c.replace(/\s*\.populate\(\{[\s\S]*?\}\)/g, '');
  c = c.replace(/\.exec\(\)/g, '');
  c = c.replace(/\.lean\(\)/g, '');
  c = c.replace(/\.toObject\(\)/g, '');

  // Remove .sort(), .skip(), .limit() chains that are standalone
  c = c.replace(/\s*\.sort\(\{[^}]*\}\)/g, '');
  c = c.replace(/\s*\.skip\(\w+\)/g, '');
  c = c.replace(/\s*\.limit\(\w+\)/g, '');

  // Step 5: Convert .save() patterns
  // await doc.save() → need to use prisma update
  c = c.replace(
    /await\s+(\w+)\.save\([^)]*\);/g,
    '// Note: $1.save() pattern needs prisma.model.update() - see TODO below'
  );

  // Step 6: Fix _id → id
  c = c.replace(/\._id\b/g, '.id');
  c = c.replace(/\[\s*['"]_id['"]\s*\]/g, '["id"]');
  c = c.replace(/\{\s*_id\s*:/g, '{ id:');
  c = c.replace(/,\s*_id\s*:/g, ', id:');
  
  // mongoose.Types.ObjectId.isValid
  c = c.replace(
    /mongoose\.Types\.ObjectId\.isValid\(([^)]+)\)/g,
    '(typeof $1 === "string" && $1.length > 0)'
  );

  // Clean up
  c = c.replace(/\n{3,}/g, '\n\n');

  return c;
}

function main() {
  console.log('🔄 Reverting & clean-converting all route files...\n');
  
  const files = findAllRouteFiles(API_DIR);
  let reverted = 0;
  let converted = 0;
  let skipped = 0;

  for (const file of files) {
    const relativePath = path.relative(API_DIR, file);
    
    // Revert to git state
    const gitContent = revertFile(file);
    if (!gitContent) {
      console.log(`⏭️  ${relativePath} (new file, not in git)`);
      skipped++;
      continue;
    }

    // Check if file uses MongoDB
    if (!gitContent.includes('connectDB') && !gitContent.includes('@/models/') && !gitContent.includes('mongoose')) {
      console.log(`⏭️  ${relativePath} (no MongoDB usage)`);
      skipped++;
      continue;
    }

    // Write original back
    fs.writeFileSync(file, gitContent, 'utf-8');
    reverted++;

    // Clean convert
    const converted_content = cleanConvert(gitContent);
    fs.writeFileSync(file, converted_content, 'utf-8');
    converted++;
    console.log(`✅ ${relativePath}`);
  }

  console.log(`\n📊 Results: ${reverted} reverted, ${converted} converted, ${skipped} skipped`);
}

main();
