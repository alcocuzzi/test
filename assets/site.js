/* Local behavior to replace Framer runtime for this static export. */

function decodeCloudflareEmail(hex) {
    if (!hex || typeof hex !== "string" || hex.length < 4 || hex.length % 2 !== 0) return null;

    const key = parseInt(hex.slice(0, 2), 16);
    if (!Number.isFinite(key)) return null;

    let out = "";
    for (let i = 2; i < hex.length; i += 2) {
        const byte = parseInt(hex.slice(i, i + 2), 16);
        if (!Number.isFinite(byte)) return null;
        out += String.fromCharCode(byte ^ key);
    }
    return out;
}

function decodeEmailProtectionLinks() {
    // 1) Cloudflare email-protection links: /cdn-cgi/l/email-protection#<hex>
    for (const a of document.querySelectorAll('a[href^="/cdn-cgi/l/email-protection#"], a[href^="cdn-cgi/l/email-protection#"]')) {
        const href = a.getAttribute("href") || "";
        const hashIndex = href.indexOf("#");
        if (hashIndex === -1) continue;
        const hex = href.slice(hashIndex + 1);
        const email = decodeCloudflareEmail(hex);
        if (!email) continue;

        a.setAttribute("href", `mailto:${email}`);
        a.removeAttribute("target");
        a.setAttribute("rel", "noopener");
        if (a.textContent && a.textContent.includes("[email")) {
            a.textContent = email;
        }
        a.setAttribute("data-dc-decoded-email", email);
    }

    // 2) Cloudflare email spans/links: <span class="__cf_email__" data-cfemail="...">[email protected]</span>
    for (const el of document.querySelectorAll("[data-cfemail]")) {
        const hex = el.getAttribute("data-cfemail") || "";
        const email = decodeCloudflareEmail(hex);
        if (!email) continue;

        if (el.tagName.toLowerCase() === "a") {
            el.setAttribute("href", `mailto:${email}`);
            if (el.textContent && el.textContent.includes("[email")) {
                el.textContent = email;
            }
        } else {
            el.textContent = email;
        }
        el.setAttribute("data-dc-decoded-email", email);
    }
}

function rewriteOriginalSizes() {
    for (const element of document.querySelectorAll("[data-framer-original-sizes]")) {
        const original = element.getAttribute("data-framer-original-sizes");
        if (original === "") {
            element.removeAttribute("sizes");
        } else {
            element.setAttribute("sizes", original);
        }
        element.removeAttribute("data-framer-original-sizes");
    }
}

function unhideFramerAppearElements() {
    const candidates = document.querySelectorAll(
        '[style*="opacity:0.001"], [style*="opacity: 0.001"], [style*="filter:blur"], [style*="filter: blur"]'
    );

    for (const el of candidates) {
        // Allow page-specific sequences to manage initial appear elements.
        if (el.closest('[data-dc-appear-skip="true"]')) continue;

        const style = el.getAttribute("style") || "";
        // Only touch elements that look like Framer's initial appear state.
        const looksLikeAppear =
            style.includes("opacity:0.001") ||
            style.includes("opacity: 0.001") ||
            style.includes("filter:blur") ||
            style.includes("filter: blur");

        if (!looksLikeAppear) continue;

        if (el.style.opacity && parseFloat(el.style.opacity) <= 0.01) {
            el.style.opacity = "1";
        }

        // Remove the animation-only transforms/filters.
        if (el.style.filter) el.style.filter = "";
        if (el.style.transform) el.style.transform = "none";
        if (el.style.willChange) el.style.willChange = "auto";
    }
}

