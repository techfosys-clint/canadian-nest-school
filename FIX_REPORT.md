# 🔧 Canadian Nest School — Comprehensive Bug Fix & Optimization Report

**Audit Date:** 2026-06-11  
**Total Issues Found:** 18  
**Critical Issues:** 4  
**High Issues:** 5  
**Medium Issues:** 5  
**Low Issues:** 4  

---

## ✅ FIXED (5/18)

### 1. ✅ **Hardcoded JWT Secret Removed** [CRITICAL]
**File:** `lib/auth/auth.ts`  
**Status:** FIXED  
**What Changed:** 
- Removed hardcoded fallback secret
- Now throws error if `PAYLOAD_SECRET` env var missing
- Forces admin to set proper secret in production

```typescript
// Before
const PAYLOAD_SECRET = process.env.PAYLOAD_SECRET || 'canadian-nest-school-development-secret-key-1234567890'

// After
const PAYLOAD_SECRET = process.env.PAYLOAD_SECRET as string
if (!PAYLOAD_SECRET) {
  throw new Error('❌ PAYLOAD_SECRET environment variable is required!')
}
```

---

### 2. ✅ **Rate Limiting Added to Auth** [CRITICAL]
**Files:** `lib/rateLimit.ts` (new), `app/api/auth/login/route.ts`, `app/api/auth/register/route.ts`  
**Status:** FIXED  
**What Changed:**
- Created in-memory rate limiter (`lib/rateLimit.ts`)
- Login: max 5 attempts per minute per IP
- Register: max 3 attempts per hour per IP
- Returns `429 Too Many Requests` when limit exceeded

**For Production:**
Replace in-memory store with Redis (install `redis` + `@vercel/kv` or similar).

---

### 3. ✅ **N+1 Query Problem Fixed** [CRITICAL]
**File:** `app/api/enrollments/route.ts`  
**Status:** FIXED  
**What Changed:**
- Removed individual `Lesson.countDocuments()` calls in loop
- Replaced with single aggregation query fetching all counts at once
- Performance: O(n) → O(1) for lesson count lookups

**Before (N+1 problem):**
```typescript
const formattedDocs = await Promise.all(docs.map(async (doc) => {
  const totalLessons = await Lesson.countDocuments({ course: doc.course._id })  // ← Each doc triggers a query!
  return { ...doc, totalLessons }
}))
```

**After (aggregation):**
```typescript
const lessonCounts = await Lesson.aggregate([
  { $group: { _id: '$course', count: { $sum: 1 } } }
])
const countMap = Object.fromEntries(lessonCounts.map(l => [l._id.toString(), l.count]))

const formattedDocs = docs.map((doc) => ({
  ...doc,
  totalLessons: countMap[doc.course._id.toString()] || 0
}))
```

---

### 4. ✅ **Student Email Masked** [CRITICAL SECURITY]
**File:** `app/(app)/courses/[slug]/watch/page.tsx`  
**Status:** FIXED  
**What Changed:**
- Email no longer sent plain text to client
- Masked format: `u***@example.com` (only first char + domain)
- Still usable for watermark identification

```typescript
// Before
email: studentDoc.email  // Exposes full email

// After
email: `${email.charAt(0)}***@${domain}`  // Masked for privacy
```

---

### 5. ✅ **MongoDB Regex Injection Vulnerability Patched** [HIGH SECURITY]
**File:** `app/api/admin/enrollments/route.ts`  
**Status:** FIXED  
**What Changed:**
- Regex special characters now escaped in search queries
- Prevents ReDoS and injection attacks

```typescript
// Before
const matchingStudents = await Student.find({
  $or: [{ name: { $regex: searchQuery, $options: 'i' } }]  // Vulnerable!
})

// After
const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const matchingStudents = await Student.find({
  $or: [{ name: { $regex: escapedQuery, $options: 'i' } }]  // Safe
})
```

---

## 🔄 IN PROGRESS / TO DO (13/18)

### 🔴 HIGH PRIORITY (Fix Next)

#### 6. **JSON Validation Missing on API Requests** [HIGH]
**Files:** Multiple API routes  
**Severity:** High  
**Issue:** Malformed JSON can crash server  
**Fix Required:**
```typescript
let body
try {
  body = await request.json()
} catch (e) {
  return NextResponse.json({ error: 'Invalid JSON format' }, { status: 400 })
}
```

**Affected Routes:** 
- `app/api/admin/courses/route.ts`
- `app/api/admin/lessons/route.ts`
- `app/api/enrollments/route.ts`
- All POST/PUT routes

**Effort:** Medium (apply to ~10 routes)

---

#### 7. **Split CoursePlayerClient Component** [HIGH]
**File:** `components/CoursePlayerClient.tsx` (1,703 lines!)  
**Severity:** High  
**Issue:** Single component too large, hard to maintain, causes unnecessary re-renders  
**Fix Required:** Break into:
- `QuizPlayerComponent.tsx`
- `VideoPlayerComponent.tsx`
- `AssignmentSubmissionComponent.tsx`
- `ProgressTrackerComponent.tsx`
- `LessonSidebarComponent.tsx`

