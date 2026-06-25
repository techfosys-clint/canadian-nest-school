import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db/mongodb'
import { FAQ } from '@/lib/db/models/FAQ'
import { getAuthorizedUser } from '@/lib/auth/auth'

export async function GET() {
  try {
    await connectToDatabase()
    const faqs = await FAQ.find().sort({ order: 1, createdAt: 1 }).lean()
    return NextResponse.json({ success: true, faqs })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    await connectToDatabase()
    const user = await getAuthorizedUser(['admin', 'staff'], 'faqs')
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

    const { question, answer, order, isActive } = await request.json()
    if (!question || !answer) return NextResponse.json({ error: 'Question and answer are required.' }, { status: 400 })

    const faq = new FAQ({ question, answer, order: order || 0, isActive: isActive !== false })
    await faq.save()
    return NextResponse.json({ success: true, faq }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    await connectToDatabase()
    const user = await getAuthorizedUser(['admin', 'staff'], 'faqs')
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

    const { id, question, answer, order, isActive } = await request.json()
    if (!id) return NextResponse.json({ error: 'ID required.' }, { status: 400 })

    const faq = await FAQ.findById(id)
    if (!faq) return NextResponse.json({ error: 'FAQ not found.' }, { status: 404 })

    if (question !== undefined) faq.question = question
    if (answer !== undefined) faq.answer = answer
    if (order !== undefined) faq.order = order
    if (isActive !== undefined) faq.isActive = isActive
    await faq.save()

    return NextResponse.json({ success: true, faq })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    await connectToDatabase()
    const user = await getAuthorizedUser(['admin'])
    if (!user) return NextResponse.json({ error: 'Admin access required.' }, { status: 401 })

    const { id } = await request.json()
    await FAQ.findByIdAndDelete(id)
    return NextResponse.json({ success: true, message: 'FAQ deleted.' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
