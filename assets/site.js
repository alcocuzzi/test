/**
 * Custom reveal logic for Daniela Cocuzzi website
 */

function splitIntoWords(element) {
    const text = element.textContent.trim();
    const words = text.split(/\s+/);
    element.innerHTML = "";
    const wordSpans = words.map(word => {
        const span = document.createElement("span");
        span.textContent = word + " ";
        span.className = "dc-word";
        element.appendChild(span);
        return span;
    });
    return wordSpans;
}

async function revealSequence(steps) {
    for (const step of steps) {
        if (step.type === "word-by-word") {
            const words = splitIntoWords(step.el);
            step.el.style.opacity = "1";
            for (const word of words) {
                word.classList.add("dc-reveal-visible");
                await new Promise(r => setTimeout(r, step.interval || 150));
            }
        } else if (step.type === "entire") {
            step.el.classList.add("dc-reveal-visible");
            step.el.style.opacity = "1";
            await new Promise(r => setTimeout(r, step.delayAfter || 300));
        } else if (step.type === "staggered") {
            for (const el of step.elements) {
                el.classList.add("dc-reveal-visible");
                el.style.opacity = "1";
                await new Promise(r => setTimeout(r, step.interval || 500));
            }
        }
    }
}

function initHomeSequence() {
    const h1 = document.querySelector('header#hero h1');
    const line2 = document.querySelector('.framer-1ranmkn');
    const line3 = document.querySelector('.framer-1y38jqh');

    if (!h1 || !line2 || !line3) return;

    // Prep lines
    [line2, line3].forEach(el => el.classList.add('dc-reveal-hidden'));

    revealSequence([
        { type: "word-by-word", el: h1, interval: 200 },
        { type: "entire", el: line2, delayAfter: 400 },
        { type: "entire", el: line3 }
    ]);
}

function initContactSequence() {
    const h1 = document.querySelector('header#hero h1');
    const intro = document.querySelector('.framer-ikkm1v');
    const methodHeading = document.querySelector('.framer-1s4648s');
    const buttons = Array.from(document.querySelectorAll('.framer-18e7mi0 > div'));

    if (!h1 || !intro || !methodHeading) return;

    // Prep
    [intro, methodHeading, ...buttons].forEach(el => el.classList.add('dc-reveal-hidden'));

    revealSequence([
        { type: "word-by-word", el: h1, interval: 200 },
        { type: "entire", el: intro, delayAfter: 400 },
        { type: "entire", el: methodHeading, delayAfter: 400 },
        { type: "staggered", elements: buttons, interval: 500 }
    ]);
}

document.addEventListener("DOMContentLoaded", () => {
    const path = window.location.pathname;
    if (path.includes("contact")) {
        initContactSequence();
    } else {
        initHomeSequence();
    }
});
