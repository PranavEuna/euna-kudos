/**
 * Wipes and reseeds the DB with realistic @eunasolutions.com data.
 *
 * Safe to run against any DATABASE_URL — reads from process.env and deletes in
 * FK-safe order (comments → kudos → users), then inserts fresh rows. Re-running
 * is idempotent because the delete happens first.
 *
 *   npm run db:seed                              # against local embedded-postgres
 *   DATABASE_URL=postgres://... npm run db:seed  # against Aurora (once deployed)
 */
import 'dotenv/config'
import { db } from './db/index.js'
import { users, kudos, comments, type KudosCategory } from './db/schema.js'

// --- Users ---------------------------------------------------------------

type SeedUser = { email: string; name: string }

const USERS: SeedUser[] = [
  { email: 'pranav.kulkarni@eunasolutions.com', name: 'Pranav Kulkarni' },
  { email: 'ava.patel@eunasolutions.com', name: 'Ava Patel' },
  { email: 'marcus.chen@eunasolutions.com', name: 'Marcus Chen' },
  { email: 'priya.sharma@eunasolutions.com', name: 'Priya Sharma' },
  { email: 'jordan.taylor@eunasolutions.com', name: 'Jordan Taylor' },
  { email: 'sofia.rodriguez@eunasolutions.com', name: 'Sofia Rodriguez' },
  { email: 'ethan.oconnor@eunasolutions.com', name: "Ethan O'Connor" },
  { email: 'nia.johnson@eunasolutions.com', name: 'Nia Johnson' },
  { email: 'daniel.kim@eunasolutions.com', name: 'Daniel Kim' },
  { email: 'isabella.russo@eunasolutions.com', name: 'Isabella Russo' },
  { email: 'omar.hassan@eunasolutions.com', name: 'Omar Hassan' },
  { email: 'emma.nguyen@eunasolutions.com', name: 'Emma Nguyen' },
  { email: 'liam.brooks@eunasolutions.com', name: 'Liam Brooks' },
  { email: 'zara.okafor@eunasolutions.com', name: 'Zara Okafor' },
  // "admin" in the email → local dev auth adds the app-admins group to this user's session.
  { email: 'rachel.admin@eunasolutions.com', name: 'Rachel Admin' },
]

// --- Kudos ---------------------------------------------------------------

type SeedKudos = {
  from: string
  to: string
  category: KudosCategory
  message: string
  featured?: boolean
  daysAgo: number
  // References into COMMENTS_POOL so we can thread multiple comments off one kudos.
  commentIndexes?: number[]
}

