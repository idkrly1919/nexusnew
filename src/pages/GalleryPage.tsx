import React, { useState, useEffect } from 'react';
import { useSession } from '../contexts/SessionContext';
import { supabase } from '../integrations/supabase/client';

interface GeneratedImage {
    id: string;
    url: string;
    prompt: string;
    created_at: string;
}

const GalleryPage: React.FC = () => {
    const { session } = useSession();
    const [images, setImages] = useState<GeneratedImage[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (session) {
            fetchImages();
        }
    }, [session]);

    const fetchImages = async () => {
        setIsLoading(true);
        // This would fetch actual generated images from your database
        // For now, showing placeholder structure
        setImages([]);
        setIsLoading(false);
    };

    return (
        <div className="h-full overflow-y-auto bg-[var(--copilot-color-background)] pb-20">
            <div className="max-w-4xl mx-auto p-4 space-y-6">
                {/* Header */}
                <div className="pt-4">
                    <h1 className="text-3xl font-semibold text-[var(--copilot-color-on-surface)] mb-2">Gallery</h1>
                    <p className="text-[var(--copilot-color-on-surface-secondary)]">Your generated images</p>
                </div>

                {/* Gallery Grid */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin h-8 w-8 border-4 border-[var(--copilot-color-primary)] border-t-transparent rounded-full"></div>
                    </div>
                ) : images.length === 0 ? (
                    <div className="bg-white rounded-xl p-12 shadow-sm border border-[var(--copilot-color-border)] text-center">
                        <div className="text-6xl mb-4">🎨</div>
                        <h2 className="text-xl font-semibold text-[var(--copilot-color-on-surface)] mb-2">No images yet</h2>
                        <p className="text-[var(--copilot-color-on-surface-secondary)] mb-4">
                            Start creating amazing images with AI
                        </p>
                        <button
                            onClick={() => window.location.href = '/chat'}
                            className="px-6 py-2.5 bg-[var(--copilot-color-primary)] text-white rounded-full font-medium hover:bg-[var(--copilot-color-primary-hover)] transition-colors"
                        >
                            Create Image
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {images.map((image) => (
                            <div
                                key={image.id}
                                className="bg-white rounded-xl overflow-hidden shadow-sm border border-[var(--copilot-color-border)] hover:shadow-md transition-shadow cursor-pointer"
                            >
                                <img src={image.url} alt={image.prompt} className="w-full aspect-square object-cover" />
                                <div className="p-3">
                                    <p className="text-sm text-[var(--copilot-color-on-surface)] line-clamp-2">{image.prompt}</p>
                                    <p className="text-xs text-[var(--copilot-color-on-surface-secondary)] mt-1">
                                        {new Date(image.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default GalleryPage;
