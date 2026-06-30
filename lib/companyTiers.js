const TIER_1 = [
  // FAANG / top global tech
  "google", "meta", "apple", "amazon", "netflix", "microsoft", "nvidia", "openai",
  "anthropic", "deepmind", "salesforce", "adobe", "oracle",
  // Top finance / consulting
  "goldman sachs", "jp morgan", "jpmorgan", "morgan stanley", "blackrock", "citadel",
  "two sigma", "jump trading", "jane street",
  "mckinsey", "bain & company", "boston consulting", "bcg",
  // Top SG / Asia unicorns
  "grab", "sea limited", "shopee", "bytedance", "tiktok",
]

const TIER_2 = [
  // Well-known global tech
  "stripe", "airbnb", "uber", "linkedin", "twitter", "spotify", "atlassian",
  "workday", "servicenow", "zendesk", "hubspot", "twilio", "datadog", "snowflake",
  "palantir", "figma", "notion", "asana", "slack",
  // SG / regional
  "dbs", "ocbc", "uob", "mas ", "standard chartered", "hsbc", "citi",
  "singtel", "starhub", "m1 ", "st engineering", "singapore airlines", "sia ", "sia engineering",
  "lazada", "gojek", "tokopedia", "razer", "garena", "shopback", "coda", "carousell",
  "ninjavan", "ninja van", "ninja logistics", "foodpanda", "deliveroo",
  "govtech", "government technology", "dsta", "dso ", "a*star",
  "accenture", "deloitte", "kpmg", "pwc", "ernst & young", "ey ", "ibm",
  // Global finance
  "ubs", "credit suisse", "barclays", "deutsche bank", "bnp paribas",
  "visa", "mastercard", "paypal", "american express", "amex",
]

const TIER_3 = [
  // Known SG companies / mid-tier
  "singlife", "prudential", "great eastern", "aia ", "manulife", "aviva",
  "capitaland", "cdr", "cdl", "frasers", "mapletree", "keppel",
  "sembcorp", "smrt", "sbs transit", "comfort delgro",
  "glints", "myinfo", "crimsonlogic", "iag", "sph ", "mediacorp",
  "patsnap", "aspire", "nium", "thunes", "funding societies",
  "instarem", "validus", "xfers", "matchmove",
]

export function getCompanyTier(company) {
  const name = (company || "").toLowerCase()
  if (TIER_1.some(t => name.includes(t))) return 1
  if (TIER_2.some(t => name.includes(t))) return 2
  if (TIER_3.some(t => name.includes(t))) return 3
  return null
}

export const TIER_LABELS = {
  1: "Tier 1",
  2: "Tier 2",
  3: "Tier 3",
}

export const TIER_COLORS = {
  1: { color: "#14201C", background: "#ECFDF5", border: "#A7F3D0" },
  2: { color: "#16825C", background: "#ECFDF5", border: "#A7F3D0" },
  3: { color: "#16825C", background: "#F0FDF4", border: "#BBF7D0" },
}

// Companies to show in default market snapshot (no search)
export const FEATURED_COMPANIES = [
  "Google", "Meta", "Microsoft", "Amazon", "Apple",
  "Grab", "Sea Limited", "ByteDance", "Shopee", "Stripe",
  "DBS", "Goldman Sachs", "McKinsey", "Accenture", "Deloitte",
]

// Recruiting agencies / staffing firms — excluded from market snapshot
export const RECRUITER_BLACKLIST = [
  "nodeflair", "glints", "michael page", "robert half", "robert walters",
  "adecco", "randstad", "recruit express", "recruitfirst", "kelly services",
  "manpower", "hudson", "hays", "ambition", "connected group", "profile asia",
  "search asia", "searchasia", "capita ", "nxt.", "persolkelly", "persolly",
  "gmp ", "staffing", "recruitment", "recruiter", "talent acquisition",
  "human resources consulting", "hr consulting", "outsourcing",
  "exec search", "executive search", "headhunter", "headhunting",
  "employment agency", "job agency", "placement agency",
  "links international", "navigos", "cornerstone", "korn ferry",
  "spencer stuart", "egon zehnder", "boyden", "stanton chase",
  "talentvis", "agensi pekerjaan", "peopleprofilers", "people profilers",
]

export function isRecruiter(company) {
  const name = (company || "").toLowerCase()
  return RECRUITER_BLACKLIST.some(r => name.includes(r))
}
