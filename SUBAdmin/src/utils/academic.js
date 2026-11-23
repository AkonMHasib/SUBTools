export const DEPARTMENTS = [
  { code: "CSE", name: "Computer Science & Engineering" },
  { code: "DSE", name: "Data Science and Engineering" },
  { code: "ARCH", name: "Architecture" },
  { code: "BBA", name: "Business Administration" },
  { code: "ENG", name: "English" },
  { code: "ES", name: "Environmental Science" },
  { code: "FENS", name: "Food Engineering & Nutrition Science" },
  { code: "JCMS", name: "Journalism, Communication & Media Studies" },
  { code: "LLB", name: "Bachelor of Laws" },
  { code: "B.PHARM", name: "Bachelor of Pharmacy" },
  { code: "MIB", name: "Microbiology" },
];

export const DEPARTMENT_CODES = DEPARTMENTS.map((department) => department.code);

export const ACADEMIC_SYSTEMS = [
  {
    value: "Architecture",
    label: "Architecture",
    levelLabel: "Studio",
    levels: 10,
    duration: "10 Studios / 5 Years / 6 Months Each",
  },
  {
    value: "Semester",
    label: "Semester",
    levelLabel: "Semester",
    levels: 8,
    duration: "8 Terms / 4 Years / 6 Months Each",
  },
  {
    value: "Trimester",
    label: "Trimester",
    levelLabel: "Trimester",
    levels: 12,
    duration: "12 Terms / 4 Years / 4 Months Each",
  },
];

export const CITY_AREAS = {
  Dhaka: [
    "Dhanmondi",
    "Mohammadpur",
    "Mirpur",
    "Uttara",
    "Gulshan",
    "Banani",
    "Baridhara",
    "Badda",
    "Rampura",
    "Bashundhara R/A",
    "Paltan",
    "Motijheel",
    "Shahbagh",
    "Farmgate",
    "Tejgaon",
    "Mohakhali",
    "Khilgaon",
    "Malibagh",
    "Wari",
    "Lalbagh",
    "Old Dhaka (Kotwali)",
    "Jatrabari",
    "Demra",
    "Keraniganj",
    "Hazaribagh",
    "Shyamoli",
    "Adabor",
    "Kalabagan",
    "Elephant Road",
    "Green Road",
  ],
  Gazipur: [
    "Tongi",
    "Joydebpur",
    "Board Bazar",
    "Chandna Chowrasta",
    "Konabari",
    "Kashimpur",
    "Shibbari",
    "Pubail",
    "Gazipur Sadar",
  ],
  Narayanganj: [
    "Narayanganj Sadar",
    "Chashara",
    "Khanpur",
    "Fatullah",
    "Siddhirganj",
    "Shanarpar",
    "Signboard",
    "Kanchpur",
    "Rupganj",
    "Araihazar",
    "Sonargaon",
  ],
  Narsingdi: ["Narsingdi Sadar", "Madhabdi", "Shibpur", "Monohardi", "Belabo", "Raipura", "Palash"],
};

