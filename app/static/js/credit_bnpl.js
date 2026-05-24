document.addEventListener("DOMContentLoaded", function () {
  const flipCards = document.querySelectorAll(".flip-card");

  flipCards.forEach((card) => {
    card.addEventListener("click", function () {
      card.classList.toggle("is-flipped");
    });

    card.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        card.classList.toggle("is-flipped");
      }
    });
  });
});
