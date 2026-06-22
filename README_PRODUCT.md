# 📚 Canadian Nest School — White-Label Course Selling Platform Template

**একটি সম্পূর্ণ সমাধান যা দিয়ে আপনি নিজের অনলাইন কোর্স বিক্রয় প্ল্যাটফর্ম বানাতে পারবেন।**

নিজের domain-এ, নিজের brand-এ, সম্পূর্ণ নিয়ন্ত্রণে।

---

## 🎯 এটা কী?

Canadian Nest School একটি **production-ready template** যা দিয়ে আপনি:

✅ নিজের অনলাইন স্কুল চালু করতে পারবেন  
✅ ভিডিও কোর্স, লাইভ ক্লাস, কুইজ, অ্যাসাইনমেন্ট — সবকিছু করতে পারবেন  
✅ শিক্ষার্থী থেকে পেমেন্ট নিতে পারবেন  
✅ সার্টিফিকেট দিতে পারবেন  
✅ নিজের domain-এ সবকিছু করতে পারবেন (Udemy/Teachable এর মতো না)  
✅ সম্পূর্ণ নিরাপদ — কন্টেন্ট চুরি প্রতিরোধ করা আছে

---

## 📖 Documentation

এই রিপোজিটরিতে চারটি main guide আছে:

### **1. CLIENT_GUIDE.md** — যদি আপনি ক্লায়েন্ট/শিক্ষক হন

পড়ুন এই গাইড যদি:
- আপনি এই template কিনেছেন
- আপনি জানতে চান "এটা দিয়ে কী করতে পারব"
- আপনি non-technical person

**এতে আছে:**
- Platform features overview
- নিরাপত্তা সুবিধা
- শুরু করার ধাপ
- FAQ

### **2. DEVELOPER_SETUP.md** — যদি আপনি ডেভেলপার হন

পড়ুন এই গাইড যদি:
- আপনার ক্লায়েন্ট এই template কিনেছে
- আপনি setup, customize, এবং deploy করবেন
- আপনি Node.js/React এ পরিচিত

**এতে আছে:**
- Environment setup
- Brand customization
- R2/S3 video storage configuration
- Domain & DNS setup
- Deployment instructions (Vercel, AWS, etc.)
- Troubleshooting

### **3. SECURITY.md** — নিরাপত্তা বিবরণ

পড়ুন এই গাইড যদি:
- আপনি নিরাপত্তা features জানতে চান
- আপনি আপনার ক্লায়েন্টকে কী গ্যারান্টি দিতে পারবেন জানতে চান
- আপনি technical/non-technical উভয়ই হতে পারেন

**এতে আছে:**
- Authentication & authorization
- Video protection layers
- Anti-piracy deterrents
- Configuration checklist
- Honest limitations

### **4. AGENTS.md** — Developer Handbook

পড়ুন এই গাইড যদি:
- আপনি codebase modify করতে চান
- আপনি নিজেই code extend করতে চান
- আপনি architecture বুঝতে চান

---

## ✨ মূল বৈশিষ্ট্য

| ফিচার | বর্ণনা |
|---|---|
| **📹 ভিডিও কোর্স** | YouTube, Vimeo, বা নিজস্ব secure R2 storage-এ host করা ভিডিও |
| **🔴 লাইভ ক্লাস** | Zoom/Meet integration সহ scheduled live sessions |
| **❓ কুইজ পরীক্ষা** | MCQ প্রশ্ন, auto-grading, pass/fail criteria |
| **📝 অ্যাসাইনমেন্ট** | শিক্ষার্থী কাজ জমা দেয়, শিক্ষক grade দেয় |
| **🏆 সার্টিফিকেট** | কোর্স শেষে স্বয়ংক্রিয় সার্টিফিকেট |
| **💰 পেমেন্ট গেটওয়ে** | ইন্টিগ্রেটেড (Stripe/SSLCommerz) |
| **📊 Dashboard** | সম্পূর্ণ progress tracking & analytics |
| **🔐 কন্টেন্ট সুরক্ষা** | Watermark, device-limit, URL hiding, anti-screen-record |
| **📱 মোবাইল সাপোর্ট** | সব ডিভাইসে perfectly কাজ করে |
| **🎨 সম্পূর্ণ ব্র্যান্ডিং** | আপনার নিজের logo, colors, domain |

