import { Metadata } from 'next';
import AuthorAnalyticsDashboard from '@/components/author/AuthorAnalyticsDashboard';

export const metadata: Metadata = {
  title: 'Muallif analitikasi',
  description: 'Asarlaringiz mutolaasi, kitobxonlar dinamikasi va boblar voronkasi tahlili',
};

export default function AuthorAnalyticsPage() {
  return <AuthorAnalyticsDashboard />;
}
