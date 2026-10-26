'use client'

import Image from 'next/image'
import { useState } from 'react'
import { FiPlay } from 'react-icons/fi'
import { getYoutubeOrVimeoEmbedUrl } from '@/lib/videoEmbed'

type Props = {
  title: string
  trailerUrl: string
  posterUrl?: string | null
  /** Match existing sticky card: hide on small screens when image-only legacy. */
  className?: string
}

/**
 * Optional course trailer: poster (cover) until the student clicks play,
 * then loads the YouTube/Vimeo embed with autoplay.
 */
export default function CourseTrailerPlayer({
  title,
  trailerUrl,
  posterUrl,
  className = '',
}: Props) {
  const [playing, setPlaying] = useState(false)
  const embedBase = getYoutubeOrVimeoEmbedUrl(trailerUrl)

  if (!embedBase) return null

  const embedSrc = embedBase.includes('?')
    ? `${embedBase}&autoplay=1`
    : `${embedBase}?autoplay=1`

  return (
    <div
      className={`aspect-video overflow-hidden bg-zinc-900 border-b border-zinc-100 relative ${className}`}
    >
      {playing ? (
        <iframe
          src={embedSrc}
          title={`${title} — course trailer`}
          className='absolute inset-0 h-full w-full'
          allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
          allowFullScreen
          referrerPolicy='strict-origin-when-cross-origin'
        />
      ) : (
        <button
          type='button'
          onClick={() => setPlaying(true)}
          className='absolute inset-0 w-full h-full group cursor-pointer text-left'
          aria-label={`Play course trailer for ${title}`}
        >
          {posterUrl ? (
            <Image
              src={posterUrl}
              alt={title}
              className='w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]'
              width={470}
              height={300}
            />
          ) : (
            <div className='w-full h-full bg-zinc-800' />
          )}
          <span className='absolute inset-0 bg-black/35 group-hover:bg-black/45 transition-colors' />
          <span className='absolute inset-0 flex items-center justify-center'>
            <span className='h-14 w-14 rounded-full bg-[#E61C24] text-white flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform'>
              <FiPlay className='h-7 w-7 ml-0.5 fill-white' />
            </span>
          </span>
        </button>
      )}
    </div>
  )
}
