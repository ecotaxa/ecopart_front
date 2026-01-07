import { Button, Container, Typography, Box } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";

import MainLayout from "@/app/layouts/MainLayout";

type Particle = {
    x: number;
    y: number;
    vx: number;
    vy: number;
    alpha: number;
};
function Particle404() {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const particlesRef = useRef<Particle[]>([]);
    const [hovered, setHovered] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // 🔴 Bigger canvas
        const width = 1040;
        const height = 480;

        canvas.width = width;
        canvas.height = height;

        // Draw static or animated text
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = "#1976d2"; // MUI primary blue
        ctx.font = "bold 500px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("404", width / 2, height / 2 + 20);

        if (!hovered) return;

        // Extract pixels for particles
        const imageData = ctx.getImageData(0, 0, width, height).data;
        particlesRef.current = [];

        for (let y = 0; y < height; y += 4) {
            for (let x = 0; x < width; x += 4) {
                const i = (y * width + x) * 4;
                if (imageData[i + 3] > 0) {
                    particlesRef.current.push({
                        x,
                        y,
                        vx: (Math.random() - 0.5) * 8,
                        vy: (Math.random() - 0.5) * 8,
                        alpha: 1,
                    });
                }
            }
        }

        let raf: number;

        const animate = () => {
            ctx.clearRect(0, 0, width, height);

            particlesRef.current.forEach((p) => {
                p.x += p.vx;
                p.y += p.vy;
                p.alpha -= 0.012;

                ctx.fillStyle = `rgba(25,118,210,${p.alpha})`;
                ctx.fillRect(p.x, p.y, 3, 3);
            });

            particlesRef.current = particlesRef.current.filter(
                (p) => p.alpha > 0
            );

            if (particlesRef.current.length > 0) {
                raf = requestAnimationFrame(animate);
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
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
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
