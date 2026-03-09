/**
 * Test script: fetch NASA EONET API (hurricanes + wildfires) and log response structure.
 * Run: node scripts/test-nasa-eonet.mjs
 */
const EONET_URL = 'https://eonet.gsfc.nasa.gov/api/v3/events';

async function test() {
  console.log('Fetching NASA EONET - wildfires (limit 2)...');
  const w = await fetch(`${EONET_URL}?category=wildfires&status=open&limit=2`).then((r) => r.json());
  console.log('Wildfires response keys:', Object.keys(w));
  console.log('Wildfires events count:', w.events?.length ?? 0);
  if (w.events?.[0]) {
    const e = w.events[0];
    console.log('First event keys:', Object.keys(e));
    console.log('Sample event:', JSON.stringify({ id: e.id, title: e.title, categories: e.categories, geometryLength: e.geometry?.length }, null, 2));
    if (e.geometry?.[0]) console.log('First geometry:', JSON.stringify(e.geometry[0], null, 2));
  }

  console.log('\nFetching NASA EONET - severeStorms (limit 2)...');
  const s = await fetch(`${EONET_URL}?category=severeStorms&status=open&limit=2`).then((r) => r.json());
  console.log('Severe storms events count:', s.events?.length ?? 0);
  if (s.events?.[0]) {
    const e = s.events[0];
    console.log('Sample event:', JSON.stringify({ id: e.id, title: e.title, categories: e.categories }, null, 2));
  }
  console.log('\nDone.');
}

test().catch((err) => console.error('Error:', err));
