import React from "react";
import { Metadata } from "next";
import {
  FaPlay,
  FaClock,
  FaUsers,
  FaTrophy,
  FaMusic,
  FaStar,
  FaQuoteLeft,
  FaMapMarkerAlt,
  FaGlassCheers,
  FaGamepad,
  FaLightbulb,
  FaTv,
  FaFire,
  FaFilm,
  FaFish,
  FaBolt,
  FaChartLine,
  FaHotdog,
  FaGlobeEurope,
  FaMicrophone,
  FaTheaterMasks,
  FaCheckCircle,
} from "react-icons/fa";
import { HeroSection, FAQSection } from "@/components/landing";
import BookingForm from "@/app/components/BookingForm";

export const metadata: Metadata = {
  title: "Fat Big Quiz On Stage - Live Theatrical Quiz Experience | Fat Big Quiz",
  description:
    "Experience the world's first theatrical, immersive, on-stage quiz show. 90 minutes of pure entertainment with professional hosts, live music, and amazing prizes. Book your private or public event now.",
  openGraph: {
    title: "Fat Big Quiz On Stage - Live Theatrical Quiz Experience",
    description: "The world's first theatrical, immersive, on-stage quiz. 90 minutes of pure entertainment.",
    images: [{ url: "/fat-big-quiz-event.png", width: 1200, height: 630, alt: "Fat Big Quiz On Stage" }],
  },
};

