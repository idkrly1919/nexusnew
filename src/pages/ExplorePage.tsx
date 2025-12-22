import React from 'react';
import { useNavigate } from 'react-router-dom';
import WeatherWidget from '../components/WeatherWidget';

const GOOGLE_OPAL_VIDEO_URL = 'https://opal.google/?flow=drive:/1FrJlGm-c7ohm0cQl0XboQ9cHgc_Md1bo&shared&mode=app';

const ExplorePage: React.FC = () => {
    const navigate = useNavigate();

    const quickActions = [
        { title: 'Generate Image', icon: '🎨', action: () => navigate('/chat?prompt=make+an+image') },
        { title: 'Create Video', icon: '🎥', action: () => window.open(GOOGLE_OPAL_VIDEO_URL, '_blank', 'noopener,noreferrer') },
        { title: 'Code Assistant', icon: '💻', action: () => navigate('/dev') },
        { title: 'Take Quiz', icon: '📝', action: () => navigate('/quiz') },
    ];

    const newsItems = [
        { title: 'AI News Update', description: 'Latest developments in artificial intelligence', time: '2 hours ago' },
        { title: 'Tech Trends 2024', description: 'Emerging technologies to watch', time: '5 hours ago' },
        { title: 'Developer Tools', description: 'New productivity tools for developers', time: '1 day ago' },
    ];

    return (
        <div className="h-full overflow-y-auto bg-[var(--copilot-color-background)] pb-20">
            <div className="max-w-4xl mx-auto p-4 space-y-6">
                {/* Header */}
                <div className="pt-4">
                    <h1 className="text-3xl font-semibold text-[var(--copilot-color-on-surface)] mb-2">Explore</h1>
                    <p className="text-[var(--copilot-color-on-surface-secondary)]">Discover what's happening</p>
                </div>

                {/* Weather Widget */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-[var(--copilot-color-border)]">
                    <WeatherWidget />
                </div>

                {/* Quick Actions */}
                <div>
                    <h2 className="text-lg font-semibold text-[var(--copilot-color-on-surface)] mb-3">Quick Actions</h2>
                    <div className="grid grid-cols-2 gap-3">
                        {quickActions.map((action, index) => (
                            <button
                                key={index}
                                onClick={action.action}
                                className="bg-white rounded-xl p-4 shadow-sm border border-[var(--copilot-color-border)] hover:border-[var(--copilot-color-primary)] hover:shadow-md transition-all duration-200 text-left"
                            >
                                <div className="text-3xl mb-2">{action.icon}</div>
                                <div className="text-sm font-medium text-[var(--copilot-color-on-surface)]">{action.title}</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* News Section */}
                <div>
                    <h2 className="text-lg font-semibold text-[var(--copilot-color-on-surface)] mb-3">Top Stories</h2>
                    <div className="space-y-3">
                        {newsItems.map((news, index) => (
                            <div
                                key={index}
                                className="bg-white rounded-xl p-4 shadow-sm border border-[var(--copilot-color-border)] hover:border-[var(--copilot-color-primary)] hover:shadow-md transition-all duration-200 cursor-pointer"
                            >
                                <h3 className="font-medium text-[var(--copilot-color-on-surface)] mb-1">{news.title}</h3>
                                <p className="text-sm text-[var(--copilot-color-on-surface-secondary)] mb-2">{news.description}</p>
                                <span className="text-xs text-[var(--copilot-color-on-surface-secondary)]">{news.time}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExplorePage;
