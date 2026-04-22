import { DashboardLayout } from '@/components/layout';
import { Squares2X2Icon } from '@heroicons/react/24/outline';
import HomepageManagementClient from './HomepageManagementClient';

export default function HomepageManagementPage() {
  return (
    <DashboardLayout
      title="Home page management"
      subtitle="Edit homepage sections, publish versions, and expose content to the marketing site API"
      icon={<Squares2X2Icon className="w-7 h-7" />}
    >
      <HomepageManagementClient />
    </DashboardLayout>
  );
}
