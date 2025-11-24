import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import UserIcon from '../icons/UserIcon';

const RegistrationForm: React.FC = () => {
    const { signUp, signInWithGoogle, signInWithSpotify } = useAuth();
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await signUp(email, password, username);
            setSuccess(true);
        } catch (err: any) {
            setError(err.message || 'Failed to create account. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignUp = async () => {
        setError('');
        setLoading(true);

        try {
            await signInWithGoogle();
            setSuccess(true);
        } catch (err: any) {
            setError(err.message || 'Failed to sign in with Google.');
        } finally {
            setLoading(false);
        }
    };

    const handleSpotifySignUp = async () => {
        setError('');
        setLoading(true);

        try {
            await signInWithSpotify();
            // Note: setSuccess won't be called here as user will be redirected
        } catch (err: any) {
            setError(err.message || 'Failed to sign in with Spotify.');
            setLoading(false);
        }
    };

    const inputStyles = "w-full bg-gray-800 border border-gray-600 rounded-md py-2 px-3 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all";
    const labelStyles = "block text-sm font-medium text-gray-400 mb-1";
    
    return (
        <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700 shadow-lg">
            <h2 className="text-2xl font-bold text-center text-amber-400 mb-6 flex items-center justify-center gap-3">
                <UserIcon className="h-6 w-6" />
                Join the Community
            </h2>

            {error && (
                <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg">
                    <p className="text-red-300 text-sm">{error}</p>
                </div>
            )}

            {success ? (
                <div className="text-center p-4 bg-green-900/50 border border-green-700 rounded-lg">
                    <h3 className="font-bold text-green-300">Welcome!</h3>
                    <p className="text-green-400 text-sm">Your account has been created successfully. You can now explore the community!</p>
                </div>
            ) : (
                <>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="username" className={labelStyles}>Display Name</label>
                            <input 
                                id="username" 
                                type="text" 
                                value={username} 
                                onChange={(e) => setUsername(e.target.value)} 
                                required 
                                disabled={loading}
                                className={inputStyles} 
                                placeholder="Your name"
                            />
                        </div>
                        <div>
                            <label htmlFor="email" className={labelStyles}>Email</label>
                            <input 
                                id="email" 
                                type="email" 
                                value={email} 
                                onChange={(e) => setEmail(e.target.value)} 
                                required 
                                disabled={loading}
                                className={inputStyles} 
                                placeholder="your@email.com"
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className={labelStyles}>Password</label>
                            <input 
                                id="password" 
                                type="password" 
                                value={password} 
                                onChange={(e) => setPassword(e.target.value)} 
                                required 
                                disabled={loading}
                                minLength={6}
                                className={inputStyles} 
                                placeholder="At least 6 characters"
                            />
                            <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
                        </div>
                        <div className="pt-2">
                            <button 
                                type="submit" 
                                disabled={loading}
                                className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-gray-900 font-bold py-3 px-4 rounded-lg transition-all transform hover:scale-105 disabled:transform-none"
                            >
                                {loading ? 'Creating Account...' : 'Create Account'}
                            </button>
                        </div>
                    </form>

                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-700"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-gray-800 text-gray-500">Or continue with</span>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <button
                            onClick={handleGoogleSignUp}
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 disabled:bg-gray-600 text-gray-900 font-semibold py-3 px-4 rounded-lg transition-all"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                            </svg>
                            {loading ? 'Signing in...' : 'Sign in with Google'}
                        </button>
                        
                        <button
                            onClick={handleSpotifySignUp}
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-3 bg-[#1DB954] hover:bg-[#1ed760] disabled:bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg transition-all"
                        >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.08-1.26 11.04-1.02 15.24 1.621.539.3.719 1.02.42 1.56-.3.421-1.02.599-1.559.3z"/>
                            </svg>
                            {loading ? 'Signing in...' : 'Sign in with Spotify'}
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

export default RegistrationForm;