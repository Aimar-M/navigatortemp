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
      <Route path="/chats" component={Chats} />
      <Route path="/trips" component={TripsCalendar} />
      <Route path="/chat/:id" component={Chat} />
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
