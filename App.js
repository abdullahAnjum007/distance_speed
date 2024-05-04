import { Button, SafeAreaView, StyleSheet, Text, View } from "react-native";
import React, { useEffect, useRef, useState } from "react";
import * as geolib from "geolib";
import * as Location from "expo-location";
import MapView, { Marker } from "react-native-maps";

const App = () => {
  const [isTracking, setIsTracking] = useState(false);
  const [distance, setDistance] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [locations, setLocations] = useState([]);
  const [currentLocation, setCurrentLocation] = useState(null);
  const locationSubscription = useRef(null);

  // Fetch the current location on component mount
  useEffect(() => {
    const fetchInitialLocation = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.log("Location permission not granted");
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      if (location && location.coords) {
        setCurrentLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        });
      }
    };

    fetchInitialLocation();
  }, []);

  const startTracking = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      console.log("Location permission not granted");
      return;
    }

    setIsTracking(true);

    locationSubscription.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 1000, // Update every second
        distanceInterval: 1, // Update every meter
      },
      (location) => {
        if (location && location.coords) {
          const currentSpeed = location.coords.speed * 3.6; // Convert to km/h
          setSpeed(currentSpeed.toFixed(2));

          setLocations((prevLocations) => {
            if (prevLocations.length > 0) {
              const lastLocation = prevLocations[prevLocations.length - 1];
              if (lastLocation && lastLocation.coords) {
                const newDistance = geolib.getDistance(
                  {
                    latitude: lastLocation.coords.latitude,
                    longitude: lastLocation.coords.longitude,
                  },
                  {
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                  }
                );

                setDistance((prevDistance) => prevDistance + newDistance);
              }
            }
            return [...prevLocations, location];
          });
          // Update the current location for the map marker
          setCurrentLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          });
        }
      }
    );
  };

  const stopTracking = async () => {
    if (locationSubscription.current) {
      await locationSubscription.current.remove(); // Stop tracking
      locationSubscription.current = null; // Clear the reference
    }
    setIsTracking(false);
  };

  const resetTracking = () => {
    // Reset speed, distance, and locations
    setDistance(0);
    setSpeed(0);
    setLocations([]);
  };

  return (
    <SafeAreaView>
      <View style={styles.container}>
        <MapView
          style={styles.map}
          provider="google"
          region={currentLocation} // Set the initial region to the current location
        >
          {currentLocation && (
            <Marker
              coordinate={currentLocation} // The marker follows the current location
              title="Your Current Location"
            />
          )}
        </MapView>
      </View>
      <View style={styles.container}>
        <Text style={styles.text}>Distance: {distance / 1000} km</Text>
        <Text style={styles.text}>speed: {speed} km/h</Text>

        <Button
          title={isTracking ? "Stop Tracking" : "Start Tracking"}
          onPress={isTracking ? stopTracking : startTracking}
        />
        <Button title="Reset" onPress={resetTracking} />
      </View>
    </SafeAreaView>
  );
};

export default App;

const styles = StyleSheet.create({
  text: {
    fontSize: 30,
    fontWeight: "bold",
    margin: 20,
  },
  container: {
    justifyContent: "center",
    padding: 20,
    height: "50%",
  },
  map: {
    height: "100%",
    width: "100%",
  },
});
