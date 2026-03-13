import { useState, useEffect, useMemo } from 'react'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Transaction, type Category } from '../db/database'
import { useSettings } from '../hooks/useSettings'
import { formatCurrency } from '../utils/calculations'
import { Icon } from './ui/Icon'
import { GROUP_COLORS } from '../utils/colors'

const SETTING_KEY = 'lastMonthlyAuditSeen'

// ─── Helpers ────────────────────────────────────────────────────────────

function getPreviousMonth() {
  const prev = subMonths(new Date(), 1)
  return {
    key: format(prev, 'yyyy-MM'),
    label: format(prev, 'MMMM yyyy'),
    start: format(startOfMonth(prev), 'yyyy-MM-dd'),
    end: format(endOfMonth(prev), 'yyyy-MM-dd'),
  }
}

function pick<T>(items: T[], seed: number): T {
  return items[Math.abs(seed) % items.length]
}
function hashSeed(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return h
}

interface AuditData {
  totalBudget: number
  totalSpent: number
  totalIncome: number
  budgetPct: number
  overBudget: boolean
  remaining: number
  topExpenses: { description: string; amount: number; category: string }[]
  topCategories: { name: string; group: string; total: number }[]
  biggestUnnecessary: { description: string; amount: number; category: string } | null
}

// ─── Spending habit detection ───────────────────────────────────────────

interface SpendingHabit {
  id: string
  label: string
  icon: string
  color: string        // tailwind text color
  bgColor: string      // tailwind bg color
  borderColor: string  // tailwind border color
  total: number
  count: number
  commentary: string[]  // seeded pick
}

interface HabitPattern {
  id: string
  label: string
  icon: string
  color: string
  bgColor: string
  borderColor: string
  /** Match against lowercase description */
  keywords: string[]
  /** Match against category name (exact, case-insensitive) */
  categoryNames: string[]
  commentary: string[]
}

