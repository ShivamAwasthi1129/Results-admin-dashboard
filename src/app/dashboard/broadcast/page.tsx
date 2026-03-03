import { DashboardLayout } from '@/components/layout';
import { MegaphoneIcon } from '@heroicons/react/24/outline';
import BroadcastClient from './BroadcastClient';

export default function BroadcastPage() {
  return (
    <DashboardLayout
      title="Broadcast"
      subtitle="Send geo-targeted push notifications to users within a radius"
      icon={<MegaphoneIcon className="w-7 h-7" />}
    >
      <BroadcastClient />
    </DashboardLayout>
  );
}
