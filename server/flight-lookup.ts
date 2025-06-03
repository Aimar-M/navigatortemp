export interface FlightData {
  flightNumber: string;
  airline: string;
  departureAirport: string;
  departureCity: string;
  departureTime: string;
  arrivalAirport: string;
  arrivalCity: string;
  arrivalTime: string;
  status: string;
  gate?: string;
  terminal?: string;
  delay?: number;
}

// Function to parse flight number and extract airline info
function parseFlightNumber(flightNumber: string): { airline: string; code: string } {
  const flightNum = flightNumber.toUpperCase().trim();
  
  // Common airline codes mapping
  const airlineCodes: Record<string, string> = {
    'AA': 'American Airlines',
    'UA': 'United Airlines', 
    'DL': 'Delta Air Lines',
    'WN': 'Southwest Airlines',
    'B6': 'JetBlue Airways',
    'AS': 'Alaska Airlines',
    'F9': 'Frontier Airlines',
    'NK': 'Spirit Airlines',
    'BA': 'British Airways',
    'LH': 'Lufthansa',
    'AF': 'Air France',
    'KL': 'KLM',
    'EK': 'Emirates',
    'QR': 'Qatar Airways',
    'SQ': 'Singapore Airlines',
    'CX': 'Cathay Pacific',
    'JL': 'Japan Airlines',
    'NH': 'All Nippon Airways',
    'TK': 'Turkish Airlines',
    'LX': 'Swiss International',
    'OS': 'Austrian Airlines',
    'SN': 'Brussels Airlines',
    'AY': 'Finnair',
    'SK': 'SAS',
    'AC': 'Air Canada',
    'WS': 'WestJet'
  };

  // Extract airline code (first 2-3 letters)
  const match = flightNum.match(/^([A-Z]{2,3})(\d+)$/);
  if (match) {
    const [, code, number] = match;
    return {
      airline: airlineCodes[code] || code,
      code: flightNum
    };
  }

  return {
    airline: 'Unknown Airline',
    code: flightNum
  };
}

// Function to lookup flight information from authentic sources only
export async function lookupFlightInfo(flightNumber: string, date: string): Promise<FlightData | null> {
  const { airline, code } = parseFlightNumber(flightNumber);
  
  // Only try authentic data sources - no fallback to generated data
  const flightData = await tryMultipleFlightSources(code, date);
  
  if (flightData) {
    return {
      ...flightData,
      airline: flightData.airline || airline,
      flightNumber: code
    };
  }

  // Return null if no authentic data is available
  console.log('No authentic flight data found for:', flightNumber);
  return null;
}

// Try multiple flight data sources
async function tryMultipleFlightSources(flightNumber: string, date: string): Promise<FlightData | null> {
  console.log('Trying multiple flight sources for:', flightNumber, date);
  
  // Try AviationStack API first (most reliable with API key)
  try {
    const aviationStackResult = await lookupAviationStack(flightNumber, date);
    if (aviationStackResult) {
      console.log('AviationStack found data');
      return aviationStackResult;
    }
  } catch (error) {
    console.log('AviationStack failed:', (error as Error).message);
  }

  // Try other sources as fallback
  const sources = [
    () => tryFlightRadar24(flightNumber, date),
    () => tryFlightAware(flightNumber, date),
    () => tryOpenSky(flightNumber, date)
  ];
  
  for (const source of sources) {
    try {
      const result = await source();
      if (result) return result;
    } catch (error) {
      console.log('Flight source failed:', (error as Error).message);
    }
  }
  
  return null;
}

// Try FlightRadar24 public data
async function tryFlightRadar24(flightNumber: string, date: string): Promise<FlightData | null> {
  try {
    // Note: This would require web scraping or finding their public API endpoints
    // For demo purposes, returning structured data based on flight patterns
    return null;
  } catch (error) {
    return null;
  }
}

// Try FlightAware public data
async function tryFlightAware(flightNumber: string, date: string): Promise<FlightData | null> {
  try {
    // Note: This would require web scraping or finding their public API endpoints
    return null;
  } catch (error) {
    return null;
  }
}

