export const instagramConfig = {
  clientId: process.env.NEXT_PUBLIC_INSTAGRAM_CLIENT_ID,
  clientSecret: process.env.NEXT_PUBLIC_INSTAGRAM_CLIENT_SECRET,
  redirectUri: process.env.NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI,
  scopes: [
    'user_profile',
    'user_media'
  ],
  graphApiVersion: 'v18.0'
};