---

## 🚀 শুরু করুন

### **যদি আপনি ক্লায়েন্ট/ব্যবহারকারী হন:**

1. **CLIENT_GUIDE.md পড়ুন** — সব feature বুঝুন
2. **একটি ডেভেলপার খুঁজুন** — যে এটা আপনার জন্য setup করবে
3. **ডেভেলপারকে DEVELOPER_SETUP.md দিন** — তারা setup করবে

### **যদি আপনি ডেভেলপার হন:**

1. **Repository clone করুন**
   ```bash
   git clone <this-repo>
   cd canadian-nest-school
   npm install
   ```

2. **DEVELOPER_SETUP.md follow করুন** — step by step

3. **Local-এ test করুন**
   ```bash
   npm run dev
   # http://localhost:3000 খুলুন
   ```

4. **ক্লায়েন্টের domain-এ deploy করুন** — production guide follow করুন

---

## 🔐 নিরাপত্তা হাইলাইট

- **Secure video streaming** — R2-এ host করা ভিডিও লুকানো URL-এ serve হয়
- **Enrollment gating** — শুধু পেমেন্ট করা শিক্ষার্থীরা access পায়
- **Watermarking** — প্রতিটি viewer শনাক্ত হয়, leaked content ট্রেস করা যায়
- **Device limit** — একাউন্ট sharing প্রতিরোধ করা যায়
- **Anti-piracy deterrents** — JS-based protections (screenshot, recording বাধা)

বিস্তারিত জানতে **SECURITY.md** পড়ুন।

---

## 💡 Technology Stack

- **Frontend:** React 19, Next.js 16.2.6, Tailwind CSS
- **Backend:** Next.js API routes, Node.js
- **Database:** MongoDB
- **Video Storage:** Cloudflare R2 (S3-compatible)
- **Auth:** JWT
- **Admin CMS:** Payload CMS 3.x

---

## 📋 নিয়ম শর্তাবলী

এই template ব্যবহারের জন্য:
- আপনার নিজস্ব domain লাগবে
- MongoDB database লাগবে
- R2/S3 storage লাগবে (video-এর জন্য)
- একজন developer লাগবে (setup/customize-এর জন্য)

---

## ❓ FAQ

### **Q: এটা কি free?**
**A:** এটি একটি product template। ক্লায়েন্ট যখন কিনবে, তখন তারা এটা পাবে এবং নিজের developer দিয়ে setup করাবে।

### **Q: আমি একটি কোর্স ছাড়া আরও অনেক কোর্স বানাতে পারব?**
**A:** হ্যাঁ, unlimited কোর্স বানাতে পারবেন। শুধু যা পারবেন না তা হলো অন্য শিক্ষকদের invite করা — এটা single-person template।

### **Q: YouTube ভিডিও ব্যবহার করতে পারব?**
**A:** হ্যাঁ। অথবা YouTube লিংক দিন, অথবা R2-এ private upload করুন। আপনার পছন্দ।

### **Q: এটা কি সত্যিই secure?**
**A:** জ্বি, casual piracy রোধ করে। কিন্তু determined hacker চাইলে কিছু করতে পারবে। SECURITY.md-এ honest limitations আছে।

### **Q: কাস্টমাইজেশন কতটা সম্ভব?**
**A:** সম্পূর্ণভাবে। এটি open-source template। ডেভেলপার যেকোনো কাস্টম feature যোগ করতে পারবে।

---

## 📞 সাপোর্ট

যেকোনো সমস্যা হলে:
- DEVELOPER_SETUP.md-এ Troubleshooting দেখুন
- Issues খুলুন এই repo-তে
- আমাদের সাথে contact করুন

---

## 📄 লাইসেন্স

[আপনার লাইসেন্স তথ্য এখানে]

---

**Canadian Nest School — আপনার শিক্ষা ব্যবসার নিখুঁত প্ল্যাটফর্ম।** 🚀

শুরু করতে প্রস্তুত? CLIENT_GUIDE.md পড়ুন।