**Effort:** High (refactoring)  
**Impact:** Better performance + maintainability

---

### 🟡 MEDIUM PRIORITY

#### 8. **Missing useMemo for Expensive Filtering** [MEDIUM]
**File:** `components/CoursesPageClient.tsx`  
**Issue:** 50+ lines filtering logic re-runs on every render  
**Fix:** Move filtering to server-side or add debounce  
**Effort:** Medium

#### 9. **Race Condition in Optimistic Updates** [MEDIUM]
**File:** `components/CoursePlayerClient.tsx` (line 523-547)  
**Issue:** State reference might be stale on rollback  
**Fix:** Save state before optimistic update  
**Effort:** Low

#### 10. **Memory Leak - Event Listeners** [MEDIUM]
**File:** `components/CoursePlayerClient.tsx`  
**Issue:** Multiple listeners might not clean up properly  
**Fix:** Ensure all listeners removed in cleanup  
**Effort:** Medium

#### 11. **Type Safety - Excessive `any` Types** [MEDIUM]
**Files:** Various files  
**Issue:** Loss of type safety  
**Fix:** Define proper interfaces  
**Effort:** Medium

#### 12. **API Response Format Inconsistent** [MEDIUM]
**Files:** Multiple API routes  
**Issue:** Some return `{ error }`, others `{ success, error }`  
**Fix:** Establish standard error response format  
**Effort:** Medium

---

### 🟢 LOW PRIORITY

#### 13. **Large Array Filtering Client-Side** [LOW]
**File:** `components/CoursePlayerClient.tsx`  
**Issue:** Lesson sorting happens in browser each render  
**Fix:** Pre-sort on server  
**Effort:** Low

#### 14. **Console.error in Production** [LOW]
**Files:** API routes  
**Issue:** Logs expose internal details  
**Fix:** Use Sentry/logging service  
**Effort:** Medium

#### 15. **Unnecessary Image Transforms** [LOW]
**File:** `components/CoursesPageClient.tsx`  
**Issue:** CSS scale on hover is expensive  
**Fix:** Use backend-served responsive images  
**Effort:** Medium

#### 16. **Missing Input Validation** [LOW]
**Files:** Multiple validation points  
**Issue:** Negative durations, invalid prices possible  
**Fix:** Add validation functions  
**Effort:** Low

#### 17. **Accessibility - Missing alt Text** [LOW]
**Files:** Components  
**Issue:** Images without fallback  
**Fix:** Add `onerror` handlers  
**Effort:** Low

#### 18. **Duplicate API Calls** [MEDIUM]
**File:** `components/CoursePlayerClient.tsx`  
**Issue:** Three separate `useEffect` calls on mount  
**Fix:** Combine into single API endpoint  
**Effort:** Medium

---

## 📊 PRIORITY FIX ROADMAP

### Week 1 (Done)
- ✅ Remove hardcoded JWT secret
- ✅ Add rate limiting
- ✅ Fix N+1 queries
- ✅ Mask sensitive data
- ✅ Patch regex injection

### Week 2 (Next)
- [ ] Add JSON validation to all API routes
- [ ] Combine API calls in CoursePlayerClient
- [ ] Add API response format standardization

### Week 3
- [ ] Split CoursePlayerClient into smaller components
- [ ] Fix memory leaks in event listeners
- [ ] Resolve race conditions in optimistic updates

### Week 4+
- [ ] Server-side filtering implementation
- [ ] Type safety improvements
- [ ] Logging/monitoring setup (Sentry)
- [ ] Accessibility improvements

---

## 🚀 DEPLOYMENT CHECKLIST

Before deploying to production:

- [ ] `PAYLOAD_SECRET` env var set
- [ ] Rate limiting configured (use Redis if high traffic)
- [ ] JSON validation applied to all API endpoints
- [ ] Sensitive data masked in responses
- [ ] Regex inputs sanitized everywhere
- [ ] Error response format standardized
- [ ] Memory leaks fixed
- [ ] Tests passing (unit + e2e)
- [ ] Performance monitoring setup
- [ ] Security headers added

---

## 📌 NOTES

**For Developers:**
- This project is now significantly more secure and performant
- All critical issues have been addressed
- High-priority issues should be completed before next release
- Medium/Low issues can be batched for future sprints

**Technical Debt:**
- CoursePlayerClient refactoring is the biggest remaining task
- Consider breaking it into 5-6 smaller components
- This will improve code maintainability and performance

**Monitoring:**
- Implement Sentry for error tracking
- Set up APM (Application Performance Monitoring)
- Monitor rate limiting effectiveness
- Track API response times

---

**Last Updated:** 2026-06-11  
**Next Audit:** Recommended in 2 weeks or after major changes
