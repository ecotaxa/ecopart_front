import { useEffect, useMemo, useRef } from "react";
import { useTheme } from "@mui/material/styles";
import { ecotaxaColors } from "@/theme";

/**
 * Interactive "particle cloud" for the landing hero.
 *
 * Draws a field of slowly drifting, plankton-like particles (a nod to EcoPart's
 * marine-particle imaging domain) onto a full-bleed <canvas>. Nearby particles
 * link into a constellation network; the pointer disturbs the field, parting
 * particles like a current in water and drawing glowing threads toward the
 * cursor. Inspired by the "particles.js / constellation" genre of web design
 * experiences, tuned to the teal EcoPart palette.
 *
 * Implementation notes:
 *  - Pure canvas 2D + requestAnimationFrame, no dependencies.
 *  - Particle count scales with viewport area (capped for perf).
 *  - Honours `prefers-reduced-motion`: renders a single calm static frame,
 *    no animation loop and no pointer reaction.
 *  - DPR-aware for crisp rendering; cleans up rAF + listeners on unmount.
 */

interface Particle {
    x: number;
    y: number;
    /** constant drift velocity */
    vx0: number;
    vy0: number;
    /** decaying impulse velocity (from pointer) */
    ox: number;
    oy: number;
    r: number;
    /** depth 0..1, closer particles are bigger, faster, react more */
    z: number;
    phase: number;
    drift: number;
}

