'use client';

import React from 'react';
import { PageTransition } from 'src/components/MotionComponents';

export default function Template({ children }: { children: React.ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
