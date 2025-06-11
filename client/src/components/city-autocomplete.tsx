import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import Fuse from "fuse.js";
import citiesData from "@/data/cities.json";
import { X } from "lucide-react";

interface City {
  name: string;
  country: string;
  region: string;
  lat: number;
  lng: number;
}

interface CityAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  id?: string;
  name?: string;
}

const CityAutocomplete: React.FC<CityAutocompleteProps> = ({
  value,
  onChange,
  placeholder = "Where are you going?",
  required = false,
  id,
  name,
}) => {
  const [inputValue, setInputValue] = useState("");
  const [selectedCities, setSelectedCities] = useState<City[]>([]);
  const [suggestions, setSuggestions] = useState<City[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Initialize Fuse.js for fuzzy search
  const fuse = useRef(
    new Fuse(citiesData as City[], {
      keys: [
        { name: "name", weight: 0.7 },
        { name: "country", weight: 0.2 },
        { name: "region", weight: 0.1 },
      ],
      threshold: 0.3,
      includeScore: true,
      minMatchCharLength: 1,
    })
  );

  // Parse existing value into selected cities
  useEffect(() => {
    if (value && value.trim()) {
      const cityNames = value.split(",").map(name => name.trim()).filter(Boolean);
      const cities: City[] = [];
      
      cityNames.forEach(cityName => {
        const found = citiesData.find(city => 
          city.name.toLowerCase() === cityName.toLowerCase()
        );
        if (found) {
          cities.push(found);
        } else {
          // For cities not in our dataset, create a basic entry
          cities.push({
            name: cityName,
            country: "Unknown",
            region: "Unknown",
            lat: 0,
            lng: 0,
          });
        }
      });
      
      setSelectedCities(cities);
    } else {
      setSelectedCities([]);
    }
  }, [value]);

  // Update parent component when selected cities change
  useEffect(() => {
    const cityNames = selectedCities.map(city => city.name).join(", ");
    if (cityNames !== value) {
      onChange(cityNames);
    }
  }, [selectedCities, onChange, value]);

  // Handle input changes and search
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const searchValue = e.target.value;
    
    // Handle comma-separated input
    if (searchValue.includes(',')) {
      const cities = searchValue.split(',').map(city => city.trim()).filter(Boolean);
      const lastCity = cities.pop() || '';
      
      // Add all complete cities except the last one
      cities.forEach(cityName => {
        if (cityName && selectedCities.length < 5) {
          addManualCity(cityName);
        }
      });
      
      setInputValue(lastCity);
      setActiveSuggestion(-1);
      
      if (lastCity.trim() && selectedCities.length < 5) {
        const results = fuse.current.search(lastCity);
        const filteredResults = results
          .slice(0, 8)
          .map(result => result.item)
          .filter(city => !selectedCities.some(selected => selected.name === city.name));
        
        setSuggestions(filteredResults);
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
      return;
    }
    
    setInputValue(searchValue);
    setActiveSuggestion(-1);

    if (searchValue.trim() && selectedCities.length < 5) {
      const results = fuse.current.search(searchValue);
      const filteredResults = results
        .slice(0, 8)
        .map(result => result.item)
        .filter(city => !selectedCities.some(selected => selected.name === city.name));
      
      setSuggestions(filteredResults);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Handle city selection
  const selectCity = (city: City) => {
    if (selectedCities.length < 5 && !selectedCities.some(selected => selected.name === city.name)) {
      setSelectedCities(prev => [...prev, city]);
    }
    setInputValue("");
    setSuggestions([]);
    setShowSuggestions(false);
    setActiveSuggestion(-1);
    inputRef.current?.focus();
  };

  // Remove selected city
  const removeCity = (cityToRemove: City) => {
    setSelectedCities(prev => prev.filter(city => city.name !== cityToRemove.name));
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) {
      // Allow Enter to add manually typed city when suggestions are not shown
      if (e.key === "Enter" && inputValue.trim() && selectedCities.length < 5) {
        e.preventDefault();
        addManualCity(inputValue.trim());
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveSuggestion(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveSuggestion(prev => prev > 0 ? prev - 1 : -1);
        break;
      case "Enter":
        e.preventDefault();
        if (activeSuggestion >= 0 && suggestions[activeSuggestion]) {
          selectCity(suggestions[activeSuggestion]);
        } else if (inputValue.trim() && selectedCities.length < 5) {
          // If no suggestion is selected but there's input, add as manual city
          addManualCity(inputValue.trim());
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        setActiveSuggestion(-1);
        break;
    }
  };

  // Add manually entered city
  const addManualCity = (cityName: string) => {
    if (selectedCities.length < 5 && !selectedCities.some(selected => 
      selected.name.toLowerCase() === cityName.toLowerCase()
    )) {
      const newCity: City = {
        name: cityName,
        country: "Unknown",
        region: "Unknown",
        lat: 0,
        lng: 0,
      };
      setSelectedCities(prev => [...prev, newCity]);
      setInputValue("");
      setSuggestions([]);
      setShowSuggestions(false);
      setActiveSuggestion(-1);
      inputRef.current?.focus();
    }
  };

  // Handle input blur
  const handleBlur = () => {
    // Add any manually typed city before hiding suggestions
    if (inputValue.trim() && selectedCities.length < 5) {
      addManualCity(inputValue.trim());
    }
    
    // Delay hiding suggestions to allow for clicks
    setTimeout(() => {
      setShowSuggestions(false);
      setActiveSuggestion(-1);
    }, 150);
  };

  // Handle input focus
  const handleFocus = () => {
    if (inputValue.trim() && suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const cityColors = [
    "bg-blue-100 text-blue-800 border-blue-200",
    "bg-green-100 text-green-800 border-green-200", 
    "bg-purple-100 text-purple-800 border-purple-200",
    "bg-orange-100 text-orange-800 border-orange-200",
    "bg-pink-100 text-pink-800 border-pink-200",
  ];

  return (
    <div className="relative w-full">
      {/* Selected Cities */}
      {selectedCities.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedCities.map((city, index) => (
            <div
              key={`${city.name}-${city.country}`}
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${
                cityColors[index % cityColors.length]
              }`}
            >
              <span className="mr-1">
                {city.name}
                {city.country !== "Unknown" && (
                  <span className="text-xs opacity-75 ml-1">
                    {city.country}
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={() => removeCity(city)}
                className="ml-1 hover:bg-black/10 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input Field */}
      <div className="relative">
        <Input
          ref={inputRef}
          id={id}
          name={name}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          onFocus={handleFocus}
          placeholder={
            selectedCities.length === 0 
              ? placeholder 
              : selectedCities.length >= 5 
                ? "Maximum 5 cities selected" 
                : "Add another city..."
          }
          disabled={selectedCities.length >= 5}
          required={required && selectedCities.length === 0}
          className="w-full"
        />

        {/* Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div
            ref={suggestionsRef}
            className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto"
          >
            {suggestions.map((city, index) => (
              <button
                key={`${city.name}-${city.country}-${city.region}`}
                type="button"
                className={`w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0 ${
                  index === activeSuggestion ? "bg-gray-50" : ""
                }`}
                onClick={() => selectCity(city)}
              >
                <div className="font-medium text-gray-900">{city.name}</div>
                <div className="text-sm text-gray-500">
                  {city.region}, {city.country}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Helper Text */}
      <div className="mt-1 text-xs text-gray-500">
        {selectedCities.length > 0 && (
          <span>
            {selectedCities.length}/5 cities selected
          </span>
        )}
        {selectedCities.length === 0 && (
          <span>
            Type any city name or use suggestions. Press Enter or use commas to add multiple cities (up to 5).
          </span>
        )}
      </div>
    </div>
  );
};

export default CityAutocomplete;