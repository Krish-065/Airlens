import { motion } from "framer-motion";
import { easeOutExpo } from "./motion";
import { ReactNode } from "react";

export default function Reveal({ children, delay = 0, scale = 1, className = "" }: { children: ReactNode, delay?: number, scale?: number, className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.9, delay, ease: easeOutExpo }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
