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

    const { question, answer, questionBn, answerBn, order, isActive } =
      await request.json()
    const resolvedQuestionBn =
      typeof questionBn === 'string' ? questionBn.trim() : ''
    const resolvedAnswerBn =
      typeof answerBn === 'string' ? answerBn.trim() : ''
    if (!resolvedQuestionBn || !resolvedAnswerBn) {
      return NextResponse.json(
        {
          error:
            'Bangla question and answer are required. English fields are optional.',
        },
        { status: 400 },
      )
    }
    const resolvedQuestion =
      (typeof question === 'string' ? question.trim() : '') ||
      resolvedQuestionBn
    const resolvedAnswer =
      (typeof answer === 'string' ? answer.trim() : '') || resolvedAnswerBn

    const faq = new FAQ({
      question: resolvedQuestion,
      answer: resolvedAnswer,
      questionBn: resolvedQuestionBn,
      answerBn: resolvedAnswerBn,
      order: order || 0,
      isActive: isActive !== false,
    })
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

    const { id, question, answer, questionBn, answerBn, order, isActive } =
      await request.json()
    if (!id) return NextResponse.json({ error: 'ID required.' }, { status: 400 })

    const faq = await FAQ.findById(id)
    if (!faq) return NextResponse.json({ error: 'FAQ not found.' }, { status: 404 })

    if (questionBn !== undefined) {
      const bn = String(questionBn).trim()
      if (!bn) {
        return NextResponse.json(
          { error: 'Bangla question is required.' },
          { status: 400 },
        )
      }
      faq.questionBn = bn
    }
    if (answerBn !== undefined) {
      const bn = String(answerBn).trim()
      if (!bn) {
        return NextResponse.json(
          { error: 'Bangla answer is required.' },
          { status: 400 },
        )
      }
      faq.answerBn = bn
    }
    if (question !== undefined) {
      const en = String(question).trim()
      faq.question = en || faq.questionBn || ''
    }
    if (answer !== undefined) {
      const en = String(answer).trim()
      faq.answer = en || faq.answerBn || ''
    }
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