function dcNormalizeText(s) {
    return String(s || "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
}

function dcRevealAppearLikeFramer(root) {
    if (!root) return;

    const nodes = [
        root,
        ...Array.from(
            root.querySelectorAll(
                '[style*="opacity:0.001"], [style*="opacity: 0.001"], [style*="filter:blur"], [style*="filter: blur"]'
            )
        ),
    ];

    for (const el of nodes) {
        if (!(el instanceof HTMLElement)) continue;

        el.style.transition = el.style.transition || "opacity 400ms ease, transform 400ms ease, filter 400ms ease";

        if (el.style.opacity && parseFloat(el.style.opacity) <= 0.01) {
            el.style.opacity = "1";
        }

        if (el.style.filter) el.style.filter = "";
        if (el.style.transform) el.style.transform = "none";
        if (el.style.willChange) el.style.willChange = "auto";
    }
}

function dcGetWordSpans(headingEl) {
    if (!headingEl) return [];
    const all = Array.from(headingEl.querySelectorAll('span[style*="white-space:nowrap"], span[style*="white-space: nowrap"]'));
    const words = all.filter((span) => {
        if (!(span instanceof HTMLElement)) return false;
        const text = (span.textContent || "").replace(/\s+/g, "").trim();
        if (!text) return false;
        return span.querySelector("span") != null;
    });

    // Framer sometimes nests nowrap spans; keep the outermost ones to represent whole words.
    return words.filter((span) => !words.some((other) => other !== span && other.contains(span)));
}

function dcRevealHeadingWordByWord(headingEl, { perWordDelayMs = 140, initialDelayMs = 0 } = {}) {
    if (!headingEl) return 0;

    const wordSpans = dcGetWordSpans(headingEl);
    if (wordSpans.length === 0) {
        dcRevealAppearLikeFramer(headingEl);
        return 0;
    }

    // Ensure the global unhide won't override this animation.
    headingEl.setAttribute("data-dc-appear-skip", "true");

    window.requestAnimationFrame(() => {
        wordSpans.forEach((word, i) => {
            window.setTimeout(() => dcRevealAppearLikeFramer(word), initialDelayMs + i * perWordDelayMs);
        });
    });

    return initialDelayMs + (wordSpans.length - 1) * perWordDelayMs;
}

function initHomeHeroSequence() {
    // Homepage hero text should appear in order:
    // 1) "Do you want an organized life?"
    // 2) "Start with your home."
    // 3) "Changing the space where you live…"

    const findAppearContainerByText = (needle) => {
        const containers = Array.from(
            document.querySelectorAll('[data-framer-component-type="RichTextContainer"][style*="opacity:0.001"], [data-framer-component-type="RichTextContainer"][style*="opacity: 0.001"]')
        );
        return containers.find((el) => (el.textContent || "").includes(needle)) || null;
    };

    const line2 = findAppearContainerByText("Start with your home.");
    const line3 = findAppearContainerByText("Changing the space where you live");
    if (!line2 || !line3) return;

    // Find the H1 that contains the question.
    const commonAncestor = (() => {
        let cur = line2;
        while (cur && cur !== document.body) {
            if (cur instanceof Element && cur.contains(line3)) return cur;
            cur = cur.parentElement;
        }
        return null;
    })();

    const h1Candidates = Array.from((commonAncestor || document).querySelectorAll("h1"));
    const line1 = h1Candidates.find((h1) => dcNormalizeText(h1.textContent).includes("organized life")) || null;
    if (!line1) return;

    // Mark the sequence elements so the global unhide doesn't force them visible.
    line1.setAttribute("data-dc-appear-skip", "true");
    line2.setAttribute("data-dc-appear-skip", "true");
    line3.setAttribute("data-dc-appear-skip", "true");

    // Keep lines 2/3 hidden initially (they already are by inline styles).
    // Reveal line 1 word-by-word, then line 2 fully, then line 3 fully.
    const headingLastWordAt = dcRevealHeadingWordByWord(line1, { perWordDelayMs: 140, initialDelayMs: 0 });
    const line2At = headingLastWordAt + 260;
    const line3At = line2At + 350;

    window.setTimeout(() => dcRevealAppearLikeFramer(line2), line2At);
    window.setTimeout(() => dcRevealAppearLikeFramer(line3), line3At);
}

function initContactStepSequence() {
    const path = (window.location && window.location.pathname) ? window.location.pathname : "";
    const isContactPage = /(^|\/)contact\/?($|index\.html$)/i.test(path);
    if (!isContactPage) return;

    const step2 = document.getElementById("contact");
    if (!step2) return;

    // If the user navigates directly to #contact (e.g. from a "Let's Talk" link),
    // keep Step 2 visible immediately and let the global unhide run.
    const directToContact = (window.location.hash || "") === "#contact";
    if (directToContact) return;

    const findFirstAppearLikeByText = (scope, needle) => {
        const target = dcNormalizeText(needle);
        const candidates = Array.from(
            scope.querySelectorAll(
                '[style*="opacity:0.001"], [style*="opacity: 0.001"], [style*="filter:blur"], [style*="filter: blur"]'
            )
        );
        return candidates.find((el) => dcNormalizeText(el.textContent).includes(target)) || null;
    };

    const hero = document.getElementById("hero") || document.querySelector("header#hero") || document.querySelector("header");
    const heroH1 = (() => {
        const h1s = Array.from((hero || document).querySelectorAll("h1"));
        return h1s.find((h1) => dcNormalizeText(h1.textContent).includes("get in touch")) || null;
    })();

    const heroParagraph = findFirstAppearLikeByText(document, "Ready to transform");

    // Step 2 blocks (inside #contact).
    const chooseBlock = findFirstAppearLikeByText(step2, "Choose how");
    const replyBlock = findFirstAppearLikeByText(step2, "I usually reply");
    const whatsApp = findFirstAppearLikeByText(step2, "WhatsApp");
    const sms = findFirstAppearLikeByText(step2, "SMS");
    const email = findFirstAppearLikeByText(step2, "E-mail");

    // Mark the sequence elements so the global unhide doesn't force them visible.
    if (heroH1) heroH1.setAttribute("data-dc-appear-skip", "true");
    if (heroParagraph) heroParagraph.setAttribute("data-dc-appear-skip", "true");
    step2.setAttribute("data-dc-appear-skip", "true");

    const prevDisplay = step2.style.display;
    step2.style.display = "none";

    const headingLastWordAt = heroH1
        ? dcRevealHeadingWordByWord(heroH1, { perWordDelayMs: 140, initialDelayMs: 0 })
        : 0;

    const paragraphAt = headingLastWordAt + 220;
    const step2ShowAt = paragraphAt + 520;

    window.setTimeout(() => dcRevealAppearLikeFramer(heroParagraph), paragraphAt);

    window.setTimeout(() => {
        step2.style.display = prevDisplay;
        // Reveal the "Choose..." and "I usually reply..." blocks together.
        dcRevealAppearLikeFramer(chooseBlock);
        dcRevealAppearLikeFramer(replyBlock);
    }, step2ShowAt);

    const optionsStartAt = step2ShowAt + 520;
    window.setTimeout(() => dcRevealAppearLikeFramer(whatsApp), optionsStartAt);
    window.setTimeout(() => dcRevealAppearLikeFramer(sms), optionsStartAt + 500);
    window.setTimeout(() => dcRevealAppearLikeFramer(email), optionsStartAt + 1000);
}

function initMobileNav() {
    const phoneNavs = Array.from(document.querySelectorAll('nav[data-framer-name^="Phone"]'));

    for (const nav of phoneNavs) {
        const toggle = nav.querySelector('.framer-3h6ajo[data-framer-name="Nav Icon"]');
        if (!toggle) continue;

        const setOpen = (open) => {
            nav.classList.toggle("dc-nav-open", open);
            toggle.setAttribute("aria-expanded", open ? "true" : "false");
        };

        toggle.setAttribute("role", "button");
        toggle.setAttribute("aria-expanded", "false");

        toggle.addEventListener("click", (e) => {
            e.preventDefault();
            setOpen(!nav.classList.contains("dc-nav-open"));
        });

        toggle.addEventListener("keydown", (e) => {
            if (e.key !== "Enter" && e.key !== " ") return;
            e.preventDefault();
            setOpen(!nav.classList.contains("dc-nav-open"));
        });

        for (const link of nav.querySelectorAll(".framer-mpwq99 a")) {
            link.addEventListener("click", () => setOpen(false));
        }
    }
}

function initFaqAccordion() {
    const items = Array.from(document.querySelectorAll("[data-dc-faq-item]"));
    for (const item of items) {
        item.setAttribute("role", "button");
        item.setAttribute("aria-expanded", "false");

        const toggle = () => {
            const open = !item.classList.contains("dc-open");
            item.classList.toggle("dc-open", open);
            item.setAttribute("aria-expanded", open ? "true" : "false");
        };

        item.addEventListener("click", (e) => {
            // Allow clicks on actual links inside the answer.
            if (e.target instanceof Element && e.target.closest("a")) return;
            toggle();
        });

        item.addEventListener("keydown", (e) => {
            if (e.key !== "Enter" && e.key !== " ") return;
            e.preventDefault();
            toggle();
        });
    }
}

function initNestedLinks() {
    // Replacement for Framer's nested-link helper.
    // Framer sometimes renders text as non-<a> elements with `data-nested-link` + `href`.
    const open = (href, rel, target) => {
        const a = document.createElement("a");
        a.href = href;
        a.rel = rel || "";
        a.target = target || "";
        document.body.appendChild(a);
        a.click();
        a.remove();
    };

    for (const el of document.querySelectorAll("[data-nested-link]")) {
        if (!(el instanceof HTMLElement)) continue;
        if (el.dataset.dcNestedLinkHydrated === "true") continue;
        el.dataset.dcNestedLinkHydrated = "true";

        const resolve = () => {
            const href = el.getAttribute("href") || el.closest("a")?.getAttribute("href") || "";
            if (!href) return null;

            const rel = el.getAttribute("rel") || el.closest("a")?.getAttribute("rel") || "";
            const target = el.getAttribute("target") || el.closest("a")?.getAttribute("target") || "";
            return { href, rel, target };
        };

        const onClick = (e) => {
            if (!(e.target instanceof Element)) return;
            if (e.target.closest("a")) return;

            const resolved = resolve();
            if (!resolved) return;

            e.preventDefault();
            e.stopPropagation();

            const isApple = /Mac|iPod|iPhone|iPad/u.test(navigator.userAgent);
            const newTab = isApple ? e.metaKey : e.ctrlKey;
            if (newTab) {
                open(resolved.href, "", "_blank");
                return;
            }

            open(resolved.href, resolved.rel, resolved.target);
        };

        const onAuxClick = (e) => {
            const resolved = resolve();
            if (!resolved) return;
            e.preventDefault();
            e.stopPropagation();
            open(resolved.href, "", "_blank");
        };

        const onKeyDown = (e) => {
            if (e.key !== "Enter") return;
            const resolved = resolve();
            if (!resolved) return;
            e.preventDefault();
            e.stopPropagation();
            open(resolved.href, resolved.rel, resolved.target);
        };

        el.style.cursor = el.style.cursor || "pointer";
        el.addEventListener("click", onClick);
        el.addEventListener("auxclick", onAuxClick);
        el.addEventListener("keydown", onKeyDown);
    }
}

function getFirstPageEmail() {
    const mailto = document.querySelector('a[href^="mailto:"]');
    if (mailto) {
        const href = mailto.getAttribute("href") || "";
        return href.slice("mailto:".length);
    }

    const protectedLink = document.querySelector('a[href^="/cdn-cgi/l/email-protection#"], a[href^="cdn-cgi/l/email-protection#"]');
    if (protectedLink) {
        const href = protectedLink.getAttribute("href") || "";
        const hashIndex = href.indexOf("#");
        if (hashIndex !== -1) {
            return decodeCloudflareEmail(href.slice(hashIndex + 1));
        }
    }

    const cf = document.querySelector("[data-cfemail]");
    if (cf) {
        return decodeCloudflareEmail(cf.getAttribute("data-cfemail") || "");
    }

    return null;
}

function initContactFormMailto() {
    const form = document.querySelector("form.framer-ppn7j8");
    if (!form) return;

    // Prefer a decoded mailto target; fallback to decoding Cloudflare protection.
    const to = getFirstPageEmail();
    if (!to) return;

    form.addEventListener("submit", (e) => {
        e.preventDefault();

        const get = (name) => {
            const input = form.querySelector(`[name="${CSS.escape(name)}"]`);
            return (input && "value" in input) ? String(input.value).trim() : "";
        };

        const getAny = (names) => {
            for (const n of names) {
                const v = get(n);
                if (v) return v;
            }
            return "";
        };

        const name = getAny(["Name", "name"]);
        const email = getAny(["Email", "email"]);
        const location = getAny(["Location", "location"]);
        const message = getAny(["Message", "message", "comments", "details", "description", "notes", "remarks", "feedback"]);
        const subject = getAny(["subject", "Subject", "title", "Title"]) || "Website enquiry";

        const bodyLines = [
            `Name: ${name || ""}`,
            `Email: ${email || ""}`,
            `Location: ${location || ""}`,
            "",
            "Message:",
            message || "",
        ];

        const url = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyLines.join("\n"))}`;
        window.location.href = url;
    });
}

document.addEventListener("DOMContentLoaded", () => {
    decodeEmailProtectionLinks();
    rewriteOriginalSizes();
    initContactStepSequence();
    initHomeHeroSequence();
    unhideFramerAppearElements();
    initMobileNav();
    initFaqAccordion();
    initNestedLinks();
    initContactFormMailto();
});
