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
      href={`/watch/${id}`}
      onClick={(e) => {
        try {
          const stopEvt = new CustomEvent('mini-player:stop');
          window.dispatchEvent(stopEvt);
        } catch {}
        if (onNavigate) onNavigate(e);
      }}
      className="group block overflow-hidden rounded-2xl border border-white/70 bg-white/80 shadow-[0_10px_30px_rgba(15,23,42,0.08)] backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_36px_rgba(15,23,42,0.14)]"
    >
      <div className="relative aspect-video w-full overflow-hidden bg-slate-200">
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt={title}
            fill
            className="object-cover transition duration-500 group-hover:scale-[1.04]"
            sizes="(max-width: 768px) 100vw, 33vw"
            priority
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-300 text-sm text-slate-500">
            No Image
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-80" />

        {duration && (
          <div className="absolute bottom-2 right-2 rounded-md bg-black/75 px-2 py-0.5 text-xs font-medium text-white">
            {duration}
          </div>
        )}
      </div>

      <div className="p-4">
        <h2 className="line-clamp-2 text-[0.98rem] font-bold leading-snug text-slate-900">
          {title || 'Untitled Video'}
        </h2>
        <p className="mt-2 truncate text-sm font-medium text-slate-600">
          {channelTitle || 'Unknown Channel'}
        </p>
        {(viewCount || publishedAt) && (
          <p className="mt-1 text-xs text-slate-500">
            {formatCount(viewCount)} views • {formatTimeAgo(publishedAt)}
          </p>
        )}
      </div>
    </Link>
  );
}
