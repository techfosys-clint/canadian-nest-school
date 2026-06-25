'use client'

import React from 'react'

export default function ShareButton() {
  const handleCopy = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href)
      alert('Article link copied to clipboard!')
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="px-4.5 py-2 border border-zinc-200 hover:border-[#E61C24] text-[#E61C24] hover:bg-[#E61C24] hover:text-white font-bold text-sm rounded-lg transition-all duration-200 cursor-pointer bg-white"
    >
      Copy Link
    </button>
  )
}
