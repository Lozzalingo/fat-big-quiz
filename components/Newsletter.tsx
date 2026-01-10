"use client";

import React, { useState } from 'react';
import { toast } from 'react-toastify';

const Newsletter = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isAlreadySubscribed, setIsAlreadySubscribed] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (email === '') {
      toast.error('Please enter an email address');
      return;
    }

    const requestOptions: any = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    };

    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/subscribers`, requestOptions)
      .then((response) => {
        if (response.status === 201) {
          return response.json();
        } else {
          return response.json().then((errorData) => {
            throw new Error(errorData.error || 'Failed to subscribe');
          });
        }
      })
      .then((data) => {
        setMessage('Successfully subscribed!');
        setIsSuccess(true);
        setIsAlreadySubscribed(false);
        setEmail('');
      })
      .catch((error) => {
        if (error.message === 'Email already subscribed') {
          setMessage('This email is already subscribed.');
          setIsSuccess(false);
          setIsAlreadySubscribed(true);
        } else {
          toast.error(error.message || 'Error subscribing. Please try again.');
          setMessage('');
          setIsSuccess(false);
          setIsAlreadySubscribed(false);
        }
      });
  };

  return (
    <div className="bg-black py-5 sm:py-24 lg:py-20">
      <div className="mx-auto grid justify-items-center max-w-screen-2xl grid-cols-1 gap-10 px-6 lg:grid-cols-12 lg:gap-8 lg:px-8">
        <div className="max-w-xl text-3xl font-bold tracking-tight text-white sm:text-4xl lg:col-span-7">
          <h2 className="inline sm:block lg:inline xl:block max-sm:text-xl">Want news and updates?</h2>{' '}
          <p className="inline sm:block lg:inline xl:block max-sm:text-xl">Sign up for our newsletter.</p>
        </div>
        <form className="w-full max-w-md lg:col-span-5 lg:pt-2" onSubmit={handleSubmit}>
          <div className="flex gap-x-4">
            <label htmlFor="email-address" className="sr-only">
              Email address
            </label>
            <input
              id="email-address"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="min-w-0 flex-auto rounded-md border-0 px-3.5 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
              placeholder="Enter your email"
            />
            <button
              type="submit"
              data-track-button="Newsletter:Subscribe"
              className="flex-none rounded-md bg-red-500 px-3.5 py-2.5 text-sm font-semibold text-black shadow-sm hover:bg-black hover:text-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              Subscribe
            </button>
          </div>
          {message && (
            <p
              className={`mt-4 text-sm leading-6 ${
                isSuccess ? 'text-green-500' : isAlreadySubscribed ? 'text-yellow-500' : 'text-red-500'
              }`}
            >
              {message}
            </p>
          )}
          <p className="mt-4 text-sm leading-6 text-white">
            We care about your data. Read our{' '}
            <a href="#" className="font-semibold hover:text-custom-yellow text-white">
              privacy policy
            </a>
            .
          </p>
        </form>
      </div>
    </div>
  );
};

export default Newsletter;