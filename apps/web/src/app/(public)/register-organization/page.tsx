'use client';

import { useState } from 'react';
import Link from 'next/link';
import { RegisterOrganizationForm } from '@/components/RegisterOrganizationForm';

export default function RegisterOrganizationPage() {
  const [submitted, setSubmitted] = useState(false);
  const [requestId, setRequestId] = useState('');

  const handleSuccess = (id: string) => {
    setRequestId(id);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-8 text-center space-y-6">
          <div className="text-5xl">✓</div>
          <h1 className="text-3xl font-bold text-green-700">Application Submitted</h1>

          <div className="space-y-3 text-gray-700">
            <p>
              Thank you for registering your school with CampusOps. We&apos;ve received your registration request.
            </p>
            <p>
              Our team will review your application and send you an email at the provided address with next steps.
              This usually takes 1-2 business days.
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded p-4 my-6">
            <p className="text-sm text-gray-600">
              <strong>Request ID:</strong>
            </p>
            <p className="text-lg font-mono font-bold text-blue-600 mt-2">{requestId}</p>
            <p className="text-xs text-gray-500 mt-3">
              Save this ID for your records.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded p-4">
            <p className="text-sm text-blue-800">
              Keep an eye on your email inbox. You&apos;ll receive a confirmation message with instructions on how to set up your school administrator account once we approve your registration.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link
              href="/"
              className="px-6 py-2 border border-gray-300 text-gray-700 font-medium rounded hover:bg-gray-50 transition"
            >
              ← Back to Home
            </Link>
            <Link
              href="/login"
              className="px-6 py-2 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 transition"
            >
              Go to Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="space-y-6 mb-8">
        <h1 className="text-3xl font-bold">Register Your School</h1>
        <p className="text-gray-600">
          Fill in the details below. Our team will review your application and contact you within 1-2 business days.
        </p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <RegisterOrganizationForm onSuccess={handleSuccess} />
      </div>
    </div>
  );
}
