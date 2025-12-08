import React, { useEffect, useRef, ReactNode, useState } from 'react';
import ReactDOM from 'react-dom';

declare global {
    interface Window {
        Container: any;
        html2canvas: any;
    }
}

interface LiquidGlassContainerProps {
    children: ReactNode;
    className?: string;
    borderRadius?: number;
    type?: 'rounded' | 'circle' | 'pill';
    tintOpacity?: number;
}

const LiquidGlassContainer: React.FC<LiquidGlassContainerProps> = ({
    children,
    className,
    borderRadius = 24,
    type = 'rounded',
    tintOpacity = 0.2,
}) => {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [glassElement, setGlassElement] = useState<HTMLElement | null>(null);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        const checkLibrary = () => {
            if (typeof window.Container !== 'undefined' && typeof window.html2canvas !== 'undefined') {
                setIsReady(true);
            } else {
                setTimeout(checkLibrary, 100);
            }
        };
        checkLibrary();
    }, []);

    useEffect(() => {
        if (!isReady || !wrapperRef.current) return;

        const glassInstance = new window.Container({
            borderRadius,
            type,
            tintOpacity,
        });
        
        const el = glassInstance.element;
        
        while (wrapperRef.current.firstChild) {
            wrapperRef.current.removeChild(wrapperRef.current.firstChild);
        }

        wrapperRef.current.appendChild(el);
        setGlassElement(el);

        return () => {
            if (wrapperRef.current && wrapperRef.current.contains(el)) {
                wrapperRef.current.removeChild(el);
            }
        };
    }, [isReady, borderRadius, type, tintOpacity]);

    return (
        <div ref={wrapperRef} className={className}>
            {glassElement && ReactDOM.createPortal(children, glassElement)}
        </div>
    );
};

export default LiquidGlassContainer;