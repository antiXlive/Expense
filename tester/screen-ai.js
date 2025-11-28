window.screenLayouts = window.screenLayouts || {};

screenLayouts.ai = function () {

    // ==========================
    // JUST THE IMAGE ARRAY
    // ==========================
    const aiImages = [
        "ai.jpg",
        "ai1.png",
        "ai2.jpg",
        // add more images here
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
            }

            .ai-bg {
                position: absolute;
                inset: 0;
                background-size: cover;
                background-position: center;
                background-repeat: no-repeat;
                z-index: 1;
            }

            .ai-glass {
                position: absolute;
                inset: 0;
                -webkit-backdrop-filter: blur(60px) saturate(160%);
                backdrop-filter: blur(30px) saturate(160%);
                z-index: 2;
            }

            .ai-content {
                position: absolute;
                inset: 0;
                z-index: 3;
                padding: 22px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 22px;
                color: white;
                font-weight: 500;
                text-align: center;
            }

            /* Mobile Fullscreen Mode */
            @media (max-width: 600px) {
                .ai-screen,
                .ai-bg,
                .ai-glass {
                    border-radius: 0 !important;
                }
            }
        </style>
    `;

    // ==========================
    // Build one phone per image
    // ==========================
    function buildPhone(image) {
        return `
        <div class="theme-block">
            <div class="theme-name">${image}</div>

            <div class="mobile-frame">
                <div class="mobile-content">

                    <div class="ai-screen">
                        <div class="ai-bg" style="background-image:url('./${image}')"></div>

                        <!-- enable/disable glass -->
                        <div class="ai-glass"></div>

                        <div class="ai-content">
                            AI Screen Coming Soon...
                        </div>
                    </div>

                </div>
            </div>
        </div>`;
    }

    // ==========================
    // LOOP ONLY ON IMAGES
    // ==========================
    let html = aiStyles;
    aiImages.forEach(img => html += buildPhone(img));

    return html;
};
