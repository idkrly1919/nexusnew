import React, { useRef } from 'react';
import LiquidGlass from 'liquid-glass-react';

interface LiquidGlassButtonProps {
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
    disabled?: boolean;
    type?: 'button' | 'submit' | 'reset';
    title?: string;
    displacementScale?: number;
    blurAmount?: number;
    saturation?: number;
    aberrationIntensity?: number;
    elasticity?: number;
    cornerRadius?: number;
    padding?: string;
    overLight?: boolean;
    mode?: "standard" | "polar" | "prominent" | "shader";
}

const LiquidGlassButton: React.FC<LiquidGlassButtonProps> = ({
    children,
    onClick,
    className = '',
    disabled = false,
    type = 'button',
    title,
    displacementScale = 64,
    blurAmount = 0.1,
    saturation = 130,
    aberrationIntensity = 2,
    elasticity = 0.35,
    cornerRadius = 100,
    padding,
    overLight = false,
    mode = "standard",
}) => {
    // For button functionality, we need to wrap it properly
    const handleClick = (e: React.MouseEvent) => {
        if (!disabled && onClick) {
            onClick();
        }
    };

    return (
        <LiquidGlass
            displacementScale={displacementScale}
            blurAmount={blurAmount}
            saturation={saturation}
            aberrationIntensity={aberrationIntensity}
            elasticity={elasticity}
            cornerRadius={cornerRadius}
            padding={padding}
            overLight={overLight}
            mode={mode}
            onClick={handleClick}
            className={className}
            style={{ cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 }}
        >
            <button
                type={type}
                disabled={disabled}
                title={title}
                className="w-full h-full bg-transparent border-none outline-none cursor-inherit"
                onClick={(e) => e.preventDefault()} // Prevent double-firing
            >
                {children}
            </button>
        </LiquidGlass>
    );
};

export default LiquidGlassButton;
