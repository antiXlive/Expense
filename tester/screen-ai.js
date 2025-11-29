window.screenLayouts = window.screenLayouts || {};

screenLayouts.ai = function () {

    const aiImages = [
        "ai.jpg",
        "ai2.jpg",
        "ai6.jpg",
        "ai9.jpg",
        "ai11.jpg",
        "ai13.jpg",
        "ai14.jpg",
    ];

    const aiStyles = `
        <style>
            .ai-screen {
                height: 100%;
                width: 100%;
                position: relative;
                overflow: hidden;
            }

            .ai-bg {
    position: absolute;
    inset: 0;

    background:
        radial-gradient(circle at 20% 30%, rgba(255, 0, 102, 0.55), transparent 60%),
        radial-gradient(circle at 80% 20%, rgba(255, 128, 0, 0.40), transparent 60%),
        radial-gradient(circle at 50% 80%, rgba(0, 168, 255, 0.45), transparent 65%),
        linear-gradient(180deg, #000000 0%, #0A0A0A 100%);

    background-blend-mode: screen;
    filter: blur(40px) brightness(1.1);
    z-index: 1;
}


            .ai-glass {
    position: absolute;
    inset: 0;

    -webkit-backdrop-filter: blur(100px) saturate(250%);
    backdrop-filter: blur(100px) saturate(250%);
    
    background: rgba(0, 0, 0, 0.18); /* subtle dark film */
    z-index: 2;
}


            .ai-content {
                position: absolute;
                inset: 0;
                z-index: 3;
                padding: 20px;
                display: flex;
                flex-direction: column;
                gap: 20px;
                overflow-y: auto;
            }

            .ai-title {
                font-size: 26px;
                font-weight: 700;
                color: #fff;
                margin-bottom: 6px;
                text-shadow: 0 2px 4px rgba(0,0,0,0.4);
            }

            .glass-card {
    background: rgba(255,255,255,0.10);
    border: 1px solid rgba(255,255,255,0.25);
    backdrop-filter: blur(45px) saturate(200%);
    -webkit-backdrop-filter: blur(45px) saturate(200%);

    border-radius: 28px;
    padding: 20px;
    box-shadow: 
        0 4px 25px rgba(0,0,0,0.25),
        inset 0 0 20px rgba(255,255,255,0.05);

    color: #fff;
}


            .glass-card h3 {
                margin: 0 0 8px;
                font-size: 18px;
                font-weight: 600;
            }

            .glass-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 6px;
                font-size: 15px;
            }

            .card-row {
                display: flex;
                gap: 20px;
            }

            .card-row .glass-card {
                width: 50%;
            }

            @media (max-width: 420px) {
                .card-row {
                    flex-direction: column;
                }
                .card-row .glass-card {
                    width: 100%;
                }
            }
        </style>
    `;

    function buildPhone(image) {
        return `
        <div class="theme-block">
            <div class="theme-name">${image}</div>

            <div class="mobile-frame">
                <div class="mobile-content">
                    <div class="ai-screen">

                        <div class="ai-bg" style="background-image:url('./${image}')"></div>
                        <div class="ai-glass"></div>

                        <div class="ai-content">

                            <div class="ai-title">AI Expense Summary</div>

                            <!-- FULL WIDTH CARD -->
                            <div class="glass-card">
                                <h3>💰 Monthly Summary</h3>
                                <div class="glass-row">
                                    <span>Total Spent</span><strong>₹12,540</strong>
                                </div>
                                <div class="glass-row">
                                    <span>Compared to last month</span>
                                    <span style="color:#ff7676">+8.2%</span>
                                </div>
                                <div class="glass-row">
                                    <span>Top Category</span><strong>Food & Dining</strong>
                                </div>
                                <div class="glass-row">
                                    <span>Remaining Days</span><strong>11 days</strong>
                                </div>
                            </div>

                            <!-- 2 CARDS ROW -->
                            <div class="card-row">

                                <div class="glass-card">
                                    <h3>📊 Top Categories</h3>
                                    <div class="glass-row"><span>🍽️ Food</span><strong>₹4,020</strong></div>
                                    <div class="glass-row"><span>🛍️ Shopping</span><strong>₹3,100</strong></div>
                                    <div class="glass-row"><span>🚕 Travel</span><strong>₹1,880</strong></div>
                                    <div class="glass-row"><span>🏡 Rent</span><strong>₹17,000</strong></div>
                                </div>

                                <div class="glass-card">
                                    <h3>📈 Trend</h3>
                                    <div class="glass-row"><span>This week</span><span style="color:#4ade80">-12%</span></div>
                                    <div class="glass-row"><span>Daily Average</span><strong>₹420</strong></div>
                                    <div class="glass-row"><span>Peak Day</span><strong>Saturday</strong></div>
                                    <div class="glass-row"><span>Lowest Spend Day</span><strong>Monday</strong></div>
                                </div>

                            </div>

                            <!-- ANOTHER 2 CARDS ROW -->
                            <div class="card-row">

                                <div class="glass-card">
                                    <h3>💡 Smart Tip</h3>
                                    You spent 22% more on food delivery this month.
                                    <br><br>
                                    Try switching 2 orders/week to home cooking → Save <b>₹900/month</b>.
                                </div>

                                <div class="glass-card">
                                    <h3>🧠 Insights</h3>
                                    <div class="glass-row">
                                        <span>High spend hour</span> <strong>7pm–10pm</strong>
                                    </div>
                                    <div class="glass-row">
                                        <span>Weekend avg</span> <strong>₹980/day</strong>
                                    </div>
                                    <br>
                                    You tend to spend more on Fridays.
                                </div>

                            </div>

                            <!-- FULL WIDTH CARD -->
                            <div class="glass-card">
                                <h3>🔁 Recurring Payments</h3>
                                <div class="glass-row"><span>Netflix</span><strong>₹649 – 4 days</strong></div>
                                <div class="glass-row"><span>Spotify</span><strong>₹129 – Tomorrow</strong></div>
                                <div class="glass-row"><span>Prime</span><strong>₹299 – 11 days</strong></div>
                                <div class="glass-row"><span>Rent</span><strong>₹17,000 – Due Soon</strong></div>
                            </div>

                            <!-- 2 CARDS ROW -->
                            <div class="card-row">

                                <div class="glass-card">
                                    <h3>📉 Cash Flow</h3>
                                    <div class="glass-row"><span>Income</span><strong>₹42,000</strong></div>
                                    <div class="glass-row"><span>Expenses</span><strong>₹12,540</strong></div>
                                    <div class="glass-row"><span>Balance</span><strong>₹29,460</strong></div>
                                </div>

                                <div class="glass-card">
                                    <h3>🤖 AI Forecast</h3>
                                    Projected Spend:
                                    <div style="margin-top:6px; font-size:17px; font-weight:600;">₹18,400</div>
                                    <div style="color:#fca5a5; margin-top:4px;">↑ 6% higher than last month</div>
                                </div>

                            </div>

                        </div>

                    </div>
                </div>
            </div>
        </div>`;
    }

    let html = aiStyles;
    aiImages.forEach(img => html += buildPhone(img));
    return html;
};
