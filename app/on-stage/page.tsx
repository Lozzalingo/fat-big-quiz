import React from "react";
import Link from "next/link";
import { Metadata } from "next";
import {
  FaPlay,
  FaTicketAlt,
  FaClock,
  FaUsers,
  FaTrophy,
  FaMusic,
  FaStar,
  FaQuoteLeft,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaGlassCheers,
} from "react-icons/fa";
import { HeroSection, FAQSection } from "@/components/landing";

export const metadata: Metadata = {
  title: "Fat Big Quiz On Stage - Live Theatrical Quiz Experience | Fat Big Quiz",
  description:
    "Experience the world's first theatrical, immersive, on-stage quiz show. 90 minutes of pure entertainment with professional hosts, live music, and amazing prizes.",
};

export default function OnStagePage() {
  const features = [
    {
      icon: FaClock,
      title: "90 Minutes of Entertainment",
      description:
        "A full evening of non-stop fun, laughter, and brain-teasing questions",
    },
    {
      icon: FaUsers,
      title: "Team-Based Competition",
      description:
        "Compete with friends, family, or colleagues in teams of up to 6",
    },
    {
      icon: FaTrophy,
      title: "Amazing Prizes",
      description:
        "Win fantastic prizes for your team including cash, experiences, and more",
    },
    {
      icon: FaMusic,
      title: "Live Music & Entertainment",
      description:
        "Professional hosts, live music rounds, and theatrical production values",
    },
    {
      icon: FaGlassCheers,
      title: "Full Bar Service",
      description:
        "Enjoy drinks and snacks from the venue bar throughout the show",
    },
    {
      icon: FaStar,
      title: "Immersive Experience",
      description:
        "Not just a quiz - a fully theatrical, immersive entertainment event",
    },
  ];

  const testimonials = [
    {
      quote:
        "Absolutely brilliant night out! The production quality was incredible and the host had us laughing all evening.",
      author: "Sarah M.",
      location: "London",
    },
    {
      quote:
        "Best quiz experience I've ever been to. Way more than just answering questions - it's a full show!",
      author: "James T.",
      location: "Manchester",
    },
    {
      quote:
        "Our work team had an amazing time. Already booked for the next show!",
      author: "Emma K.",
      location: "Birmingham",
    },
  ];

  const faqs = [
    {
      question: "How long is the show?",
      answer:
        "The Fat Big Quiz On Stage runs for approximately 90 minutes, including intervals. Doors open 30 minutes before the show starts.",
    },
    {
      question: "How many people can be on a team?",
      answer:
        "Teams can have between 2-6 players. You can book individual tickets and we'll help match you with other players, or book as a complete team.",
    },
    {
      question: "Is food and drink available?",
      answer:
        "Yes! All our venues have full bar service. Some venues also offer food - check your specific event page for details.",
    },
    {
      question: "What type of questions are asked?",
      answer:
        "Our quizzes cover a wide range of topics including general knowledge, music, film, TV, sports, science, and current affairs. We aim for questions that are challenging but fair - no obscure trivia that only experts would know!",
    },
    {
      question: "Can I bring children?",
      answer:
        "Most of our shows are 18+ due to venue licensing. We occasionally run family-friendly shows - check the specific event details.",
    },
    {
      question: "What if I need to cancel?",
      answer:
        "Full refunds are available up to 48 hours before the event. Within 48 hours, you can transfer your ticket to another person or credit your booking to a future show.",
    },
  ];

  return (
    <div className="bg-background">
      {/* Hero Section */}
      <HeroSection
        title="The Fat Big Quiz On Stage"
        subtitle="The world's first theatrical, immersive, on-stage quiz experience"
        description="90 minutes of pure entertainment featuring professional hosts, live music, amazing prizes, and the most fun you'll have answering questions."
        badge="Live Events"
        videoUrl="https://www.youtube.com/watch?v=MyE37NjmUXE"
        primaryCta={{
          text: "Get Tickets",
          href: "#tickets",
        }}
        secondaryCta={{
          text: "Watch Trailer",
          icon: <FaPlay className="text-sm" />,
          href: "https://www.youtube.com/watch?v=MyE37NjmUXE",
        }}
      />

      {/* What Makes It Special */}
      <div className="py-16 md:py-24 bg-white">
        <div className="max-w-screen-xl mx-auto px-4 md:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
              More Than Just a Quiz Night
            </h2>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto">
              The Fat Big Quiz On Stage transforms the traditional pub quiz into
              a full theatrical production
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="flex flex-col items-center text-center p-6 rounded-xl bg-background hover:shadow-lg transition"
              >
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <feature.icon className="text-2xl text-primary" />
                </div>
                <h3 className="font-bold text-lg text-text-primary mb-2">
                  {feature.title}
                </h3>
                <p className="text-text-secondary">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Video Section */}
      <div className="py-16 md:py-24 bg-background">
        <div className="max-w-screen-lg mx-auto px-4 md:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
              See What You're In For
            </h2>
            <p className="text-lg text-text-secondary">
              Watch the trailer to see the Fat Big Quiz On Stage in action
            </p>
          </div>
          <div className="aspect-video rounded-xl overflow-hidden shadow-2xl">
            <iframe
              src="https://www.youtube.com/embed/MyE37NjmUXE"
              title="Fat Big Quiz On Stage Trailer"
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      </div>

      {/* Gallery Section */}
      <div className="py-16 md:py-24 bg-white">
        <div className="max-w-screen-xl mx-auto px-4 md:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
              The Experience
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="aspect-video rounded-xl overflow-hidden shadow-lg">
              <img
                src="/fat-big-quiz-event.png"
                alt="Fat Big Quiz On Stage Event"
                className="w-full h-full object-cover hover:scale-105 transition duration-300"
              />
            </div>
            <div className="aspect-video rounded-xl overflow-hidden shadow-lg">
              <img
                src="/fat-big-quiz-promo.jpg"
                alt="Fat Big Quiz Promo"
                className="w-full h-full object-cover hover:scale-105 transition duration-300"
              />
            </div>
            <div className="aspect-video rounded-xl overflow-hidden shadow-lg md:col-span-2 lg:col-span-1">
              <img
                src="/fat-big-quiz-youtube.jpg"
                alt="Fat Big Quiz Show"
                className="w-full h-full object-cover hover:scale-105 transition duration-300"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Testimonials */}
      <div className="py-16 md:py-24 bg-gradient-to-br from-primary via-primary-dark to-primary text-white">
        <div className="max-w-screen-xl mx-auto px-4 md:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              What People Are Saying
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="bg-white/10 backdrop-blur rounded-xl p-6"
              >
                <FaQuoteLeft className="text-2xl text-white/30 mb-4" />
                <p className="text-white/90 mb-4 italic">"{testimonial.quote}"</p>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <span className="font-bold">
                      {testimonial.author.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold">{testimonial.author}</p>
                    <p className="text-sm text-white/70">{testimonial.location}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Upcoming Shows / Tickets */}
      <div id="tickets" className="py-16 md:py-24 bg-white">
        <div className="max-w-screen-xl mx-auto px-4 md:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
              Get Your Tickets
            </h2>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto">
              Don't miss out on the ultimate quiz experience
            </p>
          </div>

          {/* Ticket CTA Card */}
          <div className="max-w-2xl mx-auto">
            <div className="bg-gradient-to-br from-primary to-primary-dark rounded-2xl shadow-xl overflow-hidden">
              <div className="p-8 md:p-12 text-white text-center">
                <FaTicketAlt className="text-5xl mx-auto mb-6 opacity-80" />
                <h3 className="text-2xl md:text-3xl font-bold mb-4">
                  Tickets from £15
                </h3>
                <p className="text-white/80 mb-8">
                  Book your spot at the next Fat Big Quiz On Stage event. Early
                  bird discounts available!
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <a
                    href="https://www.bucketrace.com/game-catalouge/the-fat-big-quiz-on-stage"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 bg-white text-primary font-bold px-8 py-4 rounded-lg shadow-lg transform transition hover:scale-105"
                  >
                    <FaCalendarAlt />
                    View Upcoming Shows
                  </a>
                </div>
                <p className="text-white/60 text-sm mt-6">
                  Shows available in London, Manchester, Birmingham, and more
                  cities coming soon
                </p>
              </div>
            </div>
          </div>

          {/* Venue Info */}
          <div className="mt-12 grid md:grid-cols-3 gap-6 text-center">
            <div className="p-6">
              <FaMapMarkerAlt className="text-3xl text-primary mx-auto mb-3" />
              <h4 className="font-semibold text-text-primary mb-1">
                Multiple Venues
              </h4>
              <p className="text-sm text-text-secondary">
                Shows across the UK
              </p>
            </div>
            <div className="p-6">
              <FaClock className="text-3xl text-primary mx-auto mb-3" />
              <h4 className="font-semibold text-text-primary mb-1">
                Doors 7pm, Show 7:30pm
              </h4>
              <p className="text-sm text-text-secondary">
                Approximately 90 minutes
              </p>
            </div>
            <div className="p-6">
              <FaUsers className="text-3xl text-primary mx-auto mb-3" />
              <h4 className="font-semibold text-text-primary mb-1">
                Teams of 2-6
              </h4>
              <p className="text-sm text-text-secondary">
                Come alone or with friends
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <FAQSection
        title="Frequently Asked Questions"
        subtitle="Everything you need to know about the Fat Big Quiz On Stage"
        faqs={faqs}
      />

      {/* Final CTA */}
      <div className="bg-gradient-to-r from-primary via-primary-dark to-primary py-16">
        <div className="max-w-screen-xl mx-auto px-4 md:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready for the Ultimate Quiz Night?
          </h2>
          <p className="text-lg text-white/80 max-w-2xl mx-auto mb-8">
            Join thousands who've experienced the Fat Big Quiz On Stage. Book
            your tickets now and prepare for 90 minutes of unforgettable
            entertainment!
          </p>
          <a
            href="https://www.bucketrace.com/game-catalouge/the-fat-big-quiz-on-stage"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-white text-primary font-bold px-8 py-4 rounded-lg shadow-lg transform transition hover:scale-105"
          >
            <FaTicketAlt />
            Get Tickets Now
          </a>
        </div>
      </div>
    </div>
  );
}
