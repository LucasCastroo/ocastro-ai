import { useEffect } from 'react';
import { motion, useSpring, useMotionValue } from 'framer-motion';

export const MouseAura = () => {
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    // Smooth spring animation for the aura movement
    const springConfig = { damping: 20, stiffness: 100, mass: 0.5 };
    const x = useSpring(mouseX, springConfig);
    const y = useSpring(mouseY, springConfig);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            // Subtract half the size (400px / 2 = 200px) to center it
            mouseX.set(e.clientX - 200);
            mouseY.set(e.clientY - 200);
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [mouseX, mouseY]);

    return (
        <motion.div
            className="fixed top-0 left-0 w-[400px] h-[400px] rounded-full pointer-events-none z-0 mix-blend-screen"
            style={{
                x,
                y,
                background: 'radial-gradient(circle, rgba(168,85,247,0.4) 0%, rgba(168,85,247,0.1) 40%, transparent 70%)',
                filter: 'blur(60px)',
            }}
        />
    );
};
