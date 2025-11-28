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
            .ai-screen {
                height: 100%;
                width: 100%;
                position: relative;
                overflow: hidden;
                border-radius: 32px;
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

            /* Glass / glossy overlay */
            .ai-glass {
                position: absolute;
                inset: 0;
                background: rgba(255, 255, 255, 0.08);
                backdrop-filter: blur(38px) saturate(180%);
                -webkit-backdrop-filter: blur(18px) saturate(180%);
                z-index: 2;
            }

            /* AI content placeholder */
            .ai-content {
                position: absolute;
                inset: 0;
                z-index: 3;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                padding: 20px;
                font-size: 20px;
                opacity: 0.9;
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

            <div class="mobile-frame">
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
