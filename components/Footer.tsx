'use client';

import { useLocale } from '@/context/LocaleContext';
import Image from 'next/image';
import Link from 'next/link';
import {
  FaFacebookF,
  FaInstagram,
  FaLinkedinIn,
  FaYoutube,
} from 'react-icons/fa';

export default function Footer() {
  const { messages, href, barePathname } = useLocale();
  const t = messages.footer;

  const isActive = (match: string | null): boolean => {
    if (!match) return false;
    if (match === '/') return barePathname === '/';
    return barePathname === match || barePathname.startsWith(match + '/');
  };

  const linkClass = (match: string | null) =>
    isActive(match)
      ? 'text-[#E61C24] font-bold transition-colors'
      : 'text-zinc-400 hover:text-[#E61C24] transition-colors';

  const MAIN_PAGES = [{ label: messages.nav.home, href: '/', match: '/' }];

  const QUICK_LINKS = [
    { label: t.blogs, href: '/blogs', match: '/blogs' },
    { label: t.career, href: '/#career', match: '/career' },
    { label: t.contact, href: '/contact', match: '/contact' },
  ];

  return (
    <footer className='bg-[#0b0b0f] text-zinc-300 relative overflow-hidden mt-auto font-sans'>
      <div className='container mx-auto px-6 pt-16 pb-10 relative z-10'>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-8'>
          <div className='lg:col-span-5 space-y-6'>
            <Link
              href={href('/')}
              className='inline-flex items-center bg-white px-3 py-1.5 rounded-lg shadow-sm group'
            >
              <Image
                src='/logo.png'
                alt='Canadian Nest School'
                width={200}
                height={70}
                className='h-15 w-auto object-contain transition-transform group-hover:scale-102 duration-300'
              />
            </Link>

            <div className='space-y-4 text-base text-zinc-400 leading-relaxed'>
              <p>{t.blurb}</p>
              <p className='font-semibold text-white border-l-2 border-[#E61C24] pl-3'>
                {t.tagline}
              </p>
            </div>
          </div>

          <div className='grid grid-cols-2 gap-8 lg:col-span-4 md:col-span-2 lg:pl-2'>
            <div className='space-y-4'>
              <h3 className='text-base font-bold text-white'>{t.mainPages}</h3>
              <ul className='space-y-3 text-base'>
                {MAIN_PAGES.map(({ label, href: path, match }) => (
                  <li key={path}>
                    <Link href={href(path)} className={linkClass(match)}>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className='space-y-4'>
              <h3 className='text-base font-bold text-white'>{t.quickLinks}</h3>
              <ul className='space-y-3 text-base'>
                {QUICK_LINKS.map(({ label, href: path, match }) => (
                  <li key={path}>
                    <Link
                      href={path.startsWith('/#') ? href('/') + path.slice(1) : href(path)}
                      className={linkClass(match)}
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className='lg:col-span-3 space-y-8'>
            <div className='space-y-4'>
              <h3 className='text-base font-bold text-white'>
                {messages.contact.title}
              </h3>
              <div className='space-y-2 text-base'>
                <p>
                  <span className='text-[#E61C24]'>Phone:</span>{' '}
                  <a
                    href='tel:+8801739534707'
                    className='text-zinc-300 hover:text-[#E61C24] transition-colors'
                  >
                    +880 17 3953 4707
                  </a>
                </p>
                <p>
                  <span className='text-[#E61C24]'>Email:</span>{' '}
                  <a
                    href='mailto:info.canadiannestschool@gmail.com'
                    className='text-zinc-300 hover:text-[#E61C24] transition-colors'
                  >
                    info.canadiannestschool@gmail.com
                  </a>
                </p>
              </div>
            </div>

            <div className='space-y-3'>
              <h3 className='text-base font-bold text-white'>Follow Us</h3>
              <div className='flex items-center gap-3'>
                <a
                  href='https://www.facebook.com/CanadianNestSchoolofBangladesh'
                  target='_blank'
                  rel='noopener noreferrer'
                  aria-label='Facebook'
                  className='h-9 w-9 bg-zinc-800 hover:bg-[#E61C24] text-zinc-300 hover:text-white rounded-lg flex items-center justify-center transition-all duration-200 cursor-pointer'
                >
                  <FaFacebookF className='h-4 w-4' />
                </a>
                <a
                  href='https://www.instagram.com/canadiannestschoolbd/'
                  target='_blank'
                  rel='noopener noreferrer'
                  aria-label='Instagram'
                  className='h-9 w-9 bg-zinc-800 hover:bg-[#E61C24] text-zinc-300 hover:text-white rounded-lg flex items-center justify-center transition-all duration-200 cursor-pointer'
                >
                  <FaInstagram className='h-4 w-4' />
                </a>
                <a
                  href='https://www.linkedin.com/company/canadian-nest-school-of-bangladesh/'
                  target='_blank'
                  rel='noopener noreferrer'
                  aria-label='LinkedIn'
                  className='h-9 w-9 bg-zinc-800 hover:bg-[#E61C24] text-zinc-300 hover:text-white rounded-lg flex items-center justify-center transition-all duration-200 cursor-pointer'
                >
                  <FaLinkedinIn className='h-4 w-4' />
                </a>
                <a
                  href='https://www.youtube.com/@Canadian-nest-school'
                  target='_blank'
                  rel='noopener noreferrer'
                  aria-label='YouTube'
                  className='h-9 w-9 bg-zinc-800 hover:bg-[#E61C24] text-zinc-300 hover:text-white rounded-lg flex items-center justify-center transition-all duration-200 cursor-pointer'
                >
                  <FaYoutube className='h-4 w-4' />
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className='mt-12 flex justify-center items-center'>
          <Image
            src='/EPS-PGW_Footer_Merchant_Website/Footer-Desktop-Light-Version.png.png'
            alt='Payment Methods'
            width={1500}
            height={80}
            className='hidden md:block w-full h-auto object-contain'
          />
          <Image
            src='/EPS-PGW_Footer_Merchant_Website/Footer-Mobile-Light-Version.png.png'
            alt='Payment Methods'
            width={600}
            height={80}
            className='block md:hidden w-full h-auto object-contain'
          />
        </div>

        <div className='border-t border-zinc-800 mt-14 pt-8 pb-2 flex flex-col md:flex-row items-center justify-between gap-4 text-base text-zinc-500 relative z-10'>
          <Link
            href={href('/privacy-policy')}
            className={
              barePathname === '/privacy-policy'
                ? 'text-[#E61C24] font-bold'
                : 'hover:text-zinc-300 transition-colors'
            }
          >
            {t.privacy}
          </Link>
          <div className='text-center text-zinc-500 text-base'>
            &copy; 2026 Canadian Nest School. {t.rights} Design &amp; Developed
            By{' '}
            <a
              href='https://www.teachfosys.com/'
              target='_blank'
              rel='noopener noreferrer'
              className='text-[#E61C24] hover:underline font-bold'
            >
              Teachfosys
            </a>
          </div>
          <Link
            href={href('/refund-policy')}
            className={
              barePathname === '/refund-policy'
                ? 'text-[#E61C24] font-bold'
                : 'hover:text-zinc-300 transition-colors'
            }
          >
            {t.refund}
          </Link>
        </div>
      </div>

      <div
        aria-hidden='true'
        className='select-none pointer-events-none text-center leading-none overflow-hidden pb-4'
      >
        <span className='text-[12vw] font-bold text-white/4 uppercase tracking-tight whitespace-nowrap block'>
          Canadian Nest
        </span>
      </div>
    </footer>
  );
}
