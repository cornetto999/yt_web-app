'use client';

import Link from 'next/link';
import Image from 'next/image';
import { formatCount, formatTimeAgo } from '@/utils/formatters';

export default function VideoCard({ video, onNavigate }) {
  const {
    id,
    title,
    thumbnailUrl,
    channelTitle,
    viewCount,
    publishedAt,
    duration,
  } = video;

  return (
    <Link
      href={`/watch/${id}`} // Internal route, not external YouTube
      onClick={(e) => {
        try {
          const stopEvt = new CustomEvent('mini-player:stop');
          window.dispatchEvent(stopEvt);
        } catch {}
        if (onNavigate) onNavigate(e);
      }}
      className="block group rounded-lg overflow-hidden bg-white shadow hover:shadow-md transition"
    >
      <div className="relative w-full aspect-video bg-gray-200">
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt={title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 33vw"
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-gray-300 flex items-center justify-center text-gray-500 text-sm">
            No Image
          </div>
        )}

        {duration && (
          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-0.5 rounded">
            {duration}
          </div>
        )}
      </div>

      <div className="p-3">
        <h2 className="text-base font-semibold text-gray-900 line-clamp-2">
          {title || 'Untitled Video'}
        </h2>
        <p className="text-sm text-gray-600">
          {channelTitle || 'Unknown Channel'}
        </p>
        {(viewCount || publishedAt) && (
          <p className="text-xs text-gray-500 mt-1">
            {formatCount(viewCount)} views • {formatTimeAgo(publishedAt)}
          </p>
        )}
      </div>
    </Link>
  );
}
