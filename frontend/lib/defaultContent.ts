/**
 * Default text and images for every page.
 * Admins can override any of this from Admin → Page content; saved versions are stored in the
 * SiteContent table (one JSON object per key) and take priority over these defaults.
 *
 * Images marked WIX are loaded from the current avmschoolindia.com site. To host them yourself,
 * download them into /public/images and change the URL here or in Admin → Page content.
 */

const WIX = (id: string) => `https://static.wixstatic.com/media/${id}`;

export const site = {
  schoolName: "Achala Vidya Mandira",
  shortName: "AVM School",
  kannadaName: "ಅಚಲ ವಿದ್ಯಾ ಮಂದಿರ",
  descriptor: "Primary & High School",
  logoUrl: WIX("04dfe0_cb790aa03d6a446bb811a2c565e070e0~mv2.png"),
  beanstalkLogoUrl: WIX("04dfe0_c8d4c328a10d48deae1fd337d454564a~mv2.png"),
  address: "1199, 18th A Main Road, 5th Block, Rajajinagar, Bengaluru 560010, Karnataka",
  phones: ["080 2330 3993", "+91 81232 43764"],
  email: "admin@avmschoolindia.com",
  whatsappUrl: "https://wa.link/pefpqr",
  facebookUrl: "https://www.facebook.com/beanstalk.avm.school",
  mapUrl: "https://www.google.com/maps/search/?api=1&query=1199+18th+A+Main+Road+5th+Block+Rajajinagar+Bengaluru+560010",
  established: "1995",
  board: "Karnataka State Board",
};

export const home = {
  hero: {
    title: "Achala Vidya Mandira",
    kannada: "ಅಚಲ ವಿದ್ಯಾ ಮಂದಿರ",
    intro:
      "A Karnataka State Board primary and high school in Rajajinagar, Bengaluru, teaching children since 1995, with Beanstalk, our pre-school for ages two to five.",
    primaryCtaLabel: "Register for admission",
    primaryCtaHref: "/register",
    secondaryCtaLabel: "See school life",
    secondaryCtaHref: "/school-life",
  },
  ourSchool: {
    heading: "Our school",
    paragraphs: [
      "AVM has built its name on sound teaching and steady values. We look after the whole child: how they think, play, speak and get along with others, not only their marks.",
      "Lessons are designed to be enjoyable and grounded in how children actually learn, and teachers adjust their approach to each child's pace and style.",
    ],
    facts: [
      { label: "Founded", value: "1995" },
      { label: "Syllabus", value: "Karnataka State Board" },
      { label: "Students per teacher", value: "25 to 1" },
      { label: "Sections", value: "Pre-school, primary and high school" },
    ],
  },
  beanstalk: {
    heading: "Beanstalk",
    tagline: "The fun school for tiny tots",
    body:
      "Beanstalk is AVM's pre-school for children aged two to five, from Pre-KG to UKG. The earliest years shape how a child relates to people, expresses feelings and learns to feel loved and secure, so the day is built around play, warmth and gentle routine.",
    ages: "Ages 2 to 5",
    linkLabel: "Ask about Beanstalk admissions",
    linkHref: "/contact",
  },
  facilitiesHeading: "Facilities",
  facilitiesIntro: "Everything a child needs for a full school day, under one roof.",
  facilities: [
    { name: "Smart classrooms", description: "Digital boards and media for lessons." },
    { name: "Spacious classrooms", description: "Airy rooms with space to move and work in groups." },
    { name: "Math and science lab", description: "Hands-on experiments and demonstrations." },
    { name: "Computer lab", description: "Computer skills from the primary years up." },
    { name: "E-learning class", description: "Digital lessons and online resources." },
    { name: "Art centre", description: "A dedicated space for drawing, painting and craft." },
    { name: "Indoor games", description: "Board games and indoor sport." },
    { name: "Playground", description: "Open ground for outdoor sports and play." },
    { name: "Audio-visual conference room", description: "For presentations, screenings and meetings." },
    { name: "Counselling services", description: "Support for students' wellbeing." },
    { name: "Sick bay", description: "Care for children who feel unwell during the day." },
  ],
  eventsHeading: "Recent events",
  events: [
    { title: "Annual Sports Day 2023", imageUrl: WIX("04dfe0_75f65b0fde9d4312988c1a2d5c73004a~mv2.jpg"), href: "/media" },
    { title: "Parenting session: building bonds with children", imageUrl: WIX("04dfe0_708dcae7fea3484b80d57ffe83f8dcd9~mv2.jpg"), href: "/media" },
    { title: "Bangalore District Netball Championship", imageUrl: WIX("04dfe0_ae14c444fce941dabae03facc46c0750~mv2.jpg"), href: "/media" },
  ],
  awards: {
    heading: "Awards",
    body: "Prizes won by the school and by our students in academics, sport and the arts. See photos from prize days and competitions in the gallery.",
    linkLabel: "Open the gallery",
    linkHref: "/gallery",
  },
  associationsHeading: "Associations",
  associations: [
    { name: "Department of School Education, Karnataka", logoUrl: WIX("04dfe0_9cc5b692a3a842a2a076018e64bbfce6~mv2.png") },
    { name: "Chrysalis ThinkRoom", logoUrl: WIX("04dfe0_a7721a85ff15420190edffeccf0f4247~mv2.jpg") },
  ],
  alumni: {
    heading: "Alumni",
    body: "Our former students now work as doctors, engineers, lawyers, scientists and more.",
    linkLabel: "Meet our alumni",
    linkHref: "/alumni",
  },
  cta: {
    heading: "Admissions",
    body: "The academic year begins in mid-June. Register online to start your child's application; the school office will contact you about the aptitude test and interview.",
    primaryLabel: "Register for admission",
    secondaryLabel: "Read the admission process",
  },
};

