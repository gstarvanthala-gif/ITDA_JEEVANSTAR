import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});

const formatDate = (date) =>
  new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(new Date(date));

function PortfolioPerformanceChart({ history }) {
  const data = history.map((item) => ({
    ...item,
    dayLabel: formatDate(item.date),
    portfolioValueNumber: Number(item.portfolioValue),
    investedValueNumber: Number(item.investedValue),
  }));

  return (
    <div className="portfolio-chart" role="img" aria-label="Simulated portfolio value and invested value over time">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 12, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id="portfolioValueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#158b78" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#158b78" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#e7edef" strokeDasharray="3 5" vertical={false} />
          <XAxis dataKey="dayLabel" tickLine={false} axisLine={false} minTickGap={24} />
          <YAxis
            tickFormatter={(value) => `₹${Math.round(value)}`}
            tickLine={false}
            axisLine={false}
            width={62}
          />
          <Tooltip formatter={(value) => currency.format(Number(value))} />
          <Area
            type="monotone"
            dataKey="portfolioValueNumber"
            name="Simulated value"
            stroke="#158b78"
            strokeWidth={2.5}
            fill="url(#portfolioValueFill)"
          />
          <Line
            type="monotone"
            dataKey="investedValueNumber"
            name="Invested virtually"
            stroke="#d09a31"
            strokeWidth={2}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default PortfolioPerformanceChart;