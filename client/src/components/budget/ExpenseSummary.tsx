import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import UserAvatar from "../user-avatar";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

interface ExpenseSummaryProps {
  tripId: number;
  currentUserId: number;
}

// Helper function to get category colors for pie chart
const getCategoryColors = () => {
  return {
    accommodation: "#9333ea", // purple
    transportation: "#2563eb", // blue
    food: "#16a34a", // green
    activities: "#d97706", // amber
    other: "#6b7280", // gray
  };
};

const ExpenseSummary: React.FC<ExpenseSummaryProps> = ({ tripId, currentUserId }) => {
  // Fetch expense summary for this trip
  const { data: summary, isLoading, error } = useQuery({
    queryKey: ['/api/trips', tripId, 'expenses/summary'],
    enabled: !!tripId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            <Skeleton className="h-8 w-1/3" />
          </CardTitle>
          <CardDescription>
            <Skeleton className="h-4 w-1/2" />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-[250px] w-full" />
            <Skeleton className="h-[250px] w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !summary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Expense Summary</CardTitle>
          <CardDescription>
            There was an error loading the expense summary.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Please try again later or contact support if the problem persists.</p>
        </CardContent>
      </Card>
    );
  }

  // Format category data for pie chart
  const categoryData = Object.entries(summary.byCategory || {}).map(([category, amount]) => ({
    name: category.charAt(0).toUpperCase() + category.slice(1),
    value: Number(amount),
    color: getCategoryColors()[category as keyof ReturnType<typeof getCategoryColors>] || "#6b7280"
  }));

  // Format payer data for pie chart
  const payerData = Object.entries(summary.byPayer || {}).map(([payerId, data]) => {
    const { amount, user } = data as { amount: number; user: any };
    return {
      name: user?.name || user?.username || `User ${payerId}`,
      value: Number(amount),
      id: Number(payerId),
      avatar: user?.avatar,
      color: payerId === String(currentUserId) ? "#2563eb" : "#6b7280" // Highlight current user
    };
  });

  // Custom tooltip for pie charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 border rounded shadow text-sm">
          <p className="font-medium">{payload[0].name}</p>
          <p>
            {summary.currency || "USD"} {payload[0].value.toFixed(2)} ({((payload[0].value / summary.total) * 100).toFixed(1)}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trip Expense Summary</CardTitle>
        <CardDescription>
          Total: {summary.currency || "USD"} {summary.total.toFixed(2)} • Per Person: {summary.currency || "USD"} {summary.perPersonCost.toFixed(2)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Category breakdown */}
          <div>
            <h4 className="font-medium mb-4 text-center">Spending by Category</h4>
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-gray-500">
                No category data available
              </div>
            )}
          </div>

          {/* Payer breakdown */}
          <div>
            <h4 className="font-medium mb-4 text-center">Who Paid What</h4>
            {payerData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={payerData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {payerData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || "#6b7280"} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-gray-500">
                No payer data available
              </div>
            )}
          </div>
        </div>

        {/* Detailed breakdown by person */}
        <div className="mt-8">
          <h4 className="font-medium mb-4">Detailed Breakdown</h4>
          <div className="space-y-4">
            {payerData.map((payer) => (
              <div 
                key={payer.id} 
                className={`flex items-center justify-between p-3 rounded-lg border 
                  ${payer.id === currentUserId ? 'border-blue-200 bg-blue-50' : ''}`}
              >
                <div className="flex items-center space-x-3">
                  <UserAvatar user={{ id: payer.id, avatar: payer.avatar }} />
                  <div>
                    <div className="font-medium">{payer.name}</div>
                    <div className="text-sm text-gray-500">
                      {payer.id === currentUserId ? "You" : ""}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">
                    {summary.currency || "USD"} {payer.value.toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-500">
                    {((payer.value / summary.total) * 100).toFixed(1)}% of total
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ExpenseSummary;