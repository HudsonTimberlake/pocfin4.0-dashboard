// Copied from pocfin4.0-app/src/lib/helpContent.ts (2026-11-18), reworded for the web (click, not tap;
// the menu, not the More tab). Web-only entries and changes are in WEB at the bottom. Keep in step.

export type HelpEntry = {
  title: string;
  /** One or two sentences: what this page is for. */
  intro: string;
  sections?: { heading: string; body: string }[];
  /** A longer explainer page, shown as a row above How PocFin works. */
  more?: { title: string; subtitle: string; pathname: string };
};

export const HELP = {
  overview: {
    title: "Overview",
    intro:
      "Your budget at a glance for the current month: what is left to spend, what needs attention, and what you have saved.",
    sections: [
      {
        heading: "Left to spend",
        body: "The total still sitting in your envelopes. Spending lowers it, and sharing income into envelopes raises it. The gauge shows how much of it is left.",
      },
      {
        heading: "Ready to allocate",
        body: "Income you have added but not yet shared into envelopes. Click Allocate to share it out. Money only reaches an envelope once you allocate it.",
      },
      {
        heading: "Overspent envelopes",
        body: "An envelope below zero is shown in red. Click Cover it to move money in from another envelope. The X hides the reminder here, and it comes back if the envelope gets worse. It stays red on the Budget page either way.",
      },
      {
        heading: "Left in your top categories",
        body: "The envelopes you have spent the most from this month, with what is still left in each.",
      },
      {
        heading: "All your money",
        body: "Left to spend and Ready to allocate, plus your savings, holding and investment accounts. Together they make the total at the top of that card. Each amount is counted once, so moving money between envelopes and accounts never changes it. Spending from an account lowers it. Investments count what they are worth today, not what you put in.",
      },
      {
        heading: "Private accounts",
        body: "A private account only counts in the total of the person who made it. Other people in the budget do not see it, and yours is not in theirs.",
      },
    ],
  },
  "budget-envelopes": {
    title: "Envelopes",
    intro:
      "An envelope is a pot of money set aside for one thing, like Groceries or Rent. Each one shows what is left in it.",
    sections: [
      {
        heading: "Adding money",
        body: "Income lands in Ready to allocate first. Click Allocate to share it into your envelopes, one by one or all at once with Fill my envelopes.",
      },
      {
        heading: "The bar",
        body: "Each envelope's bar shows how much of what you put in is still there. Red means it has gone below zero.",
      },
      {
        heading: "Reorder",
        body: "Drag an envelope by its handle. To sort or change every monthly amount at once, click the pencil at the top, beside the plus. Fill my envelopes goes from the top down and stops when the income runs out, so put the most important ones first.",
      },
      {
        heading: "Open an envelope",
        body: "Click one to spend from it, log a refund, move money, allocate to it or edit it. The plus button makes a new envelope.",
      },
      {
        heading: "Archived",
        body: "Archiving hides an envelope you no longer use. Its history stays, and you can restore it.",
      },
    ],
  },
  "budget-history": {
    title: "History",
    intro:
      "Everything you have recorded, in three lists: Spent, Income and Moved.",
    sections: [
      {
        heading: "Spent",
        body: "What you spent, newest first. A refund shows here as money back, in green with a plus sign, because it lowers what you spent.",
      },
      {
        heading: "Income",
        body: "Money you added as income. Moving money between envelopes is not income, and neither is a refund.",
      },
      {
        heading: "Moved",
        body: "Money moved between envelopes and accounts. It is not spending and not income.",
      },
      {
        heading: "Filters",
        body: "Narrow the list to one envelope or a date range.",
      },
    ],
  },
  "budget-analytics": {
    title: "Analytics",
    intro:
      "How your month is going, how your months compare, and suggestions to make your plan match real life.",
    sections: [
      {
        heading: "Pick a month",
        body: "Use the arrows to look at an earlier month. A month runs from your start day (set in Budget settings) to the day before the next one.",
      },
      {
        heading: "Income minus spending",
        body: "The income you added in the month, minus what you spent after refunds, and what that is as a share of your income. While the month is running, a pace line shows how much would be left from your income if you keep spending like this.",
      },
      {
        heading: "Against your plan",
        body: "Each envelope's spending this month next to its monthly amount (the amount you set when you made the envelope).\n\nExample: Groceries is planned at R4 000 and you've spent R1 800, so the bar is just under half full. If the dark line is only a third of the way across, you're spending faster than the month: at this speed you'd pass R4 000 before the month ends. Once spending goes past R4 000 the bar turns amber and says \"over plan\".\n\n\"Left in envelope\" is a different number. It's the money actually in the envelope right now (what you've put in, including anything carried over, minus what you've spent), the same figure as on the Budget page. It can be more or less than \"planned minus spent\", for example when last month's leftovers carried over. Money you move to savings isn't spending.\n\nSaving up in an everyday envelope? Say Petrol is planned at R200 a month and you saved it for four months, then spent R800 in one month. The row shows R800 spent of R200 and \"R600 over plan, covered by savings\" in a calm blue, because the envelope still held money at the end of the month. If the envelope had gone below zero it would say \"R600 over plan\" in amber instead. \"Left in envelope\" shows what's left of the money you saved.",
      },
      {
        heading: "Where it went",
        body: "A chart of where your spending went: the five biggest envelopes or accounts, and everything else together. The coloured dot on each row matches its slice. \"Usual\" is the average of your last three finished months.",
      },
      {
        heading: "Trends and Insights",
        body: "Premium. Trends compare up to six months and show when your money tends to go. Insights start after three months and suggest changes, each opening a screen filled in for you to check before saving. \"Not now\" hides a suggestion for the rest of the month.",
      },
    ],
  },
  accounts: {
    title: "Accounts",
    intro:
      "Accounts track money you have put aside or invested, apart from your everyday budget. There is no bank connection: you record what goes in and out.",
    sections: [
      {
        heading: "Savings",
        body: "Money you are building up, such as an emergency fund.",
      },
      {
        heading: "Holding",
        body: "Money you are keeping for something soon, such as tax or a bill.",
      },
      {
        heading: "Investments",
        body: "Money you have invested. The amount shown is what it is worth now.",
      },
      {
        heading: "Private accounts",
        body: "A lock means only you can see the account. Other people in the budget only see the envelope side of money moved to or from it.",
      },
    ],
  },
  account: {
    title: "This account",
    intro:
      "The balance and everything that has gone in or out of this account.",
    sections: [
      {
        heading: "Add money",
        body: "Money from outside your budget, like interest or a gift. It is not income, so it does not need allocating.",
      },
      {
        heading: "Spend",
        body: "Pay for something straight from this account.",
      },
      {
        heading: "Transfer",
        body: "Move money from this account into an envelope or another account. It is not spending.",
      },
      {
        heading: "Edit",
        body: "Rename the account, change who sees it, or delete it. Anything still in it is taken out as a final withdrawal first.",
      },
    ],
  },
  investmentAccount: {
    title: "This investment",
    intro:
      "What this investment account is worth, what you put in, and the holdings inside it. Each figure comes from the last value you entered.",
    sections: [
      {
        heading: "Value",
        body: "What the holdings are worth, from the latest value you entered for each one. The date under it shows when that was. If holdings were valued on different days, it shows the oldest and newest.",
      },
      {
        heading: "Put in",
        body: "The money that has gone in, minus what has come out. Growth is not counted here.",
      },
      {
        heading: "Gain or loss",
        body: "Value minus put in. It changes when you update a value, not when you add or take out money.",
      },
      {
        heading: "Holdings",
        body: "A holding is one thing you have invested in, like an ETF or a unit trust. Each one can be split by what it is for, like a house deposit or retirement.",
      },
      {
        heading: "Add money",
        body: "Money from outside your budget, like a top-up from your bank. To invest income, allocate it from the income instead.",
      },
      {
        heading: "Withdraw",
        body: "Money taken out that leaves PocFin, like a payout to your bank.",
      },
      {
        heading: "Transfer",
        body: "Move money from a holding into an envelope or another account. It stays in PocFin.",
      },
      {
        heading: "Update value",
        body: "Enter what a holding is worth now, with no money moving.",
      },
      {
        heading: "Keep values current",
        body: "Before money goes in or out of a holding, PocFin asks what it is worth right then, so the returns stay accurate and each purpose keeps its own growth. The last value is filled in for you, and if it is from before today you confirm it with one click.",
      },
      {
        heading: "Copy your investment platform",
        body: "Make a holding for each fund or share, named as your platform shows it. Click Add money, choose the holding and a purpose, and enter the purchase value from your platform, like R10,000. Then click Update value and enter its current value, like R12,000. PocFin then shows the same gain as your platform: R2,000, or 20%. From then on, record each new payment with Add money and update the value whenever you check your platform.",
      },
      {
        heading: "Splitting it by purpose",
        body: "To split one holding, add money in more than one go and pick a different purpose each time, like R6,000 for a house deposit and R4,000 for retirement. Or add it all to one purpose and move part of it later. When the value changes, every purpose grows or shrinks together.",
      },
      {
        heading: "After taking money out",
        body: "Put in is the money that went in, minus what came out. Your platform may lower its purchase value differently when you sell, so after a withdrawal the two gains can differ. The value always matches.",
      },
      {
        heading: "Edit",
        body: "Rename the account or change who sees it, or delete it. Each holding's value is taken out as a final withdrawal, then the holdings and their value history go too.",
      },
    ],
  },
  "investment-details": {
    title: "Investment details",
    intro:
      "Money in or out of an investment goes into one holding, for one purpose.",
    sections: [
      {
        heading: "Holding",
        body: "The fund, share or unit trust the money goes into or comes out of. If there are none yet, add one first.",
      },
      {
        heading: "Pick a purpose",
        body: "What the money is for, like a house deposit or retirement. Money coming out can only come from a purpose that has money in this holding. Click New to make a purpose.",
      },
      {
        heading: "Split",
        body: "Putting money in, click Split to share one payment between purposes, like R600 for retirement and R400 for an emergency fund. Click each purpose and enter its part; the next one you click is filled with what is left. It saves as one payment with one value for the holding.",
      },
      {
        heading: "Worth now",
        body: "What the whole holding is worth just before this money moves. It is filled in with its last value. If that value is from before today, click Still to keep it or It's changed to enter what your provider shows now. An old value gives growth to the wrong purpose.",
      },
      {
        heading: "Taking money out",
        body: "Money taken out leaves PocFin, like a payout to your bank. To move it into an envelope or another account instead, use Transfer.",
      },
      {
        heading: "Changing it later",
        body: "Only the note can be changed afterwards. The latest money movement in a holding can be deleted.",
      },
    ],
  },
  holding: {
    title: "This holding",
    intro:
      "One thing you have invested in: what it is worth, what you put in, how it has done, and what it is for.",
    sections: [
      {
        heading: "Value",
        body: "What the whole holding is worth, from the last value you entered. Update it whenever you check your provider.",
      },
      {
        heading: "Time-weighted return",
        body: "How the value moved over the period you pick, leaving out the money you put in or took out, so the timing of your payments does not change it. It is the same for every purpose in this holding.",
      },
      {
        heading: "Simple return",
        body: "Your gain as a share of what you put in, since the start. It differs per purpose because each one was paid into at different times.",
      },
      {
        heading: "Purposes",
        body: "Each purpose's share of the holding. When the value changes, every purpose moves together. Click Move to give part of it to a different purpose.",
      },
      {
        heading: "Add money and Withdraw",
        body: "Put money into this holding, or take it out of PocFin. You choose what it is for each time.",
      },
      {
        heading: "History",
        body: "Every value saved for this holding. The latest one can be deleted if it was saved on its own.",
      },
      {
        heading: "Recent",
        body: "Money that went in or out of this holding. Click one to change its note. Only the latest movement in the holding can be deleted, and its value goes with it. Money allocated from income can't be taken back.",
      },
      {
        heading: "Edit",
        body: "Rename the holding, or delete it. Its value is taken out as a final withdrawal first.",
      },
    ],
    more: {
      title: "Your two returns",
      subtitle: "Time-weighted and simple return, with an example",
      pathname: "/returns-explained",
    },
  },
  "holding-form": {
    title: "Holding",
    intro:
      "A holding is one fund, share or unit trust inside this investment account.",
    sections: [
      {
        heading: "Name",
        body: "Use the name your provider shows, like S&P 500 ETF, so it is easy to match when you update its value.",
      },
      {
        heading: "Purposes",
        body: "You choose a purpose, like a house deposit or retirement, each time you put money in. One holding can serve several purposes.",
      },
      {
        heading: "Delete",
        body: "Deleting a holding takes its value out as a final withdrawal, at its latest value, then deletes it and its value history. Your envelopes and Ready to allocate stay as they were.",
      },
    ],
  },
  "update-rate": {
    title: "Update the rate",
    intro:
      "An account in another currency keeps one rate: what one unit of its currency is worth in your budget's. Every holding in it follows.",
    sections: [
      {
        heading: "What changes",
        body: "Each holding is worth the same in its own currency, so its value in your budget's currency moves with the rate. No money moves.",
      },
      {
        heading: "Growth and loss",
        body: "The change counts as growth or loss in your budget's currency, because that is what your money is worth to you.",
      },
    ],
  },
  "update-value": {
    title: "Update value",
    intro:
      "Enter what the whole holding is worth on the day, as your provider shows it. No money moves.",
    sections: [
      {
        heading: "Why it matters",
        body: "Returns are worked out from these values. The more often you update it, the more accurate they are.",
      },
      {
        heading: "Filled in for you",
        body: "The box starts with the value it has now. Change it to the new figure.",
      },
      {
        heading: "Date",
        body: "Usually today. It can’t be earlier than the last value or money movement in this holding.",
      },
    ],
  },
  notes: {
    title: "Notes",
    intro:
      "Write down what you need to do, or why a month looked the way it did. Newest first.",
    sections: [
      {
        heading: "Private or shared",
        body: "A note is private to you unless you share it with this budget. Shared notes show the author's name to every member, and only the author can change them.",
      },
      {
        heading: "This month",
        body: "Tag a note with the running month and it shows up in that month's recap.",
      },
      {
        heading: "Reminders",
        body: "Add a reminder and your phone will remind you at that time. It shows the first line of the note, so keep it free of anything private you would not want on a lock screen.",
      },
    ],
  },
  automatic: {
    title: "Automatic",
    intro: "Set up rent, a subscription or a regular move once, and PocFin records it on the day.",
    sections: [
      {
        heading: "Go off by itself",
        body: "It is recorded only if the envelope or account holds the whole amount. If it is short, we try again each morning for three more days, then skip that time. We tell you each way.",
      },
      {
        heading: "Ask me first",
        body: "On the day we send a reminder. You approve it, change the amount for this time only, or skip it. Anyone in the budget can approve.",
      },
      {
        heading: "What it can’t do yet",
        body: "Income can’t be automatic, and investment accounts can’t be used yet.",
      },
    ],
  },
  "note-form": {
    title: "Note",
    intro: "The first line is the note's title.",
    sections: [
      {
        heading: "Remind me",
        body: "Your phone reminds you once, at the date and time you pick. Other members never get your reminders.",
      },
    ],
  },
  purposes: {
    title: "Purposes",
    intro:
      "A purpose is what you are investing for, like a house deposit or retirement. One list is shared by every investment in this budget.",
    sections: [
      {
        heading: "Totals",
        body: "Each purpose adds up every holding it is used in: what you put in, what it is worth now, and the gain or loss.",
      },
      {
        heading: "Growth",
        body: "Each purpose keeps the growth it has earned. Money added later joins at the holding's value that day, then every purpose grows by the same percentage.",
      },
      {
        heading: "New",
        body: "Add a purpose here, or make one when you put money into a holding.",
      },
      {
        heading: "Private accounts",
        body: "Money in someone else's private account is not counted in your totals.",
      },
    ],
    more: {
      title: "How purposes share growth",
      subtitle: "A worked example with two purposes",
      pathname: "/purpose-growth",
    },
  },
  purpose: {
    title: "This purpose",
    intro:
      "What this purpose is worth across every holding, and where it is invested.",
    sections: [
      {
        heading: "Return",
        body: "The gain as a share of what you put in, since the start. For returns over a period, open a holding.",
      },
      {
        heading: "Where it is invested",
        body: "Each holding with money for this purpose. Click one to open it.",
      },
      {
        heading: "Rename or delete",
        body: "A purpose can be deleted once nothing is in it. Move its value to another purpose first, from the holding.",
      },
    ],
  },
  "purpose-form": {
    title: "Purpose",
    intro:
      "Name what you are investing for. Every investment in this budget can use it.",
    sections: [
      {
        heading: "Delete",
        body: "Only a purpose with nothing in it can be deleted. Move its value to another purpose in each holding first.",
      },
    ],
  },
  "move-purpose": {
    title: "Move between purposes",
    intro:
      "Give part of a holding to a different purpose, like moving R5,000 from a house deposit to retirement.",
    sections: [
      {
        heading: "Nothing is sold",
        body: "The money stays in the same holding. Only what it is for changes, so your returns stay the same.",
      },
      {
        heading: "Worth now",
        body: "What the whole holding is worth just before the move. It is filled in with its last value. If that value is from before today, click Still to keep it or It's changed to enter what your provider shows now.",
      },
      {
        heading: "New purpose",
        body: "Click New under To to make a purpose on the spot.",
      },
      {
        heading: "Undo",
        body: "A move saves a value of the holding. While it is the latest one, delete it in History to undo the move.",
      },
    ],
  },
  "value-history": {
    title: "Value history",
    intro: "Every value saved for this holding, newest first.",
    sections: [
      {
        heading: "Where they come from",
        body: "A value is saved when you update it, when you move between purposes, and each time money goes in or out. A value saved with money is what the holding was worth just before the money moved.",
      },
      {
        heading: "Deleting",
        body: "Only the latest value can be deleted, and only if no money moved with it. Deleting a value from a move between purposes undoes the move. To undo a value saved with money, delete that money movement instead.",
      },
    ],
  },
  profile: {
    title: "More",
    intro:
      "You, planning ahead, your budget and how the app behaves on this phone.",
    sections: [
      {
        heading: "Calculators",
        body: "Work out retirement, saving towards something and your home loan. Saved ones are shared with everyone in this budget.",
      },
      {
        heading: "This budget",
        body: "Rename it, change the day your month starts, and see who is in it.",
      },
      {
        heading: "App lock",
        body: "Ask for a PIN or biometrics (Face ID, or fingerprint or face on Android) when you open PocFin. It is kept on this phone only.",
      },
      {
        heading: "Help buttons",
        body: "Turn the little question marks on or off.",
      },
      {
        heading: "Haptics",
        body: "The small vibrations when you tap, save or reach a milestone. On by default and kept on this phone only. Feel nothing? On iPhone, turn on Settings, Sounds & Haptics, System Haptics.",
      },
      {
        heading: "Privacy screen",
        body: "Covers PocFin with a plain screen in the app switcher, so your figures are not visible there. On by default and kept on this phone only. On Android it also stops screenshots while it is on.",
      },
      {
        heading: "Join a budget",
        body: "Use the code from an invite email to join someone else's budget.",
      },
    ],
  },
  envelope: {
    title: "This envelope",
    intro:
      "What is in this envelope, what went in and out this month, and what you can do with it.",
    sections: [
      {
        heading: "Spend",
        body: "Record something you paid for out of this envelope.",
      },
      {
        heading: "Refund",
        body: "Money came back for something you bought. It goes into this envelope and lowers what you spent. It is not income.",
      },
      {
        heading: "Move",
        body: "Move money between this envelope and another envelope or an account.",
      },
      {
        heading: "Allocate",
        body: "Share income that is Ready to allocate into this envelope. Allocations cannot be lowered afterwards, so check the amount first.",
      },
      {
        heading: "Cover it",
        body: "Shown when the envelope is below zero. It moves money in from another envelope.",
      },
      {
        heading: "Deleting",
        body: "An envelope can be deleted when it holds nothing. Otherwise move the money out first, or archive it.",
      },
    ],
  },
  "add-menu": {
    title: "What are you adding?",
    intro: "Pick what happened. Each choice opens a short form for it.",
    sections: [
      {
        heading: "Spent money",
        body: "Something you paid for. It comes out of an envelope or an account.",
      },
      {
        heading: "Got paid",
        body: "Income. It goes to Ready to allocate, and you share it into envelopes next.",
      },
      {
        heading: "Got a refund",
        body: "Money back into one envelope. It lowers what you spent and is not income.",
      },
      {
        heading: "Moved money",
        body: "Between envelopes, or to and from an account. It is not spending and not income.",
      },
    ],
  },
  "add-expense": {
    title: "Spent money",
    intro:
      "Record something you paid for. Type the amount, pick where it came from, add a note if you like.",
    sections: [
      {
        heading: "Where it came from",
        body: "Choose an envelope, or An account for money you spend straight from an account.",
      },
      {
        heading: "Below zero",
        body: "You can spend more than an envelope holds. It turns red and you can cover it later.",
      },
    ],
  },
  "add-income": {
    title: "Got paid",
    intro: "Record money coming in, like a salary.",
    sections: [
      {
        heading: "Ready to allocate",
        body: "Income is not in any envelope yet. After you save, you can fill your envelopes straight away, or allocate it later.",
      },
      {
        heading: "Refunds",
        body: "If you were refunded for something, use Got a refund instead, so it does not count as income.",
      },
    ],
  },
  "add-refund": {
    title: "Got a refund",
    intro:
      "Money came back for something you bought. Pick the envelope it belongs to.",
    sections: [
      {
        heading: "What it does",
        body: "It adds the money back to that envelope and lowers what you spent. It does not count as income, so there is nothing to allocate.",
      },
    ],
  },
  "add-transfer": {
    title: "Moved money",
    intro:
      "Move money from one place to another, such as from Groceries to Fun, or from an envelope into savings.",
    sections: [
      {
        heading: "Not spending",
        body: "A move is not an expense and not income. The total you have stays the same.",
      },
      {
        heading: "Swap",
        body: "The arrows between From and To swap the two sides.",
      },
    ],
  },
  "add-money": {
    title: "Add money",
    intro:
      "Put money into an account that did not come through your budget, like interest or a gift.",
    sections: [
      {
        heading: "Not income",
        body: "It does not count as budget income and does not go to Ready to allocate.",
      },
    ],
  },
  allocate: {
    title: "Allocate",
    intro:
      "Share one income into your envelopes. Nothing is sent until you press the Allocate button at the bottom.",
    sections: [
      {
        heading: "Fill my envelopes",
        body: "Goes down your envelopes from the top and adds what each one needs, until the income runs out. The order is the one on the Budget page.",
      },
      {
        heading: "The plus buttons",
        body: "Add an amount to one envelope. Everything you pick is shown first, and each row has Undo.",
      },
      {
        heading: "Fill mode",
        body: "Add monthly amount adds each envelope's monthly amount. Top up only adds what is missing.",
      },
      {
        heading: "After you send",
        body: "Allocations cannot be lowered or undone, so check the total on the button first.",
      },
    ],
  },
  recaps: {
    title: "Past recaps",
    intro:
      "A short look back at each finished month: how your envelopes did, what you kept, and your wins. Each one opens once on its own when its month ends, and stays here to revisit.",
    sections: [
      {
        heading: "Your first recap",
        body: "It comes after your first full month. If you joined more than halfway through a month, that one is skipped.",
      },
      {
        heading: "In a shared budget",
        body: "Private accounts count only in their owner's recap, so two people can see different figures.",
      },
    ],
  },
  streak: {
    title: "Your streak",
    intro:
      "Your streak counts the weeks in a row that your budget was looked after. It belongs to the budget, so everyone in it keeps it going together.",
    sections: [
      {
        heading: "What counts",
        body: "A week, Monday to Sunday, counts when anyone in the budget adds spending or income, moves money or allocates. Opening the app on its own doesn’t count.",
      },
      {
        heading: "Rest weeks",
        body: "Miss a week and a rest week keeps your streak safe, once a month. A rest week doesn’t add to the count. Miss a second week in the same month and a new streak starts. Your best stays.",
      },
      {
        heading: "Milestones",
        body: "4, 12, 26 and 52 weeks, then every 26 weeks after that.",
      },
    ],
  },
  "budget-switcher": {
    title: "Your budgets",
    intro:
      "Each budget has its own envelopes, accounts and people. Pick the one to look at.",
    sections: [
      {
        heading: "Joining or creating",
        body: "Joining or creating a budget doesn’t change the others.",
      },
    ],
  },
  allocation: {
    title: "Allocation",
    intro:
      "This is money you shared out from an income. It can’t be edited or deleted, so your Ready to allocate figure stays right.",
    sections: [
      {
        heading: "Moving it",
        body: "To put this money somewhere else, transfer it from the envelope or account.",
      },
    ],
  },
  "edit-transaction": {
    title: "Edit",
    intro:
      "Change the amount, date or note, or delete it. Your balances update straight away.",
    sections: [
      {
        heading: "Wrong envelope or type?",
        body: "Those can’t be changed. Delete it and add it again.",
      },
      {
        heading: "Refunds",
        body: "A refund puts money back into the envelope. It is not income and does not go to Ready to allocate.",
      },
      {
        heading: "Investments",
        body: "Money in an investment can only have its note changed, and only the latest movement can be deleted.",
      },
    ],
  },
  "choose-deposit": {
    title: "Choose income",
    intro:
      "You have more than one income with money still to share. Pick the one to allocate from.",
  },
  "allocate-amount": {
    title: "Allocate an amount",
    intro:
      "Pick an envelope or account and an amount to take from this income. It is added to your list, and sent when you press Allocate.",
  },
  "edit-envelopes": {
    title: "Edit envelopes",
    intro:
      "Change the order, names and every monthly amount in one place, then save once.",
    sections: [
      {
        heading: "Monthly amounts",
        body: "Type a new monthly amount beside any envelope. It sets how much Fill my envelopes adds. It is not a limit and your balance never resets.",
      },
      {
        heading: "Order",
        body: "Drag the handle on the left. Fill my envelopes goes from the top down and stops when the income runs out. A to Z, Lowest first and Highest first sort quickly, then you can drag to fine-tune.",
      },
      {
        heading: "Saving",
        body: "Nothing changes until you click Save changes. Archiving, icons and deleting are done from each envelope.",
      },
      {
        heading: "Add an envelope",
        body: "Click Add envelope, type a name and an amount. It is created when you click Save changes.",
      },
      {
        heading: "Monthly income",
        body: "Optional. Type what you get paid and the total at the top shows how much is left to budget. It is only a guide. It isn’t booked anywhere.",
      },
      {
        heading: "Plans",
        body: "Save as plan keeps the current amounts under a name, like Tight month. Load fills the page with a plan’s amounts, and you still click Save changes to keep them. Plans are shared with everyone in the budget.",
      },
    ],
  },
  "envelope-form": {
    title: "Envelope",
    intro: "Give the envelope a name and, if you like, a monthly amount.",
    sections: [
      {
        heading: "Monthly amount",
        body: "What you plan to put in each month. It sets how much Fill my envelopes adds. It is not a limit and your balance never resets.",
      },
      {
        heading: "Archive or delete",
        body: "Archive hides an envelope you are done with. Delete only works when it holds nothing.",
      },
    ],
  },
  goal: {
    title: "This goal",
    intro:
      "How your goal is going. Each month gets one check: did this month's amount go in? Goals are in beta, so how they work may change, and goals made now could be lost.",
    sections: [
      {
        heading: "What counts",
        body: "Money you put in, minus money you take out, during the month. Allocations, transfers in and money you add all count. Market ups and downs never make you miss a month.",
      },
      {
        heading: "The dots",
        body: "A tick is a month on track, a star is one with extra, and a pause is a rest: a quieter month, never a fail. The ring is the month you're in now.",
      },
      {
        heading: "The pace",
        body: "For a goal with a date, the amount each month is what's left divided by the months left. Put in more and the next months need less. Put in less and it spreads over the rest.",
      },
      {
        heading: "A quick check",
        body: "When you're about two months' worth behind (one, near the end), we ask once a month whether to keep the date or move it. Decide later changes nothing and asks again next month.",
      },
      {
        heading: "Finish goal",
        body: "Moves the goal to Past goals, as reached if it got there and as finished if you stopped early. Nothing moves: the money stays in the account until you spend or move it. A past goal can be deleted for good from its page.",
      },
      {
        heading: "Grow to a value",
        body: "For long-term investing, where growth counts. The goal is the number you’re chasing, in the rands of the day you reach it, with what it’s worth in today’s money beside it. We track three things: your part (did this month's amount go in), the plan (what it's worth against your plan line and its normal ups and downs) and growth so far beside your guess, which is just for knowing.",
      },
      {
        heading: "The yearly review",
        body: "Once a year, on the goal's start month, we look back together. Inside the normal ups and downs the plan holds. If it's under them, we work out a new amount from what it's worth now. Your growth guess is always your call.",
      },
      {
        heading: "Not advice",
        body: "These are estimates, not promises. Markets go up and down, and real results will differ. PocFin doesn't give financial advice. If you're ever unsure, talk to a qualified financial adviser.",
      },
    ],
  },
  "goal-new": {
    title: "New goal",
    intro:
      "A goal follows one account, or one purpose in your investments, so progress is never typed in twice. Goals are in beta: how they work may change, and goals made now could be lost.",
    sections: [
      {
        heading: "Reach an amount by a date",
        body: "We work out what to put away each month. What's already in the account counts.",
      },
      {
        heading: "The same each month",
        body: "A habit with no end date. Each month is checked on its own.",
      },
      {
        heading: "A yearly amount",
        body: "Pay in when it suits you; the year is judged as a whole, so no month is ever missed.",
      },
      {
        heading: "One goal each",
        body: "Each account or purpose can have one goal at a time. Finish or delete it to start another.",
      },
    ],
  },
  "goal-edit": {
    title: "Edit goal",
    intro:
      "Change any number whenever you like. The plan starts again from today, and months already finished keep their results. The account stays the same.",
  },
  "account-form": {
    title: "Account",
    intro: "Name it, choose what kind it is and who can see it.",
    sections: [
      {
        heading: "Type",
        body: "Savings is for building up. Holding is for money set aside for something soon. Investment holds things whose value moves. The type is chosen once and can’t be changed later.",
      },
      {
        heading: "Who sees it",
        body: "Shared means everyone in the budget. Only me hides it and its history from everyone else.",
      },
    ],
  },
  members: {
    title: "Members",
    intro:
      "Who is in this budget. Everyone can add and edit money. Only the owner can invite, remove people or delete the budget.",
    sections: [
      {
        heading: "Invited",
        body: "Invites wait here until the person joins. The code works for 7 days. Click one to cancel it.",
      },
      {
        heading: "Owner",
        body: "There is one owner. They can hand ownership to another member. Leaving needs any private account of yours to be empty or shared first.",
      },
    ],
  },
  premium: {
    title: "Premium",
    intro:
      "Premium belongs to a budget: one Premium covers everyone in it. It adds budgeting together, every past recap and receipt photos. Everything else in PocFin is free for good.",
    sections: [
      {
        heading: "Free months",
        body: "Invite a friend. When they sign up with your code and add their first expense, you both get a free month. Months add up, up to 12 months ahead.",
      },
      {
        heading: "When it ends",
        body: "You get a week’s warning, then a week more where everything still works. After that the other people in a shared budget can’t open it until Premium is back. Nothing is ever deleted, and they’re back in as soon as it returns.",
      },
    ],
  },
  referral: {
    title: "Invite friends",
    intro:
      "Share your code. A friend who creates a PocFin account with it and adds their first expense earns you both a free month of Premium.",
    sections: [
      {
        heading: "Where the months go",
        body: "Yours go to the budget you choose here; your friend’s go to the budget they add that expense in. Only new accounts count, once each.",
      },
    ],
  },
  invite: {
    title: "Invite someone",
    intro:
      "We email them a code. They sign in to PocFin, choose Join a budget in More and enter it.",
  },
  "budget-settings": {
    title: "Budget settings",
    intro: "The budget's name, the day each month starts, and its currency.",
    sections: [
      {
        heading: "Who can change it",
        body: "Only the owner. Everyone else can see the settings. The currency can change only before any money is added: after that the amounts already saved would mean something else.",
      },
    ],
  },
  "budget-cycle": {
    title: "When your month starts",
    intro: "The day your budget month starts, usually the day you get paid.",
    sections: [
      {
        heading: "What changes",
        body: "Spent this month, top categories and the month on Analytics follow this day. Your balances and history never change.",
      },
    ],
  },
  "history-filters": {
    title: "Filters",
    intro:
      "Narrow History to one envelope and a range of dates. Clear them to see everything again.",
  },
  "onboarding-amounts": {
    title: "How much for each?",
    intro:
      "Choose how much you want to put in each envelope every month. You can change any amount later.",
    sections: [
      {
        heading: "Left to budget",
        body: "This starts as the first income you entered. It goes down as you give envelopes a monthly amount, so you can see how much of your income is spoken for.",
      },
      {
        heading: "Changing amounts later",
        body: "Open an envelope and edit its monthly amount any time. Nothing here is final.",
      },
      {
        heading: "More income",
        body: "If you earn more, add it as income from the Add button. It lands in Ready to allocate, and you share it into your envelopes from there.",
      },
    ],
  },
  "onboarding-order": {
    title: "Order and fill",
    intro:
      "Put your envelopes in the order you want. Money goes in from the top.",
    sections: [
      {
        heading: "How the fill works",
        body: "Fill my envelopes goes from the top down. Each envelope gets its monthly amount until your income runs out. What is left stays in Ready to allocate.",
      },
      {
        heading: "Allocating one by one",
        body: "You do not have to use the fill. Open your income any time and give each envelope exactly what you want. Money only reaches an envelope once you allocate it.",
      },
      {
        heading: "Why the order matters",
        body: "If your income is less than all the envelopes together, the ones at the bottom get less. Put the most important ones first.",
      },
      {
        heading: "Sorting",
        body: "Use A to Z, Lowest first or Highest first to sort quickly, then drag to fine-tune.",
      },
    ],
  },
  "profile-details": {
    title: "Your details",
    intro: "Your name, and the email you sign in with.",
  },
  "profile-password": {
    title: "Change password",
    intro:
      "Enter your current password and choose a new one. Other phones signed in as you are signed out.",
  },
  calculators: {
    title: "Calculators",
    intro:
      "Estimates to help you plan ahead: retirement, saving towards something, and your home loan. They are not financial advice.",
    sections: [
      {
        heading: "Saved calculations",
        body: "Save one to pick it up later. Only your numbers are kept, and the results are worked out again each time you open it.",
      },
      {
        heading: "Shared with your budget",
        body: "Everyone in this budget sees what is saved here, and can open, change or delete it.",
      },
      {
        heading: "Copy or delete",
        body: "Use the buttons beside a saved one. A copy is handy for trying a different idea, like retiring at 60 instead of 65.",
      },
    ],
  },
  "calc-retirement": {
    title: "Retirement",
    intro:
      "Three steps: what you’ll need, what you’ll have, and whether that gets you there.",
    sections: [
      {
        heading: "25× and 15×",
        body: "25 times a year’s spending can last 30 years or more if you take out no more than 4% a year. 15 times is enough if other income, like a pension or rent, covers part of it.",
      },
      {
        heading: "Today’s money",
        body: "Prices rise every year, so a rand buys less later. The number you chase is in the rands of the year you retire, so it is bigger than it feels today. Beside it we show what it is worth in today’s money, only so it is easier to picture.",
      },
      {
        heading: "Good and tough years",
        body: "Growth goes up and down. The band shows what happens if it averages a little more or a little less than your guess.",
      },
      {
        heading: "How long it lasts",
        body: "Spending the same each month in today’s money from the day you retire, with what is left still growing.",
      },
    ],
  },
  "calc-growth": {
    title: "Saving & growth",
    intro:
      "Pick what you want to know: what your savings grow to, what to put away each month to reach an amount, or how long it takes.",
    sections: [
      {
        heading: "Growth",
        body: "Your guess for a year’s growth, before inflation. It is added every month.",
      },
      {
        heading: "Today’s money",
        body: "The note under the result shows what the amount will buy in today’s prices, at 5% inflation a year.",
      },
      {
        heading: "Plain amount or today’s buying power",
        body: "Plain amount means exactly that number when you get there. Today’s buying power means a number that buys what it buys now, so we aim higher to match rising prices.",
      },
    ],
  },
  "calc-home-loan": {
    title: "Home loan",
    intro:
      "Your monthly repayment, how much of what you pay is interest, and what paying a little extra each month saves.",
    sections: [
      {
        heading: "The rate",
        body: "Use the rate your bank gives you. It is kept the same for the whole term here, but real rates move with prime.",
      },
      {
        heading: "Paying extra",
        body: "Anything above the repayment goes straight off what you owe, so you pay less interest and finish sooner.",
      },
      {
        heading: "Deposit",
        body: "What you pay upfront comes off the price. The repayment is worked out on what's left, the amount you borrow.",
      },
      {
        heading: "If the rate changes",
        body: "Type another rate to see the repayment at that rate beside today's. Handy to check you could still afford it if prime goes up.",
      },
    ],
  },
  "calc-car-loan": {
    title: "Car loan",
    intro:
      "Your monthly repayment on vehicle finance, how much of what you pay is interest, and what a balloon does.",
    sections: [
      {
        heading: "Balloon",
        body: "A balloon (or residual) is part of the price you leave until the end. Each month costs less, but you pay it in one go at the end, and interest runs on it the whole time. Leave it at 0% to pay the car off in full.",
      },
      {
        heading: "If the rate changes",
        body: "Type another rate to see the repayment at that rate beside today's. Most car loans follow prime.",
      },
      {
        heading: "What's not included",
        body: "Bank fees, insurance and extras like service plans aren't in here. Your bank's quote will show them.",
      },
    ],
  },
} satisfies Record<string, HelpEntry>;

