// Copied (words only) from pocfin4.0-app/src/lib/guides.tsx and design/how-it-works.md (2026-11-18):
// the drawings stay in the app, and no currency appears in either. Keep the words in step.
export type GuideCard = { title: string; body: string };
export type Guide = { key: string; title: string; about: string; premium: boolean; cards: GuideCard[] };

export const GUIDES: Guide[] = [
    {
        "key": "how",
        "title": "How PocFin works",
        "about": "PocFin",
        "premium": false,
        "cards": [
            {
                "title": "Your money doesn’t reset",
                "body": "Most budgets start from zero every month. In PocFin, whatever you don’t spend stays where you put it."
            },
            {
                "title": "Add income on payday",
                "body": "Money you add lands in Ready to allocate. Nothing is spent until you share it into envelopes."
            },
            {
                "title": "Envelopes build up",
                "body": "Share your income into envelopes. Whatever you don’t spend stays there and keeps building."
            },
            {
                "title": "Spent or kept",
                "body": "Envelopes are for spending. Money you move to savings or investments is kept, not spent, and your recap celebrates it."
            },
            {
                "title": "There’s more when you’re ready",
                "body": "Accounts for savings and investing, goals that check in each month, calculators to plan ahead, and a recap at the end of every month. Each has a short guide here in Help."
            }
        ]
    },
    {
        "key": "budget",
        "title": "Your budget and envelopes",
        "about": "your budget",
        "premium": false,
        "cards": [
            {
                "title": "Budgeted and balance",
                "body": "The budgeted amount is your plan for each month. The balance is what’s in the envelope now, and the bar shows how much is still there."
            },
            {
                "title": "Overspent shows in red",
                "body": "If you spend more than an envelope holds, it goes below zero and turns red. Use Move money to bring money in from another envelope, or leave it until payday and fill it back up when you allocate your income."
            },
            {
                "title": "Saving up envelopes",
                "body": "Some costs come once or twice a year. Put a little in every month and the envelope builds up, so the money is there when the bill comes."
            },
            {
                "title": "Put first things first",
                "body": "Drag the handle on an envelope (or press ↑ ↓ on it) to reorder. When you add income, the Allocate page offers Fill my envelopes. It fills from the top of this list down until the income runs out, so put the most important ones first."
            }
        ]
    },
    {
        "key": "payday",
        "title": "Payday and allocating",
        "about": "payday",
        "premium": false,
        "cards": [
            {
                "title": "Add your income",
                "body": "Press Add at the top (or the N key), then Income. Type the amount, choose the date, and save."
            },
            {
                "title": "It waits in Ready to allocate",
                "body": "Your income isn’t in any envelope yet. It sits at the top of the Budget tab as Ready to allocate, with an Allocate button beside it."
            },
            {
                "title": "Fill my envelopes",
                "body": "Each envelope has the monthly amount you set when you made it. On the Allocate page, Fill my envelopes puts those amounts in, from the top of your list down, until the income runs out. If your pay covers them all, every envelope is filled."
            },
            {
                "title": "Check, then Allocate",
                "body": "Everything you pick is listed first, and each line has Undo. Nothing moves until you press Allocate, and after that it can’t be undone, so check the total on the button."
            }
        ]
    },
    {
        "key": "spending",
        "title": "Spending, transfers and refunds",
        "about": "spending and moving money",
        "premium": false,
        "cards": [
            {
                "title": "Spent money",
                "body": "Press Add at the top (or the N key), then Spent. Type the amount and pick the envelope it came from. The envelope goes down straight away."
            },
            {
                "title": "Moved money",
                "body": "Moving between envelopes, or into savings, is Moved money. It isn’t spending and it isn’t income: you still have the same amount, just in a different place."
            },
            {
                "title": "Got a refund",
                "body": "Money back for something you bought goes back into its envelope with Got a refund. It lowers what you spent, so don’t add it as income."
            },
            {
                "title": "Mistakes and receipts",
                "body": "Click any entry in History to change the amount, date or note, or to delete it. With Premium you can also keep a photo of the receipt."
            }
        ]
    },
    {
        "key": "accounts",
        "title": "Accounts and investing",
        "about": "your accounts",
        "premium": false,
        "cards": [
            {
                "title": "Money you keep",
                "body": "The Accounts tab holds money set aside from your everyday budget: Savings, Holding (for something soon, like tax) and Investments. Use New account to add one."
            },
            {
                "title": "Putting money in",
                "body": "Share income straight into an account on the Allocate page, or move money in from an envelope with Moved money. Money that never came through your budget, like interest, goes in with Add money on the account."
            },
            {
                "title": "Investments",
                "body": "An investment holds one or more holdings, like a fund. When its value changes, open the investment and use Update values. Purposes say what the money is for, like a house deposit or retirement."
            },
            {
                "title": "Private accounts",
                "body": "A lock means only you can see an account. In a shared budget, the others only see money arrive in or leave their envelopes."
            }
        ]
    },
    {
        "key": "goals",
        "title": "Goals",
        "about": "goals",
        "premium": false,
        "cards": [
            {
                "title": "A goal follows an account",
                "body": "Make one from the Goals section on the Accounts tab. It follows one account, or one purpose in your investments, so progress fills in by itself."
            },
            {
                "title": "Pick a shape",
                "body": "Reach an amount by a date, put in the same each month, or a yearly amount you pay in when it suits you. Grow to a value is for long-term investing."
            },
            {
                "title": "One check a month",
                "body": "Each month asks one thing: did this month’s amount go in? A tick is on track, a star is extra, and a pause is a rest month, never a fail."
            },
            {
                "title": "If you fall behind",
                "body": "When you’re about two months behind, we ask once whether to keep the date or move it. Decide later changes nothing. Goals are still in beta."
            }
        ]
    },
    {
        "key": "automatic",
        "title": "Automatic",
        "about": "automatic payments",
        "premium": false,
        "cards": [
            {
                "title": "Set it once",
                "body": "In Automatic, add rent, a subscription or a regular move. PocFin records it on the day, so you don’t have to remember."
            },
            {
                "title": "Auto or Ask me first",
                "body": "Auto records it by itself if the envelope holds the whole amount. Ask me first sends a reminder so you can approve it, change the amount once, or skip it."
            },
            {
                "title": "When money is short",
                "body": "If there isn’t enough, nothing happens. We try again each morning for three more days, then skip that time and tell you."
            }
        ]
    },
    {
        "key": "calculators",
        "title": "Calculators",
        "about": "the calculators",
        "premium": false,
        "cards": [
            {
                "title": "Plan ahead",
                "body": "In Calculators: Retirement, Saving and growth, Home loan and Car loan. Change the numbers and see the result straight away."
            },
            {
                "title": "Today’s money",
                "body": "Prices rise over the years, so we also show what a future amount would buy today. The bigger number is what you’ll actually see then."
            },
            {
                "title": "Save it, or make it a goal",
                "body": "Save a calculation to come back to it; everyone in the budget can see saved ones. From Retirement or Saving & growth, Make this a goal turns it into a goal on an account."
            },
            {
                "title": "Estimates, not advice",
                "body": "These are estimates, not promises: markets go up and down. PocFin doesn’t give financial advice, so talk to a qualified adviser if you’re unsure."
            }
        ]
    },
    {
        "key": "sharing",
        "title": "Sharing a budget",
        "about": "sharing a budget",
        "premium": true,
        "cards": [
            {
                "title": "Budget together",
                "body": "Invite a partner or housemate from Members. They get an email with a code to join."
            },
            {
                "title": "What they can do",
                "body": "Members add spending and income, move money and allocate, just like you. Settings like the budget’s name and month start stay with the owner."
            },
            {
                "title": "Sharing is part of Premium",
                "body": "Premium also adds past recaps and receipts. It starts with a 7-day free trial, and you can cancel any time."
            }
        ]
    },
    {
        "key": "recaps",
        "title": "Recaps, streaks and Analytics",
        "about": "recaps and streaks",
        "premium": false,
        "cards": [
            {
                "title": "Your monthly recap",
                "body": "When a month ends, a short recap opens by itself: how your envelopes did, what you kept, and your wins. Your first one comes after your first full month."
            },
            {
                "title": "Your weekly streak",
                "body": "Each week you look after your budget (spending, income, a move or allocating) adds to your streak. Miss one week and a rest week keeps it safe, once a month."
            },
            {
                "title": "Analytics",
                "body": "Analytics shows how the month is going against your plan. With Premium you also get Trends over six months, Insights, and every past recap in Recaps."
            }
        ]
    }
];
