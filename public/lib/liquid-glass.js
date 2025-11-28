const initLiquidGlass = (scope = document) => {
    // Only select elements that haven't been initialized yet
    const liquidGlassElements = scope.querySelectorAll('[data-liquid-glass]:not([data-lg-initialized])');

    liquidGlassElements.forEach(el => {
        // Mark as initialized so we don't process it twice
        el.setAttribute('data-lg-initialized', 'true');

        const options = {
            speed: parseFloat(el.dataset.liquidGlassOptionsSpeed) || 1.5,
            shine: el.dataset.liquidGlassOptionsShine !== 'false',
            shadow: el.dataset.liquidGlassOptionsShadow !== 'false',
            border: el.dataset.liquidGlassOptionsBorder !== 'false'
        };

        el.style.position = 'relative';
        // el.style.overflow = 'hidden'; // Removed to allow popups/tooltips to overflow if needed
        el.style.zIndex = '1';
        el.style.transition = `transform ${options.speed * 0.5}s ease, box-shadow ${options.speed * 0.5}s ease`;

        if (options.shadow) {
            el.style.boxShadow = '0 8px 32px 0 rgba(0, 0, 0, 0.37)';
        }
        if (options.border) {
            el.style.border = '1px solid rgba(255, 255, 255, 0.18)';
        }

        const shine = document.createElement('span');
        if (options.shine) {
            shine.style.position = 'absolute';
            shine.style.top = '0';
            shine.style.left = '0';
            shine.style.transform = 'translate(-50%, -50%)';
            shine.style.width = '200%';
            shine.style.height = '200%';
            shine.style.background = 'radial-gradient(circle, rgba(255, 255, 255, 0.5) 0%, rgba(255, 255, 255, 0) 50%)';
            shine.style.opacity = '0';
            shine.style.transition = `opacity ${options.speed * 0.5}s ease`;
            shine.style.pointerEvents = 'none';
            shine.style.zIndex = '2';
            shine.style.borderRadius = 'inherit'; // Match parent border radius
            el.appendChild(shine);
        }

        el.addEventListener('mousemove', e => {
            const rect = el.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const rotateX = (y / rect.height - 0.5) * -20;
            const rotateY = (x / rect.width - 0.5) * 20;

            el.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;

            if (options.shine) {
                shine.style.top = `${y}px`;
                shine.style.left = `${x}px`;
            }
        });

        el.addEventListener('mouseenter', () => {
            if (options.shine) {
                shine.style.opacity = '1';
            }
        });

        el.addEventListener('mouseleave', () => {
            el.style.transform = 'perspective(1000px) rotateX(0) rotateY(0)';
            if (options.shine) {
                shine.style.opacity = '0';
            }
        });
    });
};

// Run on load
document.addEventListener('DOMContentLoaded', () => {
    initLiquidGlass();

    // Watch for changes in the DOM to initialize new elements automatically
    const observer = new MutationObserver((mutations) => {
        let shouldInit = false;
        mutations.forEach((mutation) => {
            if (mutation.addedNodes.length > 0) {
                shouldInit = true;
            }
        });
        if (shouldInit) {
            initLiquidGlass();
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
});