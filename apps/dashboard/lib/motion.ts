export const pageTransition = {
  duration: 0.36,
  ease: [0.22, 1, 0.36, 1] as const,
};

export const pageMotion = {
  initial: { opacity: 0, y: 10, filter: 'blur(6px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -8, filter: 'blur(4px)' },
  transition: pageTransition,
};

export const feedItemMotion = {
  initial: { opacity: 0, x: -16, scale: 0.985 },
  animate: { opacity: 1, x: 0, scale: 1 },
  exit: { opacity: 0, x: 12, scale: 0.985 },
  transition: { duration: 0.26, ease: [0.22, 1, 0.36, 1] as const },
};

export const listStagger = {
  animate: {
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.03,
    },
  },
};
