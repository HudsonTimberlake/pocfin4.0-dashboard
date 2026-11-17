// The dashboard's motion rules (design W5): one curve for arrivals, leaving faster than arriving,
// nothing over 300 ms except counting figures (600 ms), and "reduce motion" means fades only.
export const ARRIVE = [0.2, 0.8, 0.2, 1] as const;
export const COUNT_MS = 600;
