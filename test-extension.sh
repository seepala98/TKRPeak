#!/bin/bash

# Stock Information Extension Testing Script

set -e

echo "🚀 Stock Information Extension Testing Environment"
echo "=================================================="

# Create logs directory if it doesn't exist
mkdir -p logs

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        echo "❌ Docker is not running. Please start Docker and try again."
        exit 1
    fi
}

# Function to build and start the testing environment
start_testing() {
    echo "🔨 Building Docker testing environment..."
    docker-compose build
    
    echo "🚀 Starting testing environment..."
    docker-compose up -d
    
    echo "⏳ Waiting for services to start..."
    sleep 10
    
    echo ""
    echo "✅ Testing environment is ready!"
    echo ""
    echo "🌐 Access the browser at: http://localhost:6080"
    echo "🔑 VNC Password: testing"
    echo ""
    echo "📝 Testing Instructions:"
    echo "  1. The browser should open with financial news sites"
    echo "  2. Select any stock ticker (e.g., AAPL, TSLA, MSFT, GOOGL)"
    echo "  3. Right-click and choose 'Get Stock Information for [ticker]'"
    echo "  4. A popup should appear with real-time stock data"
    echo ""
    echo "🛠️  Extension Files:"
    echo "  - Extension is automatically loaded from: $(pwd)"
    echo "  - Logs are saved to: $(pwd)/logs"
    echo ""
    echo "💡 Pro Tips:"
    echo "  - Test on different financial websites"
    echo "  - Try both ticker symbols (AAPL) and company names (Apple)"
    echo "  - Check the browser console for any errors"
    echo "  - Extension popup appears near your selection"
    echo ""
    echo "📊 Pre-loaded test sites:"
    echo "  - Yahoo Finance (https://finance.yahoo.com)"
    echo "  - MarketWatch (https://www.marketwatch.com)"
    echo "  - Bloomberg Markets (https://www.bloomberg.com/markets)"
}

# Function to stop the testing environment
stop_testing() {
    echo "🛑 Stopping testing environment..."
    docker-compose down
    echo "✅ Testing environment stopped."
}

# Function to show logs
show_logs() {
    echo "📋 Extension Testing Logs:"
    echo "========================="
    docker-compose logs -f stock-extension-test
}

# Function to restart the environment
restart_testing() {
    echo "🔄 Restarting testing environment..."
    docker-compose down
    docker-compose build
    docker-compose up -d
    echo "✅ Testing environment restarted."
}

# Function to access the container shell
access_shell() {
    echo "🐚 Accessing container shell..."
    docker-compose exec stock-extension-test /bin/bash
}

# Main script logic
case "${1:-start}" in
    "start")
        check_docker
        start_testing
        ;;
    "stop")
        stop_testing
        ;;
    "restart")
        check_docker
        restart_testing
        ;;
    "logs")
        show_logs
        ;;
    "shell")
        access_shell
        ;;
    "help")
        echo "Stock Information Extension Testing Script"
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  start     Start the testing environment (default)"
        echo "  stop      Stop the testing environment"
        echo "  restart   Restart the testing environment"
        echo "  logs      Show testing environment logs"
        echo "  shell     Access the container shell"
        echo "  help      Show this help message"
        echo ""
        echo "After starting, access the browser at http://localhost:6080"
        ;;
    *)
        echo "❌ Unknown command: $1"
        echo "Run '$0 help' for available commands."
        exit 1
        ;;
esac
