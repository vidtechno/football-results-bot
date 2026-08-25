'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  Landmark,
  Building2,
  Smartphone,
  Zap,
  Radio,
  GraduationCap,
  Stethoscope,
  ShieldCheck,
  CreditCard,
  ShoppingBag,
  Car,
  Truck,
} from 'lucide-react';
import { clsx } from 'clsx';

interface OrganizationAvatarProps {
  name: string;
  logoUrl?: string | null;
  type?: 'bank' | 'government' | 'public_service' | 'utility' | 'telecom' | 'private_service' | string;
  categorySlug?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function OrganizationAvatar({
  name,
  logoUrl,
  type,
  categorySlug,
  size = 'md',
  className,
}: OrganizationAvatarProps) {
  const [imageError, setImageError] = useState(false);

  // Dimension mapping
  const sizeClasses = {
    sm: 'w-9 h-9 text-xs rounded-xl',
    md: 'w-12 h-12 text-sm rounded-2xl',
    lg: 'w-14 h-14 sm:w-16 sm:h-16 text-base sm:text-lg rounded-2xl',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-7 h-7 sm:w-8 sm:h-8',
  };

  const pixelDimensions = {
    sm: 36,
    md: 48,
    lg: 64,
  };

  // Determine fallback icon & background theme
  const getFallbackTheme = () => {
    const t = type?.toLowerCase() || '';
    const c = categorySlug?.toLowerCase() || '';

    if (t === 'bank' || c.includes('bank')) {
      return {
        gradient: 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-blue-500/20',
        Icon: Landmark,
      };
    }
    if (t === 'government' || c.includes('davlat')) {
      return {
        gradient: 'bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-indigo-500/20',
        Icon: Building2,
      };
    }
    if (t === 'telecom' || c.includes('mobil') || c.includes('internet')) {
      return {
        gradient: 'bg-gradient-to-tr from-cyan-600 to-blue-600 text-white shadow-cyan-500/20',
        Icon: Radio,
      };
    }
    if (t === 'utility' || c.includes('kommunal')) {
      return {
        gradient: 'bg-gradient-to-tr from-amber-500 to-orange-600 text-white shadow-amber-500/20',
        Icon: Zap,
      };
    }
    if (c.includes('tibbiyot')) {
      return {
        gradient: 'bg-gradient-to-tr from-rose-500 to-pink-600 text-white shadow-rose-500/20',
        Icon: Stethoscope,
      };
    }
    if (c.includes('talim')) {
      return {
        gradient: 'bg-gradient-to-tr from-purple-600 to-pink-600 text-white shadow-purple-500/20',
        Icon: GraduationCap,
      };
    }
    if (c.includes('sugurta')) {
      return {
        gradient: 'bg-gradient-to-tr from-teal-600 to-emerald-600 text-white shadow-teal-500/20',
        Icon: ShieldCheck,
      };
    }
    if (c.includes('tolov')) {
      return {
        gradient: 'bg-gradient-to-tr from-emerald-600 to-green-600 text-white shadow-emerald-500/20',
        Icon: CreditCard,
      };
    }
    if (c.includes('market')) {
      return {
        gradient: 'bg-gradient-to-tr from-fuchsia-600 to-pink-600 text-white shadow-fuchsia-500/20',
        Icon: ShoppingBag,
      };
    }

    return {
      gradient: 'bg-gradient-to-tr from-blue-600 to-sky-500 text-white shadow-blue-500/20',
      Icon: Building2,
    };
  };

  const theme = getFallbackTheme();
  const FallbackIcon = theme.Icon;
  const initial = name ? name.trim().charAt(0).toUpperCase() : 'B';

  // If valid logo URL and no error so far
  if (logoUrl && !imageError) {
    return (
      <div
        className={clsx(
          'bg-white border border-slate-200/90 p-1.5 flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden',
          sizeClasses[size],
          className,
        )}
      >
        <Image
          src={logoUrl}
          alt={name}
          width={pixelDimensions[size]}
          height={pixelDimensions[size]}
          className="object-contain max-h-full max-w-full"
          onError={() => setImageError(true)}
          unoptimized
        />
      </div>
    );
  }

  // Polished Fallback Avatar
  return (
    <div
      className={clsx(
        'flex items-center justify-center font-black flex-shrink-0 shadow-md transition-transform duration-200',
        sizeClasses[size],
        theme.gradient,
        className,
      )}
      title={name}
    >
      <FallbackIcon className={iconSizes[size]} />
    </div>
  );
}
