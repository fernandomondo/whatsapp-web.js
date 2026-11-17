/**
 * Expose a function to the page if it does not exist
 *
 * NOTE:
 * Rewrite it to 'upsertFunction' after updating Puppeteer to 20.6 or higher
 * using page.removeExposedFunction
 * https://pptr.dev/api/puppeteer.page.removeexposedfunction
 *
 * @param {object} page - Puppeteer Page instance
 * @param {string} name
 * @param {Function} fn
 */
async function exposeFunctionIfAbsent(page, name, fn) {
    // Retry transient frame races (wwebjs#201946): WhatsApp's short-lived pdf-viewer
    // iframe can close mid-exposeFunction ("Target closed"), killing attachEventListeners
    // silently so `ready` never fires. Re-check window[name] each attempt, since the
    // main frame may already have the binding.
    for (let attempt = 1; ; attempt++) {
        const exist = await page.evaluate((name) => {
            return !!window[name];
        }, name);
        if (exist) {
            return;
        }
        try {
            await page.exposeFunction(name, fn);
            return;
        } catch (err) {
            const transient =
                /target closed|detached|destroyed|session closed|execution context/i.test(
                    err?.message ?? String(err),
                );
            if (!transient || attempt >= 5) throw err;
            await new Promise((r) => setTimeout(r, 200 * attempt));
        }
    }
}

module.exports = { exposeFunctionIfAbsent };
