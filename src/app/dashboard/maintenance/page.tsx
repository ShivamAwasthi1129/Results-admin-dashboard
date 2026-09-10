import { DashboardLayout } from '@/components/layout';
import { WrenchScrewdriverIcon } from '@heroicons/react/24/outline';
import MaintenancePageClient from './MaintenancePageClient';

export default function MaintenancePage() {
  return (
    <DashboardLayout
      title="Maintenance Page"
      subtitle="Control which pages of R3sults.org are shown as 'Under Construction' to visitors"
      icon={<WrenchScrewdriverIcon className="w-7 h-7" />}
    >
      <MaintenancePageClient />
    </DashboardLayout>
  );
}