const KUDOS: SeedKudos[] = [
  {
    from: 'ava.patel@eunasolutions.com',
    to: 'marcus.chen@eunasolutions.com',
    category: 'teamwork',
    message:
      'Marcus stayed late helping me untangle the Aurora migration rollback plan. Calm under pressure and genuinely generous with his time — exactly the kind of partner I want in a war room.',
    featured: true,
    daysAgo: 1,
    commentIndexes: [0, 1, 2],
  },
  {
    from: 'priya.sharma@eunasolutions.com',
    to: 'nia.johnson@eunasolutions.com',
    category: 'customer-love',
    message:
      "Nia turned around a critical support case for the State of Oregon in under two hours on a Friday. The customer literally called to say 'this is why we renewed.'",
    featured: true,
    daysAgo: 2,
    commentIndexes: [3, 4],
  },
  {
    from: 'jordan.taylor@eunasolutions.com',
    to: 'daniel.kim@eunasolutions.com',
    category: 'innovation',
    message:
      "Daniel's hackday prototype for AI-assisted vendor matching blew the room away. What was supposed to be a throwaway demo is now on the H2 roadmap.",
    featured: true,
    daysAgo: 4,
    commentIndexes: [5, 6, 7],
  },
  {
    from: 'sofia.rodriguez@eunasolutions.com',
    to: 'ethan.oconnor@eunasolutions.com',
    category: 'impact',
    message:
      'Ethan shipped the new procurement dashboard two sprints early. Three customers have already used it to close out Q1 reporting — real revenue impact.',
    daysAgo: 5,
    commentIndexes: [8],
  },
  {
    from: 'marcus.chen@eunasolutions.com',
    to: 'ava.patel@eunasolutions.com',
    category: 'teamwork',
    message:
      'Returning the favour — Ava spent two full days pairing on the Terraform module so CloudOps could un-block three of our vibe-coded apps. Selfless work.',
    daysAgo: 6,
    commentIndexes: [9],
  },
  {
    from: 'nia.johnson@eunasolutions.com',
    to: 'emma.nguyen@eunasolutions.com',
    category: 'growth',
    message:
      "Emma ran her first customer demo solo this week and absolutely nailed it. Watching her confidence grow over the last quarter has been a highlight of the year.",
    daysAgo: 7,
    commentIndexes: [10, 11],
  },
  {
    from: 'daniel.kim@eunasolutions.com',
    to: 'isabella.russo@eunasolutions.com',
    category: 'impact',
    message:
      'Isabella closed the biggest grants expansion of the quarter. Six-figure ARR, two months of work, landed clean. Legendary.',
    featured: true,
    daysAgo: 9,
    commentIndexes: [12, 13, 14],
  },
  {
    from: 'omar.hassan@eunasolutions.com',
    to: 'jordan.taylor@eunasolutions.com',
    category: 'teamwork',
    message:
      "Jordan dropped what he was doing to help me debug a production Lambda cold-start issue on a Sunday. The fix saved our Monday release.",
    daysAgo: 10,
    commentIndexes: [15],
  },
  {
    from: 'liam.brooks@eunasolutions.com',
    to: 'priya.sharma@eunasolutions.com',
    category: 'growth',
    message:
      'Priya set up a lunch-and-learn series on observability. Three sessions in and the whole platform team is already writing better structured logs.',
    daysAgo: 12,
    commentIndexes: [16, 17],
  },
  {
    from: 'isabella.russo@eunasolutions.com',
    to: 'sofia.rodriguez@eunasolutions.com',
    category: 'customer-love',
    message:
      'Sofia handled a tense renewal call with the City of Austin and turned a churn risk into a 3-year extension. Masterclass in reading the room.',
    daysAgo: 14,
    commentIndexes: [18, 19],
  },
  {
    from: 'emma.nguyen@eunasolutions.com',
    to: 'omar.hassan@eunasolutions.com',
    category: 'innovation',
    message:
      'Omar wrote an internal tool that auto-generates our release notes from PR labels. Already saving us ~2 hours every release. Small tool, big leverage.',
    daysAgo: 16,
    commentIndexes: [20],
  },
  {
    from: 'ethan.oconnor@eunasolutions.com',
    to: 'zara.okafor@eunasolutions.com',
    category: 'impact',
    message:
      "Zara's work on the new compliance reporting dashboard got flagged by legal as 'the cleanest implementation we've shipped.' Quality that compounds.",
    daysAgo: 18,
    commentIndexes: [21, 22],
  },
  {
    from: 'zara.okafor@eunasolutions.com',
    to: 'liam.brooks@eunasolutions.com',
    category: 'teamwork',
    message:
      "Liam offered to take over the on-call rotation so I could attend my sister's wedding. Didn't even blink. Thank you.",
    featured: true,
    daysAgo: 21,
    commentIndexes: [23, 24],
  },
  {
    from: 'ava.patel@eunasolutions.com',
    to: 'rachel.admin@eunasolutions.com',
    category: 'growth',
    message:
      "Rachel's 1:1s changed how I think about scope. I pushed back on a feature request this week for the first time ever and the PM actually thanked me for it.",
    daysAgo: 23,
    commentIndexes: [25],
  },
  {
    from: 'marcus.chen@eunasolutions.com',
    to: 'pranav.kulkarni@eunasolutions.com',
    category: 'innovation',
    message:
      "Pranav's vibe-coded-app-kit POC is going to unlock half a dozen internal tools this quarter. Every time I see one of these little apps go live, I smile.",
    daysAgo: 25,
    commentIndexes: [26, 27],
  },
  {
    from: 'pranav.kulkarni@eunasolutions.com',
    to: 'ava.patel@eunasolutions.com',
    category: 'teamwork',
    message:
      'Ava reviewed my Terraform PR line-by-line at 10pm on a Thursday. Found a subtle IAM policy bug I would have shipped. Saved future-me from a prod headache.',
    daysAgo: 27,
    commentIndexes: [28],
  },
  {
    from: 'priya.sharma@eunasolutions.com',
    to: 'daniel.kim@eunasolutions.com',
    category: 'customer-love',
    message:
      "Daniel spent 45 minutes walking a frustrated customer through our API in plain English — no jargon, no rushing. They emailed back to say it was the best support experience they'd had with any vendor this year.",
    daysAgo: 30,
    commentIndexes: [29, 30],
  },
  {
    from: 'nia.johnson@eunasolutions.com',
    to: 'jordan.taylor@eunasolutions.com',
    category: 'impact',
    message:
      'Jordan led the post-mortem on the January incident. Crisp writeup, no blame, actionable follow-ups. Set the bar for how we do these going forward.',
    daysAgo: 34,
    commentIndexes: [],
  },
  {
    from: 'sofia.rodriguez@eunasolutions.com',
    to: 'emma.nguyen@eunasolutions.com',
    category: 'growth',
    message:
      "Emma volunteered to mentor our new grad. Watched her turn 'I have no idea what I'm doing' into a merged PR in two weeks. That's a teacher.",
    daysAgo: 38,
    commentIndexes: [31],
  },
  {
    from: 'rachel.admin@eunasolutions.com',
    to: 'isabella.russo@eunasolutions.com',
    category: 'customer-love',
    message:
      "Bella's NPS verbatims are routinely the nicest things I read all week. You make our customers feel seen. That's the whole job.",
    daysAgo: 42,
    commentIndexes: [32, 33],
  },
  {
    from: 'omar.hassan@eunasolutions.com',
    to: 'ethan.oconnor@eunasolutions.com',
    category: 'innovation',
    message:
      "Ethan built a GitHub Action that catches Drizzle migration drift before it hits staging. Boring infra win — the best kind.",
    daysAgo: 47,
    commentIndexes: [],
  },
  {
    from: 'liam.brooks@eunasolutions.com',
    to: 'marcus.chen@eunasolutions.com',
    category: 'teamwork',
    message:
      "Marcus walked me through the auth middleware JIT provisioning pattern three times until it clicked. Patient, thorough, never made me feel dumb.",
    daysAgo: 51,
    commentIndexes: [34],
  },
  {
    from: 'isabella.russo@eunasolutions.com',
    to: 'zara.okafor@eunasolutions.com',
    category: 'growth',
    message:
      "Zara gave the most honest — and useful — code review I've gotten in a year. 'Here's what works, here's what I'd change, here's why.' More of this, please.",
    daysAgo: 55,
    commentIndexes: [35],
  },
  {
    from: 'jordan.taylor@eunasolutions.com',
    to: 'pranav.kulkarni@eunasolutions.com',
    category: 'impact',
    message:
      'The new Euna Kudos app went from idea to working prototype in a week. That kind of velocity is what I want the rest of the org to feel.',
    daysAgo: 58,
    commentIndexes: [36, 37],
  },
]

