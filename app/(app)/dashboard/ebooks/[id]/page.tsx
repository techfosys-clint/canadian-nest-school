import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPurchasedEbook } from '@/lib/purchasedEbook'

export default async function EbookReader({ params, searchParams }: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const { id } = await params
  const { page } = await searchParams
  const ebook = await getPurchasedEbook(id)
  const total = ebook?.ebookPages?.length ?? 0
  const current = Number(page ?? 1)
  if (!ebook || !Number.isSafeInteger(current) || current < 1 || current > total) notFound()

  return (
    <main className='container mx-auto px-4 py-8'>
      <h1 className='text-2xl font-bold'>{ebook.title}</h1>
      <nav className='my-4 flex flex-wrap items-center gap-4' aria-label='Reader pages'>
        {current > 1 && <Link href={`?page=${current - 1}`}>Previous page</Link>}
        <span>Page {current} of {total}</span>
        {current < total && <Link href={`?page=${current + 1}`}>Next page</Link>}
      </nav>
      <img src={`/api/ebooks/${id}/${current}`} alt={`Page ${current} of ${ebook.title}`} draggable={false}
        className='mx-auto h-auto w-full select-none rounded-lg border border-slate-200' />
    </main>
  )
}
