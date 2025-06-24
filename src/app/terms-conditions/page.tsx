"use client";

import Link from 'next/link';

export default function TermsConditions() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Terms & Conditions</h1>
        <p className="text-sm text-muted-foreground mb-4">Last updated: 6/5/2025</p>
        <div className="space-y-6">
          <p className="text-lg">
            These Terms & Conditions govern your use of the CreateCast platform and its services. By accessing or using our site, you agree to be bound by these terms.
          </p>
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Use of Service</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>You must be at least 18 years old or have parental consent to use the platform.</li>
              <li>You agree not to misuse the services or attempt to access them using a method other than the interface provided.</li>
            </ul>
          </section>
          <section>
            <h2 className="text-2xl font-semibold mb-4">2. User Content</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>You retain ownership of any content you upload or create, but grant us a license to use it for providing the service.</li>
              <li>You are responsible for ensuring your content does not violate any laws or third-party rights.</li>
            </ul>
          </section>
          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Account Security</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
              <li>Notify us immediately of any unauthorized use of your account.</li>
            </ul>
          </section>
          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Termination</h2>
            <p className="text-base">
              We reserve the right to suspend or terminate your access to the platform at our discretion, without notice, for conduct that we believe violates these terms or is harmful to other users or the platform.
            </p>
          </section>
          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Changes to Terms</h2>
            <p className="text-base">
              We may update these Terms & Conditions from time to time. Continued use of the platform after changes constitutes acceptance of the new terms.
            </p>
          </section>
          <div className="mt-8 text-center">
            <p className="text-muted-foreground">
              ---------------------------------------------
            </p>
            <p className="text-muted-foreground">
              By using this platform, you agree to these Terms & Conditions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 