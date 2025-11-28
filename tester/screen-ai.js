window.screenLayouts = window.screenLayouts || {};

screenLayouts.ai = function () {

    // ==========================
    // THEMES for AI screen
    // ==========================
    const themes = [
        {
            name: "Fintech Dark Blue",
            bg: "#0F172A",
            text: "#FFFFFF"
        },
        {
            name: "iOS Bank Dark",
            bg: "#000000",
            text: "#FFFFFF"
        },
        {
            name: "Ocean Night",
            bg: "#041014",
            text: "#E6FAFF"
        }
    ];

    // ==========================
    // CSS for AI screen only
    // ==========================
    const aiStyles = `
        <style>
            /* Root AI container fits the full mobile-content */
            .ai-screen {
                height: 100%;
                width: 100%;
                position: relative;
                overflow: hidden;
            }

            /* Background gradient image */
            .ai-bg {
                position: absolute;
                inset: 0;
                background-image: url('./ai.jpg'); /* YOUR FILE */
                background-size: cover;
                background-position: center;
                background-repeat: no-repeat;
                z-index: 1;
            }

            /* Glass glossy overlay */
            .ai-glass {
                position: absolute;
                inset: 0;
                background: rgba(255, 255, 255, 0.10);
                backdrop-filter: blur(28px) saturate(180%);
                -webkit-backdrop-filter: blur(28px) saturate(180%);
                z-index: 2;
            }

            /* AI content area */
            .ai-content {
                position: absolute;
                inset: 0;
                z-index: 3;
                padding: 22px;
                display: flex;
                align-items: center;
                justify-content: center;
                text-align: center;
                font-size: 22px;
                font-weight: 500;
                color: white;
            }

            /* MOBILE MODE — full viewport AI */
            @media (max-width: 600px) {
                .ai-screen {
                    border-radius: 0 !important;
                }
                .ai-bg,
                .ai-glass {
                    border-radius: 0 !important;
                }
            }
        </style>
    `;

    // ==========================
    // Build one phone preview
    // ==========================
    function buildPhone(theme) {
        return `
        <div class="theme-block">
            <div class="theme-name">${theme.name}</div>

            <div class="mobile-frame" style="background:${theme.bg}">
                <div class="mobile-content" style="background:${theme.bg}; color:${theme.text}">

                    <div class="ai-screen">
                        <div class="ai-bg"></div>
                        <div class="ai-glass"></div>
                        <div class="ai-content">
                            AI Screen Coming Soon...
                        </div>
                    </div>

                </div>
            </div>
        </div>`;
    }

    return aiStyles + themes.map(t => buildPhone(t)).join("");
};