// Try OpenSky Network (free API)
async function tryOpenSky(flightNumber: string, date: string): Promise<FlightData | null> {
  try {
    const response = await fetch(`https://opensky-network.org/api/flights/departure?icao24=${flightNumber.toLowerCase()}&begin=${Math.floor(new Date(date).getTime() / 1000)}&end=${Math.floor(new Date(date).getTime() / 1000) + 86400}`);
    const data = await response.json();
    
    if (data && data.length > 0) {
      const flight = data[0];
      return {
        flightNumber: flightNumber,
        airline: 'Unknown',
        departureAirport: flight.estDepartureAirport || 'Unknown',
        departureCity: 'Unknown',
        departureTime: new Date(flight.firstSeen * 1000).toISOString(),
        arrivalAirport: flight.estArrivalAirport || 'Unknown',
        arrivalCity: 'Unknown',
        arrivalTime: new Date(flight.lastSeen * 1000).toISOString(),
        status: 'Active',
        gate: undefined,
        terminal: undefined,
        delay: 0
      };
    }
  } catch (error) {
    return null;
  }
  
  return null;
}

// Get default routes for airlines not in the main list
function getDefaultRoutesForAirline(airline: string): Array<{dep: string, arr: string, depCity: string, arrCity: string}> {
  // International airlines
  if (airline.includes('Swiss') || airline === 'LX') {
    return [
      {dep: 'ZUR', arr: 'JFK', depCity: 'Zurich', arrCity: 'New York'},
      {dep: 'GVA', arr: 'LAX', depCity: 'Geneva', arrCity: 'Los Angeles'},
      {dep: 'ZUR', arr: 'ORD', depCity: 'Zurich', arrCity: 'Chicago'}
    ];
  }
  
  if (airline.includes('Lufthansa') || airline === 'LH') {
    return [
      {dep: 'FRA', arr: 'JFK', depCity: 'Frankfurt', arrCity: 'New York'},
      {dep: 'MUC', arr: 'LAX', depCity: 'Munich', arrCity: 'Los Angeles'},
      {dep: 'FRA', arr: 'ORD', depCity: 'Frankfurt', arrCity: 'Chicago'}
    ];
  }
  
  if (airline.includes('Emirates') || airline === 'EK') {
    return [
      {dep: 'DXB', arr: 'JFK', depCity: 'Dubai', arrCity: 'New York'},
      {dep: 'DXB', arr: 'LAX', depCity: 'Dubai', arrCity: 'Los Angeles'},
      {dep: 'DXB', arr: 'ORD', depCity: 'Dubai', arrCity: 'Chicago'}
    ];
  }
  
  if (airline.includes('Air France') || airline === 'AF') {
    return [
      {dep: 'CDG', arr: 'JFK', depCity: 'Paris', arrCity: 'New York'},
      {dep: 'CDG', arr: 'LAX', depCity: 'Paris', arrCity: 'Los Angeles'},
      {dep: 'CDG', arr: 'ATL', depCity: 'Paris', arrCity: 'Atlanta'}
    ];
  }
  
  // Default domestic US routes for unknown airlines
  return [
    {dep: 'ATL', arr: 'LAX', depCity: 'Atlanta', arrCity: 'Los Angeles'},
    {dep: 'ORD', arr: 'SFO', depCity: 'Chicago', arrCity: 'San Francisco'},
    {dep: 'DFW', arr: 'JFK', depCity: 'Dallas', arrCity: 'New York'},
    {dep: 'DEN', arr: 'MIA', depCity: 'Denver', arrCity: 'Miami'},
    {dep: 'SEA', arr: 'BOS', depCity: 'Seattle', arrCity: 'Boston'}
  ];
}

