import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { forgotPassword, clearError } from '../authSlice';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import { HiMail } from 'react-icons/hi';

const ForgotPasswordPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { loading, error } = useAppSelector((state) => state.auth);
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(clearError());
    const result = await dispatch(forgotPassword({ email }));
    if (forgotPassword.fulfilled.match(result)) {
      setSent(true);
    }
  };

  if (sent) {
    return (
      <div className="text-center">
        <div className="inline-flex p-3 bg-success-100 rounded-full mb-4">
          <svg className="h-8 w-8 text-success-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Email sent!</h2>
        <p className="text-sm text-gray-500 mb-6">
          A password reset link has been sent to<br />
          <span className="font-medium text-gray-700">{email}</span>
        </p>
        <Button variant="primary" onClick={() => navigate('/login')} className="w-full">
          Back to Log in
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Password assistance</h2>
        <p className="text-sm text-gray-500">
          Enter the email address associated with your account
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-danger-50 border border-danger-200 rounded-lg">
          <p className="text-sm text-danger-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Email Address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          iconRight={<HiMail className="h-4 w-4" />}
          required
        />

        <Button type="submit" loading={loading} className="w-full">
          Continue
        </Button>

        <div className="text-center">
          <span className="text-sm text-gray-500">Return to </span>
          <Link to="/login" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
            Log in
          </Link>
        </div>
      </form>
    </div>
  );
};

export default ForgotPasswordPage;
