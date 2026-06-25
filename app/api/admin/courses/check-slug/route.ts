import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db/mongodb'
import { Course } from '@/lib/db/models/Course'
import mongoose from 'mongoose'

export async function GET(request: Request) {
  try {
    await connectToDatabase()
    const { searchParams } = new URL(request.url)
    const slug = searchParams.get('slug')
    const excludeId = searchParams.get('excludeId')

    if (!slug) {
      return NextResponse.json({ available: false, error: 'Slug parameter is required.' }, { status: 400 })
    }

    if (excludeId && !mongoose.isValidObjectId(excludeId)) {
      return NextResponse.json({ available: false, error: 'Invalid excludeId parameter.' }, { status: 400 })
    }

    const query: any = { slug }
    if (excludeId) {
      query._id = { $ne: excludeId }
    }

    const existing = await Course.findOne(query).lean()
    return NextResponse.json({ available: !existing })

  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to validate slug.' }, { status: 500 })
  }
}
