import Link from 'next/link';
import { FiBookOpen, FiPackage, FiRefreshCw, FiSettings } from 'react-icons/fi';

export const metadata = {
  title: 'Return & Refund Policy - Canadian Nest School',
  description:
    'Learn about our digital products return policy, batch transfer policies, and support procedures.',
};

export default function RefundPolicyPage() {
  return (
    <div className='min-h-screen bg-linear-to-b from-[#f8fafc] to-[#f1f5f9] pt-28 pb-20 font-sans select-text'>
      {/* ── Page Header ── */}
      <div className='relative bg-[#0A163A] py-16 md:py-20 text-center overflow-hidden shadow-md w-full border-none mb-12'>
        <div className='absolute -top-12 -left-12 w-48 h-48 bg-[#E61C24]/10 rounded-full blur-3xl pointer-events-none' />
        <div className='absolute -bottom-12 -right-12 w-48 h-48 bg-[#E61C24]/5 rounded-full blur-3xl pointer-events-none' />

        {/* Dot pattern overlay */}
        <div
          className='absolute inset-0 opacity-[0.25] pointer-events-none'
          style={{
            backgroundImage: 'radial-gradient(white 1.2px, transparent 1.2px)',
            backgroundSize: '24px 24px',
            maskImage:
              'radial-gradient(ellipse at center, black, transparent 80%)',
            WebkitMaskImage:
              'radial-gradient(ellipse at center, black, transparent 80%)',
          }}
        />

        <div className='container mx-auto px-6 relative z-10 flex flex-col items-center max-w-4xl'>
          {/* Breadcrumbs */}
          <div className='flex items-center gap-1.5 text-base font-semibold text-zinc-400 mb-4 select-none'>
            <Link href='/' className='hover:text-white transition-colors'>
              Home
            </Link>
            <span className='text-zinc-650 font-normal'>/</span>
            <span className='text-[#E61C24]'>Refund Policy</span>
          </div>

          <h1 className='text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight leading-tight'>
            Return & Refund Policy
          </h1>
        </div>
      </div>

      {/* ── Main Content Container ── */}
      <div className='container mx-auto px-6 max-w-4xl relative z-10'>
        {/* Intro Card */}
        <div className='bg-white rounded-lg p-6 md:p-8 border border-zinc-200/80 shadow-sm mb-8'>
          <p className='text-base sm:text-lg font-semibold text-[#4F5B7C] leading-relaxed'>
            At Canadian Nest School, we are committed to providing high quality
            educational programs and materials. Please read our Return and
            Refund Policy carefully before making a purchase.
          </p>
        </div>

        {/* Section Cards */}
        <div className='space-y-6'>
          {/* Section 1 */}
          <div className='bg-white rounded-lg p-6 md:p-8 border border-zinc-200/80 shadow-sm transition-all hover:border-[#E61C24]/10'>
            <div className='flex gap-4 items-start'>
              <div className='h-10 w-10 bg-[#E61C24]/8 rounded-lg flex items-center justify-center shrink-0'>
                <FiBookOpen className='h-5.5 w-5.5 text-[#E61C24]' />
              </div>
              <div className='space-y-3'>
                <h2 className='text-xl font-bold text-[#0A163A]'>
                  1. Digital Products and Online Courses
                </h2>
                <p className='text-base text-[#4F5B7C] font-semibold leading-relaxed'>
                  Since our platform offers digital services, live interactive
                  classes, and downloadable educational materials, all sales for
                  these digital items are considered final. We do not offer any
                  refunds, cancellations, or transfers of course fees under any
                  circumstances once the payment has been processed. This policy
                  is in place to protect the intellectual property of our
                  instructors and prevent the misuse of our digital content.
                </p>
              </div>
            </div>
          </div>

          {/* Section 2 */}
          <div className='bg-white rounded-lg p-6 md:p-8 border border-zinc-200/80 shadow-sm transition-all hover:border-[#E61C24]/10'>
            <div className='flex gap-4 items-start'>
              <div className='h-10 w-10 bg-[#E61C24]/8 rounded-lg flex items-center justify-center shrink-0'>
                <FiPackage className='h-5.5 w-5.5 text-[#E61C24]' />
              </div>
              <div className='space-y-3'>
                <h2 className='text-xl font-bold text-[#0A163A]'>
                  2. Physical Products
                </h2>
                <p className='text-base text-[#4F5B7C] font-semibold leading-relaxed'>
                  If you purchase any physical products (such as books,
                  worksheets, or merchandise) from our platform, returns or
                  exchanges will only be accepted if the item is delivered in a
                  damaged or defective condition. You must notify our support
                  team within 3 days of receiving the product with valid proof.
                  Refunds or replacements for physical products will not be
                  issued for a change of mind.
                </p>
              </div>
            </div>
          </div>

          {/* Section 3 */}
          <div className='bg-white rounded-lg p-6 md:p-8 border border-zinc-200/80 shadow-sm transition-all hover:border-[#E61C24]/10'>
            <div className='flex gap-4 items-start'>
              <div className='h-10 w-10 bg-[#E61C24]/8 rounded-lg flex items-center justify-center shrink-0'>
                <FiRefreshCw className='h-5.5 w-5.5 text-[#E61C24]' />
              </div>
              <div className='space-y-3'>
                <h2 className='text-xl font-bold text-[#0A163A]'>
                  3. Batch Transfers
                </h2>
                <p className='text-base text-[#4F5B7C] font-semibold leading-relaxed'>
                  In exceptional cases, such as severe medical emergencies, if a
                  student is unable to continue their live classes, they may
                  request to be transferred to the next available batch.
                  However, this decision will be at the sole discretion of the
                  administration, and no monetary refund will be issued.
                </p>
              </div>
            </div>
          </div>

          {/* Section 4 */}
          <div className='bg-white rounded-lg p-6 md:p-8 border border-zinc-200/80 shadow-sm transition-all hover:border-[#E61C24]/10'>
            <div className='flex gap-4 items-start'>
              <div className='h-10 w-10 bg-[#E61C24]/8 rounded-lg flex items-center justify-center shrink-0'>
                <FiSettings className='h-5.5 w-5.5 text-[#E61C24]' />
              </div>
              <div className='space-y-3'>
                <h2 className='text-xl font-bold text-[#0A163A]'>
                  4. Technical Issues
                </h2>
                <p className='text-base text-[#4F5B7C] font-semibold leading-relaxed'>
                  If you face any technical difficulties accessing your enrolled
                  course, please reach out to our support team immediately. We
                  will ensure the issue is resolved promptly so your learning
                  journey remains uninterrupted.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className='mt-12 text-center p-6 bg-zinc-50 rounded-lg border border-zinc-200'>
          <p className='text-base text-[#4F5B7C] font-semibold'>
            By completing your enrollment or making a purchase, you acknowledge
            and agree to this policy. For any support or inquiries, please
            contact us through our{' '}
            <Link
              href='/contact'
              className='text-[#E61C24] hover:underline font-bold transition-colors'
            >
              Contact Us page
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
