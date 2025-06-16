import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Login from "@/pages/login";
import Register from "@/pages/register";
import TripDetails from "@/pages/trip-details";
import CreateTrip from "@/pages/create-trip";
import Chat from "@/pages/chat";
import Chats from "@/pages/chats";
import TripsCalendar from "@/pages/trips-calendar";
import Itinerary from "@/pages/itinerary";
import Flights from "@/pages/flights";
import TripBudget from "@/pages/trip-budget";
import TripExpenses from "@/pages/expenses";
import Polls from "@/pages/polls";
import InvitationPage from "@/pages/invitation";
import Profile from "@/pages/profile";
import UserProfile from "@/pages/user-profile";
import BudgetDashboard from "@/pages/budget-dashboard";
import ActivityDetails from "@/pages/activity-details";
import ExpenseTracker from "@/pages/expense-tracker";
import ExpenseDetails from "@/pages/expense-details";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/create-trip" component={CreateTrip} />
      <Route path="/trips/:id" component={TripDetails} />
      <Route path="/trips/:id/chat" component={Chat} />
      <Route path="/trips/:id/itinerary" component={Itinerary} />
      <Route path="/trips/:id/flights" component={Flights} />
      <Route path="/trips/:id/budget" component={TripBudget} />
      <Route path="/trips/:id/expenses" component={TripExpenses} />
      <Route path="/trips/:id/expense-tracker" component={ExpenseTracker} />
      <Route path="/trips/:id/polls" component={Polls} />
      <Route path="/chats" component={Chats} />
      <Route path="/trips" component={TripsCalendar} />
      <Route path="/chat/:id" component={Chat} />
      <Route path="/invite/:token" component={InvitationPage} />
      <Route path="/budget-dashboard" component={BudgetDashboard} />
      <Route path="/activities/:activityId" component={ActivityDetails} />
      <Route path="/trips/:tripId/activities/:activityId" component={ActivityDetails} />
      <Route path="/trips/:tripId/expenses/:expenseId" component={ExpenseDetails} />
      <Route path="/profile" component={Profile} />
      <Route path="/user/:userId" component={UserProfile} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <TooltipProvider>
      <Toaster />
      <Router />
    </TooltipProvider>
  );
}

export default App;