export const leadership = {
  title: "Leadership",
  intro: "The people who guide AVM, and what they want every child to leave with.",
  principal: {
    heading: "Message from our Principal",
    name: "",
    photoUrl: "",
    vision:
      "Our vision is for every student to leave AVM able to lead a productive, fulfilling life, as a lifelong learner and a responsible citizen.",
    mission:
      "Our mission is to give each child a holistic education in a safe setting, supported by good technology, so that they come to value learning and reach their full potential.",
  },
  faculty: {
    heading: "Our faculty",
    body:
      "AVM teachers are knowledgeable and skilled, and they act as caring mentors as much as instructors. Teaching here goes beyond the textbook, and staff attend regular workshops and seminars so the curriculum stays current.",
    members: [{ name: "Sudha Ramamurthy", role: "Faculty", photoUrl: "" }],
  },
  practicesHeading: "What parents can expect",
  practices: [
    "Dedicated, trained staff",
    "A nurturing and caring classroom climate",
    "Parent–teacher meetings, conferences and open days",
    "Awareness and training programmes for parents",
    "Continuous in-service training for teachers",
    "A thorough teacher selection process",
  ],
};

export const schoolLife = {
  title: "School life",
  intro: "How children learn at AVM, and everything that happens outside the classroom.",
  approach: {
    heading: "Our approach",
    paragraphs: [
      "Every child is different and learns in their own way. Our teaching approach was shaped with learning strategist Mrs. Pavitra, drawing on Howard Gardner's theory of multiple intelligences.",
      "Classes follow an inquiry-based learning cycle: children apply what they know and reason their way to answers instead of being handed the result.",
    ],
    methods: [
      "Thinking-skills facilitation",
      "Activity-based learning",
      "Project and play-way methods",
      "Storytelling and lectures",
      "Experiments and demonstrations",
    ],
  },
  partners: {
    heading: "Learning partners",
    body: "AVM works with Chrysalis on ThinkRoom, a programme that builds strong thinking habits through its Meta-Thinking Method.",
    items: [
      { name: "Chrysalis Thinkers", description: "Interactive learning material in place of passive textbooks." },
      { name: "Continuing Professional Development", description: "Training for teachers in 21st-century teaching methods." },
      { name: "Transformation Report", description: "A review of school quality across 45 measures every term." },
    ],
  },
  activities: {
    heading: "Activities",
    items: ["Yoga", "Music", "Karate", "Aerobics", "Keyboard"],
    images: [WIX("04dfe0_b6818994e9fd41b8ab9c540834e6392e~mv2.jpg"), WIX("04dfe0_453f39e3e6be478190b93aa8cf6b47c2~mv2.jpg")],
  },
  council: {
    heading: "Student council",
    body:
      "The student council is elected democratically and works with a teacher coordinator. Members set goals together and every member has a say in decisions. Any student can stand for a post; there are no academic or other conditions.",
  },
  sports: {
    heading: "Sports",
    points: [
      "Our teams play in around 40 to 50 inter-school tournaments each year, and many are hosted on our own campus.",
      "The annual Sports Day is run like a mini Olympics.",
      "Phase I students have two sports periods a day; Phase II students have one.",
      "Sport is part of the curriculum, and the school has produced many national-level athletes.",
    ],
    images: [
      WIX("04dfe0_a2539e50a27e4b30865cded707fa24f1~mv2.jpg"),
      WIX("04dfe0_83968190d4f04f018fcb4cbd345c8df2~mv2.jpg"),
      WIX("04dfe0_26893de707ac4f8ca2c9eedf1d4cdbfd~mv2.jpg"),
      WIX("04dfe0_e8337222b4e1466eb5f94480a21ff872~mv2.jpg"),
    ],
  },
  arts: {
    heading: "Visual arts",
    body: "Art classes help children express themselves and practise critical thinking and problem-solving across many media, guided by experienced art teachers.",
    images: [WIX("04dfe0_44e3663596ee4bc0b3631a1e0dd187eb~mv2.jpg"), WIX("04dfe0_a38335f523c84a8cb149cb825705f864~mv2.jpg")],
  },
};

