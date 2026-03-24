import { getServerAuth } from '@/lib/server-auth';
import { redirect } from 'next/navigation';
import PrintifyStockClient from './PrintifyStockClient';

export default async function PrintifyStockPage() {
  const { token } = await getServerAuth();
  if (!token) {
    redirect('/login');
  }

  return <PrintifyStockClient />;
}
