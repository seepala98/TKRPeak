# Stock Information Extension - Docker Testing Environment
FROM ubuntu:22.04

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install necessary packages
RUN apt-get update && apt-get install -y \
    chromium-browser \
    xvfb \
    wget \
    curl \
    unzip \
    nodejs \
    npm \
    python3 \
    python3-pip \
    supervisor \
    novnc \
    x11vnc \
    fluxbox \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user
RUN useradd -ms /bin/bash developer

# Set up VNC and noVNC for remote access
RUN mkdir -p /home/developer/.vnc
RUN x11vnc -storepasswd testing /home/developer/.vnc/passwd
RUN chown -R developer:developer /home/developer/.vnc

# Set up working directory
WORKDIR /app
COPY . /app/
RUN chown -R developer:developer /app

# Create extension loading script
RUN cat > /app/load_extension.sh << 'EOF'
#!/bin/bash

# Start Xvfb
Xvfb :1 -screen 0 1920x1080x24 &
export DISPLAY=:1

# Start fluxbox window manager
fluxbox &

# Start VNC server
x11vnc -forever -usepw -create -shared -display :1 &

# Start noVNC
/usr/share/novnc/utils/launch.sh --vnc localhost:5900 &

# Wait a bit for services to start
sleep 3

echo "Starting Chromium with extension loaded..."
echo "Extension path: /app"

# Launch Chromium with extension loaded in developer mode
chromium-browser \
  --no-sandbox \
  --disable-dev-shm-usage \
  --disable-gpu \
  --display=:1 \
  --load-extension=/app \
  --user-data-dir=/tmp/chrome-test-profile \
  --disable-extensions-except=/app \
  --extensions-on-chrome-urls \
  --start-maximized \
  --new-window \
  "https://finance.yahoo.com/quote/AAPL" \
  "https://www.marketwatch.com/" \
  "https://www.bloomberg.com/markets/stocks" &

echo "Chromium started with extension loaded."
echo "You can access the browser via VNC at http://localhost:6080"
echo "VNC password: testing"
echo ""
echo "Test the extension by:"
echo "1. Selecting any stock ticker (e.g., AAPL, TSLA, MSFT)"
echo "2. Right-clicking and selecting 'Get Stock Information for [ticker]'"
echo "3. The stock popup should appear with real-time data"
echo ""
echo "Press Ctrl+C to stop the container"

# Keep the container running
while true; do
  sleep 10
  # Check if Chromium is still running
  if ! pgrep -f chromium-browser > /dev/null; then
    echo "Chromium has stopped, restarting..."
    chromium-browser \
      --no-sandbox \
      --disable-dev-shm-usage \
      --disable-gpu \
      --display=:1 \
      --load-extension=/app \
      --user-data-dir=/tmp/chrome-test-profile \
      --disable-extensions-except=/app \
      --extensions-on-chrome-urls \
      --start-maximized \
      "https://finance.yahoo.com/quote/AAPL" &
  fi
done
EOF

RUN chmod +x /app/load_extension.sh

# Create supervisor config
RUN cat > /etc/supervisor/conf.d/services.conf << 'EOF'
[supervisord]
nodaemon=true
user=root

[program:extension_test]
command=/app/load_extension.sh
user=developer
autostart=true
autorestart=true
stdout_logfile=/var/log/extension_test.log
stderr_logfile=/var/log/extension_test.log
EOF

# Expose VNC port for remote access
EXPOSE 6080 5900

# Switch to developer user
USER developer

# Set environment variables
ENV DISPLAY=:1
ENV HOME=/home/developer

# Default command
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/supervisord.conf"]
