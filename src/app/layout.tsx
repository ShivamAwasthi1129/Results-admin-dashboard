import type { Metadata } from 'next';
import { Cabin } from 'next/font/google';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { NotificationProvider } from '@/context/NotificationContext';
import { SearchProvider } from '@/context/SearchContext';
import SearchModal from '@/components/ui/SearchModal';
import './globals.css';

const cabin = Cabin({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-cabin',
});

export const metadata: Metadata = {
  title: 'Results - Disaster Management Admin Panel',
  description: 'Comprehensive disaster management and relief coordination platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning className={cabin.variable}>
      <body className={cabin.className}>
        <ThemeProvider>
          <AuthProvider>
            <NotificationProvider>
              <SearchProvider>
                {children}
                <SearchModal />
                <ToastContainer
                  position="top-right"
                  autoClose={4000}
                  hideProgressBar={false}
                  newestOnTop
                  closeOnClick
                  rtl={false}
                  pauseOnFocusLoss
                  draggable
                  pauseOnHover
                  theme="colored"
                />
              </SearchProvider>
            </NotificationProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
