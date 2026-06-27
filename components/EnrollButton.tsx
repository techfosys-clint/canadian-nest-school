'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FiZap, FiCheck, FiArrowRight } from 'react-icons/fi'
import Swal from 'sweetalert2'
import { pushToDataLayer, generateEventId } from '@/lib/gtm'

interface EnrollButtonProps {
  courseId: string
  courseTitle: string
  courseSlug?: string
  coursePrice?: number
  courseCategory?: string
  isLoggedIn: boolean
  isAlreadyEnrolled: boolean
}

export default function EnrollButton({
  courseId,
  courseTitle,
  courseSlug,
  coursePrice = 0,
  courseCategory = '',
  isLoggedIn,
  isAlreadyEnrolled,
}: EnrollButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleEnrollClick = async () => {
    if (isAlreadyEnrolled) {
      if (courseSlug) {
        router.push(`/courses/${courseSlug}/watch`)
      } else {
        router.push('/dashboard')
      }
    } else {
      pushToDataLayer({
        event: 'add_to_cart',
        event_id: generateEventId(),
        ecommerce: {
          currency: 'BDT',
          value: coursePrice,
          items: [{
            item_id: courseId,
            item_name: courseTitle,
            item_category: courseCategory,
            price: coursePrice,
            quantity: 1
          }]
        }
      })
      router.push(`/checkout/${courseId}`)
    }
  }

  // Render State 1: Enrolled
  if (isAlreadyEnrolled) {
    return (
      <button
        onClick={handleEnrollClick}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#E61C24]/10 hover:bg-[#E61C24]/20 text-[#E61C24] border border-[#E61C24]/30 font-bold text-base transition-all duration-300 cursor-pointer"
      >
        <FiCheck className="h-4.5 w-4.5 shrink-0" />
        <span>Go to Course</span>
      </button>
    )
  }

  // Render State 2: Enrolling / Enrollable
  return (
    <button
      onClick={handleEnrollClick}
      disabled={loading}
      className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#E61C24] hover:bg-[#c5141b] text-white font-bold text-base shadow-lg shadow-[#E61C24]/15 hover:shadow-[#E61C24]/25 transition-all duration-300 cursor-pointer transform hover:-translate-y-0.5 whitespace-nowrap ${
        loading ? 'opacity-80 cursor-not-allowed' : ''
      }`}
    >
      {loading ? (
        <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
      ) : (
        <FiZap className="h-5 w-5 fill-white" />
      )}
      <span>{loading ? 'Processing Enrollment...' : 'Enroll In Course'}</span>
    </button>
  )
}
