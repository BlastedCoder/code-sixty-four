import { redirect } from 'next/navigation';

export default function HomePage() {
  // Automatically send users to the dashboard (or login) when they hit the root URL
  redirect('/dashboard');
}