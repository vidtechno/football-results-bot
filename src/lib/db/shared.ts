import * as React from 'react';

/** React `cache` bor bo'lsa — so'rov doirasida natijani eslab qoladi; testlarda esa oddiy funksiya. */
export const requestCache: <T extends (...args: any[]) => any>(fn: T) => T =
  typeof (React as any).cache === 'function'
    ? (React as any).cache
    : <T extends (...args: any[]) => any>(fn: T): T => fn;
