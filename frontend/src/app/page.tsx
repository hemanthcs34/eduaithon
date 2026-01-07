"use client";
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.push('/login');
  }, [router]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center text-white p-20 text-center">
      Redirecting to CourseTwin Lite...
    </div>
  );
}
