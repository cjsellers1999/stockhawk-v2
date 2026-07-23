document.querySelectorAll("[data-quiz]").forEach((quiz) => {
  const feedback = quiz.querySelector("[data-feedback]");

  quiz.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      const correct = button.dataset.correct === "true";
      feedback.textContent = correct
        ? button.dataset.success
        : button.dataset.retry;
      feedback.className = correct ? "correct" : "incorrect";
    });
  });
});
