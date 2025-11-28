window.screenLayouts = window.screenLayouts || {};

screenLayouts.home = function () {

    // -----------------------------------
    // THEMES (INSIDE THIS SCREEN ONLY)
    // -----------------------------------
    const themes = [
        {
            name: "Fintech Dark Blue",
            bg: "#0F172A",
            text: "#FFFFFF",
            subtext: "#94A3B8",
            subtleText: "#64748B",
            expenseColor: "#EF4444",
            iconBg: "rgba(255,255,255,0.08)",
            transactionBg: "rgba(255,255,255,0.05)"
        },
        {
            name: "iOS Bank Dark",
            bg: "#000000",
            text: "#FFFFFF",
            subtext: "#8E8E93",
            subtleText: "#6E6E73",
            expenseColor: "#FF3B30",
            iconBg: "rgba(255,255,255,0.10)",
            transactionBg: "rgba(255,255,255,0.08)"
        },
        {
            name: "Ocean Night",
            bg: "#041014",
            text: "#E6FAFF",
            subtext: "#8fe7f7",
            subtleText: "#8fe7f7",
            expenseColor: "#ff708a",
            iconBg: "rgba(6,182,212,0.22)",
            transactionBg: "rgba(255,255,255,0.05)"
        }
    ];

    // -----------------------------------
    // HOME DATA (INSULATED)
    // -----------------------------------
    const data = {
        today: [
            { icon: "☕", category: "Food", sub: "Starbucks Coffee", amt: 5.50 },
            { icon: "🚗", category: "Transport", sub: "Uber Ride", amt: 12.00 }
        ],
        yesterday: [
            { icon: "🛍️", category: "Shopping", sub: "Amazon Order", amt: 45.99 },
            { icon: "🛒", category: "Groceries", sub: "Daily Mart", amt: 78.42 }
        ],
        date1: [
            { icon: "🍽️", category: "Dining", sub: "BBQ Nation", amt: 124.50 }
        ]
    };

    // -----------------------------------
    // HOME SCREEN CSS  (INSIDE SCREEN FILE ONLY)
    // -----------------------------------
    const homeStyles = `
        <style>
            .home-screen {
                height: 100%;
                padding: 18px;
                box-sizing: border-box;
            }

            .day-group { margin-bottom: 22px; }

            .day-header {
                display: flex;
                justify-content: space-between;
                font-size: 13px;
                text-transform: uppercase;
                letter-spacing: 1px;
                margin-bottom: 10px;
                opacity: 0.9;
            }

            .transaction {
                display: flex;
                align-items: center;
                padding: 10px 12px;
                border-radius: 16px;
                margin-bottom: 10px;
            }

            .transaction-icon {
                width: 34px;
                height: 34px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 18px;
            }

            .transaction-info {
                flex: 1;
                padding-left: 10px;
            }

            .transaction-name {
                font-size: 14px;
                font-weight: 500;
            }

            .transaction-category {
                font-size: 12px;
                opacity: 0.75;
            }

            .transaction-amount {
                font-size: 14px;
                font-weight: 600;
                min-width: 60px;
                text-align: right;
            }
        </style>
    `;

    // Render each day group
    function renderDay(label, list, theme) {
        const total = list.reduce((s, t) => s + t.amt, 0).toFixed(2);

        return `
        <div class="day-group">
            <div class="day-header" style="color:${theme.subtleText}">
                <span>${label}</span>
                <span style="color:${theme.expenseColor}">-$${total}</span>
            </div>

            ${list.map(t => `
                <div class="transaction" style="background:${theme.transactionBg}">
                    <div class="transaction-icon" style="background:${theme.iconBg}">
                        ${t.icon}
                    </div>

                    <div class="transaction-info">
                        <div class="transaction-name" style="color:${theme.text}">${t.category}</div>
                        <div class="transaction-category" style="color:${theme.subtext}">${t.sub}</div>
                    </div>

                    <div class="transaction-amount" style="color:${theme.expenseColor}">
                        -$${t.amt.toFixed(2)}
                    </div>
                </div>
            `).join('')}
        </div>`;
    }

    // Build a single phone
    function buildPhone(theme) {
        return `
        <div class="theme-block">
            <div class="theme-name">${theme.name}</div>

            <div class="mobile-frame">
                <div class="mobile-content" style="background:${theme.bg}; color:${theme.text}">
                    
                    <div class="home-screen">
                        ${renderDay("Today", data.today, theme)}
                        ${renderDay("Yesterday", data.yesterday, theme)}
                        ${renderDay("24 Nov 2025", data.date1, theme)}
                    </div>

                </div>
            </div>
        </div>`;
    }

    return homeStyles + themes.map(theme => buildPhone(theme)).join("");
};
