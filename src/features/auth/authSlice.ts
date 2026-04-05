import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { authApi } from '../../api/authApi';
import { User, LoginCredentials } from '../../types';
import { storage } from '../../utils/storage';

type LoginStep = 'credentials' | 'email_verification' | 'two_factor' | 'complete';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loginStep: LoginStep;
  tempEmail: string | null;
  tempToken: string | null;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: storage.getUser(),
  token: storage.getToken(),
  isAuthenticated: !!storage.getToken(),
  loginStep: 'credentials',
  tempEmail: null,
  tempToken: null,
  loading: false,
  error: null,
};

export const login = createAsyncThunk(
  'auth/login',
  async (credentials: LoginCredentials, { rejectWithValue }) => {
    try {
      const response = await authApi.login(credentials);
      console.log('Login response:', response);
      if (response.data.success && response.data.data) {
        return response.data.data;
      } else {
        return rejectWithValue(response.data.message || 'Échec de la connexion');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      return rejectWithValue(error.response?.data?.message || error.message || 'Échec de la connexion');
    }
  }
);

export const verifyEmail = createAsyncThunk(
  'auth/verifyEmail',
  async (data: { email: string; code: string }, { rejectWithValue }) => {
    try {
      const response = await authApi.verifyEmail(data);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Code invalide');
    }
  }
);

export const verify2FA = createAsyncThunk(
  'auth/verify2FA',
  async (data: { code: string; token: string }, { rejectWithValue }) => {
    try {
      const response = await authApi.verify2FA(data);
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Code 2FA invalide');
    }
  }
);

export const forgotPassword = createAsyncThunk(
  'auth/forgotPassword',
  async (data: { email: string }, { rejectWithValue }) => {
    try {
      const response = await authApi.forgotPassword(data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Erreur lors de l\'envoi');
    }
  }
);

export const resetPassword = createAsyncThunk(
  'auth/resetPassword',
  async (data: { token: string; email: string; password: string; password_confirmation: string }, { rejectWithValue }) => {
    try {
      const response = await authApi.resetPassword(data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Erreur lors de la réinitialisation');
    }
  }
);

export const fetchCurrentUser = createAsyncThunk(
  'auth/fetchCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      const response = await authApi.getMe();
      return response.data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Session expirée');
    }
  }
);

export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await authApi.logout();
    } catch (error: any) {
      // Logout even if API call fails
    }
    storage.clear();
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      storage.setUser(action.payload);
    },
    setLoginStep: (state, action: PayloadAction<LoginStep>) => {
      state.loginStep = action.payload;
    },
    setTempEmail: (state, action: PayloadAction<string>) => {
      state.tempEmail = action.payload;
    },
    setTempToken: (state, action: PayloadAction<string>) => {
      state.tempToken = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    resetAuthState: (state) => {
      state.loginStep = 'credentials';
      state.tempEmail = null;
      state.tempToken = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Login
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        const data = action.payload as any;
        if (data.requires_email_verification) {
          state.loginStep = 'email_verification';
          state.tempEmail = data.email;
        } else if (data.requires_2fa) {
          state.loginStep = 'two_factor';
          state.tempToken = data.temp_token;
        } else {
          state.user = data.user;
          state.token = data.token;
          state.isAuthenticated = true;
          state.loginStep = 'complete';
          storage.setToken(data.token);
          storage.setUser(data.user);
        }
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Verify Email
    builder
      .addCase(verifyEmail.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyEmail.fulfilled, (state) => {
        state.loading = false;
        state.loginStep = 'two_factor';
      })
      .addCase(verifyEmail.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // 2FA
    builder
      .addCase(verify2FA.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verify2FA.fulfilled, (state, action) => {
        state.loading = false;
        const data = action.payload;
        state.user = data.user;
        state.token = data.token;
        state.isAuthenticated = true;
        state.loginStep = 'complete';
        storage.setToken(data.token);
        storage.setUser(data.user);
      })
      .addCase(verify2FA.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Forgot Password
    builder
      .addCase(forgotPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(forgotPassword.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(forgotPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Reset Password
    builder
      .addCase(resetPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(resetPassword.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch Current User
    builder
      .addCase(fetchCurrentUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        storage.setUser(action.payload);
      })
      .addCase(fetchCurrentUser.rejected, (state) => {
        // A failed profile refresh should NOT log the user out —
        // only a 401 from the axios interceptor should do that.
        state.loading = false;
      });

    // Logout
    builder
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.loginStep = 'credentials';
        state.tempEmail = null;
        state.tempToken = null;
      });
  },
});

export const { setUser, setLoginStep, setTempEmail, setTempToken, clearError, resetAuthState } = authSlice.actions;
export default authSlice.reducer;
