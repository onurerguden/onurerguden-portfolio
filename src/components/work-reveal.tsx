"use client";
import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
export default function WorkReveal({children}:{children:React.ReactNode}) {
 const ref=useRef<HTMLDivElement>(null);
 const reduce=useReducedMotion();
 const {scrollYProgress}=useScroll({target:ref,offset:["start end","start 0.25"]});
 const scale=useTransform(scrollYProgress,[0,1],[0.96,1]);
 return <motion.div ref={ref} style={{scale:reduce?1:scale,transformOrigin:"center top"}}>{children}</motion.div>;
}
