import type { CategoryGroup } from '../db/database'

export interface CategoryInference {
  categoryName: string
  categoryGroup: CategoryGroup
  confidence: 'high' | 'low'
}

interface Rule {
  categoryName: string
  categoryGroup: CategoryGroup
  confidence: 'high' | 'low'
  pattern: RegExp
}

/**
 * Ordered list of rules: high-confidence merchants first, low-confidence keywords second.
 * Rules are tested in order; the first match wins within each confidence tier.
 */
const RULES: Rule[] = [
  // ─── GROCERIES ──────────────────────────────────────────────────────────────
  {
    categoryName: 'Groceries', categoryGroup: 'needs', confidence: 'high',
    pattern: /\b(walmart\s*(grocery|neighborhood|supercenter)?|kroger|safeway|whole\s*foods|trader\s*joe'?s?|costco|sam'?s\s*club|aldi|publix|h[- ]?e[- ]?b|meijer|wegmans|food\s*lion|albertsons?|winn[- ]?dixie|sprouts\s*farmers?|harris\s*teeter|giant\s*(food|eagle|store)?|stop\s*&\s*shop|market\s*basket|ingles\s*market|king\s*soopers?|city\s*market|jewel[- ]?osco|shaw'?s|price\s*chopper|hannaford|stater\s*bros?|winco\s*foods?|smart\s*&\s*final|natural\s*grocers?|earth\s*fare|ralphs?|vons|fred\s*meyer|piggly\s*wiggly|tom\s*thumb|randalls?|brookshire|dillons?\s*(store)?|fry'?s\s*food|qfc\s*(market)?|pavilions|acme\s*markets?|star\s*market|tops?\s*(market|friendly)?|save\s*a\s*lot|food\s*4\s*less|fiesta\s*mart|price\s*rite|grocery\s*outlet|lidl|trader\s*joes?|lucky\s*supermarket|united\s*supermarket|hyvee|hy[- ]?vee|weis\s*markets?|giant\s*eagle|bi[- ]?lo|bi\s*lo)\b/i,
  },
  {
    categoryName: 'Groceries', categoryGroup: 'needs', confidence: 'low',
    pattern: /\b(grocery|groceries|supermarket|food\s*mart|fresh\s*market|super\s*center\s*food|produce\s*market|ethnic\s*market|asian\s*market|latin\s*market|international\s*food)\b/i,
  },

  // ─── DINING OUT ─────────────────────────────────────────────────────────────
  {
    categoryName: 'Dining Out', categoryGroup: 'wants', confidence: 'high',
    pattern: /\b(mcdonald'?s|mcdonalds|starbucks|subway\s*(sandwich|rest)?|chipotle|taco\s*bell|chick[- ]?fil[- ]?a|burger\s*king|wendy'?s|domino'?s|pizza\s*hut|papa\s*john'?s|papa\s*murphy'?s|kfc|popeye?s|dunkin'?|dunkin\s*donuts?|panera\s*bread?|jersey\s*mike'?s|jimmy\s*john'?s|five\s*guys|shake\s*shack|in[- ]?n[- ]?out|whataburger|sonic\s*(drive[- ]?in)?|arby'?s|arbys|jack\s*in\s*the\s*box|culver'?s|raising\s*cane'?s|wingstop|zaxby'?s|panda\s*express|qdoba|del\s*taco|carl'?s\s*jr|hardee'?s|tim\s*horton'?s|dairy\s*queen|baskin[- ]?robbins|jamba\s*juice?|crumbl\s*cookies?|moe'?s\s*(south)?|waffle\s*house|ihop|denny'?s|cracker\s*barrel|olive\s*garden|red\s*lobster|applebee'?s|chili'?s\s*(grill)?|outback\s*steakhouse?|longhorn\s*steakhouse?|texas\s*roadhouse|buffalo\s*wild\s*wings|bww|noodles\s*&?\s*co|first\s*watch|perkins\s*(rest)?|bob\s*evans|golden\s*corral|ruby\s*tuesday|red\s*robin|smokey\s*bones|hooters|twin\s*peaks\s*rest|yard\s*house|cheesecake\s*factory|bonefish\s*grill|carrabbas|maggiano'?s|p\.?f\.?\s*chang'?s|benihana|steak\s*n?\s*shake|freddy'?s\s*(frozen)?|cold\s*stone|rita'?s\s*italian|orange\s*julius|auntie\s*anne'?s|cinnabon|wetzel'?s|great\s*american\s*cookie|nothing\s*bundt|insomnia\s*cookie|krispy\s*kreme|einstein\s*bros?|panera|sweetgreen|cosi\s*restaurant|jason'?s\s*deli|mcalister'?s|firehouse\s*subs?|potbelly|schlotzsky'?s|Which\s*Wich|tropical\s*smoothie|bahama\s*breeze|seasons\s*52|eddie\s*v'?s|wildfish|north\s*italia|flower\s*child|true\s*food|bartaco|torchy'?s\s*taco|velvet\s*taco|fuzzy'?s\s*taco|tijuana\s*flats|moe'?s\s*southwest|bad\s*daddy'?s|smashburger|fatburger|the\s*habit|el\s*pollo\s*loco|del\s*taco|rally'?s|checkers\s*burgers?|cook\s*out\s*(restaur)?|biscuitville|bojangles?|church'?s\s*chicken|slim\s*chickens?|dave'?s\s*hot|hot\s*chicken|freebirds|cafe\s*rio|costa\s*vida|zoes?\s*kitchen|newk'?s|corner\s*bakery|la\s*madeleine|bruegger'?s|caribou\s*coffee|peet'?s\s*coffee|dutch\s*bros?|coffee\s*bean|biggby|scooter'?s\s*coffee|7\s*brew|philz|blue\s*bottle|intelligentsia)\b/i,
  },
  {
    categoryName: 'Dining Out', categoryGroup: 'wants', confidence: 'low',
    pattern: /\b(restaurant|cafe\b|coffee\s*shop|bistro|grill\b|diner|eatery|bakery|deli\b|pizzeria|sushi|ramen|taproom|brewery|bar\s*(&|and)\s*grill|gastropub|boba|bubble\s*tea|smoothie\s*bar|juice\s*bar|food\s*truck|takeout|take[- ]?out|doordash|grubhub|uber\s*eats|ubereats|seamless\s*order|postmates)\b/i,
  },

  // ─── TRANSPORTATION ──────────────────────────────────────────────────────────
  {
    categoryName: 'Transportation', categoryGroup: 'needs', confidence: 'high',
    pattern: /\b(uber(?!\s*eats|\s*eats)|lyft(?!\s*pink)|shell\s*(oil|gas|station)?|exxon(mobil)?|bp\s*(gas|station)?|chevron\s*(gas|station)?|marathon\s*(gas|petroleum)?|circle\s*k|speedway\s*(gas)?|wawa\s*(gas)?|quiktrip|casey'?s\s*(general)?|pilot\s*(flying\s*j)?|love'?s\s*travel|sunoco|valero|gulf\s*oil|texaco|76\s*gas|getgo|kwik\s*trip|kwiktrip|racetrac|thorntons?|holiday\s*station|maverik|sheetz|ricker'?s|murphy\s*(express|usa)|fastlane\s*gas|speedco|flying\s*j|ta\s*travel\s*center|petro\s*stop|amtrak|greyhound\s*bus|megabus|flixbus|peter\s*pan\s*bus|trailways)\b/i,
  },
  {
    categoryName: 'Transportation', categoryGroup: 'needs', confidence: 'low',
    pattern: /\b(gas\s*(station|pump)?|fuel\s*(up)?|gasoline|unleaded|parking\s*(lot|garage|meter|fee)?|toll\s*(road|bridge|plaza)?|transit|metro\s*(card|rail)?|mta\b|bart\b|cta\b|septa\b|mbta\b|wmata\b|commut(e|ing)|auto\s*repair|oil\s*change|jiffy\s*lube|midas\s*(auto)?|firestone\s*(auto)?|mavis\s*(tire)?|pep\s*boys|autozone|o'?reilly\s*auto|advance\s*auto|napa\s*auto|car\s*(wash|detail)|vehicle\s*reg|license\s*plate|rideshare|ride[- ]?share|taxi\b|cab\s*fare|towing)\b/i,
  },

  // ─── ENTERTAINMENT ───────────────────────────────────────────────────────────
  {
    categoryName: 'Entertainment', categoryGroup: 'wants', confidence: 'high',
    // One-time venue purchases and game storefronts only — recurring streaming/gaming
    // subscriptions are intentionally excluded so they fall through to Subscriptions.
    pattern: /\b(amc\s*(theatre|theaters?|stubs)|regal\s*(cinema|cinemas?|unlimited)?|cinemark|fandango(?!now)|ticketmaster|stubhub|live\s*nation|steam\s*(purchase|wallet|store)?|humble\s*bundle|epic\s*games\s*(store)?|gog\.com|itch\.io|vudu|fandangonow|google\s*play\s*(games?|store))\b/i,
  },
  {
    categoryName: 'Entertainment', categoryGroup: 'wants', confidence: 'low',
    pattern: /\b(cinema|theater|theatre|concert\s*(ticket)?|movie\s*(ticket|theatre)?|streaming\s*(service)?|game\s*pass|arcade|bowling\s*(alley)?|mini\s*golf|escape\s*room|laser\s*tag|trampoline\s*park|go\s*kart|batting\s*cage|paintball|museum\s*(ticket)?|zoo\s*(ticket)?|aquarium|amusement\s*park|theme\s*park|comedy\s*club|improv\b|magic\s*show)\b/i,
  },

  // ─── SHOPPING ────────────────────────────────────────────────────────────────
  {
    categoryName: 'Shopping', categoryGroup: 'wants', confidence: 'high',
    pattern: /\b(amazon(?!\s*prime\s*video|\s*web\s*services|\s*aws|\s*pay)[\s*]?(marketplace|order|purchase)?|target(?!\s*pharmacy|\s*optical)|best\s*buy|home\s*depot|lowe'?s\s*(home)?|ikea|wayfair|marshalls?|t\.?j\.?\s*maxx|tjmaxx|ross\s*dress|burlington\s*(coat)?|old\s*navy|gap\s*(store)?(?!\s*insurance)|h\s*&\s*m|h&m|zara|forever\s*21|shein|etsy|ebay|macy'?s|nordstrom(?!\s*rack)?|nordstrom\s*rack|bloomingdale'?s|kohl'?s|jcpenney|jcp\b|bath\s*&\s*body\s*works?|victoria'?s\s*secret|crate\s*(&|and)\s*barrel|williams[- ]?sonoma|pottery\s*barn|world\s*market|pier\s*1|michaels?\s*(store|craft)?|hobby\s*lobby|jo[- ]?ann\s*(fabric)?|ac\s*moore|dollar\s*tree|dollar\s*general|family\s*dollar|five\s*below|tuesday\s*morning|big\s*lots|overstock\.com|chewy\.com|petco|petsmart|ulta\s*(beauty)?|sephora|apple\s*store|microsoft\s*store|gamestop|hot\s*topic|torrid|lane\s*bryant|express\s*(clothing)?|banana\s*republic|j\.?\s*crew|ann\s*taylor|loft\s*(store)?|white\s*house\s*black|talbots?|chico'?s|anthropologie|urban\s*outfitters?|free\s*people|revolve|asos|uniqlo|patagonia|rei\s*(co[- ]?op)?|dick'?s\s*sporting|academy\s*sports?|bass\s*pro\s*shop|cabela'?s|scheels|sportsman'?s\s*warehouse)\b/i,
  },
  {
    categoryName: 'Shopping', categoryGroup: 'wants', confidence: 'low',
    pattern: /\b(retail\s*(store)?|merchandise|clothing\s*(store)?|apparel|fashion\s*(store)?|shoes?\s*(store)?|footwear|jewelry\s*(store)?|boutique|outlet\s*(mall|store)?|online\s*shop|e[- ]?commerce|marketplace\s*purchase)\b/i,
  },

  // ─── SUBSCRIPTIONS ───────────────────────────────────────────────────────────
  {
    categoryName: 'Subscriptions', categoryGroup: 'wants', confidence: 'high',
    pattern: /\b(netflix|spotify|disney\s*\+|disney\s*plus|hulu|hbo\s*max|max\s*(streaming|subscription|billing)?|amazon\s*prime\s*(video)?|prime\s*video|apple\s*tv\+?|peacock\s*(premium)?|paramount\s*\+|paramount\s*plus|showtime|starz|epix|crunchyroll|funimation|twitch\s*(sub|prime|subscription)?|xbox\s*(game\s*pass|live\s*gold)|playstation\s*plus|ps\s*plus|psn\s*(subscription|plus)|nintendo\s*(online|switch\s*online)|apple\s*(one|music|icloud\+?|fitness\+?|news\+?|arcade)|google\s*(one|workspace)|microsoft\s*(365|office\s*365)|adobe\s*(cc|creative\s*cloud|acrobat|photoshop|illustrator|premiere)|dropbox\s*(plus|professional|business)?|lastpass|1password|dashlane|nordvpn|expressvpn|surfshark|protonvpn|mullvad|cyberghost|private\s*internet\s*access|duolingo\s*plus?|headspace\s*plus?|calm\s*premium?|peloton\s*(app|digital)?|new\s*york\s*times|nytimes\s*digital|washington\s*post\s*digital|wall\s*street\s*journal|wsj\s*digital|the\s*atlantic\s*sub|medium\s*membership|patreon|substack|skillshare|masterclass|coursera\s*plus|linkedin\s*premium|tinder\s*(gold|platinum)?|bumble\s*(boost|premium)?|hinge\s*preferred?|match\s*premium|eharmony\s*premium|noom\s*sub|weight\s*watchers|ww\s*digital|myfitnesspal\s*premium|strava\s*summit?|garmin\s*connect\+?|zwift\s*sub|whoop\s*membership|grammarly\s*premium?|canva\s*pro?|figma\s*pro?|notion\s*plus?|todoist\s*pro?|evernote\s*premium?|fantastical\s*premium?|day\s*one\s*premium?|overcast\s*premium?|pocket\s*casts?|castro\s*podcast)\b/i,
  },
  {
    categoryName: 'Subscriptions', categoryGroup: 'wants', confidence: 'low',
    pattern: /\b(subscription|monthly\s*plan|annual\s*(plan|fee)|auto[- ]?renew|recurring\s*charge|membership\s*fee|premium\s*(plan|tier)|digital\s*access|online\s*membership)\b/i,
  },

  // ─── TRAVEL ──────────────────────────────────────────────────────────────────
  {
    categoryName: 'Travel', categoryGroup: 'wants', confidence: 'high',
    pattern: /\b(united\s*airlines?|delta\s*airlines?|american\s*airlines?|southwest\s*airlines?|jetblue\s*airways?|spirit\s*airlines?|frontier\s*airlines?|alaska\s*airlines?|sun\s*country|breeze\s*airways?|avelo\s*airlines?|air\s*canada|british\s*airways?|lufthansa|air\s*france|klm\s*airlines?|emirates\s*airlines?|qatar\s*airways?|singapore\s*airlines?|cathay\s*pacific|virgin\s*atlantic|airbnb|vrbo|hotels\.com|expedia|booking\.com|kayak|priceline|hopper\s*(app)?|google\s*flights|skyscanner|marriott\s*(hotel)?|hilton\s*(hotel)?|hyatt\s*(hotel)?|ihg\s*hotels?|wyndham\s*(hotel)?|best\s*western|hampton\s*inn|holiday\s*inn|la\s*quinta|motel\s*6|super\s*8|days\s*inn|radisson|sheraton|westin|w\s*hotel|kimpton|four\s*seasons|ritz[- ]?carlton|st\s*regis|enterprise\s*rent[- ]?a?[- ]?car|hertz\s*(car)?|avis\s*(car)?|national\s*(car\s*rental)?|budget\s*(car\s*rental)?|dollar\s*rent[- ]?a?[- ]?car|thrifty\s*(car)?|alamo\s*(rent[- ]?a?[- ]?car)?|turo\s*(car\s*share)?|zipcar|fox\s*rent\s*a\s*car|silvercar|carnival\s*cruise|royal\s*caribbean|norwegian\s*cruise|disney\s*cruise|celebrity\s*cruise|princess\s*cruises?|viking\s*cruises?)\b/i,
  },
  {
    categoryName: 'Travel', categoryGroup: 'wants', confidence: 'low',
    pattern: /\b(airline\s*(ticket|fare)?|flight\s*(ticket|booking)?|airport\s*(parking|shuttle|transfer)?|hotel\s*(room|booking|stay)?|motel\s*(room|stay)?|resort\s*fee|bed\s*(&|and)\s*breakfast|vacation\s*rental|rental\s*car\s*(fee)?|car\s*rental|cruise\s*(line|booking)?|all[- ]?inclusive\s*(resort)?|travel\s*(agency|booking)|excursion|tour\s*package|passport\s*fee|visa\s*fee)\b/i,
  },

  // ─── HEALTHCARE ──────────────────────────────────────────────────────────────
  {
    categoryName: 'Healthcare', categoryGroup: 'needs', confidence: 'high',
    pattern: /\b(cvs\s*(pharmacy|health|minute\s*clinic)?|walgreens|rite\s*aid|walmart\s*pharmacy|costco\s*pharmacy|kroger\s*pharmacy|target\s*pharmacy|publix\s*pharmacy|labcorp|lab\s*corp|quest\s*diagnostics?|concentra\s*urgent|carbon\s*health|citymd|optumrx|express\s*scripts|cigna\s*(pharmacy|health)?|aetna\s*(pharmacy|health)?|humana\s*(pharmacy|health)?|united\s*health|kaiser\s*perm|blue\s*cross|blue\s*shield|anthem\s*(blue)?|molina\s*health|oscar\s*health|teladoc|mdlive|hims\s*health|hers\s*health|roman\s*health|nurx|ro\s*health|noom\s*health|calibrate\s*health|found\s*health)\b/i,
  },
  {
    categoryName: 'Healthcare', categoryGroup: 'needs', confidence: 'low',
    pattern: /\b(pharmacy|pharmacist\b|doctor'?s?\s*(office|visit)?|physician|hospital\b|clinic\b|dental\s*(office|care)?|dentist\b|orthodont|oral\s*(surgeon|surgery)|vision\s*(center|care)?|optical\s*(store)?|optometrist|ophthalmolog|prescription|rx\b|therapy\s*(session)?|therapist\b|counseling|urgent\s*care|emergency\s*room|er\s*visit|radiology|pathology|chiropract|physical\s*therapy|dermatolog|pediatric|ob[- ]?gyn|specialist\s*visit|health\s*(system|center|clinic))\b/i,
  },

  // ─── UTILITIES ───────────────────────────────────────────────────────────────
  {
    categoryName: 'Utilities', categoryGroup: 'needs', confidence: 'high',
    pattern: /\b(at&t\s*(wireless|internet|bill)?|verizon\s*(wireless|fios|bill)?|t[- ]?mobile\s*(bill)?|metro\s*by\s*t[- ]?mobile|sprint\s*(bill)?|comcast\s*(xfinity)?|xfinity\s*(mobile|internet|tv)?|cox\s*(comm|cable|internet)|charter\s*comm|spectrum\s*(mobile|internet|tv)|centurylink|lumen\s*tech|frontier\s*(comm|fios)?|earthlink|directv|dish\s*network|duke\s*energy|pge\b|pg&e|con\s*ed(ison)?|dominion\s*energy|southern\s*company|entergy|firstenergy|exelon|evergy|ameren|dte\s*energy|consumers\s*energy|nstar|national\s*grid|eversource|avangrid|cleco|aps\s*(energy|elec)?|salt\s*river\s*project|pseg\s*(long\s*island)?|nv\s*energy|puget\s*sound\s*energy|portland\s*general|idaho\s*power|pacific\s*power|rocky\s*mountain\s*power|appalachian\s*power|ohio\s*edison|toledo\s*edison|illuminating\s*co|atlantic\s*city\s*electric|delmarva\s*power|pepco\b|bge\b|potomac\s*electric|we\s*energies|wi\s*electric|midwest\s*energy|empire\s*district|laclede\s*gas|nicor\s*gas|peoples\s*gas|piedmont\s*natural|southern\s*union)\b/i,
  },
  {
    categoryName: 'Utilities', categoryGroup: 'needs', confidence: 'low',
    pattern: /\b(electric\s*(bill|service|utility)?|electricity\s*(bill)?|gas\s*(bill|service|utility)(?!\s*station)|water\s*(bill|service|utility)|sewer\s*(bill|service)?|internet\s*(service|bill|provider)?|cable\s*(tv|bill|service)?|phone\s*(bill|service)?|wireless\s*(service|plan)?|utility\s*(bill|payment)|utilities\s*payment)\b/i,
  },

  // ─── HOUSING ─────────────────────────────────────────────────────────────────
  {
    categoryName: 'Housing', categoryGroup: 'needs', confidence: 'low',
    pattern: /\b(rent\s*(payment|check)?|mortgage\s*(payment)?|lease\s*(payment)?|hoa\s*fee|homeowners?\s*assoc|condo\s*(fee|assoc)?|property\s*management|landlord\s*payment|apartment\s*rent|housing\s*payment|monthly\s*rent)\b/i,
  },

  // ─── INSURANCE ───────────────────────────────────────────────────────────────
  {
    categoryName: 'Insurance', categoryGroup: 'needs', confidence: 'high',
    pattern: /\b(geico|state\s*farm|progressive\s*ins|allstate\s*(ins)?|liberty\s*mutual|nationwide\s*ins|usaa\s*ins|farmers\s*ins|travelers\s*ins|amica\s*(mutual)?|esurance|lemonade\s*ins|hippo\s*ins|metlife|new\s*york\s*life|john\s*hancock\s*ins|northwestern\s*mutual|aflac|guardian\s*life|principal\s*(life|ins)|securian|transamerica\s*ins|pacific\s*life|mass\s*mutual|primerica|foresters\s*fin|american\s*family\s*ins|erie\s*ins|auto[- ]?owners\s*ins|shelter\s*ins|country\s*fin|sentry\s*ins|westfield\s*ins)\b/i,
  },
  {
    categoryName: 'Insurance', categoryGroup: 'needs', confidence: 'low',
    pattern: /\b(insurance\s*(premium|payment|bill)?|auto\s*insurance|home\s*insurance|renter'?s\s*insurance|life\s*insurance|health\s*insurance|dental\s*insurance|vision\s*insurance|liability\s*ins|umbrella\s*policy|insurance\s*co\b)\b/i,
  },

  // ─── EDUCATION ───────────────────────────────────────────────────────────────
  {
    categoryName: 'Education', categoryGroup: 'needs', confidence: 'high',
    pattern: /\b(coursera|udemy|udacity|skillshare|masterclass|khan\s*academy|chegg|pearson\s*(ed)?|cengage|mcgraw[- ]?hill|edx|pluralsight|linkedin\s*learning|codecademy|treehouse|launchschool|flatiron\s*school|lambda\s*school|bloom\s*institute|general\s*assembly|thinkful|springboard\s*learn|datacamp|brilliant\s*(org)?|rosetta\s*stone|babbel|pimsleur)\b/i,
  },
  {
    categoryName: 'Education', categoryGroup: 'needs', confidence: 'low',
    pattern: /\b(tuition\s*(payment)?|college\s*(fee|tuition|bookstore)?|university\s*(fee|bookstore)?|school\s*(fee|supply|supplies)?|student\s*loan\s*(payment)?|textbook\s*(purchase)?|campus\s*(store|bookstore)?|academic\s*(fee|supply))\b/i,
  },

  // ─── FEES & BANK CHARGES ─────────────────────────────────────────────────────
  {
    categoryName: 'Fees', categoryGroup: 'needs', confidence: 'high',
    // Overdraft and courtesy pay are unambiguously fees
    pattern: /\b(overdraft(\s*(fee|charge|protection|item))?|courtesy\s*pay(ment)?|nsf(\s*fee)?|non[- ]?sufficient\s*funds?|returned\s*(item|check|payment)\s*(fee)?)\b/i,
  },
  {
    categoryName: 'Fees', categoryGroup: 'needs', confidence: 'low',
    // Bank/card fees: interest charges (expense side), service charges, ATM fees, etc.
    pattern: /\b(interest\s*(charge|fee)|finance\s*charge|annual\s*fee|late\s*(fee|charge|payment\s*fee)|atm\s*(fee|surcharge|charge)|foreign\s*(transaction|currency)\s*(fee|charge)|wire(\s*transfer)?\s*fee|service\s*(fee|charge)|monthly\s*(fee|service\s*fee)|account\s*(fee|maintenance\s*fee)|bank\s*(fee|charge)|transaction\s*fee|processing\s*fee|convenience\s*fee|origination\s*fee|penalty\s*(fee|charge)|returned\s*check\s*fee|stop\s*payment\s*fee|paper\s*statement\s*fee|inactivity\s*fee|minimum\s*balance\s*fee)\b/i,
  },

  // ─── DEBT PAYOFF ─────────────────────────────────────────────────────────────
  {
    categoryName: 'Debt Payoff', categoryGroup: 'needs', confidence: 'high',
    // PMT and PYMT are bank-specific abbreviations almost exclusively used for
    // loan and credit-card payments (e.g. "CAPITAL ONE PMT", "DISCOVER PYMT").
    pattern: /\b(pmt|pymt)\b/i,
  },
  {
    categoryName: 'Debt Payoff', categoryGroup: 'needs', confidence: 'low',
    pattern: /\b(loan\s*payment|student\s*loan\s*(pay|payment)|credit\s*card\s*(payment|pay)|card\s*payment\b|auto\s*loan\s*(pay|payment)|car\s*(loan\s*)?(pay|payment)|personal\s*loan\s*(pay|payment)|debt\s*payment|minimum\s*payment|balance\s*transfer|card\s*pmt|loan\s*pmt|auto\s*pmt|cc\s*pay(ment)?|visa\s*pay(ment)?|mastercard\s*pay(ment)?|discover\s*pay(ment)?|amex\s*pay(ment)?|\w+\s*card\s*(pmt|pymt|pay))\b/i,
  },

  // ─── SAVINGS ─────────────────────────────────────────────────────────────────
  {
    categoryName: 'Savings', categoryGroup: 'savings', confidence: 'low',
    pattern: /\b(savings?\s*transfer|transfer\s*to\s*savings|high\s*yield\s*savings|money\s*market\s*(account)?|savings?\s*deposit|emergency\s*fund\s*deposit)\b/i,
  },

  // ─── STOCKS / INVESTING ──────────────────────────────────────────────────────
  {
    categoryName: 'Stocks', categoryGroup: 'savings', confidence: 'high',
    pattern: /\b(robinhood|fidelity\s*(invest|brokerage)|schwab\s*(invest|brokerage)?|td\s*ameritrade|etrade|e\*trade|vanguard\s*(invest)?|betterment|wealthfront|sofi\s*invest|m1\s*finance|public\.com|stash\s*invest|acorns\s*(invest)?|coinbase|kraken\s*crypto|binance\s*us|gemini\s*crypto|crypto\.com|blockfi|voyager\s*digital)\b/i,
  },
  {
    categoryName: 'Stocks', categoryGroup: 'savings', confidence: 'low',
    pattern: /\b(stock\s*(purchase|buy|invest)|brokerage\s*(transfer|deposit)|investment\s*(deposit|contribution)|ira\s*contribution|roth\s*ira|traditional\s*ira|401k\s*contribution|403b\s*contribution|crypto\s*(buy|purchase)|etf\s*(purchase|buy))\b/i,
  },

  // ─── HOBBIES ─────────────────────────────────────────────────────────────────
  {
    categoryName: 'Hobbies', categoryGroup: 'wants', confidence: 'high',
    pattern: /\b(michaels?\s*(craft)?|hobby\s*lobby|jo[- ]?ann|joann\s*fabric|ac\s*moore|dick\s*blick|jerry'?s\s*artarama|utrecht\s*art|blick\s*art|guitar\s*center|musician'?s\s*friend|sweetwater\s*(sound)?|sam\s*ash|amazon\s*hobbies|games\s*workshop|warhammer|miniature\s*market|card\s*kingdom|tcgplayer|channel\s*fireball|star\s*city\s*games|coolstuff\s*inc|mtgo\s*treasure|steam\s*(craft|hobby)|rockler\s*woodwork|woodcraft|highland\s*woodwork|mcmaster[- ]?carr)\b/i,
  },
  {
    categoryName: 'Hobbies', categoryGroup: 'wants', confidence: 'low',
    pattern: /\b(hobby\s*(shop|store|supply)|craft\s*(store|supply|kit)|art\s*(supply|store)|musical\s*(instrument|supply)|sports?\s*(equipment|gear|supply)|outdoor\s*(gear|supply|equipment)|fishing\s*(gear|license|supply)|hunting\s*(gear|license|supply)|gardening\s*(supply|center)|plant\s*(nursery|store)|sewing\s*(supply|fabric)|knitting\s*(supply|yarn)|photography\s*(supply|equipment)|woodwork(ing)?\s*supply)\b/i,
  },

  // ─── INCOME: SALARY ──────────────────────────────────────────────────────────
  {
    categoryName: 'Salary', categoryGroup: 'income', confidence: 'high',
    pattern: /\b(payroll\s*(deposit)?|direct\s*deposit|salary\s*(payment)?|paycheck|adp\s*(payroll|direct)?|paychex|gusto\s*(pay|payroll)?|rippling\s*payroll|workday\s*(payroll)?|bamboohr|zenefits|justworks\s*payroll|employer\s*deposit)\b/i,
  },

  // ─── INCOME: INTEREST ────────────────────────────────────────────────────────
  {
    categoryName: 'Interest', categoryGroup: 'income', confidence: 'high',
    pattern: /\b(interest\s*(earned|income|payment|credit)|apy\s*earned|savings\s*interest|cd\s*(interest|maturity)|bond\s*interest|treasury\s*(interest|yield)|hysa\s*interest|money\s*market\s*interest)\b/i,
  },

  // ─── INCOME: DIVIDENDS ───────────────────────────────────────────────────────
  {
    categoryName: 'Dividends', categoryGroup: 'income', confidence: 'high',
    pattern: /\b(dividend\s*(income|payment|received)?|capital\s*(gain|gains)\s*(distribution)?|investment\s*(return|income|distribution)|reinvested\s*dividend|qualified\s*dividend)\b/i,
  },

  // ─── INCOME: FREELANCE / TRANSFERS ──────────────────────────────────────────
  {
    categoryName: 'Freelance', categoryGroup: 'income', confidence: 'low',
    pattern: /\b(paypal\s*(payment|transfer)?|venmo\s*(payment|transfer)?|zelle\s*(payment|transfer)?|cashapp|cash\s*app|square\s*(cash|payment)?|wise\s*(transfer|payment)?|stripe\s*(payout|payment)?|payoneer|revolut\s*transfer|invoice\s*paid|client\s*payment|freelance\s*payment|contract\s*payment|consulting\s*fee)\b/i,
  },

  // ─── INCOME: GIFTS ───────────────────────────────────────────────────────────
  {
    categoryName: 'Gifts', categoryGroup: 'income', confidence: 'low',
    pattern: /\b(gift\s*(payment|received|from)|birthday\s*(gift|money)|holiday\s*(gift|bonus)|cash\s*gift|monetary\s*gift)\b/i,
  },
]

/**
 * Infers a category from a transaction description.
 * Tests high-confidence rules first, then low-confidence keyword rules.
 * Returns null if no rule matches (confidence = 'none' at call site).
 */
export function inferCategory(description: string): CategoryInference | null {
  if (!description) return null
  const lower = description.toLowerCase()

  // High-confidence pass: exact merchant matches
  for (const rule of RULES) {
    if (rule.confidence === 'high' && rule.pattern.test(lower)) {
      return {
        categoryName: rule.categoryName,
        categoryGroup: rule.categoryGroup,
        confidence: 'high',
      }
    }
  }

  // Low-confidence pass: generic keyword matches
  for (const rule of RULES) {
    if (rule.confidence === 'low' && rule.pattern.test(lower)) {
      return {
        categoryName: rule.categoryName,
        categoryGroup: rule.categoryGroup,
        confidence: 'low',
      }
    }
  }

  return null
}
