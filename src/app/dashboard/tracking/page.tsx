import { getServerAuth } from '@/lib/server-auth';
import TrackingClient from './TrackingClient';

export default async function TrackingPage() {
  const { token } = await getServerAuth();

  return <TrackingClient token={token} />;
}
