window.screenLayouts = window.screenLayouts || {};

screenLayouts.home = function () {

    // -----------------------------------
    // THEMES (INSIDE THIS SCREEN ONLY)
    // -----------------------------------
    const themes = [
        {
            name: "Champions Navy",
            bg: "#081427",
            text: "#FFFFFF",
            subtext: "#9DB4D0",
            subtleText: "#7A8FA8",
            expenseColor: "#FF5563",
            iconBg: "rgba(255,255,255,0.06)",
            transactionBg: "rgba(255,255,255,0.04)"
        }
        ,
        {
            name: "Stadium Blue",
            bg: "#0A1B3D",
            text: "#E8EEFF",
            subtext: "#8CA6D9",
            subtleText: "#7E92B8",
            expenseColor: "#FF4F5E",
            iconBg: "rgba(100,140,255,0.18)",
            transactionBg: "rgba(255,255,255,0.05)"
        }
        ,
        {
            name: "Midnight Pitch",
            bg: "#050B16",
            text: "#F2F7FF",
            subtext: "#7E8FA8",
            subtleText: "#63738C",
            expenseColor: "#FF5E79",
            iconBg: "rgba(255,255,255,0.07)",
            transactionBg: "rgba(255,255,255,0.03)"
        }
        ,
        {
            name: "Neon Club Lights",
            bg: "#0A1225",
            text: "#F3F7FF",
            subtext: "#9BB4E0",
            subtleText: "#6F82A3",
            expenseColor: "#FF4667",
            iconBg: "rgba(0,190,255,0.12)",
            transactionBg: "rgba(0,190,255,0.08)"
        }
        , {
            name: "Blue Steel Aura",
            bg: "#0A1A26",
            text: "#EAF3FF",
            subtext: "#A1BDD9",
            subtleText: "#7F9AB8",
            expenseColor: "#FF5671",
            iconBg: "rgba(255,255,255,0.10)",
            transactionBg: "rgba(255,255,255,0.06)"
        }
        , {
            name: "Premier Dark",
            bg: "#0A0F22",
            text: "#F5F7FF",
            subtext: "#A0AFCE",
            subtleText: "#7081A8",
            expenseColor: "#FF6A6A",
            iconBg: "rgba(255,255,255,0.08)",
            transactionBg: "rgba(255,255,255,0.05)"
        }
        ,
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
    // HOME SCREEN CSS
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
                padding: 12px 14px;
                border-radius: 16px;
                margin-bottom: 12px;
            }

            .transaction-icon {
                width: 36px;
                height: 36px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 20px;
            }

            .transaction-info {
                flex: 1;
                padding-left: 12px;
            }

            .transaction-name {
                font-size: 14px;
                font-weight: 600;
            }

            .transaction-category {
                font-size: 12px;
                opacity: 0.75;
            }

            .transaction-amount {
                font-size: 15px;
                font-weight: 700;
                min-width: 60px;
                text-align: right;
            }
        </style>
    `;

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

            <div class="mobile-frame" style="background:${theme.bg}">
                <div class="mobile-content">

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
