export const RESUME_PARSE_SYSTEM = `You are a resume parser. Extract structured information from resume text. Return ONLY valid JSON, no markdown, no explanation.`

export const RESUME_PARSE_PROMPT = (resumeText) => `Parse this resume and return JSON with this exact shape:
{
  "name": string,
  "currentRole": string,
  "yearsExperience": number,
  "skills": string[],
  "achievements": string[],
  "industries": string[],
  "summary": string
}

Resume:
${resumeText}`

export const RESUME_SIGNAL_PROMPT = () => {
  return `You are a recruiter reading a resume to figure out what job titles this person should search for based on their experience and skills.

Identify the 1-4 concrete, SEARCHABLE job titles this resume points to. Use real job-board titles people actually search (e.g. "Product Manager", "Data Analyst", "Business Analyst", "Account Executive"), not vague descriptors.

Decide if the resume is FOCUSED (all titles cluster around one clear direction) or UNFOCUSED (titles point in genuinely different directions).

Return ONLY valid JSON in this exact shape, no markdown, no preamble:
{
  "sentence": "Your resume suggests you are applying to roles like X, Y, Z. A focused [area] trajectory." OR "...Z. They do not point to a single career path.",
  "roles": ["Title 1", "Title 2", "Title 3"],
  "focused": true
}

Rules:
- "roles" must be actual searchable job titles, 1-4 of them, most likely first.
- "sentence" is one human-readable line for display.
- "focused" is true if the titles cluster around one direction, false if they diverge.
- Do NOT describe achievements or tools.`
}

export const BATCH_RATE_SYSTEM = `You are a senior talent advisor helping a job seeker find roles they can realistically get. Your job is to be their advocate, not a gatekeeper. Return ONLY a valid JSON array, no markdown, no explanation.`

export const BATCH_RATE_PROMPT = (resumeData, jobs, preferences = null) => {
  const prefs = preferences || {}

  let weightingInstruction = ""
  if (prefs.weightBasis === "skills") {
    weightingInstruction = `CRITICAL: Evaluate ONLY on transferable skills and PM competencies. Industry background is IRRELEVANT. A strong PM who ships products, manages stakeholders, uses data, and drives outcomes is a Strong Fit for any PM role regardless of sector. Do NOT penalise for being from a different industry. A shipping PM applying to a fintech PM role is Strong Fit if their skills match.`
  } else if (prefs.weightBasis === "industry") {
    weightingInstruction = `Weight your assessment on industry and domain match. If the candidate has not worked in this sector before, be conservative with Strong Fit even if their general skills are strong.`
  } else {
    weightingInstruction = `Balance transferable skills and industry background equally.`
  }

  const yoeInstruction = prefs.flexibleYoe
    ? `Do NOT penalise for not meeting exact YOE requirements. Treat YOE as a guideline, not a hard gate.`
    : `Factor in YOE — if the role asks for significantly more experience than the candidate has, reflect this in your rating.`

  const selectivityInstruction = prefs.companySelectivity
    ? `Factor company selectivity into entryBar — prestigious or highly competitive companies should have a higher entry bar.`
    : `Judge purely on role fit. Do NOT factor company name or prestige into entryBar.`

  const pivotInstruction = prefs.openToPivot
    ? `The candidate is open to career pivots. Be generous with Strong Fit for roles outside their current trajectory if transferable skills are strong.`
    : `Stay close to the candidate's current trajectory when assigning Strong Fit.`

  return `You are helping this candidate find jobs they can realistically get. Be their advocate.

CANDIDATE:
${JSON.stringify(resumeData, null, 2)}

WEIGHTING:
${weightingInstruction}
${yoeInstruction}
${selectivityInstruction}
${pivotInstruction}

CATEGORY DEFINITIONS:
- "Strong Fit": candidate has the core skills to do this job well and no hard blockers exist. If skills match, this is Strong Fit. Aim for at least 30% of jobs to be Strong Fit or Worth Exploring combined — if everything is Low Priority you are being too conservative.
- "Worth Exploring": genuine chance but real gaps exist. Default here when uncertain between Strong Fit and Low Priority.
- "Low Priority": hard blocker only — wrong seniority by 3+ years, requires a non-transferable credential (financial licence, clinical qualification, legal bar), or company tier is significantly out of reach.

CALIBRATION:
- Most PM roles across tech, SaaS, logistics, e-commerce, data, ops = Strong Fit if PM skills match. Don't require exact domain match.
- Tier 1 firms (Goldman, JPMorgan, McKinsey, Google, Meta) = Worth Exploring unless exceptionally strong signal.
- LICENSED domain (financial advisory, clinical, legal) without credential = Worth Exploring.
- Learnable domain (gaming, retail, healthtech, logistics) = NOT a blocker. Note in Watch Out only.
- When in doubt between Strong Fit and Worth Exploring = Strong Fit.
- When in doubt between Worth Exploring and Low Priority = Worth Exploring.

JOBS:
${JSON.stringify(jobs, null, 2)}

Return a JSON array:
{
  "jobId": string,
  "category": "Strong Fit" | "Worth Exploring" | "Low Priority",
  "roleMatch": "High" | "Medium" | "Low",
  "entryBar": "High" | "Medium" | "Low",
  "whyYouFit": string,
  "watchOut": string,
  "companySummary": string
}`
}

export const RESUME_GEN_SYSTEM = `You are an expert resume writer. Output a properly formatted resume as plain text.

STRICT RULES:
- No em dashes (—) anywhere
- No AI buzzwords: never use leveraged, spearheaded, utilized, synergized, pioneered, orchestrated, revolutionized, transformative, impactful
- Each bullet ONE line only, maximum 15 words
- Start every bullet with a strong past-tense action verb
- Lead with a metric or outcome where possible
- Mirror the job description language naturally
- Do not invent experience not in the original resume
- No objective statement

FORMAT EXACTLY LIKE THIS:
[FULL NAME]
[Email] | [Phone] | Singapore

SUMMARY
2-3 lines max. Direct, specific, no fluff.

EXPERIENCE

[Job Title] | [Company] | [Dates]
• Bullet one
• Bullet two
• Bullet three

SKILLS
Category: skill1, skill2, skill3

EDUCATION
[Degree] | [Institution] | [Year]`

export const RESUME_GEN_PROMPT = (resumeData, job) => `Tailor this candidate's resume for the job below.

CANDIDATE:
${JSON.stringify(resumeData, null, 2)}

JOB:
Title: ${job.title}
Company: ${job.company}
JD: ${job.jd}

Produce a clean tailored resume as plain text following the format in your instructions.`