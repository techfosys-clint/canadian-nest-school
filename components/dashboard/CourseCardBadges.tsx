const PLAN_LABELS: Record<string, string> = {
  one_time: 'One-time',
  monthly: 'Monthly',
  two_month: 'Every 2 months',
  quarterly: 'Quarterly',
};

/**
 * Category, payment plan and level chips for a student's course card.
 * Shown below the thumbnail so they never cover text printed on the image.
 */
export default function CourseCardBadges({
  categoryName,
  billingType,
  level,
}: {
  categoryName?: string | null;
  billingType?: string | null;
  level?: string | null;
}) {
  const plan = PLAN_LABELS[billingType || 'one_time'];

  return (
    <div className='flex flex-wrap items-center gap-2'>
      {categoryName && (
        <span className='px-2.5 py-0.5 rounded-lg bg-[#E61C24]/10 border border-[#E61C24]/20 text-[#E61C24] text-base font-bold'>
          {categoryName}
        </span>
      )}
      {plan && (
        <span className='px-2.5 py-0.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 text-base font-semibold'>
          {plan}
        </span>
      )}
      {level && (
        <span className='px-2.5 py-0.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 text-base font-semibold capitalize'>
          {level}
        </span>
      )}
    </div>
  );
}
