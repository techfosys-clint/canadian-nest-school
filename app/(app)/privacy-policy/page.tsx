import Link from 'next/link';
import {
  FiCheckCircle,
  FiEye,
  FiLock,
  FiSettings,
  FiShield,
} from 'react-icons/fi';

export const metadata = {
  title: 'Privacy Policy - Canadian Nest School',
  description:
    'Your privacy and data security are our top priorities. Read the Canadian Nest School Privacy Policy.',
};

export default function PrivacyPolicyPage() {
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
            <span className='text-[#E61C24]'>Privacy Policy</span>
          </div>

          <h1 className='text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight leading-tight'>
            Privacy Policy & Data Security
          </h1>
        </div>
      </div>

      {/* ── Main Content Container ── */}
      <div className='container mx-auto px-6 max-w-4xl relative z-10'>
        {/* Intro Card */}
        <div className='bg-white rounded-lg p-6 md:p-8 border border-zinc-200/80 shadow-sm mb-8'>
          <p className='text-base sm:text-lg font-semibold text-[#4F5B7C] leading-relaxed'>
            Welcome to Canadian Nest School. Your privacy and the security of
            your personal data are of utmost importance to us. This Privacy
            Policy explains how we collect, use, and protect your information
            when you visit our website, enroll in our courses, or interact with
            our platform.
          </p>
        </div>

        {/* Section Cards */}
        <div className='space-y-6'>
          {/* Section 1 */}
          <div className='bg-white rounded-lg p-6 md:p-8 border border-zinc-200/80 shadow-sm transition-all hover:border-[#E61C24]/10'>
            <div className='flex gap-4 items-start'>
              <div className='h-10 w-10 bg-[#E61C24]/8 rounded-lg flex items-center justify-center shrink-0'>
                <FiEye className='h-5.5 w-5.5 text-[#E61C24]' />
              </div>
              <div className='space-y-3'>
                <h2 className='text-xl font-bold text-[#0A163A]'>
                  1. Information We Collect
                </h2>
                <p className='text-base text-[#4F5B7C] font-semibold leading-relaxed'>
                  When you register for a course or subscribe to our newsletter,
                  we may collect personal information such as your Name, Email
                  Address, Phone Number, and Billing Details.
                </p>
              </div>
            </div>
          </div>

          {/* Section 2 */}
          <div className='bg-white rounded-lg p-6 md:p-8 border border-zinc-200/80 shadow-sm transition-all hover:border-[#E61C24]/10'>
            <div className='flex gap-4 items-start'>
              <div className='h-10 w-10 bg-[#E61C24]/8 rounded-lg flex items-center justify-center shrink-0'>
                <FiSettings className='h-5.5 w-5.5 text-[#E61C24]' />
              </div>
              <div className='space-y-3'>
                <h2 className='text-xl font-bold text-[#0A163A]'>
                  2. How We Use Your Information
                </h2>
                <p className='text-base text-[#4F5B7C] font-semibold leading-relaxed'>
                  We use your information exclusively to process your course
                  enrollment and payments, provide you with access to our live
                  classes and learning materials, send important updates, and
                  improve our website&apos;s user experience.
                </p>
              </div>
            </div>
          </div>

          {/* Section 3 */}
          <div className='bg-white rounded-lg p-6 md:p-8 border border-zinc-200/80 shadow-sm transition-all hover:border-[#E61C24]/10'>
            <div className='flex gap-4 items-start'>
              <div className='h-10 w-10 bg-[#E61C24]/8 rounded-lg flex items-center justify-center shrink-0'>
                <FiLock className='h-5.5 w-5.5 text-[#E61C24]' />
              </div>
              <div className='space-y-3'>
                <h2 className='text-xl font-bold text-[#0A163A]'>3. Cookies</h2>
                <p className='text-base text-[#4F5B7C] font-semibold leading-relaxed'>
                  Our website may use cookies to enhance your browsing
                  experience and analyze website traffic. You can choose to
                  disable cookies through your browser settings.
                </p>
              </div>
            </div>
          </div>

          {/* Section 4 */}
          <div className='bg-white rounded-lg p-6 md:p-8 border border-zinc-200/80 shadow-sm transition-all hover:border-[#E61C24]/10'>
            <div className='flex gap-4 items-start'>
              <div className='h-10 w-10 bg-[#E61C24]/8 rounded-lg flex items-center justify-center shrink-0'>
                <FiShield className='h-5.5 w-5.5 text-[#E61C24]' />
              </div>
              <div className='space-y-3'>
                <h2 className='text-xl font-bold text-[#0A163A]'>
                  4. Data Protection and Security
                </h2>
                <p className='text-base text-[#4F5B7C] font-semibold leading-relaxed'>
                  We implement advanced security measures, including SSL
                  encryption, to ensure that your personal and payment
                  information is kept safe. We do not sell, trade, or rent your
                  personal data to any third party organizations.
                </p>
              </div>
            </div>
          </div>

          {/* Section 5 */}
          <div className='bg-white rounded-lg p-6 md:p-8 border border-zinc-200/80 shadow-sm transition-all hover:border-[#E61C24]/10'>
            <div className='flex gap-4 items-start'>
              <div className='h-10 w-10 bg-[#E61C24]/8 rounded-lg flex items-center justify-center shrink-0'>
                <FiCheckCircle className='h-5.5 w-5.5 text-[#E61C24]' />
              </div>
              <div className='space-y-3'>
                <h2 className='text-xl font-bold text-[#0A163A]'>
                  5. Third Party Payment Gateways
                </h2>
                <p className='text-base text-[#4F5B7C] font-semibold leading-relaxed'>
                  For secure transactions, we use verified third party payment
                  gateways. We do not store your credit card or sensitive
                  payment details on our servers.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className='mt-12 text-center p-6 bg-zinc-50 rounded-lg border border-zinc-200'>
          <p className='text-base text-[#4F5B7C] font-semibold'>
            If you have any questions or concerns regarding your data, please
            reach out to us through our{' '}
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