/** Web pages the app doesn't have, or that work differently here. */
const WEB: Record<string, HelpEntry> = {
  "edit-envelopes": {
    title: "Edit envelopes",
    intro:
      "Change the order, names and every monthly amount in one place, then save once.",
    sections: [
      {
        heading: "Monthly amounts",
        body: "Type a new monthly amount beside any envelope. It sets how much Fill my envelopes adds. It is not a limit and your balance never resets.",
      },
      {
        heading: "Monthly envelope budget total",
        body: "All the envelopes' monthly amounts added together: what you plan to share out each month.",
      },
      {
        heading: "Order",
        body: "Drag the handle on the left. Fill my envelopes goes from the top down and stops when the income runs out. A to Z, Lowest first and Highest first sort quickly, then you can drag to fine-tune.",
      },
      {
        heading: "Saving",
        body: "Nothing changes until you click Save changes. Archiving, icons and deleting are done from each envelope on the Budget page.",
      },
      {
        heading: "Add an envelope",
        body: "Click Add envelope, type a name and an amount. It is made when you click Save changes.",
      },
      {
        heading: "Monthly income",
        body: "Optional. Type what you get paid and the total at the top shows how much is left to budget. It is only a guide. It isn’t booked anywhere.",
      },
      {
        heading: "Plans",
        body: "Save as plan keeps the current amounts under a name, like Tight month. Load fills the page with a plan’s amounts, and you still click Save changes to keep them. Plans are shared with everyone in the budget.",
      },
    ],
  },
  goals: {
    title: "Goals",
    intro:
      "A goal follows one account, or one purpose in your investments, and checks in each month. Click a goal to see how it is going. Goals are in beta: how they work may change.",
    sections: [
      {
        heading: "Three kinds",
        body: "Reach an amount by a date, the same each month (a habit), or a yearly amount. Long-term investing can grow to a value, where growth counts.",
      },
      {
        heading: "What counts",
        body: "Money you put in, minus money you take out, during the month. Market ups and downs never make you miss a month.",
      },
      {
        heading: "One goal each",
        body: "Each account or purpose can have one goal at a time. Finish or delete it to start another.",
      },
      {
        heading: "Not advice",
        body: "These are estimates, not promises. PocFin doesn't give financial advice.",
      },
    ],
  },
  "calc-growth": {
    title: "Saving & growth",
    intro:
      "Pick what you want to know, fill in what you already know, and the answer on the right updates as you type.",
    sections: [
      {
        heading: "What I’d have",
        body: "You know what you can put away each month and for how long. It works out what that grows to.",
      },
      {
        heading: "Monthly needed",
        body: "You know the amount you want and by when. It works out what to put away each month to get there.",
      },
      {
        heading: "How long",
        body: "You know the amount you want and what you can put away each month. It works out how long it takes.",
      },
      {
        heading: "In the rands of that day, or what it buys today",
        body: "In the rands of that day means exactly that number when you get there. What it buys today means a number that buys then what it buys now, so we aim higher to keep up with rising prices.",
      },
      {
        heading: "Growth",
        body: "Your guess for a year’s growth, before inflation. It is added every month.",
      },
      {
        heading: "Today’s money",
        body: "Under the answer we show what the amount would buy in today’s prices, at the inflation you set under assumptions.",
      },
    ],
  },
  "update-values": {
    title: "Update values",
    intro:
      "Type what each holding is worth today, as your provider shows it. No money moves: only the value changes.",
    sections: [
      {
        heading: "Why it matters",
        body: "Gain or loss and returns are worked out from these values. The more often you update them, the more accurate they are.",
      },
      {
        heading: "Filled in for you",
        body: "Each box starts with the value it has now. Change only the ones that moved, and leave the rest.",
      },
      {
        heading: "Date",
        body: "Usually today. It can’t be earlier than the last value or money movement in a holding.",
      },
    ],
  },
};

export const HELP_ALL: Record<string, HelpEntry> = { ...HELP, ...WEB };

export type HelpTopic = keyof typeof HELP | keyof typeof WEB;

/** The guide in Help that goes deeper on each topic (guides.ts keys). */
export const TOPIC_GUIDE: Partial<Record<string, string>> = {
  overview: "how",
  "budget-envelopes": "budget",
  envelope: "spending",
  "edit-envelopes": "budget",
  allocate: "payday",
  "budget-history": "spending",
  "budget-analytics": "recaps",
  accounts: "accounts",
  account: "accounts",
  investmentAccount: "accounts",
  "update-values": "accounts",
  goals: "goals",
  goal: "goals",
  "goal-new": "goals",
  automatic: "automatic",
  calculators: "calculators",
  "calc-retirement": "calculators",
  "calc-growth": "calculators",
  "calc-home-loan": "calculators",
  "calc-car-loan": "calculators",
  members: "sharing",
  recaps: "recaps",
};
