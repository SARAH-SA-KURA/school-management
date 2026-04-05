import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { verifyEmail, clearError } from '../authSlice';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';

const EmailVerificationPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { loading, error, tempEmail } = useAppSelector((state) => state.auth);
  const [code, setCode] = useState('');
  const [resendTimer, setResendTimer] = useState(60);

  React.useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const maskedEmail = tempEmail
    ? tempEmail.replace(/(.{2})(.*)(@.*)/, '$1*****$3')
    : '*****@gmail.com';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(clearError());
    if (code.length >= 4 && tempEmail) {
      dispatch(verifyEmail({ email: tempEmail, code }));
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Enter verification code</h2>
        <p className="text-sm text-gray-500">
          For your security, we've sent the code to your email {maskedEmail}.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-danger-50 border border-danger-200 rounded-lg">
          <p className="text-sm text-danger-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Verification Code"
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          placeholder="Enter code"
          required
        />

        <Button type="submit" loading={loading} className="w-full" disabled={code.length < 4}>
          Submit code
        </Button>

        <div className="text-center">
          {resendTimer > 0 ? (
            <p className="text-sm text-gray-500">
              Resend code in <span className="font-medium">{resendTimer}s</span>
            </p>
          ) : (
            <button
              type="button"
              onClick={() => setResendTimer(60)}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              Resend code
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default EmailVerificationPage;
