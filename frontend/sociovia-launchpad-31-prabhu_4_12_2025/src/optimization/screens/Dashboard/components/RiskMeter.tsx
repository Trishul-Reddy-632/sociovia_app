
import React from 'react';

// A simple SVG gauge component
export function RiskMeter({ score, label }: { score: number, label: string }) {
    // score 0 (safe) to 100 (risky)
    const radius = 40;
    const stroke = 8;
    const normalizedScore = Math.max(0, Math.min(100, score));
    const circumference = normalizedScore / 100 * (Math.PI * radius); // Half circle

    const color = normalizedScore < 30 ? '#10b981' : normalizedScore < 70 ? '#3b82f6' : '#f59e0b';

    return (
        <div className="flex flex-col items-center justify-end relative h-[60px] w-[100px]">
            <svg className="w-full h-full overflow-visible">
                {/* Background Track */}
                <path
                    d={`M 10 50 A ${radius} ${radius} 0 0 1 90 50`}
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth={stroke}
                    strokeLinecap="round"
                />
                {/* Value Track */}
                <path
                    d={`M 10 50 A ${radius} ${radius} 0 0 1 90 50`}
                    fill="none"
                    stroke={color}
                    strokeWidth={stroke}
                    strokeLinecap="round"
                    strokeDasharray={`${Math.PI * radius} ${Math.PI * radius}`}
                    strokeDashoffset={Math.PI * radius - (normalizedScore / 100) * (Math.PI * radius)}
                    className="transition-all duration-1000 ease-out"
                />
            </svg>
            <div className="absolute bottom-0 text-center">
                <div className="text-xl font-bold leading-none text-slate-700">{score}</div>
                <div className="text-[10px] text-slate-400 font-medium uppercase">{label}</div>
            </div>
        </div>
    );
}
