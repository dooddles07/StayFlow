import { motion, useReducedMotion } from 'framer-motion'
import type { ReactNode } from 'react'

interface AnimatedTableRowProps {
  index: number
  children: ReactNode
  className?: string
}

// Stagger caps at 12 rows so long lists don't produce a multi-second wait for the last row.
export function AnimatedTableRow({
  index,
  children,
  className,
}: AnimatedTableRowProps) {
  const reducedMotion = useReducedMotion()
  return (
    <motion.tr
      className={className}
      initial={reducedMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        reducedMotion
          ? { duration: 0 }
          : {
              duration: 0.28,
              delay: Math.min(index, 12) * 0.03,
              ease: [0.16, 1, 0.3, 1],
            }
      }
    >
      {children}
    </motion.tr>
  )
}
