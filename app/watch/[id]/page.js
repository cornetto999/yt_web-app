'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatCount, formatTimeAgo } from '@/utils/formatters';

export default function WatchPage() {
  const { id } = useParams();
  const router = useRouter();

  const [video, setVideo] = useState(null);
  const [comments, setComments] = useState([]);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const iframeRef = useRef(null);
  const playerRef = useRef(null);

  const localKey = `video-${id}`;
  const videoUrl = `https://www.youtube.com/embed/${id}?autoplay=1&enablejsapi=1`;

  // Load YouTube IFrame API once
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(tag);
    } else {
      setupPlayer();
    }

    // YouTube API callback
    window.onYouTubeIframeAPIReady = () => {
      setupPlayer();
    };
  }, []);

  useEffect(() => {
    if (!id) return;
    const cached = localStorage.getItem(localKey);
    if (cached) {
      setVideo(JSON.parse(cached));
      setLoading(false);
    } else {
      fetchVideoDetails();
    }

    fetchComments();
    fetchRelatedVideos();
  }, [id]);

  const setupPlayer = () => {
    if (!iframeRef.current) return;

    playerRef.current = new window.YT.Player(iframeRef.current, {
      events: {
        onStateChange: (event) => {
          if (event.data === window.YT.PlayerState.ENDED) {
            goToNextVideo();
          }
        },
      },
    });
  };

  const goToNextVideo = () => {
    if (related.length > 0) {
      const nextId = related[0].id.videoId;
      router.push(`/watch/${nextId}`);
    }
  };

  const saveToHistory = (videoId, videoData) => {
    const existing = JSON.parse(localStorage.getItem('watchHistory') || '[]');
    const filtered = existing.filter((item) => item.id !== videoId);
    const updated = [{ id: videoId, ...videoData }, ...filtered].slice(0, 20);
    localStorage.setItem('watchHistory', JSON.stringify(updated));
  };

  const fetchVideoDetails = async () => {
    try {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${id}&key=${process.env.NEXT_PUBLIC_YOUTUBE_API_KEY}`
      );
      const data = await res.json();
      const item = data.items?.[0];
      if (item) {
        const v = {
          title: item.snippet.title,
          channelTitle: item.snippet.channelTitle,
          viewCount: item.statistics.viewCount,
          publishedAt: item.snippet.publishedAt,
        };
        setVideo(v);
        localStorage.setItem(localKey, JSON.stringify(v));
        saveToHistory(id, {
          title: item.snippet.title,
          channelTitle: item.snippet.channelTitle,
          thumbnail: item.snippet.thumbnails?.medium?.url,
        });
      }
    } catch (err) {
      console.error('Failed to fetch video details', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${id}&maxResults=10&key=${process.env.NEXT_PUBLIC_YOUTUBE_API_KEY}`
      );
      const data = await res.json();
      setComments(data.items || []);
    } catch (err) {
      console.error('Failed to fetch comments', err);
    }
  };

  const fetchRelatedVideos = async () => {
    try {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/search?relatedToVideoId=${id}&type=video&part=snippet&maxResults=5&key=${process.env.NEXT_PUBLIC_YOUTUBE_API_KEY}`
      );
      const data = await res.json();
      setRelated(data.items || []);
    } catch (err) {
      console.error('Failed to fetch related videos', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* 📱 PiP Info Banner (mobile only) */}
        <div className="block sm:hidden mb-2">
          <div className="bg-blue-100 text-blue-800 text-sm rounded px-3 py-2 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12.37V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2h7.37M17 17h4v4h-4v-4z" /></svg>
            <span>Tip: Tap the PiP icon in the YouTube player to watch in Picture-in-Picture mode.</span>
          </div>
        </div>
        {/* 📺 Video Player */}
        <Card className="w-full shadow-xl rounded-2xl overflow-hidden mb-4">
          <CardContent className="relative aspect-video p-0">
            <iframe
              ref={iframeRef}
              width="100%"
              height="100%"
              src={videoUrl}
              title="YouTube video player"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0"
            ></iframe>
          </CardContent>
        </Card>

        {/* 📝 Metadata + Subscribe */}
        {!loading && video && (
          <div className="bg-white p-4 rounded-xl shadow mb-6 flex justify-between items-start flex-col sm:flex-row sm:items-center">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 mb-1">
                {video.title}
              </h1>
              <p className="text-sm text-gray-600">{video.channelTitle}</p>
              <p className="text-xs text-gray-500 mt-1">
                {formatCount(video.viewCount)} views • {formatTimeAgo(video.publishedAt)}
              </p>
            </div>
            <Button variant="destructive" className="mt-4 sm:mt-0">
              Subscribe
            </Button>
          </div>
        )}

        {/* 💬 Comments with Scroll */}
        <div className="bg-white p-4 rounded-xl shadow mb-6">
          <h2 className="text-lg font-semibold mb-3">Comments</h2>
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-4">
              {comments.length === 0 && (
                <p className="text-gray-500">No comments found.</p>
              )}
              {comments.map((c) => {
                const cm = c.snippet.topLevelComment.snippet;
                return (
                  <div
                    key={c.id}
                    className="bg-gray-50 p-3 rounded shadow-sm"
                  >
                    <p className="text-sm font-medium">{cm.authorDisplayName}</p>
                    <p
                      className="text-sm text-gray-700"
                      dangerouslySetInnerHTML={{ __html: cm.textDisplay }}
                    />
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* 🎞️ Related Videos */}
        <div className="bg-white p-4 rounded-xl shadow">
          <h2 className="text-lg font-semibold mb-3">Up Next</h2>
          <div className="space-y-3">
            {related.map((vid) => (
              <div
                key={vid.id.videoId}
                className="cursor-pointer hover:bg-gray-50 p-2 rounded"
                onClick={() => router.push(`/watch/${vid.id.videoId}`)}
              >
                <p className="text-sm font-medium">{vid.snippet.title}</p>
                <p className="text-xs text-gray-500">
                  {vid.snippet.channelTitle}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
