import confetti from "canvas-confetti";

const COLORS = ["#6d5ef8", "#22c55e", "#f59e0b", "#06b6d4", "#ec4899"];

/** A short, contained confetti burst — bigger every 7-day streak milestone. */
export function celebrateCheckIn(streak: number) {
  const isMilestone = streak > 0 && streak % 7 === 0;

  confetti({
    particleCount: isMilestone ? 70 : 32,
    spread: isMilestone ? 85 : 55,
    startVelocity: isMilestone ? 45 : 32,
    origin: { y: 0.7 },
    colors: COLORS,
    ticks: 200,
    disableForReducedMotion: true,
  });

  if (isMilestone) {
    setTimeout(() => {
      confetti({
        particleCount: 45,
        spread: 100,
        startVelocity: 38,
        origin: { y: 0.6 },
        colors: COLORS,
        ticks: 200,
        disableForReducedMotion: true,
      });
    }, 150);
  }
}
