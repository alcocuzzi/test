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
    const line1 = h1Candidates.find((h1) => (h1.textContent || "").includes("organized life")) || null;
    if (!line1) return;

    // Mark the sequence elements so the global unhide doesn't force them visible.
    line1.setAttribute("data-dc-appear-skip", "true");
    line2.setAttribute("data-dc-appear-skip", "true");
    line3.setAttribute("data-dc-appear-skip", "true");

    const revealAppearLikeFramer = (root) => {
        if (!root) return;

        const nodes = [root, ...Array.from(root.querySelectorAll('[style*="opacity:0.001"], [style*="opacity: 0.001"], [style*="filter:blur"], [style*="filter: blur"]'))];
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
    };

    // Keep lines 2/3 hidden initially (they already are by inline styles);
    // reveal line 1 immediately, then line 2, then line 3.
    window.requestAnimationFrame(() => {
        revealAppearLikeFramer(line1);
        window.setTimeout(() => revealAppearLikeFramer(line2), 350);
        window.setTimeout(() => revealAppearLikeFramer(line3), 700);
    });
}

function initContactStepSequence() {
    const path = (window.location && window.location.pathname) ? window.location.pathname : "";
    const isContactPage = /(^|\/)contact\/?($|index\.html$)/i.test(path);
    if (!isContactPage) return;

    const step2 = document.getElementById("contact");
    if (!step2) return;

    // If the user navigates directly to #contact (e.g. from a "Let's Talk" link),
    // keep Step 2 visible immediately.
    const directToContact = (window.location.hash || "") === "#contact";
    if (directToContact) return;

    const prevDisplay = step2.style.display;
    step2.style.display = "none";

    window.setTimeout(() => {
        step2.style.display = prevDisplay;
    }, 500);
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
    // Existing markup from Framer renders the FAQ questions but omits the answers in the static HTML.
    // The answers are embedded in the `__framer__handoverData` JSON; we hydrate them here.

    const inferredItems = Array.from(document.querySelectorAll('#faq .framer-bywgyu .framer-E4aZ3[tabindex]'));
    const declaredItems = Array.from(document.querySelectorAll("[data-dc-faq-item]"));
    const items = Array.from(new Set([...declaredItems, ...inferredItems]));
    if (!items.length) return;

    const handoverScript = document.getElementById("__framer__handoverData");
    const handoverText = (handoverScript && handoverScript.textContent) ? handoverScript.textContent : "";

    const flattenStrings = (node, out) => {
        if (!node) return;
        if (typeof node === "string") {
            out.push(node);
            return;
        }
        if (Array.isArray(node)) {
            for (const v of node) flattenStrings(v, out);
        }
    };

    const handoverStrings = (() => {
        if (!handoverText) return null;
        try {
            const parsed = JSON.parse(handoverText);
            const out = [];
            flattenStrings(parsed, out);
            return out;
        } catch {
            return null;
        }
    })();

    const escapeRegExp = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const findAnswer = (question) => {
        const q = (question || "").trim();
        if (!q) return null;

        if (handoverStrings) {
            const idx = handoverStrings.indexOf(q);
            if (idx !== -1) {
                for (let i = idx + 1; i < Math.min(idx + 25, handoverStrings.length); i++) {
                    const candidate = handoverStrings[i];
                    if (typeof candidate === "string" && candidate.trim() && candidate.trim() !== q) {
                        return candidate;
                    }
                }
            }
        }

        // Fallback: search raw JSON text.
        if (handoverText) {
            const pattern = new RegExp(`${escapeRegExp(JSON.stringify(q).slice(1, -1))}",\\s*\\{\\"type\\":18,\\"value\\":\\d+\\},\\s*\\"([\\s\\S]*?)\\"`, "u");
            const m = handoverText.match(pattern);
            if (m && m[1]) {
                // Unescape common JSON escapes.
                return m[1]
                    .replace(/\\n/g, "\n")
                    .replace(/\\r/g, "\r")
                    .replace(/\\t/g, "\t")
                    .replace(/\\\"/g, '"')
                    .replace(/\\\\/g, "\\");
            }
        }

        return null;
    };

    const renderAnswerInto = (container, answerText) => {
        while (container.firstChild) container.removeChild(container.firstChild);

        const text = (answerText || "").trim();
        if (!text) return;

        const blocks = text.split(/\n\s*\n/gu).map((b) => b.trim()).filter(Boolean);
        for (const block of blocks) {
            const p = document.createElement("p");
            p.className = "framer-text framer-styles-preset-1yhjbal";
            p.setAttribute("data-styles-preset", "Iz6fkU9FB");

            const lines = block.split(/\n/gu);
            lines.forEach((line, idx) => {
                p.appendChild(document.createTextNode(line));
                if (idx < lines.length - 1) p.appendChild(document.createElement("br"));
            });

            container.appendChild(p);
        }
    };

    for (const item of items) {
        if (!(item instanceof HTMLElement)) continue;
        if (item.dataset.dcFaqHydrated === "true") continue;
        item.dataset.dcFaqHydrated = "true";

        item.setAttribute("data-dc-faq-item", "");
        item.setAttribute("role", "button");
        item.setAttribute("aria-expanded", "false");
        item.classList.remove("dc-open");

        const questionEl = item.querySelector("h3");
        const questionText = questionEl ? (questionEl.textContent || "").trim() : "";
        const answerText = findAnswer(questionText);

        let answerEl = item.querySelector("[data-dc-faq-answer]");
        if (!answerEl) {
            answerEl = document.createElement("div");
            answerEl.className = "framer-14897r4";
            answerEl.setAttribute("data-framer-component-type", "RichTextContainer");
            answerEl.setAttribute("data-dc-faq-answer", "");
            answerEl.setAttribute("style", "transform:none");

            // Insert after the top part if present, else append.
            const top = item.querySelector(":scope > .framer-2k822i");
            if (top && top.parentElement === item) {
                top.insertAdjacentElement("afterend", answerEl);
            } else {
                item.appendChild(answerEl);
            }
        }

        renderAnswerInto(answerEl, answerText);

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
