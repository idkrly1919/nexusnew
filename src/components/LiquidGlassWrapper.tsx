import React from 'react';
import LiquidGlass from 'liquid-glass-react';

interface LiquidGlassWrapperProps {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
    displacementScale?: number;
    blurAmount?: number;
    saturation?: number;
    aberrationIntensity?: number;
    elasticity?: number;
    cornerRadius?: number;
    padding?: string;
    overLight?: boolean;
    mode?: "standard" | "polar" | "prominent" | "shader";
    style?: React.CSSProperties;
}

const LiquidGlassWrapper: React.FC<LiquidGlassWrapperProps> = ({
    children,
    className = '',
    onClick,
    displacementScale = 70,
    blurAmount = 0.0625,
    saturation = 140,
    aberrationIntensity = 2,
    elasticity = 0.15,
    cornerRadius = 16,
    padding,
    overLight = false,
    mode = "standard",
    style,
}) => {
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
            onClick={onClick}
            className={className}
            style={style}
        >
            {children}
        </LiquidGlass>
    );
};

export default LiquidGlassWrapper;
