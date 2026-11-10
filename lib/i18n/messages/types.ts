export type Messages = {
  nav: {
    home: string
    courses: string
    shop: string
    instructors: string
    about: string
    contact: string
    login: string
    register: string
    dashboard: string
    logout: string
    cart: string
  }
  hero: {
    master: string
    authentic: string
    english: string
    fromAnywhere: string
    inTheWorld: string
    subtitle1: string
    subtitle2: string
    cta: string
  }
  features: {
    headingBefore: string
    headingAccent: string
    subtitle: string
    items: Array<{ title: string; description: string }>
  }
  courses: {
    sectionTitle: string
    sectionSubtitle: string
    viewAll: string
    enroll: string
    free: string
    perMonth: string
    students: string
    lessons: string
    duration: string
    level: string
    levels: {
      all: string
      beginner: string
      intermediate: string
      advanced: string
    }
    whatYouWillLearn: string
    requirements: string
    courseContent: string
    instructor: string
    faq: string
    certificate: string
    backToCourses: string
    alreadyEnrolled: string
    monthlyLabel: string
    oneTimeLabel: string
    pageTitle: string
    pageSubtitle: string
    noCourses: string
    filterAll: string
  }
  cta: {
    title: string
    subtitle: string
    button: string
  }
  footer: {
    blurb: string
    tagline: string
    mainPages: string
    quickLinks: string
    blogs: string
    career: string
    contact: string
    privacy: string
    refund: string
    rights: string
  }
  about: { title: string }
  contact: { title: string }
  instructors: { title: string; subtitle: string }
  common: { loading: string; learnMore: string }
  lang: { bn: string; en: string; switchTo: string }
}
