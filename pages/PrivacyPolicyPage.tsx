import React from 'react';
import { Link } from 'react-router-dom';

const PrivacyPolicyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#122118] py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gray-800 rounded-xl p-8 md:p-12 border border-gray-700">
          <h1 className="text-4xl font-bold text-white mb-2">Privacy Policy</h1>
          <p className="text-gray-400 mb-8">Last Updated: {new Date().toLocaleDateString()}</p>

          <div className="prose prose-invert max-w-none space-y-6 text-gray-300">
            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">1. Introduction</h2>
              <p>
                Afro Genie ("we", "us", "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Platform.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">2. Information We Collect</h2>
              <h3 className="text-xl font-semibold text-white mt-6 mb-3">2.1 Account Information</h3>
              <p>When you create an account, we collect:</p>
              <ul className="list-disc pl-6 space-y-2 mt-4">
                <li>Email address</li>
                <li>Display name</li>
                <li>Profile photo (if provided)</li>
                <li>Authentication provider information (Google, Email/Password)</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">2.2 Usage Data</h3>
              <p>We automatically collect:</p>
              <ul className="list-disc pl-6 space-y-2 mt-4">
                <li>Songs viewed and favorites</li>
                <li>Translation requests and contributions</li>
                <li>Community forum activity (topics, comments)</li>
                <li>Browser type, device information, and IP address</li>
              </ul>

              <h3 className="text-xl font-semibold text-white mt-6 mb-3">2.3 Content You Provide</h3>
              <p>We store:</p>
              <ul className="list-disc pl-6 space-y-2 mt-4">
                <li>Translations and corrections you submit</li>
                <li>Cultural context and annotations</li>
                <li>Forum posts and comments</li>
                <li>Artist profile information (if you're an artist)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">3. How We Use Your Information</h2>
              <p>We use collected information to:</p>
              <ul className="list-disc pl-6 space-y-2 mt-4">
                <li>Provide and improve our translation services</li>
                <li>Personalize your experience (favorites, history)</li>
                <li>Moderate content and ensure platform safety</li>
                <li>Communicate with you about your account</li>
                <li>Analyze usage patterns to improve the Platform</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">4. Data Storage and Security</h2>
              <h3 className="text-xl font-semibold text-white mt-6 mb-3">4.1 Storage</h3>
              <p>
                Your data is stored securely using Firebase (Google Cloud Platform). Data is encrypted in transit and at rest.
              </p>
              <h3 className="text-xl font-semibold text-white mt-6 mb-3">4.2 Security Measures</h3>
              <p>We implement:</p>
              <ul className="list-disc pl-6 space-y-2 mt-4">
                <li>Authentication and authorization controls</li>
                <li>Firestore security rules to protect user data</li>
                <li>Regular security audits</li>
                <li>Secure API endpoints</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">5. Information Sharing and Disclosure</h2>
              <p>We do not sell your personal information. We may share data:</p>
              <ul className="list-disc pl-6 space-y-2 mt-4">
                <li><strong>Publicly:</strong> Your contributions (translations, forum posts) are visible to other users</li>
                <li><strong>Service Providers:</strong> With Firebase, Google Cloud, and other necessary service providers</li>
                <li><strong>Legal Requirements:</strong> When required by law or to protect rights</li>
                <li><strong>With Consent:</strong> When you explicitly authorize sharing</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">6. Third-Party Services</h2>
              <h3 className="text-xl font-semibold text-white mt-6 mb-3">6.1 Authentication</h3>
              <p>
                We use Firebase Authentication and Google OAuth. When you sign in with Google, Google's privacy policy applies to that authentication process.
              </p>
              <h3 className="text-xl font-semibold text-white mt-6 mb-3">6.2 AI Services</h3>
              <p>
                Translations are generated using Google Gemini AI. Lyrics you submit for translation are sent to Google's API for processing. Google's privacy policy applies to this data processing.
              </p>
              <h3 className="text-xl font-semibold text-white mt-6 mb-3">6.3 Music APIs</h3>
              <p>
                We may integrate with Spotify, Musixmatch, and other music services. Their privacy policies apply when you interact with these services.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">7. Your Rights and Choices</h2>
              <p>You have the right to:</p>
              <ul className="list-disc pl-6 space-y-2 mt-4">
                <li><strong>Access:</strong> Request a copy of your personal data</li>
                <li><strong>Correction:</strong> Update or correct your account information</li>
                <li><strong>Deletion:</strong> Request deletion of your account and data</li>
                <li><strong>Opt-out:</strong> Unsubscribe from communications</li>
                <li><strong>Data Portability:</strong> Export your contributions</li>
              </ul>
              <p className="mt-4">
                To exercise these rights, contact us through the Platform or admin panel.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">8. Cookies and Tracking</h2>
              <p>
                We use localStorage to save your preferences (view mode, language settings). We do not use third-party advertising cookies or tracking pixels.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">9. Children's Privacy</h2>
              <p>
                Afro Genie is not intended for users under 13 years of age. We do not knowingly collect personal information from children. If you believe we have collected information from a child, please contact us immediately.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">10. International Data Transfers</h2>
              <p>
                Your data may be processed and stored in servers located outside your country. By using Afro Genie, you consent to the transfer of your data to these servers.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">11. Changes to Privacy Policy</h2>
              <p>
                We may update this Privacy Policy periodically. We will notify users of significant changes via email or Platform notification. Continued use after changes constitutes acceptance.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">12. Contact Us</h2>
              <p>
                For privacy-related questions or concerns, please contact us through the Platform's admin panel or support channels.
              </p>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-700">
            <Link 
              to="/" 
              className="text-green-400 hover:text-green-300 transition-colors"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;


