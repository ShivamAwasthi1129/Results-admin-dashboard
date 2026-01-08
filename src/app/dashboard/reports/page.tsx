import ReportsClient from './ReportsClient';

// Reports are generated on-demand, so no initial data fetching needed
export default async function ReportsPage() {
  return (
    <ReportsClient />
  );
}
