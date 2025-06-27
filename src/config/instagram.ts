export const instagramConfig = {
  clientId: process.env.NEXT_PUBLIC_INSTAGRAM_CLIENT_ID,
  clientSecret: process.env.NEXT_PUBLIC_INSTAGRAM_CLIENT_SECRET,
  redirectUri: process.env.NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI,
  scopes: [
    'pages_show_list',
    'instagram_basic', 
    'pages_read_engagement',
    'instagram_content_publish'
  ],
  graphApiVersion: 'v19.0'
};
