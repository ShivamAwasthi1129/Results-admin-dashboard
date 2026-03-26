import { DashboardLayout } from '@/components/layout';
import { EnvelopeIcon } from '@heroicons/react/24/outline';
import NewsletterClient from './NewsletterClient';

export default function NewsletterPage() {
  return (
    <DashboardLayout
      title="Newsletter"
      subtitle="Manage subscribers and send newsletter campaigns"
      icon={<EnvelopeIcon className="w-7 h-7" />}
    >
      <NewsletterClient />
    </DashboardLayout>
  );
}