export const normalizeDepartment = (department) => {
  if (!department) return "";
  let value = String(department).trim();

  // If department starts with a code followed by parenthesis e.g. "B.PHARM (B. Pharm (...))" or "ARCH (Bachelor...)"
  const prefixMatch = value.match(/^([A-Za-z.]+)\s*\(/);
  if (prefixMatch && prefixMatch[1]) {
    const rawPrefix = prefixMatch[1].toUpperCase();
    const candidateAliases = {
      "B.PHARM": "B.PHARM",
      BPHARM: "B.PHARM",
      ARCH: "ARCH",
      CSE: "CSE",
      DSE: "DSE",
      BBA: "BBA",
      ENG: "ENG",
      ES: "ES",
      ENV: "ES",
      FENS: "FENS",
      JCMS: "JCMS",
      LLB: "LLB",
      LAW: "LLB",
      MIB: "MIB",
      MICRO: "MIB",
      EEE: "EEE"
    };
    if (candidateAliases[rawPrefix]) {
      return candidateAliases[rawPrefix];
    }
  }

  value = value.toUpperCase();
  if (value.startsWith("DEPARTMENT OF ")) {
    value = value.replace("DEPARTMENT OF ", "").trim();
  }

  const aliases = {
    "COMPUTER SCIENCE & ENGINEERING": "CSE",
    "COMPUTER SCIENCE AND ENGINEERING": "CSE",
    "B.SC. IN COMPUTER SCIENCE & ENGINEERING (CSE)": "CSE",
    "B.SC. IN COMPUTER SCIENCE AND ENGINEERING (CSE)": "CSE",
    "B.SC. IN COMPUTER SCIENCE & ENGINEERING": "CSE",
    "B.SC. IN COMPUTER SCIENCE AND ENGINEERING": "CSE",
    CSE: "CSE",

    "DATA SCIENCE & ENGINEERING": "DSE",
    "DATA SCIENCE AND ENGINEERING": "DSE",
    "B.SC. IN DATA SCIENCE AND ENGINEERING": "DSE",
    "B.SC. IN DATA SCIENCE & ENGINEERING": "DSE",
    DSE: "DSE",

    ARCHITECTURE: "ARCH",
    "DEPARTMENT OF ARCHITECTURE": "ARCH",
    "BACHELOR OF ARCHITECTURE (B.ARCH)": "ARCH",
    "BACHELOR OF ARCHITECTURE": "ARCH",
    "B.ARCH": "ARCH",
    ARCH: "ARCH",

    "BACHELOR OF BUSINESS ADMINISTRATION": "BBA",
    "BUSINESS STUDIES": "BBA",
    "BUSINESS ADMINISTRATION": "BBA",
    BBA: "BBA",
    BUS: "BBA",

    "ENGLISH STUDIES": "ENG",
    "BA (HONS) IN ENGLISH": "ENG",
    "BA IN ENGLISH": "ENG",
    ENGLISH: "ENG",
    ENG: "ENG",

    "ENVIRONMENTAL SCIENCE": "ES",
    "B.SC. IN ENVIRONMENTAL SCIENCE": "ES",
    ENV: "ES",
    ES: "ES",

    "FOOD ENGINEERING & NUTRITION SCIENCE": "FENS",
    "FOOD ENGINEERING AND NUTRITION SCIENCE": "FENS",
    "B.SC. IN FOOD ENGINEERING AND NUTRITION SCIENCE": "FENS",
    "B.SC. IN FOOD ENGINEERING & NUTRITION SCIENCE": "FENS",
    "FOOD ENGINEERING & NUTRITION": "FENS",
    "FOOD ENGINEERING AND NUTRITION": "FENS",
    FENS: "FENS",

    "JOURNALISM, COMMUNICATION AND MEDIA STUDIES": "JCMS",
    "JOURNALISM, COMMUNICATION & MEDIA STUDIES": "JCMS",
    "BSS (HONS) IN JOURNALISM, COMMUNICATION AND MEDIA STUDIES": "JCMS",
    "BSS (HONS) IN JOURNALISM, COMMUNICATION & MEDIA STUDIES": "JCMS",
    "JOURNALISM & MEDIA STUDIES": "JCMS",
    "JOURNALISM AND MEDIA STUDIES": "JCMS",
    JCMS: "JCMS",
    JCM: "JCMS",

    "BACHELOR OF LAWS": "LLB",
    "LL.B. (HONS) - BACHELOR OF LAWS": "LLB",
    "LL.B. (HONS)": "LLB",
    "LLB (HONS)": "LLB",
    LAW: "LLB",
    LAWS: "LLB",
    LLB: "LLB",

    PHARMACY: "B.PHARM",
    "BACHELOR OF PHARMACY": "B.PHARM",
    "B. PHARM (BACHELOR OF PHARMACY)": "B.PHARM",
    "B.PHARM (BACHELOR OF PHARMACY)": "B.PHARM",
    "B. PHARM": "B.PHARM",
    "B.PHARMA": "B.PHARM",
    BPHARM: "B.PHARM",
    BPHARMA: "B.PHARM",
    "B.PHARM": "B.PHARM",
    PHAR: "B.PHARM",

    MICROBIOLOGY: "MIB",
    "BACHELOR OF SCIENCE IN MICROBIOLOGY": "MIB",
    "B.SC. IN MICROBIOLOGY": "MIB",
    MICRO: "MIB",
    MIB: "MIB",
    MIC: "MIB",

    // Legacy fallback mapping if EEE exists in old records
    "ELECTRICAL & ELECTRONIC ENGINEERING": "EEE",
    "ELECTRICAL AND ELECTRONIC ENGINEERING": "EEE",
    EEE: "EEE",
  };

  return aliases[value] || value;
};

export const normalizeDept = normalizeDepartment;

export const getDepartmentName = (department) => {
  const code = normalizeDepartment(department);
  return DEPARTMENTS.find((item) => item.code === code)?.name || department || "";
};

export const normalizeAcademicSystem = (system, department = "") => {
  if (normalizeDepartment(department) === "ARCH" || String(department).toUpperCase().includes("ARCH")) {
    return "Architecture";
  }

  if (system && ACADEMIC_SYSTEMS.some((item) => item.value === system)) {
    return system;
  }

  return "Semester";
};

export const getAcademicLevelOptions = (system, department = "") => {
  const normalized = normalizeAcademicSystem(system, department);
  const config = ACADEMIC_SYSTEMS.find((item) => item.value === normalized) || ACADEMIC_SYSTEMS[1];
  return Array.from({ length: config.levels }, (_, index) => `${config.levelLabel} ${index + 1}`);
};

export const normalizeAcademicLevel = (level, system, department = "") => {
  const options = getAcademicLevelOptions(system, department);
  if (!level) return options[0];

  const raw = String(level).trim();
  const match = raw.match(/(?:term|semester|trimester|studio)[-\s]*(\d+)/i);
  if (match) {
    const index = Number(match[1]) - 1;
    return options[index] || options[0];
  }

  return options.includes(raw) ? raw : options[0];
};

export const formatDOBDisplay = (value) => {
  if (!value) return "";
  let dateObj = null;

  if (typeof value?.toDate === "function") {
    dateObj = value.toDate();
  } else if (typeof value === "object" && typeof value.seconds === "number") {
    dateObj = new Date(value.seconds * 1000);
  } else if (typeof value === "number") {
    dateObj = new Date(value);
  } else if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "";

    const ddmmyyyyMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (ddmmyyyyMatch) {
      const day = ddmmyyyyMatch[1].padStart(2, "0");
      const month = ddmmyyyyMatch[2].padStart(2, "0");
      const year = ddmmyyyyMatch[3];
      return `${day}/${month}/${year}`;
    }

    const yyyymmddMatch = trimmed.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
    if (yyyymmddMatch) {
      const year = yyyymmddMatch[1];
      const month = yyyymmddMatch[2].padStart(2, "0");
      const day = yyyymmddMatch[3].padStart(2, "0");
      return `${day}/${month}/${year}`;
    }

    dateObj = new Date(trimmed);
  }

  if (dateObj && !isNaN(dateObj.getTime())) {
    const day = String(dateObj.getDate()).padStart(2, "0");
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const year = dateObj.getFullYear();
    return `${day}/${month}/${year}`;
  }

  return String(value || "");
};

