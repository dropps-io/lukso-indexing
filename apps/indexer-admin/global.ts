import process from 'process';

export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
export const OAuthGoogleAPI = 'https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=';
export const GoogleCallBackURL = 'http://localhost:3000/auth/google/callback';