const HABIT_PATTERNS: HabitPattern[] = [
  {
    id: 'delivery',
    label: 'Food Delivery',
    icon: 'Car',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-800/40',
    keywords: ['ubereats', 'uber eats', 'doordash', 'door dash', 'postmates', 'deliveroo', 'grubhub', 'seamless', 'instacart', 'gopuff', 'caviar', 'food delivery', 'just eat', 'menulog', 'skip the dishes', 'favor delivery'],
    categoryNames: [],
    commentary: [
      'Delivery apps are a budget killer. The fees, tips, and markups mean you\'re paying 2-3x what the food costs to make at home.',
      'Every delivery order has a hidden tax: service fees, delivery fees, tip, and inflated menu prices. That adds up fast.',
      'Convenience has a price tag. Cooking the same meals at home would have saved you a significant chunk of this.',
      'The delivery apps are designed to make ordering easy — but easy spending is expensive spending. Try meal prepping instead.',
      'Think about it: delivery fees + tips + markup = roughly 40% extra on every order. That\'s money left on the table.',
      'Your future self would rather have this money invested. A rice cooker and a slow cooker can replace most of these orders.',
      'Delivery is the modern equivalent of lighting money on fire for convenience. Batch cook on Sunday, eat like a king all week.',
      'The average delivery order costs $25-35 when you factor everything in. A home-cooked version? $5-8. Do the math.',
    ],
  },
  {
    id: 'coffee',
    label: 'Coffee & Cafes',
    icon: 'UtensilsCrossed',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-800/40',
    keywords: ['starbucks', 'dunkin', 'coffee', 'cafe', 'latte', 'espresso', 'cappuccino', 'frappuccino', 'dutch bros', 'peets', 'peet\'s', 'tim hortons', 'caribou coffee', 'blue bottle', 'philz'],
    categoryNames: [],
    commentary: [
      'The daily coffee habit is a classic budget leak. At $5-7 per drink, that\'s $150-210/month you could be investing.',
      'No shade on caffeine — but a bag of quality beans costs $15 and makes 30+ cups. Compare that to what you spent here.',
      'The "latte factor" is real. This spending might feel small per purchase, but it compounds into serious money over a year.',
      'Making coffee at home for a month costs about the same as 3 cafe visits. Just putting that out there.',
      'Your coffee habit is costing you more than some people\'s car payments. A French press pays for itself in a week.',
      'If you invested this coffee money instead, in 10 years you\'d have enough for something that actually matters.',
      'Not saying quit coffee — saying quit overpaying for it. Home brew tastes just as good once you find your method.',
      'Every cafe visit is $5+ walking out the door. Multiply that by the days in a month and you\'ll see why this matters.',
    ],
  },
  {
    id: 'dining',
    label: 'Dining Out',
    icon: 'UtensilsCrossed',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-800/40',
    keywords: ['restaurant', 'dining', 'dinner out', 'lunch out', 'brunch', 'takeout', 'take out', 'chipotle', 'mcdonald', 'chick-fil-a', 'subway', 'wendy', 'taco bell', 'burger king', 'popeyes', 'panda express', 'five guys', 'wingstop', 'panera', 'olive garden', 'applebee', 'ihop', 'waffle house', 'denny\'s', 'buffalo wild wings', 'chili\'s', 'outback', 'red lobster', 'cracker barrel', 'zaxby'],
    categoryNames: ['dining out'],
    commentary: [
      'Eating out is one of the fastest ways to drain a budget. The markup on restaurant food is 3-4x the ingredient cost.',
      'Social eating is fine occasionally, but when it becomes the default, your budget pays the price. Set a dining-out limit.',
      'Every restaurant meal could be 3-4 home-cooked meals. That math alone should change your habits.',
      'Dining out isn\'t just food — it\'s drinks, tips, tax, and parking. The real cost is always higher than the menu price.',
      'If eating out is your social activity, try hosting potlucks or cooking together. Same fun, fraction of the cost.',
      'This is probably your biggest controllable expense. Cut it in half and watch your savings transform.',
      'Restaurants are a luxury, not a food group. Treat them that way and your budget will thank you.',
      'Meal planning for 30 minutes on Sunday saves you hours of decision-making and hundreds of dollars all month.',
    ],
  },
  {
    id: 'fastfood',
    label: 'Fast Food',
    icon: 'ShoppingBag',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-800/40',
    keywords: ['fast food', 'drive thru', 'drive-thru', 'mcdonalds', 'burger king', 'wendys', 'taco bell', 'kfc', 'popeyes', 'sonic', 'jack in the box', 'in-n-out', 'whataburger', 'rally', 'checkers', 'arby', 'hardee', 'carl\'s jr', 'del taco', 'long john silver'],
    categoryNames: [],
    commentary: [
      'Fast food feels cheap per trip, but it adds up shockingly fast. Track the monthly total and you\'ll see.',
      'The "value meal" isn\'t valuable when you\'re buying 15 of them a month. Groceries are cheaper and healthier.',
      'Fast food is the definition of spending money on things that don\'t last. Literally — it\'s gone in 10 minutes.',
      'If you\'re hitting the drive-thru regularly, it\'s not saving time — it\'s a habit. And habits can be changed.',
      'Pack a lunch. Seriously. It takes 5 minutes and saves you $8-12 per day. That\'s $200+ per month.',
      'Fast food spending is usually impulse spending. If you can eliminate the impulse, you eliminate the cost.',
      'You\'re paying premium prices for the lowest quality food available. Grocery store rotisserie chickens exist for a reason.',
      'Every fast food meal is a missed opportunity to eat better for less. Your body and wallet both lose.',
    ],
  },
  {
    id: 'subscriptions',
    label: 'Subscriptions',
    icon: 'Smartphone',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-800/40',
    keywords: ['netflix', 'spotify', 'hulu', 'disney+', 'disney plus', 'hbo', 'paramount', 'peacock', 'apple tv', 'youtube premium', 'amazon prime', 'audible', 'crunchyroll', 'subscription', 'monthly fee', 'membership'],
    categoryNames: ['subscriptions'],
    commentary: [
      'Subscriptions are silent budget killers. They\'re small enough to ignore but big enough to matter when you add them up.',
      'How many of these do you actually use weekly? Cancel what you don\'t and rotate the rest monthly.',
      'The subscription economy is designed to make you forget you\'re paying. Don\'t fall for it — audit them regularly.',
      'Pick 2-3 subscriptions max. Everything else gets the axe. You can always re-subscribe later.',
      'Most people have 3-5 subscriptions they forgot about. That\'s $30-75/month going nowhere. Check your statements.',
      'Subscription stacking is the modern money trap. Each one seems small, but $10 × 8 services = $80/month = $960/year.',
      'If you wouldn\'t buy it again today, cancel it. The sunk cost isn\'t a reason to keep paying.',
      'Share accounts where possible, use free tiers, and rotate services. You don\'t need everything at once.',
    ],
  },
  {
    id: 'rideshare',
    label: 'Rideshare',
    icon: 'Car',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-800/40',
    keywords: ['uber', 'lyft', 'taxi', 'cab', 'rideshare', 'ride share'],
    categoryNames: [],
    commentary: [
      'Rideshare spending adds up fast — especially with surge pricing. Consider public transit or biking for regular routes.',
      'Every Uber ride is roughly 3-5x the cost of public transit. If you\'re using it daily, that gap becomes enormous.',
      'Rideshare should be occasional, not routine. If it\'s routine, it\'s time to rethink your transportation strategy.',
      'Surge pricing alone can double your transportation costs. Plan around peak hours or find alternatives.',
      'If you rideshare to work regularly, do the math on a monthly bus pass or even a used bike. The savings are massive.',
      'Convenience spending on rides is one of those costs that feels necessary but usually isn\'t. Most trips have cheaper options.',
    ],
  },
  {
    id: 'alcohol',
    label: 'Alcohol & Bars',
    icon: 'UtensilsCrossed',
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/10',
    borderColor: 'border-pink-800/40',
    keywords: ['bar', 'pub', 'brewery', 'wine', 'beer', 'liquor', 'cocktail', 'drinks', 'happy hour', 'nightclub', 'club', 'bottle service', 'alcohol', 'spirits', 'total wine', 'bevmo'],
    categoryNames: [],
    commentary: [
      'Bar tabs are budget black holes. One night out can cost more than a week of groceries.',
      'Drinks at bars are marked up 300-500%. If you\'re going to drink, pregame at home or buy from the store.',
      'Social drinking is expensive drinking. Set a hard limit before you go out and stick to it.',
      'The combination of alcohol + impaired judgement + an open tab is how budgets die. Cash-only rule helps.',
      'Track each bar visit\'s total and you might be shocked. It\'s often way more than you remember spending.',
      'Hosting instead of going out saves 70-80% on alcohol costs. Better conversations too.',
    ],
  },
  {
    id: 'shopping',
    label: 'Online Shopping',
    icon: 'ShoppingBag',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-800/40',
    keywords: ['amazon', 'walmart', 'target', 'best buy', 'ebay', 'etsy', 'shein', 'temu', 'aliexpress', 'wish', 'online order', 'online purchase'],
    categoryNames: ['shopping'],
    commentary: [
      'One-click buying is the enemy of budgets. Add a 24-hour wait rule before every purchase over $20.',
      'Online shopping makes spending feel painless — and that\'s exactly why it\'s dangerous. The money is just as real.',
      'Next time you\'re about to buy something online, add it to a list instead. Revisit in a week. You\'ll want half of it less.',
      'Free shipping thresholds are designed to make you spend more, not save money. Don\'t fall for it.',
      'If you can\'t explain why you need it without using the word "want," it can wait.',
      'Your cart total this month suggests some impulse buying. Try uninstalling shopping apps for 30 days.',
    ],
  },
  {
    id: 'gaming',
    label: 'Gaming',
    icon: 'Package',
    color: 'text-indigo-400',
    bgColor: 'bg-indigo-500/10',
    borderColor: 'border-indigo-800/40',
    keywords: ['steam', 'playstation', 'xbox', 'nintendo', 'epic games', 'game pass', 'twitch', 'v-bucks', 'robux', 'in-app purchase', 'microtransaction', 'gaming', 'video game'],
    categoryNames: [],
    commentary: [
      'Gaming is fine as a hobby, but microtransactions and impulse buys add up. Set a monthly gaming budget and stick to it.',
      'In-game purchases are designed by psychologists to get you to spend. Be aware of the manipulation.',
      'Wait for sales. Most games drop 40-75% within a few months. Patience is a financial superpower.',
      'The games in your backlog are free entertainment. Play what you own before buying more.',
      'Game Pass and subscription services can save money — but only if you cancel the games you were buying individually.',
      'Cosmetic items and DLC are pure wants spending. They\'re fine if budgeted, but they can\'t be impulse buys.',
    ],
  },
]

