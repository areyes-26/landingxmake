'use client';

import Link from 'next/link';
import { useState, useRef } from 'react';
import { Instagram } from 'lucide-react';
import { SiTiktok, SiYoutube, SiLinkedin } from 'react-icons/si';
import { RiTwitterXFill } from 'react-icons/ri';

function CarouselCard({
  icon,
  label,
  gradient,
  video
}: {
  icon?: string;
  label: string;
  gradient?: string;
  video?: string;
}) {
  return (
    <div className="relative rounded-2xl p-[2px] animate-gradient-border bg-[linear-gradient(120deg,#0ea5e9,#7c3aed,#0ea5e9)] shadow-[0_4px_24px_rgba(14,165,233,0.10)]" style={{overflow: 'hidden'}}>
      <div className="flex-none w-72 sm:w-80 md:w-[23rem] h-[28rem] sm:h-[32rem] md:h-[36rem] rounded-2xl overflow-hidden relative bg-[rgba(255,255,255,0.03)] backdrop-blur-md flex flex-col z-10">
        <div className="flex-1 w-full h-full flex items-center justify-center text-6xl text-white relative">
          {video ? (
            <video
              src={video}
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
              style={{ zIndex: 1 }}
            />
          ) : (
            <span className={`relative z-10 ${gradient ? `bg-gradient-to-br ${gradient}` : ''} w-full h-full flex items-center justify-center`}>{icon}</span>
          )}
          {/* Overlay para el borde y el fondo de gradiente si hay video */}
          {video && gradient && (
            <div className={`absolute inset-0 w-full h-full pointer-events-none z-10 bg-gradient-to-br ${gradient} opacity-60`}></div>
          )}
        </div>
        <div className="absolute bottom-0 left-0 right-0 bg-[#18192b] p-3 sm:p-4 md:p-5 text-white font-medium text-sm sm:text-base z-20 flex items-center gap-2">
          {icon && <span className="text-lg sm:text-xl md:text-2xl">{icon}</span>}
          {label}
        </div>
      </div>
    </div>
  );
}


