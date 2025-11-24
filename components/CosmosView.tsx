import React, { useEffect, useRef } from 'react';

interface CosmosViewProps {
  onSelectPlanet: (planet: 'chat' | 'video' | 'image') => void;
}

const CosmosView: React.FC<CosmosViewProps> = ({ onSelectPlanet }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const { clientX, clientY } = e;
      const { innerWidth, innerHeight } = window;
      
      const x = (clientX / innerWidth - 0.5) * 2; // -1 to 1
      const y = (clientY / innerHeight - 0.5) * 2; // -1 to 1

      const planets = containerRef.current.querySelectorAll('.planet-wrapper') as NodeListOf<HTMLElement>;
      planets.forEach(planet => {
        const factor = parseFloat(planet.dataset.parallaxFactor || '1');
        planet.style.transform = `translate(${x * factor}px, ${y * factor}px)`;
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full flex items-center justify-center relative">
      {/* Center Planet (Chat) */}
      <div 
        className="planet-wrapper absolute transition-transform duration-500 ease-out" 
        data-parallax-factor="10"
        onClick={() => onSelectPlanet('chat')}
      >
        <div className="planet planet-chat group">
          <div className="planet-surface"></div>
          <div className="planet-atmosphere"></div>
          <img src="/nexus-logo.png" alt="Nexus Chat" className="planet-icon" />
        </div>
        <div className="planet-label">Nexus Chat</div>
      </div>

      {/* Left Planet (Video) */}
      <div 
        className="planet-wrapper absolute transition-transform duration-500 ease-out" 
        data-parallax-factor="30"
        style={{ left: '20%', top: '45%' }}
        onClick={() => onSelectPlanet('video')}
      >
        <div className="planet planet-video group">
          <div className="planet-surface"></div>
          <div className="planet-atmosphere"></div>
          <svg className="planet-icon" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line><line x1="2" y1="7" x2="7" y2="7"></line><line x1="2" y1="17" x2="7" y2="17"></line><line x1="17" y1="17" x2="22" y2="17"></line><line x1="17" y1="7" x2="22" y2="7"></line></svg>
        </div>
        <div className="planet-label">Video Generator</div>
      </div>

      {/* Right Planet (Image) */}
      <div 
        className="planet-wrapper absolute transition-transform duration-500 ease-out" 
        data-parallax-factor="25"
        style={{ right: '18%', top: '35%' }}
        onClick={() => onSelectPlanet('image')}
      >
        <div className="planet planet-image group">
          <div className="planet-surface"></div>
          <div className="planet-atmosphere"></div>
          <svg className="planet-icon" viewBox="0 0 24 24"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
        </div>
        <div className="planet-label">4K Image Generator</div>
      </div>
    </div>
  );
};

export default CosmosView;