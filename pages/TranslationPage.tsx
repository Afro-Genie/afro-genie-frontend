import React from 'react';
import { useParams } from 'react-router-dom';
import LeftSidebar from '../components/LeftSidebar';
import LyricContent from '../components/LyricContent';
import AnnotationSidebar from '../components/AnnotationSidebar';

const TranslationPage: React.FC = () => {
    const { id: songId } = useParams<{ id: string }>();
    
    return (
        <div className="flex-1 grid grid-cols-[280px_1fr_340px] overflow-hidden h-full">
            <LeftSidebar />
            <main className="overflow-y-auto pb-24 relative">
                <LyricContent />
            </main>
            <AnnotationSidebar songId={songId || ''} />
        </div>
    );
};

export default TranslationPage;