// Shared comment pool, referenced by index from KUDOS[i].commentIndexes above.
type SeedComment = { author: string; body: string; daysAgoOffset: number }

const COMMENTS_POOL: SeedComment[] = [
  { author: 'priya.sharma@eunasolutions.com', body: 'Seconded. Marcus is the first person I ping when something is on fire.', daysAgoOffset: 0 },
  { author: 'jordan.taylor@eunasolutions.com', body: 'This is exactly the kind of cross-team energy I want more of.', daysAgoOffset: 0 },
  { author: 'marcus.chen@eunasolutions.com', body: 'Ava made it easy — it was her calm that carried the room.', daysAgoOffset: 0 },
  { author: 'nia.johnson@eunasolutions.com', body: 'Thanks team — love seeing this here. Made my week.', daysAgoOffset: 0 },
  { author: 'rachel.admin@eunasolutions.com', body: "This is going in next week's all-hands.", daysAgoOffset: 0 },
  { author: 'omar.hassan@eunasolutions.com', body: 'I was in the demo — people literally gasped at the matching UI.', daysAgoOffset: 0 },
  { author: 'emma.nguyen@eunasolutions.com', body: 'Daniel, if you need a second pair of hands to productionize, I\'m in.', daysAgoOffset: 0 },
  { author: 'daniel.kim@eunasolutions.com', body: 'Appreciate it all — credit to the whole hackday team, not just me.', daysAgoOffset: 1 },
  { author: 'priya.sharma@eunasolutions.com', body: 'Customers are already asking when the next dashboard lands. Good problem to have.', daysAgoOffset: 0 },
  { author: 'isabella.russo@eunasolutions.com', body: 'Two of the best engineers on the team lifting each other. Love it.', daysAgoOffset: 0 },
  { author: 'liam.brooks@eunasolutions.com', body: 'Emma, that demo was seriously good. Didn\'t look like a first one.', daysAgoOffset: 0 },
  { author: 'ava.patel@eunasolutions.com', body: 'Deserved every bit of that kudos.', daysAgoOffset: 1 },
  { author: 'sofia.rodriguez@eunasolutions.com', body: 'Massive. Congrats Bella!', daysAgoOffset: 0 },
  { author: 'rachel.admin@eunasolutions.com', body: 'Incredible work — featuring this one.', daysAgoOffset: 0 },
  { author: 'ethan.oconnor@eunasolutions.com', body: 'This is the kind of deal that changes the quarter. Nice.', daysAgoOffset: 1 },
  { author: 'marcus.chen@eunasolutions.com', body: 'Sunday Jordan is the best Jordan.', daysAgoOffset: 0 },
  { author: 'omar.hassan@eunasolutions.com', body: 'Priya\'s lunch-and-learn is the best 30 minutes of my week.', daysAgoOffset: 0 },
  { author: 'zara.okafor@eunasolutions.com', body: 'Already writing better logs. Thanks Priya.', daysAgoOffset: 1 },
  { author: 'rachel.admin@eunasolutions.com', body: 'This kind of save is invisible from the outside. Seeing it here matters.', daysAgoOffset: 0 },
  { author: 'marcus.chen@eunasolutions.com', body: 'Sofia is the reason we still have that logo on our wall.', daysAgoOffset: 1 },
  { author: 'nia.johnson@eunasolutions.com', body: 'Stealing this tool immediately. Thank you Omar.', daysAgoOffset: 0 },
  { author: 'isabella.russo@eunasolutions.com', body: 'Zara\'s code is always a pleasure to review.', daysAgoOffset: 0 },
  { author: 'ava.patel@eunasolutions.com', body: 'Quiet excellence. My favourite kind.', daysAgoOffset: 1 },
  { author: 'ethan.oconnor@eunasolutions.com', body: 'Happy it worked out — congrats on the wedding!', daysAgoOffset: 0 },
  { author: 'priya.sharma@eunasolutions.com', body: 'This is the bar. More of this.', daysAgoOffset: 0 },
  { author: 'ava.patel@eunasolutions.com', body: 'Best manager I\'ve had at Euna. Not even close.', daysAgoOffset: 1 },
  { author: 'emma.nguyen@eunasolutions.com', body: 'The kit is a game-changer. Already built two little internal tools.', daysAgoOffset: 0 },
  { author: 'jordan.taylor@eunasolutions.com', body: 'Pranav, this is the work the company will remember in five years.', daysAgoOffset: 1 },
  { author: 'liam.brooks@eunasolutions.com', body: 'Ava saves so many prod bugs it should be a line item.', daysAgoOffset: 0 },
  { author: 'nia.johnson@eunasolutions.com', body: 'Daniel patiently walking customers through the API is a whole skill.', daysAgoOffset: 0 },
  { author: 'sofia.rodriguez@eunasolutions.com', body: 'This is why customer-love is a category.', daysAgoOffset: 1 },
  { author: 'priya.sharma@eunasolutions.com', body: 'Emma, you\'re going to run this team one day.', daysAgoOffset: 0 },
  { author: 'omar.hassan@eunasolutions.com', body: 'Bella makes every customer feel like our only customer.', daysAgoOffset: 0 },
  { author: 'daniel.kim@eunasolutions.com', body: 'Reading Bella\'s NPS verbatims is genuinely a morale boost.', daysAgoOffset: 1 },
  { author: 'priya.sharma@eunasolutions.com', body: 'Patience is a superpower. Marcus has it.', daysAgoOffset: 0 },
  { author: 'marcus.chen@eunasolutions.com', body: 'Zara\'s reviews changed how I write PRs.', daysAgoOffset: 0 },
  { author: 'rachel.admin@eunasolutions.com', body: 'This is the kind of velocity I want to see as our default, not our exception.', daysAgoOffset: 0 },
  { author: 'ava.patel@eunasolutions.com', body: 'Looking forward to what the next vibe-coded app is.', daysAgoOffset: 1 },
]

