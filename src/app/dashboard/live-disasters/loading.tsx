import { DashboardLayout } from '@/components/layout';
import { Card } from '@/components/ui';
import { Loader } from '@/components/ui';
import { GlobeAltIcon } from '@heroicons/react/24/outline';

export default function Loading() {
  return (
    <DashboardLayout title="Live Disasters" subtitle="Real-time disaster monitoring" icon={<GlobeAltIcon className="w-7 h-7" />}>
      <div className="space-y-6">
        <Card className="p-6">
          <div className="flex items-center justify-center h-64">
            <Loader size="lg" />
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
