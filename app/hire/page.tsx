import React from "react";
import { Metadata } from "next";
import {
  FaCheck,
  FaTv,
  FaMicrophone,
  FaUsers,
  FaCalendarAlt,
  FaStar,
  FaGamepad,
  FaHandshake,
  FaChartLine,
  FaGlassCheers,
  FaBuilding,
  FaDumbbell,
  FaHotel,
  FaUtensils,
  FaLaptop,
} from "react-icons/fa";
import { HeroSection, FAQSection } from "@/components/landing";
import { EventGallery } from "@lozzalingo/events-ui/components";
import HireEnquiryForm from "./HireEnquiryForm";

export const metadata: Metadata = {
  title: "Hire a Quiz Master - Recurring Quiz Nights for Your Venue | Fat Big Quiz",
  description:
    "Hire a professional quiz master for your pub, members club, gym, hotel, or restaurant. Weekly, monthly, or yearly contracts. Two tiers: The Show (full production) or Unplugged (elevated pub quiz).",
  openGraph: {
    title: "Hire a Quiz Master - Fat Big Quiz",
    description:
      "Professional recurring quiz nights for venues. Full production or stripped-back elevated pub quiz.",
    images: [
      { url: "/fat-big-quiz-event.png", width: 1200, height: 630, alt: "Fat Big Quiz Hire" },
    ],
  },
};

const GALLERY_IMAGES = [
  "/hire-gallery/quiz-night-2.jpg",
  "/hire-gallery/quiz-night-6.jpg",
  "/hire-gallery/quiz-night-9.jpg",
  "/hire-gallery/quiz-night-11.jpg",
  "/hire-gallery/quiz-night-12.jpg",
  "/hire-gallery/quiz-night-16.jpg",
  "/hire-gallery/quiz-night-19.jpg",
  "/hire-gallery/quiz-night-30.jpg",
  "/hire-gallery/quiz-crowd-1.jpg",
  "/hire-gallery/quiz-crowd-2.jpg",
  "/hire-gallery/quiz-crowd-3.jpg",
  "/hire-gallery/quiz-crowd-4.jpg",
  "/hire-gallery/quiz-crowd-5.jpg",
  "/hire-gallery/quiz-crowd-6.jpg",
  "/hire-gallery/quiz-crowd-7.jpg",
  "/hire-gallery/quiz-event-1.jpg",
  "/hire-gallery/fake-news.jpg",
  "/hire-gallery/higher-or-lower.jpg",
];

