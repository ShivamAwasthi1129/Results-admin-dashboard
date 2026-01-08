import { DashboardLayout } from '@/components/layout';
import { Card } from '@/components/ui';
import { Loader } from '@/components/ui';

export default function Loading() {
  return (
    <DashboardLayout title="Volunteers" subtitle="Manage volunteer information">
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
