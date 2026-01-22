
import React, { useEffect, useState, useRef } from 'react';

// Configuration
const NODE_COUNT = 24;
const RADIUS = 15;
const ROTATION_SPEED_X = 0.003;
const ROTATION_SPEED_Y = 0.005;
const CONNECTION_DISTANCE = 15;
const INTERACTION_RADIUS = 18;
const INTERACTION_STRENGTH = 0.04;
const HEATING_RATE = 0.1;
const COOLING_RATE = 0.002;

interface Point3D { x: number; y: number; z: number; id: number; heat: number; }
interface MousePos { x: number; y: number; active: boolean; }

export const NeuralLogo: React.FC = () => {
    const [points, setPoints] = useState<Point3D[]>([]);
    const requestRef = useRef<number | null>(null);
    const mouseRef = useRef<MousePos>({ x: 0, y: 0, active: false });
    const containerRef = useRef<HTMLDivElement>(null);

    // Initial Setup
    useEffect(() => {
        const initialPoints: Point3D[] = [];
        const phi = Math.PI * (3 - Math.sqrt(5)); 
        for (let i = 0; i < NODE_COUNT; i++) {
            const y = 1 - (i / (NODE_COUNT - 1)) * 2; 
            const radius = Math.sqrt(1 - y * y);
            const theta = phi * i;
            initialPoints.push({
                x: Math.cos(theta) * radius * RADIUS,
                y: y * RADIUS,
                z: Math.sin(theta) * radius * RADIUS,
                id: i,
                heat: 0
            });
        }
        setPoints(initialPoints);
    }, []);

    const animate = () => {
        const cx = Math.cos(ROTATION_SPEED_X);
        const sx = Math.sin(ROTATION_SPEED_X);
        const cy = Math.cos(ROTATION_SPEED_Y);
        const sy = Math.sin(ROTATION_SPEED_Y);

        setPoints(prevPoints => prevPoints.map(p => {
            // 1. Rotation
            let x = p.x * cy - p.z * sy;
            let z = p.x * sy + p.z * cy;
            let y = p.y * cx - z * sx;
            z = p.y * sx + z * cx;

            // 2. Heat Simulation
            let newHeat = p.heat;
            let underPressure = false;

            if (mouseRef.current.active) {
                 const dx = x - mouseRef.current.x;
                 const dy = y - mouseRef.current.y;
                 const dist = Math.sqrt(dx*dx + dy*dy);
                 if (dist < INTERACTION_RADIUS) {
                     underPressure = true;
                 }
            }

            if (underPressure) {
                newHeat = Math.min(1, newHeat + HEATING_RATE);
            } else {
                newHeat = Math.max(0, newHeat - COOLING_RATE);
            }

            return { x, y, z, id: p.id, heat: newHeat };
        }));

        requestRef.current = requestAnimationFrame(animate);
    };

    // Helper to apply mouse physics non-destructively
    const getDeformedPos = (p: Point3D) => {
        let { x, y } = p;
        
        if (mouseRef.current.active) {
            const dx = x - mouseRef.current.x;
            const dy = y - mouseRef.current.y;
            const dist = Math.sqrt(dx*dx + dy*dy);

            if (dist < INTERACTION_RADIUS && dist > 0.1) {
                const falloff = Math.pow(1 - dist / INTERACTION_RADIUS, 3);
                const force = falloff * INTERACTION_STRENGTH * RADIUS;
                
                const nx = dx / dist;
                const ny = dy / dist;
                
                x += nx * force;
                y += ny * force;
            }
        }
        return { x, y, z: p.z };
    };

    useEffect(() => {
        requestRef.current = requestAnimationFrame(animate);
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, []);

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        // Calculate mouse relative to center of the 40x40 container
        // rect.width depends on CSS (w-10 = 40px), but calculating precise offset is safer
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const x = e.clientX - rect.left - centerX;
        const y = e.clientY - rect.top - centerY;
        
        // Scale mouse coords to match SVG coordinate space (approx 1:1 if 40px)
        // If the div is scaled, we might need a multiplier. Assuming 1:1 for now.
        mouseRef.current = { x, y, active: true };
    };

    const handleMouseLeave = () => {
        mouseRef.current = { x: 0, y: 0, active: false };
    };

    // Helper for color interpolation
    const getHeatColor = (heat: number) => {
        // Cyan: 34, 211, 238 -> Red: 239, 68, 68
        const r = Math.round(34 + (239 - 34) * heat);
        const g = Math.round(211 + (68 - 211) * heat);
        const b = Math.round(238 + (68 - 238) * heat);
        return `rgb(${r}, ${g}, ${b})`;
    }

    return (
        <div 
            ref={containerRef}
            className="relative w-10 h-10 flex items-center justify-center cursor-crosshair"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            {/* Background Glow - changes with overall heat? lets leave it subtle cyan/purple mix */}
            <div className={`absolute inset-0 bg-cyan-500/10 rounded-full blur-md transition-opacity duration-300 ${mouseRef.current.active ? 'opacity-50' : 'opacity-20'}`} />

            <svg width="40" height="40" viewBox="0 0 40 40" className="overflow-visible pointer-events-none">
                {/* CONNECTIONS */}
                {points.map((p1, i) => {
                     // We need deformed positions for lines too!
                     const d1 = getDeformedPos(p1);
                     
                     return points.slice(i + 1).map((p2) => {
                         const d2 = getDeformedPos(p2); // Compute neighbor deformed pos

                         // Calc distance on Deformed or Original? 
                         // For wireframe integrity, usually original topology. 
                         // But if we want lines to stretch, we check connection on original, draw on deformed.
                         
                         const dx_orig = p1.x - p2.x;
                         const dy_orig = p1.y - p2.y;
                         const dz_orig = p1.z - p2.z;
                         const dist_orig = Math.sqrt(dx_orig*dx_orig + dy_orig*dy_orig + dz_orig*dz_orig);

                         if (dist_orig < CONNECTION_DISTANCE) {
                             const scale1 = (60 + p1.z) / 60;
                             const scale2 = (60 + p2.z) / 60;
                             const opacity = Math.min(1, Math.max(0.1, ((p1.z + p2.z)/2 + RADIUS) / (2 * RADIUS))); 
                             
                             // Line color average of both nodes?
                             const heatAvg = (p1.heat + p2.heat) / 2;
                             const lineColor = getHeatColor(heatAvg); // Cyan to Red line

                             return (
                                 <line
                                    key={`${p1.id}-${p2.id}`}
                                    x1={20 + d1.x} y1={20 + d1.y}
                                    x2={20 + d2.x} y2={20 + d2.y}
                                    stroke={lineColor} 
                                    strokeWidth={0.5 * ((scale1+scale2)/2)}
                                    strokeOpacity={opacity * 0.6}
                                 />
                             );
                         }
                         return null;
                     });
                })}

                {/* CENTRAL CORE - pulses red if active */}
                <circle cx="20" cy="20" r="2" fill={mouseRef.current.active ? "#fca5a5" : "#fff"} className="animate-pulse" opacity="0.8" />

                {/* NODES */}
                {points.map((p) => {
                     const d = getDeformedPos(p);
                     const scale = (60 + p.z) / 60; 
                     const opacity = Math.max(0.3, (p.z + RADIUS) / (2 * RADIUS));

                     return (
                         <circle
                            key={p.id}
                            cx={20 + d.x}
                            cy={20 + d.y}
                            r={1.2 * scale}
                            fill={getHeatColor(p.heat)} 
                            fillOpacity={opacity}
                         />
                     );
                })}
            </svg>
        </div>
    );
};
