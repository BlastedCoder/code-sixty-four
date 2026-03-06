// components/Avatar.tsx
'use client';

import Image from 'next/image';

interface AvatarProps {
    src?: string | null;
    name?: string | null;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

const sizeMap = {
    sm: { container: 'w-7 h-7', text: 'text-[10px]' },
    md: { container: 'w-9 h-9', text: 'text-xs' },
    lg: { container: 'w-16 h-16', text: 'text-xl' },
};

// Generate a consistent color from a name string
function nameToColor(name: string): string {
    const colors = [
        'bg-emerald-500', 'bg-blue-500', 'bg-violet-500', 'bg-amber-500',
        'bg-rose-500', 'bg-cyan-500', 'bg-fuchsia-500', 'bg-orange-500',
        'bg-teal-500', 'bg-indigo-500', 'bg-pink-500', 'bg-lime-500',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
}

export default function Avatar({ src, name, size = 'md', className = '' }: AvatarProps) {
    const { container, text } = sizeMap[size];
    const initial = name ? name.charAt(0).toUpperCase() : '?';
    const bgColor = name ? nameToColor(name) : 'bg-slate-400';

    if (src) {
        return (
            <div className={`${container} relative rounded-full overflow-hidden ring-2 ring-white dark:ring-slate-700 flex-shrink-0 ${className}`}>
                <Image
                    src={src}
                    alt={name || 'Avatar'}
                    fill
                    className="object-cover"
                    sizes="64px"
                />
            </div>
        );
    }

    return (
        <div className={`${container} ${bgColor} rounded-full flex items-center justify-center ring-2 ring-white dark:ring-slate-700 flex-shrink-0 ${className}`}>
            <span className={`${text} font-extrabold text-white leading-none`}>
                {initial}
            </span>
        </div>
    );
}
