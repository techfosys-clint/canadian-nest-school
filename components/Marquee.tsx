import React from 'react'
import MarqueeClient from './MarqueeClient'

export default function Marquee() {
  const items = [
    'English for Kids',
    'English for Teens',
    'English for Adults',
    'IELTS Preparation',
    'Teacher Training',
    'Educational Shop',
    'Explore Courses'
  ]

  return <MarqueeClient items={items} />
}


