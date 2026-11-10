import React from 'react';
import { 
  ShieldCheck, Award, Users, Lock, RefreshCw, 
  Clock, CheckCircle, FileText, PhoneCall, Sparkles
} from 'lucide-react';

export const WhyChooseVIBSection: React.FC = () => {
  const trustPillars = [
    {
      icon: <Award className="w-6 h-6 text-purple-400" />,
      title: 'MSME Registered & Licensed',
      description: 'Fully compliant digital service provider operating with formal MSME Udyam registration, trade licenses, and official bank accounts. Legitimate operations with real accountability.'
    },
    {
      icon: <ShieldCheck className="w-6 h-6 text-green-400" />,
      title: '100% Manual Human Escrow',
      description: 'Zero automated bots or risky third-party scripts. Every single profile inspection, delivery, and rank service is conducted manually by senior VIB executives to protect your security.'
    },
    {
      icon: <Users className="w-6 h-6 text-blue-400" />,
      title: 'Verified Radiant Specialists',
      description: 'Rank progression and coaching are performed exclusively by verified Radiant and Immortal competitive players. Strict fair-play adherence with zero third-party software.'
    },
    {
      icon: <RefreshCw className="w-6 h-6 text-yellow-400" />,
      title: 'Tiered Refund Guarantee',
      description: 'Transparent, upfront refund policies. Enjoy a 100% full refund guarantee up to Ascendant 2 if milestones are not met, with tiered coverage extending into Radiant.'
    },
    {
      icon: <Lock className="w-6 h-6 text-fuchsia-400" />,
      title: 'Secure Delivery & Privacy',
      description: 'Encrypted credential transmission via secure private links. VPN shielding and offline mode guarantee complete player confidentiality at all times.'
    },
    {
      icon: <PhoneCall className="w-6 h-6 text-cyan-400" />,
      title: 'Direct WhatsApp & Email Support',
      description: 'Connect directly with verified VIB team members 24/7 via WhatsApp (+91 80996 41606) and official email (teamvibofficial@gmail.com). No automated bot runarounds.'
    }
  ];

  return (
    <section className="py-20 px-4 md:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="text-center max-w-3xl mx-auto mb-14">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-semibold uppercase tracking-wider mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          The VIB Standard of Excellence
        </div>
        <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight">
          Why Choose <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400">VIB</span>
        </h2>
        <p className="text-gray-400 text-base md:text-lg mt-3">
          India's most trusted esports digital service platform. Built for gamers who demand authenticity, elite execution, and unbreakable security.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {trustPillars.map((pillar, idx) => (
          <div 
            key={idx} 
            className="bg-[#0f101d] border border-white/10 hover:border-purple-500/50 rounded-2xl p-6 sm:p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(147,51,234,0.15)] flex flex-col justify-between group"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                {pillar.icon}
              </div>
              <h3 className="text-lg font-bold text-white mb-2.5 group-hover:text-purple-300 transition-colors">
                {pillar.title}
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                {pillar.description}
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-white/5 flex items-center gap-2 text-xs text-purple-400 font-mono">
              <CheckCircle className="w-3.5 h-3.5 text-green-400" />
              <span>VIB Certified Protocol</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
