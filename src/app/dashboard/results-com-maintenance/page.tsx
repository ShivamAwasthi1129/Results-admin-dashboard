import { DashboardLayout } from '@/components/layout';
import { WrenchScrewdriverIcon } from '@heroicons/react/24/outline';
import ResultsComMaintenanceClient from './ResultsComMaintenanceClient';

export default function ResultsComMaintenancePage() {
  return (
    <DashboardLayout
      title="Maintenance Page"
      subtitle="Control which pages of Results.com are shown as 'Under Construction' to visitors"
      icon={<WrenchScrewdriverIcon className="w-7 h-7" />}
    >
      <ResultsComMaintenanceClient />
    </DashboardLayout>
  );
}
