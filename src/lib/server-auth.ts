import { cookies } from 'next/headers';
import { verifyToken, TokenPayload } from './auth';

export async function getServerAuth(): Promise<{ token: string | null; payload: TokenPayload | null }> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value || null;
    
    if (!token) {
      return { token: null, payload: null };
    }
    
    const payload = verifyToken(token);
    return { token, payload };
  } catch (error) {
    console.error('Error getting server auth:', error);
    return { token: null, payload: null };
  }
}

