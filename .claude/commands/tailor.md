---
description: Tailor the resume to a job posting (URL or pasted description)
argument-hint: <job URL or pasted job description> [slug]
---

Tailor my resume for this job: $ARGUMENTS

Start by reading `resume/schema.md` and `resume/master.json`.

## 1. Capture the job
- If I gave a URL, fetch it. If the fetch fails (LinkedIn and some ATS pages block it), ask me to paste the description and stop there.
- Choose a slug such as `acme-staff-platform` (lowercase, digits, dashes) unless I gave one. If `tailored/<slug>/` already exists, update its variant rather than scaffolding again.
- Run `npm run tailor:new <slug>` and put the full job description, URL, company, and role into `tailored/<slug>/job.md`.
- From the description, pull out the must-have requirements, the nice-to-haves, and the specific terms it repeats (technologies, domains, scope words like "platform", "multi-team", "0→1").

## 2. Write `tailored/<slug>/variant.yaml`
- **Bullets:** choose by relevance to the must-haves and order strongest first. Aim for about 4–6 for SUBSCRIBE, 2–4 for Handshake, 1–3 for each Tuft & Needle role, and drop or nearly empty anything older. Non-public bullets are allowed.
- **Summary:** optionally add a one- or two-sentence `basics.summary` that combines facts already present in the master.
- **Label:** match the posting's title family when the master supports it (for example "Staff Software Engineer"), and never claim a level I haven't held.
- **Skills and education:** list the skill keywords that matter for this job, in order, and keep the certificates that matter. Drop languages unless the job values them.
- **Rewrites:** use them to put a bullet in the job's vocabulary or to lead with the part that matters to this employer.

## 3. Truthfulness rules (non-negotiable)
- A rewrite can rephrase, reorder, shorten, or emphasize what its source bullet already says. It must not add facts, numbers, technologies, team sizes, outcomes, or scope that the source bullet (or another master entry) does not support.
- Never invent a skill to cover a gap. Report the gap to me instead.
- Keep each rewrite recognizably the same accomplishment, so a recruiter's question about it has a true answer.

## 4. Build and fit
- Run `npm run tailor <slug>`. Fix any id errors it reports.
- If the PDF is longer than 2 pages, cut the weakest bullets, older entries, or extra certificates, then rebuild.

## 5. Report back
- A table of job-description requirements, each mapped to the bullet ids that cover it, or **gap**.
- Every rewrite next to its original text.
- Anything I should consider adding to `resume/master.json`: real experience the posting asks about that the master doesn't mention. Phrase each one as a question for me; don't add it yourself.
- The output paths (`out/<slug>/…pdf`, `.html`, `.json`) and the page count.
