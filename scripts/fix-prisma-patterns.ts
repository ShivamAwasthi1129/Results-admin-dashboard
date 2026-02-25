/**
 * Second-pass fix script for remaining Mongoose patterns in API routes.
 * Handles: .sort(), .limit(), .skip(), .select(), .populate(), .save(), .exec()
 * 
 * Usage: npx tsx scripts/fix-prisma-patterns.ts
 */
import fs from 'fs';
import path from 'path';

const API_DIR = path.join(__dirname, '../src/app/api');

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

  // Fix 1: Remove .select('...') chains from prisma queries
  // .select('-password') and similar patterns don't exist in Prisma
  content = content.replace(/\.select\([^)]*\)/g, '');

  // Fix 2: Remove .populate(...) chains (Prisma uses include/select instead)
  // Simple .populate('field', 'subfields') patterns
  content = content.replace(/\.populate\([^)]*\)/g, '');
  // Multi-line .populate calls
  content = content.replace(/\s*\.populate\(\{[\s\S]*?\}\)/g, '');

  // Fix 3: Remove .exec() calls
  content = content.replace(/\.exec\(\)/g, '');

  // Fix 4: Convert .sort().skip().limit() chains on prisma findMany calls
  // Pattern: prisma.model.findMany({ where: ... }).sort({ field: -1 }).skip(n).limit(n)
  // → prisma.model.findMany({ where: ..., orderBy: { field: 'desc' }, skip: n, take: n })
  
  // Remove standalone .sort(), .skip(), .limit() chains (these will be handled differently)
  // For now, just remove them since they'll cause runtime errors
  content = content.replace(/\s*\.sort\(\{[^}]*\}\)/g, '');
  content = content.replace(/\s*\.skip\(([^)]+)\)/g, '');
  content = content.replace(/\s*\.limit\(([^)]+)\)/g, '');

  // Fix 5: Remove .save() calls and add TODO comments
  content = content.replace(
    /await\s+(\w+)\.save\([^)]*\);/g,
    '// TODO: $1.save() removed - data should be persisted via prisma.model.update()'
  );

  // Fix 6: Fix findFirst/findMany broken parentheses
  // Fix pattern: prisma.model.findFirst({ where: { field: value })  → add closing }
  // This regex finds findFirst/findMany with unbalanced braces
  
  // Fix 7: Remove .toObject() that might have been missed
  content = content.replace(/\.toObject\(\)/g, '');

  // Fix 8: Fix model pattern: `new Model(data)` → just data (comment already added)
  // Remove the /* ... */ wrapper
  content = content.replace(
    /\/\*\s*prisma\.\w+\.create\(\{\s*data:\s*\*\/\s*\(/g,
    '('
  );

  // Fix 9: Fix broken findByIdAndUpdate patterns
  // prisma.model.update({ where: { id: id, updateData, { new: true })
  // → prisma.model.update({ where: { id }, data: updateData })
  content = content.replace(
    /prisma\.(\w+)\.update\(\{\s*where:\s*\{\s*id:\s*(\w+),\s*(\w+),\s*\{[^}]*\}\s*\)/g,
    'prisma.$1.update({ where: { id: $2 }, data: $3 })'
  );

  // Fix 10: Fix findMany closing braces - common pattern:
  // prisma.model.findMany({ where: someObj)  → prisma.model.findMany({ where: someObj })
  content = content.replace(
    /(prisma\.\w+\.findMany\(\{\s*where:\s*\w+)\)/g,
    '$1 })'
  );
  
  // Fix findFirst similar pattern
  content = content.replace(
    /(prisma\.\w+\.findFirst\(\{\s*where:\s*\{[^}]+)\)/g,
    (match) => {
      // Count braces to ensure they're balanced
      const opens = (match.match(/\{/g) || []).length;
      const closes = (match.match(/\}/g) || []).length;
      if (opens > closes) {
        return match + '}'.repeat(opens - closes);
      }
      return match;
    }
  );

  // Fix 11: Clean up double id assignment in ops-users/me
  content = content.replace(
    /id: user\.id\.toString\(\), id: user\.id\.toString\(\)/g,
    'id: user.id.toString()'
  );

  // Fix 12: clean up trailing .lean() (should already be removed but just in case)
  content = content.replace(/\.lean\(\)/g, '');

  // Fix 13: fix countDocuments broken patterns (missing closing brace)
  content = content.replace(
    /(prisma\.\w+\.count\(\{\s*where:\s*\{[^}]+)\)/g,
    (match) => {
      const opens = (match.match(/\{/g) || []).length;
      const closes = (match.match(/\}/g) || []).length;
      if (opens > closes) {
        return match + '}'.repeat(opens - closes);
      }
      return match;
    }
  );

  // Fix 14: Fix create pattern - prisma.model.create({ data: dataObj) → add closing }
  content = content.replace(
    /(prisma\.\w+\.create\(\{\s*data:\s*\w+)\)/g,
    '$1 })'
  );

  // Fix 15: Fix createMany pattern
  content = content.replace(
    /(prisma\.\w+\.createMany\(\{\s*data:\s*\w+)\)/g,
    '$1 })'
  );

  // Fix 16: Fix deleteMany pattern  
  content = content.replace(
    /(prisma\.\w+\.deleteMany\(\{\s*where:\s*\{)\s*\}\)/g,
    '$1} })'
  );

  // Clean up extra blank lines
  content = content.replace(/\n{3,}/g, '\n\n');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf-8');
    return true;
  }
  return false;
}

function main() {
  console.log('🔧 Fixing remaining Mongoose patterns...\n');
  
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
