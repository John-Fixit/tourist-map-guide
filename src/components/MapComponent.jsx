import React, { useState, useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-routing-machine";
import axios from "axios";
import { Button, Input, List, Space } from "antd";

// Fix the marker icon issue with Leaflet and Webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});


const useRoutingControl = (startCoords, endCoords, enabled, showTable) => {
  const map = useMap();
  const routingControlRef = useRef(null);

  useEffect(() => {
    if (!map || !startCoords || !endCoords || !enabled || !L.Routing) return;

    // Initialize routing control only if it doesn't exist
    if (!routingControlRef.current) {
      routingControlRef.current = L.Routing.control({
        waypoints: [
          L.latLng(startCoords[0], startCoords[1]),
          L.latLng(endCoords[0], endCoords[1]),
        ],
        routeWhileDragging: true,
      }).addTo(map);
    }

    // Update the display of the itinerary
    const itineraryContainer = routingControlRef.current.getContainer();
    itineraryContainer.style.display = showTable ? "block" : "none";

    // Clean up on unmount or on changes
    return () => {
      if (map && routingControlRef.current) {
        map.removeControl(routingControlRef.current);
        routingControlRef.current = null;
      }
    };
  }, [map, startCoords, endCoords, enabled, showTable]);
};

// FlyTo component to handle map centering on selected location
const FlyToLocation = ({ coords }) => {
  const map = useMap();
  useEffect(() => {
    if (map && coords) {
      map.flyTo(coords, 13, { animate: true });
    }
  }, [map, coords]);
  return null;
};

const MapComponent = () => {
  const [searchInput, setSearchInput] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedCoords, setSelectedCoords] = useState([51.505, -0.09]); // Default location
  const [userCoords, setUserCoords] = useState(null);
  const [showDirections, setShowDirections] = useState(true);
  const [showTable, setShowTable] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserCoords([position.coords.latitude, position.coords.longitude]);
        setSelectedCoords([
          position.coords.latitude,
          position.coords.longitude,
        ]);
      },
      (error) => console.error(error),
      { enableHighAccuracy: true }
    );
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await axios.get(
        "https://nominatim.openstreetmap.org/search",
        {
          params: {
            q: searchInput,
            format: "json",
            addressdetails: 1,
            limit: 5,
          },
        }
      );
      setSearchResults(response.data);
    } catch (error) {
      console.error("Error searching location:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPlace = (lat, lon) => {
    setSelectedCoords([lat, lon]);
    setSearchResults([]);
    setSearchInput("");
    setShowDirections(false);
  };

  const toggleDirections = () => {
    setShowDirections((prev) => !prev);
    setShowTable((prev) => prev && !prev);
  };

  useEffect(() => {
    if (!showDirections) {
      setShowTable(false);
    }
  }, [showDirections]);

  const toggleTableVisibility = () => {
    setShowTable((prev) => !prev);
  };

  const options = useMemo(
    () =>
      searchResults.map((result) => ({
        label: result.display_name,
        value: [result.lat, result.lon],
        ...result,
      })),
    [searchResults]
  );

  return (
    <div className="">
      <div className="z-[1000] absolute left-20 top-3">
        <div className="max-w-xl mx-auto relative">
          <form onSubmit={handleSearch}>
            <Space.Compact
              className="w-full"
              style={{
                width: "100%",
              }}
            >
              <Input
                size="large"
                placeholder="Search tourist"
                onChange={(e) => setSearchInput(e.target.value)}
              />
              <Button
                size="large"
                // onClick={handleSearch}
                loading={isLoading}
                type="primary"
                htmlType="submit"
              >
                Search
              </Button>
            </Space.Compact>
          </form>
          {options?.length ? (
            <div className="z-[1300] absolute bg-white px-3 pb-3 rounded-b w-full">
              <List
                dataSource={options}
                renderItem={(item) => (
                  <List.Item
                    className="hover:bg-gray-100 !cursor-pointer transition-colors duration-200 rounded-md px-5"
                    onClick={() => handleSelectPlace(item.lat, item.lon)}
                  >
                    {item.label}
                  </List.Item> // Use item.label to render the content
                )}
                className="mt-4"
              />
            </div>
          ) : null}
        </div>
      </div>
      {
        !options?.length ? (
      <div className="">
        <button
          onClick={toggleDirections}
          className="rounded absolute md:top-[20px] top-[60px] right-[20px] p-[10px] z-[1200] bg-blue-500 text-white border-none cursor-pointer"
        >
          {showDirections ? "Hide Directions" : "Show Directions"}
        </button>

        {showDirections && (
          <button
            onClick={toggleTableVisibility}
            className="rounded absolute md:top-[70px] top-[110px] right-[20px] p-[10px] z-[1200] bg-green-700 text-white border-none cursor-pointer"
          >
            {showTable ? "Hide Directions Table" : "Show Directions Table"}
          </button>
        )}
      </div>
        ): null
      }
      {
        <MapContainer
          center={selectedCoords}
          zoom={13}
          style={{ height: "100vh", width: "100%" }}
          // className="h-screen w-full"
          attributionControl={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          {userCoords && (
            <Marker position={userCoords}>
              <Popup>Your Location</Popup>
            </Marker>
          )}
          <Marker position={selectedCoords}>
            <Popup>Destination</Popup>
          </Marker>

          {/* Fly to the selected location when coordinates change */}
          <FlyToLocation coords={selectedCoords} />

          {/* Add the routing control if directions are enabled */}
          {userCoords && selectedCoords && showDirections && (
            <RouteControl
              startCoords={userCoords}
              endCoords={selectedCoords}
              enabled={showDirections}
              showTable={showTable}
            />
          )}
        </MapContainer>
      }
    </div>
  );
};

// Separate component for routing control
const RouteControl = ({ startCoords, endCoords, enabled, showTable }) => {
  useRoutingControl(startCoords, endCoords, enabled, showTable);
  return null;
};

export default MapComponent;
