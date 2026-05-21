const animatedItems = document.querySelectorAll(".feature-card, .flow-step, .hero-card");

window.addEventListener("mousemove", (event) => {
  const x = event.clientX / window.innerWidth - 0.5;
  const y = event.clientY / window.innerHeight - 0.5;

  animatedItems.forEach((item, index) => {
    const depth = (index % 3) + 1;
    item.style.transform = `translate3d(${x * depth * 3}px, ${y * depth * 3}px, 0)`;
  });
});