/** Detect spending habits from transactions */
function detectHabits(
  transactions: Transaction[],
  categories: Category[],
  _seed: number,
): SpendingHabit[] {
  const catMap = new Map(categories.map((c) => [c.id!, c]))
  const habits: SpendingHabit[] = []

  for (const pattern of HABIT_PATTERNS) {
    let total = 0
    let count = 0

    for (const t of transactions) {
      if (t.type !== 'expense') continue
      const desc = (t.description ?? '').toLowerCase()
      const catName = (catMap.get(t.categoryId)?.name ?? '').toLowerCase()

      const matchesKeyword = pattern.keywords.some((kw) => desc.includes(kw))
      const matchesCategory = pattern.categoryNames.some((cn) => catName === cn.toLowerCase())

      if (matchesKeyword || matchesCategory) {
        total += t.amount
        count++
      }
    }

    if (count > 0 && total > 0) {
      habits.push({
        id: pattern.id,
        label: pattern.label,
        icon: pattern.icon,
        color: pattern.color,
        bgColor: pattern.bgColor,
        borderColor: pattern.borderColor,
        total,
        count,
        commentary: pattern.commentary,
      })
    }
  }

  // Sort by total descending, keep top 4
  return habits.sort((a, b) => b.total - a.total).slice(0, 4)
}

// ─── Response variations ────────────────────────────────────────────────

const OVERVIEW_OVER = [
  (spent: string, budget: string, pct: string) =>
    `We need to talk. You spent ${spent} against a ${budget} budget. That's ${pct}% of your target.`,
  (spent: string, budget: string, pct: string) =>
    `Let's be honest — ${spent} spent on a ${budget} budget (${pct}%) is a problem. Time to course-correct.`,
  (spent: string, budget: string, pct: string) =>
    `${spent} out the door against a ${budget} limit — that's ${pct}%. Your wallet is waving the white flag.`,
  (spent: string, budget: string, pct: string) =>
    `You burned through ${spent} on a ${budget} budget — ${pct}%. That's not a plan, that's a problem.`,
  (spent: string, budget: string, pct: string) =>
    `${spent} spent. ${budget} was the limit. ${pct}% used. The math doesn't lie — something has to change.`,
  (spent: string, budget: string, pct: string) =>
    `Ouch. ${spent} against a ${budget} target puts you at ${pct}%. Let's figure out where it went wrong.`,
  (spent: string, budget: string, pct: string) =>
    `Your spending hit ${spent} on a ${budget} budget — that's ${pct}%. Time to face the numbers and fix this.`,
  (spent: string, budget: string, pct: string) =>
    `${pct}% of your ${budget} budget is gone — ${spent} total. Every overshoot makes the next month harder.`,
]

