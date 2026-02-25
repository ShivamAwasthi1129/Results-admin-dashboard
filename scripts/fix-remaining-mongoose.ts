/**
 * Targeted fix for remaining Mongoose references that the main conversion missed.
 * These are complex multi-line patterns or operations like deleteOne, updateOne, findOneAndUpdate.
 * 
 * Usage: npx tsx scripts/fix-remaining-mongoose.ts
 */
import fs from 'fs';
import path from 'path';

const API_DIR = path.join(__dirname, '../src/app/api');

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
  'CategoryDocument': 'adminCategoryDocReq',
};

function findAllTsFiles(dir: string): string[] {
  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findAllTsFiles(fullPath));
    } else if (entry.name.endsWith('.ts')) {
      files.push(fullPath);
    }
  }
  return files;
}

function fixFile(filePath: string): boolean {
  let content = fs.readFileSync(filePath, 'utf-8');
  const original = content;

  for (const [mongoModel, prismaModel] of Object.entries(MODELS)) {
    // countDocuments(query) → count({ where: query })
    content = content.replace(
      new RegExp(`${mongoModel}\\.countDocuments\\((\\w+)\\)`, 'g'),
      `prisma.${prismaModel}.count({ where: $1 })`
    );
    content = content.replace(
      new RegExp(`${mongoModel}\\.countDocuments\\(\\{([^}]*)\\}\\)`, 'g'),
      `prisma.${prismaModel}.count({ where: {$1} })`
    );
    content = content.replace(
      new RegExp(`${mongoModel}\\.countDocuments\\(\\)`, 'g'),
      `prisma.${prismaModel}.count()`
    );

    // deleteOne({ field: value }) → delete({ where: { field: value } })
    content = content.replace(
      new RegExp(`${mongoModel}\\.deleteOne\\((\\{[^}]*\\})\\)`, 'g'),
      `prisma.${prismaModel}.deleteMany({ where: $1 })`
    );

    // updateOne({ filter }, { $set: update }) → update({ where: filter, data: update })
    content = content.replace(
      new RegExp(`${mongoModel}\\.updateOne\\(`, 'g'),
      `prisma.${prismaModel}.updateMany({ where: `
    );

    // updateMany({ filter }, { $set: update }) → updateMany({ where: filter, data: update })
    content = content.replace(
      new RegExp(`${mongoModel}\\.updateMany\\(`, 'g'),
      `prisma.${prismaModel}.updateMany({ where: `
    );

    // findOneAndUpdate(filter, update, opts) → update({ where: filter, data: update })
    content = content.replace(
      new RegExp(`${mongoModel}\\.findOneAndUpdate\\(`, 'g'),
      `prisma.${prismaModel}.updateMany({ where: `
    );

    // findOne({ ... }) → findFirst({ where: { ... } })
    content = content.replace(
      new RegExp(`${mongoModel}\\.findOne\\(`, 'g'),
      `prisma.${prismaModel}.findFirst({ where: `
    );

    // find({ ... }) → findMany({ where: { ... } })
    content = content.replace(
      new RegExp(`${mongoModel}\\.find\\(\\{\\}\\)`, 'g'),
      `prisma.${prismaModel}.findMany()`
    );
    content = content.replace(
      new RegExp(`${mongoModel}\\.find\\(\\)`, 'g'),
      `prisma.${prismaModel}.findMany()`
    );
    content = content.replace(
      new RegExp(`${mongoModel}\\.find\\(`, 'g'),
      `prisma.${prismaModel}.findMany({ where: `
    );

    // findById(id) → findUnique({ where: { id: id } })
    content = content.replace(
      new RegExp(`${mongoModel}\\.findById\\(([^)]+)\\)`, 'g'),
      `prisma.${prismaModel}.findUnique({ where: { id: $1 } })`
    );
    
    // findByIdAndUpdate(id, data, opts) → update({ where: { id }, data })
    content = content.replace(
      new RegExp(`${mongoModel}\\.findByIdAndUpdate\\(`, 'g'),
      `prisma.${prismaModel}.update({ where: { id: `
    );
    
    // findByIdAndDelete(id) → delete({ where: { id: id } })
    content = content.replace(
      new RegExp(`${mongoModel}\\.findByIdAndDelete\\(([^)]+)\\)`, 'g'),
      `prisma.${prismaModel}.delete({ where: { id: $1 } })`
    );

    // create(data) → create({ data })
    content = content.replace(
      new RegExp(`${mongoModel}\\.create\\(`, 'g'),
      `prisma.${prismaModel}.create({ data: `
    );

    // insertMany(data) → createMany({ data })
    content = content.replace(
      new RegExp(`${mongoModel}\\.insertMany\\(`, 'g'),
      `prisma.${prismaModel}.createMany({ data: `
    );
  }

  // Fix MongoDB query operators → Prisma equivalents
  // { $in: [...] } → { in: [...] }
  content = content.replace(/\{\s*\$in:\s*/g, '{ in: ');
  
  // { $lt: value } → { lt: value }
  content = content.replace(/\{\s*\$lt:\s*/g, '{ lt: ');
  
  // { $gt: value } → { gt: value }
  content = content.replace(/\{\s*\$gt:\s*/g, '{ gt: ');
  
  // { $gte: value } → { gte: value }
  content = content.replace(/\{\s*\$gte:\s*/g, '{ gte: ');
  
  // { $lte: value } → { lte: value }
  content = content.replace(/\{\s*\$lte:\s*/g, '{ lte: ');
  
  // { $ne: value } → { not: value }
  content = content.replace(/\{\s*\$ne:\s*/g, '{ not: ');
  
  // { $set: data } → just data (Prisma update takes data directly)
  content = content.replace(/\{\s*\$set:\s*/g, '');
  
  // { $regex: pattern, $options: 'i' } → { contains: pattern, mode: 'insensitive' }
  // This is complex, just flag it
  
  // Remove $or, $and patterns (these need manual handling)
  // But convert simple $or to Prisma OR
  
  // Remove $exists: true
  content = content.replace(/\$exists:\s*true,?\s*/g, '');
  content = content.replace(/,?\s*\$exists:\s*true/g, '');
  
  // mongoose.Types.ObjectId references
  content = content.replace(/new\s+mongoose\.Types\.ObjectId\(([^)]+)\)/g, '$1');
  content = content.replace(/mongoose\.Types\.ObjectId\.isValid\(([^)]+)\)/g, '(typeof $1 === "string" && $1.length > 0)');
  
  // Remove remaining mongoose import if present
  content = content.replace(/import\s+mongoose[^;]*;\s*\n/g, '');
  
  // Remove .select() .populate() .sort() .skip() .limit() .exec() .lean() .toObject()
  content = content.replace(/\.select\([^)]*\)/g, '');
  content = content.replace(/\s*\.populate\([^)]*\)/g, '');
  content = content.replace(/\.exec\(\)/g, '');
  content = content.replace(/\.lean\(\)/g, '');
  content = content.replace(/\.toObject\(\)/g, '');
  content = content.replace(/\s*\.sort\(\{[^}]*\}\)/g, '');
  content = content.replace(/\s*\.skip\(\w+\)/g, '');
  content = content.replace(/\s*\.limit\(\w+\)/g, '');

  // Clean up multiple blank lines
  content = content.replace(/\n{3,}/g, '\n\n');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf-8');
    return true;
  }
  return false;
}

function main() {
  console.log('🔧 Fixing remaining Mongoose references...\n');
  
  const files = findAllTsFiles(API_DIR);
  let fixed = 0;

  for (const file of files) {
    const relativePath = path.relative(API_DIR, file);
    const changed = fixFile(file);
    if (changed) {
      console.log(`✅ Fixed: ${relativePath}`);
      fixed++;
    }
  }

  console.log(`\n📊 Fixed ${fixed} files`);
}

main();