// Get realistic flight information based on airline patterns and flight numbers
function getCommonRouteInfo(airline: string, flightNumber: string, date: string) {
  // Extract flight number to determine route patterns
  const flightNum = parseInt(flightNumber.replace(/[A-Z]/g, ''));
  
  // Generate realistic flight status scenarios
  const statusScenarios = ['On Time', 'Delayed 15 min', 'Delayed 30 min', 'Boarding', 'Departed', 'Arrived'];
  const status = statusScenarios[flightNum % statusScenarios.length];
  
  // Generate delay based on status
  let delay = 0;
  if (status.includes('Delayed 15')) delay = 15;
  if (status.includes('Delayed 30')) delay = 30;
  
  // Common realistic routes based on airline patterns
  const airlineRoutes: Record<string, Array<{dep: string, arr: string, depCity: string, arrCity: string}>> = {
    'American Airlines': [
      {dep: 'DFW', arr: 'LAX', depCity: 'Dallas', arrCity: 'Los Angeles'},
      {dep: 'CLT', arr: 'JFK', depCity: 'Charlotte', arrCity: 'New York'},
      {dep: 'PHX', arr: 'ORD', depCity: 'Phoenix', arrCity: 'Chicago'},
      {dep: 'MIA', arr: 'BOS', depCity: 'Miami', arrCity: 'Boston'},
      {dep: 'JFK', arr: 'LAX', depCity: 'New York', arrCity: 'Los Angeles'}
    ],
    'United Airlines': [
      {dep: 'ORD', arr: 'SFO', depCity: 'Chicago', arrCity: 'San Francisco'},
      {dep: 'DEN', arr: 'LAX', depCity: 'Denver', arrCity: 'Los Angeles'},
      {dep: 'IAH', arr: 'EWR', depCity: 'Houston', arrCity: 'Newark'},
      {dep: 'SFO', arr: 'JFK', depCity: 'San Francisco', arrCity: 'New York'}
    ],
    'Delta Air Lines': [
      {dep: 'ATL', arr: 'LAX', depCity: 'Atlanta', arrCity: 'Los Angeles'},
      {dep: 'DTW', arr: 'JFK', depCity: 'Detroit', arrCity: 'New York'},
      {dep: 'MSP', arr: 'SEA', depCity: 'Minneapolis', arrCity: 'Seattle'},
      {dep: 'JFK', arr: 'SFO', depCity: 'New York', arrCity: 'San Francisco'}
    ],
    'Southwest Airlines': [
      {dep: 'DAL', arr: 'LAX', depCity: 'Dallas', arrCity: 'Los Angeles'},
      {dep: 'BWI', arr: 'LAS', depCity: 'Baltimore', arrCity: 'Las Vegas'},
      {dep: 'MDW', arr: 'PHX', depCity: 'Chicago', arrCity: 'Phoenix'},
      {dep: 'LAS', arr: 'DEN', depCity: 'Las Vegas', arrCity: 'Denver'}
    ]
  };

  // Get routes for the specific airline, with more realistic patterns
  const routes = airlineRoutes[airline] || getDefaultRoutesForAirline(airline);
  
  const route = routes[flightNum % routes.length];
  
  // Generate realistic times based on date
  const baseDate = new Date(date);
  const depHour = 6 + (flightNum % 16); // Flights between 6 AM and 10 PM
  const depMinute = (flightNum * 7) % 60;
  
  const departureTime = new Date(baseDate);
  departureTime.setHours(depHour, depMinute, 0, 0);
  
  const arrivalTime = new Date(departureTime);
  arrivalTime.setHours(arrivalTime.getHours() + 2 + (flightNum % 6)); // 2-8 hour flights
  
  // Add delay to arrival time if delayed
  if (delay > 0) {
    arrivalTime.setMinutes(arrivalTime.getMinutes() + delay);
  }

  const result = {
    departureAirport: route.dep,
    departureCity: route.depCity,
    departureTime: departureTime.toISOString(),
    arrivalAirport: route.arr,
    arrivalCity: route.arrCity,
    arrivalTime: arrivalTime.toISOString(),
    status: status,
    delay: delay,
    gate: `A${1 + (flightNum % 30)}`, // Gates A1-A30
    terminal: `${1 + (flightNum % 4)}` // Terminals 1-4
  };
  
  console.log('Generated route info:', result);
  return result;
}



// Get city for airport code
function getAirportCity(airportCode: string): string {
  const airportCities: Record<string, string> = {
    'JFK': 'New York', 'LAX': 'Los Angeles', 'ORD': 'Chicago', 'ATL': 'Atlanta',
    'DFW': 'Dallas', 'DEN': 'Denver', 'SFO': 'San Francisco', 'LAS': 'Las Vegas',
    'SEA': 'Seattle', 'MIA': 'Miami', 'BOS': 'Boston', 'PHX': 'Phoenix',
    'CLT': 'Charlotte', 'IAH': 'Houston', 'DTW': 'Detroit', 'MSP': 'Minneapolis',
    'LHR': 'London', 'LGW': 'London', 'CDG': 'Paris', 'FRA': 'Frankfurt'
  };
  
  return airportCities[airportCode] || 'Unknown City';
}

async function lookupFlightAware(flightNumber: string, date: string): Promise<FlightData | null> {
  const response = await axios.get(`https://aeroapi.flightaware.com/aeroapi/flights/${flightNumber}`, {
    headers: {
      'x-apikey': process.env.FLIGHTAWARE_API_KEY
    },
    params: {
      start: date,
      end: date
    }
  });

  if (response.data.flights && response.data.flights.length > 0) {
    const flight = response.data.flights[0];
    return {
      flightNumber: flight.ident,
      airline: flight.operator || 'Unknown',
      departureAirport: flight.origin?.code || 'Unknown',
      departureCity: flight.origin?.city || 'Unknown',
      departureTime: flight.scheduled_out || flight.estimated_out || 'Unknown',
      arrivalAirport: flight.destination?.code || 'Unknown',
      arrivalCity: flight.destination?.city || 'Unknown',
      arrivalTime: flight.scheduled_in || flight.estimated_in || 'Unknown',
      status: flight.status || 'Unknown',
      gate: flight.gate_destination,
      terminal: flight.terminal_destination
    };
  }

  return null;
}

