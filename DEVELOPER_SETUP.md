# 👨‍💻 Canadian Nest School — Developer Setup & Customization Guide

আপনার ক্লায়েন্ট Canadian Nest School template কিনেছেন এবং নিজের course platform বানাতে চান। এই গাইড আপনাকে (developer) সম্পূর্ণ setup, customization, এবং deployment করতে সাহায্য করবে।

---

## 📋 Prerequisite

আপনার যা থাকতে হবে:
- ক্লায়েন্টের নিজস্ব domain (যেমন: `yourname.com`)
- একটি hosting/server (Vercel, AWS, DigitalOcean, বা অন্যকোনো)
- MongoDB database access (Atlas বা লোকাল)
- Git basics জানা উচিত
- Node.js 18+ installed

---

## 🚀 ধাপ ১: Code Setup

### Step 1.1: Repository Clone করুন
```bash
git clone <canadian-nest-school-repo-url>
cd canadian-nest-school
```

### Step 1.2: Dependencies Install করুন
```bash
npm install
# বা
pnpm install
```

### Step 1.3: Environment Variables Setup করুন

`.env.local` ফাইল তৈরি করুন এবং নিচের variables সেট করুন:

```env
# === Database ===
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/canadian-nest-school-db?retryWrites=true&w=majority

# === JWT & Auth ===
PAYLOAD_SECRET=your-super-secret-key-here-min-32-characters

# === Video Storage (Cloudflare R2 / S3-Compatible) ===
S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
S3_BUCKET=canadian-nest-school-videos
S3_ACCESS_KEY_ID=your-r2-access-key
S3_SECRET_ACCESS_KEY=your-r2-secret-key

# === Streaming & Security ===
ALLOWED_STREAM_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
STREAM_MAX_DEVICES=2
NEXT_PUBLIC_SITE_URL=https://yourdomain.com

# === Payment Gateway (Optional - integrate যখন প্রয়োজন) ===
# STRIPE_SECRET_KEY=sk_live_...
# STRIPE_PUBLISHABLE_KEY=pk_live_...
```

### Step 1.4: Database Setup করুন

MongoDB atlas (free tier available):
1. https://www.mongodb.com/cloud/atlas এ account খুলুন
2. একটি cluster তৈরি করুন
3. Connection string পান এবং `MONGODB_URI`-তে রাখুন

---

## 🎨 ধাপ ২: Brand Customization

### Step 2.1: Logo & Colors

**File:** `tailwind.config.ts` (Tailwind CSS configuration)
```typescript
// Primary brand color পরিবর্তন করুন
theme: {
  colors: {
    brand: '#615fff', // ক্লায়েন্টের রঙ অনুযায়ী পরিবর্তন করুন
  }
}
```

**File:** `public/` folder
- `favicon.ico` — এই ফাইল client-এর favicon দিয়ে replace করুন
- `logo.png` — client-এর logo রাখুন (optional)

### Step 2.2: Site Title & Metadata

**File:** `payload.config.ts`
```typescript
meta: {
  titleSuffix: '- YourClientName Academy', // পরিবর্তন করুন
  icons: [
    {
      rel: 'icon',
      url: '/favicon.ico',
    },
  ],
}
```

**File:** `app/(app)/layout.tsx`
```typescript
export const metadata = {
  title: 'Your Client Academy - Learn & Earn',
  description: 'Your client description here',
}
```

### Step 2.3: Footer, Contact Info

**File:** `components/Footer.tsx` (যদি থাকে)
- ক্লায়েন্টের contact info, social links update করুন

---

## 🛠️ ধাপ ৩: Video Storage Setup (Cloudflare R2)

### Step 3.1: R2 Account তৈরি করুন

1. https://dash.cloudflare.com এ login করুন
2. **R2** → **Create bucket** → নাম দিন `canadian-nest-school-videos`
3. **Settings** → bucket-কে **Private** রাখুন (public access বন্ধ)

### Step 3.2: API Token তৈরি করুন

1. **R2** → **Settings** → **API tokens**
2. **Create API token** → বাছুন "Read & Write" permission
3. Access Key ID এবং Secret Key নিন, `.env.local`-এ রাখুন

### Step 3.3: Test করুন

```bash
npm run dev
# আপনার browser এ http://localhost:3000 খুলুন
# Admin panel এ লগইন করুন
# একটি ছোট ভিডিও upload করে test করুন
```

---

