/**
 * Automated API Route Converter: Mongoose → Prisma
 * 
 * This script automatically converts all Next.js API route files
 * from using Mongoose/MongoDB to Prisma/Postgres.
 * 
 * Usage: npx tsx scripts/convert-routes-to-prisma.ts
 */
import fs from 'fs';
import path from 'path';

const API_DIR = path.join(__dirname, '../src/app/api');

// Mapping of Mongoose model imports to Prisma model names
const MODEL_MAP: Record<string, string> = {
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

function findAllRouteFiles(dir: string): string[] {
  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findAllRouteFiles(fullPath));
    } else if (entry.name === 'route.ts') {
      files.push(fullPath);
    }
  }
  return files;
}

function convertFile(filePath: string): { changed: boolean; summary: string } {
  let content = fs.readFileSync(filePath, 'utf-8');
  const original = content;
  const relativePath = path.relative(API_DIR, filePath);
  
  // Skip files that don't use MongoDB
  if (!content.includes('connectDB') && !content.includes('mongoose') && !content.includes('@/models/')) {
    return { changed: false, summary: `⏭️  ${relativePath} (no MongoDB usage)` };
  }

  // 1. Replace MongoDB connection import with Prisma import
  content = content.replace(
    /import\s+connectDB\s+from\s+['"]@\/lib\/mongodb['"];?\n?/g,
    ''
  );
  content = content.replace(
    /import\s+\{\s*connectDB\s*\}\s+from\s+['"]@\/lib\/mongodb['"];?\n?/g,
    ''
  );

  // 2. Remove all Mongoose model imports and track which models are used
  const usedModels: string[] = [];
  for (const [modelName] of Object.entries(MODEL_MAP)) {
    const importRegex = new RegExp(
      `import\\s+(?:${modelName}|\\{[^}]*\\})\\s+from\\s+['"]@/models/${modelName}['"];?\\n?`,
      'g'
    );
    if (importRegex.test(content)) {
      usedModels.push(modelName);
      content = content.replace(importRegex, '');
    }
    // Also catch default imports with different patterns
    const importRegex2 = new RegExp(
      `import\\s+${modelName}\\s+from\\s+['"]@/models/${modelName}['"];?\\n?`,
      'g'
    );
    if (importRegex2.test(content)) {
      if (!usedModels.includes(modelName)) usedModels.push(modelName);
      content = content.replace(importRegex2, '');
    }
  }

  // Also remove any remaining model imports with wildcard pattern
  content = content.replace(
    /import\s+\w+\s+from\s+['"]@\/models\/\w+['"];?\n?/g,
    (match) => {
      // extract model name
      const m = match.match(/from\s+['"]@\/models\/(\w+)['"]/);
      if (m && MODEL_MAP[m[1]] && !usedModels.includes(m[1])) {
        usedModels.push(m[1]);
      }
      return '';
    }
  );

  // Remove imports of model interfaces/types
  content = content.replace(
    /import\s+(?:type\s+)?\{[^}]*\}\s+from\s+['"]@\/models\/\w+['"];?\n?/g,
    ''
  );

  // 3. Add Prisma import if not already present
  if (!content.includes("from '@/lib/prisma'") && !content.includes('from "@/lib/prisma"')) {
    // Add after the last import or at the top
    const lastImportIdx = content.lastIndexOf('import ');
    if (lastImportIdx !== -1) {
      const lineEnd = content.indexOf('\n', lastImportIdx);
      content = content.slice(0, lineEnd + 1) + "import prisma from '@/lib/prisma';\n" + content.slice(lineEnd + 1);
    } else {
      content = "import prisma from '@/lib/prisma';\n" + content;
    }
  }

  // 4. Remove await connectDB() calls
  content = content.replace(/\s*await\s+connectDB\(\);?\s*\n?/g, '\n');

  // 5. Convert Mongoose queries to Prisma queries for each model
  for (const [mongoModel, prismaModel] of Object.entries(MODEL_MAP)) {
    // findById(id) → findUnique({ where: { id } })
    content = content.replace(
      new RegExp(`${mongoModel}\\.findById\\(([^)]+)\\)`, 'g'),
      `prisma.${prismaModel}.findUnique({ where: { id: $1 } })`
    );

    // findOne({ field: value }) → findFirst({ where: { field: value } })
    content = content.replace(
      new RegExp(`${mongoModel}\\.findOne\\(`, 'g'),
      `prisma.${prismaModel}.findFirst({ where: `
    );
    
    // find({}) → findMany({})  and  find({ ... }) → findMany({ where: { ... } })
    content = content.replace(
      new RegExp(`${mongoModel}\\.find\\(\\{\\}\\)`, 'g'),
      `prisma.${prismaModel}.findMany()`
    );
    content = content.replace(
      new RegExp(`${mongoModel}\\.find\\(`, 'g'),
      `prisma.${prismaModel}.findMany({ where: `
    );

    // countDocuments() → count()
    content = content.replace(
      new RegExp(`${mongoModel}\\.countDocuments\\(\\)`, 'g'),
      `prisma.${prismaModel}.count()`
    );
    content = content.replace(
      new RegExp(`${mongoModel}\\.countDocuments\\(`, 'g'),
      `prisma.${prismaModel}.count({ where: `
    );

    // create(data) → create({ data })
    // Note: Mongoose's Model.create(data) takes the data directly, Prisma needs { data: ... }
    content = content.replace(
      new RegExp(`${mongoModel}\\.create\\(`, 'g'),
      `prisma.${prismaModel}.create({ data: `
    );

    // findByIdAndUpdate(id, data, opts) → update({ where: { id }, data })
    content = content.replace(
      new RegExp(`${mongoModel}\\.findByIdAndUpdate\\(`, 'g'),
      `prisma.${prismaModel}.update({ where: { id: `
    );

    // findByIdAndDelete(id) → delete({ where: { id } })
    content = content.replace(
      new RegExp(`${mongoModel}\\.findByIdAndDelete\\(([^)]+)\\)`, 'g'),
      `prisma.${prismaModel}.delete({ where: { id: $1 } })`
    );

    // deleteMany({}) → deleteMany({})
    content = content.replace(
      new RegExp(`${mongoModel}\\.deleteMany\\(`, 'g'),
      `prisma.${prismaModel}.deleteMany({ where: `
    );

    // insertMany(data) → createMany({ data })
    content = content.replace(
      new RegExp(`${mongoModel}\\.insertMany\\(`, 'g'),
      `prisma.${prismaModel}.createMany({ data: `
    );

    // new Model(data) → (just data, since Prisma doesn't use constructors)
    content = content.replace(
      new RegExp(`new\\s+${mongoModel}\\(`, 'g'),
      `/* prisma.${prismaModel}.create({ data: */ (`
    );

    // Model.aggregate → comment out (needs manual conversion)
    content = content.replace(
      new RegExp(`${mongoModel}\\.aggregate\\(`, 'g'),
      `/* TODO: Convert aggregate to Prisma */ prisma.${prismaModel}.findMany({ where: `
    );
  }

  // 6. Fix common Mongoose patterns
  // .save() → (handled in create/update above)
  // .lean() → remove (Prisma returns plain objects by default)
  content = content.replace(/\.lean\(\)/g, '');
  
  // .sort({ field: -1 }) → (needs to be part of findMany)
  // .limit(n) → (needs to be part of findMany)
  // .skip(n) → (needs to be part of findMany)
  // These are chained, so we'll leave them as-is and fix in manual review
  
  // Remove .toObject() calls
  content = content.replace(/\.toObject\(\)/g, '');
  
  // _id → id (MongoDB uses _id, Prisma uses id)
  content = content.replace(/\._id/g, '.id');
  content = content.replace(/\['_id'\]/g, "['id']");
  content = content.replace(/\["_id"\]/g, '["id"]');
  // In query objects: { _id: ... } → { id: ... }
  content = content.replace(/\{\s*_id\s*:/g, '{ id:');
  content = content.replace(/,\s*_id\s*:/g, ', id:');

  // 7. Remove mongoose import if present
  content = content.replace(/import\s+mongoose[^;]*;\n?/g, '');
  content = content.replace(/import\s+\{\s*Types\s*\}\s+from\s+['"]mongoose['"];?\n?/g, '');
  
  // mongoose.Types.ObjectId.isValid() → just check if it's a string
  content = content.replace(
    /mongoose\.Types\.ObjectId\.isValid\(([^)]+)\)/g,
    '(typeof $1 === "string" && $1.length > 0)'
  );
  
  // Remove void Model imports (used for side effects in MongoDB)
  content = content.replace(/void\s+\w+;\n?/g, '');

  // 8. Clean up multiple blank lines
  content = content.replace(/\n{3,}/g, '\n\n');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf-8');
    return { changed: true, summary: `✅ ${relativePath} (models: ${usedModels.join(', ') || 'none detected'})` };
  }

  return { changed: false, summary: `⏭️  ${relativePath} (no changes needed)` };
}

function main() {
  console.log('🔄 Converting API routes from Mongoose to Prisma...\n');
  
  const files = findAllRouteFiles(API_DIR);
  console.log(`Found ${files.length} route files\n`);
  
  let changed = 0;
  let skipped = 0;
  
  for (const file of files) {
    const result = convertFile(file);
    console.log(result.summary);
    if (result.changed) changed++;
    else skipped++;
  }
  
  console.log(`\n📊 Results: ${changed} files converted, ${skipped} files skipped`);
  console.log('\n⚠️  NOTE: Some files may need manual review for:');
  console.log('  - Complex Mongoose queries (.sort, .limit, .skip, .populate)');
  console.log('  - Aggregate pipelines');
  console.log('  - Model.save() patterns (need conversion to create/update)');
  console.log('  - findByIdAndUpdate with complex options');
}

main();