export const formatDOBForInput = (value) => {
  if (!value) return "";
  let dateObj = null;

  if (typeof value?.toDate === "function") {
    dateObj = value.toDate();
  } else if (typeof value === "object" && typeof value.seconds === "number") {
    dateObj = new Date(value.seconds * 1000);
  } else if (typeof value === "number") {
    dateObj = new Date(value);
  } else if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "";

    const ddmmyyyyMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (ddmmyyyyMatch) {
      const day = ddmmyyyyMatch[1].padStart(2, "0");
      const month = ddmmyyyyMatch[2].padStart(2, "0");
      const year = ddmmyyyyMatch[3];
      return `${year}-${month}-${day}`;
    }

    const yyyymmddMatch = trimmed.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
    if (yyyymmddMatch) {
      const year = yyyymmddMatch[1];
      const month = yyyymmddMatch[2].padStart(2, "0");
      const day = yyyymmddMatch[3].padStart(2, "0");
      return `${year}-${month}-${day}`;
    }

    dateObj = new Date(trimmed);
  }

  if (dateObj && !isNaN(dateObj.getTime())) {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const day = String(dateObj.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  return "";
};

/**
  * Standardized academic department names for cover pages and formal documents.
  * Canonical rule: B.PHARM -> "Department of Pharmacy".
  */
export const getCoverPageDepartmentName = (rawCodeOrName) => {
  if (!rawCodeOrName) return "Department of Computer Science & Engineering";
  const upper = rawCodeOrName.trim().toUpperCase()
    .replace("DEPARTMENT OF ", "")
    .replace("DEPT OF ", "")
    .trim();

  switch (upper) {
    case "CSE":
    case "COMPUTER SCIENCE & ENGINEERING":
      return "Department of Computer Science & Engineering";
    case "DSE":
    case "DATA SCIENCE AND ENGINEERING":
    case "DATA SCIENCE & ENGINEERING":
      return "Department of Data Science and Engineering";
    case "ARCH":
    case "ARCHITECTURE":
    case "B.ARCH":
      return "Department of Architecture";
    case "BBA":
    case "BUSINESS ADMINISTRATION":
      return "Department of Business Administration";
    case "ENG":
    case "ENGLISH":
      return "Department of English";
    case "ES":
    case "ENVIRONMENTAL SCIENCE":
      return "Department of Environmental Science";
    case "FENS":
    case "FOOD ENGINEERING AND NUTRITION SCIENCE":
    case "FOOD ENGINEERING & NUTRITION SCIENCE":
      return "Department of Food Engineering and Nutrition Science";
    case "JCMS":
    case "JOURNALISM, COMMUNICATION AND MEDIA STUDIES":
    case "JOURNALISM, COMMUNICATION & MEDIA STUDIES":
      return "Department of Journalism, Communication and Media Studies";
    case "LLB":
    case "LAW":
    case "LAWS":
      return "Department of Law";
    case "B.PHARM":
    case "BPHARM":
    case "PHARMACY":
    case "PHARM":
      return "Department of Pharmacy";
    case "MIB":
    case "MICROBIOLOGY":
      return "Department of Microbiology";
    default:
      if (rawCodeOrName.toLowerCase().startsWith("department of ")) {
        return rawCodeOrName.trim();
      }
      return `Department of ${rawCodeOrName.trim()}`;
  }
};

/**
 * Resolves a department code or name to its clean, friendly Full Department Name for output displays.
 * Example: 'ARCH' -> 'Architecture', 'CSE' -> 'Computer Science & Engineering', 'BBA' -> 'Business Administration',
 * 'LLB' -> 'Law', 'B.PHARM' -> 'Pharmacy', 'MIB' -> 'Microbiology', 'ENG' -> 'English', 'FENS' -> 'Food Engineering and Nutrition Science',
 * 'JCMS' -> 'Journalism, Communication and Media Studies', 'ES' -> 'Environmental Science', 'DSE' -> 'Data Science and Engineering'.
 */
export const getDepartmentFullName = (rawCodeOrName) => {
  if (!rawCodeOrName || rawCodeOrName === "N/A" || rawCodeOrName === "null") return "";
  const trimmed = String(rawCodeOrName).trim();
  if (trimmed.toUpperCase() === "ALL" || trimmed.toUpperCase() === "ALL DEPARTMENTS") {
    return "All Departments";
  }
  const upper = trimmed.toUpperCase()
    .replace(/^DEPARTMENT OF\s+/i, "")
    .replace(/^DEPT OF\s+/i, "")
    .replace(/^DEPT\.\s+OF\s+/i, "")
    .trim();

  switch (upper) {
    case "CSE":
    case "COMPUTER SCIENCE":
    case "COMPUTER SCIENCE & ENGINEERING":
    case "COMPUTER SCIENCE AND ENGINEERING":
      return "Computer Science & Engineering";
    case "DSE":
    case "DATA SCIENCE":
    case "DATA SCIENCE AND ENGINEERING":
    case "DATA SCIENCE & ENGINEERING":
      return "Data Science and Engineering";
    case "ARCH":
    case "ARCHITECTURE":
    case "B.ARCH":
      return "Architecture";
    case "BBA":
    case "BUSINESS":
    case "BUSINESS ADMINISTRATION":
      return "Business Administration";
    case "ENG":
    case "ENGLISH":
    case "ENGLISH STUDIES":
      return "English";
    case "ES":
    case "ENV":
    case "ENVIRONMENTAL SCIENCE":
      return "Environmental Science";
    case "FENS":
    case "FOOD":
    case "FOOD ENGINEERING":
    case "FOOD ENGINEERING AND NUTRITION SCIENCE":
    case "FOOD ENGINEERING & NUTRITION SCIENCE":
      return "Food Engineering and Nutrition Science";
    case "JCMS":
    case "JOURNALISM":
    case "JOURNALISM, COMMUNICATION AND MEDIA STUDIES":
    case "JOURNALISM, COMMUNICATION & MEDIA STUDIES":
      return "Journalism, Communication and Media Studies";
    case "LLB":
    case "LAW":
    case "LAWS":
    case "LL.B":
      return "Law";
    case "B.PHARM":
    case "BPHARM":
    case "PHARM":
    case "PHARMACY":
      return "Pharmacy";
    case "MIB":
    case "MICRO":
    case "MICROBIOLOGY":
      return "Microbiology";
    default:
      return trimmed;
  }
};

