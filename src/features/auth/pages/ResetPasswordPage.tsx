import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { resetPassword, clearError } from '../authSlice';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import { HiEyeOff, HiEye } from 'react-icons/hi';

const ResetPasswordPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loading, error } = useAppSelector((state) => state.auth);

  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';

  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(clearError());
    const result = await dispatch(resetPassword({
      token,
      email,
      password,
      password_confirmation: passwordConfirmation,
    }));
    if (resetPassword.fulfilled.match(result)) {
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <div className="text-center">
        <div className="inline-flex p-3 bg-green-500 rounded-full mb-4">
          <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Success</h2>
        <p className="text-sm text-gray-500 mb-6">
          Your Password Reset Successfully
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
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Reset Password</h2>
        <p className="text-sm text-gray-500">
          Enter New Password & Confirm Password to get inside
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-danger-50 border border-danger-200 rounded-lg">
          <p className="text-sm text-danger-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="New Password"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          iconRight={showPassword ? <HiEye className="h-4 w-4" /> : <HiEyeOff className="h-4 w-4" />}
          onIconRightClick={() => setShowPassword(!showPassword)}
          required
        />

        <Input
          label="Confirm Password"
          type={showConfirm ? 'text' : 'password'}
          value={passwordConfirmation}
          onChange={(e) => setPasswordConfirmation(e.target.value)}
          iconRight={showConfirm ? <HiEye className="h-4 w-4" /> : <HiEyeOff className="h-4 w-4" />}
          onIconRightClick={() => setShowConfirm(!showConfirm)}
          required
        />

        <Button type="submit" loading={loading} className="w-full">
          Change Password
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

export default ResetPasswordPage;
