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
      className="block group rounded-xl overflow-hidden bg-white shadow hover:shadow-md transition"
    >
      <div className="relative w-full bg-black" style={{ aspectRatio: '9 / 16' }}>
        <Image
          src={currentSrc}
          alt={title}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 50vw, 20vw"
          priority={false}
          onError={() => setImgIndex((i) => i + 1)}
        />
      </div>

      <div className="p-3">
        <h2 className="text-sm font-semibold text-gray-900 line-clamp-2">
          {title || 'Untitled Short'}
        </h2>
        <p className="text-xs text-gray-600">{channelTitle || 'Unknown Channel'}</p>
        {(viewCount || publishedAt) && (
          <p className="text-xs text-gray-500 mt-1">
            {formatCount(viewCount)} views • {formatTimeAgo(publishedAt)}
          </p>
        )}
      </div>
    </Link>
  );
}


