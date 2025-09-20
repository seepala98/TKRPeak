// Chart UI Module
// Handles all chart drawing and visualization logic

export class ChartRenderer {
  static drawChart(stockData, period = '1d') {
    const canvas = document.getElementById('stockChart');
    if (!canvas) {
      console.error('Chart canvas not found');
      return;
    }

    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    const chartData = stockData.chartData;
    if (!chartData || chartData.length === 0) {
      console.log('📊 No chart data available, showing placeholder');
      this.drawPlaceholder(ctx, width, height);
      return;
    }

    console.log(`📊 Drawing chart for ${stockData.symbol} (${period}): ${chartData.length} data points`);

    // Extract prices and find min/max
    const prices = chartData.map(d => d.price).filter(p => p !== null && p !== undefined);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;

    // Chart margins
    const margin = { top: 20, right: 40, bottom: 30, left: 40 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    // Helper functions
    const xScale = (index) => margin.left + (index / (chartData.length - 1)) * chartWidth;
    const yScale = (price) => {
      if (priceRange === 0) return margin.top + chartHeight / 2;
      return margin.top + (1 - (price - minPrice) / priceRange) * chartHeight;
    };

    // Draw grid lines
    this.drawGridLines(ctx, margin, chartWidth, chartHeight, minPrice, maxPrice);

    // Create gradient
    const gradient = ctx.createLinearGradient(0, margin.top, 0, margin.top + chartHeight);
    gradient.addColorStop(0, 'rgba(66, 133, 244, 0.3)');
    gradient.addColorStop(1, 'rgba(66, 133, 244, 0.05)');

    // Draw area fill
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(xScale(0), yScale(chartData[0].price));

    for (let i = 0; i < chartData.length; i++) {
      const price = chartData[i].price;
      if (price !== null && price !== undefined) {
        ctx.lineTo(xScale(i), yScale(price));
      }
    }

    ctx.lineTo(xScale(chartData.length - 1), margin.top + chartHeight);
    ctx.lineTo(xScale(0), margin.top + chartHeight);
    ctx.closePath();
    ctx.fill();

    // Draw price line
    ctx.strokeStyle = '#4285f4';
    ctx.lineWidth = 2;
    ctx.beginPath();

    let firstValidPoint = true;
    for (let i = 0; i < chartData.length; i++) {
      const price = chartData[i].price;
      if (price !== null && price !== undefined) {
        if (firstValidPoint) {
          ctx.moveTo(xScale(i), yScale(price));
          firstValidPoint = false;
        } else {
          ctx.lineTo(xScale(i), yScale(price));
        }
      }
    }

    ctx.stroke();

    // Draw price labels
    this.drawPriceLabels(ctx, margin, chartWidth, chartHeight, minPrice, maxPrice);

    // Draw time labels
    this.drawTimeLabels(ctx, chartData, margin, chartWidth, chartHeight, period);

    console.log(`📊 Chart drawn for ${period}: ${prices.length} points, range $${minPrice.toFixed(2)}-$${maxPrice.toFixed(2)}`);
  }

  static drawGridLines(ctx, margin, chartWidth, chartHeight, minPrice, maxPrice) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;

    // Horizontal grid lines (price levels)
    const priceSteps = 5;
    for (let i = 0; i <= priceSteps; i++) {
      const y = margin.top + (i / priceSteps) * chartHeight;
      ctx.beginPath();
      ctx.moveTo(margin.left, y);
      ctx.lineTo(margin.left + chartWidth, y);
      ctx.stroke();
    }

    // Vertical grid lines (time)
    const timeSteps = 4;
    for (let i = 0; i <= timeSteps; i++) {
      const x = margin.left + (i / timeSteps) * chartWidth;
      ctx.beginPath();
      ctx.moveTo(x, margin.top);
      ctx.lineTo(x, margin.top + chartHeight);
      ctx.stroke();
    }
  }

  static drawPriceLabels(ctx, margin, chartWidth, chartHeight, minPrice, maxPrice) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '10px Arial';
    ctx.textAlign = 'left';

    const priceSteps = 5;
    for (let i = 0; i <= priceSteps; i++) {
      const price = maxPrice - (i / priceSteps) * (maxPrice - minPrice);
      const y = margin.top + (i / priceSteps) * chartHeight;
      ctx.fillText(`$${price.toFixed(2)}`, margin.left + chartWidth + 5, y + 3);
    }
  }

  static drawTimeLabels(ctx, chartData, margin, chartWidth, chartHeight, period) {
    if (chartData.length === 0) return;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';

    const labelPositions = [0, Math.floor(chartData.length * 0.25), Math.floor(chartData.length * 0.5), Math.floor(chartData.length * 0.75), chartData.length - 1];

    labelPositions.forEach((index, i) => {
      if (index < chartData.length) {
        const dataPoint = chartData[index];
        const x = margin.left + (index / (chartData.length - 1)) * chartWidth;
        const timeStr = this.formatTimeLabel(dataPoint.time, period);
        ctx.fillText(timeStr, x, margin.top + chartHeight + 15);
      }
    });
  }

  static formatTimeLabel(timestamp, period) {
    const date = new Date(timestamp);
    
    switch (period) {
      case '1d':
        return date.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit', 
          hour12: false 
        });
      case '5d':
        return date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        });
      case '1mo':
      case '6mo':
        return date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        });
      case '1y':
        return date.toLocaleDateString('en-US', { 
          month: 'short', 
          year: '2-digit' 
        });
      default:
        return date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        });
    }
  }

  static drawPlaceholder(ctx, width, height) {
    // Draw placeholder text
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('📊 Chart will appear here', width / 2, height / 2);
    
    // Draw simple placeholder line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(20, height / 2 + 20);
    ctx.lineTo(width - 20, height / 2 + 10);
    ctx.stroke();
  }
}