export default function OnStagePage() {
  const features = [
    {
      icon: FaClock,
      title: "90 Minutes of Entertainment",
      description: "A full evening of non-stop fun, laughter, and brain-teasing questions across ten interactive rounds.",
    },
    {
      icon: FaUsers,
      title: "Team-Based Competition",
      description: "Compete with friends, family, or colleagues in teams of up to 6 players.",
    },
    {
      icon: FaTrophy,
      title: "Trophies and Prizes",
      description: "Top three teams receive trophies, and the winning team takes home a bottle of bubbles.",
    },
    {
      icon: FaMusic,
      title: "Live Music and Entertainment",
      description: "Professional hosts, live music rounds, special guests, and theatrical production values.",
    },
    {
      icon: FaGlassCheers,
      title: "Full Bar Service",
      description: "Enjoy drinks and snacks from the venue bar throughout the show.",
    },
    {
      icon: FaStar,
      title: "Immersive Experience",
      description: "Video, audio, graphics, live triggers, and broadcasting software create a truly memorable event.",
    },
  ];

  const quizRounds = [
    {
      icon: FaGlobeEurope,
      name: "History",
      description: "Bog standard quiz questions, on-stage guests, external guest speakers, picture questions, and work out the quote.",
    },
    {
      icon: FaLightbulb,
      name: "Say What You Can See",
      description: "A collage of 'say what you can see' images, built around a scene themed for the season. Spot the high street brands!",
    },
    {
      icon: FaMusic,
      name: "Music",
      description: "Special guests, name that tune, song in reverse, finish the lyric, album covers, and face swap.",
    },
    {
      icon: FaChartLine,
      name: "Higher or Lower",
      description: "Work out if the year a company was founded is higher or lower than the previous one shown.",
    },
    {
      icon: FaTheaterMasks,
      name: "People",
      description: "Fake news, inventors, stained glass, who is hiding in the shadows, and the fantastic jar of whatever.",
    },
    {
      icon: FaFire,
      name: "What a Load of Hot Air",
      description: "Take a ride in our hot air balloon! Answer conspiracy theory questions correctly to soar, but get one wrong and you'll burst.",
    },
    {
      icon: FaFilm,
      name: "TV / Film",
      description: "Special guests, Paul Murphy reads 1-star reviews, face swap, say what you can see, and name the film from the strap-line.",
    },
    {
      icon: FaFish,
      name: "Fish Your Chips",
      description: "Bet your points on head-to-head stage games! Fish colours from a rotating pond and nominate teammates to compete.",
    },
    {
      icon: FaBolt,
      name: "Quirky Quick-fire",
      description: "A rapid round of 10 quirky questions based on the quiz theme. Speed is everything!",
    },
    {
      icon: FaTrophy,
      name: "Toppers",
      description: "How many number one rankers can you name? Top answer earns two points, second place earns one.",
    },
  ];

  const testimonials = [
    {
      quote: "Absolutely brilliant night out! The production quality was incredible and the host had us laughing all evening.",
      author: "Sarah M.",
      location: "London",
    },
    {
      quote: "Best quiz experience I've ever been to. Way more than just answering questions - it's a full show!",
      author: "James T.",
      location: "Manchester",
    },
    {
      quote: "Our work team had an amazing time. Already booked for the next show!",
      author: "Emma K.",
      location: "Birmingham",
    },
  ];

  const faqs = [
    {
      question: "How long is the show?",
      answer: "The Fat Big Quiz On Stage runs for approximately 90 minutes, including intervals. Doors open 30 minutes before the show starts.",
    },
    {
      question: "How many people can be on a team?",
      answer: "Teams can have between 2 and 6 players. You can book individual tickets and we will help match you with other players, or book as a complete team.",
    },
    {
      question: "What is the difference between public and private events?",
      answer: "Public events are ticketed shows at set venues and dates. Private events are fully customisable - we bring the show to your venue, on your date, tailored to your group. Perfect for corporate events, birthdays, and team building.",
    },
    {
      question: "What equipment do you bring?",
      answer: "We arrive 3 hours before the event with a full P.A. system, lighting, visuals, our stage, quiz packs, and various props and live quiz round equipment. All we need from you is a venue!",
    },
    {
      question: "Do guests need anything?",
      answer: "Just one smart device per team for certain interactive rounds. Everything else is provided by us.",
    },
    {
      question: "Is food and drink available?",
      answer: "Yes! All our venues have full bar service. Some venues also offer food - check your specific event page for details.",
    },
    {
      question: "What type of questions are asked?",
      answer: "Our quizzes cover a wide range of topics including general knowledge, music, film, TV, sports, science, and current affairs. We aim for questions that are challenging but fair - no obscure trivia that only experts would know!",
    },
    {
      question: "Can I bring children?",
      answer: "Most of our shows are 18+ due to venue licensing. We occasionally run family-friendly shows - check the specific event details.",
    },
    {
      question: "What if I need to cancel?",
      answer: "Full refunds are available up to 48 hours before the event. Within 48 hours, you can transfer your ticket to another person or credit your booking to a future show.",
    },
    {
      question: "What themes are available?",
      answer: "We currently offer two themes: The Fat Big Quiz of Everything, and The Fat Big Quiz of Christmas. Both feature the same high-energy format with themed questions and rounds.",
    },
  ];

  return (
    <div className="bg-background">
      {/* Hero Section */}
      <HeroSection
        title="The Fat Big Quiz On Stage"
        subtitle="The world's first theatrical, immersive, on-stage quiz experience"
        description="90 minutes of pure entertainment featuring professional hosts, live music, special guests, amazing prizes, and ten highly interactive rounds. Available for private bookings and public ticketed events."
        badge="Live Events"
        videoUrl="https://www.youtube.com/watch?v=MyE37NjmUXE"
        primaryCta={{
          text: "Book Your Event",
          href: "#booking",
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
              The Fat Big Quiz On Stage transforms the traditional pub quiz into a full theatrical production.
              Using video, audio, special guests, graphics, guest presenters, and live triggers, along with
              the latest in broadcasting and design software, we bring a truly memorable immersive experience.
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
                <h3 className="font-bold text-lg text-text-primary mb-2">{feature.title}</h3>
                <p className="text-text-secondary">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quiz Rounds */}
      <div className="py-16 md:py-24 bg-background">
        <div className="max-w-screen-xl mx-auto px-4 md:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
              Ten Interactive Rounds
            </h2>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto">
              Five quirky creative rounds and five classic quiz-style rounds.
              Every round uses video, audio, and live interaction to keep you on your toes.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {quizRounds.map((round, index) => (
              <div
                key={index}
                className="flex items-start gap-4 p-5 rounded-xl bg-white border border-border hover:shadow-md transition"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <round.icon className="text-xl text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-text-primary mb-1">
                    <span className="text-primary/60 mr-2">{index + 1}.</span>
                    {round.name}
                  </h3>
                  <p className="text-sm text-text-secondary">{round.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Video Section */}
      <div className="py-16 md:py-24 bg-white">
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

      {/* On Game Day */}
      <div className="py-16 md:py-24 bg-background">
        <div className="max-w-screen-xl mx-auto px-4 md:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-6">
                On Game Day
              </h2>
              <p className="text-text-secondary mb-6">
                On the day of the event we arrive 3 hours before the start time to set up all of our equipment.
                This includes a full P.A. system, lighting, visuals based on the venue size, our stage,
                quiz packs, and various props and live quiz round equipment.
              </p>
              <p className="text-text-secondary mb-6">
                The quiz host takes teams through all ten rounds followed by the scores.
                The top three teams are awarded trophies, and the winning team also takes home a bottle of bubbles.
              </p>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <FaCheckCircle className="text-success flex-shrink-0" />
                  <span className="text-text-primary">Full P.A. system and lighting rig</span>
                </div>
                <div className="flex items-center gap-3">
                  <FaCheckCircle className="text-success flex-shrink-0" />
                  <span className="text-text-primary">Professional stage setup and visuals</span>
                </div>
                <div className="flex items-center gap-3">
                  <FaCheckCircle className="text-success flex-shrink-0" />
                  <span className="text-text-primary">Quiz packs, props, and game equipment</span>
                </div>
                <div className="flex items-center gap-3">
                  <FaCheckCircle className="text-success flex-shrink-0" />
                  <span className="text-text-primary">Trophies for top three teams</span>
                </div>
                <div className="flex items-center gap-3">
                  <FaCheckCircle className="text-success flex-shrink-0" />
                  <span className="text-text-primary">Just one smart device per team needed</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="aspect-square rounded-xl overflow-hidden shadow-lg">
                <img
                  src="/fat-big-quiz-event.png"
                  alt="Fat Big Quiz On Stage Event"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="aspect-square rounded-xl overflow-hidden shadow-lg mt-8">
                <img
                  src="/fat-big-quiz-promo.jpg"
                  alt="Fat Big Quiz Promo"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="aspect-square rounded-xl overflow-hidden shadow-lg">
                <img
                  src="/fat-big-quiz-youtube.jpg"
                  alt="Fat Big Quiz Show"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="aspect-square rounded-xl overflow-hidden shadow-lg mt-8 bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center">
                <div className="text-center text-white p-4">
                  <FaMicrophone className="text-4xl mx-auto mb-3 opacity-80" />
                  <p className="font-bold text-lg">Professional Hosts</p>
                  <p className="text-sm text-white/70">Every show</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Types */}
      <div className="py-16 md:py-24 bg-white">
        <div className="max-w-screen-xl mx-auto px-4 md:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
              How to Book
            </h2>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto">
              We offer both public ticketed events and private bookings for your own venue
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Public Events */}
            <div className="bg-background rounded-2xl p-8 border border-border hover:shadow-lg transition">
              <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <FaGamepad className="text-2xl text-primary" />
              </div>
              <h3 className="text-xl font-bold text-text-primary mb-3">Public Events</h3>
              <p className="text-text-secondary mb-4">
                Join one of our seasonal public shows. Grab your tickets for an evening of theatrical quiz entertainment
                at venues across the UK.
              </p>
              <ul className="space-y-2 text-sm text-text-secondary mb-6">
                <li className="flex items-center gap-2">
                  <FaCheckCircle className="text-success flex-shrink-0" />
                  Tickets from £15 per person
                </li>
                <li className="flex items-center gap-2">
                  <FaCheckCircle className="text-success flex-shrink-0" />
                  Seasonal dates (Christmas, Easter, etc.)
                </li>
                <li className="flex items-center gap-2">
                  <FaCheckCircle className="text-success flex-shrink-0" />
                  Venues in London, Manchester, Birmingham
                </li>
              </ul>
              <a
                href="#booking"
                className="inline-flex items-center gap-2 text-primary font-semibold hover:underline"
              >
                Enquire about public events &rarr;
              </a>
            </div>

            {/* Private Events */}
            <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl p-8 border-2 border-primary/20 hover:shadow-lg transition relative overflow-hidden">
              <div className="absolute top-4 right-4 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full">
                Most Popular
              </div>
              <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <FaStar className="text-2xl text-primary" />
              </div>
              <h3 className="text-xl font-bold text-text-primary mb-3">Private Events</h3>
              <p className="text-text-secondary mb-4">
                We bring the full Fat Big Quiz experience to your venue, on your date.
                Perfect for corporate events, team building, birthdays, and celebrations.
              </p>
              <ul className="space-y-2 text-sm text-text-secondary mb-6">
                <li className="flex items-center gap-2">
                  <FaCheckCircle className="text-success flex-shrink-0" />
                  Available all year round
                </li>
                <li className="flex items-center gap-2">
                  <FaCheckCircle className="text-success flex-shrink-0" />
                  Tailored to your group and venue
                </li>
                <li className="flex items-center gap-2">
                  <FaCheckCircle className="text-success flex-shrink-0" />
                  Corporate, birthday, team building
                </li>
                <li className="flex items-center gap-2">
                  <FaCheckCircle className="text-success flex-shrink-0" />
                  We bring all the equipment
                </li>
              </ul>
              <a
                href="#booking"
                className="inline-flex items-center gap-2 bg-primary text-white font-semibold px-6 py-3 rounded-lg hover:bg-primary-dark transition"
              >
                Enquire Now &rarr;
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Testimonials */}
      <div className="py-16 md:py-24 bg-gradient-to-br from-primary via-primary-dark to-primary text-white">
        <div className="max-w-screen-xl mx-auto px-4 md:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">What People Are Saying</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white/10 backdrop-blur rounded-xl p-6">
                <FaQuoteLeft className="text-2xl text-white/30 mb-4" />
                <p className="text-white/90 mb-4 italic">"{testimonial.quote}"</p>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <span className="font-bold">{testimonial.author.charAt(0)}</span>
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

      {/* Booking Form */}
      <div id="booking" className="py-16 md:py-24 bg-white">
        <div className="max-w-screen-xl mx-auto px-4 md:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-start">
            {/* Left column - info */}
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
                Book Your Event
              </h2>
              <p className="text-lg text-text-secondary mb-8">
                Whether you are planning a corporate team building day, a birthday celebration,
                or want to attend a public show, get in touch and we will make it happen.
              </p>

              <div className="space-y-6 mb-8">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <FaMapMarkerAlt className="text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-text-primary">Nationwide Coverage</h4>
                    <p className="text-sm text-text-secondary">Shows across the UK, with London, Manchester, and Birmingham as our main hubs.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <FaClock className="text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-text-primary">Flexible Scheduling</h4>
                    <p className="text-sm text-text-secondary">Available all year round for private bookings. Public shows run seasonally.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <FaUsers className="text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-text-primary">Any Group Size</h4>
                    <p className="text-sm text-text-secondary">From intimate groups of 10 to corporate events of 500+. We scale our production to match.</p>
                  </div>
                </div>
              </div>

              <div className="bg-background rounded-xl p-6 border border-border">
                <h4 className="font-semibold text-text-primary mb-2">Prefer to email?</h4>
                <p className="text-sm text-text-secondary">
                  Drop us a line at{" "}
                  <a href="mailto:info@fatbigquiz.com" className="text-primary hover:underline font-medium">
                    info@fatbigquiz.com
                  </a>{" "}
                  and we will get back to you within 24 hours.
                </p>
              </div>
            </div>

            {/* Right column - form */}
            <BookingForm
              preselectedProductSlug="fat-big-quiz-on-stage"
            />
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
            Join thousands who have experienced the Fat Big Quiz On Stage. Enquire now and
            prepare for 90 minutes of unforgettable entertainment!
          </p>
          <a
            href="#booking"
            className="inline-flex items-center gap-2 bg-white text-primary font-bold px-8 py-4 rounded-lg shadow-lg transform transition hover:scale-105"
          >
            <FaStar />
            Enquire Now
          </a>
        </div>
      </div>
    </div>
  );
}
