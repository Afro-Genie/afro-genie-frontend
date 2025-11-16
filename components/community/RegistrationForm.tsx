import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import UserIcon from '../icons/UserIcon';

const RegistrationForm: React.FC = () => {
    const { signUp, signInWithGoogle } = useAuth();
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
                </>
            )}
        </div>
    );
};

export default RegistrationForm;