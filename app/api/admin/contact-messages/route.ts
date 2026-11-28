import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db/mongodb'
import { ContactMessage } from '@/lib/db/models/ContactMessage'
import { getAuthorizedUser } from '@/lib/auth/auth'

/** Mark a message handled / not handled. */
export async function PUT(request: Request) {
  try {
    await connectToDatabase()
    const user = await getAuthorizedUser(['admin', 'staff'], 'messages')
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

    const { id, handled } = await request.json()
    if (!id || typeof handled !== 'boolean') {
      return NextResponse.json({ error: 'ID and handled are required.' }, { status: 400 })
    }

    const updated = await ContactMessage.findByIdAndUpdate(
      id,
      { $set: { handled } },
      { new: true },
    ).lean()
    if (!updated) return NextResponse.json({ error: 'Message not found.' }, { status: 404 })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    await connectToDatabase()
    const user = await getAuthorizedUser(['admin', 'staff'], 'messages')
    if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

    const { id } = await request.json()
    if (!id) return NextResponse.json({ error: 'ID required.' }, { status: 400 })

    const deleted = await ContactMessage.findByIdAndDelete(id).lean()
    if (!deleted) return NextResponse.json({ error: 'Message not found.' }, { status: 404 })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
