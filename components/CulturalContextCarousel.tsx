import React, { useState, useEffect, useRef } from 'react';
import { Globe } from 'lucide-react';

interface CulturalContextItem {
  number: number;
  term: string;
  explanation: string;
}

export function parseCulturalContext(raw: string): CulturalContextItem[] {
  if (!raw || !raw.trim()) return [];

  // Split on numbered patterns: "1. ", "2. ", etc.
  const items: CulturalContextItem[] = [];
  const lines = raw.split('\n');
  let currentItem: Partial<CulturalContextItem> | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Match numbered items like "1. Term: explanation" or "1) Term: explanation"
    const numberedMatch = trimmed.match(/^(\d+)[.)]\s*(.+)/);
    if (numberedMatch) {
      // Save previous item
      if (currentItem && currentItem.number !== undefined) {
        items.push(currentItem as CulturalContextItem);
      }

      const num = parseInt(numberedMatch[1], 10);
      const content = numberedMatch[2];

      // Try to split on first colon to get term and explanation
      const colonIndex = content.indexOf(':');
      if (colonIndex > 0) {
        currentItem = {
          number: num,
          term: content.substring(0, colonIndex).trim().replace(/^['"]|['"]$/g, ''),
          explanation: content.substring(colonIndex + 1).trim(),
        };
      } else {
        currentItem = {
          number: num,
          term: content.trim(),
          explanation: '',
        };
      }
    } else if (currentItem) {
      // Continuation of previous item
      currentItem.explanation = (currentItem.explanation || '') + ' ' + trimmed;
    }
  }

  // Push last item
  if (currentItem && currentItem.number !== undefined) {
    items.push(currentItem as CulturalContextItem);
  }

  return items;
}

interface CulturalContextCarouselProps {
  culturalContext: string;
}

const CulturalContextCarousel: React.FC<CulturalContextCarouselProps> = ({ culturalContext }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const items = parseCulturalContext(culturalContext);

  // Reset when cultural context changes
  useEffect(() => {
    setActiveIndex(0);
    setIsTransitioning(false);
  }, [culturalContext]);

  // Auto-rotate
  useEffect(() => {
    if (items.length <= 1 || isPaused) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setActiveIndex((prev) => (prev + 1) % items.length);
        setIsTransitioning(false);
      }, 600); // Match transition duration
    }, 10000); // 10 seconds per item

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [items.length, isPaused]);

  if (items.length === 0) {
    // Fallback: show raw text if parsing fails
    return (
      <div className="mb-4">
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Globe className="w-5 h-5 text-green-400" />
            <h3 className="text-base font-semibold text-white">Cultural Context</h3>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/50">
            <pre className="whitespace-pre-wrap break-words font-sans text-gray-200 leading-relaxed text-sm">
              {culturalContext}
            </pre>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="mb-4"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 pt-4 pb-2">
          <Globe className="w-5 h-5 text-green-400" />
          <h3 className="text-base font-semibold text-white">Cultural Context</h3>
        </div>

        {/* Carousel Content */}
        <div className="relative px-4 pb-4">
          <div
            className="overflow-hidden rounded-lg bg-gray-900/50 border border-gray-700/50"
            style={{ minHeight: '120px' }}
          >
            <div
              className="transition-transform duration-600 ease-in-out"
              style={{
                transform: `translateX(-${activeIndex * 100}%)`,
                transition: 'transform 0.6s ease-in-out',
              }}
            >
              <div className="flex">
                {items.map((item, index) => (
                  <div
                    key={item.number}
                    className="w-full flex-shrink-0 p-4"
                    style={{ minWidth: '100%' }}
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-green-900/60 text-green-400 text-xs font-bold flex items-center justify-center">
                        {item.number}
                      </span>
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-green-300 mb-1">
                          {item.term}
                        </h4>
                        <p className="text-sm text-gray-300 leading-relaxed">
                          {item.explanation}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Progress Dots */}
          {items.length > 1 && (
            <div className="flex items-center justify-center gap-2 mt-3">
              {items.map((_, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setIsTransitioning(true);
                    setTimeout(() => {
                      setActiveIndex(index);
                      setIsTransitioning(false);
                    }, 300);
                  }}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    index === activeIndex
                      ? 'bg-green-400 w-4'
                      : 'bg-gray-600 hover:bg-gray-500'
                  }`}
                  aria-label={`Go to item ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CulturalContextCarousel;
