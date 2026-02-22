'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useMemo } from 'react';
import { formatCount, formatTimeAgo } from '@/utils/formatters';

export default function ShortCard({ video, onNavigate }) {
  const {
    id,
    title,
    thumbnailUrl,
    channelTitle,
    viewCount,
    publishedAt,
  } = video;

  const fallbackChain = useMemo(() => ([
    thumbnailUrl,
    `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`,
    `https://i.ytimg.com/vi/${id}/sddefault.jpg`,
    `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    `https://i9.ytimg.com/vi/${id}/hqdefault.jpg`,
  ].filter(Boolean)), [thumbnailUrl, id]);

  const [imgIndex, setImgIndex] = useState(0);
  const currentSrc = fallbackChain[Math.min(imgIndex, fallbackChain.length - 1)];

  return (
    <Link
      href={`/watch/${id}`}
      onClick={(e) => {
        try {
          const stopEvt = new CustomEvent('mini-player:stop');
          window.dispatchEvent(stopEvt);
        } catch {}
        if (onNavigate) onNavigate(e);
      }}
      className="group block overflow-hidden rounded-2xl border border-white/70 bg-white/80 shadow-[0_8px_24px_rgba(15,23,42,0.1)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_16px_30px_rgba(15,23,42,0.16)]"
    >
      <div className="relative w-full overflow-hidden bg-black" style={{ aspectRatio: '9 / 16' }}>
        <Image
          src={currentSrc}
          alt={title}
          fill
          className="object-cover transition duration-500 group-hover:scale-[1.04]"
          sizes="(max-width: 768px) 50vw, 20vw"
          priority={false}
          onError={() => setImgIndex((i) => i + 1)}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
      </div>

      <div className="p-3">
        <h2 className="line-clamp-2 text-sm font-bold text-slate-900">
          {title || 'Untitled Short'}
        </h2>
        <p className="mt-1 truncate text-xs text-slate-600">{channelTitle || 'Unknown Channel'}</p>
        {(viewCount || publishedAt) && (
          <p className="mt-1 text-xs text-slate-500">
            {formatCount(viewCount)} views • {formatTimeAgo(publishedAt)}
          </p>
        )}
      </div>
    </Link>
  );
}