export const alumni = {
  title: "Alumni",
  intro: "AVM alumni have gone on to work as doctors, engineers, lawyers, scientists and more. A few of them talk about their time at the school.",
  people: [
    { name: "Dr. Sachin", imageUrl: WIX("04dfe0_9169c510bf754b28b528d8a6752ab670~mv2.png"), videoUrl: "" },
    { name: "Kritika", imageUrl: WIX("04dfe0_b0577f36a7fa4528acadc126d62b319cf000.jpg"), videoUrl: "" },
    { name: "Jhanvi", imageUrl: WIX("04dfe0_b85840aa85c3463288e94060c77ca33c~mv2.png"), videoUrl: "" },
    { name: "Bhargavi", imageUrl: WIX("04dfe0_29dec4c4781b4c43a8af0301c1af7feef000.jpg"), videoUrl: "" },
    { name: "Priyanka", imageUrl: WIX("04dfe0_b7197d8ae7fd408e8a87d69e6bcd1748f002.jpg"), videoUrl: "" },
    { name: "Sai Tejas", imageUrl: WIX("04dfe0_ed8e64181b5d4c5f9ae66b1f4d512376f002.jpg"), videoUrl: "" },
    { name: "Meghna", imageUrl: WIX("04dfe0_7e0b340a93c341b0848cfe8c56797e0ff002.jpg"), videoUrl: "" },
  ],
};

export const admission = {
  title: "Admission",
  intro: "How to apply, what your child will wear and the attendance we expect.",
  stepsHeading: "Admission process",
  steps: [
    { title: "Register or collect a form", body: "Register online on this website, or collect the prospectus and admission form from the school office." },
    { title: "Aptitude test", body: "Applicants take a test in English, mathematics and languages at the school on a set date. It covers the general syllabus, not current textbooks." },
    { title: "Interview", body: "A personal interview with the class coordinator follows the test. Admission is confirmed only after both." },
    { title: "Conduct certificate", body: "Once admission is confirmed, parents submit a conduct certificate from the child's previous school." },
  ],
  notes: [
    "Admissions are on a first-come, first-served basis.",
    "We keep a student–teacher ratio of 25 to 1.",
    "Children joining Grade 1 must be at least six years old.",
    "The academic year begins in mid-June.",
  ],
  uniform: {
    heading: "Uniform",
    body: "The school colours are red and white.",
    items: ["Girls: white shirt with a red skirt", "Boys: white shirt and trousers with a red tie"],
  },
  attendance: {
    heading: "Attendance",
    body: "The school works 236 days a year. Students must attend at least 208 of them; students below the minimum are not eligible to sit the examinations.",
  },
};

