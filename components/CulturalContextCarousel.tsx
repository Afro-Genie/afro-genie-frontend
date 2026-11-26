import React, { useState, useEffect, useRef } from 'react';
import { Globe } from 'lucide-react';

interface CulturalContextItem {
  number: number;
  term: string;
  explanation: string;
}

export function parseCulturalContext(raw: string): CulturalContextItem[] {
  if (!raw || !raw.trim()) return [];

  // Strategy 1: Split on numbered patterns: "1. ", "2. ", etc.
  const items = parseNumberedItems(raw);
  if (items.length > 0) return items;

  // Strategy 2: Split on quoted terms like "Mara", "Barawo", etc.
  const quotedItems = parseQuotedTerms(raw);
  if (quotedItems.length > 0) return quotedItems;

  // Strategy 3: Split on sentence boundaries
  return parseSentences(raw);
}

function parseNumberedItems(raw: string): CulturalContextItem[] {
  const items: CulturalContextItem[] = [];

  // Find all positions where numbered items start: "1. ", "2) ", etc.
  const splitRegex = /\b(\d+)[.)]\s/g;
  const positions: { num: number; start: number }[] = [];
  let match: RegExpExecArray | null;

  while ((match = splitRegex.exec(raw)) !== null) {
    positions.push({ num: parseInt(match[1], 10), start: match.index });
  }

  // Need at least 2 numbered items to treat as a numbered list
  if (positions.length < 2) return [];

  for (let i = 0; i < positions.length; i++) {
    const content = raw.substring(
      positions[i].start + positions[i].num.toString().length + 2, // skip "N. "
      i + 1 < positions.length ? positions[i + 1].start : raw.length,
    ).trim();

    const colonIndex = content.indexOf(':');
    if (colonIndex > 0) {
      items.push({
        number: positions[i].num,
        term: content.substring(0, colonIndex).trim().replace(/^['"\u2018\u201c]|['"\u2019\u201d]$/g, ''),
        explanation: content.substring(colonIndex + 1).trim(),
      });
    } else {
      items.push({
        number: positions[i].num,
        term: '',
        explanation: content,
      });
    }
  }

  return items;
}

function parseQuotedTerms(raw: string): CulturalContextItem[] {
  // Split on sentence boundaries, accounting for closing quotes after punctuation
  const sentences = raw.split(/(?<=[.!?][""\u201d''\u2019]?)\s+(?=[A-Z""\u201c''\u2018])/);
  if (sentences.length === 0) return [];

  const termAtStart = /^[''\u2018""\u201c]([^''\u2019""\u201d]+)[''\u2019""\u201d]/;
  const termAfterTrigger = /(?:idiom|saying|phrase|term|title|called|known as)\s+[''\u2018""\u201c]([^''\u2019""\u201d]+)[''\u2019""\u201d]/i;

  const items: CulturalContextItem[] = [];
  let currentTerm = '';
  let currentExplanation = '';

  for (const sentence of sentences) {
    const startMatch = sentence.match(termAtStart);
    const triggerMatch = !startMatch ? sentence.match(termAfterTrigger) : null;

    if (startMatch || triggerMatch) {
      if (currentTerm) {
        items.push({
          number: items.length + 1,
          term: currentTerm,
          explanation: currentExplanation.trim(),
        });
      }
      currentTerm = (startMatch || triggerMatch)![1];
      currentExplanation = startMatch
        ? sentence.substring(startMatch[0].length)
        : sentence;
    } else if (currentTerm) {
      currentExplanation += ' ' + sentence;
    }
  }

  if (currentTerm) {
    items.push({
      number: items.length + 1,
      term: currentTerm,
      explanation: currentExplanation.trim(),
    });
  }

  return items;
}

function parseSentences(raw: string): CulturalContextItem[] {
  // Split on sentence endings and semicolons (commas only before capitalized terms)
  const parts = raw.split(/(?<=[.!?;])\s+(?=[A-Z""\u201c''\u2018])/);

  // Group into chunks of ~100-200 chars for readable slides
  const chunks: string[] = [];
  let buffer = '';
  for (const part of parts) {
    const candidate = buffer ? buffer + ' ' + part : part;
    if (candidate.length > 180 && buffer.length > 60) {
      chunks.push(buffer.trim());
      buffer = part;
    } else {
      buffer = candidate;
    }
  }
  if (buffer.trim()) chunks.push(buffer.trim());

  // If still only 1 chunk and text is long, force-split
  if (chunks.length <= 1 && raw.length > 300) {
    return forceSplit(raw);
  }

  if (chunks.length === 0) return [];

  return chunks.map((chunk, i) => ({
    number: i + 1,
    term: '',
    explanation: chunk,
  }));
}

function forceSplit(raw: string): CulturalContextItem[] {
  const targetChunkSize = 200;
  const chunks: string[] = [];
  let remaining = raw;

  while (remaining.length > 0) {
    if (remaining.length <= targetChunkSize) {
      chunks.push(remaining);
      break;
    }
    // Find a good break point: period, comma, or space near the target
    let breakAt = -1;
    for (const sep of ['. ', ', ', ' ']) {
      const idx = remaining.lastIndexOf(sep, targetChunkSize);
      if (idx > targetChunkSize * 0.4) {
        breakAt = idx + sep.length;
        break;
      }
    }
    if (breakAt <= 0) breakAt = targetChunkSize;
    chunks.push(remaining.substring(0, breakAt).trim());
    remaining = remaining.substring(breakAt).trim();
  }

  return chunks.map((chunk, i) => ({
    number: i + 1,
    term: '',
    explanation: chunk,
  }));
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
    // Fallback: split plain text into paragraphs and render as cards
    const paragraphs = culturalContext
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean);

    if (paragraphs.length === 0) return null;

    return (
      <div className="mb-4">
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 pt-4 pb-2">
            <Globe className="w-5 h-5 text-green-400" />
            <h3 className="text-base font-semibold text-white">Cultural Context</h3>
          </div>
          <div className="px-4 pb-4 space-y-2">
            {paragraphs.map((paragraph, i) => (
              <div
                key={i}
                className="bg-gray-900/50 border border-gray-700/50 rounded-lg p-4"
              >
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-green-900/60 text-green-400 text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <p className="text-sm text-gray-300 leading-relaxed">
                    {paragraph}
                  </p>
                </div>
              </div>
            ))}
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
                        {item.term && (
                          <h4 className="text-sm font-semibold text-green-300 mb-1">
                            {item.term}
                          </h4>
                        )}
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
