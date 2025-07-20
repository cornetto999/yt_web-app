'use client';
import ReactPlayer from 'react-player';

export default function TestPlayer() {
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto aspect-video">
        <ReactPlayer
          url="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
          controls
          width="100%"
          height="100%"
        />
      </div>
    </div>
  );
}
