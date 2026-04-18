import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { verify2FA, clearError } from '../authSlice';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';

const TwoFactorPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { loading, error, tempToken } = useAppSelector((state) => state.auth);
  const [code, setCode] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(clearError());
    if (code.length === 6 && tempToken) {
      dispatch(verify2FA({ code, token: tempToken }));
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Enter verification code</h2>
        <p className="text-sm text-gray-500">
          Enter the code from your authenticator app
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
          placeholder="000000"
          required
        />

        <Button type="submit" loading={loading} className="w-full" disabled={code.length !== 6}>
          Submit code
        </Button>
      </form>
    </div>
  );
};

export default TwoFactorPage;
