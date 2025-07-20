'use client';
import { useState } from 'react';

export default function SearchBar({ onSearch }) {
  const [search, setSearch] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = search.trim();
    if (trimmed && onSearch) onSearch(trimmed);
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6 flex justify-center">
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search videos..."
        aria-label="Search videos"
        className="w-full max-w-md px-4 py-2 rounded-l border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
      />
      <button
        type="submit"
        disabled={!search.trim()}
        className="px-4 py-2 bg-primary text-white rounded-r border border-primary hover:bg-primary-foreground transition disabled:opacity-50"
      >
        Search
      </button>
    </form>
  );
}
