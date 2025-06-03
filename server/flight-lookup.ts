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

// Function to lookup flight information using real flight APIs
export async function lookupFlightInfo(flightNumber: string, date: string): Promise<FlightData | null> {
  const { airline, code } = parseFlightNumber(flightNumber);
  
  // Try AviationStack API if available
  if (process.env.AVIATIONSTACK_API_KEY) {
    try {
      const response = await fetch(`http://api.aviationstack.com/v1/flights?access_key=${process.env.AVIATIONSTACK_API_KEY}&flight_iata=${flightNumber}&flight_date=${date}`);
      const data = await response.json();
      
      if (data.data && data.data.length > 0) {
        const flight = data.data[0];
        return {
          flightNumber: flight.flight?.iata || code,
          airline: flight.airline?.name || airline,
          departureAirport: flight.departure?.iata || 'Unknown',
          departureCity: flight.departure?.timezone || 'Unknown',
          departureTime: flight.departure?.scheduled || date,
          arrivalAirport: flight.arrival?.iata || 'Unknown',
          arrivalCity: flight.arrival?.timezone || 'Unknown',
          arrivalTime: flight.arrival?.scheduled || date,
          status: flight.flight_status || 'Scheduled',
          gate: flight.arrival?.gate,
          terminal: flight.arrival?.terminal,
          delay: flight.arrival?.delay
        };
      }
    } catch (error) {
      console.log('AviationStack API error:', (error as Error).message);
    }
  }

  // Try FlightAPI if available
  if (process.env.FLIGHTAPI_KEY) {
    try {
      const response = await fetch(`https://api.flightapi.io/ontime/${flightNumber}/${date}`, {
        headers: {
          'Authorization': `Bearer ${process.env.FLIGHTAPI_KEY}`
        }
      });
      const flight = await response.json();
      
      if (flight && !flight.error) {
        return {
          flightNumber: flight.flight || code,
          airline: flight.airline || airline,
          departureAirport: flight.departure?.airport || 'Unknown',
          departureCity: flight.departure?.city || 'Unknown',
          departureTime: flight.departure?.scheduled || date,
          arrivalAirport: flight.arrival?.airport || 'Unknown',
          arrivalCity: flight.arrival?.city || 'Unknown',
          arrivalTime: flight.arrival?.scheduled || date,
          status: flight.status || 'Scheduled',
          gate: flight.arrival?.gate,
          terminal: flight.arrival?.terminal,
          delay: flight.arrival?.delay
        };
      }
    } catch (error) {
      console.log('FlightAPI error:', (error as Error).message);
    }
  }

  // Return basic airline info if no API data available
  return {
    flightNumber: code,
    airline: airline,
    departureAirport: 'To be determined',
    departureCity: 'To be determined',
    departureTime: date,
    arrivalAirport: 'To be determined', 
    arrivalCity: 'To be determined',
    arrivalTime: date,
    status: 'Scheduled',
    gate: undefined,
    terminal: undefined,
    delay: 0
  };
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
  const response = await axios.get('http://api.aviationstack.com/v1/flights', {
    params: {
      access_key: process.env.AVIATIONSTACK_API_KEY,
      flight_iata: flightNumber,
      flight_date: date
    }
  });

  if (response.data.data && response.data.data.length > 0) {
    const flight = response.data.data[0];
    return {
      flightNumber: flight.flight?.iata || flightNumber,
      airline: flight.airline?.name || 'Unknown',
      departureAirport: flight.departure?.iata || 'Unknown',
      departureCity: flight.departure?.timezone || 'Unknown',
      departureTime: flight.departure?.scheduled || 'Unknown',
      arrivalAirport: flight.arrival?.iata || 'Unknown',
      arrivalCity: flight.arrival?.timezone || 'Unknown',
      arrivalTime: flight.arrival?.scheduled || 'Unknown',
      status: flight.flight_status || 'Unknown',
      gate: flight.arrival?.gate,
      terminal: flight.arrival?.terminal,
      delay: flight.arrival?.delay
    };
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