const OVERVIEW_UNDER = [
  (spent: string, budget: string) =>
    `Excellent work. You spent ${spent} against a ${budget} budget. That discipline builds wealth.`,
  (spent: string, budget: string) =>
    `Look at you. ${spent} spent with a ${budget} budget — that's how financial freedom is built.`,
  (spent: string, budget: string) =>
    `${spent} on a ${budget} budget. Clean, controlled, and calculated. Keep stacking.`,
  (spent: string, budget: string) =>
    `You came in at ${spent} under a ${budget} limit. That gap? That's your future getting brighter.`,
  (spent: string, budget: string) =>
    `${spent} spent, ${budget} budgeted. You left room to breathe and that's a power move.`,
  (spent: string, budget: string) =>
    `Budget was ${budget}. You only spent ${spent}. That self-control is rare — don't take it for granted.`,
  (spent: string, budget: string) =>
    `${spent} against ${budget} — you played it smart. The surplus is proof you're in control.`,
  (spent: string, budget: string) =>
    `Under budget again. ${spent} out of ${budget}. This is the consistency that changes lives.`,
]

const TOP_EXP_HEADER = [
  'These three transactions hit your wallet the hardest.',
  'Your top three money exits. No hiding from the numbers.',
  'The big three. Every dollar here is a dollar that didn\'t go to your goals.',
  'Here\'s where the bulk of your money went. Any surprises?',
  'Your three heaviest hitters. Were they all worth it?',
  'These purchases made the biggest dent. Let\'s take a closer look.',
  'The top three. Sometimes seeing them together tells a story.',
  'Three transactions, maximum impact. Knowledge is power.',
]

const OUCH_PROMPT = [
  'No judgement — but ask yourself: "If I could go back, would I spend this again?" If the answer is no, you just found your first cut for this month.',
  'Real talk — was this purchase still making you happy a week later? If not, that\'s your signal to cut it next month.',
  'Think about this one honestly. Would your future self thank you for it, or shake their head? That answer is your action plan.',
  'Here\'s the test: did this purchase add value to your life, or was it just a moment? Be honest with yourself.',
  'Picture yourself a year from now. Does this expense matter? If not, you know what to do differently.',
  'Not all spending is bad — but was this one necessary or just convenient? That distinction is where savings hide.',
  'Ask yourself: was this a need, a genuine want, or just an impulse? The answer reveals a lot about your habits.',
  'Close your eyes and think about this purchase. Feel good? Keep it. Feel nothing? That\'s your cut list starting.',
]

const NO_DISCRETIONARY = [
  'No discretionary spending to call out. You kept it tight!',
  'Zero wants spending worth flagging. That takes serious discipline.',
  'Nothing to roast here — your discretionary spending was locked down.',
  'Clean sheet on discretionary spending. That\'s genuinely impressive.',
  'Not a single wants expense to question. You\'re running a tight ship.',
  'Your wants spending was virtually nonexistent. That restraint is paying off.',
  'No impulse buys, no fluff. You treated your budget like a contract.',
  'Discretionary spending? What discretionary spending? Exactly.',
]

const VERDICT_A = [
  'Outstanding. You stayed well under budget and showed real discipline. Keep this energy — consistency is how wealth is built. Don\'t let lifestyle creep sneak in this month.',
  'This is what financial control looks like. You left money on the table and that\'s a flex. Stay hungry, stay disciplined.',
  'Elite-level budgeting. You\'re not just saving money — you\'re building habits that compound for years. Don\'t get comfortable, keep pushing.',
  'You\'re doing what 90% of people can\'t — spending less than you planned. That surplus is your future self saying thank you.',
  'Textbook execution. Under budget with room to spare. This is the kind of month that builds emergency funds and retirements.',
  'If budgeting were a sport, you just had an all-star game. The gap between your spending and your budget is where wealth grows.',
  'You crushed it. Staying this far under budget isn\'t easy — it means you said no to things. That takes strength. Keep going.',
  'This is how you win with money. Not with one lucky month, but with disciplined months like this one. Stack another on top.',
]

const VERDICT_B = [
  'Solid month. You stayed under budget, which is the goal. There\'s room to tighten up a bit, but you\'re moving in the right direction. Small improvements compound.',
  'Good, not great — and that\'s okay. You stayed in bounds. Now ask yourself what small cuts could turn this B into an A next month.',
  'You held the line and kept spending under control. That\'s a win. But there\'s always another level — find one area to trim and level up.',
  'You stayed under budget and that matters. The margin was thin though — one or two cuts and you\'d be sitting in A territory.',
  'Respectable month. You didn\'t overspend, and that\'s the foundation. Now look for the 5-10% you can shave off to really accelerate.',
  'Under budget is under budget — own that win. But don\'t coast. The best budgeters are always looking for the next edge.',
  'You passed the test, but just barely. Review your wants spending — there\'s almost certainly room to push this into A range.',
  'A B means you\'re on the right track but not quite locked in. Find one recurring expense to cut and watch next month transform.',
]

