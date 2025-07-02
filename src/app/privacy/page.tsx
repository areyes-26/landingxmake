'use client';

import Link from 'next/link';

export default function PrivacyPolicies() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-4">Last updated: 2/7/2025</p>
        
        <div className="space-y-6">
          <p className="text-lg">
          This Privacy Policy describes how we collect, use, and protect the personal information of users who use our site and services.
          </p>
          
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Information We Collect</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>Video creation data: such as names, topics, and descriptions submitted via our forms.</li>
              <li>Social media information: If a user connects their Instagram account or other networks, we collect access tokens and public profile data as permitted by their respective APIs.</li>
              <li>Technical data: IP address, browser, operating system, date/time of access.</li>
            </ul>
          </section>
          
          <section>
            <h2 className="text-2xl font-semibold mb-4">2. How we use the information</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>To generate personalized AI videos.</li>
              <li>To enable automatic publishing to connected social media accounts.</li>
              <li>To improve our service performance and technical support.</li>
            </ul>
          </section>
          
          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Credential Storage</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>All credentials (e.g., access tokens) are stored in a secure and encrypted manner.</li>
              <li>We never share or sell personal data to third parties.</li>
            </ul>
          </section>
          
          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Data Deletion</h2>
            <p className="text-base">
              Users may request complete deletion of their data by sending an email to: <a href="mailto:tomasameridev@gmail.com">tomasameridev@gmail.com</a>. The request will be processed within a maximum of 7 business days.
            </p>
          </section>
          
          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Security</h2>
            <p className="text-base">
            We apply technical and organizational measures to prevent unauthorized access, loss, or misuse of user data.
            </p>
          </section>
          
          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Changes to This Policy</h2>
            <p className="text-base">
              We reserve the right to modify this policy. Relevant changes will be notified on the site or via email if necessary.
            </p>
          </section>
          
          <div className="mt-8 text-center">
            <p className="text-muted-foreground">
              ---------------------------------------------
            </p>
            <p className="text-muted-foreground">
              By continuing to use the platform, you agree to the terms described in this Privacy Policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