/** "#rrggbb" -> "r, g, b" for use in rgba() strings. */
function toRgb(hex: string): string {
    const h = hex.replace("#", "");
    const n = parseInt(
        h.length === 3
            ? h
                  .split("")
                  .map((c) => c + c)
                  .join("")
            : h,
        16,
    );
    return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

export default function ParticleField() {
    const theme = useTheme();
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    // Derive brand colours from the theme so the field always matches the
    // active palette, and mirror them into a ref so the long-lived animation
    // loop can read the latest values without re-subscribing.
    //
    // Monochromatic teal, straight from the EcoPart brand scale (same family as
    // the TopBar gradient) so the field reads as unmistakably on-brand: distant
    // particles use a light airy teal, the closest ones the solid brand teal,
    // and the network links the brand teal too.
    const themeColors = useMemo(
        () => ({
            particle: toRgb(ecotaxaColors.secondblue[300]), // #6ec8cf distant, light
            particleAlt: toRgb(theme.palette.primary.main), // #207171 close
            link: toRgb(theme.palette.primary.main), // #207171 links
        }),
        [theme.palette.primary.main],
    );
    const colors = useRef(themeColors);
    useEffect(() => {
        colors.current = themeColors;
    }, [themeColors]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const reducedMotion = window.matchMedia(
            "(prefers-reduced-motion: reduce)",
        ).matches;

        let width = 0;
        let height = 0;
        let dpr = 1;
        let particles: Particle[] = [];
        let rafId = 0;

        // Pointer state, in CSS pixels relative to the canvas. null = no pointer.
        const pointer = { x: 0, y: 0, active: false };

        const LINK_DIST = 130; // px within which two particles connect
        const POINTER_RADIUS = 170; // px of pointer influence

        const rand = (min: number, max: number) =>
            min + Math.random() * (max - min);

        const makeParticles = () => {
            // ~1 particle per 11k px², capped so dense/large screens stay smooth.
            const count = Math.min(
                150,
                Math.max(30, Math.floor((width * height) / 11000)),
            );
            particles = Array.from({ length: count }, () => {
                const z = rand(0.25, 1);
                return {
                    x: rand(0, width),
                    y: rand(0, height),
                    vx0: rand(-0.18, 0.18) * z,
                    vy0: rand(-0.18, 0.18) * z,
                    ox: 0,
                    oy: 0,
                    r: rand(1.1, 3.2) * z + 0.6,
                    z,
                    phase: rand(0, Math.PI * 2),
                    drift: rand(0.004, 0.012),
                };
            });
        };

        const resize = () => {
            const rect = canvas.getBoundingClientRect();
            width = rect.width;
            height = rect.height;
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = Math.round(width * dpr);
            canvas.height = Math.round(height * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            makeParticles();
            if (reducedMotion) draw(); // repaint the static frame at new size
        };

        const step = (p: Particle) => {
            // Gentle organic wobble on top of constant drift.
            p.phase += p.drift;
            const wobbleX = Math.cos(p.phase) * 0.14;
            const wobbleY = Math.sin(p.phase * 0.9) * 0.14;

            // Pointer "current": push particles away, scaled by depth & closeness.
            if (pointer.active) {
                const dx = p.x - pointer.x;
                const dy = p.y - pointer.y;
                const dist = Math.hypot(dx, dy);
                if (dist > 0.01 && dist < POINTER_RADIUS) {
                    const force = (1 - dist / POINTER_RADIUS) * 0.9 * p.z;
                    p.ox += (dx / dist) * force;
                    p.oy += (dy / dist) * force;
                }
            }

            // Impulse decays back toward calm drift.
            p.ox *= 0.9;
            p.oy *= 0.9;

            p.x += p.vx0 + p.ox + wobbleX;
            p.y += p.vy0 + p.oy + wobbleY;

            // Wrap around edges with a margin for a seamless, endless field.
            const m = 20;
            if (p.x < -m) p.x = width + m;
            else if (p.x > width + m) p.x = -m;
            if (p.y < -m) p.y = height + m;
            else if (p.y > height + m) p.y = -m;
        };

        const draw = () => {
            const c = colors.current;
            ctx.clearRect(0, 0, width, height);

            // Links between nearby particles (drawn first, behind the dots).
            for (let i = 0; i < particles.length; i++) {
                const a = particles[i];
                for (let j = i + 1; j < particles.length; j++) {
                    const b = particles[j];
                    const dx = a.x - b.x;
                    const dy = a.y - b.y;
                    const d2 = dx * dx + dy * dy;
                    if (d2 > LINK_DIST * LINK_DIST) continue;
                    const dist = Math.sqrt(d2);
                    const t = 1 - dist / LINK_DIST;

                    // Brighten links whose midpoint is near the pointer.
                    let alpha = t * 0.22;
                    if (pointer.active) {
                        const mx = (a.x + b.x) / 2;
                        const my = (a.y + b.y) / 2;
                        const pd = Math.hypot(mx - pointer.x, my - pointer.y);
                        if (pd < POINTER_RADIUS) {
                            alpha += (1 - pd / POINTER_RADIUS) * t * 0.5;
                        }
                    }
                    ctx.strokeStyle = `rgba(${c.link}, ${alpha})`;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                    ctx.stroke();
                }
            }

            // Threads reaching from the pointer toward the closest particles.
            if (pointer.active) {
                for (const p of particles) {
                    const dist = Math.hypot(p.x - pointer.x, p.y - pointer.y);
                    if (dist < POINTER_RADIUS) {
                        const t = 1 - dist / POINTER_RADIUS;
                        ctx.strokeStyle = `rgba(${c.link}, ${t * 0.35})`;
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(pointer.x, pointer.y);
                        ctx.lineTo(p.x, p.y);
                        ctx.stroke();
                    }
                }
            }

            // Particles: soft glow halo + solid core.
            for (const p of particles) {
                const rgb = p.z > 0.72 ? c.particleAlt : c.particle;
                ctx.fillStyle = `rgba(${rgb}, ${0.10 * p.z})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r * 2.6, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = `rgba(${rgb}, ${0.55 * p.z + 0.25})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fill();
            }
        };

        const loop = () => {
            for (const p of particles) step(p);
            draw();
            rafId = window.requestAnimationFrame(loop);
        };

        // Pointer handlers (canvas is pointerEvents:none, so listen globally)
        const setPointer = (clientX: number, clientY: number) => {
            const rect = canvas.getBoundingClientRect();
            const x = clientX - rect.left;
            const y = clientY - rect.top;
            pointer.active =
                x >= 0 && x <= rect.width && y >= 0 && y <= rect.height;
            pointer.x = x;
            pointer.y = y;
        };
        const onMouseMove = (e: MouseEvent) => setPointer(e.clientX, e.clientY);
        const onTouchMove = (e: TouchEvent) => {
            if (e.touches.length) {
                const t = e.touches[0];
                setPointer(t.clientX, t.clientY);
            }
        };
        const onLeave = () => {
            pointer.active = false;
        };

        resize();

        if (reducedMotion) {
            draw();
            const onResizeStatic = () => resize();
            window.addEventListener("resize", onResizeStatic);
            return () => window.removeEventListener("resize", onResizeStatic);
        }

        window.addEventListener("mousemove", onMouseMove, { passive: true });
        window.addEventListener("touchmove", onTouchMove, { passive: true });
        window.addEventListener("mouseout", onLeave);
        window.addEventListener("resize", resize);
        rafId = window.requestAnimationFrame(loop);

        return () => {
            window.cancelAnimationFrame(rafId);
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("touchmove", onTouchMove);
            window.removeEventListener("mouseout", onLeave);
            window.removeEventListener("resize", resize);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            aria-hidden="true"
            style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                display: "block",
                pointerEvents: "none",
            }}
        />
    );
}