const VERDICT_C = [
  (over: string) => `We need to do better. You went over budget by ${over}. Take a hard look at your discretionary spending. Every dollar over budget is a dollar away from your financial goals. Lock in this month.`,
  (over: string) => `You slipped — ${over} over budget. It happens, but don't let it become a pattern. Identify your biggest leak and plug it this month. No excuses.`,
  (over: string) => `${over} past the limit. That's not a disaster, but it is a warning sign. The difference between building wealth and treading water is right here. Tighten up.`,
  (over: string) => `Over by ${over}. Not the end of the world, but it's a trend you need to kill before it kills your goals. Pick two expenses to eliminate.`,
  (over: string) => `${over} over — close enough to fix, far enough to worry about. This is the kind of month that separates people who talk about budgeting from people who do it.`,
  (over: string) => `You missed the mark by ${over}. The good news? That's a fixable gap. The question is whether you'll actually fix it or let it slide again.`,
  (over: string) => `${over} in the red. You were close, which means the discipline is there — it just needs to be sharper. Cut one habit and you're golden.`,
  (over: string) => `Budget busted by ${over}. Don't beat yourself up, but don't ignore it either. Write down three things you'll skip this month and commit.`,
]

const VERDICT_F = [
  (over: string, pct: string) => `This needs a reset. You spent ${over} over budget — that's ${pct}% of your target. It's time to cut the unnecessary spending and get serious. Your future self is counting on you. No more excuses.`,
  (over: string, pct: string) => `${over} over budget at ${pct}% — that's a five-alarm fire. Every swipe of the card matters. Sit down, look at every subscription, every impulse buy, and make cuts. You can turn this around.`,
  (over: string, pct: string) => `Hard truth: ${over} over at ${pct}% utilization is unsustainable. If this was someone else's budget, you'd tell them to stop. Treat yours the same way. This month is a fresh start — act like it.`,
  (over: string, pct: string) => `${over} past your limit — ${pct}% of budget used. This isn't a stumble, it's a freefall. You need a hard reset: cancel what you don't need, cook at home, and treat your budget like a promise.`,
  (over: string, pct: string) => `At ${pct}% budget usage and ${over} in the hole, something is fundamentally broken. Don't just trim — restructure. Look at every recurring charge and every category. Start from zero.`,
  (over: string, pct: string) => `${over} over. ${pct}% spent. Those numbers should make you uncomfortable — and that discomfort is useful. Channel it into action. This month, track every single dollar.`,
  (over: string, pct: string) => `You blew through your budget by ${over}, landing at ${pct}%. No sugarcoating it. But here's the thing — awareness is step one, and you're looking at the numbers. Now do something about it.`,
  (over: string, pct: string) => `${pct}% of your budget, ${over} over the line. You're spending like the budget doesn't exist. This month, prove it does. Write it on your mirror if you have to.`,
]

const DISMISS_LABEL = [
  "Let's Crush This Month",
  "Time to Lock In",
  "New Month, New Focus",
  "I'm Ready — Let's Go",
  "Challenge Accepted",
  "Bring It On",
  "Fresh Start, Let's Roll",
  "Game On",
]

// ─── Component ──────────────────────────────────────────────────────────

