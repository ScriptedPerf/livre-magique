#!/bin/sh

# Generate config.js from environment variables
echo "window.env = {" > /usr/share/nginx/html/config.js
if [ -n "$GEMINI_API_KEY" ]; then
  echo "  GEMINI_API_KEY: \"$GEMINI_API_KEY\"," >> /usr/share/nginx/html/config.js
fi
echo "};" >> /usr/share/nginx/html/config.js

# Update Nginx port if PORT is set (useful for Render/Heroku)
if [ -n "$PORT" ]; then
  sed -i "s/listen       80;/listen       $PORT;/g" /etc/nginx/nginx.conf
fi

# Start Nginx
exec nginx -g "daemon off;"