export default function InicioPage() {
  const [activeFaq, setActiveFaq] = useState(-1);

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? -1 : index);
  };

  return (
    <div className="min-h-screen bg-[#0c0d1f] text-white overflow-x-hidden">
      {/* Hero Section */}
      <section className="text-center px-4 sm:px-8 md:px-12 py-12 sm:py-16 md:pt-24 md:pb-15 max-w-7xl mx-auto">
        <div className="inline-block bg-[rgba(14,165,233,0.1)] text-[#0ea5e9] px-3 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium mb-4 sm:mb-8 border border-[rgba(14,165,233,0.2)]">
          #1 AI Avatar Platform
        </div>
        <h1 className="main-gradient-animated text-[clamp(1.75rem,4vw,4.5rem)] sm:text-[clamp(2.5rem,5vw,4.5rem)] font-bold leading-tight mb-4 sm:mb-8">
          Create AI Avatars, Generate Content, and Post to Social Media - All in One Platform
        </h1>
        <p className="text-base sm:text-lg md:text-xl text-[rgba(255,255,255,0.7)] max-w-4xl mx-auto mb-6 sm:mb-12 leading-relaxed">
          The complete solution for businesses to build virtual influencers, produce engaging videos, and automatically distribute content across Facebook, Instagram, TikTok, and YouTube.
        </p>
        <Link href="/auth?mode=signup" className="inline-block bg-gradient-to-br from-[#0ea5e9] to-[#7c3aed] text-white px-6 sm:px-8 md:px-10 py-3 sm:py-4 text-base sm:text-lg rounded-lg font-semibold transition-all duration-300 mb-12 sm:mb-16 md:mb-24 shadow-[0_0_30px_rgba(14,165,233,0.3)] hover:translate-y-[-2px] hover:shadow-[0_8px_25px_rgba(14,165,233,0.4)]">
          Get Started
        </Link>
      </section>

{/* Carousel Section */}
<section className="px-4 sm:px-8 md:px-12 pt-16 sm:pt-20 md:pt-24 py-4 sm:py-6 md:py-8 mb-4 sm:mb-6 md:mb-8 -mt-8">
  <div className="relative overflow-hidden w-full mx-auto">
    <div className="flex gap-4 sm:gap-6 md:gap-8 animate-[scroll_50s_linear_infinite] w-max">
      {[...Array(3)].map((_, seriesIndex) => (
        <div key={seriesIndex} className="flex gap-4 sm:gap-6 md:gap-8">
          {[
            { label: 'Business Avatar', video: 'https://files2.heygen.ai/avatar/v3/d339b3e2c4b64c21a8c335f976bf1e19/full/2.2/preview_video_target.mp4', icon: '👩‍💼' },
            { label: 'Gaming Character', video: 'https://files2.heygen.ai/avatar/v3/d52afa328644462aad0267090450b596/full/2.2/preview_video_target.mp4', icon: '🎮' },
            { label: 'Creative Content', video: 'https://files2.heygen.ai/avatar/v3/4c27b9401f714a22b2df6122219e75e5/full/2.2/preview_video_target.mp4', icon: '🎨' },
            { label: 'Social Media', video: 'https://files2.heygen.ai/avatar/v3/20a6b04271c44c63855e5e13ef96c708/full/2.2/preview_video_target.mp4', icon: '📱' },
            { label: 'Education Avatar', video: 'https://files2.heygen.ai/avatar/v3/7d8265c9d5994e26bc5193a0fdebfd3d/full/2.2/preview_video_target.mp4', icon: '🎓' },
            { label: 'Health & Wellness', video: 'https://files2.heygen.ai/avatar/v3/7cda83478bc14c07965b690934292a55_38730/preview_video_talk_1.mp4', icon: '🧘‍♂️' }
          ].map((item, index) => (
            <CarouselCard
              key={`${seriesIndex}-${index}`}
              label={item.label}
              video={item.video}
              icon={item.icon}
            />
          ))}
        </div>
      ))}
    </div>
  </div>
</section>



      {/* Features Section */}
      <section className="px-4 sm:px-8 md:px-12 py-12 sm:py-16 md:pt-24 md:pb-[28px] max-w-7xl mx-auto" id="features">
        <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] sm:text-[2.75rem] text-center mb-8 sm:mb-12 md:mb-16 bg-gradient-to-r from-white via-[#0ea5e9] to-[#7c3aed] bg-clip-text text-transparent font-bold">
          Revolutionary Features That Change Everything
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 md:gap-10 mb-8 sm:mb-12 md:mb-16">
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
            <div key={index} className="bg-[rgba(255,255,255,0.02)] rounded-2xl p-6 sm:p-8 md:p-10 border border-[rgba(14,165,233,0.1)] backdrop-blur-md transition-all duration-300 hover:translate-y-[-8px] hover:border-[rgba(14,165,233,0.3)] hover:shadow-[0_20px_40px_rgba(14,165,233,0.15)] text-left">
              <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-15 md:h-15 bg-gradient-to-br from-[#0ea5e9] to-[#7c3aed] rounded-xl flex items-center justify-center text-xl sm:text-2xl mb-4 sm:mb-6 shadow-[0_0_20px_rgba(14,165,233,0.3)]">
                {feature.icon}
              </div>
              <h3 className="text-lg sm:text-xl mb-3 sm:mb-4 text-white font-semibold">
                {feature.title}
                {feature.subtitle && <span className="text-xs sm:text-sm text-[#0ea5e9] ml-2">{feature.subtitle}</span>}
              </h3>
              <p className="text-sm sm:text-base text-[rgba(255,255,255,0.7)] leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Time Comparison Section */}
      <section className="px-4 sm:px-8 md:px-12 py-12 sm:py-16 md:pt-24 md:pb-[76px] max-w-7xl mx-auto" id="trial">
        <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] sm:text-[2.75rem] text-center mb-2 sm:mb-4 bg-gradient-to-r from-white via-[#0ea5e9] to-[#7c3aed] bg-clip-text text-transparent font-bold">
          Traditional Content Creation vs Visiora
        </h2>
        <p className="text-lg sm:text-xl text-center text-[rgba(255,255,255,0.7)] mb-8 sm:mb-12 md:mb-16">
          See the dramatic difference in time and effort
        </p>
        
        <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-10 sm:gap-14 md:gap-20 mb-12 sm:mb-16 md:mb-20 max-w-6xl mx-auto items-stretch">
          {/* Old Way */}
          <div className="bg-[rgba(255,255,255,0.04)] rounded-3xl p-12 sm:p-20 md:p-24 border-2 border-[rgba(239,68,68,0.3)] backdrop-blur-xl relative shadow-[0_8px_40px_rgba(239,68,68,0.10)] min-h-[650px] flex flex-col justify-between w-full max-w-3xl mx-auto">
            <div>
              <div className="text-center mb-8">
                <h3 className="text-2xl sm:text-3xl mb-2 font-bold text-[#ef4444]">The Old Way</h3>
                <p className="text-base sm:text-lg text-[rgba(239,68,68,0.8)] font-medium">Slow, Expensive, Complex</p>
              </div>
              <ul className="mb-8 space-y-3 text-lg">
                {[
                  { icon: '💭', step: 'Brainstorm Ideas', time: '45 min' },
                  { icon: '📝', step: 'Write Script & Copy', time: '1.5 hours' },
                  { icon: '🎥', step: 'Record Video', time: '2 hours' },
                  { icon: '✂', step: 'Edit & Effects', time: '3 hours' },
                  { icon: '📱', step: 'Format for Each Platform', time: '45 min' },
                ].map((item, index) => (
                  <li key={index} className="flex items-center py-3 text-lg text-[rgba(255,255,255,0.85)] border-b border-[rgba(255,255,255,0.07)] last:border-b-0">
                    <span className="text-2xl mr-3 animate-emoji-pop">{item.icon}</span>
                    <span className="flex-1">{item.step}</span>
                    <span className="text-base text-[rgba(239,68,68,0.8)] font-medium">{item.time}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="text-center p-4 bg-[rgba(239,68,68,0.12)] text-[#ef4444] rounded-xl font-bold text-xl border border-[rgba(239,68,68,0.3)] mt-4">
              ⏰ 8+ Hours
            </div>
          </div>

          {/* Divisor VS */}
          <div className="hidden lg:flex flex-col items-center justify-center absolute left-1/2 top-0 -translate-x-1/2 h-full z-10 pointer-events-none">
            <div className="w-1 h-2/5 bg-gradient-to-b from-transparent via-[#0ea5e9] to-transparent opacity-60"></div>
            <div className="text-3xl font-black text-white bg-gradient-to-r from-[#0ea5e9] to-[#7c3aed] bg-clip-text text-transparent drop-shadow-lg my-2">VS.</div>
            <div className="w-1 h-2/5 bg-gradient-to-t from-transparent via-[#0ea5e9] to-transparent opacity-60"></div>
          </div>
          {/* VS para móviles */}
          <div className="block lg:hidden text-center my-8 text-2xl font-black text-white bg-gradient-to-r from-[#0ea5e9] to-[#7c3aed] bg-clip-text text-transparent drop-shadow-lg">VS.</div>

          {/* New Way */}
          <div className="bg-[rgba(255,255,255,0.04)] rounded-3xl p-12 sm:p-20 md:p-24 border-2 border-[rgba(14,165,233,0.3)] backdrop-blur-xl relative shadow-[0_8px_40px_rgba(14,165,233,0.10)] min-h-[650px] flex flex-col justify-between w-full max-w-3xl mx-auto">
            <div>
              <div className="text-center mb-8">
                <h3 className="text-2xl sm:text-3xl mb-2 font-bold text-[#0ea5e9]">The Visiora Way</h3>
                <p className="text-base sm:text-lg text-[rgba(14,165,233,0.8)] font-medium">Fast, Simple, Powerful</p>
              </div>
              <ul className="mb-8 space-y-3 text-lg">
                {[
                  { icon: '💡', step: 'Tell Us Your Topic', time: '30 sec' },
                  { icon: '🤖', step: 'AI Creates Script & Copy', time: '2 min' },
                  { icon: '✨', step: 'One-Click Video + Editing', time: '5 min' },
                  { icon: '📱', step: 'Post Everywhere You Like', time: '30 sec' },
                ].map((item, index) => (
                  <li key={index} className="flex items-center py-3 text-lg text-[rgba(255,255,255,0.85)] border-b border-[rgba(255,255,255,0.07)] last:border-b-0">
                    <span className="text-2xl mr-3 animate-emoji-pop">{item.icon}</span>
                    <span className="flex-1">{item.step}</span>
                    <span className="text-base text-[rgba(14,165,233,0.8)] font-medium italic">{item.time}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="text-center p-4 bg-[rgba(14,165,233,0.12)] text-[#0ea5e9] rounded-xl font-bold text-xl border border-[rgba(14,165,233,0.3)] mt-4">
              ⚡ 8 minutes
            </div>
          </div>
        </div>

        {/* Nueva sección visual para "From Topic to Viral Video" */}
        <div className="flex justify-center mt-[60px] mb-12">
          <div className="bg-[rgba(14,165,233,0.08)] border-2 border-[rgba(14,165,233,0.18)] rounded-3xl shadow-[0_8px_40px_rgba(14,165,233,0.10)] px-8 sm:px-16 py-10 max-w-2xl w-full text-center backdrop-blur-xl animate-fade-in">
            <h4 className="text-2xl sm:text-3xl mb-5 bg-gradient-to-r from-[#0ea5e9] to-[#7c3aed] bg-clip-text text-transparent font-bold">
              From Topic to Viral Video
            </h4>
            <ul className="space-y-3 mb-6">
              {[
                'Just tell us what you want to talk about',
                'AI handles script, video, editing, everything',
                'Professional results in minutes, not hours'
              ].map((item, index) => (
                <li key={index} className="text-lg sm:text-xl text-[rgba(255,255,255,0.9)] flex items-center justify-center gap-3">
                  <span className="text-2xl animate-emoji-pop">✨</span>
                  {item}
                </li>
              ))}
            </ul>
            <Link href="/auth?mode=signup" className="inline-block bg-gradient-to-br from-[#0ea5e9] to-[#7c3aed] text-white px-8 sm:px-12 py-4 text-lg sm:text-xl rounded-xl font-semibold transition-all duration-300 shadow-[0_0_30px_rgba(14,165,233,0.3)] hover:translate-y-[-2px] hover:shadow-[0_8px_25px_rgba(14,165,233,0.4)]">
              Turn Your Ideas Into Videos in Minutes
            </Link>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="px-4 sm:px-8 md:px-12 py-12 sm:py-16 md:py-24 text-center" id="pricing">
        <h3 className="text-[clamp(1.75rem,4vw,2.75rem)] sm:text-[2.75rem] mb-8 sm:mb-12 md:mb-16 bg-gradient-to-r from-white via-[#0ea5e9] to-[#7c3aed] bg-clip-text text-transparent font-bold">
          Choose Your Plan
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-10 max-w-6xl mx-auto">
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
            <div
              key={index}
              className={`bg-[rgba(255,255,255,0.02)] rounded-2xl p-6 sm:p-10 border backdrop-blur-md relative transition-all duration-300 hover:translate-y-[-8px] flex flex-col min-h-[520px] h-auto w-full max-w-xs mx-auto md:min-h-[800px] md:h-[900px] md:w-[400px] ${plan.featured ? 'border-[rgba(124,58,237,0.4)] bg-[rgba(124,58,237,0.05)] shadow-[0_0_30px_rgba(124,58,237,0.2)]' : 'border-[rgba(14,165,233,0.1)] hover:border-[rgba(14,165,233,0.3)] hover:shadow-[0_20px_40px_rgba(14,165,233,0.15)]'}`}
              style={
                plan.title === 'Free Plan'
                  ? { right: 0 }
                  : plan.title === 'Pro Plan'
                  ? { left: 0, right: 'auto' }
                  : undefined
              }
            >
              {plan.featured && (
                <div className="absolute -top-2.5 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-[#0ea5e9] to-[#7c3aed] text-white px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs font-semibold">
                  Most Popular
                </div>
              )}
              <h4 className="text-xl sm:text-2xl md:text-3xl mb-4 text-white font-semibold">{plan.title}</h4>
              <div className="flex items-center justify-center gap-2 mb-3">
                <span className="text-[2.3rem] sm:text-[2.8rem] md:text-[3.2rem] font-bold bg-gradient-to-r from-[#0ea5e9] to-[#7c3aed] bg-clip-text text-transparent">{plan.price}</span>
                <span className="text-[rgba(255,255,255,0.6)] text-xs sm:text-sm">/month</span>
              </div>
              <ul className={`text-left mb-7 sm:mb-10 flex-grow space-y-2 sm:space-y-3 ${plan.title === 'Pro Plan' ? 'text-base sm:text-lg md:text-xl' : 'text-base sm:text-lg md:text-xl'}`}>
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="text-[rgba(255,255,255,0.85)] relative pl-6 sm:pl-8 leading-relaxed break-words">
                    <span className="absolute left-0 text-[#0ea5e9] font-bold">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <div className="w-full flex flex-col justify-end flex-grow">
                <Link 
                  href="/auth?mode=signup" 
                  className={`w-full py-4 sm:py-5 rounded-lg font-semibold transition-all duration-300 text-base sm:text-lg mt-auto ${
                    plan.buttonStyle === 'primary' 
                      ? 'bg-gradient-to-br from-[#0ea5e9] to-[#7c3aed] text-white shadow-[0_4px_15px_rgba(14,165,233,0.3)] hover:translate-y-[-2px] hover:shadow-[0_8px_25px_rgba(14,165,233,0.4)]' 
                      : 'bg-[rgba(255,255,255,0.05)] text-white border border-[rgba(14,165,233,0.2)] hover:bg-[rgba(14,165,233,0.1)] hover:border-[rgba(14,165,233,0.4)]'
                  }`}
                >
                  {plan.buttonText}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Integrations */}
      <section className="text-center px-4 sm:px-8 md:px-12 pt-10 pb-24 sm:pt-16 sm:pb-32 md:pt-20 md:pb-20">
        <h3 className="text-2xl sm:text-3xl mb-8 sm:mb-12 text-[rgba(255,255,255,0.95)] font-bold">
          Integrated with leading platforms <span className="text-base font-normal text-[rgba(14,165,233,0.8)] animate-fade-loop">(and more to come...)</span>
        </h3>
        <div className="overflow-hidden relative w-full mt-40 mb-0">
          <div className="flex items-center gap-10 sm:gap-14 md:gap-20 animate-[scrollPlatforms_30s_linear_infinite] w-max">
            {[...Array(4)].map((_, seriesIndex) => (
              <div key={seriesIndex} className="flex items-center gap-10 sm:gap-14 md:gap-20">
                {[
                  <Instagram key="instagram" className="text-[#E1306C] w-14 h-14 md:w-20 md:h-20" />,
                  <SiTiktok key="tiktok" className="text-[#000000] w-14 h-14 md:w-20 md:h-20" />,
                  <SiYoutube key="youtube" className="text-[#FF0000] w-14 h-14 md:w-20 md:h-20" />,
                  <SiLinkedin key="linkedin" className="text-[#0077B5] w-14 h-14 md:w-20 md:h-20" />,
                  <RiTwitterXFill key="x" className="text-white w-14 h-14 md:w-20 md:h-20" />,
                ].map((icon, index) => (
                  <div key={`${seriesIndex}-${index}`} className="w-24 h-24 md:w-32 md:h-32 bg-[rgba(255,255,255,0.02)] rounded-2xl flex items-center justify-center backdrop-blur-md border border-[rgba(14,165,233,0.1)] text-4xl md:text-6xl flex-shrink-0">
                    {icon}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-4 sm:px-8 md:px-12 py-12 sm:py-16 md:py-24 max-w-4xl mx-auto" id="faq">
        <h3 className="text-[clamp(1.75rem,4vw,2.5rem)] sm:text-[2.5rem] text-center mb-8 sm:mb-12 bg-gradient-to-r from-white via-[#0ea5e9] to-[#7c3aed] bg-clip-text text-transparent font-bold">
          FAQ
        </h3>
        {[
          {
            question: 'What is Visiora?',
            answer: 'Visiora is an all-in-one platform that allows you to create AI avatars, generate engaging content, and automatically distribute it across multiple social media platforms including Facebook, Instagram, TikTok, and YouTube.'
          },
          {
            question: 'How does the AI avatar creation work?',
            answer: 'Our advanced AI technology allows you to create realistic virtual influencers and avatars. You can customize their appearance, voice, and personality to match your brand or creative vision.'
          },
          {
            question: 'Can I schedule posts automatically?',
            answer: 'Yes! Visiora includes automated scheduling and distribution features that allow you to plan and publish content across all your connected social media platforms simultaneously.'
          },
          {
            question: 'What platforms do you integrate with?',
            answer: 'We integrate with Facebook, Instagram, TikTok, and YouTube, with more platforms being added regularly based on user demand.'
          },
          {
            question: 'Is there a free trial?',
            answer: 'Yes! We offer a 7-day free trial with full access to all features. No credit card required to get started.'
          }
        ].map((faq, index) => (
          <div key={index} className="bg-[rgba(255,255,255,0.02)] rounded-xl mb-3 sm:mb-4 border border-[rgba(14,165,233,0.1)] overflow-hidden transition-all duration-300 hover:border-[rgba(14,165,233,0.2)]">
            <div 
              className="p-4 sm:p-6 cursor-pointer font-semibold flex justify-between items-center transition-all duration-300 hover:bg-[rgba(14,165,233,0.05)] text-sm sm:text-base"
              onClick={() => toggleFaq(index)}
            >
              {faq.question}
              <span className="text-[#0ea5e9] transition-transform duration-300 text-lg sm:text-xl">
                {activeFaq === index ? '×' : '+'}
              </span>
            </div>
            <div className={`px-4 sm:px-6 pb-4 sm:pb-6 text-[rgba(255,255,255,0.7)] leading-relaxed transition-all duration-300 text-sm sm:text-base ${activeFaq === index ? 'block' : 'hidden'}`}>
              {faq.answer}
            </div>
          </div>
        ))}
      </section>

      {/* Footer */}
      <footer className="text-center py-8 sm:py-12 text-[rgba(255,255,255,0.5)] border-t border-[rgba(14,165,233,0.1)] mt-8 sm:mt-12 md:mt-16 text-sm sm:text-base">
        <p>&copy; 2025 Visiora. All rights reserved. | <Link href="/terms-conditions" className="text-[#0ea5e9] hover:text-[#7c3aed] transition-colors duration-300">Terms of Service</Link> | <Link href="/privacy" className="text-[#0ea5e9] hover:text-[#7c3aed] transition-colors duration-300">Privacy Policy</Link></p>
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

      <style jsx global>{`
      @keyframes emoji-pop {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.25); }
      }
      .animate-emoji-pop {
        animation: emoji-pop 1.8s infinite;
      }
      @keyframes fade-in {
        from { opacity: 0; transform: translateY(30px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .animate-fade-in {
        animation: fade-in 1.2s cubic-bezier(0.4,0,0.2,1) both;
      }
      @keyframes fade-loop {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.4; }
      }
      .animate-fade-loop {
        animation: fade-loop 2.5s infinite;
      }
      .main-gradient-animated {
        background: linear-gradient(90deg, #0ea5e9, #7c3aed, #0ea5e9, #7c3aed);
        background-size: 300% 100%;
        background-clip: text;
        -webkit-background-clip: text;
        color: transparent;
        -webkit-text-fill-color: transparent;
        animation: gradient-move 6s linear infinite;
      }
      @keyframes gradient-move {
        0% { background-position: 0% 50%; }
        100% { background-position: 100% 50%; }
      }
      @keyframes gradient-border {
        0% { background-position: 0% 50%; }
        100% { background-position: 100% 50%; }
      }
      .animate-gradient-border {
        background-size: 200% 200%;
        animation: gradient-border 6s linear infinite;
      }
      `}</style>
    </div>
  );
}