export function MonthlyAudit({ forceOpen, onForceClose }: { forceOpen?: boolean; onForceClose?: () => void }) {
  const { getSetting, setSetting, getMonthlyBudget } = useSettings()
  const [dismissed, setDismissed] = useState(false)
  const [step, setStep] = useState(0)

  const prev = useMemo(() => getPreviousMonth(), [])
  const lastSeen = getSetting(SETTING_KEY)
  const currentMonth = format(new Date(), 'yyyy-MM')

  const seed = useMemo(() => hashSeed(currentMonth), [currentMonth])

  const cur = useMemo(() => {
    const now = new Date()
    return {
      key: format(now, 'yyyy-MM'),
      label: format(now, 'MMMM yyyy'),
      start: format(startOfMonth(now), 'yyyy-MM-dd'),
      end: format(endOfMonth(now), 'yyyy-MM-dd'),
    }
  }, [])

  const prevTransactions = useLiveQuery(
    () => db.transactions.where('date').between(prev.start, prev.end, true, true).toArray(),
    [prev.start, prev.end],
  ) ?? []

  const curTransactions = useLiveQuery(
    () => forceOpen ? db.transactions.where('date').between(cur.start, cur.end, true, true).toArray() : Promise.resolve([] as Transaction[]),
    [cur.start, cur.end, forceOpen],
  ) ?? []

  const transactions = prevTransactions.length > 0 ? prevTransactions : curTransactions
  const reviewMonth = prevTransactions.length > 0 ? prev : cur

  const categories = useLiveQuery(() => db.categories.toArray()) ?? []

  const shouldShow = forceOpen || (!dismissed && lastSeen !== currentMonth && prevTransactions.length > 0)

  // Build audit data
  const audit = useMemo<AuditData | null>(() => {
    if (transactions.length === 0) return null

    const catMap = new Map(categories.map((c) => [c.id!, c]))
    const totalBudget = getMonthlyBudget(reviewMonth.key)

    let totalSpent = 0
    let totalIncome = 0
    const categoryTotals = new Map<number, number>()

    for (const t of transactions) {
      if (t.type === 'expense') {
        totalSpent += t.amount
        categoryTotals.set(t.categoryId, (categoryTotals.get(t.categoryId) ?? 0) + t.amount)
      } else {
        totalIncome += t.amount
      }
    }

    const expenses = transactions
      .filter((t) => t.type === 'expense')
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3)
      .map((t) => ({
        description: t.description || 'Unnamed expense',
        amount: t.amount,
        category: catMap.get(t.categoryId)?.name ?? 'Unknown',
      }))

    const topCats = [...categoryTotals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([catId, total]) => {
        const cat = catMap.get(catId)
        return { name: cat?.name ?? 'Unknown', group: cat?.group ?? 'needs', total }
      })

    const wantsExpenses = transactions
      .filter((t) => t.type === 'expense' && catMap.get(t.categoryId)?.group === 'wants')
      .sort((a, b) => b.amount - a.amount)

    const biggestUnnecessary = wantsExpenses.length > 0 ? {
      description: wantsExpenses[0].description || 'Unnamed expense',
      amount: wantsExpenses[0].amount,
      category: catMap.get(wantsExpenses[0].categoryId)?.name ?? 'Unknown',
    } : null

    const budgetPct = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0
    return {
      totalBudget, totalSpent, totalIncome, budgetPct,
      overBudget: totalSpent > totalBudget,
      remaining: totalBudget - totalSpent,
      topExpenses: expenses, topCategories: topCats, biggestUnnecessary,
    }
  }, [transactions, categories, reviewMonth.key, getMonthlyBudget])

  // Detect spending habits
  const habits = useMemo(
    () => detectHabits(transactions, categories, seed),
    [transactions, categories, seed],
  )
  const hasHabits = habits.length > 0

  // Steps: 0 = overview, 1 = top expenses, 2 = habits (conditional), 3 = ouch, 4 = final
  const stepIds = useMemo(() => {
    const ids = ['overview', 'top-expenses']
    if (hasHabits) ids.push('habits')
    ids.push('ouch', 'verdict')
    return ids
  }, [hasHabits])
  const totalSteps = stepIds.length
  const currentStepId = stepIds[step] ?? 'overview'

  useEffect(() => {
    if (shouldShow) {
      document.body.style.overflow = 'hidden'
    }
    return () => { document.body.style.overflow = '' }
  }, [shouldShow])

  if (!shouldShow || !audit) return null

  const dismiss = async () => {
    if (!forceOpen) {
      await setSetting(SETTING_KEY, currentMonth)
    }
    setDismissed(true)
    onForceClose?.()
  }

  const grade = audit.budgetPct <= 85 ? 'A' : audit.budgetPct <= 100 ? 'B' : audit.budgetPct <= 115 ? 'C' : 'F'
  const gradeColor = { A: 'text-green-400', B: 'text-blue-400', C: 'text-amber-400', F: 'text-red-400' }[grade]
  const gradeBg = { A: 'bg-green-500/15', B: 'bg-blue-500/15', C: 'bg-amber-500/15', F: 'bg-red-500/15' }[grade]

  const barColor = audit.overBudget ? 'bg-red-500' : audit.budgetPct > 85 ? 'bg-amber-500' : 'bg-green-500'
  const barWidth = Math.min(audit.budgetPct, 100)

  const spentStr = formatCurrency(audit.totalSpent)
  const budgetStr = formatCurrency(audit.totalBudget)
  const pctStr = audit.budgetPct.toFixed(0)
  const overStr = formatCurrency(Math.abs(audit.remaining))

  // Next button label
  const nextStepId = stepIds[step + 1]
  const nextLabel =
    nextStepId === 'top-expenses' ? 'See Top Expenses' :
    nextStepId === 'habits' ? 'Spending Habits' :
    nextStepId === 'ouch' ? 'The Hard Truth' :
    nextStepId === 'verdict' ? 'Final Verdict' : 'Next'

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pb-20 md:pb-4">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
      <div className="relative w-full max-w-md max-h-[85dvh] flex flex-col rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="shrink-0 px-6 pt-6 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2 mb-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15">
              <Icon name="ClipboardCheck" size={18} className="text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">Monthly Review</h2>
              <p className="text-xs text-slate-500">{reviewMonth.label}</p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-1.5 mt-3">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-green-500' : 'w-1.5 bg-slate-700'}`}
              />
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-5">

          {/* Overview */}
          {currentStepId === 'overview' && (
            <div className="space-y-5">
              <div className="text-center">
                {audit.overBudget ? (
                  <>
                    <p className="text-xl font-bold text-red-400 mb-1">{overStr} Over Budget</p>
                    <p className="text-sm text-slate-400">{pick(OVERVIEW_OVER, seed)(spentStr, budgetStr, pctStr)}</p>
                  </>
                ) : (
                  <>
                    <p className="text-xl font-bold text-green-400 mb-1">{overStr} Under Budget</p>
                    <p className="text-sm text-slate-400">{pick(OVERVIEW_UNDER, seed)(spentStr, budgetStr)}</p>
                  </>
                )}
              </div>
              <div>
                <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                  <span>Spent</span><span>{pctStr}%</span>
                </div>
                <div className="h-3 rounded-full bg-slate-800 overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${barWidth}%` }} />
                </div>
                <div className="flex justify-between text-xs text-slate-600 mt-1">
                  <span>{formatCurrency(0)}</span><span>{budgetStr}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-800 p-3 text-center">
                  <p className="text-xs text-slate-500 mb-0.5">Income</p>
                  <p className="text-lg font-bold text-green-400">{formatCurrency(audit.totalIncome)}</p>
                </div>
                <div className="rounded-xl bg-slate-800 p-3 text-center">
                  <p className="text-xs text-slate-500 mb-0.5">Expenses</p>
                  <p className="text-lg font-bold text-red-400">{spentStr}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wider">Top Categories</p>
                <div className="space-y-2">
                  {audit.topCategories.map((cat, i) => {
                    const pct = audit.totalSpent > 0 ? (cat.total / audit.totalSpent) * 100 : 0
                    const color = GROUP_COLORS[cat.group as keyof typeof GROUP_COLORS] ?? '#94a3b8'
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-sm text-slate-300">{cat.name}</span>
                          <span className="text-sm font-medium text-slate-200">{formatCurrency(cat.total)}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Top expenses */}
          {currentStepId === 'top-expenses' && (
            <div className="space-y-5">
              <div className="text-center">
                <p className="text-lg font-bold text-slate-100 mb-1">Your Biggest Expenses</p>
                <p className="text-sm text-slate-400">{pick(TOP_EXP_HEADER, seed)}</p>
              </div>
              <div className="space-y-3">
                {audit.topExpenses.map((exp, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl bg-slate-800 p-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10">
                      <span className="text-lg font-black text-red-400">#{i + 1}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-200 truncate">{exp.description}</p>
                      <p className="text-xs text-slate-500">{exp.category}</p>
                    </div>
                    <p className="text-sm font-bold text-red-400 shrink-0">{formatCurrency(exp.amount)}</p>
                  </div>
                ))}
              </div>
              {audit.topExpenses.length > 0 && (
                <p className="text-sm text-slate-500 text-center">
                  These three alone account for{' '}
                  <span className="text-slate-300 font-medium">
                    {formatCurrency(audit.topExpenses.reduce((s, e) => s + e.amount, 0))}
                  </span>
                  {' '}— {audit.totalSpent > 0
                    ? `${((audit.topExpenses.reduce((s, e) => s + e.amount, 0) / audit.totalSpent) * 100).toFixed(0)}% of all spending.`
                    : ''}
                </p>
              )}
            </div>
          )}

          {/* Spending habits callout */}
          {currentStepId === 'habits' && (
            <div className="space-y-5">
              <div className="text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/10 mx-auto mb-3">
                  <Icon name="AlertTriangle" size={28} className="text-orange-400" />
                </div>
                <p className="text-lg font-bold text-slate-100 mb-1">Spending Habits Detected</p>
                <p className="text-sm text-slate-400">We found some patterns in your spending worth calling out.</p>
              </div>
              <div className="space-y-3">
                {habits.map((habit) => {
                  const budgetPct = audit.totalBudget > 0 ? ((habit.total / audit.totalBudget) * 100).toFixed(1) : '0'
                  return (
                    <div key={habit.id} className={`rounded-xl border ${habit.borderColor} ${habit.bgColor} p-4`}>
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${habit.bgColor}`}>
                          <Icon name={habit.icon} size={18} className={habit.color} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-bold ${habit.color}`}>{habit.label}</p>
                          <p className="text-xs text-slate-500">
                            {habit.count} transaction{habit.count !== 1 ? 's' : ''} · {budgetPct}% of budget
                          </p>
                        </div>
                        <p className={`text-lg font-black ${habit.color} shrink-0`}>
                          {formatCurrency(habit.total)}
                        </p>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {pick(habit.commentary, seed + hashSeed(habit.id))}
                      </p>
                    </div>
                  )
                })}
              </div>
              {habits.length > 0 && (
                <div className="rounded-xl bg-slate-800 p-3 text-center">
                  <p className="text-xs text-slate-500 mb-0.5">Combined habit spending</p>
                  <p className="text-lg font-bold text-orange-400">
                    {formatCurrency(habits.reduce((s, h) => s + h.total, 0))}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {audit.totalBudget > 0
                      ? `${((habits.reduce((s, h) => s + h.total, 0) / audit.totalBudget) * 100).toFixed(0)}% of your monthly budget`
                      : ''}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Ouch moment */}
          {currentStepId === 'ouch' && (
            <div className="space-y-5">
              <div className="text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 mx-auto mb-3">
                  <Icon name="AlertTriangle" size={28} className="text-amber-400" />
                </div>
                <p className="text-lg font-bold text-slate-100 mb-1">The "Was It Worth It?" Check</p>
              </div>
              {audit.biggestUnnecessary ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-amber-800/40 bg-amber-900/15 p-4 text-center">
                    <p className="text-xs text-amber-400/80 mb-1 uppercase tracking-wider">Biggest Discretionary Expense</p>
                    <p className="text-2xl font-black text-amber-400">{formatCurrency(audit.biggestUnnecessary.amount)}</p>
                    <p className="text-sm text-slate-300 mt-1">{audit.biggestUnnecessary.description}</p>
                    <p className="text-xs text-slate-500">{audit.biggestUnnecessary.category}</p>
                  </div>
                  <p className="text-sm text-slate-400 text-center leading-relaxed">{pick(OUCH_PROMPT, seed)}</p>
                  {audit.overBudget && (
                    <p className="text-sm text-red-400/80 text-center">
                      Cutting this alone would have saved you {formatCurrency(audit.biggestUnnecessary.amount)}.
                      {audit.biggestUnnecessary.amount >= Math.abs(audit.remaining) && (
                        <span className="block mt-1 text-green-400">That would have kept you under budget.</span>
                      )}
                    </p>
                  )}
                </div>
              ) : (
                <div className="rounded-xl bg-green-500/10 border border-green-800/30 p-5 text-center">
                  <Icon name="Sparkles" size={32} className="text-green-400 mx-auto mb-2" />
                  <p className="text-sm text-green-400 font-medium">{pick(NO_DISCRETIONARY, seed)}</p>
                </div>
              )}
            </div>
          )}

          {/* Final verdict */}
          {currentStepId === 'verdict' && (
            <div className="space-y-5">
              <div className="text-center">
                <div className={`flex h-20 w-20 items-center justify-center rounded-3xl ${gradeBg} mx-auto mb-3`}>
                  <span className={`text-4xl font-black ${gradeColor}`}>{grade}</span>
                </div>
                <p className="text-lg font-bold text-slate-100 mb-2">Your {reviewMonth.label} Verdict</p>
              </div>
              <div className="rounded-xl bg-slate-800 p-4 space-y-3">
                {grade === 'A' && (
                  <p className="text-sm text-slate-300 leading-relaxed">
                    <span className="text-green-400 font-bold">Grade: A.</span>{' '}{pick(VERDICT_A, seed)}
                  </p>
                )}
                {grade === 'B' && (
                  <p className="text-sm text-slate-300 leading-relaxed">
                    <span className="text-blue-400 font-bold">Grade: B.</span>{' '}{pick(VERDICT_B, seed)}
                  </p>
                )}
                {grade === 'C' && (
                  <p className="text-sm text-slate-300 leading-relaxed">
                    <span className="text-amber-400 font-bold">Grade: C.</span>{' '}{pick(VERDICT_C, seed)(overStr)}
                  </p>
                )}
                {grade === 'F' && (
                  <p className="text-sm text-slate-300 leading-relaxed">
                    <span className="text-red-400 font-bold">Grade: F.</span>{' '}{pick(VERDICT_F, seed)(overStr, pctStr)}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-slate-800 p-2.5 text-center">
                  <p className="text-[10px] text-slate-500 mb-0.5">Budget</p>
                  <p className="text-sm font-bold text-slate-200">{budgetStr}</p>
                </div>
                <div className="rounded-xl bg-slate-800 p-2.5 text-center">
                  <p className="text-[10px] text-slate-500 mb-0.5">Spent</p>
                  <p className={`text-sm font-bold ${audit.overBudget ? 'text-red-400' : 'text-green-400'}`}>{spentStr}</p>
                </div>
                <div className="rounded-xl bg-slate-800 p-2.5 text-center">
                  <p className="text-[10px] text-slate-500 mb-0.5">Income</p>
                  <p className="text-sm font-bold text-green-400">{formatCurrency(audit.totalIncome)}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-6 py-4 border-t border-slate-800 flex gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              className="flex-1 rounded-xl bg-slate-800 py-3 text-sm font-medium text-slate-300 transition-colors active:bg-slate-700"
            >
              Back
            </button>
          )}
          {step < totalSteps - 1 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="flex-1 rounded-xl bg-green-600 py-3 text-sm font-bold text-white transition-colors active:bg-green-700"
            >
              {nextLabel}
            </button>
          ) : (
            <button
              onClick={dismiss}
              className="flex-1 rounded-xl bg-green-600 py-3 text-sm font-bold text-white transition-colors active:bg-green-700"
            >
              {pick(DISMISS_LABEL, seed)}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
