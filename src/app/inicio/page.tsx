'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function InicioPage() {
  const [activeFaq, setActiveFaq] = useState(-1);

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? -1 : index);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0c0d1f] via-[#151629] to-[#1a1b35] text-white overflow-x-hidden">
      {/* Hero Section */}
      <section className="text-center px-12 py-24 max-w-7xl mx-auto">
        <div className="inline-block bg-[rgba(14,165,233,0.1)] text-[#0ea5e9] px-5 py-2 rounded-full text-sm font-medium mb-8 border border-[rgba(14,165,233,0.2)]">
          #1 AI Avatar Platform
        </div>
        <h1 className="text-[clamp(2.5rem,5vw,4.5rem)] font-bold leading-tight mb-8 bg-gradient-to-r from-white via-[#0ea5e9] to-[#7c3aed] bg-clip-text text-transparent">
          Create AI Avatars, Generate Content, and Post to Social Media - All in One Platform
        </h1>
        <p className="text-xl text-[rgba(255,255,255,0.7)] max-w-4xl mx-auto mb-12 leading-relaxed">
          The complete solution for businesses to build virtual influencers, produce engaging videos, and automatically distribute content across Facebook, Instagram, TikTok, and YouTube.
        </p>
        <Link href="/auth" className="inline-block bg-gradient-to-br from-[#0ea5e9] to-[#7c3aed] text-white px-10 py-4 text-lg rounded-lg font-semibold transition-all duration-300 mb-24 shadow-[0_0_30px_rgba(14,165,233,0.3)] hover:translate-y-[-2px] hover:shadow-[0_8px_25px_rgba(14,165,233,0.4)]">
          Get Started
        </Link>
      </section>

      {/* Carousel Section */}
      <section className="px-12 py-16 mb-24">
        <div className="relative overflow-hidden w-full mx-auto">
          <div className="flex gap-8 animate-[scroll_50s_linear_infinite] w-max">
            {[...Array(3)].map((_, seriesIndex) => (
              <div key={seriesIndex} className="flex gap-8">
                {[
                  { icon: '👩‍💼', label: 'Business Avatar', gradient: 'from-[#0ea5e9] to-[#7c3aed]' },
                  { icon: '🎮', label: 'Gaming Character', gradient: 'from-[#7c3aed] to-[#0ea5e9]' },
                  { icon: '🎨', label: 'Creative Content', gradient: 'from-[#0ea5e9] to-[#06b6d4]' },
                  { icon: '📱', label: 'Social Media', gradient: 'from-[#06b6d4] to-[#7c3aed]' },
                  { icon: '🎭', label: 'Virtual Influencer', gradient: 'from-[#7c3aed] to-[#a855f7]' },
                  { icon: '🎬', label: 'Video Content', gradient: 'from-[#0ea5e9] to-[#7c3aed]' },
                ].map((item, index) => (
                  <div key={`${seriesIndex}-${index}`} className="flex-none w-70 h-90 rounded-xl overflow-hidden relative bg-[rgba(255,255,255,0.03)] backdrop-blur-md border border-[rgba(14,165,233,0.15)] transition-all duration-300 hover:translate-y-[-5px] hover:border-[rgba(14,165,233,0.4)] hover:shadow-[0_10px_30px_rgba(14,165,233,0.2)]">
                    <div className={`bg-gradient-to-br ${item.gradient} h-4/5 flex items-center justify-center text-5xl`}>
                      {item.icon}
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-[rgba(12,13,31,0.9)] backdrop-blur-md p-5 text-white font-medium border-t border-[rgba(14,165,233,0.2)]">
                      {item.label}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-12 py-24 max-w-7xl mx-auto" id="features">
        <h2 className="text-[2.75rem] text-center mb-16 bg-gradient-to-r from-white via-[#0ea5e9] to-[#7c3aed] bg-clip-text text-transparent font-bold">
          Revolutionary Features That Change Everything
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 mb-16">
          {[
            {
              icon: '📸',
              title: 'Your Face, Your Avatar',
              subtitle: '(Coming Soon)',
              description: 'Upload your photos and create content with YOUR own personalized AI avatar. Be the star of your content without ever recording a video!'
            },
            {
              icon: '🎤',
              title: 'Voice Cloning Magic',
              description: 'Just type your script and we\'ll clone your voice perfectly. No recording needed - your avatar speaks exactly like you with natural intonation.'
            },
            {
              icon: '⚡',
              title: 'One-Click Viral Content',
              description: 'Complete a simple form, and get trending-ready videos with professional editing, optimized copies, and social media formatting - all in minutes!'
            },
            {
              icon: '🎬',
              title: 'Fully Edited & Ready',
              description: 'No editing skills required! Get complete videos with trending effects, transitions, captions, and optimized copies ready to publish across all platforms.'
            },
            {
              icon: '📱',
              title: 'Multi-Platform Publishing',
              description: 'Automatically format and distribute your content across Facebook, Instagram, TikTok, YouTube with platform-specific optimizations.'
            },
            {
              icon: '🌍',
              title: '50+ Languages Support',
              description: 'Create content in any language with natural voice synthesis and accurate lip-sync. Reach global audiences effortlessly.'
            }
          ].map((feature, index) => (
            <div key={index} className="bg-[rgba(255,255,255,0.02)] rounded-2xl p-10 border border-[rgba(14,165,233,0.1)] backdrop-blur-md transition-all duration-300 hover:translate-y-[-8px] hover:border-[rgba(14,165,233,0.3)] hover:shadow-[0_20px_40px_rgba(14,165,233,0.15)] text-left">
              <div className="w-15 h-15 bg-gradient-to-br from-[#0ea5e9] to-[#7c3aed] rounded-xl flex items-center justify-center text-2xl mb-6 shadow-[0_0_20px_rgba(14,165,233,0.3)]">
                {feature.icon}
              </div>
              <h3 className="text-xl mb-4 text-white font-semibold">
                {feature.title}
                {feature.subtitle && <span className="text-sm text-[#0ea5e9] ml-2">{feature.subtitle}</span>}
              </h3>
              <p className="text-[rgba(255,255,255,0.7)] leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Time Comparison Section */}
      <section className="px-12 py-24 max-w-7xl mx-auto" id="trial">
        <h2 className="text-[2.75rem] text-center mb-4 bg-gradient-to-r from-white via-[#0ea5e9] to-[#7c3aed] bg-clip-text text-transparent font-bold">
          Traditional Content Creation vs CreateCast
        </h2>
        <p className="text-xl text-center text-[rgba(255,255,255,0.7)] mb-16">
          See the dramatic difference in time and effort
        </p>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 mb-16">
          {/* Old Way */}
          <div className="bg-[rgba(255,255,255,0.02)] rounded-2xl p-10 border border-[rgba(239,68,68,0.3)] backdrop-blur-md relative bg-[rgba(239,68,68,0.05)]">
            <div className="text-center mb-8">
              <h3 className="text-2xl mb-2 font-semibold text-[#ef4444]">The Old Way</h3>
              <p className="text-[rgba(239,68,68,0.8)] font-medium">Slow, Expensive, Complex</p>
            </div>
            <ul className="mb-8 space-y-3">
              {[
                { icon: '💭', step: 'Brainstorm Ideas', time: '45 min' },
                { icon: '📝', step: 'Write Script & Copy', time: '1.5 hours' },
                { icon: '🎥', step: 'Record Video', time: '2 hours' },
                { icon: '✂', step: 'Edit & Effects', time: '3 hours' },
                { icon: '📱', step: 'Format for Each Platform', time: '45 min' },
              ].map((item, index) => (
                <li key={index} className="flex items-center py-3 text-[rgba(255,255,255,0.8)] border-b border-[rgba(255,255,255,0.05)] last:border-b-0">
                  <span className="text-xl mr-3">{item.icon}</span>
                  <span className="flex-1">{item.step}</span>
                  <span className="text-sm text-[rgba(239,68,68,0.8)] font-medium">{item.time}</span>
                </li>
              ))}
            </ul>
            <div className="text-center p-4 bg-[rgba(239,68,68,0.1)] text-[#ef4444] rounded-xl font-bold text-xl border border-[rgba(239,68,68,0.3)]">
              ⏰ 8+ Hours
            </div>
          </div>

          {/* New Way */}
          <div className="bg-[rgba(255,255,255,0.02)] rounded-2xl p-10 border border-[rgba(14,165,233,0.3)] backdrop-blur-md relative bg-[rgba(14,165,233,0.05)] shadow-[0_0_30px_rgba(14,165,233,0.15)]">
            <div className="text-center mb-8">
              <h3 className="text-2xl mb-2 font-semibold text-[#0ea5e9]">The CreateCast Way</h3>
              <p className="text-[rgba(14,165,233,0.8)] font-medium">Fast, Simple, Powerful</p>
            </div>
            <ul className="mb-8 space-y-3">
              {[
                { icon: '💡', step: 'Tell Us Your Topic', time: '30 sec' },
                { icon: '🤖', step: 'AI Creates Script & Copy', time: '2 min' },
                { icon: '✨', step: 'One-Click Video + Editing', time: 'Avatar video with professional editing' },
                { icon: '📱', step: 'Post Everywhere You Like', time: '30 sec' },
              ].map((item, index) => (
                <li key={index} className="flex items-center py-3 text-[rgba(255,255,255,0.8)] border-b border-[rgba(255,255,255,0.05)] last:border-b-0">
                  <span className="text-xl mr-3">{item.icon}</span>
                  <span className="flex-1">{item.step}</span>
                  <span className="text-sm text-[rgba(14,165,233,0.8)] font-medium italic">{item.time}</span>
                </li>
              ))}
            </ul>
            <div className="text-center p-4 bg-[rgba(14,165,233,0.1)] text-[#0ea5e9] rounded-xl font-bold text-xl border border-[rgba(14,165,233,0.3)]">
              ⚡ 6 Minutes
            </div>
          </div>
        </div>

        <div className="text-center mb-12">
          <h4 className="text-2xl mb-4 bg-gradient-to-r from-[#0ea5e9] to-[#7c3aed] bg-clip-text text-transparent font-semibold">
            From Topic to Viral Video
          </h4>
          <ul className="max-w-2xl mx-auto space-y-2">
            {[
              'Just tell us what you want to talk about',
              'AI handles script, video, editing, everything',
              'Professional results in minutes, not hours'
            ].map((item, index) => (
              <li key={index} className="text-lg text-[rgba(255,255,255,0.8)] relative pl-6">
                <span className="absolute left-0 text-[#0ea5e9]">✨</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="text-center">
          <Link href="/auth" className="inline-block bg-gradient-to-br from-[#0ea5e9] to-[#7c3aed] text-white px-10 py-4 text-lg rounded-lg font-semibold transition-all duration-300 shadow-[0_0_30px_rgba(14,165,233,0.3)] hover:translate-y-[-2px] hover:shadow-[0_8px_25px_rgba(14,165,233,0.4)]">
            Turn Your Ideas Into Videos in Minutes
          </Link>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="px-12 py-24 text-center" id="pricing">
        <h3 className="text-[2.75rem] mb-16 bg-gradient-to-r from-white via-[#0ea5e9] to-[#7c3aed] bg-clip-text text-transparent font-bold">
          Choose Your Plan
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {[
            {
              title: 'Free Plan',
              price: '$0',
              period: '/month',
              features: [
                '~1 minute with Avatar Pro',
                '~2 minutes with Avatar Classic',
                '720p 30fps videos',
                '10 Classic Avatars',
                '3 Pro Avatars',
                'No support',
                'Watermark included',
                '2 editing templates'
              ],
              buttonText: 'Get Started Free',
              buttonStyle: 'secondary',
              featured: false
            },
            {
              title: 'Basic Plan',
              price: '$24.99',
              period: '/month',
              features: [
                '~10 minutes with Avatar Premium',
                '~20 minutes with Avatar Classic',
                '720p 60fps videos',
                '30+ Classic Avatars',
                '10+ Pro Avatars',
                '10+ languages',
                'Basic support (Email)',
                'Basic video templates'
              ],
              buttonText: 'Start Free Trial',
              buttonStyle: 'primary',
              featured: true
            },
            {
              title: 'Pro Plan',
              price: '$69.99',
              period: '/month',
              features: [
                '~25 minutes with Avatar Premium',
                '~50 minutes with Avatar Classic',
                '1080p 60fps videos',
                '100+ Classic Avatars',
                '50+ Pro Avatars',
                '50+ languages',
                'Priority support',
                'Custom brand logo in videos',
                'Premium video templates',
                'Access for 2 users'
              ],
              buttonText: 'Upgrade to Pro',
              buttonStyle: 'secondary',
              featured: false
            }
          ].map((plan, index) => (
            <div key={index} className={`bg-[rgba(255,255,255,0.02)] rounded-2xl p-8 border backdrop-blur-md relative transition-all duration-300 hover:translate-y-[-8px] min-h-[480px] flex flex-col ${plan.featured ? 'border-[rgba(124,58,237,0.4)] bg-[rgba(124,58,237,0.05)] shadow-[0_0_30px_rgba(124,58,237,0.2)]' : 'border-[rgba(14,165,233,0.1)] hover:border-[rgba(14,165,233,0.3)] hover:shadow-[0_20px_40px_rgba(14,165,233,0.15)]'}`}>
              {plan.featured && (
                <div className="absolute -top-2.5 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-[#0ea5e9] to-[#7c3aed] text-white px-4 py-1.5 rounded-full text-xs font-semibold">
                  Most Popular
                </div>
              )}
              <h4 className="text-xl mb-4 text-white font-semibold">{plan.title}</h4>
              <div className="text-[2.2rem] font-bold mb-2 bg-gradient-to-r from-[#0ea5e9] to-[#7c3aed] bg-clip-text text-transparent">
                {plan.price}
              </div>
              <div className="text-[rgba(255,255,255,0.6)] text-sm mb-8">{plan.period}</div>
              <ul className="text-left mb-8 flex-grow space-y-2">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="text-[rgba(255,255,255,0.8)] relative pl-6 text-sm leading-relaxed">
                    <span className="absolute left-0 text-[#0ea5e9] font-bold">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <Link 
                href="/auth" 
                className={`w-full py-4 rounded-lg font-semibold transition-all duration-300 text-sm mt-auto ${
                  plan.buttonStyle === 'primary' 
                    ? 'bg-gradient-to-br from-[#0ea5e9] to-[#7c3aed] text-white shadow-[0_4px_15px_rgba(14,165,233,0.3)] hover:translate-y-[-2px] hover:shadow-[0_8px_25px_rgba(14,165,233,0.4)]' 
                    : 'bg-[rgba(255,255,255,0.05)] text-white border border-[rgba(14,165,233,0.2)] hover:bg-[rgba(14,165,233,0.1)] hover:border-[rgba(14,165,233,0.4)]'
                }`}
              >
                {plan.buttonText}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Integrations */}
      <section className="text-center px-12 py-24">
        <h3 className="text-2xl mb-12 text-[rgba(255,255,255,0.9)] font-semibold">
          Integrate with leading platforms:
        </h3>
        <div className="overflow-hidden relative w-full">
          <div className="flex items-center gap-16 animate-[scrollPlatforms_30s_linear_infinite] w-max">
            {[...Array(4)].map((_, seriesIndex) => (
              <div key={seriesIndex} className="flex items-center gap-16">
                {['📘', '📷', '🎵', '📺', '🎭'].map((platform, index) => (
                  <div key={`${seriesIndex}-${index}`} className="w-25 h-25 bg-[rgba(255,255,255,0.02)] rounded-xl flex items-center justify-center backdrop-blur-md border border-[rgba(14,165,233,0.1)] transition-all duration-300 hover:translate-y-[-5px] hover:border-[rgba(14,165,233,0.3)] hover:shadow-[0_10px_25px_rgba(14,165,233,0.2)] text-5xl flex-shrink-0">
                    {platform}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-12 py-24 max-w-4xl mx-auto" id="faq">
        <h3 className="text-[2.5rem] text-center mb-12 bg-gradient-to-r from-white via-[#0ea5e9] to-[#7c3aed] bg-clip-text text-transparent font-bold">
          FAQ
        </h3>
        {[
          {
            question: 'What is CreateCast?',
            answer: 'CreateCast is an all-in-one platform that allows you to create AI avatars, generate engaging content, and automatically distribute it across multiple social media platforms including Facebook, Instagram, TikTok, and YouTube.'
          },
          {
            question: 'How does the AI avatar creation work?',
            answer: 'Our advanced AI technology allows you to create realistic virtual influencers and avatars. You can customize their appearance, voice, and personality to match your brand or creative vision.'
          },
          {
            question: 'Can I schedule posts automatically?',
            answer: 'Yes! CreateCast includes automated scheduling and distribution features that allow you to plan and publish content across all your connected social media platforms simultaneously.'
          },
          {
            question: 'What platforms do you integrate with?',
            answer: 'We integrate with Facebook, Instagram, TikTok, YouTube, and HeyGen, with more platforms being added regularly based on user demand.'
          },
          {
            question: 'Is there a free trial?',
            answer: 'Yes! We offer a 7-day free trial with full access to all features. No credit card required to get started.'
          }
        ].map((faq, index) => (
          <div key={index} className="bg-[rgba(255,255,255,0.02)] rounded-xl mb-4 border border-[rgba(14,165,233,0.1)] overflow-hidden transition-all duration-300 hover:border-[rgba(14,165,233,0.2)]">
            <div 
              className="p-6 cursor-pointer font-semibold flex justify-between items-center transition-all duration-300 hover:bg-[rgba(14,165,233,0.05)]"
              onClick={() => toggleFaq(index)}
            >
              {faq.question}
              <span className="text-[#0ea5e9] transition-transform duration-300 text-xl">
                {activeFaq === index ? '×' : '+'}
              </span>
            </div>
            <div className={`px-6 pb-6 text-[rgba(255,255,255,0.7)] leading-relaxed transition-all duration-300 ${activeFaq === index ? 'block' : 'hidden'}`}>
              {faq.answer}
            </div>
          </div>
        ))}
      </section>

      {/* Footer */}
      <footer className="text-center py-12 text-[rgba(255,255,255,0.5)] border-t border-[rgba(14,165,233,0.1)] mt-16">
        <p>&copy; 2025 CreateCast. All rights reserved. | Terms of Service | <Link href="/privacy" className="text-[#0ea5e9] hover:text-[#7c3aed] transition-colors duration-300">Privacy Policy</Link></p>
      </footer>

      <style jsx>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(calc(-2rem * 6 - 280px * 6)); }
        }
        
        @keyframes scrollPlatforms {
          0% { transform: translateX(0); }
          100% { transform: translateX(calc(-4rem * 5 - 100px * 5)); }
        }
      `}</style>
    </div>
  );
}