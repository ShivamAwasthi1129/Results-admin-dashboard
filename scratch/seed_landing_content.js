const fs = require('fs');
const path = require('path');

async function seed() {
  const loginUrl = 'https://r3sults-backend.vercel.app/api/admin-auth/login';
  const seedUrl = 'https://r3sults-backend.vercel.app/api/admin/landing-content/seed';
  const bulkUrl = 'https://r3sults-backend.vercel.app/api/admin/landing-content/bulk';

  try {
    // 1. Login
    console.log('Logging in...');
    const loginRes = await fetch(loginUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'superadmin@results.com',
        password: 'superadmin123'
      })
    });
    const loginData = await loginRes.json();
    if (!loginData.success) {
      console.error('Login failed:', loginData);
      return;
    }
    const token = loginData.data?.token || loginData.token;
    console.log('Login successful.');

    // 2. Read JSON
    const jsonPath = path.join(__dirname, '..', 'docs', 'cms-page-content-structure.json');
    const rawData = fs.readFileSync(jsonPath, 'utf8');
    const content = JSON.parse(rawData);

    // 3. Prepare items for bulk upsert
    const items = [];
    
    // Pages: home, about, contact
    for (const [pageName, sections] of Object.entries(content.pages)) {
      if (pageName === 'home' || pageName === 'about' || pageName === 'contact') {
        for (const [sectionName, sectionContent] of Object.entries(sections)) {
          if (sectionName === 'footerRef') continue;
          items.push({
            page: pageName,
            section: sectionName,
            content: sectionContent,
            sortOrder: 0
          });
        }
      }
    }

    // Shared sections
    for (const [sectionName, sectionContent] of Object.entries(content.shared)) {
      items.push({
        page: 'shared',
        section: sectionName,
        content: sectionContent,
        sortOrder: 0
      });
    }

    console.log(`Prepared ${items.length} sections for seeding.`);

    // 4. Bulk Upsert
    console.log('Sending bulk upsert...');
    const bulkRes = await fetch(bulkUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ items })
    });

    const bulkData = await bulkRes.json();
    console.log('Seed Result:', JSON.stringify(bulkData, null, 2));

  } catch (error) {
    console.error('Error during seeding:', error);
  }
}

seed();
