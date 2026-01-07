'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet marker icons
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "/marker-icon-2x.png",
  iconUrl: "/marker-icon.png",
  shadowUrl: "/marker-shadow.png",
});

interface Visitor {
  latitude: number;
  longitude: number;
  city: string;
  country: string;
  ip: string;
  referrerCategory: string;
  referrer: string;
}

interface MapViewProps {
  visitors: Visitor[];
}

export default function MapView({ visitors }: MapViewProps) {
  return (
    <MapContainer
      center={[20, 0]}
      zoom={2}
      style={{ height: '100%', width: '100%' }}
      className="z-0"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {visitors
        .filter((v) => v.latitude && v.longitude)
        .map((visitor, index) => (
          <Marker
            key={index}
            position={[visitor.latitude, visitor.longitude]}
          >
            <Popup className="custom-popup">
              <div className="font-medium text-gray-800">{visitor.city || 'Unknown'}, {visitor.country || 'Unknown'}</div>
              <div className="text-sm text-gray-600">IP: {visitor.ip}</div>
              <div className="text-sm text-gray-600">Source: {visitor.referrerCategory || 'Direct'}</div>
              {visitor.referrer && <div className="text-xs text-gray-500 truncate max-w-xs">From: {visitor.referrer}</div>}
            </Popup>
          </Marker>
        ))}
    </MapContainer>
  );
}