export const media = {
  title: "Media",
  intro: "Events at school, reading for parents and students, and AVM in the press.",
  events: [
    { title: "Annual Sports Day 2023", date: "2023", summary: "The whole school on the field for our yearly mini Olympics.", imageUrl: WIX("04dfe0_75f65b0fde9d4312988c1a2d5c73004a~mv2.jpg") },
    { title: "Parenting session: building bonds with children", date: "", summary: "A session for parents on strengthening their relationship with their children.", imageUrl: WIX("04dfe0_708dcae7fea3484b80d57ffe83f8dcd9~mv2.jpg") },
  ],
  readReflect: [
    { title: "Meditation for young minds", summary: "", imageUrl: WIX("04dfe0_5cf17cb605fe44d697edc178551f2e0f~mv2.jpg") },
    { title: "Finding a true friend is like finding gold", summary: "", imageUrl: WIX("04dfe0_cd03a45cb6cf4852b9a671ebf5b390d8~mv2.jpg") },
    { title: "Confidence and communication skills", summary: "", imageUrl: WIX("04dfe0_c91d0fb2f00f4461a35bd857e519552b~mv2.jpg") },
  ],
  press: [
    { title: "Bangalore District Netball Championship", date: "", imageUrl: WIX("04dfe0_ae14c444fce941dabae03facc46c0750~mv2.jpg") },
    { title: "Amith Channesh", date: "", imageUrl: WIX("04dfe0_98ea2c348e9c405a8366a781ac4579e8~mv2.jpg") },
    { title: "NCC cadets at the Republic Day Parade, Delhi", date: "26 January 2023", imageUrl: WIX("04dfe0_b8926c2dbbfa467abaf0edd104bd0ca9~mv2.jpg") },
  ],
};

export const careers = {
  title: "Career",
  intro: "There are no vacancies at the moment, but we're always glad to hear from good teachers. Send your details and we'll contact you when a suitable position opens.",
  qualitiesHeading: "Who we look for",
  qualities: [
    "Patience with children",
    "Creative ways of teaching a class",
    "Effective classroom management",
    "A real passion for teaching",
    "Clear communication, including with parents",
  ],
  positions: ["Pre-school (Beanstalk) teacher", "Primary teacher", "High school teacher", "Sports coach", "Art teacher", "Administrative staff", "Other"],
};

export const faq = {
  title: "Frequently asked questions",
  intro: "Quick answers for parents. If yours isn't here, contact the school office.",
  items: [
    { q: "Are AVM and Beanstalk different institutions?", a: "They are run by the same management. Beanstalk is the pre-school, up to UKG; AVM covers Grade 1 onwards." },
    { q: "Which syllabus does the school follow?", a: "The Karnataka State Board syllabus, recognised by the Government of Karnataka." },
    { q: "Where can I find the admission procedure?", a: "On the Admission page. If your question isn't answered there, contact the school office." },
    { q: "Can I visit the campus?", a: "Yes. Please book an appointment with the school office before you come." },
    { q: "What other activities and facilities are there?", a: "See the School life page for activities, sports and arts, and the home page for facilities." },
  ],
};

export const contact = {
  title: "Connect",
  intro: "Come and see the school for yourself. Call the office to arrange a visit, or send us a message.",
  formHeading: "Send a message",
  hours: "",
};

export const defaults = { site, home, leadership, schoolLife, alumni, admission, media, careers, faq, contact };
export type ContentMap = typeof defaults;
export type ContentKey = keyof ContentMap;

/** Labels for Admin → Page content. "home" is the index page. */
export const contentPages: { key: ContentKey; label: string; path: string }[] = [
  { key: "home", label: "Home (index page)", path: "/" },
  { key: "site", label: "School details, logo & contact", path: "/" },
  { key: "leadership", label: "About us / Leadership", path: "/leadership" },
  { key: "schoolLife", label: "School life", path: "/school-life" },
  { key: "admission", label: "Admission", path: "/admission" },
  { key: "media", label: "Media", path: "/media" },
  { key: "alumni", label: "Alumni", path: "/alumni" },
  { key: "careers", label: "Career", path: "/careers" },
  { key: "faq", label: "FAQ", path: "/faq" },
  { key: "contact", label: "Connect", path: "/contact" },
];
