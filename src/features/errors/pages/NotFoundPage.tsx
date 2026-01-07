import { Button, Container, Typography, Box } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";

import MainLayout from "@/app/layouts/MainLayout";

// Particle 404 component
function Particle404() {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const particlesRef = useRef<
        {
            x: number;
            y: number;
            ox: number;
            oy: number;
            vx: number;
            vy: number;
            alpha: number;
        }[]
    >([]);
    const [hovered, setHovered] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const width = 1040;
        const height = 480;

        canvas.width = width;
        canvas.height = height;

        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = "#1976d2";
        ctx.font = "bold 500px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("404", width / 2, height / 2 + 20);

        // Build particles once
        if (particlesRef.current.length === 0) {
            const imageData = ctx.getImageData(0, 0, width, height).data;

            for (let y = 0; y < height; y += 4) {
                for (let x = 0; x < width; x += 4) {
                    const i = (y * width + x) * 4;
                    if (imageData[i + 3] > 0) {
                        particlesRef.current.push({
                            x,
                            y,
                            ox: x,
                            oy: y,
                            vx: (Math.random() - 0.5) * 10,
                            vy: (Math.random() - 0.5) * 10,
                            alpha: 1,
                        });
                    }
                }
            }
        }

        let raf: number;

        const animate = () => {
            ctx.clearRect(0, 0, width, height);

            let stillAnimating = false;

            particlesRef.current.forEach((p) => {
                if (hovered) {
                    // Explode
                    p.x += p.vx;
                    p.y += p.vy;
                    p.alpha = Math.max(p.alpha - 0.02, 0);
                    stillAnimating = true;
                } else {
                    // Rebuild
                    p.x += (p.ox - p.x) * 0.08;
                    p.y += (p.oy - p.y) * 0.08;
                    p.alpha = Math.min(p.alpha + 0.02, 1);

                    if (
                        Math.abs(p.x - p.ox) > 0.5 ||
                        Math.abs(p.y - p.oy) > 0.5
                    ) {
                        stillAnimating = true;
                    }
                }

                ctx.fillStyle = `rgba(25,118,210,${p.alpha})`;
                ctx.fillRect(p.x, p.y, 3, 3);
            });

            if (stillAnimating) {
                raf = requestAnimationFrame(animate);
            } else if (!hovered) {
                // Final clean redraw
                ctx.clearRect(0, 0, width, height);
                ctx.fillStyle = "#1976d2";
                ctx.font = "bold 500px Arial";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText("404", width / 2, height / 2 + 20);
            }
        };

        animate();

        return () => cancelAnimationFrame(raf);
    }, [hovered]);

    return (
        <Box
            sx={{
                width: 1040,
                height: 480,
                cursor: "pointer",
                mx: "auto",
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <canvas ref={canvasRef} />
        </Box>
    );
}



export default function NotFoundPage() {
    const navigate = useNavigate();

    return (
        <MainLayout>
            <Container sx={{ mt: 8, textAlign: "center" }}>
                {/* Replaced 404 */}
                <Particle404 />

                <Typography variant="h6" gutterBottom>
                    Page not found
                </Typography>

                <Typography sx={{ mb: 4 }}>
                    The page you are looking for does not exist or has been moved.
                </Typography>

                <Button variant="contained" onClick={() => navigate("/")}>
                    Go to Home
                </Button>
            </Container>
        </MainLayout>
    );
}