export default function HirePage() {
  const showFeatures = [
    "Quiz master and quiz assistants",
    "Stage setup with screen and graphics",
    "Professional audio system",
    "Props, life-size cutouts, and handouts",
    "Interactive games and betting rounds",
    "Special guests and quirky creative rounds",
    "The full theatrical, immersive experience",
  ];

  const unpluggedFeatures = [
    "Professional quiz master",
    "Portable speaker system",
    "Quiz packs and handouts",
    "Interesting games and creative rounds",
    "Betting rounds",
    "Small portable game",
    "Traditional pub quiz feel, but better",
  ];

  const venueTypes = [
    {
      icon: FaGlassCheers,
      name: "Pubs",
      description:
        "The classic quiz night market. Our edge is production quality that keeps punters coming back week after week.",
    },
    {
      icon: FaBuilding,
      name: "Members Clubs",
      description:
        "Regular programming that gives members a reason to show up. Social, competitive, and community-building.",
    },
    {
      icon: FaDumbbell,
      name: "Gyms",
      description:
        "Boutique and social gyms wanting community events beyond the workout. Perfect for member retention.",
    },
    {
      icon: FaHotel,
      name: "Hotels",
      description:
        "Conference entertainment, corporate away days, or regular guest programming. We bring the energy.",
    },
    {
      icon: FaLaptop,
      name: "Coworking Spaces",
      description:
        "Community events that get people out from behind their screens. Team-building that actually works.",
    },
    {
      icon: FaUtensils,
      name: "Restaurants",
      description:
        "Midweek footfall drivers that fill tables on quiet nights. Quiz and dine packages welcome.",
    },
  ];

  const benefits = [
    {
      icon: FaChartLine,
      title: "Increased Footfall",
      description:
        "Venues report 40-60% higher midweek attendance with a regular quiz night. Regulars bring friends.",
    },
    {
      icon: FaHandshake,
      title: "Zero Hassle",
      description:
        "We handle everything: content, equipment, hosting, scoring. You just open the doors and pour the drinks.",
    },
    {
      icon: FaCalendarAlt,
      title: "Consistent Quality",
      description:
        "Fresh content every session. No repeated questions, no stale rounds. Your regulars stay regular.",
    },
    {
      icon: FaStar,
      title: "Professional Hosts",
      description:
        "Trained, charismatic quiz masters who know how to work a room and keep the energy high all night.",
    },
  ];

  const faqs = [
    {
      question: "What is the difference between The Show and Unplugged?",
      answer:
        "The Show is a full theatrical production with stage, screen, graphics, audio system, props, assistants, and special guests. Unplugged is a stripped-back elevated pub quiz with just a quiz master and portable speaker, but still features creative rounds, games, and betting that set it apart from a basic quiz night.",
    },
    {
      question: "How long is each session?",
      answer:
        "Typically 90 minutes for The Show and 60-90 minutes for Unplugged, but we can tailor the duration to suit your venue and audience.",
    },
    {
      question: "What does a typical contract look like?",
      answer:
        "Most venues start with a monthly rolling contract. We agree on a day, time, and tier, then deliver a fresh quiz every session. No long lock-ins required, though discounts are available for longer commitments.",
    },
    {
      question: "Do you provide all the equipment?",
      answer:
        "Yes. For The Show, we bring the full rig: PA, screen, lighting, stage, props. For Unplugged, we bring a portable speaker, quiz packs, and game equipment. All you need is the space.",
    },
    {
      question: "How far in advance do I need to book?",
      answer:
        "We recommend at least 2 weeks notice for Unplugged and 4 weeks for The Show, but get in touch and we will do our best to accommodate shorter timelines.",
    },
    {
      question: "Can we trial it before committing?",
      answer:
        "Absolutely. We offer a one-off trial session at a slightly higher rate so you can see the response from your audience before committing to a recurring contract.",
    },
    {
      question: "What areas do you cover?",
      answer:
        "We currently operate across England, with London, Manchester, Birmingham, and Bristol as our main hubs. Get in touch if you are outside these areas and we will see what we can do.",
    },
    {
      question: "Can we customise the quiz content?",
      answer:
        "Yes. We can tailor rounds to suit your audience, incorporate venue-specific themes, or add branded rounds for sponsors. Just let us know what you need.",
    },
  ];

  return (
    <div className="bg-background">
      {/* Hero Section */}
      <HeroSection
        title="Hire a Quiz Master"
        subtitle="Recurring quiz nights that fill your venue, week after week"
        description="Professional quiz hosting for pubs, members clubs, gyms, hotels, and restaurants. Two tiers to suit your space and budget. Fresh content every session, zero hassle for you."
        badge="Venue Contracts"
        backgroundImage="/fat-big-quiz-event.png"
        primaryCta={{
          text: "Get a Quote",
          href: "#enquiry",
        }}
        secondaryCta={{
          text: "See What's Included",
          href: "#tiers",
        }}
      />

      {/* Benefits */}
      <div className="py-16 md:py-24 bg-white">
        <div className="max-w-screen-xl mx-auto px-4 md:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
              Why Venues Choose Us
            </h2>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto">
              A well-run quiz night is one of the most reliable footfall drivers in hospitality.
              We make it effortless.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="flex flex-col items-center text-center p-6 rounded-xl bg-background hover:shadow-lg transition"
              >
                <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <benefit.icon className="text-xl text-primary" />
                </div>
                <h3 className="font-bold text-lg text-text-primary mb-2">{benefit.title}</h3>
                <p className="text-sm text-text-secondary">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Gallery */}
      <div className="py-16 md:py-24 bg-background">
        <div className="max-w-screen-xl mx-auto px-4 md:px-8">
          <EventGallery images={GALLERY_IMAGES} title="Fat Big Quiz Hire" />
        </div>
      </div>

      {/* Two Tiers Comparison */}
      <div id="tiers" className="py-16 md:py-24 bg-white">
        <div className="max-w-screen-xl mx-auto px-4 md:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
              Two Tiers, One Standard
            </h2>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto">
              Whether you want the full theatrical experience or a stripped-back elevated pub quiz,
              the quality of hosting and content is the same.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* The Show */}
            <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl p-8 border-2 border-primary/20 hover:shadow-xl transition relative overflow-hidden">
              <div className="absolute top-4 right-4 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full">
                Full Production
              </div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center">
                  <FaTv className="text-2xl text-primary" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-text-primary">The Show</h3>
                  <p className="text-sm text-text-secondary">Theatrical quiz experience</p>
                </div>
              </div>

              <p className="text-text-secondary mb-6">
                The full Fat Big Quiz production brought to your venue on a recurring basis.
                Stage, screen, sound, graphics, props, assistants, and special guests.
                Your audience will not believe this is a regular fixture.
              </p>

              <ul className="space-y-3 mb-8">
                {showFeatures.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="w-5 h-5 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <FaCheck className="text-primary text-xs" />
                    </div>
                    <span className="text-text-primary text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="bg-white/60 rounded-xl p-4 border border-primary/10">
                <p className="text-sm text-text-secondary">
                  <span className="font-semibold text-text-primary">Best for:</span> Large pubs,
                  hotels, members clubs with 80+ capacity and a stage area or open floor plan.
                </p>
              </div>
            </div>

            {/* Unplugged */}
            <div className="bg-background rounded-2xl p-8 border border-border hover:shadow-xl transition relative overflow-hidden">
              <div className="absolute top-4 right-4 bg-text-secondary text-white text-xs font-bold px-3 py-1 rounded-full">
                Stripped Back
              </div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center">
                  <FaMicrophone className="text-2xl text-primary" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-text-primary">Unplugged</h3>
                  <p className="text-sm text-text-secondary">Elevated pub quiz</p>
                </div>
              </div>

              <p className="text-text-secondary mb-6">
                Everything you love about a pub quiz, elevated. No stage, no screen, no spectacle,
                just a brilliant quiz master with a portable speaker, creative rounds, and games that
                get people talking. Traditional feel, modern quality.
              </p>

              <ul className="space-y-3 mb-8">
                {unpluggedFeatures.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="w-5 h-5 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <FaCheck className="text-primary text-xs" />
                    </div>
                    <span className="text-text-primary text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="bg-white rounded-xl p-4 border border-border">
                <p className="text-sm text-text-secondary">
                  <span className="font-semibold text-text-primary">Best for:</span> Smaller pubs,
                  restaurants, coworking spaces, gyms, and venues without AV infrastructure.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Venue Types */}
      <div className="py-16 md:py-24 bg-background">
        <div className="max-w-screen-xl mx-auto px-4 md:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
              Built for Your Venue
            </h2>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto">
              We work with all kinds of venues. If you have a space and an audience, we can make quiz
              night your best night of the week.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {venueTypes.map((venue, index) => (
              <div
                key={index}
                className="flex items-start gap-4 p-6 rounded-xl bg-white border border-border hover:shadow-md transition"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <venue.icon className="text-xl text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-text-primary mb-1">{venue.name}</h3>
                  <p className="text-sm text-text-secondary">{venue.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="py-16 md:py-24 bg-white">
        <div className="max-w-screen-xl mx-auto px-4 md:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
              How It Works
            </h2>
          </div>

          <div className="grid md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            {[
              {
                step: "1",
                title: "Enquire",
                description: "Tell us about your venue, preferred tier, and schedule.",
              },
              {
                step: "2",
                title: "We Visit",
                description: "We check out your space and discuss what works best.",
              },
              {
                step: "3",
                title: "Trial Night",
                description: "A one-off session so you can see the audience response.",
              },
              {
                step: "4",
                title: "Go Recurring",
                description: "Sign a flexible contract and we deliver fresh quizzes on schedule.",
              },
            ].map((item, index) => (
              <div key={index} className="text-center">
                <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-lg">
                  {item.step}
                </div>
                <h3 className="font-bold text-text-primary mb-2">{item.title}</h3>
                <p className="text-sm text-text-secondary">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Enquiry Form */}
      <div id="enquiry" className="py-16 md:py-24 bg-background">
        <div className="max-w-screen-xl mx-auto px-4 md:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-start">
            {/* Left column - info */}
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
                Get a Quote
              </h2>
              <p className="text-lg text-text-secondary mb-8">
                Tell us about your venue and what you are looking for. No obligation, no pressure.
                We will come back with a proposal tailored to your space and audience.
              </p>

              <div className="space-y-6 mb-8">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <FaCalendarAlt className="text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-text-primary">Flexible Contracts</h4>
                    <p className="text-sm text-text-secondary">
                      Monthly rolling, quarterly, or annual. Discounts for longer commitments.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <FaGamepad className="text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-text-primary">Fresh Content Every Session</h4>
                    <p className="text-sm text-text-secondary">
                      New questions, new rounds, new games. Your regulars never get bored.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <FaUsers className="text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-text-primary">Trial Available</h4>
                    <p className="text-sm text-text-secondary">
                      Not sure? Book a one-off trial and see the reaction before committing.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 border border-border">
                <h4 className="font-semibold text-text-primary mb-2">Prefer to chat?</h4>
                <p className="text-sm text-text-secondary">
                  Drop us an email at{" "}
                  <a
                    href="mailto:info@fatbigquiz.com"
                    className="text-primary hover:underline font-medium"
                  >
                    info@fatbigquiz.com
                  </a>{" "}
                  and we will arrange a call at a time that suits you.
                </p>
              </div>
            </div>

            {/* Right column - form */}
            <HireEnquiryForm />
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <FAQSection
        title="Frequently Asked Questions"
        subtitle="Common questions about hiring a quiz master for your venue"
        faqs={faqs}
      />

      {/* Final CTA */}
      <div className="bg-gradient-to-r from-primary via-primary-dark to-primary py-16">
        <div className="max-w-screen-xl mx-auto px-4 md:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Pack Your Venue?
          </h2>
          <p className="text-lg text-white/80 max-w-2xl mx-auto mb-8">
            Join the growing number of venues using Fat Big Quiz to drive midweek footfall,
            build community, and give their customers a reason to keep coming back.
          </p>
          <a
            href="#enquiry"
            className="inline-flex items-center gap-2 bg-white text-primary font-bold px-8 py-4 rounded-lg shadow-lg transform transition hover:scale-105"
          >
            <FaHandshake />
            Get Your Quote
          </a>
        </div>
      </div>
    </div>
  );
}
