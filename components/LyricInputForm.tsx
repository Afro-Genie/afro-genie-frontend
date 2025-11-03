import React, { useState } from 'react';
import { SUPPORTED_LANGUAGES } from '../constants';
import type { LyricInput } from '../types';
import TranslateIcon from './icons/TranslateIcon';

interface LyricInputFormProps {
  onTranslate: (input: LyricInput) => void;
  isLoading: boolean;
}

const LyricInputForm: React.FC<LyricInputFormProps> = ({ onTranslate, isLoading }) => {
  const [artist, setArtist] = useState('Burna Boy');
  const [title, setTitle] = useState('Last Last');
  // Add state for lyrics, including placeholder content. The Gemini service requires lyrics.
  const [lyrics, setLyrics] = useState(`I put my life into my job and I know I'm in trouble
She manipulate my love ooooo
I don't know how to show my love ooooo
So I'm getting drunk on love ooooo

I dey smoke Igbo, I dey look like bolo
And I don't know what to do
'Cause my feelings getting bigger
And my wallet getting bigger
And the girls are getting bigger

E don cast, last last
Na everybody go chop breakfast
E don cast, last last
Na everybody go chop breakfast`);
  const [sourceLang, setSourceLang] = useState('en');
  const [targetLang, setTargetLang] = useState('fr');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!artist || !title || !lyrics) {
      setError('Please fill in Artist, Song Title, and Lyrics.');
      return;
    }
    if (sourceLang === targetLang) {
        setError('Source and Target languages cannot be the same.');
        return;
    }
    setError('');
    onTranslate({ artist, title, lyrics, sourceLang, targetLang });
  };

  const inputStyles = "w-full bg-gray-800 border border-gray-700 rounded-md py-2 px-3 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all";
  const labelStyles = "block text-sm font-medium text-gray-400 mb-1";

  return (
    <div className="bg-gray-800/50 p-6 md:p-8 rounded-xl border border-gray-700 shadow-lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="artist" className={labelStyles}>Artist</label>
            <input
              id="artist"
              type="text"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              placeholder="e.g., Burna Boy"
              className={inputStyles}
              disabled={isLoading}
            />
          </div>
          <div>
            <label htmlFor="title" className={labelStyles}>Song Title</label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Last Last"
              className={inputStyles}
              disabled={isLoading}
            />
          </div>
        </div>
        
        <div>
            <label htmlFor="lyrics" className={labelStyles}>Lyrics</label>
            <textarea
                id="lyrics"
                value={lyrics}
                onChange={(e) => setLyrics(e.target.value)}
                placeholder="Paste the song lyrics here..."
                className={`${inputStyles} h-40 resize-y`}
                disabled={isLoading}
                required
            />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <label htmlFor="sourceLang" className={labelStyles}>From Language</label>
                <select id="sourceLang" value={sourceLang} onChange={(e) => setSourceLang(e.target.value)} className={inputStyles} disabled={isLoading}>
                    {SUPPORTED_LANGUAGES.map(lang => (
                        <option key={lang.code} value={lang.code}>{lang.name}</option>
                    ))}
                </select>
            </div>
             <div>
                <label htmlFor="targetLang" className={labelStyles}>To Language</label>
                <select id="targetLang" value={targetLang} onChange={(e) => setTargetLang(e.target.value)} className={inputStyles} disabled={isLoading}>
                    {SUPPORTED_LANGUAGES.map(lang => (
                        <option key={lang.code} value={lang.code}>{lang.name}</option>
                    ))}
                </select>
            </div>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="pt-2">
            <button 
                type="submit" 
                disabled={isLoading}
                className="w-full flex items-center justify-center bg-amber-500 hover:bg-amber-600 disabled:bg-amber-800 disabled:cursor-not-allowed text-gray-900 font-bold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 disabled:scale-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-amber-400"
            >
                {isLoading ? (
                    'Analyzing...'
                ) : (
                    <>
                        <TranslateIcon className="h-5 w-5 mr-2" />
                        <span>Reveal the Meaning</span>
                    </>
                )}
            </button>
        </div>
      </form>
    </div>
  );
};

export default LyricInputForm;