// --- Main ----------------------------------------------------------------

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000)
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set')
  }

  console.log('Seeding database at', redactUrl(process.env.DATABASE_URL))

  // FK-safe wipe.
  console.log('  Clearing comments, kudos, users…')
  await db.delete(comments)
  await db.delete(kudos)
  await db.delete(users)

  // Users.
  const insertedUsers = await db
    .insert(users)
    .values(USERS.map((u) => ({ email: u.email, name: u.name })))
    .returning()
  const userByEmail = new Map(insertedUsers.map((u) => [u.email, u]))
  console.log(`  Inserted ${insertedUsers.length} users`)

  // Kudos — insert one at a time so we can capture IDs for comments.
  type InsertedKudos = { id: string; seedIndex: number; createdAt: Date }
  const insertedKudos: InsertedKudos[] = []
  for (let i = 0; i < KUDOS.length; i++) {
    const k = KUDOS[i]
    const from = userByEmail.get(k.from)
    const to = userByEmail.get(k.to)
    if (!from || !to) throw new Error(`Unknown user in kudos row ${i}: ${k.from} or ${k.to}`)
    const createdAt = daysAgo(k.daysAgo)
    const [row] = await db
      .insert(kudos)
      .values({
        fromUserId: from.id,
        toUserId: to.id,
        category: k.category,
        message: k.message,
        featured: Boolean(k.featured),
        createdAt,
      })
      .returning()
    insertedKudos.push({ id: row.id, seedIndex: i, createdAt })
  }
  console.log(`  Inserted ${insertedKudos.length} kudos`)

  // Comments.
  const commentRows: Array<{
    kudosId: string
    authorId: string
    body: string
    createdAt: Date
  }> = []
  for (const ik of insertedKudos) {
    const seed = KUDOS[ik.seedIndex]
    for (const idx of seed.commentIndexes ?? []) {
      const c = COMMENTS_POOL[idx]
      if (!c) continue
      const author = userByEmail.get(c.author)
      if (!author) continue
      // Comments posted a few hours to a day after the kudos.
      const createdAt = new Date(
        ik.createdAt.getTime() + (c.daysAgoOffset + 0.1 + Math.random() * 0.5) * 24 * 60 * 60 * 1000
      )
      commentRows.push({
        kudosId: ik.id,
        authorId: author.id,
        body: c.body,
        createdAt,
      })
    }
  }
  if (commentRows.length > 0) {
    await db.insert(comments).values(commentRows)
  }
  console.log(`  Inserted ${commentRows.length} comments`)

  console.log('Done.')
  process.exit(0)
}

function redactUrl(url: string): string {
  return url.replace(/:\/\/[^:]+:[^@]+@/, '://<redacted>@')
}

main().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
