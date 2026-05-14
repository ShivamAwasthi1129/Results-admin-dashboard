import { DashboardLayout } from '@/components/layout';
import { Squares2X2Icon } from '@heroicons/react/24/outline';
import HomepageManagementClient from './HomepageManagementClient';

export default function HomepageManagementPage() {
  return (
    <DashboardLayout
      title="Home Page Management"
      subtitle="Manage landing page content — edit sections, upload media, and publish changes via the CMS API"
      icon={<Squares2X2Icon className="w-7 h-7" />}
    >
      <HomepageManagementClient />
    </DashboardLayout>
  );
}
