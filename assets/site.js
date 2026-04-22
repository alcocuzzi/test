
function animateWords(element, delay = 100) {
  return new Promise((resolve) => {
    const text = element.innerText;
    element.innerHTML = "";

    const words = text.split(" ");
    words.forEach((word, i) => {
      const span = document.createElement("span");
      span.classList.add("word");
      span.innerText = word + " ";
      element.appendChild(span);

      setTimeout(() => {
        span.classList.add("visible");
        if (i === words.length - 1) resolve();
      }, i * delay);
    });

    element.classList.remove("hidden");
  });
}

function showElement(element, delay = 500) {
  return new Promise((resolve) => {
    setTimeout(() => {
      element.classList.remove("hidden");
      element.classList.add("visible");
      resolve();
    }, delay);
  });
}

function showSequence(elements, interval = 500) {
  return new Promise((resolve) => {
    elements.forEach((el, i) => {
      setTimeout(() => {
        el.classList.remove("hidden");
        el.classList.add("visible");
        if (i === elements.length - 1) resolve();
      }, i * interval);
    });
  });
}

async function runHomeAnimation() {
  const l1 = document.querySelector("#line1");
  const l2 = document.querySelector("#line2");
  const l3 = document.querySelector("#line3");

  if (!l1) return;

  await animateWords(l1, 120);
  await showElement(l2, 500);
  await showElement(l3, 500);
}

async function runContactAnimation() {
  const t = document.querySelector("#contact-title");
  const p1 = document.querySelector("#contact-text1");
  const p2 = document.querySelector("#contact-text2");
  const items = document.querySelectorAll(".contact-item");

  if (!t) return;

  await animateWords(t, 120);
  await showElement(p1, 500);
  await showElement(p2, 500);
  await showSequence(items, 500);
}

document.addEventListener("DOMContentLoaded", () => {
  runHomeAnimation();
  runContactAnimation();
});
