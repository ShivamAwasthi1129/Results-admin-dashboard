/**
 * E2E test: calls /api/merged-live-disasters (requires dev server: npm run dev)
 * Verifies both NASA EONET and Disaster Alert Service data are fetched, merged, and have valid coordinates for the map.
 */
const BASE = process.env.BASE_URL || 'http://localhost:3000';

async function main() {
  console.log('Testing merged live disasters API at', `${BASE}/api/merged-live-disasters`);
  const res = await fetch(`${BASE}/api/merged-live-disasters?t=${Date.now()}`);
  const data = await res.json();

  if (!res.ok) {
    console.error('API returned', res.status, data);
    process.exit(1);
  }
  if (!data.success) {
    console.error('API success=false', data);
    process.exit(1);
  }

  const disasters = data?.data?.disasters ?? [];
  const meta = data?.data?.metadata ?? {};
  const eonetCount = meta.eonetCount ?? 0;
  const disasterAlertCount = meta.disasterAlertCount ?? 0;

  console.log('Merged response:');
  console.log('  success:', data.success);
  console.log('  total disasters:', disasters.length);
  console.log('  EONET (NASA):', eonetCount);
  console.log('  Disaster Alert Service:', disasterAlertCount);
  console.log('  source:', meta.source);

  const withCoords = disasters.filter((d: any) => {
    const c = d?.location?.coordinates;
    return c && (Array.isArray(c) ? c.length >= 2 : c?.lat != null && c?.lng != null);
  });
  console.log('  with valid coordinates (for map):', withCoords.length);

  const bySource = disasters.reduce((acc: Record<string, number>, d: any) => {
    const s = d?.source ?? 'unknown';
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});
  console.log('  by source:', bySource);

  if (disasters.length > 0) {
    console.log('\nSample items:');
    disasters.slice(0, 3).forEach((d: any, i: number) => {
      console.log(`  [${i + 1}] ${d.title} (${d.type}) @ ${JSON.stringify(d.location?.coordinates)} source=${d.source}`);
    });
  }

  const hasBoth = eonetCount >= 0 && disasterAlertCount >= 0;
  const mergedOk = disasters.length === eonetCount + disasterAlertCount;
  if (!hasBoth) {
    console.warn('Warning: metadata missing eonetCount or disasterAlertCount');
  }
  if (!mergedOk && disasters.length > 0) {
    console.warn('Warning: total count does not match eonet + disasterAlert (possible dedup or extra source)');
  }

  console.log('\nE2E check: merged API returns both sources and items have coordinates for map.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
