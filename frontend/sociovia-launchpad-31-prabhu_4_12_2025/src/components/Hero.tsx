import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Zap, TrendingUp, Users } from "lucide-react";
import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";

// Balanced Neural Network Background - Visible but not dominating
const NeuralNetworkBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    interface Node {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      pulsePhase: number;
      colorType: 'green' | 'indigo' | 'black'; // Node color type
    }

    let nodes: Node[] = [];
    let width = window.innerWidth;
    let height = window.innerHeight;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      initNodes();
    };

    const initNodes = () => {
      nodes = [];
      // Moderate number of nodes
      const nodeCount = Math.min(80, Math.floor((width * height) / 16000));

      for (let i = 0; i < nodeCount; i++) {
        // Randomly assign color: 50% green, 30% indigo, 20% black
        const rand = Math.random();
        let colorType: 'green' | 'indigo' | 'black' = 'green';
        if (rand > 0.7) colorType = 'black';
        else if (rand > 0.5) colorType = 'indigo';

        nodes.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.2,
          vy: (Math.random() - 0.5) * 0.2,
          radius: Math.random() * 2.5 + 1.5,
          pulsePhase: Math.random() * Math.PI * 2,
          colorType,
        });
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      const time = Date.now() * 0.001;
      const mouse = mouseRef.current;

      // Center of the screen for radial fade
      const centerX = width / 2;
      const centerY = height / 2;
      // Max distance from center to edge (diagonal)
      const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);

      nodes.forEach((node, i) => {
        // Gentle floating
        node.x += node.vx + Math.sin(time * 0.4 + node.pulsePhase) * 0.1;
        node.y += node.vy + Math.cos(time * 0.25 + node.pulsePhase) * 0.1;

        // Mouse interaction
        const dx = mouse.x - node.x;
        const dy = mouse.y - node.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 150 && dist > 0) {
          const force = (150 - dist) / 150 * 0.01;
          node.x -= (dx / dist) * force * 6;
          node.y -= (dy / dist) * force * 6;
        }

        // Boundary wrapping
        if (node.x < -30) node.x = width + 30;
        if (node.x > width + 30) node.x = -30;
        if (node.y < -30) node.y = height + 30;
        if (node.y > height + 30) node.y = -30;

        // Calculate distance from center for opacity fade
        // Use a threshold-based approach: invisible in center zone, bright at edges
        const distFromCenter = Math.sqrt(
          Math.pow(node.x - centerX, 2) + Math.pow(node.y - centerY, 2)
        );
        // Normalize distance (0 = center, 1 = edge)
        const normalizedDist = distFromCenter / maxDist;
        // Threshold at 40% from center - neurons start appearing after this point
        // Below 40%: nearly invisible (0.02), Above 40%: rapidly increase to full brightness
        let opacityFactor: number;
        if (normalizedDist < 0.4) {
          // Center zone - very faded
          opacityFactor = 0.02;
        } else {
          // Edge zone - bright and clear, scale from 0.4 to 1.0 → opacity 0.3 to 1.0
          opacityFactor = 0.3 + ((normalizedDist - 0.4) / 0.6) * 0.7;
        }

        // Draw connections - faded in center, normal at edges
        nodes.forEach((other, j) => {
          if (i >= j) return;

          const connDx = node.x - other.x;
          const connDy = node.y - other.y;
          const connDist = Math.sqrt(connDx * connDx + connDy * connDy);

          if (connDist < 140) {
            // Calculate connection midpoint distance from center
            const midX = (node.x + other.x) / 2;
            const midY = (node.y + other.y) / 2;
            const midDistFromCenter = Math.sqrt(
              Math.pow(midX - centerX, 2) + Math.pow(midY - centerY, 2)
            );
            const connOpacityFactor = 0.15 + (midDistFromCenter / maxDist) * 0.85;

            // Base alpha adjusted by position
            const alpha = (1 - connDist / 140) * 0.3 * connOpacityFactor;

            // Connection color based on node types
            let connectionColor = 'rgba(16, 185, 129, ' + alpha + ')'; // green default
            if (node.colorType === 'indigo' || other.colorType === 'indigo') {
              connectionColor = 'rgba(99, 102, 241, ' + alpha + ')'; // indigo
            } else if (node.colorType === 'black' || other.colorType === 'black') {
              connectionColor = 'rgba(30, 30, 30, ' + alpha + ')'; // dark
            }

            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(other.x, other.y);
            ctx.strokeStyle = connectionColor;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        });

        // Get colors based on node type
        let nodeColor = { r: 16, g: 185, b: 129 }; // green
        if (node.colorType === 'indigo') nodeColor = { r: 99, g: 102, b: 241 };
        else if (node.colorType === 'black') nodeColor = { r: 30, g: 30, b: 30 };

        // Draw node with subtle glow
        const pulse = Math.sin(time * 1.8 + node.pulsePhase) * 0.2 + 1;
        const nodeRadius = node.radius * pulse;

        // Soft glow - adjusted by position (faded at center, normal at edges)
        const glowGradient = ctx.createRadialGradient(
          node.x, node.y, 0,
          node.x, node.y, nodeRadius * 4
        );
        glowGradient.addColorStop(0, `rgba(${nodeColor.r}, ${nodeColor.g}, ${nodeColor.b}, ${0.25 * opacityFactor})`);
        glowGradient.addColorStop(0.5, `rgba(${nodeColor.r}, ${nodeColor.g}, ${nodeColor.b}, ${0.1 * opacityFactor})`);
        glowGradient.addColorStop(1, `rgba(${nodeColor.r}, ${nodeColor.g}, ${nodeColor.b}, 0)`);

        ctx.beginPath();
        ctx.arc(node.x, node.y, nodeRadius * 4, 0, Math.PI * 2);
        ctx.fillStyle = glowGradient;
        ctx.fill();

        // Core node - adjusted by position (faded at center, normal at edges)
        ctx.beginPath();
        ctx.arc(node.x, node.y, nodeRadius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${nodeColor.r}, ${nodeColor.g}, ${nodeColor.b}, ${0.7 * opacityFactor})`;
        ctx.fill();
      });

      animationRef.current = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize);
    canvas.addEventListener("mousemove", handleMouseMove);
    draw();

    return () => {
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-auto"
    />
  );
};

const Hero = () => {
  return (
    <section className="relative min-h-screen overflow-hidden bg-white">
      {/* Neural Network Background */}
      <NeuralNetworkBackground />

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-6xl mx-auto text-center">
          {/* Logo */}
          <div className="mb-6">
            <img
              src={logo}
              alt="Sociovia Technologies"
              className="mx-auto h-20 md:h-24 w-auto"
            />
          </div>



          {/* Main Heading */}
          <h1 className="text-3xl md:text-4xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Where Marketing Meets
            <br />
            <span className="text-primary">
              AI & Automation
            </span>
          </h1>

          {/* Subheading */}
          <p className="text-base md:text-lg text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed">
            Revolutionizing ad automation and CRM for small businesses with AI-powered solutions.
            Build, optimize, and scale your marketing effortlessly.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
            <Link to="/signup">
              <Button
                size="lg"
                className="group relative bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-7 text-lg font-semibold rounded-2xl shadow-xl shadow-indigo-500/30 hover:shadow-2xl hover:shadow-indigo-600/40 transition-all duration-300 hover:-translate-y-1"
              >
                <span className="relative z-10 flex items-center">
                  Get Started Now!
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </span>
              </Button>
            </Link>
            <Link to="/signup">
              <Button
                variant="outline"
                size="lg"
                className="border-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-400 px-10 py-7 text-lg font-semibold rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-500/20"
              >
                Sign In
              </Button>
            </Link>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-4xl mx-auto">
            <div className="group bg-white/90 backdrop-blur-sm border border-primary/20 rounded-2xl p-6 shadow-lg hover:shadow-xl hover:shadow-primary/15 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30">
              <div className="flex items-center justify-center gap-3 mb-2">
                <div className="p-2.5 bg-primary/10 rounded-xl group-hover:scale-110 transition-transform">
                  <Zap className="w-5 h-5 text-primary" />
                </div>
                <span className="text-xl font-bold text-primary">AI-Powered</span>
              </div>
              <p className="text-sm text-gray-600">Smart Automation</p>
            </div>
            <div className="group bg-white/90 backdrop-blur-sm border border-primary/20 rounded-2xl p-6 shadow-lg hover:shadow-xl hover:shadow-primary/15 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30">
              <div className="flex items-center justify-center gap-3 mb-2">
                <div className="p-2.5 bg-primary/10 rounded-xl group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <span className="text-xl font-bold text-primary">24/7</span>
              </div>
              <p className="text-sm text-gray-600">Campaign Optimization</p>
            </div>
            <div className="group bg-white/90 backdrop-blur-sm border border-primary/20 rounded-2xl p-6 shadow-lg hover:shadow-xl hover:shadow-primary/15 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30">
              <div className="flex items-center justify-center gap-3 mb-2">
                <div className="p-2.5 bg-primary/10 rounded-xl group-hover:scale-110 transition-transform">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <span className="text-xl font-bold text-primary">Direct CRM</span>
              </div>
              <p className="text-sm text-gray-600">Lead Integration</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;