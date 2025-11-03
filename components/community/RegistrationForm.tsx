import React, { useState } from 'react';
import UserIcon from '../icons/UserIcon';

const RegistrationForm: React.FC = () => {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Mock submission
        if (username && email && password) {
            setSubmitted(true);
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
            {submitted ? (
                <div className="text-center p-4 bg-green-900/50 border border-green-700 rounded-lg">
                    <h3 className="font-bold text-green-300">Welcome, {username}!</h3>
                    <p className="text-green-400 text-sm">Thanks for registering. You can now explore the forums.</p>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="username" className={labelStyles}>Username</label>
                        <input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} required className={inputStyles} />
                    </div>
                    <div>
                        <label htmlFor="email" className={labelStyles}>Email</label>
                        <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputStyles} />
                    </div>
                    <div>
                        <label htmlFor="password" className={labelStyles}>Password</label>
                        <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className={inputStyles} />
                    </div>
                    <div className="pt-2">
                        <button type="submit" className="w-full bg-amber-500 hover:bg-amber-600 text-gray-900 font-bold py-2 px-4 rounded-lg transition-all transform hover:scale-105">
                            Create Account
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
};

export default RegistrationForm;