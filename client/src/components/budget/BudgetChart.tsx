import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

interface BudgetChartProps {
  budgetData: {
    categories: {
      accommodation: number;
      flights: number;
      food: number;
      activities: number;
      transport: number;
    };
    totalBudget: number;
    actualSpent: number;
    dailyBreakdown: Array<{
      day: string;
      budget: number;
      spent: number;
    }>;
  };
}

export default function BudgetChart({ budgetData }: BudgetChartProps) {
  const categoryColors = {
    accommodation: "#8884d8",
    flights: "#82ca9d", 
    food: "#ffc658",
    activities: "#ff7300",
    transport: "#00ff88"
  };

  // Prepare data for charts
  const pieData = Object.entries(budgetData.categories).map(([category, amount]) => ({
    name: category.charAt(0).toUpperCase() + category.slice(1),
    value: amount,
    color: categoryColors[category as keyof typeof categoryColors]
  }));

  const barData = Object.entries(budgetData.categories).map(([category, budgetAmount]) => ({
    category: category.charAt(0).toUpperCase() + category.slice(1),
    budget: budgetAmount,
    spent: 0, // Will be populated with actual expenses
    color: categoryColors[category as keyof typeof categoryColors]
  }));

  const budgetUtilization = ((budgetData.actualSpent / budgetData.totalBudget) * 100).toFixed(1);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.dataKey}: ${entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.05) return null; // Don't show labels for small slices
    
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize="12"
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="space-y-6">
      {/* Budget Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${budgetData.totalBudget.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Spent So Far</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              ${budgetData.actualSpent.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Remaining</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              ${(budgetData.totalBudget - budgetData.actualSpent).toFixed(2)}
            </div>
            <Badge 
              variant={parseFloat(budgetUtilization) > 80 ? "destructive" : "secondary"}
              className="mt-2"
            >
              {budgetUtilization}% used
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Interactive Charts */}
      <Tabs defaultValue="breakdown" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="breakdown">Category Breakdown</TabsTrigger>
          <TabsTrigger value="comparison">Budget vs Spent</TabsTrigger>
          <TabsTrigger value="timeline">Daily Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="breakdown" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Budget Allocation by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomLabel}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`$${value}`, 'Budget']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comparison" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Budget vs Actual Spending</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="budget" fill="#8884d8" name="Budgeted" />
                  <Bar dataKey="spent" fill="#82ca9d" name="Spent" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Daily Spending Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={budgetData.dailyBreakdown} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="budget" 
                    stroke="#8884d8" 
                    strokeWidth={2}
                    name="Daily Budget"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="spent" 
                    stroke="#82ca9d" 
                    strokeWidth={2}
                    name="Daily Spent"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Category Details */}
      <Card>
        <CardHeader>
          <CardTitle>Category Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(budgetData.categories).map(([category, amount]) => (
              <div key={category} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold capitalize">{category}</h3>
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: categoryColors[category as keyof typeof categoryColors] }}
                  />
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  ${amount.toFixed(2)}
                </div>
                <div className="text-sm text-gray-500">
                  {((amount / budgetData.totalBudget) * 100).toFixed(1)}% of total budget
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}