## 🌐 ধাপ ৪: Domain & DNS Setup

### Step 4.1: Domain Point করুন আপনার Server-এ

যেখানে deploy করছেন সেখানের instructions follow করুন:

**যদি Vercel-এ deploy করছেন:**
1. Vercel dashboard-এ project খুলুন
2. **Settings** → **Domains**
3. Domain add করুন → DNS records দেখুন
4. ক্লায়েন্টের registrar (GoDaddy, Namecheap ইত্যাদি)-তে DNS record আপডেট করুন

**যদি অন্য hosting-এ:**
- Hosting provider-এর DNS documentation follow করুন

### Step 4.2: SSL Certificate

হাল এর সব hosting provider-ই SSL (HTTPS) auto provide করে। নিশ্চিত করুন `https://yourdomain.com` কাজ করছে।

---

## 📦 ধাপ ৫: Database Initialization

প্রথমবার app start করলে, Payload CMS automatically collections create করবে। কিন্তু dummy data দিতে চাইলে:

```bash
# Admin user তৈরি করুন
# Admin dashboard-এ গিয়ে করুন, অথবা seeding script চালান
```

---

## 🚀 ধাপ ৬: Deployment

### Option A: Vercel-এ Deploy (সহজ, recommended)

```bash
# আপনার code GitHub-এ push করুন
git add .
git commit -m "Initial commit"
git push origin main

# Vercel-এ project connect করুন
# → https://vercel.com/import
# → GitHub repository বেছুন
# → Environment variables paste করুন
# → Deploy করুন
```

### Option B: অন্য Platform-এ (AWS, DigitalOcean ইত্যাদি)

```bash
npm run build
npm run start
```

Platform-specific documentation follow করুন।

---

## ✅ ধাপ ৭: Post-Deployment Checklist

Deploy করার পরে এই সবকিছু check করুন:

- [ ] Domain সঠিকভাবে point করছে
- [ ] HTTPS কাজ করছে
- [ ] MongoDB connection OK
- [ ] R2/S3 bucket access OK
- [ ] Admin panel login কাজ করছে
- [ ] ভিডিও upload & play test
- [ ] Payment gateway (যদি লাগে) integrated
- [ ] Email notifications (optional) configured
- [ ] Staging environment এ সব test করেছেন

---

## 🔧 Customization Examples

### Example 1: ব্র্যান্ড Color পরিবর্তন

`tailwind.config.ts` এ:
```typescript
theme: {
  colors: {
    primary: '#FF6B6B', // ক্লায়েন্টের রঙ
    secondary: '#4ECDC4',
  }
}
```

তারপর component-এ: `bg-primary` ব্যবহার করলে আপনার নতুন রঙ apply হবে।

### Example 2: কাস্টম Navigation Menu

`components/Header.tsx` (যদি থাকে) edit করুন:
```tsx
const navLinks = [
  { href: '/about', label: 'আমাদের সম্পর্কে' },
  { href: '/contact', label: 'যোগাযোগ' },
  // আরও যোগ করুন
]
```

### Example 3: ক্লায়েন্টের Contact Info

`components/Footer.tsx` (যদি থাকে):
```tsx
<p>Email: {client.email}</p>
<p>Phone: {client.phone}</p>
<p>Address: {client.address}</p>
```

---

## 🐛 Troubleshooting

### Problem: "MongoDB connection failed"
**Solution:** 
- `MONGODB_URI` check করুন
- MongoDB atlas-এ IP whitelist করুন (allow all `0.0.0.0/0` temporarily)

### Problem: "Video upload fails"
**Solution:**
- R2 credentials check করুন
- Bucket name check করুন
- R2 bucket public না, private রাখা আছে কিনা check করুন

### Problem: "Domain DNS নাপনল"
**Solution:**
- DNS propagation সময় নেয় (১৫ মিনিট - ২৪ ঘণ্টা)
- `dig yourdomain.com` command দিয়ে check করুন
- Hosting provider support contact করুন

---

## 📚 Additional Resources

- **Next.js docs:** https://nextjs.org/docs
- **Payload CMS docs:** https://payloadcms.com/docs
- **Cloudflare R2 docs:** https://developers.cloudflare.com/r2/
- **MongoDB docs:** https://docs.mongodb.com/

---

## 💬 Support

কোনো সমস্যা হলে contact করুন:
- Email: support@tutorspace.dev
- Documentation: https://docs.tutorspace.dev

---

**Happy building! 🚀**