async function lookupAviationStack(flightNumber: string, date: string): Promise<FlightData | null> {
  if (!process.env.AVIATIONSTACK_API_KEY) {
    console.log('AviationStack API key not available');
    return null;
  }

  try {
    const fetch = (await import('node-fetch')).default;
    
    // First, try to get airline information from the flight code
    const airlineCode = flightNumber.match(/^([A-Z]{2,3})/)?.[1];
    if (airlineCode) {
      const airlineUrl = `http://api.aviationstack.com/v1/airlines?access_key=${process.env.AVIATIONSTACK_API_KEY}&iata_code=${airlineCode}`;
      
      console.log('Looking up airline for code:', airlineCode);
      const airlineResponse = await fetch(airlineUrl);
      const airlineData = await airlineResponse.json();
      
      console.log('Airline lookup response:', JSON.stringify(airlineData, null, 2));
      
      if (airlineData.data && airlineData.data.length > 0) {
        const airline = airlineData.data[0];
        console.log('Found airline:', airline.airline_name);
        
        // Return only authentic airline information (this is what we can verify from free tier)
        return {
          flightNumber: flightNumber,
          airline: airline.airline_name,
          departureAirport: undefined,
          departureCity: undefined, 
          departureTime: undefined,
          arrivalAirport: undefined,
          arrivalCity: undefined,
          arrivalTime: undefined,
          status: undefined,
          gate: undefined,
          terminal: undefined,
          delay: undefined
        };
      }
    }
    
    // Test what endpoints are available
    console.log('Testing available AviationStack endpoints...');
    const testUrl = `http://api.aviationstack.com/v1/countries?access_key=${process.env.AVIATIONSTACK_API_KEY}&limit=1`;
    const testResponse = await fetch(testUrl);
    const testData = await testResponse.json();
    
    if (testData.error) {
      console.log('AviationStack API Error:', testData.error.message);
    } else {
      console.log('AviationStack API working, but flight data not available in free tier');
    }
    
  } catch (error) {
    console.error('AviationStack API error:', error);
  }
  
  return null;
}

async function lookupFlightAPI(flightNumber: string, date: string): Promise<FlightData | null> {
  const response = await axios.get(`https://api.flightapi.io/ontime/${flightNumber}/${date}`, {
    headers: {
      'Authorization': `Bearer ${process.env.FLIGHTAPI_KEY}`
    }
  });

  if (response.data) {
    const flight = response.data;
    return {
      flightNumber: flight.flight || flightNumber,
      airline: flight.airline || 'Unknown',
      departureAirport: flight.departure?.airport || 'Unknown',
      departureCity: flight.departure?.city || 'Unknown',
      departureTime: flight.departure?.scheduled || 'Unknown',
      arrivalAirport: flight.arrival?.airport || 'Unknown',
      arrivalCity: flight.arrival?.city || 'Unknown',
      arrivalTime: flight.arrival?.scheduled || 'Unknown',
      status: flight.status || 'Unknown',
      gate: flight.arrival?.gate,
      terminal: flight.arrival?.terminal,
      delay: flight.arrival?.delay
    };
  }

  return null;
}

async function lookupRapidAPI(flightNumber: string, date: string): Promise<FlightData | null> {
  const response = await axios.get('https://flight-info-api.p.rapidapi.com/status', {
    headers: {
      'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
      'X-RapidAPI-Host': 'flight-info-api.p.rapidapi.com'
    },
    params: {
      flight: flightNumber,
      date: date
    }
  });

  if (response.data) {
    const flight = response.data;
    return {
      flightNumber: flight.flightNumber || flightNumber,
      airline: flight.airline || 'Unknown',
      departureAirport: flight.departure?.airport || 'Unknown',
      departureCity: flight.departure?.city || 'Unknown',
      departureTime: flight.departure?.time || 'Unknown',
      arrivalAirport: flight.arrival?.airport || 'Unknown',
      arrivalCity: flight.arrival?.city || 'Unknown',
      arrivalTime: flight.arrival?.time || 'Unknown',
      status: flight.status || 'Unknown',
      gate: flight.arrival?.gate,
      terminal: flight.arrival?.terminal,
      delay: flight.delay
    };
  }

  return null;
}