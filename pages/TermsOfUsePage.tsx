import React from 'react';
import { Link } from 'react-router-dom';

const TermsOfUsePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#122118] py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gray-800 rounded-xl p-8 md:p-12 border border-gray-700">
          <h1 className="text-4xl font-bold text-white mb-2">Terms of Use</h1>
          <p className="text-gray-400 mb-8">Last Updated: {new Date().toLocaleDateString()}</p>

          <div className="prose prose-invert max-w-none space-y-6 text-gray-300">
            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">1. Acceptance of Terms</h2>
              <p>
                By accessing and using Afro Genie ("the Platform", "we", "us", "our"), you accept and agree to be bound by these Terms of Use. If you do not agree to these terms, please do not use our Platform.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">2. Description of Service</h2>
              <p>
                Afro Genie is an AI-powered lyric translation and cultural annotation platform that provides:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-4">
                <li>Translation of African music lyrics into multiple languages</li>
                <li>Cultural context and explanations for lyrics</li>
                <li>Community-driven discussions and contributions</li>
                <li>Artist profiles and music discovery</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">3. Copyright and Intellectual Property</h2>
              <h3 className="text-xl font-semibold text-white mt-6 mb-3">3.1 Original Lyrics</h3>
              <p>
                All original song lyrics displayed on Afro Genie are the property of their respective copyright owners (artists, songwriters, publishers, or labels). Afro Genie does not claim ownership of original lyrics.
              </p>
              <h3 className="text-xl font-semibold text-white mt-6 mb-3">3.2 Translations and Derivative Works</h3>
              <p>
                Translations, cultural annotations, and contextual explanations created through Afro Genie are derivative works. While Afro Genie and its contributors may own the translation and annotation content, this does not grant any rights to the original lyrics.
              </p>
              <h3 className="text-xl font-semibold text-white mt-6 mb-3">3.3 Licensing Sources</h3>
              <p>
                Lyrics are sourced through:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-4">
                <li>Licensed API providers (Musixmatch, LyricFind)</li>
                <li>Direct publisher and label licensing agreements</li>
                <li>Verified artist-contributed lyrics</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">4. User Contributions</h2>
              <h3 className="text-xl font-semibold text-white mt-6 mb-3">4.1 Translation Contributions</h3>
              <p>
                By contributing translations, corrections, or cultural context, you grant Afro Genie a non-exclusive, royalty-free license to use, display, and distribute your contributions on the Platform.
              </p>
              <h3 className="text-xl font-semibold text-white mt-6 mb-3">4.2 Content Standards</h3>
              <p>
                You agree not to submit content that:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-4">
                <li>Infringes on copyright or intellectual property rights</li>
                <li>Is defamatory, offensive, or violates any laws</li>
                <li>Contains spam, malware, or malicious code</li>
                <li>Misrepresents your identity or affiliation</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">5. Artist Verification</h2>
              <p>
                Artists who upload their own lyrics must verify their identity and confirm they have the right to authorize display of the lyrics. By uploading lyrics, artists grant Afro Genie a non-exclusive license to display and translate their lyrics.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">6. AI-Generated Content</h2>
              <p>
                Translations and language detection are generated using AI technology. While we strive for accuracy, AI-generated content may contain errors. Users should verify critical translations and are encouraged to contribute corrections.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">7. Moderation and Content Removal</h2>
              <p>
                Afro Genie reserves the right to:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-4">
                <li>Review, edit, or remove user-contributed content</li>
                <li>Suspend or terminate accounts that violate these terms</li>
                <li>Remove content in response to valid copyright claims</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">8. Copyright Infringement Claims</h2>
              <p>
                If you believe content on Afro Genie infringes your copyright, please contact us with:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-4">
                <li>Identification of the copyrighted work</li>
                <li>Location of the infringing material on our Platform</li>
                <li>Your contact information</li>
                <li>A statement of good faith belief that use is unauthorized</li>
                <li>A statement that the information is accurate</li>
              </ul>
              <p className="mt-4">
                We will respond to valid DMCA takedown requests within 48 hours.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">9. Limitation of Liability</h2>
              <p>
                Afro Genie is provided "as is" without warranties. We are not liable for:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-4">
                <li>Accuracy of translations or cultural context</li>
                <li>Availability or uptime of the Platform</li>
                <li>Loss of data or content</li>
                <li>Third-party content or links</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">10. Changes to Terms</h2>
              <p>
                We reserve the right to modify these Terms of Use at any time. Continued use of the Platform after changes constitutes acceptance of the new terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mt-8 mb-4">11. Contact Information</h2>
              <p>
                For questions about these Terms of Use, please contact us through the Platform's admin panel or support channels.
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

export default TermsOfUsePage;


