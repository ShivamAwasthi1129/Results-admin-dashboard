import { DashboardLayout } from '@/components/layout';
import { GlobeAltIcon } from '@heroicons/react/24/outline';
import ResultsHomepageClient from './ResultsHomepageClient';

export default function ResultsHomepagePage() {
  return (
    <DashboardLayout
      title="Results.org — Home Page CMS"
      subtitle="Manage the r3sults.org landing page content — edit all 9 sections, upload media, and publish changes via the CMS API"
      icon={<GlobeAltIcon className="w-7 h-7" />}
    >
      <ResultsHomepageClient />
    </DashboardLayout>
  );
}
